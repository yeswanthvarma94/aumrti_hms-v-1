import { getHospitalIdAsync } from '@/hooks/useHospitalId'

/**
 * Resolve the active hospital_id for the current user, honouring a valid
 * branch override stored in localStorage. Stale or unauthorized overrides
 * are dropped automatically so callers never query the wrong hospital.
 */
export async function getHospitalId(): Promise<string | null> {
  return getHospitalIdAsync()
}
