import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = 'https://manchi-app-api.vercel.app'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const apiKey = process.env.API_SECRET_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API_SECRET_KEY is not configured on the server' },
      { status: 500 }
    )
  }

  const body = await req.json()

  const upstreamResponse = await fetch(
    `${BACKEND_BASE_URL}/api/orders/${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    }
  )

  const text = await upstreamResponse.text()

  return new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type':
        upstreamResponse.headers.get('content-type') ?? 'application/json',
    },
  })
}

