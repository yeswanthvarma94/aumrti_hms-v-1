// xlsx is dynamically imported inside downloadXlsxTemplate() to keep it out of the eager bundle.

export type MigrationEntity = "patients" | "staff" | "services" | "drugs" | "vendors" | "lab_tests";

interface ColumnSpec {
  key: string;
  label: string;
  required: boolean;
  sample: string;
  instruction: string;
}

export const TEMPLATE_SPECS: Record<MigrationEntity, { label: string; columns: ColumnSpec[] }> = {
  patients: {
    label: "Patients",
    columns: [
      { key: "full_name", label: "full_name", required: true, sample: "Ramesh Kumar", instruction: "Required • Patient's full name (min 2 chars)" },
      { key: "phone", label: "phone", required: true, sample: "9876543210", instruction: "Required • 10-digit Indian mobile, no +91" },
      { key: "gender", label: "gender", required: true, sample: "male", instruction: "Required • male / female / other" },
      { key: "dob", label: "dob", required: false, sample: "15/03/1985", instruction: "Optional • Date of birth in DD/MM/YYYY" },
      { key: "blood_group", label: "blood_group", required: false, sample: "B+", instruction: "Optional • A+/A-/B+/B-/AB+/AB-/O+/O-" },
      { key: "address", label: "address", required: false, sample: "123 MG Road, Indore", instruction: "Optional • Full postal address" },
      { key: "uhid", label: "uhid", required: false, sample: "", instruction: "Optional • Old UHID/MRN. Leave blank to auto-generate" },
    ],
  },
  staff: {
    label: "Staff Members",
    columns: [
      { key: "full_name", label: "full_name", required: true, sample: "Dr. Priya Sharma", instruction: "Required • Staff member's full name" },
      { key: "phone", label: "phone", required: true, sample: "9876543210", instruction: "Required • 10-digit mobile" },
      { key: "role", label: "role", required: true, sample: "doctor", instruction: "Required • doctor/nurse/admin/pharmacist/lab_tech/receptionist" },
      { key: "email", label: "email", required: false, sample: "priya@hospital.com", instruction: "Optional • Login email" },
      { key: "department", label: "department", required: false, sample: "General Medicine", instruction: "Optional • Department name" },
      { key: "employee_id", label: "employee_id", required: false, sample: "EMP-001", instruction: "Optional • Employee code" },
      { key: "joining_date", label: "joining_date", required: false, sample: "01/04/2024", instruction: "Optional • DD/MM/YYYY" },
    ],
  },
  services: {
    label: "Service Rates",
    columns: [
      { key: "service_name", label: "service_name", required: true, sample: "General Consultation", instruction: "Required • Service / procedure name" },
      { key: "category", label: "category", required: true, sample: "consultation", instruction: "Required • consultation/lab/radiology/procedure/room/other" },
      { key: "rate", label: "rate", required: true, sample: "500", instruction: "Required • Rate in INR (positive number)" },
      { key: "gst_percent", label: "gst_percent", required: false, sample: "0", instruction: "Optional • 0 / 5 / 12 / 18" },
      { key: "hsn_code", label: "hsn_code", required: false, sample: "9993", instruction: "Optional • HSN/SAC code for GST" },
      { key: "description", label: "description", required: false, sample: "OPD doctor visit", instruction: "Optional • Short description" },
    ],
  },
  drugs: {
    label: "Drug Master",
    columns: [
      { key: "drug_name", label: "drug_name", required: true, sample: "Paracetamol 500mg", instruction: "Required • Brand name (duplicates skipped, not overwritten)" },
      { key: "generic_name", label: "generic_name", required: true, sample: "Paracetamol", instruction: "Required • Generic / salt name" },
      { key: "category", label: "category", required: true, sample: "tablet", instruction: "Required • tablet/capsule/syrup/injection/iv_fluid/ointment" },
      { key: "schedule", label: "schedule", required: false, sample: "H", instruction: "Optional • OTC / H / H1 / X / G" },
      { key: "is_ndps", label: "is_ndps", required: false, sample: "false", instruction: "Optional • true/false — NDPS controlled substance" },
      { key: "hsn_code", label: "hsn_code", required: false, sample: "3004", instruction: "Optional • HSN code" },
      { key: "gst_percent", label: "gst_percent", required: false, sample: "12", instruction: "Optional • 0 / 5 / 12 / 18" },
      { key: "reorder_level", label: "reorder_level", required: false, sample: "100", instruction: "Optional • Min stock level (positive number)" },
    ],
  },
  vendors: {
    label: "Vendors",
    columns: [
      { key: "vendor_name", label: "vendor_name", required: true, sample: "MedSupply India Pvt Ltd", instruction: "Required • Company / supplier name" },
      { key: "phone", label: "phone", required: true, sample: "9876543210", instruction: "Required • 10-digit mobile" },
      { key: "contact_person", label: "contact_person", required: false, sample: "Rajesh Gupta", instruction: "Optional • Primary contact name" },
      { key: "email", label: "email", required: false, sample: "rajesh@medsupply.in", instruction: "Optional • Contact email" },
      { key: "gst_number", label: "gst_number", required: false, sample: "29AABCU1234F1Z5", instruction: "Optional • 15-character GSTIN" },
      { key: "address", label: "address", required: false, sample: "Industrial Area, Pune", instruction: "Optional • Full address" },
    ],
  },
  lab_tests: {
    label: "Lab Tests",
    columns: [
      { key: "test_name", label: "test_name", required: true, sample: "Fasting Blood Sugar", instruction: "Required • Test name" },
      { key: "category", label: "category", required: true, sample: "Biochemistry", instruction: "Required • Biochemistry/Haematology/Microbiology/etc." },
      { key: "test_code", label: "test_code", required: false, sample: "FBS", instruction: "Optional • Short code" },
      { key: "sample_type", label: "sample_type", required: false, sample: "blood", instruction: "Optional • blood/urine/stool/sputum/csf/other" },
      { key: "unit", label: "unit", required: false, sample: "mg/dL", instruction: "Optional • Unit of measurement" },
      { key: "normal_range_low", label: "normal_range_low", required: false, sample: "70", instruction: "Optional • Lower bound of normal" },
      { key: "normal_range_high", label: "normal_range_high", required: false, sample: "100", instruction: "Optional • Upper bound of normal" },
      { key: "tat_hours", label: "tat_hours", required: false, sample: "4", instruction: "Optional • Turnaround time in hours" },
    ],
  },
};

/**
 * Generate a styled .xlsx template with header, sample row, and instructions row.
 * Required columns are highlighted yellow. Triggers browser download.
 */
export async function downloadXlsxTemplate(entity: MigrationEntity) {
  const XLSX = await import("xlsx");
  const spec = TEMPLATE_SPECS[entity];
  const headers = spec.columns.map((c) => c.label);
  const sample = spec.columns.map((c) => c.sample);
  const instructions = spec.columns.map((c) => c.instruction);

  const aoa: any[][] = [headers, sample, instructions];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Cell-level styling (xlsx open-source build supports basic styles via cell.s when read by Excel)
  spec.columns.forEach((col, idx) => {
    const headerAddr = XLSX.utils.encode_cell({ r: 0, c: idx });
    const sampleAddr = XLSX.utils.encode_cell({ r: 1, c: idx });
    const instrAddr = XLSX.utils.encode_cell({ r: 2, c: idx });
    if (ws[headerAddr]) {
      ws[headerAddr].s = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: col.required ? "FFF59E0B" : "FFE2E8F0" } },
        alignment: { horizontal: "center" },
      };
    }
    if (ws[sampleAddr]) {
      ws[sampleAddr].s = { font: { color: { rgb: "FF0E7B7B" }, italic: true } };
    }
    if (ws[instrAddr]) {
      ws[instrAddr].s = { font: { color: { rgb: "FF94A3B8" }, sz: 9 }, alignment: { wrapText: true } };
    }
  });

  // Column widths
  ws["!cols"] = spec.columns.map((c) => ({ wch: Math.max(c.label.length, c.sample.length, 18) + 4 }));
  ws["!rows"] = [{ hpt: 20 }, { hpt: 18 }, { hpt: 38 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, spec.label.slice(0, 31));

  // Add a README sheet
  const readme = XLSX.utils.aoa_to_sheet([
    [`${spec.label} Import Template`],
    [""],
    ["How to use:"],
    ["1. Row 1 = column headers — DO NOT change these names."],
    ["2. Row 2 = sample data — REPLACE with your real data."],
    ["3. Row 3 = instructions (grey) — DELETE this row before saving."],
    ["4. Yellow-highlighted columns are REQUIRED. Other columns are optional."],
    ["5. Save as .xlsx or .csv and upload via the Import Wizard."],
    [""],
    ["Date format: DD/MM/YYYY (e.g. 15/03/1985)"],
    ["Phone format: 10 digits, no +91 prefix (e.g. 9876543210)"],
    ["Currency: numbers only, no ₹ symbol (e.g. 500 not ₹500)"],
  ]);
  readme["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, readme, "README");

  XLSX.writeFile(wb, `${entity}_import_template.xlsx`);
}
