// Simulate Game command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');
const gameModel = require('../database/models/gameModel');

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

async function simulateGame(interaction) {
  const homeTeamName = interaction.options.getString('hometeam');
  const awayTeamName = interaction.options.getString('awayteam');
  
  // Find teams
  const homeTeam = await teamModel.getTeamByName(homeTeamName);
  const awayTeam = await teamModel.getTeamByName(awayTeamName);
  
  if (!homeTeam || !awayTeam) {
    return interaction.reply('One or both teams don\'t exist.');
  }
  
  // Find players on each team
  let homePlayers = await playerModel.getPlayersByTeamId(homeTeam.id);
  let awayPlayers = await playerModel.getPlayersByTeamId(awayTeam.id);
  
  if (homePlayers.length < 6 || awayPlayers.length < 6) {
    return interaction.reply('Both teams need at least 6 players to simulate a game.');
  }
  
  // Start with a "loading" message
  await interaction.deferReply();
  
  // Add skills to each player
  homePlayers = await Promise.all(homePlayers.map(getPlayerWithSkills));
  awayPlayers = await Promise.all(awayPlayers.map(getPlayerWithSkills));

  // Calculate team strengths
  const homeStrength = calculateTeamStrength(homePlayers);
  const awayStrength = calculateTeamStrength(awayPlayers);
  
  // Simulate game scores
  const { homeScore, awayScore } = simulateGameScore(homeStrength, awayStrength);
  
  // Update team records
  if (homeScore > awayScore) {
    await teamModel.updateTeamRecord(homeTeam.id, 'win');
    await teamModel.updateTeamRecord(awayTeam.id, 'loss');
  } else if (awayScore > homeScore) {
    await teamModel.updateTeamRecord(awayTeam.id, 'win');
    await teamModel.updateTeamRecord(homeTeam.id, 'loss');
  } else {
    await teamModel.updateTeamRecord(homeTeam.id, 'tie');
    await teamModel.updateTeamRecord(awayTeam.id, 'tie');
  }
  
  // Create game record
  const gameResult = await gameModel.recordGameResult(
    homeTeam.id, 
    awayTeam.id, 
    homeScore, 
    awayScore
  );

  // Initialize game stats
  const gameStats = {
    home: {
      shots: 0,
      hits: 0,
      blockedShots: 0,
      penaltyMinutes: 0
    },
    away: {
      shots: 0,
      hits: 0,
      blockedShots: 0,
      penaltyMinutes: 0
    }
  };
  
  // Store all game events
  const allEvents = [];
  
  // Generate hockey events for each period
  for (let period = 1; period <= 3; period++) {
    // Generate about 15-20 events per period for each team
    const homeEventsCount = Math.floor(Math.random() * 5) + 15;
    const awayEventsCount = Math.floor(Math.random() * 5) + 15;
    
    // Home team events
    for (let i = 0; i < homeEventsCount; i++) {
      const event = generateHockeyEvent(period, homePlayers, awayPlayers, true);
      allEvents.push(event);
      
      // Update stats based on event type
      switch (event.type) {
        case 'shot':
          gameStats.home.shots++;
          await playerModel.updatePlayerExtendedStats(event.player.id, { shots: 1 });
          break;
        case 'hit':
          gameStats.home.hits++;
          await playerModel.updatePlayerExtendedStats(event.player.id, { hits: 1 });
          break;
        case 'blocked_shot':
          gameStats.home.blockedShots++;
          await playerModel.updatePlayerExtendedStats(event.player.id, { blocks: 1 });
          break;
        case 'penalty':
          gameStats.home.penaltyMinutes += event.minutes;
          await playerModel.updatePlayerExtendedStats(event.player.id, { penalty_minutes: event.minutes });
          break;
      }
      
      // Record the event in the database
      await gameModel.recordGameEvent(
        gameResult.lastID,
        event.type,
        event.player.id,
        period,
        event.time,
        event.description
      );
    }
    
    // Away team events
    for (let i = 0; i < awayEventsCount; i++) {
      const event = generateHockeyEvent(period, homePlayers, awayPlayers, false);
      allEvents.push(event);
      
      // Update stats based on event type
      switch (event.type) {
        case 'shot':
          gameStats.away.shots++;
          await playerModel.updatePlayerExtendedStats(event.player.id, { shots: 1 });
          break;
        case 'hit':
          gameStats.away.hits++;
          await playerModel.updatePlayerExtendedStats(event.player.id, { hits: 1 });
          break;
        case 'blocked_shot':
          gameStats.away.blockedShots++;
          await playerModel.updatePlayerExtendedStats(event.player.id, { blocks: 1 });
          break;
        case 'penalty':
          gameStats.away.penaltyMinutes += event.minutes;
          await playerModel.updatePlayerExtendedStats(event.player.id, { penalty_minutes: event.minutes });
          break;
      }
      
      // Record the event in the database
      await gameModel.recordGameEvent(
        gameResult.lastID,
        event.type,
        event.player.id,
        period,
        event.time,
        event.description
      );
    }
  }
  
  // Generate goal events for home team
  const homeSkaters = homePlayers.filter(p => p.position !== 'goalie');
  const scoreEvents = [];
  
  for (let i = 0; i < homeScore; i++) {
    const scorer = selectGoalScorer(homeSkaters);
    const assist = Math.random() > 0.3 ? selectAssist(homeSkaters, scorer.id) : null;
    
    // Update stats for scorer
    await playerModel.updatePlayerStats(scorer.id, 1, 0);
    await playerModel.updatePlayerExtendedStats(scorer.id, { shots: 1, plus_minus: 1 });
    
    // Update stats for assist if there is one
    if (assist) {
      await playerModel.updatePlayerStats(assist.id, 0, 1);
      await playerModel.updatePlayerExtendedStats(assist.id, { plus_minus: 1 });
    }
    
    // Record the goal event
    const period = Math.min(3, Math.floor(i / 2) + 1); // Distribute goals across periods
    const minute = Math.floor(Math.random() * 20) + 1;
    const second = Math.floor(Math.random() * 60);
    const timeString = `${period}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    
    scoreEvents.push({
      team: homeTeam.name,
      scorer: scorer.name,
      assist: assist ? assist.name : null,
      time: timeString
    });
    
    // Add to all events
    allEvents.push({
      type: 'goal',
      player: scorer,
      assist: assist,
      period: period,
      time: `${minute}:${second.toString().padStart(2, '0')}`,
      isHomeTeam: true,
      description: assist ? 
        `Goal by ${scorer.name}, assisted by ${assist.name}` : 
        `Unassisted goal by ${scorer.name}`
    });
    
    await gameModel.recordGameEvent(
      gameResult.lastID, 
      'goal', 
      scorer.id, 
      period, 
      `${minute}:${second}`, 
      assist ? `Goal by ${scorer.name}, assisted by ${assist.name}` : `Unassisted goal by ${scorer.name}`
    );
    
    // Update opposing goalie stats
    const awayGoalie = awayPlayers.find(p => p.position === 'goalie');
    if (awayGoalie) {
      await playerModel.updatePlayerExtendedStats(awayGoalie.id, { 
        goals_against: 1,
        plus_minus: -1
      });
    }
  }
  
  // Generate goal events for away team
  const awaySkaters = awayPlayers.filter(p => p.position !== 'goalie');
  
  for (let i = 0; i < awayScore; i++) {
    const scorer = selectGoalScorer(awaySkaters);
    const assist = Math.random() > 0.3 ? selectAssist(awaySkaters, scorer.id) : null;
    
    // Update stats for scorer
    await playerModel.updatePlayerStats(scorer.id, 1, 0);
    await playerModel.updatePlayerExtendedStats(scorer.id, { shots: 1, plus_minus: 1 });
    
    // Update stats for assist if there is one
    if (assist) {
      await playerModel.updatePlayerStats(assist.id, 0, 1);
      await playerModel.updatePlayerExtendedStats(assist.id, { plus_minus: 1 });
    }
    
    // Record the goal event
    const period = Math.min(3, Math.floor(i / 2) + 1); // Distribute goals across periods
    const minute = Math.floor(Math.random() * 20) + 1;
    const second = Math.floor(Math.random() * 60);
    const timeString = `${period}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    
    scoreEvents.push({
      team: awayTeam.name,
      scorer: scorer.name,
      assist: assist ? assist.name : null,
      time: timeString
    });
    
    // Add to all events
    allEvents.push({
      type: 'goal',
      player: scorer,
      assist: assist,
      period: period,
      time: `${minute}:${second.toString().padStart(2, '0')}`,
      isHomeTeam: false,
      description: assist ? 
        `Goal by ${scorer.name}, assisted by ${assist.name}` : 
        `Unassisted goal by ${scorer.name}`
    });
    
    await gameModel.recordGameEvent(
      gameResult.lastID, 
      'goal', 
      scorer.id, 
      period, 
      `${minute}:${second}`, 
      assist ? `Goal by ${scorer.name}, assisted by ${assist.name}` : `Unassisted goal by ${scorer.name}`
    );
    
    // Update opposing goalie stats
    const homeGoalie = homePlayers.find(p => p.position === 'goalie');
    if (homeGoalie) {
      await playerModel.updatePlayerExtendedStats(homeGoalie.id, { 
        goals_against: 1,
        plus_minus: -1
      });
    }
  }
  
  // Update player games played
  for (const player of [...homePlayers, ...awayPlayers]) {
    await playerModel.updatePlayerStats(player.id, 0, 0); // Just increment games played
  }
  
  // Calculate goalie save percentages and update shutout stat
  const homeGoalie = homePlayers.find(p => p.position === 'goalie');
  const awayGoalie = awayPlayers.find(p => p.position === 'goalie');
  
  if (homeGoalie) {
    // Calculate saves (shots against minus goals against)
    const savesCount = gameStats.away.shots - awayScore;
    await playerModel.updatePlayerExtendedStats(homeGoalie.id, { saves: savesCount });
    
    // If shutout
    if (awayScore === 0) {
      await playerModel.updatePlayerExtendedStats(homeGoalie.id, { shutouts: 1 });
    }
  }
  
  if (awayGoalie) {
    // Calculate saves (shots against minus goals against)
    const savesCount = gameStats.home.shots - homeScore;
    await playerModel.updatePlayerExtendedStats(awayGoalie.id, { saves: savesCount });
    
    // If shutout
    if (homeScore === 0) {
      await playerModel.updatePlayerExtendedStats(awayGoalie.id, { shutouts: 1 });
    }
  }
  
  // Sort score events by time
  scoreEvents.sort((a, b) => {
    const [aPeriod, aMin, aSec] = a.time.split(':').map(Number);
    const [bPeriod, bMin, bSec] = b.time.split(':').map(Number);
    
    if (aPeriod !== bPeriod) return aPeriod - bPeriod;
    if (aMin !== bMin) return aMin - bMin;
    return aSec - bSec;
  });
  
  // Update team records for display
  const updatedHomeTeam = await teamModel.getTeamById(homeTeam.id);
  const updatedAwayTeam = await teamModel.getTeamById(awayTeam.id);
  
  // Create embed for game result
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Game Result: ${homeTeam.city} ${homeTeam.name} vs ${awayTeam.city} ${awayTeam.name}`)
    .setDescription(`Final Score: ${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}`)
    .addFields(
      { name: 'Team Strengths', value: 
        `${homeTeam.name}: Overall ${homeStrength.overall.toFixed(1)}, Offense ${homeStrength.offense.toFixed(1)}, Defense ${homeStrength.defense.toFixed(1)}\n` +
        `${awayTeam.name}: Overall ${awayStrength.overall.toFixed(1)}, Offense ${awayStrength.offense.toFixed(1)}, Defense ${awayStrength.defense.toFixed(1)}`
      },
      { name: 'Team Records', value: 
        `${homeTeam.name}: ${updatedHomeTeam.wins}-${updatedHomeTeam.losses}-${updatedHomeTeam.ties}\n` +
        `${awayTeam.name}: ${updatedAwayTeam.wins}-${updatedAwayTeam.losses}-${updatedAwayTeam.ties}`
      },
      { name: 'Game Stats', value:
        `**Shots**: ${homeTeam.name} ${gameStats.home.shots}, ${awayTeam.name} ${gameStats.away.shots}\n` +
        `**Hits**: ${homeTeam.name} ${gameStats.home.hits}, ${awayTeam.name} ${gameStats.away.hits}\n` +
        `**Blocked Shots**: ${homeTeam.name} ${gameStats.home.blockedShots}, ${awayTeam.name} ${gameStats.away.blockedShots}\n` +
        `**PIM**: ${homeTeam.name} ${gameStats.home.penaltyMinutes}, ${awayTeam.name} ${gameStats.away.penaltyMinutes}`
      }
    )
    .setTimestamp();
  
  // Add scoring summary if there are goals
  if (scoreEvents.length > 0) {
    let scoringSummary = '';
    for (const event of scoreEvents) {
      scoringSummary += `${event.time} - ${event.team}: ${event.scorer}` + 
        (event.assist ? ` (Assist: ${event.assist})` : ' (Unassisted)') + '\n';
    }
    embed.addFields({ name: 'Scoring Summary', value: scoringSummary });
  }
  
  await interaction.editReply({ embeds: [embed] });
}

// Add this function to your simulateGame.js file
function generateHockeyEvent(period, homePlayers, awayPlayers, isHomeTeam) {
  // Get the relevant team's players
  const teamPlayers = isHomeTeam ? homePlayers : awayPlayers;
  const opposingPlayers = isHomeTeam ? awayPlayers : homePlayers;
  
  // Get skaters (non-goalies)
  const skaters = teamPlayers.filter(p => p.position !== 'goalie');
  
  // Different types of events with their probabilities
  const eventTypes = [
    { type: 'shot', probability: 0.6 },
    { type: 'hit', probability: 0.2 },
    { type: 'blocked_shot', probability: 0.1 },
    { type: 'penalty', probability: 0.1 }
  ];
  
  // Randomly select an event type based on probability
  const random = Math.random();
  let cumulativeProbability = 0;
  let selectedEvent;
  
  for (const event of eventTypes) {
    cumulativeProbability += event.probability;
    if (random <= cumulativeProbability) {
      selectedEvent = event.type;
      break;
    }
  }
  
  // Format timestamp for the event
  const minute = Math.floor(Math.random() * 20) + 1;
  const second = Math.floor(Math.random() * 60);
  const timeString = `${minute}:${second.toString().padStart(2, '0')}`;
  
  // Generate the event details
  let eventDetails = {
    type: selectedEvent,
    period: period,
    time: timeString,
    isHomeTeam: isHomeTeam
  };
  
  // Fill in player details based on event type
  switch (selectedEvent) {
    case 'shot':
      // Select player with preference for high shooting skill
      const shooter = selectPlayerBySkill(skaters, 'shooting');
      const opposingGoalie = opposingPlayers.find(p => p.position === 'goalie');
      
      eventDetails.player = shooter;
      eventDetails.description = `Shot by ${shooter.name}${opposingGoalie ? ` saved by ${opposingGoalie.name}` : ''}`;
      break;
      
    case 'hit':
      // Select player with preference for high physical skill
      const hitter = selectPlayerBySkill(skaters, 'physical');
      const hitTarget = selectRandomPlayer(opposingPlayers.filter(p => p.position !== 'goalie'));
      
      eventDetails.player = hitter;
      eventDetails.targetPlayer = hitTarget;
      eventDetails.description = `${hitter.name} hits ${hitTarget.name} along the boards`;
      break;
      
    case 'blocked_shot':
    // Defender blocks a shot
    const defender = selectPlayerBySkill(skaters, 'defense');
    const shotTaker = selectRandomPlayer(opposingPlayers.filter(p => p.position !== 'goalie'));
    
    eventDetails.player = defender;
    eventDetails.targetPlayer = shotTaker;
    eventDetails.description = `${defender.name} blocks a shot from ${shotTaker.name}`;
    break;
      
    case 'penalty':
      // Penalty - preference for high physical skill players
      const penaltyPlayer = selectPlayerBySkill(skaters, 'physical');
      const penalties = ['Tripping', 'Holding', 'Interference', 'Slashing', 'High-sticking', 'Hooking'];
      const penaltyType = penalties[Math.floor(Math.random() * penalties.length)];
      const minutes = Math.random() < 0.9 ? 2 : 4; // 90% are 2 minutes, 10% are 4 minutes
      
      eventDetails.player = penaltyPlayer;
      eventDetails.penaltyType = penaltyType;
      eventDetails.minutes = minutes;
      eventDetails.description = `${minutes} minute ${penaltyType} penalty to ${penaltyPlayer.name}`;
      break;
  }
  
  return eventDetails;
}

// Helper function to select a player weighted by a specific skill
function selectPlayerBySkill(players, skillType) {
  if (!players || players.length === 0) return null;
  
  // Add skill-based weighting
  const totalWeight = players.reduce((sum, player) => {
    let weight;
    switch (skillType) {
      case 'shooting':
        weight = player.skills?.shooting || 50;
        break;
      case 'passing':
        weight = player.skills?.passing || 50;
        break;
      case 'defense':
        weight = player.skills?.defense || 50;
        break;
      case 'physical':
        weight = player.skills?.physical || 50;
        break;
      default:
        weight = 50;
    }
    return sum + weight;
  }, 0);
  
  // Select a random player based on weighted skills
  let random = Math.random() * totalWeight;
  for (const player of players) {
    let weight;
    switch (skillType) {
      case 'shooting':
        weight = player.skills?.shooting || 50;
        break;
      case 'passing':
        weight = player.skills?.passing || 50;
        break;
      case 'defense':
        weight = player.skills?.defense || 50;
        break;
      case 'physical':
        weight = player.skills?.physical || 50;
        break;
      default:
        weight = 50;
    }
    
    if (random <= weight) {
      return player;
    }
    random -= weight;
  }
  
  // Fallback to random selection
  return players[Math.floor(Math.random() * players.length)];
}

// Helper function to select a random player
function selectRandomPlayer(players) {
  if (!players || players.length === 0) return null;
  return players[Math.floor(Math.random() * players.length)];
}

module.exports = simulateGame;