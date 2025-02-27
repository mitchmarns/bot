// Player Info command handler
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');
const { createPlayerEmbed } = require('../utils/embedBuilder');

async function playerInfo(interaction) {
  const playerName = interaction.options.getString('name');
  
  // Find player
  const player = await playerModel.getPlayerByName(playerName);
  
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }

  // Get player skills
  const skills = await skillsModel.getPlayerSkills(player.id);
  
  // Create and send player embed
  const embed = createPlayerEmbed(player, skills);
  await interaction.reply({ embeds: [embed] });
}

module.exports = playerInfo;