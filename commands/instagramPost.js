// Enhanced Instagram Post with location and more Instagram-like features
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const teamModel = require('../database/models/teamModel');

async function instagramPost(interaction) {
  try {
    const playerName = interaction.options.getString('player');
    const imageUrl = interaction.options.getString('image');
    const caption = interaction.options.getString('caption');
    const hashtags = interaction.options.getString('hashtags');
    const location = interaction.options.getString('location');
    
    // Find player
    const player = await playerModel.getPlayerByName(playerName);
    
    if (!player) {
      return interaction.reply(`Player "${playerName}" doesn't exist.`);
    }
    
    // Check if the user is the one who created the player
    if (player.user_id !== interaction.user.id) {
      return interaction.reply({ 
        content: 'You can only create posts for your own characters.', 
        ephemeral: true 
      });
    }
    
    // Validate image URL
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return interaction.reply({
        content: 'Please provide a valid image URL that starts with http:// or https://',
        ephemeral: true
      });
    }
    
    // Get team info for the player
    const team = await teamModel.getTeamById(player.team_id);
    
    // Format hashtags if provided
    let formattedHashtags = '';
    if (hashtags) {
      // Remove # if already included and add spaces for readability
      formattedHashtags = hashtags
        .split(/[,\s]+/)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
    }
    
    // Add some default hockey-related hashtags
    if (!formattedHashtags.includes('#hockey')) {
      formattedHashtags += ' #hockey';
    }
    
    if (team && !formattedHashtags.includes(`#${team.name.replace(/\s+/g, '')}`)) {
      formattedHashtags += ` #${team.name.replace(/\s+/g, '')}`;
    }
    
    if (!formattedHashtags.includes('#hockeylife')) {
      formattedHashtags += ' #hockeylife';
    }
    
    // Generate a random number of likes between 100 and 5000
    const likeCount = Math.floor(Math.random() * 4900) + 100;
    
    // Format location display
    const locationDisplay = location ? `📍 ${location}` : '';
    
    // Build the Instagram-style embed
    const embed = new EmbedBuilder()
      .setColor('#E1306C') // Instagram color
      .setAuthor({
        name: `${player.name} (@${player.name.replace(/\s+/g, '_').toLowerCase()})`,
        iconURL: player.image_url || null
      })
      .setTitle(locationDisplay)
      .setImage(imageUrl)
      .setTimestamp();
    
    // Generate random username for a comment
    const randomCommentUsers = [
      'hockey_fan92', 'ice_queen', 'puck_master', 'slap_shot_king', 
      'stick_handler', 'goal_scorer', 'net_minder', 'captain_awesome',
      'puck_lover', 'hockey_life', 'rink_rat', 'zamboni_driver'
    ];
    
    const randomUser = randomCommentUsers[Math.floor(Math.random() * randomCommentUsers.length)];
    
    // Add caption
    let fullCaption = '';
    if (caption) {
      fullCaption = caption;
    }
    
    // Add hashtags to caption (Instagram style)
    if (formattedHashtags) {
      fullCaption += '\n\n' + formattedHashtags;
    }
    
    if (fullCaption) {
      embed.setDescription(fullCaption);
    }
    
    // Add Instagram details as fields
    embed.addFields(
      { name: '❤️ Likes', value: `${likeCount.toLocaleString()}`, inline: true },
      { name: '💬 Comments', value: '21', inline: true }
    );
    
    // Add a random comment
    const randomComments = [
      '🔥🔥🔥',
      'Amazing shot!',
      'Looking good! 👍',
      'Great form on the ice!',
      'I need to get back to the rink soon',
      'Hockey season is the best season',
      'This is awesome',
      'Absolute legend!',
      'My favorite player! 🏒'
    ];
    
    const randomComment = randomComments[Math.floor(Math.random() * randomComments.length)];
    
    embed.addFields(
      { name: 'Recent Comments', value: `**${randomUser}**: ${randomComment}` }
    );
    
    // Add footer with Instagram-like info
    embed.setFooter({ 
      text: `Instagram • ${new Date().toLocaleDateString()}`
    });
    
    // Create interactive buttons with post ID for tracking
    const postId = Date.now().toString(); // Simple timestamp-based ID for the post
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`like_${postId}`)
          .setLabel('❤️ Like')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`comment_${postId}`)
          .setLabel('💬 Comment')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`share_${postId}`)
          .setLabel('🔄 Share')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`save_${postId}`)
          .setLabel('🔖 Save')
          .setStyle(ButtonStyle.Secondary)
      );
    
    // Send the Instagram post to the channel and create a thread for interactions
    const response = await interaction.reply({ 
      content: `${player.name} shared a new Instagram post!`,
      embeds: [embed],
      components: [buttons]
    }).then(interactionResponse => interactionResponse.fetch());
    
    // Create a thread for interactions
    const thread = await response.startThread({
      name: `${player.name}'s Instagram Post`,
      autoArchiveDuration: 1440 // Auto-archive after 1 day
    });
    
    // Set up a collector for button interactions without user filtering
    // Allowing any user to interact with the buttons - no timeout to keep it active forever
    const collector = response.createMessageComponentCollector();
    
    collector.on('collect', async i => {
      // Get action type and post ID from the button's customId
      const [action, postId] = i.customId.split('_');
      
      // Handle different button actions
      if (action === 'like') {
        // Show character selection modal
        await i.showModal({
          title: 'Select Your Character',
          customId: `char_select_like_${postId}`,
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 4, // Text Input
                  custom_id: 'character_name',
                  label: 'Your Character Name',
                  style: 1, // Short style
                  placeholder: 'Enter your character\'s name',
                  required: true
                }
              ]
            }
          ]
        });
      } 
      else if (action === 'comment') {
        // Show comment modal with character selection
        await i.showModal({
          title: 'Instagram Comment',
          customId: `char_comment_${postId}`,
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 4, // Text Input
                  custom_id: 'character_name',
                  label: 'Your Character Name',
                  style: 1, // Short style
                  placeholder: 'Enter your character\'s name',
                  required: true
                }
              ]
            },
            {
              type: 1, // Action Row
              components: [
                {
                  type: 4, // Text Input
                  custom_id: 'comment_text',
                  label: 'Comment',
                  style: 2, // Paragraph style
                  placeholder: 'What does your character want to say?',
                  required: true
                }
              ]
            }
          ]
        });
      }
      else if (action === 'share') {
        // Show character selection modal for sharing
        await i.showModal({
          title: 'Share Post',
          customId: `char_share_${postId}`,
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 4, // Text Input
                  custom_id: 'character_name',
                  label: 'Your Character Name',
                  style: 1, // Short style
                  placeholder: 'Enter your character\'s name',
                  required: true
                }
              ]
            },
            {
              type: 1, // Action Row
              components: [
                {
                  type: 4, // Text Input
                  custom_id: 'share_text',
                  label: 'Share Comment (Optional)',
                  style: 2, // Paragraph style
                  placeholder: 'Add a message when sharing to your story',
                  required: false
                }
              ]
            }
          ]
        });
      }
      else if (action === 'save') {
        // Just need character name for saving
        await i.showModal({
          title: 'Save to Collection',
          customId: `char_save_${postId}`,
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 4, // Text Input
                  custom_id: 'character_name',
                  label: 'Your Character Name',
                  style: 1, // Short style
                  placeholder: 'Enter your character\'s name',
                  required: true
                }
              ]
            }
          ]
        });
      }
    });
    
    // Set up interaction collector for modal submissions
    const modalFilter = i => i.customId.includes(postId);
    interaction.client.on('interactionCreate', async i => {
      if (!i.isModalSubmit() || !i.customId.includes(postId)) return;
      
      try {
        // Get the character name from the modal
        const characterName = i.fields.getTextInputValue('character_name');
        
        // Find the character in the database
        const character = await playerModel.getPlayerByName(characterName);
        if (!character) {
          return await i.reply({ 
            content: `Character "${characterName}" doesn't exist. Make sure you're using their exact name.`,
            ephemeral: true 
          });
        }
        
        // Verify the user owns this character
        if (character.user_id !== i.user.id) {
          return await i.reply({
            content: `You don't own the character "${characterName}". Please use one of your own characters.`,
            ephemeral: true
          });
        }
        
        // Handle different interaction types
        if (i.customId.includes('like')) {
          // Post like notification in the thread
          await thread.send({
            content: `**${characterName}** liked this post! ❤️`,
            allowedMentions: { parse: [] }
          });
          
          // Acknowledge to the user
          await i.reply({ 
            content: `${characterName} liked this post!`,
            ephemeral: true
          });
        }
        else if (i.customId.includes('comment')) {
          // Get the comment text
          const commentText = i.fields.getTextInputValue('comment_text');
          
          // Create an embed for the comment
          const commentEmbed = new EmbedBuilder()
            .setColor('#E1306C')
            .setAuthor({
              name: `${characterName} (@${characterName.replace(/\s+/g, '_').toLowerCase()})`,
              iconURL: character.image_url || null
            })
            .setDescription(commentText)
            .setTimestamp();
          
          // Send the comment in thread
          await thread.send({ embeds: [commentEmbed] });
          
          // Acknowledge to the user
          await i.reply({
            content: `${characterName} commented on this post!`,
            ephemeral: true
          });
        }
        else if (i.customId.includes('share')) {
          // Get the share text if provided
          let shareText = '';
          try {
            shareText = i.fields.getTextInputValue('share_text');
          } catch (e) {
            // Share text is optional, so it might not exist
          }
          
          // Create message for sharing
          const shareMessage = shareText ? 
            `**${characterName}** shared this post to their story with message: *"${shareText}"*` :
            `**${characterName}** shared this post to their story!`;
          
          // Send share notification to thread
          await thread.send({
            content: shareMessage,
            allowedMentions: { parse: [] }
          });
          
          // Acknowledge to user
          await i.reply({
            content: `${characterName} shared this post to their story!`,
            ephemeral: true
          });
        }
        else if (i.customId.includes('save')) {
          // Send save notification to thread
          await thread.send({
            content: `**${characterName}** saved this post to their collection! 🔖`,
            allowedMentions: { parse: [] }
          });
          
          // Acknowledge to user
          await i.reply({
            content: `${characterName} saved this post to their collection!`,
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error handling modal submission:', error);
        await i.reply({ 
          content: `An error occurred: ${error.message}`,
          ephemeral: true
        });
      }
    });
    
    // We've removed the collector timeout, so this isn't needed anymore
    
  } catch (error) {
    console.error('Error in instagramPost command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = instagramPost;