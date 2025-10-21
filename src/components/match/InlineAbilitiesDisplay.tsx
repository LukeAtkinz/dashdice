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

  // Get player's power loadout from match metadata
  const playerPowerLoadout = (matchData.gameData as any).powerLoadouts?.[playerId] || 
                           (matchData.hostData.playerId === playerId ? (matchData.hostData as any).powerLoadout : (matchData.opponentData as any)?.powerLoadout) ||
                           null;

  // DEBUG: Log powerLoadout loading (run only once to prevent infinite loops)
  useEffect(() => {
    console.log('🔮 InlineAbilitiesDisplay DEBUG:', {
      playerId,
      isHost: matchData.hostData.playerId === playerId,
      gameDataPowerLoadouts: (matchData.gameData as any).powerLoadouts,
      gameDataPlayerLoadout: (matchData.gameData as any).powerLoadouts?.[playerId],
      hostDataPowerLoadout: (matchData.hostData as any).powerLoadout,
      opponentDataPowerLoadout: (matchData.opponentData as any)?.powerLoadout,
      finalPlayerPowerLoadout: playerPowerLoadout,
      allAbilitiesCount: allAbilities.length
    });
    
    // 🔍 ENHANCED DEBUG: Check if siphon is specifically available
    const siphonAbility = allAbilities.find(a => a.id === 'siphon');
    if (siphonAbility) {
      console.log('🧛 SIPHON DEBUG:', {
        siphonFound: true,
        siphonDetails: siphonAbility,
        siphonIconUrl: siphonAbility.iconUrl,
        isInPlayerLoadout: playerPowerLoadout && Object.values(playerPowerLoadout).includes('siphon'),
        playerLoadoutValues: playerPowerLoadout ? Object.values(playerPowerLoadout) : null,
        playerLoadoutEntries: playerPowerLoadout ? Object.entries(playerPowerLoadout) : null
      });
    } else {
      console.log('❌ SIPHON DEBUG: Siphon ability not found in allAbilities array');
    }
  }, [playerId, allAbilities, playerPowerLoadout]); // Add dependencies to track changes

  // Get player's current aura from match data
  const playerAura = matchData.gameData.playerAura?.[playerId] || 0;

  // Get ability cooldowns from match data
  const serverCooldowns = matchData.gameData.abilityCooldowns?.[playerId] || {};
  
  // Get ability usage counts from match data
  const usageCounts = matchData.gameData.abilityUsageCounts?.[playerId] || {};

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
    console.log('🎯 ABILITY CLICK ATTEMPT:', {
      abilityId: ability.id,
      isUsing,
      isPlayerTurn,
      abilityTiming: ability.timing,
      playerAura,
      auraCost: ability.auraCost
    });
    
    if (isUsing) {
      console.log('❌ Click blocked: Already using an ability');
      return;
    }
    
    // Check timing constraints properly
    if (ability.timing === 'opponent_turn') {
      // Siphon and other opponent_turn abilities should only work during opponent's turn
      if (isPlayerTurn) {
        console.log('❌ Click blocked: Opponent-turn ability used during player turn');
        return;
      }
    } else {
      // Normal abilities require player turn
      if (!isPlayerTurn) {
        console.log('❌ Click blocked: Player-turn ability used during opponent turn');
        return;
      }
    }
    
    const cooldown = cooldowns[ability.id] || 0;
    if (cooldown > 0) {
      console.log('❌ Click blocked: Ability on cooldown', cooldown);
      return;
    }
    
    const usageCount = usageCounts[ability.id] || 0;
    if (ability.maxUses && usageCount >= ability.maxUses) {
      console.log('❌ Click blocked: Max uses reached', usageCount, ability.maxUses);
      return;
    }

    const canUse = canUseAbilityInMatch(ability.id, playerAura);
    if (!canUse.canUse) {
      console.log('❌ Click blocked: canUseAbilityInMatch failed', canUse.reason);
      return;
    }
    
    console.log('✅ All checks passed, using ability:', ability.id);

    // Trigger visual activation animation
    setActivatingAbility(ability.id);
    setTimeout(() => setActivatingAbility(null), 800); // Reset after animation

    setIsUsing(ability.id);
    
    try {
      const result = await useAbility(ability.id, matchData.id || 'unknown', {
        round: 1, // This should come from match state
        userScore: getCurrentPlayer()?.playerScore || 0,
        opponentScore: getOpponent()?.playerScore || 0,
        diceValues: [matchData.gameData.diceOne, matchData.gameData.diceTwo],
        playerAura
      });
      
      if (result.success) {
        onAbilityUsed(result.effect);
        
        // Set cooldown locally for immediate feedback
        setCooldowns(prev => ({
          ...prev,
          [ability.id]: ability.cooldown
        }));
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
    const canUse = canUseAbilityInMatch(ability.id, playerAura);
    
    if (cooldown > 0) return { disabled: true, reason: `${cooldown}s` };
    if (ability.maxUses && usageCount >= ability.maxUses) {
      return { disabled: true, reason: `${usageCount}/${ability.maxUses}` };
    }
    if (!canUse.canUse) return { disabled: true, reason: canUse.reason || 'Cannot use' };
    
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
        
        // Debug siphon specifically
        if (ability.id === 'siphon') {
          console.log('🔍 SIPHON STATUS DEBUG:', {
            abilityId: ability.id,
            isPlayerTurn: isPlayerTurn,
            timing: ability.timing,
            status: status,
            playerAura: playerAura,
            cooldowns: cooldowns[ability.id],
            usageCounts: usageCounts[ability.id]
          });
        }

        // Check if ability can be used right now (for visual active state)
        const canUseRightNow = !status.disabled && (
          (ability.timing === 'opponent_turn' && !isPlayerTurn) ||
          (ability.timing !== 'opponent_turn' && isPlayerTurn)
        );

        return (
          <motion.button
            key={ability.id}
            onClick={() => handleAbilityClick(ability)}
            disabled={status.disabled || isUsing === ability.id}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 backdrop-blur-sm transition-all relative overflow-hidden ${
              status.disabled || isUsing === ability.id
                ? 'opacity-50 cursor-not-allowed' 
                : canUseRightNow 
                  ? 'hover:scale-105 active:scale-95 hover:border-white/60 ring-2 ring-green-400/50' 
                  : 'hover:scale-105 active:scale-95 hover:border-white/60'
            }`}
            style={{
              background: status.disabled 
                ? 'linear-gradient(135deg, #6B7280 0%, #374151 100%)'
                : canUseRightNow
                  ? `linear-gradient(135deg, ${categoryColors.primary}CC 0%, ${categoryColors.secondary}80 100%)`
                  : `linear-gradient(135deg, ${categoryColors.primary}80 0%, ${categoryColors.secondary}40 100%)`,
              borderColor: status.disabled ? '#6B7280' : canUseRightNow ? '#10B981' : categoryColors.primary,
              boxShadow: !status.disabled ? 
                canUseRightNow 
                  ? `0 2px 15px ${categoryColors.primary}60, 0 0 20px #10B98130` 
                  : `0 2px 10px ${categoryColors.primary}40`
                : 'none'
            }}
            initial={{ opacity: 0, scale: 0.8, y: 20, rotateY: -15 }}
            animate={{ 
              opacity: 1, 
              scale: activatingAbility === ability.id ? [1, 1.15, 1] : canUseRightNow ? [1, 1.02, 1] : 1, 
              y: activatingAbility === ability.id ? [0, -8, 0] : 0, 
              rotateY: 0 
            }}
            transition={{ 
              duration: activatingAbility === ability.id ? 0.8 : canUseRightNow ? 2 : 0.5, 
              ease: activatingAbility === ability.id ? [0.4, 0, 0.2, 1] : [0.4, 0, 0.2, 1],
              delay: activatingAbility === ability.id ? 0 : index * 0.1,
              times: activatingAbility === ability.id ? [0, 0.4, 1] : undefined,
              repeat: canUseRightNow && activatingAbility !== ability.id ? Infinity : 0
            }}
            whileHover={!status.disabled ? { 
              y: -2, 
              scale: 1.05,
              boxShadow: canUseRightNow 
                ? `0 4px 25px ${categoryColors.primary}80, 0 0 30px #10B98150`
                : `0 4px 20px ${categoryColors.primary}60`,
              transition: { duration: 0.2 }
            } : {}}
            whileTap={!status.disabled ? { 
              scale: 0.95,
              y: 0
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

            {/* Aura Cost Indicator */}
            {!status.disabled && playerAura < ability.auraCost && (
              <div className="absolute bottom-0 right-0 bg-red-600 text-white text-xs rounded-tl px-1">
                {ability.auraCost}
              </div>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}