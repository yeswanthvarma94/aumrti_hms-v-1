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
      admissions: {
        Row: {
          admission_number: string | null
          admission_type: string
          admitted_at: string | null
          admitting_diagnosis: string | null
          admitting_doctor_id: string
          bed_id: string
          billing_cleared: boolean | null
          consultant_doctor_id: string | null
          created_at: string | null
          department_id: string | null
          discharge_summary_done: boolean | null
          discharge_type: string | null
          discharged_at: string | null
          expected_discharge_date: string | null
          hospital_id: string
          id: string
          insurance_id: string | null
          insurance_type: string
          patient_id: string
          status: string
          ward_id: string
        }
        Insert: {
          admission_number?: string | null
          admission_type?: string
          admitted_at?: string | null
          admitting_diagnosis?: string | null
          admitting_doctor_id: string
          bed_id: string
          billing_cleared?: boolean | null
          consultant_doctor_id?: string | null
          created_at?: string | null
          department_id?: string | null
          discharge_summary_done?: boolean | null
          discharge_type?: string | null
          discharged_at?: string | null
          expected_discharge_date?: string | null
          hospital_id: string
          id?: string
          insurance_id?: string | null
          insurance_type?: string
          patient_id: string
          status?: string
          ward_id: string
        }
        Update: {
          admission_number?: string | null
          admission_type?: string
          admitted_at?: string | null
          admitting_diagnosis?: string | null
          admitting_doctor_id?: string
          bed_id?: string
          billing_cleared?: boolean | null
          consultant_doctor_id?: string | null
          created_at?: string | null
          department_id?: string | null
          discharge_summary_done?: boolean | null
          discharge_type?: string | null
          discharged_at?: string | null
          expected_discharge_date?: string | null
          hospital_id?: string
          id?: string
          insurance_id?: string | null
          insurance_type?: string
          patient_id?: string
          status?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admissions_admitting_doctor_id_fkey"
            columns: ["admitting_doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_consultant_doctor_id_fkey"
            columns: ["consultant_doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_receipts: {
        Row: {
          adjusted_in_bill_id: string | null
          admission_id: string | null
          amount: number
          created_at: string | null
          hospital_id: string
          id: string
          is_adjusted: boolean | null
          notes: string | null
          patient_id: string
          payment_date: string | null
          payment_mode: string
          receipt_number: string
          received_by: string | null
          refund_amount: number | null
        }
        Insert: {
          adjusted_in_bill_id?: string | null
          admission_id?: string | null
          amount: number
          created_at?: string | null
          hospital_id: string
          id?: string
          is_adjusted?: boolean | null
          notes?: string | null
          patient_id: string
          payment_date?: string | null
          payment_mode: string
          receipt_number: string
          received_by?: string | null
          refund_amount?: number | null
        }
        Update: {
          adjusted_in_bill_id?: string | null
          admission_id?: string | null
          amount?: number
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_adjusted?: boolean | null
          notes?: string | null
          patient_id?: string
          payment_date?: string | null
          payment_mode?: string
          receipt_number?: string
          received_by?: string | null
          refund_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_receipts_adjusted_in_bill_id_fkey"
            columns: ["adjusted_in_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_receipts_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_receipts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_receipts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_digests: {
        Row: {
          anomalies: Json | null
          delivered_whatsapp: boolean | null
          digest_date: string
          digest_text: string
          generated_at: string | null
          hospital_id: string
          id: string
          kpi_snapshot: Json
          provider: string | null
          tokens_used: number | null
        }
        Insert: {
          anomalies?: Json | null
          delivered_whatsapp?: boolean | null
          digest_date?: string
          digest_text: string
          generated_at?: string | null
          hospital_id: string
          id?: string
          kpi_snapshot?: Json
          provider?: string | null
          tokens_used?: number | null
        }
        Update: {
          anomalies?: Json | null
          delivered_whatsapp?: boolean | null
          digest_date?: string
          digest_text?: string
          generated_at?: string | null
          hospital_id?: string
          id?: string
          kpi_snapshot?: Json
          provider?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_digests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_config: {
        Row: {
          api_key_ref: string | null
          feature_key: string
          hospital_id: string
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model_name: string
          provider: string
          temperature: number | null
        }
        Insert: {
          api_key_ref?: string | null
          feature_key: string
          hospital_id: string
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name: string
          provider?: string
          temperature?: number | null
        }
        Update: {
          api_key_ref?: string | null
          feature_key?: string
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name?: string
          provider?: string
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_config_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      api_configurations: {
        Row: {
          config: Json
          created_at: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          service_key: string
          service_name: string
          test_message: string | null
          test_status: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          service_key: string
          service_name: string
          test_message?: string | null
          test_status?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          service_key?: string
          service_name?: string
          test_message?: string | null
          test_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_configurations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          key_hash: string
          key_name: string
          key_prefix: string
          last_used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_name: string
          key_prefix: string
          last_used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_name?: string
          key_prefix?: string
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_records: {
        Row: {
          audit_title: string
          audit_type: string | null
          auditor_name: string | null
          chapters_covered: string[] | null
          conducted_date: string | null
          created_at: string | null
          created_by: string | null
          department_ids: string[] | null
          findings: string | null
          hospital_id: string
          id: string
          report_url: string | null
          scheduled_date: string
          score_maximum: number | null
          score_obtained: number | null
          status: string | null
        }
        Insert: {
          audit_title: string
          audit_type?: string | null
          auditor_name?: string | null
          chapters_covered?: string[] | null
          conducted_date?: string | null
          created_at?: string | null
          created_by?: string | null
          department_ids?: string[] | null
          findings?: string | null
          hospital_id: string
          id?: string
          report_url?: string | null
          scheduled_date: string
          score_maximum?: number | null
          score_obtained?: number | null
          status?: string | null
        }
        Update: {
          audit_title?: string
          audit_type?: string | null
          auditor_name?: string | null
          chapters_covered?: string[] | null
          conducted_date?: string | null
          created_at?: string | null
          created_by?: string | null
          department_ids?: string[] | null
          findings?: string | null
          hospital_id?: string
          id?: string
          report_url?: string | null
          scheduled_date?: string
          score_maximum?: number | null
          score_obtained?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_posting_rules: {
        Row: {
          created_at: string | null
          credit_account_id: string
          debit_account_id: string
          description_template: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          rule_name: string
          trigger_event: string
        }
        Insert: {
          created_at?: string | null
          credit_account_id: string
          debit_account_id: string
          description_template?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          trigger_event: string
        }
        Update: {
          created_at?: string | null
          credit_account_id?: string
          debit_account_id?: string
          description_template?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_posting_rules_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_posting_rules_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_posting_rules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          coa_account_id: string | null
          created_at: string | null
          hospital_id: string
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          opening_balance: number | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          coa_account_id?: string | null
          created_at?: string | null
          hospital_id: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          coa_account_id?: string | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_coa_account_id_fkey"
            columns: ["coa_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          balance: number | null
          bank_account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string
          hospital_id: string
          id: string
          import_batch_id: string | null
          is_reconciled: boolean | null
          reconciled_with: string | null
          reference: string | null
          transaction_date: string
        }
        Insert: {
          balance?: number | null
          bank_account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          hospital_id: string
          id?: string
          import_batch_id?: string | null
          is_reconciled?: boolean | null
          reconciled_with?: string | null
          reference?: string | null
          transaction_date: string
        }
        Update: {
          balance?: number | null
          bank_account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          hospital_id?: string
          id?: string
          import_batch_id?: string | null
          is_reconciled?: boolean | null
          reconciled_with?: string | null
          reference?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciled_with_fkey"
            columns: ["reconciled_with"]
            isOneToOne: false
            referencedRelation: "journal_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bill_line_items: {
        Row: {
          bill_id: string
          created_at: string | null
          department: string | null
          description: string
          discount_amount: number | null
          discount_percent: number | null
          gst_amount: number | null
          gst_percent: number | null
          hospital_id: string
          hsn_code: string | null
          id: string
          insurance_rate: number | null
          is_insurance_covered: boolean | null
          item_type: string
          ordered_by: string | null
          quantity: number | null
          service_date: string | null
          service_id: string | null
          source_module: string | null
          source_record_id: string | null
          taxable_amount: number | null
          total_amount: number
          unit: string | null
          unit_rate: number
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          department?: string | null
          description: string
          discount_amount?: number | null
          discount_percent?: number | null
          gst_amount?: number | null
          gst_percent?: number | null
          hospital_id: string
          hsn_code?: string | null
          id?: string
          insurance_rate?: number | null
          is_insurance_covered?: boolean | null
          item_type?: string
          ordered_by?: string | null
          quantity?: number | null
          service_date?: string | null
          service_id?: string | null
          source_module?: string | null
          source_record_id?: string | null
          taxable_amount?: number | null
          total_amount: number
          unit?: string | null
          unit_rate: number
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          department?: string | null
          description?: string
          discount_amount?: number | null
          discount_percent?: number | null
          gst_amount?: number | null
          gst_percent?: number | null
          hospital_id?: string
          hsn_code?: string | null
          id?: string
          insurance_rate?: number | null
          is_insurance_covered?: boolean | null
          item_type?: string
          ordered_by?: string | null
          quantity?: number | null
          service_date?: string | null
          service_id?: string | null
          source_module?: string | null
          source_record_id?: string | null
          taxable_amount?: number | null
          total_amount?: number
          unit?: string | null
          unit_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_line_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_line_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_line_items_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_line_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_master"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bank_reference: string | null
          bill_id: string
          created_at: string | null
          gateway_reference: string | null
          hospital_id: string
          id: string
          is_advance: boolean | null
          notes: string | null
          payment_date: string | null
          payment_mode: string
          payment_time: string | null
          received_by: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          bill_id: string
          created_at?: string | null
          gateway_reference?: string | null
          hospital_id: string
          id?: string
          is_advance?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_mode: string
          payment_time?: string | null
          received_by?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          bill_id?: string
          created_at?: string | null
          gateway_reference?: string | null
          hospital_id?: string
          id?: string
          is_advance?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_mode?: string
          payment_time?: string | null
          received_by?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          admission_id: string | null
          advance_received: number | null
          balance_due: number | null
          bill_date: string
          bill_number: string
          bill_status: string
          bill_type: string
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          discount_approved_by: string | null
          discount_percent: number | null
          discount_reason: string | null
          encounter_id: string | null
          gst_amount: number | null
          gstin_hospital: string | null
          gstin_patient: string | null
          hospital_id: string
          id: string
          insurance_amount: number | null
          irn: string | null
          irn_generated_at: string | null
          notes: string | null
          paid_amount: number | null
          patient_id: string
          patient_payable: number | null
          payment_link_sent: boolean | null
          payment_status: string
          qr_code_url: string | null
          subtotal: number | null
          taxable_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          admission_id?: string | null
          advance_received?: number | null
          balance_due?: number | null
          bill_date?: string
          bill_number: string
          bill_status?: string
          bill_type?: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          discount_approved_by?: string | null
          discount_percent?: number | null
          discount_reason?: string | null
          encounter_id?: string | null
          gst_amount?: number | null
          gstin_hospital?: string | null
          gstin_patient?: string | null
          hospital_id: string
          id?: string
          insurance_amount?: number | null
          irn?: string | null
          irn_generated_at?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_id: string
          patient_payable?: number | null
          payment_link_sent?: boolean | null
          payment_status?: string
          qr_code_url?: string | null
          subtotal?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          admission_id?: string | null
          advance_received?: number | null
          balance_due?: number | null
          bill_date?: string
          bill_number?: string
          bill_status?: string
          bill_type?: string
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          discount_approved_by?: string | null
          discount_percent?: number | null
          discount_reason?: string | null
          encounter_id?: string | null
          gst_amount?: number | null
          gstin_hospital?: string | null
          gstin_patient?: string | null
          hospital_id?: string
          id?: string
          insurance_amount?: number | null
          irn?: string | null
          irn_generated_at?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_id?: string
          patient_payable?: number | null
          payment_link_sent?: boolean | null
          payment_status?: string
          qr_code_url?: string | null
          subtotal?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_discount_approved_by_fkey"
            columns: ["discount_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "opd_encounters"
            referencedColumns: ["id"]
          },
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
      blood_issues: {
        Row: {
          admission_id: string | null
          adverse_event: boolean | null
          adverse_event_type: string | null
          cross_match_id: string | null
          hospital_id: string
          id: string
          issued_at: string | null
          issued_by: string
          ot_id: string | null
          patient_id: string
          return_reason: string | null
          returned: boolean | null
          transfusion_end: string | null
          transfusion_reaction_form_completed: boolean | null
          transfusion_start: string | null
          unit_id: string
        }
        Insert: {
          admission_id?: string | null
          adverse_event?: boolean | null
          adverse_event_type?: string | null
          cross_match_id?: string | null
          hospital_id: string
          id?: string
          issued_at?: string | null
          issued_by: string
          ot_id?: string | null
          patient_id: string
          return_reason?: string | null
          returned?: boolean | null
          transfusion_end?: string | null
          transfusion_reaction_form_completed?: boolean | null
          transfusion_start?: string | null
          unit_id: string
        }
        Update: {
          admission_id?: string | null
          adverse_event?: boolean | null
          adverse_event_type?: string | null
          cross_match_id?: string | null
          hospital_id?: string
          id?: string
          issued_at?: string | null
          issued_by?: string
          ot_id?: string | null
          patient_id?: string
          return_reason?: string | null
          returned?: boolean | null
          transfusion_end?: string | null
          transfusion_reaction_form_completed?: boolean | null
          transfusion_start?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_issues_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_issues_cross_match_id_fkey"
            columns: ["cross_match_id"]
            isOneToOne: false
            referencedRelation: "cross_match_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_issues_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_issues_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_issues_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_issues_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_requests: {
        Row: {
          admission_id: string | null
          blood_group: string
          component: string
          created_at: string | null
          hospital_id: string
          id: string
          indication: string
          ot_id: string | null
          patient_id: string
          requested_by: string
          rh_factor: string
          status: string | null
          units_required: number
          urgency: string | null
        }
        Insert: {
          admission_id?: string | null
          blood_group: string
          component: string
          created_at?: string | null
          hospital_id: string
          id?: string
          indication: string
          ot_id?: string | null
          patient_id: string
          requested_by: string
          rh_factor: string
          status?: string | null
          units_required: number
          urgency?: string | null
        }
        Update: {
          admission_id?: string | null
          blood_group?: string
          component?: string
          created_at?: string | null
          hospital_id?: string
          id?: string
          indication?: string
          ot_id?: string | null
          patient_id?: string
          requested_by?: string
          rh_factor?: string
          status?: string | null
          units_required?: number
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_units: {
        Row: {
          bag_number: string | null
          blood_group: string
          collected_at: string
          component: string
          created_at: string | null
          discarded_reason: string | null
          donor_id: string | null
          expiry_at: string
          hospital_id: string
          id: string
          issued_to: string | null
          reserved_for: string | null
          reserved_for_ot: string | null
          rh_factor: string
          status: string | null
          storage_location: string | null
          unit_number: string
          volume_ml: number | null
        }
        Insert: {
          bag_number?: string | null
          blood_group: string
          collected_at: string
          component: string
          created_at?: string | null
          discarded_reason?: string | null
          donor_id?: string | null
          expiry_at: string
          hospital_id: string
          id?: string
          issued_to?: string | null
          reserved_for?: string | null
          reserved_for_ot?: string | null
          rh_factor: string
          status?: string | null
          storage_location?: string | null
          unit_number: string
          volume_ml?: number | null
        }
        Update: {
          bag_number?: string | null
          blood_group?: string
          collected_at?: string
          component?: string
          created_at?: string | null
          discarded_reason?: string | null
          donor_id?: string | null
          expiry_at?: string
          hospital_id?: string
          id?: string
          issued_to?: string | null
          reserved_for?: string | null
          reserved_for_ot?: string | null
          rh_factor?: string
          status?: string | null
          storage_location?: string | null
          unit_number?: string
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blood_units_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_units_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_units_issued_to_fkey"
            columns: ["issued_to"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_units_reserved_for_fkey"
            columns: ["reserved_for"]
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
      capa_records: {
        Row: {
          capa_number: string
          completed_date: string | null
          corrective_action: string | null
          created_at: string | null
          due_date: string | null
          effectiveness_check: string | null
          hospital_id: string
          id: string
          preventive_action: string | null
          problem_statement: string
          responsible_person: string | null
          root_cause: string | null
          status: string | null
          trigger_ref_id: string | null
          trigger_type: string
          verification_by: string | null
          verified_date: string | null
          why_1: string | null
          why_2: string | null
          why_3: string | null
          why_4: string | null
          why_5: string | null
        }
        Insert: {
          capa_number: string
          completed_date?: string | null
          corrective_action?: string | null
          created_at?: string | null
          due_date?: string | null
          effectiveness_check?: string | null
          hospital_id: string
          id?: string
          preventive_action?: string | null
          problem_statement: string
          responsible_person?: string | null
          root_cause?: string | null
          status?: string | null
          trigger_ref_id?: string | null
          trigger_type: string
          verification_by?: string | null
          verified_date?: string | null
          why_1?: string | null
          why_2?: string | null
          why_3?: string | null
          why_4?: string | null
          why_5?: string | null
        }
        Update: {
          capa_number?: string
          completed_date?: string | null
          corrective_action?: string | null
          created_at?: string | null
          due_date?: string | null
          effectiveness_check?: string | null
          hospital_id?: string
          id?: string
          preventive_action?: string | null
          problem_statement?: string
          responsible_person?: string | null
          root_cause?: string | null
          status?: string | null
          trigger_ref_id?: string | null
          trigger_type?: string
          verification_by?: string | null
          verified_date?: string | null
          why_1?: string | null
          why_2?: string | null
          why_3?: string | null
          why_4?: string | null
          why_5?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capa_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_records_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_records_verification_by_fkey"
            columns: ["verification_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_subtype: string | null
          account_type: string
          code: string
          created_at: string | null
          description: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          is_control: boolean | null
          is_system: boolean | null
          name: string
          opening_balance: number | null
          parent_id: string | null
        }
        Insert: {
          account_subtype?: string | null
          account_type: string
          code: string
          created_at?: string | null
          description?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          is_system?: boolean | null
          name: string
          opening_balance?: number | null
          parent_id?: string | null
        }
        Update: {
          account_subtype?: string | null
          account_type?: string
          code?: string
          created_at?: string | null
          description?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          is_system?: boolean | null
          name?: string
          opening_balance?: number | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chemo_order_drugs: {
        Row: {
          administered_at: string | null
          administered_by: string | null
          administered_dose_mg: number | null
          diluent: string | null
          drug_name: string
          hospital_id: string
          id: string
          infusion_time_min: number | null
          order_id: string
          planned_dose_mg: number
          planned_dose_mg_m2: number | null
          route: string
        }
        Insert: {
          administered_at?: string | null
          administered_by?: string | null
          administered_dose_mg?: number | null
          diluent?: string | null
          drug_name: string
          hospital_id: string
          id?: string
          infusion_time_min?: number | null
          order_id: string
          planned_dose_mg: number
          planned_dose_mg_m2?: number | null
          route: string
        }
        Update: {
          administered_at?: string | null
          administered_by?: string | null
          administered_dose_mg?: number | null
          diluent?: string | null
          drug_name?: string
          hospital_id?: string
          id?: string
          infusion_time_min?: number | null
          order_id?: string
          planned_dose_mg?: number
          planned_dose_mg_m2?: number | null
          route?: string
        }
        Relationships: [
          {
            foreignKeyName: "chemo_order_drugs_administered_by_fkey"
            columns: ["administered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_order_drugs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_order_drugs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "chemo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chemo_orders: {
        Row: {
          anc: number | null
          bilirubin: number | null
          bsa_used: number
          created_at: string | null
          creatinine: number | null
          cycle_number: number
          day_of_cycle: number
          dispensing_allowed: boolean | null
          hold_reason: string | null
          hospital_id: string
          id: string
          lab_date: string | null
          notes: string | null
          oncology_patient_id: string
          order_date: string
          ordered_by: string
          patient_id: string
          platelets: number | null
          protocol_id: string
          scheduled_date: string
          status: string | null
          v1_at: string | null
          v1_by: string | null
          v1_protocol_confirmed: boolean | null
          v2_at: string | null
          v2_by: string | null
          v2_dose_correct: boolean | null
          v3_allergies_checked: boolean | null
          v3_at: string | null
          v3_by: string | null
          v4_at: string | null
          v4_by: string | null
          v4_labs_reviewed: boolean | null
          v5_at: string | null
          v5_by: string | null
          v5_pharmacist_signoff: boolean | null
          weight_at_order: number
        }
        Insert: {
          anc?: number | null
          bilirubin?: number | null
          bsa_used: number
          created_at?: string | null
          creatinine?: number | null
          cycle_number: number
          day_of_cycle?: number
          dispensing_allowed?: boolean | null
          hold_reason?: string | null
          hospital_id: string
          id?: string
          lab_date?: string | null
          notes?: string | null
          oncology_patient_id: string
          order_date?: string
          ordered_by: string
          patient_id: string
          platelets?: number | null
          protocol_id: string
          scheduled_date: string
          status?: string | null
          v1_at?: string | null
          v1_by?: string | null
          v1_protocol_confirmed?: boolean | null
          v2_at?: string | null
          v2_by?: string | null
          v2_dose_correct?: boolean | null
          v3_allergies_checked?: boolean | null
          v3_at?: string | null
          v3_by?: string | null
          v4_at?: string | null
          v4_by?: string | null
          v4_labs_reviewed?: boolean | null
          v5_at?: string | null
          v5_by?: string | null
          v5_pharmacist_signoff?: boolean | null
          weight_at_order: number
        }
        Update: {
          anc?: number | null
          bilirubin?: number | null
          bsa_used?: number
          created_at?: string | null
          creatinine?: number | null
          cycle_number?: number
          day_of_cycle?: number
          dispensing_allowed?: boolean | null
          hold_reason?: string | null
          hospital_id?: string
          id?: string
          lab_date?: string | null
          notes?: string | null
          oncology_patient_id?: string
          order_date?: string
          ordered_by?: string
          patient_id?: string
          platelets?: number | null
          protocol_id?: string
          scheduled_date?: string
          status?: string | null
          v1_at?: string | null
          v1_by?: string | null
          v1_protocol_confirmed?: boolean | null
          v2_at?: string | null
          v2_by?: string | null
          v2_dose_correct?: boolean | null
          v3_allergies_checked?: boolean | null
          v3_at?: string | null
          v3_by?: string | null
          v4_at?: string | null
          v4_by?: string | null
          v4_labs_reviewed?: boolean | null
          v5_at?: string | null
          v5_by?: string | null
          v5_pharmacist_signoff?: boolean | null
          weight_at_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "chemo_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_oncology_patient_id_fkey"
            columns: ["oncology_patient_id"]
            isOneToOne: false
            referencedRelation: "oncology_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "chemo_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_v1_by_fkey"
            columns: ["v1_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_v2_by_fkey"
            columns: ["v2_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_v3_by_fkey"
            columns: ["v3_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_v4_by_fkey"
            columns: ["v4_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemo_orders_v5_by_fkey"
            columns: ["v5_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chemo_protocols: {
        Row: {
          cancer_type: string
          created_at: string | null
          cycle_duration_days: number
          drugs: Json
          hospital_id: string
          id: string
          is_active: boolean | null
          protocol_code: string
          protocol_name: string
          reference: string | null
          total_cycles: number
        }
        Insert: {
          cancer_type: string
          created_at?: string | null
          cycle_duration_days: number
          drugs?: Json
          hospital_id: string
          id?: string
          is_active?: boolean | null
          protocol_code: string
          protocol_name: string
          reference?: string | null
          total_cycles: number
        }
        Update: {
          cancer_type?: string
          created_at?: string | null
          cycle_duration_days?: number
          drugs?: Json
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          protocol_code?: string
          protocol_name?: string
          reference?: string | null
          total_cycles?: number
        }
        Relationships: [
          {
            foreignKeyName: "chemo_protocols_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      chronic_disease_programs: {
        Row: {
          condition: string
          condition_label: string
          created_at: string | null
          diagnosed_date: string | null
          enrolled_at: string | null
          followup_interval_days: number | null
          followup_tests: string[] | null
          hospital_id: string
          id: string
          is_active: boolean | null
          last_bp_systolic: number | null
          last_creatinine: number | null
          last_hba1c: number | null
          next_followup: string | null
          patient_id: string
          treating_doctor: string | null
        }
        Insert: {
          condition: string
          condition_label: string
          created_at?: string | null
          diagnosed_date?: string | null
          enrolled_at?: string | null
          followup_interval_days?: number | null
          followup_tests?: string[] | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          last_bp_systolic?: number | null
          last_creatinine?: number | null
          last_hba1c?: number | null
          next_followup?: string | null
          patient_id: string
          treating_doctor?: string | null
        }
        Update: {
          condition?: string
          condition_label?: string
          created_at?: string | null
          diagnosed_date?: string | null
          enrolled_at?: string | null
          followup_interval_days?: number | null
          followup_tests?: string[] | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          last_bp_systolic?: number | null
          last_creatinine?: number | null
          last_hba1c?: number | null
          next_followup?: string | null
          patient_id?: string
          treating_doctor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chronic_disease_programs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chronic_disease_programs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chronic_disease_programs_treating_doctor_fkey"
            columns: ["treating_doctor"]
            isOneToOne: false
            referencedRelation: "users"
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
          lab_order_item_id: string | null
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
          lab_order_item_id?: string | null
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
          lab_order_item_id?: string | null
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
            foreignKeyName: "clinical_alerts_lab_order_item_id_fkey"
            columns: ["lab_order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_order_items"
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
      clinical_protocols: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          protocol_name: string
          steps: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          protocol_name: string
          steps?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          protocol_name?: string
          steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_protocols_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_audits: {
        Row: {
          audit_date: string | null
          audited_by: string
          coding_id: string
          corrected_code: string
          correction_reason: string | null
          hospital_id: string
          id: string
          original_code: string
          revenue_impact: number | null
        }
        Insert: {
          audit_date?: string | null
          audited_by: string
          coding_id: string
          corrected_code: string
          correction_reason?: string | null
          hospital_id: string
          id?: string
          original_code: string
          revenue_impact?: number | null
        }
        Update: {
          audit_date?: string | null
          audited_by?: string
          coding_id?: string
          corrected_code?: string
          correction_reason?: string | null
          hospital_id?: string
          id?: string
          original_code?: string
          revenue_impact?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coding_audits_audited_by_fkey"
            columns: ["audited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_audits_coding_id_fkey"
            columns: ["coding_id"]
            isOneToOne: false
            referencedRelation: "icd_codings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_audits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_templates: {
        Row: {
          content: string | null
          created_at: string | null
          form_name: string
          form_type: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          requires_witness: boolean | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          form_name: string
          form_type?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          requires_witness?: boolean | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          form_name?: string
          form_type?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          requires_witness?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_templates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_match_records: {
        Row: {
          admission_id: string | null
          hospital_id: string
          id: string
          notes: string | null
          ot_id: string | null
          patient_id: string
          performed_at: string | null
          performed_by: string
          result: string
          technique: string
          unit_id: string
        }
        Insert: {
          admission_id?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          ot_id?: string | null
          patient_id: string
          performed_at?: string | null
          performed_by: string
          result: string
          technique: string
          unit_id: string
        }
        Update: {
          admission_id?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          ot_id?: string | null
          patient_id?: string
          performed_at?: string | null
          performed_by?: string
          result?: string
          technique?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_match_records_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_match_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_match_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_match_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_match_records_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "blood_units"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_instruments: {
        Row: {
          cycle_id: string
          hospital_id: string
          id: string
          instrument_id: string | null
          item_type: string | null
          set_id: string | null
        }
        Insert: {
          cycle_id: string
          hospital_id: string
          id?: string
          instrument_id?: string | null
          item_type?: string | null
          set_id?: string | null
        }
        Update: {
          cycle_id?: string
          hospital_id?: string
          id?: string
          instrument_id?: string | null
          item_type?: string | null
          set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_instruments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "sterilization_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_instruments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_instruments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_instruments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "instrument_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      daycare_chairs: {
        Row: {
          chair_name: string
          chair_type: string | null
          created_at: string | null
          current_patient: string | null
          estimated_end: string | null
          hospital_id: string
          id: string
          occupied_since: string | null
          status: string | null
        }
        Insert: {
          chair_name: string
          chair_type?: string | null
          created_at?: string | null
          current_patient?: string | null
          estimated_end?: string | null
          hospital_id: string
          id?: string
          occupied_since?: string | null
          status?: string | null
        }
        Update: {
          chair_name?: string
          chair_type?: string | null
          created_at?: string | null
          current_patient?: string | null
          estimated_end?: string | null
          hospital_id?: string
          id?: string
          occupied_since?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daycare_chairs_current_patient_fkey"
            columns: ["current_patient"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daycare_chairs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      death_certificates: {
        Row: {
          admission_id: string | null
          cause_1a: string
          cause_1b: string | null
          cause_1c: string | null
          cause_2: string | null
          certified_by: string
          civil_reg_submitted: boolean | null
          created_at: string | null
          digital_signed: boolean | null
          hospital_id: string
          icd_code: string | null
          id: string
          is_mlc: boolean | null
          issued_at: string | null
          manner_of_death: string | null
          mccd_form_number: string | null
          patient_id: string
          time_of_death: string
        }
        Insert: {
          admission_id?: string | null
          cause_1a: string
          cause_1b?: string | null
          cause_1c?: string | null
          cause_2?: string | null
          certified_by: string
          civil_reg_submitted?: boolean | null
          created_at?: string | null
          digital_signed?: boolean | null
          hospital_id: string
          icd_code?: string | null
          id?: string
          is_mlc?: boolean | null
          issued_at?: string | null
          manner_of_death?: string | null
          mccd_form_number?: string | null
          patient_id: string
          time_of_death: string
        }
        Update: {
          admission_id?: string | null
          cause_1a?: string
          cause_1b?: string | null
          cause_1c?: string | null
          cause_2?: string | null
          certified_by?: string
          civil_reg_submitted?: boolean | null
          created_at?: string | null
          digital_signed?: boolean | null
          hospital_id?: string
          icd_code?: string | null
          id?: string
          is_mlc?: boolean | null
          issued_at?: string | null
          manner_of_death?: string | null
          mccd_form_number?: string | null
          patient_id?: string
          time_of_death?: string
        }
        Relationships: [
          {
            foreignKeyName: "death_certificates_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "death_certificates_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "death_certificates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "death_certificates_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      department_indents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          department_id: string
          hospital_id: string
          id: string
          indent_number: string
          notes: string | null
          requested_by: string
          required_date: string | null
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id: string
          hospital_id: string
          id?: string
          indent_number: string
          notes?: string | null
          requested_by: string
          required_date?: string | null
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department_id?: string
          hospital_id?: string
          id?: string
          indent_number?: string
          notes?: string | null
          requested_by?: string
          required_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_indents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_indents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_indents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_indents_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      dialysis_machines: {
        Row: {
          created_at: string | null
          current_patient_id: string | null
          disinfection_due_at: string | null
          hospital_id: string
          id: string
          is_active: boolean
          last_disinfected_at: string | null
          machine_name: string
          machine_type: string
          model: string | null
          serial_number: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          current_patient_id?: string | null
          disinfection_due_at?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean
          last_disinfected_at?: string | null
          machine_name: string
          machine_type?: string
          model?: string | null
          serial_number?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          current_patient_id?: string | null
          disinfection_due_at?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean
          last_disinfected_at?: string | null
          machine_name?: string
          machine_type?: string
          model?: string | null
          serial_number?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialysis_machines_current_patient_id_fkey"
            columns: ["current_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialysis_machines_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      dialysis_patients: {
        Row: {
          access_site: string | null
          access_type: string
          created_at: string | null
          diagnosis: string
          dialysis_frequency: string
          dry_weight_kg: number | null
          hbv_status: string
          hcv_status: string
          hiv_status: string
          hospital_id: string
          id: string
          is_active: boolean
          machine_type_required: string
          patient_id: string
          registered_at: string | null
          session_duration_hrs: number
          treating_doctor: string | null
        }
        Insert: {
          access_site?: string | null
          access_type?: string
          created_at?: string | null
          diagnosis?: string
          dialysis_frequency?: string
          dry_weight_kg?: number | null
          hbv_status?: string
          hcv_status?: string
          hiv_status?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          machine_type_required?: string
          patient_id: string
          registered_at?: string | null
          session_duration_hrs?: number
          treating_doctor?: string | null
        }
        Update: {
          access_site?: string | null
          access_type?: string
          created_at?: string | null
          diagnosis?: string
          dialysis_frequency?: string
          dry_weight_kg?: number | null
          hbv_status?: string
          hcv_status?: string
          hiv_status?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          machine_type_required?: string
          patient_id?: string
          registered_at?: string | null
          session_duration_hrs?: number
          treating_doctor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dialysis_patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialysis_patients_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialysis_patients_treating_doctor_fkey"
            columns: ["treating_doctor"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dialysis_sessions: {
        Row: {
          access_used: string | null
          blood_flow_rate_ml: number | null
          complications: string | null
          created_at: string | null
          dialysate_flow_rate: number | null
          dialysis_patient_id: string
          dialyzer_id: string | null
          ended_at: string | null
          heparin_dose: string | null
          heparin_dose_units: number | null
          hospital_id: string
          id: string
          kt_v: number | null
          machine_id: string | null
          notes: string | null
          performed_by: string | null
          post_bp_diastolic: number | null
          post_bp_systolic: number | null
          post_pulse: number | null
          post_weight_kg: number | null
          pre_bp_diastolic: number | null
          pre_bp_systolic: number | null
          pre_pulse: number | null
          pre_temp: number | null
          pre_weight_kg: number | null
          scheduled_start: string | null
          session_date: string
          session_notes: string | null
          shift: string | null
          started_at: string | null
          status: string
          uf_achieved_ml: number | null
          uf_goal_ml: number | null
          urea_post: number | null
          urea_pre: number | null
        }
        Insert: {
          access_used?: string | null
          blood_flow_rate_ml?: number | null
          complications?: string | null
          created_at?: string | null
          dialysate_flow_rate?: number | null
          dialysis_patient_id: string
          dialyzer_id?: string | null
          ended_at?: string | null
          heparin_dose?: string | null
          heparin_dose_units?: number | null
          hospital_id: string
          id?: string
          kt_v?: number | null
          machine_id?: string | null
          notes?: string | null
          performed_by?: string | null
          post_bp_diastolic?: number | null
          post_bp_systolic?: number | null
          post_pulse?: number | null
          post_weight_kg?: number | null
          pre_bp_diastolic?: number | null
          pre_bp_systolic?: number | null
          pre_pulse?: number | null
          pre_temp?: number | null
          pre_weight_kg?: number | null
          scheduled_start?: string | null
          session_date?: string
          session_notes?: string | null
          shift?: string | null
          started_at?: string | null
          status?: string
          uf_achieved_ml?: number | null
          uf_goal_ml?: number | null
          urea_post?: number | null
          urea_pre?: number | null
        }
        Update: {
          access_used?: string | null
          blood_flow_rate_ml?: number | null
          complications?: string | null
          created_at?: string | null
          dialysate_flow_rate?: number | null
          dialysis_patient_id?: string
          dialyzer_id?: string | null
          ended_at?: string | null
          heparin_dose?: string | null
          heparin_dose_units?: number | null
          hospital_id?: string
          id?: string
          kt_v?: number | null
          machine_id?: string | null
          notes?: string | null
          performed_by?: string | null
          post_bp_diastolic?: number | null
          post_bp_systolic?: number | null
          post_pulse?: number | null
          post_weight_kg?: number | null
          pre_bp_diastolic?: number | null
          pre_bp_systolic?: number | null
          pre_pulse?: number | null
          pre_temp?: number | null
          pre_weight_kg?: number | null
          scheduled_start?: string | null
          session_date?: string
          session_notes?: string | null
          shift?: string | null
          started_at?: string | null
          status?: string
          uf_achieved_ml?: number | null
          uf_goal_ml?: number | null
          urea_post?: number | null
          urea_pre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dialysis_sessions_dialysis_patient_id_fkey"
            columns: ["dialysis_patient_id"]
            isOneToOne: false
            referencedRelation: "dialysis_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialysis_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialysis_sessions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "dialysis_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialysis_sessions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dialyzer_reuse: {
        Row: {
          created_at: string | null
          current_use_count: number
          dialysis_patient_id: string
          dialyzer_model: string
          hospital_id: string
          id: string
          is_active: boolean
          max_reuse_count: number
        }
        Insert: {
          created_at?: string | null
          current_use_count?: number
          dialysis_patient_id: string
          dialyzer_model: string
          hospital_id: string
          id?: string
          is_active?: boolean
          max_reuse_count?: number
        }
        Update: {
          created_at?: string | null
          current_use_count?: number
          dialysis_patient_id?: string
          dialyzer_model?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          max_reuse_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "dialyzer_reuse_dialysis_patient_id_fkey"
            columns: ["dialysis_patient_id"]
            isOneToOne: false
            referencedRelation: "dialysis_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialyzer_reuse_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_approvals: {
        Row: {
          approved_by: string | null
          bill_id: string
          discount_amount: number
          discount_percent: number
          hospital_id: string
          id: string
          reason: string
          remarks: string | null
          requested_at: string | null
          requested_by: string
          responded_at: string | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          bill_id: string
          discount_amount: number
          discount_percent: number
          hospital_id: string
          id?: string
          reason: string
          remarks?: string | null
          requested_at?: string | null
          requested_by: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          bill_id?: string
          discount_amount?: number
          discount_percent?: number
          hospital_id?: string
          id?: string
          reason?: string
          remarks?: string | null
          requested_at?: string | null
          requested_by?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_approvals_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_approvals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          address: string | null
          age: number | null
          blood_group: string
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string | null
          dob: string | null
          donation_count: number | null
          donor_code: string
          full_name: string
          gender: string | null
          hb_at_donation: number | null
          hbsag_status: string | null
          hcv_status: string | null
          hiv_status: string | null
          hospital_id: string
          id: string
          is_eligible: boolean | null
          last_donation: string | null
          malaria_status: string | null
          next_eligible: string | null
          phone: string | null
          rh_factor: string
          vdrl_status: string | null
          weight_kg: number | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          blood_group: string
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string | null
          dob?: string | null
          donation_count?: number | null
          donor_code: string
          full_name: string
          gender?: string | null
          hb_at_donation?: number | null
          hbsag_status?: string | null
          hcv_status?: string | null
          hiv_status?: string | null
          hospital_id: string
          id?: string
          is_eligible?: boolean | null
          last_donation?: string | null
          malaria_status?: string | null
          next_eligible?: string | null
          phone?: string | null
          rh_factor: string
          vdrl_status?: string | null
          weight_kg?: number | null
        }
        Update: {
          address?: string | null
          age?: number | null
          blood_group?: string
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string | null
          dob?: string | null
          donation_count?: number | null
          donor_code?: string
          full_name?: string
          gender?: string | null
          hb_at_donation?: number | null
          hbsag_status?: string | null
          hcv_status?: string | null
          hiv_status?: string | null
          hospital_id?: string
          id?: string
          is_eligible?: boolean | null
          last_donation?: string | null
          malaria_status?: string | null
          next_eligible?: string | null
          phone?: string | null
          rh_factor?: string
          vdrl_status?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_allergy_cross_reactivity: {
        Row: {
          allergen: string
          cross_reacts: string[] | null
          id: string
          note: string | null
          risk_level: string | null
        }
        Insert: {
          allergen: string
          cross_reacts?: string[] | null
          id?: string
          note?: string | null
          risk_level?: string | null
        }
        Update: {
          allergen?: string
          cross_reacts?: string[] | null
          id?: string
          note?: string | null
          risk_level?: string | null
        }
        Relationships: []
      }
      drug_batches: {
        Row: {
          batch_number: string
          cost_price: number
          created_at: string | null
          drug_id: string
          expiry_date: string
          gst_percent: number | null
          hospital_id: string
          hsn_code: string | null
          id: string
          is_active: boolean | null
          manufacturer: string | null
          mrp: number
          purchase_date: string | null
          quantity_available: number
          quantity_received: number
          sale_price: number
          supplier_name: string | null
        }
        Insert: {
          batch_number: string
          cost_price: number
          created_at?: string | null
          drug_id: string
          expiry_date: string
          gst_percent?: number | null
          hospital_id: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          mrp: number
          purchase_date?: string | null
          quantity_available: number
          quantity_received: number
          sale_price: number
          supplier_name?: string | null
        }
        Update: {
          batch_number?: string
          cost_price?: number
          created_at?: string | null
          drug_id?: string
          expiry_date?: string
          gst_percent?: number | null
          hospital_id?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          mrp?: number
          purchase_date?: string | null
          quantity_available?: number
          quantity_received?: number
          sale_price?: number
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_batches_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drug_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_batches_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          clinical_effect: string | null
          created_at: string | null
          drug_a: string
          drug_b: string
          id: string
          mechanism: string | null
          recommendation: string | null
          severity: string
        }
        Insert: {
          clinical_effect?: string | null
          created_at?: string | null
          drug_a: string
          drug_b: string
          id?: string
          mechanism?: string | null
          recommendation?: string | null
          severity: string
        }
        Update: {
          clinical_effect?: string | null
          created_at?: string | null
          drug_a?: string
          drug_b?: string
          id?: string
          mechanism?: string | null
          recommendation?: string | null
          severity?: string
        }
        Relationships: []
      }
      drug_master: {
        Row: {
          category: string | null
          dosage_forms: string[] | null
          drug_name: string
          drug_schedule: string | null
          generic_name: string | null
          gst_percent: number | null
          hospital_id: string
          hsn_code: string | null
          id: string
          is_active: boolean | null
          is_ndps: boolean | null
          reorder_level: number | null
          routes: string[] | null
          standard_doses: string[] | null
        }
        Insert: {
          category?: string | null
          dosage_forms?: string[] | null
          drug_name: string
          drug_schedule?: string | null
          generic_name?: string | null
          gst_percent?: number | null
          hospital_id: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          is_ndps?: boolean | null
          reorder_level?: number | null
          routes?: string[] | null
          standard_doses?: string[] | null
        }
        Update: {
          category?: string | null
          dosage_forms?: string[] | null
          drug_name?: string
          drug_schedule?: string | null
          generic_name?: string | null
          gst_percent?: number | null
          hospital_id?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          is_ndps?: boolean | null
          reorder_level?: number | null
          routes?: string[] | null
          standard_doses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_master_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_roster: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          hospital_id: string
          id: string
          is_holiday: boolean | null
          is_off: boolean | null
          notes: string | null
          roster_date: string
          shift_id: string | null
          user_id: string
          ward_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          hospital_id: string
          id?: string
          is_holiday?: boolean | null
          is_off?: boolean | null
          notes?: string | null
          roster_date: string
          shift_id?: string | null
          user_id: string
          ward_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          hospital_id?: string
          id?: string
          is_holiday?: boolean | null
          is_off?: boolean | null
          notes?: string | null
          roster_date?: string
          shift_id?: string | null
          user_id?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duty_roster_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_roster_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      ed_visits: {
        Row: {
          ample_history: Json | null
          arrival_mode: string
          arrival_time: string
          chief_complaint: string | null
          created_at: string | null
          disposition: string | null
          disposition_time: string | null
          doctor_id: string | null
          gcs_score: number | null
          hospital_id: string
          id: string
          is_active: boolean | null
          mlc: boolean | null
          mlc_details: Json | null
          patient_id: string
          triage_category: string
          vitals_snapshot: Json | null
          working_diagnosis: string | null
        }
        Insert: {
          ample_history?: Json | null
          arrival_mode?: string
          arrival_time?: string
          chief_complaint?: string | null
          created_at?: string | null
          disposition?: string | null
          disposition_time?: string | null
          doctor_id?: string | null
          gcs_score?: number | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          mlc?: boolean | null
          mlc_details?: Json | null
          patient_id: string
          triage_category?: string
          vitals_snapshot?: Json | null
          working_diagnosis?: string | null
        }
        Update: {
          ample_history?: Json | null
          arrival_mode?: string
          arrival_time?: string
          chief_complaint?: string | null
          created_at?: string | null
          disposition?: string | null
          disposition_time?: string | null
          doctor_id?: string | null
          gcs_score?: number | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          mlc?: boolean | null
          mlc_details?: Json | null
          patient_id?: string
          triage_category?: string
          vitals_snapshot?: Json | null
          working_diagnosis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ed_visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ed_visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ed_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_records: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string
          expense_category: string
          expense_date: string
          gst_amount: number | null
          hospital_id: string
          id: string
          journal_id: string | null
          payment_mode: string | null
          receipt_url: string | null
          reference_number: string | null
          total_amount: number
          vendor_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description: string
          expense_category: string
          expense_date?: string
          gst_amount?: number | null
          hospital_id: string
          id?: string
          journal_id?: string | null
          payment_mode?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          total_amount: number
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string
          expense_category?: string
          expense_date?: string
          gst_amount?: number | null
          hospital_id?: string
          id?: string
          journal_id?: string | null
          payment_mode?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          total_amount?: number
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_records_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_ai_log: {
        Row: {
          created_at: string | null
          extraction_confidence: number | null
          grn_id: string | null
          hospital_id: string
          id: string
          invoice_image_url: string | null
          items_extracted: number | null
          items_matched: number | null
          items_unmatched: number | null
          manual_corrections: number | null
          model_used: string | null
          processing_time_ms: number | null
        }
        Insert: {
          created_at?: string | null
          extraction_confidence?: number | null
          grn_id?: string | null
          hospital_id: string
          id?: string
          invoice_image_url?: string | null
          items_extracted?: number | null
          items_matched?: number | null
          items_unmatched?: number | null
          manual_corrections?: number | null
          model_used?: string | null
          processing_time_ms?: number | null
        }
        Update: {
          created_at?: string | null
          extraction_confidence?: number | null
          grn_id?: string | null
          hospital_id?: string
          id?: string
          invoice_image_url?: string | null
          items_extracted?: number | null
          items_matched?: number | null
          items_unmatched?: number | null
          manual_corrections?: number | null
          model_used?: string | null
          processing_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_ai_log_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_ai_log_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          batch_number: string | null
          expiry_date: string | null
          grn_id: string
          hospital_id: string
          id: string
          item_id: string
          po_item_id: string | null
          quantity_received: number
          total_amount: number
          unit_rate: number
        }
        Insert: {
          batch_number?: string | null
          expiry_date?: string | null
          grn_id: string
          hospital_id: string
          id?: string
          item_id: string
          po_item_id?: string | null
          quantity_received: number
          total_amount: number
          unit_rate: number
        }
        Update: {
          batch_number?: string | null
          expiry_date?: string | null
          grn_id?: string
          hospital_id?: string
          id?: string
          item_id?: string
          po_item_id?: string | null
          quantity_received?: number
          total_amount?: number
          unit_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "po_items"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_records: {
        Row: {
          created_at: string | null
          grn_date: string | null
          grn_number: string
          hospital_id: string
          id: string
          invoice_date: string | null
          invoice_image_url: string | null
          invoice_number: string | null
          po_id: string | null
          quality_check: string | null
          received_by: string | null
          total_amount: number | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          grn_date?: string | null
          grn_number: string
          hospital_id: string
          id?: string
          invoice_date?: string | null
          invoice_image_url?: string | null
          invoice_number?: string | null
          po_id?: string | null
          quality_check?: string | null
          received_by?: string | null
          total_amount?: number | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          grn_date?: string | null
          grn_number?: string
          hospital_id?: string
          id?: string
          invoice_date?: string | null
          invoice_image_url?: string | null
          invoice_number?: string | null
          po_id?: string | null
          quality_check?: string | null
          received_by?: string | null
          total_amount?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grn_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_records_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_records_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_records_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          accent_color: string | null
          address: string | null
          announcement_text: string | null
          beds_count: number | null
          branding_config: Json | null
          country: string | null
          created_at: string
          email: string | null
          emergency_phone: string | null
          established_year: number | null
          font_family: string | null
          google_place_id: string | null
          gstin: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          nabh_number: string | null
          name: string
          payment_methods: string[]
          phone: string | null
          pincode: string | null
          primary_color: string | null
          razorpay_key_id: string | null
          setup_complete: boolean
          state: string | null
          subdomain: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          tagline: string | null
          type: Database["public"]["Enums"]["hospital_type"]
          wati_api_key: string | null
          wati_api_url: string | null
          website: string | null
          whatsapp_enabled: boolean
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          announcement_text?: string | null
          beds_count?: number | null
          branding_config?: Json | null
          country?: string | null
          created_at?: string
          email?: string | null
          emergency_phone?: string | null
          established_year?: number | null
          font_family?: string | null
          google_place_id?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          nabh_number?: string | null
          name: string
          payment_methods?: string[]
          phone?: string | null
          pincode?: string | null
          primary_color?: string | null
          razorpay_key_id?: string | null
          setup_complete?: boolean
          state?: string | null
          subdomain?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tagline?: string | null
          type?: Database["public"]["Enums"]["hospital_type"]
          wati_api_key?: string | null
          wati_api_url?: string | null
          website?: string | null
          whatsapp_enabled?: boolean
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          announcement_text?: string | null
          beds_count?: number | null
          branding_config?: Json | null
          country?: string | null
          created_at?: string
          email?: string | null
          emergency_phone?: string | null
          established_year?: number | null
          font_family?: string | null
          google_place_id?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          nabh_number?: string | null
          name?: string
          payment_methods?: string[]
          phone?: string | null
          pincode?: string | null
          primary_color?: string | null
          razorpay_key_id?: string | null
          setup_complete?: boolean
          state?: string | null
          subdomain?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tagline?: string | null
          type?: Database["public"]["Enums"]["hospital_type"]
          wati_api_key?: string | null
          wati_api_url?: string | null
          website?: string | null
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      icd_codings: {
        Row: {
          ai_confidence: number | null
          ai_suggestion: string | null
          coded_at: string | null
          coded_by: string | null
          created_at: string | null
          hospital_id: string
          id: string
          pcs_code: string | null
          primary_icd_code: string | null
          primary_icd_desc: string | null
          secondary_codes: Json | null
          status: string | null
          validated_at: string | null
          validated_by: string | null
          visit_id: string
          visit_type: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_suggestion?: string | null
          coded_at?: string | null
          coded_by?: string | null
          created_at?: string | null
          hospital_id: string
          id?: string
          pcs_code?: string | null
          primary_icd_code?: string | null
          primary_icd_desc?: string | null
          secondary_codes?: Json | null
          status?: string | null
          validated_at?: string | null
          validated_by?: string | null
          visit_id: string
          visit_type?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_suggestion?: string | null
          coded_at?: string | null
          coded_by?: string | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          pcs_code?: string | null
          primary_icd_code?: string | null
          primary_icd_desc?: string | null
          secondary_codes?: Json | null
          status?: string | null
          validated_at?: string | null
          validated_by?: string | null
          visit_id?: string
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icd_codings_coded_by_fkey"
            columns: ["coded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icd_codings_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icd_codings_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          assigned_to: string | null
          channel: string
          created_at: string | null
          direction: string | null
          hospital_id: string
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          message_body: string
          parent_id: string | null
          patient_id: string | null
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          sender_name: string | null
          sender_phone: string | null
          status: string | null
          subject: string | null
          tags: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          channel: string
          created_at?: string | null
          direction?: string | null
          hospital_id: string
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          message_body: string
          parent_id?: string | null
          patient_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          created_at?: string | null
          direction?: string | null
          hospital_id?: string
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          message_body?: string
          parent_id?: string | null
          patient_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inbox_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          capa_id: string | null
          created_at: string | null
          department_id: string | null
          description: string
          hospital_id: string
          id: string
          immediate_action: string | null
          incident_date: string
          incident_number: string
          incident_time: string | null
          incident_type: string
          patient_id: string | null
          reported_by: string
          severity: string | null
          status: string | null
        }
        Insert: {
          capa_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description: string
          hospital_id: string
          id?: string
          immediate_action?: string | null
          incident_date: string
          incident_number: string
          incident_time?: string | null
          incident_type: string
          patient_id?: string | null
          reported_by: string
          severity?: string | null
          status?: string | null
        }
        Update: {
          capa_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string
          hospital_id?: string
          id?: string
          immediate_action?: string | null
          incident_date?: string
          incident_number?: string
          incident_time?: string | null
          incident_type?: string
          patient_id?: string | null
          reported_by?: string
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      indent_items: {
        Row: {
          hospital_id: string
          id: string
          indent_id: string
          item_id: string
          quantity_issued: number | null
          quantity_requested: number
          remarks: string | null
        }
        Insert: {
          hospital_id: string
          id?: string
          indent_id: string
          item_id: string
          quantity_issued?: number | null
          quantity_requested: number
          remarks?: string | null
        }
        Update: {
          hospital_id?: string
          id?: string
          indent_id?: string
          item_id?: string
          quantity_issued?: number | null
          quantity_requested?: number
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indent_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indent_items_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "department_indents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indent_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_sets: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          instrument_count: number | null
          set_code: string
          set_name: string
          specialty: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          instrument_count?: number | null
          set_code: string
          set_name: string
          specialty?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          instrument_count?: number | null
          set_code?: string
          set_name?: string
          specialty?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instrument_sets_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          barcode: string
          category: string | null
          created_at: string | null
          hospital_id: string
          id: string
          instrument_code: string | null
          instrument_name: string
          is_active: boolean | null
          last_sterilized_at: string | null
          material: string | null
          max_reprocessing: number | null
          reprocessing_count: number | null
          set_id: string | null
          status: string | null
        }
        Insert: {
          barcode: string
          category?: string | null
          created_at?: string | null
          hospital_id: string
          id?: string
          instrument_code?: string | null
          instrument_name: string
          is_active?: boolean | null
          last_sterilized_at?: string | null
          material?: string | null
          max_reprocessing?: number | null
          reprocessing_count?: number | null
          set_id?: string | null
          status?: string | null
        }
        Update: {
          barcode?: string
          category?: string | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          instrument_code?: string | null
          instrument_name?: string
          is_active?: boolean | null
          last_sterilized_at?: string | null
          material?: string | null
          max_reprocessing?: number | null
          reprocessing_count?: number | null
          set_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instruments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instruments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "instrument_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          ai_denial_risk_score: number | null
          approved_amount: number | null
          bill_id: string
          claim_number: string | null
          claimed_amount: number
          created_at: string | null
          created_by: string | null
          denial_code: string | null
          denial_reason: string | null
          documents_submitted: Json | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          pre_auth_id: string | null
          settled_amount: number | null
          settlement_date: string | null
          status: string
          submitted_at: string | null
          tpa_name: string
        }
        Insert: {
          ai_denial_risk_score?: number | null
          approved_amount?: number | null
          bill_id: string
          claim_number?: string | null
          claimed_amount: number
          created_at?: string | null
          created_by?: string | null
          denial_code?: string | null
          denial_reason?: string | null
          documents_submitted?: Json | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          pre_auth_id?: string | null
          settled_amount?: number | null
          settlement_date?: string | null
          status?: string
          submitted_at?: string | null
          tpa_name: string
        }
        Update: {
          ai_denial_risk_score?: number | null
          approved_amount?: number | null
          bill_id?: string
          claim_number?: string | null
          claimed_amount?: number
          created_at?: string | null
          created_by?: string | null
          denial_code?: string | null
          denial_reason?: string | null
          documents_submitted?: Json | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          pre_auth_id?: string | null
          settled_amount?: number | null
          settlement_date?: string | null
          status?: string
          submitted_at?: string | null
          tpa_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_pre_auth_id_fkey"
            columns: ["pre_auth_id"]
            isOneToOne: false
            referencedRelation: "insurance_pre_auth"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_pre_auth: {
        Row: {
          admission_id: string
          approved_amount: number | null
          approved_at: string | null
          created_at: string | null
          created_by: string | null
          diagnosis_codes: string[] | null
          documents_checklist: Json | null
          estimated_amount: number | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          policy_number: string | null
          pre_auth_number: string | null
          procedure_codes: string[] | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          tpa_name: string
          valid_until: string | null
        }
        Insert: {
          admission_id: string
          approved_amount?: number | null
          approved_at?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis_codes?: string[] | null
          documents_checklist?: Json | null
          estimated_amount?: number | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          policy_number?: string | null
          pre_auth_number?: string | null
          procedure_codes?: string[] | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          tpa_name: string
          valid_until?: string | null
        }
        Update: {
          admission_id?: string
          approved_amount?: number | null
          approved_at?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis_codes?: string[] | null
          documents_checklist?: Json | null
          estimated_amount?: number | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          policy_number?: string | null
          pre_auth_number?: string | null
          procedure_codes?: string[] | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          tpa_name?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_pre_auth_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_pre_auth_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_pre_auth_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_pre_auth_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          abc_class: string | null
          category: string | null
          created_at: string | null
          gst_percent: number | null
          hospital_id: string
          hsn_code: string | null
          id: string
          is_active: boolean | null
          item_code: string | null
          item_name: string
          max_stock_level: number | null
          minimum_order_qty: number | null
          reorder_level: number | null
          uom: string | null
          ved_class: string | null
        }
        Insert: {
          abc_class?: string | null
          category?: string | null
          created_at?: string | null
          gst_percent?: number | null
          hospital_id: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          item_name: string
          max_stock_level?: number | null
          minimum_order_qty?: number | null
          reorder_level?: number | null
          uom?: string | null
          ved_class?: string | null
        }
        Update: {
          abc_class?: string | null
          category?: string | null
          created_at?: string | null
          gst_percent?: number | null
          hospital_id?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          item_name?: string
          max_stock_level?: number | null
          minimum_order_qty?: number | null
          reorder_level?: number | null
          uom?: string | null
          ved_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          batch_number: string | null
          cost_price: number | null
          expiry_date: string | null
          hospital_id: string
          id: string
          item_id: string
          last_received_date: string | null
          location: string | null
          mrp: number | null
          quantity_available: number
          quantity_reserved: number | null
        }
        Insert: {
          batch_number?: string | null
          cost_price?: number | null
          expiry_date?: string | null
          hospital_id: string
          id?: string
          item_id: string
          last_received_date?: string | null
          location?: string | null
          mrp?: number | null
          quantity_available?: number
          quantity_reserved?: number | null
        }
        Update: {
          batch_number?: string | null
          cost_price?: number | null
          expiry_date?: string | null
          hospital_id?: string
          id?: string
          item_id?: string
          last_received_date?: string | null
          location?: string | null
          mrp?: number | null
          quantity_available?: number
          quantity_reserved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ipd_medications: {
        Row: {
          admission_id: string
          created_at: string | null
          dose: string | null
          drug_name: string
          end_date: string | null
          frequency: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          ordered_by: string
          route: string | null
          start_date: string | null
        }
        Insert: {
          admission_id: string
          created_at?: string | null
          dose?: string | null
          drug_name: string
          end_date?: string | null
          frequency?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          ordered_by: string
          route?: string | null
          start_date?: string | null
        }
        Update: {
          admission_id?: string
          created_at?: string | null
          dose?: string | null
          drug_name?: string
          end_date?: string | null
          frequency?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          ordered_by?: string
          route?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ipd_medications_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipd_medications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipd_medications_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ipd_vitals: {
        Row: {
          admission_id: string
          bp_diastolic: number | null
          bp_systolic: number | null
          grbs: number | null
          hospital_id: string
          id: string
          news2_score: number | null
          pain_score: number | null
          pulse: number | null
          recorded_at: string | null
          recorded_by: string
          respiratory_rate: number | null
          spo2: number | null
          temperature: number | null
          urine_output_ml: number | null
        }
        Insert: {
          admission_id: string
          bp_diastolic?: number | null
          bp_systolic?: number | null
          grbs?: number | null
          hospital_id: string
          id?: string
          news2_score?: number | null
          pain_score?: number | null
          pulse?: number | null
          recorded_at?: string | null
          recorded_by: string
          respiratory_rate?: number | null
          spo2?: number | null
          temperature?: number | null
          urine_output_ml?: number | null
        }
        Update: {
          admission_id?: string
          bp_diastolic?: number | null
          bp_systolic?: number | null
          grbs?: number | null
          hospital_id?: string
          id?: string
          news2_score?: number | null
          pain_score?: number | null
          pulse?: number | null
          recorded_at?: string | null
          recorded_by?: string
          respiratory_rate?: number | null
          spo2?: number | null
          temperature?: number | null
          urine_output_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ipd_vitals_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipd_vitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipd_vitals_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          entry_type: string | null
          hospital_id: string
          id: string
          is_auto: boolean | null
          is_balanced: boolean | null
          narration: string | null
          posted_by: string | null
          source_id: string | null
          source_module: string | null
          source_ref_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number: string
          entry_type?: string | null
          hospital_id: string
          id?: string
          is_auto?: boolean | null
          is_balanced?: boolean | null
          narration?: string | null
          posted_by?: string | null
          source_id?: string | null
          source_module?: string | null
          source_ref_id?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          entry_type?: string | null
          hospital_id?: string
          id?: string
          is_auto?: boolean | null
          is_balanced?: boolean | null
          narration?: string | null
          posted_by?: string | null
          source_id?: string | null
          source_module?: string | null
          source_ref_id?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit: number | null
          debit: number | null
          id: string
          journal_entry_id: string
          narration: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id: string
          narration?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          id?: string
          journal_entry_id?: string
          narration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_line_items: {
        Row: {
          account_code: string
          account_id: string
          account_name: string
          cost_centre_id: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          hospital_id: string
          id: string
          journal_id: string
        }
        Insert: {
          account_code: string
          account_id: string
          account_name: string
          cost_centre_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          hospital_id: string
          id?: string
          journal_id: string
        }
        Update: {
          account_code?: string
          account_id?: string
          account_name?: string
          cost_centre_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          hospital_id?: string
          id?: string
          journal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_line_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_line_items_cost_centre_id_fkey"
            columns: ["cost_centre_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_line_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_line_items_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_order_items: {
        Row: {
          created_at: string | null
          critical_acknowledged: boolean | null
          critical_acknowledged_at: string | null
          critical_acknowledged_by: string | null
          delta_flag: boolean | null
          hospital_id: string
          id: string
          lab_order_id: string
          notes: string | null
          previous_value: number | null
          reference_range: string | null
          result_entered_at: string | null
          result_entered_by: string | null
          result_flag: string | null
          result_numeric: number | null
          result_unit: string | null
          result_value: string | null
          sample_barcode: string | null
          sample_collected_at: string | null
          sample_collected_by: string | null
          status: string
          test_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          critical_acknowledged?: boolean | null
          critical_acknowledged_at?: string | null
          critical_acknowledged_by?: string | null
          delta_flag?: boolean | null
          hospital_id: string
          id?: string
          lab_order_id: string
          notes?: string | null
          previous_value?: number | null
          reference_range?: string | null
          result_entered_at?: string | null
          result_entered_by?: string | null
          result_flag?: string | null
          result_numeric?: number | null
          result_unit?: string | null
          result_value?: string | null
          sample_barcode?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          status?: string
          test_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          critical_acknowledged?: boolean | null
          critical_acknowledged_at?: string | null
          critical_acknowledged_by?: string | null
          delta_flag?: boolean | null
          hospital_id?: string
          id?: string
          lab_order_id?: string
          notes?: string | null
          previous_value?: number | null
          reference_range?: string | null
          result_entered_at?: string | null
          result_entered_by?: string | null
          result_flag?: string | null
          result_numeric?: number | null
          result_unit?: string | null
          result_value?: string | null
          sample_barcode?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          status?: string
          test_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_order_items_critical_acknowledged_by_fkey"
            columns: ["critical_acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_result_entered_by_fkey"
            columns: ["result_entered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_sample_collected_by_fkey"
            columns: ["sample_collected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_test_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_order_items_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          admission_id: string | null
          clinical_notes: string | null
          created_at: string | null
          encounter_id: string | null
          hospital_id: string
          id: string
          order_date: string
          order_time: string
          ordered_by: string
          patient_id: string
          priority: string
          status: string
        }
        Insert: {
          admission_id?: string | null
          clinical_notes?: string | null
          created_at?: string | null
          encounter_id?: string | null
          hospital_id: string
          id?: string
          order_date?: string
          order_time?: string
          ordered_by: string
          patient_id: string
          priority?: string
          status?: string
        }
        Update: {
          admission_id?: string | null
          clinical_notes?: string | null
          created_at?: string | null
          encounter_id?: string | null
          hospital_id?: string
          id?: string
          order_date?: string
          order_time?: string
          ordered_by?: string
          patient_id?: string
          priority?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "opd_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_samples: {
        Row: {
          barcode: string | null
          collected_at: string | null
          collected_by: string | null
          created_at: string | null
          hospital_id: string
          id: string
          lab_order_id: string
          received_at: string | null
          received_by: string | null
          rejection_reason: string | null
          sample_type: string
          status: string
        }
        Insert: {
          barcode?: string | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string | null
          hospital_id: string
          id?: string
          lab_order_id: string
          received_at?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          sample_type: string
          status?: string
        }
        Update: {
          barcode?: string | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          lab_order_id?: string
          received_at?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          sample_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_samples_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_test_master: {
        Row: {
          category: string
          created_at: string | null
          critical_high: number | null
          critical_low: number | null
          hospital_id: string
          id: string
          is_active: boolean | null
          method: string | null
          normal_max: number | null
          normal_min: number | null
          sample_type: string
          tat_minutes: number | null
          test_code: string | null
          test_name: string
          unit: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          method?: string | null
          normal_max?: number | null
          normal_min?: number | null
          sample_type?: string
          tat_minutes?: number | null
          test_code?: string | null
          test_name: string
          unit?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          critical_high?: number | null
          critical_low?: number | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          method?: string | null
          normal_max?: number | null
          normal_min?: number | null
          sample_type?: string
          tat_minutes?: number | null
          test_code?: string | null
          test_name?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_master_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balance: {
        Row: {
          casual_total: number | null
          casual_used: number | null
          comp_off_balance: number | null
          earned_total: number | null
          earned_used: number | null
          hospital_id: string
          id: string
          sick_total: number | null
          sick_used: number | null
          user_id: string
          year: number
        }
        Insert: {
          casual_total?: number | null
          casual_used?: number | null
          comp_off_balance?: number | null
          earned_total?: number | null
          earned_used?: number | null
          hospital_id: string
          id?: string
          sick_total?: number | null
          sick_used?: number | null
          user_id: string
          year: number
        }
        Update: {
          casual_total?: number | null
          casual_used?: number | null
          comp_off_balance?: number | null
          earned_total?: number | null
          earned_used?: number | null
          hospital_id?: string
          id?: string
          sick_total?: number | null
          sick_used?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balance_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          applied_at: string | null
          days_count: number
          from_date: string
          hospital_id: string
          id: string
          leave_type: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string | null
          to_date: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          days_count: number
          from_date: string
          hospital_id: string
          id?: string
          leave_type: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          to_date: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          days_count?: number
          from_date?: string
          hospital_id?: string
          id?: string
          leave_type?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          to_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          archived_at: string | null
          barcode: string | null
          created_at: string | null
          destroy_after: string | null
          digital_ref: string | null
          hospital_id: string
          id: string
          patient_id: string
          physical_location: string | null
          record_type: string
          status: string | null
          visit_id: string | null
        }
        Insert: {
          archived_at?: string | null
          barcode?: string | null
          created_at?: string | null
          destroy_after?: string | null
          digital_ref?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          physical_location?: string | null
          record_type: string
          status?: string | null
          visit_id?: string | null
        }
        Update: {
          archived_at?: string | null
          barcode?: string | null
          created_at?: string | null
          destroy_after?: string | null
          digital_ref?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          physical_location?: string | null
          record_type?: string
          status?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      nabh_criteria: {
        Row: {
          auto_collected: boolean | null
          chapter_code: string
          chapter_name: string
          compliance_score: number | null
          compliance_status: string | null
          created_at: string | null
          criterion_number: string
          criterion_text: string
          evidence_notes: string | null
          hospital_id: string
          id: string
          last_assessed: string | null
          next_review: string | null
          objective_elements: string[] | null
        }
        Insert: {
          auto_collected?: boolean | null
          chapter_code: string
          chapter_name: string
          compliance_score?: number | null
          compliance_status?: string | null
          created_at?: string | null
          criterion_number: string
          criterion_text: string
          evidence_notes?: string | null
          hospital_id: string
          id?: string
          last_assessed?: string | null
          next_review?: string | null
          objective_elements?: string[] | null
        }
        Update: {
          auto_collected?: boolean | null
          chapter_code?: string
          chapter_name?: string
          compliance_score?: number | null
          compliance_status?: string | null
          created_at?: string | null
          criterion_number?: string
          criterion_text?: string
          evidence_notes?: string | null
          hospital_id?: string
          id?: string
          last_assessed?: string | null
          next_review?: string | null
          objective_elements?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "nabh_criteria_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      ndps_register: {
        Row: {
          balance_after: number
          created_at: string | null
          dispensing_id: string | null
          drug_id: string
          drug_name: string
          drug_schedule: string
          hospital_id: string
          id: string
          invoice_number: string | null
          patient_address: string | null
          patient_name: string | null
          pharmacist_id: string
          prescriber_name: string | null
          prescriber_reg_no: string | null
          prescription_number: string | null
          quantity: number
          remarks: string | null
          second_pharmacist_id: string | null
          supplier_name: string | null
          transaction_date: string | null
          transaction_type: string
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          dispensing_id?: string | null
          drug_id: string
          drug_name: string
          drug_schedule: string
          hospital_id: string
          id?: string
          invoice_number?: string | null
          patient_address?: string | null
          patient_name?: string | null
          pharmacist_id: string
          prescriber_name?: string | null
          prescriber_reg_no?: string | null
          prescription_number?: string | null
          quantity: number
          remarks?: string | null
          second_pharmacist_id?: string | null
          supplier_name?: string | null
          transaction_date?: string | null
          transaction_type: string
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          dispensing_id?: string | null
          drug_id?: string
          drug_name?: string
          drug_schedule?: string
          hospital_id?: string
          id?: string
          invoice_number?: string | null
          patient_address?: string | null
          patient_name?: string | null
          pharmacist_id?: string
          prescriber_name?: string | null
          prescriber_reg_no?: string | null
          prescription_number?: string | null
          quantity?: number
          remarks?: string | null
          second_pharmacist_id?: string | null
          supplier_name?: string | null
          transaction_date?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ndps_register_dispensing_id_fkey"
            columns: ["dispensing_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_dispensing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndps_register_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drug_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndps_register_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndps_register_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndps_register_second_pharmacist_id_fkey"
            columns: ["second_pharmacist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_handovers: {
        Row: {
          completed_at: string | null
          created_at: string | null
          flags: Json | null
          hospital_id: string
          id: string
          incoming_nurse_id: string | null
          outgoing_nurse_id: string
          sbar_data: Json | null
          shift_type: string
          ward_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          flags?: Json | null
          hospital_id: string
          id?: string
          incoming_nurse_id?: string | null
          outgoing_nurse_id: string
          sbar_data?: Json | null
          shift_type: string
          ward_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          flags?: Json | null
          hospital_id?: string
          id?: string
          incoming_nurse_id?: string | null
          outgoing_nurse_id?: string
          sbar_data?: Json | null
          shift_type?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nursing_handovers_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursing_handovers_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_mar: {
        Row: {
          administered_at: string | null
          administered_by: string | null
          admission_id: string
          created_at: string | null
          five_rights_verified: boolean | null
          hospital_id: string
          id: string
          medication_id: string
          omission_reason: string | null
          outcome: string
          scheduled_date: string
          scheduled_time: string
          second_nurse_id: string | null
        }
        Insert: {
          administered_at?: string | null
          administered_by?: string | null
          admission_id: string
          created_at?: string | null
          five_rights_verified?: boolean | null
          hospital_id: string
          id?: string
          medication_id: string
          omission_reason?: string | null
          outcome?: string
          scheduled_date?: string
          scheduled_time: string
          second_nurse_id?: string | null
        }
        Update: {
          administered_at?: string | null
          administered_by?: string | null
          admission_id?: string
          created_at?: string | null
          five_rights_verified?: boolean | null
          hospital_id?: string
          id?: string
          medication_id?: string
          omission_reason?: string | null
          outcome?: string
          scheduled_date?: string
          scheduled_time?: string
          second_nurse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nursing_mar_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursing_mar_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursing_mar_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "ipd_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      oncology_patients: {
        Row: {
          bsa_m2: number | null
          current_cycle: number | null
          height_cm: number | null
          hospital_id: string
          icd_code: string | null
          id: string
          is_active: boolean | null
          patient_id: string
          performance_status: number | null
          primary_diagnosis: string
          protocol_id: string | null
          registered_at: string | null
          stage: string | null
          total_cycles_planned: number | null
          treating_oncologist: string | null
          weight_kg: number | null
        }
        Insert: {
          bsa_m2?: number | null
          current_cycle?: number | null
          height_cm?: number | null
          hospital_id: string
          icd_code?: string | null
          id?: string
          is_active?: boolean | null
          patient_id: string
          performance_status?: number | null
          primary_diagnosis: string
          protocol_id?: string | null
          registered_at?: string | null
          stage?: string | null
          total_cycles_planned?: number | null
          treating_oncologist?: string | null
          weight_kg?: number | null
        }
        Update: {
          bsa_m2?: number | null
          current_cycle?: number | null
          height_cm?: number | null
          hospital_id?: string
          icd_code?: string | null
          id?: string
          is_active?: boolean | null
          patient_id?: string
          performance_status?: number | null
          primary_diagnosis?: string
          protocol_id?: string | null
          registered_at?: string | null
          stage?: string | null
          total_cycles_planned?: number | null
          treating_oncologist?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oncology_patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oncology_patients_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oncology_patients_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "chemo_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oncology_patients_treating_oncologist_fkey"
            columns: ["treating_oncologist"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      opd_encounters: {
        Row: {
          chief_complaint: string | null
          created_at: string | null
          diagnosis: string | null
          doctor_id: string
          examination_notes: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          history_of_present_illness: string | null
          hospital_id: string
          icd10_code: string | null
          id: string
          is_admitted: boolean | null
          patient_id: string
          soap_assessment: string | null
          soap_objective: string | null
          soap_plan: string | null
          soap_subjective: string | null
          token_id: string
          updated_at: string | null
          visit_date: string | null
          vitals: Json | null
        }
        Insert: {
          chief_complaint?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          examination_notes?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          history_of_present_illness?: string | null
          hospital_id: string
          icd10_code?: string | null
          id?: string
          is_admitted?: boolean | null
          patient_id: string
          soap_assessment?: string | null
          soap_objective?: string | null
          soap_plan?: string | null
          soap_subjective?: string | null
          token_id: string
          updated_at?: string | null
          visit_date?: string | null
          vitals?: Json | null
        }
        Update: {
          chief_complaint?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          examination_notes?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          history_of_present_illness?: string | null
          hospital_id?: string
          icd10_code?: string | null
          id?: string
          is_admitted?: boolean | null
          patient_id?: string
          soap_assessment?: string | null
          soap_objective?: string | null
          soap_plan?: string | null
          soap_subjective?: string | null
          token_id?: string
          updated_at?: string | null
          visit_date?: string | null
          vitals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "opd_encounters_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_encounters_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_encounters_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "opd_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      opd_tokens: {
        Row: {
          called_at: string | null
          consultation_end_at: string | null
          consultation_start_at: string | null
          created_at: string
          department_id: string | null
          doctor_id: string | null
          hospital_id: string
          id: string
          patient_id: string
          priority: string
          status: string
          token_number: string
          token_prefix: string | null
          visit_date: string
          wait_minutes: number | null
        }
        Insert: {
          called_at?: string | null
          consultation_end_at?: string | null
          consultation_start_at?: string | null
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          priority?: string
          status?: string
          token_number: string
          token_prefix?: string | null
          visit_date?: string
          wait_minutes?: number | null
        }
        Update: {
          called_at?: string | null
          consultation_end_at?: string | null
          consultation_start_at?: string | null
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          priority?: string
          status?: string
          token_number?: string
          token_prefix?: string | null
          visit_date?: string
          wait_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opd_tokens_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_tokens_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_tokens_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      ot_checklists: {
        Row: {
          compliance_percentage: number
          created_at: string
          hospital_id: string
          id: string
          ot_schedule_id: string
          signin_allergies_known: boolean
          signin_anaesthesia_checked: boolean
          signin_blood_loss_risk: boolean
          signin_completed_at: string | null
          signin_completed_by: string | null
          signin_consent_signed: boolean
          signin_difficult_airway: boolean
          signin_patient_identity: boolean
          signin_pulse_oximeter: boolean
          signin_site_marked: boolean
          signout_completed_at: string | null
          signout_completed_by: string | null
          signout_equipment_issues: boolean
          signout_instrument_count: boolean
          signout_procedure_recorded: boolean
          signout_recovery_handover: boolean
          signout_specimen_labelled: boolean
          signout_swab_count: boolean
          timeout_antibiotics_given: boolean
          timeout_anticoagulation: boolean
          timeout_completed_at: string | null
          timeout_completed_by: string | null
          timeout_equipment_issues: boolean
          timeout_imaging_displayed: boolean
          timeout_patient_confirmed: boolean
          timeout_procedure_confirmed: boolean
          timeout_site_confirmed: boolean
          timeout_team_introduced: boolean
        }
        Insert: {
          compliance_percentage?: number
          created_at?: string
          hospital_id: string
          id?: string
          ot_schedule_id: string
          signin_allergies_known?: boolean
          signin_anaesthesia_checked?: boolean
          signin_blood_loss_risk?: boolean
          signin_completed_at?: string | null
          signin_completed_by?: string | null
          signin_consent_signed?: boolean
          signin_difficult_airway?: boolean
          signin_patient_identity?: boolean
          signin_pulse_oximeter?: boolean
          signin_site_marked?: boolean
          signout_completed_at?: string | null
          signout_completed_by?: string | null
          signout_equipment_issues?: boolean
          signout_instrument_count?: boolean
          signout_procedure_recorded?: boolean
          signout_recovery_handover?: boolean
          signout_specimen_labelled?: boolean
          signout_swab_count?: boolean
          timeout_antibiotics_given?: boolean
          timeout_anticoagulation?: boolean
          timeout_completed_at?: string | null
          timeout_completed_by?: string | null
          timeout_equipment_issues?: boolean
          timeout_imaging_displayed?: boolean
          timeout_patient_confirmed?: boolean
          timeout_procedure_confirmed?: boolean
          timeout_site_confirmed?: boolean
          timeout_team_introduced?: boolean
        }
        Update: {
          compliance_percentage?: number
          created_at?: string
          hospital_id?: string
          id?: string
          ot_schedule_id?: string
          signin_allergies_known?: boolean
          signin_anaesthesia_checked?: boolean
          signin_blood_loss_risk?: boolean
          signin_completed_at?: string | null
          signin_completed_by?: string | null
          signin_consent_signed?: boolean
          signin_difficult_airway?: boolean
          signin_patient_identity?: boolean
          signin_pulse_oximeter?: boolean
          signin_site_marked?: boolean
          signout_completed_at?: string | null
          signout_completed_by?: string | null
          signout_equipment_issues?: boolean
          signout_instrument_count?: boolean
          signout_procedure_recorded?: boolean
          signout_recovery_handover?: boolean
          signout_specimen_labelled?: boolean
          signout_swab_count?: boolean
          timeout_antibiotics_given?: boolean
          timeout_anticoagulation?: boolean
          timeout_completed_at?: string | null
          timeout_completed_by?: string | null
          timeout_equipment_issues?: boolean
          timeout_imaging_displayed?: boolean
          timeout_patient_confirmed?: boolean
          timeout_procedure_confirmed?: boolean
          timeout_site_confirmed?: boolean
          timeout_team_introduced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ot_checklists_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_checklists_ot_schedule_id_fkey"
            columns: ["ot_schedule_id"]
            isOneToOne: false
            referencedRelation: "ot_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_rooms: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
          type?: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_rooms_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_schedules: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          admission_id: string | null
          anaesthesia_type: string
          anaesthetist_id: string | null
          booking_notes: string | null
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          estimated_duration_minutes: number
          hospital_id: string
          id: string
          implants_consumables: Json | null
          ot_room_id: string
          patient_id: string
          post_op_diagnosis: string | null
          scheduled_date: string
          scheduled_end_time: string
          scheduled_start_time: string
          scrub_nurse_id: string | null
          status: string
          surgeon_id: string
          surgery_category: string
          surgery_name: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          admission_id?: string | null
          anaesthesia_type?: string
          anaesthetist_id?: string | null
          booking_notes?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          estimated_duration_minutes?: number
          hospital_id: string
          id?: string
          implants_consumables?: Json | null
          ot_room_id: string
          patient_id: string
          post_op_diagnosis?: string | null
          scheduled_date: string
          scheduled_end_time: string
          scheduled_start_time: string
          scrub_nurse_id?: string | null
          status?: string
          surgeon_id: string
          surgery_category?: string
          surgery_name: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          admission_id?: string | null
          anaesthesia_type?: string
          anaesthetist_id?: string | null
          booking_notes?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          estimated_duration_minutes?: number
          hospital_id?: string
          id?: string
          implants_consumables?: Json | null
          ot_room_id?: string
          patient_id?: string
          post_op_diagnosis?: string | null
          scheduled_date?: string
          scheduled_end_time?: string
          scheduled_start_time?: string
          scrub_nurse_id?: string | null
          status?: string
          surgeon_id?: string
          surgery_category?: string
          surgery_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_schedules_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_anaesthetist_id_fkey"
            columns: ["anaesthetist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_ot_room_id_fkey"
            columns: ["ot_room_id"]
            isOneToOne: false
            referencedRelation: "ot_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_scrub_nurse_id_fkey"
            columns: ["scrub_nurse_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_surgeon_id_fkey"
            columns: ["surgeon_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_team_members: {
        Row: {
          confirmed: boolean
          id: string
          ot_schedule_id: string
          role_in_ot: string
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          id?: string
          ot_schedule_id: string
          role_in_ot: string
          user_id: string
        }
        Update: {
          confirmed?: boolean
          id?: string
          ot_schedule_id?: string
          role_in_ot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_team_members_ot_schedule_id_fkey"
            columns: ["ot_schedule_id"]
            isOneToOne: false
            referencedRelation: "ot_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          consent_given: boolean
          consent_text: string | null
          consent_type: string
          consented_at: string | null
          created_at: string | null
          hospital_id: string
          id: string
          ip_address: string | null
          patient_id: string
        }
        Insert: {
          consent_given: boolean
          consent_text?: string | null
          consent_type: string
          consented_at?: string | null
          created_at?: string | null
          hospital_id: string
          id?: string
          ip_address?: string | null
          patient_id: string
        }
        Update: {
          consent_given?: boolean
          consent_text?: string | null
          consent_type?: string
          consented_at?: string | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          ip_address?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string | null
          file_url: string
          hospital_id: string
          id: string
          ocr_summary: string | null
          ocr_text: string | null
          patient_id: string
          upload_date: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type?: string | null
          file_url: string
          hospital_id: string
          id?: string
          ocr_summary?: string | null
          ocr_text?: string | null
          patient_id: string
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string | null
          file_url?: string
          hospital_id?: string
          id?: string
          ocr_summary?: string | null
          ocr_text?: string | null
          patient_id?: string
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_feedback: {
        Row: {
          admission_id: string | null
          comments: string | null
          doctor_rating: number | null
          encounter_id: string | null
          facility_rating: number | null
          hospital_id: string
          id: string
          nursing_rating: number | null
          overall_rating: number
          patient_id: string
          submitted_at: string | null
          would_recommend: boolean | null
        }
        Insert: {
          admission_id?: string | null
          comments?: string | null
          doctor_rating?: number | null
          encounter_id?: string | null
          facility_rating?: number | null
          hospital_id: string
          id?: string
          nursing_rating?: number | null
          overall_rating: number
          patient_id: string
          submitted_at?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          admission_id?: string | null
          comments?: string | null
          doctor_rating?: number | null
          encounter_id?: string | null
          facility_rating?: number | null
          hospital_id?: string
          id?: string
          nursing_rating?: number | null
          overall_rating?: number
          patient_id?: string
          submitted_at?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_feedback_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_feedback_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "opd_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_feedback_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_feedback_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_portal_sessions: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          last_active: string | null
          otp_code: string | null
          otp_expires_at: string | null
          otp_verified: boolean | null
          patient_id: string
          phone: string
          session_token: string | null
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          last_active?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean | null
          patient_id: string
          phone: string
          session_token?: string | null
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          last_active?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean | null
          patient_id?: string
          phone?: string
          session_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_portal_sessions_patient_id_fkey"
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
          allergies: string | null
          blood_group: string | null
          chronic_conditions: string[] | null
          created_at: string
          dob: string | null
          emergency_contact: Json | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          hospital_id: string
          id: string
          insurance_id: string | null
          is_active: boolean | null
          phone: string | null
          uhid: string
          updated_at: string | null
        }
        Insert: {
          abha_id?: string | null
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          dob?: string | null
          emergency_contact?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hospital_id: string
          id?: string
          insurance_id?: string | null
          is_active?: boolean | null
          phone?: string | null
          uhid: string
          updated_at?: string | null
        }
        Update: {
          abha_id?: string | null
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          dob?: string | null
          emergency_contact?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hospital_id?: string
          id?: string
          insurance_id?: string | null
          is_active?: boolean | null
          phone?: string | null
          uhid?: string
          updated_at?: string | null
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
      payroll_items: {
        Row: {
          absent_days: number | null
          advance_deduction: number | null
          basic: number | null
          conveyance: number | null
          created_at: string | null
          da: number | null
          esic_employee: number | null
          esic_employer: number | null
          gross_salary: number | null
          hospital_id: string
          hra: number | null
          id: string
          leave_days: number | null
          medical_allowance: number | null
          net_salary: number | null
          other_deductions: number | null
          overtime_amount: number | null
          overtime_hours: number | null
          payment_status: string | null
          payroll_run_id: string
          pf_employee: number | null
          pf_employer: number | null
          present_days: number | null
          tds: number | null
          total_deductions: number | null
          user_id: string
        }
        Insert: {
          absent_days?: number | null
          advance_deduction?: number | null
          basic?: number | null
          conveyance?: number | null
          created_at?: string | null
          da?: number | null
          esic_employee?: number | null
          esic_employer?: number | null
          gross_salary?: number | null
          hospital_id: string
          hra?: number | null
          id?: string
          leave_days?: number | null
          medical_allowance?: number | null
          net_salary?: number | null
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          payment_status?: string | null
          payroll_run_id: string
          pf_employee?: number | null
          pf_employer?: number | null
          present_days?: number | null
          tds?: number | null
          total_deductions?: number | null
          user_id: string
        }
        Update: {
          absent_days?: number | null
          advance_deduction?: number | null
          basic?: number | null
          conveyance?: number | null
          created_at?: string | null
          da?: number | null
          esic_employee?: number | null
          esic_employer?: number | null
          gross_salary?: number | null
          hospital_id?: string
          hra?: number | null
          id?: string
          leave_days?: number | null
          medical_allowance?: number | null
          net_salary?: number | null
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          payment_status?: string | null
          payroll_run_id?: string
          pf_employee?: number | null
          pf_employer?: number | null
          present_days?: number | null
          tds?: number | null
          total_deductions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_by: string | null
          created_at: string | null
          hospital_id: string
          id: string
          notes: string | null
          processed_by: string | null
          run_date: string | null
          run_month: string
          staff_count: number | null
          status: string | null
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          processed_by?: string | null
          run_date?: string | null
          run_month: string
          staff_count?: number | null
          status?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          processed_by?: string | null
          run_date?: string | null
          run_month?: string
          staff_count?: number | null
          status?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pcpndt_form_f: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          indication: string | null
          order_id: string
          patient_address: string | null
          patient_age: number | null
          patient_name: string
          referred_by: string | null
          remarks: string | null
          sex_determination_done: boolean | null
          signed_at: string | null
          signed_by: string
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          indication?: string | null
          order_id: string
          patient_address?: string | null
          patient_age?: number | null
          patient_name: string
          referred_by?: string | null
          remarks?: string | null
          sex_determination_done?: boolean | null
          signed_at?: string | null
          signed_by: string
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          indication?: string | null
          order_id?: string
          patient_address?: string | null
          patient_age?: number | null
          patient_name?: string
          referred_by?: string | null
          remarks?: string | null
          sex_determination_done?: boolean | null
          signed_at?: string | null
          signed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcpndt_form_f_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcpndt_form_f_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "radiology_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pcpndt_form_f_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_dispensing: {
        Row: {
          admission_id: string | null
          bill_linked: boolean | null
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          dispensed_at: string | null
          dispensed_by: string
          dispensing_number: string | null
          dispensing_type: string | null
          encounter_id: string | null
          gst_amount: number | null
          hospital_id: string
          id: string
          net_amount: number | null
          patient_id: string
          payment_mode: string | null
          prescription_id: string | null
          status: string | null
          total_amount: number | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          admission_id?: string | null
          bill_linked?: boolean | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          dispensed_at?: string | null
          dispensed_by: string
          dispensing_number?: string | null
          dispensing_type?: string | null
          encounter_id?: string | null
          gst_amount?: number | null
          hospital_id: string
          id?: string
          net_amount?: number | null
          patient_id: string
          payment_mode?: string | null
          prescription_id?: string | null
          status?: string | null
          total_amount?: number | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          admission_id?: string | null
          bill_linked?: boolean | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          dispensed_at?: string | null
          dispensed_by?: string
          dispensing_number?: string | null
          dispensing_type?: string | null
          encounter_id?: string | null
          gst_amount?: number | null
          hospital_id?: string
          id?: string
          net_amount?: number | null
          patient_id?: string
          payment_mode?: string | null
          prescription_id?: string | null
          status?: string | null
          total_amount?: number | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_dispensing_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "opd_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_dispensing_items: {
        Row: {
          batch_id: string
          batch_number: string
          created_at: string | null
          dispensing_id: string
          drug_id: string
          drug_name: string
          expiry_date: string
          five_rights_verified: boolean | null
          gst_percent: number | null
          hospital_id: string
          id: string
          is_ndps: boolean | null
          ndps_second_pharmacist_id: string | null
          quantity_dispensed: number
          quantity_requested: number
          return_quantity: number | null
          return_reason: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_id: string
          batch_number: string
          created_at?: string | null
          dispensing_id: string
          drug_id: string
          drug_name: string
          expiry_date: string
          five_rights_verified?: boolean | null
          gst_percent?: number | null
          hospital_id: string
          id?: string
          is_ndps?: boolean | null
          ndps_second_pharmacist_id?: string | null
          quantity_dispensed?: number
          quantity_requested: number
          return_quantity?: number | null
          return_reason?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          batch_id?: string
          batch_number?: string
          created_at?: string | null
          dispensing_id?: string
          drug_id?: string
          drug_name?: string
          expiry_date?: string
          five_rights_verified?: boolean | null
          gst_percent?: number | null
          hospital_id?: string
          id?: string
          is_ndps?: boolean | null
          ndps_second_pharmacist_id?: string | null
          quantity_dispensed?: number
          quantity_requested?: number
          return_quantity?: number | null
          return_reason?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_dispensing_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "drug_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_items_dispensing_id_fkey"
            columns: ["dispensing_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_dispensing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drug_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensing_items_ndps_second_pharmacist_id_fkey"
            columns: ["ndps_second_pharmacist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_stock_alerts: {
        Row: {
          acknowledged_by: string | null
          alert_type: string
          batch_id: string | null
          created_at: string | null
          drug_id: string
          expiry_date: string | null
          hospital_id: string
          id: string
          is_acknowledged: boolean | null
          quantity: number | null
        }
        Insert: {
          acknowledged_by?: string | null
          alert_type: string
          batch_id?: string | null
          created_at?: string | null
          drug_id: string
          expiry_date?: string | null
          hospital_id: string
          id?: string
          is_acknowledged?: boolean | null
          quantity?: number | null
        }
        Update: {
          acknowledged_by?: string | null
          alert_type?: string
          batch_id?: string | null
          created_at?: string | null
          drug_id?: string
          expiry_date?: string | null
          hospital_id?: string
          id?: string
          is_acknowledged?: boolean | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_stock_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_alerts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "drug_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_alerts_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drug_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_stock_alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      po_items: {
        Row: {
          created_at: string | null
          gst_percent: number | null
          hospital_id: string
          id: string
          item_id: string
          po_id: string
          quantity_ordered: number
          quantity_received: number | null
          total_amount: number
          unit_rate: number
        }
        Insert: {
          created_at?: string | null
          gst_percent?: number | null
          hospital_id: string
          id?: string
          item_id: string
          po_id: string
          quantity_ordered: number
          quantity_received?: number | null
          total_amount: number
          unit_rate: number
        }
        Update: {
          created_at?: string | null
          gst_percent?: number | null
          hospital_id?: string
          id?: string
          item_id?: string
          po_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          total_amount?: number
          unit_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          advice_notes: string | null
          created_at: string | null
          doctor_id: string
          drugs: Json | null
          encounter_id: string
          hospital_id: string
          id: string
          is_signed: boolean | null
          lab_orders: Json | null
          patient_id: string
          prescription_date: string | null
          radiology_orders: Json | null
          review_date: string | null
          signed_at: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          advice_notes?: string | null
          created_at?: string | null
          doctor_id: string
          drugs?: Json | null
          encounter_id: string
          hospital_id: string
          id?: string
          is_signed?: boolean | null
          lab_orders?: Json | null
          patient_id: string
          prescription_date?: string | null
          radiology_orders?: Json | null
          review_date?: string | null
          signed_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          advice_notes?: string | null
          created_at?: string | null
          doctor_id?: string
          drugs?: Json | null
          encounter_id?: string
          hospital_id?: string
          id?: string
          is_signed?: boolean | null
          lab_orders?: Json | null
          patient_id?: string
          prescription_date?: string | null
          radiology_orders?: Json | null
          review_date?: string | null
          signed_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "opd_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery: string | null
          gst_amount: number | null
          hospital_id: string
          id: string
          net_amount: number | null
          notes: string | null
          po_date: string | null
          po_number: string
          status: string | null
          total_amount: number | null
          vendor_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery?: string | null
          gst_amount?: number | null
          hospital_id: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          po_date?: string | null
          po_number: string
          status?: string | null
          total_amount?: number | null
          vendor_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery?: string | null
          gst_amount?: number | null
          hospital_id?: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          po_date?: string | null
          po_number?: string
          status?: string | null
          total_amount?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_indicators: {
        Row: {
          auto_calculated: boolean | null
          benchmark: number | null
          category: string | null
          created_at: string | null
          data_source: string | null
          denominator: number | null
          hospital_id: string
          id: string
          indicator_name: string
          numerator: number | null
          period: string | null
          period_start: string | null
          target: number | null
          unit: string | null
          value: number | null
        }
        Insert: {
          auto_calculated?: boolean | null
          benchmark?: number | null
          category?: string | null
          created_at?: string | null
          data_source?: string | null
          denominator?: number | null
          hospital_id: string
          id?: string
          indicator_name: string
          numerator?: number | null
          period?: string | null
          period_start?: string | null
          target?: number | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          auto_calculated?: boolean | null
          benchmark?: number | null
          category?: string | null
          created_at?: string | null
          data_source?: string | null
          denominator?: number | null
          hospital_id?: string
          id?: string
          indicator_name?: string
          numerator?: number | null
          period?: string | null
          period_start?: string | null
          target?: number | null
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_indicators_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_modalities: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          modality_type: string
          name: string
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          modality_type: string
          name: string
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          modality_type?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "radiology_modalities_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_orders: {
        Row: {
          accession_number: string | null
          admission_id: string | null
          body_part: string | null
          clinical_history: string | null
          created_at: string | null
          dicom_pacs_url: string | null
          dicom_study_uid: string | null
          encounter_id: string | null
          hospital_id: string
          id: string
          indication: string | null
          is_pcpndt: boolean | null
          modality_id: string
          modality_type: string
          order_date: string
          order_time: string
          ordered_by: string
          patient_id: string
          priority: string
          scheduled_time: string | null
          status: string
          study_name: string
        }
        Insert: {
          accession_number?: string | null
          admission_id?: string | null
          body_part?: string | null
          clinical_history?: string | null
          created_at?: string | null
          dicom_pacs_url?: string | null
          dicom_study_uid?: string | null
          encounter_id?: string | null
          hospital_id: string
          id?: string
          indication?: string | null
          is_pcpndt?: boolean | null
          modality_id: string
          modality_type: string
          order_date?: string
          order_time?: string
          ordered_by: string
          patient_id: string
          priority?: string
          scheduled_time?: string | null
          status?: string
          study_name: string
        }
        Update: {
          accession_number?: string | null
          admission_id?: string | null
          body_part?: string | null
          clinical_history?: string | null
          created_at?: string | null
          dicom_pacs_url?: string | null
          dicom_study_uid?: string | null
          encounter_id?: string | null
          hospital_id?: string
          id?: string
          indication?: string | null
          is_pcpndt?: boolean | null
          modality_id?: string
          modality_type?: string
          order_date?: string
          order_time?: string
          ordered_by?: string
          patient_id?: string
          priority?: string
          scheduled_time?: string | null
          status?: string
          study_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "radiology_orders_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_orders_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "opd_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_orders_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "radiology_modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_reports: {
        Row: {
          ai_impression_suggestion: string | null
          comparison_note: string | null
          created_at: string | null
          critical_finding: string | null
          findings: string | null
          hospital_id: string
          id: string
          impression: string | null
          is_ai_used: boolean | null
          is_critical: boolean | null
          is_signed: boolean | null
          order_id: string
          patient_id: string
          radiologist_id: string | null
          recommendations: string | null
          reported_at: string | null
          technique: string | null
          validated_at: string | null
          validated_by: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          ai_impression_suggestion?: string | null
          comparison_note?: string | null
          created_at?: string | null
          critical_finding?: string | null
          findings?: string | null
          hospital_id: string
          id?: string
          impression?: string | null
          is_ai_used?: boolean | null
          is_critical?: boolean | null
          is_signed?: boolean | null
          order_id: string
          patient_id: string
          radiologist_id?: string | null
          recommendations?: string | null
          reported_at?: string | null
          technique?: string | null
          validated_at?: string | null
          validated_by?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          ai_impression_suggestion?: string | null
          comparison_note?: string | null
          created_at?: string | null
          critical_finding?: string | null
          findings?: string | null
          hospital_id?: string
          id?: string
          impression?: string | null
          is_ai_used?: boolean | null
          is_critical?: boolean | null
          is_signed?: boolean | null
          order_id?: string
          patient_id?: string
          radiologist_id?: string | null
          recommendations?: string | null
          reported_at?: string | null
          technique?: string | null
          validated_at?: string | null
          validated_by?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "radiology_reports_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "radiology_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_reports_radiologist_id_fkey"
            columns: ["radiologist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_reports_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      record_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          documents_provided: string[] | null
          documents_requested: string[] | null
          fulfilled_at: string | null
          hospital_id: string
          id: string
          patient_id: string
          purpose: string
          record_id: string | null
          rejection_reason: string | null
          requester_contact: string | null
          requester_name: string
          requester_type: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          documents_provided?: string[] | null
          documents_requested?: string[] | null
          fulfilled_at?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          purpose: string
          record_id?: string | null
          rejection_reason?: string | null
          requester_contact?: string | null
          requester_name: string
          requester_type: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          documents_provided?: string[] | null
          documents_requested?: string[] | null
          fulfilled_at?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          purpose?: string
          record_id?: string | null
          rejection_reason?: string | null
          requester_contact?: string | null
          requester_name?: string
          requester_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "record_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_requests_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_schedules: {
        Row: {
          created_at: string | null
          destruction_authorized_by: string | null
          destruction_date: string | null
          hospital_id: string
          id: string
          is_destroyed: boolean | null
          patient_id: string
          record_date: string
          record_type: string
          retain_until: string
          retention_basis: string
        }
        Insert: {
          created_at?: string | null
          destruction_authorized_by?: string | null
          destruction_date?: string | null
          hospital_id: string
          id?: string
          is_destroyed?: boolean | null
          patient_id: string
          record_date: string
          record_type: string
          retain_until: string
          retention_basis: string
        }
        Update: {
          created_at?: string | null
          destruction_authorized_by?: string | null
          destruction_date?: string | null
          hospital_id?: string
          id?: string
          is_destroyed?: boolean | null
          patient_id?: string
          record_date?: string
          record_type?: string
          retain_until?: string
          retention_basis?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_schedules_destruction_authorized_by_fkey"
            columns: ["destruction_authorized_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_schedules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_schedules_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          is_system_role: boolean | null
          permissions: Json
          role_label: string
          role_name: string
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          is_system_role?: boolean | null
          permissions?: Json
          role_label: string
          role_name: string
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_system_role?: boolean | null
          permissions?: Json
          role_label?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_hospital_id_fkey"
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
          gst_percent: number | null
          hospital_id: string
          hsn_code: string | null
          id: string
          is_active: boolean
          item_type: string | null
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          fee?: number
          follow_up_fee?: number | null
          gst_applicable?: boolean
          gst_percent?: number | null
          hospital_id: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          item_type?: string | null
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          fee?: number
          follow_up_fee?: number | null
          gst_applicable?: boolean
          gst_percent?: number | null
          hospital_id?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          item_type?: string | null
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
      set_issues: {
        Row: {
          damaged_count: number | null
          hospital_id: string
          id: string
          instruments_issued_count: number
          instruments_returned_count: number | null
          issued_at: string | null
          issued_by: string
          loss_count: number | null
          loss_reason: string | null
          ot_schedule_id: string | null
          patient_uhid: string | null
          return_status: string | null
          returned_at: string | null
          returned_by: string | null
          set_id: string
        }
        Insert: {
          damaged_count?: number | null
          hospital_id: string
          id?: string
          instruments_issued_count: number
          instruments_returned_count?: number | null
          issued_at?: string | null
          issued_by: string
          loss_count?: number | null
          loss_reason?: string | null
          ot_schedule_id?: string | null
          patient_uhid?: string | null
          return_status?: string | null
          returned_at?: string | null
          returned_by?: string | null
          set_id: string
        }
        Update: {
          damaged_count?: number | null
          hospital_id?: string
          id?: string
          instruments_issued_count?: number
          instruments_returned_count?: number | null
          issued_at?: string | null
          issued_by?: string
          loss_count?: number | null
          loss_reason?: string | null
          ot_schedule_id?: string | null
          patient_uhid?: string | null
          return_status?: string | null
          returned_at?: string | null
          returned_by?: string | null
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_issues_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_issues_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_issues_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_issues_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "instrument_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_master: {
        Row: {
          color_code: string | null
          created_at: string | null
          duration_hours: number | null
          end_time: string
          hospital_id: string
          id: string
          is_active: boolean | null
          shift_code: string
          shift_name: string
          shift_type: string | null
          start_time: string
        }
        Insert: {
          color_code?: string | null
          created_at?: string | null
          duration_hours?: number | null
          end_time: string
          hospital_id: string
          id?: string
          is_active?: boolean | null
          shift_code: string
          shift_name: string
          shift_type?: string | null
          start_time: string
        }
        Update: {
          color_code?: string | null
          created_at?: string | null
          duration_hours?: number | null
          end_time?: string
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          shift_code?: string
          shift_name?: string
          shift_type?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_master_hospital_id_fkey"
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
          hours_worked: number | null
          id: string
          in_time: string | null
          marked_by: string | null
          notes: string | null
          out_time: string | null
          overtime_hours: number | null
          source: string | null
          status: string
          user_id: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          hospital_id: string
          hours_worked?: number | null
          id?: string
          in_time?: string | null
          marked_by?: string | null
          notes?: string | null
          out_time?: string | null
          overtime_hours?: number | null
          source?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          hospital_id?: string
          hours_worked?: number | null
          id?: string
          in_time?: string | null
          marked_by?: string | null
          notes?: string | null
          out_time?: string | null
          overtime_hours?: number | null
          source?: string | null
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
            foreignKeyName: "staff_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      staff_profiles: {
        Row: {
          basic_salary: number | null
          conveyance: number | null
          created_at: string | null
          da_percent: number | null
          department_id: string | null
          designation: string | null
          employee_id: string | null
          employment_type: string | null
          esic_applicable: boolean | null
          hospital_id: string
          hra_percent: number | null
          id: string
          is_active: boolean | null
          license_expiry_date: string | null
          medical_allowance: number | null
          pf_applicable: boolean | null
          registration_body: string | null
          registration_number: string | null
          user_id: string
        }
        Insert: {
          basic_salary?: number | null
          conveyance?: number | null
          created_at?: string | null
          da_percent?: number | null
          department_id?: string | null
          designation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          esic_applicable?: boolean | null
          hospital_id: string
          hra_percent?: number | null
          id?: string
          is_active?: boolean | null
          license_expiry_date?: string | null
          medical_allowance?: number | null
          pf_applicable?: boolean | null
          registration_body?: string | null
          registration_number?: string | null
          user_id: string
        }
        Update: {
          basic_salary?: number | null
          conveyance?: number | null
          created_at?: string | null
          da_percent?: number | null
          department_id?: string | null
          designation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          esic_applicable?: boolean | null
          hospital_id?: string
          hra_percent?: number | null
          id?: string
          is_active?: boolean | null
          license_expiry_date?: string | null
          medical_allowance?: number | null
          pf_applicable?: boolean | null
          registration_body?: string | null
          registration_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sterilization_cycles: {
        Row: {
          autoclave_id: string
          bi_read_by: string | null
          bi_result: string | null
          bi_result_at: string | null
          biological_indicator_used: boolean | null
          chemical_indicator_result: string | null
          created_at: string | null
          cycle_end_at: string | null
          cycle_number: string
          cycle_start_at: string
          duration_minutes: number | null
          flash_approved_by: string | null
          flash_justification: string | null
          hospital_id: string
          id: string
          load_type: string
          notes: string | null
          operator_id: string | null
          pressure_psi: number | null
          status: string | null
          sterilization_method: string | null
          temperature_c: number | null
        }
        Insert: {
          autoclave_id: string
          bi_read_by?: string | null
          bi_result?: string | null
          bi_result_at?: string | null
          biological_indicator_used?: boolean | null
          chemical_indicator_result?: string | null
          created_at?: string | null
          cycle_end_at?: string | null
          cycle_number: string
          cycle_start_at: string
          duration_minutes?: number | null
          flash_approved_by?: string | null
          flash_justification?: string | null
          hospital_id: string
          id?: string
          load_type: string
          notes?: string | null
          operator_id?: string | null
          pressure_psi?: number | null
          status?: string | null
          sterilization_method?: string | null
          temperature_c?: number | null
        }
        Update: {
          autoclave_id?: string
          bi_read_by?: string | null
          bi_result?: string | null
          bi_result_at?: string | null
          biological_indicator_used?: boolean | null
          chemical_indicator_result?: string | null
          created_at?: string | null
          cycle_end_at?: string | null
          cycle_number?: string
          cycle_start_at?: string
          duration_minutes?: number | null
          flash_approved_by?: string | null
          flash_justification?: string | null
          hospital_id?: string
          id?: string
          load_type?: string
          notes?: string | null
          operator_id?: string | null
          pressure_psi?: number | null
          status?: string | null
          sterilization_method?: string | null
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sterilization_cycles_bi_read_by_fkey"
            columns: ["bi_read_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sterilization_cycles_flash_approved_by_fkey"
            columns: ["flash_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sterilization_cycles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sterilization_cycles_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          hospital_id: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          unit_rate: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          hospital_id: string
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          unit_rate?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          hospital_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          unit_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          key: string
          value?: Json
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          key?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      teleconsult_sessions: {
        Row: {
          actual_duration: number | null
          bill_generated: boolean | null
          created_at: string | null
          doctor_id: string
          doctor_joined_at: string | null
          duration_minutes: number | null
          encounter_id: string | null
          ended_at: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          patient_joined_at: string | null
          patient_phone: string | null
          prescription_sent: boolean | null
          room_id: string
          scheduled_at: string
          status: string
        }
        Insert: {
          actual_duration?: number | null
          bill_generated?: boolean | null
          created_at?: string | null
          doctor_id: string
          doctor_joined_at?: string | null
          duration_minutes?: number | null
          encounter_id?: string | null
          ended_at?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          patient_joined_at?: string | null
          patient_phone?: string | null
          prescription_sent?: boolean | null
          room_id: string
          scheduled_at: string
          status?: string
        }
        Update: {
          actual_duration?: number | null
          bill_generated?: boolean | null
          created_at?: string | null
          doctor_id?: string
          doctor_joined_at?: string | null
          duration_minutes?: number | null
          encounter_id?: string | null
          ended_at?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          patient_joined_at?: string | null
          patient_phone?: string | null
          prescription_sent?: boolean | null
          room_id?: string
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teleconsult_sessions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teleconsult_sessions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "opd_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teleconsult_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teleconsult_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      toxicity_events: {
        Row: {
          created_at: string | null
          ctcae_grade: number
          cycle_number: number
          description: string | null
          dose_modification_type: string | null
          dose_modified: boolean | null
          hospital_id: string
          hospitalised: boolean | null
          id: string
          onset_date: string
          order_id: string
          patient_id: string
          reported_by: string | null
          resolved: boolean | null
          resolved_date: string | null
          toxicity_type: string
        }
        Insert: {
          created_at?: string | null
          ctcae_grade: number
          cycle_number: number
          description?: string | null
          dose_modification_type?: string | null
          dose_modified?: boolean | null
          hospital_id: string
          hospitalised?: boolean | null
          id?: string
          onset_date: string
          order_id: string
          patient_id: string
          reported_by?: string | null
          resolved?: boolean | null
          resolved_date?: string | null
          toxicity_type: string
        }
        Update: {
          created_at?: string | null
          ctcae_grade?: number
          cycle_number?: number
          description?: string | null
          dose_modification_type?: string | null
          dose_modified?: boolean | null
          hospital_id?: string
          hospitalised?: boolean | null
          id?: string
          onset_date?: string
          order_id?: string
          patient_id?: string
          reported_by?: string | null
          resolved?: boolean | null
          resolved_date?: string | null
          toxicity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "toxicity_events_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toxicity_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "chemo_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toxicity_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toxicity_events_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tpa_config: {
        Row: {
          claims_email: string | null
          coordinator_name: string | null
          coordinator_phone: string | null
          created_at: string | null
          credit_days: number | null
          hospital_id: string
          id: string
          is_active: boolean | null
          required_documents: string[] | null
          submission_method: string | null
          tpa_code: string | null
          tpa_name: string
        }
        Insert: {
          claims_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string | null
          credit_days?: number | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          required_documents?: string[] | null
          submission_method?: string | null
          tpa_code?: string | null
          tpa_name: string
        }
        Update: {
          claims_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string | null
          credit_days?: number | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          required_documents?: string[] | null
          submission_method?: string | null
          tpa_code?: string | null
          tpa_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpa_config_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          branch_id: string | null
          can_login: boolean | null
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
          auth_user_id?: string | null
          branch_id?: string | null
          can_login?: boolean | null
          created_at?: string
          department_id?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          hospital_id: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          registration_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          auth_user_id?: string | null
          branch_id?: string | null
          can_login?: boolean | null
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
      vendors: {
        Row: {
          address: string | null
          category: string[] | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          credit_days: number | null
          gstin: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          performance_score: number | null
          vendor_code: string | null
          vendor_name: string
        }
        Insert: {
          address?: string | null
          category?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_days?: number | null
          gstin?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          performance_score?: number | null
          vendor_code?: string | null
          vendor_name: string
        }
        Update: {
          address?: string | null
          category?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_days?: number | null
          gstin?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          performance_score?: number | null
          vendor_code?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      vial_wastage: {
        Row: {
          administered_dose_mg: number
          batch_number: string | null
          cost_per_mg: number | null
          created_at: string | null
          drug_name: string
          hospital_id: string
          id: string
          order_id: string
          ordered_dose_mg: number
          reason: string | null
          waste_cost: number | null
          wasted_dose_mg: number
        }
        Insert: {
          administered_dose_mg: number
          batch_number?: string | null
          cost_per_mg?: number | null
          created_at?: string | null
          drug_name: string
          hospital_id: string
          id?: string
          order_id: string
          ordered_dose_mg: number
          reason?: string | null
          waste_cost?: number | null
          wasted_dose_mg: number
        }
        Update: {
          administered_dose_mg?: number
          batch_number?: string | null
          cost_per_mg?: number | null
          created_at?: string | null
          drug_name?: string
          hospital_id?: string
          id?: string
          order_id?: string
          ordered_dose_mg?: number
          reason?: string | null
          waste_cost?: number | null
          wasted_dose_mg?: number
        }
        Relationships: [
          {
            foreignKeyName: "vial_wastage_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vial_wastage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "chemo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_round_notes: {
        Row: {
          admission_id: string
          assessment: string | null
          created_at: string | null
          doctor_id: string
          hospital_id: string
          id: string
          objective: string | null
          orders: Json | null
          patient_id: string
          plan: string | null
          round_date: string | null
          round_time: string | null
          subjective: string | null
          vitals_snapshot: Json | null
        }
        Insert: {
          admission_id: string
          assessment?: string | null
          created_at?: string | null
          doctor_id: string
          hospital_id: string
          id?: string
          objective?: string | null
          orders?: Json | null
          patient_id: string
          plan?: string | null
          round_date?: string | null
          round_time?: string | null
          subjective?: string | null
          vitals_snapshot?: Json | null
        }
        Update: {
          admission_id?: string
          assessment?: string | null
          created_at?: string | null
          doctor_id?: string
          hospital_id?: string
          id?: string
          objective?: string | null
          orders?: Json | null
          patient_id?: string
          plan?: string | null
          round_date?: string | null
          round_time?: string | null
          subjective?: string | null
          vitals_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_round_notes_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_notes_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      whatsapp_notifications: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          message_text: string
          notification_type: string
          opened: boolean | null
          patient_id: string
          phone_number: string
          sent_at: string | null
          whatsapp_url: string
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          message_text: string
          notification_type: string
          opened?: boolean | null
          patient_id: string
          phone_number: string
          sent_at?: string | null
          whatsapp_url: string
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          message_text?: string
          notification_type?: string
          opened?: boolean | null
          patient_id?: string
          phone_number?: string
          sent_at?: string | null
          whatsapp_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          auto_send: boolean | null
          created_at: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          message_template: string
          send_delay_hours: number | null
          template_name: string
          trigger_event: string
        }
        Insert: {
          auto_send?: boolean | null
          created_at?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          message_template: string
          send_delay_hours?: number | null
          template_name: string
          trigger_event: string
        }
        Update: {
          auto_send?: boolean | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          message_template?: string
          send_delay_hours?: number | null
          template_name?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_hospital_id_fkey"
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
      ensure_billing_posting_rules: {
        Args: { p_hospital_id: string }
        Returns: undefined
      }
      get_daily_revenue_30d: {
        Args: { p_hospital_id: string }
        Returns: {
          amount: number
          bill_date: string
        }[]
      }
      get_next_journal_number: {
        Args: { p_hospital_id: string }
        Returns: string
      }
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
