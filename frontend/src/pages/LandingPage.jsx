import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authAPI } from '@/utils/api';
import { toast } from 'sonner';
import { GraduationCap, FileText, Shield, TrendingUp } from 'lucide-react';

export default function LandingPage({ setIsAuthenticated }) {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    full_name: '',
    department: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await authAPI.login(loginData.email, loginData.password);
      localStorage.setItem('token', response.data.access_token);
      toast.success('Welcome back!');
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authAPI.register(registerData);
      toast.success('Registration successful! Please login.');
      setLoginData({ email: registerData.email, password: registerData.password });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Hero Content */}
          <div className="space-y-8 animate-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium">
              <GraduationCap className="w-4 h-4" />
              Academic Collaboration Platform
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary tracking-tight leading-tight">
              Secure Document Management for Educators
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A centralized platform for university teachers to collaborate, share academic resources,
              and track document access with precision and accountability.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Centralized Repository</h3>
                  <p className="text-sm text-muted-foreground">
                    Store and organize all academic documents in one secure place
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Permission Control</h3>
                  <p className="text-sm text-muted-foreground">
                    Grant time-bound, role-based access to your documents
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Activity Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor document access with detailed logs and analytics
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Weekly Summaries</h3>
                  <p className="text-sm text-muted-foreground">
                    Get insights on collaboration patterns and document usage
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Auth Forms */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="font-serif text-2xl text-center">Get Started</CardTitle>
                <CardDescription className="text-center">
                  Login or create your account to begin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                    <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="professor@university.edu"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          required
                          data-testid="login-email-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                          data-testid="login-password-input"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        data-testid="login-submit-button"
                      >
                        {isLoading ? 'Logging in...' : 'Login'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                      <div className="space-y-2">
                        <Label htmlFor="register-name">Full Name</Label>
                        <Input
                          id="register-name"
                          placeholder="Dr. Jane Smith"
                          value={registerData.full_name}
                          onChange={(e) =>
                            setRegisterData({ ...registerData, full_name: e.target.value })
                          }
                          required
                          data-testid="register-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="professor@university.edu"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          required
                          data-testid="register-email-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-department">Department (Optional)</Label>
                        <Input
                          id="register-department"
                          placeholder="Computer Science"
                          value={registerData.department}
                          onChange={(e) =>
                            setRegisterData({ ...registerData, department: e.target.value })
                          }
                          data-testid="register-department-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          type="password"
                          value={registerData.password}
                          onChange={(e) =>
                            setRegisterData({ ...registerData, password: e.target.value })
                          }
                          required
                          data-testid="register-password-input"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        data-testid="register-submit-button"
                      >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>University Manager - Secure Academic Collaboration</p>
        </div>
      </footer>
    </div>
  );
}
