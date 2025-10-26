import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if this is coach or client mode
  const searchParams = new URLSearchParams(location.search);
  const userType = searchParams.get('type') || 'client';
  const isCoachMode = userType === 'coach';

  useEffect(() => {
    // Check if user is already logged in
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        // Check user role and redirect appropriately
        if (isCoachMode) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
          
          if (roles?.some(r => r.role === 'coach')) {
            navigate('/coach-dashboard');
          } else {
            toast({
              title: "Not a Coach",
              description: "This account doesn't have coach access.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            return;
          }
        } else {
          await handlePostAuthRedirect();
        }

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      } else {
        // For signup, coaches should use invitation flow
        if (isCoachMode) {
          toast({
            title: "Coach Registration Required",
            description: "Please request a coach invitation to register.",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link to complete your registration.",
          });
        } else if (data.user && data.session) {
          await handlePostAuthRedirect();

          toast({
            title: "Account created!",
            description: "Welcome! Your account has been created successfully.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostAuthRedirect = async () => {
    try {
      const connectAfterAuth = localStorage.getItem('connectAfterAuth');
      if (connectAfterAuth) {
        const { coachId, action } = JSON.parse(connectAfterAuth);
        localStorage.removeItem('connectAfterAuth');
        
        setTimeout(() => {
          navigate(`/coach/${coachId}?action=${action}`);
        }, 1000);
        return;
      }

      const guestSessionId = localStorage.getItem('guestSessionId');
      if (guestSessionId) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          await supabase.functions.invoke('migrate-guest-session', {
            body: {
              sessionId: guestSessionId,
              userId: session.session.user.id
            }
          });
        }
      }

      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Error during post-auth processing:', error);
      setTimeout(() => {
        navigate('/');
      }, 1000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isCoachMode ? (
              isLogin ? 'Coach Login' : 'Coach Registration'
            ) : (
              isLogin ? 'Welcome Back' : 'Create Account'
            )}
          </CardTitle>
          <CardDescription className="text-center">
            {isCoachMode ? (
              isLogin ? (
                'Sign in to access your coach dashboard'
              ) : (
                <>
                  Coach accounts require an invitation.{' '}
                  <button
                    onClick={() => navigate('/coach-signup-request')}
                    className="text-primary hover:underline"
                  >
                    Request to become a coach
                  </button>
                </>
              )
            ) : (
              isLogin 
                ? 'Sign in to continue your journey' 
                : 'Start your personalized coaching experience'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && !isCoachMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
          
          {!isCoachMode && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Are you a coach?{' '}
              <button
                onClick={() => navigate('/auth?type=coach')}
                className="text-primary hover:underline font-medium"
              >
                Coach login
              </button>
            </p>
          )}
          
          {isCoachMode && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Looking for coaching?{' '}
              <button
                onClick={() => navigate('/auth?type=client')}
                className="text-primary hover:underline font-medium"
              >
                Client login
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
