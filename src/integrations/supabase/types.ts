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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accrual_entries: {
        Row: {
          accrual_date: string
          commitment_balance: number | null
          commitment_fee_rate: number | null
          created_at: string
          daily_commitment_fee: number | null
          daily_interest: number
          id: string
          interest_rate: number
          is_pik: boolean | null
          loan_id: string
          period_id: string | null
          principal_balance: number
        }
        Insert: {
          accrual_date: string
          commitment_balance?: number | null
          commitment_fee_rate?: number | null
          created_at?: string
          daily_commitment_fee?: number | null
          daily_interest: number
          id?: string
          interest_rate: number
          is_pik?: boolean | null
          loan_id: string
          period_id?: string | null
          principal_balance: number
        }
        Update: {
          accrual_date?: string
          commitment_balance?: number | null
          commitment_fee_rate?: number | null
          created_at?: string
          daily_commitment_fee?: number | null
          daily_interest?: number
          id?: string
          interest_rate?: number
          is_pik?: boolean | null
          loan_id?: string
          period_id?: string | null
          principal_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "accrual_entries_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accrual_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      afas_invoice_sync: {
        Row: {
          afas_amount: number
          afas_debtor_id: string | null
          afas_description: string | null
          afas_due_date: string | null
          afas_invoice_date: string | null
          afas_invoice_nr: string
          afas_open_amount: number | null
          afas_raw_data: Json | null
          amount_difference: number | null
          id: string
          is_paid: boolean | null
          last_updated_at: string
          loan_id: string | null
          match_notes: string | null
          match_status: string
          parsed_loan_number: string | null
          parsed_period_month: string | null
          payment_date: string | null
          period_id: string | null
          synced_at: string
          tmo_expected_amount: number | null
        }
        Insert: {
          afas_amount: number
          afas_debtor_id?: string | null
          afas_description?: string | null
          afas_due_date?: string | null
          afas_invoice_date?: string | null
          afas_invoice_nr: string
          afas_open_amount?: number | null
          afas_raw_data?: Json | null
          amount_difference?: number | null
          id?: string
          is_paid?: boolean | null
          last_updated_at?: string
          loan_id?: string | null
          match_notes?: string | null
          match_status?: string
          parsed_loan_number?: string | null
          parsed_period_month?: string | null
          payment_date?: string | null
          period_id?: string | null
          synced_at?: string
          tmo_expected_amount?: number | null
        }
        Update: {
          afas_amount?: number
          afas_debtor_id?: string | null
          afas_description?: string | null
          afas_due_date?: string | null
          afas_invoice_date?: string | null
          afas_invoice_nr?: string
          afas_open_amount?: number | null
          afas_raw_data?: Json | null
          amount_difference?: number | null
          id?: string
          is_paid?: boolean | null
          last_updated_at?: string
          loan_id?: string | null
          match_notes?: string | null
          match_status?: string
          parsed_loan_number?: string | null
          parsed_period_month?: string | null
          payment_date?: string | null
          period_id?: string | null
          synced_at?: string
          tmo_expected_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "afas_invoice_sync_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afas_invoice_sync_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      afas_sync_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          invoices_fetched: number | null
          invoices_matched: number | null
          invoices_unmatched: number | null
          metadata: Json | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          invoices_fetched?: number | null
          invoices_matched?: number | null
          invoices_unmatched?: number | null
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          invoices_fetched?: number | null
          invoices_matched?: number | null
          invoices_unmatched?: number | null
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          id: string
          object_id: string
          object_type: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          id?: string
          object_id: string
          object_type: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          id?: string
          object_id?: string
          object_type?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      loan_events: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          effective_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          facility_id: string | null
          id: string
          is_system_generated: boolean | null
          loan_id: string
          metadata: Json | null
          rate: number | null
          requires_approval: boolean | null
          status: Database["public"]["Enums"]["event_status"]
          value_date: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          effective_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          facility_id?: string | null
          id?: string
          is_system_generated?: boolean | null
          loan_id: string
          metadata?: Json | null
          rate?: number | null
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["event_status"]
          value_date?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          effective_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          facility_id?: string | null
          id?: string
          is_system_generated?: boolean | null
          loan_id?: string
          metadata?: Json | null
          rate?: number | null
          requires_approval?: boolean | null
          status?: Database["public"]["Enums"]["event_status"]
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "loan_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_events_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_facilities: {
        Row: {
          commitment_amount: number
          commitment_fee_rate: number | null
          created_at: string
          facility_type: Database["public"]["Enums"]["facility_type"]
          id: string
          loan_id: string
        }
        Insert: {
          commitment_amount: number
          commitment_fee_rate?: number | null
          created_at?: string
          facility_type: Database["public"]["Enums"]["facility_type"]
          id?: string
          loan_id: string
        }
        Update: {
          commitment_amount?: number
          commitment_fee_rate?: number | null
          created_at?: string
          facility_type?: Database["public"]["Enums"]["facility_type"]
          id?: string
          loan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_facilities_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrower_name: string
          category: string | null
          city: string | null
          commitment_fee_basis: string | null
          commitment_fee_rate: number | null
          created_at: string
          external_loan_id: string | null
          facility: string | null
          id: string
          interest_rate: number | null
          interest_type: string
          loan_name: string | null
          loan_start_date: string | null
          loan_type: string
          ltv: number | null
          maturity_date: string | null
          notice_frequency: string
          outstanding: number | null
          payment_due_rule: string | null
          remarks: string | null
          rental_income: number | null
          status: Database["public"]["Enums"]["loan_status"]
          total_commitment: number | null
          updated_at: string
          valuation: number | null
          valuation_date: string | null
          vehicle: string | null
        }
        Insert: {
          borrower_name: string
          category?: string | null
          city?: string | null
          commitment_fee_basis?: string | null
          commitment_fee_rate?: number | null
          created_at?: string
          external_loan_id?: string | null
          facility?: string | null
          id?: string
          interest_rate?: number | null
          interest_type?: string
          loan_name?: string | null
          loan_start_date?: string | null
          loan_type?: string
          ltv?: number | null
          maturity_date?: string | null
          notice_frequency?: string
          outstanding?: number | null
          payment_due_rule?: string | null
          remarks?: string | null
          rental_income?: number | null
          status?: Database["public"]["Enums"]["loan_status"]
          total_commitment?: number | null
          updated_at?: string
          valuation?: number | null
          valuation_date?: string | null
          vehicle?: string | null
        }
        Update: {
          borrower_name?: string
          category?: string | null
          city?: string | null
          commitment_fee_basis?: string | null
          commitment_fee_rate?: number | null
          created_at?: string
          external_loan_id?: string | null
          facility?: string | null
          id?: string
          interest_rate?: number | null
          interest_type?: string
          loan_name?: string | null
          loan_start_date?: string | null
          loan_type?: string
          ltv?: number | null
          maturity_date?: string | null
          notice_frequency?: string
          outstanding?: number | null
          payment_due_rule?: string | null
          remarks?: string | null
          rental_income?: number | null
          status?: Database["public"]["Enums"]["loan_status"]
          total_commitment?: number | null
          updated_at?: string
          valuation?: number | null
          valuation_date?: string | null
          vehicle?: string | null
        }
        Relationships: []
      }
      monthly_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          periods_with_exceptions: number
          status: string
          total_periods: number
          updated_at: string
          year_month: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          periods_with_exceptions?: number
          status?: string
          total_periods?: number
          updated_at?: string
          year_month: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          periods_with_exceptions?: number
          status?: string
          total_periods?: number
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      notice_snapshots: {
        Row: {
          generated_at: string
          id: string
          inputs_hash: string
          is_adjustment: boolean
          line_items: Json
          loan_id: string
          pdf_file_reference: string | null
          period_end: string
          period_start: string
          references_snapshot_id: string | null
          totals: Json
          version_number: number
        }
        Insert: {
          generated_at?: string
          id?: string
          inputs_hash: string
          is_adjustment?: boolean
          line_items?: Json
          loan_id: string
          pdf_file_reference?: string | null
          period_end: string
          period_start: string
          references_snapshot_id?: string | null
          totals?: Json
          version_number?: number
        }
        Update: {
          generated_at?: string
          id?: string
          inputs_hash?: string
          is_adjustment?: boolean
          line_items?: Json
          loan_id?: string
          pdf_file_reference?: string | null
          period_end?: string
          period_start?: string
          references_snapshot_id?: string | null
          totals?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "notice_snapshots_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_snapshots_references_snapshot_id_fkey"
            columns: ["references_snapshot_id"]
            isOneToOne: false
            referencedRelation: "notice_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          afas_invoice_number: string | null
          afas_post_error: string | null
          afas_posted_at: string | null
          approved_at: string | null
          auto_processed_at: string | null
          created_at: string
          exception_reason: string | null
          has_economic_events: boolean | null
          id: string
          loan_id: string
          monthly_approval_id: string | null
          period_end: string
          period_start: string
          processing_mode: string | null
          sent_at: string | null
          snapshot_id: string | null
          status: Database["public"]["Enums"]["period_status"]
          submitted_at: string | null
        }
        Insert: {
          afas_invoice_number?: string | null
          afas_post_error?: string | null
          afas_posted_at?: string | null
          approved_at?: string | null
          auto_processed_at?: string | null
          created_at?: string
          exception_reason?: string | null
          has_economic_events?: boolean | null
          id?: string
          loan_id: string
          monthly_approval_id?: string | null
          period_end: string
          period_start: string
          processing_mode?: string | null
          sent_at?: string | null
          snapshot_id?: string | null
          status?: Database["public"]["Enums"]["period_status"]
          submitted_at?: string | null
        }
        Update: {
          afas_invoice_number?: string | null
          afas_post_error?: string | null
          afas_posted_at?: string | null
          approved_at?: string | null
          auto_processed_at?: string | null
          created_at?: string
          exception_reason?: string | null
          has_economic_events?: boolean | null
          id?: string
          loan_id?: string
          monthly_approval_id?: string | null
          period_end?: string
          period_start?: string
          processing_mode?: string | null
          sent_at?: string | null
          snapshot_id?: string | null
          status?: Database["public"]["Enums"]["period_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periods_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periods_monthly_approval_id_fkey"
            columns: ["monthly_approval_id"]
            isOneToOne: false
            referencedRelation: "monthly_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periods_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "notice_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number | null
          error_details: Json | null
          id: string
          job_type: string
          metadata: Json | null
          processed_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number | null
          error_details?: Json | null
          id?: string
          job_type: string
          metadata?: Json | null
          processed_count?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number | null
          error_details?: Json | null
          id?: string
          job_type?: string
          metadata?: Json | null
          processed_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_principal_balance: {
        Args: { p_as_of_date?: string; p_loan_id: string }
        Returns: number
      }
      determine_period_processing_mode: {
        Args: { p_period_id: string }
        Returns: string
      }
      get_loan_balances: {
        Args: { p_as_of_date?: string }
        Returns: {
          loan_id: string
          principal_balance: number
        }[]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      period_has_economic_events: {
        Args: { p_period_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "pm" | "controller"
      event_status: "draft" | "approved"
      event_type:
        | "principal_draw"
        | "principal_repayment"
        | "interest_rate_set"
        | "interest_rate_change"
        | "pik_flag_set"
        | "commitment_set"
        | "commitment_change"
        | "commitment_cancel"
        | "cash_received"
        | "fee_invoice"
        | "pik_capitalization_posted"
      facility_type: "capex" | "interest_depot" | "other"
      loan_status: "active" | "repaid" | "defaulted"
      period_status: "open" | "submitted" | "approved" | "sent"
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
      app_role: ["pm", "controller"],
      event_status: ["draft", "approved"],
      event_type: [
        "principal_draw",
        "principal_repayment",
        "interest_rate_set",
        "interest_rate_change",
        "pik_flag_set",
        "commitment_set",
        "commitment_change",
        "commitment_cancel",
        "cash_received",
        "fee_invoice",
        "pik_capitalization_posted",
      ],
      facility_type: ["capex", "interest_depot", "other"],
      loan_status: ["active", "repaid", "defaulted"],
      period_status: ["open", "submitted", "approved", "sent"],
    },
  },
} as const
