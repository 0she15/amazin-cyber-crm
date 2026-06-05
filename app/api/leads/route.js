import { NextResponse } from 'next/server'

// Server-only Supabase access via the service role key (bypasses RLS).
// This route is gated by the operator-auth middleware.

const CRM_STATUSES = ['New', 'Contacted', 'Proposal Sent', 'Won', 'Lost', 'Nurture']

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return { url, key, ok: Boolean(url && key) }
}

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

// Supabase row -> CRM lead shape
function toLead(r) {
  let status = r.status || 'New'
  if (!CRM_STATUSES.includes(status)) {
    // normalize inbound website value 'new' (and any stray casing) to 'New'
    const match = CRM_STATUSES.find((s) => s.toLowerCase() === String(status).toLowerCase())
    status = match || 'New'
  }
  return {
    id: r.id,
    name: r.name || '',
    company: r.company || '',
    email: r.email || '',
    phone: r.phone || '',
    package: r.package || '',
    source: r.source || '',
    status,
    notes: r.notes || '',
    nextActionDate: r.next_action_date || '',
    createdAt: r.created_at || '',
  }
}

// CRM lead shape -> Supabase columns.
// Only maps keys actually present in the input, so PATCH does partial updates
// and never nulls out fields the caller didn't send.
function toRow(b) {
  const row = {}
  const text = (v) => {
    const s = (v ?? '').toString().trim()
    return s === '' ? null : s
  }
  if ('name' in b) row.name = text(b.name)
  if ('company' in b) row.company = text(b.company)
  if ('email' in b) row.email = text(b.email)
  if ('phone' in b) row.phone = text(b.phone)
  if ('package' in b) row.package = text(b.package)
  if ('source' in b) row.source = text(b.source)
  if ('status' in b) row.status = b.status || 'New'
  if ('notes' in b) row.notes = text(b.notes)
  if ('nextActionDate' in b) row.next_action_date = b.nextActionDate ? b.nextActionDate : null
  return row
}

export async function GET() {
  const { url, key, ok } = env()
  if (!ok) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const resp = await fetch(`${url}/rest/v1/leads?select=*&order=created_at.desc`, {
    headers: headers(key),
    cache: 'no-store',
  })
  if (!resp.ok) {
    return NextResponse.json({ error: 'Fetch failed', detail: await resp.text() }, { status: 502 })
  }
  const rows = await resp.json()
  return NextResponse.json({ leads: rows.map(toLead) })
}

export async function POST(req) {
  const { url, key, ok } = env()
  if (!ok) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const body = await req.json()
  const row = toRow(body)
  if (body.id) row.id = body.id // accept client-generated uuid

  const resp = await fetch(`${url}/rest/v1/leads`, {
    method: 'POST',
    headers: { ...headers(key), Prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  if (!resp.ok) {
    return NextResponse.json({ error: 'Insert failed', detail: await resp.text() }, { status: 502 })
  }
  const [created] = await resp.json()
  return NextResponse.json({ lead: toLead(created) })
}

export async function PATCH(req) {
  const { url, key, ok } = env()
  if (!ok) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const resp = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(body.id)}`, {
    method: 'PATCH',
    headers: { ...headers(key), Prefer: 'return=representation' },
    body: JSON.stringify(toRow(body)),
  })
  if (!resp.ok) {
    return NextResponse.json({ error: 'Update failed', detail: await resp.text() }, { status: 502 })
  }
  const [updated] = await resp.json()
  return NextResponse.json({ lead: updated ? toLead(updated) : null })
}

export async function DELETE(req) {
  const { url, key, ok } = env()
  if (!ok) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const resp = await fetch(`${url}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(key),
  })
  if (!resp.ok) {
    return NextResponse.json({ error: 'Delete failed', detail: await resp.text() }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
