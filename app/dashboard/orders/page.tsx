'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Order, OrderStatus } from '@/types'
import Link from 'next/link'

type OrderOption = {
  id?: number
  name?: string
  price?: number
}

type InlineOrderItem = {
  food_id?: number | null
  side_id?: number | null
  name?: string
  image_url?: string
  quantity?: number
  price_at_time?: number
  options?: OrderOption[]
}

type AdminOrder = Order & {
  items?: InlineOrderItem[] | { items?: InlineOrderItem[] } | null
  profiles?: {
    full_name?: string | null
    phone_number?: string | null
    email?: string | null
  } | null
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last_7_days' | 'this_week' | 'custom'>('all')
  const [customDate, setCustomDate] = useState<string>('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      const rows: any[] = data || []

      const userIds = Array.from(
        new Set(rows.map((row) => row.user_id).filter(Boolean))
      )

      const profileMap = new Map<
        string,
        { full_name?: string | null; phone_number?: string | null; email?: string | null }
      >()

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number, email')
          .in('id', userIds)

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
        } else {
          for (const p of profilesData as any[]) {
            profileMap.set(p.id, {
              full_name: p.full_name ?? null,
              phone_number: p.phone_number ?? null,
              email: p.email ?? null,
            })
          }
        }
      }

      const normalized: AdminOrder[] = rows.map((row) => ({
        ...row,
        profiles: profileMap.get(row.user_id) ?? null,
      }))

      setOrders(normalized)
    }
    setLoading(false)
  }

  const updateStatus = async (id: number, status: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
    
    if (error) {
      alert('Error updating status')
    } else {
      fetchOrders()
    }
  }

  const isSameDay = (d: Date, target: Date) => {
    return (
      d.getFullYear() === target.getFullYear() &&
      d.getMonth() === target.getMonth() &&
      d.getDate() === target.getDate()
    )
  }

  const isThisWeek = (d: Date) => {
    const now = new Date()
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay()
    const monday = new Date(now)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(now.getDate() - (dayOfWeek - 1))

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return d >= monday && d <= sunday
  }

  const filteredOrders = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false

    if (dateFilter === 'all') return true

    const created = new Date(o.created_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (dateFilter === 'today') {
      return isSameDay(created, today)
    }

    if (dateFilter === 'yesterday') {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      return isSameDay(created, yesterday)
    }

    if (dateFilter === 'last_7_days') {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 6)
      return created >= sevenDaysAgo && created <= new Date()
    }

    if (dateFilter === 'this_week') {
      return isThisWeek(created)
    }

    if (dateFilter === 'custom' && customDate) {
      const target = new Date(customDate)
      return isSameDay(created, target)
    }

    return true
  })

  const getItemsSummary = (order: AdminOrder) => {
    const raw = order.items as any
    const items: InlineOrderItem[] | undefined = Array.isArray(raw)
      ? raw
      : raw && Array.isArray(raw.items)
        ? raw.items
        : undefined

    if (!items || items.length === 0) return 'No items'

    return items
      .map((item) => {
        const qty = item.quantity ?? 1
        const baseName =
          item.name ||
          (item.food_id ? `Item ${item.food_id}` :
            item.side_id ? `Side ${item.side_id}` :
            'Item')

        const optionsNames =
          Array.isArray(item.options) && item.options.length
            ? ` (${item.options
                .map((opt) => opt?.name)
                .filter(Boolean)
                .join(', ')})`
            : ''

        return `${qty}x ${baseName}${optionsNames}`
      })
      .join(' • ')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-brand-charcoal">Orders</h2>
        <div className="flex flex-wrap gap-2">
          <select 
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all shadow-sm bg-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="delivering">Delivering</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all shadow-sm bg-white"
            value={dateFilter}
            onChange={(e) => {
              const value = e.target.value as typeof dateFilter
              setDateFilter(value)
              if (value !== 'custom') {
                setCustomDate('')
              }
            }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="custom">Specific Day</option>
          </select>

          {dateFilter === 'custom' && (
            <input
              type="date"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all shadow-sm bg-white"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-blue-600 hover:underline">
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-brand-charcoal">
                        {order.profiles?.full_name || 'Unknown customer'}
                      </div>
                      <div className="text-gray-500 font-mono text-[11px]">
                        {order.user_id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-gray-900">
                        {order.profiles?.phone_number || 'No phone'}
                      </div>
                      <div className="text-gray-500">
                        {order.profiles?.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {getItemsSummary(order)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                        className={`rounded-full px-2 py-1 text-xs font-medium border-none focus:ring-2 focus:ring-offset-1 ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivering' ? 'bg-indigo-100 text-indigo-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="delivering">Delivering</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">₦{Number(order.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-gray-600 hover:text-black font-medium">
                        View
                      </Link>
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
