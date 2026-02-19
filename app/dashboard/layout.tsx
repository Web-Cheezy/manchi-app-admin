import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50 text-brand-charcoal font-sans">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
