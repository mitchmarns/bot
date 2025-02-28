const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const phoneModel = require('../database/models/phoneModel');

async function assignPhone(interaction) {
  const playerName = interaction.options.getString('player');
  const phoneNumber = interaction.options.getString('number');
  
  // Find player
  const player = await playerModel.getPlayerByName(playerName);
  
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }
  
  // Check if the user is the one who created the player
  if (player.user_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'You can only assign phones to your own characters.', 
      ephemeral: true 
    });
  }
  
  // Check if phone number is already in use
  const existingPhone = await phoneModel.getPhoneByNumber(phoneNumber);
  if (existingPhone && existingPhone.player_id !== player.id) {
    return interaction.reply({
      content: 'This phone number is already in use by another player.',
      ephemeral: true
    });
  }
  
  // Assign phone to player
  await phoneModel.assignPhoneToPlayer(player.id, phoneNumber);
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Phone Assigned')
    .setDescription(`${player.name} now has the phone number ${phoneNumber}`)
    .setTimestamp();
    
  if (player.image_url) {
    embed.setThumbnail(player.image_url);
  }
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = assignPhone;