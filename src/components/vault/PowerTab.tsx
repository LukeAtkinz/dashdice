'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { useAbilities } from '../../hooks/useAbilities';
import { useAuth } from '@/context/AuthContext';
import { UserService, PowerLoadout } from '@/services/userService';
import { AbilitiesService } from '@/services/abilitiesService';
import PowerCard from './PowerCard';
import { ABILITY_CATEGORIES, Ability } from '../../types/abilities';
import { resetAbilitiesCollection } from '@/utils/resetAbilities';
import { AbilityDetailsModal } from './AbilityDetailsModal';

// Game modes configuration
const GAME_MODES = [
  {
    id: 'quick-fire',
    name: 'Quick Fire',
    icon: '/Design Elements/Shield.webp',
    color: '#FF6B35',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    maxAbilities: 5
  },
  {
    id: 'classic',
    name: 'Classic Mode', 
    icon: '/Design Elements/Crown Mode.webp',
    color: '#4F46E5',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    maxAbilities: 5
  },
  {
    id: 'zero-hour',
    name: 'Zero Hour',
    icon: '/Design Elements/time out.webp',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    maxAbilities: 5
  },
  {
    id: 'last-line',
    name: 'Last Line',
    icon: '/Design Elements/skull.webp',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    maxAbilities: 5
  }
];

// Category slot configuration - one slot per category
const CATEGORY_SLOTS = [
  { key: 'tactical', name: 'Tactical', icon: '/Abilities/Catagories/Tactical/Tactical.webp' },
  { key: 'attack', name: 'Attack', icon: '/Abilities/Catagories/Attack/Attack.webp' },
  { key: 'defense', name: 'Defense', icon: '/Abilities/Catagories/Defense/Defense.webp' },
  { key: 'utility', name: 'Utility', icon: '/Abilities/Catagories/Utility/Utility.webp' },
  { key: 'gamechanger', name: 'Game Changer', icon: '/Abilities/Catagories/Game Changer/Game Changer.webp' }
];

export default function PowerTab({ 
  mobileHeaderOnly = false,
  activeTab,
  onTabChange
}: { 
  mobileHeaderOnly?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const {
    allAbilities,
    playerAbilities,
    loading
  } = useAbilities();
  
  const { user } = useAuth();
  
  // State for ability details modal
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Debug logging for abilities
  console.log('🔍 PowerTab Debug - allAbilities:', allAbilities.length, allAbilities);
  console.log('🔍 PowerTab Debug - playerAbilities:', playerAbilities);
  console.log('🔍 PowerTab Debug - playerAbilities.unlocked:', playerAbilities.unlocked);
  console.log('🔍 PowerTab Debug - loading:', loading);
  
  // Auto-unlock all starter abilities if user is missing any - NO RELOAD
  // Use a ref to prevent infinite loops - only run once per user session
  const hasCheckedStarterAbilities = React.useRef<Record<string, boolean>>({});
  
  useEffect(() => {
    const autoUnlockStarterAbilities = async () => {
      // Only run once per user
      if (!user?.uid || loading || hasCheckedStarterAbilities.current[user.uid]) return;
      
      hasCheckedStarterAbilities.current[user.uid] = true;
      
      const starterAbilityIds = ['luck_turner', 'pan_slap', 'score_saw', 'siphon', 'hard_hat'];
      const missingAbilities = starterAbilityIds.filter(id => !playerAbilities.unlocked.includes(id));
      
      if (missingAbilities.length > 0) {
        console.log('🔓 AUTO-UNLOCKING missing starter abilities:', missingAbilities);
        
        for (const abilityId of missingAbilities) {
          try {
            await AbilitiesService.unlockAbility(user.uid, abilityId);
            console.log(`✅ Auto-unlocked: ${abilityId}`);
          } catch (err) {
            console.error(`❌ Failed to auto-unlock ${abilityId}:`, err);
          }
        }
        
        console.log('✅ Starter abilities unlocked - context should update automatically');
      }
    };
    
    autoUnlockStarterAbilities();
  }, [user?.uid, loading, playerAbilities.unlocked]);
  
  // Make reset function available globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).resetAbilities = resetAbilitiesCollection;
      
      // Add utility to force refresh abilities with correct icon paths
      (window as any).forceRefreshAbilities = async () => {
        try {
          console.log('� Force refreshing abilities...');
          await AbilitiesService.refreshAllAbilities();
          console.log('✅ Abilities refreshed! Reload page to see changes.');
        } catch (error) {
          console.error('❌ Failed to refresh abilities:', error);
        }
      };
      
      // Add utility to unlock Pan Slap for current user
      (window as any).unlockPanSlapForMe = async () => {
        try {
          if (!user?.uid) {
            console.error('❌ No user logged in');
            return;
          }
          console.log('🔓 Unlocking Pan Slap for current user...');
          const success = await AbilitiesService.unlockAbility(user.uid, 'pan_slap');
          if (success) {
            console.log('✅ Pan Slap unlocked! Refresh page to see it.');
          } else {
            console.log('❌ Failed to unlock Pan Slap');
          }
        } catch (error) {
          console.error('❌ Error unlocking Pan Slap:', error);
        }
      };
      
      // Unlock ALL starter abilities for current user
      (window as any).unlockAllStarterAbilities = async () => {
        try {
          if (!user?.uid) {
            console.error('❌ No user logged in');
            return;
          }
          
          console.log('🔓 Unlocking all starter abilities for user...');
          const starterAbilityIds = ['luck_turner', 'pan_slap', 'score_saw', 'siphon', 'hard_hat'];
          
          for (const abilityId of starterAbilityIds) {
            try {
              await AbilitiesService.unlockAbility(user.uid, abilityId);
              console.log(`✅ Unlocked: ${abilityId}`);
            } catch (err) {
              console.error(`❌ Failed to unlock ${abilityId}:`, err);
            }
          }
          
          console.log('🎉 All starter abilities unlocked! Refresh the page.');
        } catch (error) {
          console.error('❌ Failed to unlock abilities:', error);
        }
      };
      
      // Complete fix utility
      (window as any).fixAbilitiesCompletely = async () => {
        try {
          console.log('🔧 Running complete abilities fix...');
          
          // Step 1: Refresh abilities
          console.log('1. Refreshing abilities...');
          await AbilitiesService.refreshAllAbilities();
          
          // Step 2: Unlock Pan Slap for current user
          if (user?.uid) {
            console.log('2. Unlocking Pan Slap...');
            await AbilitiesService.unlockAbility(user.uid, 'pan_slap');
          }
          
          console.log('🎉 Complete fix done! Refresh page to see all changes.');
          console.log('💡 Pan Slap should now appear in Defense category with proper icon');
          
        } catch (error) {
          console.error('❌ Complete fix failed:', error);
        }
      };
      
      // Add utility to debug current user abilities
      (window as any).debugUserAbilities = async () => {
        try {
          if (!user?.uid) {
            console.error('❌ No user logged in');
            return;
          }
          
          console.log('🔍 DEBUG USER ABILITIES');
          console.log('👤 User ID:', user.uid.substring(0, 8) + '...');
          
          // Get user abilities from service
          const userAbilities = await AbilitiesService.getUserAbilities(user.uid);
          console.log(`� User has ${userAbilities.length} abilities unlocked:`);
          
          userAbilities.forEach(ua => {
            console.log(`  - ${ua.abilityId} (times used: ${ua.timesUsed})`);
          });
          
          // Check for specific abilities
          const hasLuckTurner = userAbilities.find(ua => ua.abilityId === 'luck_turner');
          const hasPanSlap = userAbilities.find(ua => ua.abilityId === 'pan_slap');
          
          console.log('🎯 Specific Abilities:');
          console.log(`  - Luck Turner: ${hasLuckTurner ? '✅ Unlocked' : '❌ Missing'}`);
          console.log(`  - Pan Slap: ${hasPanSlap ? '✅ Unlocked' : '❌ Missing'}`);
          
          // If missing, unlock them
          if (!hasLuckTurner) {
            console.log('🔓 Unlocking Luck Turner...');
            await AbilitiesService.unlockAbility(user.uid, 'luck_turner');
            console.log('✅ Luck Turner unlocked!');
          }
          
          if (!hasPanSlap) {
            console.log('🔓 Unlocking Pan Slap...');
            await AbilitiesService.unlockAbility(user.uid, 'pan_slap');
            console.log('✅ Pan Slap unlocked!');
          }
          
          console.log('🎉 Debug complete! Refresh page to see changes.');
          
        } catch (error) {
          console.error('❌ Debug failed:', error);
        }
      };
      
      console.log('�🛠️ Browser utilities available:');
      console.log('  - window.resetAbilities() - Reset abilities collection');
      console.log('  - window.forceRefreshAbilities() - Update abilities with correct icons');
      console.log('  - window.unlockPanSlapForMe() - Unlock Pan Slap for current user');
      console.log('  - window.fixAbilitiesCompletely() - Run complete fix');
      console.log('  - window.debugUserAbilities() - Debug and fix user abilities');
      console.log('  - window.testAbilityInMatch() - Test ability usage with AURA deduction');
      console.log('  - window.fixAbilityIcons() - Update Firebase abilities with correct icon paths');
      console.log('  - window.debugAbilityIcons() - Check current icon URLs in Firebase');
      
      // Debug current ability icons in Firebase
      (window as any).debugAbilityIcons = async () => {
        try {
          console.log('🔍 DEBUGGING ABILITY ICONS IN FIREBASE...');
          
          // Get abilities from Firebase
          const abilities = await AbilitiesService.getAllAbilities();
          console.log(`📚 Found ${abilities.length} abilities in Firebase`);
          
          // Check specific abilities
          const luckTurner = abilities.find(a => a.id === 'luck_turner');
          const panSlap = abilities.find(a => a.id === 'pan_slap');
          
          if (luckTurner) {
            console.log('🔧 LUCK TURNER:');
            console.log(`  - Current icon: ${luckTurner.iconUrl}`);
            console.log(`  - Should be: /Abilities/Base Images/hand holding screwdriver.png`);
            console.log(`  - Match: ${luckTurner.iconUrl === '/Abilities/Base Images/hand holding screwdriver.png' ? '✅' : '❌'}`);
          } else {
            console.log('❌ Luck Turner not found in Firebase');
          }
          
          if (panSlap) {
            console.log('🍳 PAN SLAP:');
            console.log(`  - Current icon: ${panSlap.iconUrl}`);
            console.log(`  - Should be: /Abilities/Base Images/hand holding pan.png`);
            console.log(`  - Match: ${panSlap.iconUrl === '/Abilities/Base Images/hand holding pan.png' ? '✅' : '❌'}`);
          } else {
            console.log('❌ Pan Slap not found in Firebase');
          }
          
          // Test if the image files exist
          console.log('🌐 Testing image file accessibility...');
          
          const testImage1 = new Image();
          testImage1.onload = () => console.log('✅ Screwdriver image loads successfully');
          testImage1.onerror = () => console.log('❌ Screwdriver image failed to load');
          testImage1.src = '/Abilities/Base Images/hand holding screwdriver.png';
          
          const testImage2 = new Image();
          testImage2.onload = () => console.log('✅ Pan image loads successfully');
          testImage2.onerror = () => console.log('❌ Pan image failed to load');
          testImage2.src = '/Abilities/Base Images/hand holding pan.png';
          
        } catch (error) {
          console.error('❌ Debug failed:', error);
        }
      };
      
      // Fix ability icons in Firebase
      (window as any).fixAbilityIcons = async () => {
        try {
          if (!user?.uid) {
            console.error('❌ No user logged in');
            return;
          }
          
          console.log('🔧 FIXING ABILITY ICONS IN FIREBASE...');
          
          // Force refresh abilities collection with corrected constants
          await AbilitiesService.refreshAllAbilities();
          console.log('✅ Abilities collection refreshed with correct icon paths');
          
          // Also update any cached abilities
          const abilities = await AbilitiesService.getAllAbilities();
          console.log(`📚 Loaded ${abilities.length} abilities from Firebase`);
          
          // Check specific abilities
          const luckTurner = abilities.find(a => a.id === 'luck_turner');
          const panSlap = abilities.find(a => a.id === 'pan_slap');
          
          if (luckTurner) {
            console.log(`🔧 Luck Turner icon: ${luckTurner.iconUrl}`);
          }
          if (panSlap) {
            console.log(`🔧 Pan Slap icon: ${panSlap.iconUrl}`);
          }
          
          console.log('🎉 Icon fix complete! Hard refresh page to see updated icons.');
          
        } catch (error) {
          console.error('❌ Icon fix failed:', error);
        }
      };
      
      // Test ability usage in match context
      (window as any).testAbilityInMatch = async (abilityId = 'luck_turner', matchId = 'test_match') => {
        try {
          if (!user?.uid) {
            console.error('❌ No user logged in');
            return;
          }
          
          console.log(`🧪 TESTING ABILITY: ${abilityId} in match ${matchId}`);
          
          // Import the executeMatchAbility function
          const { executeMatchAbility } = await import('@/services/abilityFirebaseService');
          
          // Test the ability execution with AURA deduction
          console.log('⚡ Executing ability with AURA deduction...');
          const result = await executeMatchAbility(
            matchId,
            user.uid,
            abilityId,
            [], // No targets for these abilities
            undefined // Use default AURA cost
          );
          
          console.log('🎯 Result:', result);
          
          if (result.success) {
            console.log('✅ Ability executed successfully!');
            console.log(`💰 AURA spent: ${result.resourcesSpent.aura}`);
            console.log(`📊 Effects applied: ${result.effectsApplied.join(', ')}`);
          } else {
            console.log('❌ Ability execution failed:', result.errorMessage);
          }
          
        } catch (error) {
          console.error('❌ Test failed:', error);
        }
      };
    }
  }, [user]);
  
  const [currentGameModeIndex, setCurrentGameModeIndex] = useState(0);
  const [gameModeLoadouts, setGameModeLoadouts] = useState<Record<string, Record<string, string>>>({
    'quick-fire': {},
    'classic': {},
    'zero-hour': {},
    'last-line': {}
  });
  const [isLoadingLoadouts, setIsLoadingLoadouts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [slotIconErrors, setSlotIconErrors] = useState<Record<string, boolean>>({});

  // Load loadouts from Firebase when user is available
  useEffect(() => {
    if (user) {
      loadUserLoadouts();
    }
  }, [user]);

  const loadUserLoadouts = async () => {
    if (!user) return;
    
    try {
      setIsLoadingLoadouts(true);
      console.log('🔄 PowerTab: Loading user loadouts from Firebase');
      
      const powerLoadouts = await UserService.getUserPowerLoadouts(user.uid);
      
      if (powerLoadouts) {
        // Convert Firebase format to component format
        const loadouts: Record<string, Record<string, string>> = {
          'quick-fire': {},
          'classic': {},
          'zero-hour': {},
          'last-line': {}
        };

        // Convert PowerLoadout to Record<string, string> format
        Object.keys(loadouts).forEach(gameMode => {
          const powerLoadout = powerLoadouts[gameMode as keyof typeof powerLoadouts];
          if (powerLoadout) {
            loadouts[gameMode] = {
              tactical: powerLoadout.tactical || '',
              attack: powerLoadout.attack || '',
              defense: powerLoadout.defense || '',
              utility: powerLoadout.utility || '',
              gamechanger: powerLoadout.gamechanger || ''
            };
            // Remove empty strings
            Object.keys(loadouts[gameMode]).forEach(key => {
              if (!loadouts[gameMode][key]) {
                delete loadouts[gameMode][key];
              }
            });
          }
        });
        
        setGameModeLoadouts(loadouts);
        console.log('✅ PowerTab: Loaded loadouts from Firebase:', loadouts);
      } else {
        console.log('📝 PowerTab: No existing loadouts found, using defaults');
      }
    } catch (error) {
      console.error('❌ PowerTab: Error loading loadouts:', error);
    } finally {
      setIsLoadingLoadouts(false);
    }
  };

  const saveLoadoutToFirebase = async (gameMode: string, loadout: Record<string, string>) => {
    if (!user) return;

    try {
      setIsSaving(true);
      console.log(`💾 PowerTab: Saving ${gameMode} loadout to Firebase:`, loadout);
      
      // Convert component format to Firebase format
      const powerLoadout: PowerLoadout = {
        tactical: loadout.tactical || undefined,
        attack: loadout.attack || undefined,
        defense: loadout.defense || undefined,
        utility: loadout.utility || undefined,
        gamechanger: loadout.gamechanger || undefined
      };

      // Remove undefined values
      Object.keys(powerLoadout).forEach(key => {
        if (powerLoadout[key as keyof PowerLoadout] === undefined) {
          delete powerLoadout[key as keyof PowerLoadout];
        }
      });

      await UserService.updatePowerLoadout(
        user.uid, 
        gameMode as 'quick-fire' | 'classic' | 'zero-hour' | 'last-line', 
        powerLoadout
      );
      
      // 🔍 ENHANCED DEBUG: Check if siphon was saved
      console.log(`✅ PowerTab: Successfully saved ${gameMode} loadout to Firebase`);
      if (Object.values(powerLoadout).includes('siphon')) {
        console.log('🧛 SIPHON SAVE DEBUG: Siphon was included in the saved loadout!', {
          gameMode,
          powerLoadout,
          siphonCategory: Object.entries(powerLoadout).find(([_, abilityId]) => abilityId === 'siphon')?.[0]
        });
      } else {
        console.log('❌ SIPHON SAVE DEBUG: Siphon NOT found in saved loadout', { gameMode, powerLoadout });
      }
    } catch (error) {
      console.error(`❌ PowerTab: Error saving ${gameMode} loadout:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoadingLoadouts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-white font-medium">
          {isLoadingLoadouts ? 'Loading loadouts...' : 'Loading abilities...'}
        </span>
      </div>
    );
  }

  const currentGameMode = GAME_MODES[currentGameModeIndex];
  const currentLoadout = gameModeLoadouts[currentGameMode.id] || {};
  
  // 🔍 DEBUG: Track current game mode calculation
  console.log('📊 CURRENT GAME MODE CALCULATION:', {
    currentGameModeIndex,
    currentGameModeId: currentGameMode.id,
    currentGameModeName: currentGameMode.name,
    totalGameModes: GAME_MODES.length
  });

  // Helper functions
  const nextGameMode = () => {
    setCurrentGameModeIndex((prev) => {
      const newIndex = (prev + 1) % GAME_MODES.length;
      return newIndex;
    });
  };

  const prevGameMode = () => {
    setCurrentGameModeIndex((prev) => {
      const newIndex = (prev - 1 + GAME_MODES.length) % GAME_MODES.length;
      return newIndex;
    });
  };

  const assignAbilityToCategory = (abilityId: string, category: string) => {
    // 🔍 Get current state values to avoid closure issues
    setCurrentGameModeIndex(currentIndex => {
      const actualCurrentGameMode = GAME_MODES[currentIndex];
      
      // Update loadouts using the actual current game mode
      setGameModeLoadouts(currentLoadouts => {
        const newLoadouts = {
          ...currentLoadouts,
          [actualCurrentGameMode.id]: {
            ...currentLoadouts[actualCurrentGameMode.id],
            [category]: abilityId
          }
        };
        
        // Save to Firebase with the correct game mode
        saveLoadoutToFirebase(actualCurrentGameMode.id, newLoadouts[actualCurrentGameMode.id]);
        
        return newLoadouts;
      });
      
      return currentIndex; // Don't change the index, just use it
    });
  };

  const removeAbilityFromCategory = (category: string) => {
    // 🔍 Use current state to avoid closure issues
    setCurrentGameModeIndex(currentIndex => {
      const actualCurrentGameMode = GAME_MODES[currentIndex];
      
      setGameModeLoadouts(currentLoadouts => {
        const newLoadout = { ...currentLoadouts[actualCurrentGameMode.id] };
        delete newLoadout[category];
        
        const newLoadouts = {
          ...currentLoadouts,
          [actualCurrentGameMode.id]: newLoadout
        };
        
        // Save to Firebase with the correct game mode
        saveLoadoutToFirebase(actualCurrentGameMode.id, newLoadout);
        
        return newLoadouts;
      });
      
      return currentIndex; // Don't change the index
    });
  };

  // Get abilities by category for placeholders
  const getAbilitiesByCategory = () => {
    const categories = Object.keys(ABILITY_CATEGORIES);
    return categories.map(category => {
      const categoryInfo = ABILITY_CATEGORIES[category as keyof typeof ABILITY_CATEGORIES];
      // Filter abilities by exact category match
      const abilities = allAbilities.filter(ability => ability.category === category);
      return { category, categoryInfo, abilities };
    });
  };

  const categoryGroups = getAbilitiesByCategory();

  // Random icons for "Coming Soon" abilities
  const comingSoonIcons = [
    '/Abilities/hand holding light bulb.png',
    '/Abilities/hand holding axe.png',
    '/Abilities/hand holding book.png',
    '/Abilities/hand holding briefcase.png',
    '/Abilities/hand holding camera.png',
    '/Abilities/hand holding drill machine.png',
    '/Abilities/hand holding gamepad.png',
    '/Abilities/hand holding hammer.png',
    '/Abilities/hand holding helmet.png',
    '/Abilities/hand holding key.png',
    '/Abilities/hand holding keyboard.png',
    '/Abilities/hand holding magnifying glass.png',
    '/Abilities/hand holding megaphone.png',
    '/Abilities/hand holding paint brush.png',
    '/Abilities/hand holding puzzle.png',
    '/Abilities/hand holding saw.png',
    '/Abilities/hand holding screwdriver.png',
    '/Abilities/hand holding stopwatch.png',
    '/Abilities/hand holding wrench.png',
    '/Abilities/medicine donation.png'
  ];

  const getRandomIcon = (categoryIndex: number, abilityIndex: number) => {
    // Specific icons for each category's coming soon abilities
    const categorySpecificIcons = {
      'tactical': [
        '/Abilities/Formatted/hand holding briefcase.webp',
        '/Abilities/Formatted/hand holding puzzle.webp'
      ],
      'attack': [
        '/Abilities/Formatted/hand holding saw.webp',
        '/Abilities/Formatted/hand holding axe.webp'
      ],
      'defense': [
        '/Abilities/Formatted/hand holding helmet.webp',
        '/Abilities/Formatted/medicine donation.webp'
      ],
      'utility': [
        '/Abilities/Formatted/hand holding wrench.webp',
        '/Abilities/Formatted/hand holding stopwatch.webp'
      ],
      'gamechanger': [
        '/Abilities/Formatted/hand holding paint pallete.webp',
        '/Abilities/Formatted/x ray.webp'
      ]
    };

    // Get category from categoryIndex
    const categories = Object.keys(ABILITY_CATEGORIES);
    const category = categories[categoryIndex];
    
    // Return specific icon for category and ability index
    if (categorySpecificIcons[category as keyof typeof categorySpecificIcons]) {
      const icons = categorySpecificIcons[category as keyof typeof categorySpecificIcons];
      return icons[abilityIndex] || icons[0]; // Fallback to first icon if index out of bounds
    }
    
    // Fallback to original random system if category not found
    const uniqueIndex = (categoryIndex * 10) + abilityIndex;
    return comingSoonIcons[uniqueIndex % comingSoonIcons.length];
  };

  // If mobile header only, return just the header card
  if (mobileHeaderOnly) {
    return (
      <motion.div 
        className="rounded-2xl p-1 overflow-hidden relative -mt-2"
      >
        <div className="relative z-10">
          {/* Navigation */}
          <div className="relative flex items-center justify-center mb-0">
            {/* Left Arrow */}
            <motion.button
              onClick={prevGameMode}
              className="absolute left-0 p-2 rounded-full hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>

            {/* Game Mode Display */}
            <div className="text-center flex flex-col items-center">
              <motion.div
                key={currentGameMode.id}
                className="flex flex-col items-center mb-0"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={currentGameMode.icon}
                  alt={currentGameMode.name}
                  className="w-8 h-8 mb-0 object-contain"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))'
                  }}
                  onError={(e) => {
                    console.log(`Failed to load game mode icon: ${currentGameMode.icon}`);
                    // Fallback to emoji
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = parent.innerHTML.replace(target.outerHTML, `<div class="w-8 h-8 mb-2 flex items-center justify-center text-2xl">${currentGameMode.id === 'quick-fire' ? '🛡️' : currentGameMode.id === 'classic' ? '👑' : currentGameMode.id === 'zero-hour' ? '⏰' : '💀'}</div>`);
                    }
                  }}
                  onLoad={() => {
                    console.log(`Successfully loaded game mode icon: ${currentGameMode.icon}`);
                  }}
                />
                <h1 
                  className="text-2xl font-bold text-white" 
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {currentGameMode.name}
                </h1>
              </motion.div>
              {isSaving && (
                <div className="text-xs text-yellow-300">
                  Saving...
                </div>
              )}
            </div>

            {/* Right Arrow */}
            <motion.button
              onClick={nextGameMode}
              className="absolute right-0 p-2 rounded-full hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>

          {/* Category-Based Loadout Slots Grid - Mobile Compact */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentGameMode.id}
              className="grid grid-cols-5 gap-2 mt-8"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {CATEGORY_SLOTS.map((categorySlot, index) => {
                const assignedAbilityId = currentLoadout[categorySlot.key];
                const assignedAbility = assignedAbilityId ? allAbilities.find(a => a.id === assignedAbilityId) : null;
                const isAssigned = !!assignedAbility;

                return (
                  <motion.div
                    key={`${currentGameMode.id}-slot-${categorySlot.key}`}
                    className="relative group"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div
                      className="aspect-square rounded-lg p-2 border-2 transition-all duration-300 cursor-pointer overflow-hidden relative flex items-center justify-center"
                      style={{
                        borderColor: isAssigned ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                        borderStyle: 'solid',
                        background: isAssigned ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      }}
                      onClick={() => {
                        if (isAssigned) {
                          // Remove the ability from this category slot
                          removeAbilityFromCategory(categorySlot.key);
                        }
                        // For empty slots on mobile, we could potentially add navigation to abilities section
                        // or show a selection modal, but for now just handle removal
                      }}
                    >
                      {isAssigned && assignedAbility ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center relative">
                          <div className="w-12 h-12 relative">
                            <img
                              key={assignedAbility.iconUrl}
                              src={assignedAbility.iconUrl || '/Abilities/placeholder.webp'}
                              alt={assignedAbility.name}
                              className="w-full h-full object-contain opacity-100"
                              style={{
                                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg">${assignedAbility.category === 'tactical' ? '🎯' : assignedAbility.category === 'attack' ? '⚔️' : assignedAbility.category === 'defense' ? '🛡️' : assignedAbility.category === 'utility' ? '🔧' : '💫'}</div>`;
                                }
                              }}
                            />
                          </div>
                          {/* Remove indicator on hover/touch */}
                          <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center gap-1">
                          <div className="w-12 h-12 relative">
                            <img
                              key={categorySlot.icon}
                              src={categorySlot.icon}
                              alt={categorySlot.name}
                              className="w-full h-full object-contain opacity-100"
                              style={{
                                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) brightness(1.2)'
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg">${categorySlot.key === 'tactical' ? '🎯' : categorySlot.key === 'attack' ? '⚔️' : categorySlot.key === 'defense' ? '🛡️' : categorySlot.key === 'utility' ? '🔧' : '💫'}</div>`;
                                }
                              }}
                            />
                          </div>
                          {categorySlot.key === 'gamechanger' && (
                            <span className="text-xs text-yellow-400 font-medium">Coming Soon!</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full h-full md:flex md:justify-center">
    <div 
      className="w-full md:max-w-[1400px] space-y-1 md:space-y-8 mt-0 md:mt-0 h-full md:h-auto flex flex-col md:flex-row md:gap-8"
      style={{
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none'
      }}
    >
      {/* LEFT SIDE - Game Mode and Loadout Card (Desktop: fixed, 50% width) */}
      <motion.div 
        className="rounded-2xl p-0 md:p-8 overflow-hidden md:overflow-visible relative flex-1 md:flex-none flex flex-col md:block md:w-1/2 md:sticky md:top-0"
        layout
        style={{
          height: '100%',
          maxHeight: '100%'
        }}
      >
        <div className="relative z-10 h-full flex flex-col md:block">
          {/* Game Mode Header and Loadout - Sticky at top (flex-shrink-0) */}
          <div className="md:static flex-shrink-0 z-30 rounded-b-xl p-4 md:p-0 bg-transparent shadow-lg md:shadow-none">
            {/* Navigation */}
            <div className="relative flex items-center justify-center mb-3 md:mb-6">
            {/* Left Arrow */}
            <motion.button
              onClick={prevGameMode}
              className="absolute left-0 p-2 md:p-3 rounded-full hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>

            {/* Game Mode Display */}
            <div className="text-center flex flex-col items-center">
              <motion.div
                key={currentGameMode.id}
                className="flex flex-col items-center mb-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={currentGameMode.icon}
                  alt={currentGameMode.name}
                  className="w-12 h-12 mb-3 object-contain"
                  style={{
                    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'
                  }}
                  onError={(e) => {
                    console.log(`Failed to load game mode icon: ${currentGameMode.icon}`);
                    // Fallback to emoji
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = parent.innerHTML.replace(target.outerHTML, `<div class="w-12 h-12 mb-3 flex items-center justify-center text-5xl">${currentGameMode.id === 'quick-fire' ? '🛡️' : currentGameMode.id === 'classic' ? '👑' : currentGameMode.id === 'zero-hour' ? '⏰' : '💀'}</div>`);
                    }
                  }}
                  onLoad={() => {
                    console.log(`Successfully loaded game mode icon: ${currentGameMode.icon}`);
                  }}
                />
                <h1 
                  className="text-2xl md:text-5xl font-bold text-white" 
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {currentGameMode.name}
                </h1>
              </motion.div>
            </div>

            {/* Right Arrow */}
            <motion.button
              onClick={nextGameMode}
              className="absolute right-0 p-2 md:p-3 rounded-full hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>

          {/* Category-Based Loadout Slots Grid - Integrated */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentGameMode.id}
              className="grid grid-cols-5 gap-2 md:gap-2 mb-2 mt-2 md:mb-8 md:mt-12 md:max-w-md md:mx-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {CATEGORY_SLOTS.map((categorySlot, index) => {
                const assignedAbilityId = currentLoadout[categorySlot.key];
                const assignedAbility = assignedAbilityId ? allAbilities.find(a => a.id === assignedAbilityId) : null;
                const isAssigned = !!assignedAbility;
                const slotKey = `${currentGameMode.id}-${categorySlot.key}`;
                const iconError = slotIconErrors[slotKey] || false;

                return (
                  <motion.div
                    key={slotKey}
                    className="relative group"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => {
                      // Allow removal on mobile by tapping the equipped ability
                      if (isAssigned) {
                        removeAbilityFromCategory(categorySlot.key);
                        // Reset error state when removing
                        setSlotIconErrors(prev => ({
                          ...prev,
                          [slotKey]: false
                        }));
                      }
                    }}
                  >
                    <div
                      className="aspect-square rounded-lg p-2 border-2 transition-all duration-300 cursor-pointer overflow-hidden relative flex items-center justify-center"
                      style={{
                        borderColor: isAssigned ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                        borderStyle: 'solid',
                        background: isAssigned ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {isAssigned && assignedAbility ? (
                        <div className="w-full h-full absolute inset-0 flex items-center justify-center text-center">
                          <div className="w-12 h-12 md:w-16 md:h-16 relative">
                            {!iconError ? (
                              <img
                                key={assignedAbility.iconUrl}
                                src={assignedAbility.iconUrl || '/Abilities/placeholder.webp'}
                                alt={assignedAbility.name}
                                className="w-full h-full object-contain opacity-100"
                                style={{
                                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'
                                }}
                                onError={() => {
                                  console.log(`Failed to load ability icon: ${assignedAbility.iconUrl}`);
                                  setSlotIconErrors(prev => ({
                                    ...prev,
                                    [slotKey]: true
                                  }));
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">
                                {assignedAbility.category === 'tactical' ? '🎯' : 
                                 assignedAbility.category === 'attack' ? '⚔️' : 
                                 assignedAbility.category === 'defense' ? '🛡️' : 
                                 assignedAbility.category === 'utility' ? '🔧' : '💫'}
                              </div>
                            )}
                          </div>
                          {/* Remove indicator on hover/touch */}
                          <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full absolute inset-0 flex items-center justify-center text-center">
                          <div className="w-12 h-12 md:w-16 md:h-16 relative">
                            {!iconError ? (
                              <img
                                key={categorySlot.icon}
                                src={categorySlot.icon}
                                alt={categorySlot.name}
                                className="w-full h-full object-contain opacity-100"
                                style={{
                                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) brightness(1.2)'
                                }}
                                onError={() => {
                                  console.log(`Failed to load category icon: ${categorySlot.icon}`);
                                  setSlotIconErrors(prev => ({
                                    ...prev,
                                    [slotKey]: true
                                  }));
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl md:text-6xl">
                                {categorySlot.key === 'tactical' ? '🎯' : 
                                 categorySlot.key === 'attack' ? '⚔️' : 
                                 categorySlot.key === 'defense' ? '🛡️' : 
                                 categorySlot.key === 'utility' ? '🔧' : '💫'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
        </div>
      </motion.div>

      {/* RIGHT SIDE - Available Abilities by Category (Desktop: scrollable, 50% width) */}
      <div 
        className="flex-1 md:flex-none md:w-1/2 overflow-y-auto overflow-x-hidden space-y-6 pt-6 md:pt-0 pb-6 md:pb-0 px-4 md:px-0" 
        style={{
          maxHeight: 'calc(100vh - 80px)',
          maxWidth: '1200px'
        }}
      >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div>
              {categoryGroups.map(({ category, categoryInfo, abilities }, categoryIndex) => {
                const userCategoryAbilities = abilities.filter(ability => 
                  playerAbilities.unlocked.includes(ability.id) && ability.id !== 'score_siphon' && ability.id !== 'power_pull'
                );
                
                return (
                  <motion.div
                    key={category}
                    className="rounded-xl p-6 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={categoryInfo.icon}
                        alt={categoryInfo.name}
                        className="w-12 h-12 object-contain"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                        }}
                      />
                      <h4 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Audiowide' }}>
                        {categoryInfo.name}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
                      {userCategoryAbilities.map(ability => {
                        const isInCurrentLoadout = Object.values(currentLoadout).includes(ability.id);
                        
                        return (
                          <motion.div
                            key={ability.id}
                            className="relative group"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <div
                              className="p-3 md:p-4 transition-all duration-300 overflow-visible cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isInCurrentLoadout) {
                                  // Equip the ability to its category (replace any existing ability in that slot)
                                  assignAbilityToCategory(ability.id, ability.category);
                                } else {
                                  // Deselect/unequip the ability from its current category
                                  const currentCategory = Object.keys(currentLoadout).find(cat => currentLoadout[cat] === ability.id);
                                  if (currentCategory) {
                                    removeAbilityFromCategory(currentCategory);
                                  }
                                }
                              }}
                            >
                              <div className="w-full flex flex-col items-center justify-start text-center gap-3">
                                <div 
                                  className="w-24 h-24 md:w-36 md:h-36 relative flex-shrink-0"
                                >
                                  <img
                                    src={ability.iconUrl || '/Abilities/placeholder.webp'}
                                    alt={ability.name}
                                    className="w-full h-full object-contain opacity-100"
                                    style={{
                                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                                    }}
                                    onError={(e) => {
                                      console.log(`Failed to load ability icon: ${ability.iconUrl}`);
                                      // Fallback to category emoji
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg">${ability.category === 'tactical' ? '🎯' : ability.category === 'attack' ? '⚔️' : ability.category === 'defense' ? '🛡️' : ability.category === 'utility' ? '🔧' : '💫'}</div>`;
                                      }
                                    }}
                                  />
                                </div>
                                <h5 
                                  className="text-white text-sm md:text-base font-medium w-full cursor-pointer hover:text-yellow-400 transition-colors" 
                                  style={{ fontFamily: 'Audiowide', lineHeight: '1.2' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAbility(ability as any);
                                    setIsModalOpen(true);
                                  }}
                                >
                                  {ability.name}
                                </h5>
                                
                                {/* Equipped Label */}
                                {isInCurrentLoadout && (
                                  <p 
                                    className="text-yellow-400 text-xs mt-1" 
                                    style={{ 
                                      fontFamily: 'Audiowide',
                                      textTransform: 'uppercase'
                                    }}
                                  >
                                    Equipped
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      
                      {/* Removed "coming soon" placeholders - only show actual available abilities */}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

      {/* Mobile Available Abilities by Category - DISABLED - Using unified section above */}
      <div className="hidden space-y-1 -mt-1">
        <div>
          {categoryGroups.map(({ category, categoryInfo, abilities }, categoryIndex) => {
            const userCategoryAbilities = abilities.filter(ability => 
              playerAbilities.unlocked.includes(ability.id) && ability.id !== 'score_siphon' && ability.id !== 'power_pull'
            );
            
            return (
              <motion.div
                key={category}
                className="rounded-xl p-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <img
                    src={categoryInfo.icon}
                    alt={categoryInfo.name}
                    className="w-12 h-12 md:w-12 md:h-12 object-contain"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                    }}
                  />
                  <h4 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: 'Audiowide' }}>
                    {categoryInfo.name}
                  </h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 mt-4">
                  {userCategoryAbilities.map(ability => {
                    const isInCurrentLoadout = Object.values(currentLoadout).includes(ability.id);
                    
                    return (
                      <motion.div
                        key={ability.id}
                        className="relative group cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (!isInCurrentLoadout) {
                            // Equip the ability to its category (replace any existing ability in that slot)
                            assignAbilityToCategory(ability.id, ability.category);
                          } else {
                            // Find and remove the ability from its current category
                            const currentCategory = Object.keys(currentLoadout).find(cat => currentLoadout[cat] === ability.id);
                            if (currentCategory) {
                              removeAbilityFromCategory(currentCategory);
                            }
                          }
                        }}
                      >
                        <div
                          className="aspect-square rounded-lg p-3 border transition-all duration-300 overflow-hidden"
                          style={{
                            background: isInCurrentLoadout 
                              ? `linear-gradient(135deg, ${currentGameMode.color}40 0%, transparent 100%)`
                              : 'linear-gradient(135deg, #4B5563 0%, transparent 100%)',
                            borderColor: isInCurrentLoadout ? currentGameMode.color : 'rgba(255, 255, 255, 0.2)',
                            opacity: isInCurrentLoadout ? 0.5 : 1
                          }}
                        >
                          <div className="w-full h-full flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 relative">
                              <img
                                src={ability.iconUrl || '/Abilities/placeholder.webp'}
                                alt={ability.name}
                                className="w-full h-full object-contain opacity-100"
                                style={{
                                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                                }}
                                onError={(e) => {
                                  console.log(`Failed to load ability icon: ${ability.iconUrl}`);
                                  // Fallback to category emoji
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg">${ability.category === 'tactical' ? '🎯' : ability.category === 'attack' ? '⚔️' : ability.category === 'defense' ? '🛡️' : ability.category === 'utility' ? '🔧' : '💫'}</div>`;
                                  }
                                }}
                              />
                            </div>
                            <h5 className="text-white text-xs font-medium truncate" style={{ fontFamily: 'Audiowide' }}>
                              {ability.name}
                            </h5>
                          </div>
                          
                          {isInCurrentLoadout && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="bg-green-500 rounded-full p-1">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Coming Soon Abilities - Only show if less than 3 total abilities in category */}
                  {userCategoryAbilities.length < 3 && (
                    <>
                      {/* Coming Soon Ability 1 */}
                      <motion.div
                        className="relative group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: userCategoryAbilities.length * 0.1 }}
                      >
                        <div
                          className="aspect-square rounded-lg p-3 border transition-all duration-300 overflow-hidden relative"
                          style={{
                            background: 'linear-gradient(135deg, #374151 0%, transparent 100%)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            opacity: 1
                          }}
                        >
                          <div className="w-full h-full flex flex-col items-center justify-center text-center relative">
                            <div className="w-20 h-20 relative z-30">
                              <img
                                src={getRandomIcon(categoryIndex, 0)}
                                alt="Coming Soon"
                                className="w-full h-full object-contain opacity-100"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-3xl">${category === 'attack' ? '⚔️' : category === 'defense' ? '🛡️' : category === 'utility' ? '🔧' : '💫'}</div>`;
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 flex items-center justify-center py-1 z-20">
                            <span className="text-white text-xs font-bold" style={{ fontFamily: 'Audiowide' }}>
                              COMING SOON!
                            </span>
                          </div>
                        </div>
                      </motion.div>
                      
                      {/* Coming Soon Ability 2 */}
                      <motion.div
                        className="relative group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: (userCategoryAbilities.length + 1) * 0.1 }}
                      >
                        <div
                          className="aspect-square rounded-lg p-3 border transition-all duration-300 overflow-hidden relative"
                          style={{
                            background: 'linear-gradient(135deg, #374151 0%, transparent 100%)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            opacity: 1
                          }}
                        >
                          <div className="w-full h-full flex flex-col items-center justify-center text-center relative">
                            <div className="w-20 h-20 relative z-30">
                              <img
                                src={getRandomIcon(categoryIndex, 1)}
                                alt="Coming Soon"
                                className="w-full h-full object-contain opacity-100"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-3xl">${category === 'attack' ? '⚔️' : category === 'defense' ? '🛡️' : category === 'utility' ? '🔧' : '💫'}</div>`;
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 flex items-center justify-center py-1 z-20">
                            <span className="text-white text-xs font-bold" style={{ fontFamily: 'Audiowide' }}>
                              COMING SOON!
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Ability Details Modal */}
      {selectedAbility && (
        <AbilityDetailsModal
          ability={selectedAbility}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAbility(null);
          }}
        />
      )}
    </div>
    </div>
  );
}
