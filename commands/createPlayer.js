// Create Player command handler
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Helper function to find models
function findModels() {
  const modelDirs = [
    '../database/models',
    './database/models',
    '../../database/models',
    './models',
    '../models'
  ];
  
  console.log('Current directory for createPlayer.js:', __dirname);
  
  // Try to find team model
  let teamModel = null;
  let playerModel = null;
  
  for (const dir of modelDirs) {
    try {
      const teamPath = path.join(dir, 'teamModel');
      const playerPath = path.join(dir, 'playerModel');
      
      if (fs.existsSync(require.resolve(teamPath))) {
        console.log('Found teamModel at:', teamPath);
        teamModel = require(teamPath);
      }
      
      if (fs.existsSync(require.resolve(playerPath))) {
        console.log('Found playerModel at:', playerPath);
        playerModel = require(playerPath);
      }
      
      if (teamModel && playerModel) {
        break; // Found both models
      }
    } catch (error) {
      // Continue to next directory
    }
  }
  
  // If can't find the models, use direct DB access as fallback
  if (!teamModel || !playerModel) {
    console.log('Could not find models, using direct DB access');
    const { getDb } = require('../database/db');
    
    if (!teamModel) {
      teamModel = {
        getTeamByName: async (name) => {
          const db = getDb();
          return await db.get('SELECT * FROM teams WHERE name = ? COLLATE NOCASE', [name]);
        }
      };
    }
    
    if (!playerModel) {
      playerModel = {
        createPlayer: async (name, position, number, teamId, userId, imageUrl) => {
          const db = getDb();
          return await db.run(
            'INSERT INTO players (name, position, number, team_id, user_id, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, position, number, teamId, userId, imageUrl]
          );
        }
      };
    }
  }
  
  return { teamModel, playerModel };
}

// Get models - with fallback to direct DB access if needed
const { teamModel, playerModel } = findModels();

async function createPlayer(interaction) {
  try {
    const name = interaction.options.getString('name');
    const position = interaction.options.getString('position');
    const number = interaction.options.getInteger('number');
    const teamName = interaction.options.getString('team');
    const imageUrl = interaction.options.getString('image') || null;
    
    console.log('Create Player Parameters:', { name, position, number, teamName, imageUrl });
    
    // Check if the team exists
    const team = await teamModel.getTeamByName(teamName);
    if (!team) {
      return interaction.reply(`Team "${teamName}" doesn't exist. Create it first with /createteam.`);
    }
    
    // Create player
    console.log('Inserting player into database...');
    await playerModel.createPlayer(
      name, 
      position, 
      number, 
      team.id, 
      interaction.user.id, 
      imageUrl
    );
    console.log('Player created successfully');
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('New Player Created')
      .setDescription(`${name} has been added to ${teamName} as a ${position.replace('_', ' ')}!`)
      .addFields(
        { name: 'Name', value: name, inline: true },
        { name: 'Position', value: position.replace('_', ' '), inline: true },
        { name: 'Number', value: number.toString(), inline: true }
      )
      .setTimestamp();
      
    // Add player image if provided
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      try {
        embed.setThumbnail(imageUrl);
      } catch (error) {
        console.error('Error setting thumbnail:', error);
      }
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in createPlayer command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = createPlayer;