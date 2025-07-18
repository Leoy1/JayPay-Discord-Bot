import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { setPenaltyConfig, getPenaltyConfig } from '../lib/credit';

export const data = new SlashCommandBuilder()
    .setName('setpenalty')
    .setDescription('Configure late payment penalty settings for this server.')
    .addIntegerOption(option => option.setName('per_day').setDescription('Penalty points per day overdue').setRequired(true))
    .addIntegerOption(option => option.setName('max_penalty').setDescription('Maximum penalty for one debt').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guild?.id;
    if(!guildId){
        await interaction.reply({ content: 'This command can only be used in a server.', flags: 1 << 6 })
        return
    }

    const perDay = interaction.options.getInteger('per_day', true);
    const maxPenalty = interaction.options.getInteger('max_penalty', true);

    if (perDay <= 0 || maxPenalty <= 0){
        await interaction.reply({ content: 'Values must be positive numbers.', flags: 1 << 6 });
        return
    }

    setPenaltyConfig(guildId, perDay, maxPenalty);
    const updated = getPenaltyConfig(guildId);

    await interaction.reply({ content: `Penalty configuration updated:\n- **Per Day**: ${updated.perDay} points\n- **Max Penalty**: ${updated.maxPenalty} points`, flags: 1 << 6 })
}
