const { logger } = require("./logger");
const { toBodyText } = require("./errorParser");

const TRACE_ADD_TO_CART =
  process.env.PSN_TRACE_ADD_TO_CART === "1" || process.env.PSN_TRACE_ADD_TO_CART === "true";

function maskCookie(cookie) {
  if (!cookie || typeof cookie !== "string") {
    return "";
  }

  return cookie
    .replace(/(pdccws_p=)[^;]+/i, "$1***")
    .replace(/(userinfo=)[^;]+/i, "$1***");
}

function traceRequest(method, url, headers, payload) {
  if (!TRACE_ADD_TO_CART) {
    return;
  }

  logger.info("PSN add-to-cart request trace", {
    method,
    url,
    headers: {
      Origin: headers?.Origin || "",
      Referer: headers?.Referer || "",
      Accept: headers?.Accept || "",
      "Accept-Language": headers?.["Accept-Language"] || "",
      "User-Agent": headers?.["User-Agent"] || "",
      "apollographql-client-name": headers?.["apollographql-client-name"] || "",
      "apollographql-client-version": headers?.["apollographql-client-version"] || "",
      "x-psn-app-ver": headers?.["x-psn-app-ver"] || "",
      "x-psn-correlation-id": headers?.["x-psn-correlation-id"] || "",
      "x-psn-request-id": headers?.["x-psn-request-id"] || "",
      "x-psn-storefront-type": headers?.["x-psn-storefront-type"] || "",
      "x-tenant-id": headers?.["x-tenant-id"] || "",
      authPreview: maskCookie(headers?.Cookie || "")
    },
    payload
  });
}

function traceResponse(method, url, status, responseData) {
  if (!TRACE_ADD_TO_CART) {
    return;
  }

  const bodyText = toBodyText(responseData);
  logger.info("PSN add-to-cart response trace", {
    method,
    url,
    status,
    bodySnippet: bodyText.length > 1200 ? `${bodyText.slice(0, 1200)}...` : bodyText
  });
}

module.exports = {
  traceRequest,
  traceResponse,
  maskCookie
};
