import { supabase } from '@/utils/supabase/client'
import { Profile } from '@/types'

export type AdminProfile = Pick<Profile, 'id' | 'role' | 'location'>

export async function getAdminProfile(): Promise<AdminProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, role, location')
    .eq('id', userId)
    .maybeSingle()

  if (!data) return null
  return {
    id: data.id,
    role: data.role,
    location: data.location,
  }
}

export function shouldFilterByLocation(profile: AdminProfile | null): profile is AdminProfile & {
  role: 'admin'
  location: 'Chasemall' | 'Eromo'
} {
  return (
    profile?.role === 'admin' &&
    !!profile.location &&
    profile.location !== 'All'
  )
}

export function applyLocationFilter<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  profile: AdminProfile | null,
  locationColumn = 'location'
): T {
  if (shouldFilterByLocation(profile)) {
    return query.eq(locationColumn, profile.location)
  }
  return query
}
