const { randomUUID } = require("crypto");
const config = require("../../config/config");
const { extractTokenValue } = require("../../utils/tokenParser");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
const APOLLO_CLIENT_NAME = "@sie-ppr-web-checkout/app";
const APOLLO_CLIENT_VERSION = "2.165.0";
const X_PSN_APP_VER = "@sie-ppr-web-checkout/app/v2.165.0";

function normalizeAcceptLanguage(acceptLanguage) {
  if (!acceptLanguage || typeof acceptLanguage !== "string") {
    return null;
  }

  const trimmed = acceptLanguage.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.includes(",") ? trimmed : `${trimmed},en;q=0.5`;
}

function buildSessionCookie(sessionToken) {
  const token = extractTokenValue(sessionToken);
  return `AKA_A2=A; pdccws_p=${token}; isSignedIn=true; p=0; gpdcTg=%5B1%5D`;
}

function buildBaseHeaders(sessionToken, acceptLanguage) {
  const normalizedAcceptLanguage = normalizeAcceptLanguage(acceptLanguage);
  const headers = {
    Origin: config.psn.origin,
    Referer: `${config.psn.origin}/`,
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
    Cookie: buildSessionCookie(sessionToken)
  };

  if (normalizedAcceptLanguage) {
    headers["Accept-Language"] = normalizedAcceptLanguage;
  }

  return headers;
}

function buildAddToCartHeaders(sessionToken, acceptLanguage) {
  const headers = buildBaseHeaders(sessionToken, acceptLanguage);
  headers.Accept = "application/json";
  headers["apollographql-client-name"] = APOLLO_CLIENT_NAME;
  headers["apollographql-client-version"] = APOLLO_CLIENT_VERSION;
  headers["x-psn-app-ver"] = X_PSN_APP_VER;
  headers["x-psn-correlation-id"] = randomUUID();
  headers["x-psn-request-id"] = randomUUID();
  headers["x-psn-storefront-type"] = "checkout:store";
  headers["x-tenant-id"] = "0";
  return headers;
}

module.exports = {
  USER_AGENT,
  normalizeAcceptLanguage,
  buildBaseHeaders,
  buildAddToCartHeaders
};
