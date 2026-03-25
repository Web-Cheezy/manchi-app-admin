'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, CreditCard, LogOut, Users, Truck } from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { Profile } from '@/types'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Transportation', href: '/dashboard/transportation', icon: Truck },
  { name: 'Menu', href: '/dashboard/menu', icon: UtensilsCrossed },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { name: 'Team', href: '/dashboard/team', icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (data) {
          if (data.role === 'customer') {
            router.replace('/access-denied')
            return
          }
          setProfile(data)
        }
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.replace('/login')
  }

  return (
    <div className="flex h-full w-64 flex-col bg-brand-charcoal text-white shadow-xl">
      <div className="flex h-20 items-center justify-center border-b border-white/10 bg-brand-charcoal">
        <div className="px-4 py-2">
           <img src="/assets/lightmanchi.png" alt="Lightmanchi" className="h-12 w-auto object-contain" />
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
          // Hide 'Menu' if not super_admin
          if (item.name === 'Menu' && profile?.role !== 'super_admin') {
            return null
          }
          // Hide 'Team' if not super_admin
          if (item.name === 'Team' && profile?.role !== 'super_admin') {
            return null
          }

          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive
                  ? 'bg-brand-red text-white shadow-md'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white',
                'group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200'
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      {profile && (
        <div className="px-4 py-2 text-xs text-gray-500 text-center">
          {profile.role === 'super_admin' ? 'Super Admin' : `${profile.location} Admin`}
        </div>
      )}

      <div className="border-t border-white/10 p-4">
        <button 
          onClick={handleLogout}
          className="group flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-all"
        >
          <LogOut
            className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white"
            aria-hidden="true"
          />
          Logout
        </button>
      </div>
    </div>
  )
}
