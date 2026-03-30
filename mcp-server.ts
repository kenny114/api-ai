#!/usr/bin/env node
/**
 * LeadAPI MCP Server
 *
 * Exposes all LeadAPI endpoints as MCP tools so AI assistants
 * (Claude Desktop, Cursor, Windsurf, etc.) can call them directly.
 *
 * Usage:
 *   npx ts-node mcp-server.ts
 *
 * Required env vars:
 *   LEADAPI_KEY    — your sk_live_... API key
 *   LEADAPI_BASE   — base URL, e.g. https://your-app.vercel.app  (default: http://localhost:3000)
 *
 * Add to Claude Desktop's config (~/.config/claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "leadapi": {
 *       "command": "npx",
 *       "args": ["ts-node", "/absolute/path/to/mcp-server.ts"],
 *       "env": {
 *         "LEADAPI_KEY": "sk_live_YOUR_KEY",
 *         "LEADAPI_BASE": "https://your-app.vercel.app"
 *       }
 *     }
 *   }
 * }
 */

import * as readline from 'readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = (process.env.LEADAPI_BASE ?? 'http://localhost:3000').replace(/\/$/, '')
const KEY  = process.env.LEADAPI_KEY ?? ''

if (!KEY) {
  process.stderr.write('[LeadAPI MCP] WARNING: LEADAPI_KEY is not set\n')
}

// ---------------------------------------------------------------------------
// MCP protocol types (minimal, stdio transport)
// ---------------------------------------------------------------------------

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: number | string | null
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

type ToolDef = {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function callApi(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text, status: res.status }
  }
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: ToolDef[] = [
  {
    name: 'leads_find',
    description:
      'Scrape business listings from Google Maps for a given area or niche. Returns saved lead records with name, contact info, and platform.',
    inputSchema: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          description: 'Search query passed to Google Maps, e.g. "coffee shops London"',
        },
        limit: {
          type: 'number',
          description: 'Number of leads to return (1–50, default 20)',
        },
        no_website: {
          type: 'boolean',
          description: 'If true, only return businesses that have no website',
        },
      },
      required: ['area'],
    },
  },
  {
    name: 'leads_osint_enrich',
    description:
      'Enrich a lead with publicly available data — emails, employee names, subdomains, and tech stack detected from their website and certificate logs.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: {
          type: 'string',
          description: 'UUID of the lead from leads_find',
        },
        domain: {
          type: 'string',
          description: 'Optional — overrides the domain derived from the lead\'s profile_url',
        },
        company_name: {
          type: 'string',
          description: 'Optional — overrides the lead\'s name for OSINT queries',
        },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'leads_social_analyze',
    description:
      "Visit a lead's social profiles to extract followers, activity level, and get a suggested outreach action (e.g. like_then_dm).",
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: {
          type: 'string',
          description: 'UUID of the lead',
        },
        social_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional — social profile URLs to visit (overrides lead\'s profile_url)',
        },
        platform: {
          type: 'string',
          enum: ['instagram', 'twitter', 'linkedin'],
          description: 'Optional — platform hint',
        },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'leads_website_analyze',
    description:
      "Visit a lead's website to extract contact info, detect menu/ordering pages, find social profile links, and suggest the best outreach channel.",
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: {
          type: 'string',
          description: 'UUID of the lead',
        },
        url: {
          type: 'string',
          description: 'Optional — URL to visit (overrides lead\'s profile_url)',
        },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'leads_intelligence',
    description:
      'Run the full intelligence pipeline — OSINT enrichment + social analysis + website analysis in one call. Returns a combined report with AI-generated insights and outreach recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: {
          type: 'string',
          description: 'UUID of the lead',
        },
        domain: {
          type: 'string',
          description: 'Optional domain override',
        },
        company_name: {
          type: 'string',
          description: 'Optional company name override',
        },
        social_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional social profile URLs',
        },
        website_url: {
          type: 'string',
          description: 'Optional website URL override',
        },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'messages_generate',
    description:
      'Generate a personalised outreach message for a lead using AI. Returns a draft message_id and the message text.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: {
          type: 'string',
          description: 'UUID of the lead',
        },
        template: {
          type: 'string',
          enum: ['cold_outreach', 'follow_up', 'partnership', 'custom'],
          description: 'Message template to use',
        },
        tone: {
          type: 'string',
          enum: ['professional', 'casual', 'friendly', 'direct'],
          description: 'Tone of the message',
        },
        campaign_type: {
          type: 'string',
          description: 'Optional — describe the campaign (e.g. "promotion", "partnership")',
        },
        custom_prompt: {
          type: 'string',
          description: 'Optional — extra instructions for the AI (e.g. "Mention their menu")',
        },
      },
      required: ['lead_id', 'template', 'tone'],
    },
  },
  {
    name: 'messages_send',
    description:
      'Send an approved outreach message via platform automation (Instagram DM, etc.). Optionally schedule for later.',
    inputSchema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'UUID of the message from messages_generate',
        },
        scheduled_at: {
          type: 'string',
          description: 'ISO 8601 datetime to schedule the send, or null/omit to send immediately',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'credentials_save',
    description:
      'Store encrypted platform credentials (session tokens) for a given platform. Required before sending messages.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['instagram', 'twitter', 'linkedin'],
          description: 'The platform to store credentials for',
        },
        value: {
          type: 'string',
          description: 'The session token or cookie value',
        },
      },
      required: ['platform', 'value'],
    },
  },
]

// ---------------------------------------------------------------------------
// Tool router
// ---------------------------------------------------------------------------

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'leads_find':
      return callApi('/api/v1/leads/find', {
        area: args.area,
        limit: args.limit,
        filters: args.no_website ? { no_website: true } : undefined,
      })

    case 'leads_osint_enrich':
      return callApi('/api/v1/leads/osint-enrich', args)

    case 'leads_social_analyze':
      return callApi('/api/v1/leads/social-analyze', args)

    case 'leads_website_analyze':
      return callApi('/api/v1/leads/website-analyze', args)

    case 'leads_intelligence':
      return callApi('/api/v1/leads/intelligence', args)

    case 'messages_generate':
      return callApi('/api/v1/messages/generate', args)

    case 'messages_send':
      return callApi('/api/v1/messages/send', args)

    case 'credentials_save':
      return callApi('/api/v1/credentials', args)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ---------------------------------------------------------------------------
// MCP stdio server
// ---------------------------------------------------------------------------

function send(obj: JsonRpcResponse) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

async function handleRequest(req: JsonRpcRequest) {
  const { id, method, params } = req

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'leadapi', version: '1.0.0' },
      },
    })
    return
  }

  if (method === 'notifications/initialized') {
    return
  }

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
    return
  }

  if (method === 'tools/call') {
    const toolName = params?.name as string
    const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>

    try {
      const result = await callTool(toolName, toolArgs)
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      })
    } catch (err) {
      send({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : String(err),
        },
      })
    }
    return
  }

  send({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const rl = readline.createInterface({ input: process.stdin, terminal: false })

rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let req: JsonRpcRequest
  try {
    req = JSON.parse(trimmed)
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
    return
  }
  handleRequest(req).catch((err) => {
    process.stderr.write(`[LeadAPI MCP] Unhandled error: ${err}\n`)
  })
})

process.stderr.write(`[LeadAPI MCP] Server started — base: ${BASE}\n`)
