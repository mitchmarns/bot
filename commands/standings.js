// League Standings command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');

async function standings(interaction) {
  // Get all teams sorted by points
  const teams = await teamModel.getTeamStandings();
  
  if (teams.length === 0) {
    return interaction.reply('No teams in the league yet.');
  }
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('League Standings')
    .setDescription('Teams ranked by points (2 pts for win, 1 pt for tie)');
  
  let standingsList = '';
  
  teams.forEach((team, index) => {
    const points = team.points; // Already calculated in the query
    standingsList += `${index + 1}. ${team.city} ${team.name} - ${points} pts (${team.wins}-${team.losses}-${team.ties})\n`;
  });
  
  embed.addFields({ name: 'Teams', value: standingsList });
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = standings;