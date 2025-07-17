import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import db from '../lib/db'
import { getCreditScore } from '../lib/credit'

export const data = new SlashCommandBuilder()
  .setName('lend')
  .setDescription('Lend money to another user.')
  .addUserOption(option => option.setName('user').setDescription('Who you are lending to').setRequired(true))
  .addNumberOption(option => option.setName('amount').setDescription('Amount of money').setRequired(true))
  .addStringOption(option =>option.setName('reason').setDescription('Reason for the loan').setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guild?.id
  if(!guildId){
    await interaction.reply({ content: 'This command can only ve used in a server.', flags: 1 << 6})
    return
  }

  const lenderId = interaction.user.id
  const lenderName = interaction.user.username
  const borrower = interaction.options.getUser('user');
  const amount = interaction.options.getNumber('amount');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const botUserId = interaction.client.user?.id

  if(!borrower || !amount || amount <= 0 || borrower.id === interaction.user.id || borrower.id === botUserId){
    await interaction.reply({ content: 'Invalid borrower or amount.', flags: 1 << 6})
    return
  }

  const borrowerScore = getCreditScore(guildId, borrower.id)
  const lowScoreWarning = borrowerScore < 500 ? `Warning: ${borrower.username} has a lower credit score (${borrowerScore}).\n\n`: ''

  const selectDebtStmt = db.prepare<[string, string, string], { id: number; amount: number }>(`SELECT id, amount FROM debts WHERE guild_id = ? and lender_id = ? AND borrower_id = ?`)

  const insertDebtStmt = db.prepare(`INSERT INTO debts (guild_id, lender_id, lender_name, borrower_id, borrower_name, amount) VALUES (?, ?, ?, ?, ?, ?)`)

  const updateDebtStmt = db.prepare(`UPDATE debts SET amount = amount + ? WHERE id = ?`)

  const insertHistoryStmt = db.prepare(`INSERT INTO debt_history (debt_id, amount, reason, timestamp) VALUES (?, ?, ?, ?)`)

  const txn = db.transaction(() => {
    const existing = selectDebtStmt.get(guildId, lenderId, borrower.id) as { id: number; amount: number } | undefined

    if(existing){
      updateDebtStmt.run(amount, existing.id)
      insertHistoryStmt.run(existing.id, amount, reason, Date.now())
      return existing.id
    } else{
      const result = insertDebtStmt.run(guildId, lenderId, lenderName, borrower.id, borrower.username, amount)
      const debtId = Number(result.lastInsertRowid)
      insertHistoryStmt.run(debtId, amount, reason, Date.now())
      return debtId
    }
  })

  txn()

  await interaction.reply({ content: `${lowScoreWarning}${interaction.user} lent $${amount} to ${borrower} for "${reason}".`, flags: 1 << 6})
}