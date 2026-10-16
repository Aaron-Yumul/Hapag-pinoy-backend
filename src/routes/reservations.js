import { Router } from 'express'
import { availability, cancel, create, read, update } from '../controllers/reservations.js'
import { bookingLimiter, manageLimiter } from '../middleware/rateLimit.js'

const router = Router()

router.get('/availability', availability) // GET    /api/reservations/availability?date=2026-11-02
router.post('/', bookingLimiter, create) //  POST   /api/reservations                (Create)
router.get('/:reference', manageLimiter, read) //  GET    /api/reservations/HP-7K3M9Q  (Read)
router.patch('/:reference', manageLimiter, update) // PATCH  /api/reservations/HP-7K3M9Q  (Update)
router.delete('/:reference', manageLimiter, cancel) // DELETE /api/reservations/HP-7K3M9Q  (Cancel)

export default router
