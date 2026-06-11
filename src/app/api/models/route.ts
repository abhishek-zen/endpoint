import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  const endpoint = process.env.AI_ENDPOINT
  const apiKey = process.env.AI_API_KEY

  if (!endpoint || !apiKey) {
    return Response.json(
      { error: 'AI_ENDPOINT and AI_API_KEY environment variables are not configured.' },
      { status: 500 }
    )
  }

  // Derive the /models URL from the configured endpoint.
  // Handles both base URLs (.../v1) and full chat URLs (.../v1/chat/completions).
  const base = endpoint.replace(/\/chat\/completions\/?$/, '').replace(/\/$/, '')
  const modelsUrl = `${base}/models`

  let upstream: Response
  try {
    upstream = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
  } catch {
    return Response.json({ error: 'Failed to reach the models endpoint.' }, { status: 502 })
  }

  if (!upstream.ok) {
    const text = await upstream.text()
    return Response.json({ error: text }, { status: upstream.status })
  }

  const data = await upstream.json()

  // Merge in any extra models specified via AI_EXTRA_MODELS env var
  const extra = (process.env.AI_EXTRA_MODELS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(id => ({ id, object: 'model', created: 0, owned_by: 'custom' }))

  if (extra.length > 0 && Array.isArray(data.data)) {
    const existingIds = new Set(data.data.map((m: { id: string }) => m.id))
    const newModels = extra.filter(m => !existingIds.has(m.id))
    data.data = [...data.data, ...newModels]
  }

  return Response.json(data)
}
