// Trade Player command handler
const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const teamModel = require('../database/models/teamModel');
const tradeModel = require('../database/models/tradeModel');

async function trade(interaction) {
  try {
    const playerName = interaction.options.getString('player');
    const newTeamName = interaction.options.getString('team');
    const notes = interaction.options.getString('notes');
    
    // Find player
    const player = await playerModel.getPlayerByName(playerName);
    
    if (!player) {
      return interaction.reply(`Player "${playerName}" doesn't exist.`);
    }
    
    // Check if the user is the one who created the player
    if (player.user_id !== interaction.user.id) {
      return interaction.reply({ 
        content: 'You can only trade players you created.', 
        ephemeral: true 
      });
    }
    
    // Get current team info
    const currentTeam = await teamModel.getTeamById(player.team_id);
    
    // Find new team
    const newTeam = await teamModel.getTeamByName(newTeamName);
    
    if (!newTeam) {
      return interaction.reply(`Team "${newTeamName}" doesn't exist.`);
    }
    
    // Check if player is already on this team
    if (player.team_id === newTeam.id) {
      return interaction.reply(`${player.name} is already on the ${newTeam.city} ${newTeam.name}.`);
    }
    
    // Update player's team
    await playerModel.updatePlayerTeam(player.id, newTeam.id);
    
    // Record the trade in history
    await tradeModel.recordTrade(
      player.id,
      currentTeam.id,
      newTeam.id,
      interaction.user.id,
      notes
    );
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Player Traded')
      .setDescription(`${player.name} has been traded from the ${currentTeam.city} ${currentTeam.name} to the ${newTeam.city} ${newTeam.name}!`)
      .addFields(
        { name: 'Player', value: `${player.name} (#${player.number})`, inline: true },
        { name: 'Position', value: player.position.replace('_', ' '), inline: true },
        { name: 'New Team', value: `${newTeam.city} ${newTeam.name}`, inline: true }
      )
      .setTimestamp();
      
    // Add notes if provided
    if (notes) {
      embed.addFields({ name: 'Trade Notes', value: notes });
    }
    
    // Add player image if available
    if (player.image_url) {
      embed.setThumbnail(player.image_url);
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in trade command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = trade;