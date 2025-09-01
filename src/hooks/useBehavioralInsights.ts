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
    responses: any[],
    sessionData: any[]
  ) => {
    // Placeholder for personality analysis logic
    // This would integrate with OpenAI or other AI services
    const personalityTraits = {
      openness: Math.random() * 100,
      conscientiousness: Math.random() * 100,
      extraversion: Math.random() * 100,
      agreeableness: Math.random() * 100,
      neuroticism: Math.random() * 100
    };

    const communicationStyle = {
      directness: Math.random() * 100,
      analyticalThinking: Math.random() * 100,
      emotionalExpression: Math.random() * 100,
      conflictStyle: ['collaborative', 'competitive', 'accommodating'][Math.floor(Math.random() * 3)]
    };

    return {
      personalityTraits,
      communicationStyle,
      engagementPatterns: {
        preferredSessionLength: '45-60 minutes',
        bestTimeOfDay: 'morning',
        responseToFeedback: 'positive'
      }
    };
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
        .from('session_outcomes')
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
    trackResourceInteraction,
    recordSessionOutcome
  };
};