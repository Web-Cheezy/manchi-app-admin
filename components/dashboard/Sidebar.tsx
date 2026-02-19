'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, CreditCard, Settings, LogOut } from 'lucide-react'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Menu', href: '/dashboard/menu', icon: UtensilsCrossed },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-brand-charcoal text-white shadow-xl">
      <div className="flex h-20 items-center justify-center border-b border-white/10 bg-brand-charcoal">
        {/* <h1 className="text-xl font-bold">FoodAdmin</h1> */}
        <div className="px-4 py-2">
           <img src="/assets/lightmanchi.png" alt="Lightmanchi" className="h-12 w-auto object-contain" />
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
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
      <div className="border-t border-white/10 p-4">
        <button className="group flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-all">
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
