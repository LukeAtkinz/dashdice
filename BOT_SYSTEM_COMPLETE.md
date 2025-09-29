# 🤖 DashDice Bot System Documentation

## Overview
The DashDice Bot System provides intelligent AI opponents that seamlessly integrate into the matchmaking system. When a user searches for a game and no human opponent is found within 7 seconds, the system automatically matches them with a suitable bot opponent.

## System Architecture

### Core Components

1. **Bot Types & Interfaces** (`src/types/bot.ts`)
   - `BotProfile`: Complete bot definition with personality, stats, and strategy
   - `BotPersonality`: Detailed personality metrics that drive AI behavior
   - `BotStrategy`: Strategic patterns and decision-making rules
   - `BotDecision`: AI decision context and reasoning

2. **Bot Matching Service** (`src/services/botMatchingService.ts`)
   - Handles bot selection and matchmaking
   - Manages 7-second fallback timer
   - Integrates with both Firebase and Go backend sessions

3. **Bot AI Service** (`src/services/botAIService.ts`)
   - Intelligent gameplay decision-making
   - Personality-driven behavior simulation
   - Adaptive strategies based on game context

4. **Bot Profile Generator** (`src/utils/botProfileGenerator.ts`)
   - Generates diverse bot profiles for database population
   - Creates realistic personality distributions
   - Ensures balanced difficulty progression

## Bot Personality System

### Personality Metrics (0.0 - 1.0 scale)

- **Aggressiveness**: Tendency to take risks and continue rolling
- **Banking Tendency**: Preference for securing points early
- **Risk Tolerance**: Willingness to accept potential losses
- **Adaptation Speed**: How quickly bot adjusts to opponent strategies
- **Emotional Volatility**: Tendency for emotional decision-making
- **Pressure Resistance**: Performance under high-stakes situations
- **Momentum Awareness**: Recognition of game flow and timing
- **Tilt Resistance**: Ability to maintain composure after losses

### Bot Archetypes

1. **Conservative** (25% aggressiveness, 80% banking tendency)
   - Banks early and often
   - Avoids risky situations
   - Steady, predictable gameplay
   - High pressure resistance

2. **Aggressive** (75% aggressiveness, 25% banking tendency)
   - Takes high risks for high rewards
   - Continues rolling longer
   - Applies pressure on opponents
   - Higher emotional volatility

3. **Balanced** (50% all metrics with high adaptation)
   - Adapts to opponent strategies
   - Flexible tactical approach
   - Well-rounded performance
   - Situational decision-making

4. **Chaotic** (High volatility and unpredictability)
   - Unpredictable banking patterns
   - Emotional decision-making
   - Creates psychological pressure
   - Momentum-based play style

5. **Strategic** (High awareness and adaptation)
   - Analyzes opponent patterns
   - Calculated risk assessment
   - Counter-strategy development
   - Pattern recognition expertise

### Skill Levels

- **Beginner** (ELO: 1000±200)
  - Basic decision-making
  - Lower adaptation speed
  - Simpler strategic patterns

- **Intermediate** (ELO: 1300±200)
  - Improved risk assessment
  - Better pattern recognition
  - More consistent performance

- **Advanced** (ELO: 1600±200)
  - Sophisticated strategies
  - High adaptation ability
  - Strong pressure resistance

- **Expert** (ELO: 1900±200)
  - Master-level decision-making
  - Elite pattern recognition
  - Exceptional consistency

## Matchmaking Integration

### 7-Second Fallback System

When a user creates a new game session:

1. **Immediate Search**: System searches for human opponents
2. **Session Creation**: If no opponent found, creates new session
3. **Bot Timer**: Automatically starts 7-second countdown
4. **Bot Matching**: After timeout, finds suitable bot opponent
5. **Seamless Integration**: Bot joins session like a human player

### Bot Selection Algorithm

1. **Game Mode Compatibility**: Bot must support the selected game mode
2. **Skill-Based Matching**: Prioritizes bots with similar ELO (±300 for ranked)
3. **Personality Fit**: Considers archetype appropriateness for game type
4. **Activity Simulation**: Factors in simulated "recent activity"
5. **Difficulty Adjustment**: Ensures balanced challenge level

## AI Decision-Making

### Banking Decision Logic

```typescript
// Simplified decision flow
const shouldBank = (turnScore: number, gameContext: GameContext) => {
  const threshold = calculateBankingThreshold(bot.personality, gameContext);
  const riskFactor = assessRiskLevel(gameContext, bot.personality);
  const emotionalState = simulateEmotionalState(bot, gameContext);
  
  return (turnScore >= threshold) && (riskFactor < bot.personality.riskTolerance);
};
```

### Context Awareness

- **Game Phase**: Early/Mid/Late game adjustments
- **Score Differential**: Aggressive play when behind, conservative when ahead
- **Opponent Analysis**: Adapts to human player patterns
- **Emotional Simulation**: Accounts for pressure and momentum

## Database Structure

### Bot Collection Schema

```json
{
  "uid": "bot_alex_chen_1234567890_123",
  "displayName": "Alex Chen",
  "email": "alex.chen.123@dashdice.bot",
  "region": "north-america",
  "isBot": true,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  
  "personality": {
    "aggressiveness": 0.65,
    "bankingTendency": 0.45,
    "riskTolerance": 0.70,
    "adaptationSpeed": 0.60,
    "emotionalVolatility": 0.40,
    "pressureResistance": 0.75,
    "momentumAwareness": 0.65,
    "tiltResistance": 0.70,
    "skillLevel": "advanced",
    "archetypeCategory": "aggressive",
    "favoriteTimeToPlay": 19
  },
  
  "strategy": {
    "bankingThresholds": {
      "early": 12,
      "mid": 15,
      "late": 18,
      "desperation": 22
    },
    "riskFactors": {
      "opponentScore": 0.195,
      "turnLength": 0.12,
      "gamePhase": 0.13
    },
    "adaptationRules": {
      "counterAggressive": false,
      "mimicSuccessful": false,
      "punishMistakes": false
    },
    "commonStrategies": [
      "high-risk-high-reward",
      "pressure-opponent", 
      "late-game-push",
      "aggressive-continuations"
    ]
  },
  
  "stats": {
    "elo": 1642,
    "gamesPlayed": 187,
    "matchWins": 119,
    "currentStreak": 3,
    "bestStreak": 8,
    "totalScore": 186534,
    "averageScore": 998,
    "averageGameLength": 267,
    "bankingFrequency": 5.6,
    "averageTurnScore": 27,
    "riskyContinues": 18,
    "lastActiveDate": "2024-01-01T00:00:00Z",
    "generationDate": "2024-01-01T00:00:00Z"
  },
  
  "preferredGameModes": ["classic", "quickfire", "true-grit", "last-line"],
  "difficultyRating": 7,
  
  "inventory": {
    "displayBackgroundEquipped": null,
    "matchBackgroundEquipped": null,
    "items": []
  },
  
  "recentMatches": []
}
```

## Setup & Deployment

### 1. Initialize Bot Database

```bash
# Create bot profiles in Firestore
npm run init-bots

# Clear existing bots (for testing)
npm run clear-bots

# Test bot system
npm run test-bots
```

### 2. Bot Generation

The system generates **40+ unique bots** with:
- 5 distinct archetypes (Conservative, Aggressive, Balanced, Chaotic, Strategic)
- 4 skill levels (Beginner, Intermediate, Advanced, Expert)
- Diverse personality combinations
- Realistic statistics and ELO ratings

### 3. Special Bots

The system includes special themed bots:
- **The Dice Whisperer**: Expert strategic bot with maximum awareness
- **Lucky Strike**: Chaotic high-risk bot with legendary streaks
- **Bank Robber**: Conservative expert with minimal risk-taking
- **Risk Taker**: Aggressive intermediate bot with high variance
- **Newbie Helper**: Beginner-friendly balanced bot for new players

## Integration Points

### Matchmaking Orchestrator
- `handleQuickMatch()`: Integrates bot fallback for casual matches
- `handleRankedMatch()`: Provides bot opponents for ranked play
- 7-second timeout automatically triggers bot selection

### Game Session Service
- Bots join sessions using standard player interface
- Session state handles bots identically to human players
- Real-time updates work seamlessly with bot participants

### Firebase Security Rules
- Bot collection has appropriate read/write permissions
- Bot profiles are protected from client modification
- Admin SDK required for bot management operations

## Performance Considerations

### Optimization Features
- **Indexed Queries**: Firestore indexes for efficient bot selection
- **Caching**: Bot profiles cached for faster matchmaking
- **Batch Operations**: Efficient database initialization
- **Timeout Management**: Prevents memory leaks from abandoned timers

### Scalability
- **Regional Deployment**: Bots distributed across geographic regions
- **Load Balancing**: Bot selection distributes across available profiles
- **Concurrent Sessions**: Multiple bot matches can run simultaneously
- **Database Sharding**: Bot collection can be partitioned for scale

## Monitoring & Analytics

### Bot Performance Metrics
- Match completion rates
- Average game duration with bots
- User satisfaction with bot opponents
- Bot difficulty calibration accuracy

### System Health
- Bot selection response times
- Fallback timer reliability
- Database query performance
- Error rates and failure modes

## Future Enhancements

### Planned Features
1. **Machine Learning**: Adapt bot behavior based on human player patterns
2. **Dynamic Difficulty**: Real-time adjustment based on player skill
3. **Personality Evolution**: Bots that learn and develop over time
4. **Social Features**: Bots with persistent relationships and rivalries
5. **Tournament Bots**: Specialized bots for tournament play

### Advanced AI
- **Neural Networks**: Deep learning for decision-making
- **Behavioral Cloning**: Learning from expert human players
- **Reinforcement Learning**: Self-improving bot strategies
- **Ensemble Methods**: Multiple AI techniques combined

## Troubleshooting

### Common Issues

**Bots Not Appearing**
- Verify Firebase connection and credentials
- Check bot database initialization: `npm run test-bots`
- Ensure Firestore indexes are deployed

**Poor Bot Performance**
- Review personality calibration in generator
- Check AI decision thresholds in BotAIService
- Validate ELO distribution across skill levels

**Matchmaking Failures**
- Verify bot fallback timer setup
- Check session integration points
- Review error logs in BotMatchingService

### Debug Commands

```bash
# Test bot system
npm run test-bots

# Reinitialize bots
npm run clear-bots && npm run init-bots

# Check Firebase connection
node -e "console.log('Firebase test:', require('firebase-admin').apps.length)"
```

## Security Considerations

### Bot Account Protection
- Bot profiles use dedicated email domain (`@dashdice.bot`)
- Bots cannot be modified by client applications
- Admin SDK required for bot management

### Anti-Cheat Integration
- Bots clearly identified in game sessions
- Bot behavior monitored for consistency
- Human players informed when matched with bots

### Privacy Compliance
- Bot data separate from user data
- No personal information in bot profiles
- GDPR compliant data handling

---

## Quick Start Guide

1. **Initialize the bot system:**
   ```bash
   npm run init-bots
   ```

2. **Test the system:**
   ```bash
   npm run test-bots
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

4. **Create a quick match** - if no human opponent joins within 7 seconds, a bot will automatically be matched!

The bot system is now fully integrated and ready to provide intelligent opponents for all DashDice players. 🎲🤖