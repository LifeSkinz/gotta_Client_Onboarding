import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// This component handles redirects from the join-session edge function
export function JoinSessionRedirect() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Call the edge function that handles the actual join logic
      window.location.href = `https://nqoysxjjimvihcvfpesr.supabase.co/functions/v1/join-session?token=${token}`;
    } else {
      // No token provided, redirect to error page
      window.location.href = '/?error=missing-token';
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Preparing your session...</p>
      </div>
    </div>
  );
}