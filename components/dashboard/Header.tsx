export function Header() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-100 bg-white px-6 shadow-sm sm:px-8 lg:px-10">
      <div className="flex items-center">
        <h2 className="text-xl font-bold text-brand-charcoal">Dashboard</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-full bg-gray-50 px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer">
           <div className="h-8 w-8 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow font-bold">
              A
           </div>
           <span className="text-sm font-medium text-brand-charcoal">Admin User</span>
        </div>
      </div>
    </header>
  )
}
