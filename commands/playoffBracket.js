// Playoff Bracket command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');

async function playoffBracket(interaction) {
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
    
    // Get playoff bracket
    const bracket = await seasonModel.getPlayoffBracket(season.id);
    
    // Create the bracket visualization
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🏆 Playoff Bracket: ${season.name}`)
      .setDescription('Current playoff matchups and results')
      .setTimestamp();
    
    // Add each round to the embed
    const rounds = Object.keys(bracket).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const round of rounds) {
      const roundName = getRoundName(parseInt(round), rounds.length);
      let roundText = '';
      
      bracket[round].forEach((series, index) => {
        // Skip placeholder series where both teams are not determined yet
        if (series.team1_id === 0 && series.team2_id === 0) {
          roundText += `Matchup ${index + 1}: TBD vs TBD\n`;
          return;
        }
        
        // Skip series where one team is not determined yet
        if (series.team1_id === 0 || series.team2_id === 0) {
          const knownTeam = series.team1_id !== 0 
            ? `${series.team1_city} ${series.team1_name}`
            : `${series.team2_city} ${series.team2_name}`;
          
          roundText += `Matchup ${index + 1}: ${knownTeam} vs TBD\n`;
          return;
        }
        
        // Show completed series with result
        if (series.is_complete) {
          const winner = series.winner_id === series.team1_id 
            ? `${series.team1_city} ${series.team1_name}`
            : `${series.team2_city} ${series.team2_name}`;
          
          const score = series.winner_id === series.team1_id 
            ? `${series.team1_wins}-${series.team2_wins}`
            : `${series.team2_wins}-${series.team1_wins}`;
          
          roundText += `Series ${index + 1}: **${winner}** defeats ${series.winner_id === series.team1_id ? `${series.team2_city} ${series.team2_name}` : `${series.team1_city} ${series.team1_name}`} (${score})\n`;
        } 
        // Show ongoing series with current status
        else {
          roundText += `Series ${index + 1}: ${series.team1_city} ${series.team1_name} vs ${series.team2_city} ${series.team2_name} (${series.team1_wins}-${series.team2_wins})\n`;
        }
      });
      
      if (roundText) {
        embed.addFields({ name: roundName, value: roundText });
      }
    }
    
    // Check if we have a champion
    const finalRound = Math.max(...rounds.map(r => parseInt(r)));
    const finalSeries = bracket[finalRound][0];
    
    if (finalSeries && finalSeries.is_complete) {
      const champion = finalSeries.winner_id === finalSeries.team1_id 
        ? `${finalSeries.team1_city} ${finalSeries.team1_name}`
        : `${finalSeries.team2_city} ${finalSeries.team2_name}`;
      
      embed.addFields({ 
        name: '🏆 CHAMPION 🏆', 
        value: champion 
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in playoffBracket command:', error);
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

module.exports = playoffBracket;