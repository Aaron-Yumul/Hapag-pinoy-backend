import { restaurant } from '../config/restaurant.js'
import { EMAIL_PATTERN, text } from './helpers.js'

export function parseContactMessage(body) {
  const source = body && typeof body === 'object' ? body : {}
  const errors = {}
  const value = {
    name: text(source.name),
    email: text(source.email).toLowerCase(),
    topic: text(source.topic),
    message: text(source.message),
  }

  if (!value.name) errors.name = 'Enter your name.'
  else if (value.name.length > 80) errors.name = 'Your name can be up to 80 characters.'

  if (!value.email) errors.email = 'Enter your email address.'
  else if (value.email.length > 120 || !EMAIL_PATTERN.test(value.email)) errors.email = 'Enter a valid email address, like name@example.com.'

  if (!value.topic) errors.topic = 'Choose what your message is about.'
  else if (!restaurant.contactTopics.includes(value.topic)) errors.topic = 'Choose a topic from the list.'

  if (!value.message) errors.message = 'Write a message.'
  else if (value.message.length < 10) errors.message = 'Your message must be at least 10 characters.'
  else if (value.message.length > 2000) errors.message = 'Your message can be up to 2000 characters.'

  return { value, errors, isSpam: text(source.website) !== '' }
}
