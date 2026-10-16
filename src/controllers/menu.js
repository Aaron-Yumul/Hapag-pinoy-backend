import { Category, presentCategory } from '../models/Category.js'
import { MenuItem, presentMenuItem } from '../models/MenuItem.js'
import { notFound } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { OBJECT_ID_PATTERN, escapeRegex, text } from '../validators/helpers.js'

// The menu rarely changes, so browsers and CDNs may keep it for a minute.
const cacheMenu = (res) => res.set('Cache-Control', 'public, max-age=60')

export const listItems = asyncHandler(async (req, res) => {
  const filter = { isAvailable: true }

  const category = text(req.query.category)
  if (category) filter.category = category // exact match; a plain string cannot inject query operators

  if (text(req.query.featured) === 'true') filter.featured = true

  const search = text(req.query.search).slice(0, 60)
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { description: pattern }, { category: pattern }, { origin: pattern }]
  }

  const items = await MenuItem.find(filter).sort({ sortOrder: 1, name: 1 }).lean()
  cacheMenu(res)
  res.json({ data: items.map(presentMenuItem), meta: { count: items.length } })
})

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1 }).lean()
  cacheMenu(res)
  res.json({ data: categories.map(presentCategory), meta: { count: categories.length } })
})

// Accepts either the item's id or its slug (e.g. /api/menu/bulalo).
export const getItem = asyncHandler(async (req, res) => {
  const key = text(req.params.idOrSlug)
  const filter = OBJECT_ID_PATTERN.test(key) ? { _id: key } : { slug: key.toLowerCase() }
  const item = await MenuItem.findOne({ ...filter, isAvailable: true }).lean()
  if (!item) throw notFound('That dish is not on the menu.')
  cacheMenu(res)
  res.json({ data: presentMenuItem(item) })
})
