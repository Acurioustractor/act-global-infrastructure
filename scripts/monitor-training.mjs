#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'OPENAI_KEY_REMOVED'
});

const JOBS = {
  v01: 'ftjob-NdLSB8DN6aRtm71xXvh1K6X0',
  v10: 'ftjob-TYiyc0UhliJXkPEbglpQXcK3'
};

async function checkJobStatus(jobId, version) {
  try {
    const job = await client.fineTuning.jobs.retrieve(jobId);

    return {
      version,
      jobId,
      status: job.status,
      fineTunedModel: job.fine_tuned_model,
      createdAt: job.created_at,
      finishedAt: job.finished_at,
      error: job.error
    };
  } catch (error) {
    return {
      version,
      jobId,
      status: 'error',
      error: error.message
    };
  }
}

async function monitorAll() {
  console.log('🔍 Monitoring ACT Voice Fine-tuning Jobs\n');
  console.log('=' .repeat(60));

  const v01Status = await checkJobStatus(JOBS.v01, 'v0.1');
  const v10Status = await checkJobStatus(JOBS.v10, 'v1.0');

  // Display v0.1 status
  console.log('\n📊 v0.1 Status (90 examples, 88/100 quality)');
  console.log('-'.repeat(60));
  console.log(`Job ID: ${v01Status.jobId}`);
  console.log(`Status: ${getStatusEmoji(v01Status.status)} ${v01Status.status.toUpperCase()}`);
  if (v01Status.fineTunedModel) {
    console.log(`Model: ${v01Status.fineTunedModel}`);
  }
  if (v01Status.error) {
    console.log(`Error: ${v01Status.error}`);
  }

  // Display v1.0 status
  console.log('\n📊 v1.0 Status (120 examples, 96/100 quality)');
  console.log('-'.repeat(60));
  console.log(`Job ID: ${v10Status.jobId}`);
  console.log(`Status: ${getStatusEmoji(v10Status.status)} ${v10Status.status.toUpperCase()}`);
  if (v10Status.fineTunedModel) {
    console.log(`Model: ${v10Status.fineTunedModel}`);
  }
  if (v10Status.error) {
    console.log(`Error: ${v10Status.error}`);
  }

  // Check if both complete
  const bothComplete = v01Status.status === 'succeeded' && v10Status.status === 'succeeded';

  console.log('\n' + '='.repeat(60));

  if (bothComplete) {
    console.log('\n🎉 BOTH MODELS READY FOR USE!\n');
    console.log('✅ v0.1:', v01Status.fineTunedModel);
    console.log('✅ v1.0:', v10Status.fineTunedModel);
    console.log('\n🚀 Next: Run Week 1 implementation');
    console.log('   node scripts/week1-setup.mjs\n');

    // Save completion info
    fs.writeFileSync('./MODELS_READY.json', JSON.stringify({
      v01: v01Status,
      v10: v10Status,
      readyAt: new Date().toISOString()
    }, null, 2));

    return true;
  } else {
    console.log('\n⏳ Training in progress...');
    console.log('   Run this script again to check status');
    console.log('   Or visit: https://platform.openai.com/finetune\n');
    return false;
  }
}

function getStatusEmoji(status) {
  const emojis = {
    'validating_files': '🔍',
    'queued': '⏰',
    'running': '🏃',
    'succeeded': '✅',
    'failed': '❌',
    'cancelled': '🚫'
  };
  return emojis[status] || '❓';
}

// Run monitoring
monitorAll().then(ready => {
  process.exit(ready ? 0 : 1);
});
