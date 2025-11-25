import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// This component handles redirects from the join-session edge function
export function JoinSessionRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const joinSession = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        toast({
          title: "Missing Token",
          description: "No session token provided.",
          variant: "destructive",
        });
        navigate('/?error=missing-token');
        return;
      }

      try {
        // Use Supabase client to invoke the edge function
        const { data, error } = await supabase.functions.invoke('join-session', {
          body: { token },
        });

        if (error) throw error;

        // Redirect to the session portal or video URL
        if (data?.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      } catch (error) {
        console.error('Error joining session:', error);
        toast({
          title: "Error",
          description: "Failed to join session. Please try again.",
          variant: "destructive",
        });
        navigate('/?error=join-failed');
      }
    };

    joinSession();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Preparing your session...</p>
      </div>
    </div>
  );
}