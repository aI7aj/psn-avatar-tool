const { SlashCommandBuilder } = require("discord.js");
const { addAvatarToCart } = require("../services/cartService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-to-cart")
    .setDescription("Add a PlayStation avatar SKU to your cart using a session token.")
    .addStringOption((option) =>
      option
        .setName("sku")
        .setDescription("PlayStation avatar SKU (example: UP9000-CUSA00000_00-AVATAR001)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("session")
        .setDescription("PlayStation session token")
        .setRequired(true)
    ),

  // Reads slash-command args, calls service logic, and returns private success/error feedback.
  async execute(interaction) {
    const sku = interaction.options.getString("sku", true).trim();
    const session = interaction.options.getString("session", true).trim();
    const acceptLanguage = interaction.locale || null;

    // Every response is ephemeral to keep sensitive workflows private.
    await interaction.deferReply({ ephemeral: true });

    try {
      await addAvatarToCart({ sku, session, acceptLanguage });
      await interaction.editReply({
        content: `Successfully added \`${sku}\` to your PlayStation cart.`
      });
    } catch (error) {
      await interaction.editReply({
        content: `Unable to add avatar to cart: ${error.message}`
      });
    }
  }
};
