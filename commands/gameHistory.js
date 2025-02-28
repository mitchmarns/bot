// Game History command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const gameModel = require('../database/models/gameModel');

async function gameHistory(interaction) {
  try {
    // Get command options
    const teamName = interaction.options.getString('team');
    const limit = interaction.options.getInteger('limit') || 10;
    
    // Fetch game history
    let games;
    
    if (teamName) {
      // Get team ID first
      const team = await teamModel.getTeamByName(teamName);
      if (!team) {
        return interaction.reply(`Team "${teamName}" doesn't exist.`);
      }
      
      // Get games for specific team
      games = await gameModel.getTeamGameHistory(team.id, limit);
    } else {
      // Get all recent games
      games = await gameModel.getGameHistory(limit);
    }
    
    if (games.length === 0) {
      return interaction.reply('No games have been played yet.');
    }
    
    // Create embed response
    const embed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle(teamName ? `${teamName} Game History` : 'League Game History')
      .setDescription(`Showing the last ${games.length} games played`)
      .setTimestamp();
    
    // Add games to the embed
    for (const game of games) {
      // Determine winner
      let resultText;
      if (game.home_score > game.away_score) {
        resultText = `**${game.home_team_city} ${game.home_team_name}** ${game.home_score} - ${game.away_score} ${game.away_team_city} ${game.away_team_name}`;
      } else if (game.away_score > game.home_score) {
        resultText = `${game.home_team_city} ${game.home_team_name} ${game.home_score} - ${game.away_score} **${game.away_team_city} ${game.away_team_name}**`;
      } else {
        resultText = `${game.home_team_city} ${game.home_team_name} ${game.home_score} - ${game.away_score} ${game.away_team_city} ${game.away_team_name} (Tie)`;
      }
      
      // Format date
      const gameDate = game.played_at ? new Date(game.played_at).toLocaleDateString() : 'Unknown Date';
      
      embed.addFields({
        name: `${gameDate}`,
        value: resultText
      });
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in gameHistory command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = gameHistory;