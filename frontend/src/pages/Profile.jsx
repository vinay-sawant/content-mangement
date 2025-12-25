import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/utils/api';
import { toast } from 'sonner';
import { User, Mail, Building2, Calendar, Save } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', department: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      setEditData({
        full_name: response.data.full_name,
        department: response.data.department || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    toast.info('Profile update feature coming soon!');
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" data-testid="profile-page">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary tracking-tight">
          Profile
        </h1>
        <p className="text-muted-foreground mt-2">Manage your account information</p>
      </div>

      <div className="max-w-2xl">
        {/* Profile Card */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-2xl">Personal Information</CardTitle>
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  data-testid="edit-profile-button"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4" data-testid="edit-profile-form">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={editData.full_name}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    required
                    data-testid="full-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    placeholder="Computer Science"
                    data-testid="department-input"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" data-testid="save-profile-button">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        full_name: user.full_name,
                        department: user.department || '',
                      });
                    }}
                    data-testid="cancel-edit-button"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="text-lg font-medium text-foreground" data-testid="display-full-name">
                      {user.full_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-lg font-medium text-foreground" data-testid="display-email">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="text-lg font-medium text-foreground" data-testid="display-department">
                      {user.department || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-lg font-medium text-foreground" data-testid="display-member-since">
                      {format(new Date(user.created_at), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Settings Card */}
        <Card className="border-border mt-6">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">User ID</p>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
              </div>
              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  For security and privacy settings, or to change your password, please contact your
                  system administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
