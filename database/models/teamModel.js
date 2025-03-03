// Team-related database operations
const { getDb } = require('../db');

// Get a team by name
async function getTeamByName(name, guildId) {
  try {
    const db = getDb(guildId);
    return await db.get('SELECT * FROM teams WHERE name = ? COLLATE NOCASE', [name]);
  } catch (error) {
    console.error('Error in getTeamByName:', error);
    throw error;
  }
}

// Get all teams
async function getAllTeams(guildId) {
  try {
    const db = getDb(guildId);
    return await db.all('SELECT * FROM teams');
  } catch (error) {
    console.error('Error in getAllTeams:', error);
    throw error;
  }
}

// Get teams sorted by points
async function getTeamStandings(guildId) {
  try {
    const db = getDb(guildId);
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
async function createTeam(name, city, logo, guildId) {
  try {
    const db = getDb(guildId);
    
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
async function updateTeamRecord(teamId, result, guildId) {
  try {
    const db = getDb(guildId);
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
async function getTeamById(id, guildId) {
  try {
    const db = getDb(guildId);
    return await db.get('SELECT * FROM teams WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error in getTeamById:', error);
    throw error;
  }
}

// Add to teamModel.js - Team statistics
async function extendTeamSchema(guildId) {
  const db = getDb(guildId);
  
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
      console.log(`Added ${stat.name} column to teams table for guild ${guildId}`);
    }
  }
  
  console.log(`Team schema extended with hockey stats for guild ${guildId}`);
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