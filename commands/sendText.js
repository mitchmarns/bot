// commands/sendText.js

const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const phoneModel = require('../database/models/phoneModel');

async function sendText(interaction) {
  const fromPlayerName = interaction.options.getString('from');
  const toIdentifier = interaction.options.getString('to'); // Can be player name or phone number
  const messageContent = interaction.options.getString('message');
  
  // Check if sender exists and get their phone
  const fromPlayer = await playerModel.getPlayerByName(fromPlayerName);
  if (!fromPlayer) {
    return interaction.reply(`Player "${fromPlayerName}" doesn't exist.`);
  }
  
  // Check if sender belongs to user
  if (fromPlayer.user_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'You can only send messages from your own characters.', 
      ephemeral: true 
    });
  }
  
  // Get sender's phone
  const fromPhone = await phoneModel.getPlayerPhone(fromPlayer.id);
  if (!fromPhone) {
    return interaction.reply(`${fromPlayerName} doesn't have a phone. Use /assignphone first.`);
  }
  
  // Find recipient - could be by phone number or player name
  let toPlayer, toPhone;
  
  // Check if input is a phone number
  const isPhoneNumber = /^[\d\-\(\)+\s]+$/.test(toIdentifier.trim());
  
  if (isPhoneNumber) {
    toPhone = await phoneModel.getPhoneByNumber(toIdentifier);
    if (toPhone) {
      toPlayer = await playerModel.getPlayerById(toPhone.player_id);
    }
  } else {
    // Try to find by player name
    toPlayer = await playerModel.getPlayerByName(toIdentifier);
    if (toPlayer) {
      toPhone = await phoneModel.getPlayerPhone(toPlayer.id);
    }
  }
  
  if (!toPhone || !toPlayer) {
    return interaction.reply(`Could not find a player with that name or phone number.`);
  }
  
  // Send the message
  await phoneModel.sendMessage(fromPhone.id, toPhone.id, messageContent);
  
  // Create the response
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('Message Sent')
    .setDescription(`From: ${fromPlayer.name} (${fromPhone.phone_number})\nTo: ${toPlayer.name} (${toPhone.phone_number})`)
    .addFields({ name: 'Message', value: messageContent })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = sendText;