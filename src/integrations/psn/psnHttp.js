const axios = require("axios");
const config = require("../../config/config");

// Shared PSN HTTP client so timeout/status behavior is consistent everywhere.
const psnHttp = axios.create({
  baseURL: config.psn.origin,
  timeout: config.psn.requestTimeoutMs,
  validateStatus: () => true
});

module.exports = {
  psnHttp
};
