#!/usr/bin/env node

/**
 * Velocity Forecasting
 *
 * Predicts sprint completion based on historical velocity data.
 * Uses linear regression and moving averages to forecast outcomes.
 *
 * Features:
 * - Sprint completion prediction
 * - Velocity trend analysis
 * - Capacity recommendations
 * - Risk detection
 */

import '../lib/load-env.mjs';
import { calculateSprintMetrics } from './calculate-flow-metrics.mjs';

/**
 * Calculate velocity trend from historical data
 */
function calculateVelocityTrend(sprints) {
  if (sprints.length < 2) {
    return { trend: 'insufficient_data', change: 0 };
  }

  const recent = sprints[sprints.length - 1];
  const previous = sprints[sprints.length - 2];

  const change = ((recent.throughputPerWeek - previous.throughputPerWeek) / previous.throughputPerWeek) * 100;

  let trend = 'stable';
  if (change > 15) trend = 'increasing';
  else if (change < -15) trend = 'decreasing';

  return { trend, change: Math.round(change) };
}

/**
 * Predict sprint completion using current velocity
 */
function predictCompletion(metrics, daysElapsed, totalDays) {
  const daysRemaining = totalDays - daysElapsed;
  const currentCompletion = metrics.completionPercentage;

  // Calculate daily completion rate
  const dailyRate = daysElapsed > 0 ? currentCompletion / daysElapsed : 0;

  // Predict final completion
  const predictedCompletion = Math.min(currentCompletion + (dailyRate * daysRemaining), 100);

  // Calculate confidence based on consistency
  const confidence = daysElapsed >= 7 ? 75 : daysElapsed >= 3 ? 50 : 25;

  return {
    predicted: Math.round(predictedCompletion),
    confidence,
    dailyRate: dailyRate.toFixed(1),
    daysRemaining
  };
}

/**
 * Identify at-risk items
 */
function identifyAtRiskItems(metrics, prediction) {
  const atRisk = [];

  // Items likely to not complete
  const issuesRemaining = metrics.totalIssues - metrics.completed;
  const completionShortfall = 100 - prediction.predicted;

  if (completionShortfall > 20) {
    const itemsAtRisk = Math.ceil((completionShortfall / 100) * metrics.totalIssues);

    // Recommend moving lowest priority items
    atRisk.push({
      type: 'incomplete',
      count: itemsAtRisk,
      recommendation: `Consider moving ${itemsAtRisk} lowest-priority item(s) to next sprint`
    });
  }

  // WIP items that might not complete
  if (metrics.wipItems.length > 0 && prediction.daysRemaining < 7) {
    metrics.wipItems.forEach(item => {
      if (item.daysInProgress > 3) {
        atRisk.push({
          type: 'stuck',
          issue: item.number,
          title: item.title,
          recommendation: `Issue #${item.number} has been in progress for ${item.daysInProgress} days - may not complete`
        });
      }
    });
  }

  return atRisk;
}

/**
 * Generate capacity recommendation for next sprint
 */
function recommendCapacity(metrics, historicalData) {
  if (historicalData.length === 0) {
    return {
      recommended: metrics.totalIssues,
      reasoning: 'Based on current sprint (no historical data)'
    };
  }

  // Calculate average throughput
  const avgThroughput = historicalData.reduce((sum, s) => sum + s.completed, 0) / historicalData.length;

  // Adjust for trend
  const trend = calculateVelocityTrend(historicalData);
  let adjustment = 1.0;

  if (trend.trend === 'increasing') adjustment = 1.1;
  else if (trend.trend === 'decreasing') adjustment = 0.9;

  const recommended = Math.round(avgThroughput * adjustment);

  return {
    recommended,
    reasoning: `Based on ${historicalData.length} sprint(s) average (${avgThroughput.toFixed(1)}) with ${trend.trend} trend`
  };
}

/**
 * Generate forecast visualization
 */
function generateForecastVisualization(currentCompletion, predictedCompletion, daysElapsed, totalDays) {
  const weeksTotal = Math.ceil(totalDays / 7);
  const weeksElapsed = Math.floor(daysElapsed / 7);

  const bars = [];
  const weeklyPrediction = predictedCompletion / weeksTotal;

  for (let week = 1; week <= weeksTotal; week++) {
    if (week <= weeksElapsed) {
      // Past weeks (actual)
      const completion = Math.min((currentCompletion / weeksElapsed) * week, currentCompletion);
      bars.push({
        week,
        completion: Math.round(completion),
        status: 'actual'
      });
    } else {
      // Future weeks (predicted)
      const completion = Math.min(currentCompletion + (weeklyPrediction * (week - weeksElapsed)), predictedCompletion);
      bars.push({
        week,
        completion: Math.round(completion),
        status: 'predicted'
      });
    }
  }

  return bars;
}

/**
 * Main forecast function
 */
async function generateForecast(sprintName, daysElapsed = 15) {
  console.log(`🔮 Velocity Forecast for ${sprintName}\n`);

  // Get current sprint metrics
  const metrics = await calculateSprintMetrics(sprintName);

  // Sprint parameters (30-day sprints)
  const totalDays = 30;
  const actualDaysElapsed = daysElapsed;

  console.log(`📊 Current Status (Day ${actualDaysElapsed}/${totalDays})\n`);
  console.log(`   Completed: ${metrics.completed}/${metrics.totalIssues} (${metrics.completionPercentage}%)`);
  console.log(`   In Progress: ${metrics.inProgress}`);
  console.log(`   Blocked: ${metrics.blocked}`);
  console.log(``);

  // Generate prediction
  const prediction = predictCompletion(metrics, actualDaysElapsed, totalDays);

  console.log(`🎯 Prediction\n`);
  console.log(`   Expected Completion: ${prediction.predicted}%`);
  console.log(`   Confidence: ${prediction.confidence}%`);
  console.log(`   Daily Rate: ${prediction.dailyRate}% per day`);
  console.log(`   Days Remaining: ${prediction.daysRemaining}`);
  console.log('');

  // Visualization
  console.log(`📈 Forecast Timeline\n`);
  const visualization = generateForecastVisualization(
    metrics.completionPercentage,
    prediction.predicted,
    actualDaysElapsed,
    totalDays
  );

  visualization.forEach(bar => {
    const filled = Math.floor(bar.completion / 10);
    const empty = 10 - filled;
    const barChars = '█'.repeat(filled) + '░'.repeat(empty);
    const status = bar.status === 'actual' ? '✓' : '→';

    console.log(`   Week ${bar.week}: ${barChars} ${bar.completion}% ${status}`);
  });
  console.log('');

  // Risk analysis
  const atRisk = identifyAtRiskItems(metrics, prediction);

  if (atRisk.length > 0) {
    console.log(`⚠️  At Risk\n`);
    atRisk.forEach(risk => {
      console.log(`   • ${risk.recommendation}`);
    });
    console.log('');
  }

  // Capacity recommendation
  console.log(`💡 Next Sprint Recommendation\n`);
  const capacity = recommendCapacity(metrics, []); // TODO: Add historical data
  console.log(`   Recommended capacity: ${capacity.recommended} issues`);
  console.log(`   Reasoning: ${capacity.reasoning}`);
  console.log('');

  // Outcome assessment
  console.log(`📋 Assessment\n`);
  if (prediction.predicted >= 90) {
    console.log(`   ✅ On track to complete sprint goal`);
    console.log(`   🎯 Maintain current pace`);
  } else if (prediction.predicted >= 70) {
    console.log(`   ⚠️  May not complete all items`);
    console.log(`   💡 Consider re-prioritizing or descoping`);
  } else {
    console.log(`   🚨 Sprint at risk of significant shortfall`);
    console.log(`   🔄 Recommend immediate replanning`);
  }
  console.log('');

  return {
    metrics,
    prediction,
    atRisk,
    capacity
  };
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const sprintArg = args.find(arg => arg.startsWith('--sprint='));
  const sprintName = sprintArg ? sprintArg.split('=')[1] : 'Sprint 2';

  const daysArg = args.find(arg => arg.startsWith('--days='));
  const daysElapsed = daysArg ? parseInt(daysArg.split('=')[1]) : 15;

  await generateForecast(sprintName, daysElapsed);
}

// Export for use by other scripts
export { generateForecast, predictCompletion, recommendCapacity };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
