import test from 'node:test'
import assert from 'node:assert/strict'
import { parseContactMessage } from '../src/validators/contact.js'
import { parsePreOrder, parseReservation } from '../src/validators/reservation.js'
import { generateReference, hashToken, isReference, safeEqual } from '../src/utils/reference.js'

const good = {
  name: '  Juan dela Cruz ',
  email: 'Juan@Example.com ',
  phone: '0912 345-6789',
  date: '2026-11-02',
  time: '18:00',
  guests: '4',
  occasion: 'birthday',
  requests: 'High chair please',
}
const id = 'a'.repeat(24)

test('a valid reservation is cleaned up', () => {
  const { value, errors } = parseReservation(good)
  assert.deepEqual(errors, {})
  assert.equal(value.name, 'Juan dela Cruz')
  assert.equal(value.email, 'juan@example.com')
  assert.equal(value.phone, '09123456789')
  assert.equal(value.guests, 4)
})

test('a reservation reports every bad field', () => {
  const { errors } = parseReservation({ name: 'J', email: 'nope', phone: '123', date: '2026-02-30', time: '25:00', guests: 13, occasion: 'party' })
  assert.deepEqual(Object.keys(errors).sort(), ['date', 'email', 'guests', 'name', 'occasion', 'phone', 'time'])
})

test('an empty body fails with required-field messages', () => {
  const { errors } = parseReservation(undefined)
  assert.ok(errors.name && errors.email && errors.phone && errors.date && errors.time && errors.guests)
})

test('update only checks the fields that are sent and cannot change the email', () => {
  const ok = parseReservation({ guests: 2, email: 'other@example.com' }, 'update')
  assert.deepEqual(ok.errors, {})
  assert.deepEqual(ok.value, { guests: 2 })
  assert.ok(parseReservation({}, 'update').errors.form)
  assert.ok(parseReservation({ guests: 0 }, 'update').errors.guests)
})

test('pre-order lines are validated and merged', () => {
  assert.deepEqual(parsePreOrder([{ itemId: id, quantity: 2 }, { itemId: id.toUpperCase(), quantity: '3' }]).lines, [{ itemId: id, quantity: 5 }])
  assert.ok(parsePreOrder([{ itemId: 'x', quantity: 1 }]).error)
  assert.ok(parsePreOrder([{ itemId: id, quantity: 0 }]).error)
  assert.ok(parsePreOrder([{ itemId: id, quantity: 21 }]).error)
  assert.ok(parsePreOrder('pancit').error)
  assert.deepEqual(parsePreOrder([]).lines, [])
  const many = Array.from({ length: 4 }, (_, i) => ({ itemId: String(i).repeat(24), quantity: 16 }))
  assert.match(parsePreOrder(many).error, /60 items/)
})

test('preOrder inside a reservation body', () => {
  const { value, errors } = parseReservation({ ...good, preOrder: [{ itemId: id, quantity: 1 }] })
  assert.deepEqual(errors, {})
  assert.deepEqual(value.preOrder, [{ itemId: id, quantity: 1 }])
  assert.ok(parseReservation({ ...good, preOrder: 'x' }).errors.preOrder)
})

test('contact message validation and honeypot', () => {
  const ok = parseContactMessage({ name: 'Ana', email: 'ana@example.com', topic: 'feedback', message: 'Masarap ang bulalo!' })
  assert.deepEqual(ok.errors, {})
  assert.equal(ok.isSpam, false)
  assert.deepEqual(Object.keys(parseContactMessage({ topic: 'x', message: 'short' }).errors).sort(), ['email', 'message', 'name', 'topic'])
  assert.equal(parseContactMessage({ ...ok.value, website: 'http://spam' }).isSpam, true)
})

test('reference codes and token helpers', () => {
  for (let i = 0; i < 200; i += 1) assert.ok(isReference(generateReference()))
  assert.equal(isReference('HP-ABC10O'), false) // 0, 1 and O are never used
  assert.equal(isReference('hp-ABCDEF'), false)
  assert.equal(safeEqual(hashToken('abc'), hashToken('abc')), true)
  assert.equal(safeEqual(hashToken('abc'), hashToken('abd')), false)
})
