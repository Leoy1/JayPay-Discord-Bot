import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { Debt } from '../types'
import { updateCreditScore } from '../credit'

const dataPath = path.join(__dirname, '..', 'debts.json')

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear a debt you let to another user.')
    .addUserOption(option => option.setName('user').setDescription('The borrower whose debt you want to clear').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction){
    try{
        const lenderId = interaction.user.id
        const borrower = interaction.options.getUser('user')

        if(!borrower){
            await interaction.reply({content: 'Invalid user.', flags: 1 << 6})
            return
        }

        let debts: Debt[] = []

        try{
            debts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
        } catch(err){
            console.error('Failed to read debts.json:', err)
            await interaction.reply({ content: 'Failed to read debts.', flags: 1 << 6,})
            return
        }

        const originalLength = debts.length

        debts = debts.filter((debt) => !(debt.lenderId === lenderId && debt.borrowerId === borrower.id))

        if(debts.length === originalLength){
            await interaction.reply({content: `No debt found that you lent to ${borrower.username}.`, flags: 1 << 6,})
            return
        }

        fs.writeFileSync(dataPath, JSON.stringify(debts, null, 2))
        updateCreditScore(borrower.id, -10)

        await interaction.reply({ content: `Cleared debt you lent to ${borrower.username}.`, flags: 1 << 6,})
    } catch(error){
        console.error('Unexpected error in /clear:', error)
        if(!interaction.replied){
            await interaction.reply({ content: 'An unexpected error occured.', flags: 1 << 6,})
        }
    }
}