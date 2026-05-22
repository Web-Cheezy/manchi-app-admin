'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/admin/ui/Button'
import { Input } from '@/components/admin/ui/Field'
import { Card, CardBody } from '@/components/admin/ui/Card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      router.refresh()
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Left — banner in circle */}
      <div className="flex flex-col items-center justify-center bg-brand-charcoal px-6 py-10 text-white lg:w-1/2 lg:min-h-dvh lg:px-12">
        <Image
          src="/assets/lightmanchi.png"
          alt="Manchi"
          width={160}
          height={48}
          className="mb-6 h-10 w-auto object-contain sm:h-11"
          priority
        />

        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-full border-4 border-white/20 shadow-2xl sm:h-56 sm:w-56 lg:h-64 lg:w-64">
          <Image
            src="/assets/banner.jpg"
            alt="Manchi banner"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 192px, 256px"
          />
        </div>

        <h1 className="mt-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Operations
        </h1>
        <p className="mt-2 max-w-xs text-center text-sm text-zinc-400">
          Manage orders, delivery pricing, menu, and your team from one place.
        </p>
        <p className="mt-auto hidden pt-10 text-xs text-zinc-500 lg:block">© Manchi Admin</p>
      </div>

      {/* Right — sign in */}
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-zinc-900">Sign in</h2>
              <p className="mt-1 text-sm text-zinc-500">Admin access only</p>

              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <Button type="submit" variant="danger" size="lg" disabled={loading} className="w-full">
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
