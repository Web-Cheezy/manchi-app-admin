import { NextRequest, NextResponse } from 'next/server'

function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ''
  ).replace(/\/$/, '')
}

function getRequestOrigin(request: NextRequest): string {
  const host = request.headers.get('host')
  if (!host) return ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`.replace(/\/$/, '')
}

async function proxyAdmin(
  request: NextRequest,
  pathSegments: string[]
) {
  const baseUrl = getBackendBaseUrl()
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Backend API URL is not configured. Set BACKEND_URL to your manchicodes API (e.g. https://manchicodes.vercel.app).' },
      { status: 500 }
    )
  }

  const requestOrigin = getRequestOrigin(request)
  if (requestOrigin && baseUrl === requestOrigin) {
    return NextResponse.json(
      {
        error:
          'BACKEND_URL points to the admin app itself. Set BACKEND_URL to the manchicodes API host (e.g. https://manchicodes.vercel.app), not the admin panel URL.',
      },
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

  const path = pathSegments.map(encodeURIComponent).join('/')
  const search = request.nextUrl.search
  const upstreamUrl = `${baseUrl}/api/admin/${path}${search}`

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text()

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body,
  })

  const upstreamText = await upstream.text()
  const contentType = upstream.headers.get('content-type') || 'application/json'

  return new NextResponse(upstreamText || null, {
    status: upstream.status,
    headers: { 'Content-Type': contentType },
  })
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyAdmin(request, path)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyAdmin(request, path)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyAdmin(request, path)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyAdmin(request, path)
}
