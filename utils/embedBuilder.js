// Discord embed creation helpers
const { EmbedBuilder } = require('discord.js');

/**
 * Create a standard embed with consistent styling
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {string} color - Hex color code (default: #0099ff)
 * @param {boolean} timestamp - Whether to add timestamp (default: true)
 * @returns {EmbedBuilder} - Discord embed object
 */
function createEmbed(title, description, color = '#0099ff', timestamp = true) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);
  
  if (timestamp) {
    embed.setTimestamp();
  }
  
  return embed;
}

/**
 * Create a success embed (green color)
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @returns {EmbedBuilder} - Discord embed object
 */
function createSuccessEmbed(title, description) {
  return createEmbed(title, description, '#00ff00');
}

/**
 * Create an error embed (red color)
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @returns {EmbedBuilder} - Discord embed object
 */
function createErrorEmbed(title, description) {
  return createEmbed(title, description, '#ff0000');
}

/**
 * Create a player info embed
 * @param {Object} player - Player data
 * @param {Object} skills - Player skills data 
 * @returns {EmbedBuilder} - Discord embed object
 */
function createPlayerEmbed(player, skills = null) {
  const embed = createEmbed(
    `Player Info: ${player.name}`,
    `${player.name} (#${player.number}) - ${player.team_name}`
  );
  
  embed.addFields(
    { name: 'Position', value: player.position.replace('_', ' '), inline: true },
    { name: 'Goals', value: player.goals.toString(), inline: true },
    { name: 'Assists', value: player.assists.toString(), inline: true },
    { name: 'Games', value: player.games_played.toString(), inline: true }
  );

  // Add skills if provided
  if (skills) {
    embed.addFields(
      { name: '\u200B', value: '**Skills**', inline: false },
      { name: 'Skating', value: `${skills.skating}/100`, inline: true },
      { name: 'Shooting', value: `${skills.shooting}/100`, inline: true },
      { name: 'Passing', value: `${skills.passing}/100`, inline: true },
      { name: 'Defense', value: `${skills.defense}/100`, inline: true },
      { name: 'Physical', value: `${skills.physical}/100`, inline: true }
    );
    
    // Only show goaltending for goalies or if it's a significant skill
    if (player.position === 'goalie' || skills.goaltending > 50) {
      embed.addFields(
        { name: 'Goaltending', value: `${skills.goaltending}/100`, inline: true }
      );
    }
  }
  
  if (player.image_url) {
    embed.setThumbnail(player.image_url);
  }
  
  return embed;
}

/**
 * Create a team info embed
 * @param {Object} team - Team data
 * @param {Array} roster - Team roster
 * @returns {EmbedBuilder} - Discord embed object
 */
function createTeamEmbed(team, roster = null) {
  const embed = createEmbed(
    `${team.city} ${team.name}`,
    `Record: ${team.wins}-${team.losses}-${team.ties} (${team.wins * 2 + team.ties} pts)`
  );
  
  // Add logo if available
  if (team.logo) {
    embed.setThumbnail(team.logo);
  }
  
  // Add roster if provided
  if (roster && roster.length > 0) {
    // Group players by position
    const goalies = roster.filter(p => p.position === 'goalie');
    const defensemen = roster.filter(p => p.position === 'defenseman');
    const forwards = roster.filter(p => ['center', 'left_wing', 'right_wing'].includes(p.position));
    
    if (goalies.length > 0) {
      embed.addFields({
        name: 'Goalies',
        value: goalies.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: false
      });
    }
    
    if (defensemen.length > 0) {
      embed.addFields({
        name: 'Defensemen',
        value: defensemen.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: false
      });
    }
    
    if (forwards.length > 0) {
      embed.addFields({
        name: 'Forwards',
        value: forwards.map(p => `#${p.number} ${p.name} (${p.position.replace('_', ' ')})`).join('\n'),
        inline: false
      });
    }
  }
  
  return embed;
}

module.exports = {
  createEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createPlayerEmbed,
  createTeamEmbed
};
