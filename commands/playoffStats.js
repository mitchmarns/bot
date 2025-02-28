// Playoff Stats command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');

async function playoffStats(interaction) {
  try {
    // Get active season or specified season
    const seasonId = interaction.options.getInteger('season');
    let season;
    
    if (seasonId) {
      const seasons = await seasonModel.getAllSeasons();
      season = seasons.find(s => s.id === seasonId);
      if (!season) {
        return interaction.reply(`Season with ID ${seasonId} not found.`);
      }
    } else {
      season = await seasonModel.getActiveSeason();
      if (!season) {
        return interaction.reply('There is no active season.');
      }
    }
    
    // Check if playoffs have started
    if (!season.playoffs_started) {
      return interaction.reply(`Playoffs haven't started for the ${season.name} season yet.`);
    }
    
    // Get playoff stats
    const stats = await seasonModel.getPlayoffStats(season.id);
    
    if (stats.length === 0) {
      return interaction.reply('No playoff stats available yet. Play some playoff games first!');
    }
    
    // Get the stat type from options
    const statType = interaction.options.getString('stattype') || 'points';
    
    // Sort stats based on stat type
    let sortedStats;
    switch (statType) {
      case 'goals':
        sortedStats = stats.sort((a, b) => b.goals - a.goals || (b.goals + b.assists) - (a.goals + a.assists));
        break;
      case 'assists':
        sortedStats = stats.sort((a, b) => b.assists - a.assists || (b.goals + b.assists) - (a.goals + a.assists));
        break;
      case 'games':
        sortedStats = stats.sort((a, b) => b.games_played - a.games_played);
        break;
      case 'points':
      default:
        sortedStats = stats.sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.goals - a.goals);
        break;
    }
    
    // Take only top players
    const limit = interaction.options.getInteger('limit') || 10;
    const topPlayers = sortedStats.slice(0, limit);
    
    // Create the stats embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🏆 Playoff Stats: ${season.name}`)
      .setDescription(`Showing top ${topPlayers.length} players by ${statType}`)
      .setTimestamp();
    
    // Build the leaderboard text
    let leaderboardText = '';
    
    topPlayers.forEach((player, index) => {
      const points = player.goals + player.assists;
      leaderboardText += `${index + 1}. **${player.name}** (#${player.number}, ${player.position.replace('_', ' ')}) - `;
      
      if (statType === 'points') {
        leaderboardText += `${points} pts (${player.goals}G, ${player.assists}A)`;
      } else if (statType === 'goals') {
        leaderboardText += `${player.goals} goals`;
      } else if (statType === 'assists') {
        leaderboardText += `${player.assists} assists`;
      } else if (statType === 'games') {
        leaderboardText += `${player.games_played} games`;
      }
      
      leaderboardText += ` - ${player.team_city} ${player.team_name}\n`;
    });
    
    embed.setDescription(leaderboardText);
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in playoffStats command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = playoffStats;