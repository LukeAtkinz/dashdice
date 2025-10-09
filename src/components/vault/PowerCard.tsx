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
      onClick={() => setShowDetails(!showDetails)}
      className={`relative cursor-pointer transition-all duration-300 w-full ${
        !isUnlocked ? 'opacity-60' : 'hover:scale-[1.02] hover:shadow-xl'
      }`}
      style={{
        height: '200px', // Fixed height for consistent card layout
        borderRadius: '20px',
        border: showDetails
          ? '2px solid #FF0080'
          : isEquipped 
            ? '2px solid #FFD700' 
            : isUnlocked 
              ? '2px solid rgba(255, 255, 255, 0.3)' 
              : '1px solid rgba(255, 255, 255, 0.1)',
        background: `linear-gradient(135deg, ${rarityColors?.primary || '#6B7280'}40 0%, rgba(0, 0, 0, 0.3) 100%)`,
        marginBottom: '10px',
        overflow: 'hidden'
      }}
    >
      {/* Background Gradient Overlay */}
      <div 
        className="absolute inset-0 z-5" 
        style={{ 
          borderRadius: '20px', 
          background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)' 
        }}
      />

      {/* Lock Overlay for Locked Abilities */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20" style={{ borderRadius: '20px' }}>
          <div className="text-center">
            <div className="text-4xl mb-2">🔒</div>
            <p className="text-yellow-400 text-sm font-semibold" style={{ fontFamily: 'Audiowide' }}>
              {getUnlockRequirement()}
            </p>
          </div>
        </div>
      )}

      {/* Equipped Badge */}
      {isEquipped && (
        <div 
          className="absolute top-3 right-3 px-2 py-1 text-xs font-bold z-20"
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '12px',
            fontFamily: 'Audiowide',
            textTransform: 'uppercase'
          }}
        >
          EQUIPPED
        </div>
      )}

      {/* Rarity Badge */}
      <div className="absolute top-3 left-3 z-20">
        <span 
          className="px-2 py-1 text-xs font-bold uppercase text-white"
          style={{ 
            backgroundColor: rarityColors?.border || '#6B7280',
            borderRadius: '12px',
            fontFamily: 'Audiowide'
          }}
        >
          {ability.rarity}
        </span>
      </div>

      {/* Category Icon */}
      <div className="absolute top-3 right-16 z-20">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-white/30 shadow-lg"
          style={{ 
            backgroundColor: `${categoryColors?.primary || '#6B7280'}20`,
            backdropFilter: 'blur(8px)'
          }}
        >
          <img 
            src={categoryInfo.icon}
            alt={`${categoryInfo.name} category`}
            className="w-6 h-6 object-contain"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
            }}
            onError={(e) => {
              // Fallback to a generic icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '⚡';
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="relative z-10 flex items-center gap-3 flex-1 p-6"
        style={{ height: '100%' }}
      >
        <div className="flex flex-col flex-1" style={{ gap: '4px' }}>
          {/* Ability Name */}
          <h4 
            className="text-lg md:text-xl font-bold text-white mb-1"
            style={{ 
              color: '#E2E2E2', 
              fontFamily: 'Audiowide', 
              fontWeight: 400, 
              textTransform: 'uppercase', 
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' 
            }}
          >
            {ability.name}
          </h4>

          {/* Description */}
          <p 
            className="text-sm text-gray-300 mb-2"
            style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontFamily: 'Montserrat', 
              fontWeight: 400, 
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' 
            }}
          >
            {ability.description}
          </p>

          {/* Costs */}
          <div className="flex items-center gap-4">
            {/* Star Cost */}
            <div className="flex items-center gap-1">
              <div className="flex text-yellow-400 text-sm">
                {'★'.repeat(ability.starCost)}
                {'☆'.repeat(Math.max(0, 3 - ability.starCost))}
              </div>
            </div>
            
            {/* Aura Cost */}
            <div className="flex items-center gap-1">
              <span className="text-purple-400 text-sm">🔮</span>
              <span className="text-purple-400 font-semibold text-sm">{ability.auraCost}</span>
            </div>
          </div>
        </div>

        {/* Equip Button - only show when ability is unlocked, positioned like background cards */}
        {isUnlocked && showDetails && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleEquip(); 
            }} 
            disabled={isEquipping || isEquipped}
            className="transition-all duration-300 hover:scale-105 mt-2" 
            style={{ 
              display: 'flex', 
              width: 'fit-content', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '10px', 
              borderRadius: '18px', 
              background: isEquipped ? '#4CAF50' : 'var(--ui-button-bg)', 
              border: 'none', 
              cursor: isEquipping ? 'wait' : 'pointer',
              padding: '8px 20px',
              height: '44px'
            }}
          >
            <span 
              className="text-sm font-bold"
              style={{ 
                color: 'var(--ui-button-text)', 
                fontFamily: 'Audiowide', 
                fontWeight: 400, 
                textTransform: 'uppercase' 
              }}
            >
              {isEquipping ? 'EQUIPPING...' : isEquipped ? 'EQUIPPED' : 'EQUIP'}
            </span>
          </button>
        )}
      </div>

      {/* Detailed Info - Keep this functionality but move outside main content */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md p-4 z-30"
            style={{ borderRadius: '0 0 20px 20px' }}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}