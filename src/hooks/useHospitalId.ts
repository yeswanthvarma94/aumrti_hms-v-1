import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

const STORAGE_KEY = 'selectedBranchId'

interface UserRecord {
  id: string
  hospital_id: string | null
  role: string | null
}

/**
 * Fetches the current user's id, hospital_id, and role from the `users` table.
 * Cached forever (staleTime: Infinity) and invalidated only on auth state changes.
 * This is the single source of truth used by AuthGuard, RoleGuard, and many pages.
 */
async function fetchCurrentUserRecord(authUserId: string): Promise<UserRecord | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, hospital_id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (error) {
    console.error('useHospitalId: fetch user error:', error.message)
    return null
  }
  return data as UserRecord | null
}

export function useCurrentUserRecord(authUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['current-user', authUserId],
    queryFn: () => fetchCurrentUserRecord(authUserId as string),
    enabled: !!authUserId,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * Backwards-compatible hook used across the app.
 * Returns the same `{ hospitalId, role, loading }` shape as before, but is now
 * cached via TanStack Query so route navigations don't re-query the users table.
 */
export function useHospitalId() {
  const queryClient = useQueryClient()
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(undefined)
  const [branchOverride, setBranchOverride] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null)
  )

  // Resolve auth user id once, and listen for sign-in/out
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setAuthUserId(session?.user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newId = session?.user?.id ?? null
      setAuthUserId(prev => {
        if (prev !== newId) {
          // Auth identity changed — invalidate cached user record
          queryClient.invalidateQueries({ queryKey: ['current-user'] })
        }
        return newId
      })
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [queryClient])

  // React to branch switches (multi-branch scenarios)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setBranchOverride(e.newValue)
    }
    const onBranchChange = () => {
      setBranchOverride(localStorage.getItem(STORAGE_KEY))
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('branch:changed', onBranchChange as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('branch:changed', onBranchChange as EventListener)
    }
  }, [])

  const { data, isLoading, isFetching } = useCurrentUserRecord(authUserId)

  // Loading: while we don't yet know auth state, OR while the user record query is in-flight on first load
  const loading =
    authUserId === undefined ||
    (authUserId !== null && isLoading && !data && isFetching)

  const defaultHospitalId = data?.hospital_id ?? null
  const hospitalId = branchOverride || defaultHospitalId

  return {
    hospitalId,
    role: data?.role ?? null,
    loading,
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
