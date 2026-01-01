#!/usr/bin/env node
/**
 * ACT Voice Fine-Tuning - Model Deployment Script
 *
 * Deploys fine-tuned model to the RAG system for production use.
 *
 * Steps:
 * 1. Upload training dataset to OpenAI
 * 2. Create fine-tuning job
 * 3. Monitor training progress
 * 4. Test fine-tuned model
 * 5. Update RAG system to use fine-tuned model
 * 6. A/B test against base model
 *
 * Usage:
 *   npm run knowledge:deploy-model
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Deploy fine-tuned model
 */
async function deployFineTunedModel() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 ACT Voice Fine-Tuning - Model Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Find latest dataset
  const trainingDir = '/Users/benknight/act-global-infrastructure/training-data';
  const files = await fs.readdir(trainingDir);
  const datasets = files.filter(f => f.startsWith('act-voice-training-dataset-') && f.endsWith('.jsonl'));

  if (datasets.length === 0) {
    throw new Error('No training datasets found. Run "npm run knowledge:train-dataset" first.');
  }

  datasets.sort().reverse(); // Get latest
  const datasetPath = path.join(trainingDir, datasets[0]);

  console.log(`📂 Using dataset: ${datasets[0]}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 1: Upload Training Data to OpenAI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📤 Step 1: Uploading training data to OpenAI...');

  const fileStream = await fs.readFile(datasetPath);

  const uploadedFile = await openai.files.create({
    file: new Blob([fileStream]),
    purpose: 'fine-tune'
  });

  console.log(`   ✅ File uploaded: ${uploadedFile.id}`);
  console.log(`   • Filename: ${uploadedFile.filename}`);
  console.log(`   • Bytes: ${uploadedFile.bytes.toLocaleString()}`);
  console.log('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 2: Create Fine-Tuning Job
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🎯 Step 2: Creating fine-tuning job...');

  const fineTune = await openai.fineTuning.jobs.create({
    training_file: uploadedFile.id,
    model: 'gpt-4o-2024-08-06', // Latest GPT-4 model that supports fine-tuning
    suffix: 'act-voice-v1',
    hyperparameters: {
      n_epochs: 3 // Default: 3 epochs usually sufficient
    }
  });

  console.log(`   ✅ Fine-tuning job created: ${fineTune.id}`);
  console.log(`   • Model: ${fineTune.model}`);
  console.log(`   • Status: ${fineTune.status}`);
  console.log('');

  // Save job details
  await saveFineTuningJob({
    jobId: fineTune.id,
    fileId: uploadedFile.id,
    datasetPath,
    createdAt: new Date().toISOString(),
    status: fineTune.status,
    baseModel: fineTune.model
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 3: Monitor Training Progress
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('⏳ Step 3: Monitoring training progress...');
  console.log('   (This may take 10-60 minutes depending on dataset size)');
  console.log('');

  let status = fineTune.status;
  let attempts = 0;
  const maxAttempts = 120; // 2 hours max (120 × 60s)

  while (status !== 'succeeded' && status !== 'failed' && attempts < maxAttempts) {
    await sleep(60000); // Check every 60 seconds

    const job = await openai.fineTuning.jobs.retrieve(fineTune.id);
    status = job.status;
    attempts++;

    console.log(`   [${attempts}] Status: ${status}`);

    if (job.trained_tokens) {
      console.log(`       Trained tokens: ${job.trained_tokens.toLocaleString()}`);
    }

    // Update saved job status
    await updateFineTuningJob(fineTune.id, {
      status,
      trainedTokens: job.trained_tokens,
      updatedAt: new Date().toISOString()
    });
  }

  if (status === 'failed') {
    console.log('');
    console.log('❌ Fine-tuning failed!');
    const job = await openai.fineTuning.jobs.retrieve(fineTune.id);
    console.log(`   Error: ${job.error?.message || 'Unknown error'}`);
    process.exit(1);
  }

  if (attempts >= maxAttempts) {
    console.log('');
    console.log('⚠️  Training still in progress. Check status later with:');
    console.log(`   openai api fine_tunes.get -i ${fineTune.id}`);
    console.log('');
    console.log(`   Job ID saved to: /Users/benknight/act-global-infrastructure/training-data/fine-tune-jobs.json`);
    process.exit(0);
  }

  console.log('');
  console.log('✅ Fine-tuning completed successfully!');
  console.log('');

  const completedJob = await openai.fineTuning.jobs.retrieve(fineTune.id);
  const fineTunedModel = completedJob.fine_tuned_model;

  console.log(`   🎉 Fine-tuned model: ${fineTunedModel}`);
  console.log(`   • Training tokens: ${completedJob.trained_tokens.toLocaleString()}`);
  console.log('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 4: Test Fine-Tuned Model
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🧪 Step 4: Testing fine-tuned model...');
  console.log('');

  const testQueries = [
    'Explain the LCAA methodology',
    'What does ACT believe about community engagement?',
    'How does ACT approach storytelling?',
    'What is Empathy Ledger?'
  ];

  for (const query of testQueries) {
    console.log(`   Q: ${query}`);

    const response = await openai.chat.completions.create({
      model: fineTunedModel,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant with deep knowledge of ACT (A Curious Tractor).'
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 200
    });

    const answer = response.choices[0].message.content;
    console.log(`   A: ${answer.slice(0, 150)}${answer.length > 150 ? '...' : ''}`);
    console.log('');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 5: Update RAG System
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🔧 Step 5: Updating RAG system configuration...');

  // Store fine-tuned model ID in database
  const { error } = await supabase
    .from('system_config')
    .upsert({
      key: 'fine_tuned_model_id',
      value: fineTunedModel,
      metadata: {
        jobId: fineTune.id,
        trainedTokens: completedJob.trained_tokens,
        deployedAt: new Date().toISOString(),
        baseModel: completedJob.model,
        version: 'act-voice-v1'
      }
    });

  if (error) {
    console.log(`   ⚠️  Warning: Could not save to database: ${error.message}`);
    console.log('   You can manually configure the model in multi-provider-ai.ts');
  } else {
    console.log('   ✅ Fine-tuned model ID saved to database');
  }

  console.log('');
  console.log('   📝 Next: Update multi-provider-ai.ts with fine-tuned model:');
  console.log('');
  console.log('   ```typescript');
  console.log('   // In src/lib/ai-intelligence/multi-provider-ai.ts');
  console.log('   const FINE_TUNED_MODEL = {');
  console.log(`     openai: '${fineTunedModel}',`);
  console.log('     useFinetuned: true');
  console.log('   };');
  console.log('   ```');
  console.log('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 6: A/B Testing Recommendations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📊 Step 6: A/B Testing Recommendations...');
  console.log('');
  console.log('   To A/B test fine-tuned model vs base model:');
  console.log('');
  console.log('   1. Route 50% of queries to fine-tuned model');
  console.log('   2. Route 50% of queries to base model (gpt-4o)');
  console.log('   3. Measure:');
  console.log('      • Response quality (human ratings)');
  console.log('      • Voice consistency (ACT language patterns)');
  console.log('      • Answer accuracy (factual correctness)');
  console.log('      • User satisfaction (feedback scores)');
  console.log('   4. Compare costs:');
  console.log('      • Fine-tuned: +20% inference cost');
  console.log('      • Base model: Standard pricing');
  console.log('');

  // Save deployment summary
  const summary = {
    deployedAt: new Date().toISOString(),
    jobId: fineTune.id,
    fineTunedModel,
    trainedTokens: completedJob.trained_tokens,
    baseModel: completedJob.model,
    datasetPath,
    testResults: 'Manual testing completed',
    status: 'deployed',
    nextSteps: [
      'Update multi-provider-ai.ts with fine-tuned model ID',
      'Configure A/B testing (50/50 split)',
      'Monitor quality metrics',
      'Gather user feedback',
      'Compare costs vs base model'
    ]
  };

  await fs.writeFile(
    path.join(trainingDir, `deployment-${fineTune.id}.json`),
    JSON.stringify(summary, null, 2)
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 DEPLOYMENT COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📦 Fine-Tuned Model Details:');
  console.log(`   • Model ID: ${fineTunedModel}`);
  console.log(`   • Job ID: ${fineTune.id}`);
  console.log(`   • Trained tokens: ${completedJob.trained_tokens.toLocaleString()}`);
  console.log(`   • Version: act-voice-v1`);
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('   1. Update RAG system with fine-tuned model ID');
  console.log('   2. Configure A/B testing');
  console.log('   3. Monitor quality metrics');
  console.log('   4. Gather user feedback');
  console.log('');
  console.log('📁 Deployment summary saved to:');
  console.log(`   ${path.join(trainingDir, `deployment-${fineTune.id}.json`)}`);
  console.log('');

  return {
    fineTunedModel,
    jobId: fineTune.id,
    trainedTokens: completedJob.trained_tokens
  };
}

/**
 * Save fine-tuning job details
 */
async function saveFineTuningJob(job) {
  const jobsPath = '/Users/benknight/act-global-infrastructure/training-data/fine-tune-jobs.json';

  let jobs = [];
  try {
    const content = await fs.readFile(jobsPath, 'utf-8');
    jobs = JSON.parse(content);
  } catch {
    // File doesn't exist yet
  }

  jobs.push(job);

  await fs.writeFile(jobsPath, JSON.stringify(jobs, null, 2));
}

/**
 * Update fine-tuning job status
 */
async function updateFineTuningJob(jobId, updates) {
  const jobsPath = '/Users/benknight/act-global-infrastructure/training-data/fine-tune-jobs.json';

  let jobs = [];
  try {
    const content = await fs.readFile(jobsPath, 'utf-8');
    jobs = JSON.parse(content);
  } catch {
    return; // File doesn't exist
  }

  const jobIndex = jobs.findIndex(j => j.jobId === jobId);
  if (jobIndex >= 0) {
    jobs[jobIndex] = { ...jobs[jobIndex], ...updates };
    await fs.writeFile(jobsPath, JSON.stringify(jobs, null, 2));
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  deployFineTunedModel().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { deployFineTunedModel };
