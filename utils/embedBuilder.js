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
function createEmbed(title, description, color = '#808080', timestamp = true) {
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
 * @param {string} [color='#808080'] 
 * @returns {EmbedBuilder} - Discord embed object
 */
function createSuccessEmbed(title, description, color) {
  return createEmbed(title, description, color);
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
 * Create a player info embed with enhanced hockey stats
 * @param {Object} player - Player data
 * @param {Object} skills - Player skills data 
 * @param {string} [color='#808080'] 
 * @returns {EmbedBuilder} - Discord embed object
 */
function createPlayerEmbed(player, skills = null) {
  const embed = createEmbed(
    `Player Info: ${player.name}`,
    `${player.name} (#${player.number}) - ${player.team_name}`
  );
  
  embed.addFields(
    { name: 'Position', value: player.position.replace('_', ' '), inline: true },
    { name: 'Games', value: player.games_played.toString(), inline: true }
  );

  // Different stats based on position
  if (player.position === 'goalie') {
    // Goalie stats
    const saves = player.saves || 0;
    const goalsAgainst = player.goals_against || 0;
    const totalShots = saves + goalsAgainst;
    
    const savePercentage = totalShots > 0 ? 
      ((saves / totalShots) * 100).toFixed(1) : '0.0';
    
    const gaa = player.games_played > 0 ? 
      (goalsAgainst / player.games_played).toFixed(2) : '0.00';
    
    embed.addFields(
      { name: 'Saves', value: `${saves}`, inline: true },
      { name: 'Goals Against', value: `${goalsAgainst}`, inline: true },
      { name: 'Save %', value: `${savePercentage}%`, inline: true },
      { name: 'GAA', value: gaa, inline: true },
      { name: 'Shutouts', value: `${player.shutouts || 0}`, inline: true },
      { name: '+/-', value: `${player.plus_minus || 0}`, inline: true }
    );
  } else {
    // Skater stats
    embed.addFields(
      { name: 'Goals', value: player.goals.toString(), inline: true },
      { name: 'Assists', value: player.assists.toString(), inline: true },
      { name: 'Points', value: (player.goals + player.assists).toString(), inline: true },
      { name: '+/-', value: `${player.plus_minus || 0}`, inline: true }
    );
    
    // Second row of stats
    embed.addFields(
      { name: 'Shots', value: `${player.shots || 0}`, inline: true },
      { name: 'Hits', value: `${player.hits || 0}`, inline: true },
      { name: 'Blocks', value: `${player.blocks || 0}`, inline: true },
      { name: 'PIM', value: `${player.penalty_minutes || 0}`, inline: true }
    );
    
    // Add faceoff stats for centers
    if (player.position === 'center') {
      const faceoffWins = player.faceoff_wins || 0;
      const faceoffLosses = player.faceoff_losses || 0;
      const totalFaceoffs = faceoffWins + faceoffLosses;
      
      if (totalFaceoffs > 0) {
        const faceoffPercentage = ((faceoffWins / totalFaceoffs) * 100).toFixed(1);
        embed.addFields(
          { name: 'Faceoff %', value: `${faceoffPercentage}% (${faceoffWins}/${totalFaceoffs})`, inline: true }
        );
      }
    }
  }

  // Add skills if provided
  if (skills) {
    embed.addFields(
      { name: '\u200B', value: '**Skills**', inline: false }
    );
    
    if (player.position === 'goalie') {
      embed.addFields(
        { name: 'Goaltending', value: `${skills.goaltending}/100`, inline: true },
        { name: 'Skating', value: `${skills.skating}/100`, inline: true },
        { name: 'Physical', value: `${skills.physical}/100`, inline: true }
      );
    } else {
      embed.addFields(
        { name: 'Skating', value: `${skills.skating}/100`, inline: true },
        { name: 'Shooting', value: `${skills.shooting}/100`, inline: true },
        { name: 'Passing', value: `${skills.passing}/100`, inline: true },
        { name: 'Defense', value: `${skills.defense}/100`, inline: true },
        { name: 'Physical', value: `${skills.physical}/100`, inline: true }
      );
    }
  }
  
  if (player.image_url) {
    embed.setThumbnail(player.image_url);
  }
  
  return embed;
}

/**
 * Create a team info embed with enhanced hockey stats
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
  
  // Add team statistics
  const goalsFor = team.goals_for || 0;
  const goalsAgainst = team.goals_against || 0;
  const goalDiff = goalsFor - goalsAgainst;
  
  embed.addFields(
    { name: 'Goals For', value: goalsFor.toString(), inline: true },
    { name: 'Goals Against', value: goalsAgainst.toString(), inline: true },
    { name: 'Goal Diff', value: goalDiff > 0 ? `+${goalDiff}` : goalDiff.toString(), inline: true }
  );
  
  // Add shots and special teams stats if available
  const shotsFor = team.shots_for || 0;
  const shotsAgainst = team.shots_against || 0;
  
  if (shotsFor > 0 || shotsAgainst > 0) {
    embed.addFields(
      { name: 'Shots For', value: shotsFor.toString(), inline: true },
      { name: 'Shots Against', value: shotsAgainst.toString(), inline: true },
      { name: 'Shot Diff', value: (shotsFor - shotsAgainst) > 0 ? 
                             `+${shotsFor - shotsAgainst}` : 
                             (shotsFor - shotsAgainst).toString(), inline: true }
    );
  }
  
  // Add power play and penalty kill stats if available
  const powerPlays = team.power_plays || 0;
  const powerPlayGoals = team.power_play_goals || 0;
  const penalties = team.penalties || 0;
  const penaltyKillSuccess = team.penalty_kill_success || 0;
  
  if (powerPlays > 0 || penalties > 0) {
    const ppPercentage = powerPlays > 0 ? 
      ((powerPlayGoals / powerPlays) * 100).toFixed(1) : "0.0";
    
    const pkPercentage = penalties > 0 ? 
      ((penaltyKillSuccess / penalties) * 100).toFixed(1) : "0.0";
    
    embed.addFields(
      { name: 'Power Play', value: `${ppPercentage}% (${powerPlayGoals}/${powerPlays})`, inline: true },
      { name: 'Penalty Kill', value: `${pkPercentage}%`, inline: true },
      { name: 'PIM', value: (team.penalty_minutes || 0).toString(), inline: true }
    );
  }
  
  // Add home/away record if available
  const homeWins = team.home_wins || 0;
  const homeLosses = team.home_losses || 0;
  const awayWins = team.away_wins || 0; 
  const awayLosses = team.away_losses || 0;
  
  if (homeWins > 0 || homeLosses > 0 || awayWins > 0 || awayLosses > 0) {
    embed.addFields(
      { name: 'Home Record', value: `${homeWins}-${homeLosses}`, inline: true },
      { name: 'Away Record', value: `${awayWins}-${awayLosses}`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true }
    );
  }
  
  // Add roster if provided
  if (roster && roster.length > 0) {
    // Group players by position
    const goalies = roster.filter(p => p.position === 'goalie');
    const defensemen = roster.filter(p => p.position === 'defenseman');
    const centers = roster.filter(p => p.position === 'center');
    const leftWings = roster.filter(p => p.position === 'left_wing');
    const rightWings = roster.filter(p => p.position === 'right_wing');
    
    // Display goalies
    if (goalies.length > 0) {
      embed.addFields({
        name: 'Goalies',
        value: goalies.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: false
      });
    }
    
    // Display defensemen
    if (defensemen.length > 0) {
      embed.addFields({
        name: 'Defensemen',
        value: defensemen.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: false
      });
    }
    
    // Display forwards by position
    if (centers.length > 0) {
      embed.addFields({
        name: 'Centers',
        value: centers.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: true
      });
    }
    
    if (leftWings.length > 0) {
      embed.addFields({
        name: 'Left Wings',
        value: leftWings.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: true
      });
    }
    
    if (rightWings.length > 0) {
      embed.addFields({
        name: 'Right Wings',
        value: rightWings.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: true
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