// phoneModel.js - Updated for multi-server support
const { getDb } = require('../db');

// Get phone by player ID
async function getPlayerPhone(playerId, guildId) {
  const db = getDb(guildId);
  return await db.get('SELECT * FROM player_phones WHERE player_id = ?', [playerId]);
}

// Get phone by number
async function getPhoneByNumber(phoneNumber, guildId) {
  const db = getDb(guildId);
  return await db.get('SELECT * FROM player_phones WHERE phone_number = ? COLLATE NOCASE', [phoneNumber]);
}

// Create or update phone
async function assignPhoneToPlayer(playerId, phoneNumber, guildId) {
  const db = getDb(guildId);
  // Check if player already has a phone
  const existingPhone = await getPlayerPhone(playerId, guildId);
  
  if (existingPhone) {
    // Update existing phone number
    return await db.run(
      'UPDATE player_phones SET phone_number = ? WHERE player_id = ?',
      [phoneNumber, playerId]
    );
  } else {
    // Create new phone
    return await db.run(
      'INSERT INTO player_phones (player_id, phone_number) VALUES (?, ?)',
      [playerId, phoneNumber]
    );
  }
}

// Send a message
async function sendMessage(fromPhoneId, toPhoneId, messageText, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO phone_messages (from_phone_id, to_phone_id, message_text) VALUES (?, ?, ?)',
    [fromPhoneId, toPhoneId, messageText]
  );
}

// Get conversation between two phones
async function getConversation(phoneId1, phoneId2, limit = 20, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT * FROM phone_messages 
    WHERE (from_phone_id = ? AND to_phone_id = ?) OR (from_phone_id = ? AND to_phone_id = ?)
    ORDER BY sent_at DESC
    LIMIT ?
  `, [phoneId1, phoneId2, phoneId2, phoneId1, limit]);
}

// Get all message previews for a phone (latest message from each conversation)
async function getMessagePreviews(phoneId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    WITH LatestMessages AS (
      SELECT 
        m.*,
        ROW_NUMBER() OVER (
          PARTITION BY 
            CASE WHEN m.from_phone_id = ? THEN m.to_phone_id ELSE m.from_phone_id END
          ORDER BY m.sent_at DESC
        ) as rn
      FROM phone_messages m
      WHERE m.from_phone_id = ? OR m.to_phone_id = ?
    )
    SELECT 
      m.*,
      CASE WHEN m.from_phone_id = ? THEN m.to_phone_id ELSE m.from_phone_id END as other_phone_id,
      p.phone_number as other_phone_number,
      pl.name as other_player_name
    FROM LatestMessages m
    JOIN player_phones p ON p.id = CASE WHEN m.from_phone_id = ? THEN m.to_phone_id ELSE m.from_phone_id END
    JOIN players pl ON pl.id = p.player_id
    WHERE rn = 1
    ORDER BY m.sent_at DESC
  `, [phoneId, phoneId, phoneId, phoneId, phoneId]);
}

// Mark messages as read
async function markMessagesAsRead(toPhoneId, fromPhoneId, guildId) {
  const db = getDb(guildId);
  return await db.run(`
    UPDATE phone_messages
    SET is_read = 1
    WHERE to_phone_id = ? AND from_phone_id = ? AND is_read = 0
  `, [toPhoneId, fromPhoneId]);
}

module.exports = {
  getPlayerPhone,
  getPhoneByNumber,
  assignPhoneToPlayer,
  sendMessage,
  getConversation,
  getMessagePreviews,
  markMessagesAsRead
};