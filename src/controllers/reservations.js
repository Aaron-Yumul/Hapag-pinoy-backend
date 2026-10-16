import { restaurant } from '../config/restaurant.js'
import { Reservation, presentReservation } from '../models/Reservation.js'
import { cancelReservation, createReservation, getAvailability, updateReservation } from '../services/reservationService.js'
import { ApiError, notFound } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { hashToken, isReference, safeEqual } from '../utils/reference.js'
import { isValidDateString } from '../utils/time.js'
import { parseReservation } from '../validators/reservation.js'
import { text } from '../validators/helpers.js'

const policy = {
  cutoffHours: restaurant.cutoffHours,
  maxOnlineGuests: restaurant.maxOnlineGuests,
  seatsPerSlot: restaurant.seatsPerSlot,
}

function validationFailed(errors) {
  return new ApiError(422, 'Please check the highlighted fields.', { code: 'VALIDATION_ERROR', details: errors })
}

// A reservation can be opened with the secret token the browser saved when it was booked
// (x-manage-token header), or with the booking reference plus the email used to book it.
// Both a wrong reference and a wrong email give the same 404, so nobody can probe for bookings.
async function loadReservation(req) {
  const reference = text(req.params.reference).toUpperCase()
  const missing = () => notFound('We could not find a reservation with those details.')
  if (!isReference(reference)) throw missing()

  const reservation = await Reservation.findOne({ reference }).select('+manageTokenHash')
  if (!reservation) throw missing()

  const token = req.get('x-manage-token')
  if (token && reservation.manageTokenHash && safeEqual(hashToken(token), reservation.manageTokenHash)) return reservation

  const email = req.query.email ?? req.body?.email
  if (typeof email === 'string' && email.trim().toLowerCase() === reservation.email) return reservation

  throw missing()
}

export const availability = asyncHandler(async (req, res) => {
  const date = text(req.query.date)
  if (!isValidDateString(date)) {
    throw new ApiError(400, 'Send the date as YYYY-MM-DD.', { code: 'VALIDATION_ERROR', details: { date: 'Choose a valid date.' } })
  }
  const exclude = text(req.query.exclude).toUpperCase()
  const data = await getAvailability(date, { excludeReference: isReference(exclude) ? exclude : undefined })
  res.set('Cache-Control', 'no-store')
  res.json({ data: { ...data, policy } })
})

export const create = asyncHandler(async (req, res) => {
  const { value, errors } = parseReservation(req.body, 'create')
  if (Object.keys(errors).length) throw validationFailed(errors)

  const { reservation, manageToken } = await createReservation(value)
  res.status(201).json({
    data: { ...presentReservation(reservation), manageToken },
    message: 'Your table is reserved. Keep your reference code to view or cancel the reservation.',
  })
})

export const read = asyncHandler(async (req, res) => {
  const reservation = await loadReservation(req)
  res.set('Cache-Control', 'no-store')
  res.json({ data: presentReservation(reservation) })
})

export const update = asyncHandler(async (req, res) => {
  const reservation = await loadReservation(req)
  const { value, errors } = parseReservation(req.body, 'update')
  if (Object.keys(errors).length) throw validationFailed(errors)

  const saved = await updateReservation(reservation, value)
  res.json({ data: presentReservation(saved), message: 'Your reservation was updated.' })
})

// DELETE cancels the reservation (it stays in the database marked "cancelled").
export const cancel = asyncHandler(async (req, res) => {
  const reservation = await loadReservation(req)
  const reason = text(req.body?.reason)
  const saved = await cancelReservation(reservation, reason)
  res.json({ data: presentReservation(saved), message: 'Your reservation was cancelled.' })
})
