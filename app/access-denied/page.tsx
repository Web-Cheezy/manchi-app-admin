import Link from 'next/link'
import { Button } from '@/components/admin/ui/Button'
import { Card, CardBody } from '@/components/admin/ui/Card'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 p-6">
      <Card className="w-full max-w-md">
        <CardBody className="text-center">
          <h1 className="text-lg font-semibold text-zinc-900">Access denied</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This account cannot use the admin panel.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="danger">Back to sign in</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  )
}
