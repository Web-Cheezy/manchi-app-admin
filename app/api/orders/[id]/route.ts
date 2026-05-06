import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const baseUrl =
      process.env.BACKEND_API_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      ''

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Backend API URL is not configured.' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing Authorization header.' },
        { status: 401 }
      )
    }

    const bodyText = await request.text()
    const { id } = await params
    const upstream = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/orders/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: bodyText,
      }
    )

    const upstreamText = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'

    return new NextResponse(upstreamText, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
