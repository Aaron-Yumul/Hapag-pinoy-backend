import dotenv from 'dotenv'

dotenv.config()

function number(value, fallback) {
  const parsed = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback
}

const nodeEnv = process.env.NODE_ENV || 'development'

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: number(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || '',
  // The Atlas connection string has no database name, so it is set here.
  mongoDb: process.env.MONGODB_DB || 'hapagpinoy',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  autoSeed: process.env.AUTO_SEED !== 'false',
  trustProxy: process.env.TRUST_PROXY ? number(process.env.TRUST_PROXY, process.env.TRUST_PROXY) : false,
}
