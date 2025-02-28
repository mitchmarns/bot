// Team Matchup command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const gameModel = require('../database/models/gameModel');

async function teamMatchup(interaction) {
  try {
    const team1Name = interaction.options.getString('team1');
    const team2Name = interaction.options.getString('team2');
    
    // Get team details
    const team1 = await teamModel.getTeamByName(team1Name);
    const team2 = await teamModel.getTeamByName(team2Name);
    
    if (!team1 || !team2) {
      return interaction.reply('One or both teams could not be found.');
    }
    
    // Get matchup history
    const matchupGames = await gameModel.getTeamMatchupHistory(team1.id, team2.id);
    
    if (matchupGames.length === 0) {
      return interaction.reply(`${team1.city} ${team1.name} and ${team2.city} ${team2.name} have not played against each other yet.`);
    }
    
    // Calculate head-to-head records
    let team1Wins = 0;
    let team2Wins = 0;
    let ties = 0;
    
    let team1Goals = 0;
    let team2Goals = 0;
    
    // Process games to calculate stats
    matchupGames.forEach(game => {
      // Determine which team is home/away
      const isTeam1Home = game.home_team_id === team1.id;
      const team1Score = isTeam1Home ? game.home_score : game.away_score;
      const team2Score = isTeam1Home ? game.away_score : game.home_score;
      
      // Update goals
      team1Goals += team1Score;
      team2Goals += team2Score;
      
      // Update win/loss/tie record
      if (team1Score > team2Score) {
        team1Wins++;
      } else if (team2Score > team1Score) {
        team2Wins++;
      } else {
        ties++;
      }
    });
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#808080')
      .setTitle(`Matchup: ${team1.city} ${team1.name} vs ${team2.city} ${team2.name}`)
      .setDescription(`Head-to-head record based on ${matchupGames.length} ${matchupGames.length === 1 ? 'game' : 'games'}`)
      .addFields(
        { name: 'Record', value: `${team1.name}: ${team1Wins} wins\n${team2.name}: ${team2Wins} wins\nTies: ${ties}`, inline: false },
        { name: 'Total Goals', value: `${team1.name}: ${team1Goals} (${(team1Goals / matchupGames.length).toFixed(2)} per game)\n${team2.name}: ${team2Goals} (${(team2Goals / matchupGames.length).toFixed(2)} per game)`, inline: false }
      )
      .setTimestamp();
    
    // Add logo for the team with more wins
    if (team1Wins > team2Wins && team1.logo) {
      embed.setThumbnail(team1.logo);
    } else if (team2Wins > team1Wins && team2.logo) {
      embed.setThumbnail(team2.logo);
    }
    
    // Add recent games
    if (matchupGames.length > 0) {
      let recentGamesText = '';
      
      // Show at most 5 most recent games
      const recentMatchups = matchupGames.slice(0, 5);
      
      recentMatchups.forEach(game => {
        const gameDate = game.played_at 
          ? new Date(game.played_at).toLocaleDateString() 
          : 'Unknown Date';
        
        const isTeam1Home = game.home_team_id === team1.id;
        const team1Display = isTeam1Home ? game.home_team_name : game.away_team_name;
        const team2Display = isTeam1Home ? game.away_team_name : game.home_team_name;
        const team1Score = isTeam1Home ? game.home_score : game.away_score;
        const team2Score = isTeam1Home ? game.away_score : game.home_score;
        
        recentGamesText += `**Game #${game.id}** - ${gameDate}\n`;
        recentGamesText += `${team1Display} ${team1Score} - ${team2Score} ${team2Display}\n\n`;
      });
      
      embed.addFields(
        { name: 'Recent Matchups', value: recentGamesText }
      );
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in teamMatchup command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = teamMatchup;