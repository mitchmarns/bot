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

module.exports = {
  getPlayerByName,
  getPlayerById,
  getPlayersByTeamId,
  createPlayer,
  updatePlayerImage,
  updatePlayerStats
};