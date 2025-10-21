'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAbilities } from '@/context/AbilitiesContext';
import { MatchData } from '@/types/match';
import { Ability, ABILITY_CATEGORIES } from '@/types/abilities';
import { CATEGORY_COLORS } from '@/data/predefinedAbilities';

interface InlineAbilitiesDisplayProps {
  matchData: MatchData;
  onAbilityUsed: (effect: any) => void;
  isPlayerTurn: boolean;
  playerId: string;
  className?: string;
}

export default function InlineAbilitiesDisplay({ 
  matchData, 
  onAbilityUsed, 
  isPlayerTurn,
  playerId,
  className = ''
}: InlineAbilitiesDisplayProps) {
  const { 
    allAbilities, 
    useAbility, 
    canUseAbilityInMatch
  } = useAbilities();
  
  const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});
  const [isUsing, setIsUsing] = useState<string | null>(null);
  const [activatingAbility, setActivatingAbility] = useState<string | null>(null);
  const [siphonActive, setSiphonActive] = useState<boolean>(false);

  // Get player's power loadout from match metadata
  const playerPowerLoadout = (matchData.gameData as any).powerLoadouts?.[playerId] || 
                           (matchData.hostData.playerId === playerId ? (matchData.hostData as any).powerLoadout : (matchData.opponentData as any)?.powerLoadout) ||
                           null;

  // Get ability cooldowns from match data
  const serverCooldowns = matchData.gameData.abilityCooldowns?.[playerId] || {};
  
  // Get ability usage counts from match data
  const usageCounts = matchData.gameData.abilityUsageCounts?.[playerId] || {};

  // Reset siphon active state when opponent banks (siphon gets consumed)
  useEffect(() => {
    // Check if siphon was active but now opponent has banked (turn changed)
    if (siphonActive && isPlayerTurn) {
      setSiphonActive(false);
      console.log('🔮 Siphon consumed - resetting active state');
      
      // Mark siphon as used by incrementing usage count locally
      // This will disable it for the rest of the match
      const currentUsage = usageCounts['siphon'] || 0;
      if (currentUsage === 0) {
        // Would normally update server, but for now just log
        console.log('🔮 Siphon marked as used for this match');
      }
    }
  }, [isPlayerTurn, siphonActive, usageCounts]);

  // Update local cooldowns based on server data
  useEffect(() => {
    const now = Date.now();
    const newCooldowns: { [key: string]: number } = {};
    
    Object.entries(serverCooldowns).forEach(([abilityId, expiry]) => {
      if (expiry && typeof expiry === 'object' && 'toMillis' in expiry) {
        const expiryTime = expiry.toMillis();
        const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));
        if (remaining > 0) {
          newCooldowns[abilityId] = remaining;
        }
      }
    });
    
    setCooldowns(newCooldowns);
  }, [serverCooldowns]);

  // Countdown cooldowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(updated).forEach(abilityId => {
          if (updated[abilityId] > 0) {
            updated[abilityId] -= 1;
            hasChanges = true;
            if (updated[abilityId] <= 0) {
              delete updated[abilityId];
            }
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!playerPowerLoadout || Object.keys(playerPowerLoadout).length === 0) {
    // Show 5 empty slots with enhanced carousel-style loading animation
    return (
      <div className={`flex justify-center gap-2 md:gap-3 ${className}`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div
            key={`empty-${index}`}
            className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-gray-600/50 bg-gray-800/30 backdrop-blur-sm flex items-center justify-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1],
              delay: index * 0.1 // Staggered carousel effect
            }}
            whileHover={{ 
              scale: 1.05,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              transition: { duration: 0.2 }
            }}
          >
            {/* Animated background shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "linear"
              }}
            />
            <motion.div 
              className="text-gray-500 text-lg md:text-xl relative z-10"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.3
              }}
            >
              +
            </motion.div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Get equipped abilities (max 5 slots)
  // PowerLoadout structure: { tactical?: string, attack?: string, defense?: string, utility?: string, gamechanger?: string }
  const equippedAbilities = Object.entries(playerPowerLoadout || {})
    .filter(([_, abilityId]) => abilityId)
    .map(([category, abilityId]) => {
      const ability = allAbilities.find(a => a.id === abilityId);
      return ability ? { category: category as keyof typeof ABILITY_CATEGORIES, ability } : null;
    })
    .filter(Boolean) as Array<{ category: keyof typeof ABILITY_CATEGORIES; ability: Ability }>;

  const handleAbilityClick = async (ability: Ability) => {
    console.log(`🎯 ABILITY CLICKED: ${ability.id}`, {
      isUsing,
      isPlayerTurn,
      timing: ability.timing,
      usageCount: usageCounts[ability.id] || 0
    });

    if (isUsing) return;
    
    // Check timing constraints properly
    if (ability.timing === 'opponent_turn') {
      // Siphon and other opponent_turn abilities should only work during opponent's turn
      if (isPlayerTurn) return;
    } else {
      // Normal abilities require player turn
      if (!isPlayerTurn) return;
    }
    
    const cooldown = cooldowns[ability.id] || 0;
    if (cooldown > 0) return;
    
    const usageCount = usageCounts[ability.id] || 0;
    // Simple once per match limit
    if (usageCount >= 1) return;

    // Trigger visual activation animation
    setActivatingAbility(ability.id);
    setTimeout(() => setActivatingAbility(null), 800); // Reset after animation

    setIsUsing(ability.id);
    
    try {
      console.log('🎯 Calling useAbility for:', ability.id);
      const result = await useAbility(ability.id, matchData.id || 'unknown', {
        round: 1, // This should come from match state
        userScore: getCurrentPlayer()?.playerScore || 0,
        opponentScore: getOpponent()?.playerScore || 0,
        diceValues: [matchData.gameData.diceOne, matchData.gameData.diceTwo],
        playerAura: 0 // No longer using aura system
      });
      
      console.log('🎯 useAbility result:', result);
      
      if (result.success) {
        console.log('🎯 Calling onAbilityUsed with effect:', result.effect);
        onAbilityUsed(result.effect);
        
        // Set siphon as active if it's the siphon ability
        if (ability.id === 'siphon') {
          setSiphonActive(true);
          console.log('⚔️ Siphon activated - waiting for opponent to bank...');
        }
        
        // Set cooldown locally for immediate feedback
        setCooldowns(prev => ({
          ...prev,
          [ability.id]: ability.cooldown
        }));
      } else {
        console.log('❌ useAbility failed:', result);
      }
    } catch (error) {
      console.error('Error using ability:', error);
    } finally {
      setIsUsing(null);
    }
  };

  const getCurrentPlayer = () => {
    return matchData.hostData.playerId === playerId ? matchData.hostData : matchData.opponentData;
  };

  const getOpponent = () => {
    return matchData.hostData.playerId === playerId ? matchData.opponentData : matchData.hostData;
  };

  const getAbilityStatus = (ability: Ability) => {
    const cooldown = cooldowns[ability.id] || 0;
    const usageCount = usageCounts[ability.id] || 0;
    
    // Simple system: each ability can be used once per match
    if (usageCount >= 1) {
      return { disabled: true, reason: 'Used' };
    }
    
    // Special handling for siphon - if it's active, it's been used this match
    if (ability.id === 'siphon' && siphonActive) {
      return { disabled: true, reason: 'Active' };
    }
    
    if (cooldown > 0) return { disabled: true, reason: `${cooldown}s` };
    
    // Special timing check for Siphon (opponent_turn timing)
    if (ability.timing === 'opponent_turn') {
      if (isPlayerTurn) return { disabled: true, reason: 'Opponent turn only' };
    } else {
      // Normal abilities require player turn
      if (!isPlayerTurn) return { disabled: true, reason: 'Wait' };
    }
    
    return { disabled: false, reason: '' };
  };

  // Always show exactly 5 slots
  const displaySlots = Array.from({ length: 5 }, (_, index) => {
    const equippedAbility = equippedAbilities[index];
    return equippedAbility || null;
  });

  return (
    <motion.div 
      className={`flex gap-3 md:gap-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        staggerChildren: 0.1
      }}
    >
      {displaySlots.map((equippedAbility, index) => {
        if (!equippedAbility) {
          // Enhanced empty slot with carousel-style animation
          return (
            <motion.div
              key={`slot-${index}`}
              className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 border-gray-600/50 bg-gray-800/30 backdrop-blur-sm flex items-center justify-center relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1],
                delay: index * 0.1
              }}
              whileHover={{ 
                scale: 1.05,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                transition: { duration: 0.2 }
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.5,
                  ease: "linear"
                }}
              />
              <motion.div 
                className="text-gray-500 text-xl md:text-2xl relative z-10"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.7, 0.5]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: index * 0.2
                }}
              >
                +
              </motion.div>
            </motion.div>
          );
        }

        const { category, ability } = equippedAbility;
        const status = getAbilityStatus(ability);
        const categoryColors = CATEGORY_COLORS[category];
        const categoryInfo = ABILITY_CATEGORIES[category];

        // Check if ability can be used right now (for visual active state)
        const canUseRightNow = !status.disabled && (
          (ability.timing === 'opponent_turn' && !isPlayerTurn) ||
          (ability.timing !== 'opponent_turn' && isPlayerTurn)
        );

        // Special handling for siphon
        const isSiphon = ability.id === 'siphon';
        const siphonCanUse = isSiphon && canUseRightNow && !siphonActive;
        const siphonIsActive = isSiphon && siphonActive;

        // For disabled state, we should disable the button if:
        // 1. It's on cooldown, maxed out, or used
        // 2. OR if it's the wrong turn for this ability type  
        // 3. OR if it's siphon and already active
        const shouldDisable = status.disabled || isUsing === ability.id || !canUseRightNow || siphonIsActive;

        return (
          <motion.button
            key={ability.id}
            onClick={() => handleAbilityClick(ability)}
            disabled={shouldDisable}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 backdrop-blur-sm transition-all relative overflow-hidden ${
              shouldDisable
                ? 'opacity-50 cursor-not-allowed' 
                : siphonCanUse
                  ? 'hover:scale-105 active:scale-95 hover:border-white/60 cursor-pointer' 
                  : 'hover:scale-105 active:scale-95 hover:border-white/60 cursor-pointer'
            }`}
            style={{
              background: 'transparent', // Transparent background as requested
              borderColor: shouldDisable 
                ? '#6B7280' 
                : siphonIsActive 
                  ? '#FFD700' // Gold border only when siphon is active
                  : categoryColors.primary, // Normal border when available
              boxShadow: !shouldDisable ? 
                siphonIsActive
                  ? '0 2px 15px #FFD70060, 0 0 20px #FFD70030' // Gold glow only when active
                  : `0 2px 10px ${categoryColors.primary}40`
                : 'none'
            }}
            initial={{ opacity: 0, scale: 0.8, y: 20, rotateY: -15 }}
            animate={{ 
              opacity: 1, 
              scale: activatingAbility === ability.id ? [1, 1.15, 1] : 1, 
              y: activatingAbility === ability.id ? [0, -8, 0] : siphonIsActive ? -8 : 0, // Move up when siphon is active
              rotateY: 0 
            }}
            transition={{ 
              duration: activatingAbility === ability.id ? 0.8 : 0.3, 
              ease: [0.4, 0, 0.2, 1],
              delay: activatingAbility === ability.id ? 0 : index * 0.1
            }}
            whileHover={!shouldDisable ? { 
              y: siphonIsActive ? -10 : -2, // Higher when siphon is active
              scale: 1.05,
              boxShadow: siphonIsActive
                ? '0 4px 25px #FFD70080, 0 0 30px #FFD70050' // Gold glow only when active
                : `0 4px 20px ${categoryColors.primary}60`,
              transition: { duration: 0.2 }
            } : {}}
            whileTap={!shouldDisable ? { 
              scale: 0.95,
              y: siphonIsActive ? -8 : 0
            } : {}}
          >
            {/* Ability Icon */}
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={ability.iconUrl || categoryInfo.icon}
                alt={ability.name}
                className="w-8 h-8 md:w-8 md:h-8 object-contain"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // If primary icon fails and we haven't tried category icon yet
                  if (target.src !== categoryInfo.icon) {
                    console.log(`⚠️ Failed to load ability icon: ${target.src}, falling back to category icon: ${categoryInfo.icon}`);
                    target.src = categoryInfo.icon;
                  } else {
                    // If category icon also fails, show emoji
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="text-2xl md:text-3xl">❓</div>`;
                    }
                  }
                }}
              />
            </div>

            {/* Cooldown Overlay */}
            {cooldowns[ability.id] && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-sm md:text-base font-bold">
                  {cooldowns[ability.id]}s
                </span>
              </div>
            )}

            {/* Using Indicator */}
            {isUsing === ability.id && (
              <div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              </div>
            )}

            {/* Siphon Active Indicator */}
            {isSiphon && siphonActive && (
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs rounded-bl px-1 font-bold">
                ACTIVE
              </div>
            )}

            {/* Used Indicator */}
            {(usageCounts[ability.id] || 0) >= 1 && (
              <div className="absolute bottom-0 right-0 bg-gray-600 text-white text-xs rounded-tl px-1">
                USED
              </div>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}