import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import db from '../lib/db'
import { formatReasons, HistoryEntry } from '../lib/format'

export const data = new SlashCommandBuilder()
    .setName('debts')
    .setDescription('View who you owe and who owes you')

export async function execute(interaction: ChatInputCommandInteraction){
    const guildId = interaction.guild?.id
    if(!guildId){
        await interaction.reply({ content: 'This command can only be used in a server.', flags: 1 << 6 })
        return
    }

    const userId = interaction.user.id

    const youOweRows = db.prepare(`SELECT id, lender_id, lender_name, amount FROM debts WHERE guild_id = ? AND borrower_id = ? AND amount > 0`).all(guildId, userId) as Array<{ id: number; lender_id: string; lender_name: string; amount: number}>

    const owedToYouRows = db.prepare(`SELECT id, borrower_id, borrower_name, amount FROM debts WHERE guild_id = ? AND lender_id = ? AND amount >0`).all(guildId, userId) as Array<{ id: number; borrower_id: string; borrower_name: string; amount: number}>

    const historyStmt = db.prepare(`SELECT amount, reason FROM debt_history WHERE debt_id = ? ORDER BY timestamp DESC`)

    let response = ''

    if(youOweRows.length > 0){
        response += '**You owe:**\n'
        for(const debt of youOweRows){
            const history = historyStmt.all(debt.id) as HistoryEntry[]
            response += `- <@${debt.lender_id}>: $${debt.amount.toFixed(2)}\n${formatReasons(history)}\n`
        }
    } else{
        response += "You don't owe anyone.\n"
    }

    if(owedToYouRows.length > 0){
        response += "\n**You're owed:**\n"
        for(const debt of owedToYouRows){
            const history = historyStmt.all(debt.id) as HistoryEntry[]
            response += `- <@${debt.borrower_id}>: $${debt.amount.toFixed(2)}\n${formatReasons(history)}\n`
        }
    } else{
        response += '\nNo one owes you.'
    }

    await interaction.reply({ content: response, flags: 1 << 6 })
}