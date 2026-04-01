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
    description: 'Scrape Google Maps for local businesses matching a search query and location. Returns business records saved to your leads database. Pass "area" as a combined query+location string (e.g. "pizza restaurants New York" or "dentists London"). Optional: "limit" (1–50, default 20), "no_website" (boolean, only return businesses with no website). Returns: id, name, username, profile_url, platform, metadata, created_at for each lead. → next step: call leads_intelligence with the returned lead id for full enrichment.',
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
    description: 'Enrich a lead with publicly available data using theHarvester OSINT tool. Returns discovered emails, employee names, subdomains, and tech stack (e.g. Shopify, WordPress, Stripe). Pass "lead_id" (UUID from leads_find). Optional: "domain" to override the domain used for OSINT lookup, "company_name" to override the company name. → next step: call messages_generate with the lead_id to write an outreach message.',
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
    description: "Analyze a lead's social media profile to get follower count, post frequency, engagement rate, activity level, and a suggested outreach action. Uses browser automation via Playwright to visit the profile. Pass \"lead_id\" (UUID from leads_find). Optional: \"social_urls\" (array of profile URLs to check), \"platform\" to specify instagram, twitter, or linkedin. → next step: call messages_generate with the lead_id.",
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
    description: "Extract contact information, social profile links, ordering/booking pages, and the best outreach channel from a lead's website. Uses headless browser scraping. Pass \"lead_id\" (UUID from leads_find). Optional: \"url\" to override the website URL. Returns emails, phones, social links, whether they have online ordering, and the recommended outreach channel. → next step: call messages_generate with the lead_id.",
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
    description: 'Full intelligence pipeline for a lead — runs OSINT enrichment, social profile analysis, website analysis, and AI insight generation all in one call. Returns contact info (emails, phones, decision makers), website analysis, social stats, insights (pain points, opportunity), suggested outreach (channel, message angle, next step). This is the most comprehensive enrichment option and preferred over running individual enrichment tools separately. Pass "lead_id" (UUID from leads_find). All other fields are optional overrides. → next step: call messages_generate with the lead_id.',
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
    description: 'Generate a personalised AI outreach message for a lead using GPT-4o-mini. The message is tailored to the lead\'s business, social presence, and the chosen tone. Returns message_id, message_text, and status (draft). Required: "lead_id" (UUID from leads_find), "template" (one of: cold_outreach, follow_up, partnership, custom), "tone" (one of: professional, casual, friendly, direct). Optional: "campaign_type" (e.g. "promotion", "partnership"), "custom_prompt" (extra instructions). → next step: call messages_send with the returned message_id.',
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
    description: 'Send an approved outreach message via browser automation. Supports Instagram DM, Twitter DM, and LinkedIn messaging. Requires platform credentials to be saved first via credentials_save. Pass "message_id" (UUID from messages_generate). Optional: "scheduled_at" (ISO 8601 datetime to schedule the send — omit to send immediately). Returns send status, platform, and recipient username. NOTE: platform credentials (session cookies) must be saved before sending via credentials_save.',
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
    description: 'Store encrypted platform session credentials for automated DM sending. These are required before using messages_send. Credentials are encrypted at rest and scoped to your API key. Required: "platform" (instagram, twitter, or linkedin), "value" (the session cookie or token). For Instagram: copy the "sessionid" cookie from browser DevTools while logged in. For Twitter: copy the "auth_token" cookie. For LinkedIn: copy the "li_at" cookie.',
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
