import { Food, AvailabilityStatus } from '@/types'
import { supabase } from '@/utils/supabase/client'

export const FOOD_VISIBILITY_LOCATIONS = ['Chasemall', 'Eromo'] as const

type FoodVisibilityLocation = (typeof FOOD_VISIBILITY_LOCATIONS)[number]

export function isFoodGloballyHidden(food: Pick<Food, 'is_available' | 'food_availability'>): boolean {
  const rows = (food.food_availability ?? []).filter((row) =>
    FOOD_VISIBILITY_LOCATIONS.includes(row.location as FoodVisibilityLocation)
  )

  if (rows.length === 0) {
    return !food.is_available
  }

  return rows.every((row) => row.status === 'unavailable')
}

export async function setGlobalFoodVisibility(
  foodIds: number[],
  status: Extract<AvailabilityStatus, 'available' | 'unavailable'>
): Promise<void> {
  const ids = Array.from(new Set(foodIds.filter((id) => Number.isFinite(id))))
  if (ids.length === 0) return

  const { data: existingRows, error: fetchError } = await supabase
    .from('food_availability')
    .select('id, food_id, location')
    .in('food_id', ids)
    .in('location', [...FOOD_VISIBILITY_LOCATIONS])

  if (fetchError) throw fetchError

  const existing = existingRows ?? []
  const existingIds = existing.map((row) => row.id).filter((id): id is number => Number.isFinite(id))
  const existingKeys = new Set(existing.map((row) => `${row.food_id}:${row.location}`))
  const missingRows = ids.flatMap((foodId) =>
    FOOD_VISIBILITY_LOCATIONS
      .filter((location) => !existingKeys.has(`${foodId}:${location}`))
      .map((location) => ({ food_id: foodId, location, status }))
  )

  if (existingIds.length > 0) {
    const { error } = await supabase
      .from('food_availability')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', existingIds)

    if (error) throw error
  }

  if (missingRows.length > 0) {
    const { error } = await supabase.from('food_availability').insert(missingRows)
    if (error) throw error
  }

  const { error: legacyError } = await supabase
    .from('foods')
    .update({ is_available: status === 'available' })
    .in('id', ids)

  if (legacyError) throw legacyError
}
