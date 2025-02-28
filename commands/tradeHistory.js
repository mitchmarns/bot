// Trade History command handler
const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const teamModel = require('../database/models/teamModel');
const tradeModel = require('../database/models/tradeModel');

async function tradeHistory(interaction) {
  try {
    const playerName = interaction.options.getString('player');
    const teamName = interaction.options.getString('team');
    const limit = interaction.options.getInteger('limit') || 10;
    
    let trades = [];
    let title = '';
    let description = '';
    
    // Get trade history based on filters
    if (playerName) {
      // Get player's trade history
      const player = await playerModel.getPlayerByName(playerName);
      
      if (!player) {
        return interaction.reply(`Player "${playerName}" doesn't exist.`);
      }
      
      trades = await tradeModel.getPlayerTradeHistory(player.id);
      title = `Trade History for ${player.name}`;
      description = `All trades involving ${player.name} (#${player.number})`;
      
    } else if (teamName) {
      // Get team's trade history
      const team = await teamModel.getTeamByName(teamName);
      
      if (!team) {
        return interaction.reply(`Team "${teamName}" doesn't exist.`);
      }
      
      trades = await tradeModel.getTeamTradeHistory(team.id, limit);
      title = `Trade History for ${team.city} ${team.name}`;
      description = `Recent trades involving the ${team.city} ${team.name}`;
      
    } else {
      // Get recent trades across the league
      trades = await tradeModel.getRecentTrades(limit);
      title = 'Recent League Trades';
      description = 'Most recent trades across the league';
    }
    
    if (trades.length === 0) {
      return interaction.reply('No trade history found.');
    }
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();
    
    // Add trade entries
    trades.forEach((trade, index) => {
      const date = new Date(trade.trade_date).toLocaleDateString();
      
      let fieldName;
      let fieldValue;
      
      if (teamName) {
        // Format differently for team-specific view
        const tradeDirection = trade.trade_type === 'incoming' ? 'Acquired' : 'Traded away';
        const otherTeam = trade.trade_type === 'incoming' ? 
          `${trade.from_team_city} ${trade.from_team_name}` : 
          `${trade.to_team_city} ${trade.to_team_name}`;
        
        fieldName = `${date} - ${tradeDirection} ${trade.player_name}`;
        fieldValue = `**With**: ${otherTeam}\n**Position**: ${trade.position.replace('_', ' ')}\n${trade.notes ? `**Notes**: ${trade.notes}` : ''}`;
      } else {
        // Standard format for player or league view
        fieldName = `${date} - ${trade.player_name}`;
        fieldValue = `**From**: ${trade.from_team_city} ${trade.from_team_name}\n**To**: ${trade.to_team_city} ${trade.to_team_name}\n${trade.notes ? `**Notes**: ${trade.notes}` : ''}`;
      }
      
      embed.addFields({ name: fieldName, value: fieldValue });
    });
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in tradeHistory command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = tradeHistory;