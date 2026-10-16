import { restaurant } from '../config/restaurant.js'
import { MenuItem } from '../models/MenuItem.js'
import { Reservation } from '../models/Reservation.js'
import { ApiError, conflict } from '../utils/ApiError.js'
import { generateReference, generateToken, hashToken } from '../utils/reference.js'
import { startsAtDate } from '../utils/time.js'
import { bookableSlots, canChange, dateWindowError, scheduleForDate, slotError } from './slots.js'

const SEATS = restaurant.seatsPerSlot

function invalid(field, message) {
  return new ApiError(422, message, { code: 'INVALID_SLOT', details: { [field]: message } })
}

// Seats already booked on a date, as a Map of time -> seats. Cancelled reservations do not count.
async function seatsByTime(date, excludeReference) {
  const match = { date, status: 'confirmed' }
  if (excludeReference) match.reference = { $ne: excludeReference }
  const rows = await Reservation.aggregate([
    { $match: match },
    { $group: { _id: '$time', seats: { $sum: '$guests' } } },
  ])
  return new Map(rows.map((row) => [row._id, row.seats]))
}

async function seatsAt(date, time) {
  const map = await seatsByTime(date, null)
  return map.get(time) || 0
}

// Time slots for a date with how many seats are left. `excludeReference` ignores one booking
// (used while that booking is being edited, so it does not compete with itself).
export async function getAvailability(date, { excludeReference, now = new Date() } = {}) {
  const windowError = dateWindowError(date, now)
  if (windowError) throw new ApiError(400, windowError, { code: 'VALIDATION_ERROR', details: { date: windowError } })

  const entry = scheduleForDate(date)
  if (!entry) return { date, open: false, slots: [] }

  const taken = await seatsByTime(date, excludeReference)
  const slots = bookableSlots(date, now).map((time) => {
    const seatsLeft = Math.max(0, SEATS - (taken.get(time) || 0))
    return { time, seatsLeft, available: seatsLeft > 0 }
  })
  return { date, open: true, opensAt: entry.open, closesAt: entry.close, slots }
}

async function assertSeatsFree(date, time, guests, excludeReference) {
  const taken = (await seatsByTime(date, excludeReference)).get(time) || 0
  if (taken + guests > SEATS) {
    const left = Math.max(0, SEATS - taken)
    throw conflict(
      left === 0
        ? 'That time is fully booked. Please choose another time.'
        : `Only ${left} seat${left === 1 ? '' : 's'} left at that time. Choose another time or a smaller party.`,
      'SLOT_FULL',
      { time: 'That time does not have enough seats left.' },
    )
  }
}

async function assertNoDuplicate(email, date, time, excludeReference) {
  const filter = { email, date, time, status: 'confirmed' }
  if (excludeReference) filter.reference = { $ne: excludeReference }
  if (await Reservation.exists(filter)) {
    throw conflict('You already have a reservation at that date and time.', 'DUPLICATE_RESERVATION', {
      time: 'You already have a reservation at this time.',
    })
  }
}

// Turns [{ itemId, quantity }] into saved lines with the name and price copied from the menu.
async function buildPreOrder(lines) {
  if (!lines || lines.length === 0) return { items: [], total: 0 }
  const found = await MenuItem.find({ _id: { $in: lines.map((line) => line.itemId) }, isAvailable: true }).select('name slug price')
  const byId = new Map(found.map((item) => [String(item._id), item]))
  const items = []
  for (const line of lines) {
    const menuItem = byId.get(line.itemId.toLowerCase())
    if (!menuItem) {
      throw new ApiError(422, 'A pre-ordered dish is no longer on the menu. Please review your pre-order.', {
        code: 'INVALID_PREORDER',
        details: { preOrder: 'A pre-ordered dish is no longer on the menu.' },
      })
    }
    items.push({ menuItem: menuItem._id, slug: menuItem.slug, name: menuItem.name, price: menuItem.price, quantity: line.quantity })
  }
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return { items, total }
}

// Safety net for two guests booking the last seats at the same moment: if the slot ended up
// over capacity, the booking that was just written is undone by the caller.
async function slotOverbooked(date, time) {
  return (await seatsAt(date, time)) > SEATS
}

export async function createReservation(input, now = new Date()) {
  const problem = slotError(input.date, input.time, now)
  if (problem) throw invalid(problem.field, problem.message)

  const activeCount = await Reservation.countDocuments({
    email: input.email,
    status: 'confirmed',
    startsAt: { $gte: now },
  })
  if (activeCount >= restaurant.maxActivePerEmail) {
    throw conflict(
      `This email already has ${restaurant.maxActivePerEmail} upcoming reservations. Cancel one first, or send us a message.`,
      'TOO_MANY_RESERVATIONS',
    )
  }

  await assertNoDuplicate(input.email, input.date, input.time)
  await assertSeatsFree(input.date, input.time, input.guests)
  const preOrder = await buildPreOrder(input.preOrder)

  const manageToken = generateToken()
  let reservation = null
  for (let attempt = 0; attempt < 5 && !reservation; attempt += 1) {
    try {
      reservation = await Reservation.create({
        reference: generateReference(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        date: input.date,
        time: input.time,
        startsAt: startsAtDate(input.date, input.time),
        guests: input.guests,
        occasion: input.occasion || '',
        requests: input.requests || '',
        preOrder,
        manageTokenHash: hashToken(manageToken),
      })
    } catch (error) {
      // 11000 = duplicate key. Only retry when the random reference collided.
      if (!(error?.code === 11000 && error?.keyPattern?.reference)) throw error
    }
  }
  if (!reservation) throw new ApiError(500, 'Could not create a reservation code. Please try again.')

  if (await slotOverbooked(input.date, input.time)) {
    await Reservation.deleteOne({ _id: reservation._id })
    throw conflict('That time just filled up. Please choose another time.', 'SLOT_FULL', {
      time: 'That time just filled up.',
    })
  }

  return { reservation, manageToken }
}

export async function updateReservation(reservation, patch, now = new Date()) {
  assertChangeable(reservation, now, 'change')

  const next = {
    date: patch.date ?? reservation.date,
    time: patch.time ?? reservation.time,
    guests: patch.guests ?? reservation.guests,
  }
  const slotMoved = next.date !== reservation.date || next.time !== reservation.time

  if (slotMoved) {
    const problem = slotError(next.date, next.time, now)
    if (problem) throw invalid(problem.field, problem.message)
    await assertNoDuplicate(reservation.email, next.date, next.time, reservation.reference)
  }
  if (slotMoved || next.guests !== reservation.guests) {
    await assertSeatsFree(next.date, next.time, next.guests, reservation.reference)
  }

  // Copy of the editable fields, used to undo the change if the slot turns out to be overbooked.
  const snapshot = reservation.toObject()
  const before = {}
  for (const key of ['date', 'time', 'startsAt', 'guests', 'name', 'phone', 'occasion', 'requests', 'preOrder']) {
    before[key] = snapshot[key]
  }

  reservation.date = next.date
  reservation.time = next.time
  reservation.startsAt = startsAtDate(next.date, next.time)
  reservation.guests = next.guests
  for (const key of ['name', 'phone', 'occasion', 'requests']) {
    if (patch[key] !== undefined) reservation[key] = patch[key]
  }
  if (patch.preOrder !== undefined) reservation.preOrder = await buildPreOrder(patch.preOrder)

  await reservation.save()

  if (await slotOverbooked(next.date, next.time)) {
    reservation.set(before)
    await reservation.save()
    throw conflict('That time just filled up. Your reservation was not changed.', 'SLOT_FULL', {
      time: 'That time just filled up.',
    })
  }
  return reservation
}

export async function cancelReservation(reservation, reason, now = new Date()) {
  if (reservation.status === 'cancelled') return reservation // cancelling twice is harmless
  assertChangeable(reservation, now, 'cancel')
  reservation.status = 'cancelled'
  reservation.cancelledAt = now
  if (reason) reservation.cancelReason = reason.slice(0, 200)
  await reservation.save()
  return reservation
}

function assertChangeable(reservation, now, verb) {
  if (reservation.status === 'cancelled') {
    throw conflict('This reservation was already cancelled.', 'ALREADY_CANCELLED')
  }
  if (!canChange(reservation.startsAt, now)) {
    throw conflict(
      `Online changes close ${restaurant.cutoffHours} hours before the reservation. Please call the restaurant to ${verb} it.`,
      'TOO_LATE',
    )
  }
}
