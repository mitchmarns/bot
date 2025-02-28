// Playoff Matchups command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');
const teamModel = require('../database/models/teamModel');

async function playoffMatchups(interaction) {
  try {
    // Get active season or specific season by ID
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
    
    // Check if playoffs have started
    if (!season.playoffs_started) {
      return interaction.reply(`Playoffs haven't started for the ${season.name} season yet.`);
    }
    
    // Get all playoff series for this season
    const bracket = await seasonModel.getPlayoffBracket(season.id);
    
    // Create the matchups embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🏆 Playoff Matchups: ${season.name}`)
      .setDescription('Current playoff series and their status')
      .setTimestamp();
    
    // Add each active series to the embed
    let foundActiveSeries = false;
    
    // Get all rounds
    const rounds = Object.keys(bracket).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const round of rounds) {
      const seriesList = bracket[round];
      const activeSeries = seriesList.filter(s => 
        !s.is_complete && 
        s.team1_id !== 0 && s.team2_id !== 0
      );
      
      if (activeSeries.length > 0) {
        foundActiveSeries = true;
        const roundName = getRoundName(parseInt(round), rounds.length);
        
        let seriesText = '';
        activeSeries.forEach((series, index) => {
          const team1 = `${series.team1_city} ${series.team1_name}`;
          const team2 = `${series.team2_city} ${series.team2_name}`;
          
          seriesText += `**Series ${index + 1}** (ID: ${series.id})\n`;
          seriesText += `${team1} vs ${team2}\n`;
          seriesText += `Current: ${series.team1_wins}-${series.team2_wins} (Best of ${series.best_of})\n\n`;
        });
        
        embed.addFields({ name: roundName, value: seriesText });
      }
    }
    
    // If no active series were found
    if (!foundActiveSeries) {
      // Check if there's a champion
      const finalRound = Math.max(...rounds.map(r => parseInt(r)));
      const championshipSeries = bracket[finalRound][0];
      
      if (championshipSeries && championshipSeries.is_complete) {
        const champion = championshipSeries.winner_id === championshipSeries.team1_id 
          ? `${championshipSeries.team1_city} ${championshipSeries.team1_name}`
          : `${championshipSeries.team2_city} ${championshipSeries.team2_name}`;
        
        embed.setTitle(`🏆 Playoff Champion: ${season.name}`);
        embed.setDescription(`The playoffs have concluded for the ${season.name} season!`);
        embed.addFields({ 
          name: 'League Champion', 
          value: champion 
        });
      } else {
        embed.setDescription('There are no active playoff series at the moment.');
      }
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in playoffMatchups command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// Helper function to get human-readable round names
function getRoundName(round, totalRounds) {
  if (round === totalRounds) {
    return 'Championship Final';
  } else if (round === totalRounds - 1) {
    return 'Conference Finals';
  } else if (round === totalRounds - 2) {
    return 'Conference Semifinals';
  } else if (round === 1) {
    return 'First Round';
  } else {
    return `Round ${round}`;
  }
}

module.exports = playoffMatchups;