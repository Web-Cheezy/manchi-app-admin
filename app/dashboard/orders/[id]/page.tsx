'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Order, OrderItem, OrderStatus } from '@/types'
import { ArrowLeft, MapPin, Phone, User } from 'lucide-react'
import Link from 'next/link'

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

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true)
      
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

      // Fetch Profile for contact info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone, phone_number')
        .eq('id', orderData.user_id)
        .maybeSingle()

      setOrder({
        ...orderData,
        profiles: profileData ? {
          full_name: profileData.full_name,
          phone_number: profileData.phone_number || profileData.phone,
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
         // Fallback to JSONB items if order_items table is empty/unused
         const jsonItems: DetailedOrderItem[] = orderData.items.map((item: any, idx: number) => ({
             id: item.id || idx,
             order_id: orderData.id,
             food_id: item.food_id || 0,
             quantity: item.quantity || 1,
             price_at_time: item.price || 0,
             options: item.options || [],
             created_at: orderData.created_at,
             foods: { name: item.name || 'Item', image_url: item.image_url },
             sides: null
         }))
         setItems(jsonItems)
      } else {
        setItems([])
      }
      
      setLoading(false)
    }

    fetchOrderDetails()
  }, [id])

  if (loading) return <div className="p-8 text-center">Loading details...</div>
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

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="font-semibold">Order Items</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-6">
              <div className="flex items-start gap-4">
                {(item.foods?.image_url || item.sides?.image_url) && (
                  <img 
                    src={item.foods?.image_url || item.sides?.image_url} 
                    alt={item.foods?.name || item.sides?.name} 
                    className="h-16 w-16 rounded-md object-cover bg-gray-100" 
                  />
                )}
                <div>
                  <h4 className="font-medium text-gray-900">
                    {item.foods?.name || item.sides?.name || 'Unknown Item'}
                  </h4>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  {Array.isArray(item.options) && item.options.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.options.map((opt: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {opt.name} x{opt.quantity || 1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">₦{Number(item.price_at_time).toFixed(2)}</p>
                <p className="text-sm text-gray-500">Total: ₦{(Number(item.price_at_time) * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <span className="font-semibold">Total Amount</span>
          <span className="text-xl font-bold">₦{Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
