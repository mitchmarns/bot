// Game Details command handler
const { EmbedBuilder } = require('discord.js');
const gameModel = require('../database/models/gameModel');

async function gameDetails(interaction) {
  try {
    const gameId = interaction.options.getInteger('id');
    
    // Get detailed game information
    const game = await gameModel.getGameDetails(gameId);
    
    if (!game) {
      return interaction.reply(`Game with ID ${gameId} not found.`);
    }
    
    // Format date
    const gameDate = game.played_at 
      ? new Date(game.played_at).toLocaleString() 
      : 'Unknown Date';
    
    // Create main game embed
    const embed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle(`Game #${game.id}: ${game.home_team_city} ${game.home_team_name} vs ${game.away_team_city} ${game.away_team_name}`)
      .setDescription(`Played on ${gameDate}`)
      .addFields(
        { name: 'Final Score', value: `${game.home_team_city} ${game.home_team_name} ${game.home_score} - ${game.away_score} ${game.away_team_city} ${game.away_team_name}`, inline: false }
      )
      .setTimestamp();
    
    // Process game events
    if (game.events && game.events.length > 0) {
      // Group events by type
      const goals = game.events.filter(e => e.event_type === 'goal');
      const penalties = game.events.filter(e => e.event_type === 'penalty');
      const shots = game.events.filter(e => e.event_type === 'shot');
      const hits = game.events.filter(e => e.event_type === 'hit');
      const blockedShots = game.events.filter(e => e.event_type === 'blocked_shot');
      
      // Add scoring summary
      if (goals.length > 0) {
        // Sort goals by period and time
        goals.sort((a, b) => {
          if (a.period !== b.period) return a.period - b.period;
          return a.time.localeCompare(b.time);
        });
        
        let scoringSummary = '';
        goals.forEach(goal => {
          scoringSummary += `Period ${goal.period} - ${goal.time} - ${goal.description}\n`;
        });
        
        if (scoringSummary) {
          embed.addFields({ name: 'Scoring Summary', value: scoringSummary });
        }
      }
      
      // Add penalty summary
      if (penalties.length > 0) {
        let penaltySummary = '';
        penalties.forEach(penalty => {
          penaltySummary += `Period ${penalty.period} - ${penalty.time} - ${penalty.description}\n`;
        });
        
        if (penaltySummary) {
          embed.addFields({ name: 'Penalties', value: penaltySummary });
        }
      }
      
      // Add game stats summary
      const homeShots = shots.filter(s => s.description.includes(game.home_team_name)).length;
      const awayShots = shots.filter(s => s.description.includes(game.away_team_name)).length;
      const homeHits = hits.filter(h => h.description.includes(game.home_team_name)).length;
      const awayHits = hits.filter(h => h.description.includes(game.away_team_name)).length;
      
      const statsText = `**Shots**: ${game.home_team_name} ${homeShots}, ${game.away_team_name} ${awayShots}\n` +
                        `**Hits**: ${game.home_team_name} ${homeHits}, ${game.away_team_name} ${awayHits}\n`;
      
      embed.addFields({ name: 'Game Stats', value: statsText });
    } else {
      embed.addFields({ name: 'Game Details', value: 'No detailed events recorded for this game.' });
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in gameDetails command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = gameDetails;