#!/usr/bin/env node
/**
 * Discord Agent Bot
 *
 * Primary interface for interacting with ACT agents via Discord:
 * - @ACT mentions to send requests
 * - Voice notes → transcription → tasks
 * - Approve/reject buttons for reviews
 * - Live task updates in threads
 */

import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, EmbedBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { dispatch } from './agent-dispatcher.mjs';
import { executeTask } from './agent-executor.mjs';
import OpenAI from 'openai';

// Import cultivator execution (lazy load to avoid circular deps)
let executeProposalFn = null;
async function loadCultivator() {
  if (!executeProposalFn) {
    try {
      const cultivator = await import('../../scripts/cultivator-agent.mjs');
      // The cultivator exports are in the module, we'll call supabase directly
    } catch (e) {
      console.warn('Cultivator module not loaded:', e.message);
    }
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI();

// Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const COMMAND_CHANNEL = process.env.DISCORD_COMMAND_CHANNEL; // Optional: restrict to specific channel

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MESSAGE HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Handle @ACT mentions
 */
async function handleMention(message) {
  // Remove the mention from the message
  const content = message.content.replace(/<@!?\d+>/g, '').trim();

  if (!content) {
    await message.reply('What would you like me to do? Just @ACT followed by your request.');
    return;
  }

  console.log(`📨 Discord request: "${content.substring(0, 50)}..."`);

  // Show typing indicator
  await message.channel.sendTyping();

  try {
    // Dispatch to agent
    const result = await dispatch({
      message: content,
      source: 'discord',
      context: {
        channel_id: message.channel.id,
        message_id: message.id,
        thread_id: message.thread?.id,
        guild_id: message.guild?.id,
        notify_channels: ['discord']
      },
      requestedBy: message.author.username
    });

    // Create thread for task updates
    const thread = await message.startThread({
      name: `🤖 ${result.task.title.substring(0, 90)}`,
      autoArchiveDuration: 60
    });

    // Acknowledge
    await thread.send(`**${result.agentName}** is working on this...\n\n> ${result.task.title}`);

    // Update task with thread info
    await supabase
      .from('agent_task_queue')
      .update({
        reply_to: {
          channel: 'discord',
          channel_id: message.channel.id,
          thread_id: thread.id
        }
      })
      .eq('id', result.task.id);

    // Execute immediately if agent has autonomy
    const { data: agent } = await supabase
      .from('agents')
      .select('autonomy_level')
      .eq('id', result.agent)
      .single();

    if (agent?.autonomy_level >= 2) {
      const execResult = await executeTask(result.task.id);

      if (execResult.needsReview) {
        // Show result with approve/reject buttons
        await sendReviewMessage(thread, result.task.id, execResult.output);
      } else if (execResult.success) {
        // Show completed result
        await thread.send(`✅ **Done!**\n\n${formatOutput(execResult.output)}`);
      } else {
        await thread.send(`❌ **Failed:** ${execResult.error}`);
      }
    }

  } catch (err) {
    console.error('Failed to handle mention:', err);
    await message.reply(`❌ Something went wrong: ${err.message}`);
  }
}

/**
 * Handle voice notes
 */
async function handleVoiceNote(message) {
  const attachment = message.attachments.find(a =>
    a.contentType?.startsWith('audio/') || a.name?.endsWith('.ogg')
  );

  if (!attachment) return;

  console.log(`🎤 Voice note received from ${message.author.username}`);

  // Download and transcribe
  try {
    await message.channel.sendTyping();

    const response = await fetch(attachment.url);
    const buffer = await response.arrayBuffer();

    // Transcribe with Whisper
    const file = new File([buffer], attachment.name || 'voice.ogg', {
      type: attachment.contentType || 'audio/ogg'
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1'
    });

    const text = transcription.text;
    console.log(`   Transcribed: "${text.substring(0, 50)}..."`);

    // Reply with transcription
    await message.reply(`📝 **Transcription:**\n> ${text}\n\nProcessing as task...`);

    // Dispatch as task
    const result = await dispatch({
      message: text,
      source: 'voice',
      context: {
        channel_id: message.channel.id,
        message_id: message.id,
        attachment_url: attachment.url
      },
      requestedBy: message.author.username
    });

    await message.channel.send(`🤖 **${result.agentName}** assigned to: ${result.task.title}`);

  } catch (err) {
    console.error('Voice note processing failed:', err);
    await message.reply(`❌ Failed to process voice note: ${err.message}`);
  }
}

/**
 * Send outreach approval message with buttons
 * Called by cultivator agent when proposing outreach
 */
export async function sendOutreachApproval(channelId, proposal, context) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`Channel not found: ${channelId}`);
    return false;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🌱 Cultivator: Outreach Suggestion`)
    .setColor(0x00AE86)
    .addFields(
      { name: '👤 Contact', value: context.contact?.full_name || 'Unknown', inline: true },
      { name: '📞 Channel', value: (proposal.execution_channel || 'unknown').toUpperCase(), inline: true },
      { name: '📅 Days Silent', value: context.daysSinceContact?.toString() || '?', inline: true },
      { name: '🌡️ Temperature', value: `${context.health?.temperature || '?'}/100`, inline: true },
      { name: '💬 Message', value: `\`\`\`${(proposal.action_payload?.message || '').slice(0, 900)}\`\`\``, inline: false }
    )
    .setFooter({ text: `Proposal ID: ${proposal.id}` })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`outreach_approve_${proposal.id}`)
        .setLabel('✅ Send')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`outreach_edit_${proposal.id}`)
        .setLabel('✏️ Edit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`outreach_skip_${proposal.id}`)
        .setLabel('⏭️ Skip')
        .setStyle(ButtonStyle.Secondary)
    );

  try {
    await channel.send({ embeds: [embed], components: [row] });
    return true;
  } catch (err) {
    console.error('Failed to send outreach approval:', err);
    return false;
  }
}

/**
 * Send review message with buttons
 */
async function sendReviewMessage(channel, taskId, output) {
  const preview = formatOutput(output).substring(0, 1500);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_${taskId}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_${taskId}`)
        .setLabel('❌ Reject')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`view_${taskId}`)
        .setLabel('👁️ View Full')
        .setStyle(ButtonStyle.Secondary)
    );

  await channel.send({
    content: `👁️ **Needs Review:**\n\n${preview}${preview.length >= 1500 ? '...' : ''}`,
    components: [row]
  });
}

/**
 * Format agent output for display
 */
function formatOutput(output) {
  if (!output) return '(no output)';
  if (typeof output === 'string') return output;
  if (output.content) return output.content;
  if (output.result) return output.result;
  if (output.summary) return output.summary;
  return JSON.stringify(output, null, 2);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUTTON HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleButtonInteraction(interaction) {
  const [action, ...idParts] = interaction.customId.split('_');
  const taskId = idParts.join('_'); // Handle UUIDs with underscores

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OUTREACH APPROVAL (from Cultivator agent)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === 'outreach') {
    const [subAction, proposalId] = [idParts[0], idParts.slice(1).join('_')];

    if (subAction === 'approve') {
      await interaction.deferUpdate();

      try {
        // Approve the proposal
        await supabase.rpc('approve_proposal', {
          proposal_id: proposalId,
          reviewer: interaction.user.username,
          notes: 'Approved via Discord'
        });

        // Get proposal details for execution
        const { data: proposal } = await supabase
          .from('agent_proposals')
          .select('*')
          .eq('id', proposalId)
          .single();

        if (!proposal) {
          await interaction.editReply({
            content: `❌ Proposal not found: ${proposalId}`,
            components: []
          });
          return;
        }

        // Execute the outreach
        const { ActionExecutor } = await import('../../scripts/lib/action-executor.mjs');
        const executor = new ActionExecutor({ agentId: 'cultivator', verbose: false });

        const payload = proposal.action_payload;
        const result = await executor.executeOutreach({
          contact_id: proposal.target_contact_id,
          contact_phone: proposal.execution_channel === 'signal' ? payload?.to : null,
          contact_email: proposal.execution_channel === 'email' ? payload?.to : null,
          message: payload?.message,
          channel: proposal.execution_channel,
          followup_days: payload?.followup_days || 14,
          agent_name: 'cultivator'
        });

        // Update proposal as completed
        await supabase
          .from('agent_proposals')
          .update({
            status: result.success ? 'completed' : 'failed',
            execution_completed_at: new Date().toISOString(),
            execution_result: result,
            reviewed_by: interaction.user.username,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', proposalId);

        if (result.success) {
          await interaction.editReply({
            content: `✅ **Sent!** Approved by ${interaction.user.username}\n\n📤 Message delivered via ${proposal.execution_channel}\n📅 Follow-up scheduled`,
            components: []
          });
        } else {
          await interaction.editReply({
            content: `❌ **Failed to send:** ${result.error || 'Unknown error'}\n\nApproved by ${interaction.user.username}`,
            components: []
          });
        }

        console.log(`✅ Outreach ${proposalId} approved and ${result.success ? 'sent' : 'failed'} by ${interaction.user.username}`);

      } catch (err) {
        console.error('Outreach approval failed:', err);
        await interaction.editReply({
          content: `❌ **Error:** ${err.message}`,
          components: []
        });
      }
      return;
    }

    if (subAction === 'skip') {
      await interaction.deferUpdate();

      await supabase.rpc('reject_proposal', {
        proposal_id: proposalId,
        reviewer: interaction.user.username,
        notes: 'Skipped via Discord'
      });

      await interaction.editReply({
        content: `⏭️ **Skipped** by ${interaction.user.username}`,
        components: []
      });

      console.log(`⏭️ Outreach ${proposalId} skipped by ${interaction.user.username}`);
      return;
    }

    if (subAction === 'edit') {
      // For now, show the message and let user reply with edit
      const { data: proposal } = await supabase
        .from('agent_proposals')
        .select('action_payload')
        .eq('id', proposalId)
        .single();

      await interaction.reply({
        content: `✏️ **Edit Message**\n\nCurrent message:\n\`\`\`\n${proposal?.action_payload?.message || 'N/A'}\n\`\`\`\n\nReply to this message with your edited version, then click Approve.`,
        ephemeral: true
      });
      return;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TASK APPROVAL (existing flow)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === 'approve') {
    await interaction.deferUpdate();

    // Update task
    await supabase
      .from('agent_task_queue')
      .update({
        status: 'done',
        review_decision: 'approved',
        reviewed_by: interaction.user.username,
        reviewed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    await interaction.editReply({
      content: `✅ **Approved by ${interaction.user.username}**`,
      components: []
    });

    console.log(`✅ Task ${taskId} approved by ${interaction.user.username}`);
  }

  else if (action === 'reject') {
    await interaction.deferUpdate();

    // Update task
    await supabase
      .from('agent_task_queue')
      .update({
        status: 'rejected',
        review_decision: 'rejected',
        reviewed_by: interaction.user.username,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    await interaction.editReply({
      content: `❌ **Rejected by ${interaction.user.username}**`,
      components: []
    });

    console.log(`❌ Task ${taskId} rejected by ${interaction.user.username}`);
  }

  else if (action === 'view') {
    // Get full output
    const { data: task } = await supabase
      .from('agent_task_queue')
      .select('*')
      .eq('id', taskId)
      .single();

    const fullOutput = formatOutput(task?.output);

    // Send as ephemeral message (only visible to user)
    await interaction.reply({
      content: `**Full Output:**\n\n${fullOutput.substring(0, 1900)}`,
      ephemeral: true
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

client.once(Events.ClientReady, (c) => {
  console.log(`
🤖 ACT Discord Agent Bot
━━━━━━━━━━━━━━━━━━━━━━━━━

Logged in as: ${c.user.tag}
Servers: ${c.guilds.cache.size}

Commands:
  @ACT <request>     Send task to agents
  Voice note         Auto-transcribe & dispatch

Ready to serve!
`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check for @ACT mention
  if (message.mentions.has(client.user)) {
    await handleMention(message);
    return;
  }

  // Check for voice note
  if (message.attachments.size > 0) {
    const hasVoice = message.attachments.some(a =>
      a.contentType?.startsWith('audio/') || a.name?.endsWith('.ogg')
    );
    if (hasVoice) {
      await handleVoiceNote(message);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// START BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (!BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN not set');
  console.log('Set it in your .env file or environment');
  process.exit(1);
}

client.login(BOT_TOKEN).catch(err => {
  console.error('Failed to login:', err.message);
  process.exit(1);
});

export default client;
