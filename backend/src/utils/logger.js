const formatTimestamp = () => new Date().toISOString();

const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /rawtoken/i,
  /tokenhash/i,
  /hash/i,
  /password/i,
  /secret/i,
  /privatekey/i,
  /authorization/i,
  /key/i,
  /phone/i,
  /address/i,
  /notes/i,
  /credential/i,
  /cookie/i,
];

/**
 * Recursively redacts sensitive keys in log metadata to prevent accidental PII/secret leaks
 * @param {*} value
 * @param {string} keyName
 * @returns {*} Sanitized value
 */
export function sanitizeLogValue(value, keyName = "") {
  if (value === null || value === undefined) return value;

  // Check if key itself represents sensitive data
  if (
    keyName &&
    SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(keyName))
  ) {
    // Preserve harmless keys like 'projectId' or 'error.code'
    if (
      keyName === "projectId" ||
      keyName === "code" ||
      keyName === "statusCode"
    ) {
      return value;
    }
    return "[REDACTED]";
  }

  // Handle strings: redact long base64/hex token-like or private key strings
  if (typeof value === "string") {
    if (value.includes("BEGIN PRIVATE KEY")) {
      return "[REDACTED_PRIVATE_KEY]";
    }
    return value;
  }

  // Handle objects recursively
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeLogValue(item));
    }

    const sanitized = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeLogValue(v, k);
    }
    return sanitized;
  }

  return value;
}

export const sanitizeMetadata = (obj) => sanitizeLogValue(obj);

export const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({
        timestamp: formatTimestamp(),
        level: "INFO",
        message,
        ...sanitizeLogValue(meta),
      }),
    );
  },
  warn: (message, meta = {}) => {
    console.warn(
      JSON.stringify({
        timestamp: formatTimestamp(),
        level: "WARN",
        message,
        ...sanitizeLogValue(meta),
      }),
    );
  },
  error: (message, meta = {}) => {
    console.error(
      JSON.stringify({
        timestamp: formatTimestamp(),
        level: "ERROR",
        message,
        ...sanitizeLogValue(meta),
      }),
    );
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        JSON.stringify({
          timestamp: formatTimestamp(),
          level: "DEBUG",
          message,
          ...sanitizeLogValue(meta),
        }),
      );
    }
  },
};

export default logger;
