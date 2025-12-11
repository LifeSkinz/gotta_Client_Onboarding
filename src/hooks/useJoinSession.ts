import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JoinSessionResult {
  roomUrlWithToken: string;
  roomUrl: string;
  displayName: string;
  role: 'coach' | 'client';
  isOwner: boolean;
  expiresAt: string;
}

export function useJoinSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateToken = useCallback(async (sessionId: string): Promise<JoinSessionResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-daily-token', {
        body: { sessionId }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate session token');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate session token');
      }

      return {
        roomUrlWithToken: data.roomUrlWithToken,
        roomUrl: data.roomUrl,
        displayName: data.displayName,
        role: data.role,
        isOwner: data.isOwner,
        expiresAt: data.expiresAt
      };
    } catch (err: any) {
      console.error('Error generating session token:', err);
      setError(err.message);
      toast({
        title: "Failed to join session",
        description: err.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const joinSession = useCallback(async (sessionId: string, openInNewTab = true): Promise<string | null> => {
    const result = await generateToken(sessionId);
    
    if (result?.roomUrlWithToken) {
      if (openInNewTab) {
        window.open(result.roomUrlWithToken, '_blank');
      }
      return result.roomUrlWithToken;
    }
    
    return null;
  }, [generateToken]);

  return {
    loading,
    error,
    generateToken,
    joinSession
  };
}
