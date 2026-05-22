import { cn } from '@/lib/cn'
import type { OrderStatus } from '@/types'

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  confirmed: 'bg-sky-50 text-sky-800 ring-sky-200/80',
  preparing: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  delivering: 'bg-indigo-50 text-indigo-800 ring-indigo-200/80',
  delivered: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  cancelled: 'bg-red-50 text-red-800 ring-red-200/80',
}

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const key = status as OrderStatus
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        statusStyles[key] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-200'
      )}
    >
      {status}
    </span>
  )
}
