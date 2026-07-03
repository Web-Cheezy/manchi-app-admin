'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/utils/supabase/client'
import {
  Order,
  OrderItem,
  Profile,
  formatNaira,
  getOrderItemDisplayName,
  getOrderItemLineTotal,
  getOrderItemSelections,
} from '@/types'
import { ArrowLeft, MapPin, MessageSquare, Phone, User } from 'lucide-react'
import Link from 'next/link'
import { isOrderPaid } from '@/utils/paidOrders'

type DetailedOrderItem = OrderItem & {
  foods?: {
    name: string
    image_url?: string
  } | null
  sides?: {
    name: string
    image_url?: string
  } | null
}

type DetailedOrder = Order & {
  profiles?: {
    full_name?: string | null
    phone_number?: string | null
    email?: string | null
  } | null
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<DetailedOrder | null>(null)
  const [items, setItems] = useState<DetailedOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [denyReason, setDenyReason] = useState<'location' | 'unpaid' | null>(null)

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true)
      setAccessDenied(false)
      setDenyReason(null)

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
      
      // Fetch Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()
      
      if (orderError || !orderData) {
        console.error('Error fetching order:', orderError)
        setLoading(false)
        return
      }

      if (
        currentAdmin?.role === 'admin' &&
        currentAdmin.location &&
        currentAdmin.location !== 'All' &&
        orderData.location !== currentAdmin.location
      ) {
        setDenyReason('location')
        setAccessDenied(true)
        setLoading(false)
        return
      }

      const paid = await isOrderPaid(Number(orderData.id))
      if (!paid) {
        setDenyReason('unpaid')
        setAccessDenied(true)
        setLoading(false)
        return
      }

      // Fetch Profile for contact info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', orderData.user_id)
        .maybeSingle()

      setOrder({
        ...orderData,
        profiles: profileData ? {
          full_name: profileData.full_name,
          phone_number: profileData.phone_number,
          email: null
        } : null,
      })

      // Fetch Items with Food and Side details
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*, foods(*), sides(*)')
        .eq('order_id', id)
      
      if (itemsError) {
        console.error('Error fetching items:', itemsError)
      }
      
      if (itemsData && itemsData.length > 0) {
        setItems(itemsData)
      } else if (orderData.items && Array.isArray(orderData.items)) {
        const jsonItems: DetailedOrderItem[] = orderData.items.map(
          (item: Record<string, unknown>, idx: number) => ({
            id: (item.id as number) || idx,
            order_id: orderData.id,
            food_id: (item.food_id as number) || 0,
            quantity: (item.quantity as number) || 1,
            price_at_time:
              (item.item_total as number) ||
              (item.base_price as number) ||
              (item.price as number) ||
              0,
            options: item.selections
              ? {
                  food_name: item.food_name,
                  base_price: item.base_price,
                  selections: item.selections,
                  item_total: item.item_total,
                }
              : item.options || item,
            created_at: orderData.created_at,
            foods: {
              name: (item.food_name as string) || (item.name as string) || 'Item',
              image_url: item.image_url as string | undefined,
            },
            sides: null,
          })
        )
        setItems(jsonItems)
      } else {
        setItems([])
      }
      
      setLoading(false)
    }

    fetchOrderDetails()
  }, [id])

  if (loading) return <div className="p-8 text-center">Loading details...</div>
  if (accessDenied) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-lg font-semibold text-brand-charcoal">Access denied</div>
        <div className="text-sm text-gray-500">
          {denyReason === 'unpaid'
            ? 'This order has not been paid for yet. Only verified payments appear in the admin dashboard.'
            : 'You can only view orders from your location.'}
        </div>
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center rounded-lg bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }
  if (!order) return <div className="p-8 text-center">Order not found</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        {order.delivery_method && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              order.delivery_method === 'delivery'
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {order.delivery_method === 'delivery' ? 'Delivery' : 'Pickup'}
          </span>
        )}
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            'bg-blue-100 text-blue-800'
          }`}>
          {order.status}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            Delivery Details
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500 block">Address</span>
              <span className="font-medium">{order.delivery_address}</span>
            </div>
            {order.delivery_lat && (
              <div>
                <span className="text-gray-500 block">Coordinates</span>
                <span className="font-mono">{order.delivery_lat}, {order.delivery_lng}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            Customer Info
          </h3>
          <div className="space-y-3 text-sm">
            {order.profiles?.full_name && (
              <div>
                <span className="text-gray-500 block">Name</span>
                <span className="font-medium">{order.profiles.full_name}</span>
              </div>
            )}
            {order.profiles?.phone_number && (
              <div>
                <span className="text-gray-500 block">Phone</span>
                <span className="font-medium">{order.profiles.phone_number}</span>
              </div>
            )}
            {order.profiles?.email && (
              <div>
                <span className="text-gray-500 block">Email</span>
                <span className="font-medium">{order.profiles.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-gray-500" />
          Order note
        </h3>
        {order.order_note?.trim() ? (
          <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{order.order_note}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No note from customer</p>
        )}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="font-semibold">Order Items</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const displayName = getOrderItemDisplayName(
              item.options,
              item.foods?.name || item.sides?.name || 'Unknown Item'
            )
            const selections = getOrderItemSelections(item.options)
            const lineTotal = getOrderItemLineTotal(
              item.options,
              Number(item.price_at_time),
              item.quantity
            )

            return (
              <div key={item.id} className="flex items-center justify-between p-6">
                <div className="flex items-start gap-4">
                  {(item.foods?.image_url || item.sides?.image_url) && (
                    <img
                      src={item.foods?.image_url || item.sides?.image_url}
                      alt={displayName}
                      className="h-16 w-16 rounded-md object-cover bg-gray-100"
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{displayName}</h4>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    {selections.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selections.map((sel, idx) => (
                          <p key={idx} className="text-xs text-gray-600">
                            {sel.group ? `${sel.group}: ` : ''}
                            {sel.name}
                            {sel.quantity > 1 ? ` ×${sel.quantity}` : ''}
                            {sel.price ? ` (+${formatNaira(sel.price)})` : ''}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatNaira(lineTotal / item.quantity)}</p>
                  <p className="text-sm text-gray-500">Total: {formatNaira(lineTotal)}</p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <span className="font-semibold">Total Amount</span>
          <span className="text-xl font-bold">{formatNaira(Number(order.total_amount))}</span>
        </div>
      </div>
    </div>
  )
}
