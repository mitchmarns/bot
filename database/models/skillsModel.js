// skillsModel.js - Place in the database/models directory
const path = require('path');
const fs = require('fs');

// Helper function to find db.js file (same as other models)
function findDbModule() {
  // Try different possible locations
  const possiblePaths = [
    '../db.js',                    // If skillsModel.js is in models/ and db.js is in database/
    '../../database/db.js',        // If skillsModel.js is in database/models/ and db.js is in database/
    '../database/db.js',           // If skillsModel.js is in models/ and db.js is in database/
    './db.js',                     // If skillsModel.js and db.js are in the same directory
    path.resolve(__dirname, '../db.js')  // Absolute path using __dirname
  ];
  
  // Log current directory for debugging
  console.log('Current directory for skillsModel.js:', __dirname);
  
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

// Get skills for a player
async function getPlayerSkills(playerId) {
  const db = getDb();
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
async function setPlayerSkills(playerId, skillsData) {
  const db = getDb();
  
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