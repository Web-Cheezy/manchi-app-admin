import {
  CreditCard,
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Users,
  UtensilsCrossed,
  Store,
  type LucideIcon,
} from 'lucide-react'
import type { Profile } from '@/types'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  show?: (profile: Profile | null) => boolean
}

export const adminNav: AdminNavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Delivery', href: '/dashboard/transportation', icon: Truck },
  {
    label: 'Menu',
    href: '/dashboard/menu',
    icon: UtensilsCrossed,
    show: (p) => p?.role === 'super_admin',
  },
  {
    label: 'Branch menu',
    href: '/dashboard/branch-menu',
    icon: Store,
    show: (p) => p?.role === 'super_admin' || p?.role === 'admin',
  },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  {
    label: 'Team',
    href: '/dashboard/team',
    icon: Users,
    show: (p) => p?.role === 'super_admin',
  },
]

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard/orders')) return 'Orders'
  if (pathname.startsWith('/dashboard/transportation')) return 'Delivery pricing'
  if (pathname.startsWith('/dashboard/menu')) return 'Menu'
  if (pathname.startsWith('/dashboard/branch-menu')) return 'Branch menu'
  if (pathname.startsWith('/dashboard/payments')) return 'Payments'
  if (pathname.startsWith('/dashboard/team')) return 'Team'
  return 'Overview'
}

export function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}
