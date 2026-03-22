import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get hospital id
  const { data: hospital } = await supabase.from("hospitals").select("id").limit(1).single();
  if (!hospital) return new Response(JSON.stringify({ error: "No hospital" }), { status: 400, headers: corsHeaders });
  const hid = hospital.id;

  // Check if already seeded
  const { count } = await supabase.from("lab_test_master").select("id", { count: "exact", head: true }).eq("hospital_id", hid);
  if (count && count > 0) {
    return new Response(JSON.stringify({ message: "Already seeded", count }), { headers: corsHeaders });
  }

  const tests = [
    { test_name: "Haemoglobin", test_code: "HGB", category: "haematology", sample_type: "blood", unit: "g/dL", normal_min: 11.5, normal_max: 17.5, critical_low: 7.0, critical_high: 20.0, tat_minutes: 60 },
    { test_name: "Total WBC Count", test_code: "WBC", category: "haematology", sample_type: "blood", unit: "cells/µL", normal_min: 4000, normal_max: 11000, critical_low: 2000, critical_high: 30000, tat_minutes: 60 },
    { test_name: "Platelet Count", test_code: "PLT", category: "haematology", sample_type: "blood", unit: "cells/µL", normal_min: 150000, normal_max: 400000, critical_low: 50000, critical_high: 1000000, tat_minutes: 60 },
    { test_name: "PCV / Haematocrit", test_code: "HCT", category: "haematology", sample_type: "blood", unit: "%", normal_min: 36, normal_max: 52, critical_low: 20, critical_high: 60, tat_minutes: 60 },
    { test_name: "MCV", test_code: "MCV", category: "haematology", sample_type: "blood", unit: "fL", normal_min: 80, normal_max: 100, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "MCH", test_code: "MCH", category: "haematology", sample_type: "blood", unit: "pg", normal_min: 27, normal_max: 33, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "MCHC", test_code: "MCHC", category: "haematology", sample_type: "blood", unit: "g/dL", normal_min: 31.5, normal_max: 36, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "ESR (1 hr)", test_code: "ESR", category: "haematology", sample_type: "blood", unit: "mm/hr", normal_min: 0, normal_max: 20, critical_low: null, critical_high: null, tat_minutes: 90 },
    { test_name: "Peripheral Smear", test_code: "PBS", category: "haematology", sample_type: "blood", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Blood Glucose Fasting", test_code: "FBS", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 70, normal_max: 100, critical_low: 40, critical_high: 500, tat_minutes: 60 },
    { test_name: "Blood Glucose PP", test_code: "PPBS", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 70, normal_max: 140, critical_low: 40, critical_high: 600, tat_minutes: 60 },
    { test_name: "HbA1c", test_code: "HBA1C", category: "biochemistry", sample_type: "blood", unit: "%", normal_min: 4.0, normal_max: 5.7, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Serum Urea", test_code: "UREA", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 10, normal_max: 45, critical_low: null, critical_high: 200, tat_minutes: 60 },
    { test_name: "Serum Creatinine", test_code: "CREAT", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 0.6, normal_max: 1.2, critical_low: null, critical_high: 10, tat_minutes: 60 },
    { test_name: "Serum Sodium", test_code: "NA", category: "biochemistry", sample_type: "blood", unit: "mEq/L", normal_min: 136, normal_max: 145, critical_low: 120, critical_high: 160, tat_minutes: 60 },
    { test_name: "Serum Potassium", test_code: "K", category: "biochemistry", sample_type: "blood", unit: "mEq/L", normal_min: 3.5, normal_max: 5.0, critical_low: 2.5, critical_high: 6.5, tat_minutes: 60 },
    { test_name: "Serum Chloride", test_code: "CL", category: "biochemistry", sample_type: "blood", unit: "mEq/L", normal_min: 98, normal_max: 107, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Total Bilirubin", test_code: "TBIL", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 0.2, normal_max: 1.2, critical_low: null, critical_high: 20, tat_minutes: 60 },
    { test_name: "Direct Bilirubin", test_code: "DBIL", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 0.0, normal_max: 0.3, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "SGOT / AST", test_code: "AST", category: "biochemistry", sample_type: "blood", unit: "U/L", normal_min: 10, normal_max: 40, critical_low: null, critical_high: 1000, tat_minutes: 60 },
    { test_name: "SGPT / ALT", test_code: "ALT", category: "biochemistry", sample_type: "blood", unit: "U/L", normal_min: 7, normal_max: 56, critical_low: null, critical_high: 1000, tat_minutes: 60 },
    { test_name: "Alkaline Phosphatase", test_code: "ALP", category: "biochemistry", sample_type: "blood", unit: "U/L", normal_min: 44, normal_max: 147, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Total Protein", test_code: "TP", category: "biochemistry", sample_type: "blood", unit: "g/dL", normal_min: 6.3, normal_max: 8.2, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Serum Albumin", test_code: "ALB", category: "biochemistry", sample_type: "blood", unit: "g/dL", normal_min: 3.5, normal_max: 5.0, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Total Cholesterol", test_code: "CHOL", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: null, normal_max: 200, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Triglycerides", test_code: "TG", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: null, normal_max: 150, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "HDL Cholesterol", test_code: "HDL", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 40, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "LDL Cholesterol", test_code: "LDL", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: null, normal_max: 100, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Serum Uric Acid", test_code: "UA", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 3.5, normal_max: 7.2, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Serum Calcium", test_code: "CA", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 8.5, normal_max: 10.5, critical_low: 6.5, critical_high: 13.5, tat_minutes: 60 },
    { test_name: "Serum Phosphorus", test_code: "PHOS", category: "biochemistry", sample_type: "blood", unit: "mg/dL", normal_min: 2.5, normal_max: 4.5, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "TSH", test_code: "TSH", category: "hormones", sample_type: "blood", unit: "µIU/mL", normal_min: 0.4, normal_max: 4.0, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "T3 (Total)", test_code: "T3", category: "hormones", sample_type: "blood", unit: "ng/dL", normal_min: 80, normal_max: 200, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "T4 (Total)", test_code: "T4", category: "hormones", sample_type: "blood", unit: "µg/dL", normal_min: 5.0, normal_max: 12.0, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Free T3", test_code: "FT3", category: "hormones", sample_type: "blood", unit: "pg/mL", normal_min: 2.3, normal_max: 4.2, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Free T4", test_code: "FT4", category: "hormones", sample_type: "blood", unit: "ng/dL", normal_min: 0.8, normal_max: 1.8, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "PT / INR", test_code: "PT", category: "coagulation", sample_type: "blood", unit: "INR", normal_min: 0.8, normal_max: 1.2, critical_low: null, critical_high: 5.0, tat_minutes: 60 },
    { test_name: "aPTT", test_code: "APTT", category: "coagulation", sample_type: "blood", unit: "seconds", normal_min: 25, normal_max: 35, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Fibrinogen", test_code: "FIB", category: "coagulation", sample_type: "blood", unit: "mg/dL", normal_min: 200, normal_max: 400, critical_low: null, critical_high: null, tat_minutes: 90 },
    { test_name: "Dengue NS1 Antigen", test_code: "DENG", category: "serology", sample_type: "blood", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Malaria Antigen Test", test_code: "MAL", category: "serology", sample_type: "blood", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Typhidot (IgM)", test_code: "TYPH", category: "serology", sample_type: "blood", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Widal Test", test_code: "WID", category: "serology", sample_type: "blood", unit: "titres", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "CRP (Quantitative)", test_code: "CRP", category: "serology", sample_type: "blood", unit: "mg/L", normal_min: null, normal_max: 5, critical_low: null, critical_high: null, tat_minutes: 90 },
    { test_name: "RA Factor", test_code: "RAF", category: "serology", sample_type: "blood", unit: "IU/mL", normal_min: null, normal_max: 14, critical_low: null, critical_high: null, tat_minutes: 120 },
    { test_name: "Urine Routine & Microscopy", test_code: "URM", category: "urine_analysis", sample_type: "urine", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 60 },
    { test_name: "Urine Pregnancy Test", test_code: "UPT", category: "urine_analysis", sample_type: "urine", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 30 },
    { test_name: "Urine Culture & Sensitivity", test_code: "UCS", category: "microbiology", sample_type: "urine", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 2880 },
    { test_name: "Blood Culture & Sensitivity", test_code: "BCS", category: "microbiology", sample_type: "blood", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 2880 },
    { test_name: "Sputum AFB Smear", test_code: "AFB", category: "microbiology", sample_type: "sputum", unit: "report", normal_min: null, normal_max: null, critical_low: null, critical_high: null, tat_minutes: 240 },
  ];

  const rows = tests.map(t => ({ ...t, hospital_id: hid }));
  const { error } = await supabase.from("lab_test_master").insert(rows);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ message: "Seeded", count: rows.length }), { headers: corsHeaders });
});
