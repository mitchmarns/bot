// skillsModel.js - Updated for multi-server support
const { getDb } = require('../db');

// Get skills for a player
async function getPlayerSkills(playerId, guildId) {
  const db = getDb(guildId);
  const skills = await db.get('SELECT * FROM player_skills WHERE player_id = ?', [playerId]);
  
  // Return default skills if none found
  if (!skills) {
    return {
      player_id: playerId,
      skating: 50,
      shooting: 50,
      passing: 50,
      defense: 50,
      physical: 50,
      goaltending: 50
    };
  }
  
  return skills;
}

// Set skills for a player
async function setPlayerSkills(playerId, skillsData, guildId) {
  const db = getDb(guildId);
  
  // Check if player already has skills
  const existingSkills = await db.get('SELECT id FROM player_skills WHERE player_id = ?', [playerId]);
  
  if (existingSkills) {
    // Update existing skills
    return await db.run(
      `UPDATE player_skills SET 
        skating = ?, 
        shooting = ?, 
        passing = ?, 
        defense = ?, 
        physical = ?, 
        goaltending = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE player_id = ?`,
      [
        skillsData.skating,
        skillsData.shooting,
        skillsData.passing,
        skillsData.defense,
        skillsData.physical,
        skillsData.goaltending,
        playerId
      ]
    );
  } else {
    // Insert new skills
    return await db.run(
      `INSERT INTO player_skills 
        (player_id, skating, shooting, passing, defense, physical, goaltending) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        playerId,
        skillsData.skating,
        skillsData.shooting,
        skillsData.passing,
        skillsData.defense,
        skillsData.physical,
        skillsData.goaltending
      ]
    );
  }
}

module.exports = {
  getPlayerSkills,
  setPlayerSkills
};