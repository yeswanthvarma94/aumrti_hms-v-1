// ============================================================================
// Shared hospitalId via BranchContext
// ----------------------------------------------------------------------------
// `useHospitalId` is a drop-in, zero-network hook that reads from
// BranchContext (which already resolves `hospital_id`, role, and user info
// once per session). Previously this hook fired its own auth + DB queries
// on every consumer mount, causing hundreds of redundant round-trips.
// ============================================================================

import { useBranch } from '@/contexts/BranchContext'
import { supabase } from '@/integrations/supabase/client'

const STORAGE_KEY = 'selectedBranchId'

/**
 * Drop-in replacement for the old query-based hook.
 * Same return shape — reads from BranchContext, no network calls.
 */
export function useHospitalId() {
  const { selectedBranchId, role, fullName, userId, loading } = useBranch()
  return {
    hospitalId: selectedBranchId,
    role,
    fullName,
    userId,
    loading,
  }
}

/**
 * Synchronous getter for non-hook contexts (event handlers, utilities).
 * Reads the same localStorage key BranchContext maintains.
 */
export function getHospitalIdSync(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

/**
 * Async getter — returns from cache if available, otherwise falls back to a
 * single one-shot DB lookup. Backward-compatible with old callers.
 */
export async function getHospitalIdAsync(): Promise<string | null> {
  const cached = getHospitalIdSync()
  if (cached) return cached

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const id = data?.hospital_id || null
  if (id) localStorage.setItem(STORAGE_KEY, id)
  return id
}
