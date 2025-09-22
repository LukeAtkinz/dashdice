# 🏆 DashDice Tournament System - Management Guide

## 🎯 Tournament Overview

The DashDice Tournament System provides weekly competitive events with exclusive rewards. This guide covers how to manage tournaments, schedules, and configurations.

## 📅 Tournament Schedule Management

### Default Weekly Schedule
```
┌─────────────┬──────────────────┬────────────────────┬──────────────────────┐
│    Day      │      Time        │   Tournament Type  │     Game Mode        │
├─────────────┼──────────────────┼────────────────────┼──────────────────────┤
│   Friday    │   7:00-8:00 PM   │   Weekly Classic   │   Classic Mode       │
│  Saturday   │   7:00-8:00 PM   │   Speed Tournament │   Quickfire          │
│   Sunday    │   7:00-8:00 PM   │   Precision Cup    │   Zero Hour          │
└─────────────┴──────────────────┴────────────────────┴──────────────────────┘
```

### Adding New Tournaments

#### Using TournamentService (Programmatic)
```typescript
import { TournamentService } from '@/services/tournamentService';

// Create new tournament
const tournamentId = await TournamentService.createTournament({
  name: "Special Event Tournament",
  description: "Limited time tournament with exclusive rewards",
  gameMode: "classic",
  scheduledDate: new Date('2025-09-05T19:00:00'), // Friday 7PM
  registrationOpens: new Date('2025-09-01T00:00:00'), // 4 days before
  rewards: {
    winner: { 
      backgroundId: "tournament_champion_bg", 
      title: "Tournament Champion" 
    },
    finalist: { 
      backgroundId: "tournament_finalist_bg" 
    },
    participant: { 
      experience: 100 
    }
  }
});
```

#### Using Admin Interface (Recommended)
```typescript
// Access admin panel at: /admin/tournaments
// 1. Click "Create New Tournament"
// 2. Fill tournament details:
//    - Name: "Tournament Name"
//    - Description: "Tournament description"
//    - Game Mode: Select from dropdown
//    - Scheduled Date: Date/time picker
//    - Registration Window: Start/end dates
//    - Rewards: Configure backgrounds and titles
// 3. Click "Create Tournament"
```

### Modifying Existing Tournaments

#### Update Tournament Details
```typescript
await TournamentService.updateTournament(tournamentId, {
  name: "Updated Tournament Name",
  description: "Updated description",
  rewards: {
    winner: { 
      backgroundId: "new_winner_background", 
      title: "New Winner Title" 
    }
  }
});
```

#### Schedule Changes
```typescript
// Reschedule tournament (only if not started)
await TournamentService.rescheduleTournament(tournamentId, {
  scheduledDate: new Date('2025-09-06T19:00:00'),
  registrationCloses: new Date('2025-09-06T18:30:00')
});
```

#### Cancel Tournament
```typescript
// Cancel tournament (refunds registrations)
await TournamentService.cancelTournament(tournamentId, {
  reason: "Technical issues",
  refundParticipants: true,
  notifyUsers: true
});
```

## 🎨 Background Reward Management

### Adding New Tournament Backgrounds

#### 1. Upload Background Files
```
📁 public/backgrounds/tournaments/
├── tournament_champion_2025_week1.png
├── tournament_finalist_2025_week1.png
├── tournament_champion_2025_week2.png
├── tournament_finalist_2025_week2.png
└── special_event_exclusive.png
```

#### 2. Register Backgrounds in System
```typescript
import { BackgroundService } from '@/services/backgroundService';

// Add new tournament background
await BackgroundService.addTournamentBackground({
  id: "tournament_champion_2025_week1",
  name: "Champion's Glory",
  description: "Awarded to Week 1 Tournament Champions",
  file: "/backgrounds/tournaments/tournament_champion_2025_week1.png",
  type: "tournament",
  rarity: "legendary",
  unlockCondition: "win_tournament",
  availableFrom: new Date('2025-09-01'),
  availableUntil: new Date('2025-09-08')
});
```

#### 3. Configure Tournament Rewards
```typescript
// Link backgrounds to tournaments
await TournamentService.updateTournamentRewards(tournamentId, {
  winner: {
    backgroundId: "tournament_champion_2025_week1",
    title: "Week 1 Champion",
    goldReward: 1000
  },
  finalist: {
    backgroundId: "tournament_finalist_2025_week1",
    goldReward: 500
  },
  semifinalist: {
    goldReward: 250
  },
  participant: {
    experience: 100,
    goldReward: 50
  }
});
```

### Background Categories

#### Tournament Winner Backgrounds
- **Naming Convention**: `tournament_champion_[period]_[theme]`
- **Rarity**: Legendary
- **Availability**: Exclusive to tournament winners
- **Design Guidelines**: Premium quality, animated effects preferred

#### Tournament Finalist Backgrounds  
- **Naming Convention**: `tournament_finalist_[period]_[theme]`
- **Rarity**: Epic
- **Availability**: Top 2 finishers
- **Design Guidelines**: High quality, distinct from winner but related theme

#### Special Event Backgrounds
- **Naming Convention**: `special_[event_name]_[year]`
- **Rarity**: Legendary/Mythic
- **Availability**: Limited time events only
- **Design Guidelines**: Unique themes, holiday/special occasion designs

## 🔧 Tournament Configuration

### Game Mode Settings

#### Classic Mode Tournament
```typescript
{
  gameMode: "classic",
  rules: {
    targetScore: 100,
    bestOf: 3,
    timeLimit: 900, // 15 minutes per match
    allowBanking: true,
    bustRules: "standard"
  },
  bracketSettings: {
    maxParticipants: 8,
    format: "single-elimination",
    seedingMethod: "ranked_level",
    matchDuration: "15min"
  }
}
```

#### Quickfire Tournament
```typescript
{
  gameMode: "quickfire",
  rules: {
    targetScore: 50,
    bestOf: 1,
    timeLimit: 300, // 5 minutes per match
    fastPaced: true,
    quickRounds: true
  },
  bracketSettings: {
    maxParticipants: 8,
    format: "single-elimination",
    seedingMethod: "random",
    matchDuration: "5min"
  }
}
```

#### Zero Hour Tournament
```typescript
{
  gameMode: "zerohour",
  rules: {
    startingScore: 100,
    targetScore: 0,
    exactWin: true,
    timeLimit: 600, // 10 minutes per match
    bankingAllowed: false
  },
  bracketSettings: {
    maxParticipants: 8,
    format: "single-elimination",
    seedingMethod: "skill_balanced",
    matchDuration: "10min"
  }
}
```

### Registration Settings

#### Open Registration
```typescript
{
  registrationType: "open",
  requirements: {
    rankedStatus: "Ranked - Active",
    minimumLevel: 1,
    gamesPlayed: 5
  },
  registrationWindow: {
    opensAt: "tournament_week_start", // Sunday 8:01 PM
    closesAt: "30_minutes_before", // Tournament start - 30 min
    earlyRegistration: true
  }
}
```

#### Skill-Based Registration
```typescript
{
  registrationType: "skill_balanced",
  requirements: {
    rankedStatus: "Ranked - Active", 
    minimumLevel: 3,
    gamesPlayed: 25
  },
  balancing: {
    skillDistribution: "even_spread",
    maxLevelGap: 3,
    reserveSlots: {
      beginners: 2, // Level 1-3
      intermediate: 4, // Level 4-7  
      advanced: 2 // Level 8-10
    }
  }
}
```

#### Invitation-Only Tournament
```typescript
{
  registrationType: "invitation",
  requirements: {
    invitationRequired: true,
    rankedStatus: "Ranked - Active"
  },
  invitationCriteria: {
    topRankedPlayers: 8, // Top 8 from previous season
    specialAchievements: ["tournament_veteran", "ranked_master"],
    manualInvitations: ["user_id_1", "user_id_2"]
  }
}
```

## 🏗️ Tournament Administration

### Admin Dashboard Features

#### Tournament Overview
```typescript
// View all tournaments
const tournaments = await TournamentService.getAllTournaments({
  status: "all", // "upcoming", "active", "completed"
  timeRange: "month",
  includeStats: true
});

// Display tournament metrics
{
  totalTournaments: 12,
  totalParticipants: 96,
  averageParticipation: 8,
  completionRate: 95%,
  popularGameModes: ["classic", "quickfire", "zerohour"]
}
```

#### Real-time Tournament Monitoring
```typescript
// Monitor active tournament
TournamentService.subscribeTournamentUpdates(tournamentId, (data) => {
  console.log("Tournament Status:", data.status);
  console.log("Current Round:", data.currentRound);
  console.log("Active Matches:", data.activeMatches);
  console.log("Remaining Players:", data.remainingPlayers);
});
```

#### Emergency Tournament Management
```typescript
// Pause tournament (technical issues)
await TournamentService.pauseTournament(tournamentId, {
  reason: "Server maintenance",
  estimatedDuration: "15 minutes",
  notifyParticipants: true
});

// Resume tournament
await TournamentService.resumeTournament(tournamentId, {
  adjustSchedule: true,
  extendRegistration: false
});

// Force bracket advancement (disconnected player)
await TournamentService.forfeitMatch(matchId, {
  forfeitingPlayer: "user_id",
  reason: "disconnection_timeout",
  autoAdvance: true
});
```

### Participant Management

#### Registration Management
```typescript
// View registrations
const registrations = await TournamentService.getTournamentRegistrations(tournamentId);

// Manual registration (admin override)
await TournamentService.registerPlayerAdmin(tournamentId, {
  playerId: "user_id",
  adminOverride: true,
  reason: "special_invitation"
});

// Remove registration
await TournamentService.unregisterPlayer(tournamentId, playerId, {
  reason: "player_request",
  refund: true,
  notifyPlayer: true
});
```

#### Bracket Management
```typescript
// Generate tournament bracket
await TournamentService.generateBracket(tournamentId, {
  seedingMethod: "ranked_level", // "random", "manual"
  balanceSkills: true,
  avoidRematches: true // Don't match recent opponents
});

// Manual bracket adjustments
await TournamentService.updateBracket(tournamentId, {
  round: 1,
  match: 1,
  player1: "user_id_1",
  player2: "user_id_2"
});
```

## 📊 Tournament Analytics

### Performance Metrics
```typescript
// Tournament statistics
const stats = await TournamentService.getTournamentStats(tournamentId);

{
  participationRate: 85%, // Registered vs showed up
  completionRate: 92%, // Finished vs started
  averageMatchDuration: "8.5 minutes",
  playerSatisfactionScore: 4.3, // Post-tournament survey
  skillDistribution: {
    level_1_3: 25%,
    level_4_6: 50%, 
    level_7_10: 25%
  }
}
```

### Historical Analysis
```typescript
// Tournament trends over time
const trends = await TournamentService.getTournamentTrends({
  timeRange: "quarter",
  metrics: ["participation", "retention", "engagement"]
});

// Most popular configurations
const popular = await TournamentService.getPopularConfigurations();
{
  preferredGameModes: ["classic", "quickfire"],
  preferredTimes: ["Friday 7PM", "Sunday 7PM"],
  optimalBracketSize: 8,
  bestRewardTypes: ["backgrounds", "titles"]
}
```

## 🔧 Developer Tools

### Tournament Testing
```typescript
// Create test tournament (development mode)
const testTournament = await TournamentService.createTestTournament({
  name: "Test Tournament",
  quickStart: true, // Start immediately
  dummyPlayers: 8, // AI opponents
  accelerated: true, // Fast match times
  skipRewards: true // No actual rewards given
});

// Simulate tournament progression
await TournamentService.simulateTournament(testTournament.id, {
  autoAdvance: true,
  randomOutcomes: true,
  logResults: true
});
```

### Debug Commands
```typescript
// Reset tournament state (emergency)
await TournamentService.resetTournament(tournamentId, {
  preserveRegistrations: true,
  resetBracket: true,
  notifyParticipants: true
});

// Export tournament data
const exportData = await TournamentService.exportTournamentData(tournamentId);
// Downloads: tournament_[id]_[date].json

// Validate tournament integrity
const validation = await TournamentService.validateTournament(tournamentId);
if (!validation.isValid) {
  console.error("Tournament issues:", validation.errors);
}
```

## 🚀 Best Practices

### Tournament Scheduling
1. **Consistent Times**: Keep tournament times consistent across weeks
2. **Advance Notice**: Announce tournaments at least 48 hours in advance
3. **Time Zone Consideration**: Primary time zone is EST/EDT
4. **Holiday Adjustments**: Modify schedule for major holidays

### Reward Balance
1. **Exclusive Value**: Tournament rewards should feel special and rare
2. **Participation Incentive**: Ensure all participants receive something
3. **Skill Recognition**: Winners should receive significantly better rewards
4. **Collection Completeness**: Design background sets that work together

### Community Management
1. **Clear Rules**: Tournament rules should be easily accessible
2. **Fair Play**: Implement robust anti-cheat measures
3. **Communication**: Regular updates during tournaments
4. **Feedback Collection**: Post-tournament surveys for improvements

### Technical Considerations
1. **Server Capacity**: Monitor server load during peak tournament times
2. **Backup Plans**: Have contingency procedures for technical issues
3. **Data Backup**: Regular backups of tournament and bracket data
4. **Performance Monitoring**: Real-time monitoring of tournament systems

This guide provides comprehensive tournament management capabilities while maintaining flexibility for special events and community needs.
