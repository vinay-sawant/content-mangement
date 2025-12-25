import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  Share2,
  Clock,
  Activity,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function Layout({ children, setIsAuthenticated }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Documents', path: '/documents', icon: FileText },
    { name: 'Shared with Me', path: '/shared', icon: Share2 },
    { name: 'Access Requests', path: '/requests', icon: Clock },
    { name: 'Activity Logs', path: '/activity', icon: Activity },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
        <div className="flex flex-col flex-grow overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 py-8 border-b border-border">
            <h1 className="font-serif text-2xl font-bold text-primary" data-testid="app-title">
              University Manager
            </h1>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={
                    isActive
                      ? 'bg-accent/10 text-accent border-l-4 border-accent flex items-center px-4 py-3 text-sm font-medium rounded-r-md'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors'
                  }
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="flex-shrink-0 px-4 py-6 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              data-testid="logout-button"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-4 bg-card border-b border-border">
        <h1 className="font-serif text-xl font-bold text-primary" data-testid="app-title-mobile">
          University Manager
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="mobile-menu-button"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-background" data-testid="mobile-menu">
          <nav className="px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={
                    isActive
                      ? 'bg-accent/10 text-accent border-l-4 border-accent flex items-center px-4 py-3 text-sm font-medium rounded-r-md'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center px-4 py-3 text-sm font-medium rounded-md'
                  }
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground mt-4"
              onClick={handleLogout}
              data-testid="mobile-logout-button"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
