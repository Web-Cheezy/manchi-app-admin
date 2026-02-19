'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Order } from '@/types'
import { CheckCircle, XCircle, Clock, Banknote } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'

export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) console.error('Error fetching orders:', error)
      else setOrders(data || [])
      setLoading(false)
    }

    fetchOrders()
  }, [])

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-brand-charcoal">Payments & Revenue</h2>
        <p className="text-gray-500 mt-2">Manage your financial overview and transaction history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Revenue" 
          value={`₦${totalRevenue.toFixed(2)}`} 
          icon={Banknote} 
          color="text-brand-green" 
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 p-6">
          <h3 className="text-lg font-bold text-brand-charcoal">Transaction History</h3>
        </div>
        <div className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/30 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Order Ref</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading transactions...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No transactions found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-brand-charcoal">#{order.id}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {order.status === 'cancelled' ? (
                          <XCircle className="h-4 w-4 text-brand-red" />
                        ) : order.status === 'delivered' ? (
                          <CheckCircle className="h-4 w-4 text-brand-green" />
                        ) : (
                          <Clock className="h-4 w-4 text-brand-yellow" />
                        )}
                        <span className={`capitalize font-medium ${
                          order.status === 'cancelled' ? 'text-brand-red' :
                          order.status === 'delivered' ? 'text-brand-green' :
                          'text-brand-yellow'
                        }`}>{order.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-brand-charcoal">
                      ₦{Number(order.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
