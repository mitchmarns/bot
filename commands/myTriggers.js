const { EmbedBuilder } = require('discord.js');
const triggerModel = require('../database/models/triggerModel');

async function myTriggers(interaction) {
  // Get all triggers for the user
  const triggers = await triggerModel.getUserTriggers(interaction.user.id);
  
  if (triggers.length === 0) {
    return interaction.reply('You don\'t have any character triggers set up yet.');
  }
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Your Character Triggers')
    .setDescription('Here are all your character triggers:')
    .setTimestamp();
  
  triggers.forEach(trigger => {
    embed.addFields({
      name: `${trigger.player_name}`,
      value: `Trigger: \`${trigger.trigger_text}\``
    });
  });
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = myTriggers;