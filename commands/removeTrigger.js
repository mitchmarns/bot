// commands/removeTrigger.js

const { EmbedBuilder } = require('discord.js');
const triggerModel = require('../database/models/triggerModel');

async function removeTrigger(interaction) {
  const triggerText = interaction.options.getString('trigger');
  
  // Find the trigger
  const trigger = await triggerModel.getTriggerByText(triggerText);
  
  if (!trigger) {
    return interaction.reply(`Trigger "${triggerText}" not found.`);
  }
  
  // Check if the user owns this trigger
  if (trigger.user_id !== interaction.user.id) {
    return interaction.reply({ 
      content: 'You can only remove your own triggers.', 
      ephemeral: true 
    });
  }
  
  // Delete the trigger
  await triggerModel.deleteTrigger(trigger.id, interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Trigger Removed')
    .setDescription(`Removed trigger "${triggerText}" for ${trigger.name}`)
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = removeTrigger;