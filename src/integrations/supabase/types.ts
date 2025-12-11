export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      coach_availability: {
        Row: {
          coach_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          start_time: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_onboarding_invitations: {
        Row: {
          coach_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string | null
          updated_at: string | null
          used_at: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          updated_at?: string | null
          used_at?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          updated_at?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_onboarding_invitations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          availability_hours: string | null
          available_now: boolean | null
          avatar_url: string | null
          bio: string
          booking_buffer_minutes: number | null
          calendar_link: string | null
          client_challenge_example: string | null
          coaching_expertise: string | null
          coaching_style: string | null
          created_at: string
          hourly_coin_cost: number | null
          hourly_rate_amount: number | null
          hourly_rate_currency: string | null
          id: string
          immediate_availability: boolean | null
          is_active: boolean | null
          max_session_duration: number | null
          min_session_duration: number | null
          name: string
          notification_email: string | null
          notification_phone: string | null
          personal_experiences: string | null
          rating: number | null
          response_preference_minutes: number | null
          similar_experiences: string[]
          social_links: Json | null
          specialties: string[]
          timezone: string | null
          title: string
          total_reviews: number | null
          updated_at: string
          user_id: string | null
          years_experience: number
        }
        Insert: {
          availability_hours?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          bio: string
          booking_buffer_minutes?: number | null
          calendar_link?: string | null
          client_challenge_example?: string | null
          coaching_expertise?: string | null
          coaching_style?: string | null
          created_at?: string
          hourly_coin_cost?: number | null
          hourly_rate_amount?: number | null
          hourly_rate_currency?: string | null
          id?: string
          immediate_availability?: boolean | null
          is_active?: boolean | null
          max_session_duration?: number | null
          min_session_duration?: number | null
          name: string
          notification_email?: string | null
          notification_phone?: string | null
          personal_experiences?: string | null
          rating?: number | null
          response_preference_minutes?: number | null
          similar_experiences: string[]
          social_links?: Json | null
          specialties: string[]
          timezone?: string | null
          title: string
          total_reviews?: number | null
          updated_at?: string
          user_id?: string | null
          years_experience: number
        }
        Update: {
          availability_hours?: string | null
          available_now?: boolean | null
          avatar_url?: string | null
          bio?: string
          booking_buffer_minutes?: number | null
          calendar_link?: string | null
          client_challenge_example?: string | null
          coaching_expertise?: string | null
          coaching_style?: string | null
          created_at?: string
          hourly_coin_cost?: number | null
          hourly_rate_amount?: number | null
          hourly_rate_currency?: string | null
          id?: string
          immediate_availability?: boolean | null
          is_active?: boolean | null
          max_session_duration?: number | null
          min_session_duration?: number | null
          name?: string
          notification_email?: string | null
          notification_phone?: string | null
          personal_experiences?: string | null
          rating?: number | null
          response_preference_minutes?: number | null
          similar_experiences?: string[]
          social_links?: Json | null
          specialties?: string[]
          timezone?: string | null
          title?: string
          total_reviews?: number | null
          updated_at?: string
          user_id?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      coaching_packages: {
        Row: {
          coach_id: string
          coin_cost: number
          created_at: string
          description: string
          duration_minutes: number
          features: string[]
          id: string
          is_active: boolean | null
          name: string
          package_type: string
          price_amount: number
          price_currency: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          coin_cost: number
          created_at?: string
          description: string
          duration_minutes: number
          features: string[]
          id?: string
          is_active?: boolean | null
          name: string
          package_type: string
          price_amount: number
          price_currency?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          coin_cost?: number
          created_at?: string
          description?: string
          duration_minutes?: number
          features?: string[]
          id?: string
          is_active?: boolean | null
          name?: string
          package_type?: string
          price_amount?: number
          price_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_packages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_packages: {
        Row: {
          bonus_coins: number | null
          coin_amount: number
          created_at: string
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_amount: number
          price_currency: string
          updated_at: string
        }
        Insert: {
          bonus_coins?: number | null
          coin_amount: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_amount: number
          price_currency?: string
          updated_at?: string
        }
        Update: {
          bonus_coins?: number | null
          coin_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_amount?: number
          price_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          client_bio: string | null
          client_goal: Json | null
          client_id: string
          coach_id: string
          created_at: string
          id: string
          request_type: string | null
          scheduled_time: string | null
          status: string | null
          updated_at: string
          video_link: string | null
        }
        Insert: {
          client_bio?: string | null
          client_goal?: Json | null
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
          request_type?: string | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          client_bio?: string | null
          client_goal?: Json | null
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          request_type?: string | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_themes: {
        Row: {
          first_mentioned_at: string
          id: string
          importance_score: number | null
          last_mentioned_at: string
          mention_count: number | null
          related_goals: string[] | null
          sentiment_trend: Json | null
          session_ids: string[] | null
          theme_description: string | null
          theme_name: string
          user_id: string
        }
        Insert: {
          first_mentioned_at?: string
          id?: string
          importance_score?: number | null
          last_mentioned_at?: string
          mention_count?: number | null
          related_goals?: string[] | null
          sentiment_trend?: Json | null
          session_ids?: string[] | null
          theme_description?: string | null
          theme_name: string
          user_id: string
        }
        Update: {
          first_mentioned_at?: string
          id?: string
          importance_score?: number | null
          last_mentioned_at?: string
          mention_count?: number | null
          related_goals?: string[] | null
          sentiment_trend?: Json | null
          session_ids?: string[] | null
          theme_description?: string | null
          theme_name?: string
          user_id?: string
        }
        Relationships: []
      }
      currency_settings: {
        Row: {
          coins_per_unit: number
          created_at: string
          currency_code: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          coins_per_unit: number
          created_at?: string
          currency_code: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          coins_per_unit?: number
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          attempts: number | null
          created_at: string | null
          dedup_key: string
          expires_at: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number | null
          payload: Json
          recipient_email: string
          recipient_name: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_name: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          dedup_key: string
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number | null
          payload: Json
          recipient_email: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_name: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          dedup_key?: string
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number | null
          payload?: Json
          recipient_email?: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_name?: string
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          expires_at: string
          recommended_coaches: Json | null
          responses: Json
          selected_goal: Json
          session_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          expires_at?: string
          recommended_coaches?: Json | null
          responses: Json
          selected_goal: Json
          session_id?: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          expires_at?: string
          recommended_coaches?: Json | null
          responses?: Json
          selected_goal?: Json
          session_id?: string
        }
        Relationships: []
      }
      pending_coach_applications: {
        Row: {
          created_at: string | null
          email: string
          experience: string
          id: string
          message: string
          name: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialties: string[]
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          experience: string
          id?: string
          message: string
          name: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties: string[]
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          experience?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialties?: string[]
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          average_session_rating: number | null
          bio: string | null
          coaching_history_summary: string | null
          communication_style: Json | null
          created_at: string
          email_verified: boolean | null
          engagement_patterns: Json | null
          full_name: string | null
          id: string
          last_session_at: string | null
          learning_preferences: Json | null
          motivation_triggers: string[] | null
          notification_method: string | null
          personality_traits: Json | null
          phone: string | null
          preferred_session_times: string[] | null
          success_patterns: Json | null
          total_sessions_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_session_rating?: number | null
          bio?: string | null
          coaching_history_summary?: string | null
          communication_style?: Json | null
          created_at?: string
          email_verified?: boolean | null
          engagement_patterns?: Json | null
          full_name?: string | null
          id?: string
          last_session_at?: string | null
          learning_preferences?: Json | null
          motivation_triggers?: string[] | null
          notification_method?: string | null
          personality_traits?: Json | null
          phone?: string | null
          preferred_session_times?: string[] | null
          success_patterns?: Json | null
          total_sessions_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_session_rating?: number | null
          bio?: string | null
          coaching_history_summary?: string | null
          communication_style?: Json | null
          created_at?: string
          email_verified?: boolean | null
          engagement_patterns?: Json | null
          full_name?: string | null
          id?: string
          last_session_at?: string | null
          learning_preferences?: Json | null
          motivation_triggers?: string[] | null
          notification_method?: string | null
          personality_traits?: Json | null
          phone?: string | null
          preferred_session_times?: string[] | null
          success_patterns?: Json | null
          total_sessions_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resource_interactions: {
        Row: {
          completion_percentage: number | null
          created_at: string
          duration_seconds: number | null
          engagement_score: number | null
          feedback_notes: string | null
          feedback_rating: number | null
          id: string
          interaction_type: string
          resource_id: string
          resource_title: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          duration_seconds?: number | null
          engagement_score?: number | null
          feedback_notes?: string | null
          feedback_rating?: number | null
          id?: string
          interaction_type: string
          resource_id: string
          resource_title?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          duration_seconds?: number | null
          engagement_score?: number | null
          feedback_notes?: string | null
          feedback_rating?: number | null
          id?: string
          interaction_type?: string
          resource_id?: string
          resource_title?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      session_analytics: {
        Row: {
          action_items: string[] | null
          ai_model_version: string | null
          barriers_identified: string[] | null
          challenges_faced: string[] | null
          coach_effectiveness_rating: number | null
          coach_id: string | null
          confidence_score: number | null
          created_at: string
          final_assessment: number | null
          follow_up_needed: boolean | null
          follow_up_notes: string | null
          goal_achievement_rating: number | null
          goal_category: string | null
          goal_description: string | null
          id: string
          initial_assessment: number | null
          insight_data: Json | null
          insight_type: string | null
          key_breakthroughs: string[] | null
          next_steps: string | null
          progress_notes: string | null
          session_id: string
          session_satisfaction_rating: number | null
          success_factors: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: string[] | null
          ai_model_version?: string | null
          barriers_identified?: string[] | null
          challenges_faced?: string[] | null
          coach_effectiveness_rating?: number | null
          coach_id?: string | null
          confidence_score?: number | null
          created_at?: string
          final_assessment?: number | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          goal_achievement_rating?: number | null
          goal_category?: string | null
          goal_description?: string | null
          id?: string
          initial_assessment?: number | null
          insight_data?: Json | null
          insight_type?: string | null
          key_breakthroughs?: string[] | null
          next_steps?: string | null
          progress_notes?: string | null
          session_id: string
          session_satisfaction_rating?: number | null
          success_factors?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: string[] | null
          ai_model_version?: string | null
          barriers_identified?: string[] | null
          challenges_faced?: string[] | null
          coach_effectiveness_rating?: number | null
          coach_id?: string | null
          confidence_score?: number | null
          created_at?: string
          final_assessment?: number | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          goal_achievement_rating?: number | null
          goal_category?: string | null
          goal_description?: string | null
          id?: string
          initial_assessment?: number | null
          insight_data?: Json | null
          insight_type?: string | null
          key_breakthroughs?: string[] | null
          next_steps?: string | null
          progress_notes?: string | null
          session_id?: string
          session_satisfaction_rating?: number | null
          success_factors?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_locks: {
        Row: {
          expires_at: string
          id: string
          locked_at: string
          locked_by: string
          metadata: Json | null
          operation_type: string
          session_id: string
        }
        Insert: {
          expires_at?: string
          id?: string
          locked_at?: string
          locked_by: string
          metadata?: Json | null
          operation_type: string
          session_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          locked_at?: string
          locked_by?: string
          metadata?: Json | null
          operation_type?: string
          session_id?: string
        }
        Relationships: []
      }
      session_recordings: {
        Row: {
          ai_summary: string | null
          coaching_effectiveness_score: number | null
          created_at: string
          duration_seconds: number | null
          emotional_journey: Json | null
          file_size_bytes: number | null
          id: string
          key_topics: string[] | null
          personality_insights: Json | null
          privacy_settings: Json | null
          recording_url: string | null
          sentiment_analysis: Json | null
          session_id: string
          transcript: string | null
          transcription_paused_segments: Json | null
          transcription_status: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          coaching_effectiveness_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          emotional_journey?: Json | null
          file_size_bytes?: number | null
          id?: string
          key_topics?: string[] | null
          personality_insights?: Json | null
          privacy_settings?: Json | null
          recording_url?: string | null
          sentiment_analysis?: Json | null
          session_id: string
          transcript?: string | null
          transcription_paused_segments?: Json | null
          transcription_status?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          coaching_effectiveness_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          emotional_journey?: Json | null
          file_size_bytes?: number | null
          id?: string
          key_topics?: string[] | null
          personality_insights?: Json | null
          privacy_settings?: Json | null
          recording_url?: string | null
          sentiment_analysis?: Json | null
          session_id?: string
          transcript?: string | null
          transcription_paused_segments?: Json | null
          transcription_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_state_logs: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          from_state: string | null
          id: string
          metadata: Json | null
          session_id: string
          to_state: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          to_state: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_state?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          to_state?: string
        }
        Relationships: []
      }
      session_video_details: {
        Row: {
          created_at: string
          id: string
          recording_url: string | null
          session_id: string
          updated_at: string
          video_join_url: string | null
          video_room_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          recording_url?: string | null
          session_id: string
          updated_at?: string
          video_join_url?: string | null
          video_room_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          recording_url?: string | null
          session_id?: string
          updated_at?: string
          video_join_url?: string | null
          video_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_video_details_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          accept_token: string | null
          accept_token_used_at: string | null
          actual_end_time: string | null
          actual_start_time: string | null
          client_id: string
          coach_id: string
          coin_cost: number | null
          connection_quality: Json | null
          created_at: string
          duration_minutes: number | null
          estimated_end_time: string | null
          id: string
          join_attempts: Json | null
          join_token: string
          last_error: string | null
          notes: string | null
          participant_status: Json | null
          price_amount: number | null
          price_currency: string | null
          reminder_sent_at: string | null
          resource_usage: Json | null
          retry_count: number | null
          scheduled_time: string
          session_state: string | null
          state_locked_at: string | null
          state_locked_by: string | null
          status: string
          token_expires_at: string | null
          token_used_at: string | null
          updated_at: string
        }
        Insert: {
          accept_token?: string | null
          accept_token_used_at?: string | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          client_id: string
          coach_id: string
          coin_cost?: number | null
          connection_quality?: Json | null
          created_at?: string
          duration_minutes?: number | null
          estimated_end_time?: string | null
          id?: string
          join_attempts?: Json | null
          join_token?: string
          last_error?: string | null
          notes?: string | null
          participant_status?: Json | null
          price_amount?: number | null
          price_currency?: string | null
          reminder_sent_at?: string | null
          resource_usage?: Json | null
          retry_count?: number | null
          scheduled_time: string
          session_state?: string | null
          state_locked_at?: string | null
          state_locked_by?: string | null
          status?: string
          token_expires_at?: string | null
          token_used_at?: string | null
          updated_at?: string
        }
        Update: {
          accept_token?: string | null
          accept_token_used_at?: string | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          client_id?: string
          coach_id?: string
          coin_cost?: number | null
          connection_quality?: Json | null
          created_at?: string
          duration_minutes?: number | null
          estimated_end_time?: string | null
          id?: string
          join_attempts?: Json | null
          join_token?: string
          last_error?: string | null
          notes?: string | null
          participant_status?: Json | null
          price_amount?: number | null
          price_currency?: string | null
          reminder_sent_at?: string | null
          resource_usage?: Json | null
          retry_count?: number | null
          scheduled_time?: string
          session_state?: string | null
          state_locked_at?: string | null
          state_locked_by?: string | null
          status?: string
          token_expires_at?: string | null
          token_used_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sessions_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_sessions_coach"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      system_capacity: {
        Row: {
          active_sessions_count: number
          db_connections_used: number
          id: string
          last_updated: string
          max_db_connections: number
          max_sessions_limit: number
        }
        Insert: {
          active_sessions_count?: number
          db_connections_used?: number
          id?: string
          last_updated?: string
          max_db_connections?: number
          max_sessions_limit?: number
        }
        Update: {
          active_sessions_count?: number
          db_connections_used?: number
          id?: string
          last_updated?: string
          max_db_connections?: number
          max_sessions_limit?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_currency: string | null
          amount_fiat: number | null
          coach_id: string | null
          coin_amount: number
          created_at: string
          id: string
          package_id: string | null
          status: string
          stripe_session_id: string | null
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_currency?: string | null
          amount_fiat?: number | null
          coach_id?: string | null
          coin_amount: number
          created_at?: string
          id?: string
          package_id?: string | null
          status?: string
          stripe_session_id?: string | null
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_currency?: string | null
          amount_fiat?: number | null
          coach_id?: string | null
          coin_amount?: number
          created_at?: string
          id?: string
          package_id?: string | null
          status?: string
          stripe_session_id?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "coaching_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_details: Json | null
          activity_type: string
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json | null
          page_url: string | null
          session_token: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          activity_type: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          page_url?: string | null
          session_token?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          activity_type?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          page_url?: string | null
          session_token?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_behavioral_patterns: {
        Row: {
          confidence_score: number | null
          id: string
          identified_at: string
          last_reinforced_at: string
          occurrence_count: number | null
          pattern_data: Json
          pattern_type: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          id?: string
          identified_at?: string
          last_reinforced_at?: string
          occurrence_count?: number | null
          pattern_data: Json
          pattern_type: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          id?: string
          identified_at?: string
          last_reinforced_at?: string
          occurrence_count?: number | null
          pattern_data?: Json
          pattern_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          progress_percentage: number | null
          source_session_id: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          progress_percentage?: number | null
          source_session_id?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          progress_percentage?: number | null
          source_session_id?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_responses: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          guest_session_id: string | null
          id: string
          recommended_coaches: string[] | null
          responses: Json
          selected_goal: Json
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          guest_session_id?: string | null
          id?: string
          recommended_coaches?: string[] | null
          responses: Json
          selected_goal: Json
          session_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          guest_session_id?: string | null
          id?: string
          recommended_coaches?: string[] | null
          responses?: Json
          selected_goal?: Json
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          goal_id: string | null
          id: string
          is_completed: boolean | null
          priority: string
          session_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string
          session_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string
          session_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "user_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          coin_balance: number | null
          created_at: string
          id: string
          total_coins_purchased: number | null
          total_coins_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coin_balance?: number | null
          created_at?: string
          id?: string
          total_coins_purchased?: number | null
          total_coins_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coin_balance?: number | null
          created_at?: string
          id?: string
          total_coins_purchased?: number | null
          total_coins_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_sessions: {
        Row: {
          connection_request_id: string
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          overtime_minutes: number | null
          recording_url: string | null
          session_id: string
          started_at: string | null
          status: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          connection_request_id: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          overtime_minutes?: number | null
          recording_url?: string | null
          session_id: string
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          connection_request_id?: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          overtime_minutes?: number | null
          recording_url?: string | null
          session_id?: string
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_sessions_connection_request_id_fkey"
            columns: ["connection_request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      table_sizes: {
        Row: {
          schemaname: unknown
          size: string | null
          size_bytes: number | null
          tablename: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      assign_coach_role: {
        Args: { _coach_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_guest_sessions: { Args: never; Returns: undefined }
      cleanup_expired_session_locks: { Args: never; Returns: number }
      cleanup_old_activity_logs: { Args: never; Returns: undefined }
      get_public_coaches: {
        Args: never
        Returns: {
          availability_hours: string | null
          available_now: boolean | null
          avatar_url: string | null
          bio: string
          booking_buffer_minutes: number | null
          calendar_link: string | null
          client_challenge_example: string | null
          coaching_expertise: string | null
          coaching_style: string | null
          created_at: string
          hourly_coin_cost: number | null
          hourly_rate_amount: number | null
          hourly_rate_currency: string | null
          id: string
          immediate_availability: boolean | null
          is_active: boolean | null
          max_session_duration: number | null
          min_session_duration: number | null
          name: string
          notification_email: string | null
          notification_phone: string | null
          personal_experiences: string | null
          rating: number | null
          response_preference_minutes: number | null
          similar_experiences: string[]
          social_links: Json | null
          specialties: string[]
          timezone: string | null
          title: string
          total_reviews: number | null
          updated_at: string
          user_id: string | null
          years_experience: number
        }[]
        SetofOptions: {
          from: "*"
          to: "coaches"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_session_by_join_token: {
        Args: { _join_token: string }
        Returns: {
          client_id: string
          coach_id: string
          duration_minutes: number
          id: string
          scheduled_time: string
          session_state: string
          status: string
          token_expires_at: string
          token_used_at: string
          video_join_url: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_invitation_used: {
        Args: { _coach_id: string; _token: string }
        Returns: boolean
      }
      pg_advisory_unlock: { Args: { lock_id: number }; Returns: boolean }
      pg_try_advisory_lock: { Args: { lock_id: number }; Returns: boolean }
      process_coin_purchase: {
        Args: {
          p_coin_amount: number
          p_stripe_session_id: string
          p_user_id: string
        }
        Returns: Json
      }
      spend_coins: {
        Args: { p_amount: number; p_session_id?: string; p_user_id: string }
        Returns: boolean
      }
      track_user_activity: {
        Args: {
          p_action_details?: Json
          p_activity_type: string
          p_duration_seconds?: number
          p_metadata?: Json
          p_page_url: string
          p_session_token: string
          p_user_id: string
        }
        Returns: string
      }
      update_behavioral_pattern: {
        Args: {
          p_confidence_score?: number
          p_pattern_data: Json
          p_pattern_type: string
          p_user_id: string
        }
        Returns: string
      }
      update_conversation_theme: {
        Args: {
          p_importance_score?: number
          p_sentiment_score?: number
          p_session_id?: string
          p_theme_description: string
          p_theme_name: string
          p_user_id: string
        }
        Returns: string
      }
      update_session_state: {
        Args: {
          p_locked_by: string
          p_metadata?: Json
          p_new_state: string
          p_reason?: string
          p_session_id: string
        }
        Returns: boolean
      }
      update_system_capacity: { Args: never; Returns: undefined }
      validate_invitation_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          is_valid: boolean
          used_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coach", "client"],
    },
  },
} as const
