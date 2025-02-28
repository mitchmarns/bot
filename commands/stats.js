// Player Statistics command handler
const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');

async function stats(interaction) {
  const statType = interaction.options.getString('stattype') || 'points';
  const teamName = interaction.options.getString('team');
  const limit = interaction.options.getInteger('limit') || 10;
  
  let players;
  let title;
  
  try {
    // Get players based on filters
    if (teamName) {
      players = await playerModel.getPlayerStatsByTeam(teamName, statType, limit);
      title = `${teamName} ${statType.charAt(0).toUpperCase() + statType.slice(1)} Leaders`;
    } else {
      players = await playerModel.getPlayerStatsLeaders(statType, limit);
      title = `League ${statType.charAt(0).toUpperCase() + statType.slice(1)} Leaders`;
    }
    
    if (players.length === 0) {
      return interaction.reply('No player statistics found. Try playing some games first!');
    }
    
    // Create embed response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(title)
      .setTimestamp();
    
    let leaderboardText = '';
    
    // Format stat display based on type
    players.forEach((player, index) => {
      let statDisplay = '';
      
      if (statType === 'points') {
        statDisplay = `${player.goals + player.assists}pts (${player.goals}G, ${player.assists}A)`;
      } else if (statType === 'goals') {
        statDisplay = `${player.goals} goals`;
      } else if (statType === 'assists') {
        statDisplay = `${player.assists} assists`;
      } else if (statType === 'games') {
        statDisplay = `${player.games_played} games`;
      } else if (statType === 'ppg') {
        const ppg = player.games_played > 0 ? 
          ((player.goals + player.assists) / player.games_played).toFixed(2) : 
          '0.00';
        statDisplay = `${ppg} points per game`;
      }
      
      leaderboardText += `${index + 1}. **${player.name}** (#${player.number}, ${player.position.replace('_', ' ')}) - ${statDisplay} - ${player.team_name}\n`;
    });
    
    embed.setDescription(leaderboardText);
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in stats command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = stats;