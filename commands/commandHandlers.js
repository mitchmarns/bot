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
const stats = require('./stats');
const assignPhone = require('./assignPhone');
const sendText = require('./sendText');
const viewInbox = require('./viewInbox');
const viewConversation = require('./viewConversation');
const addTrigger = require('./addTrigger');
const myTriggers = require('./myTriggers');
const removeTrigger = require('./removeTrigger');

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
  setskills: setPlayerSkills,
  stats: stats,
  assignphone: assignPhone,
  text: sendText,
  inbox: viewInbox,
  conversation: viewConversation,
  addtrigger: addTrigger,
  mytriggers: myTriggers,
  removetrigger: removeTrigger
};