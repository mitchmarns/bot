const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const phoneModel = require('../database/models/phoneModel');

async function viewInbox(interaction) {
  const playerName = interaction.options.getString('player');
  
  // Check if player exists
  const player = await playerModel.getPlayerByName(playerName);
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }
  
  // Check if player belongs to user
  if (player.user_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'You can only view messages for your own characters.', 
      ephemeral: true 
    });
  }
  
  // Get player's phone
  const phone = await phoneModel.getPlayerPhone(player.id);
  if (!phone) {
    return interaction.reply(`${playerName} doesn't have a phone. Use /assignphone first.`);
  }
  
  // Get message previews for inbox
  const messagePreviews = await phoneModel.getMessagePreviews(phone.id);
  
  if (messagePreviews.length === 0) {
    return interaction.reply(`${playerName}'s inbox is empty.`);
  }
  
  // Create the inbox embed
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`${player.name}'s Phone`)
    .setDescription(`Messages for ${phone.phone_number}`)
    .setTimestamp();
  
  // Add message previews
  messagePreviews.forEach(msg => {
    const isIncoming = msg.to_phone_id === phone.id;
    const previewText = msg.message_text.length > 50 
      ? msg.message_text.substring(0, 47) + '...' 
      : msg.message_text;
    
    embed.addFields({
      name: `${isIncoming ? '📥' : '📤'} ${msg.other_player_name} (${msg.other_phone_number})`,
      value: `${previewText}\n${new Date(msg.sent_at).toLocaleString()}${!msg.is_read && isIncoming ? ' 🆕' : ''}`
    });
  });
  
  if (player.image_url) {
    embed.setThumbnail(player.image_url);
  }
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = viewInbox;