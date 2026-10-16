import mongoose from 'mongoose'
import { restaurant } from '../config/restaurant.js'

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 120 },
    topic: { type: String, required: true, enum: restaurant.contactTopics },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  },
  { timestamps: true },
)

export const ContactMessage = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema)
