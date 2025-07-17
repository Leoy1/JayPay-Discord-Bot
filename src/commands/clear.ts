import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import db from '../lib/db'
import { updateCreditScore } from '../lib/credit'

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear a debt you let to another user.')
    .addUserOption(option => option.setName('user').setDescription('The borrower whose debt you want to clear').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction){
    try{
        const guildId = interaction.guild?.id
        if(!guildId){
            await interaction.reply({ content: 'This command can only be used in a server.', flags: 1 << 6})
            return
        }

        const lenderId = interaction.user.id
        const borrower = interaction.options.getUser('user')
        if(!borrower){
            await interaction.reply({content: 'Invalid user.', flags: 1 << 6})
            return
        }

        const selectDebtStmt = db.prepare('SELECT id FROM debts WHERE guild_id = ? AND lender_id = ? AND borrower_id = ?')
        const deleteDebtStmt = db.prepare('DELETE FROM debts WHERE id = ?')
        const deleteHistoryStmt = db.prepare('DELETE FROM debt_history WHERE debt_id = ?')

        const debt = selectDebtStmt.get(guildId, lenderId, borrower.id) as { id: number } | undefined
        if(!debt){
            await interaction.reply({ content: `No debt found that you lent to ${borrower.username}.`, flags: 1 << 6 })
            return
        }

        const txn = db.transaction(() => {deleteHistoryStmt.run(debt.id); deleteDebtStmt.run(debt.id);})

        txn()

        updateCreditScore(guildId, borrower.id, -10)

        await interaction.reply({ content: `Cleared debt you lent to ${borrower.username}.`, flags: 1 << 6})
    } catch(error){
        console.error('/clear error', error)
        if(!interaction.replied){await interaction.reply({ content: 'An unexepcted error occured.', flags: 1 << 6})}
    }
}