// Season Summary command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');
const teamModel = require('../database/models/teamModel');
const playerModel = require('../database/models/playerModel');
const gameModel = require('../database/models/gameModel');

async function seasonSummary(interaction) {
  try {
    // Get season ID from options or use active season
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
    
    // Get team standings for this season
    const teams = await teamModel.getTeamStandings();
    
    // Get scoring leaders for this season
    const scoringLeaders = await playerModel.getPlayerStatsLeaders('points', 5);
    
    // Get games played in this season
    const games = await gameModel.getSeasonGames(season.id);
    const playedGames = games.filter(g => g.is_played);
    const scheduledGames = games.filter(g => !g.is_played);
    const regularSeasonGames = games.filter(g => !g.is_playoff_game);
    const playoffGames = games.filter(g => g.is_playoff_game);
    
    // Create the season summary embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Season Summary: ${season.name}`)
      .setDescription(`Statistics and information for the ${season.name}`)
      .addFields(
        { name: 'Status', value: season.is_active ? '🟢 Active' : '🔴 Completed', inline: true },
        { name: 'Start Date', value: season.start_date, inline: true }
      )
      .setTimestamp();

    // Add end date if available
    if (season.end_date) {
      embed.addFields({ name: 'End Date', value: season.end_date, inline: true });
    }
    
    // Add playoff status
    const playoffStatus = !season.playoffs_started ? 'Not Started' :
                           (season.is_active ? 'In Progress' : 'Completed');
    embed.addFields({ name: 'Playoffs', value: playoffStatus, inline: true });
    
    // Add game stats
    embed.addFields({
      name: 'Games',
      value: `Total: ${games.length}\nPlayed: ${playedGames.length}\nScheduled: ${scheduledGames.length}\nRegular Season: ${regularSeasonGames.length}\nPlayoffs: ${playoffGames.length}`,
      inline: false
    });
    
    // Add top teams
    if (teams.length > 0) {
      let standingsText = '';
      teams.slice(0, 5).forEach((team, index) => {
        const points = team.wins * 2 + team.ties;
        standingsText += `${index + 1}. ${team.city} ${team.name} - ${points} pts (${team.wins}-${team.losses}-${team.ties})\n`;
      });
      
      embed.addFields({ name: 'Top Teams', value: standingsText });
    }
    
    // Add scoring leaders
    if (scoringLeaders.length > 0) {
      let scoringText = '';
      scoringLeaders.forEach((player, index) => {
        const points = player.goals + player.assists;
        scoringText += `${index + 1}. ${player.name} (${player.team_name}) - ${points} pts (${player.goals}G, ${player.assists}A)\n`;
      });
      
      embed.addFields({ name: 'Scoring Leaders', value: scoringText });
    }
    
    // Check for champion if season has completed playoffs
    if (season.playoffs_started && !season.is_active) {
      try {
        // Get the playoff bracket to find the champion
        const bracket = await seasonModel.getPlayoffBracket(season.id);
        const finalRound = Math.max(...Object.keys(bracket).map(r => parseInt(r)));
        const championshipSeries = bracket[finalRound][0];
        
        if (championshipSeries && championshipSeries.is_complete && championshipSeries.winner_id) {
          const championTeam = await teamModel.getTeamById(championshipSeries.winner_id);
          if (championTeam) {
            embed.addFields({ 
              name: '🏆 League Champion', 
              value: `${championTeam.city} ${championTeam.name}` 
            });
          }
        }
      } catch (error) {
        console.error('Error getting champion:', error);
      }
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in seasonSummary command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = seasonSummary;