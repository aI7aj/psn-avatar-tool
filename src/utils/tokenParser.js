// Accept either a raw token or a cookie string containing pdccws_p.
function extractTokenValue(sessionToken) {
  if (!sessionToken || typeof sessionToken !== "string") {
    return "";
  }

  const trimmed = sessionToken.trim();
  if (!trimmed) {
    return "";
  }

  const cookieTokenMatch = trimmed.match(/(?:^|;\s*)pdccws_p=([^;]+)/i);
  if (cookieTokenMatch?.[1]) {
    return cookieTokenMatch[1].trim();
  }

  return trimmed.replace(/^pdccws_p=/i, "").trim();
}

module.exports = {
  extractTokenValue
};
