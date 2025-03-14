// Database connection and initialization
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { getDbPath } = require('../config/config');

// Store database connections by guild ID
const connections = {};

// Initialize the database for a specific guild
async function initDatabase(guildId) {
  if (!guildId) {
    throw new Error('Guild ID is required to initialize database');
  }
  
  const dbPath = getDbPath(guildId);
  
  // Open the database
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log(`Connected to SQLite database for guild ${guildId}`);
  
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      logo TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      number INTEGER NOT NULL,
      team_id INTEGER,
      user_id TEXT NOT NULL,
      image_url TEXT,
      goals INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id)
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team_id INTEGER NOT NULL,
      away_team_id INTEGER NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      scheduled_date TEXT,
      scheduled_time TEXT,
      is_played BOOLEAN DEFAULT 0,
      played_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (home_team_id) REFERENCES teams (id),
      FOREIGN KEY (away_team_id) REFERENCES teams (id)
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      player_id INTEGER,
      period INTEGER,
      time TEXT,
      description TEXT,
      FOREIGN KEY (game_id) REFERENCES games (id),
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS player_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      skating INTEGER DEFAULT 50,
      shooting INTEGER DEFAULT 50,
      passing INTEGER DEFAULT 50,
      defense INTEGER DEFAULT 50,
      physical INTEGER DEFAULT 50,
      goaltending INTEGER DEFAULT 50,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS player_phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS phone_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_phone_id INTEGER NOT NULL,
      to_phone_id INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_phone_id) REFERENCES player_phones (id),
      FOREIGN KEY (to_phone_id) REFERENCES player_phones (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS player_triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      trigger_text TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS trade_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      from_team_id INTEGER NOT NULL,
      to_team_id INTEGER NOT NULL,
      trade_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (player_id) REFERENCES players (id),
      FOREIGN KEY (from_team_id) REFERENCES teams (id),
      FOREIGN KEY (to_team_id) REFERENCES teams (id)
    )
  `);
  
  console.log(`Database tables initialized for guild ${guildId}`);
  
  // Store the connection
  connections[guildId] = db;
  
  return db;
}

// Get database connection for a specific guild
function getDb(guildId) {
  if (!guildId) {
    throw new Error('Guild ID is required to get database connection');
  }
  
  if (!connections[guildId]) {
    throw new Error(`Database not initialized for guild ${guildId}. Call initDatabase(${guildId}) first.`);
  }
  
  return connections[guildId];
}

module.exports = {
  initDatabase,
  getDb
};