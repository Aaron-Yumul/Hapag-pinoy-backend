import rateLimit from 'express-rate-limit'

function limiter({ windowMinutes, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } })
    },
  })
}

const tooMany = 'Too many requests. Please wait a few minutes and try again.'

// Every API call.
export const generalLimiter = limiter({ windowMinutes: 15, limit: 400, message: tooMany })
// Creating a reservation.
export const bookingLimiter = limiter({ windowMinutes: 60, limit: 20, message: 'Too many reservation attempts. Please try again in an hour.' })
// Opening, editing or cancelling a reservation. Only failed attempts count, which stops people guessing codes.
export const manageLimiter = limiter({ windowMinutes: 15, limit: 30, skipSuccessfulRequests: true, message: tooMany })
// Contact form.
export const contactLimiter = limiter({ windowMinutes: 60, limit: 8, message: 'You have sent several messages already. Please try again later.' })
