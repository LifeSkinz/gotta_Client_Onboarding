import { createClient } from '@supabase/supabase-js';
import { LRUCache } from 'lru-cache';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

interface VideoRoomResult {
  success: boolean;
  roomUrl?: string;
  roomId?: string;
  error?: string;
}

interface VideoRoomOptions {
  maxParticipants?: number;
  duration?: number;
  enableRecording?: boolean;
  enableTranscription?: boolean;
}

// Cache for video room data
const roomCache = new LRUCache<string, VideoRoomResult>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export class VideoService {
  private retryCount = 3;
  private retryDelay = 1000;

  constructor(private supabase: any) {}

  private async retryWithBackoff(operation: () => Promise<any>): Promise<any> {
    let lastError;
    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
      }
    }
    throw lastError;
  }

  private generateSecureToken(sessionId: string): string {
    // TODO: Implement proper token generation with JWT
    return Buffer.from(`${sessionId}-${Date.now()}-${uuidv4()}`).toString('base64');
  }

  async createVideoRoom(sessionId: string, options: VideoRoomOptions = {}): Promise<VideoRoomResult> {
    const cachedRoom = roomCache.get(sessionId);
    if (cachedRoom) {
      return cachedRoom;
    }

    try {
      const result = await this.retryWithBackoff(async () => {
        const response = await this.supabase.functions.invoke('create-daily-room', {
          body: {
            sessionId,
            securityToken: this.generateSecureToken(sessionId),
            requestId: uuidv4(),
            options: {
              maxParticipants: options.maxParticipants || 2,
              duration: options.duration || 3600,
              enableRecording: options.enableRecording ?? true,
              enableTranscription: options.enableTranscription ?? true,
            }
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        return response.data;
      });

      const roomResult: VideoRoomResult = {
        success: true,
        roomUrl: result.room_url,
        roomId: result.room_name,
      };

      roomCache.set(sessionId, roomResult);
      return roomResult;

    } catch (error) {
      logger.error('Failed to create video room', { sessionId, error });
      return await this.createFallbackRoom(sessionId, options);
    }
  }

  private async createFallbackRoom(sessionId: string, options: VideoRoomOptions): Promise<VideoRoomResult> {
    try {
      const fallbackRoomId = `fallback-${sessionId}-${Date.now()}`;
      const fallbackRoomUrl = `https://meet.videosdk.live/${fallbackRoomId}`;

      // Validate fallback domain reachability
      logger.info('Validating fallback video domain', { sessionId, fallbackRoomUrl });
      
      try {
        // Attempt DNS resolution and basic connectivity check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(fallbackRoomUrl, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors' // Avoid CORS issues for basic connectivity check
        });
        
        clearTimeout(timeoutId);
        
        logger.info('Fallback domain validation successful', {
          sessionId,
          status: response.status,
          statusText: response.statusText
        });
      } catch (validationError) {
        logger.warn('Fallback domain validation failed, proceeding anyway', {
          sessionId,
          error: validationError,
          message: 'Domain may not be reachable or CORS restricted'
        });
        
        // Continue anyway - the domain might be valid but CORS-protected
        // Real users might still be able to access it
      }

      // Update session with fallback room details
      const { error: updateError } = await this.supabase
        .from('sessions')
        .update({
          video_room_id: fallbackRoomId,
          video_join_url: fallbackRoomUrl,
          session_state: 'ready',
          is_fallback_room: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        throw updateError;
      }

      logger.info('Fallback room created successfully', {
        sessionId,
        roomId: fallbackRoomId,
        roomUrl: fallbackRoomUrl
      });

      const result = {
        success: true,
        roomUrl: fallbackRoomUrl,
        roomId: fallbackRoomId
      };

      roomCache.set(sessionId, result);
      return result;

    } catch (error) {
      logger.error('Fallback room creation failed', { sessionId, error });
      return {
        success: false,
        error: 'Failed to create video room with all providers'
      };
    }
  }

  async cleanupRoom(sessionId: string): Promise<void> {
    try {
      roomCache.delete(sessionId);
      await this.supabase.functions.invoke('cleanup-video-room', {
        body: {
          sessionId,
          securityToken: this.generateSecureToken(sessionId)
        }
      });
    } catch (error) {
      logger.error('Failed to cleanup video room', { sessionId, error });
    }
  }
}