import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const endpoint = process.env.AI_ENDPOINT
  const apiKey = process.env.AI_API_KEY

  if (!endpoint || !apiKey) {
    return Response.json(
      { error: 'AI_ENDPOINT and AI_API_KEY environment variables are not configured.' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const { messages, model } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Invalid messages payload.' }, { status: 400 })
  }

  const requestBody: Record<string, unknown> = { messages, stream: true }
  if (model) requestBody.model = model

  let upstream: Response
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })
  } catch {
    return Response.json({ error: 'Failed to reach the AI endpoint.' }, { status: 502 })
  }

  if (!upstream.ok) {
    const text = await upstream.text()
    return Response.json({ error: text }, { status: upstream.status })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
