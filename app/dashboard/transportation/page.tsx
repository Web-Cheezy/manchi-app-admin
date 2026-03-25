'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import nigeriaStateAndLgas from '@/assets/nigeria-state-and-lgas.json'
import { Check, Loader2, RotateCcw, Save } from 'lucide-react'

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
  const lgaRows = useMemo(() => {
    const groups = nigeriaStateAndLgas as LgaGroup[]
    const rows: Array<{ state: string; lga: string }> = []
    for (const group of groups) {
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

  const fetchPrices = async () => {
    setLoading(true)

    try {
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
      for (const { lga } of lgaRows) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-charcoal">Transportation</h2>
          <p className="text-gray-500 mt-2">
            Set the transport fare by LGA. Default is ₦{DEFAULT_PRICE}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-brand-red px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-red-700 hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {lastSavedAt && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Saved {new Date(lastSavedAt).toLocaleString()}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 p-6">
          <h3 className="text-lg font-bold text-brand-charcoal">LGA Transport Prices</h3>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-10 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading transport prices...
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4">LGA</th>
                  <th className="px-6 py-4 text-right">Price (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lgaRows.map((row) => (
                  <tr key={row.lga} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-gray-600">{row.state}</td>
                    <td className="px-6 py-4 font-medium text-brand-charcoal">{row.lga}</td>
                    <td className="px-6 py-4 text-right">
                      <input
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
                        className="w-32 rounded-xl border border-gray-200 p-2 text-right focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

