from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import os
import logging
from pathlib import Path
import uuid
import io


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs_bucket = AsyncIOMotorGridFSBucket(db)

# Security
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class DocumentMetadata(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    owner_id: str
    owner_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    uploaded_at: datetime
    gridfs_id: str

class AccessPermission(BaseModel):
    id: str
    document_id: str
    document_name: str
    requester_id: str
    requester_name: str
    owner_id: str
    permission_type: Literal["view", "download", "edit"]
    status: Literal["pending", "approved", "denied", "expired"]
    requested_at: datetime
    expires_at: Optional[datetime] = None
    granted_at: Optional[datetime] = None
    grant_reason: Optional[str] = None

class AccessRequest(BaseModel):
    document_id: str
    permission_type: Literal["view", "download", "edit"]
    reason: Optional[str] = None

class AccessGrant(BaseModel):
    request_id: str
    grant: bool
    expires_at: Optional[datetime] = None
    reason: Optional[str] = None

class ActivityLog(BaseModel):
    id: str
    user_id: str
    user_name: str
    document_id: str
    document_name: str
    action: Literal["view", "download", "edit", "upload", "delete", "request_access", "grant_access"]
    timestamp: datetime
    duration_seconds: Optional[int] = None
    metadata: Optional[dict] = None

class WeeklySummary(BaseModel):
    user_id: str
    user_name: str
    week_start: datetime
    week_end: datetime
    documents_accessed: int
    documents_uploaded: int
    permissions_granted: int
    permissions_received: int
    pending_requests: int
    total_active_seconds: int
    top_documents: List[dict]


# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": token_data.email}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return user

async def log_activity(user_id: str, user_name: str, document_id: str, document_name: str, 
                       action: str, duration_seconds: Optional[int] = None, metadata: Optional[dict] = None):
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "document_id": document_id,
        "document_name": document_name,
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": duration_seconds,
        "metadata": metadata
    }
    await db.activity_logs.insert_one(log_entry)


# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.model_dump()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    user_dict["password"] = get_password_hash(user_dict["password"])
    
    await db.users.insert_one(user_dict)
    
    return User(
        id=user_dict["id"],
        email=user_dict["email"],
        full_name=user_dict["full_name"],
        department=user_dict.get("department"),
        created_at=datetime.fromisoformat(user_dict["created_at"])
    )

@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"email": form_data.username}, {"_id": 0})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        department=current_user.get("department"),
        created_at=datetime.fromisoformat(current_user["created_at"])
    )


# ==================== DOCUMENT ENDPOINTS ====================

@api_router.post("/documents/upload", response_model=DocumentMetadata)
async def upload_document(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    file_content = await file.read()
    
    # Upload to GridFS
    grid_in = fs_bucket.open_upload_stream(
        file.filename,
        metadata={
            "content_type": file.content_type,
            "owner_id": current_user["id"],
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
    )
    await grid_in.write(file_content)
    await grid_in.close()
    
    # Save metadata
    doc_metadata = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "file_size": len(file_content),
        "owner_id": current_user["id"],
        "owner_name": current_user["full_name"],
        "description": description,
        "category": category,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "gridfs_id": str(grid_in._id)
    }
    await db.documents.insert_one(doc_metadata)
    
    # Log activity
    await log_activity(
        current_user["id"],
        current_user["full_name"],
        doc_metadata["id"],
        file.filename,
        "upload"
    )
    
    return DocumentMetadata(**{**doc_metadata, "uploaded_at": datetime.fromisoformat(doc_metadata["uploaded_at"])})

@api_router.get("/documents/my", response_model=List[DocumentMetadata])
async def get_my_documents(current_user: dict = Depends(get_current_user)):
    docs = await db.documents.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    for doc in docs:
        doc["uploaded_at"] = datetime.fromisoformat(doc["uploaded_at"])
    return docs

@api_router.get("/documents/shared", response_model=List[DocumentMetadata])
async def get_shared_documents(current_user: dict = Depends(get_current_user)):
    # Get approved permissions for current user
    permissions = await db.access_permissions.find({
        "requester_id": current_user["id"],
        "status": "approved"
    }, {"_id": 0}).to_list(1000)
    
    # Check for expired permissions
    now = datetime.now(timezone.utc)
    valid_doc_ids = []
    for perm in permissions:
        if perm.get("expires_at"):
            expires = datetime.fromisoformat(perm["expires_at"])
            if expires > now:
                valid_doc_ids.append(perm["document_id"])
            else:
                # Mark as expired
                await db.access_permissions.update_one(
                    {"id": perm["id"]},
                    {"$set": {"status": "expired"}}
                )
        else:
            valid_doc_ids.append(perm["document_id"])
    
    if not valid_doc_ids:
        return []
    
    docs = await db.documents.find({"id": {"$in": valid_doc_ids}}, {"_id": 0}).to_list(1000)
    for doc in docs:
        doc["uploaded_at"] = datetime.fromisoformat(doc["uploaded_at"])
    return docs

@api_router.get("/documents/{document_id}", response_model=DocumentMetadata)
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if user has access
    if doc["owner_id"] != current_user["id"]:
        permission = await db.access_permissions.find_one({
            "document_id": document_id,
            "requester_id": current_user["id"],
            "status": "approved"
        }, {"_id": 0})
        
        if not permission:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if expired
        if permission.get("expires_at"):
            expires = datetime.fromisoformat(permission["expires_at"])
            if expires <= datetime.now(timezone.utc):
                await db.access_permissions.update_one(
                    {"id": permission["id"]},
                    {"$set": {"status": "expired"}}
                )
                raise HTTPException(status_code=403, detail="Access expired")
    
    doc["uploaded_at"] = datetime.fromisoformat(doc["uploaded_at"])
    return DocumentMetadata(**doc)

@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check permissions
    has_access = False
    if doc["owner_id"] == current_user["id"]:
        has_access = True
    else:
        permission = await db.access_permissions.find_one({
            "document_id": document_id,
            "requester_id": current_user["id"],
            "status": "approved",
            "permission_type": {"$in": ["download", "edit"]}
        }, {"_id": 0})
        
        if permission:
            if permission.get("expires_at"):
                expires = datetime.fromisoformat(permission["expires_at"])
                if expires > datetime.now(timezone.utc):
                    has_access = True
            else:
                has_access = True
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Download permission required")
    
    # Download from GridFS
    from bson import ObjectId
    grid_out = await fs_bucket.open_download_stream(ObjectId(doc["gridfs_id"]))
    file_content = await grid_out.read()
    
    # Log activity
    await log_activity(
        current_user["id"],
        current_user["full_name"],
        document_id,
        doc["filename"],
        "download"
    )
    
    return StreamingResponse(
        io.BytesIO(file_content),
        media_type=doc["file_type"],
        headers={"Content-Disposition": f"attachment; filename={doc['filename']}"}
    )

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can delete document")
    
    # Delete from GridFS
    from bson import ObjectId
    await fs_bucket.delete(ObjectId(doc["gridfs_id"]))
    
    # Delete metadata
    await db.documents.delete_one({"id": document_id})
    
    # Delete related permissions
    await db.access_permissions.delete_many({"document_id": document_id})
    
    # Log activity
    await log_activity(
        current_user["id"],
        current_user["full_name"],
        document_id,
        doc["filename"],
        "delete"
    )
    
    return {"message": "Document deleted successfully"}


# ==================== ACCESS PERMISSION ENDPOINTS ====================

@api_router.post("/permissions/request", response_model=AccessPermission)
async def request_access(request: AccessRequest, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": request.document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc["owner_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You already own this document")
    
    # Check if already requested
    existing = await db.access_permissions.find_one({
        "document_id": request.document_id,
        "requester_id": current_user["id"],
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Access already requested")
    
    permission = {
        "id": str(uuid.uuid4()),
        "document_id": request.document_id,
        "document_name": doc["filename"],
        "requester_id": current_user["id"],
        "requester_name": current_user["full_name"],
        "owner_id": doc["owner_id"],
        "permission_type": request.permission_type,
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None,
        "granted_at": None,
        "grant_reason": request.reason
    }
    await db.access_permissions.insert_one(permission)
    
    # Log activity
    await log_activity(
        current_user["id"],
        current_user["full_name"],
        request.document_id,
        doc["filename"],
        "request_access",
        metadata={"permission_type": request.permission_type}
    )
    
    permission["requested_at"] = datetime.fromisoformat(permission["requested_at"])
    return AccessPermission(**permission)

@api_router.post("/permissions/grant")
async def grant_access(grant: AccessGrant, current_user: dict = Depends(get_current_user)):
    permission = await db.access_permissions.find_one({"id": grant.request_id}, {"_id": 0})
    if not permission:
        raise HTTPException(status_code=404, detail="Permission request not found")
    
    # Verify ownership
    if permission["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only document owner can grant access")
    
    update_data = {
        "status": "approved" if grant.grant else "denied",
        "granted_at": datetime.now(timezone.utc).isoformat(),
        "grant_reason": grant.reason
    }
    
    if grant.grant and grant.expires_at:
        update_data["expires_at"] = grant.expires_at.isoformat()
    
    await db.access_permissions.update_one(
        {"id": grant.request_id},
        {"$set": update_data}
    )
    
    # Log activity
    if grant.grant:
        await log_activity(
            current_user["id"],
            current_user["full_name"],
            permission["document_id"],
            permission["document_name"],
            "grant_access",
            metadata={
                "requester_id": permission["requester_id"],
                "permission_type": permission["permission_type"],
                "expires_at": grant.expires_at.isoformat() if grant.expires_at else None
            }
        )
    
    return {"message": "Access " + ("granted" if grant.grant else "denied")}

@api_router.get("/permissions/incoming", response_model=List[AccessPermission])
async def get_incoming_requests(current_user: dict = Depends(get_current_user)):
    permissions = await db.access_permissions.find(
        {"owner_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for perm in permissions:
        perm["requested_at"] = datetime.fromisoformat(perm["requested_at"])
        if perm.get("granted_at"):
            perm["granted_at"] = datetime.fromisoformat(perm["granted_at"])
        if perm.get("expires_at"):
            perm["expires_at"] = datetime.fromisoformat(perm["expires_at"])
    
    return permissions

@api_router.get("/permissions/outgoing", response_model=List[AccessPermission])
async def get_outgoing_requests(current_user: dict = Depends(get_current_user)):
    permissions = await db.access_permissions.find(
        {"requester_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for perm in permissions:
        perm["requested_at"] = datetime.fromisoformat(perm["requested_at"])
        if perm.get("granted_at"):
            perm["granted_at"] = datetime.fromisoformat(perm["granted_at"])
        if perm.get("expires_at"):
            perm["expires_at"] = datetime.fromisoformat(perm["expires_at"])
    
    return permissions


# ==================== ACTIVITY & SUMMARY ENDPOINTS ====================

@api_router.get("/activity/logs", response_model=List[ActivityLog])
async def get_activity_logs(
    document_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Owners can see all logs for their documents
    if document_id:
        doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
        if doc and doc["owner_id"] == current_user["id"]:
            query["document_id"] = document_id
        else:
            # Non-owners can only see their own logs
            query["document_id"] = document_id
            query["user_id"] = current_user["id"]
    else:
        # Get logs for user's own documents or their own actions
        user_docs = await db.documents.find({"owner_id": current_user["id"]}, {"_id": 0, "id": 1}).to_list(1000)
        doc_ids = [d["id"] for d in user_docs]
        query["$or"] = [
            {"document_id": {"$in": doc_ids}},
            {"user_id": current_user["id"]}
        ]
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    for log in logs:
        log["timestamp"] = datetime.fromisoformat(log["timestamp"])
    
    return logs

@api_router.get("/activity/summary", response_model=WeeklySummary)
async def get_weekly_summary(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    
    # Get logs for the past week
    logs = await db.activity_logs.find({
        "user_id": current_user["id"],
        "timestamp": {"$gte": week_start.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate statistics
    accessed_docs = set()
    uploaded_count = 0
    total_seconds = 0
    doc_access_count = {}
    
    for log in logs:
        if log["action"] in ["view", "download", "edit"]:
            accessed_docs.add(log["document_id"])
            doc_access_count[log["document_id"]] = doc_access_count.get(log["document_id"], 0) + 1
        if log["action"] == "upload":
            uploaded_count += 1
        if log.get("duration_seconds"):
            total_seconds += log["duration_seconds"]
    
    # Get permissions data
    permissions_granted = await db.access_permissions.count_documents({
        "owner_id": current_user["id"],
        "status": "approved",
        "granted_at": {"$gte": week_start.isoformat()}
    })
    
    permissions_received = await db.access_permissions.count_documents({
        "requester_id": current_user["id"],
        "status": "approved",
        "granted_at": {"$gte": week_start.isoformat()}
    })
    
    pending_requests = await db.access_permissions.count_documents({
        "owner_id": current_user["id"],
        "status": "pending"
    })
    
    # Get top documents
    top_doc_ids = sorted(doc_access_count.items(), key=lambda x: x[1], reverse=True)[:5]
    top_documents = []
    for doc_id, count in top_doc_ids:
        doc = await db.documents.find_one({"id": doc_id}, {"_id": 0, "filename": 1})
        if doc:
            top_documents.append({"name": doc["filename"], "access_count": count})
    
    return WeeklySummary(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        week_start=week_start,
        week_end=now,
        documents_accessed=len(accessed_docs),
        documents_uploaded=uploaded_count,
        permissions_granted=permissions_granted,
        permissions_received=permissions_received,
        pending_requests=pending_requests,
        total_active_seconds=total_seconds,
        top_documents=top_documents
    )

@api_router.post("/activity/log-view")
async def log_document_view(
    document_id: str,
    duration_seconds: int,
    current_user: dict = Depends(get_current_user)
):
    doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await log_activity(
        current_user["id"],
        current_user["full_name"],
        document_id,
        doc["filename"],
        "view",
        duration_seconds=duration_seconds
    )
    
    return {"message": "View logged"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
