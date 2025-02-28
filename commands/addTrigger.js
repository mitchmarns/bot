const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const triggerModel = require('../database/models/triggerModel');

async function addTrigger(interaction) {
  const playerName = interaction.options.getString('player');
  const triggerText = interaction.options.getString('trigger');
  
  // Find player
  const player = await playerModel.getPlayerByName(playerName);
  
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }
  
  // Check if the user is the one who created the player
  if (player.user_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'You can only add triggers for your own characters.', 
      ephemeral: true 
    });
  }
  
  // Check if trigger already exists
  const existingTrigger = await triggerModel.getTriggerByText(triggerText);
  if (existingTrigger) {
    return interaction.reply({
      content: 'This trigger is already in use.',
      ephemeral: true
    });
  }
  
  // Create trigger
  await triggerModel.createTrigger(player.id, triggerText, interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Trigger Added')
    .setDescription(`Added trigger "${triggerText}" for ${player.name}`)
    .setFooter({ text: 'Now you can send messages as this character by starting them with the trigger' })
    .setTimestamp();
    
  if (player.image_url) {
    embed.setThumbnail(player.image_url);
  }
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = addTrigger;