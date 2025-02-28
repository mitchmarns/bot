const { getDb } = require('../db');

// Create a new trigger
async function createTrigger(playerId, triggerText, userId) {
  const db = getDb();
  return await db.run(
    'INSERT INTO player_triggers (player_id, trigger_text, user_id) VALUES (?, ?, ?)',
    [playerId, triggerText, userId]
  );
}

// Get trigger by text
async function getTriggerByText(triggerText) {
  const db = getDb();
  return await db.get(`
    SELECT t.*, p.* 
    FROM player_triggers t
    JOIN players p ON t.player_id = p.id
    WHERE t.trigger_text = ? COLLATE NOCASE
  `, [triggerText]);
}

// Get all triggers for a user
async function getUserTriggers(userId) {
  const db = getDb();
  return await db.all(`
    SELECT t.*, p.name as player_name, p.image_url
    FROM player_triggers t
    JOIN players p ON t.player_id = p.id
    WHERE t.user_id = ?
  `, [userId]);
}

// Delete a trigger
async function deleteTrigger(triggerId, userId) {
  const db = getDb();
  return await db.run(
    'DELETE FROM player_triggers WHERE id = ? AND user_id = ?',
    [triggerId, userId]
  );
}

module.exports = {
  createTrigger,
  getTriggerByText,
  getUserTriggers,
  deleteTrigger
};