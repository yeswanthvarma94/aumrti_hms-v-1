import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useHospitalId } from "@/hooks/useHospitalId";
import { STALE_OPERATIONAL } from "@/hooks/queries/staleTimes";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, UserPlus, Eye, Users, EyeOff, Activity } from "lucide-react";
import PatientRegistrationModal from "@/components/patients/PatientRegistrationModal";
import PatientDetailDrawer from "@/components/patients/PatientDetailDrawer";
import PatientTimelineDrawer from "@/components/patients/PatientTimelineDrawer";

type Patient = {
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
  is_active?: boolean;
};

type FilterPeriod = "all" | "today" | "week" | "month";

const filterLabels: { key: FilterPeriod; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const PAGE_SIZE = 50;

function getAge(dob: string | null): string {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return `${years}y`;
}

const PatientsPage: React.FC = () => {
  const { toast } = useToast();
  const { hospitalId, loading: hidLoading } = useHospitalId();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<FilterPeriod>("all");
  const [showRegister, setShowRegister] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(0);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [debouncedSearch, filter, showInactive]);

  const queryKey = ["patients-list", hospitalId, debouncedSearch, filter, showInactive, page];

  const { data, isLoading: loading } = useQuery({
    queryKey,
    enabled: !!hospitalId,
    staleTime: STALE_OPERATIONAL,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("id, uhid, full_name, phone, gender, dob, blood_group, allergies, chronic_conditions, insurance_id, abha_id, address, emergency_contact_name, emergency_contact_phone, created_at, is_active", { count: "exact" })
        .eq("hospital_id", hospitalId as string)
        .order("created_at", { ascending: false });

      if (!showInactive) {
        query = query.neq("is_active", false);
      }

      if (debouncedSearch.trim()) {
        const trimmed = debouncedSearch.trim();
        if (/^\d{10,}$/.test(trimmed)) {
          query = query.eq("phone", trimmed);
        } else {
          const q = `%${trimmed}%`;
          query = query.or(`full_name.ilike.${q},phone.ilike.${q},uhid.ilike.${q}`);
        }
      }

      if (filter === "today") {
        query = query.gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      } else if (filter === "week") {
        const d = new Date(); d.setDate(d.getDate() - 7);
        query = query.gte("created_at", d.toISOString());
      } else if (filter === "month") {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        query = query.gte("created_at", d.toISOString());
      }

      const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) {
        toast({ title: "Error loading patients", description: error.message, variant: "destructive" });
        throw error;
      }
      return { rows: (data as Patient[]) || [], count: count ?? 0 };
    },
  });

  const patients = data?.rows || [];
  const totalCount = data?.count || 0;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["patients-list", hospitalId] });
  }, [queryClient, hospitalId]);

  // Deep-link: auto-open patient by ?id= param
  useEffect(() => {
    const patientId = searchParams.get("id");
    if (!patientId || !hospitalId) return;
    supabase.from("patients").select("*").eq("id", patientId).eq("hospital_id", hospitalId).maybeSingle()
      .then(({ data }) => {
        if (data) setSelectedPatient(data as Patient);
        setSearchParams({}, { replace: true });
      });
  }, [hospitalId]);

  const loadMore = () => setPage((p) => p + 1);

  if (hidLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!hospitalId) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between px-5 h-14 flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-primary" />
          <h1 className="text-base font-bold text-foreground">Patient Registry</h1>
          <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
        </div>
        <Button size="sm" onClick={() => setShowRegister(true)}>
          <UserPlus size={16} /> Register New Patient
        </Button>
      </div>

      <div className="flex items-center gap-3 px-5 h-12 flex-shrink-0 border-b border-border bg-card">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, phone, or UHID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <div className="flex gap-1.5">
          {filterLabels.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${showInactive ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          title={showInactive ? "Showing all patients including inactive" : "Click to show inactive patients"}
        >
          {showInactive ? <EyeOff size={12} /> : <Eye size={12} />}
          {showInactive ? "Showing Inactive" : "Show Inactive"}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">UHID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Age / Gender</TableHead>
              <TableHead className="w-[120px]">Phone</TableHead>
              <TableHead className="w-[90px]">Blood Group</TableHead>
              <TableHead className="w-[120px]">Registered</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && patients.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <Users size={40} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No patients found</p>
                  <Button variant="link" size="sm" onClick={() => setShowRegister(true)} className="mt-1">Register your first patient</Button>
                </TableCell>
              </TableRow>
            ) : (
              patients.map((p) => (
                <TableRow key={p.id} className={`cursor-pointer hover:bg-muted/50 ${p.is_active === false ? "opacity-50" : ""}`} onClick={() => setSelectedPatient(p)}>
                  <TableCell className="font-mono text-xs">{p.uhid}</TableCell>
                  <TableCell className="font-medium">
                    {p.full_name}
                    {p.is_active === false && <Badge variant="outline" className="ml-2 text-[9px] text-amber-600 border-amber-300">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getAge(p.dob)} {p.gender ? `/ ${p.gender.charAt(0).toUpperCase()}` : ""}</TableCell>
                  <TableCell className="text-sm">{p.phone || "—"}</TableCell>
                  <TableCell>
                    {p.blood_group ? <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">{p.blood_group}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details" onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); }}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="View Medical Timeline" onClick={(e) => { e.stopPropagation(); setTimelinePatient(p); }}>
                        <Activity size={14} className="text-primary" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && patients.length > 0 && (page + 1) * PAGE_SIZE < totalCount && (
          <div className="flex justify-center py-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={loadMore}>
              Load More ({(page + 1) * PAGE_SIZE} of {totalCount})
            </Button>
          </div>
        )}
      </div>

      {showRegister && <PatientRegistrationModal onClose={() => setShowRegister(false)} onSuccess={() => { setShowRegister(false); refresh(); }} />}
      {selectedPatient && (
        <PatientDetailDrawer
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdated={() => { setSelectedPatient(null); refresh(); }}
          onDeleted={() => { setSelectedPatient(null); refresh(); }}
        />
      )}
      {timelinePatient && (
        <PatientTimelineDrawer
          patient={timelinePatient}
          onClose={() => setTimelinePatient(null)}
        />
      )}
    </div>
  );
};

export default PatientsPage;
