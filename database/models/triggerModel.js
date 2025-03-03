// triggerModel.js - Updated for multi-server support
const { getDb } = require('../db');

// Create a new trigger
async function createTrigger(playerId, triggerText, userId, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO player_triggers (player_id, trigger_text, user_id) VALUES (?, ?, ?)',
    [playerId, triggerText, userId]
  );
}

// Get trigger by text
async function getTriggerByText(triggerText, guildId) {
  const db = getDb(guildId);
  return await db.get(`
    SELECT t.*, p.* 
    FROM player_triggers t
    JOIN players p ON t.player_id = p.id
    WHERE t.trigger_text = ? COLLATE NOCASE
  `, [triggerText]);
}

// Get all triggers for a user
async function getUserTriggers(userId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT t.*, p.name as player_name, p.image_url
    FROM player_triggers t
    JOIN players p ON t.player_id = p.id
    WHERE t.user_id = ?
  `, [userId]);
}

// Delete a trigger
async function deleteTrigger(triggerId, userId, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'DELETE FROM player_triggers WHERE id = ? AND user_id = ?',
    [triggerId, userId]
  );
}

// Get all triggers for a player
async function getPlayerTriggers(playerId, guildId) {
  const db = getDb(guildId);
  return await db.all('SELECT * FROM player_triggers WHERE player_id = ?', [playerId]);
}

// Get all triggers in a guild (needed for message processing)
async function getAllTriggers(guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT t.*, p.id as player_id, p.name, p.number, p.image_url
    FROM player_triggers t
    JOIN players p ON t.player_id = p.id
  `);
}

module.exports = {
  createTrigger,
  getTriggerByText,
  getUserTriggers,
  deleteTrigger,
  getPlayerTriggers,
  getAllTriggers
};