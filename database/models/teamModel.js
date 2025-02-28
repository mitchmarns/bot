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

// Get a team by name
async function getTeamByName(name) {
  try {
    const db = getDb();
    return await db.get('SELECT * FROM teams WHERE name = ? COLLATE NOCASE', [name]);
  } catch (error) {
    console.error('Error in getTeamByName:', error);
    throw error;
  }
}

// Get all teams
async function getAllTeams() {
  try {
    const db = getDb();
    return await db.all('SELECT * FROM teams');
  } catch (error) {
    console.error('Error in getAllTeams:', error);
    throw error;
  }
}

// Get teams sorted by points
async function getTeamStandings() {
  try {
    const db = getDb();
    return await db.all(`
      SELECT *, (wins * 2 + ties) as points 
      FROM teams 
      ORDER BY points DESC, wins DESC
    `);
  } catch (error) {
    console.error('Error in getTeamStandings:', error);
    throw error;
  }
}

// Create a team
async function createTeam(name, city, logo) {
  try {
    const db = getDb();
    
    // Check table schema first
    console.log('Checking teams table schema...');
    const tableInfo = await db.all('PRAGMA table_info(teams)');
    console.log('Teams table columns:', tableInfo.map(col => col.name));
    
    // Check if logo column exists
    const hasLogoColumn = tableInfo.some(col => col.name === 'logo');
    if (!hasLogoColumn) {
      console.error('Logo column does not exist in teams table!');
      
      // Check if colors column exists instead
      const hasColorsColumn = tableInfo.some(col => col.name === 'colors');
      if (hasColorsColumn) {
        console.log('Found colors column instead of logo');
        throw new Error('Database schema needs updating: column "colors" should be renamed to "logo"');
      } else {
        throw new Error('Neither "logo" nor "colors" column found in teams table');
      }
    }
    
    // Insert the team
    console.log(`Inserting team: ${name}, ${city}, ${logo}`);
    return await db.run(
      'INSERT INTO teams (name, city, logo) VALUES (?, ?, ?)',
      [name, city, logo]
    );
  } catch (error) {
    console.error('Error in createTeam:', error);
    throw error;
  }
}

// Update team record after a game
async function updateTeamRecord(teamId, result) {
  try {
    const db = getDb();
    if (result === 'win') {
      return await db.run('UPDATE teams SET wins = wins + 1 WHERE id = ?', [teamId]);
    } else if (result === 'loss') {
      return await db.run('UPDATE teams SET losses = losses + 1 WHERE id = ?', [teamId]);
    } else if (result === 'tie') {
      return await db.run('UPDATE teams SET ties = ties + 1 WHERE id = ?', [teamId]);
    }
  } catch (error) {
    console.error('Error in updateTeamRecord:', error);
    throw error;
  }
}

// Get team by ID
async function getTeamById(id) {
  try {
    const db = getDb();
    return await db.get('SELECT * FROM teams WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error in getTeamById:', error);
    throw error;
  }
}

// Add to teamModel.js - Team statistics
async function extendTeamSchema() {
  const db = getDb();
  
  // Check if the new columns already exist
  const columns = await db.all('PRAGMA table_info(teams)');
  const columnNames = columns.map(c => c.name);
  
  // New team stats to track
  const newStats = [
    { name: 'goals_for', type: 'INTEGER DEFAULT 0' },
    { name: 'goals_against', type: 'INTEGER DEFAULT 0' },
    { name: 'shots_for', type: 'INTEGER DEFAULT 0' },
    { name: 'shots_against', type: 'INTEGER DEFAULT 0' },
    { name: 'power_plays', type: 'INTEGER DEFAULT 0' },
    { name: 'power_play_goals', type: 'INTEGER DEFAULT 0' },
    { name: 'penalties', type: 'INTEGER DEFAULT 0' },
    { name: 'penalty_kill_success', type: 'INTEGER DEFAULT 0' },
    { name: 'penalty_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'home_wins', type: 'INTEGER DEFAULT 0' },
    { name: 'home_losses', type: 'INTEGER DEFAULT 0' },
    { name: 'away_wins', type: 'INTEGER DEFAULT 0' },
    { name: 'away_losses', type: 'INTEGER DEFAULT 0' }
  ];
  
  // Add each column if it doesn't exist
  for (const stat of newStats) {
    if (!columnNames.includes(stat.name)) {
      await db.run(`ALTER TABLE teams ADD COLUMN ${stat.name} ${stat.type}`);
      console.log(`Added ${stat.name} column to teams table`);
    }
  }
  
  console.log('Team schema extended with hockey stats');
}

module.exports = {
  getTeamByName,
  getAllTeams,
  getTeamStandings,
  createTeam,
  updateTeamRecord,
  getTeamById,
  extendTeamSchema
};