'use client'

import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-beige/30">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl border border-gray-100 text-center">
        <h1 className="text-2xl font-bold text-brand-charcoal">Access Denied</h1>
        <p className="text-sm text-gray-600">
          You do not have permission to access the admin dashboard with this account.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-red-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 transition-all"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}

