const config = require("../config/config");
const { psnHttp } = require("../integrations/psn/psnHttp");
const { buildBaseHeaders, buildAddToCartHeaders } = require("../integrations/psn/psnHeaders");
const { buildAddToCartPayload } = require("../integrations/psn/psnGraphql");
const { logger } = require("../utils/logger");
const { extractTokenValue } = require("../utils/tokenParser");
const {
  toBodyText,
  buildAddToCartFailureMessage,
  shouldResolveAndRetry
} = require("../utils/errorParser");
const { traceRequest, traceResponse } = require("../utils/traceLogger");

const CHIHIRO_BASE_URL = "https://store.playstation.com/store/api/chihiro/00_09_000/container";

function ensureRequiredFields(sku, sessionToken) {
  if (!sku || !String(sku).trim() || !sessionToken || !String(sessionToken).trim()) {
    throw new Error("Token and SKU are required.");
  }
}

function extractRegionFromAcceptLanguage(acceptLanguage) {
  if (!acceptLanguage || typeof acceptLanguage !== "string") {
    return "en-US";
  }

  const firstItem = acceptLanguage.split(",")[0]?.trim() || "";
  const withoutQuality = firstItem.split(";")[0]?.trim() || "";
  return withoutQuality || "en-US";
}

function splitRegion(region) {
  const normalized = String(region || "").replace(/-/g, "/");
  const idx = normalized.lastIndexOf("/");

  if (idx <= 0 || idx >= normalized.length - 1) {
    return { store: "", lang: "" };
  }

  return {
    store: normalized.slice(0, idx),
    lang: normalized.slice(idx + 1)
  };
}

function buildCatalogLookupUrl(skuId, acceptLanguage) {
  const region = extractRegionFromAcceptLanguage(acceptLanguage);
  const { store, lang } = splitRegion(region);

  if (!store || !lang) {
    return null;
  }

  const encodedSku = encodeURIComponent(String(skuId).trim());
  return `${CHIHIRO_BASE_URL}/${encodeURIComponent(lang)}/${encodeURIComponent(store)}/19/${encodedSku}/`;
}

function extractDefaultSkuId(catalogResponseBody) {
  const skuId = catalogResponseBody?.default_sku?.id;
  if (typeof skuId !== "string" || !skuId.trim()) {
    return null;
  }

  return skuId.trim();
}

async function resolveDefaultSkuId(skuId, sessionToken, acceptLanguage) {
  const url = buildCatalogLookupUrl(skuId, acceptLanguage);
  if (!url) {
    return null;
  }

  const headers = buildBaseHeaders(sessionToken, acceptLanguage);
  traceRequest("GET", url, headers);

  try {
    const response = await psnHttp.get(url, { headers });
    traceResponse("GET", url, response.status, response.data);
    if (response.status < 200 || response.status >= 300) {
      return null;
    }

    return extractDefaultSkuId(response.data);
  } catch (error) {
    logger.warn("Default SKU resolution failed", {
      code: error.code,
      message: error.message
    });
    return null;
  }
}

async function postGraphQlRequest(body, headers) {
  const endpoint = config.psn.graphqlUrl;
  traceRequest("POST", endpoint, headers, body);

  try {
    const response = await psnHttp.post(endpoint, body, { headers });
    traceResponse("POST", endpoint, response.status, response.data);
    return response;
  } catch (error) {
    logger.error("Failed to reach PSN GraphQL endpoint", {
      code: error.code,
      message: error.message
    });
    throw new Error("Could not reach PlayStation servers. Please try again.");
  }
}

async function addToCart(skuId, sessionToken, acceptLanguage) {
  ensureRequiredFields(skuId, sessionToken);

  const normalizedSku = String(skuId).trim();
  const extractedToken = extractTokenValue(String(sessionToken));

  if (!extractedToken) {
    throw new Error("Token and SKU are required.");
  }

  const headers = buildAddToCartHeaders(extractedToken, acceptLanguage);
  let response = await postGraphQlRequest(buildAddToCartPayload(normalizedSku), headers);

  if (shouldResolveAndRetry(response.data)) {
    const resolvedSkuId = await resolveDefaultSkuId(normalizedSku, extractedToken, acceptLanguage);

    if (resolvedSkuId && resolvedSkuId !== normalizedSku) {
      response = await postGraphQlRequest(buildAddToCartPayload(resolvedSkuId), headers);
    }
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(buildAddToCartFailureMessage(response.status, response.data));
  }

  const bodyText = toBodyText(response.data);
  if (!/subTotalPrice/i.test(bodyText)) {
    throw new Error(buildAddToCartFailureMessage(response.status, response.data));
  }

  return response.data;
}

async function addAvatarToCart({ sku, session, acceptLanguage }) {
  ensureRequiredFields(sku, session);

  const safeSku = String(sku).trim();
  const safeSession = String(session).trim();
  const result = await addToCart(safeSku, safeSession, acceptLanguage);

  return {
    sku: safeSku,
    result
  };
}

module.exports = {
  addAvatarToCart,
  addToCart
};
