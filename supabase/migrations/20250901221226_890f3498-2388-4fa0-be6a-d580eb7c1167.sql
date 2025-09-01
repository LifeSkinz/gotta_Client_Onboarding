-- Phase 2: Comprehensive User Data Architecture

-- Enhanced user activity tracking
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT, -- For guest users
  activity_type TEXT NOT NULL, -- 'page_view', 'interaction', 'session_join', etc.
  page_url TEXT,
  action_details JSONB DEFAULT '{}',
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session goals and progress tracking
CREATE TABLE public.session_goals_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  goal_category TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  initial_assessment INTEGER CHECK (initial_assessment >= 1 AND initial_assessment <= 10),
  final_assessment INTEGER CHECK (final_assessment >= 1 AND final_assessment <= 10),
  progress_notes TEXT,
  barriers_identified TEXT[],
  success_factors TEXT[],
  next_steps TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User behavioral patterns and insights
CREATE TABLE public.user_behavioral_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'communication_style', 'engagement_pattern', 'learning_style'
  pattern_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  identified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reinforced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  occurrence_count INTEGER DEFAULT 1
);

-- Resource interactions and engagement
CREATE TABLE public.resource_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'exercise', 'article', 'video', 'assessment'
  resource_id TEXT NOT NULL,
  resource_title TEXT,
  interaction_type TEXT NOT NULL, -- 'view', 'complete', 'bookmark', 'share'
  duration_seconds INTEGER,
  completion_percentage NUMERIC(5,2),
  engagement_score NUMERIC(3,2) CHECK (engagement_score >= 0 AND engagement_score <= 1),
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session insights and AI analysis
CREATE TABLE public.session_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'personality_trait', 'communication_style', 'goal_progress', 'barrier_identification'
  insight_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ai_model_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session outcomes and effectiveness tracking
CREATE TABLE public.session_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  session_satisfaction_rating INTEGER CHECK (session_satisfaction_rating >= 1 AND session_satisfaction_rating <= 10),
  goal_achievement_rating INTEGER CHECK (goal_achievement_rating >= 1 AND goal_achievement_rating <= 10),
  coach_effectiveness_rating INTEGER CHECK (coach_effectiveness_rating >= 1 AND coach_effectiveness_rating <= 10),
  key_breakthroughs TEXT[],
  challenges_faced TEXT[],
  action_items TEXT[],
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation themes across sessions
CREATE TABLE public.conversation_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL,
  theme_description TEXT,
  first_mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mention_count INTEGER DEFAULT 1,
  sentiment_trend JSONB DEFAULT '[]', -- Array of sentiment scores over time
  importance_score NUMERIC(3,2) CHECK (importance_score >= 0 AND importance_score <= 1),
  related_goals TEXT[],
  session_ids UUID[]
);

-- Enhanced profiles with behavioral insights
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personality_traits JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS communication_style JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS engagement_patterns JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_preferences JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS motivation_triggers TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS success_patterns JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_session_times TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coaching_history_summary TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_sessions_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS average_session_rating NUMERIC(3,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMP WITH TIME ZONE;

-- Enhanced session recordings with AI insights
ALTER TABLE public.session_recordings ADD COLUMN IF NOT EXISTS sentiment_analysis JSONB DEFAULT '{}';
ALTER TABLE public.session_recordings ADD COLUMN IF NOT EXISTS key_topics TEXT[];
ALTER TABLE public.session_recordings ADD COLUMN IF NOT EXISTS personality_insights JSONB DEFAULT '{}';
ALTER TABLE public.session_recordings ADD COLUMN IF NOT EXISTS emotional_journey JSONB DEFAULT '[]';
ALTER TABLE public.session_recordings ADD COLUMN IF NOT EXISTS coaching_effectiveness_score NUMERIC(3,2);

-- Enable RLS on all new tables
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_goals_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavioral_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activity_logs
CREATE POLICY "Users can view their own activity logs" ON public.user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert activity logs" ON public.user_activity_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for session_goals_tracking
CREATE POLICY "Users can view their own session goals" ON public.session_goals_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own session goals" ON public.session_goals_tracking
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can manage session goals" ON public.session_goals_tracking
  FOR ALL USING (true);

-- RLS Policies for user_behavioral_patterns
CREATE POLICY "Users can view their own behavioral patterns" ON public.user_behavioral_patterns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage behavioral patterns" ON public.user_behavioral_patterns
  FOR ALL USING (true);

-- RLS Policies for resource_interactions
CREATE POLICY "Users can view their own resource interactions" ON public.resource_interactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own resource interactions" ON public.resource_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resource interactions" ON public.resource_interactions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for session_insights
CREATE POLICY "Users can view insights for their sessions" ON public.session_insights
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = session_insights.session_id 
    AND sessions.client_id = auth.uid()
  ));
CREATE POLICY "System can manage session insights" ON public.session_insights
  FOR ALL USING (true);

-- RLS Policies for session_outcomes
CREATE POLICY "Users can view their own session outcomes" ON public.session_outcomes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own session outcomes" ON public.session_outcomes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can manage session outcomes" ON public.session_outcomes
  FOR ALL USING (true);

-- RLS Policies for conversation_themes
CREATE POLICY "Users can view their own conversation themes" ON public.conversation_themes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage conversation themes" ON public.conversation_themes
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_activity_logs_user_id_created_at ON public.user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_session_goals_tracking_user_id ON public.session_goals_tracking(user_id);
CREATE INDEX idx_user_behavioral_patterns_user_id_type ON public.user_behavioral_patterns(user_id, pattern_type);
CREATE INDEX idx_resource_interactions_user_id_created_at ON public.resource_interactions(user_id, created_at DESC);
CREATE INDEX idx_session_insights_session_id ON public.session_insights(session_id);
CREATE INDEX idx_session_outcomes_user_id ON public.session_outcomes(user_id);
CREATE INDEX idx_conversation_themes_user_id ON public.conversation_themes(user_id);

-- Create triggers for automatic timestamps
CREATE TRIGGER update_session_goals_tracking_updated_at
  BEFORE UPDATE ON public.session_goals_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_outcomes_updated_at
  BEFORE UPDATE ON public.session_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to track user activity
CREATE OR REPLACE FUNCTION public.track_user_activity(
  p_user_id UUID,
  p_session_token TEXT,
  p_activity_type TEXT,
  p_page_url TEXT,
  p_action_details JSONB DEFAULT '{}',
  p_duration_seconds INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id,
    session_token,
    activity_type,
    page_url,
    action_details,
    duration_seconds,
    metadata
  ) VALUES (
    p_user_id,
    p_session_token,
    p_activity_type,
    p_page_url,
    p_action_details,
    p_duration_seconds,
    p_metadata
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user behavioral patterns
CREATE OR REPLACE FUNCTION public.update_behavioral_pattern(
  p_user_id UUID,
  p_pattern_type TEXT,
  p_pattern_data JSONB,
  p_confidence_score NUMERIC DEFAULT 0.8
)
RETURNS UUID AS $$
DECLARE
  pattern_id UUID;
BEGIN
  -- Try to update existing pattern
  UPDATE public.user_behavioral_patterns 
  SET 
    pattern_data = p_pattern_data,
    confidence_score = p_confidence_score,
    last_reinforced_at = now(),
    occurrence_count = occurrence_count + 1
  WHERE user_id = p_user_id AND pattern_type = p_pattern_type
  RETURNING id INTO pattern_id;
  
  -- If no existing pattern, create new one
  IF pattern_id IS NULL THEN
    INSERT INTO public.user_behavioral_patterns (
      user_id,
      pattern_type,
      pattern_data,
      confidence_score
    ) VALUES (
      p_user_id,
      p_pattern_type,
      p_pattern_data,
      p_confidence_score
    ) RETURNING id INTO pattern_id;
  END IF;
  
  RETURN pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation themes
CREATE OR REPLACE FUNCTION public.update_conversation_theme(
  p_user_id UUID,
  p_theme_name TEXT,
  p_theme_description TEXT,
  p_sentiment_score NUMERIC DEFAULT 0.5,
  p_importance_score NUMERIC DEFAULT 0.5,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  theme_id UUID;
  current_sentiment JSONB;
BEGIN
  -- Try to update existing theme
  SELECT id, sentiment_trend INTO theme_id, current_sentiment
  FROM public.conversation_themes 
  WHERE user_id = p_user_id AND theme_name = p_theme_name;
  
  IF theme_id IS NOT NULL THEN
    -- Update existing theme
    UPDATE public.conversation_themes 
    SET 
      theme_description = p_theme_description,
      last_mentioned_at = now(),
      mention_count = mention_count + 1,
      sentiment_trend = (current_sentiment::jsonb || jsonb_build_array(jsonb_build_object('score', p_sentiment_score, 'timestamp', now()))),
      importance_score = GREATEST(importance_score, p_importance_score),
      session_ids = CASE 
        WHEN p_session_id IS NOT NULL AND NOT (session_ids @> ARRAY[p_session_id]) 
        THEN array_append(session_ids, p_session_id)
        ELSE session_ids
      END
    WHERE id = theme_id;
  ELSE
    -- Create new theme
    INSERT INTO public.conversation_themes (
      user_id,
      theme_name,
      theme_description,
      sentiment_trend,
      importance_score,
      session_ids
    ) VALUES (
      p_user_id,
      p_theme_name,
      p_theme_description,
      jsonb_build_array(jsonb_build_object('score', p_sentiment_score, 'timestamp', now())),
      p_importance_score,
      CASE WHEN p_session_id IS NOT NULL THEN ARRAY[p_session_id] ELSE ARRAY[]::UUID[] END
    ) RETURNING id INTO theme_id;
  END IF;
  
  RETURN theme_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;