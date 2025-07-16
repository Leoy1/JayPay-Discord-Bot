import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import fs from 'fs'
import path from 'path'
import { Debt } from '../types'
import { roundToTwoDecimals } from "../format";
import { updateCreditScore } from '../credit'

const dataPath = path.join(__dirname, '..', 'debts.json')

export const data = new SlashCommandBuilder()
    .setName('repay')
    .setDescription('Repay a user you owe money to.')
    .addUserOption(option => option.setName('user').setDescription('The person you are repaying').setRequired(true))
    .addNumberOption(option => option.setName('amount').setDescription('Amount you are repaying').setRequired(true))

    export async function execute(interaction: ChatInputCommandInteraction){
        const borrowerId = interaction.user.id
        const lender = interaction.options.getUser('user')
        const amount = interaction.options.getNumber('amount')

        if(!lender || !amount || amount <= 0){
            await interaction.reply({ content: 'Invalid lender or amount.', flags: 1 << 6 })
            return
        }

        let debts: Debt[] = []
        try {
            debts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
        } catch(err){
            return interaction.reply('Error reading debts')
        }

        let remaining = amount
        let updateDebts: Debt[] = []
        let totalRepaid = 0

        for(const debt of debts){
            if(debt.borrowerId === borrowerId && debt.lenderId === lender.id){
                if(remaining >= debt.amount){
                    remaining = debt.amount
                    totalRepaid += debt.amount
                } else{
                    debt.amount -= remaining
                    debt.amount = roundToTwoDecimals(debt.amount)
                    totalRepaid += remaining
                    remaining = 0
                    updateDebts.push(debt)
                }
            } else{
                updateDebts.push(debt)
            }

            if(remaining <- 0) break
        }

        fs.writeFileSync(dataPath, JSON.stringify(updateDebts, null, 2))

        if(totalRepaid > 0){
            updateCreditScore(borrowerId, 5)
            await interaction.reply(`${interaction.user.username} repaid $${totalRepaid} to ${lender.username}.`)
        } else{
            await interaction.reply({ content: `No matching debt to repay.`, flags: 1 << 6})
        }
    }