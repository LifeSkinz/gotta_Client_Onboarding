import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBehavioralInsights } from './useBehavioralInsights';

interface AIInsightsState {
  personalityProfile: any | null;
  coachCompatibility: any | null;
  resourceRecommendations: any | null;
  coachingInsights: any | null;
  loading: boolean;
  error: string | null;
}

export const useAIInsights = () => {
  const [state, setState] = useState<AIInsightsState>({
    personalityProfile: null,
    coachCompatibility: null,
    resourceRecommendations: null,
    coachingInsights: null,
    loading: false,
    error: null
  });

  const {
    analyzeUserPersonality,
    predictCoachCompatibility,
    generateResourceRecommendations,
    generateCoachingInsights
  } = useBehavioralInsights();

  const triggerUserAnalysis = useCallback(async (
    userId: string,
    sessionData: any[] = [],
    responses: any[] = [],
    personalityResponses: any[] = []
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Trigger comprehensive behavioral analysis
      const { data, error } = await supabase.functions.invoke('analyze-user-behavior', {
        body: {
          userId,
          sessionData,
          responses,
          personalityResponses
        }
      });

      if (error) throw error;

      // Generate detailed personality profile
      const personalityProfile = await analyzeUserPersonality(
        userId,
        responses,
        sessionData,
        true // Include historical data
      );

      setState(prev => ({
        ...prev,
        personalityProfile,
        loading: false
      }));

      return { success: true, data, personalityProfile };
    } catch (error) {
      console.error('Failed to trigger user analysis:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      return { success: false, error: error.message };
    }
  }, [analyzeUserPersonality]);

  const getCoachCompatibility = useCallback(async (
    userId: string,
    coachIds: string[] = []
  ) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const compatibility = await predictCoachCompatibility(userId, coachIds);
      
      setState(prev => ({
        ...prev,
        coachCompatibility: compatibility,
        loading: false
      }));

      return compatibility;
    } catch (error) {
      console.error('Failed to get coach compatibility:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      return null;
    }
  }, [predictCoachCompatibility]);

  const getResourceRecommendations = useCallback(async (
    userId: string,
    context?: {
      goal?: any;
      session?: any;
      type?: string;
    }
  ) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const recommendations = await generateResourceRecommendations(
        userId,
        context?.goal,
        context?.session,
        context?.type || 'general'
      );
      
      setState(prev => ({
        ...prev,
        resourceRecommendations: recommendations,
        loading: false
      }));

      return recommendations;
    } catch (error) {
      console.error('Failed to get resource recommendations:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      return null;
    }
  }, [generateResourceRecommendations]);

  const getCoachingInsights = useCallback(async (
    userId: string,
    context?: {
      coachId?: string;
      sessionId?: string;
      type?: string;
    }
  ) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const insights = await generateCoachingInsights(
        userId,
        context?.coachId,
        context?.sessionId,
        context?.type || 'pre-session'
      );
      
      setState(prev => ({
        ...prev,
        coachingInsights: insights,
        loading: false
      }));

      return insights;
    } catch (error) {
      console.error('Failed to get coaching insights:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      return null;
    }
  }, [generateCoachingInsights]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearInsights = useCallback(() => {
    setState({
      personalityProfile: null,
      coachCompatibility: null,
      resourceRecommendations: null,
      coachingInsights: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    triggerUserAnalysis,
    getCoachCompatibility,
    getResourceRecommendations,
    getCoachingInsights,
    clearError,
    clearInsights
  };
};