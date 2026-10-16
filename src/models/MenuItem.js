import mongoose from 'mongoose'

const { Schema } = mongoose

// Servings, nutrition and ingredients shown in the dish dialog on the Menu page.
const detailsSchema = new Schema(
  {
    serves: { type: [Number], default: [1, 1] }, // [fewest, most] people one order feeds
    portion: String, // "10 pieces", "1 glass (350 ml)"
    amount: { type: [Schema.Types.Mixed], default: [] }, // [number, 'g' | 'ml']
    protein: { type: Number, default: 0 }, // grams per order (estimates)
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    prep: Number, // minutes from order to table
    spice: { type: Number, min: 0, max: 3, default: 0 }, // 0 not spicy ... 3 hot
    allergens: { type: [String], default: [] },
    caffeine: Number, // mg, drinks only
    main: String,
    ingredients: { type: [String], default: [] },
    tip: String,
  },
  { _id: false },
)

const menuItemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 }, // Philippine pesos
    category: { type: String, required: true, index: true },
    origin: String,
    badge: String, // "Best seller", "Chef's pick", "New", "Spicy"
    featured: { type: Boolean, default: false },
    art: String, // illustration type used when there is no photo
    tone: String, // illustration colour
    isAvailable: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    details: detailsSchema,
  },
  { timestamps: true },
)

menuItemSchema.index({ category: 1, sortOrder: 1 })

export const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema)

// What the API sends to the website.
export function presentMenuItem(item) {
  const out = {
    id: String(item._id),
    slug: item.slug,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    featured: Boolean(item.featured),
    details: item.details || null,
  }
  for (const key of ['origin', 'badge', 'art', 'tone']) {
    if (item[key]) out[key] = item[key]
  }
  return out
}
