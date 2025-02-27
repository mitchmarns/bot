// Skill Check Dice Roll command handler
const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');

async function roll(interaction) {
  const manualSkill = interaction.options.getInteger('skill');
  const playerName = interaction.options.getString('player');
  const skillType = interaction.options.getString('skilltype');
  
  let skill;
  let skillLabel;
  let playerInfo = null;
  
  // If player name is provided, use their skills
  if (playerName) {
    const player = await playerModel.getPlayerByName(playerName);
    
    if (!player) {
      return interaction.reply(`Player "${playerName}" doesn't exist.`);
    }
    
    playerInfo = player;
    const playerSkills = await skillsModel.getPlayerSkills(player.id);
    
    if (skillType) {
      // Use the specified skill
      switch (skillType) {
        case 'skating':
          skill = playerSkills.skating;
          skillLabel = 'Skating';
          break;
        case 'shooting':
          skill = playerSkills.shooting;
          skillLabel = 'Shooting';
          break;
        case 'passing':
          skill = playerSkills.passing;
          skillLabel = 'Passing';
          break;
        case 'defense':
          skill = playerSkills.defense;
          skillLabel = 'Defense';
          break;
        case 'physical':
          skill = playerSkills.physical;
          skillLabel = 'Physical';
          break;
        case 'goaltending':
          skill = playerSkills.goaltending;
          skillLabel = 'Goaltending';
          break;
        default:
          return interaction.reply('Invalid skill type. Use skating, shooting, passing, defense, physical, or goaltending.');
      }
    } else {
      // No skill type specified, use a skill related to their position
      switch (player.position) {
        case 'goalie':
          skill = playerSkills.goaltending;
          skillLabel = 'Goaltending';
          break;
        case 'defenseman':
          skill = playerSkills.defense;
          skillLabel = 'Defense';
          break;
        case 'center':
          skill = playerSkills.passing;
          skillLabel = 'Passing';
          break;
        case 'left_wing':
        case 'right_wing':
          skill = playerSkills.shooting;
          skillLabel = 'Shooting';
          break;
        default:
          skill = playerSkills.skating;
          skillLabel = 'Skating';
      }
    }
  } else if (manualSkill) {
    // Use manually provided skill value
    skill = manualSkill;
    skillLabel = 'Skill';
  } else {
    return interaction.reply('You must provide either a skill value or a player name.');
  }
  
  if (skill < 1 || skill > 100) {
    return interaction.reply('Skill level must be between 1 and 100.');
  }
  
  // Roll d100
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll <= skill;
  
  const embed = new EmbedBuilder()
    .setColor(success ? '#00ff00' : '#ff0000')
    .setTitle('Skill Check');
  
  if (playerInfo) {
    embed.setDescription(`${playerInfo.name} (${playerInfo.position.replace('_', ' ')}) rolled a ${roll} vs ${skillLabel} ${skill}`);
    if (playerInfo.image_url) {
      embed.setThumbnail(playerInfo.image_url);
    }
  } else {
    embed.setDescription(`${interaction.user.username} rolled a ${roll} vs ${skillLabel} level ${skill}`);
  }
  
  embed.addFields(
    { name: 'Result', value: success ? 'Success! 🎯' : 'Failure! ❌', inline: true },
    { name: 'Margin', value: `${Math.abs(roll - skill)}`, inline: true }
  );
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = roll;