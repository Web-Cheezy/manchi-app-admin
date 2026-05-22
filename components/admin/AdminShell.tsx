'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { getPageTitle } from '@/components/admin/nav'
import { supabase } from '@/utils/supabase/client'
import type { Profile } from '@/types'
import { cn } from '@/lib/cn'

const LG = 1024

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  const closeNav = useCallback(() => setNavOpen(false), [])
  const openNav = useCallback(() => setNavOpen(true), [])

  useEffect(() => {
    closeNav()
  }, [pathname, closeNav])

  useEffect(() => {
    if (!navOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && closeNav()
    window.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onEsc)
    }
  }, [navOpen, closeNav])

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LG}px)`)
    const handler = () => mq.matches && closeNav()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [closeNav])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (cancelled || !data) return
      if (data.role === 'customer') {
        router.replace('/access-denied')
        return
      }
      setProfile(data)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const title = getPageTitle(pathname)

  return (
    <div className="min-h-dvh bg-zinc-50">
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-zinc-900/40 transition-opacity duration-200 lg:hidden',
          navOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeNav}
        aria-hidden={!navOpen}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none',
          navOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ ['--sidebar-width' as string]: '16.5rem' }}
      >
        <AdminSidebar
          profile={profile}
          onNavigate={closeNav}
          showClose
          onClose={closeNav}
        />
      </aside>

      {/* Main column */}
      <div className="lg:pl-[16.5rem]">
        <AdminHeader title={title} profile={profile} onOpenNav={openNav} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
