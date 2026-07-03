'use client'

import { useEffect, useState } from 'react'
import { formatNaira, transactionAmountInNaira } from '@/types'
import { Banknote, CheckCircle } from 'lucide-react'
import { Page, PageHeader } from '@/components/admin/Page'
import { StatCard } from '@/components/admin/StatCard'
import { Card, CardBody, CardHeader } from '@/components/admin/ui/Card'
import { getAdminProfile, shouldFilterByLocation } from '@/utils/adminLocation'
import {
  extractOrderIdFromMetadata,
  fetchVerifiedTransactions,
  type TransactionRow,
} from '@/utils/paidOrders'
import Link from 'next/link'

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const profile = await getAdminProfile()

      if (shouldFilterByLocation(profile)) {
        setLocationLabel(profile.location)
      } else {
        setLocationLabel(null)
      }

      try {
        const rows = await fetchVerifiedTransactions(profile)
        setTransactions(rows)
      } catch (error) {
        console.error('Error fetching transactions:', error)
      }
      setLoading(false)
    })()
  }, [])

  const totalRevenue = transactions.reduce(
    (sum, tx) => sum + transactionAmountInNaira(Number(tx.amount)),
    0
  )

  return (
    <Page>
      <PageHeader
        title="Payments"
        description={
          locationLabel
            ? `Verified Paystack payments for ${locationLabel} only.`
            : 'Verified Paystack payments across all locations.'
        }
      />

      <StatCard
        label={locationLabel ? `Total revenue (${locationLabel})` : 'Total revenue'}
        value={formatNaira(totalRevenue)}
        icon={Banknote}
        tone="green"
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-zinc-900">Verified payments</h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">
              No verified payments yet. Orders appear here after Paystack returns success and
              metadata includes the order id.
            </p>
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3">Order</th>
                    {!locationLabel && <th className="px-6 py-3">Location</th>}
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {transactions.map((tx) => {
                    const orderId = extractOrderIdFromMetadata(tx.metadata)
                    return (
                      <tr key={tx.id ?? tx.reference} className="hover:bg-zinc-50/80">
                        <td className="px-6 py-3.5 font-mono text-xs text-zinc-600">
                          {tx.reference}
                        </td>
                        <td className="px-6 py-3.5 font-medium">
                          {orderId !== null ? (
                            <Link
                              href={`/dashboard/orders/${orderId}`}
                              className="text-zinc-900 hover:underline"
                            >
                              #{orderId}
                            </Link>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        {!locationLabel && (
                          <td className="px-6 py-3.5 text-zinc-600">{tx.location ?? '—'}</td>
                        )}
                        <td className="px-6 py-3.5 text-zinc-600">{tx.email}</td>
                        <td className="px-6 py-3.5 text-zinc-500">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle className="h-4 w-4" aria-hidden />
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-zinc-900">
                          {formatNaira(transactionAmountInNaira(Number(tx.amount)))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </Page>
  )
}
