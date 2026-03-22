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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      beds: {
        Row: {
          bed_number: string
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          status: Database["public"]["Enums"]["bed_status"]
          ward_id: string
        }
        Insert: {
          bed_number: string
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          status?: Database["public"]["Enums"]["bed_status"]
          ward_id: string
        }
        Update: {
          bed_number?: string
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          status?: Database["public"]["Enums"]["bed_status"]
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_date: string
          bill_number: string | null
          created_at: string
          hospital_id: string
          id: string
          paid_amount: number
          patient_id: string
          payment_status: string
          total_amount: number
        }
        Insert: {
          bill_date?: string
          bill_number?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          paid_amount?: number
          patient_id: string
          payment_status?: string
          total_amount?: number
        }
        Update: {
          bill_date?: string
          bill_number?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          paid_amount?: number
          patient_id?: string
          payment_status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bills_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          is_main_branch: boolean
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          is_main_branch?: boolean
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          is_main_branch?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_message: string
          alert_type: string
          bed_number: string | null
          created_at: string
          hospital_id: string
          id: string
          is_acknowledged: boolean
          patient_id: string | null
          severity: string
          ward_name: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message: string
          alert_type: string
          bed_number?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          is_acknowledged?: boolean
          patient_id?: string | null
          severity?: string
          ward_name?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string
          alert_type?: string
          bed_number?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          is_acknowledged?: boolean
          patient_id?: string | null
          severity?: string
          ward_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          head_doctor_id: string | null
          hospital_id: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["department_type"]
        }
        Insert: {
          created_at?: string
          head_doctor_id?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
          type?: Database["public"]["Enums"]["department_type"]
        }
        Update: {
          created_at?: string
          head_doctor_id?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["department_type"]
        }
        Relationships: [
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          beds_count: number | null
          country: string | null
          created_at: string
          gstin: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          nabh_number: string | null
          name: string
          payment_methods: string[]
          pincode: string | null
          primary_color: string | null
          razorpay_key_id: string | null
          setup_complete: boolean
          state: string | null
          subdomain: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          type: Database["public"]["Enums"]["hospital_type"]
          wati_api_url: string | null
          whatsapp_enabled: boolean
        }
        Insert: {
          address?: string | null
          beds_count?: number | null
          country?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          nabh_number?: string | null
          name: string
          payment_methods?: string[]
          pincode?: string | null
          primary_color?: string | null
          razorpay_key_id?: string | null
          setup_complete?: boolean
          state?: string | null
          subdomain?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type?: Database["public"]["Enums"]["hospital_type"]
          wati_api_url?: string | null
          whatsapp_enabled?: boolean
        }
        Update: {
          address?: string | null
          beds_count?: number | null
          country?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          nabh_number?: string | null
          name?: string
          payment_methods?: string[]
          pincode?: string | null
          primary_color?: string | null
          razorpay_key_id?: string | null
          setup_complete?: boolean
          state?: string | null
          subdomain?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type?: Database["public"]["Enums"]["hospital_type"]
          wati_api_url?: string | null
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      opd_visits: {
        Row: {
          created_at: string
          department_id: string | null
          doctor_id: string | null
          hospital_id: string
          id: string
          patient_id: string
          status: string
          token_number: string | null
          visit_date: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          status?: string
          token_number?: string | null
          visit_date?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          status?: string
          token_number?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "opd_visits_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          abha_id: string | null
          address: string | null
          blood_group: string | null
          created_at: string
          dob: string | null
          emergency_contact: Json | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          hospital_id: string
          id: string
          phone: string | null
          uhid: string
        }
        Insert: {
          abha_id?: string | null
          address?: string | null
          blood_group?: string | null
          created_at?: string
          dob?: string | null
          emergency_contact?: Json | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hospital_id: string
          id?: string
          phone?: string | null
          uhid: string
        }
        Update: {
          abha_id?: string | null
          address?: string | null
          blood_group?: string | null
          created_at?: string
          dob?: string | null
          emergency_contact?: Json | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hospital_id?: string
          id?: string
          phone?: string | null
          uhid?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      service_master: {
        Row: {
          category: string
          created_at: string
          fee: number
          follow_up_fee: number | null
          gst_applicable: boolean
          hospital_id: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          fee?: number
          follow_up_fee?: number | null
          gst_applicable?: boolean
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          fee?: number
          follow_up_fee?: number | null
          gst_applicable?: boolean
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_master_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          attendance_date: string
          created_at: string
          hospital_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          hospital_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          hospital_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          branch_id: string | null
          created_at: string
          department_id: string | null
          email: string
          employee_id: string | null
          full_name: string
          hospital_id: string
          id: string
          is_active: boolean
          last_login: string | null
          phone: string | null
          registration_number: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          hospital_id: string
          id: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          registration_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          registration_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          name: string
          total_beds: number
          type: Database["public"]["Enums"]["ward_type"]
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
          total_beds?: number
          type?: Database["public"]["Enums"]["ward_type"]
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
          total_beds?: number
          type?: Database["public"]["Enums"]["ward_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_hospital_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "hospital_admin"
        | "doctor"
        | "nurse"
        | "receptionist"
        | "pharmacist"
        | "lab_tech"
        | "accountant"
      bed_status:
        | "available"
        | "occupied"
        | "reserved"
        | "maintenance"
        | "cleaning"
      department_type: "clinical" | "administrative" | "support"
      gender_type: "male" | "female" | "other"
      hospital_type: "general" | "specialty" | "clinic" | "nursing_home"
      subscription_tier: "basic" | "professional" | "enterprise"
      ward_type:
        | "general"
        | "private"
        | "semi_private"
        | "icu"
        | "nicu"
        | "picu"
        | "hdu"
        | "surgical"
        | "maternity"
        | "emergency"
        | "daycare"
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
      app_role: [
        "super_admin",
        "hospital_admin",
        "doctor",
        "nurse",
        "receptionist",
        "pharmacist",
        "lab_tech",
        "accountant",
      ],
      bed_status: [
        "available",
        "occupied",
        "reserved",
        "maintenance",
        "cleaning",
      ],
      department_type: ["clinical", "administrative", "support"],
      gender_type: ["male", "female", "other"],
      hospital_type: ["general", "specialty", "clinic", "nursing_home"],
      subscription_tier: ["basic", "professional", "enterprise"],
      ward_type: [
        "general",
        "private",
        "semi_private",
        "icu",
        "nicu",
        "picu",
        "hdu",
        "surgical",
        "maternity",
        "emergency",
        "daycare",
      ],
    },
  },
} as const
