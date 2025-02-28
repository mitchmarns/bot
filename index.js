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
    GatewayIntentBits.GuildWebhooks
  ] 
});

// When the bot is ready
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Initialize the database
  try {
    const db = await initDatabase();
    console.log('Database initialized successfully');
    
    // Extend player schema with hockey stats
    const playerModel = require('./database/models/playerModel');
    await playerModel.extendPlayerSchema();
    console.log('Player schema extended successfully');
    
    // Initialize season schema
    try {
      const seasonModel = require('./database/models/seasonModel');
      await seasonModel.initSeasonSchema();
      console.log('Season schema initialized successfully');
    } catch (seasonError) {
      console.error('Error initializing season schema:', seasonError);
    }
    
    // Extend game schema for seasons
    try {
      const gameModel = require('./database/models/gameModel');
      await gameModel.extendGamesSchema();
      console.log('Game schema extended for seasons');
    } catch (gameError) {
      console.error('Error extending game schema:', gameError);
    }
    
    console.log('Hockey Roleplay Bot is online with all schemas initialized!');
  } catch (error) {
    console.error('Critical error initializing database:', error);
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

// Message handler for character triggers
client.on('messageCreate', async message => {
  // Ignore messages from bots including self
  if (message.author.bot) return;
  
  // Get the content and check if it starts with any known trigger
  const content = message.content.trim();
  
  // Find a trigger that matches the start of the message
  const triggerModel = require('./database/models/triggerModel');
  const allTriggers = await getAllTriggers();
  
  // Sort triggers by length (descending) to match the longest first
  allTriggers.sort((a, b) => b.trigger_text.length - a.trigger_text.length);
  
  const matchingTrigger = allTriggers.find(t => 
    content.startsWith(t.trigger_text)
  );
  
  if (!matchingTrigger) return; // No trigger match
  
  // Get the message content without the trigger
  const characterMessage = content.substring(matchingTrigger.trigger_text.length).trim();
  if (!characterMessage) return; // Empty message after trigger
  
  // Get player info for the character
  const playerModel = require('./database/models/playerModel');
  const player = await playerModel.getPlayerById(matchingTrigger.player_id);
  
  if (!player) return; // Player no longer exists
  
  try {
    // Helper function for player color
    function getPlayerColor(playerId) {
      const hash = Math.abs(playerId % 0xFFFFFF);
      return hash;
    }
    
    // Base message embed
    const messageEmbed = {
      description: characterMessage,
      color: getPlayerColor(player.id),
      footer: {
        text: `Sent from iPhone • ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
      }
    };
    
    // Prepare message options (used for both webhook and regular message)
    const messageOptions = {
      embeds: [messageEmbed],
      allowedMentions: { parse: ['users', 'roles'] }
    };
    
    // Add reference to reply to a message if the original was a reply
    if (message.reference && message.reference.messageId) {
      try {
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        let replyAuthor = repliedMessage.author.username;
        
        if (repliedMessage.embeds && repliedMessage.embeds.length > 0 && repliedMessage.embeds[0].author) {
          replyAuthor = repliedMessage.embeds[0].author.name;
        }
      
        let replyContent = repliedMessage.content;
        if (repliedMessage.embeds && repliedMessage.embeds.length > 0 && repliedMessage.embeds[0].description) {
          replyContent = repliedMessage.embeds[0].description;
        }
        
        // Truncate if too long
        if (replyContent && replyContent.length > 60) {
          replyContent = replyContent.substring(0, 57) + '...';
        }
        
        // Format the reply in the phone message style
        messageEmbed.description = `**↩️ ${replyAuthor}:** ${replyContent || '[attachment]'}\n\n${characterMessage}`;
      } catch (error) {
        console.error('Error fetching replied message:', error);
      }
    }

    // Process custom embeds
    if (characterMessage.includes('!embed ')) {
      try {
        // Extract the embed parts
        const embedParts = characterMessage.split('!embed ')[1].split('|');
        const embedObject = {};
        
        // Parse each key=value pair
        embedParts.forEach(part => {
          const [key, value] = part.split('=');
          if (key && value) {
            embedObject[key.trim()] = value.trim();
          }
        });
        
        // Create the actual Discord embed object
        const embed = {
          title: embedObject.title || undefined,
          description: embedObject.description || undefined,
          color: getColorCode(embedObject.color || 'blue'),
          image: embedObject.image ? { url: embedObject.image } : undefined,
          thumbnail: embedObject.thumbnail ? { url: embedObject.thumbnail } : undefined,
        };
        
        // Remove empty fields
        Object.keys(embed).forEach(key => {
          if (embed[key] === undefined) {
            delete embed[key];
          }
        });
        
        // Add the custom embed alongside the message embed
        messageOptions.embeds.push(embed);
        
        // Update the original message content to remove embed command
        const regularContent = characterMessage.split('!embed')[0].trim();
        messageEmbed.description = regularContent || messageEmbed.description;
      } catch (error) {
        console.error('Error creating embed:', error);
      }
    }

    // Handle attachments
    if (message.attachments.size > 0) {
      const attachmentFiles = message.attachments.map(attachment => {
        return {
          attachment: attachment.url,
          name: attachment.name
        };
      });
      
      messageOptions.files = attachmentFiles;
    }
    
    // Check if this is a text channel that might support webhooks
    const isRegularTextChannel = 
      message.channel.type === 0 && // GUILD_TEXT type
      message.guild && 
      message.channel.permissionsFor && 
      message.channel.permissionsFor(client.user).has('MANAGE_WEBHOOKS');
    
    // Use webhooks only in regular text channels where we know they're supported
    if (isRegularTextChannel) {
      try {
        // Webhook options
        const webhookOptions = {
          ...messageOptions,
          username: `${player.name} (#${player.number})`,
          avatarURL: player.image_url || null,
          content: null
        };
        
        // Fetch webhooks
        const webhooks = await message.channel.fetchWebhooks();
        const existingWebhook = webhooks.find(wh => 
          wh.owner && wh.owner.id === client.user.id && wh.name === 'HockeyRPWebhook'
        );
        
        let webhook;
        if (existingWebhook) {
          webhook = existingWebhook;
        } else {
          webhook = await message.channel.createWebhook({
            name: 'HockeyRPWebhook',
            avatar: client.user.displayAvatarURL(),
          });
        }
        
        await webhook.send(webhookOptions);
      } catch (error) {
        console.error('Webhook error, falling back to regular message:', error);
        // Fall back to regular message if webhook fails
        await message.channel.send({
          content: `**${player.name} (#${player.number})**`,
          ...messageOptions
        });
      }
    } else {
      // For all other channel types (threads, forums, etc) use regular messages
      await message.channel.send({
        // Empty content so only the embed shows
        content: '',
        ...messageOptions,
        // Add author field to the embed to simulate the webhook username display
        embeds: messageOptions.embeds.map((embed, index) => {
          if (index === 0) { // Only modify the first embed (the message embed)
            return {
              ...embed,
              author: {
                name: `${player.name} (#${player.number})`,
                icon_url: player.image_url || null
              }
            };
          }
          return embed;
        })
      });
    }
    
    // Delete the original message
    try {
      await message.delete();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    await message.channel.send(`Error: ${error.message}`);
  }
});

// Helper function to get all triggers
async function getAllTriggers() {
  const { getDb } = require('./database/db');
  const db = getDb();
  return await db.all(`
    SELECT t.*, p.id as player_id, p.name, p.number, p.image_url
    FROM player_triggers t
    JOIN players p ON t.player_id = p.id
  `);
}

// Helper function to convert color names to hex codes
function getColorCode(colorName) {
  const colors = {
    red: 0xFF0000,
    green: 0x00FF00,
    blue: 0x0099FF,
    yellow: 0xFFFF00,
    purple: 0x800080,
    pink: 0xFFC0CB,
    orange: 0xFFA500,
    black: 0x000000,
    white: 0xFFFFFF,
    gray: 0x808080
  };
  
  return colors[colorName.toLowerCase()] || 0x0099FF; // Default to blue
}

// Login to Discord with your client's token
client.login(TOKEN);
