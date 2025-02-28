// Seasons List command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');

async function seasons(interaction) {
  try {
    // Get all seasons
    const allSeasons = await seasonModel.getAllSeasons();
    
    if (allSeasons.length === 0) {
      return interaction.reply('No seasons have been created yet. Use /startseason to create one.');
    }
    
    // Create the seasons list embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🏒 Hockey League Seasons')
      .setDescription('List of all seasons and their status')
      .setTimestamp();
    
    // Add current/most recent season details
    const activeSeason = allSeasons.find(s => s.is_active);
    const mostRecentSeason = activeSeason || allSeasons[0];
    
    if (activeSeason) {
      embed.addFields({
        name: '🟢 Current Active Season',
        value: `**${activeSeason.name}**\nStarted: ${activeSeason.start_date}\nPlayoffs: ${activeSeason.playoffs_started ? 'In Progress' : 'Not Started'}`
      });
    }
    
    // List all seasons
    let seasonsText = '';
    
    allSeasons.forEach((season, index) => {
      const status = season.is_active ? '🟢 Active' : 
                    (season.end_date ? '🔴 Completed' : '🟡 Inactive');
      
      seasonsText += `**${index + 1}. ${season.name}** (ID: ${season.id}) - ${status}\n`;
      seasonsText += `Started: ${season.start_date}`;
      if (season.end_date) {
        seasonsText += ` | Ended: ${season.end_date}`;
      }
      
      seasonsText += `\nPlayoffs: ${season.playoffs_started ? 'Started' : 'Not Started'}\n\n`;
    });
    
    embed.addFields({
      name: 'All Seasons',
      value: seasonsText
    });
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in seasons command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = seasons;