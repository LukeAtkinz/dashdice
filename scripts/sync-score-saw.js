#!/usr/bin/env node

/**
 * Quick CLI script to sync Score Saw ability to Firebase
 * 
 * Usage: node scripts/sync-score-saw.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Score Saw ability definition (using plain Date objects, Firebase will convert)
const SCORE_SAW = {
  id: 'score_saw',
  name: 'Score Saw',
  version: 1,
  category: 'tactical',
  type: 'active',
  rarity: 'epic',
  description: 'Risk–Reward Score Sabotage: Channel AURA into devastating strikes against opponent scores.',
  longDescription: 'Score Saw channels aura into sharp strikes against opponent scores. Costs 2/4/6/10 AURA for escalating devastation from 25% reduction to 50% banked score removal. Strategic timing is critical.',
  flavorText: '"A well-timed strike can undo an empire built in a single turn."',
  iconUrl: '/Abilities/Base Images/hand holding saw.webp',
  cooldown: 0,
  auraCost: 2,
  starCost: 4,
  targeting: {
    type: 'opponent',
    allowSelfTarget: false,
    maxTargets: 1
  },
  timing: {
    usableWhen: ['opponent_turn_end']
  },
  effects: [
    {
      id: 'score_saw_light_cut',
      name: 'Light Cut (2 Aura)',
      description: 'Reduce opponent turn score by 25%',
      type: 'modify_score',
      magnitude: 'reduce_turn_score_25',
      target: { type: 'opponent', property: 'currentTurnScore' },
      duration: 0
    },
    {
      id: 'score_saw_deep_cut',
      name: 'Deep Cut (4 Aura)',
      description: 'Reduce opponent turn score by 50%',
      type: 'modify_score',
      magnitude: 'reduce_turn_score_50',
      target: { type: 'opponent', property: 'currentTurnScore' },
      duration: 0
    },
    {
      id: 'score_saw_reset_cut',
      name: 'Reset Cut (6 Aura)',
      description: 'Reset opponent turn score to 0',
      type: 'modify_score',
      magnitude: 'reset_turn_score',
      target: { type: 'opponent', property: 'currentTurnScore' },
      duration: 0
    },
    {
      id: 'score_saw_bank_devastation',
      name: 'Bank Devastation (10 Aura)',
      description: 'Remove 50% of opponent banked score',
      type: 'modify_score',
      magnitude: 'reduce_banked_score_50',
      target: { type: 'opponent', property: 'bankedScore' },
      duration: 0
    }
  ],
  conditions: [
    {
      type: 'variable_aura_cost',
      description: 'Costs 2/4/6/10 AURA for different effect levels',
      checkFunction: 'checkScoreSawAuraCost',
      parameters: { lightCut: 2, deepCut: 4, resetCut: 6, bankDevastiation: 10 }
    }
  ],
  unlockRequirements: { level: 1 },
  balancing: {
    powerLevel: 90,
    winRateImpact: 0.25,
    usageFrequency: 'medium',
    lastBalanceUpdate: new Date()
  },
  isActive: true,
  isHidden: false,
  isDevelopment: false,
  tags: ['tactical', 'score-sabotage', 'scaling-cost', 'high-risk', 'comeback-mechanic'],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system'
};

async function syncScoreSaw() {
  try {
    console.log('🔄 Syncing Score Saw ability to Firebase...');
    
    const abilityRef = doc(db, 'abilities', SCORE_SAW.id);
    await setDoc(abilityRef, SCORE_SAW);
    
    console.log('✅ Successfully synced Score Saw to Firebase!');
    console.log('📋 Ability ID: score_saw');
    console.log('⚡ AURA Cost: 2-10 (variable)');
    console.log('⭐ Star Cost: 4');
    console.log('🎯 Category: tactical');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing Score Saw:', error);
    process.exit(1);
  }
}

syncScoreSaw();
