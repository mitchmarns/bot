// Start Playoffs command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');
const teamModel = require('../database/models/teamModel');

async function startPlayoffs(interaction) {
  try {
    // Check if there's an active season
    const activeSeason = await seasonModel.getActiveSeason();
    if (!activeSeason) {
      return interaction.reply('There is no active season. Start a season first before initiating playoffs.');
    }
    
    // Check if playoffs already started
    if (activeSeason.playoffs_started) {
      return interaction.reply('Playoffs have already started for the current season.');
    }
    
    // Get teams sorted by standings
    const teams = await teamModel.getTeamStandings();
    
    if (teams.length < 2) {
      return interaction.reply('You need at least 2 teams in the league to start playoffs.');
    }
    
    // Get number of playoff teams from command options
    const numTeams = interaction.options.getInteger('teams') || 
                     (teams.length >= 16 ? 16 : 
                      teams.length >= 8 ? 8 : 
                      teams.length >= 4 ? 4 : 2);
    
    // Validate number of teams
    if (numTeams > teams.length) {
      return interaction.reply(`You only have ${teams.length} teams in the league. Cannot have ${numTeams} playoff teams.`);
    }
    
    if (numTeams < 2 || numTeams % 2 !== 0) {
      return interaction.reply('Number of playoff teams must be even and at least 2 (e.g., 2, 4, 8, 16).');
    }
    
    // Get top N teams for playoffs
    const playoffTeams = teams.slice(0, numTeams);
    const playoffTeamIds = playoffTeams.map(team => team.id);
    
    // Start playoffs
    await seasonModel.startPlayoffs(activeSeason.id, playoffTeamIds);
    
    // Get the playoff bracket
    const playoffBracket = await seasonModel.getPlayoffBracket(activeSeason.id);
    
    // Create the playoff announcement embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🏆 Playoff Tournament: ${activeSeason.name}`)
      .setDescription(`The ${activeSeason.name} playoffs have officially begun with the top ${numTeams} teams!`)
      .setTimestamp();
    
    // Add first round matchups
    if (playoffBracket[1] && playoffBracket[1].length > 0) {
      let matchupsText = '';
      playoffBracket[1].forEach((series, index) => {
        matchupsText += `Series ${index + 1}: ${series.team1_city} ${series.team1_name} vs ${series.team2_city} ${series.team2_name} (Best of ${series.best_of})\n`;
      });
      
      embed.addFields({ name: 'First Round Matchups', value: matchupsText });
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in startPlayoffs command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = startPlayoffs;