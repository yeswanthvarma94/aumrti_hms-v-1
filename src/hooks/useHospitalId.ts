import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

const STORAGE_KEY = 'selectedBranchId'

/**
 * Backwards-compatible hook — now a thin reader over AuthContext.
 * The session + user record + hospital branding are resolved ONCE at the app
 * root by `<AuthProvider>`. Every consumer (AppSidebar, AuthGuard, RoleGuard,
 * pages) reads from the in-memory context — zero network calls on tab nav.
 */
export function useHospitalId() {
  return useAuth()
}

// Preferred alias going forward — same shape, clearer name.
export const useHospital = useHospitalId

// Legacy alias for callers that expected a user-record query hook.
// Returns the same data shape via context, so existing imports keep working.
export function useCurrentUserRecord(_authUserId?: string | null) {
  const { authUserId, userId, hospitalId, role, fullName, loading } = useAuth()
  return {
    data: authUserId
      ? { id: userId, hospital_id: hospitalId, role, full_name: fullName }
      : null,
    isLoading: loading,
    isFetching: loading,
  }
}

// Standalone async function for non-hook contexts (callable from event handlers)
export async function getHospitalIdAsync(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('hospital_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data) return null

  const override = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (!override) return data.hospital_id || null

  const role = (data as any).role as string | null
  const canSwitch = role === 'super_admin' || role === 'ceo'

  if (!canSwitch) {
    // Non-admins must always use their own hospital. Drop a stale override.
    if (override !== data.hospital_id) {
      localStorage.removeItem(STORAGE_KEY)
    }
    return data.hospital_id || null
  }

  // Admins: only honour the override if it matches an active hospital.
  const { data: hosp } = await supabase
    .from('hospitals')
    .select('id')
    .eq('id', override)
    .eq('is_active', true)
    .maybeSingle()
  if (!hosp) {
    localStorage.removeItem(STORAGE_KEY)
    return data.hospital_id || null
  }
  return override
}
