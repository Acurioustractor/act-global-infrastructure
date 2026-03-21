#!/usr/bin/env node

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'OPENAI_KEY_REMOVED'
});

async function checkDetailed() {
  const job = await client.fineTuning.jobs.retrieve('ftjob-TYiyc0UhliJXkPEbglpQXcK3');

  console.log('\n🔍 v1.0 Detailed Status\n');
  console.log('Job ID:', job.id);
  console.log('Status:', job.status);
  console.log('Created:', new Date(job.created_at * 1000).toLocaleString());
  console.log('Model:', job.model);
  console.log('Fine-tuned Model:', job.fine_tuned_model || 'Not ready yet');

  if (job.trained_tokens) {
    console.log('Trained Tokens:', job.trained_tokens);
  }

  if (job.finished_at) {
    console.log('Finished:', new Date(job.finished_at * 1000).toLocaleString());
  }

  if (job.estimated_finish) {
    console.log('Estimated Finish:', new Date(job.estimated_finish * 1000).toLocaleString());
  }

  // Show recent events
  console.log('\n📜 Recent Events:');
  const events = await client.fineTuning.jobs.listEvents(job.id, { limit: 5 });
  events.data.forEach(event => {
    console.log(`  [${new Date(event.created_at * 1000).toLocaleTimeString()}] ${event.message}`);
  });
}

checkDetailed().catch(console.error);
