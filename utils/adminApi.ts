import {
  AvailabilityStatus,
  OptionGroupInput,
  OptionGroupUpdateResult,
  OptionSide,
  OptionSideInput,
} from '@/types'
import * as menuOptions from '@/utils/menuOptions'

export class AdminApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.body = body
  }
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Request failed'
    throw new AdminApiError(500, message, err)
  })
}

export const adminApi = {
  getOptionGroups(foodId: number) {
    return wrap(async () => {
      const option_groups = await menuOptions.fetchOptionGroupsForFood(foodId)
      return { option_groups }
    })
  },

  createOptionGroup(body: OptionGroupInput) {
    return wrap(() => menuOptions.createOptionGroup(body))
  },

  updateOptionGroup(id: number, body: Partial<OptionGroupInput>) {
    return wrap(() => menuOptions.updateOptionGroup(id, body))
  },

  setGroupDefaultSide(groupId: number, defaultSideId: number | null) {
    return wrap(() => menuOptions.updateOptionGroup(groupId, { default_side_id: defaultSideId }))
  },

  refreshDisplayPrice(foodId: number) {
    return wrap(() => menuOptions.refreshFoodDisplayPrice(foodId))
  },

  deleteOptionGroup(id: number) {
    return wrap(async () => {
      await menuOptions.deleteOptionGroup(id)
    })
  },

  createSide(body: OptionSideInput) {
    return wrap(() => menuOptions.createSide(body))
  },

  updateSide(body: { id: number } & Partial<OptionSideInput>) {
    return wrap(() => menuOptions.updateSide(body))
  },

  updateAvailability(body: {
    type: 'food' | 'side'
    id: number
    location: string
    status: AvailabilityStatus
  }) {
    return wrap(() => menuOptions.updateAvailability(body))
  },
}
