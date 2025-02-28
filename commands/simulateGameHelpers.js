// Helper functions for game simulation extracted from simulateGame.js
const skillsModel = require('../database/models/skillsModel');

// Get player with skills
async function getPlayerWithSkills(player) {
  const skills = await skillsModel.getPlayerSkills(player.id);
  return { ...player, skills };
}

// Function to calculate team strength
function calculateTeamStrength(players) {
  const skaters = players.filter(p => p.position !== 'goalie');
  const goalies = players.filter(p => p.position === 'goalie');
  
  // Calculate skating strength
  const skatingStrength = skaters.reduce((sum, p) => sum + (p.skills?.skating || 50), 0) / 
    (skaters.length || 1);
  
  // Calculate offense strength (shooting + passing)
  const offenseStrength = skaters.reduce((sum, p) => 
    sum + ((p.skills?.shooting || 50) + (p.skills?.passing || 50)) / 2, 0) / 
    (skaters.length || 1);
  
  // Calculate defense strength
  const defenseStrength = skaters.reduce((sum, p) => sum + (p.skills?.defense || 50), 0) / 
    (skaters.length || 1);
  
  // Calculate goaltending strength
  const goaltendingStrength = goalies.length > 0 ? 
    goalies.reduce((sum, p) => sum + (p.skills?.goaltending || 50), 0) / goalies.length : 
    50; // Default if no goalie
  
  return {
    skating: skatingStrength,
    offense: offenseStrength,
    defense: defenseStrength,
    goaltending: goaltendingStrength,
    overall: (skatingStrength + offenseStrength + defenseStrength * 2 + goaltendingStrength * 3) / 7
  };
}

// Function to simulate game with team strengths
function simulateGameScore(homeStrength, awayStrength) {
  // Base scores (random 0-3 goals)
  let homeScore = Math.floor(Math.random() * 4);
  let awayScore = Math.floor(Math.random() * 4);
  
  // Adjust based on offense vs goaltending
  const homeOffenseVsGoal = (homeStrength.offense - awayStrength.goaltending) / 100;
  const awayOffenseVsGoal = (awayStrength.offense - homeStrength.goaltending) / 100;
  
  // Add extra goals based on skill difference (0-3 extra goals)
  homeScore += Math.floor(Math.max(0, homeOffenseVsGoal * 6));
  awayScore += Math.floor(Math.max(0, awayOffenseVsGoal * 6));
  
  // Home ice advantage (slight chance for extra goal)
  if (Math.random() < 0.2) {
    homeScore += 1;
  }
  
  return { homeScore, awayScore };
}

// Enhanced goal scorer selection based on player skills
function selectGoalScorer(skaters) {
  // Weigh players by shooting skill
  const totalWeight = skaters.reduce((sum, player) => sum + (player.skills?.shooting || 50), 0);
  let random = Math.random() * totalWeight;
  
  for (const player of skaters) {
    const weight = player.skills?.shooting || 50;
    if (random <= weight) {
      return player;
    }
    random -= weight;
  }
  
  // Fallback to random player if something goes wrong
  return skaters[Math.floor(Math.random() * skaters.length)];
}

// Enhanced assist selection based on player skills
function selectAssist(skaters, scorerId) {
  const possibleAssists = skaters.filter(p => p.id !== scorerId);
  if (possibleAssists.length === 0) return null;
  
  // Weigh players by passing skill
  const totalWeight = possibleAssists.reduce((sum, player) => sum + (player.skills?.passing || 50), 0);
  let random = Math.random() * totalWeight;
  
  for (const player of possibleAssists) {
    const weight = player.skills?.passing || 50;
    if (random <= weight) {
      return player;
    }
    random -= weight;
  }
  
  // Fallback to random player if something goes wrong
  return possibleAssists[Math.floor(Math.random() * possibleAssists.length)];
}

module.exports = {
  getPlayerWithSkills,
  calculateTeamStrength,
  simulateGameScore,
  selectGoalScorer,
  selectAssist
};