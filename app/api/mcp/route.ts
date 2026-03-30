/**
 * LeadAPI Remote MCP Server
 * -------------------------
 * Implements the MCP HTTP+SSE transport so Claude.ai (and other MCP clients)
 * can connect to LeadAPI as a remote MCP server.
 *
 * Endpoints:
 *   GET  /api/mcp          — SSE stream (client listens for server events)
 *   POST /api/mcp          — JSON-RPC messages from the client
 *
 * Auth: the client passes the user's LeadAPI key as a Bearer token in the
 * Authorization header. Claude.ai prompts the user for it during setup.
 *
 * Add to Claude.ai:
 *   Settings → Integrations → Add MCP Server
 *   URL: https://your-app.vercel.app/api/mcp
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const sbHeaders = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
}

// ---------------------------------------------------------------------------
// Auth helper — validate Bearer token (LeadAPI key)
// ---------------------------------------------------------------------------

async function resolveApiKey(req: NextRequest): Promise<{ id: string } | null> {
  const auth = req.headers.get('authorization') ?? ''
  const key  = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!key) return null

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/api_keys?key=eq.${encodeURIComponent(key)}&select=id,requests_used,requests_limit&limit=1`,
      { headers: sbHeaders, cache: 'no-store' }
    )
    if (!res.ok) return null
    const rows = await res.json()
    const row = rows[0]
    if (!row) return null
    if (row.requests_used >= row.requests_limit) return null
    return { id: row.id }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// API proxy helper — calls the real LeadAPI routes internally
// ---------------------------------------------------------------------------

async function callLeadApi(
  path: string,
  body: Record<string, unknown>,
  apiKeyId: string
): Promise<unknown> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Pass the resolved key id directly so middleware is bypassed internally
      'x-api-key-id': apiKeyId,
      // We also need a valid x-api-key to pass middleware — use a sentinel
      'x-mcp-internal': '1',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ---------------------------------------------------------------------------
// Tool definitions (MCP schema)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'leads_find',
    description: 'Scrape business listings from Google Maps for a given area or niche. Returns saved lead records.',
    inputSchema: {
      type: 'object',
      properties: {
        area:       { type: 'string',  description: 'Search query, e.g. "coffee shops London"' },
        limit:      { type: 'number',  description: '1–50, default 20' },
        no_website: { type: 'boolean', description: 'If true, only return businesses with no website' },
      },
      required: ['area'],
    },
  },
  {
    name: 'leads_osint_enrich',
    description: 'Enrich a lead with publicly available data — emails, employees, subdomains, and tech stack.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id:      { type: 'string', description: 'UUID from leads_find' },
        domain:       { type: 'string', description: 'Optional domain override' },
        company_name: { type: 'string', description: 'Optional company name override' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'leads_social_analyze',
    description: "Analyze a lead's social profiles — followers, activity level, and suggested outreach action.",
    inputSchema: {
      type: 'object',
      properties: {
        lead_id:     { type: 'string',                     description: 'UUID from leads_find' },
        social_urls: { type: 'array', items: { type: 'string' }, description: 'Optional social URLs to visit' },
        platform:    { type: 'string', enum: ['instagram', 'twitter', 'linkedin'] },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'leads_website_analyze',
    description: "Extract contact info, social links, menu pages, and best outreach channel from a lead's website.",
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID from leads_find' },
        url:     { type: 'string', description: 'Optional website URL override' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'leads_intelligence',
    description: 'Full intelligence pipeline: OSINT + social + website analysis + AI insights in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id:      { type: 'string' },
        domain:       { type: 'string' },
        company_name: { type: 'string' },
        social_urls:  { type: 'array', items: { type: 'string' } },
        website_url:  { type: 'string' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'messages_generate',
    description: 'Generate a personalised AI outreach message for a lead.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id:       { type: 'string' },
        template:      { type: 'string', enum: ['cold_outreach', 'follow_up', 'partnership', 'custom'] },
        tone:          { type: 'string', enum: ['professional', 'casual', 'friendly', 'direct'] },
        campaign_type: { type: 'string' },
        custom_prompt: { type: 'string' },
      },
      required: ['lead_id', 'template', 'tone'],
    },
  },
  {
    name: 'messages_send',
    description: 'Send an approved outreach message via platform automation (e.g. Instagram DM).',
    inputSchema: {
      type: 'object',
      properties: {
        message_id:   { type: 'string', description: 'UUID from messages_generate' },
        scheduled_at: { type: 'string', description: 'ISO 8601 datetime or omit to send immediately' },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'credentials_save',
    description: 'Store encrypted platform session credentials. Required before sending messages.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['instagram', 'twitter', 'linkedin'] },
        value:    { type: 'string', description: 'Session token or cookie value' },
      },
      required: ['platform', 'value'],
    },
  },
]

// ---------------------------------------------------------------------------
// Tool router
// ---------------------------------------------------------------------------

async function runTool(name: string, args: Record<string, unknown>, apiKeyId: string): Promise<unknown> {
  switch (name) {
    case 'leads_find':
      return callLeadApi('/api/v1/leads/find', {
        area: args.area,
        limit: args.limit,
        filters: args.no_website ? { no_website: true } : undefined,
      }, apiKeyId)

    case 'leads_osint_enrich':
      return callLeadApi('/api/v1/leads/osint-enrich', args, apiKeyId)

    case 'leads_social_analyze':
      return callLeadApi('/api/v1/leads/social-analyze', args, apiKeyId)

    case 'leads_website_analyze':
      return callLeadApi('/api/v1/leads/website-analyze', args, apiKeyId)

    case 'leads_intelligence':
      return callLeadApi('/api/v1/leads/intelligence', args, apiKeyId)

    case 'messages_generate':
      return callLeadApi('/api/v1/messages/generate', args, apiKeyId)

    case 'messages_send':
      return callLeadApi('/api/v1/messages/send', args, apiKeyId)

    case 'credentials_save':
      return callLeadApi('/api/v1/credentials', args, apiKeyId)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC handler
// ---------------------------------------------------------------------------

type RpcRequest = {
  jsonrpc: '2.0'
  id: number | string | null
  method: string
  params?: Record<string, unknown>
}

async function handleRpc(req: RpcRequest, apiKeyId: string): Promise<unknown> {
  const { id, method, params } = req

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'leadapi', version: '1.0.0' },
      },
    }
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
  }

  if (method === 'tools/call') {
    const toolName = params?.name as string
    const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>
    try {
      const result = await runTool(toolName, toolArgs, apiKeyId)
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      }
    } catch (err) {
      return {
        jsonrpc: '2.0', id,
        error: { code: -32000, message: err instanceof Error ? err.message : String(err) },
      }
    }
  }

  // notifications have no id — don't respond
  if (id === undefined || id === null) return null

  return {
    jsonrpc: '2.0', id,
    error: { code: -32601, message: `Method not found: ${method}` },
  }
}

// ---------------------------------------------------------------------------
// GET — SSE stream
// Keeps the connection open so the MCP client can receive server-initiated
// messages. Claude.ai opens this first, then sends JSON-RPC via POST.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const keyRecord = await resolveApiKey(req)
  if (!keyRecord) {
    return NextResponse.json({ error: 'Invalid or missing API key', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial endpoint event so the client knows where to POST
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      controller.enqueue(
        encoder.encode(`event: endpoint\ndata: ${appUrl}/api/mcp\n\n`)
      )
      // Keep alive — send a comment every 25 s
      const iv = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(iv)
        }
      }, 25_000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// ---------------------------------------------------------------------------
// POST — JSON-RPC messages from the client
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const keyRecord = await resolveApiKey(req)
  if (!keyRecord) {
    return NextResponse.json({ error: 'Invalid or missing API key', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    )
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(
      body.map(r => handleRpc(r as RpcRequest, keyRecord.id))
    )
    const responses = results.filter(Boolean)
    return NextResponse.json(responses, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  const result = await handleRpc(body as RpcRequest, keyRecord.id)
  if (result === null) {
    return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  return NextResponse.json(result, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
