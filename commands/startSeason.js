// Start Season command handler - robust version
const { EmbedBuilder } = require('discord.js');

async function startSeason(interaction) {
  // First, we'll respond immediately to avoid timeout
  await interaction.reply("Processing your command, please wait...");
  
  try {
    const seasonName = interaction.options.getString('name');
    const startDate = interaction.options.getString('date') || new Date().toISOString().split('T')[0];
    
    console.log(`Attempting to start season: ${seasonName}, date: ${startDate}`);
    
    if (!seasonName) {
      return await interaction.editReply('Please provide a season name.');
    }
    
    // Load the database modules directly to prevent import errors
    const { getDb } = require('../database/db');
    const db = getDb();
    
    // 1. Check if seasons table exists
    console.log('Checking if seasons table exists...');
    let tablesResult;
    try {
      tablesResult = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='seasons'");
    } catch (dbError) {
      console.error('Database error checking table:', dbError);
      return await interaction.editReply(`Database error: ${dbError.message}. Please check your database setup.`);
    }
    
    // Create the seasons table if it doesn't exist
    if (tablesResult.length === 0) {
      console.log('Seasons table does not exist, creating it now...');
      try {
        await db.exec(`
          CREATE TABLE seasons (
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
      } catch (createError) {
        console.error('Error creating seasons table:', createError);
        return await interaction.editReply(`Failed to create seasons table: ${createError.message}`);
      }
    }
    
    // 2. Check for active seasons
    console.log('Checking for active seasons...');
    let activeSeasons;
    try {
      activeSeasons = await db.all('SELECT * FROM seasons WHERE is_active = 1');
    } catch (activeError) {
      console.error('Error checking active seasons:', activeError);
      return await interaction.editReply(`Error checking active seasons: ${activeError.message}`);
    }
    
    if (activeSeasons && activeSeasons.length > 0) {
      const activeSeason = activeSeasons[0];
      return await interaction.editReply(`There is already an active season: ${activeSeason.name}. End it first before starting a new one.`);
    }
    
    // 3. Create new season
    console.log('Creating new season...');
    try {
      await db.run(
        'INSERT INTO seasons (name, start_date) VALUES (?, ?)',
        [seasonName, startDate]
      );
      console.log('Season created successfully in database');
    } catch (insertError) {
      console.error('Error inserting season:', insertError);
      return await interaction.editReply(`Failed to create season: ${insertError.message}`);
    }
    
    // 4. Create response embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🏒 New Season Started!')
      .setDescription(`The ${seasonName} season has officially begun!`)
      .addFields(
        { name: 'Season Name', value: seasonName, inline: true },
        { name: 'Start Date', value: startDate, inline: true }
      )
      .setTimestamp();
    
    // 5. Return successful response
    await interaction.editReply({ content: null, embeds: [embed] });
    console.log('Start season command completed successfully');
    
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unhandled error in startSeason command:', error);
    await interaction.editReply(`An unexpected error occurred: ${error.message}. Check the server logs for details.`);
  }
}

module.exports = startSeason;