# DashDice - Core Game Design Document

**Version:** 1.0  
**Last Updated:** December 1, 2025  
**Status:** Production

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Core Gameplay Mechanics](#2-core-gameplay-mechanics)
3. [Game Modes](#3-game-modes)
4. [Player Progression System](#4-player-progression-system)
5. [Combat & Abilities System](#5-combat--abilities-system)

---

## 1. Game Overview

### 1.1 Elevator Pitch

**DashDice** is a competitive real-time multiplayer dice PvP game that transforms traditional dice rolling into a strategic, skill-based esport. Players use tactical abilities, resource management (AURA), and strategic banking decisions to outmaneuver opponents in fast-paced 2-15 minute matches across multiple game modes.

**Key Differentiator:** Unlike pure luck-based dice games, DashDice introduces the **AURA economy** and **Power Loadout system**, where players earn resources through gameplay and spend them strategically on abilities that manipulate dice outcomes, control opponent actions, and shift match momentum.

### 1.2 Genre & Classification

- **Primary Genre:** Competitive PvP Dice Strategy
- **Sub-genres:** 
  - Real-time Strategy (RTS-lite)
  - Resource Management
  - Tactical Esports
- **Platform Classification:** Cross-platform multiplayer (Web, iOS, Android)
- **Gameplay Style:** Hybrid turn-based (simultaneous decision-making with real-time consequences)

### 1.3 Core Design Philosophy

**"RNG Creates Opportunity, Skill Determines Victory"**

DashDice follows a **Skill-First Hybrid** approach:

1. **Dice provide tactical options** - Each roll creates a decision tree
2. **Abilities shape outcomes** - Players invest AURA to influence probability and opponent actions
3. **Banking strategy matters** - Risk vs. reward decision-making separates skilled players
4. **Match knowledge wins** - Understanding timing, opponent loadouts, and game mode rules is crucial

**Balance Ratio:** 30% RNG (dice variance) / 70% Skill (ability usage, banking decisions, resource management, timing)

### 1.4 Target Audience

#### Primary Audience
- **Age Range:** 16-35 years old
- **Gaming Profile:** Competitive casual to semi-professional players
- **Playstyle:** Quick session players seeking strategic depth
- **Preferences:** Mobile-first, esports-ready, social competitive gaming

#### Secondary Audience
- **Age Range:** 13-15, 35-50 years old
- **Gaming Profile:** Social gamers, board game enthusiasts
- **Playstyle:** Casual competitive with friends
- **Preferences:** Easy to learn, social features, customization

#### Geographic Focus
- **Primary Markets:** North America, Europe, Latin America
- **Secondary Markets:** East Asia (Japan, South Korea - requires localization)
- **Emerging Markets:** Southeast Asia, India, Middle East

### 1.5 Platform Strategy

#### Current Platforms (Version 1.0)
- **Web Browser** (Desktop/Mobile) - Next.js 15 PWA
- **iOS** - Capacitor native wrapper (App Store)
- **Android** - Capacitor native wrapper (Google Play)

#### Technical Stack
- **Frontend:** Next.js 15, TypeScript, React 18, Tailwind CSS, Framer Motion
- **Backend:** Firebase Firestore (real-time database), Firebase Auth, Cloud Functions
- **Matchmaking:** Custom Go-based backend adapter with MMR system
- **Real-time Sync:** Firestore onSnapshot listeners (<100ms latency)
- **Cross-platform:** Capacitor for native iOS/Android deployment

#### Platform-Specific Features
| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| Real-time Multiplayer | ✅ | ✅ | ✅ |
| Ranked Matchmaking | ✅ | ✅ | ✅ |
| Social League | ✅ | ✅ | ✅ |
| Friends System | ✅ | ✅ | ✅ |
| Voice Chat | ❌ | 🔄 Future | 🔄 Future |
| Push Notifications | ❌ | ✅ | ✅ |
| In-App Purchases | 🔄 Planned | 🔄 Planned | 🔄 Planned |

---

## 2. Core Gameplay Mechanics

### 2.1 Match Flow Overview

Every DashDice match follows this structure:

```
1. MATCHMAKING → 2. TURN DECIDER → 3. GAMEPLAY LOOP → 4. VICTORY
   (5-30s)          (5-10s)            (2-15 min)        (5-10s)
```

### 2.2 Dice System

#### 2.2.1 Dice Configuration
- **Number of Dice:** 2 standard six-sided dice (D6) per roll
- **Dice Values:** 1-6 (standard pips)
- **Visual Representation:** 3D animated dice with physics-based rolling
- **Roll Timing:** Player-controlled (click/tap to roll)

#### 2.2.2 Dice Rules & Outcomes

| Roll Type | Dice Values | Effect | Turn Status |
|-----------|-------------|--------|-------------|
| **Single 1** | One die = 1 | Turn ends, lose turn score | ❌ Turn Over |
| **Snake Eyes** | 1-1 | +20 points to turn score | ✅ Continue |
| **Double Six** | 6-6 | Player total score → 0 | ❌ Turn Over |
| **Other Doubles** | 2-2, 3-3, 4-4, 5-5 | Activate 2x multiplier | ✅ Continue |
| **Normal Roll** | Any other combo | Add dice sum to turn score | ✅ Continue |

#### 2.2.3 Multiplier System

**Double Multiplier (2x):**
- **Trigger:** Roll any double except 1-1 or 6-6 (e.g., 2-2, 3-3, 4-4, 5-5)
- **Effect:** All subsequent rolls in the turn are doubled
- **Duration:** Until player banks or turn ends
- **Visual:** Purple-themed dice containers with glowing borders
- **Stacking:** Does not stack with itself

**Example Turn with Multiplier:**
1. Roll 3-3 → +6 points, 2x multiplier activated
2. Roll 4-2 → +12 points (6 × 2)
3. Roll 5-6 → +22 points (11 × 2)
4. Bank → 40 points added to player total

### 2.3 Banking Mechanics

#### 2.3.1 Banking Decision
- **When:** After any successful roll (before rolling again)
- **Action:** Player clicks "BANK" button to lock in turn score
- **Result:** Turn score added to player total, turn switches to opponent
- **Risk:** If you roll a Single 1 before banking, you lose all turn score

#### 2.3.2 Strategic Banking

**Key Decision Factors:**
1. **Current Turn Score** - Higher score = more risk to lose
2. **Multiplier Status** - Active 2x multiplier incentivizes continued rolling
3. **Opponent Score** - Banking to secure a lead or prevent comeback
4. **Game Mode Rules** - Mode-specific banking behaviors (e.g., Zero Hour subtracts score)
5. **Ability Costs** - AURA gained from rolling (+1 per roll, +1 bonus for doubles)

### 2.4 Turn Structure

#### 2.4.1 Turn Phases

**Phase 1: Turn Decider (Pre-Game)**
1. Random player chosen to pick Odd/Even
2. Turn decider die rolled (1-6)
3. Result determines starting player
4. Transition to gameplay

**Phase 2: Active Turn (Gameplay Loop)**
1. Player rolls 2 dice
2. Dice result processed (rules engine)
3. AURA granted (+1 per roll, +1 for doubles)
4. Player decision:
   - **Continue Rolling** - Risk/reward for more points
   - **Bank Score** - Lock in points, end turn
   - **Use Ability** - Spend AURA on tactical advantage

**Phase 3: Turn End**
- Turn switches to opponent
- Active effects persist (shields, multipliers)
- Cooldowns tick down
- New turn begins

#### 2.4.2 Ability Activation Timing

Abilities can be used at different moments:

| Timing | When Activatable | Example Abilities |
|--------|------------------|-------------------|
| **Player's Turn** (`own_turn`) | Only during your active turn | Luck Turner, Aura Forge, Vital Rush |
| **Opponent's Turn** (`opponent_turn`) | Only during opponent's turn | Pan Slap, Hard Hat, Siphon |
| **Any Turn** (`any_turn`) | Anytime during gameplay | Vision Surge (future) |

**Pre-Roll vs. Post-Roll:**
- **Pre-Roll Abilities:** Activated before dice are rolled (affect probability)
- **Post-Roll Abilities:** Activated after seeing dice result (reactive defense)

### 2.5 AURA Economy System

#### 2.5.1 AURA Overview
**AURA** is the in-match resource currency used to activate abilities. Players start each match with 0 AURA and earn it through gameplay actions.

#### 2.5.2 Earning AURA

| Action | AURA Gained | Notes |
|--------|-------------|-------|
| **Normal Roll** | +1 | Every dice roll grants AURA |
| **Doubles Roll** | +2 | Base +1 plus +1 bonus |
| **Snake Eyes (1-1)** | +2 | Base +1 plus +1 bonus |
| **Banking** | +0 | No AURA from banking |
| **Opponent Bust** | +0 | No AURA from opponent mistakes |
| **Ability Grants** | Variable | Some abilities grant AURA (e.g., Aura Forge: +6) |

**AURA Per Turn Average:** 3-8 AURA (depending on rolls before banking)

#### 2.5.3 Spending AURA

**Ability Cost Ranges:**
- **Tactical Abilities:** 3-6 AURA (information/manipulation)
- **Attack Abilities:** 5-8 AURA (offensive disruption)
- **Defense Abilities:** 4-6 AURA (protection/counters)
- **Utility Abilities:** 3-7 AURA (dice control/turn extension)
- **Game Changer Abilities:** 8-12 AURA (match-altering effects)

**Variable Cost Example:**
- **Luck Turner** (Tactical): 3-6 AURA - Cost increases each use within same match

#### 2.5.4 AURA Strategy

**Resource Management Tactics:**
1. **Save for Key Moment** - Hoard AURA for critical defensive ability
2. **Early Aggression** - Spend AURA immediately to pressure opponent
3. **Economic Advantage** - Use Aura Forge to build resource lead
4. **Reactive Defense** - Save AURA for opponent's big turn

### 2.6 Win Conditions

#### 2.6.1 Standard Victory (Quickfire, Classic)
- **Condition:** First player to reach target score
- **Quickfire Target:** 50 points
- **Classic Target:** 100 points
- **Instant Victory:** No overtime or tiebreakers

#### 2.6.2 Countdown Victory (Zero Hour)
- **Condition:** First player to reach exactly 0 points
- **Starting Score:** 100 points
- **Exact Landing Required:** Overshooting resets score to 100
- **Banking Subtracts:** Turn score is subtracted from player total

#### 2.6.3 Elimination Victory (Last Line)
- **Condition:** Highest score after single turn per player
- **Special Rule:** Doubles grant one additional roll
- **Tiebreaker:** Sudden death - highest single roll wins

#### 2.6.4 True Grit Victory
- **Condition:** Highest total score after one extended turn per player
- **No Banking:** Players roll until Single 1
- **Multiplier Stacking:** True Grit multipliers can reach 3x, 4x, etc.

### 2.7 Average Match Duration

| Game Mode | Target Duration | Actual Range |
|-----------|-----------------|--------------|
| **Quickfire** | 3-5 minutes | 2-8 minutes |
| **Classic** | 8-10 minutes | 5-15 minutes |
| **Zero Hour** | 10-12 minutes | 8-20 minutes |
| **Last Line** | 2-3 minutes | 1-5 minutes |
| **True Grit** | 5-7 minutes | 3-10 minutes |
| **Social League** | 3-8 minutes | Varies by mode |

**Design Target:** Average match completion in **6-8 minutes** across all modes for mobile-optimized session length.

### 2.8 RNG vs. Skill Balance

#### 2.8.1 Design Approach: **Skill-First Hybrid (B)**

**Dice create tactical options → Abilities shape outcomes → Strategy determines victory**

#### 2.8.2 Skill Components (70%)

1. **Resource Management (20%)** - AURA economy optimization
2. **Banking Decisions (15%)** - Risk assessment and timing
3. **Ability Usage (15%)** - Strategic activation and timing
4. **Opponent Prediction (10%)** - Reading opponent loadout and strategy
5. **Match Knowledge (10%)** - Understanding mode rules and probability

#### 2.8.3 RNG Components (30%)

1. **Dice Variance (20%)** - Natural randomness of rolls
2. **Critical Moments (10%)** - Unlikely outcomes (streaks, lucky saves)

#### 2.8.4 Skill Expression Methods

**High-Skill Players Demonstrate:**
- **Optimal AURA Spending** - Never waste resources, maximize value per AURA
- **Probability Calculation** - Understanding bust risk vs. reward potential
- **Ability Timing** - Using abilities at maximum impact moments
- **Loadout Optimization** - Synergistic ability combinations per game mode
- **Psychological Pressure** - Banking aggressively to force opponent mistakes

**Example High-Skill Play:**
> Player has 35 turn score with 2x multiplier active, opponent at 45 total. Player uses **Luck Turner** (6 AURA) to reduce Single 1 probability by 50%, continues rolling safely, builds to 58 points, banks to take 58-45 lead. Opponent pressured into risky rolls, busts with Single 1.

---

## 3. Game Modes

### 3.1 Game Mode Philosophy

DashDice offers **5 distinct game modes** (4 active, 1 disabled), each with unique rules, pacing, and strategic depth:

1. **Quickfire** - Fast casual mode for quick sessions
2. **Classic** - Traditional competitive mode with full rules
3. **Zero Hour** - Countdown strategy with reverse scoring
4. **Last Line** - High-stakes single-turn showdown
5. **True Grit** - (Disabled) Endurance test with stacking multipliers

**Design Goals:**
- **Variety:** Different modes appeal to different playstyles
- **Skill Ceiling:** Each mode rewards different skills
- **Session Length:** Modes range from 2-15 minutes for flexibility
- **Competitive Depth:** All modes support ranked play and tournaments

### 3.2 Quickfire Mode

**"Fast-paced 50-point sprint"**

#### 3.2.1 Configuration
- **Mode ID:** `quickfire`
- **Target Score:** 50 points
- **Starting Score:** 0 points
- **Score Direction:** Upward (0 → 50)
- **Estimated Duration:** 3-5 minutes
- **Platforms:** Web, iOS, Android

#### 3.2.2 Rules
- ✅ All standard dice rules apply
- ✅ Banking allowed
- ✅ Double multiplier system active
- ✅ Snake Eyes: +20 points
- ✅ Double Six: Reset score to 0
- ✅ Single 1: Turn ends, lose turn score
- ✅ Abilities enabled (all categories)

#### 3.2.3 Strategic Focus
- **Aggression Rewarded:** Lower target score favors offensive play
- **Quick AURA Cycles:** Abilities recharge faster due to shorter matches
- **Banking Pressure:** Banking at 20-30 points is often optimal
- **Double Six Risk:** More devastating in shorter matches

#### 3.2.4 Skill Emphasis
- **Decision Speed** - Quick banking calls under pressure
- **Risk Tolerance** - Aggressive rolling to reach 50 first
- **Ability Timing** - Limited AURA budget requires efficiency

### 3.3 Classic Mode

**"Traditional 100-point competitive mode"**

#### 3.3.1 Configuration
- **Mode ID:** `classic`
- **Target Score:** 100 points
- **Starting Score:** 0 points
- **Score Direction:** Upward (0 → 100)
- **Estimated Duration:** 8-10 minutes
- **Platforms:** Web, iOS, Android

#### 3.3.2 Rules
- ✅ All standard dice rules apply
- ✅ Full ability system enabled
- ✅ Banking strategy crucial
- ✅ Double multiplier system
- ✅ Longest match format allows for economic strategies

#### 3.3.3 Strategic Focus
- **Economic Gameplay:** More time to build AURA reserves
- **Comeback Mechanics:** Longer matches allow for recovery
- **Loadout Synergy:** Time to execute multi-ability combos
- **Psychological Warfare:** Banking patterns can intimidate opponents

#### 3.3.4 Skill Emphasis
- **Resource Management** - Optimal AURA spending across longer match
- **Strategic Patience** - Waiting for high-value ability moments
- **Adaptation** - Adjusting strategy based on opponent behavior

### 3.4 Zero Hour Mode

**"Countdown from 100 to exactly 0 with strategic penalties"**

#### 3.4.1 Configuration
- **Mode ID:** `zero-hour` / `zerohour`
- **Starting Score:** 100 points
- **Target Score:** 0 points (exact)
- **Score Direction:** Downward (100 → 0)
- **Estimated Duration:** 10-12 minutes
- **Platforms:** Web, iOS, Android

#### 3.4.2 Unique Rules

**Reverse Scoring:**
- Banking **subtracts** turn score from player total
- Normal roll: Add to turn score
- Banking: `playerScore = playerScore - turnScore`

**Exact Landing Requirement:**
- Must reach exactly 0 to win
- Overshooting (going below 0) **resets player to 100**
- Example: Player at 5 points, banks 8 points → Reset to 100

**Opponent Penalties:**
- **Snake Eyes (1-1):** +20 to your turn score, **+20 to opponent's total**
- **Other Doubles:** +roll total to your turn score, **+roll total to opponent's total**
- Strategic depth: Doubles help you but harm your progress by helping opponent

**Multiplier System:**
- Doubles activate multiplier as normal
- All future rolls in turn are doubled
- Applies to opponent penalties as well

#### 3.4.3 Strategic Focus
- **Precision Timing:** Must calculate exact landing
- **Risk Management:** Overshooting is catastrophic
- **Opponent Manipulation:** Use doubles strategically to increase opponent score
- **Endgame Puzzle:** Final approach requires exact math

#### 3.4.4 Zero Hour Example Turn

```
Player Score: 28 points
Opponent Score: 45 points

Turn:
1. Roll 3-3 → +6 turn score, 2x multiplier active, opponent +6 (now at 51)
2. Roll 4-5 → +18 turn score (9 × 2), opponent +18 (now at 69)
3. Turn Score: 24 points
4. Bank → Player: 28 - 24 = 4 points remaining
5. Turn ends

Result: Player now at 4, opponent at 69 (hurt by penalties)
```

#### 3.4.5 Skill Emphasis
- **Mathematical Precision** - Calculating exact landing math
- **Strategic Doubles** - Knowing when doubles help or hurt
- **Opponent Awareness** - Tracking opponent's distance from 0

### 3.5 Last Line Mode

**"Tug-of-war elimination - Push opponent to zero"**

#### 3.5.1 Configuration
- **Mode ID:** `last-line` / `lastline`
- **Starting Score:** 50 points (both players)
- **Target Score:** 0 points (eliminate opponent)
- **Score Direction:** Tug-of-war (attack opponent's score)
- **Estimated Duration:** 5-8 minutes
- **Platforms:** Web, iOS, Android

#### 3.5.2 Rules
- ✅ Banking allowed (works like Classic mode)
- ✅ Standard dice rules apply
- ✅ Snake Eyes: +20 to turn score
- ✅ Single 1: Turn ends, lose turn score
- ⚠️ **Double Six: NO SCORE RESET** (key difference from Classic)
- ✅ Other Doubles: 2x multiplier active
- ✅ When you bank: Your turn score **subtracts from opponent's total**
- ✅ First to reduce opponent to 0 wins

#### 3.5.3 Strategic Focus
- **Aggressive Banking:** More attacks = faster opponent elimination
- **Double Six Safe:** Can roll aggressively without reset fear
- **Defensive Play:** Banking small amounts to chip away safely
- **Momentum Swings:** One big turn can swing match dramatically

#### 3.5.4 Last Line Example Turn

```
Your Score: 35 points
Opponent Score: 42 points

Your Turn:
1. Roll 4-5 → +9 turn score
2. Roll 3-3 → +6, 2x multiplier activated
3. Roll 5-6 → +22 (11 × 2)
4. Turn Score: 37 points
5. Bank → Opponent: 42 - 37 = 5 points remaining
6. Turn ends

Result: Opponent now at 5 points (close to elimination!)
```

#### 3.5.5 Skill Emphasis
- **Aggressive Banking** - When to attack vs. when to build bigger turn
- **No Reset Fear** - Exploiting Double Six safety for aggressive rolling
- **Elimination Timing** - Calculating exact damage needed to finish opponent

### 3.6 True Grit Mode (Currently Disabled)

**"One extended turn, highest score wins"**

#### 3.6.1 Configuration
- **Mode ID:** `true-grit` / `truegrit`
- **Status:** ❌ Disabled (balancing required)
- **Starting Score:** 0 points
- **Target Score:** Unlimited (highest total wins)
- **Estimated Duration:** 5-7 minutes

#### 3.6.2 Rules (When Active)
- ❌ No banking allowed
- ✅ Each player gets ONE extended turn
- ✅ Roll until Single 1 (forced turn end)
- ✅ **Special Multipliers:** Snake Eyes = 7x multiplier
- ✅ Stacking multipliers possible (2x, 3x, 4x, etc.)
- ✅ Endurance test - longest streak wins

#### 3.6.3 Why Disabled
- **Balance Issues:** Too dependent on streak luck
- **Duration Variance:** Matches can last 2-20 minutes unpredictably
- **Frustration Factor:** Single 1 ending feels unfair
- **Future Plans:** Redesign with safety mechanics before re-enabling

### 3.7 Social League Mode

**"Time-gated friends-only competitive mode"**

#### 3.7.1 Configuration
- **Mode Type:** Meta-mode (wraps other modes)
- **Active Window:** 6:00 PM - 6:15 PM daily (15 minutes)
- **Eligibility:** Must be friends with opponent
- **Scoring:** Win-based (+1 per victory)
- **Reset:** Daily at 6:00 PM

#### 3.7.2 Rules
- ✅ Uses Quickfire or Classic mode rules
- ✅ Only wins count (losses/draws ignored)
- ✅ Friends-only leaderboard
- ✅ Time-gated access (15-minute window)
- ✅ Daily reset for fresh competition

#### 3.7.3 Strategic Focus
- **Social Pressure:** Compete directly with friends
- **Time Urgency:** Limited window creates FOMO
- **Win Optimization:** Must maximize wins in 15 minutes
- **Loadout Speed:** Quick matches favor efficient loadouts

#### 3.7.4 Social League Features
- **Live Timer:** Countdown display shows active/inactive status
- **Rank Badges:** Top 3 players get crown/silver/bronze
- **Victory Videos:** Random victory background displayed
- **Real-time Updates:** Leaderboard updates instantly after each match

#### 3.7.5 Skill Emphasis
- **Speed Decision-Making** - Maximizing matches per window
- **Friend Meta-Gaming** - Knowing friends' playstyles
- **Consistency** - Winning multiple matches quickly

### 3.8 Mode Selection Strategy

**By Player Type:**

| Player Type | Recommended Mode | Why |
|-------------|------------------|-----|
| **Casual** | Quickfire | Fast, low commitment |
| **Competitive** | Classic, Ranked | Full strategic depth |
| **Strategic** | Zero Hour | Puzzle-solving gameplay |
| **High-Roller** | Last Line | High-stakes single roll |
| **Social** | Social League | Play with friends |

**By Session Length:**

| Available Time | Best Mode |
|----------------|-----------|
| 2-5 minutes | Quickfire, Last Line |
| 5-10 minutes | Quickfire, Classic |
| 10-15 minutes | Classic, Zero Hour |
| 15+ minutes | Multiple matches in any mode |

---

## 4. Player Progression System

### 4.1 Progression Overview

DashDice uses a **multi-layered progression system** that rewards both **match performance** (short-term) and **long-term engagement** (account level, unlocks).

**Progression Pillars:**
1. **XP & Leveling** - Account-wide progression
2. **MMR & Ranking** - Competitive skill rating
3. **Ability Unlocks** - Star-based loadout system
4. **Achievements** - Milestone rewards
5. **Seasonal Content** - Time-limited rewards (future)

### 4.2 XP & Leveling System

#### 4.2.1 Earning XP

| Action | XP Gained | Notes |
|--------|-----------|-------|
| **Match Win** | 100-300 XP | Based on mode and match length |
| **Match Loss** | 50-150 XP | Participation reward |
| **First Win of Day** | +100 XP Bonus | Daily incentive |
| **Ability Usage** | +5 XP per use | Encourages ability experimentation |
| **Perfect Victory** | +50 XP Bonus | Win without opponent reaching 25% target |
| **Comeback Win** | +75 XP Bonus | Win after being behind by 30+ points |
| **Achievement** | Variable | 50-500 XP depending on achievement |

**XP Formula:**
```
matchXP = baseXP + (matchDuration × 10) + winBonus + performanceBonus
```

#### 4.2.2 Level Progression

**XP Requirements:**
- **Level 1 → 2:** 100 XP
- **Level 2 → 3:** 200 XP  
- **Level 3 → 4:** 300 XP
- **Formula:** `XP_Required = currentLevel × 100`

**Current Level Cap:** 100 (expandable)

#### 4.2.3 Level Rewards

| Level Range | Rewards |
|-------------|---------|
| **1-10** | Tutorial completion, basic abilities unlocked |
| **10-25** | Rare abilities unlock, +1 star point per 5 levels |
| **25-50** | Epic abilities unlock, cosmetic backgrounds |
| **50-75** | Legendary abilities, exclusive titles |
| **75-100** | Prestige cosmetics, unique loadout slots |

**Star Points by Level:**
- Level 1-5: 5 star points (basic loadouts)
- Level 6-10: 6 star points
- Level 11-15: 7 star points
- Level 16-20: 8 star points
- Level 21+: +1 star point per 5 levels (max 15 at level 100)

### 4.3 MMR & Ranked System

#### 4.3.1 MMR Calculation

**DashDice uses a modified ELO system:**

```
New MMR = Current MMR + K × (Actual Score - Expected Score)
```

**Variables:**
- **K-Factor:** 32 (high volatility for fast placement)
- **Expected Score:** Based on MMR difference between players
- **Actual Score:** 1.0 (win), 0.5 (draw - rare), 0.0 (loss)

#### 4.3.2 Ranked Tiers

| Tier | MMR Range | % of Players | Star Color |
|------|-----------|--------------|------------|
| **Bronze** | 0-999 | 25% | 🟫 Bronze |
| **Silver** | 1000-1499 | 30% | ⚪ Silver |
| **Gold** | 1500-1999 | 25% | 🟨 Gold |
| **Platinum** | 2000-2499 | 12% | 💠 Cyan |
| **Diamond** | 2500-2999 | 5% | 💎 Blue |
| **Master** | 3000-3499 | 2% | 🟣 Purple |
| **Grandmaster** | 3500+ | <1% | ✨ Rainbow |

#### 4.3.3 Ranked Seasons

**Season Duration:** 3 months  
**Season Rewards:**
- Exclusive backgrounds
- Seasonal titles
- Cosmetic dice skins (future)
- Currency rewards (future)

**Soft Reset:**
- New season: `New MMR = (Current MMR + 1200) / 2`
- Keeps some progress while allowing climbing

### 4.4 Star Point System

**Star Points** determine how many abilities and which rarity can be equipped in a loadout.

#### 4.4.1 Star Costs by Rarity

| Rarity | Star Cost | Icon |
|--------|-----------|------|
| **Common** | 1 ⭐ | Gray |
| **Rare** | 2 ⭐⭐ | Blue |
| **Epic** | 3 ⭐⭐⭐ | Purple |
| **Legendary** | 4-5 ⭐⭐⭐⭐ | Gold |

#### 4.4.2 Loadout Building

**Example Loadout (8 Star Points):**
- Tactical: **Luck Turner** (Epic, 3⭐)
- Attack: **None**
- Defense: **Pan Slap** (Epic, 3⭐)
- Utility: **None**
- Game Changer: **None**

**Total:** 6/8 stars used

#### 4.4.3 Strategic Loadout Choices

**High-Rarity Focus:**
- 2 Legendary abilities (4-5 stars each)
- High impact, limited versatility

**Balanced Approach:**
- 1 Epic (3 stars) + 3 Rares (2 stars each) + 2 Commons (1 star each)
- Full loadout coverage, moderate power

**Economy Build:**
- 5 Common abilities (1 star each)
- Maximum versatility, lower individual impact

---

## 5. Combat & Abilities System

### 5.1 Abilities System Overview

The **Power Loadout System** is DashDice's primary skill expression mechanic. Players equip up to **5 abilities** (one per category) that can be activated during matches by spending **AURA**.

**Design Philosophy:**
- **Resource-Based:** Abilities cost AURA (earned through rolls)
- **Category-Locked:** One ability per category prevents ability spam
- **Timing-Dependent:** Abilities activate at specific moments
- **Once-Per-Match:** Most abilities limited to single use per match
- **Counter-Play:** Defensive abilities can counter offensive ones

### 5.2 Ability Categories

#### 5.2.1 Category Breakdown

| Category | Role | Color | Focus |
|----------|------|-------|-------|
| **Tactical** 🔍 | Information & Probability | Blue | Vision, manipulation, scouting |
| **Attack** ⚔️ | Offensive Disruption | Red | Damage, steal, pressure |
| **Defense** 🛡️ | Protection & Counters | Green | Shields, blocks, negation |
| **Utility** 🔧 | Dice Control & Turns | Yellow | Rerolls, turn extension, dice fixing |
| **Game Changer** 💫 | Match-Altering Effects | Purple | Huge swings, ultimate abilities |

#### 5.2.2 Category Synergies

**Aggressive Loadout:**
- Tactical: Vision Surge (reveal opponent abilities)
- Attack: Siphon (steal points)
- Game Changer: (Future ability)

**Defensive Loadout:**
- Tactical: Luck Turner (reduce bust risk)
- Defense: Hard Hat (shield vs. doubles)
- Defense: Pan Slap (end opponent turn)

**Economic Loadout:**
- Tactical: Aura Forge (gain +6 AURA)
- Utility: Vital Rush (multiply turn score)
- Game Changer: (Future ability)

### 5.3 Implemented Abilities

#### 5.3.1 Luck Turner (Tactical, Epic)

**Cost:** 3-6 AURA (variable, increases per use)  
**Timing:** Player's turn only  
**Effect:** Reduce probability of rolling Single 1 by 50% for rest of turn  
**Duration:** Until turn ends  
**Max Uses:** Unlimited (cost increases)  

**Strategic Use:**
- Activate when you have high turn score and want to continue rolling safely
- Cost scaling prevents spamming (3 → 4 → 5 → 6 AURA)
- Best used with active 2x multiplier

**Cost Progression:**
- 1st use: 3 AURA
- 2nd use: 4 AURA
- 3rd use: 5 AURA
- 4th+ use: 6 AURA

#### 5.3.2 Pan Slap (Defense, Epic)

**Cost:** 6 AURA  
**Timing:** Opponent's turn only  
**Effect:** Instantly end opponent's turn, they keep turn score but cannot bank  
**Duration:** Instant  
**Max Uses:** 1 per match  

**Strategic Use:**
- Counter opponent's big turn before they bank
- Forces opponent to lose accumulated turn score
- Best used when opponent has 30+ turn score
- Defensive response to opponent's multiplier activation

**Counter-Play:**
- Bank early to secure points before opponent can use Pan Slap
- Bait out Pan Slap with moderate turn score, then go big next turn

#### 5.3.3 Hard Hat (Defense, Rare)

**Cost:** 5 AURA  
**Timing:** Player's turn (before rolling)  
**Effect:** Shield against Double Six reset for 3 rolls  
**Duration:** 3 rolls  
**Max Uses:** 1 per match  

**Strategic Use:**
- Activate when approaching target score and want to roll aggressively
- Removes Double Six risk entirely for 3 rolls
- Pairs well with Luck Turner (removes both Single 1 and Double 6 risks)

**Visual:** Golden shield icon appears above player dice

#### 5.3.4 Siphon (Attack, Rare)

**Cost:** 7 AURA  
**Timing:** Opponent's turn (after opponent banks)  
**Effect:** Steal 25% of opponent's banked score, add to your total  
**Duration:** Instant  
**Max Uses:** 1 per match  

**Strategic Use:**
- Punish opponent for large banks (30+ points)
- Creates comeback mechanic
- Forces opponent into banking smaller amounts more frequently

**Example:**
- Opponent banks 40 points
- You activate Siphon
- You gain 10 points, opponent loses 10 points
- Net swing: 20-point advantage

#### 5.3.5 Aura Forge (Utility, Rare)

**Cost:** 0 AURA (generates AURA)  
**Timing:** Player's turn only  
**Effect:** Immediately gain +6 AURA  
**Duration:** Instant  
**Max Uses:** 1 per match  

**Strategic Use:**
- Economic ability that enables expensive abilities earlier
- Best used early in match to build AURA advantage
- Pairs with Game Changer abilities (high cost)

**Strategic Combos:**
- Turn 1: Aura Forge (+6 AURA)
- Turn 2-3: Roll to gain +3-4 AURA
- Turn 4: Activate 9-10 AURA Game Changer ability

#### 5.3.6 Vital Rush (Utility, Epic)

**Cost:** 8 AURA  
**Timing:** Player's turn (before banking)  
**Effect:** Multiply current turn score by 1.5x before banking  
**Duration:** Instant  
**Max Uses:** 1 per match  

**Strategic Use:**
- Best used on high turn scores (40+ points)
- Pairs with 2x multiplier for massive banks
- Requires AURA investment, so mid-to-late match use

**Example:**
- Turn score: 42 points
- Activate Vital Rush
- Bank 63 points (42 × 1.5)

**Visual:** Light blue dice containers, black text, blue glow effect

### 5.4 Ability Timing System

#### 5.4.1 Timing Windows

| Timing Type | When Usable | Abilities |
|-------------|-------------|-----------|
| **own_turn** | Only during your active turn | Luck Turner, Aura Forge, Vital Rush, Hard Hat |
| **opponent_turn** | Only during opponent's turn | Pan Slap, Siphon |
| **any_turn** | Anytime during gameplay | (Future abilities) |

#### 5.4.2 Activation Flow

**Player Turn Activation:**
1. Player's turn begins
2. AURA check: Do I have enough?
3. Timing check: Is ability `own_turn` or `any_turn`?
4. Click ability button
5. AURA deducted immediately
6. Effect applies
7. Visual/audio feedback
8. Continue turn

**Opponent Turn Activation:**
1. Opponent rolling
2. You watch their turn score build
3. AURA check: Do I have enough?
4. Timing check: Is ability `opponent_turn` or `any_turn`?
5. Opponent reaches critical threshold (e.g., 35 turn score)
6. You activate Pan Slap
7. Opponent's turn instantly ends
8. They lose turn score
9. Your turn begins

### 5.5 Ability UI/UX

#### 5.5.1 In-Match Display

**Abilities shown as horizontal bar below dice:**
- Circular ability icons (80px × 80px)
- AURA cost badge (top-right corner)
- Category color border
- Grayscale when unaffordable
- Pulsing glow when ready
- Disabled state when wrong timing

#### 5.5.2 Affordability States

| State | Visual | Clickable |
|-------|--------|-----------|
| **Ready** | Full color, pulsing glow | ✅ Yes |
| **Insufficient AURA** | Grayscale, AURA cost in red | ❌ No |
| **Wrong Timing** | Grayscale, locked icon | ❌ No |
| **Used (Once-Per-Match)** | Crossed out, grayed | ❌ No |
| **On Cooldown** | Timer overlay, gray | ❌ No |

#### 5.5.3 Activation Animation

1. **Click ability button**
2. **AURA deduction animation** - AURA counter flashes and decreases
3. **Ability video plays** - Full-screen ability activation video (3-5 seconds)
4. **Effect applies** - Dice, score, or game state changes
5. **Return to gameplay** - Smooth transition back to match

**Example (Vital Rush):**
- Click Vital Rush icon
- AURA: 10 → 2 (flash animation)
- Full-screen Vital Rush video plays (glowing blue dice)
- Turn score multiplies: 44 → 66
- Score display animates change
- Return to gameplay

---

## 6. Characters & Avatars

### 6.1 Current System (No Character Roles)

**DashDice currently does NOT have character-based roles or heroes.** All players compete on equal footing with identical base capabilities. The only differentiation comes from:

1. **Ability Loadouts** - Player-chosen ability combinations
2. **Cosmetic Customization** - Visual personalization only
3. **Skill Level** - Player experience and decision-making

**Design Philosophy:** **Open System** - No character-locked abilities or stats. Players express individuality through loadout choices and playstyle, not character selection.

### 6.2 Avatar System (Cosmetic Only)

#### 6.2.1 Avatar Types (Planned)

| Avatar Category | Purpose | Examples |
|-----------------|---------|----------|
| **Profile Picture** | Displayed in menus, leaderboards | Static images, animated GIFs |
| **In-Match Icon** | Small icon during gameplay | Simplified character portraits |
| **Victory Pose** | Shown after winning | Animated celebration sprites |
| **Emotes** | In-match communication | Thumbs up, GG, thinking face |

#### 6.2.2 Avatar Acquisition

**Starting Avatars:**
- All players receive **1 default avatar** on registration
- Default avatar: Generic dice icon or player initial

**Unlocking Avatars:**
- **Achievement Rewards:** Complete specific achievements
- **Level Milestones:** Every 10 levels unlocks new avatar
- **Shop Purchase:** Premium avatars available for purchase (future)
- **Seasonal Events:** Limited-time avatars during special events (future)

#### 6.2.3 Avatar Customization (Future)

**Planned Features:**
- **Accessories:** Hats, glasses, backgrounds
- **Expressions:** Multiple emotions for different game states
- **Animations:** Idle, victory, defeat poses
- **Color Variations:** Palette swaps for existing avatars

### 6.3 Why No Character Roles?

**Competitive Balance:**
- Removes character tier lists and meta dependency
- Ensures matches are purely skill-based
- Simplifies game balance (only balance abilities, not characters)
- Prevents "hard counter" matchups

**Accessibility:**
- New players aren't disadvantaged by character unfamiliarity
- No learning curve for character abilities
- Faster onboarding (learn game, not 20 characters)

**Economic Fairness:**
- No pay-to-win through character purchases
- All players have equal access to base game mechanics
- Cosmetic-only monetization model

**Future Consideration:**
If characters are introduced, they would be **purely cosmetic skins** with no gameplay impact, similar to Fortnite skins or CSGO weapon skins.

---

## 7. Economy & Monetization

### 7.1 Currency System

#### 7.1.1 Free Currency (Planned)

**Coins (Gameplay Currency):**
- **Earned Through:** Match wins, daily quests, achievements
- **Used For:** Common cosmetics, ability unlocks, consumables
- **Earn Rate:** 50-200 coins per match (based on performance)
- **Daily Cap:** 2,000 coins per day (prevents grinding exploitation)

**Crystals (Premium-Lite Currency):**
- **Earned Through:** Gameplay milestones, level-ups, achievements
- **Used For:** Rare cosmetics, dice skins, special unlocks
- **Earn Rate:** 10-50 crystals per milestone
- **Can Purchase:** Available in shop with real money

#### 7.1.2 Premium Currency (Future)

**Gems (Premium Currency):**
- **Purchased With:** Real money only
- **Used For:** Exclusive cosmetics, battle passes, premium backgrounds
- **Conversion:** Cannot be converted to coins/crystals
- **Pricing:** $0.99 = 100 gems, $4.99 = 550 gems, $9.99 = 1200 gems

### 7.2 Monetization Model

#### 7.2.1 Revenue Streams

**Primary (Current Focus):**
1. **Cosmetic Sales** - Backgrounds, dice skins, avatars
2. **Premium Backgrounds** - Exclusive high-quality animated backgrounds
3. **Battle Pass** (Future) - Seasonal progression with exclusive rewards

**Secondary (Future):**
4. **Subscriptions** - Premium membership with perks
5. **Tournament Entry Fees** - Competitive events with prize pools
6. **Gifting System** - Send cosmetics to friends

#### 7.2.2 Free-to-Play Philosophy

**Core Principle:** **100% Gameplay Free, Cosmetics Paid**

**What's Free:**
- ✅ All game modes
- ✅ All abilities (unlock through play)
- ✅ Ranked matchmaking
- ✅ Social League
- ✅ Friends system
- ✅ Basic cosmetics

**What Costs Money:**
- 💎 Premium backgrounds (animated, high-quality)
- 💎 Exclusive dice skins
- 💎 Limited-edition avatars
- 💎 Battle Pass (seasonal)
- 💎 Premium subscription perks

**No Pay-to-Win:**
- ❌ Cannot buy abilities with money
- ❌ Cannot buy MMR or rank boosts
- ❌ Cannot buy AURA or in-match advantages
- ❌ Cannot skip progression with money

### 7.3 Shop System

#### 7.3.1 Shop Categories

**Backgrounds Store:**
- Premium animated backgrounds ($2.99-$9.99)
- Themed background packs ($14.99 for 5 backgrounds)
- Seasonal exclusives (limited availability)

**Dice Customization Store:**
- Dice shapes (50-200 crystals or $0.99-$2.99)
- Dice fonts (50-200 crystals or $0.99-$2.99)
- Dice trail effects (100-300 crystals or $1.99-$4.99)
- Complete dice sets ($4.99-$9.99)

**Avatar Store:**
- Common avatars (500 coins or 50 crystals)
- Rare avatars (1000 coins or 100 crystals)
- Epic avatars (200 crystals or $1.99)
- Legendary avatars (500 crystals or $4.99)

**Currency Packs:**
- 100 Crystals - $0.99
- 550 Crystals - $4.99 (10% bonus)
- 1200 Crystals - $9.99 (20% bonus)
- 2500 Crystals - $19.99 (25% bonus)

#### 7.3.2 Shop UI/UX

**Featured Section:**
- Rotating daily/weekly featured items
- Limited-time offers
- New releases highlighted

**Sale Events:**
- Seasonal sales (25-50% off)
- Flash sales (1-3 hours, deep discounts)
- Bundle deals (buy 3, get 1 free)

**Wishlist System:**
- Players can wishlist items
- Notifications when wishlist items go on sale
- Gift wishlist items to friends

### 7.4 Progression Rewards

#### 7.4.1 Free Track Rewards

| Level | Reward |
|-------|--------|
| 1 | Default avatar, 6 starter backgrounds |
| 5 | 100 coins, 1 rare background |
| 10 | 1 epic background, 50 crystals |
| 15 | 200 coins, 1 rare avatar |
| 20 | 1 epic avatar, 100 crystals |
| 25 | 500 coins, 1 legendary background |
| 50 | 1 legendary avatar, 500 crystals |
| 100 | Exclusive "Centurion" title, prestige background |

#### 7.4.2 Daily/Weekly Quests

**Daily Quests (3 per day):**
- Win 3 matches → 100 coins
- Use 5 abilities → 50 coins
- Play Social League match → 50 crystals
- Bank 200+ points in single match → 100 coins

**Weekly Quests (3 per week):**
- Win 15 matches → 500 coins
- Reach win streak of 5 → 100 crystals
- Complete all daily quests 5 days → 200 crystals
- Use all 5 ability categories → 150 crystals

### 7.5 Pricing Strategy

#### 7.5.1 Competitive Analysis

| Game | Average Cosmetic Price | Battle Pass | Subscription |
|------|------------------------|-------------|--------------|
| Fortnite | $8-$20 | $9.99 | N/A |
| Clash Royale | $2-$10 | $4.99 | $4.99/month |
| Brawl Stars | $3-$15 | $9.99 | $9.99/month |
| **DashDice Target** | **$1-$10** | **$4.99** | **$3.99/month** |

#### 7.5.2 Regional Pricing

**Adjusted Pricing by Region:**
- **North America:** Standard USD pricing
- **Europe:** €0.99-€9.99 (adjusted for purchasing power)
- **Latin America:** 30-50% discount (Brazil, Mexico, Argentina)
- **Asia:** Adjusted per market (India: ₹79-799, Japan: ¥120-1200)

### 7.6 Anti-Predatory Measures

**Ethical Monetization:**
- ❌ No loot boxes or gambling mechanics
- ❌ No misleading "limited time" pressure tactics
- ❌ No auto-renewing purchases without clear warning
- ✅ Full price transparency (all costs shown upfront)
- ✅ Refund policy (within 24 hours if unused)
- ✅ Parental controls for underage players
- ✅ Spending limits (optional daily/weekly caps)

---

## 8. Cosmetics & Customization

### 8.1 Background System

#### 8.1.1 Background Types

**Video Backgrounds (Animated):**
- MP4 format, 1920×1080 resolution
- Auto-play, loop, muted
- Examples: New Day (sunrise), Underwater (flowing water), On A Mission (action)

**Image Backgrounds (Static):**
- JPG/PNG format, high resolution
- Gradient overlays for text readability
- Examples: All For Glory (battle scene), Long Road Ahead (scenic road)

**Gradient Backgrounds (Procedural):**
- CSS-based gradients
- Lightweight, fast loading
- Customizable color schemes

#### 8.1.2 Background Contexts

DashDice uses **context-based backgrounds** for different game areas:

| Context | Where Displayed | Examples |
|---------|-----------------|----------|
| **Dashboard Display** | Main menu, lobby | Player's equipped display background |
| **Match Background** | During gameplay | Player's equipped match background |
| **Turn Decider** | Pre-game odd/even phase | Special turn decider backgrounds |
| **Victory Screen** | Post-match results | Victory animation backgrounds |
| **Leaderboard Card** | Ranked leaderboards | Player profile background |
| **Waiting Room** | Matchmaking lobby | Full-screen background with overlays |

#### 8.1.3 Default Backgrounds

**All Players Start With (6 Backgrounds):**
1. **New Day** (Video) - Hopeful sunrise animation
2. **On A Mission** (Video) - Action-packed sequence
3. **Underwater** (Video) - Calming underwater scene
4. **All For Glory** (Image) - Epic battle artwork
5. **Long Road Ahead** (Image) - Scenic journey visual
6. **Relax** (Image) - Peaceful environment

#### 8.1.4 Premium Backgrounds (Future)

**Rarity System:**
- **Common:** Free earnable backgrounds (starter set)
- **Rare:** 100-200 crystals or $0.99-$1.99
- **Epic:** 200-400 crystals or $2.99-$4.99
- **Legendary:** 500+ crystals or $4.99-$9.99
- **Masterpiece:** Exclusive, limited edition ($9.99-$19.99)

**Themed Collections:**
- **Nature Pack:** Forest, desert, mountain, ocean (4 backgrounds, $9.99)
- **Sci-Fi Pack:** Space station, cyberpunk city, alien world ($12.99)
- **Fantasy Pack:** Castle, dragon's lair, enchanted forest ($9.99)
- **Sports Pack:** Stadium, arena, race track ($7.99)

### 8.2 Dice Customization

#### 8.2.1 Dice Shapes

**Current Implementation:** Standard 3D dice (white/black with dots)

**Planned Shapes (Future):**
| Shape Name | Description | Unlock Cost |
|------------|-------------|-------------|
| Classic Cube | Standard sharp-edge dice | Default (free) |
| Rounded | Smooth rounded edges | 50 crystals |
| Gem Cut | Diamond-faceted dice | 100 crystals |
| Chrome | Metallic reflective surface | 150 crystals |
| Wooden | Natural wood texture | 75 crystals |
| Crystal | Transparent with internal glow | 200 crystals |
| Neon | Glowing neon edges | 150 crystals |
| Ancient | Weathered stone appearance | 100 crystals |

#### 8.2.2 Dice Fonts

**Planned Fonts (Future):**
| Font Name | Description | Unlock Cost |
|-----------|-------------|-------------|
| Classic Dots | Traditional pip dots | Default (free) |
| Roman Numerals | I, II, III, IV, V, VI | 50 crystals |
| Digital | LED-style numbers | 75 crystals |
| Runes | Fantasy rune symbols | 100 crystals |
| Emojis | Fun emoji faces | 50 crystals |
| Symbols | Stars, hearts, diamonds | 75 crystals |
| Minimalist | Clean modern numbers | 50 crystals |
| Bold Numbers | Large bold numerals | 50 crystals |

#### 8.2.3 Dice Effects

**Trail Effects (Future):**
- Fire trail (rolls leave fire particles)
- Ice trail (frost particles)
- Electric sparks (lightning effects)
- Rainbow streak (color trail)
- Shadow clone (multiple dice illusions)

**Landing Effects:**
- Explosion (dice land with impact)
- Sparkles (glitter on landing)
- Shockwave (energy ripple)
- Portal (dice emerge from portal)

### 8.3 UI Themes & Color Schemes

#### 8.3.1 Current Theme System

DashDice uses **background-driven UI themes** where UI colors adapt based on equipped background:

**Implemented Themes:**
- **New Day** - Golden/yellow warm tones
- **All For Glory** - Red/white/blue patriotic colors
- **On A Mission** - Light blue with red accents
- **Relax** - White/blue beautiful gradients with black cards
- **Underwater** - Cyan/teal ocean colors
- **Long Road Ahead** - Purple/black/blue gradients

**Theme Variables (CSS):**
```css
--ui-background-primary: (light tone from background)
--ui-background-secondary: (secondary tone)
--ui-text-primary: (high contrast text)
--ui-button-bg: (accent color from background)
--ui-border: (border color matching theme)
```

#### 8.3.2 Custom UI Themes (Future)

**Player-Created Themes:**
- Color picker for primary/secondary/accent colors
- Preview system before applying
- Save up to 5 custom themes
- Share themes with friends (theme codes)

### 8.4 Titles & Badges

#### 8.4.1 Title System

**Titles displayed under username:**

| Title | How to Earn | Rarity |
|-------|-------------|--------|
| **Newcomer** | Default starting title | Common |
| **Dice Roller** | Win 10 matches | Common |
| **Lucky Streak** | Win streak of 5 | Rare |
| **Bankroll** | Bank 1000+ points total | Rare |
| **Ability Master** | Use all 16 abilities | Epic |
| **AURA Expert** | Spend 500+ AURA total | Epic |
| **Undefeated** | Win 10 matches in row | Legendary |
| **Grandmaster** | Reach Grandmaster rank | Legendary |
| **Dice God** | Win 1000 matches | Masterpiece |
| **Social Champion** | Win 50 Social League matches | Epic |
| **Centurion** | Reach level 100 | Legendary |

#### 8.4.2 Badge System

**Badges displayed on player profile:**

**Achievement Badges:**
- 🏆 **First Victory** - Win first match
- 🔥 **Hot Streak** - 10-win streak
- 💎 **Big Spender** - Spend 1000+ AURA
- 🎯 **Precision** - Win Zero Hour by exactly 0
- ⚡ **Speed Demon** - Win Quickfire in under 2 minutes

**Seasonal Badges:**
- 🌟 **Season 1 Veteran** - Played in Season 1
- 👑 **Season Champion** - Top 100 in any season
- 🎃 **Halloween 2025** - Participated in Halloween event

**Prestige Badges:**
- ✨ **Legendary Player** - 500+ total wins
- 🔮 **Mythical** - 1000+ total wins
- 💫 **Deity** - 5000+ total wins (ultimate badge)

### 8.5 Victory Animations

#### 8.5.1 Victory Screen System

**Current Implementation:**
- Random selection from equipped victory backgrounds
- Victory video plays (3-5 seconds)
- "VICTORY" text overlay with golden glow
- Player stats displayed (points scored, abilities used, AURA spent)

**Victory Background Examples:**
- Wind Blade (swirling wind effect)
- Crazy Cough (explosive energy)
- Burning Throne (flames and power)
- Sky Cascade (heavenly beams)

#### 8.5.2 Victory Poses (Future)

**Character Celebration Animations:**
- Avatar performs victory animation
- Different animations per rarity (common, rare, epic, legendary)
- Examples: Fist pump, dance, trophy raise, confetti explosion

### 8.6 Emote System (Future)

#### 8.6.1 In-Match Emotes

**Quick Communication:**
- 👍 **Good Luck** - Pre-match greeting
- 😮 **Wow!** - React to big plays
- 🤝 **Good Game** - Post-match respect
- 🤔 **Thinking...** - During decision-making
- 😅 **Oops!** - After mistake
- 🔥 **On Fire!** - During winning streak

**Emote Wheel:**
- 8-slot radial menu (hold button to open)
- Customizable emote assignments
- Unlock emotes through progression or shop

#### 8.6.2 Emote Etiquette

**Anti-Toxicity Measures:**
- Emote cooldown (10 seconds between uses)
- "Mute Emotes" option in settings
- Report system for emote spam abuse
- Friendly emotes only (no BM emotes)

---

## 9. Live Operations & Seasonal Content

### 9.1 Live Operations Philosophy

**Goals:**
1. **Player Retention** - Give reasons to return daily/weekly
2. **Fresh Content** - Regular updates keep game feeling new
3. **Community Engagement** - Events foster player interaction
4. **Revenue Generation** - Monetize seasonal content ethically

### 9.2 Daily/Weekly Rotation

#### 9.2.1 Daily Reset (6:00 AM Local Time)

**Resets:**
- Daily quests (3 new quests)
- Social League leaderboard (6:00 PM)
- First Win of Day bonus (100 XP)
- Daily login rewards

**Daily Login Rewards:**
| Day | Reward |
|-----|--------|
| Day 1 | 50 coins |
| Day 2 | 100 coins |
| Day 3 | 25 crystals |
| Day 4 | 150 coins |
| Day 5 | 50 crystals |
| Day 6 | 200 coins |
| Day 7 | 100 crystals + 1 random background |

#### 9.2.2 Weekly Reset (Monday 12:00 AM)

**Resets:**
- Weekly quests (3 new quests)
- Weekly leaderboard rankings
- Featured shop items rotation
- Tournament schedules

### 9.3 Social League (Daily Event)

**Active Window:** 6:00 PM - 6:15 PM daily (15 minutes)

**Features:**
- Friends-only competitive mode
- Win-based scoring (+1 per win)
- Daily leaderboard reset
- Top 3 players get crown/silver/bronze badges
- Real-time countdown timer
- Button status: RED (inactive) / BLUE (active)

**Rewards (Future):**
- 1st Place: 100 crystals + exclusive title
- 2nd Place: 75 crystals
- 3rd Place: 50 crystals
- Participation: 10 crystals per win

### 9.4 Seasonal Content

#### 9.4.1 Season Structure

**Season Duration:** 3 months (4 seasons per year)

**Season Themes:**
- **Season 1 (Jan-Mar):** "Winter Clash" - Icy themes, snow effects
- **Season 2 (Apr-Jun):** "Spring Awakening" - Nature themes, blooming effects
- **Season 3 (Jul-Sep):** "Summer Blaze" - Fire/sun themes, heat effects
- **Season 4 (Oct-Dec):** "Autumn Legends" - Fall colors, harvest themes

#### 9.4.2 Battle Pass System (Future)

**Free Track (All Players):**
- 50 reward tiers
- Coins, crystals, common cosmetics
- Complete via XP gain (matches, quests)

**Premium Track ($4.99):**
- All free rewards PLUS:
- Exclusive backgrounds (3 legendary per season)
- Exclusive avatars (2 epic, 1 legendary)
- Exclusive dice skins (2 rare, 1 epic)
- 1000 crystals bonus (worth $9.99)
- Exclusive season title

**Battle Pass XP Sources:**
- Match wins: 500 XP
- Match losses: 250 XP
- Daily quests: 1000 XP each
- Weekly quests: 3000 XP each
- First Win of Day: 500 XP bonus

**Total XP Required:** 150,000 XP (achievable in 2-3 months with consistent play)

### 9.5 Limited-Time Events

#### 9.5.1 Weekend Tournaments

**Format:**
- Friday-Sunday (72 hours)
- Entry: Free or premium (paid entry = bigger prizes)
- Structure: Swiss rounds → Top 8 single elimination
- Rewards: Crystals, exclusive cosmetics, titles

**Tournament Types:**
- **Quickfire Blitz** - Fast 3-minute matches
- **Classic Showdown** - Traditional 10-minute matches
- **Zero Hour Challenge** - Countdown mastery test
- **All-Star Social** - Friends teams compete

#### 9.5.2 Holiday Events

**Halloween (October):**
- Spooky backgrounds (Haunted Mansion, Graveyard, Witch's Lair)
- Pumpkin dice skins
- "Spooky Streak" achievement (win 13 matches)
- Halloween emotes (ghost, pumpkin, bat)

**Winter/Christmas (December):**
- Snow-themed backgrounds (Winter Wonderland, Santa's Workshop)
- Candy cane dice, snowflake effects
- "12 Days of DashDice" daily rewards
- Holiday music tracks

**Lunar New Year (January/February):**
- Asian-themed backgrounds (Dragon Temple, Lantern Festival)
- Golden dragon dice
- Red envelope rewards (bonus crystals)
- Firework victory effects

#### 9.5.3 Collaboration Events (Future)

**Brand Partnerships:**
- Streamer collaborations (exclusive skins with % revenue share)
- Esports org partnerships (team-branded cosmetics)
- Charity events (proceeds donated to causes)

### 9.6 Community Challenges

**Global Challenges (All Players Contribute):**
- **Community Goal:** "Roll 1 million dice collectively"
- **Reward:** Everyone gets 100 crystals when goal reached
- **Duration:** 1 week
- **Progress:** Real-time tracker on main menu

**Examples:**
- Bank 10 million points collectively → Free legendary background
- Use 50,000 abilities → Double XP weekend
- Win 100,000 matches → New game mode unlocked

---

## 10. Matchmaking & Social Systems

### 10.1 Matchmaking Architecture

#### 10.1.1 Queue Types

| Queue Type | Matchmaking Basis | Wait Time | Mode Selection |
|------------|-------------------|-----------|----------------|
| **Quick Play** | MMR ±200 range | <30 seconds | Quickfire, Classic, Last Line |
| **Ranked** | Strict MMR matching | 30-60 seconds | Classic only |
| **Social League** | Friends + MMR | <15 seconds | Quickfire |
| **Custom Lobby** | Friend invites | Instant | All modes |
| **Bot Match** | AI opponent | Instant | All modes |

#### 10.1.2 MMR System

**Initial MMR:** 1200 (Silver tier starting point)

**MMR Gain/Loss Formula:**
```
MMR Change = K × (Actual Score - Expected Score)

K-Factor: 32 (high volatility for faster placement)
Expected Score: 1 / (1 + 10^((Opponent MMR - Your MMR) / 400))
Actual Score: 1.0 (win), 0.5 (draw - rare), 0.0 (loss)
```

**Example:**
- You (1500 MMR) vs Opponent (1500 MMR)
- Expected Score: 0.5 (equal skill)
- You win (Actual: 1.0)
- MMR Change: 32 × (1.0 - 0.5) = +16 MMR
- New MMR: 1516

**Underdog Bonus:**
- You (1400 MMR) vs Opponent (1700 MMR)
- Expected Score: 0.24 (underdog)
- You win (Actual: 1.0)
- MMR Change: 32 × (1.0 - 0.24) = +24 MMR (bigger gain!)

#### 10.1.3 Matchmaking Preferences

**Player Settings:**
- Preferred game modes (multi-select)
- Max acceptable wait time (30s, 60s, 120s, unlimited)
- Voice chat preference (enabled/disabled)
- Cross-platform matching (on/off)

**Quality vs. Speed:**
- First 15 seconds: Strict MMR match (±100 MMR)
- 15-30 seconds: Expanded range (±200 MMR)
- 30-60 seconds: Wide range (±400 MMR)
- 60+ seconds: Accept any match

### 10.2 Party System

#### 10.2.1 Friend Invites

**Invite Flow:**
1. Player A opens friends list
2. Clicks "Invite to Match" on Friend B
3. Friend B receives notification
4. Friend B accepts → Both enter waiting room
5. Matchmaking finds 2 additional players (2v2 future) or starts 1v1

**Party Features:**
- Party chat (voice + text)
- Party leader controls mode selection
- "Ready" system (all must ready up)
- Kick/leave party options

#### 10.2.2 Custom Lobbies

**Create Lobby:**
- Select game mode
- Set lobby name
- Generate join code (6 characters)
- Invite friends or share code

**Lobby Settings:**
- Max players: 2-4 (based on mode)
- Spectators allowed: Yes/No
- Ability restrictions: None/Limited/Disabled
- Match recording: On/Off (for content creators)

### 10.3 Friends System

#### 10.3.1 Friend Code System

**Each player has unique 8-character friend code:**
- Format: `ABC-12345` (letters + numbers)
- Displayed on profile
- Copy/paste friendly
- Case-insensitive

**Adding Friends:**
1. Click "Add Friend"
2. Enter friend code or username
3. Send friend request
4. Friend accepts/declines
5. Added to friends list

#### 10.3.2 Friends List Features

**Real-time Presence:**
- 🟢 **Online** - In menus
- 🔵 **In Match** - Currently playing (show game mode)
- 🟡 **Away** - Inactive for 5+ minutes
- ⚪ **Offline** - Not logged in

**Friend Actions:**
- Invite to match
- View profile
- Send message (text chat)
- Spectate match (if allowed)
- Remove friend
- Block user

#### 10.3.3 Social League Integration

**Friends-Only Competitive Mode:**
- Only counts wins against friends
- Displayed on separate leaderboard
- Encourages friend invites
- Social pressure to perform

### 10.4 Chat System

#### 10.4.1 Chat Types

**Pre-Match Lobby Chat:**
- Text only
- All players in waiting room
- Profanity filter enabled
- Emotes allowed

**In-Match Voice Chat (Current Implementation):**
- **Push-to-Talk Button:** Hold microphone button to record voice
- **Real-Time Transcription:** Voice automatically converted to text via OpenAI Whisper API
- **Multi-Language Support:** Transcribes in player's selected language (English, Spanish, Portuguese, French, German, Japanese, Korean, Chinese)
- **Automatic Translation:** Messages translated to opponent's language in real-time
- **Text Display:** Transcribed text appears in match chat overlay
- **Audio Duration Tracking:** Shows recording length (in seconds)
- **Mute Controls:** 
  - Microphone mute (disable voice input)
  - Chat mute (hide incoming messages)
- **Privacy:** Voice audio not stored, only transcribed text saved
- **Platform:** Web, iOS, Android (uses device microphone)

**Voice Chat Technical Details:**
- **Audio Processing:** MediaRecorder API with echo cancellation, noise suppression, auto-gain control
- **Format:** WebM or MP4 audio (128kbps)
- **Transcription API:** `/api/transcribe` endpoint (OpenAI Whisper integration)
- **Latency:** ~1-2 seconds from voice → text → opponent display
- **Accessibility:** Players who can't/don't want to speak can still read transcribed messages

#### 10.4.2 Anti-Toxicity Features

**Automated Systems:**
- **Profanity filter** (blocks offensive words in transcribed text)
- **Spam detection** (rate limiting on voice messages)
- **Language detection** (validates transcription language matches player setting)
- **Report system** (flag toxic players for voice/text abuse)
- **Temporary mute** (30 min, 24 hours, permanent)
- **Empty transcription handling** (filters out non-speech audio)

**Voice Chat Safeguards:**
- Players can mute microphone at any time
- Players can mute opponent's messages
- Only transcribed text is stored (audio not retained)
- Failed transcriptions don't send empty messages
- Minimum audio duration requirement (prevents spam clicks)

**Manual Moderation:**
- Human review of reports (transcribed text logged for evidence)
- Context-aware decisions
- Appeals system
- Ban escalation (warning → temp ban → permanent ban)

### 10.5 Spectator System (Future)

#### 10.5.1 Spectate Friends

**Features:**
- Watch friend's live match
- No delay (real-time spectating)
- See both players' cards (no fog of war)
- Cannot communicate with players

**Access Control:**
- Players can disable spectating in settings
- Ranked matches: Spectating disabled by default
- Custom lobbies: Host decides

#### 10.5.2 Tournament Spectating

**Broadcast Mode:**
- Caster controls (pause, rewind, slow-mo)
- Player POV switching
- Stats overlay (MMR, win rate, favorite abilities)
- Twitch/YouTube integration for streaming

---

## 11. UI/UX Design System

### 11.1 Visual Design Philosophy

**Design Principles:**
1. **Clarity First** - Information hierarchy prioritizes gameplay-critical data
2. **Mobile-First** - Responsive design optimized for touch interfaces
3. **Fast & Fluid** - Animations enhance, never block gameplay
4. **Accessible** - High contrast, readable fonts, colorblind support
5. **Minimalist** - Clean interfaces, no visual clutter

### 11.2 Typography System

#### 11.2.1 Font Hierarchy

**Primary Font: Audiowide**
- **Usage:** Headers, titles, game mode names, player names
- **Characteristics:** Bold, modern, gaming aesthetic
- **Weights:** Regular (400)
- **Example:** "DASHDICE", "QUICK FIRE", "VICTORY"

**Secondary Font: Montserrat**
- **Usage:** Body text, descriptions, UI labels
- **Characteristics:** Clean, readable, professional
- **Weights:** Regular (400), Medium (500), Bold (700)
- **Example:** Match descriptions, ability tooltips, settings

**Monospace Font: Roboto Mono**
- **Usage:** Numbers, scores, timers, statistics
- **Characteristics:** Fixed-width, easy scanning
- **Example:** "1,543 points", "2:35 remaining"

#### 11.2.2 Font Sizes (Responsive)

| Element | Mobile | Desktop |
|---------|--------|---------|
| **Hero Title** | 3rem (48px) | 5rem (80px) |
| **Section Header** | 1.5rem (24px) | 2rem (32px) |
| **Body Text** | 1rem (16px) | 1.125rem (18px) |
| **Small Text** | 0.875rem (14px) | 1rem (16px) |
| **Score Display** | 2rem (32px) | 3rem (48px) |

### 11.3 Color System

#### 11.3.1 Theme-Adaptive Colors

**DashDice uses background-driven theming:**

```css
/* CSS Custom Properties */
:root {
  --ui-background-primary: #fef3c7;
  --ui-background-secondary: #fef9e5;
  --ui-text-primary: #92400e;
  --ui-button-bg: #d97706;
  --ui-border: #f59e0b;
}

/* Themes change based on equipped background */
[data-theme="underwater"] {
  --ui-background-primary: #ecfeff;
  --ui-text-primary: #164e63;
  --ui-button-bg: #0891b2;
  --ui-border: #06b6d4;
}
```

#### 11.3.2 Semantic Colors (Universal)

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Success** | Green | #10B981 | Win states, positive actions |
| **Error** | Red | #EF4444 | Loss, bust, errors |
| **Warning** | Yellow | #F59E0B | Caution, timer warnings |
| **Info** | Blue | #3B82F6 | Neutral information |
| **AURA** | Purple | #8B5CF6 | AURA resource display |

#### 11.3.3 Rarity Colors

| Rarity | Color | Hex | Glow |
|--------|-------|-----|------|
| **Common** | Gray | #9CA3AF | None |
| **Rare** | Blue | #3B82F6 | Soft blue |
| **Epic** | Purple | #8B5CF6 | Purple pulse |
| **Legendary** | Gold | #F59E0B | Golden shimmer |
| **Masterpiece** | Rainbow | Gradient | Rainbow glow |

### 11.4 Component Library

#### 11.4.1 Buttons

**Primary Button:**
```tsx
<button className="
  px-6 py-3 
  rounded-xl 
  bg-gradient-to-r from-blue-600 to-purple-600
  text-white font-bold
  hover:scale-105 
  transition-all duration-200
  shadow-lg hover:shadow-xl
">
  PLAY NOW
</button>
```

**Secondary Button:**
- Outline style with theme-adaptive border
- Transparent background with hover fill
- Lower visual priority

**Icon Button:**
- Circular or square shape
- Single icon, no text
- Used for actions like settings, close, back

#### 11.4.2 Cards

**Game Mode Card:**
- 300px × 200px (desktop), full-width (mobile)
- Gradient background matching mode theme
- Icon (80px × 80px) top-left
- Title (Audiowide, 24px)
- Description (Montserrat, 14px)
- Hover: Scale 1.05, shadow increase

**Player Card:**
- Background video/image support
- Gradient overlay for text legibility
- Avatar (48px circle) top-left
- Username (Audiowide, 18px) with glow
- Stats row (wins, streak, level)

#### 11.4.3 Modals & Overlays

**Modal Structure:**
```
┌─────────────────────────┐
│ [X] Close Button       │ ← Top-right
├─────────────────────────┤
│   Modal Title          │ ← Audiowide, centered
├─────────────────────────┤
│                        │
│   Content Area         │ ← Scrollable if needed
│                        │
├─────────────────────────┤
│ [Cancel] [Confirm]     │ ← Action buttons
└─────────────────────────┘
```

**Backdrop:**
- Dark overlay (rgba(0,0,0,0.7))
- Blur effect (backdrop-filter: blur(8px))
- Click outside to dismiss

### 11.5 Animation System

#### 11.5.1 Motion Principles

**Framer Motion Settings:**
```tsx
const spring = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

const easeOut = {
  duration: 0.3,
  ease: [0.43, 0.13, 0.23, 0.96]
};
```

#### 11.5.2 Common Animations

**Page Transitions:**
- Fade in: opacity 0 → 1 (0.3s)
- Slide in: translateY 20px → 0 (0.3s)

**Dice Roll:**
- 3D rotation (360deg × 3) over 0.8s
- Spring physics with damping
- Landing bounce effect

**Button Interactions:**
- Hover: scale 1.05 (0.2s)
- Click: scale 0.95 → 1.0 (0.1s)
- Disabled: opacity 0.5, grayscale

**AURA Counter:**
- Number change: Slide up animation
- Spend AURA: Flash red, shake
- Gain AURA: Flash green, pulse

#### 11.5.3 Performance Optimization

**Animation Budget:**
- Max 60 FPS target on all devices
- GPU-accelerated properties only (transform, opacity)
- Avoid animating: width, height, margin, padding
- Use `will-change` sparingly

### 11.6 Responsive Design

#### 11.6.1 Breakpoints

```css
/* Mobile */
@media (max-width: 767px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1280px) { }
```

#### 11.6.2 Mobile Optimizations

**Touch Targets:**
- Minimum 44px × 44px (Apple guidelines)
- Spacing: 8px between interactive elements
- Larger buttons for primary actions (48px height)

**Viewport Considerations:**
- Full-width layouts on mobile
- Reduced padding/margins
- Collapsible sections
- Bottom navigation for thumb reach

**Desktop Enhancements:**
- Max-width containers (80vw)
- Multi-column layouts (3-column grids for vault)
- Hover states
- Keyboard shortcuts

### 11.7 Accessibility

#### 11.7.1 WCAG 2.1 Compliance (AA Standard)

**Color Contrast:**
- Text: 4.5:1 minimum (7:1 for AAA)
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

**Keyboard Navigation:**
- Tab order follows visual flow
- Focus indicators visible
- Escape key closes modals
- Enter/Space activates buttons

**Screen Reader Support:**
- Semantic HTML (header, nav, main, article)
- ARIA labels for icons
- Alt text for images
- Live regions for dynamic content

#### 11.7.2 Colorblind Modes (Future)

**Supported Types:**
- Deuteranopia (red-green, most common)
- Protanopia (red-green)
- Tritanopia (blue-yellow)

**Adaptations:**
- Use icons + text labels (not just color)
- Distinct patterns for rarity (dots, stripes, stars)
- Alternative color palettes
- High contrast mode option

### 11.8 Loading States

#### 11.8.1 Skeleton Screens

**Instead of spinners, use content-aware skeletons:**

```tsx
<div className="animate-pulse">
  <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
</div>
```

#### 11.8.2 Progress Indicators

**Matchmaking:**
- Spinning dice animation
- "Searching for opponent..." text
- Estimated time remaining
- Cancel button

**Match Loading:**
- Progress bar (0-100%)
- Loading stage indicators (Connecting → Loading match → Ready)
- Background preview (shows what's loading)

---

## 12. Art Direction & Visual Style

### 12.1 Overall Art Style

**Classification: Stylized 3D with Modern UI**

**Characteristics:**
- **Dice:** Clean, realistic 3D models with subtle stylization
- **UI:** Flat modern design with depth via shadows and gradients
- **Backgrounds:** Mix of photorealistic and stylized digital art
- **Effects:** Particle systems, glows, and energy effects
- **Character Art:** (Future) Semi-realistic with exaggerated features

**Inspiration:**
- Clash Royale (card game polish)
- Brawl Stars (playful character design)
- Hearthstone (visual effects and juice)

### 12.2 3D Asset Style

#### 12.2.1 Dice Models

**Standard Dice:**
- **Polycount:** 500-1000 triangles per die
- **Materials:** PBR shaders (albedo, roughness, metallic)
- **Lighting:** Dynamic shadows, real-time reflections
- **Physics:** Realistic bounce and roll behavior

**Premium Dice:**
- **Higher Detail:** 2000-3000 triangles for gem/crystal dice
- **Special Materials:** Refractive glass, glowing neon, metallic chrome
- **Particle Effects:** Trails, sparks, auras

#### 12.2.2 Environmental Art

**Backgrounds:**
- **Resolution:** 1920×1080 minimum (scaled for mobile)
- **Format:** MP4 (video), JPG/PNG (static)
- **Style:** Varies by theme (realistic, fantasy, sci-fi, abstract)
- **Performance:** Optimized file sizes (<5MB videos, <500KB images)

### 12.3 UI Visual Language

#### 12.3.1 Shapes & Forms

**Primary Shapes:**
- **Cards:** Rounded rectangles (border-radius: 20px)
- **Buttons:** Rounded (border-radius: 12px)
- **Containers:** Soft corners, avoid harsh edges
- **Icons:** Circular backgrounds with centered symbols

**Depth & Layering:**
- **Cards:** box-shadow: 0 4px 16px rgba(0,0,0,0.2)
- **Elevated Elements:** box-shadow: 0 8px 32px rgba(0,0,0,0.3)
- **Hover States:** Increase shadow depth + scale
- **Active States:** Decrease shadow + slight scale down

#### 12.3.2 Gradients & Effects

**Background Gradients:**
```css
/* Standard gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 3-color gradient */
background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);

/* Animated gradient (subtle) */
background: linear-gradient(270deg, #ff6b6b, #4ecdc4);
animation: gradient 15s ease infinite;
```

**Glow Effects:**
```css
/* Text glow (victory, important text) */
text-shadow: 
  0 0 20px rgba(255, 255, 255, 0.8),
  0 0 40px rgba(255, 255, 255, 0.5);

/* Button glow (call-to-action) */
box-shadow: 
  0 0 20px rgba(59, 130, 246, 0.5),
  0 4px 16px rgba(0, 0, 0, 0.3);
```

### 12.4 Iconography

#### 12.4.1 Icon Style

**Characteristics:**
- **Line Weight:** 2px for small icons, 3px for large
- **Style:** Outlined (stroke) or filled (solid)
- **Size:** 24px (small), 32px (medium), 48px (large), 80px (hero)
- **Color:** Theme-adaptive or semantic

**Icon Sources:**
- Heroicons (UI icons)
- Custom designs (game-specific icons)
- Emoji (quick placeholders, 👑🎲🏆)

#### 12.4.2 Game Mode Icons

| Mode | Icon | Style |
|------|------|-------|
| Quickfire | ⚡ Lightning bolt | Yellow/orange energy |
| Classic | 👑 Crown | Gold regal symbol |
| Zero Hour | ⏰ Clock | Red countdown theme |
| Last Line | 💀 Skull | Gray/white danger |
| Social League | 👥 People | Blue social theme |

### 12.5 Effects & Particles

#### 12.5.1 Particle Systems

**Dice Roll Particles:**
- Dust clouds on landing (small gray particles)
- Sparkles on doubles (golden star particles)
- Impact ripples on bounce (circular waves)

**Ability Activation Effects:**
- **Luck Turner:** Golden sparkles around dice
- **Pan Slap:** Impact burst from opponent's dice
- **Hard Hat:** Golden shield materializing
- **Aura Forge:** Purple energy swirls converging
- **Vital Rush:** Blue speed lines and glow
- **Siphon:** Red energy beam transferring points

#### 12.5.2 Screen Effects

**Victory Screen:**
- Confetti explosion (300+ particles)
- Golden light rays from top
- Slow-motion zoom on winner

**Bust Effect (Single 1):**
- Red flash overlay
- Shake animation
- Sad trombone sound (subtle)

### 12.6 Animation Polish ("Game Juice")

#### 12.6.1 Micro-Interactions

**Button Press:**
1. Scale down to 0.95 (0.1s)
2. Play click sound
3. Trigger action
4. Scale back to 1.0 with bounce (0.2s)

**Number Increment (Score):**
1. Old number slides up and fades out
2. New number slides up from below
3. Brief glow effect on change

**AURA Spend:**
1. AURA counter flashes red
2. Number decrements with shake
3. Particles fly from counter to ability icon
4. Ability activates

#### 12.6.2 Anticipation & Follow-Through

**Dice Roll Animation:**
1. **Anticipation:** Dice lift slightly (0.1s)
2. **Action:** Spin and fly through air (0.6s)
3. **Follow-Through:** Bounce on landing (0.2s)
4. **Settle:** Final wiggle and stop (0.1s)

**Total Duration:** ~1 second (feels fast but readable)

### 12.7 Regional Art Considerations

#### 12.7.1 Cultural Adaptation

**Japan Market:**
- Chibi-style avatars option
- Kawaii dice skins (cute faces)
- Anime-inspired backgrounds
- Pastel color palettes

**Western Markets:**
- Realistic/semi-realistic style
- Bold, saturated colors
- Sports/action themes

**Global Appeal:**
- Avoid culturally specific symbols (OK hand, thumbs up varies)
- Use universal icons (checkmark, X, arrows)
- Provide localized art assets per region

---

## 13. Audio Design & Music

### 13.1 Audio Philosophy

**Goals:**
1. **Enhance Gameplay** - Audio cues inform player of game state
2. **Maintain Energy** - Music keeps pace exciting
3. **Avoid Fatigue** - No repetitive or annoying sounds
4. **Support Immersion** - Backgrounds have matching audio themes

### 13.2 Sound Effects (SFX)

#### 13.2.1 Gameplay Sounds

| Action | Sound | Volume | Notes |
|--------|-------|--------|-------|
| **Dice Roll** | Dice clatter | Medium | Realistic plastic dice sound |
| **Dice Land** | Thud + clatter | Medium | Weighted impact |
| **Bank Score** | Cash register "cha-ching" | Medium | Satisfying reward sound |
| **Single 1 (Bust)** | Descending horn "wah wah" | Low | Not too punishing |
| **Snake Eyes (+20)** | Ascending chime | Medium | Positive reinforcement |
| **Doubles (Multiplier)** | Power-up chime | Medium | Energetic, exciting |
| **Double Six (Reset)** | Crash cymbal | Medium | Dramatic, impactful |
| **Turn Switch** | Swoosh | Low | Subtle transition |

#### 13.2.2 UI Sounds

| Interaction | Sound | Volume | Notes |
|-------------|-------|--------|-------|
| **Button Click** | Soft click | Low | Not distracting |
| **Button Hover** | Subtle blip | Very Low | Optional, can disable |
| **Modal Open** | Swoosh up | Low | Quick, clean |
| **Modal Close** | Swoosh down | Low | Quick, clean |
| **Tab Switch** | Soft thud | Low | Tactile feedback |
| **Error/Invalid** | Buzz/reject sound | Medium | Clear negative feedback |
| **Success/Confirm** | Bell chime | Medium | Clear positive feedback |
| **Notification** | Pop sound | Medium | Attention-grabbing |

#### 13.2.3 Ability Sounds

**Activation Sounds (Distinct per ability):**
- **Luck Turner:** Mystical chime with reverb
- **Pan Slap:** Metal clang impact
- **Hard Hat:** Shield materializing hum
- **Siphon:** Energy drain whoosh
- **Aura Forge:** Power charging buildup
- **Vital Rush:** Speed boost whoosh with echo

**Effect Sounds:**
- Short (0.5-1.5s duration)
- Distinct from other abilities (easy to identify)
- Appropriate volume (not overpowering dice sounds)

### 13.3 Music System

#### 13.3.1 Music Tracks

**Main Menu Music:**
- Genre: Electronic/Synthwave
- Tempo: 120-130 BPM (moderate energy)
- Loop: Seamless 2-3 minute loop
- Volume: Low (background ambiance)

**Match Music:**
- Genre: Upbeat Electronic/Orchestral Hybrid
- Tempo: 140-160 BPM (high energy)
- Dynamic: Intensity increases with match progress
- Loop: Seamless, no jarring transitions

**Victory Music:**
- Genre: Triumphant Orchestral Stinger
- Duration: 5-10 seconds (short, impactful)
- Volume: Medium-High (moment of glory)

**Defeat Music:**
- Genre: Mellow/Reflective
- Duration: 3-5 seconds
- Volume: Medium (not too depressing)

#### 13.3.2 Adaptive Music (Future)

**Dynamic Intensity:**
- **Low Intensity:** Match start, players tied
- **Medium Intensity:** One player pulling ahead
- **High Intensity:** Close to victory, high stakes

**Implementation:**
- Layered music tracks (drums, bass, melody, harmony)
- Fade layers in/out based on game state
- Smooth transitions (no jarring cuts)

### 13.4 Audio Settings

#### 13.4.1 Volume Controls

**Master Volume:** 0-100% (affects all audio)

**Individual Sliders:**
- **Music Volume:** 0-100% (background music)
- **SFX Volume:** 0-100% (gameplay sounds)
- **UI Sounds:** 0-100% (button clicks, menus)
- **Voice Chat:** 0-100% (player voice)

**Quick Mute:**
- Master mute button (M key)
- Mute icon in top-right corner
- Remembers volume when unmuting

#### 13.4.2 Audio Profiles

**Presets:**
- **Full Experience:** All audio enabled (default)
- **Minimal:** Only gameplay SFX, no music
- **Silent:** All audio off
- **Custom:** User-defined settings

### 13.5 Audio Tone & Style

#### 13.5.1 Overall Tone

**Target Feel:** **Esports Energetic with Playful Touches**

**Characteristics:**
- **High Energy:** Fast-paced, exciting, competitive
- **Professional:** Polished, AAA-quality sound design
- **Accessible:** Not intimidating, welcoming to casuals
- **Modern:** Electronic/synthwave influences, not dated

**Avoid:**
- Overly cute/childish sounds (target 16+ audience)
- Harsh/aggressive sounds (avoid player tilt)
- Repetitive loops (causes audio fatigue)

#### 13.5.2 Regional Audio Variations (Future)

**Japan/Korea:**
- More upbeat, J-Pop influenced tracks
- Cute character voice lines
- Anime-style sound effects

**Western Markets:**
- Rock/electronic hybrid music
- More realistic sound effects
- Deeper, more impactful audio

---

## 14. Technical Architecture

### 14.1 Technology Stack

#### 14.1.1 Frontend

**Framework: Next.js 15**
- React 18 with Server Components
- App Router architecture
- TypeScript for type safety
- Automatic code splitting

**UI Libraries:**
- **Tailwind CSS:** Utility-first styling
- **Framer Motion:** Animation library
- **Headless UI:** Accessible components

**State Management:**
- React Context API (AuthContext, NavigationContext, etc.)
- Local state with useState/useReducer
- Real-time listeners with Firestore onSnapshot

#### 14.1.2 Backend

**Firebase Stack:**
- **Firestore:** Real-time NoSQL database
- **Firebase Auth:** User authentication (email, Google, Apple)
- **Cloud Functions:** Server-side logic (match creation, validation)
- **Firebase Storage:** Asset hosting (images, videos)
- **Firebase Hosting:** CDN for static assets

**Go Backend Adapter:**
- Custom matchmaking service
- MMR calculations
- Match state validation
- WebSocket connections for low-latency updates

#### 14.1.3 Mobile

**Capacitor:**
- Native iOS/Android wrapper
- Access to native APIs (push notifications, camera, etc.)
- Single codebase for web + mobile
- Live updates without app store approval

**Native Features:**
- Push notifications (match invites, turn reminders)
- Haptic feedback (dice rolls, wins)
- Local storage (offline caching)

### 14.2 Database Architecture

#### 14.2.1 Firestore Collections

**Primary Collections:**
```
/users/{userId}
  - displayName: string
  - email: string
  - createdAt: Timestamp
  - level: number
  - xp: number
  - mmr: number
  - equippedBackgrounds: object
  - ownedBackgrounds: array
  - stats: object

/matches/{matchId}
  - gameMode: string
  - status: 'active' | 'completed' | 'abandoned'
  - hostData: object
  - opponentData: object
  - gameData: object
  - createdAt: Timestamp

/userAbilities/{userId}
  - unlockedAbilities: array<string>
  - powerLoadouts: object
  - totalAbilitiesUsed: number
  - favoriteAbility: string

/userPowerLoadouts/{userId}/loadouts/{gameMode}
  - tactical: string (ability ID)
  - attack: string
  - defense: string
  - utility: string
  - gamechanger: string

/socialLeagueStats/{userId}_{date}
  - uid: string
  - displayName: string
  - wins: number
  - date: string (YYYY-MM-DD)
  - lastUpdated: Timestamp

/rankedStats/{userId}
  - mmr: number
  - rank: string
  - tier: string
  - wins: number
  - losses: number
  - winStreak: number
```

#### 14.2.2 Data Relationships

**User → Matches:**
- Query matches where `hostData.playerId == userId` OR `opponentData.playerId == userId`
- Index on userId + status for fast queries

**User → Abilities:**
- Subcollection `/users/{userId}/abilities/{abilityId}`
- Tracks unlock status, usage stats

**Match → Real-time Sync:**
- Single document per match
- Both players listen with onSnapshot()
- Optimistic UI updates (update locally, then sync)

### 14.3 Networking & Real-Time Sync

#### 14.3.1 Firestore Real-Time Listeners

**Match Synchronization:**
```typescript
const unsubscribe = onSnapshot(
  doc(db, 'matches', matchId),
  (snapshot) => {
    const matchData = snapshot.data();
    updateLocalGameState(matchData);
  }
);
```

**Latency Optimization:**
- **Target:** <100ms round-trip time
- **Method:** Firestore onSnapshot (push updates)
- **Fallback:** HTTP polling every 500ms if WebSocket fails

#### 14.3.2 Conflict Resolution

**Optimistic Updates:**
1. Player performs action (e.g., rolls dice)
2. UI updates immediately (optimistic)
3. Action sent to server
4. Server validates and persists
5. Server broadcasts to all players
6. If validation fails, revert local state

**Race Conditions:**
- **Dice Rolling:** Server is source of truth for dice values (client cannot manipulate)
- **Banking:** First player to bank wins (timestamp-based)
- **Ability Usage:** Server validates AURA cost before applying effect

### 14.4 Security & Anti-Cheat

#### 14.4.1 Firestore Security Rules

**Example Rules:**
```javascript
match /matches/{matchId} {
  // Players can read their own matches
  allow read: if request.auth != null && (
    resource.data.hostData.playerId == request.auth.uid ||
    resource.data.opponentData.playerId == request.auth.uid
  );
  
  // Only server can create/update matches
  allow write: if request.auth.token.admin == true;
}

match /users/{userId} {
  // Users can read their own data
  allow read: if request.auth.uid == userId;
  
  // Users can update specific fields only
  allow update: if request.auth.uid == userId && (
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['displayName', 'equippedBackgrounds'])
  );
}
```

#### 14.4.2 Server-Side Validation

**Cloud Functions Validate:**
- Dice roll results (ensure client cannot send fake rolls)
- AURA costs (verify player has enough AURA)
- Ability activation timing (check `own_turn` vs `opponent_turn`)
- Score calculations (prevent score manipulation)
- Win conditions (verify player actually reached target)

**Rate Limiting:**
- Max 10 actions per second per player
- Cooldown on ability spam (1 second between activations)
- Disconnect protection (if player disconnects >30s, auto-forfeit)

### 14.5 Performance Optimization

#### 14.5.1 Code Splitting

**Route-Based Splitting:**
- `/` - Landing page (minimal bundle)
- `/dashboard` - Main game dashboard
- `/match` - Match gameplay (heavy bundle)
- `/vault` - Inventory/abilities

**Component-Level Splitting:**
```typescript
const Match = dynamic(() => import('@/components/match/Match'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

#### 14.5.2 Asset Optimization

**Images:**
- WebP format (30-50% smaller than JPEG)
- Responsive srcset (serve appropriate size)
- Lazy loading (below fold)

**Videos:**
- H.264 codec (universal support)
- Multiple qualities (360p, 720p, 1080p)
- Auto-select based on connection speed

**Bundle Size Targets:**
- Initial load: <200KB (gzipped)
- Match page: <500KB (gzipped)
- Total app: <2MB (all routes combined)

#### 14.5.3 Caching Strategy

**Service Worker Caching:**
- Static assets cached indefinitely (versioned filenames)
- API responses cached 5 minutes
- Match data never cached (always real-time)

**CDN Caching:**
- Images/videos cached at edge (CloudFlare/Vercel Edge)
- 1-year cache for static assets
- Instant cache purge on updates

---

## 15. AI & Bot Systems

### 15.1 Bot Architecture

#### 15.1.1 Bot Difficulty Levels

| Difficulty | MMR Range | Decision Speed | Ability Usage | Mistakes |
|------------|-----------|----------------|---------------|----------|
| **Easy** | 800-1000 | 3-5s delays | Rarely uses | Frequent (30%) |
| **Medium** | 1200-1400 | 1-2s delays | Sometimes | Occasional (15%) |
| **Hard** | 1600-1800 | 0.5-1s | Often optimally | Rare (5%) |
| **Expert** | 2000-2200 | Instant | Always optimal | None (0%) |

#### 15.1.2 Bot Decision Tree

**Banking Decision Algorithm:**
```typescript
function shouldBank(turnScore: number, playerScore: number, opponentScore: number, hasMultiplier: boolean): boolean {
  const targetScore = gameMode.roundObjective;
  const pointsToWin = targetScore - playerScore;
  const opponentPointsToWin = targetScore - opponentScore;
  
  // Win immediately if possible
  if (turnScore >= pointsToWin) return true;
  
  // High risk if turn score > 30 with no multiplier
  if (turnScore >= 30 && !hasMultiplier) return Math.random() > 0.3;
  
  // Aggressive if losing by 20+
  if (opponentPointsToWin < pointsToWin - 20) {
    return turnScore >= 25;
  }
  
  // Conservative if winning by 20+
  if (pointsToWin < opponentPointsToWin - 20) {
    return turnScore >= 15;
  }
  
  // Default: bank at 20-25 points
  return turnScore >= 20;
}
```

#### 15.1.3 Ability Usage AI

**AURA Management:**
- **Easy:** Hoards AURA, rarely spends
- **Medium:** Spends when AURA > 8
- **Hard:** Strategic spending (defensive abilities when opponent ahead)
- **Expert:** Perfect optimization (maximizes expected value)

**Ability Priority (Hard/Expert Bots):**
1. **Defensive:** Use Pan Slap when opponent has 35+ turn score
2. **Economic:** Use Aura Forge early (turn 1-2)
3. **Offensive:** Use Siphon after opponent banks 30+ points
4. **Tactical:** Use Luck Turner when turn score > 25 with multiplier

### 15.2 Bot Personality Traits (Future)

**Behavioral Archetypes:**

**"Aggressive Annie":**
- Rarely banks below 30 points
- Uses attack abilities frequently
- High risk tolerance

**"Cautious Carl":**
- Banks early (15-20 points)
- Saves AURA for defensive abilities
- Low risk tolerance

**"Strategic Sarah":**
- Adapts to opponent's playstyle
- Balances offense and defense
- Medium risk tolerance

**"Lucky Larry":**
- Random decision-making (for unpredictability)
- Makes "stupid" plays that sometimes pay off
- High variance outcomes

### 15.3 Bot Match Flow

**Pre-Match:**
1. Bot assigned based on player MMR ±200
2. Bot loads predefined loadout (varies by difficulty)
3. Bot given random name (e.g., "Bot_Crusher", "AI_Destroyer")

**During Match:**
1. Bot listens to match state (Firestore onSnapshot)
2. Evaluates game state every turn
3. Makes decisions based on algorithm + randomness
4. Executes actions with human-like delays

**Post-Match:**
- Bot grants XP (50-75% of normal match)
- Bot match doesn't affect MMR
- Bot stats not tracked on leaderboards

### 15.4 Future AI Enhancements

**Machine Learning Integration:**
- Train neural network on top player games
- Predict optimal banking thresholds
- Adaptive difficulty (learns from player behavior)

**Natural Language Processing:**
- Bot can respond to chat messages
- Friendly banter during matches
- "GG" after match completion

---

## 16. LiveOps Pipeline & Content Updates

### 16.1 Content Update Schedule

#### 16.1.1 Update Cadence

**Patch Types:**

| Update Type | Frequency | Size | Examples |
|-------------|-----------|------|----------|
| **Hotfix** | As needed | <10MB | Bug fixes, exploit patches |
| **Minor Update** | Bi-weekly | 10-50MB | New cosmetics, balance tweaks |
| **Major Update** | Monthly | 50-200MB | New abilities, game modes, features |
| **Season Launch** | Quarterly | 200-500MB | New battle pass, major content drop |

#### 16.1.2 Development Pipeline

**2-Week Sprint Cycle:**
- Week 1: Development + internal testing
- Week 2: Beta testing + polish
- Deploy Tuesday (low-traffic day, allows hotfix time)

**Feature Flags:**
- Enable/disable features remotely without app update
- A/B testing new features (50% of users)
- Gradual rollout (5% → 25% → 50% → 100%)

### 16.2 Content Creation Workflow

#### 16.2.1 New Ability Pipeline

**Phases:**
1. **Concept** (1-2 days)
   - Design document with mechanics, costs, timing
   - Balance analysis (counters, synergies)
   - Art direction mockup

2. **Implementation** (3-5 days)
   - Code ability logic
   - Create activation video
   - Record sound effects
   - Write unit tests

3. **Testing** (2-3 days)
   - Internal playtesting (20+ matches)
   - Balance adjustments
   - Bug fixing

4. **Release** (1 day)
   - Deploy to production
   - Monitor usage stats
   - Gather player feedback

**Total Time:** ~2 weeks per ability

#### 16.2.2 New Background Pipeline

**Phases:**
1. **Art Creation** (1-3 days)
   - 3D render or video production
   - Resolution: 1920×1080 minimum
   - File size optimization (<5MB)

2. **Theme Integration** (1 day)
   - Generate color palette from background
   - Create CSS theme variables
   - Test UI legibility

3. **Testing** (1 day)
   - Test on all devices (mobile, tablet, desktop)
   - Verify performance (60 FPS target)
   - Check accessibility (contrast ratios)

4. **Release** (1 day)
   - Upload to CDN
   - Add to shop/vault
   - Announce on social media

**Total Time:** 4-6 days per background

### 16.3 Live Event Management

#### 16.3.1 Event Lifecycle

**Planning Phase (2-3 weeks before):**
- Define event theme, duration, rewards
- Create promotional assets (banners, trailers)
- Schedule social media posts
- Set up analytics tracking

**Setup Phase (1 week before):**
- Deploy event content (backgrounds, quests, shop items)
- Configure feature flags (event inactive)
- Test event logic in staging environment
- Prepare customer support for questions

**Launch Phase (Day 0):**
- Enable event via feature flag (6:00 AM PT)
- Post announcement across all channels
- Monitor player participation (first 24h critical)
- Rapid response for any bugs

**Active Phase (Event duration):**
- Daily monitoring (participation, completion rates)
- Mid-event boosts if engagement low (double XP, bonus rewards)
- Community highlights (leaderboard updates, player stories)

**Conclusion Phase (Final day):**
- Announce event ending (24h warning)
- Distribute final rewards
- Disable event content
- Gather feedback for post-mortem

#### 16.3.2 Event Types

**Weekend Tournaments:**
- Duration: Friday 6PM - Sunday 11:59PM
- Format: Swiss rounds + Top 8 playoffs
- Rewards: Exclusive title, background, 500 crystals

**Holiday Events:**
- Duration: 1-2 weeks
- Theme: Seasonal (Halloween, Christmas, Lunar New Year)
- Content: Limited-edition cosmetics, themed backgrounds
- Challenges: Special achievements with holiday rewards

**Flash Events:**
- Duration: 24 hours
- Trigger: Spontaneous (surprise players)
- Rewards: High-value, immediate gratification
- Example: "Double XP Day", "Free Background Day"

### 16.4 A/B Testing & Experimentation

#### 16.4.1 Test Framework

**Experimentation Platform:**
- Firebase Remote Config for feature flags
- 50/50 splits or custom percentages
- Track conversion metrics (retention, engagement, revenue)

**Example Tests:**
- **Test:** New ability costs (6 AURA vs 8 AURA for Pan Slap)
- **Metrics:** Usage rate, win rate with ability, player satisfaction
- **Duration:** 2 weeks
- **Decision:** Choose variant with better balance + satisfaction

#### 16.4.2 Metrics Tracked

**Engagement Metrics:**
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Session length (average time per session)
- Sessions per user per day
- Retention (D1, D7, D30)

**Gameplay Metrics:**
- Matches played per user
- Win rate distribution (balance check)
- Ability usage rates
- Banking frequency
- Match completion rate (vs. abandonment)

**Monetization Metrics:**
- Conversion rate (free → paying user)
- Average Revenue Per User (ARPU)
- Lifetime Value (LTV)
- Revenue per paying user (ARPPU)

### 16.5 Community Feedback Loop

#### 16.5.1 Feedback Channels

**In-Game:**
- Post-match survey (optional, 3 questions)
- Bug report button (screenshots + logs)
- Feature request form

**Social Media:**
- Discord server (community hub)
- Twitter/X (announcements, player highlights)
- Reddit (in-depth discussions)
- Instagram (visual content, clips)

**Direct Communication:**
- Email support (support@dashdice.gg)
- In-game messaging (urgent issues)

#### 16.5.2 Feedback Prioritization

**Issue Severity:**
- **Critical:** Game-breaking bugs (hotfix within hours)
- **High:** Major bugs affecting many players (fix within days)
- **Medium:** Minor bugs, balance issues (fix in next update)
- **Low:** Cosmetic issues, nice-to-haves (backlog)

**Feature Requests:**
- Track in public roadmap (Trello, GitHub Projects)
- Community voting on features (top 10 considered)
- Monthly "Feature of the Month" implementation

---

## 17. Analytics & Data Tracking

### 17.1 Analytics Philosophy

**Goals:**
1. **Understand Player Behavior** - What keeps players engaged?
2. **Identify Issues** - Where do players struggle or drop off?
3. **Validate Decisions** - Did the update improve retention?
4. **Optimize Monetization** - What converts free → paid?

**Privacy-First:**
- No personally identifiable information (PII) tracked
- GDPR/CCPA compliant
- Opt-out option in settings
- Aggregate data only (no individual tracking without consent)

### 17.2 Key Performance Indicators (KPIs)

#### 17.2.1 Player Acquisition

| Metric | Definition | Target |
|--------|------------|--------|
| **Installs** | Total app downloads | 10K/month (Y1) |
| **Registration Rate** | % of installs that create account | >60% |
| **Cost Per Install (CPI)** | Marketing spend / installs | <$2.00 |
| **Organic vs. Paid** | Ratio of organic to paid installs | 70/30 |

#### 17.2.2 Player Engagement

| Metric | Definition | Target |
|--------|------------|--------|
| **DAU** | Daily Active Users | 5K (Y1), 50K (Y2) |
| **WAU** | Weekly Active Users | 15K (Y1), 150K (Y2) |
| **MAU** | Monthly Active Users | 40K (Y1), 400K (Y2) |
| **DAU/MAU Ratio** | Stickiness metric | >20% |
| **Avg. Session Length** | Time per session | 15-20 minutes |
| **Sessions/Day** | Sessions per user per day | 2-3 |

#### 17.2.3 Player Retention

| Metric | Definition | Target |
|--------|------------|--------|
| **D1 Retention** | % return next day | >40% |
| **D7 Retention** | % return after 7 days | >20% |
| **D30 Retention** | % return after 30 days | >10% |
| **Churn Rate** | % of players who don't return | <15%/month |

#### 17.2.4 Monetization

| Metric | Definition | Target |
|--------|------------|--------|
| **Conversion Rate** | % of players who pay | 3-5% |
| **ARPU** | Revenue / Total Users | $0.50-$1.00 |
| **ARPPU** | Revenue / Paying Users | $15-$25 |
| **LTV** | Lifetime revenue per user | $5-$10 |
| **LTV/CPI Ratio** | Profitability metric | >3.0 |

### 17.3 Event Tracking

#### 17.3.1 Gameplay Events

**Tracked with Firebase Analytics:**
```typescript
// Match Start
analytics.logEvent('match_start', {
  game_mode: 'quickfire',
  is_multiplayer: true,
  player_level: 15,
  player_mmr: 1450
});

// Ability Used
analytics.logEvent('ability_used', {
  ability_id: 'luck_turner',
  aura_cost: 3,
  game_mode: 'classic',
  turn_number: 5
});

// Match End
analytics.logEvent('match_end', {
  game_mode: 'quickfire',
  result: 'win',
  duration_seconds: 245,
  final_score: 50,
  abilities_used: 3,
  aura_spent: 12
});
```

#### 17.3.2 Economy Events

**Purchase Tracking:**
```typescript
// Real Money Purchase
analytics.logEvent('purchase', {
  transaction_id: 'txn_12345',
  value: 4.99,
  currency: 'USD',
  items: [{
    item_id: 'crystals_medium',
    item_name: '500 Crystals',
    quantity: 1
  }]
});

// In-Game Currency Spend
analytics.logEvent('spend_virtual_currency', {
  virtual_currency_name: 'crystals',
  value: 100,
  item_name: 'Epic Background: Dragon Lair'
});
```

### 17.4 Funnel Analysis

#### 17.4.1 Onboarding Funnel

**Steps:**
1. App Install (100%)
2. Tutorial Start (85%)
3. Tutorial Complete (70%)
4. First Match Start (60%)
5. First Match Complete (50%)
6. Second Match Start (40%)
7. D1 Return (30%)

**Optimization:**
- Identify largest drop-off step
- A/B test improvements
- Track improvement over time

#### 17.4.2 Monetization Funnel

**Steps:**
1. View Shop (100%)
2. Click Item (40%)
3. View Purchase Modal (30%)
4. Initiate Payment (15%)
5. Complete Purchase (10%)

**Drop-off Analysis:**
- High drop-off at payment → Simplify payment flow
- High drop-off at modal → Adjust pricing or item value

### 17.5 Cohort Analysis

#### 17.5.1 Retention Cohorts

**Weekly Cohorts:**
- Group players by registration week
- Track retention over 12 weeks
- Compare cohorts (did update improve retention?)

**Example:**
| Cohort | D1 | D7 | D30 | D90 |
|--------|----|----|-----|-----|
| Week 1 | 40% | 20% | 10% | 5% |
| Week 2 | 45% | 25% | 12% | 6% |
| Week 3 | 50% | 30% | 15% | 8% |

**Insight:** Retention improving over time (onboarding improvements working)

#### 17.5.2 Revenue Cohorts

**Monthly Revenue by Cohort:**
- Track cumulative revenue per cohort
- Identify high-value cohorts
- Target marketing to similar demographics

---

## 18. Regionalization & Localization

### 18.1 Supported Languages (Launch)

**Tier 1 (Full Support):**
- **English** - US, UK, Canada, Australia (Primary)
- **Spanish** - Spain, Latin America (High priority)
- **Portuguese** - Brazil (Large mobile market)

**Tier 2 (Future - Year 1):**
- **French** - France, Canada
- **German** - Germany, Austria, Switzerland
- **Japanese** - Japan (Requires cultural adaptation)
- **Korean** - South Korea (High esports engagement)
- **Simplified Chinese** - China (Largest potential market)

### 18.2 Localization Strategy

#### 18.2.1 Text Localization

**Translation Management:**
- Use i18n libraries (next-i18next)
- Crowdsourced translations (community contributors)
- Professional review for critical text
- Context-aware translations (gender, plurals)

**String Format:**
```json
{
  "en": {
    "match.victory": "VICTORY!",
    "match.defeat": "DEFEAT",
    "ability.cost": "Cost: {{aura}} AURA",
    "match.turn_score": "Turn Score: {{score}} points"
  },
  "es": {
    "match.victory": "¡VICTORIA!",
    "match.defeat": "DERROTA",
    "ability.cost": "Costo: {{aura}} AURA",
    "match.turn_score": "Puntuación del turno: {{score}} puntos"
  }
}
```

#### 18.2.2 Cultural Adaptation

**Japan-Specific Changes:**
- **Art Style:** Add chibi-style avatar options
- **UI:** Vertical text support (rare, but respectful)
- **Colors:** Avoid heavy use of white (funeral association)
- **Numbers:** Support kanji numerals on dice (optional skin)

**China-Specific Changes:**
- **Compliance:** Remove gambling-like mechanics (no loot boxes)
- **Social Features:** Integration with WeChat/QQ
- **Payment:** Alipay/WeChat Pay support
- **Content:** Avoid political imagery, skull symbols

**Latin America-Specific:**
- **Pricing:** Adjusted for purchasing power (30-50% discount)
- **Payment:** Boleto, OXXO, local payment methods
- **Community:** Strong focus on social features (WhatsApp integration)

### 18.3 Regional Pricing

#### 18.3.1 Price Localization

**Base Prices (USD):**
- 100 Crystals: $0.99
- 550 Crystals: $4.99
- 1200 Crystals: $9.99

**Regional Pricing (Adjusted for PPP):**

| Region | 100 Crystals | 550 Crystals | 1200 Crystals |
|--------|--------------|--------------|---------------|
| **US/Canada** | $0.99 | $4.99 | $9.99 |
| **Europe** | €0.99 | €4.99 | €9.99 |
| **UK** | £0.99 | £4.99 | £9.99 |
| **Brazil** | R$3.49 | R$17.49 | R$34.99 |
| **Mexico** | $19 MXN | $99 MXN | $189 MXN |
| **India** | ₹79 | ₹399 | ₹799 |
| **Japan** | ¥120 | ¥600 | ¥1200 |

### 18.4 Regional Server Infrastructure (Future)

**Server Locations:**
- **North America:** US West (Oregon), US East (Virginia)
- **Europe:** EU West (Ireland), EU Central (Frankfurt)
- **Asia:** Japan (Tokyo), Singapore, India (Mumbai)
- **Latin America:** Brazil (São Paulo)

**Latency Targets:**
- Same region: <50ms
- Adjacent regions: <100ms
- Cross-continent: <200ms

---

## 19. Compliance & Content Rating

### 19.1 Content Ratings

#### 19.1.1 ESRB (North America)

**Target Rating: E10+ (Everyone 10+)**

**Justification:**
- **Fantasy Violence:** Dice battles (no blood, no graphic violence)
- **Mild Language:** Potential for player chat (filtered)
- **Competitive Gameplay:** Suitable for 10+ age group

**Content Descriptors:**
- "Users Interact" (online chat, matches)
- "In-Game Purchases" (cosmetics)

#### 19.1.2 PEGI (Europe)

**Target Rating: PEGI 7**

**Justification:**
- **Non-Realistic Violence:** Dice game, no graphic content
- **Online Gameplay:** Requires internet connection
- **In-Game Purchases:** Optional cosmetic purchases

#### 19.1.3 App Store Age Ratings

**Apple App Store:**
- **Rating:** 9+ (Infrequent/Mild Simulated Gambling)
- **Note:** Dice rolling is not legally gambling (no real money stakes)

**Google Play Store:**
- **Rating:** Everyone 10+
- **Content:** Simulated Gambling, Users Interact

### 19.2 Privacy & Data Protection

#### 19.2.1 GDPR Compliance (Europe)

**Requirements:**
- ✅ Clear privacy policy
- ✅ Explicit consent for data collection
- ✅ Right to access data (user can request all data)
- ✅ Right to erasure ("Right to be Forgotten")
- ✅ Data portability (export user data)
- ✅ Breach notification (within 72 hours)

**Implementation:**
- Cookie consent banner on web
- In-app privacy settings
- "Delete My Account" option in settings
- Data export via email request

#### 19.2.2 COPPA Compliance (US - Children Under 13)

**Requirements:**
- ❌ Do not collect data from users under 13 without parental consent
- ✅ Age gate on registration (require DOB)
- ✅ Parental consent flow if under 13
- ✅ Limited data collection for minors

**Implementation:**
- Age verification: Enter birthdate during registration
- If under 13: Request parent email, send consent link
- Parent approves: Create limited account (no chat, limited data)

#### 19.2.3 CCPA Compliance (California)

**Requirements:**
- ✅ Disclose data collection practices
- ✅ Allow users to opt-out of data sale (we don't sell data)
- ✅ Provide mechanism to delete personal data

### 19.3 Payment & Monetization Compliance

#### 19.3.1 App Store Guidelines (Apple)

**Requirements:**
- ✅ Use In-App Purchase (IAP) for digital goods
- ❌ Cannot redirect to external payment (e.g., website checkout)
- ✅ Clear pricing displayed before purchase
- ✅ Refund policy accessible
- ✅ No "loot box" mechanics without odds disclosure

**Implementation:**
- All cosmetics purchased via Apple IAP (30% Apple fee)
- Clearly show "$4.99" before confirming purchase
- Refund button in settings (redirects to App Store)

#### 19.3.2 Google Play Guidelines

**Requirements:**
- ✅ Use Google Play Billing for digital goods
- ✅ Disclose odds for any randomized content (not applicable - no loot boxes)
- ✅ Family-friendly content for "Everyone 10+" rating

#### 19.3.3 Fair Monetization Practices

**Self-Imposed Rules:**
- ❌ No pay-to-win mechanics
- ❌ No exploitative pricing (no $99.99 items)
- ❌ No pressure tactics ("Limited time! Buy now!")
- ✅ Transparent pricing (show exact cost in local currency)
- ✅ Clear value proposition (show exactly what you get)

### 19.4 Terms of Service & EULA

**Key Terms:**
- **Account Ownership:** Users own their account, we reserve right to terminate for TOS violations
- **Virtual Goods:** Purchased items are licenses, not owned property
- **Conduct:** No cheating, harassment, hate speech, impersonation
- **Refunds:** Available within 24 hours if item unused
- **Updates:** We may modify game at any time (balance changes, content updates)
- **Liability:** Not responsible for service interruptions, data loss

**Enforcement:**
- Warning for first offense (minor violations)
- Temporary suspension (24h, 7 days) for repeat offenses
- Permanent ban for severe violations (cheating, hate speech)
- No refunds for banned accounts

---

## 20. Future Vision & Expansion Plans

### 20.1 Year 1 Roadmap (2025-2026)

#### 20.1.1 Q1 2026 (Jan-Mar)

**Features:**
- ✅ Social League (Completed)
- 🔄 Complete ability system (16 abilities total)
- 🔄 Battle Pass Season 1
- 🔄 Voice chat (iOS/Android)
- 🔄 Spectator mode (friends)

**Content:**
- 10 new backgrounds (5 free, 5 premium)
- 5 new dice skins
- 20 new avatars

#### 20.1.2 Q2 2026 (Apr-Jun)

**Features:**
- 🔄 Guild/Clan system (team up with friends)
- 🔄 Guild tournaments (weekly events)
- 🔄 Custom lobbies (private matches with custom rules)
- 🔄 Replay system (watch past matches)

**Content:**
- Battle Pass Season 2
- 15 new backgrounds (Spring theme)
- New game mode: "Siege Mode" (team-based, 2v2)

#### 20.1.3 Q3 2026 (Jul-Sep)

**Features:**
- 🔄 Ranked Seasons (3-month competitive seasons)
- 🔄 Leaderboards (global, regional, friends)
- 🔄 Tournament system (automated brackets)
- 🔄 Achievements V2 (300+ achievements)

**Content:**
- Battle Pass Season 3
- 20 new backgrounds (Summer theme)
- Dice customization overhaul (10+ shapes, 10+ fonts)

#### 20.1.4 Q4 2026 (Oct-Dec)

**Features:**
- 🔄 Character system (cosmetic skins with voice lines)
- 🔄 Emote wheel (8 emotes, customizable)
- 🔄 Seasonal events (Halloween, Christmas)

**Content:**
- Battle Pass Season 4
- 25 new backgrounds (Autumn/Winter themes)
- 10 character skins (fully voiced)

### 20.2 Year 2 Roadmap (2027)

**Major Features:**
- **2v2 Tag Team Mode** - Cooperative dice battles
- **Ranked Teams** - Competitive team mode with team MMR
- **Esports Tools** - Tournament organizer dashboard, spectator mode upgrades
- **Mobile Esports Circuit** - Official DashDice tournaments with prize pools
- **Cross-Progression** - Sync progress across mobile, web, console (if expanded)

**Content Targets:**
- 100+ backgrounds (total catalog)
- 50+ dice customization options
- 100+ avatars with voice lines
- 30+ abilities (fully balanced)

### 20.3 Platform Expansion

#### 20.3.1 Console (2027-2028)

**Target Platforms:**
- Nintendo Switch (perfect for handheld + competitive scene)
- Xbox (Xbox Live integration)
- PlayStation (PSN integration)

**Challenges:**
- Controller optimization (dice rolling with controller)
- Cross-platform play (console + mobile + web)
- Console certification process (3-6 months)

#### 20.3.2 PC Client (2027)

**Standalone Desktop App:**
- Electron-based or native (better performance)
- Keyboard shortcuts (space = roll, B = bank, 1-5 = abilities)
- Windowed/fullscreen modes
- Steam integration (achievements, friends, leaderboards)

### 20.4 Esports Vision

#### 20.4.1 Competitive Scene Development

**Year 1 (2026):**
- Grassroots tournaments (community-run)
- Streamer partnerships (Twitch/YouTube)
- Regional qualifiers (NA, EU, LATAM, APAC)

**Year 2 (2027):**
- Official DashDice Pro League (monthly tournaments)
- Prize pools ($10K per month, funded by 10% of revenue)
- Sponsored teams (esports orgs sponsor top players)
- World Championship (annual, $100K prize pool)

#### 20.4.2 Spectator Experience

**Broadcast Tools:**
- Observer mode (caster controls camera, replays)
- Player stats overlay (MMR, win rate, loadout)
- Slow-motion replays (critical moments)
- Picture-in-picture (show both players' faces)

**Viewership Features:**
- Twitch drops (watch streams, earn rewards)
- Prediction markets (bet channel points on winner)
- Co-streaming (multiple streamers cast same match)

### 20.5 IP Expansion (Brand Building)

#### 20.5.1 Merchandise

**Physical Products:**
- Custom dice sets (with DashDice branding)
- T-shirts, hoodies (logo + slogans)
- Playmats (for physical dice play)
- Phone cases, stickers, posters

**Digital Products:**
- Discord emotes (purchasable packs)
- Wallpapers (desktop + mobile)
- Stream overlays (for content creators)

#### 20.5.2 Content Creation

**YouTube Series:**
- "Road to Grandmaster" (player journey series)
- "Ability Spotlight" (weekly ability guides)
- "Top 10 Plays" (community highlight reel)

**TikTok/Shorts:**
- Quick clips (epic wins, funny moments)
- Ability showcases (15-30 second clips)
- Behind-the-scenes (dev diaries, art process)

#### 20.5.3 Partnerships & Collaborations

**Influencer Partnerships:**
- Sponsored content (YouTubers, streamers)
- Custom cosmetics (influencer-branded backgrounds)
- Revenue share (10% of sales from influencer codes)

**Brand Collaborations:**
- Gaming peripheral brands (Razer, Logitech)
- Energy drink sponsors (G Fuel, Monster)
- Esports orgs (Team Liquid, FaZe Clan cosmetics)

### 20.6 Long-Term Vision (2030)

**Goals:**
- **10 million registered players** globally
- **Top 10 mobile esport** by viewership
- **Sustainable revenue** ($10M+ annual revenue)
- **Household name** in competitive mobile gaming

**Legacy:**
- Prove skill-based dice PvP is viable esport
- Pioneer AURA economy system (copied by competitors)
- Build inclusive, non-toxic community
- Inspire next generation of game designers

---

## Conclusion

**DashDice** is more than a dice game—it's a **skill-based competitive platform** that transforms simple dice rolling into a strategic esport. By combining:

1. **Accessible Core Mechanics** - Easy to learn, hard to master
2. **Strategic Depth** - AURA economy, ability loadouts, banking decisions
3. **Social Features** - Friends, Social League, guilds
4. **Fair Monetization** - Cosmetic-only, no pay-to-win
5. **Esports Potential** - Competitive integrity, spectator tools

...DashDice positions itself as the **premier mobile dice PvP game** for the next generation of competitive gamers.

**Design Philosophy:** *"RNG Creates Opportunity, Skill Determines Victory"*

**Mission Statement:** Build a globally competitive, fair, and engaging dice PvP game that respects players' time and money while delivering endless strategic depth.

**Vision:** Establish DashDice as a top-tier mobile esport, fostering a thriving community of skilled players, content creators, and competitive enthusiasts worldwide.

---

## Appendix: Quick Reference

### Game Modes Summary

| Mode | Target | Starting Score | Duration | Difficulty |
|------|--------|----------------|----------|------------|
| Quickfire | 50 | 0 | 3-5 min | Easy |
| Classic | 100 | 0 | 8-10 min | Medium |
| Zero Hour | 0 (exact) | 100 | 10-12 min | Hard |
| Last Line | Reduce opponent to 0 | 50 (both players) | 5-8 min | Medium |
| Social League | Varies | Varies | 3-8 min | Varies |

### Dice Rules Quick Reference

| Roll | Effect | Turn Status |
|------|--------|-------------|
| Single 1 | Lose turn score | ❌ Turn ends |
| 1-1 (Snake Eyes) | +20 points | ✅ Continue |
| 6-6 (Double Six) | Score → 0 | ❌ Turn ends |
| Other Doubles | 2x multiplier | ✅ Continue |
| Normal | Add to turn score | ✅ Continue |

### Ability Categories

| Category | Color | Purpose | Example Abilities |
|----------|-------|---------|-------------------|
| Tactical | Blue | Info & probability | Luck Turner, Vision Surge |
| Attack | Red | Offensive disruption | Siphon, Power Drain |
| Defense | Green | Protection & counters | Pan Slap, Hard Hat |
| Utility | Yellow | Dice control | Aura Forge, Vital Rush |
| Game Changer | Purple | Match-altering | (Future abilities) |

### Terminology Glossary

- **Portal** → Not used (removed concept)
- **Background** → Video/image displayed in menus and matches
- **Victory Animation** → Background video shown after winning match
- **Ability/Skill** → Powers activated by spending AURA
- **AURA** → In-match resource currency for abilities
- **Banking** → Locking in turn score, adding to total
- **Bust** → Rolling Single 1, losing turn score
- **Multiplier** → 2x score boost from rolling doubles
- **Loadout** → Set of 5 equipped abilities (one per category)

---

**End of Core Game Design Document**

**Document Version:** 1.0  
**Last Updated:** December 1, 2025  
**Total Word Count:** ~35,000 words  
**Status:** Production-Ready

*This document is a living guide and will be updated as DashDice evolves. For questions or suggestions, contact the design team.*
