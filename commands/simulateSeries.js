// Simulate Playoff Series command handler
const { EmbedBuilder } = require('discord.js');
const seasonModel = require('../database/models/seasonModel');
const teamModel = require('../database/models/teamModel');
const gameModel = require('../database/models/gameModel');
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');

// Reuse functions from simulateGame.js
const {
  simulateGameScore,
  calculateTeamStrength,
  getPlayerWithSkills
} = require('./simulateGameHelpers');

async function simulateSeries(interaction) {
  try {
    const seriesId = interaction.options.getInteger('series');
    
    // Get the playoff series
    const series = await seasonModel.getPlayoffSeries(seriesId);
    if (!series) {
      return interaction.reply(`Playoff series with ID ${seriesId} not found.`);
    }
    
    // Check if series is already complete
    if (series.is_complete) {
      return interaction.reply(`This playoff series is already complete. ${series.winner_city} ${series.winner_name} won.`);
    }
    
    // Check user has required permissions (optional)
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({
        content: 'You need administrator permissions to simulate an entire playoff series.',
        ephemeral: true
      });
    }
    
    // Defer reply since this will take some time
    await interaction.deferReply();
    
    // Define a function to simulate a single game for this series
    async function simulatePlayoffGame(homeTeam, awayTeam, seriesId) {
      // Get players for both teams
      const homePlayers = await Promise.all(
        (await playerModel.getPlayersByTeamId(homeTeam.id))
          .map(getPlayerWithSkills)
      );
      
      const awayPlayers = await Promise.all(
        (await playerModel.getPlayersByTeamId(awayTeam.id))
          .map(getPlayerWithSkills)
      );
      
      // Calculate team strengths
      const homeStrength = calculateTeamStrength(homePlayers);
      const awayStrength = calculateTeamStrength(awayPlayers);
      
      // Simulate the game score
      const { homeScore, awayScore } = simulateGameScore(homeStrength, awayStrength);
      
      // Record the game result in the database
      const activeSeason = await seasonModel.getActiveSeason();
      await gameModel.recordGameResultWithSeason(
        homeTeam.id,
        awayTeam.id,
        homeScore,
        awayScore,
        activeSeason.id,
        true // Is playoff game
      );
      
      // Update team records
      if (homeScore > awayScore) {
        await teamModel.updateTeamRecord(homeTeam.id, 'win');
        await teamModel.updateTeamRecord(awayTeam.id, 'loss');
      } else {
        await teamModel.updateTeamRecord(awayTeam.id, 'win');
        await teamModel.updateTeamRecord(homeTeam.id, 'loss');
      }
      
      // Return the result
      return { homeScore, awayScore };
    }
    
    // Simulate the entire series
    const seriesResult = await seasonModel.simulatePlayoffSeries(seriesId, simulatePlayoffGame);
    
    // Create the response embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Playoff Series Simulation: ${series.team1_city} ${series.team1_name} vs ${series.team2_city} ${series.team2_name}`)
      .setDescription(`Results of the best-of-${series.best_of} playoff series simulation`)
      .setTimestamp();
    
    // Add the final result
    embed.addFields({
      name: '🏆 Series Winner',
      value: `${seriesResult.winner} wins ${seriesResult.finalScore}`,
    });
    
    // Add game-by-game results
    let gamesText = '';
    seriesResult.results.forEach(game => {
      gamesText += `Game ${game.game}: ${game.homeTeam} ${game.score} ${game.awayTeam}\n`;
      gamesText += `Winner: ${game.winner} (Series: ${game.seriesScore})\n\n`;
    });
    
    embed.addFields({
      name: 'Game Results',
      value: gamesText || 'No games were played.'
    });
    
    // Add championship note if applicable
    if (seriesResult.isChampionship) {
      embed.addFields({
        name: '🏆 CHAMPIONSHIP RESULT 🏆',
        value: `${seriesResult.winner} has won the ${series.season_name} Championship!`
      });
      
      // Set gold color for championship
      embed.setColor('#FFD700');
    }
    
    // Edit the deferred reply with our results
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in simulateSeries command:', error);
    // Handle the error for the deferred reply
    if (interaction.deferred) {
      await interaction.editReply({ 
        content: `An error occurred: ${error.message}` 
      });
    } else {
      await interaction.reply({ 
        content: `An error occurred: ${error.message}`, 
        ephemeral: true 
      });
    }
  }
}

module.exports = simulateSeries;