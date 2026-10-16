// Opening hours, bookable time slots and the change/cancel deadline. No database needed here.
import { restaurant } from '../config/restaurant.js'
import { addDays, dayOfWeek, manilaParts, minutesToTime, startsAtDate, toMinutes } from '../utils/time.js'

const HOUR_MS = 60 * 60 * 1000

export function scheduleForDate(date) {
  return restaurant.schedule.find((entry) => entry.days.includes(dayOfWeek(date))) || null
}

// Every time the restaurant seats guests on that date, ignoring the clock.
export function allSlots(date) {
  const entry = scheduleForDate(date)
  if (!entry) return []
  const first = toMinutes(entry.open)
  const last = toMinutes(entry.close) - restaurant.lastSeatingBeforeCloseMinutes
  const slots = []
  for (let minutes = first; minutes <= last; minutes += restaurant.slotLengthMinutes) {
    slots.push(minutesToTime(minutes))
  }
  return slots
}

// Slots a guest may still book: at least `cutoffHours` from now.
export function bookableSlots(date, now = new Date()) {
  const earliest = now.getTime() + restaurant.cutoffHours * HOUR_MS
  return allSlots(date).filter((time) => startsAtDate(date, time).getTime() >= earliest)
}

// Returns an error message when the date is outside the booking window, otherwise null.
export function dateWindowError(date, now = new Date()) {
  const today = manilaParts(now).date
  if (date < today) return 'Choose today or a future date.'
  if (date > addDays(today, restaurant.maxDaysAhead)) {
    return `Tables can be booked up to ${restaurant.maxDaysAhead} days ahead.`
  }
  return null
}

// Returns an error message when this date/time cannot be booked, otherwise null.
export function slotError(date, time, now = new Date()) {
  const windowError = dateWindowError(date, now)
  if (windowError) return { field: 'date', message: windowError }
  if (!scheduleForDate(date)) return { field: 'date', message: 'The restaurant is closed on that day.' }
  if (!allSlots(date).includes(time)) {
    return { field: 'time', message: 'That time is outside our seating hours. Pick one from the list.' }
  }
  if (!bookableSlots(date, now).includes(time)) {
    return {
      field: 'time',
      message: `Tables must be booked at least ${restaurant.cutoffHours} hours ahead. Choose a later time or call us.`,
    }
  }
  return null
}

export function changeDeadline(startsAt) {
  return new Date(startsAt.getTime() - restaurant.cutoffHours * HOUR_MS)
}

export function canChange(startsAt, now = new Date()) {
  return now.getTime() <= changeDeadline(startsAt).getTime()
}
