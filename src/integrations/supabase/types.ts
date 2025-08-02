export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          is_active: boolean | null
          max_session_duration: number | null
          min_session_duration: number | null
          name: string
          notification_email: string | null
          notification_phone: string | null
          personal_experiences: string | null
          rating: number | null
          similar_experiences: string[]
          social_links: Json | null
          specialties: string[]
          timezone: string | null
          title: string
          total_reviews: number | null
          updated_at: string
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
          is_active?: boolean | null
          max_session_duration?: number | null
          min_session_duration?: number | null
          name: string
          notification_email?: string | null
          notification_phone?: string | null
          personal_experiences?: string | null
          rating?: number | null
          similar_experiences: string[]
          social_links?: Json | null
          specialties: string[]
          timezone?: string | null
          title: string
          total_reviews?: number | null
          updated_at?: string
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
          is_active?: boolean | null
          max_session_duration?: number | null
          min_session_duration?: number | null
          name?: string
          notification_email?: string | null
          notification_phone?: string | null
          personal_experiences?: string | null
          rating?: number | null
          similar_experiences?: string[]
          social_links?: Json | null
          specialties?: string[]
          timezone?: string | null
          title?: string
          total_reviews?: number | null
          updated_at?: string
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
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          notification_method: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          notification_method?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          notification_method?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_recordings: {
        Row: {
          ai_summary: string | null
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          recording_url: string | null
          session_id: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          recording_url?: string | null
          session_id: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          recording_url?: string | null
          session_id?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          client_id: string
          coach_id: string
          coin_cost: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          price_amount: number | null
          price_currency: string | null
          scheduled_time: string
          session_id: string
          status: string
          updated_at: string
          video_join_url: string | null
          video_room_id: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          client_id: string
          coach_id: string
          coin_cost?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          price_amount?: number | null
          price_currency?: string | null
          scheduled_time: string
          session_id: string
          status?: string
          updated_at?: string
          video_join_url?: string | null
          video_room_id?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          client_id?: string
          coach_id?: string
          coin_cost?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          price_amount?: number | null
          price_currency?: string | null
          scheduled_time?: string
          session_id?: string
          status?: string
          updated_at?: string
          video_join_url?: string | null
          video_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_guest_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
