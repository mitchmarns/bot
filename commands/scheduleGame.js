// Schedule Game command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const gameModel = require('../database/models/gameModel');

async function scheduleGame(interaction) {
  const homeTeamName = interaction.options.getString('hometeam');
  const awayTeamName = interaction.options.getString('awayteam');
  const date = interaction.options.getString('date');
  const time = interaction.options.getString('time');
  
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
  
  // Schedule the game
  await gameModel.scheduleGame(
    homeTeam.id, 
    awayTeam.id, 
    date, 
    time
  );
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Game Scheduled')
    .setDescription(`${homeTeam.city} ${homeTeam.name} vs ${awayTeam.city} ${awayTeam.name}`)
    .addFields(
      { name: 'Date', value: date, inline: true },
      { name: 'Time', value: time, inline: true }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = scheduleGame;