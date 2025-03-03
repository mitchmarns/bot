// Game-related database operations - Updated for multi-server support
const { getDb } = require('../db');

// Create a scheduled game
async function scheduleGame(homeTeamId, awayTeamId, date, time, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO games (home_team_id, away_team_id, scheduled_date, scheduled_time, is_played) VALUES (?, ?, ?, ?, 0)',
    [homeTeamId, awayTeamId, date, time]
  );
}

// Record a played game
async function recordGameResult(homeTeamId, awayTeamId, homeScore, awayScore, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO games (home_team_id, away_team_id, home_score, away_score, is_played, played_at) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)',
    [homeTeamId, awayTeamId, homeScore, awayScore]
  );
}

// Get upcoming games
async function getUpcomingGames(guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT g.*, 
      home.name as home_team_name, home.city as home_team_city,
      away.name as away_team_name, away.city as away_team_city
    FROM games g
    JOIN teams home ON g.home_team_id = home.id
    JOIN teams away ON g.away_team_id = away.id
    WHERE g.is_played = 0
    ORDER BY g.scheduled_date, g.scheduled_time
  `);
}

// Get recent game results
async function getRecentGames(limit = 5, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT g.*, 
      home.name as home_team_name, home.city as home_team_city,
      away.name as away_team_name, away.city as away_team_city
    FROM games g
    JOIN teams home ON g.home_team_id = home.id
    JOIN teams away ON g.away_team_id = away.id
    WHERE g.is_played = 1
    ORDER BY g.played_at DESC
    LIMIT ?
  `, [limit]);
}

// Record a game event (goal, penalty, etc.)
async function recordGameEvent(gameId, eventType, playerId, period, time, description, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO game_events (game_id, event_type, player_id, period, time, description) VALUES (?, ?, ?, ?, ?, ?)',
    [gameId, eventType, playerId, period, time, description]
  );
}

// Get events for a specific game
async function getGameEvents(gameId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT e.*, p.name as player_name
    FROM game_events e
    LEFT JOIN players p ON e.player_id = p.id
    WHERE e.game_id = ?
    ORDER BY e.period, e.time
  `, [gameId]);
}

async function extendGameEventsSchema(guildId) {
  const db = getDb(guildId);
  
  // Also create a table for tracking game stats
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      shots INTEGER DEFAULT 0,
      hits INTEGER DEFAULT 0,
      blocks INTEGER DEFAULT 0,
      faceoff_wins INTEGER DEFAULT 0,
      penalty_minutes INTEGER DEFAULT 0,
      power_plays INTEGER DEFAULT 0,
      power_play_goals INTEGER DEFAULT 0,
      shots_period1 INTEGER DEFAULT 0,
      shots_period2 INTEGER DEFAULT 0,
      shots_period3 INTEGER DEFAULT 0,
      shots_ot INTEGER DEFAULT 0,
      pim_period1 INTEGER DEFAULT 0,
      pim_period2 INTEGER DEFAULT 0,
      pim_period3 INTEGER DEFAULT 0,
      pim_ot INTEGER DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games (id),
      FOREIGN KEY (team_id) REFERENCES teams (id)
    )
  `);
  
  console.log(`Game events schema extended for hockey events for guild ${guildId}`);
}

// Get game history for the entire league
async function getGameHistory(limit = 10, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT g.*, 
      home.name as home_team_name, home.city as home_team_city,
      away.name as away_team_name, away.city as away_team_city
    FROM games g
    JOIN teams home ON g.home_team_id = home.id
    JOIN teams away ON g.away_team_id = away.id
    WHERE g.is_played = 1
    ORDER BY g.played_at DESC
    LIMIT ?
  `, [limit]);
}

// Get game history for a specific team
async function getTeamGameHistory(teamId, limit = 10, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT g.*, 
      home.name as home_team_name, home.city as home_team_city,
      away.name as away_team_name, away.city as away_team_city
    FROM games g
    JOIN teams home ON g.home_team_id = home.id
    JOIN teams away ON g.away_team_id = away.id
    WHERE g.is_played = 1 AND (g.home_team_id = ? OR g.away_team_id = ?)
    ORDER BY g.played_at DESC
    LIMIT ?
  `, [teamId, teamId, limit]);
}

// Get detailed game information including events
async function getGameDetails(gameId, guildId) {
  const db = getDb(guildId);
  
  // Get the base game information
  const game = await db.get(`
    SELECT g.*, 
      home.name as home_team_name, home.city as home_team_city,
      away.name as away_team_name, away.city as away_team_city
    FROM games g
    JOIN teams home ON g.home_team_id = home.id
    JOIN teams away ON g.away_team_id = away.id
    WHERE g.id = ?
  `, [gameId]);
  
  if (!game) return null;
  
  // Get all events for this game
  const events = await getGameEvents(gameId, guildId);
  
  // Add events to the game object
  game.events = events;
  
  return game;
}

async function getTeamMatchupHistory(team1Id, team2Id, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT g.*, 
      home.name as home_team_name, home.city as home_team_city,
      away.name as away_team_name, away.city as away_team_city
    FROM games g
    JOIN teams home ON g.home_team_id = home.id
    JOIN teams away ON g.away_team_id = away.id
    WHERE g.is_played = 1 
      AND ((g.home_team_id = ? AND g.away_team_id = ?) 
        OR (g.home_team_id = ? AND g.away_team_id = ?))
    ORDER BY g.played_at DESC
  `, [team1Id, team2Id, team2Id, team1Id]);
}

// Schedule a game with season context
async function scheduleGameWithSeason(homeTeamId, awayTeamId, date, time, seasonId, isPlayoffGame = false, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO games (home_team_id, away_team_id, scheduled_date, scheduled_time, is_played, season_id, is_playoff_game) VALUES (?, ?, ?, ?, 0, ?, ?)',
    [homeTeamId, awayTeamId, date, time, seasonId, isPlayoffGame ? 1 : 0]
  );
}

// Record a game result with season context
async function recordGameResultWithSeason(homeTeamId, awayTeamId, homeScore, awayScore, seasonId, isPlayoffGame = false, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO games (home_team_id, away_team_id, home_score, away_score, is_played, played_at, season_id, is_playoff_game) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, ?)',
    [homeTeamId, awayTeamId, homeScore, awayScore, seasonId, isPlayoffGame ? 1 : 0]
  );
}

// Extend games schema for seasons
async function extendGamesSchema(guildId) {
  const db = getDb(guildId);
  
  // Check if the columns already exist
  const columns = await db.all('PRAGMA table_info(games)');
  const columnNames = columns.map(c => c.name);
  
  // Add season_id if it doesn't exist
  if (!columnNames.includes('season_id')) {
    await db.run('ALTER TABLE games ADD COLUMN season_id INTEGER REFERENCES seasons(id)');
    console.log(`Added season_id column to games table for guild ${guildId}`);
  }
  
  // Add is_playoff_game if it doesn't exist
  if (!columnNames.includes('is_playoff_game')) {
    await db.run('ALTER TABLE games ADD COLUMN is_playoff_game BOOLEAN DEFAULT 0');
    console.log(`Added is_playoff_game column to games table for guild ${guildId}`);
  }
}

// Get games for a specific season
async function getSeasonGames(seasonId, isPlayoffOnly = false, guildId) {
  const db = getDb(guildId);
  let query = `
    SELECT g.*, 
      home.name as home_team_name, home.city as home_team_city,
      away.name as away_team_name, away.city as away_team_city
    FROM games g
    JOIN teams home ON g.home_team_id = home.id
    JOIN teams away ON g.away_team_id = away.id
    WHERE g.season_id = ?
  `;
  
  if (isPlayoffOnly) {
    query += ' AND g.is_playoff_game = 1';
  }
  
  query += ' ORDER BY g.is_played, g.scheduled_date, g.scheduled_time, g.played_at DESC';
  
  return await db.all(query, [seasonId]);
}

module.exports = {
  scheduleGame,
  recordGameResult,
  getUpcomingGames,
  getRecentGames,
  recordGameEvent,
  getGameEvents,
  extendGameEventsSchema,
  getGameHistory,
  getTeamGameHistory,
  getGameDetails, 
  getTeamMatchupHistory,
  scheduleGameWithSeason,
  recordGameResultWithSeason,
  extendGamesSchema,
  getSeasonGames
};