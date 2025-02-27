// setPlayerSkills.js
const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');

async function setPlayerSkills(interaction) {
  try {
    const playerName = interaction.options.getString('name');
    const skating = interaction.options.getInteger('skating');
    const shooting = interaction.options.getInteger('shooting');
    const passing = interaction.options.getInteger('passing');
    const defense = interaction.options.getInteger('defense');
    const physical = interaction.options.getInteger('physical');
    const goaltending = interaction.options.getInteger('goaltending');
    
    // Find player
    const player = await playerModel.getPlayerByName(playerName);
    
    if (!player) {
      return interaction.reply(`Player "${playerName}" doesn't exist.`);
    }
    
    // Check if the user is the one who created the player
    if (player.user_id !== interaction.user.id) {
      return interaction.reply({ 
        content: 'You can only update skills for players you created.', 
        ephemeral: true 
      });
    }
    
    // Update or create player skills
    await skillsModel.setPlayerSkills(
      player.id,
      {
        skating: skating || 50,
        shooting: shooting || 50,
        passing: passing || 50,
        defense: defense || 50,
        physical: physical || 50,
        goaltending: goaltending || 50
      }
    );
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${player.name}'s Skills Updated`)
      .setDescription(`Skills have been updated for ${player.name}!`)
      .addFields(
        { name: 'Skating', value: `${skating || 50}/100`, inline: true },
        { name: 'Shooting', value: `${shooting || 50}/100`, inline: true },
        { name: 'Passing', value: `${passing || 50}/100`, inline: true },
        { name: 'Defense', value: `${defense || 50}/100`, inline: true },
        { name: 'Physical', value: `${physical || 50}/100`, inline: true },
        { name: 'Goaltending', value: `${goaltending || 50}/100`, inline: true }
      )
      .setTimestamp();
    
    // Add player image if available
    if (player.image_url) {
      embed.setThumbnail(player.image_url);
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in setPlayerSkills command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = setPlayerSkills;