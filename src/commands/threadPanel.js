const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const { logger } = require("../utils/logger");

const PANEL_CUSTOM_ID = "create_thread";

function isThreadPanelMessage(message, botUserId) {
  if (!message || message.author?.id !== botUserId) {
    return false;
  }

  if (!Array.isArray(message.components) || message.components.length === 0) {
    return false;
  }

  return message.components.some((row) =>
    Array.isArray(row.components) &&
    row.components.some((component) => component.customId === PANEL_CUSTOM_ID)
  );
}

async function findPanelMessageInChannel(channel, botUserId) {
  if (!channel?.isTextBased?.() || channel?.isThread?.()) {
    return null;
  }

  try {
    const recentMessages = await channel.messages.fetch({ limit: 50 });
    return recentMessages.find((message) => isThreadPanelMessage(message, botUserId)) || null;
  } catch {
    return null;
  }
}

async function findExistingPanelMessage(interaction) {
  const botUserId = interaction.client.user.id;
  const channelPanel = await findPanelMessageInChannel(interaction.channel, botUserId);
  if (channelPanel) {
    return channelPanel;
  }

  if (!interaction.guild) {
    return null;
  }

  for (const channel of interaction.guild.channels.cache.values()) {
    if (channel.id === interaction.channelId) {
      continue;
    }

    const panelMessage = await findPanelMessageInChannel(channel, botUserId);
    if (panelMessage) {
      return panelMessage;
    }
  }

  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Post the thread creation panel for avatar cart operations (admin only).")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Posts/updates a single panel with a "Create thread" button used for private workflow threads.
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Thread creator")
      .setDescription(
        "Click button to get started!\n"
      )
      .setFooter({ text: "Made with <3 by al7aj. (v1.0)" });

    const createThreadButton = new ButtonBuilder()
      .setCustomId(PANEL_CUSTOM_ID)
      .setLabel("Create thread")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(createThreadButton);
    const existingPanelMessage = await findExistingPanelMessage(interaction);

    if (existingPanelMessage) {
      await existingPanelMessage.edit({
        embeds: [embed],
        components: [row],
        content: null
      });

      logger.info("Updated existing thread panel", {
        channelId: existingPanelMessage.channelId,
        messageId: existingPanelMessage.id,
        userId: interaction.user.id
      });

      await interaction.reply({
        content: `Thread panel already exists and was updated: ${existingPanelMessage.url}`,
        ephemeral: true
      });
      return;
    }

    const panelMessage = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    logger.info("Posted thread panel", {
      channelId: interaction.channelId,
      messageId: panelMessage.id,
      userId: interaction.user.id
    });

    await interaction.reply({
      content: "Thread panel posted.",
      ephemeral: true
    });
  }
};
