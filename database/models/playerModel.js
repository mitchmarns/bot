// Player-related database operations
const { getDb } = require('../db');

// Get player by name
async function getPlayerByName(name, guildId) {
  const db = getDb(guildId);
  return await db.get(`
    SELECT p.*, t.name as team_name 
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.name = ? COLLATE NOCASE
  `, [name]);
}

// Get player by ID
async function getPlayerById(id, guildId) {
  const db = getDb(guildId);
  return await db.get('SELECT * FROM players WHERE id = ?', [id]);
}

// Get players by team ID
async function getPlayersByTeamId(teamId, guildId) {
  const db = getDb(guildId);
  return await db.all('SELECT * FROM players WHERE team_id = ?', [teamId]);
}

// Create a player
async function createPlayer(name, position, number, teamId, userId, imageUrl = null, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO players (name, position, number, team_id, user_id, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name, position, number, teamId, userId, imageUrl]
  );
}

// Update player image
async function updatePlayerImage(playerId, imageUrl, guildId) {
  const db = getDb(guildId);
  return await db.run('UPDATE players SET image_url = ? WHERE id = ?', [imageUrl, playerId]);
}

// Update player stats
async function updatePlayerStats(playerId, goals = 0, assists = 0, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'UPDATE players SET goals = goals + ?, assists = assists + ?, games_played = games_played + 1 WHERE id = ?',
    [goals, assists, playerId]
  );
}

async function extendPlayerSchema(guildId) {
  const db = getDb(guildId);
  
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
      console.log(`Added ${stat.name} column to players table for guild ${guildId}`);
    }
  }
  
  console.log(`Player schema extended with hockey stats for guild ${guildId}`);
}

// Add to playerModel.js - Enhanced player stats update function
async function updatePlayerExtendedStats(playerId, stats, guildId) {
  const db = getDb(guildId);
  
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
async function getPlayerStatsLeaders(statType = 'points', limit = 10, guildId) {
  const db = getDb(guildId);
  
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
async function getPlayerStatsByTeam(teamName, statType = 'points', limit = 10, guildId) {
  const db = getDb(guildId);
  
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

// Delete a player and all related data
async function deletePlayer(playerId, guildId) {
  const db = getDb(guildId);
  
  // Use a transaction to ensure all related data is deleted or none at all
  await db.run('BEGIN TRANSACTION');
  
  try {
    // Delete player's skills
    await db.run('DELETE FROM player_skills WHERE player_id = ?', [playerId]);
    
    // Delete player's phone and messages
    const phone = await db.get('SELECT id FROM player_phones WHERE player_id = ?', [playerId]);
    if (phone) {
      await db.run('DELETE FROM phone_messages WHERE from_phone_id = ? OR to_phone_id = ?', [phone.id, phone.id]);
      await db.run('DELETE FROM player_phones WHERE id = ?', [phone.id]);
    }
    
    // Delete player's triggers
    await db.run('DELETE FROM player_triggers WHERE player_id = ?', [playerId]);
    
    // Delete player's game events
    await db.run('DELETE FROM game_events WHERE player_id = ?', [playerId]);
    
    // Finally delete the player
    await db.run('DELETE FROM players WHERE id = ?', [playerId]);
    
    // Commit the transaction
    await db.run('COMMIT');
    
    return true;
  } catch (error) {
    // If anything goes wrong, rollback all changes
    await db.run('ROLLBACK');
    console.error('Error deleting player:', error);
    throw error;
  }
}

async function updatePlayerTeam(playerId, newTeamId, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'UPDATE players SET team_id = ? WHERE id = ?',
    [newTeamId, playerId]
  );
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
  getPlayerStatsByTeam,
  deletePlayer,
  updatePlayerTeam
};