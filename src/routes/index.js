import { Router } from 'express'
import mongoose from 'mongoose'
import contactRoutes from './contact.js'
import menuRoutes from './menu.js'
import reservationRoutes from './reservations.js'

const router = Router()

router.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1
  res.status(connected ? 200 : 503).json({ data: { status: connected ? 'ok' : 'database unavailable' } })
})

router.use('/menu', menuRoutes)
router.use('/reservations', reservationRoutes)
router.use('/contact', contactRoutes)

export default router
