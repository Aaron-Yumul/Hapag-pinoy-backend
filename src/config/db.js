import mongoose from 'mongoose'
import { env } from './env.js'

mongoose.set('strictQuery', true)

export async function connectDb() {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is missing. Copy backend/.env.example to backend/.env and add your MongoDB Atlas connection string.')
  }
  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDb,
    serverSelectionTimeoutMS: 10000,
  })
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.disconnect()
}
