'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { adminApi, AdminApiError } from '@/utils/adminApi'
import { Food, Side, Profile, AvailabilityStatus } from '@/types'
import { Loader2, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import Image from 'next/image'

type Location = 'Eromo' | 'Chasemall'

export default function BranchMenuPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [sides, setSides] = useState<Side[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'foods' | 'sides'>('foods')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          const initialLocation =
            profileData.role === 'super_admin' ? 'Eromo' : (profileData.location as Location)
          setSelectedLocation(initialLocation)
          return
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const refreshMenu = async () => {
    if (!selectedLocation) return
    const [foodsRes, sidesRes] = await Promise.all([
      supabase
        .from('foods')
        .select('*, categories(name), food_availability(*)')
        .order('name'),
      supabase
        .from('sides')
        .select('*, side_availability(*)')
        .order('name'),
    ])
    if (foodsRes.data) setFoods(foodsRes.data)
    if (sidesRes.data) setSides(sidesRes.data)
  }

  useEffect(() => {
    if (!selectedLocation) return

    const run = async () => {
      setLoading(true)
      await refreshMenu()
      setLoading(false)
    }

    run()
  }, [selectedLocation])

  const quickToggle = async (
    type: 'food' | 'side',
    itemId: number,
    current: AvailabilityStatus
  ) => {
    if (!selectedLocation) return
    const next: AvailabilityStatus =
      current === 'available' ? 'out_of_stock' : 'available'
    const key = `${type}-${itemId}`
    setTogglingKey(key)
    try {
      await adminApi.updateAvailability({
        type,
        id: itemId,
        location: selectedLocation,
        status: next,
      })
      await refreshMenu()
    } catch (err) {
      alert(err instanceof AdminApiError ? err.message : 'Failed to update availability')
    } finally {
      setTogglingKey(null)
    }
  }

  if (loading && !foods.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-charcoal">
            Branch Menu Availability
          </h2>
          <p className="text-gray-500 mt-2">
            Quick stock-out toggles or open an item for full availability controls.
          </p>
        </div>

        {profile?.role === 'super_admin' && (
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            {(['Eromo', 'Chasemall'] as const).map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                  selectedLocation === loc
                    ? 'bg-brand-red text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {loc}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['foods', 'sides'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                activeTab === tab
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-brand-charcoal',
                'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-colors'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-3">
        {activeTab === 'foods'
          ? foods.map((food) => {
              const availability = food.food_availability?.find(
                (a) => a.location === selectedLocation
              )
              const status = availability?.status || 'available'

              return (
                <ItemRow
                  key={food.id}
                  id={food.id}
                  type="food"
                  name={food.name}
                  category={food.categories?.name}
                  image={food.image_url}
                  status={status}
                  location={selectedLocation || ''}
                  toggling={togglingKey === `food-${food.id}`}
                  onQuickToggle={() => quickToggle('food', food.id, status)}
                />
              )
            })
          : sides.map((side) => {
              const availability = side.side_availability?.find(
                (a) => a.location === selectedLocation
              )
              const status = availability?.status || 'available'

              return (
                <ItemRow
                  key={side.id}
                  id={side.id}
                  type="side"
                  name={side.name}
                  category={side.type}
                  image={side.image_url}
                  status={status}
                  location={selectedLocation || ''}
                  toggling={togglingKey === `side-${side.id}`}
                  onQuickToggle={() => quickToggle('side', side.id, status)}
                />
              )
            })}
      </div>
    </div>
  )
}

function ItemRow({
  id,
  type,
  name,
  category,
  image,
  status,
  location,
  toggling,
  onQuickToggle,
}: {
  id: number
  type: 'food' | 'side'
  name: string
  category?: string
  image?: string
  status: AvailabilityStatus
  location: string
  toggling?: boolean
  onQuickToggle?: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-brand-red/30 transition-all shadow-sm group">
      <Link
        href={`/dashboard/branch-menu/${type}/${id}?location=${location}`}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <div className="h-16 w-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden relative">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              -
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={status} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {category}
            </span>
          </div>
          <h3 className="font-black text-brand-charcoal text-base truncate uppercase tracking-tight">
            {name}
          </h3>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-brand-red transition-colors shrink-0" />
      </Link>
      {onQuickToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onQuickToggle()
          }}
          disabled={toggling}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-charcoal hover:bg-gray-50 disabled:opacity-50"
        >
          {toggling ? '…' : status === 'available' ? 'Stock out' : 'Restock'}
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: AvailabilityStatus }) {
  const styles = {
    available: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
    out_of_stock: 'bg-[#F5F5F5] text-[#424242] border-[#E0E0E0]',
    unavailable: 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]',
  }

  return (
    <span
      className={clsx(
        'px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border',
        styles[status]
      )}
    >
      {status === 'out_of_stock'
        ? 'Stock Out'
        : status === 'unavailable'
          ? 'Disabled'
          : 'Available'}
    </span>
  )
}
