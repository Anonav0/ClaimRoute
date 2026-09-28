import admin from "firebase-admin";
import config from "./env.js";
import logger from "../utils/logger.js";

let initializedApp = null;
let initializedDb = null;

/**
 * Initializes Firebase Admin SDK and Cloud Firestore.
 * Prevents multiple initializations and supports service account credentials,
 * application default credentials, or local Firestore emulator mode.
 */
export function initializeFirebase() {
  if (initializedApp && initializedDb) {
    return {
      app: initializedApp,
      db: initializedDb,
      FieldValue: admin.firestore.FieldValue,
      Timestamp: admin.firestore.Timestamp,
    };
  }

  // Prevent multiple Firebase apps with the same name
  if (admin.apps.length > 0) {
    initializedApp = admin.apps[0];
    initializedDb = admin.firestore(initializedApp);
    return {
      app: initializedApp,
      db: initializedDb,
      FieldValue: admin.firestore.FieldValue,
      Timestamp: admin.firestore.Timestamp,
    };
  }

  try {
    const { projectId, clientEmail, privateKey, emulatorHost } =
      config.firebase;

    // Check if running against local Firestore Emulator
    if (emulatorHost) {
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      logger.info("Connecting to Firestore Emulator", {
        emulatorHost,
        projectId,
      });

      initializedApp = admin.initializeApp({
        projectId: projectId || "demo-claimroute",
      });
    } else if (clientEmail && privateKey) {
      // Service Account Credential initialization
      logger.info(
        "Initializing Firebase Admin with Service Account credentials",
        {
          projectId,
          clientEmail,
        },
      );

      initializedApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      // Default initialization (falls back to Google Application Default Credentials or Project ID)
      logger.info(
        "Initializing Firebase Admin with Project ID / Application Default Credentials",
        {
          projectId,
        },
      );

      initializedApp = admin.initializeApp({
        projectId,
      });
    }

    initializedDb = admin.firestore(initializedApp);

    // Apply settings if needed (ignore undefined properties for clean Firestore persistence)
    initializedDb.settings({
      ignoreUndefinedProperties: true,
    });

    logger.info("Firebase Admin & Firestore successfully initialized");
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin SDK", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }

  return {
    app: initializedApp,
    db: initializedDb,
    FieldValue: admin.firestore.FieldValue,
    Timestamp: admin.firestore.Timestamp,
  };
}

// Initialize on module load
const firebaseContext = initializeFirebase();

export const firestore = firebaseContext.db;
export const db = firebaseContext.db;
export const FieldValue = firebaseContext.FieldValue;
export const Timestamp = firebaseContext.Timestamp;

export default {
  app: firebaseContext.app,
  db: firebaseContext.db,
  firestore: firebaseContext.db,
  FieldValue: firebaseContext.FieldValue,
  Timestamp: firebaseContext.Timestamp,
  initializeFirebase,
};
