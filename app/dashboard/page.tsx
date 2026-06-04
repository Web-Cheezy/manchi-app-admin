'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Order, formatNaira } from '@/types'
import { Banknote, CheckCircle, Clock, Package } from 'lucide-react'
import { Page } from '@/components/admin/Page'
import { StatCard } from '@/components/admin/StatCard'
import { Card, CardBody, CardHeader } from '@/components/admin/ui/Card'
import { OrderStatusBadge } from '@/components/admin/ui/Badge'
import Link from 'next/link'
import { applyLocationFilter, getAdminProfile, shouldFilterByLocation } from '@/utils/adminLocation'

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const profile = await getAdminProfile()

      if (shouldFilterByLocation(profile)) {
        setLocationLabel(profile.location)
      } else {
        setLocationLabel(null)
      }

      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      ordersQuery = applyLocationFilter(ordersQuery, profile)

      const { data, error } = await ordersQuery

      if (!error && data) {
        const rows = data as Order[]
        setOrders(rows)
        setTotalRevenue(
          rows
            .filter((o) => o.status !== 'cancelled')
            .reduce((sum, o) => sum + Number(o.total_amount), 0)
        )
      } else if (error) {
        console.error('Error fetching orders:', error)
      }

      setLoading(false)
    })()
  }, [])

  const pending = orders.filter((o) => o.status === 'pending').length
  const delivered = orders.filter((o) => o.status === 'delivered').length

  return (
    <Page>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={locationLabel ? `Revenue (${locationLabel})` : 'Revenue'}
          value={formatNaira(totalRevenue)}
          icon={Banknote}
          tone="green"
        />
        <StatCard label="Orders" value={orders.length} icon={Package} />
        <StatCard label="Pending" value={pending} icon={Clock} tone="amber" />
        <StatCard label="Delivered" value={delivered} icon={CheckCircle} tone="green" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">Recent orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            View all →
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">No orders yet.</p>
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="px-6 py-3">Order</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/80">
                      <td className="px-6 py-3.5 font-medium text-zinc-900">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="hover:underline"
                        >
                          #{order.id}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-3.5 tabular-nums text-zinc-700">
                        {formatNaira(Number(order.total_amount))}
                      </td>
                      <td className="px-6 py-3.5 text-zinc-500">
                        {new Date(order.created_at).toLocaleDateString()}
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
