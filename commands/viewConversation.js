const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const phoneModel = require('../database/models/phoneModel');

async function viewConversation(interaction) {
  const playerName = interaction.options.getString('player');
  const otherIdentifier = interaction.options.getString('with');
  
  // Check if player exists
  const player = await playerModel.getPlayerByName(playerName);
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }
  
  // Check if player belongs to user
  if (player.user_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'You can only view conversations for your own characters.', 
      ephemeral: true 
    });
  }
  
  // Get player's phone
  const phone = await phoneModel.getPlayerPhone(player.id);
  if (!phone) {
    return interaction.reply(`${playerName} doesn't have a phone. Use /assignphone first.`);
  }
  
  // Find other player - could be by phone number or player name
  let otherPlayer, otherPhone;
  
  // Check if input is a phone number
  const isPhoneNumber = /^[\d\-\(\)+\s]+$/.test(otherIdentifier.trim());
  
  if (isPhoneNumber) {
    otherPhone = await phoneModel.getPhoneByNumber(otherIdentifier);
    if (otherPhone) {
      otherPlayer = await playerModel.getPlayerById(otherPhone.player_id);
    }
  } else {
    // Try to find by player name
    otherPlayer = await playerModel.getPlayerByName(otherIdentifier);
    if (otherPlayer) {
      otherPhone = await phoneModel.getPlayerPhone(otherPlayer.id);
    }
  }
  
  if (!otherPhone || !otherPlayer) {
    return interaction.reply(`Could not find a player with that name or phone number.`);
  }
  
  // Get conversation
  const messages = await phoneModel.getConversation(phone.id, otherPhone.id);
  
  if (messages.length === 0) {
    return interaction.reply(`There are no messages between ${player.name} and ${otherPlayer.name}.`);
  }
  
  // Mark incoming messages as read
  await phoneModel.markMessagesAsRead(phone.id, otherPhone.id);
  
  // Create conversation embed
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Conversation`)
    .setDescription(`Messages between ${player.name} and ${otherPlayer.name}`)
    .setTimestamp();
  
  // Add messages (reverse to show newest at the bottom)
  [...messages].reverse().forEach(msg => {
    const sender = msg.from_phone_id === phone.id ? player.name : otherPlayer.name;
    const timestamp = new Date(msg.sent_at).toLocaleString();
    
    embed.addFields({
      name: `${sender} - ${timestamp}`,
      value: msg.message_text
    });
  });
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = viewConversation;