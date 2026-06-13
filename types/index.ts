export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'
export type AvailabilityStatus = 'available' | 'out_of_stock' | 'unavailable'

export interface Order {
  id: number
  user_id: string
  status: OrderStatus
  total_amount: number
  delivery_address: string
  delivery_lat?: number
  delivery_lng?: number
  created_at: string
  items?: any[] // JSONB column from orders table
  location?: string
  delivery_method?: 'delivery' | 'pickup'
}

export interface OrderItem {
  id: number
  order_id: number
  food_id: number
  quantity: number
  price_at_time: number
  options?: any
  created_at: string
  foods?: any // Joined data (Food)
}

export interface Category {
  id: number
  name: string
  created_at: string
}

export interface Food {
  id: number
  category_id: number
  name: string
  description?: string
  price: number
  display_price?: number | null
  image_url?: string
  is_available: boolean // Deprecated in favor of food_availability table status
  created_at: string
  categories?: Category
  food_availability?: FoodAvailability[]
}

export interface FoodAvailability {
  id: number
  food_id: number
  location: 'Eromo' | 'Chasemall'
  status: AvailabilityStatus
  updated_at: string
}

export interface Side {
  id: number
  name: string
  price: number
  type?: string
  image_url?: string
  created_at: string
  side_availability?: SideAvailability[]
}

export interface SideAvailability {
  id: number
  side_id: number
  location: 'Eromo' | 'Chasemall'
  status: AvailabilityStatus
  updated_at: string
}

export interface Profile {
  id: string
  full_name?: string
  phone_number?: string
  email?: string
  role?: 'super_admin' | 'admin' | 'customer'
  location?: 'Chasemall' | 'Eromo' | 'All'
}

export interface Transaction {
  id: number
  created_at: string
  reference: string
  email: string
  amount: number
  status: string
  user_id?: string | null
  metadata?: Record<string, unknown> | null
  location?: string | null
}

export const PAID_TRANSACTION_STATUSES = ['success', 'completed'] as const

export function isPaidTransaction(status: string): boolean {
  return PAID_TRANSACTION_STATUSES.includes(
    status.toLowerCase() as (typeof PAID_TRANSACTION_STATUSES)[number]
  )
}

/** Paystack stores transaction amounts in kobo; orders.total_amount is in naira. */
export function transactionAmountInNaira(amount: number): number {
  return Number(amount) / 100
}

export function formatNaira(amount: number): string {
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Postgres numeric often arrives as string in JSON — coerce safely for pricing UI. */
export function parseFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Required groups must be chosen at checkout; their included option is part of menu price. */
export function isRequiredOptionGroup(group: Pick<OptionGroup, 'is_required' | 'min_selections'>): boolean {
  const min = Math.max(0, Number(group.min_selections ?? 0))
  return Boolean(group.is_required) || min > 0
}

/** Menu price = base + each group's admin-selected default_side_id (mirrors backend + display_pricing.sql). */
export function computeMenuDisplayPrice(basePrice: unknown, groups: OptionGroup[]): number {
  const base = parseFiniteNumber(basePrice) ?? 0
  let total = base
  for (const group of groups) {
    const defaultId = parseFiniteNumber(group.default_side_id)
    if (defaultId === null) continue
    const defaultSide = (group.sides ?? []).find((s) => Number(s.id) === defaultId)
    if (defaultSide) total += parseFiniteNumber(defaultSide.price) ?? 0
  }
  return total
}

export interface OptionSide {
  id: number
  name: string
  price: number
  option_group_id?: number
  image_url?: string | null
  is_pricing_default?: boolean
  price_delta?: number
}

export interface OptionGroup {
  id: number
  food_id: number
  name: string
  min_selections: number
  max_selections: number
  is_required: boolean
  display_order: number
  default_side_id?: number | null
  sides?: OptionSide[]
}

export interface OptionGroupInput {
  food_id: number
  name: string
  min_selections: number
  max_selections: number
  is_required: boolean
  display_order: number
  default_side_id?: number | null
}

export interface OptionGroupUpdateResult extends OptionGroup {
  food_display_price?: number
}

export interface DisplayPriceResult {
  food_id: number
  display_price: number
}

export interface OptionSideInput {
  name: string
  price: number
  option_group_id: number
  image_url?: string
}

/** Snapshot stored on order_items.options after Chowdeck-style checkout */
export interface OrderItemSelection {
  group_id?: number
  group?: string
  item_id?: number
  name: string
  price: number
  quantity: number
}

export interface OrderItemOptionsSnapshot {
  food_id?: number
  food_name?: string
  base_price?: number
  selections?: OrderItemSelection[]
  item_total?: number
  /** Legacy flat options */
  name?: string
  price?: number
  quantity?: number
  id?: number
}

export function getOrderItemDisplayName(options: unknown, fallback = 'Item'): string {
  if (!options || typeof options !== 'object') return fallback
  const snap = options as OrderItemOptionsSnapshot
  return snap.food_name || snap.name || fallback
}

export function getOrderItemSelections(options: unknown): OrderItemSelection[] {
  if (!options || typeof options !== 'object') return []
  const snap = options as OrderItemOptionsSnapshot
  if (Array.isArray(snap.selections) && snap.selections.length > 0) {
    return snap.selections
  }
  if (Array.isArray(options)) {
    return (options as OrderItemSelection[]).filter((o) => o?.name)
  }
  return []
}

export function getOrderItemLineTotal(
  options: unknown,
  priceAtTime: number,
  quantity: number
): number {
  if (!options || typeof options !== 'object') {
    return priceAtTime * quantity
  }
  const snap = options as OrderItemOptionsSnapshot
  if (typeof snap.item_total === 'number') {
    return snap.item_total * quantity
  }
  return priceAtTime * quantity
}
