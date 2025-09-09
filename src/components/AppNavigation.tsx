import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Calendar, 
  Users, 
  User as UserIcon, 
  Settings, 
  RefreshCw,
  Menu,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AppNavigationProps {
  user?: User | null;
}

export const AppNavigation = ({ user }: AppNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const fetchActiveSessionsCount = useCallback(async () => {
    if (!user?.id || isLoading) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('client_id', user.id)
        .in('status', ['scheduled', 'in_progress']);

      if (error) throw error;
      setActiveSessionsCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      // Don't show toast for this error to avoid spam
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoading]);

  useEffect(() => {
    if (user?.id) {
      fetchActiveSessionsCount();
    } else {
      setActiveSessionsCount(0);
    }
  }, [user?.id, fetchActiveSessionsCount]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: Home,
      description: "Home & Overview"
    },
    {
      label: "My Sessions",
      path: "/sessions",
      icon: Calendar,
      description: "Manage Sessions",
      badge: activeSessionsCount > 0 ? activeSessionsCount : null
    },
    {
      label: "Find Coaches",
      path: "/coaches",
      icon: Users,
      description: "Browse Coaches"
    },
    {
      label: "New Assessment",
      path: "/?restart=true",
      icon: RefreshCw,
      description: "Start Over"
    }
  ];

  if (!user) {
    return (
      <div className="fixed top-0 right-0 z-50 p-4">
        <Card className="px-4 py-2 bg-card/95 backdrop-blur-sm border-border/50">
          <div className="text-sm text-center">
            <p className="text-muted-foreground mb-2">Sign in to access all features</p>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-card/95 backdrop-blur-sm"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Desktop navigation */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="font-bold text-lg">CoachConnect</div>
              <nav className="flex space-x-1">
                {navigationItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="relative"
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="ml-2 h-4 text-xs px-1"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-right">
                <p className="font-medium">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
          <div className="p-4 pt-16">
            <div className="space-y-4">
              <div className="text-center pb-4 border-b">
                <p className="font-medium">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>

              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="w-full justify-start text-left"
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <div>
                    <div className="flex items-center">
                      {item.label}
                      {item.badge && (
                        <Badge 
                          variant="destructive" 
                          className="ml-2 h-4 text-xs px-1"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.description}
                    </div>
                  </div>
                </Button>
              ))}

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};