import { cn } from '@/lib/cn'
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'neutral' | 'green' | 'red' | 'amber'
}) {
  const iconTone = {
    neutral: 'bg-zinc-100 text-zinc-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className={cn('rounded-lg p-2', iconTone)}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">
        {value}
      </p>
    </div>
  )
}
