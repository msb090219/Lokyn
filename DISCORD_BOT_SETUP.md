# Discord Bot Setup Guide

## Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give it a name (e.g., "Dashboard Bot")
4. Click "Create"

## Step 2: Create Bot User

1. Go to the "Bot" tab
2. Click "Add Bot"
3. Click "Yes, do it!"
4. **Important**: Copy the **Bot Token** (you'll need this for .env.local)
   - Keep this secret!
   - You can regenerate it if needed

## Step 3: Configure Bot Permissions

1. Under "Bot" section, scroll to "Privileged Gateway Intents"
2. Enable these intents:
   - ✅ **Message Content Intent** (required for commands)
   - ✅ **Server Members Intent** (for user linking)
   - ✅ **Presence Intent** (optional, for future features)

## Step 4: Invite Bot to Your Server

1. Go to "OAuth2" → "URL Generator"
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Use Slash Commands
   - ✅ Embed Links (optional, for richer responses)
4. Copy the generated URL
5. Paste in browser and select your server
6. Authorize the bot

## Step 5: Get Application ID

1. Go to "General Information" tab
2. Copy the **Application ID**
3. You'll need this for registering commands

## Step 6: Configure Environment Variables

Add these to your `.env.local` file:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_test_server_id (optional, for faster command registration)
```

### How to get Guild ID (Server ID):
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server name
3. Copy Server ID

## Step 7: Install Dependencies

```bash
npm install discord.js
```

## Step 8: Run the Bot

```bash
npm run discord-bot
```

## Command Registration

Slash commands need to be registered with Discord. The bot will do this automatically on startup.

- **Global commands**: Propagate to all servers (can take up to 1 hour)
- **Guild commands**: Instant, but only for specific servers
- During development, use guild commands for instant updates

## Testing Commands

Once bot is running, try these commands in your Discord server:

```
/link <token>          # Link your Discord account to dashboard
/task add <text>       # Add a new task
/task list             # List all tasks
/task complete <num>   # Mark task as complete
/task delete <num>     # Delete a task
/stats summary         # Show productivity stats
```

## Troubleshooting

### Bot not responding:
- Check that bot token is correct
- Verify bot has permissions in server
- Check console for error messages

### Commands not showing up:
- Wait up to 1 hour for global commands
- Use GUILD_ID for instant commands (development)
- Make sure "applications.commands" scope was authorized

### Token invalid:
- Regenerate token in Discord Developer Portal
- Update .env.local file
- Restart bot

### Permission errors:
- Bot needs "Send Messages" permission
- Bot needs "Use Slash Commands" permission
- Check channel permissions specifically

## Security Notes

- **Never commit** .env.local to git
- **Never share** your bot token publicly
- Use environment variables for all sensitive data
- Consider using Discord's command permissions for production

## Next Steps

After setup:
1. Start the bot: `npm run discord-bot`
2. Link your account via dashboard (we'll add this)
3. Try commands in Discord
4. Check dashboard for real-time updates
