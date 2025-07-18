import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getCreditScore, applyPenaltiesForUser } from '../lib/credit'

function getScoreTier(score: number): string {
    if(score >= 700) return '🟣 Excellent'
    if(score >= 600) return '🟢 Good'
    if(score >= 500) return '🟡 Fair'
    if(score >= 400) return '🟠 Poor'
    return '🔴 Very Poor'
}

export const data = new SlashCommandBuilder()
    .setName('score')
    .setDescription('Check your server credit score.')
    .addUserOption(option => option.setName('user').setDescription("Check another user's credit score").setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction){
    const guildId = interaction.guildId ?? ''
    const targetUser = interaction.options.getUser('user') || interaction.user
    const userId = targetUser.id

    applyPenaltiesForUser(guildId, userId)

    const score = getCreditScore(guildId, userId)
    const tier = getScoreTier(score)

    await interaction.reply({ content: `Credit score for **${targetUser.username}** is **${score}** (${tier}).`, flags: 1 << 6 })
}