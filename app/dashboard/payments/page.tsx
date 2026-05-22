'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Order } from '@/types'
import { Banknote, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Page, PageHeader } from '@/components/admin/Page'
import { StatCard } from '@/components/admin/StatCard'
import { Card, CardBody, CardHeader } from '@/components/admin/ui/Card'
import { OrderStatusBadge } from '@/components/admin/ui/Badge'

export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) setOrders(data || [])
      setLoading(false)
    })()
  }, [])

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  return (
    <Page>
      <PageHeader
        title="Payments"
        description="Revenue from completed and in-progress orders (excluding cancelled)."
      />

      <StatCard
        label="Total revenue"
        value={`₦${totalRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
        icon={Banknote}
        tone="green"
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-zinc-900">Transactions</h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">No transactions.</p>
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="px-6 py-3">Order</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/80">
                      <td className="px-6 py-3.5 font-mono text-xs text-zinc-700">
                        #{order.id}
                      </td>
                      <td className="px-6 py-3.5 text-zinc-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {order.status === 'cancelled' ? (
                            <XCircle className="h-4 w-4 text-red-500" aria-hidden />
                          ) : order.status === 'delivered' ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" aria-hidden />
                          )}
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-zinc-900">
                        ₦{Number(order.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
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
