// Schedule Game command handler (Updated for seasons)
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const gameModel = require('../database/models/gameModel');
const seasonModel = require('../database/models/seasonModel');

async function scheduleGame(interaction) {
  const homeTeamName = interaction.options.getString('hometeam');
  const awayTeamName = interaction.options.getString('awayteam');
  const date = interaction.options.getString('date');
  const time = interaction.options.getString('time');
  const isPlayoff = interaction.options.getBoolean('playoff') || false;
  
  // Find teams
  const homeTeam = await teamModel.getTeamByName(homeTeamName);
  const awayTeam = await teamModel.getTeamByName(awayTeamName);
  
  if (!homeTeam || !awayTeam) {
    return interaction.reply('One or both teams don\'t exist.');
  }
  
  // Validate date format (simple validation)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^\d{2}:\d{2}$/;
  
  if (!dateRegex.test(date) || !timeRegex.test(time)) {
    return interaction.reply('Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time.');
  }
  
  // Check for active season
  const activeSeason = await seasonModel.getActiveSeason();
  if (!activeSeason) {
    return interaction.reply('There is no active season. Start a season first with /startseason.');
  }
  
  // If scheduling a playoff game, check if playoffs have started
  if (isPlayoff && !activeSeason.playoffs_started) {
    return interaction.reply('Playoffs haven\'t started yet. Use /startplayoffs first.');
  }
  
  // Schedule the game with season context
  await gameModel.scheduleGameWithSeason(
    homeTeam.id, 
    awayTeam.id, 
    date, 
    time,
    activeSeason.id,
    isPlayoff
  );
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(isPlayoff ? '🏆 Playoff Game Scheduled' : 'Game Scheduled')
    .setDescription(`${homeTeam.city} ${homeTeam.name} vs ${awayTeam.city} ${awayTeam.name}`)
    .addFields(
      { name: 'Date', value: date, inline: true },
      { name: 'Time', value: time, inline: true },
      { name: 'Season', value: activeSeason.name, inline: true },
      { name: 'Type', value: isPlayoff ? 'Playoff Game' : 'Regular Season Game', inline: true }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = scheduleGame;