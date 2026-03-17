const PERSISTED_QUERIES = {
  addToCart: "172201d061f14df437df93ec1b862d7885c27ac5d662bc91db6ce788d2484291"
};

function buildPersistedQuery(operationName) {
  const sha256Hash = PERSISTED_QUERIES[operationName];
  if (!sha256Hash) {
    throw new Error(`Missing persisted query hash for operation: ${operationName}`);
  }

  return {
    version: 1,
    sha256Hash
  };
}

function buildAddToCartPayload(skuId) {
  return {
    operationName: "addToCart",
    variables: {
      skus: [
        {
          skuId,
          rewardId: "OUTRIGHT"
        }
      ]
    },
    extensions: {
      persistedQuery: buildPersistedQuery("addToCart")
    }
  };
}

module.exports = {
  buildAddToCartPayload,
  buildPersistedQuery
};
