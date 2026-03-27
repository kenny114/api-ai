/**
 * Generate a new API key in the format: sk_live_<random32chars>
 * Call this when provisioning keys and store the result directly in api_keys.key.
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const random = Array.from(
    { length: 32 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return `sk_live_${random}`
}
