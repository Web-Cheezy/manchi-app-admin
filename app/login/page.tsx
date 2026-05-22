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
    <div className="flex min-h-dvh flex-col bg-zinc-50 lg:flex-row">
      <div className="hidden flex-1 flex-col justify-between bg-brand-charcoal p-10 text-white lg:flex">
        <Image
          src="/assets/lightmanchi.png"
          alt="Manchi"
          width={160}
          height={48}
          className="h-10 w-auto brightness-0 invert"
          priority
        />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Operations</h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Manage orders, delivery pricing, menu, and your team from one place.
          </p>
        </div>
        <p className="text-xs text-zinc-500">© Manchi Admin</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <Image
              src="/assets/lightmanchi.png"
              alt="Manchi"
              width={140}
              height={42}
              className="mx-auto h-10 w-auto"
              priority
            />
          </div>

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
