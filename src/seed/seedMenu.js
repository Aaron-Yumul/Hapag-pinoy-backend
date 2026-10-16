import { Category } from '../models/Category.js'
import { MenuItem } from '../models/MenuItem.js'
import { categories, menuItems } from './menuData.js'

/**
 * Writes the menu into MongoDB.
 * - Dishes are matched by `slug`, so running this again updates them instead of duplicating them.
 * - prune: remove dishes and categories that are no longer in menuData.js.
 * - reset: empty both collections first.
 */
export async function seedMenu({ prune = true, reset = false } = {}) {
  if (reset) {
    await MenuItem.deleteMany({})
    await Category.deleteMany({})
  }

  await Category.bulkWrite(
    categories.map((category) => ({
      updateOne: { filter: { name: category.name }, update: { $set: category }, upsert: true },
    })),
  )
  await MenuItem.bulkWrite(
    menuItems.map((item) => ({
      updateOne: { filter: { slug: item.slug }, update: { $set: { ...item, isAvailable: true } }, upsert: true },
    })),
  )

  let removed = 0
  if (prune) {
    const removedItems = await MenuItem.deleteMany({ slug: { $nin: menuItems.map((item) => item.slug) } })
    await Category.deleteMany({ name: { $nin: categories.map((category) => category.name) } })
    removed = removedItems.deletedCount || 0
  }

  return {
    categories: await Category.countDocuments(),
    items: await MenuItem.countDocuments(),
    removed,
  }
}
