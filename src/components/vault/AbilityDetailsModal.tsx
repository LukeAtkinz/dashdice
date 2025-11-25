'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Ability } from '@/types/abilities';

interface AbilityDetailsModalProps {
  ability: Ability;
  isOpen: boolean;
  onClose: () => void;
}

export const AbilityDetailsModal: React.FC<AbilityDetailsModalProps> = ({
  ability,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div
              className="bg-gray-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Header with Icon and Name */}
              <div className="flex flex-col items-center p-6 border-b border-white/10">
                {/* Ability Icon */}
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center border-2 shadow-2xl mb-4"
                  style={{
                    borderColor: ability.rarity === 'legendary' ? '#FFD700' :
                                ability.rarity === 'epic' ? '#9333EA' :
                                ability.rarity === 'rare' ? '#3B82F6' : '#6B7280',
                    background: `linear-gradient(135deg, ${
                      ability.rarity === 'legendary' ? '#FFD700' :
                      ability.rarity === 'epic' ? '#9333EA' :
                      ability.rarity === 'rare' ? '#3B82F6' : '#6B7280'
                    }20, transparent)`
                  }}
                >
                  <img
                    src={ability.iconUrl || '/Abilities/placeholder.webp'}
                    alt={ability.name}
                    className="w-20 h-20 object-contain"
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))'
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="text-6xl">${
                          ability.category === 'tactical' ? '🎯' :
                          ability.category === 'attack' ? '⚔️' :
                          ability.category === 'defense' ? '🛡️' :
                          ability.category === 'utility' ? '🔧' : '💫'
                        }</div>`;
                      }
                    }}
                  />
                </div>

                {/* Ability Name */}
                <h2
                  className="text-2xl md:text-3xl font-bold text-white text-center uppercase mb-2"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  {ability.name}
                </h2>

                {/* Tagline/Short Description */}
                <p
                  className="text-sm md:text-base text-gray-300 text-center italic"
                  style={{ fontFamily: 'Montserrat' }}
                >
                  {ability.description}
                </p>
              </div>

              {/* Ability Details */}
              <div className="p-6 space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Category */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                    <div className="text-xs text-gray-400 uppercase mb-1" style={{ fontFamily: 'Montserrat' }}>
                      Category
                    </div>
                    <div className="text-white font-bold capitalize" style={{ fontFamily: 'Audiowide' }}>
                      {ability.category}
                    </div>
                  </div>

                  {/* Rarity */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                    <div className="text-xs text-gray-400 uppercase mb-1" style={{ fontFamily: 'Montserrat' }}>
                      Rarity
                    </div>
                    <div
                      className="font-bold capitalize"
                      style={{
                        fontFamily: 'Audiowide',
                        color: ability.rarity === 'legendary' ? '#FFD700' :
                              ability.rarity === 'epic' ? '#9333EA' :
                              ability.rarity === 'rare' ? '#3B82F6' : '#6B7280'
                      }}
                    >
                      {ability.rarity}
                    </div>
                  </div>

                  {/* Aura Cost */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                    <div className="text-xs text-gray-400 uppercase mb-1" style={{ fontFamily: 'Montserrat' }}>
                      Aura Cost
                    </div>
                    <div className="text-purple-400 font-bold flex items-center gap-2" style={{ fontFamily: 'Audiowide' }}>
                      <img src="/Design Elements/aura.webp" alt="Aura" className="w-5 h-5" />
                      {ability.auraCost}
                    </div>
                  </div>

                  {/* Cooldown */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                    <div className="text-xs text-gray-400 uppercase mb-1" style={{ fontFamily: 'Montserrat' }}>
                      Cooldown
                    </div>
                    <div className="text-blue-400 font-bold" style={{ fontFamily: 'Audiowide' }}>
                      {ability.cooldown}s
                    </div>
                  </div>
                </div>

                {/* Long Description */}
                {ability.longDescription && (
                  <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                    <div className="text-xs text-gray-400 uppercase mb-2" style={{ fontFamily: 'Montserrat' }}>
                      How It Works
                    </div>
                    <p
                      className="text-sm text-gray-200 leading-relaxed"
                      style={{ fontFamily: 'Montserrat' }}
                    >
                      {ability.longDescription}
                    </p>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ fontFamily: 'Audiowide' }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </motion.div>
    </>
  );
};
