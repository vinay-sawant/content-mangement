import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { activityAPI } from '@/utils/api';
import { toast } from 'sonner';
import {
  Activity,
  Eye,
  Download,
  Upload,
  FileText,
  Trash2,
  UserPlus,
  Search,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, actionFilter]);

  const loadLogs = async () => {
    try {
      const response = await activityAPI.getLogs();
      setLogs(response.data);
    } catch (error) {
      toast.error('Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'upload':
        return <Upload className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'request_access':
      case 'grant_access':
        return <UserPlus className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'view':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'download':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'upload':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'delete':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'request_access':
      case 'grant_access':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const uniqueActions = [...new Set(logs.map((log) => log.action))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="activity-logs-page">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary tracking-tight">
          Activity Logs
        </h1>
        <p className="text-muted-foreground mt-2">Detailed tracking of document activities</p>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by document or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-logs-input"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]" data-testid="action-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Activity className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg text-muted-foreground mb-2">No activity logs found</p>
            <p className="text-sm text-muted-foreground">
              {logs.length === 0
                ? 'Activity will appear here as you use the platform'
                : 'Try adjusting your search or filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border" data-testid="activity-logs-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Action</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">User</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Document</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Timestamp</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                      data-testid={`activity-log-row-${log.id}`}
                    >
                      <td className="p-4">
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {getActionIcon(log.action)}
                          <span className="ml-1 capitalize">
                            {log.action.replace('_', ' ')}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-foreground">{log.user_name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent" />
                          <span className="text-sm text-foreground">{log.document_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDuration(log.duration_seconds) || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border" data-testid="total-activities">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{logs.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border" data-testid="unique-documents">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Set(logs.map((l) => l.document_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border" data-testid="unique-users">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Set(logs.map((l) => l.user_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border" data-testid="total-duration">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatDuration(
                logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0)
              ) || '0m'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
