'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Order, OrderStatus, Profile } from '@/types'
import { getAdminProfile } from '@/utils/adminLocation'
import { fetchPaidOrders } from '@/utils/paidOrders'
import Link from 'next/link'
import { Page, PageHeader } from '@/components/admin/Page'
import { Card, CardBody } from '@/components/admin/ui/Card'
import { Select, Input } from '@/components/admin/ui/Field'

type OrderOption = {
  id?: number
  name?: string
  price?: number
  quantity?: number
}

type AdminOrder = Order & {
  order_items?: {
    quantity: number
    options?: OrderOption[]
    foods?: { name: string } | null
    sides?: { name: string } | null
  }[]
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
  const [adminProfile, setAdminProfile] = useState<Pick<Profile, 'id' | 'role' | 'location'> | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)

    const currentAdmin = await getAdminProfile()
    setAdminProfile(currentAdmin)

    try {
      const rows = await fetchPaidOrders(currentAdmin)

      const userIds = Array.from(
        new Set(rows.map((row) => row.user_id).filter(Boolean))
      )

      const profileMap = new Map<
        string,
        { full_name?: string | null; phone_number?: string | null; email?: string | null }
      >()

      if (userIds.length > 0) {
        // Fetch profiles without 'email' since it's not in the public.profiles schema
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number')
          .in('id', userIds)

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
        } else {
          for (const p of profilesData as any[]) {
            profileMap.set(p.id, {
              full_name: p.full_name ?? null,
              phone_number: p.phone_number ?? null,
              email: null, // Email is not in profiles table
            })
          }
        }
      }

      const normalized: AdminOrder[] = rows.map((row) => ({
        ...row,
        profiles: profileMap.get(row.user_id) ?? null,
      }))

      setOrders(normalized)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
    setLoading(false)
  }

  const updateStatus = async (id: number, status: OrderStatus) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      if (!accessToken) {
        alert('You are not authenticated. Please sign in again.')
        return
      }

      const res = await fetch(
        `/api/orders/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        }
      )

      const text = await res.text()
      const parsed = (() => {
        try {
          return text ? JSON.parse(text) : null
        } catch {
          return null
        }
      })()

      if (!res.ok) {
        console.error(
          'Error updating status via backend API:',
          parsed ?? text
        )
        alert(parsed?.error || 'Error updating status')
        return
      }

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
      await fetchOrders()
    } catch (err) {
      console.error('Error updating status via backend API:', err)
      alert('Error updating status')
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
    // Check for JSONB items first (from 'items' column)
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      return order.items.map((item: any) => {
        const qty = item.quantity ?? 1
        const name = item.name || 'Item'
        const optionsNames = Array.isArray(item.options) && item.options.length
            ? ` (${item.options.map((o: any) => `${o.name} x${o.quantity || 1}`).filter(Boolean).join(', ')})`
            : ''
        return `${qty}x ${name}${optionsNames}`
      }).join(' • ')
    }

    const items = order.order_items

    if (!items || items.length === 0) return 'No items'

    return items
      .map((item) => {
        const qty = item.quantity ?? 1
        const baseName =
          item.foods?.name ||
          item.sides?.name ||
          'Item'

        const optionsNames =
          Array.isArray(item.options) && item.options.length
            ? ` (${item.options
                .map((opt: any) => `${opt?.name} x${opt?.quantity || 1}`)
                .filter(Boolean)
                .join(', ')})`
            : ''

        return `${qty}x ${baseName}${optionsNames}`
      })
      .join(' • ')
  }

  return (
    <Page>
      <PageHeader
        title="Orders"
        description="Paid orders only. Filter by status and date, then open details."
        actions={
          <>
          <Select
            className="w-full sm:w-auto"
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
          </Select>

          <Select
            className="w-full sm:w-auto"
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
          </Select>

          {dateFilter === 'custom' && (
            <Input
              type="date"
              className="w-full sm:w-auto"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          )}
          </>
        }
      />

      <Card>
        <CardBody className="p-0">
          <div className="admin-scroll overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm text-left">
            <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Note</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-sm text-zinc-500">Loading…</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-sm text-zinc-500">No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50/80">
                    <td className="px-6 py-3.5 font-medium">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-zinc-900 hover:underline">
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-brand-charcoal">
                        {order.profiles?.full_name || 'Unknown customer'}
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
                    <td className="px-6 py-4 text-xs font-medium">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 ring-1 ring-inset ${
                        order.location === 'Eromo' 
                          ? 'bg-purple-50 text-purple-700 ring-purple-600/20' 
                          : order.location === 'Chasemall'
                          ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                          : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                      }`}>
                        {order.location || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 ring-1 ring-inset ${
                          order.delivery_method === 'delivery'
                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                            : order.delivery_method === 'pickup'
                            ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
                            : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                        }`}
                      >
                        {order.delivery_method
                          ? order.delivery_method === 'delivery'
                            ? 'Delivery'
                            : 'Pickup'
                          : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {getItemsSummary(order)}
                    </td>
                    <td className="px-6 py-4 max-w-[12rem] text-xs text-gray-600">
                      {order.order_note?.trim() ? (
                        <span className="line-clamp-2" title={order.order_note}>
                          {order.order_note}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                        className="h-8 min-w-[7.5rem] text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="delivering">Delivering</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </Select>
                    </td>
                    <td className="px-6 py-3.5 tabular-nums">₦{Number(order.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </CardBody>
      </Card>
    </Page>
  )
}
