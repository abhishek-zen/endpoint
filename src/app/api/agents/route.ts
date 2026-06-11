import { NextRequest } from 'next/server'

export async function GET(_request: NextRequest) {
  const raw = process.env.AI_AGENTS ?? ''

  // Format: "Agent Name:agent-uuid", comma-separated
  const agents = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const colonIdx = entry.lastIndexOf(':')
      if (colonIdx > 0) {
        const name = entry.slice(0, colonIdx).trim()
        const id = entry.slice(colonIdx + 1).trim()
        return { id, name: name || id }
      }
      return { id: entry, name: entry }
    })

  return Response.json({ agents })
}



