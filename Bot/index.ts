import { Client, GatewayIntentBits, Collection, REST, Routes, Interaction } from 'discord.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages]})

const commands = new Collection<string, any>()
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'))

async function main(){
    for (const file of commandFiles){
        const filePath = path.join(commandsPath, file)
        const command = require(filePath);
        commands.set(command.data.name, command);
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

    try{
        const commandData = commandFiles.map(file => {
            const cmd = require(path.join(commandsPath, file))
            return cmd.data.toJSON()
        })

        await rest.put(Routes.applicationGuildCommands(process.env.Client_ID!, process.env.GUILD_ID!), { body: commandData})

        console.log('Slash commands registered.')
    } catch (error){
        console.error('Failed to register commands:', error);
    }

    client.login(process.env.DISCORD_TOKEN)
}

main()

client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isCommand()) return

    const command = commands.get(interaction.commandName)
    if (!command) return

    try{
        await command.execute(interaction)
    } catch (error){
        console.error(error)
        await interaction.reply({ content: 'Error execution command.', flags: 1 << 6})
    }
})

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user?.tag}`)
})

client.login(process.env.DISCORD_TOEKN)