// Team-related database operations
const path = require('path');
const fs = require('fs');

// Helper function to find db.js file
function findDbModule() {
  // Try different possible locations
  const possiblePaths = [
    '../db.js',                    // If teamModel.js is in models/ and db.js is in database/
    '../../database/db.js',        // If teamModel.js is in database/models/ and db.js is in database/
    '../database/db.js',           // If teamModel.js is in models/ and db.js is in database/
    './db.js',                     // If teamModel.js and db.js are in the same directory
    path.resolve(__dirname, '../db.js')  // Absolute path using __dirname
  ];
  
  // Log current directory for debugging
  console.log('Current directory for teamModel.js:', __dirname);
  
  for (const dbPath of possiblePaths) {
    try {
      // Check if file exists before requiring
      if (fs.existsSync(require.resolve(dbPath))) {
        console.log('Found db.js at:', dbPath);
        return require(dbPath);
      }
    } catch (error) {
      // Continue to next possible path
    }
  }
  
  // If none of the paths worked, throw an error
  throw new Error('Could not find db.js module. Please check your folder structure.');
}

// Get database access
const { getDb } = findDbModule();

// Create a scheduled game
async function scheduleGame(homeTeamId, awayTeamId, date, time) {
  const db = getDb();
  return await db.run(
    'INSERT INTO games (home_team_id, away_team_id, scheduled_date, scheduled_time, is_played) VALUES (?, ?, ?, ?, 0)',
    [homeTeamId, awayTeamId, date, time]
  );
}

// Record a played game
async function recordGameResult(homeTeamId, awayTeamId, homeScore, awayScore) {
  const db = getDb();
  return await db.run(
    'INSERT INTO games (home_team_id, away_team_id, home_score, away_score, is_played, played_at) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)',
    [homeTeamId, awayTeamId, homeScore, awayScore]
  );
}

// Get upcoming games
async function getUpcomingGames() {
  const db = getDb();
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
async function getRecentGames(limit = 5) {
  const db = getDb();
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
async function recordGameEvent(gameId, eventType, playerId, period, time, description) {
  const db = getDb();
  return await db.run(
    'INSERT INTO game_events (game_id, event_type, player_id, period, time, description) VALUES (?, ?, ?, ?, ?, ?)',
    [gameId, eventType, playerId, period, time, description]
  );
}

// Get events for a specific game
async function getGameEvents(gameId) {
  const db = getDb();
  return await db.all(`
    SELECT e.*, p.name as player_name
    FROM game_events e
    LEFT JOIN players p ON e.player_id = p.id
    WHERE e.game_id = ?
    ORDER BY e.period, e.time
  `, [gameId]);
}

async function extendGameEventsSchema() {
  const db = getDb();
  
  // Add additional event types for hockey-specific events
  // These are tracked in the existing game_events table
  
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
  
  console.log('Game events schema extended for hockey events');
}

module.exports = {
  scheduleGame,
  recordGameResult,
  getUpcomingGames,
  getRecentGames,
  recordGameEvent,
  getGameEvents,
  extendGameEventsSchema
};