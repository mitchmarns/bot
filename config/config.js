// Configuration settings
require('dotenv').config();

module.exports = {
  // Bot configuration
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  
  // Database configuration - modified for multi-server support
  getDbPath: function(guildId) {
    return `./hockey_league_${guildId}.db`;
  },
  
  // Other configuration settings can be added here
  POSITIONS: [
    { name: 'Center', value: 'center' },
    { name: 'Left Wing', value: 'left_wing' },
    { name: 'Right Wing', value: 'right_wing' },
    { name: 'Defenseman', value: 'defenseman' },
    { name: 'Goalie', value: 'goalie' },
  ]
};