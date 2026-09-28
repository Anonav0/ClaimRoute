import dotenv from "dotenv";

dotenv.config();

// Helper to sanitize private keys with literal or escaped newlines
const parsePrivateKey = (key) => {
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
};

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  isTest: process.env.NODE_ENV === "test",

  // Firebase / Firestore configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "claimroute-dev",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    databaseId: process.env.FIREBASE_DATABASE_ID || "(default)",
  },
};

export default config;
