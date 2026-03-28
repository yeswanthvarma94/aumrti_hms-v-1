import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Phone, MapPin, Shield, Heart } from "lucide-react";
import ChronicDiseaseSection from "@/components/clinical/ChronicDiseaseSection";

interface Patient {
  id: string;
  uhid: string;
  full_name: string;
  phone: string | null;
  gender: string | null;
  dob: string | null;
  blood_group: string | null;
  allergies: string | null;
  chronic_conditions: string[] | null;
  insurance_id: string | null;
  abha_id: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
}

interface Visit {
  id: string;
  visit_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
}

interface Props {
  patient: Patient;
  onClose: () => void;
}

function getAge(dob: string | null): string {
  if (!dob) return "—";
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${years} years`;
}

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const PatientDetailDrawer: React.FC<Props> = ({ patient, onClose }) => {
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    supabase
      .from("opd_encounters")
      .select("id, visit_date, chief_complaint, diagnosis")
      .eq("patient_id", patient.id)
      .order("visit_date", { ascending: false })
      .limit(5)
      .then(({ data }) => setVisits((data as Visit[]) || []));
  }, [patient.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-card shadow-lg overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-start gap-4">
          <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
            {initials(patient.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{patient.full_name}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{patient.uhid}</Badge>
              <span className="text-xs text-muted-foreground">
                {getAge(patient.dob)} {patient.gender ? `· ${patient.gender}` : ""}
              </span>
              {patient.blood_group && (
                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                  {patient.blood_group}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* Contact */}
          <Section title="Contact">
            {patient.phone && (
              <Row icon={<Phone size={14} />}>
                <a href={`tel:${patient.phone}`} className="text-sm text-primary hover:underline">{patient.phone}</a>
              </Row>
            )}
            {patient.address && (
              <Row icon={<MapPin size={14} />}>
                <span className="text-sm text-foreground">{patient.address}</span>
              </Row>
            )}
            {!patient.phone && !patient.address && <Empty />}
          </Section>

          {/* Medical */}
          <Section title="Medical Info">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Allergies</label>
              {patient.allergies ? (
                <div className="flex flex-wrap gap-1">
                  {patient.allergies.split(",").map((a, i) => (
                    <Badge key={i} variant="destructive" className="text-[10px]">{a.trim()}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-success">No known allergies</p>
              )}
            </div>
            <div className="space-y-2 mt-3">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Chronic Conditions</label>
              {patient.chronic_conditions?.length ? (
                <div className="flex flex-wrap gap-1">
                  {patient.chronic_conditions.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None recorded</p>
              )}
            </div>
          </Section>

          {/* Insurance */}
          <Section title="Insurance / ID">
            <Row icon={<Shield size={14} />}>
              <span className="text-sm">{patient.insurance_id || "Self-pay"}</span>
            </Row>
            {patient.abha_id && (
              <Row icon={<Heart size={14} />}>
                <span className="text-sm">ABHA: {patient.abha_id}</span>
              </Row>
            )}
          </Section>

          {/* Emergency Contact */}
          {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
            <Section title="Emergency Contact">
              <p className="text-sm text-foreground">{patient.emergency_contact_name}</p>
              {patient.emergency_contact_phone && (
                <a href={`tel:${patient.emergency_contact_phone}`} className="text-sm text-primary hover:underline">
                  {patient.emergency_contact_phone}
                </a>
              )}
            </Section>
          )}

          {/* Chronic Disease Programs */}
          <ChronicDiseaseSection patientId={patient.id} hospitalId={hospitalId} />

          {/* Visit History */}
          <Section title="Recent OPD Visits">
            {visits.length === 0 ? (
              <p className="text-xs text-muted-foreground">No previous visits</p>
            ) : (
              <div className="space-y-2">
                {visits.map((v) => (
                  <div key={v.id} className="bg-muted rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-foreground">
                        {new Date(v.visit_date!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {v.chief_complaint && <p className="text-xs text-muted-foreground mt-1">{v.chief_complaint}</p>}
                    {v.diagnosis && (
                      <Badge variant="outline" className="text-[10px] mt-1">{v.diagnosis}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
    {children}
  </div>
);

const Row: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-2 text-muted-foreground">{icon}{children}</div>
);

const Empty = () => <p className="text-xs text-muted-foreground">No details available</p>;

export default PatientDetailDrawer;
