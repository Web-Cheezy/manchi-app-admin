'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/utils/supabase/client'
import { adminNav, isActivePath } from '@/components/admin/nav'
import type { Profile } from '@/types'

export function AdminSidebar({
  profile,
  onNavigate,
  showClose,
  onClose,
}: {
  profile: Profile | null
  onNavigate?: () => void
  showClose?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const items = adminNav.filter((item) => !item.show || item.show(profile))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.replace('/login')
  }

  const roleLabel =
    profile?.role === 'super_admin'
      ? 'Super admin'
      : profile?.location
        ? `${profile.location}`
        : 'Admin'

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-100 px-4">
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Image
            src="/assets/lightmanchi.png"
            alt="Manchi"
            width={120}
            height={36}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      <nav className="admin-scroll flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-charcoal text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              )}
            >
              <item.icon
                className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-zinc-400')}
                aria-hidden
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-zinc-100 p-3">
        {profile && (
          <div className="mb-2 rounded-lg bg-zinc-50 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-zinc-900">
              {profile.full_name || profile.email || 'Admin'}
            </p>
            <p className="truncate text-xs text-zinc-500">{roleLabel}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <LogOut className="h-4 w-4 text-zinc-400" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  )
}
