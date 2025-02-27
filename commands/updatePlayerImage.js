// Update Player Image command handler
const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');

async function updatePlayerImage(interaction) {
  const playerName = interaction.options.getString('name');
  const imageUrl = interaction.options.getString('image');
  
  // Find player
  const player = await playerModel.getPlayerByName(playerName);
  
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }
  
  // Check if the user is the one who created the player
  if (player.user_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'You can only update images for players you created.', 
      ephemeral: true 
    });
  }
  
  // Update the player's image
  await playerModel.updatePlayerImage(player.id, imageUrl);
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Player Image Updated`)
    .setDescription(`${playerName}'s image has been updated!`)
    .setThumbnail(imageUrl)
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = updatePlayerImage;