// Find Playoff Series command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');
const teamModel = require('../database/models/teamModel');

async function findSeries(interaction) {
  try {
    const teamName = interaction.options.getString('team');
    
    // Find the team
    const team = await teamModel.getTeamByName(teamName);
    if (!team) {
      return interaction.reply(`Team "${teamName}" not found.`);
    }
    
    // Get active season 
    const activeSeason = await seasonModel.getActiveSeason();
    if (!activeSeason) {
      return interaction.reply('There is no active season.');
    }
    
    // Check if playoffs have started
    if (!activeSeason.playoffs_started) {
      return interaction.reply(`Playoffs haven't started for the ${activeSeason.name} season yet.`);
    }
    
    // Get the playoff bracket
    const bracket = await seasonModel.getPlayoffBracket(activeSeason.id);
    
    // Find series with the specified team
    let foundSeries = null;
    let teamPosition = '';
    let opponent = '';
    
    // Iterate through all rounds and series to find a match
    const rounds = Object.keys(bracket);
    for (const round of rounds) {
      for (const series of bracket[round]) {
        // Skip if the series isn't active yet
        if (series.team1_id === 0 || series.team2_id === 0) {
          continue;
        }
        
        if (series.team1_id === team.id) {
          foundSeries = series;
          teamPosition = 'team1';
          opponent = `${series.team2_city} ${series.team2_name}`;
          break;
        } else if (series.team2_id === team.id) {
          foundSeries = series;
          teamPosition = 'team2';
          opponent = `${series.team1_city} ${series.team1_name}`;
          break;
        }
      }
      
      if (foundSeries) break;
    }
    
    if (!foundSeries) {
      return interaction.reply(`${team.city} ${team.name} is not currently in any active playoff series.`);
    }
    
    // Build the response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Playoff Series: ${team.city} ${team.name}`)
      .setDescription(`Current playoff series information for ${team.city} ${team.name}`)
      .addFields(
        { name: 'Opponent', value: opponent, inline: true },
        { name: 'Series Score', value: `${foundSeries.team1_wins}-${foundSeries.team2_wins}`, inline: true },
        { name: 'Format', value: `Best of ${foundSeries.best_of}`, inline: true },
        { name: 'Series ID', value: `${foundSeries.id}`, inline: true }
      )
      .setTimestamp();
    
    // Add series progress
    const winsNeeded = Math.ceil(foundSeries.best_of / 2);
    const teamWins = teamPosition === 'team1' ? foundSeries.team1_wins : foundSeries.team2_wins;
    const oppWins = teamPosition === 'team1' ? foundSeries.team2_wins : foundSeries.team1_wins;
    
    let statusText = '';
    if (teamWins > oppWins) {
      statusText = `${team.city} ${team.name} leads ${teamWins}-${oppWins}`;
    } else if (oppWins > teamWins) {
      statusText = `${opponent} leads ${oppWins}-${teamWins}`;
    } else {
      statusText = `Series tied ${teamWins}-${oppWins}`;
    }
    
    statusText += `\n${team.city} ${team.name} needs ${winsNeeded - teamWins} more wins`;
    statusText += `\n${opponent} needs ${winsNeeded - oppWins} more wins`;
    
    embed.addFields({ name: 'Series Status', value: statusText });
    
    // Add note for recording game results
    embed.addFields({ 
      name: 'Record a Game', 
      value: `To record a playoff game in this series, use:\n\`/recordplayoffgame series:${foundSeries.id} winningteam:[team_name]\`` 
    });
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in findSeries command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = findSeries;