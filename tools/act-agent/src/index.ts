#!/usr/bin/env node
import { program } from 'commander';
import { createTask, updateTask, getTask, addComment, getComments, extractPageId } from './notion.js';

program
  .name('act-agent')
  .description('CLI for ACT Agent Kanban workflow')
  .version('1.0.0');

// Create a new task
program
  .command('create')
  .description('Create a new task')
  .argument('<name>', 'Task name')
  .option('-p, --project <project>', 'Project name (Empathy Ledger, JusticeHub, etc.)')
  .option('--priority <priority>', 'Priority (High, Medium, Low)', 'Medium')
  .option('-s, --status <status>', 'Current status description')
  .action(async (name, options) => {
    try {
      const task = await createTask({
        name,
        project: options.project,
        priority: options.priority,
        currentStatus: options.status
      });
      console.log(`✓ Created task: ${(task as any).url}`);
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Update current status
program
  .command('status')
  .description('Update the current status of a task')
  .argument('<task>', 'Task URL or ID')
  .argument('<status>', 'New status description')
  .action(async (task, status) => {
    try {
      await updateTask(task, {
        'Current Status': { rich_text: [{ text: { content: status } }] }
      });
      console.log(`✓ Updated status: "${status}"`);
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Block a task and ask a question
program
  .command('block')
  .description('Block a task and ask a question in comments')
  .argument('<task>', 'Task URL or ID')
  .argument('<question>', 'Question to ask the user')
  .action(async (task, question) => {
    try {
      // Set blocked checkbox and update status with the question
      await updateTask(task, {
        Blocked: { checkbox: true },
        'Current Status': { rich_text: [{ text: { content: `⏸️ BLOCKED: ${question}` } }] }
      });

      // Try to add comment, but don't fail if permissions aren't there
      try {
        await addComment(task, `🤖 Agent Question:\n\n${question}\n\n---\nReply to this comment to unblock.`);
        console.log(`✓ Task blocked. Question posted in comments.`);
      } catch {
        console.log(`✓ Task blocked. Question saved in Current Status field.`);
        console.log(`  (Note: Enable comment permissions in Notion integration for comment support)`);
      }
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Unblock a task
program
  .command('unblock')
  .description('Unblock a task')
  .argument('<task>', 'Task URL or ID')
  .action(async (task) => {
    try {
      await updateTask(task, {
        Blocked: { checkbox: false },
        'Current Status': { rich_text: [{ text: { content: '▶️ Resumed after user response' } }] }
      });
      console.log(`✓ Task unblocked`);
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Wait for a new comment (polling)
program
  .command('wait-for-comment')
  .description('Poll until a new comment appears, then return it')
  .argument('<task>', 'Task URL or ID')
  .option('-i, --interval <seconds>', 'Polling interval in seconds', '5')
  .option('-t, --timeout <minutes>', 'Timeout in minutes (0 = infinite)', '0')
  .action(async (task, options) => {
    try {
      const interval = parseInt(options.interval) * 1000;
      const timeout = parseInt(options.timeout) * 60 * 1000;
      const startTime = Date.now();

      // Get initial comment count
      const initialComments = await getComments(task);
      const initialCount = initialComments.results.length;
      const lastCommentId = initialCount > 0 ? initialComments.results[initialCount - 1].id : null;

      console.log(`Waiting for new comment... (polling every ${options.interval}s)`);

      while (true) {
        // Check timeout
        if (timeout > 0 && Date.now() - startTime > timeout) {
          console.error('Timeout waiting for comment');
          process.exit(1);
        }

        // Wait
        await new Promise(resolve => setTimeout(resolve, interval));

        // Check for new comments
        const comments = await getComments(task);

        if (comments.results.length > initialCount) {
          // Find the newest comment that's not from the bot
          const newComments = comments.results.filter((c: any) => c.id !== lastCommentId);
          const userComment = newComments.find((c: any) =>
            c.created_by?.type === 'person' ||
            !c.rich_text?.[0]?.text?.content?.startsWith('🤖')
          );

          if (userComment) {
            const text = (userComment as any).rich_text
              ?.map((rt: any) => rt.plain_text)
              .join('') || '';

            console.log(`\n✓ New comment received:`);
            console.log(`---`);
            console.log(text);
            console.log(`---`);

            // Output just the text for piping
            process.stdout.write(`\n${text}`);
            process.exit(0);
          }
        }

        process.stdout.write('.');
      }
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Complete a task
program
  .command('complete')
  .description('Mark a task as complete')
  .argument('<task>', 'Task URL or ID')
  .option('-s, --summary <summary>', 'Completion summary')
  .action(async (task, options) => {
    try {
      const properties: Record<string, any> = {
        Status: { select: { name: 'Done' } },
        Blocked: { checkbox: false },
        Completed: { date: { start: new Date().toISOString().split('T')[0] } }
      };

      if (options.summary) {
        properties['Current Status'] = {
          rich_text: [{ text: { content: `✅ ${options.summary}` } }]
        };
      } else {
        properties['Current Status'] = {
          rich_text: [{ text: { content: '✅ Completed' } }]
        };
      }

      await updateTask(task, properties);
      console.log(`✓ Task completed`);
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Show task details
program
  .command('show')
  .description('Show task details')
  .argument('<task>', 'Task URL or ID')
  .action(async (task) => {
    try {
      const page = await getTask(task) as any;
      const props = page.properties;

      console.log(`\nTask: ${props.Name?.title?.[0]?.plain_text || 'Untitled'}`);
      console.log(`URL: ${page.url}`);
      console.log(`Status: ${props.Status?.select?.name || 'None'}`);
      console.log(`Blocked: ${props.Blocked?.checkbox ? '🔴 YES' : '🟢 No'}`);
      console.log(`Current Status: ${props['Current Status']?.rich_text?.[0]?.plain_text || 'None'}`);
      console.log(`Project: ${props.Project?.select?.name || 'None'}`);
      console.log(`Priority: ${props.Priority?.select?.name || 'None'}`);
    } catch (error: any) {
      console.error(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
