import crypto from 'node:crypto'

// No I, O, 0 or 1, so codes are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateReference() {
  let code = ''
  for (let i = 0; i < 6; i += 1) code += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return `HP-${code}`
}

export function isReference(value) {
  return typeof value === 'string' && /^HP-[A-HJ-NP-Z2-9]{6}$/.test(value)
}

export function generateToken() {
  return crypto.randomBytes(24).toString('hex')
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
