// ============================================================================
// useDashboardData — TanStack Query edition
// ----------------------------------------------------------------------------
// • Cached: revisits within `staleTime` cost zero network calls.
// • Realtime patches the cache locally (no full 9-query refetch per row event).
// • Channel lifetime is bound to hospitalId only — no re-subscribe on loading.
// • hospitalId comes free from BranchContext via useHospitalId (no extra query).
// ============================================================================

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useHospitalId } from '@/hooks/useHospitalId';

export interface DashboardKPIs {
  totalPatients: number;
  patientsToday: number;
  bedsOccupied: number;
  bedsTotal: number;
  opdActive: number;
  opdWaiting: number;
  opdSeen: number;
  revenueMTD: number;
  revenueLastMonth: number;
  doctorsOnDuty: number;
  doctorsOnLeave: number;
  criticalAlerts: number;
}

const EMPTY: DashboardKPIs = {
  totalPatients: 0, patientsToday: 0,
  bedsOccupied: 0, bedsTotal: 0,
  opdActive: 0, opdWaiting: 0, opdSeen: 0,
  revenueMTD: 0, revenueLastMonth: 0,
  doctorsOnDuty: 0, doctorsOnLeave: 0,
  criticalAlerts: 0,
};

async function fetchDashboardKPIs(hospitalId: string): Promise<DashboardKPIs> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const results = await Promise.allSettled([
    supabase.from('patients').select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId),
    supabase.from('patients').select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .gte('created_at', today + 'T00:00:00')
      .lt('created_at', today + 'T23:59:59.999Z'),
    supabase.from('beds').select('status').eq('hospital_id', hospitalId),
    supabase.from('opd_visits').select('status').eq('hospital_id', hospitalId).eq('visit_date', today),
    supabase.from('bills').select('paid_amount').eq('hospital_id', hospitalId).gte('bill_date', monthStart),
    supabase.from('bills').select('paid_amount').eq('hospital_id', hospitalId)
      .gte('bill_date', lastMonth.toISOString().split('T')[0])
      .lte('bill_date', lastMonthEnd.toISOString().split('T')[0]),
    supabase.from('users').select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId).eq('role', 'doctor').eq('is_active', true),
    supabase.from('staff_attendance').select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId).eq('attendance_date', today).eq('status', 'leave'),
    supabase.from('clinical_alerts').select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId).eq('is_acknowledged', false),
  ]);

  const pick = <T,>(i: number, fallback: T): T => {
    const r = results[i];
    if (r.status === 'fulfilled') return r.value as unknown as T;
    console.warn(`Dashboard query ${i} failed:`, (r as PromiseRejectedResult).reason);
    return fallback;
  };

  const totalPatientsRes = pick<any>(0, { count: 0 });
  const patientsTodayRes = pick<any>(1, { count: 0 });
  const bedsRes          = pick<any>(2, { data: [] });
  const opdRes           = pick<any>(3, { data: [] });
  const billsMTDRes      = pick<any>(4, { data: [] });
  const billsLastRes     = pick<any>(5, { data: [] });
  const totalDoctorsRes  = pick<any>(6, { count: 0 });
  const onLeaveRes       = pick<any>(7, { count: 0 });
  const alertsRes        = pick<any>(8, { count: 0 });

  const bedsData = bedsRes.data || [];
  const opdData = (opdRes.data || []).filter((v: any) => v.status !== 'cancelled');

  return {
    totalPatients: totalPatientsRes.count || 0,
    patientsToday: patientsTodayRes.count || 0,
    bedsOccupied: bedsData.filter((b: any) => b.status === 'occupied').length,
    bedsTotal: bedsData.length,
    opdActive: opdData.length,
    opdWaiting: opdData.filter((v: any) => v.status === 'waiting').length,
    opdSeen: opdData.filter((v: any) => v.status === 'completed').length,
    revenueMTD: (billsMTDRes.data || []).reduce((s: number, b: any) => s + Number(b.paid_amount), 0),
    revenueLastMonth: (billsLastRes.data || []).reduce((s: number, b: any) => s + Number(b.paid_amount), 0),
    doctorsOnDuty: Math.max(0, (totalDoctorsRes.count || 0) - (onLeaveRes.count || 0)),
    doctorsOnLeave: onLeaveRes.count || 0,
    criticalAlerts: alertsRes.count || 0,
  };
}

export function useDashboardData() {
  const { hospitalId } = useHospitalId();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['dashboard-kpis', hospitalId],
    queryFn: () => fetchDashboardKPIs(hospitalId!),
    enabled: !!hospitalId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Realtime: patch cache locally; only invalidate when derivation is too complex.
  useEffect(() => {
    if (!hospitalId) return;

    const channel = supabase.channel(`dashboard-realtime-${hospitalId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'beds', filter: `hospital_id=eq.${hospitalId}` },
        (payload: any) => {
          qc.setQueryData<DashboardKPIs>(['dashboard-kpis', hospitalId], (prev) => {
            if (!prev) return prev;
            const oldStatus = (payload.old as any)?.status;
            const newStatus = (payload.new as any)?.status;
            let occupiedDelta = 0;
            if (payload.eventType === 'INSERT') {
              if (newStatus === 'occupied') occupiedDelta = 1;
            } else if (payload.eventType === 'DELETE') {
              if (oldStatus === 'occupied') occupiedDelta = -1;
            } else {
              if (oldStatus !== 'occupied' && newStatus === 'occupied') occupiedDelta = 1;
              else if (oldStatus === 'occupied' && newStatus !== 'occupied') occupiedDelta = -1;
            }
            const totalDelta = payload.eventType === 'INSERT' ? 1
              : payload.eventType === 'DELETE' ? -1 : 0;
            return {
              ...prev,
              bedsOccupied: Math.max(0, prev.bedsOccupied + occupiedDelta),
              bedsTotal: Math.max(0, prev.bedsTotal + totalDelta),
            };
          });
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clinical_alerts', filter: `hospital_id=eq.${hospitalId}` },
        (payload: any) => {
          qc.setQueryData<DashboardKPIs>(['dashboard-kpis', hospitalId], (prev) =>
            prev ? { ...prev, criticalAlerts: prev.criticalAlerts + 1 } : prev
          );
          if (payload.new?.severity === 'critical') {
            toast({ title: '🚨 Critical Alert', description: payload.new.alert_message, variant: 'destructive' });
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'opd_visits', filter: `hospital_id=eq.${hospitalId}` },
        () => {
          // Three derived counts — invalidate (single query) instead of risking double-counts.
          qc.invalidateQueries({ queryKey: ['dashboard-kpis', hospitalId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hospitalId, qc, toast]);

  const seedMut = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      return supabase.functions.invoke('seed-dashboard', {});
    },
    onSuccess: (res: any) => {
      if (res?.data?.seeded) {
        toast({ title: 'Sample data loaded', description: 'Dashboard now shows live data.' });
        qc.invalidateQueries({ queryKey: ['dashboard-kpis', hospitalId] });
      }
    },
    onError: (err: any) => {
      console.error('Seed error:', err);
    },
  });

  const refetch = useCallback(
    () => qc.invalidateQueries({ queryKey: ['dashboard-kpis', hospitalId] }),
    [qc, hospitalId]
  );

  return {
    kpis: query.data ?? EMPTY,
    loading: query.isLoading && !query.data,
    seeding: seedMut.isPending,
    seedData: () => seedMut.mutate(),
    refetch,
  };
}
