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

// Get player by name
async function getPlayerByName(name) {
  const db = getDb();
  return await db.get(`
    SELECT p.*, t.name as team_name 
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.name = ? COLLATE NOCASE
  `, [name]);
}

// Get player by ID
async function getPlayerById(id) {
  const db = getDb();
  return await db.get('SELECT * FROM players WHERE id = ?', [id]);
}

// Get players by team ID
async function getPlayersByTeamId(teamId) {
  const db = getDb();
  return await db.all('SELECT * FROM players WHERE team_id = ?', [teamId]);
}

// Create a player
async function createPlayer(name, position, number, teamId, userId, imageUrl = null) {
  const db = getDb();
  return await db.run(
    'INSERT INTO players (name, position, number, team_id, user_id, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name, position, number, teamId, userId, imageUrl]
  );
}

// Update player image
async function updatePlayerImage(playerId, imageUrl) {
  const db = getDb();
  return await db.run('UPDATE players SET image_url = ? WHERE id = ?', [imageUrl, playerId]);
}

// Update player stats
async function updatePlayerStats(playerId, goals = 0, assists = 0) {
  const db = getDb();
  return await db.run(
    'UPDATE players SET goals = goals + ?, assists = assists + ?, games_played = games_played + 1 WHERE id = ?',
    [goals, assists, playerId]
  );
}

async function extendPlayerSchema() {
  const db = getDb();
  
  // Check if the new columns already exist
  const columns = await db.all('PRAGMA table_info(players)');
  const columnNames = columns.map(c => c.name);
  
  // New hockey stats to track
  const newStats = [
    { name: 'plus_minus', type: 'INTEGER DEFAULT 0' },
    { name: 'penalty_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'shots', type: 'INTEGER DEFAULT 0' },
    { name: 'blocks', type: 'INTEGER DEFAULT 0' },
    { name: 'hits', type: 'INTEGER DEFAULT 0' },
    { name: 'faceoff_wins', type: 'INTEGER DEFAULT 0' },
    { name: 'faceoff_losses', type: 'INTEGER DEFAULT 0' },
    { name: 'time_on_ice_seconds', type: 'INTEGER DEFAULT 0' }
  ];
  
  // For goalies
  const goalieStats = [
    { name: 'saves', type: 'INTEGER DEFAULT 0' },
    { name: 'goals_against', type: 'INTEGER DEFAULT 0' },
    { name: 'shutouts', type: 'INTEGER DEFAULT 0' }
  ];
  
  // Add each column if it doesn't exist
  for (const stat of [...newStats, ...goalieStats]) {
    if (!columnNames.includes(stat.name)) {
      await db.run(`ALTER TABLE players ADD COLUMN ${stat.name} ${stat.type}`);
      console.log(`Added ${stat.name} column to players table`);
    }
  }
  
  console.log('Player schema extended with hockey stats');
}

// Add to playerModel.js - Enhanced player stats update function
async function updatePlayerExtendedStats(playerId, stats) {
  const db = getDb();
  
  // Build the SQL dynamically based on provided stats
  let updateFields = [];
  let values = [];
  
  for (const [key, value] of Object.entries(stats)) {
    if (value !== undefined && value !== null) {
      updateFields.push(`${key} = ${key} + ?`);
      values.push(value);
    }
  }
  
  if (updateFields.length === 0) return null;
  
  // Add the player ID to values
  values.push(playerId);
  
  return await db.run(
    `UPDATE players SET ${updateFields.join(', ')} WHERE id = ?`,
    values
  );
}

// Get player statistics leaders across the league
async function getPlayerStatsLeaders(statType = 'points', limit = 10) {
  const db = getDb();
  
  let orderBy;
  switch (statType) {
    case 'goals':
      orderBy = 'p.goals DESC, p.assists DESC';
      break;
    case 'assists':
      orderBy = 'p.assists DESC, p.goals DESC';
      break;
    case 'games':
      orderBy = 'p.games_played DESC';
      break;
    case 'ppg': // Points per game
      orderBy = '(p.goals + p.assists) / CASE WHEN p.games_played > 0 THEN p.games_played ELSE 1 END DESC';
      break;
    case 'points':
    default:
      orderBy = '(p.goals + p.assists) DESC, p.goals DESC';
      break;
  }
  
  return await db.all(`
    SELECT p.*, t.name as team_name
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.games_played > 0
    ORDER BY ${orderBy}
    LIMIT ?
  `, [limit]);
}

// Get player statistics for a specific team
async function getPlayerStatsByTeam(teamName, statType = 'points', limit = 10) {
  const db = getDb();
  
  let orderBy;
  switch (statType) {
    case 'goals':
      orderBy = 'p.goals DESC, p.assists DESC';
      break;
    case 'assists':
      orderBy = 'p.assists DESC, p.goals DESC';
      break;
    case 'games':
      orderBy = 'p.games_played DESC';
      break;
    case 'ppg': // Points per game
      orderBy = '(p.goals + p.assists) / CASE WHEN p.games_played > 0 THEN p.games_played ELSE 1 END DESC';
      break;
    case 'points':
    default:
      orderBy = '(p.goals + p.assists) DESC, p.goals DESC';
      break;
  }
  
  return await db.all(`
    SELECT p.*, t.name as team_name
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.name = ? COLLATE NOCASE AND p.games_played > 0
    ORDER BY ${orderBy}
    LIMIT ?
  `, [teamName, limit]);
}

module.exports = {
  getPlayerByName,
  getPlayerById,
  getPlayersByTeamId,
  createPlayer,
  updatePlayerImage,
  updatePlayerStats,
  extendPlayerSchema,
  updatePlayerExtendedStats,
  getPlayerStatsLeaders,
  getPlayerStatsByTeam
};