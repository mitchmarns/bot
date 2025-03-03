// Trade-related database operations - Updated for multi-server support
const { getDb } = require('../db');

// Record a trade in the history
async function recordTrade(playerId, fromTeamId, toTeamId, userId, notes = null, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO trade_history (player_id, from_team_id, to_team_id, user_id, notes) VALUES (?, ?, ?, ?, ?)',
    [playerId, fromTeamId, toTeamId, userId, notes]
  );
}

// Get recent trades
async function getRecentTrades(limit = 10, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT 
      t.*,
      p.name as player_name, 
      p.position,
      p.number,
      ft.name as from_team_name, 
      ft.city as from_team_city,
      tt.name as to_team_name, 
      tt.city as to_team_city
    FROM trade_history t
    JOIN players p ON t.player_id = p.id
    JOIN teams ft ON t.from_team_id = ft.id
    JOIN teams tt ON t.to_team_id = tt.id
    ORDER BY t.trade_date DESC
    LIMIT ?
  `, [limit]);
}

// Get trade history for a specific player
async function getPlayerTradeHistory(playerId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT 
      t.*,
      ft.name as from_team_name, 
      ft.city as from_team_city,
      tt.name as to_team_name, 
      tt.city as to_team_city
    FROM trade_history t
    JOIN teams ft ON t.from_team_id = ft.id
    JOIN teams tt ON t.to_team_id = tt.id
    WHERE t.player_id = ?
    ORDER BY t.trade_date DESC
  `, [playerId]);
}

// Get trade history for a specific team
async function getTeamTradeHistory(teamId, limit = 20, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT 
      t.*,
      p.name as player_name,
      p.position,
      p.number,
      ft.name as from_team_name, 
      ft.city as from_team_city,
      tt.name as to_team_name, 
      tt.city as to_team_city,
      CASE 
        WHEN t.from_team_id = ? THEN 'outgoing' 
        WHEN t.to_team_id = ? THEN 'incoming'
      END as trade_type
    FROM trade_history t
    JOIN players p ON t.player_id = p.id
    JOIN teams ft ON t.from_team_id = ft.id
    JOIN teams tt ON t.to_team_id = tt.id
    WHERE t.from_team_id = ? OR t.to_team_id = ?
    ORDER BY t.trade_date DESC
    LIMIT ?
  `, [teamId, teamId, teamId, teamId, limit]);
}

module.exports = {
  recordTrade,
  getRecentTrades,
  getPlayerTradeHistory,
  getTeamTradeHistory
};