// Season management database operations
const path = require('path');
const fs = require('fs');

// Helper function to find db.js file (similar to other models)
function findDbModule() {
  const possiblePaths = [
    '../db.js',
    '../../database/db.js',
    '../database/db.js',
    './db.js',
    path.resolve(__dirname, '../db.js')
  ];
  
  console.log('Current directory for seasonModel.js:', __dirname);
  
  for (const dbPath of possiblePaths) {
    try {
      if (fs.existsSync(require.resolve(dbPath))) {
        console.log('Found db.js at:', dbPath);
        return require(dbPath);
      }
    } catch (error) {
      // Continue to next possible path
    }
  }
  
  throw new Error('Could not find db.js module. Please check your folder structure.');
}

// Get database access
const { getDb } = findDbModule();

// Initialize seasons schema if not already done
async function initSeasonSchema() {
  console.log('Initializing season schema...');
  const db = getDb();
  
  try {
    // Check if seasons table exists
    const tablesResult = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='seasons'");
    const seasonsTableExists = tablesResult.length > 0;
    
    if (!seasonsTableExists) {
      console.log('Creating seasons table...');
      // Create seasons table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS seasons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT,
          is_active BOOLEAN DEFAULT 1,
          is_playoffs BOOLEAN DEFAULT 0,
          playoffs_started BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Seasons table created successfully');
    } else {
      console.log('Seasons table already exists');
    }
    
    // Create playoff series table
    console.log('Creating playoff_series table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS playoff_series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        team1_id INTEGER NOT NULL,
        team2_id INTEGER NOT NULL,
        team1_wins INTEGER DEFAULT 0,
        team2_wins INTEGER DEFAULT 0,
        winner_id INTEGER,
        best_of INTEGER DEFAULT 7,
        is_complete BOOLEAN DEFAULT 0,
        next_series_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (season_id) REFERENCES seasons (id),
        FOREIGN KEY (team1_id) REFERENCES teams (id),
        FOREIGN KEY (team2_id) REFERENCES teams (id),
        FOREIGN KEY (winner_id) REFERENCES teams (id),
        FOREIGN KEY (next_series_id) REFERENCES playoff_series (id)
      )
    `);
    console.log('Playoff series table created/verified successfully');
    
    // Add season_id column to games table if it doesn't exist
    console.log('Checking games table for season_id column...');
    try {
      const gamesColumns = await db.all('PRAGMA table_info(games)');
      const columnNames = gamesColumns.map(c => c.name);
      
      // Add season_id if it doesn't exist
      if (!columnNames.includes('season_id')) {
        console.log('Adding season_id column to games table...');
        await db.exec('ALTER TABLE games ADD COLUMN season_id INTEGER REFERENCES seasons(id)');
        console.log('Added season_id column to games table');
      } else {
        console.log('season_id column already exists in games table');
      }
      
      // Add is_playoff_game if it doesn't exist
      if (!columnNames.includes('is_playoff_game')) {
        console.log('Adding is_playoff_game column to games table...');
        await db.exec('ALTER TABLE games ADD COLUMN is_playoff_game BOOLEAN DEFAULT 0');
        console.log('Added is_playoff_game column to games table');
      } else {
        console.log('is_playoff_game column already exists in games table');
      }
    } catch (gamesError) {
      console.error('Error checking/updating games table:', gamesError);
      console.log('This might be normal if the games table doesn\'t exist yet');
    }
    
    console.log('Season schema initialization completed successfully');
  } catch (error) {
    console.error('Error in season schema initialization:', error);
    throw error;
  }
}

// Get the currently active season
async function getActiveSeason() {
  const db = getDb();
  return await db.get('SELECT * FROM seasons WHERE is_active = 1');
}

// End the current season
async function endSeason(seasonId, endDate) {
  const db = getDb();
  return await db.run(
    'UPDATE seasons SET is_active = 0, end_date = ? WHERE id = ?',
    [endDate, seasonId]
  );
}

// Get all seasons
async function getAllSeasons() {
  const db = getDb();
  return await db.all('SELECT * FROM seasons ORDER BY start_date DESC');
}

// Start playoffs for the current season
async function startPlayoffs(seasonId, teamIds) {
  const db = getDb();
  
  // Update season status
  await db.run(
    'UPDATE seasons SET is_playoffs = 1, playoffs_started = 1 WHERE id = ?',
    [seasonId]
  );
  
  // Create first round matchups
  const numTeams = teamIds.length;
  if (numTeams < 2 || numTeams % 2 !== 0) {
    throw new Error('Playoffs require an even number of teams (minimum 2)');
  }
  
  const numSeries = numTeams / 2;
  const nextRoundSeries = [];
  
  // Create series for first round (round 1)
  for (let i = 0; i < numSeries; i++) {
    const team1Id = teamIds[i];
    const team2Id = teamIds[numTeams - 1 - i]; // Highest plays lowest seed
    
    const result = await db.run(
      `INSERT INTO playoff_series 
        (season_id, round, team1_id, team2_id, best_of) 
       VALUES (?, 1, ?, ?, 7)`,
      [seasonId, team1Id, team2Id]
    );
    
    const seriesId = result.lastID;
    nextRoundSeries.push(seriesId);
  }
  
  // Create placeholder series for subsequent rounds
  let currentRoundSeries = nextRoundSeries;
  let currentRound = 1;
  
  while (currentRoundSeries.length > 1) {
    currentRound++;
    const nextRound = [];
    
    for (let i = 0; i < currentRoundSeries.length; i += 2) {
      // If we have an odd number of series, the last one goes to next round
      if (i + 1 >= currentRoundSeries.length) {
        nextRound.push(currentRoundSeries[i]);
        continue;
      }
      
      // Create next round series (winner of current round series will advance)
      const result = await db.run(
        `INSERT INTO playoff_series 
          (season_id, round, team1_id, team2_id, best_of) 
         VALUES (?, ?, 0, 0, 7)`,
        [seasonId, currentRound]
      );
      
      const nextSeriesId = result.lastID;
      nextRound.push(nextSeriesId);
      
      // Update current series with next_series_id
      await db.run(
        'UPDATE playoff_series SET next_series_id = ? WHERE id = ?',
        [nextSeriesId, currentRoundSeries[i]]
      );
      
      await db.run(
        'UPDATE playoff_series SET next_series_id = ? WHERE id = ?',
        [nextSeriesId, currentRoundSeries[i + 1]]
      );
    }
    
    currentRoundSeries = nextRound;
  }
  
  return await getPlayoffBracket(seasonId);
}

// Record a playoff game result
async function recordPlayoffGame(seriesId, winningTeamId) {
  const db = getDb();
  
  // Get the current series
  const series = await db.get('SELECT * FROM playoff_series WHERE id = ?', [seriesId]);
  if (!series) {
    throw new Error('Playoff series not found');
  }
  
  if (series.is_complete) {
    throw new Error('This playoff series is already complete');
  }
  
  // Update the wins for the winning team
  let team1Wins = series.team1_wins;
  let team2Wins = series.team2_wins;
  
  if (winningTeamId === series.team1_id) {
    team1Wins++;
    await db.run(
      'UPDATE playoff_series SET team1_wins = ? WHERE id = ?',
      [team1Wins, seriesId]
    );
  } else if (winningTeamId === series.team2_id) {
    team2Wins++;
    await db.run(
      'UPDATE playoff_series SET team2_wins = ? WHERE id = ?',
      [team2Wins, seriesId]
    );
  } else {
    throw new Error('Winning team is not part of this series');
  }
  
  // Check if series is complete
  const winsNeeded = Math.ceil(series.best_of / 2);
  let isComplete = false;
  let winnerId = null;
  
  if (team1Wins >= winsNeeded) {
    isComplete = true;
    winnerId = series.team1_id;
  } else if (team2Wins >= winsNeeded) {
    isComplete = true;
    winnerId = series.team2_id;
  }
  
  if (isComplete) {
    // Update the series as complete
    await db.run(
      'UPDATE playoff_series SET is_complete = 1, winner_id = ? WHERE id = ?',
      [winnerId, seriesId]
    );
    
    // If there's a next series, update it with the winner
    if (series.next_series_id) {
      const nextSeries = await db.get('SELECT * FROM playoff_series WHERE id = ?', [series.next_series_id]);
      
      // If team1_id is still the placeholder value 0, set it as the winner
      // Otherwise, set team2_id
      if (nextSeries.team1_id === 0) {
        await db.run(
          'UPDATE playoff_series SET team1_id = ? WHERE id = ?',
          [winnerId, series.next_series_id]
        );
      } else {
        await db.run(
          'UPDATE playoff_series SET team2_id = ? WHERE id = ?',
          [winnerId, series.next_series_id]
        );
      }
    }
    
    // Check if this was the championship series (no next_series_id)
    if (!series.next_series_id) {
      // The season is complete, get the winning team
      const championTeam = await db.get('SELECT * FROM teams WHERE id = ?', [winnerId]);
      return {
        isChampionship: true,
        championTeam: championTeam
      };
    }
  }
  
  return {
    isComplete: isComplete,
    isChampionship: false,
    team1Wins: team1Wins,
    team2Wins: team2Wins,
    winnerId: winnerId
  };
}

// Get the current playoff bracket
async function getPlayoffBracket(seasonId) {
  const db = getDb();
  
  // Get all series for this season
  const allSeries = await db.all(`
    SELECT ps.*, 
      t1.name as team1_name, t1.city as team1_city,
      t2.name as team2_name, t2.city as team2_city,
      w.name as winner_name, w.city as winner_city
    FROM playoff_series ps
    LEFT JOIN teams t1 ON ps.team1_id = t1.id
    LEFT JOIN teams t2 ON ps.team2_id = t2.id
    LEFT JOIN teams w ON ps.winner_id = w.id
    WHERE ps.season_id = ?
    ORDER BY ps.round, ps.id
  `, [seasonId]);
  
  // Group by round
  const bracketByRound = {};
  allSeries.forEach(series => {
    if (!bracketByRound[series.round]) {
      bracketByRound[series.round] = [];
    }
    bracketByRound[series.round].push(series);
  });
  
  return bracketByRound;
}

// Get details for a specific playoff series
async function getPlayoffSeries(seriesId) {
  const db = getDb();
  
  return await db.get(`
    SELECT ps.*, 
      t1.name as team1_name, t1.city as team1_city, t1.logo as team1_logo,
      t2.name as team2_name, t2.city as team2_city, t2.logo as team2_logo,
      w.name as winner_name, w.city as winner_city,
      s.name as season_name
    FROM playoff_series ps
    JOIN seasons s ON ps.season_id = s.id
    LEFT JOIN teams t1 ON ps.team1_id = t1.id
    LEFT JOIN teams t2 ON ps.team2_id = t2.id
    LEFT JOIN teams w ON ps.winner_id = w.id
    WHERE ps.id = ?
  `, [seriesId]);
}

// Get playoff stats for a season
async function getPlayoffStats(seasonId) {
  const db = getDb();
  
  // Get player stats in playoff games for this season
  return await db.all(`
    SELECT 
      p.id, p.name, p.position, p.number, p.team_id,
      t.name as team_name, t.city as team_city,
      COUNT(DISTINCT g.id) as games_played,
      SUM(CASE WHEN ge.event_type = 'goal' THEN 1 ELSE 0 END) as goals,
      SUM(CASE WHEN ge.description LIKE '%assisted by%' AND ge.description LIKE '%' || p.name || '%' 
           AND ge.description NOT LIKE p.name || '%' THEN 1 ELSE 0 END) as assists
    FROM games g
    JOIN game_events ge ON g.id = ge.game_id
    JOIN players p ON ge.player_id = p.id OR 
                      (ge.event_type = 'goal' AND ge.description LIKE '%assisted by ' || p.name || '%')
    JOIN teams t ON p.team_id = t.id
    WHERE g.season_id = ? AND g.is_playoff_game = 1
    GROUP BY p.id
    ORDER BY (goals + assists) DESC, goals DESC
    LIMIT 50
  `, [seasonId]);
}

// Simulate an entire playoff series (for testing or automated playoffs)
async function simulatePlayoffSeries(seriesId, simulateGameFunction) {
  const db = getDb();
  
  // Get the series
  const series = await getPlayoffSeries(seriesId);
  if (!series) {
    throw new Error(`Playoff series with ID ${seriesId} not found.`);
  }
  
  if (series.is_complete) {
    throw new Error(`This playoff series is already complete.`);
  }
  
  // Get the teams
  const team1 = await db.get('SELECT * FROM teams WHERE id = ?', [series.team1_id]);
  const team2 = await db.get('SELECT * FROM teams WHERE id = ?', [series.team2_id]);
  
  if (!team1 || !team2) {
    throw new Error('One or both teams in this series do not exist.');
  }
  
  const results = [];
  const winsNeeded = Math.ceil(series.best_of / 2);
  
  // Keep simulating games until one team reaches the required number of wins
  while (series.team1_wins < winsNeeded && series.team2_wins < winsNeeded) {
    // Alternate home and away team
    const gameNumber = series.team1_wins + series.team2_wins + 1;
    
    // Determine home team based on series pattern (typically 2-2-1-1-1 format)
    let homeTeam, awayTeam;
    if (gameNumber <= 2 || gameNumber === 5 || gameNumber === 7) {
      // Team 1 is home
      homeTeam = team1;
      awayTeam = team2;
    } else {
      // Team 2 is home
      homeTeam = team2;
      awayTeam = team1;
    }
    
    // Simulate the game
    const gameResult = await simulateGameFunction(homeTeam, awayTeam, series.id);
    
    // Record the result
    const winningTeamId = gameResult.homeScore > gameResult.awayScore ? homeTeam.id : awayTeam.id;
    const gameOutcome = await recordPlayoffGame(seriesId, winningTeamId);
    
    results.push({
      game: gameNumber,
      homeTeam: `${homeTeam.city} ${homeTeam.name}`,
      awayTeam: `${awayTeam.city} ${awayTeam.name}`,
      score: `${gameResult.homeScore}-${gameResult.awayScore}`,
      winner: winningTeamId === team1.id ? `${team1.city} ${team1.name}` : `${team2.city} ${team2.name}`,
      seriesScore: `${gameOutcome.team1Wins}-${gameOutcome.team2Wins}`
    });
    
    // Update series variables for loop condition
    series.team1_wins = gameOutcome.team1Wins;
    series.team2_wins = gameOutcome.team2Wins;
    
    // If series is complete, break the loop
    if (gameOutcome.isComplete) {
      break;
    }
  }
  
  // Get the final updated series
  const finalSeries = await getPlayoffSeries(seriesId);
  
  return {
    results: results,
    finalScore: `${finalSeries.team1_wins}-${finalSeries.team2_wins}`,
    winner: finalSeries.winner_id === team1.id ? 
      `${team1.city} ${team1.name}` : 
      `${team2.city} ${team2.name}`,
    isChampionship: !finalSeries.next_series_id
  };
}

async function createSeason(name, startDate) {
  console.log(`Creating new season: "${name}" starting ${startDate}`);
  
  const db = getDb();
  
  // Check if there's an active season first
  try {
    console.log('Checking for active seasons...');
    const activeSeason = await getActiveSeason();
    if (activeSeason) {
      console.log(`Found active season: ${activeSeason.name} (ID: ${activeSeason.id})`);
      throw new Error('There is already an active season. End it before starting a new one.');
    }
  } catch (error) {
    // Only rethrow if it's not a "no such table" error
    if (!error.message.includes('no such table')) {
      throw error;
    }
    console.log('No active seasons found (or seasons table doesn\'t exist yet)');
  }
  
  // Ensure the seasons table exists
  try {
    const tablesResult = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='seasons'");
    if (tablesResult.length === 0) {
      console.log('Seasons table not found, initializing schema...');
      await initSeasonSchema();
    }
  } catch (error) {
    console.error('Error checking for seasons table:', error);
    throw new Error(`Failed to verify seasons table: ${error.message}`);
  }
  
  // Insert the new season
  try {
    console.log('Inserting new season into database...');
    const result = await db.run(
      'INSERT INTO seasons (name, start_date) VALUES (?, ?)',
      [name, startDate]
    );
    console.log(`Season created successfully with ID: ${result.lastID}`);
    return result;
  } catch (error) {
    console.error('Error inserting new season:', error);
    throw new Error(`Failed to create new season: ${error.message}`);
  }
}

module.exports = {
  initSeasonSchema,
  createSeason,
  getActiveSeason,
  endSeason,
  getAllSeasons,
  startPlayoffs,
  recordPlayoffGame,
  getPlayoffBracket,
  getPlayoffSeries,
  getPlayoffStats,
  simulatePlayoffSeries
};