import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { Debt } from '../types'
import { formatReasons } from '../format'

const dataPath = path.join(__dirname, '..', 'debts.json')

export const data = new SlashCommandBuilder()
    .setName('debts')
    .setDescription('View who you owe and who owes you')

export async function execute(interaction: ChatInputCommandInteraction){
    const userId = interaction.user.id
    let debts: Debt[] = []

    try{
        const file = fs.readFileSync(dataPath, 'utf-8')
        debts = JSON.parse(file)
    } catch(err){
        console.error('Error reading debts.json:', err)
        return interaction.reply('Failed to read debts.')
    }

    const youOwe = debts.filter(d => d.borrowerId === userId)
    const owedToYou = debts.filter(d => d.lenderId === userId)

    let response = ''

    if(youOwe.length > 0){
        response += '**You owe:**\n'
        for(const debt of youOwe){
            //const allReasons = debt.history.map(h => h.reason).join(', ')
            response += `- <@${debt.lenderId}>: $${debt.amount}\n${formatReasons(debt.history ?? [])}\n`
        }
    } else{
        response += "You don't owe anyone.\n"
    }

    if(owedToYou.length >0){
        response += "\n**You're owed:**\n"
        for(const debt of owedToYou){
            response += `- <@${debt.borrowerId}>: $${debt.amount}\n${formatReasons(debt.history ?? [])}\n`
        }
    } else{
        response += '\nNo one owes you.'
    }

    await interaction.reply({ content: response, flags: 1 << 6 })
}