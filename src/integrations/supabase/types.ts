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
      drug_master: {
        Row: {
          category: string | null
          dosage_forms: string[] | null
          drug_name: string
          generic_name: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          is_ndps: boolean | null
          routes: string[] | null
          standard_doses: string[] | null
        }
        Insert: {
          category?: string | null
          dosage_forms?: string[] | null
          drug_name: string
          generic_name?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          is_ndps?: boolean | null
          routes?: string[] | null
          standard_doses?: string[] | null
        }
        Update: {
          category?: string | null
          dosage_forms?: string[] | null
          drug_name?: string
          generic_name?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          is_ndps?: boolean | null
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
          phone: string | null
          uhid: string
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
          phone?: string | null
          uhid: string
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
