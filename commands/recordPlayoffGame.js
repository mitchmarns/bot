// Record Playoff Game command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');
const teamModel = require('../database/models/teamModel');

async function recordPlayoffGame(interaction) {
  try {
    const seriesId = interaction.options.getInteger('series');
    const winningTeamName = interaction.options.getString('winningteam');
    
    // Get the playoff series
    const series = await seasonModel.getPlayoffSeries(seriesId);
    if (!series) {
      return interaction.reply(`Playoff series with ID ${seriesId} not found.`);
    }
    
    // Check if series is already complete
    if (series.is_complete) {
      return interaction.reply(`This playoff series is already complete. ${series.winner_name} won.`);
    }
    
    // Find the winning team
    let winningTeamId;
    if (winningTeamName.toLowerCase() === series.team1_name.toLowerCase() || 
        `${series.team1_city} ${series.team1_name}`.toLowerCase() === winningTeamName.toLowerCase()) {
      winningTeamId = series.team1_id;
    } else if (winningTeamName.toLowerCase() === series.team2_name.toLowerCase() || 
               `${series.team2_city} ${series.team2_name}`.toLowerCase() === winningTeamName.toLowerCase()) {
      winningTeamId = series.team2_id;
    } else {
      return interaction.reply(`Team "${winningTeamName}" is not part of this playoff series.`);
    }
    
    // Record the game result
    const result = await seasonModel.recordPlayoffGame(seriesId, winningTeamId);
    
    // Create the result embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Playoff Game Result: ${series.season_name}`)
      .setTimestamp();
    
    const team1 = `${series.team1_city} ${series.team1_name}`;
    const team2 = `${series.team2_city} ${series.team2_name}`;
    const winningTeam = winningTeamId === series.team1_id ? team1 : team2;
    
    embed.setDescription(`${winningTeam} wins Game ${series.team1_wins + series.team2_wins + 1}!`);
    
    embed.addFields(
      { name: 'Series', value: `${team1} vs ${team2}`, inline: false },
      { name: 'Current Score', value: `${team1} ${result.team1Wins}-${result.team2Wins} ${team2}`, inline: false }
    );
    
    // If series is now complete
    if (result.isComplete) {
      const seriesWinner = result.winnerId === series.team1_id ? team1 : team2;
      const seriesLoser = result.winnerId === series.team1_id ? team2 : team1;
      const gameScore = result.winnerId === series.team1_id ? 
        `${result.team1Wins}-${result.team2Wins}` : 
        `${result.team2Wins}-${result.team1Wins}`;
      
      embed.addFields({ 
        name: '🎊 Series Complete! 🎊', 
        value: `${seriesWinner} defeats ${seriesLoser} ${gameScore}` 
      });
      
      // Add championship information if this was the finals
      if (result.isChampionship) {
        embed.setColor('#FFD700'); // Gold for the championship
        embed.setTitle(`🏆 CHAMPIONS: ${seriesWinner} 🏆`);
        embed.addFields({ 
          name: 'League Champions', 
          value: `Congratulations to the ${seriesWinner} on winning the ${series.season_name} Championship!` 
        });
      }
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in recordPlayoffGame command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = recordPlayoffGame;