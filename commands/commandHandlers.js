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
const removePlayer = require('./removePlayer');
const gameHistory = require('./gameHistory');
const gameDetails = require('./gameDetails');
const teamMatchup = require('./teamMatchup');
const trade = require('./trade');
const tradeHistory = require('./tradeHistory');
const seasonSummary = require('./seasonSummary');
const playoffMatchups = require('./playoffMatchups');
const findSeries = require('./findSeries');
const simulateSeries = require('./simulateSeries');
const startSeason = require('./startSeason');
const instagramPost = require('./instagramPost');
const createBotTeam = require('./createBotTeam');


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
  removetrigger: removeTrigger,
  removeplayer: removePlayer,
  gamehistory: gameHistory,
  gamedetails: gameDetails,
  matchup: teamMatchup,
  trade: trade,
  tradehistory: tradeHistory,
  seasonsummary: seasonSummary,
  playoffmatchups: playoffMatchups,
  findseries: findSeries,
  simulateseries: simulateSeries,
  startseason: startSeason,
  instagram: instagramPost,
  createbotteam: createBotTeam,
};