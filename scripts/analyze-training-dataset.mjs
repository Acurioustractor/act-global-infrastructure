#!/usr/bin/env node
/**
 * ACT Voice Fine-Tuning - Dataset Quality Analyzer
 *
 * Analyzes the training dataset for quality, diversity, and potential issues.
 *
 * Checks:
 * - Token distribution (min, max, avg, median)
 * - Content diversity (unique topics, LCAA coverage, pillar coverage)
 * - Quality metrics (length, completeness, formatting)
 * - Potential issues (duplicates, too short, too long, malformed)
 * - Voice consistency (ACT language patterns)
 *
 * Usage:
 *   npm run knowledge:analyze-dataset
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Analyze training dataset quality
 */
async function analyzeDataset(filepath) {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ACT Voice Training Dataset - Quality Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Find latest dataset if no filepath provided
  if (!filepath) {
    const trainingDir = '/Users/benknight/act-global-infrastructure/training-data';
    const files = await fs.readdir(trainingDir);
    const datasets = files.filter(f => f.startsWith('act-voice-training-dataset-') && f.endsWith('.jsonl'));

    if (datasets.length === 0) {
      throw new Error('No training datasets found. Run "npm run knowledge:train-dataset" first.');
    }

    datasets.sort().reverse(); // Get latest
    filepath = path.join(trainingDir, datasets[0]);
    console.log(`📂 Using latest dataset: ${datasets[0]}\n`);
  }

  // Load dataset
  const content = await fs.readFile(filepath, 'utf-8');
  const lines = content.trim().split('\n');
  const examples = lines.map(line => JSON.parse(line));

  console.log(`📊 Loaded ${examples.length} training examples\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Token Distribution Analysis
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📏 Token Distribution Analysis...');

  const tokenCounts = examples.map(ex => estimateTokens(JSON.stringify(ex.messages)));
  const stats = calculateStats(tokenCounts);

  console.log(`   • Min tokens: ${stats.min}`);
  console.log(`   • Max tokens: ${stats.max}`);
  console.log(`   • Average tokens: ${stats.avg.toFixed(0)}`);
  console.log(`   • Median tokens: ${stats.median}`);
  console.log(`   • Total tokens: ${stats.total.toLocaleString()}`);
  console.log('');

  // Check for outliers
  const tooShort = tokenCounts.filter(t => t < 50).length;
  const tooLong = tokenCounts.filter(t => t > 4000).length;

  if (tooShort > 0) {
    console.log(`   ⚠️  Warning: ${tooShort} examples are very short (<50 tokens)`);
  }
  if (tooLong > 0) {
    console.log(`   ⚠️  Warning: ${tooLong} examples are very long (>4000 tokens)`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Content Diversity Analysis
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🎨 Content Diversity Analysis...');

  const topics = new Set();
  const userQueries = examples.map(ex => {
    const userMsg = ex.messages.find(m => m.role === 'user');
    return userMsg?.content || '';
  });

  userQueries.forEach(q => {
    const topic = extractTopic(q);
    if (topic) topics.add(topic);
  });

  console.log(`   • Unique topics: ${topics.size}`);
  console.log(`   • Avg examples per topic: ${(examples.length / topics.size).toFixed(1)}`);

  // Check LCAA coverage
  const lcaaPhases = {
    Listen: userQueries.filter(q => /listen/i.test(q)).length,
    Curiosity: userQueries.filter(q => /curiosity|curious|question/i.test(q)).length,
    Action: userQueries.filter(q => /action|implement|build|do/i.test(q)).length,
    Art: userQueries.filter(q => /art|story|design|beauty/i.test(q)).length
  };

  console.log('\n   LCAA Phase Coverage:');
  Object.entries(lcaaPhases).forEach(([phase, count]) => {
    const percentage = (count / examples.length * 100).toFixed(1);
    console.log(`     • ${phase}: ${count} examples (${percentage}%)`);
  });

  // Check strategic pillar coverage
  const pillars = {
    'Ethical Storytelling': 0,
    'Justice Reimagined': 0,
    'Community Resilience': 0,
    'Circular Economy': 0,
    'Regeneration at Scale': 0,
    'Art of Social Impact': 0
  };

  examples.forEach(ex => {
    const content = JSON.stringify(ex.messages).toLowerCase();
    Object.keys(pillars).forEach(pillar => {
      if (content.includes(pillar.toLowerCase())) {
        pillars[pillar]++;
      }
    });
  });

  console.log('\n   Strategic Pillar Coverage:');
  Object.entries(pillars).forEach(([pillar, count]) => {
    const percentage = (count / examples.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`     • ${pillar.padEnd(25)}: ${count.toString().padStart(3)} (${percentage}%) ${bar}`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Quality Metrics
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n✨ Quality Metrics...');

  const assistantResponses = examples.map(ex => {
    const assistantMsg = ex.messages.find(m => m.role === 'assistant');
    return assistantMsg?.content || '';
  });

  const avgResponseLength = assistantResponses.reduce((sum, r) => sum + r.length, 0) / assistantResponses.length;

  console.log(`   • Avg response length: ${avgResponseLength.toFixed(0)} characters`);

  // Check completeness (has system, user, assistant messages)
  const incomplete = examples.filter(ex =>
    ex.messages.length !== 3 ||
    !ex.messages.find(m => m.role === 'system') ||
    !ex.messages.find(m => m.role === 'user') ||
    !ex.messages.find(m => m.role === 'assistant')
  ).length;

  if (incomplete > 0) {
    console.log(`   ⚠️  Warning: ${incomplete} examples have incomplete message structure`);
  } else {
    console.log(`   ✅ All examples have complete message structure`);
  }

  // Check for empty responses
  const emptyResponses = assistantResponses.filter(r => r.trim().length === 0).length;
  if (emptyResponses > 0) {
    console.log(`   ❌ Error: ${emptyResponses} examples have empty assistant responses`);
  } else {
    console.log(`   ✅ No empty responses`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Voice Consistency Analysis
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n🎤 Voice Consistency Analysis...');

  const voicePatterns = {
    'Regenerative metaphors': /seed|plant|cultivat|harvest|grow|soil|root|branch|ecosystem/i,
    'Community-centered': /community|partner|together|collective|shared|we\b/i,
    'LCAA language': /listen|curiosity|action|art|LCAA/i,
    'Traditional Custodians': /traditional custodian|country|first nations|indigenous/i,
    'Honest about challenges': /learn|challenge|tried|didn\'t work|iteration/i,
    'Anti-jargon': /stakeholder|beneficiar|deliverable|synergy|leverage/i // Should be LOW
  };

  console.log('   Voice Pattern Detection:');

  const patternMatches = {};

  Object.entries(voicePatterns).forEach(([pattern, regex]) => {
    const matches = assistantResponses.filter(r => regex.test(r)).length;
    const percentage = (matches / examples.length * 100).toFixed(1);
    patternMatches[pattern] = { matches, percentage: parseFloat(percentage) };

    const emoji = pattern === 'Anti-jargon'
      ? (matches < examples.length * 0.05 ? '✅' : '⚠️')  // Anti-jargon should be LOW
      : (matches > examples.length * 0.2 ? '✅' : '⚠️');  // Others should be HIGH

    console.log(`     ${emoji} ${pattern.padEnd(30)}: ${matches.toString().padStart(3)} (${percentage}%)`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Duplicate Detection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n🔄 Duplicate Detection...');

  const userQueriesSet = new Set(userQueries);
  const duplicateQueries = userQueries.length - userQueriesSet.size;

  console.log(`   • Unique user queries: ${userQueriesSet.size}`);
  console.log(`   • Duplicate queries: ${duplicateQueries}`);

  if (duplicateQueries > examples.length * 0.1) {
    console.log(`   ⚠️  Warning: High duplicate rate (${(duplicateQueries / examples.length * 100).toFixed(1)}%)`);
  } else {
    console.log(`   ✅ Low duplicate rate (${(duplicateQueries / examples.length * 100).toFixed(1)}%)`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Cost Estimation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n💰 Cost Estimation...');

  const totalTokens = stats.total;
  const trainingCost = (totalTokens / 1000) * 0.008; // $0.008 per 1K tokens for GPT-4 fine-tuning
  const monthlyInferenceCost = 10; // Estimated based on +20% per query × 1000 queries/month

  console.log(`   • Training cost (one-time): $${trainingCost.toFixed(2)}`);
  console.log(`   • Inference premium: +20% per query`);
  console.log(`   • Estimated monthly inference: ~$${monthlyInferenceCost}/month`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Overall Quality Score
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n📊 Overall Quality Score...');

  const qualityScore = calculateQualityScore({
    exampleCount: examples.length,
    uniqueTopics: topics.size,
    lcaaCoverage: Object.values(lcaaPhases).reduce((sum, c) => sum + c, 0) / examples.length,
    pillarCoverage: Object.values(pillars).filter(c => c > 0).length / 6,
    voiceConsistency: (patternMatches['Regenerative metaphors'].percentage +
                      patternMatches['Community-centered'].percentage +
                      patternMatches['LCAA language'].percentage) / 3,
    duplicateRate: duplicateQueries / examples.length,
    antiJargonRate: patternMatches['Anti-jargon'].percentage / 100
  });

  console.log(`   🎯 Quality Score: ${qualityScore.score}/100`);
  console.log(`   ${qualityScore.grade} - ${qualityScore.assessment}`);
  console.log('');

  Object.entries(qualityScore.breakdown).forEach(([metric, score]) => {
    const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
    console.log(`     ${emoji} ${metric.padEnd(30)}: ${score}/100`);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Recommendations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n\n💡 Recommendations...');

  const recommendations = generateRecommendations({
    exampleCount: examples.length,
    uniqueTopics: topics.size,
    lcaaPhases,
    pillars,
    voicePatterns: patternMatches,
    duplicateRate: duplicateQueries / examples.length,
    qualityScore: qualityScore.score
  });

  recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ANALYSIS COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (qualityScore.score >= 75) {
    console.log('🎉 Dataset quality is good! Ready for fine-tuning.');
    console.log('   Next: Upload to OpenAI and start training');
  } else if (qualityScore.score >= 60) {
    console.log('⚠️  Dataset quality is acceptable but could be improved.');
    console.log('   Consider addressing recommendations before fine-tuning.');
  } else {
    console.log('❌ Dataset quality needs improvement before fine-tuning.');
    console.log('   Address critical recommendations first.');
  }

  console.log('');

  return qualityScore;
}

/**
 * Estimate tokens (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text) {
  return Math.round(text.length / 4);
}

/**
 * Calculate statistics from array of numbers
 */
function calculateStats(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: numbers.reduce((sum, n) => sum + n, 0) / numbers.length,
    median: sorted[Math.floor(sorted.length / 2)],
    total: numbers.reduce((sum, n) => sum + n, 0)
  };
}

/**
 * Extract topic from user query
 */
function extractTopic(query) {
  // Remove common question words
  let topic = query
    .replace(/^(what|how|why|when|where|who|explain|describe|tell me about)\s+/i, '')
    .replace(/\?$/, '')
    .trim();

  // Get first few words as topic
  const words = topic.split(/\s+/);
  return words.slice(0, 5).join(' ');
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(metrics) {
  const breakdown = {
    'Example Count': Math.min(100, (metrics.exampleCount / 200) * 100),
    'Topic Diversity': Math.min(100, (metrics.uniqueTopics / 50) * 100),
    'LCAA Coverage': metrics.lcaaCoverage * 100,
    'Pillar Coverage': metrics.pillarCoverage * 100,
    'Voice Consistency': metrics.voiceConsistency,
    'Low Duplicates': (1 - metrics.duplicateRate) * 100,
    'Avoids Jargon': (1 - metrics.antiJargonRate) * 100
  };

  const score = Math.round(
    Object.values(breakdown).reduce((sum, s) => sum + s, 0) / Object.keys(breakdown).length
  );

  let grade, assessment;
  if (score >= 90) {
    grade = '🏆 Excellent';
    assessment = 'Outstanding dataset quality - ready for production fine-tuning';
  } else if (score >= 75) {
    grade = '✅ Good';
    assessment = 'Good dataset quality - ready for fine-tuning';
  } else if (score >= 60) {
    grade = '⚠️  Fair';
    assessment = 'Acceptable quality but could be improved';
  } else {
    grade = '❌ Needs Work';
    assessment = 'Significant improvements needed before fine-tuning';
  }

  return { score, grade, assessment, breakdown };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(metrics) {
  const recs = [];

  if (metrics.exampleCount < 100) {
    recs.push('Add more training examples (target: 200+) for better model performance');
  }

  if (metrics.uniqueTopics < 30) {
    recs.push('Increase topic diversity to cover more ACT operations and use cases');
  }

  const minLCAAPhase = Math.min(...Object.values(metrics.lcaaPhases));
  if (minLCAAPhase < metrics.exampleCount * 0.15) {
    const phase = Object.entries(metrics.lcaaPhases).find(([_, count]) => count === minLCAAPhase)[0];
    recs.push(`Add more examples covering the "${phase}" phase of LCAA (currently underrepresented)`);
  }

  const uncoveredPillars = Object.entries(metrics.pillars).filter(([_, count]) => count === 0).map(([p, _]) => p);
  if (uncoveredPillars.length > 0) {
    recs.push(`Add examples for uncovered pillars: ${uncoveredPillars.join(', ')}`);
  }

  if (metrics.voicePatterns['Regenerative metaphors'].percentage < 20) {
    recs.push('Incorporate more regenerative metaphors (farming, nature, growth) to strengthen ACT voice');
  }

  if (metrics.voicePatterns['Traditional Custodians'].percentage < 10) {
    recs.push('Add more examples acknowledging Traditional Custodians and cultural protocols');
  }

  if (metrics.voicePatterns['Anti-jargon'].percentage > 5) {
    recs.push('Remove corporate jargon - use community-centered, accessible language instead');
  }

  if (metrics.duplicateRate > 0.1) {
    recs.push('Reduce duplicate examples - aim for unique, diverse training data');
  }

  if (metrics.qualityScore >= 75) {
    recs.push('Quality is good! Consider A/B testing fine-tuned model vs base model');
  }

  return recs;
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const filepath = process.argv[2]; // Optional: specify dataset file
  analyzeDataset(filepath).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { analyzeDataset };
