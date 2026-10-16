import { restaurant } from '../config/restaurant.js'
import { isValidDateString, isValidTimeString } from '../utils/time.js'
import { EMAIL_PATTERN, OBJECT_ID_PATTERN, isPhone, normalizePhone, text, toInteger } from './helpers.js'

// Pre-order lines look like [{ itemId: '<menu item id>', quantity: 2 }]. Returns { lines } or { error }.
export function parsePreOrder(input) {
  if (!Array.isArray(input)) return { error: 'Pre-order must be a list of dishes.' }
  const limits = restaurant.preOrder
  const totals = new Map()
  for (const line of input) {
    const itemId = line && typeof line === 'object' ? text(line.itemId) : ''
    const quantity = line && typeof line === 'object' ? toInteger(line.quantity) : NaN
    if (!OBJECT_ID_PATTERN.test(itemId)) return { error: 'One of the pre-ordered dishes is not valid.' }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > limits.maxQuantityPerDish) {
      return { error: `Order 1 to ${limits.maxQuantityPerDish} of each dish.` }
    }
    totals.set(itemId.toLowerCase(), (totals.get(itemId.toLowerCase()) || 0) + quantity)
  }
  if (totals.size > limits.maxDifferentDishes) {
    return { error: `Pre-order up to ${limits.maxDifferentDishes} different dishes.` }
  }
  const lines = [...totals].map(([itemId, quantity]) => ({ itemId, quantity }))
  if (lines.some((line) => line.quantity > limits.maxQuantityPerDish)) {
    return { error: `Order 1 to ${limits.maxQuantityPerDish} of each dish.` }
  }
  if (lines.reduce((sum, line) => sum + line.quantity, 0) > limits.maxTotalQuantity) {
    return { error: `A pre-order can have up to ${limits.maxTotalQuantity} items in total.` }
  }
  return { lines }
}

/**
 * Checks a reservation request body.
 * mode 'create': every field is required (except occasion, requests and preOrder).
 * mode 'update': only the fields that are present are checked; email cannot be changed.
 * Returns { value, errors }. `value` only contains fields that were sent.
 */
export function parseReservation(body, mode = 'create') {
  const source = body && typeof body === 'object' ? body : {}
  const create = mode === 'create'
  const value = {}
  const errors = {}
  const has = (key) => source[key] !== undefined

  if (create || has('name')) {
    const name = text(source.name)
    if (!name) errors.name = 'Enter your name.'
    else if (name.length < 2) errors.name = 'Your name must be at least 2 characters.'
    else if (name.length > 80) errors.name = 'Your name can be up to 80 characters.'
    else value.name = name
  }

  if (create) {
    const email = text(source.email).toLowerCase()
    if (!email) errors.email = 'Enter your email address.'
    else if (email.length > 120 || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address, like name@example.com.'
    else value.email = email
  }

  if (create || has('phone')) {
    const phone = normalizePhone(source.phone)
    if (!phone) errors.phone = 'Enter your phone number.'
    else if (!isPhone(phone)) errors.phone = 'Enter a valid phone number, like 09123456789 or +639123456789.'
    else value.phone = phone
  }

  if (create || has('date')) {
    const date = text(source.date)
    if (!date) errors.date = 'Choose a reservation date.'
    else if (!isValidDateString(date)) errors.date = 'Enter the date as YYYY-MM-DD.'
    else value.date = date
  }

  if (create || has('time')) {
    const time = text(source.time)
    if (!time) errors.time = 'Choose a reservation time.'
    else if (!isValidTimeString(time)) errors.time = 'Enter the time as HH:MM (24-hour).'
    else value.time = time
  }

  if (create || has('guests')) {
    const guests = toInteger(source.guests)
    if (source.guests === undefined || source.guests === '' || source.guests === null) errors.guests = 'Select the number of guests.'
    else if (!Number.isInteger(guests) || guests < 1 || guests > restaurant.maxOnlineGuests) {
      errors.guests = `Online bookings are for 1 to ${restaurant.maxOnlineGuests} guests. For bigger groups, send us a message.`
    } else value.guests = guests
  }

  if (has('occasion')) {
    const occasion = text(source.occasion)
    if (occasion && !restaurant.occasions.includes(occasion)) errors.occasion = 'Choose an occasion from the list.'
    else value.occasion = occasion
  }

  if (has('requests')) {
    const requests = text(source.requests)
    if (requests.length > 300) errors.requests = 'Special requests can be up to 300 characters.'
    else value.requests = requests
  }

  if (has('preOrder')) {
    const parsed = parsePreOrder(source.preOrder)
    if (parsed.error) errors.preOrder = parsed.error
    else value.preOrder = parsed.lines
  }

  if (!create && !Object.keys(errors).length && !Object.keys(value).length) {
    errors.form = 'Send at least one field to change.'
  }

  return { value, errors }
}
