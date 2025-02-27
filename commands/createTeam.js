// Create Team command handler
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Helper function to find teamModel.js
function findTeamModel() {
  const possiblePaths = [
    '../database/models/teamModel',
    './database/models/teamModel',
    '../../database/models/teamModel',
    './models/teamModel',
    '../models/teamModel'
  ];
  
  console.log('Current directory for createTeam.js:', __dirname);
  
  for (const modelPath of possiblePaths) {
    try {
      if (fs.existsSync(require.resolve(modelPath))) {
        console.log('Found teamModel at:', modelPath);
        return require(modelPath);
      }
    } catch (error) {
      // Continue to next path
    }
  }
  
  // If can't find the module, use direct DB access as fallback
  console.log('Could not find teamModel, using direct DB access');
  const { getDb } = require('../database/db');
  
  return {
    getTeamByName: async (name) => {
      const db = getDb();
      return await db.get('SELECT * FROM teams WHERE name = ? COLLATE NOCASE', [name]);
    },
    createTeam: async (name, city, logo) => {
      const db = getDb();
      return await db.run(
        'INSERT INTO teams (name, city, logo) VALUES (?, ?, ?)',
        [name, city, logo]
      );
    }
  };
}

// Get teamModel - with fallback to direct DB access if needed
const teamModel = findTeamModel();

async function createTeam(interaction) {
  try {
    // Log input parameters
    console.log('Create Team Command Parameters:');
    console.log('name:', interaction.options.getString('name'));
    console.log('city:', interaction.options.getString('city'));
    console.log('logo:', interaction.options.getString('logo'));
    
    const name = interaction.options.getString('name');
    const city = interaction.options.getString('city');
    const logo = interaction.options.getString('logo');
    
    // Check if team already exists
    const existingTeam = await teamModel.getTeamByName(name);
    if (existingTeam) {
      return interaction.reply(`Team "${name}" already exists.`);
    }
    
    // Create team with error handling
    console.log('Creating team in database...');
    try {
      await teamModel.createTeam(name, city, logo);
      console.log('Team created successfully in database');
    } catch (dbError) {
      console.error('Database error when creating team:', dbError);
      return interaction.reply({ 
        content: `Database error: ${dbError.message}. Check if your database schema has a 'logo' column instead of 'colors'.`,
        ephemeral: true 
      });
    }
    
    // Create embed for response
    console.log('Creating embed response...');
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('New Team Created')
      .setDescription(`The ${city} ${name} have joined the league!`)
      .addFields(
        { name: 'Team Name', value: `${city} ${name}`, inline: true },
        { name: 'Record', value: '0-0-0', inline: true }
      )
      .setTimestamp();
    
    // Add logo to embed if it's a valid URL
    if (logo && (logo.startsWith('http://') || logo.startsWith('https://'))) {
      embed.addFields({ name: 'Logo', value: '[View Logo](' + logo + ')', inline: true });
      try {
        embed.setThumbnail(logo);
        console.log('Thumbnail set successfully');
      } catch (thumbnailError) {
        console.error('Error setting thumbnail:', thumbnailError);
        // Continue without thumbnail if there's an error
      }
    } else {
      console.log('Logo URL not valid, skipping thumbnail');
      embed.addFields({ name: 'Logo', value: 'No valid logo URL provided', inline: true });
    }
    
    // Send the response
    console.log('Sending embed response...');
    await interaction.reply({ embeds: [embed] });
    console.log('Command completed successfully');
    
  } catch (error) {
    // Catch any other errors
    console.error('Unhandled error in createTeam command:', error);
    return interaction.reply({ 
      content: `An error occurred: ${error.message}`,
      ephemeral: true 
    });
  }
}

module.exports = createTeam;