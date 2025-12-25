import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { permissionsAPI, documentsAPI } from '@/utils/api';
import { toast } from 'sonner';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Search,
  Eye,
  Download,
  FileText,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';

export default function AccessRequests() {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [grantData, setGrantData] = useState({ expires_at: '', reason: '' });
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestData, setRequestData] = useState({
    document_id: '',
    permission_type: 'view',
    reason: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRequests();
    loadAllDocuments();
  }, []);

  const loadRequests = async () => {
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        permissionsAPI.getIncoming(),
        permissionsAPI.getOutgoing(),
      ]);
      setIncomingRequests(incomingRes.data);
      setOutgoingRequests(outgoingRes.data);
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllDocuments = async () => {
    try {
      const [myDocs, sharedDocs] = await Promise.all([
        documentsAPI.getMy(),
        documentsAPI.getShared(),
      ]);
      const allDocs = [...myDocs.data, ...sharedDocs.data];
      const uniqueDocs = allDocs.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      );
      setAllDocuments(uniqueDocs);
    } catch (error) {
      console.error('Failed to load documents');
    }
  };

  const handleGrant = async (request, approved) => {
    if (approved) {
      setSelectedRequest(request);
      setGrantDialogOpen(true);
    } else {
      try {
        await permissionsAPI.grant({ request_id: request.id, grant: false, reason: 'Denied' });
        toast.success('Access denied');
        loadRequests();
      } catch (error) {
        toast.error('Failed to deny access');
      }
    }
  };

  const submitGrant = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        request_id: selectedRequest.id,
        grant: true,
        reason: grantData.reason,
      };
      if (grantData.expires_at) {
        payload.expires_at = new Date(grantData.expires_at).toISOString();
      }
      await permissionsAPI.grant(payload);
      toast.success('Access granted');
      setGrantDialogOpen(false);
      setGrantData({ expires_at: '', reason: '' });
      loadRequests();
    } catch (error) {
      toast.error('Failed to grant access');
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    try {
      await permissionsAPI.request(requestData);
      toast.success('Access request sent');
      setRequestDialogOpen(false);
      setRequestData({ document_id: '', permission_type: 'view', reason: '' });
      loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Request failed');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
            <XCircle className="w-3 h-3 mr-1" />
            Denied
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPermissionIcon = (type) => {
    switch (type) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'edit':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const availableDocuments = allDocuments.filter(
    (doc) =>
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !outgoingRequests.some((req) => req.document_id === doc.id && req.status === 'pending')
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="access-requests-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary tracking-tight">
            Access Requests
          </h1>
          <p className="text-muted-foreground mt-2">Manage document access permissions</p>
        </div>
        <Button
          onClick={() => setRequestDialogOpen(true)}
          className="gap-2"
          data-testid="request-access-button"
        >
          <Send className="w-4 h-4" />
          Request Access
        </Button>
      </div>

      {/* Request Access Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent data-testid="request-access-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Request Document Access</DialogTitle>
            <DialogDescription>Choose a document and permission level</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestAccess} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-doc">Search Document</Label>
              <Input
                id="search-doc"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="document-search-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">Document</Label>
              <Select
                value={requestData.document_id}
                onValueChange={(value) => setRequestData({ ...requestData, document_id: value })}
                required
              >
                <SelectTrigger id="document" data-testid="document-select">
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.owner_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-type">Permission Type</Label>
              <Select
                value={requestData.permission_type}
                onValueChange={(value) => setRequestData({ ...requestData, permission_type: value })}
              >
                <SelectTrigger id="permission-type" data-testid="permission-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-reason">Reason (Optional)</Label>
              <Textarea
                id="request-reason"
                placeholder="Why do you need access?"
                value={requestData.reason}
                onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                data-testid="request-reason-input"
              />
            </div>
            <Button type="submit" className="w-full" data-testid="submit-request-button">
              Send Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent data-testid="grant-access-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Grant Access</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  Grant <strong>{selectedRequest.requester_name}</strong> access to{' '}
                  <strong>{selectedRequest.document_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitGrant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expires">Expiration Date (Optional)</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={grantData.expires_at}
                onChange={(e) => setGrantData({ ...grantData, expires_at: e.target.value })}
                data-testid="expiration-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-reason">Note (Optional)</Label>
              <Textarea
                id="grant-reason"
                placeholder="Add a note..."
                value={grantData.reason}
                onChange={(e) => setGrantData({ ...grantData, reason: e.target.value })}
                data-testid="grant-reason-input"
              />
            </div>
            <Button type="submit" className="w-full" data-testid="submit-grant-button">
              Grant Access
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="incoming" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incoming" data-testid="incoming-tab">
            Incoming ({incomingRequests.filter((r) => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="outgoing" data-testid="outgoing-tab">
            Outgoing ({outgoingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" data-testid="incoming-requests">
          {incomingRequests.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg text-muted-foreground">No incoming requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((request) => (
                <Card key={request.id} className="border-border" data-testid={`incoming-request-${request.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg text-foreground">
                            {request.requester_name}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Document: <span className="font-medium">{request.document_name}</span>
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md">
                            {getPermissionIcon(request.permission_type)}
                            <span className="capitalize">{request.permission_type}</span>
                          </div>
                          <span className="text-muted-foreground">
                            Requested {format(new Date(request.requested_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {request.grant_reason && (
                          <p className="text-sm text-muted-foreground italic">
                            Reason: {request.grant_reason}
                          </p>
                        )}
                        {request.expires_at && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            Expires: {format(new Date(request.expires_at), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleGrant(request, true)}
                            data-testid={`approve-request-${request.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleGrant(request, false)}
                            data-testid={`deny-request-${request.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" data-testid="outgoing-requests">
          {outgoingRequests.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Send className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg text-muted-foreground">No outgoing requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {outgoingRequests.map((request) => (
                <Card key={request.id} className="border-border" data-testid={`outgoing-request-${request.id}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-foreground">
                          {request.document_name}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md">
                          {getPermissionIcon(request.permission_type)}
                          <span className="capitalize">{request.permission_type}</span>
                        </div>
                        <span className="text-muted-foreground">
                          Requested {format(new Date(request.requested_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {request.grant_reason && (
                        <p className="text-sm text-muted-foreground italic">
                          {request.grant_reason}
                        </p>
                      )}
                      {request.expires_at && request.status === 'approved' && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Expires: {format(new Date(request.expires_at), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
