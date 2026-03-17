const dotenv = require("dotenv");

// Loads .env values into process.env for local development.
dotenv.config();

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

module.exports = {
  discord: {
    token: readRequiredEnv("DISCORD_TOKEN"),
    clientId: readRequiredEnv("CLIENT_ID"),
    guildId: process.env.GUILD_ID ? process.env.GUILD_ID.trim() : null
  },
  psn: {
    graphqlUrl: "https://web.np.playstation.com/api/graphql/v1/op",
    origin: "https://checkout.playstation.com",
    requestTimeoutMs: 15000
  }
};
