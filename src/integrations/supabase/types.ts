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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          channel: string
          clicks: number
          conversions: number
          created_at: string
          id: string
          name: string
          revenue: number
          spend: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          name: string
          revenue?: number
          spend?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          name?: string
          revenue?: number
          spend?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          channel: string
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          orders_count: number
          phone: string | null
          state: string | null
          total_spent: number
          updated_at: string
        }
        Insert: {
          channel?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          orders_count?: number
          phone?: string | null
          state?: string | null
          total_spent?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          orders_count?: number
          phone?: string | null
          state?: string | null
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          channel: string
          connected: boolean
          created_at: string
          id: string
          label: string
          last_sync_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          connected?: boolean
          created_at?: string
          id?: string
          label: string
          last_sync_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          connected?: boolean
          created_at?: string
          id?: string
          label?: string
          last_sync_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          answered: boolean
          body: string
          channel: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          received_at: string
          subject: string | null
        }
        Insert: {
          answered?: boolean
          body: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          received_at?: string
          subject?: string | null
        }
        Update: {
          answered?: boolean
          body?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          received_at?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          items_count: number
          order_number: string
          placed_at: string
          shipping_cost: number
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items_count?: number
          order_number: string
          placed_at?: string
          shipping_cost?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items_count?: number
          order_number?: string
          placed_at?: string
          shipping_cost?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          channel: string
          created_at: string
          id: string
          price: number
          sku: string
          status: string
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          price?: number
          sku: string
          status?: string
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          price?: number
          sku?: string
          status?: string
          stock?: number
          title?: string
          updated_at?: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
