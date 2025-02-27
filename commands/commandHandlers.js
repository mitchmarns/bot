// Import all command handlers
const createPlayer = require('./createPlayer');
const updatePlayerImage = require('./updatePlayerImage');
const createTeam = require('./createTeam');
const roster = require('./roster');
const simulateGame = require('./simulateGame');
const scheduleGame = require('./scheduleGame');
const standings = require('./standings');
const playerInfo = require('./playerInfo');
const roll = require('./roll');
const setPlayerSkills = require('./setPlayerSkills');

// Export all handlers as a single object
module.exports = {
  createplayer: createPlayer,
  updateplayerimage: updatePlayerImage,
  createteam: createTeam,
  roster: roster,
  simulategame: simulateGame,
  schedulegame: scheduleGame,
  standings: standings,
  playerinfo: playerInfo,
  roll: roll,
  setskills: setPlayerSkills
};
