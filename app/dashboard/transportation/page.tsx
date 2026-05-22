'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import nigeriaStateAndLgas from '@/assets/nigeria-state-and-lgas.json'
import { Check, Loader2, RotateCcw } from 'lucide-react'
import { Profile } from '@/types'
import { Page, PageHeader } from '@/components/admin/Page'
import { Button } from '@/components/admin/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/admin/ui/Card'
import { Input } from '@/components/admin/ui/Field'

type LgaGroup = {
  state: string
  alias: string
  lgas: string[]
}

type TransportPriceRow = {
  lga: string
  state: string
  price: number
}

const DEFAULT_PRICE = 2500

export default function TransportationPage() {
  const allBusinessLgaRows = useMemo(() => {
    const groups = nigeriaStateAndLgas as LgaGroup[]
    const rows: Array<{ state: string; lga: string }> = []
    for (const group of groups) {
      if (group.state !== 'Enugu' && group.state !== 'Rivers') continue
      for (const lga of group.lgas) {
        rows.push({ state: group.state, lga })
      }
    }
    return rows
  }, [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pricesByLga, setPricesByLga] = useState<Record<string, number>>({})
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [adminProfile, setAdminProfile] = useState<Pick<Profile, 'role' | 'location'> | null>(null)

  const allowedStates = useMemo(() => {
    if (adminProfile?.role === 'super_admin') return ['Enugu', 'Rivers']
    if (adminProfile?.role === 'admin') {
      if (adminProfile.location === 'Chasemall') return ['Enugu']
      if (adminProfile.location === 'Eromo') return ['Rivers']
    }
    return []
  }, [adminProfile])

  const lgaRows = useMemo(() => {
    if (allowedStates.length === 0) return []
    return allBusinessLgaRows.filter((r) => allowedStates.includes(r.state))
  }, [allBusinessLgaRows, allowedStates])

  const fetchPrices = async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const userId = session?.user?.id
      let currentAdmin: Pick<Profile, 'role' | 'location'> | null = null
      if (userId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, location')
          .eq('id', userId)
          .maybeSingle()

        if (profileData) {
          currentAdmin = {
            role: profileData.role,
            location: profileData.location,
          }
        }
      }
      setAdminProfile(currentAdmin)

      const { data, error } = await supabase
        .from('transport_prices')
        .select('lga, state, price')

      if (error) {
        console.error('Error fetching transport prices:', error)
        alert('Error fetching transport prices. Make sure the SQL schema was applied.')
        return
      }

      const rows = (data || []) as TransportPriceRow[]
      const priceMap = new Map<string, number>()
      for (const row of rows) priceMap.set(row.lga, Number(row.price))

      const initial: Record<string, number> = {}
      for (const { lga } of allBusinessLgaRows) {
        initial[lga] = priceMap.get(lga) ?? DEFAULT_PRICE
      }

      setPricesByLga(initial)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: TransportPriceRow[] = lgaRows.map((row) => {
        const price = pricesByLga[row.lga]
        return {
          lga: row.lga,
          state: row.state,
          price: Number.isFinite(price) ? Math.trunc(price) : DEFAULT_PRICE,
        }
      })

      for (const p of payload) {
        if (!Number.isFinite(p.price) || p.price < 0) {
          alert(`Invalid price for LGA "${p.lga}".`)
          return
        }
      }

      const { error } = await supabase
        .from('transport_prices')
        .upsert(payload, { onConflict: 'lga' })

      if (error) {
        console.error('Error saving transport prices:', error)
        alert('Error saving transport prices.')
        return
      }

      setLastSavedAt(new Date().toISOString())
      await fetchPrices()
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const next: Record<string, number> = {}
    for (const { lga } of lgaRows) next[lga] = DEFAULT_PRICE
    setPricesByLga(next)
    setLastSavedAt(null)
  }

  if (!loading && allowedStates.length === 0) {
    return (
      <Page>
        <Card>
          <CardBody className="py-12 text-center">
            <p className="font-medium text-zinc-900">Access denied</p>
            <p className="mt-1 text-sm text-zinc-500">
              You can only manage delivery prices for your assigned location.
            </p>
          </CardBody>
        </Card>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Delivery pricing"
        description={`Set transport fare per LGA. Default ₦${DEFAULT_PRICE.toLocaleString('en-NG')}.`}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              disabled={saving || loading || lgaRows.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading || lgaRows.length === 0}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      {lastSavedAt && (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Saved {new Date(lastSavedAt).toLocaleString()}
        </p>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-zinc-900">LGA fares</h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="px-6 py-3">State</th>
                    <th className="px-6 py-3">LGA</th>
                    <th className="px-6 py-3 text-right">Price (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {lgaRows.map((row) => (
                    <tr key={row.lga} className="hover:bg-zinc-50/80">
                      <td className="px-6 py-3 text-zinc-600">{row.state}</td>
                      <td className="px-6 py-3 font-medium text-zinc-900">{row.lga}</td>
                      <td className="px-6 py-3 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={pricesByLga[row.lga] ?? DEFAULT_PRICE}
                          onChange={(e) => {
                            const next = Number(e.target.value)
                            setPricesByLga((prev) => ({
                              ...prev,
                              [row.lga]: Number.isFinite(next) ? next : DEFAULT_PRICE,
                            }))
                          }}
                          className="ml-auto w-28 text-right tabular-nums"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </Page>
  )
}
