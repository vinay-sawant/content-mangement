import requests
import sys
import json
import io
from datetime import datetime, timedelta

class UniversityManagerAPITester:
    def __init__(self, base_url="https://acadocshare-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_user = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@university.edu",
            "password": "TestPass123!",
            "full_name": "Test Professor",
            "department": "Computer Science"
        }
        
        self.test_user2 = {
            "email": f"test_user2_{datetime.now().strftime('%H%M%S')}@university.edu", 
            "password": "TestPass123!",
            "full_name": "Test Professor 2",
            "department": "Mathematics"
        }

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
            
        if headers:
            test_headers.update(headers)
            
        if files:
            # Remove Content-Type for file uploads
            test_headers.pop('Content-Type', None)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_user_registration(self):
        """Test user registration"""
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=self.test_user
        )
        
        if response:
            self.user_id = response.get('id')
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "username": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        url = f"{self.api_base}/auth/login"
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        
        try:
            response = requests.post(url, data=login_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.token = data.get('access_token')
                self.log_test("User Login", True, f"Token received")
                return True
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False

    def test_get_current_user(self):
        """Test get current user"""
        response = self.run_test(
            "Get Current User",
            "GET", 
            "auth/me",
            200
        )
        return response is not None

    def test_document_upload(self):
        """Test document upload"""
        # Create a test file
        test_content = b"This is a test document for University Manager testing."
        test_file = io.BytesIO(test_content)
        
        files = {
            'file': ('test_document.txt', test_file, 'text/plain')
        }
        
        form_data = {
            'description': 'Test document for API testing',
            'category': 'Notes'
        }
        
        url = f"{self.api_base}/documents/upload"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.post(url, files=files, data=form_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.document_id = data.get('id')
                self.log_test("Document Upload", True, f"Document ID: {self.document_id}")
                return data
            else:
                self.log_test("Document Upload", False, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Document Upload", False, f"Exception: {str(e)}")
            return None

    def test_get_my_documents(self):
        """Test get my documents"""
        response = self.run_test(
            "Get My Documents",
            "GET",
            "documents/my", 
            200
        )
        return response

    def test_document_download(self, document_id):
        """Test document download"""
        url = f"{self.api_base}/documents/{document_id}/download"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            success = response.status_code == 200
            
            details = f"Status: {response.status_code}"
            if success:
                details += f", Content-Length: {len(response.content)}"
                
            self.log_test("Document Download", success, details)
            return success
            
        except Exception as e:
            self.log_test("Document Download", False, f"Exception: {str(e)}")
            return False

    def test_access_request_flow(self):
        """Test complete access request flow with second user"""
        # Register second user
        response = self.run_test(
            "Register Second User",
            "POST",
            "auth/register",
            200,
            data=self.test_user2
        )
        
        if not response:
            return False
            
        # Login as second user
        login_data = {
            "username": self.test_user2["email"],
            "password": self.test_user2["password"]
        }
        
        url = f"{self.api_base}/auth/login"
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        
        try:
            response = requests.post(url, data=login_data, headers=headers)
            if response.status_code != 200:
                self.log_test("Second User Login", False, f"Status: {response.status_code}")
                return False
                
            user2_token = response.json().get('access_token')
            self.log_test("Second User Login", True, "Token received")
            
        except Exception as e:
            self.log_test("Second User Login", False, f"Exception: {str(e)}")
            return False

        # Request access to first user's document
        if not hasattr(self, 'document_id'):
            self.log_test("Access Request", False, "No document ID available")
            return False
            
        request_data = {
            "document_id": self.document_id,
            "permission_type": "download",
            "reason": "Need this document for research collaboration"
        }
        
        url = f"{self.api_base}/permissions/request"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {user2_token}'
        }
        
        try:
            response = requests.post(url, json=request_data, headers=headers)
            success = response.status_code == 200
            
            if success:
                request_data = response.json()
                request_id = request_data.get('id')
                self.log_test("Request Access", True, f"Request ID: {request_id}")
            else:
                self.log_test("Request Access", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Request Access", False, f"Exception: {str(e)}")
            return False

        # Switch back to first user and grant access
        grant_data = {
            "request_id": request_id,
            "grant": True,
            "reason": "Approved for collaboration"
        }
        
        url = f"{self.api_base}/permissions/grant"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }
        
        try:
            response = requests.post(url, json=grant_data, headers=headers)
            success = response.status_code == 200
            
            self.log_test("Grant Access", success, f"Status: {response.status_code}")
            return success
            
        except Exception as e:
            self.log_test("Grant Access", False, f"Exception: {str(e)}")
            return False

    def test_get_permissions(self):
        """Test get incoming and outgoing permissions"""
        incoming = self.run_test(
            "Get Incoming Permissions",
            "GET",
            "permissions/incoming",
            200
        )
        
        outgoing = self.run_test(
            "Get Outgoing Permissions", 
            "GET",
            "permissions/outgoing",
            200
        )
        
        return incoming is not None and outgoing is not None

    def test_activity_logs(self):
        """Test activity logs"""
        response = self.run_test(
            "Get Activity Logs",
            "GET",
            "activity/logs",
            200
        )
        return response is not None

    def test_weekly_summary(self):
        """Test weekly summary"""
        response = self.run_test(
            "Get Weekly Summary",
            "GET", 
            "activity/summary",
            200
        )
        return response is not None

    def test_document_deletion(self):
        """Test document deletion"""
        if not hasattr(self, 'document_id'):
            self.log_test("Document Deletion", False, "No document ID available")
            return False
            
        response = self.run_test(
            "Delete Document",
            "DELETE",
            f"documents/{self.document_id}",
            200
        )
        return response is not None

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting University Manager API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return self.get_results()
            
        if not self.test_user_login():
            print("❌ Login failed, stopping tests") 
            return self.get_results()
            
        self.test_get_current_user()
        
        # Document tests
        doc_data = self.test_document_upload()
        if doc_data:
            self.test_get_my_documents()
            self.test_document_download(self.document_id)
            
        # Permission tests
        self.test_access_request_flow()
        self.test_get_permissions()
        
        # Activity tests
        self.test_activity_logs()
        self.test_weekly_summary()
        
        # Cleanup
        self.test_document_deletion()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed")
            
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_details": self.test_results
        }

def main():
    tester = UniversityManagerAPITester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if results["passed_tests"] == results["total_tests"] else 1

if __name__ == "__main__":
    sys.exit(main())