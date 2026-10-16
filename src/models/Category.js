import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    local: String, // Filipino name, e.g. "Pampagana"
    blurb: String,
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)

export function presentCategory(category) {
  return { name: category.name, local: category.local || '', blurb: category.blurb || '' }
}
