'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Order } from '@/types'
import { Package, Clock, CheckCircle, Banknote } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        setOrders(data || [])
      }
      setLoading(false)
    }

    fetchOrders()
  }, [])

  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const completedOrders = orders.filter(o => o.status === 'delivered').length

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-brand-charcoal">Dashboard Overview</h2>
        <p className="text-gray-500 mt-2">Welcome back to your control panel.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Revenue" 
          value={`₦${totalRevenue.toFixed(2)}`} 
          icon={Banknote} 
          color="text-brand-green" 
        />
        <StatsCard 
          title="Total Orders" 
          value={orders.length} 
          icon={Package} 
          color="text-brand-red" 
        />
        <StatsCard 
          title="Pending Orders" 
          value={pendingOrders} 
          icon={Clock} 
          color="text-brand-yellow" 
        />
        <StatsCard 
          title="Completed Orders" 
          value={completedOrders} 
          icon={CheckCircle} 
          color="text-brand-charcoal" 
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 p-6">
          <h3 className="text-lg font-bold text-brand-charcoal">Recent Orders</h3>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders found.</div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="bg-gray-50/30">
                  <tr className="border-b border-gray-100 transition-colors">
                    <th className="h-12 px-6 text-left align-middle font-medium text-gray-500">Order ID</th>
                    <th className="h-12 px-6 text-left align-middle font-medium text-gray-500">Status</th>
                    <th className="h-12 px-6 text-left align-middle font-medium text-gray-500">Amount</th>
                    <th className="h-12 px-6 text-left align-middle font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                      <td className="p-4 align-middle font-medium">#{order.id}</td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 align-middle">₦{Number(order.total_amount).toFixed(2)}</td>
                      <td className="p-4 align-middle">{new Date(order.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
