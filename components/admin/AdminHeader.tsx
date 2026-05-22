'use client'

import { Menu } from 'lucide-react'
import type { Profile } from '@/types'

function initials(profile: Profile | null) {
  const name = profile?.full_name?.trim()
  if (name) {
    const p = name.split(/\s+/).filter(Boolean)
    return p.length >= 2
      ? `${p[0][0]}${p[1][0]}`.toUpperCase()
      : p[0].slice(0, 2).toUpperCase()
  }
  return (profile?.email?.[0] ?? 'A').toUpperCase()
}

export function AdminHeader({
  title,
  profile,
  onOpenNav,
}: {
  title: string
  profile: Profile | null
  onOpenNav: () => void
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenNav}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="truncate text-base font-semibold text-zinc-900 sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-zinc-100 bg-zinc-50/80 py-1 pl-1 pr-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-charcoal text-xs font-semibold text-white">
          {initials(profile)}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-zinc-800 sm:inline">
          {profile?.full_name?.split(' ')[0] || 'Admin'}
        </span>
      </div>
    </header>
  )
}
