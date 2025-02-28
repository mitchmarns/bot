// End Season command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');
const teamModel = require('../database/models/teamModel');
const playerModel = require('../database/models/playerModel');

async function endSeason(interaction) {
  try {
    // Check if there's an active season
    const activeSeason = await seasonModel.getActiveSeason();
    if (!activeSeason) {
      return interaction.reply('There is no active season to end.');
    }
    
    const endDate = interaction.options.getString('date') || new Date().toISOString().split('T')[0];
    
    // End the season
    await seasonModel.endSeason(activeSeason.id, endDate);
    
    // Get final standings
    const teams = await teamModel.getTeamStandings();
    
    // Get scoring leaders
    const scoringLeaders = await playerModel.getPlayerStatsLeaders('points', 5);
    
    // Create the season summary embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🏆 Season Complete: ${activeSeason.name}`)
      .setDescription(`The ${activeSeason.name} regular season has officially ended!`)
      .addFields(
        { name: 'Season', value: activeSeason.name, inline: true },
        { name: 'Start Date', value: activeSeason.start_date, inline: true },
        { name: 'End Date', value: endDate, inline: true }
      )
      .setTimestamp();
    
    // Add top teams
    if (teams.length > 0) {
      let standingsText = '';
      teams.slice(0, 5).forEach((team, index) => {
        const points = team.wins * 2 + team.ties;
        standingsText += `${index + 1}. ${team.city} ${team.name} - ${points} pts (${team.wins}-${team.losses}-${team.ties})\n`;
      });
      
      embed.addFields({ name: 'Final Standings (Top 5)', value: standingsText });
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
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in endSeason command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = endSeason;