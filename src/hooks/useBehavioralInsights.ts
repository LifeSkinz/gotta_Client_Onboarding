import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBehavioralInsights = () => {
  const updateBehavioralPattern = useCallback(async (
    userId: string,
    patternType: string,
    patternData: Record<string, any>,
    confidenceScore: number = 0.8
  ) => {
    try {
      await supabase.rpc('update_behavioral_pattern', {
        p_user_id: userId,
        p_pattern_type: patternType,
        p_pattern_data: patternData,
        p_confidence_score: confidenceScore
      });
    } catch (error) {
      console.error('Failed to update behavioral pattern:', error);
    }
  }, []);

  const updateConversationTheme = useCallback(async (
    userId: string,
    themeName: string,
    themeDescription: string,
    sentimentScore: number = 0.5,
    importanceScore: number = 0.5,
    sessionId?: string
  ) => {
    try {
      await supabase.rpc('update_conversation_theme', {
        p_user_id: userId,
        p_theme_name: themeName,
        p_theme_description: themeDescription,
        p_sentiment_score: sentimentScore,
        p_importance_score: importanceScore,
        p_session_id: sessionId
      });
    } catch (error) {
      console.error('Failed to update conversation theme:', error);
    }
  }, []);

  const analyzeUserPersonality = useCallback(async (
    userId: string,
    responses: any[],
    sessionData: any[] = [],
    includeHistoricalData: boolean = false
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-personality-profile', {
        body: {
          userId,
          responses,
          sessionData,
          includeHistoricalData
        }
      });

      if (error) {
        console.error('Failed to analyze personality:', error);
        return null;
      }

      return data.profile;
    } catch (error) {
      console.error('Failed to analyze user personality:', error);
      return null;
    }
  }, []);

  const predictCoachCompatibility = useCallback(async (
    userId: string,
    coachIds: string[] = []
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('predict-coach-compatibility', {
        body: {
          userId,
          coachIds,
          analysisMode: 'compatibility'
        }
      });

      if (error) {
        console.error('Failed to predict compatibility:', error);
        return null;
      }

      return data.compatibility;
    } catch (error) {
      console.error('Failed to predict coach compatibility:', error);
      return null;
    }
  }, []);

  const generateResourceRecommendations = useCallback(async (
    userId: string,
    goalContext?: any,
    sessionContext?: any,
    recommendationType: string = 'general'
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('recommend-resources', {
        body: {
          userId,
          goalContext,
          sessionContext,
          recommendationType
        }
      });

      if (error) {
        console.error('Failed to generate recommendations:', error);
        return null;
      }

      return data.recommendations;
    } catch (error) {
      console.error('Failed to generate resource recommendations:', error);
      return null;
    }
  }, []);

  const generateCoachingInsights = useCallback(async (
    userId: string,
    coachId?: string,
    sessionId?: string,
    insightType: string = 'pre-session'
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-coaching-insights', {
        body: {
          userId,
          coachId,
          sessionId,
          insightType
        }
      });

      if (error) {
        console.error('Failed to generate insights:', error);
        return null;
      }

      return data.insights;
    } catch (error) {
      console.error('Failed to generate coaching insights:', error);
      return null;
    }
  }, []);

  const trackResourceInteraction = useCallback(async (
    userId: string,
    resourceType: string,
    resourceId: string,
    resourceTitle: string,
    interactionType: string,
    duration?: number,
    completionPercentage?: number
  ) => {
    try {
      await supabase
        .from('resource_interactions')
        .insert({
          user_id: userId,
          resource_type: resourceType,
          resource_id: resourceId,
          resource_title: resourceTitle,
          interaction_type: interactionType,
          duration_seconds: duration,
          completion_percentage: completionPercentage,
          engagement_score: Math.min(1, (completionPercentage || 0) / 100)
        });
    } catch (error) {
      console.error('Failed to track resource interaction:', error);
    }
  }, []);

  const recordSessionOutcome = useCallback(async (
    sessionId: string,
    userId: string,
    coachId: string,
    outcomes: {
      sessionSatisfaction: number;
      goalAchievement: number;
      coachEffectiveness: number;
      keyBreakthroughs?: string[];
      challengesFaced?: string[];
      actionItems?: string[];
      followUpNeeded?: boolean;
      followUpNotes?: string;
    }
  ) => {
    try {
      await supabase
        .from('session_analytics')
        .insert({
          session_id: sessionId,
          user_id: userId,
          coach_id: coachId,
          session_satisfaction_rating: outcomes.sessionSatisfaction,
          goal_achievement_rating: outcomes.goalAchievement,
          coach_effectiveness_rating: outcomes.coachEffectiveness,
          key_breakthroughs: outcomes.keyBreakthroughs || [],
          challenges_faced: outcomes.challengesFaced || [],
          action_items: outcomes.actionItems || [],
          follow_up_needed: outcomes.followUpNeeded || false,
          follow_up_notes: outcomes.followUpNotes
        });
    } catch (error) {
      console.error('Failed to record session outcome:', error);
    }
  }, []);

  return {
    updateBehavioralPattern,
    updateConversationTheme,
    analyzeUserPersonality,
    predictCoachCompatibility,
    generateResourceRecommendations,
    generateCoachingInsights,
    trackResourceInteraction,
    recordSessionOutcome
  };
};