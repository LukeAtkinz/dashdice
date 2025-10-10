'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAbilities } from '@/context/AbilitiesContext';
import { MatchData } from '@/types/match';
import { Ability, ABILITY_CATEGORIES } from '@/types/abilities';
import { CATEGORY_COLORS } from '@/data/predefinedAbilities';

interface AbilitiesPanelProps {
  matchData: MatchData;
  onAbilityUsed: (effect: any) => void;
  isPlayerTurn: boolean;
  playerId: string;
}

export default function AbilitiesPanel({ 
  matchData, 
  onAbilityUsed, 
  isPlayerTurn,
  playerId
}: AbilitiesPanelProps) {
  const { 
    allAbilities, 
    useAbility, 
    canUseAbilityInMatch
  } = useAbilities();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [cooldowns, setCooldowns] = useState<{ [key: string]: number }>({});
  const [isUsing, setIsUsing] = useState<string | null>(null);

  // Get player's power loadout from match metadata
  const playerPowerLoadout = (matchData.gameData as any).powerLoadouts?.[playerId] || 
                           (matchData.hostData.playerId === playerId ? (matchData.hostData as any).powerLoadout : (matchData.opponentData as any)?.powerLoadout) ||
                           null;

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

  if (!playerPowerLoadout) {
    return (
      <div className="fixed bottom-4 left-4 bg-gray-800/90 rounded-lg p-4 border border-gray-600 backdrop-blur-sm">
        <div className="text-center text-gray-400">
          <div className="text-2xl mb-2">🔮</div>
          <p className="text-sm">No power loadout</p>
        </div>
      </div>
    );
  }

  const equippedAbilities = Object.entries(playerPowerLoadout.abilities || {})
    .filter(([_, abilityId]) => abilityId)
    .map(([category, abilityId]) => {
      const ability = allAbilities.find(a => a.id === abilityId);
      return ability ? { category: category as keyof typeof ABILITY_CATEGORIES, ability } : null;
    })
    .filter(Boolean) as Array<{ category: keyof typeof ABILITY_CATEGORIES; ability: Ability }>;

  const handleAbilityClick = async (ability: Ability) => {
    if (!isPlayerTurn || isUsing) return;
    
    const cooldown = cooldowns[ability.id] || 0;
    if (cooldown > 0) return;
    
    const usageCount = usageCounts[ability.id] || 0;
    if (ability.maxUses && usageCount >= ability.maxUses) return;

    const canUse = canUseAbilityInMatch(ability.id, playerAura);
    if (!canUse.canUse) return;

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

  return (
    <div 
      className={`fixed bottom-4 left-4 rounded-xl shadow-xl transition-all duration-300 ${
        isExpanded ? 'w-96' : 'w-16'
      }`}
      style={{
        background: 'linear-gradient(135deg, #1F2937 0%, transparent 100%)',
        backdropFilter: 'blur(6px)',
        border: '2px solid rgba(255, 255, 255, 0.3)'
      }}
    >
      {/* Aura Display & Toggle Button */}
      <div
        className="p-4 cursor-pointer hover:bg-white/10 rounded-xl transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 text-lg">🔮</span>
              <span className="text-purple-400 font-bold" style={{ fontFamily: 'Audiowide' }}>{playerAura}</span>
              <span className="text-gray-300 text-sm" style={{ fontFamily: 'Montserrat' }}>aura</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm" style={{ fontFamily: 'Audiowide' }}>ABILITIES</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-purple-400 text-lg">🔮</span>
            <span className="text-purple-400 text-xs font-bold" style={{ fontFamily: 'Audiowide' }}>{playerAura}</span>
          </div>
        )}
      </div>

      {/* Abilities List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 space-y-3 max-h-64 overflow-y-auto"
          >
            {equippedAbilities.map(({ category, ability }) => {
              const status = getAbilityStatus(ability);
              const categoryColors = CATEGORY_COLORS[category];
              const categoryInfo = ABILITY_CATEGORIES[category];
              
              return (
                <motion.button
                  key={ability.id}
                  onClick={() => handleAbilityClick(ability)}
                  disabled={status.disabled || isUsing === ability.id}
                  className={`w-full p-4 rounded-xl transition-all text-left ${
                    status.disabled || isUsing === ability.id
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:scale-105 active:scale-95'
                  }`}
                  style={{
                    background: status.disabled 
                      ? 'linear-gradient(135deg, #6B7280 0%, transparent 100%)'
                      : `linear-gradient(135deg, ${categoryColors.primary} 0%, transparent 100%)`,
                    backdropFilter: 'blur(6px)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: !status.disabled ? `0 4px 15px ${categoryColors.primary}40` : 'none'
                  }}
                  whileHover={!status.disabled ? { y: -2 } : {}}
                  whileTap={!status.disabled ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                        style={{ backgroundColor: categoryColors.primary }}
                      >
                        {categoryInfo.icon}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm" style={{ fontFamily: 'Audiowide' }}>
                          {ability.name}
                        </div>
                        <div className="text-xs text-gray-300" style={{ fontFamily: 'Montserrat' }}>
                          {ability.description}
                        </div>
                      </div>
                    </div>
                    
                    {status.disabled && (
                      <div className="text-xs text-red-400 font-bold">
                        {status.reason}
                      </div>
                    )}
                    
                    {isUsing === ability.id && (
                      <div className="text-xs text-blue-400 font-bold animate-pulse">
                        Using...
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">{'★'.repeat(ability.starCost)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">🔮</span>
                        <span className={`font-medium ${
                          playerAura >= ability.auraCost ? 'text-purple-400' : 'text-red-400'
                        }`}>
                          {ability.auraCost}
                        </span>
                      </div>
                      {ability.maxUses && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">
                            {(usageCounts[ability.id] || 0)}/{ability.maxUses}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      playerAura >= ability.auraCost && !status.disabled
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {playerAura >= ability.auraCost && !status.disabled ? 'READY' : 'LOCKED'}
                    </div>
                  </div>
                </motion.button>
              );
            })}
            
            {equippedAbilities.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                <p className="text-sm">No abilities equipped</p>
                <p className="text-xs mt-1">Configure loadout in Vault → Power</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}