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
      coaches: {
        Row: {
          availability_hours: string | null
          avatar_url: string | null
          bio: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
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
          avatar_url?: string | null
          bio: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
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
          avatar_url?: string | null
          bio?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
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
          id: string
          recommended_coaches: string[] | null
          responses: Json
          selected_goal: Json
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          recommended_coaches?: string[] | null
          responses: Json
          selected_goal: Json
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          recommended_coaches?: string[] | null
          responses?: Json
          selected_goal?: Json
          session_id?: string
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
