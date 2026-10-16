import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, dayOfWeek, isValidDateString, isValidTimeString, manilaParts, startsAtDate } from '../src/utils/time.js'
import { allSlots, bookableSlots, canChange, changeDeadline, dateWindowError, slotError } from '../src/services/slots.js'

test('manilaParts shifts UTC into Philippine time', () => {
  // 17:30 UTC on 1 Nov is 01:30 on 2 Nov in Manila
  assert.deepEqual(manilaParts(new Date('2026-11-01T17:30:00Z')), { date: '2026-11-02', minutes: 90 })
})

test('date and time string checks', () => {
  assert.equal(isValidDateString('2026-02-29'), false)
  assert.equal(isValidDateString('2028-02-29'), true)
  assert.equal(isValidDateString('2026-13-01'), false)
  assert.equal(isValidDateString('26-1-1'), false)
  assert.equal(isValidTimeString('09:30'), true)
  assert.equal(isValidTimeString('24:00'), false)
  assert.equal(isValidTimeString('9:30'), false)
})

test('dayOfWeek and addDays', () => {
  assert.equal(dayOfWeek('2026-10-16'), 5) // Friday
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('weekday, Saturday and Sunday slots follow the opening hours', () => {
  const friday = allSlots('2026-10-16') // 10:00-21:00, last seating 20:00
  assert.equal(friday[0], '10:00')
  assert.equal(friday.at(-1), '20:00')
  assert.equal(friday.length, 21)
  const saturday = allSlots('2026-10-17') // 09:00-22:00
  assert.equal(saturday[0], '09:00')
  assert.equal(saturday.at(-1), '21:00')
  const sunday = allSlots('2026-10-18') // 09:00-20:00
  assert.equal(sunday.at(-1), '19:00')
})

test('slots less than the cutoff away are not bookable', () => {
  // 12:00 Manila on Friday 16 Oct 2026 = 04:00 UTC
  const now = new Date('2026-10-16T04:00:00Z')
  const slots = bookableSlots('2026-10-16', now)
  assert.equal(slots[0], '14:00') // 2 hours later
  assert.ok(!slots.includes('13:30'))
})

test('slotError explains why a slot is rejected', () => {
  const now = new Date('2026-10-16T04:00:00Z')
  assert.equal(slotError('2026-10-15', '12:00', now).field, 'date') // past
  assert.equal(slotError('2026-10-16', '13:00', now).field, 'time') // too soon
  assert.equal(slotError('2026-10-17', '08:00', now).field, 'time') // before opening
  assert.equal(slotError('2026-10-17', '09:15', now).field, 'time') // not on the 30-minute grid
  assert.equal(slotError('2026-10-17', '21:30', now).field, 'time') // after last seating
  assert.equal(slotError('2026-10-17', '09:30', now), null)
  assert.match(dateWindowError('2027-06-01', now), /90 days/)
  assert.equal(dateWindowError('2026-10-16', now), null)
})

test('change deadline is two hours before the reservation', () => {
  const startsAt = startsAtDate('2026-10-17', '19:00') // 11:00 UTC
  assert.equal(changeDeadline(startsAt).toISOString(), '2026-10-17T09:00:00.000Z')
  assert.equal(canChange(startsAt, new Date('2026-10-17T08:59:00Z')), true)
  assert.equal(canChange(startsAt, new Date('2026-10-17T09:01:00Z')), false)
})
