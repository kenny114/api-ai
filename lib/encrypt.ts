import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!hex) throw new Error('CREDENTIAL_ENCRYPTION_KEY env var is not set')
  return Buffer.from(hex, 'hex')
}

/** Encrypts a plaintext string. Returns a base64-encoded iv:tag:ciphertext string. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

/** Decrypts a string produced by encrypt(). Throws if the key or ciphertext is invalid. */
export function decrypt(encoded: string): string {
  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted credential format')
  const [ivB64, tagB64, encB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const enc = Buffer.from(encB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(enc).toString('utf8') + decipher.final('utf8')
}
