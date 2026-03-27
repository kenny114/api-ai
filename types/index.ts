export type Platform = 'instagram' | 'twitter' | 'linkedin' | 'google_maps'

export type MessageTemplate = 'cold_outreach' | 'follow_up' | 'partnership' | 'custom'

export type MessageTone = 'professional' | 'casual' | 'friendly' | 'direct'

export type OutreachStatus = 'pending' | 'sent' | 'failed'

export type MessageStatus = 'draft' | 'sent' | 'archived'

export interface ApiKey {
  id: string
  key_hash: string
  key_prefix: string
  name: string | null
  user_email: string | null
  usage_count: number
  usage_limit: number
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export interface Lead {
  id?: string
  api_key_id?: string
  platform: Platform
  profile_url: string | null
  username: string
  name: string | null
  bio: string | null
  followers: number | null
  following: number | null
  niche: string | null
  location: string | null
  metadata: Record<string, unknown>
  created_at?: string
}

export interface Message {
  id?: string
  lead_id: string
  api_key_id?: string
  campaign_type: string | null
  template: MessageTemplate | null
  custom_prompt: string | null
  generated_message: string
  tone: MessageTone | null
  model_used: string | null
  status: MessageStatus
  created_at?: string
}

export interface OutreachLog {
  id?: string
  message_id: string
  lead_id: string
  api_key_id?: string
  platform: Platform
  status: OutreachStatus
  error: string | null
  sent_at: string | null
  created_at?: string
}

export interface UsageLog {
  id?: string
  api_key_id: string
  endpoint: string
  method: string
  request_body: Record<string, unknown> | null
  response_status: number | null
  duration_ms: number | null
  ip_address: string | null
  created_at?: string
}

// API response wrappers
export interface ApiError {
  error: string
  code: string
  details?: unknown
}

export interface ValidateKeyResult {
  id: string
  usage_count: number
  usage_limit: number
  is_over_limit: boolean
  error: string | null
}
