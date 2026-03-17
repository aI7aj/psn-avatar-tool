const { ChannelType, Events } = require("discord.js");
const { logger } = require("../utils/logger");
const threadManager = require("../utils/threadManager");

const NON_THREAD_COMMANDS = new Set(["setup"]);

function buildThreadName(username) {
  const normalized = String(username || "user")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const base = normalized || "user";
  return `${base.slice(0, 80)}-avatar`;
}

async function resolveExistingUserThread(client, userId) {
  const existingSession = threadManager.getActiveThread(userId);
  if (!existingSession) {
    return null;
  }

  try {
    const existingThread = await client.channels.fetch(existingSession.threadId);
    if (!existingThread?.isThread() || existingThread.archived) {
      threadManager.removeThread(userId);
      return null;
    }

    return existingThread;
  } catch {
    threadManager.removeThread(userId);
    return null;
  }
}

async function handleCreateThreadButton(interaction) {
  const userId = interaction.user.id;
  const existingThread = await resolveExistingUserThread(interaction.client, userId);

  if (existingThread) {
    threadManager.updateActivity(userId);
    return interaction.reply({
      content: `You already have an active thread: <#${existingThread.id}>`,
      ephemeral: true
    });
  }

  if (!threadManager.canCreateThread(userId)) {
    const remainingMs = threadManager.getCooldownRemainingMs(userId);
    const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));

    return interaction.reply({
      content: `Please wait before creating another thread. (${remainingSeconds}s)`,
      ephemeral: true
    });
  }

  const parentChannel = interaction.channel;
  if (!parentChannel || parentChannel.isThread() || !parentChannel.threads) {
    return interaction.reply({
      content: "Thread creation is only available from a standard text channel panel.",
      ephemeral: true
    });
  }

  try {
    const thread = await parentChannel.threads.create({
      name: buildThreadName(interaction.user.username),
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: 60,
      reason: `Thread requested by ${interaction.user.tag}`
    });

    await thread.members.add(userId);
    threadManager.setActiveThread(userId, thread.id);

    logger.info("Created private workflow thread", {
      userId,
      threadId: thread.id,
      parentChannelId: parentChannel.id
    });

    return interaction.reply({
      content: `Thread created: <#${thread.id}>`,
      ephemeral: true
    });
  } catch (error) {
    logger.error("Failed to create private thread", {
      userId,
      channelId: interaction.channelId,
      error: error.message
    });

    return interaction.reply({
      content: "Could not create your thread. Please try again.",
      ephemeral: true
    });
  }
}

function registerInteractionHandler(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.customId === "create_thread") {
        await handleCreateThreadButton(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn("Command handler missing for interaction", {
        commandName: interaction.commandName
      });
      return;
    }

    const commandAllowedOutsideThread = NON_THREAD_COMMANDS.has(interaction.commandName);
    if (!commandAllowedOutsideThread && !interaction.channel?.isThread?.()) {
      return interaction.reply({
        content: "Please run this command inside your thread.",
        ephemeral: true
      });
    }

    try {
      if (interaction.channel?.isThread?.()) {
        threadManager.updateActivity(interaction.user.id);
      }

      await command.execute(interaction);
    } catch (error) {
      logger.error("Unhandled interaction execution error", {
        commandName: interaction.commandName,
        userId: interaction.user.id,
        error: error.message
      });

      const fallbackContent = "Unexpected error while processing your request.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: fallbackContent });
      } else {
        await interaction.reply({ content: fallbackContent, ephemeral: true });
      }
    }
  });

  client.on(Events.ThreadDelete, (thread) => {
    threadManager.removeThreadById(thread.id);
  });

  client.on(Events.ThreadUpdate, (oldThread, newThread) => {
    if (newThread.archived) {
      threadManager.removeThreadById(newThread.id);
    }
  });
}

module.exports = {
  registerInteractionHandler
};
