import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: 'OPENAI_KEY_REMOVED'
});

console.log('🚀 ACT Voice v0.1 Deployment Starting...');
console.log('='.repeat(60));

const datasetPath = './training-data/act-voice-training-dataset-v2-2026-01-01.jsonl';

try {
  // Upload file
  console.log('\n📤 Step 1: Uploading training file...');
  const fileResponse = await client.files.create({
    file: fs.createReadStream(datasetPath),
    purpose: 'fine-tune'
  });
  
  console.log(`✅ File uploaded: ${fileResponse.id}`);
  console.log(`   Size: ${fileResponse.bytes} bytes`);
  
  // Create fine-tuning job
  console.log('\n🎯 Step 2: Creating fine-tuning job...');
  const jobResponse = await client.fineTuning.jobs.create({
    training_file: fileResponse.id,
    model: 'gpt-4o-mini-2024-07-18',
    suffix: 'act-voice-v0-1',
    hyperparameters: { n_epochs: 3 }
  });
  
  console.log(`✅ Job created: ${jobResponse.id}`);
  console.log(`   Status: ${jobResponse.status}`);
  console.log(`   Model: ${jobResponse.model}`);
  
  // Save job info
  const jobInfo = {
    job_id: jobResponse.id,
    file_id: fileResponse.id,
    status: jobResponse.status,
    created_at: new Date(jobResponse.created_at * 1000).toISOString(),
    model: jobResponse.model,
    suffix: 'act-voice-v0-1',
    fine_tuned_model: jobResponse.fine_tuned_model
  };
  
  fs.writeFileSync(
    './training-data/v0.1-job-info.json',
    JSON.stringify(jobInfo, null, 2)
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Deployment initiated successfully!');
  console.log(`📊 Job ID: ${jobResponse.id}`);
  console.log(`⏱️  Training will take 10-30 minutes`);
  console.log(`🔗 Monitor: https://platform.openai.com/finetune`);
  console.log('\n💾 Job info saved to: training-data/v0.1-job-info.json');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
