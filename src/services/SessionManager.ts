import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from './logger';
import { VideoService } from './VideoService';

export type SessionState = 
  | 'initializing'
  | 'ready'
  | 'in_progress'
  | 'paused'
  | 'ended'
  | 'error';

export type VideoState = 
  | 'preparing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

interface SessionData {
  id: string;
  client_id: string;
  coach_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  video_join_url?: string;
  video_room_id?: string;
  session_state: SessionState;
}

export class SessionManager {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private readonly videoService: VideoService;

  constructor(private supabase: any) {
    this.videoService = new VideoService(supabase);
  }

  async initializeSession(sessionId: string): Promise<SessionData> {
    try {
      const { data, error } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      // Subscribe to session updates
      this.subscribeToSessionUpdates(sessionId);

      return data;
    } catch (error) {
      logger.error('Failed to initialize session', { sessionId, error });
      throw error;
    }
  }

  private subscribeToSessionUpdates(sessionId: string) {
    if (this.subscriptions.has(sessionId)) return;

    const subscription = this.supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload: any) => {
          this.handleSessionUpdate(sessionId, payload.new);
        }
      )
      .subscribe();

    this.subscriptions.set(sessionId, subscription);
  }

  private handleSessionUpdate(sessionId: string, newData: any) {
    try {
      // Emit session update event
      window.dispatchEvent(
        new CustomEvent('session-update', {
          detail: { sessionId, data: newData }
        })
      );
    } catch (error) {
      logger.error('Error handling session update', { sessionId, error });
    }
  }

  async transitionState(
    sessionId: string, 
    newState: SessionState, 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sessions')
        .update({
          session_state: newState,
          metadata: {
            ...metadata,
            last_state_change: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Handle specific state transitions
      switch (newState) {
        case 'in_progress':
          await this.startSessionRecording(sessionId);
          break;
        case 'ended':
          await this.finalizeSession(sessionId);
          break;
        case 'error':
          await this.handleSessionError(sessionId, metadata.error);
          break;
      }
    } catch (error) {
      logger.error('Failed to transition session state', { sessionId, newState, error });
      throw error;
    }
  }

  private async startSessionRecording(sessionId: string): Promise<void> {
    try {
      await this.supabase.functions.invoke('start-session-recording', {
        body: { sessionId }
      });
    } catch (error) {
      logger.error('Failed to start session recording', { sessionId, error });
    }
  }

  private async finalizeSession(sessionId: string): Promise<void> {
    try {
      await Promise.all([
        this.videoService.cleanupRoom(sessionId),
        this.supabase.functions.invoke('finalize-session', {
          body: { sessionId }
        })
      ]);

      // Cleanup subscription
      const subscription = this.subscriptions.get(sessionId);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(sessionId);
      }
    } catch (error) {
      logger.error('Failed to finalize session', { sessionId, error });
    }
  }

  private async handleSessionError(sessionId: string, error: any): Promise<void> {
    logger.error('Session error occurred', { sessionId, error });
    
    try {
      // Notify relevant parties
      await this.supabase.functions.invoke('notify-session-error', {
        body: {
          sessionId,
          error: error?.message || 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
    } catch (notifyError) {
      logger.error('Failed to notify session error', { sessionId, error: notifyError });
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup all subscriptions
    for (const [sessionId, subscription] of this.subscriptions.entries()) {
      subscription.unsubscribe();
      this.subscriptions.delete(sessionId);
    }
  }
}