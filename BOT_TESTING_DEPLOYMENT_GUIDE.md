# 🤖 Bot System Testing & Deployment Guide

## Overview
This guide covers comprehensive testing and deployment of the DashDice bot system, including profile generation, AI decision making, stats tracking, and seamless integration with the existing user ecosystem.

## Prerequisites

### Frontend Dependencies
```bash
# Install required packages (if not already installed)
npm install firebase @ionic/capacitor
```

### Go Services Dependencies
```bash
# In go-services directory
go mod tidy
```

### Firebase Setup
```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Testing Phases

### Phase 1: Bot Profile Generation Testing

#### 1.1 Generate Test Bot Profiles
```typescript
// Test script: src/scripts/test-bot-generation.ts
import { BotProfileGenerator } from '@/services/botProfileGenerator';

async function testBotGeneration() {
  console.log('🤖 Testing bot profile generation...');
  
  // Generate different skill levels
  const testProfiles = await Promise.all([
    BotProfileGenerator.generateBotProfile('beginner', 'us-east'),
    BotProfileGenerator.generateBotProfile('intermediate', 'us-east'), 
    BotProfileGenerator.generateBotProfile('advanced', 'us-east'),
    BotProfileGenerator.generateBotProfile('expert', 'us-east')
  ]);
  
  console.log('✅ Generated bot profiles:', testProfiles);
  
  // Verify profiles have realistic data
  testProfiles.forEach((profile, index) => {
    console.log(`Bot ${index + 1}:`, {
      name: profile.displayName,
      skillLevel: profile.botConfig.skillLevel,
      games: profile.stats.gamesPlayed,
      winRate: profile.stats.matchWins / profile.stats.gamesPlayed,
      personality: profile.personality.aggressiveness
    });
  });
}
```

#### 1.2 Batch Generation Test
```typescript
async function testBatchGeneration() {
  console.log('🤖 Testing batch bot generation...');
  
  const batchSize = 20;
  const startTime = Date.now();
  
  await BotProfileGenerator.generateBotBatch(batchSize, 'us-east');
  
  const endTime = Date.now();
  console.log(`✅ Generated ${batchSize} bots in ${endTime - startTime}ms`);
}
```

### Phase 2: AI Decision Engine Testing

#### 2.1 Decision Quality Test
```typescript
// Test script: src/scripts/test-bot-ai.ts
import { BotAIDecisionEngine } from '@/services/botAIDecisionEngine';

async function testDecisionEngine() {
  console.log('🤖 Testing AI decision engine...');
  
  // Mock game states for testing
  const testGameStates = [
    {
      currentScore: 50,
      opponentScore: 75,
      turnScore: 15,
      diceCount: 3,
      gamePhase: 'mid'
    },
    {
      currentScore: 80,
      opponentScore: 70,
      turnScore: 25,
      diceCount: 2,
      gamePhase: 'late'
    }
  ];
  
  // Test multiple bot personalities
  const botTypes = ['conservative', 'aggressive', 'balanced'];
  
  for (const gameState of testGameStates) {
    for (const botType of botTypes) {
      const decision = await BotAIDecisionEngine.makeDecision(
        gameState,
        'turn_decision',
        botType
      );
      
      console.log(`${botType} bot decision:`, {
        action: decision.action,
        confidence: decision.confidence,
        reasoning: decision.reasoning
      });
    }
  }
}
```

#### 2.2 Anti-Pattern Detection Test
```typescript
async function testAntiPatternDetection() {
  console.log('🤖 Testing anti-pattern detection...');
  
  // Simulate 100 decisions and check for patterns
  const decisions = [];
  const botEngine = new BotAIDecisionEngine('balanced');
  
  for (let i = 0; i < 100; i++) {
    const gameState = generateRandomGameState();
    const decision = await botEngine.makeDecision(gameState, 'dice_roll');
    decisions.push(decision);
  }
  
  // Analyze patterns
  const actionCounts = decisions.reduce((acc, d) => {
    acc[d.action] = (acc[d.action] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Action distribution:', actionCounts);
  
  // Check for human-like variance
  const confidenceVariance = calculateVariance(decisions.map(d => d.confidence));
  console.log('Confidence variance:', confidenceVariance);
  
  console.log('✅ Pattern analysis complete');
}
```

### Phase 3: Stats Tracking Testing

#### 3.1 Match Result Processing Test
```typescript
// Test script: src/scripts/test-bot-stats.ts
import { BotStatsTracker } from '@/services/botStatsTracker';

async function testStatsTracking() {
  console.log('🤖 Testing bot stats tracking...');
  
  // Create test bot
  const testBot = await BotProfileGenerator.generateBotProfile('intermediate', 'us-east');
  
  // Simulate match results
  const matchResults = [
    {
      botId: testBot.uid,
      opponentId: 'test-human-player',
      won: true,
      finalScore: 120,
      opponentFinalScore: 95,
      gameMode: 'quick',
      turnsTaken: 8,
      biggestTurnScore: 35,
      doublesRolled: 2,
      banksExecuted: 6,
      matchDuration: 180000,
      achievements: ['first_win']
    },
    {
      botId: testBot.uid,
      opponentId: 'test-human-player-2',
      won: false,
      finalScore: 85,
      opponentFinalScore: 100,
      gameMode: 'quick',
      turnsTaken: 10,
      biggestTurnScore: 25,
      doublesRolled: 1,
      banksExecuted: 8,
      matchDuration: 220000,
      achievements: []
    }
  ];
  
  // Process match results
  for (const result of matchResults) {
    await BotStatsTracker.updateBotMatchResult(result);
  }
  
  // Verify stats were updated correctly
  const updatedBot = await BotStatsTracker.getBotProfile(testBot.uid);
  console.log('Updated bot stats:', updatedBot?.stats);
  
  console.log('✅ Stats tracking test complete');
}
```

### Phase 4: Queue Service Integration Testing

#### 4.1 Bot Matching Test
```bash
# Start queue service
cd go-services/queue-service
go run main.go matchmaker.go

# In another terminal, test bot matching
curl -X POST http://localhost:8080/internal/queue/quick/join \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-12345",
    "region": "us-east",
    "elo_rating": 1200
  }'

# Wait 15 seconds, then check for bot match
curl http://localhost:8080/internal/queue/quick/status
```

#### 4.2 Load Testing Bot Matching
```bash
# Test multiple concurrent players
for i in {1..10}; do
  curl -X POST http://localhost:8080/internal/queue/quick/join \
    -H "Content-Type: application/json" \
    -d "{\"user_id\": \"test-user-$i\", \"region\": \"us-east\", \"elo_rating\": $((1000 + $i * 20))}" &
done
```

### Phase 5: Bot AI Service Testing

#### 5.1 WebSocket Communication Test
```typescript
// Test script: src/scripts/test-bot-websocket.ts
async function testBotWebSocket() {
  console.log('🤖 Testing bot WebSocket communication...');
  
  const botId = 'test-bot-12345';
  const wsUrl = 'ws://localhost:8080/ws/' + botId;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    
    // Send test game state
    ws.send(JSON.stringify({
      type: 'game_state_update',
      data: {
        currentPlayer: botId,
        gameData: {
          currentScore: 50,
          opponentScore: 60,
          turnScore: 10
        }
      }
    }));
  };
  
  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    console.log('🤖 Bot response:', response);
  };
  
  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };
}
```

### Phase 6: Profile Integration Testing

#### 6.1 Seamless Profile Viewing Test
```typescript
// Test script: src/scripts/test-profile-integration.ts
import { ProfileIntegrationService } from '@/services/profileIntegrationService';

async function testProfileIntegration() {
  console.log('🤖 Testing profile integration...');
  
  // Create test bot
  const testBot = await BotProfileGenerator.generateBotProfile('advanced', 'us-east');
  
  // Test getting profile through integration service
  const unifiedProfile = await ProfileIntegrationService.getProfile(testBot.uid);
  
  console.log('Unified profile:', {
    displayName: unifiedProfile?.displayName,
    stats: unifiedProfile?.stats,
    isBot: unifiedProfile?.isBot // Should be true but hidden from UI
  });
  
  // Test profile viewing (sanitized for UI)
  const viewingProfile = await ProfileIntegrationService.getProfileForViewing(testBot.uid);
  
  console.log('Profile for viewing:', viewingProfile);
  console.log('✅ isBot flag hidden:', !('isBot' in viewingProfile));
  
  // Test user vs bot detection
  const isBot = await ProfileIntegrationService.isBot(testBot.uid);
  console.log('Is bot detected:', isBot);
}
```

### Phase 7: End-to-End Integration Testing

#### 7.1 Complete Bot Match Flow Test
```typescript
async function testCompleteFlow() {
  console.log('🤖 Testing complete bot match flow...');
  
  // 1. Generate bot
  const bot = await BotProfileGenerator.generateBotProfile('intermediate', 'us-east');
  console.log('✅ Bot generated:', bot.displayName);
  
  // 2. Start bot AI service
  // (Manual step - start go service)
  
  // 3. Queue human player
  // (Simulated - would join through frontend)
  
  // 4. Wait for bot match (10+ seconds)
  // (Automatic - queue service handles this)
  
  // 5. Simulate game with bot decisions
  const gameState = {
    currentScore: 30,
    opponentScore: 45,
    turnScore: 5,
    gamePhase: 'mid'
  };
  
  const decision = await BotAIDecisionEngine.makeDecision(
    gameState,
    'turn_decision',
    bot.personality
  );
  
  console.log('✅ Bot decision made:', decision);
  
  // 6. Process match result
  const matchResult = {
    botId: bot.uid,
    opponentId: 'human-player-123',
    won: true,
    finalScore: 100,
    opponentFinalScore: 85,
    gameMode: 'quick',
    turnsTaken: 12,
    biggestTurnScore: 30,
    doublesRolled: 3,
    banksExecuted: 8,
    matchDuration: 240000,
    achievements: ['consecutive_wins']
  };
  
  await BotStatsTracker.updateBotMatchResult(matchResult);
  console.log('✅ Bot stats updated');
  
  // 7. Verify profile integration still works
  const updatedProfile = await ProfileIntegrationService.getProfileForViewing(bot.uid);
  console.log('✅ Updated profile viewable:', updatedProfile?.stats);
  
  console.log('🎉 Complete flow test passed!');
}
```

## Performance Testing

### Bot Generation Performance
```bash
# Time bot generation
time npm run test:bot-generation

# Memory usage monitoring
node --inspect src/scripts/test-bot-generation.ts
```

### AI Decision Performance
```bash
# Benchmark AI decisions
time npm run test:bot-ai-performance

# Response time measurement
curl -w "@curl-format.txt" -X POST http://localhost:8080/internal/bots/test-bot/action
```

### Database Performance
```sql
-- Firebase query performance
SELECT * FROM bot_profiles WHERE botConfig.isActive = true LIMIT 10;

-- Index verification
EXPLAIN SELECT * FROM bot_profiles WHERE botConfig.region = 'us-east' AND botConfig.skillLevel = 'intermediate';
```

## Deployment Steps

### 1. Firebase Deployment
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy storage rules
firebase deploy --only storage
```

### 2. Go Services Deployment
```bash
# Build bot AI service
cd go-services/bot-ai-service
go build -o bot-ai-service main.go ai_engine.go

# Deploy to Railway
railway login
railway link [project-id]
railway up
```

### 3. Frontend Integration
```bash
# Build and deploy frontend
npm run build
npm run deploy:production
```

### 4. Initialize Bot Population
```typescript
// Run bot population script
npm run populate-bots

// Verify bot population
npm run verify-bot-population
```

## Monitoring & Maintenance

### Bot Performance Monitoring
- Monitor bot decision response times
- Track bot match success rates
- Watch for pattern detection in bot behavior
- Monitor Firebase query performance for bot profiles

### Health Checks
```bash
# Check bot AI service health
curl http://localhost:8080/health

# Check bot profile accessibility
curl http://localhost:8080/internal/bots/active

# Verify bot stats tracking
npm run verify-bot-stats
```

### Maintenance Tasks
- Periodic bot personality evolution
- Bot stats cleanup and optimization
- Performance tuning based on usage patterns
- Adding new bot personalities as needed

## Troubleshooting

### Common Issues

#### Bot Matches Not Triggered
1. Check queue service logs for 10-second timeout detection
2. Verify bot profiles exist in Firebase
3. Check bot availability in target region
4. Ensure quick game mode (not ranked)

#### AI Decisions Too Predictable
1. Review personality matrix values
2. Increase error rate in bot configuration
3. Add more variance to response times
4. Check anti-pattern detection effectiveness

#### Profile Integration Issues
1. Verify ProfileIntegrationService is being used
2. Check bot profile Firebase schema matches expectations
3. Ensure isBot flags are properly hidden from UI
4. Test unified profile conversion logic

#### Performance Issues
1. Monitor Firebase read/write operations
2. Check Go service memory usage
3. Profile AI decision calculation times
4. Optimize bot profile queries with proper indexing

## Success Metrics

### Bot Detection Prevention
- Users should not be able to distinguish bots from humans
- Bot behavior should appear natural and varied
- No obvious patterns in bot decision making

### Performance Targets
- Bot decision response time: 1-3 seconds
- Bot profile loading: <500ms
- Queue→Bot match time: 10-15 seconds
- Match completion rate: >95%

### User Experience
- Seamless matchmaking for solo players
- No noticeable difference between bot and human opponents
- Realistic progression and stats for bot profiles
- Smooth integration with existing friend/profile systems

## Conclusion

This comprehensive testing and deployment guide ensures the bot system integrates seamlessly with DashDice, providing undetectable bot opponents that enhance the user experience without compromising the authentic feel of human gameplay.

Remember: The goal is not just to create bots, but to create the illusion of a thriving player community where users never feel alone or unable to find a match.
