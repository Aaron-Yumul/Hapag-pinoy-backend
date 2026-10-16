import { ApiError } from '../utils/ApiError.js'
import { env } from '../config/env.js'

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}.` } })
}

// Turns every error into { error: { code, message, details? } }.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: { code: error.code || 'ERROR', message: error.message, ...(error.details ? { details: error.details } : {}) },
    })
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'The request body is not valid JSON.' } })
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'The request is too large.' } })
  }
  if (error?.name === 'ValidationError' && error.errors) {
    const details = Object.fromEntries(Object.entries(error.errors).map(([field, issue]) => [field, issue.message]))
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', details } })
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'One of the values is not valid.' } })
  }
  if (error?.code === 11000) {
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'That record already exists.' } })
  }

  console.error(error)
  res.status(500).json({
    error: {
      code: 'SERVER_ERROR',
      message: 'Something went wrong on our side. Please try again in a moment.',
      ...(env.isProduction ? {} : { debug: error?.message }),
    },
  })
}
