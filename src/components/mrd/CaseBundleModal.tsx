import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertTriangle, FileDown, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BundleDoc {
  label: string;
  key: string;
  available: boolean;
  count?: number;
  checked: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  record: any; // medical_records row with patients join
  hospitalId: string;
}

const CaseBundleModal: React.FC<Props> = ({ open, onClose, record, hospitalId }) => {
  const [docs, setDocs] = useState<BundleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [admissionData, setAdmissionData] = useState<any>(null);

  useEffect(() => {
    if (open && record) fetchBundleData();
  }, [open, record]);

  const fetchBundleData = async () => {
    setLoading(true);
    const patientId = record.patient_id;
    const visitId = record.visit_id;

    // Fetch admission
    let admission = null;
    if (visitId) {
      const { data } = await (supabase as any).from("admissions")
        .select("*, patients(full_name, uhid)")
        .eq("id", visitId).single();
      admission = data;
    }
    if (!admission && patientId) {
      const { data } = await (supabase as any).from("admissions")
        .select("*, patients(full_name, uhid)")
        .eq("patient_id", patientId)
        .eq("hospital_id", hospitalId)
        .order("admitted_at", { ascending: false })
        .limit(1).single();
      admission = data;
    }
    setAdmissionData(admission);

    // Count documents
    const admissionId = admission?.id;

    const [labRes, radRes, billRes, icdRes] = await Promise.all([
      admissionId
        ? (supabase as any).from("lab_orders").select("*", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("patient_id", patientId)
        : Promise.resolve({ count: 0 }),
      (supabase as any).from("radiology_orders").select("*", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("patient_id", patientId),
      admissionId
        ? (supabase as any).from("bills").select("*", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("patient_id", patientId)
        : Promise.resolve({ count: 0 }),
      (supabase as any).from("icd_codings").select("*", { count: "exact", head: true }).eq("hospital_id", hospitalId).eq("visit_id", visitId || "none"),
    ]);

    const bundleDocs: BundleDoc[] = [
      { label: "Admission Note", key: "admission", available: !!admission, checked: true },
      { label: "Discharge Summary", key: "discharge", available: !!admission?.discharged_at, checked: true },
      { label: `Lab Reports (${labRes.count || 0})`, key: "lab", available: (labRes.count || 0) > 0, count: labRes.count || 0, checked: true },
      { label: `Radiology Reports (${radRes.count || 0})`, key: "radiology", available: (radRes.count || 0) > 0, count: radRes.count || 0, checked: true },
      { label: "Operation Notes", key: "ot", available: false, checked: true },
      { label: "Nursing Notes Summary", key: "nursing", available: false, checked: true },
      { label: `Final Bill Summary (${billRes.count || 0})`, key: "bill", available: (billRes.count || 0) > 0, count: billRes.count || 0, checked: true },
      { label: "Pre-Auth Approval Letter", key: "preauth", available: admission?.insurance_type !== "self", checked: true },
      { label: `ICD Coding Sheet (${icdRes.count || 0})`, key: "icd", available: (icdRes.count || 0) > 0, count: icdRes.count || 0, checked: true },
    ];

    setDocs(bundleDocs);
    setLoading(false);
  };

  const toggleDoc = (key: string) => {
    setDocs((prev) => prev.map((d) => d.key === key ? { ...d, checked: !d.checked } : d));
  };

  const generateBundlePDF = async () => {
    setGenerating(true);
    // Build a printable HTML window with cover sheet
    const checkedDocs = docs.filter((d) => d.checked && d.available);
    const patientName = record.patients?.full_name || "Patient";
    const uhid = record.patients?.uhid || "";

    const coverHTML = `
      <html>
      <head><title>Insurance Audit Bundle — ${patientName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-size: 20px; border-bottom: 2px solid #1A2F5A; padding-bottom: 8px; }
        .meta { margin: 16px 0; font-size: 13px; }
        .meta span { display: inline-block; margin-right: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; }
        .status-available { color: #16a34a; } .status-missing { color: #d97706; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>
        <h1>📋 Insurance Audit Bundle</h1>
        <div class="meta">
          <span><b>Patient:</b> ${patientName}</span>
          <span><b>UHID:</b> ${uhid}</span>
          ${admissionData ? `<span><b>Admitted:</b> ${new Date(admissionData.admitted_at).toLocaleDateString("en-IN")}</span>` : ""}
          ${admissionData?.discharged_at ? `<span><b>Discharged:</b> ${new Date(admissionData.discharged_at).toLocaleDateString("en-IN")}</span>` : ""}
        </div>
        <h2 style="font-size:14px; margin-top:24px;">Document Checklist</h2>
        <table>
          <tr><th>#</th><th>Document</th><th>Status</th></tr>
          ${docs.map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.label}</td>
              <td class="${d.available ? "status-available" : "status-missing"}">${d.available ? "✓ Available" : "⚠ Not Available"}</td>
            </tr>
          `).join("")}
        </table>
        <p style="margin-top:24px; font-size:11px; color:#666;">
          Generated on ${new Date().toLocaleString("en-IN")} | Hospital ID: ${hospitalId}
        </p>
      </body></html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(coverHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }

    setGenerating(false);
    toast.success("Bundle cover sheet generated — use print to save as PDF");
  };

  const sendWhatsApp = () => {
    const patientName = record.patients?.full_name || "Patient";
    const message = encodeURIComponent(
      `Insurance Audit Bundle for ${patientName} (${record.patients?.uhid || ""}) is ready for download. Please contact the MRD department for access.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Insurance Audit Bundle
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {record?.patients?.full_name} — {record?.patients?.uhid}
            {admissionData && (
              <span className="ml-2">
                | Admission: {admissionData.admitted_at ? new Date(admissionData.admitted_at).toLocaleDateString("en-IN") : "—"}
                → {admissionData.discharged_at ? new Date(admissionData.discharged_at).toLocaleDateString("en-IN") : "Active"}
              </span>
            )}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Checklist</div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.key} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50">
                    <Checkbox checked={doc.checked} onCheckedChange={() => toggleDoc(doc.key)} disabled={!doc.available} />
                    <span className="flex-1 text-sm">{doc.label}</span>
                    {doc.available ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-600" /> {docs.filter((d) => d.available).length} available
              <span className="mx-1">|</span>
              <AlertTriangle className="h-3 w-3 text-amber-500" /> {docs.filter((d) => !d.available).length} not available
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" onClick={generateBundlePDF} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileDown className="h-4 w-4 mr-1" />}
                Generate Bundle PDF
              </Button>
              <Button size="sm" variant="outline" onClick={sendWhatsApp}>
                <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp Bundle Link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CaseBundleModal;
