import { Router } from 'express'
import { send } from '../controllers/contact.js'
import { contactLimiter } from '../middleware/rateLimit.js'

const router = Router()

router.post('/', contactLimiter, send) // POST /api/contact

export default router
