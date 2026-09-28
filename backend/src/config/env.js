import dotenv from 'dotenv';

dotenv.config();

// Helper to sanitize private keys with literal or escaped newlines
const parsePrivateKey = (key) => {
  if (!key) return undefined;
  return key.replace(/\\n/g, '\n');
};

/**
 * Validates required environment variables and fails fast without leaking secret values.
 *
 * @param {Object} [customEnv=process.env]
 * @throws {Error} if required variables are missing or malformed
 */
export function validateEnv(customEnv = process.env) {
  const isProd = customEnv.NODE_ENV === 'production';
  const missing = [];

  if (customEnv.PORT) {
    const parsedPort = parseInt(customEnv.PORT, 10);
    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      throw new Error('Invalid environment variable PORT: must be an integer between 1 and 65535.');
    }
  }

  if (customEnv.CLAIM_TOKEN_EXPIRATION_MINUTES) {
    const mins = parseInt(customEnv.CLAIM_TOKEN_EXPIRATION_MINUTES, 10);
    if (isNaN(mins) || mins <= 0 || mins > 1440) {
      throw new Error('Invalid environment variable CLAIM_TOKEN_EXPIRATION_MINUTES: must be between 1 and 1440.');
    }
  }

  // Production-only enforcement
  if (isProd) {
    if (!customEnv.FIREBASE_PROJECT_ID) {
      missing.push('FIREBASE_PROJECT_ID');
    }

    if (!customEnv.FIRESTORE_EMULATOR_HOST) {
      if (!customEnv.FIREBASE_CLIENT_EMAIL) {
        missing.push('FIREBASE_CLIENT_EMAIL');
      }
      if (!customEnv.FIREBASE_PRIVATE_KEY) {
        missing.push('FIREBASE_PRIVATE_KEY');
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable: ${missing.join(', ')}`);
  }

  return true;
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Client URL for claim links
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',

  // Claim Token Security Configuration
  claimToken: {
    expirationMinutes: parseInt(process.env.CLAIM_TOKEN_EXPIRATION_MINUTES || '30', 10),
  },

  // Firebase / Firestore configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'claimroute-dev',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    databaseId: process.env.FIREBASE_DATABASE_ID || '(default)',
  },
};

export default config;
