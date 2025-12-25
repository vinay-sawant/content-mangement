import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { activityAPI, documentsAPI, permissionsAPI } from '@/utils/api';
import { toast } from 'sonner';
import {
  FileText,
  Share2,
  Clock,
  TrendingUp,
  Upload,
  Download,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    myDocuments: 0,
    sharedDocuments: 0,
    pendingRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [summaryRes, logsRes, myDocsRes, sharedDocsRes, incomingReqRes] = await Promise.all([
        activityAPI.getSummary(),
        activityAPI.getLogs(),
        documentsAPI.getMy(),
        documentsAPI.getShared(),
        permissionsAPI.getIncoming(),
      ]);

      setSummary(summaryRes.data);
      setRecentActivity(logsRes.data.slice(0, 10));
      setStats({
        myDocuments: myDocsRes.data.length,
        sharedDocuments: sharedDocsRes.data.length,
        pendingRequests: incomingReqRes.data.filter((r) => r.status === 'pending').length,
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'upload':
        return <Upload className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="dashboard-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">Your weekly activity summary and recent events</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stat-card border-border" data-testid="stat-my-documents">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Documents
              </CardTitle>
              <FileText className="w-5 h-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.myDocuments}</div>
          </CardContent>
        </Card>

        <Card className="stat-card border-border" data-testid="stat-shared-documents">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shared with Me
              </CardTitle>
              <Share2 className="w-5 h-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.sharedDocuments}</div>
          </CardContent>
        </Card>

        <Card className="stat-card border-border" data-testid="stat-pending-requests">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
              <Clock className="w-5 h-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.pendingRequests}</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      {summary && (
        <Card className="border-border" data-testid="weekly-summary">
          <CardHeader>
            <CardTitle className="font-serif text-2xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-accent" />
              Weekly Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(summary.week_start), 'MMM dd')} -{' '}
              {format(new Date(summary.week_end), 'MMM dd, yyyy')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Documents Accessed</p>
                <p className="text-2xl font-bold text-primary">{summary.documents_accessed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Documents Uploaded</p>
                <p className="text-2xl font-bold text-primary">{summary.documents_uploaded}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Permissions Granted</p>
                <p className="text-2xl font-bold text-primary">{summary.permissions_granted}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Active Time</p>
                <p className="text-2xl font-bold text-primary">
                  {formatDuration(summary.total_active_seconds)}
                </p>
              </div>
            </div>

            {summary.top_documents && summary.top_documents.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Top Documents</h3>
                <div className="space-y-2">
                  {summary.top_documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                      data-testid={`top-document-${idx}`}
                    >
                      <span className="text-sm text-foreground truncate">{doc.name}</span>
                      <span className="text-sm font-medium text-accent">
                        {doc.access_count} accesses
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-border" data-testid="recent-activity">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                  data-testid={`activity-log-${log.id}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-accent mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{log.user_name}</span>
                      <span className="text-muted-foreground"> {log.action}ed </span>
                      <span className="font-medium">{log.document_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                      {log.duration_seconds && (
                        <span> • {formatDuration(log.duration_seconds)}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
