// Games Dashboard command handler
const { EmbedBuilder } = require('discord.js');
const gameModel = require('../database/models/gameModel');
const teamModel = require('../database/models/teamModel');

async function gamesDashboard(interaction) {
  try {
    // Fetch various game-related data
    const recentGames = await gameModel.getRecentGames(5);
    const upcomingGames = await gameModel.getUpcomingGames();
    
    // Create main dashboard embed
    const embed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle('Hockey League Games Dashboard')
      .setDescription('View recent and upcoming games, and access game history')
      .setTimestamp();
    
    // Add recent games section
    if (recentGames.length > 0) {
      let recentGamesText = '';
      
      for (const game of recentGames) {
        const gameDate = game.played_at 
          ? new Date(game.played_at).toLocaleDateString() 
          : 'Unknown Date';
        
        recentGamesText += `**Game #${game.id}** - ${gameDate}\n`;
        recentGamesText += `${game.home_team_city} ${game.home_team_name} ${game.home_score} - ${game.away_score} ${game.away_team_city} ${game.away_team_name}\n\n`;
      }
      
      embed.addFields(
        { name: 'Recent Games', value: recentGamesText }
      );
    } else {
      embed.addFields(
        { name: 'Recent Games', value: 'No games have been played yet.' }
      );
    }
    
    // Add upcoming games section
    if (upcomingGames.length > 0) {
      let upcomingGamesText = '';
      
      for (const game of upcomingGames) {
        upcomingGamesText += `**${game.scheduled_date} at ${game.scheduled_time}**\n`;
        upcomingGamesText += `${game.home_team_city} ${game.home_team_name} vs ${game.away_team_city} ${game.away_team_name}\n\n`;
      }
      
      embed.addFields(
        { name: 'Upcoming Games', value: upcomingGamesText }
      );
    } else {
      embed.addFields(
        { name: 'Upcoming Games', value: 'No upcoming games scheduled.' }
      );
    }
    
    // Add command help section
    embed.addFields(
      { name: 'Game Commands', value: 
        '`/gamehistory` - View all past games\n' +
        '`/gamehistory team:[team name]` - View a team\'s game history\n' +
        '`/gamedetails id:[game id]` - View detailed information about a specific game\n' +
        '`/schedulegame` - Schedule a new game\n' +
        '`/simulategame` - Play a game between two teams'
      }
    );
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in gamesDashboard command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = gamesDashboard;