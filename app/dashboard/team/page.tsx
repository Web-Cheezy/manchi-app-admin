'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Profile } from '@/types'
import { Check, Loader2, Save, UserPlus } from 'lucide-react'

export default function TeamPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  
  // Add Admin State
  
  const fetchProfiles = async () => {
    // Fetch only admins and super_admins
    const { data: allProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      // .order('created_at', { ascending: false }) 
    
    if (error) {
      console.error('Error fetching profiles:', error)
    } else {
      setProfiles(allProfiles || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      // 1. Check if current user is super_admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'super_admin') {
        router.replace('/dashboard')
        return
      }

      setCurrentUser(profile)
      await fetchProfiles()
    }

    init()
  }, [])

  const handleUpdate = async (id: string, updates: Partial<Profile>) => {
    setSaving(id)
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)

    if (error) {
      alert('Error updating profile')
      console.error(error)
    } else {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-charcoal">Team Management</h2>
          <p className="text-gray-500 mt-2">Manage admin access and locations.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/30 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Name / Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No other admins found.
                </td>
              </tr>
            ) : (
              profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-brand-charcoal">{profile.full_name || 'No Name'}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {profile.email || profile.id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={profile.role || 'admin'}
                      onChange={(e) => handleUpdate(profile.id, { role: e.target.value as any })}
                      className="rounded-lg border-gray-200 text-sm focus:border-brand-red focus:ring-brand-red"
                      disabled={profile.id === currentUser?.id}
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={profile.location || 'Chasemall'}
                      onChange={(e) => handleUpdate(profile.id, { location: e.target.value as any })}
                      className="rounded-lg border-gray-200 text-sm focus:border-brand-red focus:ring-brand-red"
                      disabled={profile.role === 'super_admin'}
                    >
                      <option value="Chasemall">Chasemall</option>
                      <option value="Eromo">Eromo</option>
                      <option value="All">All Locations</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {saving === profile.id && (
                      <span className="inline-flex items-center text-green-600 text-xs font-medium">
                        <Save className="mr-1 h-3 w-3" />
                        Saving...
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        <strong>Note:</strong>
        <p className="mt-1">
          Only Super Admins can access this page. Use the table above to change roles (Admin/Super Admin) and locations for existing team members.
        </p>
      </div>
    </div>
  )
}
