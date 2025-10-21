'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAbilities } from '@/context/AbilitiesContext';
import { useAuth } from '@/context/AuthContext';
import { UserService, PowerLoadout } from '@/services/userService';
import PowerCard from './PowerCard';
import { ABILITY_CATEGORIES, CATEGORY_COLORS } from '@/types/abilities';

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

export default function PowerTab({ mobileHeaderOnly = false }: { mobileHeaderOnly?: boolean }) {
  const {
    allAbilities,
    userAbilities,
    isLoading,
    isInitialized
  } = useAbilities();
  
  const { user } = useAuth();
  
  const [currentGameModeIndex, setCurrentGameModeIndex] = useState(0);
  const [gameModeLoadouts, setGameModeLoadouts] = useState<Record<string, Record<string, string>>>({
    'quick-fire': {},
    'classic': {},
    'zero-hour': {},
    'last-line': {}
  });
  const [isLoadingLoadouts, setIsLoadingLoadouts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load loadouts from Firebase when user is available
  useEffect(() => {
    if (user && isInitialized) {
      loadUserLoadouts();
    }
  }, [user, isInitialized]);

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

  console.log('🚨 PowerTab: Component starting to render!!!');
  console.log('PowerTab Debug:', {
    allAbilitiesCount: allAbilities?.length || 0,
    userAbilitiesCount: userAbilities?.length || 0,
    isLoading,
    isInitialized
  });
  
  // Debug abilities data
  if (allAbilities?.length) {
    console.log('🔮 All abilities:', allAbilities.map(a => ({ name: a.name, category: a.category, id: a.id })));
  }
  if (userAbilities?.length) {
    console.log('👤 User abilities:', userAbilities.map(ua => ({ abilityId: ua.abilityId })));
  }

  if (!isInitialized || isLoading || isLoadingLoadouts) {
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

  // Helper functions
  const nextGameMode = () => {
    setCurrentGameModeIndex((prev) => (prev + 1) % GAME_MODES.length);
  };

  const prevGameMode = () => {
    setCurrentGameModeIndex((prev) => (prev - 1 + GAME_MODES.length) % GAME_MODES.length);
  };

  const assignAbilityToCategory = (abilityId: string, category: string) => {
    // 🔍 DEBUG: Track which game mode we're assigning to
    console.log('🎯 ASSIGN DEBUG:', {
      currentGameModeIndex,
      currentGameModeId: currentGameMode.id,
      currentGameModeName: currentGameMode.name,
      abilityId,
      category,
      existingLoadout: gameModeLoadouts[currentGameMode.id]
    });
    
    const newLoadouts = {
      ...gameModeLoadouts,
      [currentGameMode.id]: {
        ...gameModeLoadouts[currentGameMode.id],
        [category]: abilityId
      }
    };
    
    setGameModeLoadouts(newLoadouts);
    
    // Save to Firebase
    saveLoadoutToFirebase(currentGameMode.id, newLoadouts[currentGameMode.id]);
  };

  const removeAbilityFromCategory = (category: string) => {
    const newLoadout = { ...gameModeLoadouts[currentGameMode.id] };
    delete newLoadout[category];
    
    const newLoadouts = {
      ...gameModeLoadouts,
      [currentGameMode.id]: newLoadout
    };
    
    setGameModeLoadouts(newLoadouts);
    
    // Save to Firebase
    saveLoadoutToFirebase(currentGameMode.id, newLoadout);
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
                      className="aspect-square rounded-lg p-2 border-2 backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden relative"
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
                          <div className="w-8 h-8 relative">
                            <img
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
                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                          <div className="w-8 h-8 relative">
                            <img
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
    <div className="w-full space-y-1 md:space-y-8 -mt-2 md:mt-0">
      {/* Unified Game Mode and Abilities Card - Desktop Only */}
      <motion.div 
        className="hidden md:block rounded-2xl p-8 overflow-hidden relative"
        layout
      >
        <div className="relative z-10">
          {/* Navigation */}
          <div className="relative flex items-center justify-center mb-6">
            {/* Left Arrow */}
            <motion.button
              onClick={prevGameMode}
              className="absolute left-0 p-3 rounded-full hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="text-5xl font-bold text-white" 
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {currentGameMode.name}
                </h1>
              </motion.div>
              {isSaving && (
                <div className="text-sm text-yellow-300">
                  💾 Saving loadout...
                </div>
              )}
            </div>

            {/* Right Arrow */}
            <motion.button
              onClick={nextGameMode}
              className="absolute right-0 p-3 rounded-full hover:bg-black/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>

          {/* Category-Based Loadout Slots Grid - Integrated */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentGameMode.id}
              className="grid grid-cols-5 gap-2 md:gap-4 mb-8 mt-12"
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
                      className="aspect-square rounded-lg p-2 border-2 backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden relative"
                      style={{
                        borderColor: isAssigned ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                        borderStyle: 'solid',
                        background: isAssigned ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {isAssigned && assignedAbility ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 md:w-20 md:h-20 relative">
                            <img
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
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 md:w-24 md:h-24 mb-1 md:mb-2 relative">
                            <img
                              src={categorySlot.icon}
                              alt={categorySlot.name}
                              className="w-full h-full object-contain opacity-100"
                              style={{
                                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) brightness(1.2)'
                              }}
                              onError={(e) => {
                                console.log(`Failed to load category icon: ${categorySlot.icon}`);
                                // Fallback to emoji
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl md:text-6xl">${categorySlot.key === 'tactical' ? '🎯' : categorySlot.key === 'attack' ? '⚔️' : categorySlot.key === 'defense' ? '🛡️' : categorySlot.key === 'utility' ? '🔧' : '💫'}</div>`;
                                }
                              }}
                            />
                          </div>
                          <p className="text-white/60 text-xs font-medium" style={{ fontFamily: 'Audiowide' }}>
                            {categorySlot.name}
                          </p>
                          <p className="text-white/40 text-xs md:hidden">
                            Empty
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Available Abilities by Category - Integrated */}
          <div className="space-y-6">
            <div>
              {categoryGroups.map(({ category, categoryInfo, abilities }, categoryIndex) => {
                const userCategoryAbilities = abilities.filter(ability => 
                  userAbilities.some(ua => ua.abilityId === ability.id)
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

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
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
                              className="aspect-square rounded-lg p-3 border transition-all duration-300 backdrop-blur-sm overflow-hidden"
                              style={{
                                background: isInCurrentLoadout 
                                  ? `linear-gradient(135deg, ${currentGameMode.color}40 0%, transparent 100%)`
                                  : 'linear-gradient(135deg, #4B5563 0%, transparent 100%)',
                                borderColor: isInCurrentLoadout ? currentGameMode.color : 'rgba(255, 255, 255, 0.2)',
                                opacity: isInCurrentLoadout ? 0.5 : 1
                              }}
                            >
                              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 md:w-20 md:h-20 relative">
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
                              className="aspect-square rounded-lg p-3 border transition-all duration-300 backdrop-blur-sm overflow-hidden relative"
                              style={{
                                background: 'linear-gradient(135deg, #374151 0%, transparent 100%)',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                opacity: 1
                              }}
                            >
                              <div className="w-full h-full flex flex-col items-center justify-center text-center relative">
                                <div className="w-20 h-20 md:w-24 md:h-24 relative z-30">
                                  <img
                                    src={getRandomIcon(categoryIndex, 0)}
                                    alt="Coming Soon"
                                    className="w-full h-full object-contain opacity-100"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-4xl">${category === 'attack' ? '⚔️' : category === 'defense' ? '🛡️' : category === 'utility' ? '🔧' : '💫'}</div>`;
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 flex items-center justify-center py-2 z-20">
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
                              className="aspect-square rounded-lg p-3 border transition-all duration-300 backdrop-blur-sm overflow-hidden relative"
                              style={{
                                background: 'linear-gradient(135deg, #374151 0%, transparent 100%)',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                opacity: 1
                              }}
                            >
                              <div className="w-full h-full flex flex-col items-center justify-center text-center relative">
                                <div className="w-20 h-20 md:w-24 md:h-24 relative z-30">
                                  <img
                                    src={getRandomIcon(categoryIndex, 1)}
                                    alt="Coming Soon"
                                    className="w-full h-full object-contain opacity-100"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-4xl">${category === 'attack' ? '⚔️' : category === 'defense' ? '🛡️' : category === 'utility' ? '🔧' : '💫'}</div>`;
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 flex items-center justify-center py-2 z-20">
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
        </div>
      </motion.div>

      {/* Mobile Available Abilities by Category - Separate for mobile */}
      <div className="block md:hidden space-y-1 -mt-1">
        <div>
          {categoryGroups.map(({ category, categoryInfo, abilities }, categoryIndex) => {
            const userCategoryAbilities = abilities.filter(ability => 
              userAbilities.some(ua => ua.abilityId === ability.id)
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
                          className="aspect-square rounded-lg p-3 border transition-all duration-300 backdrop-blur-sm overflow-hidden"
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
                          className="aspect-square rounded-lg p-3 border transition-all duration-300 backdrop-blur-sm overflow-hidden relative"
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
                          className="aspect-square rounded-lg p-3 border transition-all duration-300 backdrop-blur-sm overflow-hidden relative"
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
    </div>
  );
}
