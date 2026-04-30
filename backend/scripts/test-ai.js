#!/usr/bin/env node
/**
 * AI Title Suggestion Test Script
 * Run: cd backend && node scripts/test-ai.js
 */

const { generateTitleSuggestions, getAIHealth } = require('../services/aiTitleSuggestionService');

async function testAI() {
  console.log('🧪 Testing AI Title Suggestions...\n');
  
  // Test 1: Health check
  console.log('1️⃣ Health Check:');
  const health = getAIHealth();
  console.log('✅ OpenRouter:', health.openrouter);
  console.log('✅ Gemini:', health.gemini);
  console.log('📊 Cache:', health.cacheSize, 'items\n');
  
  // Test 2: Generate suggestions
  console.log('2️⃣ Generating AI suggestions...');
  const query = {
    domain: 'Artificial Intelligence',
    keywords: 'healthcare prediction',
    interests: 'machine learning',
    description: 'Patient outcome prediction system'
  };
  
  const result = await generateTitleSuggestions(query);
  console.log('📊 Result:', {
    success: result.success,
    model: result.data.model,
    count: result.data.suggestions.length,
    errorType: result.errorType || 'none'
  });
  
  console.log('\n🎉 Suggestions:');
  result.data.suggestions.forEach((s, i) => {
    console.log(`${i+1}. ${s.title}`);
  });
  
  console.log('\n✅ Test complete! Check backend logs for details.');
}

testAI().catch(console.error);

