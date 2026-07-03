import { supabase } from '@/utils/supabase/client'
import { Order, PAID_TRANSACTION_STATUSES, isPaidTransaction } from '@/types'
import { AdminProfile, applyLocationFilter } from '@/utils/adminLocation'

export type TransactionRow = {
  id: number
  reference: string
  email: string
  amount: number
  status: string
  user_id?: string | null
  metadata?: Record<string, unknown> | null
  location?: string | null
  created_at: string
}

/** Read order id from Paystack / transactions metadata (orderId, order_id, etc.). */
export function extractOrderIdFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  const raw = m.orderId ?? m.order_id ?? m.orderID ?? m.order
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Order ids with a successful Paystack transaction linked via metadata. */
export async function fetchPaidOrderIds(): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('transactions')
    .select('metadata, status')

  if (error) throw error

  const ids = new Set<number>()
  for (const row of data ?? []) {
    if (!isPaidTransaction(String(row.status ?? ''))) continue
    const orderId = extractOrderIdFromMetadata(row.metadata)
    if (orderId !== null) ids.add(orderId)
  }
  return ids
}

export async function isOrderPaid(orderId: number): Promise<boolean> {
  const paid = await fetchPaidOrderIds()
  return paid.has(orderId)
}

/** Orders that have a verified payment (transactions.status = success/completed). */
export async function fetchPaidOrders(profile: AdminProfile | null): Promise<Order[]> {
  const paidIds = await fetchPaidOrderIds()
  if (paidIds.size === 0) return []

  let query = supabase
    .from('orders')
    .select('*')
    .in('id', Array.from(paidIds))
    .order('created_at', { ascending: false })

  query = applyLocationFilter(query, profile)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Order[]
}

/** Verified Paystack transactions for the payments view. */
export async function fetchVerifiedTransactions(
  profile: AdminProfile | null
): Promise<TransactionRow[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .in('status', [...PAID_TRANSACTION_STATUSES])
    .order('created_at', { ascending: false })

  query = applyLocationFilter(query, profile)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as TransactionRow[]
}
