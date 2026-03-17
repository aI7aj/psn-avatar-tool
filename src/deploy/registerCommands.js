const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const config = require("../config/config");
const { logger } = require("../utils/logger");

// Reads command files and converts SlashCommandBuilder objects into API payloads.
function loadCommandPayloads(commandsDir) {
  const files = fs.readdirSync(commandsDir).filter((file) => file.endsWith(".js"));
  const payloads = [];

  for (const file of files) {
    const commandPath = path.join(commandsDir, file);
    const command = require(commandPath);

    if (!command?.data?.toJSON) {
      logger.warn("Skipping command during deploy; missing SlashCommandBuilder data", { file });
      continue;
    }

    payloads.push(command.data.toJSON());
  }

  return payloads;
}

async function registerCommands() {
  const commandsDir = path.join(__dirname, "..", "commands");
  const commandPayloads = loadCommandPayloads(commandsDir);

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  if (config.discord.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandPayloads }
    );

    logger.info("Registered guild slash commands", {
      guildId: config.discord.guildId,
      commandCount: commandPayloads.length
    });
    return;
  }

  await rest.put(Routes.applicationCommands(config.discord.clientId), {
    body: commandPayloads
  });

  logger.info("Registered global slash commands", {
    commandCount: commandPayloads.length
  });
}

registerCommands().catch((error) => {
  logger.error("Failed to register slash commands", { error: error.message });
  process.exit(1);
});
