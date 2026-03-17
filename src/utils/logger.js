const SENSITIVE_KEYS = ["session", "token", "authorization", "cookie", "userinfo"];

// Redacts common token-bearing string patterns before logs are emitted.
function sanitizeString(input) {
  return String(input)
    .replace(/userinfo=[^;]+/gi, "userinfo=[REDACTED]")
    .replace(/(pdccws_p=)[^;,\s]+/gi, "$1[REDACTED]")
    .replace(/(session(?:_?token)?=)[^;,\s]+/gi, "$1[REDACTED]")
    .replace(/(bearer\s+)[a-z0-9\-._~+/]+=*/gi, "$1[REDACTED]");
}

function sanitizeValue(value) {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))) {
      output[key] = "[REDACTED]";
      continue;
    }
    output[key] = sanitizeValue(nestedValue);
  }

  return output;
}

function formatLine(level, message, meta) {
  const timestamp = new Date().toISOString();
  const payload = {
    timestamp,
    level,
    message: sanitizeString(message)
  };

  if (meta !== undefined) {
    payload.meta = sanitizeValue(meta);
  }

  return JSON.stringify(payload);
}

const logger = {
  info(message, meta) {
    console.log(formatLine("info", message, meta));
  },
  warn(message, meta) {
    console.warn(formatLine("warn", message, meta));
  },
  error(message, meta) {
    console.error(formatLine("error", message, meta));
  },
  debug(message, meta) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLine("debug", message, meta));
    }
  }
};

module.exports = { logger };
