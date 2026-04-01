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
