const fs = require("fs");
const path = require("path");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const config = require("./config/config");
const { registerInteractionHandler } = require("./handlers/interactionHandler");
const { logger } = require("./utils/logger");
const threadManager = require("./utils/threadManager");

// Loads command modules dynamically so new commands can be added without changing bot.js.
function loadCommands(commandsDir) {
  const commandFiles = fs
    .readdirSync(commandsDir)
    .filter((file) => file.endsWith(".js"));

  const commands = new Collection();

  for (const file of commandFiles) {
    const commandPath = path.join(commandsDir, file);
    const commandModule = require(commandPath);

    if (!commandModule?.data || !commandModule?.execute) {
      logger.warn("Skipping invalid command module", { file });
      continue;
    }

    commands.set(commandModule.data.name, commandModule);
  }

  return commands;
}

async function start() {
  // Guild intent is enough for slash-command interaction workflows.
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  // Share the command collection with the interaction router.
  client.commands = loadCommands(path.join(__dirname, "commands"));
  registerInteractionHandler(client);

  client.once(Events.ClientReady, (readyClient) => {
    threadManager.cleanupInactiveThreads(client);
    logger.info("Discord bot is online", {
      botTag: readyClient.user.tag,
      loadedCommands: client.commands.size
    });
  });

  await client.login(config.discord.token);
}

start().catch((error) => {
  logger.error("Bot failed to start", { error: error.message });
  process.exit(1);
});
