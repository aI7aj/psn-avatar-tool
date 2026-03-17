// Converts response objects to text so we can run uniform string-based checks/classifiers.
function toBodyText(responseData) {
  if (typeof responseData === "string") {
    return responseData;
  }

  try {
    return JSON.stringify(responseData);
  } catch {
    return "";
  }
}

// Normalizes different API error node shapes into a single displayable message.
function toErrorMessage(item) {
  if (!item) {
    return null;
  }

  if (typeof item === "string") {
    return item;
  }

  if (typeof item !== "object") {
    return null;
  }

  let message = item.message || item.reason || item.detail || null;
  let code = item.code || null;

  if (item.extensions && typeof item.extensions === "object") {
    code = code || item.extensions.code || null;
    message = message || item.extensions.message || null;
  }

  if (code && message) {
    return `${code}: ${message}`;
  }

  return message || code || null;
}

function addErrorsFromProperty(parent, propertyName, collector) {
  if (!parent || typeof parent !== "object" || !(propertyName in parent)) {
    return;
  }

  const value = parent[propertyName];
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = toErrorMessage(item);
      if (message) {
        collector.push(message);
      }
    }
    return;
  }

  const single = toErrorMessage(value);
  if (single) {
    collector.push(single);
  }
}

function tryExtractApiErrorDetails(responseData) {
  if (!responseData || typeof responseData !== "object") {
    return null;
  }

  const errors = [];
  addErrorsFromProperty(responseData, "errors", errors);
  addErrorsFromProperty(responseData, "error", errors);

  if (responseData.data && typeof responseData.data === "object") {
    addErrorsFromProperty(responseData.data, "errors", errors);
    addErrorsFromProperty(responseData.data, "error", errors);

    if (responseData.data.addToCart && typeof responseData.data.addToCart === "object") {
      addErrorsFromProperty(responseData.data.addToCart, "errors", errors);
      addErrorsFromProperty(responseData.data.addToCart, "userErrors", errors);
      addErrorsFromProperty(responseData.data.addToCart, "error", errors);
    }
  }

  if (errors.length === 0) {
    return null;
  }

  const unique = Array.from(new Set(errors.map((entry) => entry.trim()).filter(Boolean)));
  return unique.slice(0, 2).join(" | ");
}

function containsAny(source, patterns) {
  return patterns.some((pattern) => source.includes(pattern));
}

function getStatusHint(statusCode) {
  if (statusCode === 401 || statusCode === 403) {
    return "Your PSN token is invalid or expired.";
  }
  if (statusCode === 404) {
    return "SKU/region combination was not found.";
  }
  if (statusCode === 409) {
    return "This item may already be owned or already in cart.";
  }
  return null;
}

function classifyFailure(source) {
  if (!source || typeof source !== "string") {
    return null;
  }

  const normalized = source.toLowerCase();

  if (containsAny(normalized, ["already purchased", "already owned", "entitlement", "owned already"])) {
    return "This account likely already owns this avatar.";
  }
  if (
    containsAny(normalized, [
      "already in cart",
      "item exists in cart",
      "exists in user cart",
      "sku already exists in user cart"
    ])
  ) {
    return "This avatar is already in your cart.";
  }
  if (
    containsAny(normalized, [
      "region",
      "country",
      "not available in your region",
      "storefront",
      "locale"
    ])
  ) {
    return "Region mismatch. Use the avatar's exact PSN region.";
  }
  if (
    containsAny(normalized, [
      "unauthorized",
      "forbidden",
      "not signed in",
      "authentication",
      "invalid token",
      "login"
    ])
  ) {
    return "Your PSN token is missing, expired, or invalid.";
  }
  if (containsAny(normalized, ["sku not found", "invalid sku", "unknown sku", "not found"])) {
    return "SKU is invalid or unavailable.";
  }
  if (containsAny(normalized, ["unavailable", "out of stock"])) {
    return "This avatar is currently unavailable.";
  }
  if (containsAny(normalized, ["age", "parental", "restricted"])) {
    return "Account restrictions may block this purchase.";
  }
  if (containsAny(normalized, ["rate limit", "too many requests"])) {
    return "PSN rate-limited the request. Please retry shortly.";
  }

  return null;
}

function clip(value, maxLength) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength)}...`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildAddToCartFailureMessage(statusCode, responseData) {
  const bodyText = toBodyText(responseData);
  const apiDetails = tryExtractApiErrorDetails(responseData);
  const statusHint = getStatusHint(statusCode);
  const classifiedHint = classifyFailure(apiDetails || bodyText);
  const reason = firstNonEmpty(classifiedHint, statusHint);
  const isSuccessStatus = statusCode >= 200 && statusCode < 300;

  if (reason) {
    if (apiDetails) {
      const details = clip(apiDetails, 180);
      return isSuccessStatus
        ? `Add to cart was not confirmed. ${reason} PSN: ${details}`
        : `Add to cart failed (${statusCode}). ${reason} PSN: ${details}`;
    }

    return isSuccessStatus
      ? `Add to cart was not confirmed. ${reason}`
      : `Add to cart failed (${statusCode}). ${reason}`;
  }

  const snippet = clip(bodyText, 280);
  if (snippet) {
    return isSuccessStatus
      ? `Add to cart was not confirmed. ${snippet}`
      : `Add to cart failed (${statusCode}). ${snippet}`;
  }

  return isSuccessStatus
    ? "Add to cart was not confirmed."
    : `Add to cart failed (${statusCode}).`;
}

function shouldResolveAndRetry(responseData) {
  const details = `${tryExtractApiErrorDetails(responseData) || ""} ${toBodyText(responseData) || ""}`
    .toLowerCase()
    .trim();

  if (!details) {
    return false;
  }

  return containsAny(details, [
    "catalog: result sku not found",
    "result sku not found",
    "sku not found",
    "invalid sku",
    "unknown sku"
  ]);
}

module.exports = {
  toBodyText,
  tryExtractApiErrorDetails,
  buildAddToCartFailureMessage,
  shouldResolveAndRetry
};
