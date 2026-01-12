#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: 'OPENAI_KEY_REMOVED'
});

const datasetPath = './training-data/act-voice-training-dataset-v1.0-2026-01-01.jsonl';

console.log('🚀 Deploying ACT Voice v1.0 Fine-tuning Job');
console.log('==========================================\n');

try {
  // Step 1: Upload training file
  console.log('📤 Step 1: Uploading training file...');
  console.log(`   File: ${datasetPath}`);
  console.log('   Size: 120 examples');
  console.log('   Quality: 96/100 (Excellent)\n');

  const fileResponse = await client.files.create({
    file: fs.createReadStream(datasetPath),
    purpose: 'fine-tune'
  });

  console.log('✅ File uploaded successfully!');
  console.log(`   File ID: ${fileResponse.id}\n`);

  // Step 2: Create fine-tuning job
  console.log('🔧 Step 2: Creating fine-tuning job...');
  console.log('   Base model: gpt-4o-mini-2024-07-18');
  console.log('   Suffix: act-voice-v1-0');
  console.log('   Epochs: 3\n');

  const jobResponse = await client.fineTuning.jobs.create({
    training_file: fileResponse.id,
    model: 'gpt-4o-mini-2024-07-18',
    suffix: 'act-voice-v1-0',
    hyperparameters: {
      n_epochs: 3
    }
  });

  console.log('✅ Fine-tuning job created successfully!\n');
  console.log('📊 Job Details:');
  console.log('==========================================');
  console.log(`Job ID: ${jobResponse.id}`);
  console.log(`Status: ${jobResponse.status}`);
  console.log(`Model: ${jobResponse.model}`);
  console.log(`Fine-tuned model name: ${jobResponse.fine_tuned_model || 'Pending (will be: gpt-4o-mini-2024-07-18:act-voice-v1-0)'}`);
  console.log('==========================================\n');

  // Step 3: Save job info
  const jobInfo = {
    job_id: jobResponse.id,
    file_id: fileResponse.id,
    status: jobResponse.status,
    model: jobResponse.model,
    suffix: 'act-voice-v1-0',
    fine_tuned_model: jobResponse.fine_tuned_model || 'Pending',
    created_at: new Date().toISOString(),
    dataset: {
      path: datasetPath,
      examples: 120,
      quality_score: 96,
      lcaa_coverage: {
        listen: '27.5%',
        curiosity: '20.8%',
        action: '59.2%',
        art: '33.3%'
      },
      pillar_coverage: '100%',
      voice_metrics: {
        regenerative_metaphors: '45.8%',
        community_centered: '95.8%',
        lcaa_language: '88.3%'
      }
    },
    expected_completion: '10-30 minutes',
    monitor_url: 'https://platform.openai.com/finetune'
  };

  fs.writeFileSync('./training-data/v1.0-job-info.json', JSON.stringify(jobInfo, null, 2));
  console.log('💾 Job info saved to: training-data/v1.0-job-info.json\n');

  // Success summary
  console.log('🎉 SUCCESS! v1.0 Deployment Complete');
  console.log('==========================================');
  console.log('Next Steps:');
  console.log('1. Monitor training: https://platform.openai.com/finetune');
  console.log('2. Wait 10-30 minutes for completion');
  console.log('3. Test when ready using job ID above');
  console.log('4. Compare with v0.1 (ftjob-NdLSB8DN6aRtm71xXvh1K6X0)');
  console.log('==========================================\n');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}
