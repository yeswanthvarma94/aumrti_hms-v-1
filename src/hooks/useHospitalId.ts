import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useHospitalId() {
  const [hospitalId, setHospitalId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const getHospitalId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        
        const { data } = await supabase
          .from('users')
          .select('hospital_id')
          .eq('auth_user_id', user.id)
          .single()
        
        setHospitalId(data?.hospital_id || null)
      } catch (e) {
        console.error('useHospitalId error:', e)
      } finally {
        setLoading(false)
      }
    }
    
    getHospitalId()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getHospitalId()
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  return { hospitalId, loading }
}

// Also export a standalone async function for non-hook contexts:
export async function getHospitalIdAsync(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  return data?.hospital_id || null
}
