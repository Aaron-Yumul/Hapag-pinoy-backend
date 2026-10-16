// npm run seed            put the menu in the database (updates existing dishes, removes ones no longer listed)
// npm run seed -- --reset empty the menu collections first
import { connectDb, disconnectDb } from '../config/db.js'
import { seedMenu } from './seedMenu.js'

const args = process.argv.slice(2)

try {
  await connectDb()
  const result = await seedMenu({ reset: args.includes('--reset'), prune: !args.includes('--no-prune') })
  console.log(`Menu saved: ${result.items} dishes in ${result.categories} categories (${result.removed} removed).`)
} catch (error) {
  console.error('Seeding failed:', error.message)
  process.exitCode = 1
} finally {
  await disconnectDb()
}
