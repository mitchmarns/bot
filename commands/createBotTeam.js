// Create Bot Team command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');
const { POSITIONS } = require('../config/config');

// List of AI first names
const firstNames = [
  'Alex', 'Blake', 'Casey', 'Dana', 'Eddie', 'Finn', 'Glenn', 'Hayden', 'Igor', 
  'Jaime', 'Kelly', 'Logan', 'Morgan', 'Nico', 'Owen', 'Parker', 'Quinn', 'Riley', 
  'Sage', 'Taylor', 'Valor', 'Whitney', 'Xavier', 'Yuri', 'Zephyr'
];

// List of AI last names
const lastNames = [
  'Anderson', 'Botson', 'Cyberman', 'Digital', 'Electronic', 'Firmware', 'Grid', 
  'Hologram', 'Interface', 'JSON', 'Kernel', 'Logic', 'Mainframe', 'Network', 
  'Output', 'Processor', 'Query', 'Router', 'System', 'Tron', 'Unit', 'Virtual', 
  'Wire', 'Xenon', 'Zero', 'Binary', 'Circuit', 'Delta', 'Synth'
];

// Special AI prefix for player names to differentiate them
const AI_PREFIX = '[AI] ';

// Generate a random AI name
function generateAIName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${AI_PREFIX}${first} ${last}`;
}

// Generate a random jersey number (1-99)
function generateNumber() {
  return Math.floor(Math.random() * 99) + 1;
}

// Generate skill levels based on position and specified team skill level
function generateSkills(position, teamSkillLevel) {
  // Base skill range depends on team skill level (1-100)
  const baseMin = Math.max(30, teamSkillLevel - 20);
  const baseMax = Math.min(95, teamSkillLevel + 20);
  
  // Function to generate a random skill value with position-specific bonuses
  const genSkill = (posBonus = 0) => {
    const base = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    return Math.min(100, Math.max(1, base + posBonus));
  };
  
  // Default skills
  const skills = {
    skating: genSkill(0),
    shooting: genSkill(0),
    passing: genSkill(0),
    defense: genSkill(0),
    physical: genSkill(0),
    goaltending: 1  // Default low for non-goalies
  };
  
  // Position-specific skill adjustments
  switch (position) {
    case 'center':
      skills.passing = genSkill(10);  // Centers are better at passing
      skills.skating = genSkill(5);   // Centers are good skaters
      break;
    case 'left_wing':
    case 'right_wing':
      skills.shooting = genSkill(10); // Wingers are better at shooting
      skills.skating = genSkill(5);   // Wingers are fast
      break;
    case 'defenseman':
      skills.defense = genSkill(15);  // Defensemen are better at defense
      skills.physical = genSkill(10); // Defensemen are more physical
      break;
    case 'goalie':
      skills.goaltending = genSkill(15); // Goalies have high goaltending
      skills.defense = genSkill(5);     // Goalies have some defense
      // Reset other skills to be lower for goalies
      skills.shooting = Math.min(50, genSkill(-20));
      skills.passing = Math.min(50, genSkill(-10));
      break;
  }
  
  return skills;
}

// Create a bot player and add to team
async function createBotPlayer(teamId, teamSkillLevel, position, botUserId) {
  try {
    // Generate random player details
    const name = generateAIName();
    const number = generateNumber();
    
    // Create the player
    const playerResult = await playerModel.createPlayer(
      name,
      position,
      number,
      teamId,
      botUserId,
      null // No image URL
    );
    
    const playerId = playerResult.lastID;
    
    // Generate and set skills
    const skills = generateSkills(position, teamSkillLevel);
    await skillsModel.setPlayerSkills(playerId, skills);
    
    return {
      id: playerId,
      name,
      position,
      number,
      skills
    };
  } catch (error) {
    console.error('Error creating bot player:', error);
    throw error;
  }
}

async function createBotTeam(interaction) {
  try {
    // Get command options
    const name = interaction.options.getString('name');
    const city = interaction.options.getString('city');
    const logo = interaction.options.getString('logo') || null;
    const skillLevel = interaction.options.getInteger('skill') || 50;
    
    // Mark this user ID as the bot controller (this will be needed to identify AI teams)
    const botUserId = 'BOT_CONTROLLER_' + interaction.user.id;
    
    // Check if team already exists
    const existingTeam = await teamModel.getTeamByName(name);
    if (existingTeam) {
      return interaction.reply(`Team "${name}" already exists.`);
    }
    
    // Create team
    await interaction.deferReply();
    console.log('Creating bot team in database...');
    
    // Add BOT prefix to team name to clearly mark it as an AI team
    const teamName = `[BOT] ${name}`;
    
    try {
      const teamResult = await teamModel.createTeam(teamName, city, logo);
      const teamId = teamResult.lastID;
      console.log('Bot team created successfully with ID:', teamId);
      
      // Create players for each position
      const players = [];
      
      // Add 2 goalies
      for (let i = 0; i < 2; i++) {
        const goalie = await createBotPlayer(teamId, skillLevel, 'goalie', botUserId);
        players.push(goalie);
      }
      
      // Add 6 defensemen (3 pairs)
      for (let i = 0; i < 6; i++) {
        const defenseman = await createBotPlayer(teamId, skillLevel, 'defenseman', botUserId);
        players.push(defenseman);
      }
      
      // Add 4 centers
      for (let i = 0; i < 4; i++) {
        const center = await createBotPlayer(teamId, skillLevel, 'center', botUserId);
        players.push(center);
      }
      
      // Add 4 left wings
      for (let i = 0; i < 4; i++) {
        const leftWing = await createBotPlayer(teamId, skillLevel, 'left_wing', botUserId);
        players.push(leftWing);
      }
      
      // Add 4 right wings
      for (let i = 0; i < 4; i++) {
        const rightWing = await createBotPlayer(teamId, skillLevel, 'right_wing', botUserId);
        players.push(rightWing);
      }
      
      // Create embed for response
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Bot Team Created')
        .setDescription(`The ${city} ${teamName} have joined the league as an AI-controlled team!`)
        .addFields(
          { name: 'Team Name', value: `${city} ${teamName}`, inline: true },
          { name: 'Skill Level', value: `${skillLevel}/100`, inline: true },
          { name: 'Players', value: `${players.length} AI players created`, inline: true }
        )
        .setTimestamp();
      
      // Add logo to embed if it's a valid URL
      if (logo && (logo.startsWith('http://') || logo.startsWith('https://'))) {
        embed.addFields({ name: 'Logo', value: '[View Logo](' + logo + ')', inline: true });
        embed.setThumbnail(logo);
      }
      
      // Add example player information
      const samplePlayers = players.slice(0, 5); // Take first 5 players as examples
      let playerListText = '';
      
      samplePlayers.forEach(player => {
        const positionName = POSITIONS.find(p => p.value === player.position)?.name || player.position;
        playerListText += `${player.name} (#${player.number}) - ${positionName}\n`;
      });
      
      playerListText += `...and ${players.length - 5} more`;
      
      embed.addFields({ name: 'Sample Players', value: playerListText });
      
      // Send the response
      await interaction.editReply({ embeds: [embed] });
      console.log('Bot team creation command completed successfully');
      
    } catch (dbError) {
      console.error('Database error when creating bot team:', dbError);
      return interaction.editReply({ 
        content: `Database error: ${dbError.message}.`
      });
    }
  } catch (error) {
    // Catch any other errors
    console.error('Unhandled error in createBotTeam command:', error);
    if (interaction.deferred) {
      return interaction.editReply({ 
        content: `An error occurred: ${error.message}`
      });
    } else {
      return interaction.reply({ 
        content: `An error occurred: ${error.message}`,
        ephemeral: true 
      });
    }
  }
}

module.exports = createBotTeam;