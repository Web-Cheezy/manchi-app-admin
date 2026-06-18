import { supabase } from '@/utils/supabase/client'
import { AvailabilityStatus, DisplayPriceResult, OptionGroup, OptionGroupInput, OptionGroupUpdateResult, OptionSide, OptionSideInput } from '@/types'

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

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  if (!token) {
    throw new AdminApiError(401, 'Not authenticated')
  }

  const res = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const isHtml =
      typeof data === 'string' &&
      (data.trimStart().startsWith('<!DOCTYPE') || data.trimStart().startsWith('<html'))
    const message = isHtml
      ? 'Admin API returned a page instead of JSON. The manchicodes backend may be missing the /api/admin routes — redeploy https://manchicodes.vercel.app after a successful build, and set BACKEND_URL to that URL (no trailing slash).'
      : (data as { error?: string })?.error ||
        (data as { message?: string })?.message ||
        (typeof data === 'string' ? data : 'Request failed')
    throw new AdminApiError(res.status, message, data)
  }

  return data as T
}

export const adminApi = {
  getOptionGroups(foodId: number) {
    return adminFetch<{ option_groups: OptionGroup[] }>(
      `foods/${foodId}/option-groups`
    )
  },

  createOptionGroup(body: OptionGroupInput) {
    return adminFetch<OptionGroup>('option-groups', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateOptionGroup(id: number, body: Partial<OptionGroupInput>) {
    return adminFetch<OptionGroupUpdateResult>(`option-groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  setGroupDefaultSide(groupId: number, defaultSideId: number | null) {
    return adminFetch<OptionGroupUpdateResult>(`option-groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ default_side_id: defaultSideId }),
    })
  },

  refreshDisplayPrice(foodId: number) {
    return adminFetch<DisplayPriceResult>(`foods/${foodId}/display-price`, {
      method: 'POST',
    })
  },

  deleteOptionGroup(id: number) {
    return adminFetch<void>(`option-groups/${id}`, { method: 'DELETE' })
  },

  createSide(body: OptionSideInput) {
    return adminFetch<OptionSide>('sides', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateSide(body: { id: number } & Partial<OptionSideInput>) {
    return adminFetch<OptionSide>('sides', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  updateAvailability(body: {
    type: 'food' | 'side'
    id: number
    location: string
    status: AvailabilityStatus
  }) {
    return adminFetch<{ ok: boolean }>('availability', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },
}
