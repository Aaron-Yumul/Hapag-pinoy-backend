export const text = (value) => (typeof value === 'string' ? value.trim() : '')

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

// Accepts 09123456789, +639123456789, 0912 345 6789, (0912) 345-6789 ... and returns it without spaces.
export function normalizePhone(value) {
  return text(value).replace(/[\s\-().]/g, '')
}

export function isPhone(value) {
  return /^\+?\d{10,13}$/.test(value)
}

// Whole number from a number or a numeric string, otherwise NaN.
export function toInteger(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : NaN
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  return NaN
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
