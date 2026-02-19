import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
}

export function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all hover:shadow-xl">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className={`rounded-full p-2 ${color.replace('text-', 'bg-')}/10`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-brand-charcoal">{value}</div>
    </div>
  )
}
