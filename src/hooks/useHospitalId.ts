import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

const STORAGE_KEY = 'selectedBranchId'

export function useHospitalId() {
  const [defaultHospitalId, setDefaultHospitalId] = useState<string | null>(null)
  const [hospitalId, setHospitalId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  )
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const getHospitalId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        
        const { data } = await supabase
          .from('users')
          .select('hospital_id, role')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        
        const dh = data?.hospital_id || null
        setDefaultHospitalId(dh)
        setRole(data?.role || null)
        // Branch override from localStorage takes precedence (set by BranchContext)
        const override = localStorage.getItem(STORAGE_KEY)
        setHospitalId(override || dh)
      } catch (e) {
        console.error('useHospitalId error:', e)
      } finally {
        setLoading(false)
      }
    }
    
    getHospitalId()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getHospitalId()
    })

    // React to branch switches dispatched via storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setHospitalId(e.newValue || defaultHospitalId)
      }
    }
    // Custom event for same-tab updates
    const onBranchChange = () => {
      const v = localStorage.getItem(STORAGE_KEY)
      setHospitalId(v || defaultHospitalId)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('branch:changed', onBranchChange as EventListener)
    
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('branch:changed', onBranchChange as EventListener)
    }
  }, [defaultHospitalId])
  
  return { hospitalId, role, loading }
}

// Also export a standalone async function for non-hook contexts:
export async function getHospitalIdAsync(): Promise<string | null> {
  const override = localStorage.getItem(STORAGE_KEY)
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
