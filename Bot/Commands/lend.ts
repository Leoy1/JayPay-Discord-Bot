import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import fs from 'fs'
import path from 'path'
import { Debt } from '../types'
import { readCreditScores } from '../credit'

const debtsFile = path.join(__dirname, '..', 'debts.json')

function readDebts(): Debt[]{
  if(!fs.existsSync(debtsFile)) return[]
  return JSON.parse(fs.readFileSync(debtsFile, 'utf-8'))
}

function writeDebts(debts: Debt[]){
  fs.writeFileSync(debtsFile, JSON.stringify(debts, null, 2))
}

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

  const botUserId = interaction.client.user?.id

  if(!borrower || !amount || amount <= 0 || borrower.id === interaction.user.id || borrower.id === botUserId){
    await interaction.reply({ content: 'Invalid borrower or amount.', flags: 1 << 6})
    return
  }

  const creditScores = readCreditScores()
  const borrowerScore = creditScores[borrower.id]?.score ?? 600

  if(borrowerScore < 500){
    await interaction.reply({ content: `Warning: ${borrower.username} has a lower credit score (${borrowerScore}). Proceed with caution.`, flags: 1 << 6})
  }

  const debts = readDebts()

  const existingDebt = debts.find(debt => debt.lenderId === interaction.user.id && debt.borrowerId === borrower.id)

  const newEntry = {
    amount, reason, timestamp: Date.now(),
  }

  if(existingDebt){
    existingDebt.amount += amount
    existingDebt.history.push(newEntry)
  } else{
    debts.push({ lenderId: interaction.user.id, lenderName: interaction.user.username, borrowerId: borrower.id, borrowerName: borrower.username, amount, history: [newEntry],})
  }

  writeDebts(debts)

  await interaction.reply( `${interaction.user} lent $${amount} to ${borrower} for "${reason}".`);
}