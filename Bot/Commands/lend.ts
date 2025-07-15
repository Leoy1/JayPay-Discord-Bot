import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('lend')
  .setDescription('Lend money to another user.')
  .addUserOption(option => option.setName('user').setDescription('Who you are lending to').setRequired(true))
  .addNumberOption(option => option.setName('amount').setDescription('Amount of money').setRequired(true))
  .addStringOption(option =>option.setName('reason').setDescription('Reason for the loan').setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const borrower = interaction.options.getUser('user');
  const amount = interaction.options.getNumber('amount');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  await interaction.reply( `${interaction.user.username} lent $${amount} to ${borrower} for "${reason}".`);

  //TODO: Save infor in a JSON file or in-memory map
}