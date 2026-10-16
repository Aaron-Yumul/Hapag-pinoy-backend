import mongoose from 'mongoose'
import { createApp } from './app.js'
import { connectDb, disconnectDb } from './config/db.js'
import { env } from './config/env.js'
import { Category } from './models/Category.js'
import { ContactMessage } from './models/ContactMessage.js'
import { MenuItem } from './models/MenuItem.js'
import { Reservation } from './models/Reservation.js'
import { seedMenu } from './seed/seedMenu.js'

async function start() {
  try {
    await connectDb()
  } catch (error) {
    console.error(`Could not connect to MongoDB: ${error.message}`)
    console.error('Check the MONGODB_URI in backend/.env, and that your IP address is allowed in Atlas > Network Access.')
    process.exit(1)
  }
  console.log(`Connected to MongoDB (database "${env.mongoDb}")`)

  // Build the indexes (unique slug, unique reservation reference ...) before taking requests.
  await Promise.all([MenuItem, Category, Reservation, ContactMessage].map((model) => model.init()))

  if (env.autoSeed && (await MenuItem.estimatedDocumentCount()) === 0) {
    const result = await seedMenu({ prune: false })
    console.log(`Menu was empty, so it was filled: ${result.items} dishes in ${result.categories} categories.`)
  }

  const server = createApp().listen(env.port, () => {
    console.log(`HapagPinoy API running at http://localhost:${env.port}/api`)
  })

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down...`)
    server.close(async () => {
      await disconnectDb()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  mongoose.connection.on('disconnected', () => console.warn('MongoDB connection lost. The driver will try to reconnect.'))
}

start()
