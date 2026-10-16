import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { generalLimiter } from './middleware/rateLimit.js'
import routes from './routes/index.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  if (env.trustProxy) app.set('trust proxy', env.trustProxy)

  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = same-origin request, curl or Postman: allow.
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true)
        return callback(null, false)
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-manage-token'],
      maxAge: 600,
    }),
  )
  app.use(express.json({ limit: '20kb' }))

  // One line per request, without the query string (it can contain an email address).
  if (!env.isTest) {
    app.use((req, res, next) => {
      const started = Date.now()
      res.on('finish', () => console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - started}ms`))
      next()
    })
  }

  app.use('/api', generalLimiter, routes)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
