const formatTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({
        timestamp: formatTimestamp(),
        level: "INFO",
        message,
        ...meta,
      }),
    );
  },
  warn: (message, meta = {}) => {
    console.warn(
      JSON.stringify({
        timestamp: formatTimestamp(),
        level: "WARN",
        message,
        ...meta,
      }),
    );
  },
  error: (message, meta = {}) => {
    console.error(
      JSON.stringify({
        timestamp: formatTimestamp(),
        level: "ERROR",
        message,
        ...meta,
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
          ...meta,
        }),
      );
    }
  },
};

export default logger;
