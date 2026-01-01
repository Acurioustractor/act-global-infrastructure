#!/usr/bin/env node

/**
 * Auto-monitor and deploy when v1.0 is ready
 * Checks every 10 seconds, runs Week 1 setup when both models succeeded
 */

import OpenAI from 'openai';
import { execSync } from 'child_process';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'OPENAI_KEY_REMOVED'
});

const JOBS = {
  v01: 'ftjob-NdLSB8DN6aRtm71xXvh1K6X0',
  v10: 'ftjob-TYiyc0UhliJXkPEbglpQXcK3'
};

let checkCount = 0;

async function checkAndDeploy() {
  checkCount++;
  console.log(`\n[${new Date().toLocaleTimeString()}] Check #${checkCount} - Monitoring v1.0...`);

  try {
    const [v01Job, v10Job] = await Promise.all([
      client.fineTuning.jobs.retrieve(JOBS.v01),
      client.fineTuning.jobs.retrieve(JOBS.v10)
    ]);

    console.log('  v0.1:', v01Job.status);
    console.log('  v1.0:', v10Job.status);

    if (v01Job.status === 'succeeded' && v10Job.status === 'succeeded') {
      console.log('\n🎉 BOTH MODELS READY!\n');
      console.log('✅ v0.1:', v01Job.fine_tuned_model);
      console.log('✅ v1.0:', v10Job.fine_tuned_model);

      // Save completion info
      const modelsReady = {
        v01: {
          jobId: v01Job.id,
          status: v01Job.status,
          fineTunedModel: v01Job.fine_tuned_model,
          createdAt: v01Job.created_at,
          finishedAt: v01Job.finished_at
        },
        v10: {
          jobId: v10Job.id,
          status: v10Job.status,
          fineTunedModel: v10Job.fine_tuned_model,
          createdAt: v10Job.created_at,
          finishedAt: v10Job.finished_at
        },
        readyAt: new Date().toISOString()
      };

      fs.writeFileSync('./MODELS_READY.json', JSON.stringify(modelsReady, null, 2));
      console.log('\n💾 Saved MODELS_READY.json');

      console.log('\n🚀 Starting Week 1 Setup...\n');
      console.log('='.repeat(70));

      // Run Week 1 setup
      execSync('node scripts/week1-setup.mjs', { stdio: 'inherit' });

      console.log('\n' + '='.repeat(70));
      console.log('\n✨ DEPLOYMENT COMPLETE!\n');
      console.log('📄 See WEEK_1_COMPLETE.md for full report');
      console.log('📦 Package ready: packages/act-voice/');
      console.log('\n🚀 Next: Week 2 - ACT Farm site integration\n');

      process.exit(0);
    } else if (v10Job.status === 'running') {
      // Get latest event
      const events = await client.fineTuning.jobs.listEvents(v10Job.id, { limit: 1 });
      if (events.data[0]) {
        console.log('  Latest:', events.data[0].message);
      }
      console.log('  ⏳ Still processing... checking again in 10 seconds');
    } else if (v10Job.status === 'failed') {
      console.error('\n❌ v1.0 training FAILED!');
      console.error('Error:', v10Job.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error checking status:', error.message);
  }
}

console.log('🔍 Auto-Deploy Monitor Started');
console.log('Checking v1.0 status every 10 seconds...');
console.log('Will auto-run Week 1 setup when ready.\n');

// Check immediately
await checkAndDeploy();

// Then check every 10 seconds
const interval = setInterval(async () => {
  await checkAndDeploy();
}, 10000);

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Monitoring stopped by user');
  clearInterval(interval);
  process.exit(0);
});
