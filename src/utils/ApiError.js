// An error that is safe to show to the visitor. `details` maps field names to messages.
export class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message, details) => new ApiError(400, message, { code: 'VALIDATION_ERROR', details })
export const notFound = (message = 'Not found.') => new ApiError(404, message, { code: 'NOT_FOUND' })
export const conflict = (message, code = 'CONFLICT', details) => new ApiError(409, message, { code, details })
