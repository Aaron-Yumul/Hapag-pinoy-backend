import { Router } from 'express'
import { getItem, listCategories, listItems } from '../controllers/menu.js'

const router = Router()

router.get('/', listItems) // GET /api/menu?category=&search=&featured=true
router.get('/categories', listCategories) // GET /api/menu/categories
router.get('/:idOrSlug', getItem) // GET /api/menu/bulalo

export default router
