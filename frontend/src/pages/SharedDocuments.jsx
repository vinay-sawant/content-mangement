import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { documentsAPI, permissionsAPI } from '@/utils/api';
import { toast } from 'sonner';
import { FileText, Download, Eye, Lock, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function SharedDocuments() {
  const [documents, setDocuments] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSharedDocuments();
  }, []);

  const loadSharedDocuments = async () => {
    try {
      const [docsRes, permsRes] = await Promise.all([
        documentsAPI.getShared(),
        permissionsAPI.getOutgoing(),
      ]);

      setDocuments(docsRes.data);

      // Create a map of document_id -> permission details
      const permMap = {};
      permsRes.data
        .filter((p) => p.status === 'approved')
        .forEach((p) => {
          permMap[p.document_id] = p;
        });
      setPermissions(permMap);
    } catch (error) {
      toast.error('Failed to load shared documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentsAPI.download(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download started');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Download failed');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        return <Lock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="shared-documents-page">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary tracking-tight">
          Shared with Me
        </h1>
        <p className="text-muted-foreground mt-2">
          Documents you have been granted access to
        </p>
      </div>

      {/* Documents */}
      {documents.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg text-muted-foreground mb-2">No shared documents</p>
            <p className="text-sm text-muted-foreground">
              Request access to documents from other teachers to see them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="shared-documents-grid">
          {documents.map((doc) => {
            const perm = permissions[doc.id];
            const isExpired = perm?.expires_at && new Date(perm.expires_at) < new Date();

            return (
              <Card
                key={doc.id}
                className="document-card-hover border-border"
                data-testid={`shared-document-${doc.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {doc.filename}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Owner: {doc.owner_name}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-accent flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  {/* Permission Details */}
                  {perm && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-md">
                          {getPermissionIcon(perm.permission_type)}
                          <span className="capitalize">{perm.permission_type}</span>
                        </div>
                        {perm.expires_at && (
                          <div
                            className={
                              isExpired
                                ? 'flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-md'
                                : 'flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md'
                            }
                          >
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">
                              {isExpired
                                ? 'Expired'
                                : `Until ${format(new Date(perm.expires_at), 'MMM dd')}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p>Size: {formatFileSize(doc.file_size)}</p>
                    <p>Uploaded: {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}</p>
                  </div>

                  {perm && (perm.permission_type === 'download' || perm.permission_type === 'edit') && !isExpired && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDownload(doc)}
                      data-testid={`download-shared-${doc.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
