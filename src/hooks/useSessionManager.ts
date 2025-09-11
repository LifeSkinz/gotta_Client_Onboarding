import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionStateUpdate {
  sessionId: string;
  newState: string;
  reason?: string;
  metadata?: Record<string, any>;
}

interface CapacityInfo {
  canCreateSession: boolean;
  activeSessionsCount: number;
  maxSessionsLimit: number;
  dbConnectionsUsed: number;
  maxDbConnections: number;
}

interface SessionBookingRequest {
  action: 'book_from_assessment' | 'convert_guest_session' | 'link_response_to_session';
  guestSessionId?: string;
  userId?: string;
  userResponseId?: string;
  coachId?: string;
  scheduledTime?: string;
  sessionDuration?: number;
  sessionId?: string;
  responseId?: string;
}

export const useSessionManager = () => {
  const [loading, setLoading] = useState(false);
  const [capacityInfo, setCapacityInfo] = useState<CapacityInfo | null>(null);
  const { toast } = useToast();

  const updateSessionState = useCallback(async ({ sessionId, newState, reason, metadata }: SessionStateUpdate) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-session-management', {
        body: {
          action: 'update_state',
          sessionId,
          newState,
          reason,
          metadata
        }
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error?.includes('lock')) {
          toast({
            title: "Session Busy",
            description: "Session is being modified by another process. Please try again.",
            variant: "destructive",
          });
          return { success: false, reason: 'locked' };
        }
        throw new Error(data.error);
      }

      toast({
        title: "Session Updated",
        description: `Session state changed to ${newState}`,
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error updating session state:', error);
      toast({
        title: "Error",
        description: "Failed to update session state",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkSystemCapacity = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-session-management', {
        body: { action: 'check_capacity' }
      });

      if (error) throw error;

      setCapacityInfo(data);
      return data;
    } catch (error) {
      console.error('Error checking system capacity:', error);
      toast({
        title: "Error",
        description: "Failed to check system capacity",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const createVideoRoom = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-session-management', {
        body: {
          action: 'create_video_room',
          sessionId
        }
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error?.includes('capacity')) {
          toast({
            title: "System Busy",
            description: "System is at capacity. Please try again later.",
            variant: "destructive",
          });
          return { success: false, reason: 'capacity' };
        }
        throw new Error(data.error);
      }

      toast({
        title: "Video Room Ready",
        description: "Video room has been created successfully",
      });

      return { success: true, videoJoinUrl: data.videoJoinUrl, videoRoomId: data.videoRoomId };
    } catch (error) {
      console.error('Error creating video room:', error);
      toast({
        title: "Error",
        description: "Failed to create video room",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const cleanupSession = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-session-management', {
        body: {
          action: 'cleanup_session',
          sessionId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Session Completed",
          description: "Session has been cleaned up successfully",
        });
      }

      return data;
    } catch (error) {
      console.error('Error cleaning up session:', error);
      return { success: false, error };
    }
  }, [toast]);

  const bookSession = useCallback(async (request: SessionBookingRequest) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('session-booking-bridge', {
        body: request
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error?.includes('capacity')) {
          toast({
            title: "System Busy",
            description: "System is at capacity. Please try again later.",
            variant: "destructive",
          });
          return { success: false, reason: 'capacity' };
        }
        throw new Error(data.error);
      }

      toast({
        title: "Session Booked",
        description: data.message || "Session has been booked successfully",
      });

      return { success: true, ...data };
    } catch (error) {
      console.error('Error booking session:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to book session. Please try again.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    capacityInfo,
    updateSessionState,
    checkSystemCapacity,
    createVideoRoom,
    cleanupSession,
    bookSession,
  };
};