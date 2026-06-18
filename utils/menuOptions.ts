import { supabase } from '@/utils/supabase/client'
import {
  AvailabilityStatus,
  computeMenuDisplayPrice,
  DisplayPriceResult,
  OptionGroup,
  OptionGroupInput,
  OptionGroupUpdateResult,
  OptionSide,
  OptionSideInput,
  parseFiniteNumber,
} from '@/types'

function dbError(error: { message: string; code?: string }, fallback: string): Error {
  return new Error(error.message || fallback)
}

function enrichGroupPricing(group: OptionGroup): OptionGroup {
  const defaultId = parseFiniteNumber(group.default_side_id)
  const sides = group.sides ?? []

  let baselinePrice = 0
  if (defaultId !== null) {
    const defaultSide = sides.find((s) => Number(s.id) === defaultId)
    baselinePrice = parseFiniteNumber(defaultSide?.price) ?? 0
  }

  return {
    ...group,
    sides: sides.map((side) => {
      const price = parseFiniteNumber(side.price) ?? 0
      const isDefault = defaultId !== null && Number(side.id) === defaultId
      const priceDelta = defaultId !== null ? price - baselinePrice : price
      return { ...side, is_pricing_default: isDefault, price_delta: priceDelta }
    }),
  }
}

export async function fetchOptionGroupsForFood(foodId: number): Promise<OptionGroup[]> {
  const { data: groupsRaw, error: groupsError } = await supabase
    .from('option_groups')
    .select('*')
    .eq('food_id', foodId)
    .order('display_order', { ascending: true })

  if (groupsError) throw dbError(groupsError, 'Failed to load option groups')

  const groups = (groupsRaw ?? []) as OptionGroup[]
  if (groups.length === 0) return []

  const groupIds = groups.map((g) => g.id)
  const { data: sidesRaw, error: sidesError } = await supabase
    .from('sides')
    .select('id,name,price,option_group_id,image_url')
    .in('option_group_id', groupIds)

  if (sidesError) throw dbError(sidesError, 'Failed to load sides')

  const sidesByGroup = new Map<number, OptionSide[]>()
  for (const side of sidesRaw ?? []) {
    const groupId = Number(side.option_group_id)
    if (!Number.isFinite(groupId)) continue
    const list = sidesByGroup.get(groupId) ?? []
    list.push(side as OptionSide)
    sidesByGroup.set(groupId, list)
  }

  return groups.map((group) =>
    enrichGroupPricing({
      ...group,
      sides: sidesByGroup.get(group.id) ?? [],
    })
  )
}

async function validateDefaultSide(groupId: number, sideId: number): Promise<void> {
  const { data: side, error } = await supabase
    .from('sides')
    .select('id, option_group_id')
    .eq('id', sideId)
    .maybeSingle()

  if (error) throw dbError(error, 'Failed to validate default side')
  if (!side) throw new Error('Side not found')
  if (Number(side.option_group_id) !== groupId) {
    throw new Error('Side does not belong to this option group')
  }
}

export async function refreshFoodDisplayPrice(foodId: number): Promise<DisplayPriceResult> {
  const { data: food, error: foodError } = await supabase
    .from('foods')
    .select('id, price')
    .eq('id', foodId)
    .single()

  if (foodError) throw dbError(foodError, 'Failed to load food')

  const groups = await fetchOptionGroupsForFood(foodId)
  const displayPrice = computeMenuDisplayPrice(food.price, groups)

  const { error: updateError } = await supabase
    .from('foods')
    .update({ display_price: displayPrice })
    .eq('id', foodId)

  if (updateError) throw dbError(updateError, 'Failed to update display price')

  return { food_id: foodId, display_price: displayPrice }
}

export async function createOptionGroup(body: OptionGroupInput): Promise<OptionGroup> {
  const { data, error } = await supabase
    .from('option_groups')
    .insert([
      {
        food_id: body.food_id,
        name: body.name.trim(),
        min_selections: body.min_selections,
        max_selections: body.max_selections,
        is_required: body.is_required,
        display_order: body.display_order,
      },
    ])
    .select()
    .single()

  if (error) throw dbError(error, 'Failed to create option group')
  return { ...(data as OptionGroup), sides: [] }
}

export async function updateOptionGroup(
  id: number,
  body: Partial<OptionGroupInput> & { default_side_id?: number | null }
): Promise<OptionGroupUpdateResult> {
  const updatePayload: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) updatePayload.name = body.name.trim()
  if (body.min_selections !== undefined) updatePayload.min_selections = body.min_selections
  if (body.max_selections !== undefined) updatePayload.max_selections = body.max_selections
  if (body.is_required !== undefined) updatePayload.is_required = body.is_required
  if (body.display_order !== undefined) updatePayload.display_order = body.display_order

  if (body.default_side_id !== undefined) {
    if (body.default_side_id === null) {
      updatePayload.default_side_id = null
    } else {
      await validateDefaultSide(id, body.default_side_id)
      updatePayload.default_side_id = body.default_side_id
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No fields to update')
  }

  const { data, error } = await supabase
    .from('option_groups')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw dbError(error, 'Failed to update option group')

  const foodId = Number(data.food_id)
  let foodDisplayPrice: number | null = null
  if (Number.isFinite(foodId)) {
    const refreshed = await refreshFoodDisplayPrice(foodId)
    foodDisplayPrice = refreshed.display_price
  }

  return { ...(data as OptionGroup), food_display_price: foodDisplayPrice ?? undefined }
}

export async function deleteOptionGroup(id: number): Promise<void> {
  const { data: group } = await supabase
    .from('option_groups')
    .select('food_id')
    .eq('id', id)
    .maybeSingle()

  const { error: unlinkError } = await supabase
    .from('sides')
    .update({ option_group_id: null })
    .eq('option_group_id', id)

  if (unlinkError) throw dbError(unlinkError, 'Failed to unlink sides')

  const { error } = await supabase.from('option_groups').delete().eq('id', id)
  if (error) throw dbError(error, 'Failed to delete option group')

  if (group?.food_id) {
    await refreshFoodDisplayPrice(Number(group.food_id))
  }
}

export async function createSide(body: OptionSideInput): Promise<OptionSide> {
  const { data: group, error: groupError } = await supabase
    .from('option_groups')
    .select('id, food_id')
    .eq('id', body.option_group_id)
    .maybeSingle()

  if (groupError) throw dbError(groupError, 'Failed to load option group')
  if (!group) throw new Error('Option group not found')

  const payload: Record<string, unknown> = {
    name: body.name.trim(),
    price: body.price,
    option_group_id: body.option_group_id,
    type: 'standard',
  }
  if (body.image_url?.trim()) payload.image_url = body.image_url.trim()

  const { data, error } = await supabase.from('sides').insert([payload]).select().single()
  if (error) throw dbError(error, 'Failed to create side')

  await supabase
    .from('food_sides')
    .upsert(
      { food_id: group.food_id, side_id: data.id, is_required: false },
      { onConflict: 'food_id,side_id' }
    )

  await refreshFoodDisplayPrice(Number(group.food_id))

  return data as OptionSide
}

export async function updateSide(body: { id: number } & Partial<OptionSideInput>): Promise<OptionSide> {
  const updatePayload: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updatePayload.name = body.name.trim()
  if (body.price !== undefined) updatePayload.price = body.price
  if (body.option_group_id !== undefined) updatePayload.option_group_id = body.option_group_id
  if (body.image_url !== undefined) updatePayload.image_url = body.image_url

  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No fields to update')
  }

  const { data, error } = await supabase
    .from('sides')
    .update(updatePayload)
    .eq('id', body.id)
    .select()
    .single()

  if (error) throw dbError(error, 'Failed to update side')

  const { data: group } = await supabase
    .from('option_groups')
    .select('food_id')
    .eq('id', data.option_group_id)
    .maybeSingle()

  if (group?.food_id) {
    await refreshFoodDisplayPrice(Number(group.food_id))
  }

  return data as OptionSide
}

export async function updateAvailability(body: {
  type: 'food' | 'side'
  id: number
  location: string
  status: AvailabilityStatus
}): Promise<{ ok: boolean }> {
  const table = body.type === 'food' ? 'food_availability' : 'side_availability'
  const idColumn = body.type === 'food' ? 'food_id' : 'side_id'

  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('id')
    .eq(idColumn, body.id)
    .eq('location', body.location)
    .maybeSingle()

  if (fetchError) throw dbError(fetchError, 'Failed to load availability')

  if (existing?.id) {
    const { error } = await supabase
      .from(table)
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', existing.id)

    if (error) throw dbError(error, 'Failed to update availability')
    return { ok: true }
  }

  const { error } = await supabase
    .from(table)
    .insert([{ [idColumn]: body.id, location: body.location, status: body.status }])

  if (error) throw dbError(error, 'Failed to create availability row')
  return { ok: true }
}
