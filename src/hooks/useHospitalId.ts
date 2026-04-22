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
  const override = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (override) return override
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data?.hospital_id || null
}
