import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ActivityData {
  action_details?: Record<string, any>;
  duration_seconds?: number;
  metadata?: Record<string, any>;
}

export const useActivityTracker = () => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);
  const startTimeRef = useRef<number>(Date.now());
  const currentPageRef = useRef<string>('');

  const trackActivity = async (
    activityType: string,
    pageUrl: string,
    data: ActivityData = {}
  ) => {
    try {
      await supabase.rpc('track_user_activity', {
        p_user_id: user?.id || null,
        p_session_token: user ? null : `guest_${Date.now()}`,
        p_activity_type: activityType,
        p_page_url: pageUrl,
        p_action_details: data.action_details || {},
        p_duration_seconds: data.duration_seconds || null,
        p_metadata: data.metadata || {}
      });
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  };

  const trackPageView = (pageUrl: string) => {
    const now = Date.now();
    const previousPageDuration = currentPageRef.current 
      ? Math.floor((now - startTimeRef.current) / 1000) 
      : null;

    // Track previous page exit if there was one
    if (currentPageRef.current && previousPageDuration) {
      trackActivity('page_exit', currentPageRef.current, {
        duration_seconds: previousPageDuration
      });
    }

    // Track new page view
    trackActivity('page_view', pageUrl);
    
    currentPageRef.current = pageUrl;
    startTimeRef.current = now;
  };

  const trackInteraction = (action: string, details: Record<string, any> = {}) => {
    trackActivity('interaction', currentPageRef.current, {
      action_details: { action, ...details }
    });
  };

  const trackSessionJoin = (sessionId: string, coachId: string) => {
    trackActivity('session_join', '/session', {
      action_details: { sessionId, coachId },
      metadata: { timestamp: new Date().toISOString() }
    });
  };

  const trackGoalSelection = (goalData: Record<string, any>) => {
    trackActivity('goal_selection', currentPageRef.current, {
      action_details: goalData,
      metadata: { step: 'goal_selection' }
    });
  };

  const trackQuestionAnswer = (questionId: string, answer: any) => {
    trackActivity('question_answer', currentPageRef.current, {
      action_details: { questionId, answer },
      metadata: { step: 'questionnaire' }
    });
  };

  const trackCoachSelection = (coachId: string, coachName: string) => {
    trackActivity('coach_selection', currentPageRef.current, {
      action_details: { coachId, coachName },
      metadata: { step: 'coach_selection' }
    });
  };

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentPageRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        trackActivity('page_blur', currentPageRef.current, {
          duration_seconds: duration
        });
      } else if (!document.hidden && currentPageRef.current) {
        startTimeRef.current = Date.now();
        trackActivity('page_focus', currentPageRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPageRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        // Use sendBeacon for reliable unload tracking
        navigator.sendBeacon('/api/track-unload', JSON.stringify({
          userId: user?.id,
          pageUrl: currentPageRef.current,
          duration
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id]);

  return {
    trackPageView,
    trackInteraction,
    trackSessionJoin,
    trackGoalSelection,
    trackQuestionAnswer,
    trackCoachSelection,
    trackActivity
  };
};