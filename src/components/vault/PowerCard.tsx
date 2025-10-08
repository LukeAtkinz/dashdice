'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ability, UserAbility, UserLoadout, ABILITY_CATEGORIES } from '@/types/abilities';
import { CATEGORY_COLORS, RARITY_COLORS } from '@/data/predefinedAbilities';
import { CATEGORY_ICONS, RARITY_BACKGROUNDS } from '@/data/categoryIcons';
import { useAbilities } from '@/context/AbilitiesContext';

interface PowerCardProps {
  ability: Ability;
  userAbility?: UserAbility;
  isUnlocked: boolean;
  activeLoadout: UserLoadout | null;
}

export default function PowerCard({ 
  ability, 
  userAbility, 
  isUnlocked,
  activeLoadout
}: PowerCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { validateLoadout, setActiveLoadout } = useAbilities();
  const [isEquipping, setIsEquipping] = useState(false);

  const categoryInfo = ABILITY_CATEGORIES[ability.category];
  const categoryColors = CATEGORY_COLORS[ability.category];
  const rarityColors = RARITY_COLORS[ability.rarity];

  const isEquipped = activeLoadout?.abilities[ability.category] === ability.id;
  const canEquip = isUnlocked && !isEquipped;

  const getUnlockRequirement = () => {
    if (isUnlocked) return null;
    return `Unlocks at Level ${ability.unlockLevel}`;
  };

  const handleEquip = async () => {
    if (!canEquip || !activeLoadout) return;
    
    setIsEquipping(true);
    try {
      // Create new abilities object with this ability equipped
      const newAbilities = {
        ...activeLoadout.abilities,
        [ability.category]: ability.id
      };

      // Validate the loadout
      const validation = await validateLoadout(newAbilities);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Update the active loadout (this should trigger a save)
      // For now, we'll just log it - actual implementation would update via context
      console.log('Equipping ability:', ability.name, 'in category:', ability.category);
      
    } catch (error) {
      console.error('Error equipping ability:', error);
    } finally {
      setIsEquipping(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-xl p-6 transition-all duration-300 ${
        !isUnlocked ? 'opacity-60' : 'hover:scale-105 hover:shadow-xl'
      }`}
      style={{
        border: '2px solid rgba(255, 255, 255, 0.3)',
        background: `linear-gradient(135deg, ${rarityColors.background} 0%, transparent 100%)`,
        backdropFilter: 'blur(6px)',
        boxShadow: isUnlocked ? `0 4px 15px ${rarityColors.background}40` : undefined
      }}
    >
      {/* Lock Overlay for Locked Abilities */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-4xl mb-2">🔒</div>
            <p className="text-yellow-400 text-sm font-semibold">
              {getUnlockRequirement()}
            </p>
          </div>
        </div>
      )}

      {/* Equipped Badge */}
      {isEquipped && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold z-20">
          EQUIPPED
        </div>
      )}

      {/* Rarity Badge */}
      <div className="absolute top-2 left-2">
        <span 
          className={`px-2 py-1 rounded-full text-xs font-bold uppercase text-white`}
          style={{ backgroundColor: rarityColors.border }}
        >
          {ability.rarity}
        </span>
      </div>

      {/* Category Icon */}
      <div className="absolute top-2 right-12">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ backgroundColor: categoryColors.primary }}
        >
          {categoryInfo.icon}
        </div>
      </div>

      <div className="mt-12">
        {/* Ability Name */}
        <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Audiowide' }}>
          {ability.name}
        </h3>

        {/* Hidden Indicator */}
        {ability.hidden !== false && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400">🔒</span>
            <span className="text-xs text-yellow-400 font-medium">Hidden by default</span>
          </div>
        )}

        {/* Costs */}
        <div className="flex items-center gap-4 mb-3">
          {/* Star Cost */}
          <div className="flex items-center gap-1">
            <div className="flex text-yellow-400">
              {'★'.repeat(ability.starCost)}
              {'☆'.repeat(5 - ability.starCost)}
            </div>
            <span className="text-xs text-gray-400">({ability.starCost})</span>
          </div>
          
          {/* Aura Cost */}
          <div className="flex items-center gap-1">
            <span className="text-purple-400">🔮</span>
            <span className="text-purple-400 font-semibold">{ability.auraCost}</span>
            <span className="text-xs text-gray-400">aura</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-3" style={{ fontFamily: 'Montserrat' }}>
          {ability.description}
        </p>

        {/* Cooldown & Max Uses */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
          <div>Cooldown: {ability.cooldown}s</div>
          {ability.maxUses && <div>Max Uses: {ability.maxUses}</div>}
        </div>

        {/* Usage Stats */}
        {userAbility && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="text-center bg-gray-700/50 rounded p-2">
              <p className="text-lg font-bold text-blue-400">{userAbility.timesUsed}</p>
              <p className="text-xs text-gray-400">Used</p>
            </div>
            <div className="text-center bg-gray-700/50 rounded p-2">
              <p className="text-lg font-bold text-green-400">{userAbility.successRate}%</p>
              <p className="text-xs text-gray-400">Success</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ 
              fontFamily: 'Montserrat',
              background: 'linear-gradient(135deg, #6B7280 0%, transparent 100%)',
              backdropFilter: 'blur(6px)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: '#FFF'
            }}
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
          
          {isUnlocked && (
            <button
              onClick={handleEquip}
              disabled={isEquipping || isEquipped}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{ 
                fontFamily: 'Montserrat',
                background: isEquipped 
                  ? 'linear-gradient(135deg, #22C55E 0%, transparent 100%)'
                  : canEquip
                  ? 'linear-gradient(135deg, #3B82F6 0%, transparent 100%)'
                  : 'linear-gradient(135deg, #6B7280 0%, transparent 100%)',
                backdropFilter: 'blur(6px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                color: isEquipped || canEquip ? '#FFF' : '#9CA3AF',
                boxShadow: isEquipped 
                  ? '0 4px 15px rgba(34, 197, 94, 0.3)'
                  : canEquip
                  ? '0 4px 15px rgba(59, 130, 246, 0.3)'
                  : 'none',
                cursor: isEquipped || !canEquip ? 'default' : 'pointer'
              }}
            >
              {isEquipping ? 'Equipping...' : isEquipped ? 'Equipped' : 'Equip'}
            </button>
          )}
        </div>

        {/* Detailed Info */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-gray-900/80 rounded-lg"
            >
              {ability.longDescription && (
                <p className="text-sm text-gray-300 mb-3" style={{ fontFamily: 'Montserrat' }}>
                  {ability.longDescription}
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Category:</span>
                  <span className="text-white ml-1 capitalize">{ability.category}</span>
                </div>
                <div>
                  <span className="text-gray-400">Unlock:</span>
                  <span className="text-white ml-1">Level {ability.unlockLevel}</span>
                </div>
                {ability.effects.map((effect, index) => (
                  <div key={index} className="col-span-2">
                    <span className="text-gray-400">Effect:</span>
                    <span className="text-white ml-1 capitalize">
                      {effect.type.replace('_', ' ')}
                      {effect.value && ` (${effect.value})`}
                      {effect.duration && ` for ${effect.duration}s`}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}