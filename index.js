// Main entry point for the Hockey Roleplay Discord Bot
const { Client, GatewayIntentBits } = require('discord.js');
const { TOKEN } = require('./config/config');
const { initDatabase } = require('./database/db');
const registerCommands = require('./commands/registerCommands');
const commandHandlers = require('./commands/commandHandlers');

// Discord client setup
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ] 
});

// When the bot is ready
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Initialize the database
  try {
    await initDatabase();
    console.log('Hockey Roleplay Bot is online with SQLite database!');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
});

// Register commands
registerCommands();

// Command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  
  const { commandName } = interaction;
  
  // Check if command exists in handlers
  if (commandHandlers[commandName]) {
    try {
      await commandHandlers[commandName](interaction);
    } catch (error) {
      console.error(`Error handling command ${commandName}:`, error);
      await interaction.reply({ 
        content: 'An error occurred while processing your command.', 
        ephemeral: true 
      });
    }
  }
});

// Login to Discord with your client's token
client.login(TOKEN);
