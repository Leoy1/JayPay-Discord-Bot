import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { roundToTwoDecimals } from "../lib/format"
import db from '../lib/db'
import { updateCreditScore } from '../lib/credit'

export const data = new SlashCommandBuilder()
    .setName('repay')
    .setDescription('Repay a user you owe money to.')
    .addUserOption(option => option.setName('user').setDescription('The person you are repaying').setRequired(true))
    .addNumberOption(option => option.setName('amount').setDescription('Amount you are repaying').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction){
    const guildId = interaction.guildId ?? ''
    if(!guildId){
        await interaction.reply({ content: 'This comand can only be used in a server', flags: 1 << 6})
        return
    }

    const borrowerId = interaction.user.id
    const lender = interaction.options.getUser('user')
    const amount = interaction.options.getNumber('amount')

    if(!lender || !amount || amount <= 0){
        await interaction.reply({ content: 'Invalid lender or amount.', flags: 1 << 6 })
        return
    }

    const selectDebtsStmt = db.prepare<[string, string, string], { id: number; amount: number }>('SELECT id, amount FROM debts WHERE guild_id = ? AND lender_id = ? AND borrower_id = ? ORDER BY id')

    const debts = selectDebtsStmt.all(guildId, lender.id, borrowerId) as Array<{ id: number; amount: number }>

    if(debts.length === 0){
        await interaction.reply({ content: `You don't owe any money to ${lender.username}, so you can't repay them.`, flags: 1 << 6})
        return
    }

    const totalOwed = debts.reduce((sum, d) => sum + d.amount, 0)
    if(amount > totalOwed){
        await interaction.reply({ content: `You only owe ${lender.username} $${totalOwed.toFixed(2)}. Use that amount or less.`, flags: 1 << 6})
        return
    }

    const updateDebtStmt = db.prepare('UPDATE debts SET amount = ? WHERE id = ?')
    const deleteDebtStmt = db.prepare('DELETE FROM debts WHERE id = ?')
    const insertHistoryStmt = db.prepare('INSERT INTO debt_history (debt_id, amount, reason, timestamp) VALUES (?, ?, ?, ?)')

    let remaining = amount
    let totalRepaid = 0

    const txn = db.transaction(() => {
        for (const debt of debts) {
            if (remaining <= 0) break
                
            let repayAmount: number
        
            if(remaining >= debt.amount){
                repayAmount = debt.amount;
                remaining -= debt.amount;
                deleteDebtStmt.run(debt.id)
            } else{
                repayAmount = remaining;
                const newAmount = roundToTwoDecimals(debt.amount - remaining)
                remaining = 0
                updateDebtStmt.run(newAmount, debt.id)
            }

            totalRepaid += debt.amount
            insertHistoryStmt.run(debt.id, -repayAmount, 'Repayment', Date.now())
        }
    })

    txn()

    if(totalRepaid > 0){
        updateCreditScore(guildId, borrowerId, 5)
        await interaction.reply(`${interaction.user.username} repaid $${totalRepaid} to ${lender.username}.`)
    } else{
        await interaction.reply({ content: `No matching debt to repay.`, flags: 1 << 6})
    }
}