'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { AvailabilityStatus, Profile } from '@/types'
import { Loader2, ChevronLeft, CheckCircle2, Archive, XCircle, Image as ImageIcon } from 'lucide-react'
import { clsx } from 'clsx'

export default function AvailabilityUpdatePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = params.type as 'food' | 'side'
  const id = params.id as string
  const urlLocation = searchParams.get('location') as 'Eromo' | 'Chasemall' | null
  
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [item, setItem] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentStatus, setCurrentStatus] = useState<AvailabilityStatus>('available')
  const [activeLocation, setActiveLocation] = useState<'Eromo' | 'Chasemall' | null>(null)

  useEffect(() => {
    const init = async () => {
      // 1. Get User Profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (!profileData) return
      setProfile(profileData)

      // Determine which location we are managing
      // Super admins use the location from URL, admins use their assigned location
      const location = profileData.role === 'super_admin' ? urlLocation || 'Eromo' : profileData.location as any
      setActiveLocation(location)

      // 2. Get Item Details
      const table = type === 'food' ? 'foods' : 'sides'
      const availabilityTable = type === 'food' ? 'food_availability' : 'side_availability'
      
      const { data: itemData } = await supabase
        .from(table)
        .select(`*, ${availabilityTable}(*)`)
        .eq('id', id)
        .single()

      if (itemData) {
        setItem(itemData)
        const availability = itemData[availabilityTable]?.find((a: any) => a.location === location)
        if (availability) {
          setCurrentStatus(availability.status)
        }
      }
      setLoading(false)
    }
    init()
  }, [id, type, router, urlLocation])

  const handleUpdate = async (status: AvailabilityStatus) => {
    if (!profile || !activeLocation) return
    setUpdating(true)

    const availabilityTable = type === 'food' ? 'food_availability' : 'side_availability'
    const idField = type === 'food' ? 'food_id' : 'side_id'

    const { error } = await supabase
      .from(availabilityTable)
      .upsert({
        [idField]: id,
        location: activeLocation,
        status: status,
        updated_at: new Date().toISOString()
      }, { onConflict: `${idField},location` })

    if (error) {
      alert('Error updating status: ' + error.message)
    } else {
      setCurrentStatus(status)
      setTimeout(() => {
        router.back()
      }, 500)
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <button 
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-brand-charcoal/60 hover:text-brand-red transition-colors group"
      >
        <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
        <span className="font-bold text-xs uppercase tracking-widest">Back to Branch Menu</span>
      </button>

      <div className="overflow-hidden rounded-[2.5rem] border border-brand-red/10 bg-white shadow-2xl shadow-brand-charcoal/10">
        <div className="border-b border-brand-red/10 bg-brand-beige/40 p-8">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-[2rem] bg-white shadow-inner overflow-hidden flex-shrink-0 border-4 border-white ring-1 ring-brand-red/10">
              {item?.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-beige text-brand-red">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div>
              <p className="text-brand-red text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                {type === 'food' ? 'Main Dish' : 'Side Item'}
              </p>
              <h1 className="text-brand-charcoal text-2xl font-black leading-tight uppercase tracking-tight">
                {item?.name}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <div className={clsx(
                  "h-2 w-2 rounded-full animate-pulse",
                  currentStatus === 'available' ? 'bg-brand-green' : currentStatus === 'out_of_stock' ? 'bg-brand-charcoal' : 'bg-brand-red'
                )} />
                <span className="text-[10px] font-bold text-brand-charcoal/60 uppercase tracking-widest">
                  Currently {currentStatus.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-brand-charcoal text-sm font-black uppercase tracking-widest">Update Availability</h2>
            <span className="rounded-full bg-brand-charcoal px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              {activeLocation} Branch
            </span>
          </div>
          
          <div className="grid gap-3">
            <StatusOption 
              label="Available" 
              description="Item is visible and ready for orders"
              icon={CheckCircle2}
              active={currentStatus === 'available'}
              onClick={() => handleUpdate('available')}
              color="green"
              disabled={updating}
            />
            <StatusOption 
              label="Stock Out" 
              description="Visible but orders are disabled"
              icon={Archive}
              active={currentStatus === 'out_of_stock'}
              onClick={() => handleUpdate('out_of_stock')}
              color="gray"
              disabled={updating}
            />
            <StatusOption 
              label="Disable" 
              description="Hide this item from the customer menu"
              icon={XCircle}
              active={currentStatus === 'unavailable'}
              onClick={() => handleUpdate('unavailable')}
              color="red"
              disabled={updating}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusOption({ 
  label, 
  description, 
  icon: Icon, 
  active, 
  onClick, 
  color,
  disabled 
}: any) {
  const palette = {
    green: {
      activeBg: '#388E3C',
      activeBorder: '#2E7D32',
      activeSoft: 'rgba(56, 142, 60, 0.18)',
      inactiveBg: '#F3FBF4',
      inactiveBorder: '#B7DDBB',
      inactiveText: '#2E7D32',
    },
    gray: {
      activeBg: '#212121',
      activeBorder: '#111111',
      activeSoft: 'rgba(33, 33, 33, 0.18)',
      inactiveBg: '#F5F5F5',
      inactiveBorder: '#D6D6D6',
      inactiveText: '#424242',
    },
    red: {
      activeBg: '#D32F2F',
      activeBorder: '#B71C1C',
      activeSoft: 'rgba(211, 47, 47, 0.18)',
      inactiveBg: '#FFF1F1',
      inactiveBorder: '#F3B7B7',
      inactiveText: '#C62828',
    },
  }
  const theme = palette[color as keyof typeof palette]

  const buttonStyle = active
    ? { backgroundColor: theme.activeBg, borderColor: theme.activeBorder, boxShadow: `0 18px 40px ${theme.activeSoft}` }
    : { backgroundColor: theme.inactiveBg, borderColor: theme.inactiveBorder }
  const iconStyle = active
    ? { backgroundColor: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }
    : { backgroundColor: '#FFFFFF', color: theme.inactiveText }
  const titleStyle = { color: active ? '#FFFFFF' : '#212121' }
  const descriptionStyle = { color: active ? 'rgba(255,255,255,0.88)' : '#616161' }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={buttonStyle}
      className={clsx(
        "relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-all",
        "flex items-center gap-4",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        style={iconStyle}
        className="flex-shrink-0 rounded-xl p-3 shadow-sm transition-colors"
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p style={titleStyle} className="text-sm font-black uppercase tracking-tight transition-colors">
          {label}
        </p>
        <p style={descriptionStyle} className="mt-0.5 text-xs font-medium leading-relaxed transition-colors">
          {description}
        </p>
      </div>
      {active && (
        <div className="absolute right-6 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/20">
          <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
        </div>
      )}
    </button>
  )
}
