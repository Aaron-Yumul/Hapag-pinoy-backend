// Express 4 does not catch rejected promises from async route handlers, so wrap them.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
