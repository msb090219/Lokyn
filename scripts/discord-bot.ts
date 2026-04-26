/**
 * Discord Bot for Dashboard
 * Provides slash commands for task management and stats
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import {
  getUserIdFromDiscord,
  linkDiscordAccount,
  createTask,
  getTasks,
  completeTask,
  deleteTask,
  getTaskStats,
} from '../lib/discord-service'

// Configuration
const TOKEN = process.env.DISCORD_BOT_TOKEN
const CLIENT_ID = process.env.DISCORD_CLIENT_ID
const GUILD_ID = process.env.DISCORD_GUILD_ID // Optional: for instant command updates in development

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing required environment variables: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID')
  process.exit(1)
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

// Command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your dashboard')
    .addStringOption(option =>
      option.setName('token')
        .setDescription('The link token from your dashboard settings')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('task')
    .setDescription('Manage your tasks')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new task')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The task text')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List your tasks')
        .addStringOption(option =>
          option.setName('section')
            .setDescription('Filter by section')
            .addChoices(
              { name: 'Today', value: 'today' },
              { name: 'Backlog', value: 'backlog' },
              { name: 'All', value: 'all' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('complete')
        .setDescription('Mark a task as complete')
        .addStringOption(option =>
          option.setName('task')
            .setDescription('Task number or ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a task')
        .addStringOption(option =>
          option.setName('task')
            .setDescription('Task number or ID')
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your productivity stats')
    .addSubcommand(subcommand =>
      subcommand
        .setName('summary')
        .setDescription('Show productivity summary')
    ),
].map(command => command.toJSON())

// Register commands
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN || '')

  try {
    console.log('Started refreshing application (/) commands.')

    if (GUILD_ID) {
      // Register guild commands (instant, for development)
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID || '', GUILD_ID),
        { body: commands }
      )
      console.log('Successfully registered guild commands')
    } else {
      // Register global commands (can take up to 1 hour)
      await rest.put(
        Routes.applicationCommands(CLIENT_ID || ''),
        { body: commands }
      )
      console.log('Successfully registered global commands')
    }
  } catch (error) {
    console.error('Error registering commands:', error)
  }
}

// Handle interactions
client.on('interactionCreate', async interaction => {
  console.log('Interaction received:', interaction.type)

  if (!interaction.isChatInputCommand()) {
    console.log('Not a chat input command, ignoring')
    return
  }

  const { commandName } = interaction
  console.log(`Command received: ${commandName}`)

  try {
    // Defer reply for operations that might take longer
    await interaction.deferReply()
    console.log('Reply deferred')

    // Handle /link command
    if (commandName === 'link') {
      await handleLinkCommand(interaction as ChatInputCommandInteraction)
    }
    // Handle /task commands
    else if (commandName === 'task') {
      await handleTaskCommand(interaction as ChatInputCommandInteraction)
    }
    // Handle /stats commands
    else if (commandName === 'stats') {
      await handleStatsCommand(interaction as ChatInputCommandInteraction)
    }
    else {
      console.log('Unknown command:', commandName)
      await interaction.editReply('❌ Unknown command')
    }
  } catch (error) {
    console.error('Error handling interaction:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

    // Try to send error reply
    try {
      if (interaction.deferred) {
        await interaction.editReply(`❌ Error: ${errorMessage}`)
      } else {
        await interaction.reply(`❌ Error: ${errorMessage}`)
      }
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError)
    }
  }
})

/**
 * Handle /link command
 */
async function handleLinkCommand(interaction: ChatInputCommandInteraction) {
  const token = interaction.options.getString('token', true)
  const discordUserId = interaction.user.id

  const success = await linkDiscordAccount(discordUserId, token)

  if (success) {
    await interaction.editReply('✅ Successfully linked your Discord account to your dashboard!')
  } else {
    await interaction.editReply('❌ Invalid or expired token. Please generate a new token from your dashboard settings.')
  }
}

/**
 * Handle /task commands
 */
async function handleTaskCommand(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()
  const discordUserId = interaction.user.id

  // Get user ID from Discord connection
  const userId = await getUserIdFromDiscord(discordUserId)

  if (!userId) {
    await interaction.editReply('❌ Your Discord account is not linked. Use `/link <token>` to connect your account.')
    return
  }

  switch (subcommand) {
    case 'add':
      await handleTaskAdd(interaction, userId)
      break
    case 'list':
      await handleTaskList(interaction, userId)
      break
    case 'complete':
      await handleTaskComplete(interaction, userId)
      break
    case 'delete':
      await handleTaskDelete(interaction, userId)
      break
  }
}

/**
 * Handle /task add
 */
async function handleTaskAdd(interaction: ChatInputCommandInteraction, userId: string) {
  const text = interaction.options.getString('text', true)

  // Validate input length
  if (text.length < 1 || text.length > 500) {
    await interaction.editReply('❌ Task text must be between 1 and 500 characters.')
    return
  }

  const task = await createTask(userId, text)

  if (task) {
    await interaction.editReply(`✅ Task added: "${text}"`)
  } else {
    await interaction.editReply('❌ Failed to add task. Please make sure you have a "To Do Today" section.')
  }
}

/**
 * Handle /task list
 */
async function handleTaskList(interaction: ChatInputCommandInteraction, userId: string) {
  const sectionFilter = interaction.options.getString('section') as 'today' | 'backlog' | 'all' || 'all'

  const result = await getTasks(userId, sectionFilter)

  if (!result) {
    await interaction.editReply('❌ Failed to fetch tasks.')
    return
  }

  const { sections, tasks } = result
  const incompleteTasks = tasks.filter(t => !t.completed)

  if (incompleteTasks.length === 0) {
    await interaction.editReply('📋 You have no pending tasks. Great job!')
    return
  }

  // Group tasks by section
  const tasksBySection: Record<string, typeof tasks> = {}
  incompleteTasks.forEach(task => {
    const section = sections.find(s => s.id === task.section_id)
    const sectionTitle = section?.title || 'Unknown'
    if (!tasksBySection[sectionTitle]) {
      tasksBySection[sectionTitle] = []
    }
    tasksBySection[sectionTitle].push(task)
  })

  // Format response
  let response = '📋 **Your Tasks**\n\n'

  let globalCounter = 1
  for (const [sectionTitle, sectionTasks] of Object.entries(tasksBySection)) {
    response += `**${sectionTitle}:**\n`
    sectionTasks.forEach(task => {
      response += `${globalCounter++}. ${task.text}\n`
    })
    response += '\n'
  }

  await interaction.editReply(response)
}

/**
 * Handle /task complete
 */
async function handleTaskComplete(interaction: ChatInputCommandInteraction, userId: string) {
  const taskIdOrNumber = interaction.options.getString('task', true)

  const task = await completeTask(userId, taskIdOrNumber)

  if (task) {
    await interaction.editReply(`✅ Completed: "${task.text}"`)
  } else {
    await interaction.editReply('❌ Task not found. Use `/task list` to see your tasks.')
  }
}

/**
 * Handle /task delete
 */
async function handleTaskDelete(interaction: ChatInputCommandInteraction, userId: string) {
  const taskIdOrNumber = interaction.options.getString('task', true)

  const task = await deleteTask(userId, taskIdOrNumber)

  if (task) {
    await interaction.editReply(`🗑️ Deleted: "${task.text}"`)
  } else {
    await interaction.editReply('❌ Task not found. Use `/task list` to see your tasks.')
  }
}

/**
 * Handle /stats commands
 */
async function handleStatsCommand(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand()
  const discordUserId = interaction.user.id

  // Get user ID from Discord connection
  const userId = await getUserIdFromDiscord(discordUserId)

  if (!userId) {
    await interaction.editReply('❌ Your Discord account is not linked. Use `/link <token>` to connect your account.')
    return
  }

  if (subcommand === 'summary') {
    await handleStatsSummary(interaction, userId)
  }
}

/**
 * Handle /stats summary
 */
async function handleStatsSummary(interaction: ChatInputCommandInteraction, userId: string) {
  const stats = await getTaskStats(userId)

  if (!stats) {
    await interaction.editReply('❌ Failed to fetch stats.')
    return
  }

  const response =
    `📊 **Productivity Summary**\n\n` +
    `Total tasks: ${stats.total_tasks}\n` +
    `Completed: ${stats.completed_tasks}\n` +
    `Completion rate: ${stats.completion_rate}%\n\n` +
    `This week: ${stats.completed_this_week} completed\n` +
    `Remaining: ${stats.remaining_tasks} tasks`

  await interaction.editReply(response)
}

// Bot ready event
client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user?.tag}`)

  // Register commands on startup
  await registerCommands()
})

// Login to Discord
client.login(TOKEN)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down bot...')
  client.destroy()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Shutting down bot...')
  client.destroy()
  process.exit(0)
})
