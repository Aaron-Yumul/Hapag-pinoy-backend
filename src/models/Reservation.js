import mongoose from 'mongoose'
import { restaurant } from '../config/restaurant.js'
import { canChange, changeDeadline } from '../services/slots.js'

const { Schema } = mongoose

// One pre-ordered dish. Name and price are copied from the menu at the time of booking,
// so the reservation keeps showing what the guest agreed to even if the menu changes later.
const preOrderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    slug: String,
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const reservationSchema = new Schema(
  {
    // Short code the guest keeps (e.g. HP-7K3M9Q). Together with the email it lets them find the booking again.
    reference: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 120, index: true },
    phone: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD, Manila date
    time: { type: String, required: true }, // HH:MM, Manila time
    startsAt: { type: Date, required: true, index: true }, // the same moment as a real Date
    guests: { type: Number, required: true, min: 1, max: restaurant.maxOnlineGuests },
    occasion: { type: String, enum: ['', ...restaurant.occasions], default: '' },
    requests: { type: String, default: '', maxlength: 300 },
    preOrder: {
      items: { type: [preOrderItemSchema], default: [] },
      total: { type: Number, default: 0 },
    },
    // Reservations are confirmed right away (there is no staff approval step) and can only be cancelled by the guest.
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    cancelledAt: Date,
    cancelReason: { type: String, maxlength: 200 },
    // Only a SHA-256 hash of the secret token that the browser keeps; the token itself is never stored.
    manageTokenHash: { type: String, select: false },
  },
  { timestamps: true },
)

reservationSchema.index({ date: 1, time: 1, status: 1 })

export const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema)

// What the API sends to the website (never includes the token hash).
export function presentReservation(doc, now = new Date()) {
  const items = doc.preOrder?.items || []
  return {
    reference: doc.reference,
    status: doc.status,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    date: doc.date,
    time: doc.time,
    guests: doc.guests,
    occasion: doc.occasion || '',
    requests: doc.requests || '',
    preOrder: {
      items: items.map((item) => ({
        itemId: String(item.menuItem),
        slug: item.slug,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      total: doc.preOrder?.total || 0,
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    cancelledAt: doc.cancelledAt || null,
    // True while the guest can still edit or cancel online.
    canChange: doc.status === 'confirmed' && canChange(doc.startsAt, now),
    changeDeadline: changeDeadline(doc.startsAt),
    isPast: doc.startsAt.getTime() < now.getTime(),
  }
}
