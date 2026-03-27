import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-only admin client — never expose to the browser
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function logUsage(
  supabase: SupabaseClient,
  entry: { api_key_id: string; endpoint: string }
) {
  const { error } = await supabase.from('usage_logs').insert(entry)
  if (error) {
    console.error('Failed to write usage log:', error.message)
  }
}
