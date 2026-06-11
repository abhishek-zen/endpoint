import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const agentEndpoint = process.env.AI_AGENT_ENDPOINT
  const apiKey = process.env.AI_API_KEY

  if (!agentEndpoint || !apiKey) {
    return Response.json(
      { error: 'AI_AGENT_ENDPOINT and AI_API_KEY environment variables are not configured.' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const { messages, agent_id } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Invalid messages payload.' }, { status: 400 })
  }
  if (!agent_id) {
    return Response.json({ error: 'agent_id is required.' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(agentEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages,
        agent_id,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    })
  } catch {
    return Response.json({ error: 'Failed to reach the agent endpoint.' }, { status: 502 })
  }

  if (!upstream.ok) {
    const text = await upstream.text()
    return Response.json({ error: text }, { status: upstream.status })
  }

  // If agent endpoint streams SSE — pipe it directly
  if (upstream.headers.get('content-type')?.includes('text/event-stream')) {
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // If the agent endpoint returns plain JSON (no streaming), wrap it as SSE
  const data = await upstream.json()
  const content: string = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.delta?.content ?? ''
  const sse =
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n` +
    `data: [DONE]\n\n`

  return new Response(sse, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
