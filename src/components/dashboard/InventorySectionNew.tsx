'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInventory } from '@/context/InventoryContext';
import { useNavigation } from '@/context/NavigationContext';
import VaultTabs from '@/components/vault/VaultTabs';

const inventoryCategories = [
  { key: 'dice', name: 'Dice Sets', icon: '🎲', color: 'linear-gradient(135deg, #FF0080, #FF4DB8)' },
  { key: 'avatars', name: 'Avatars', icon: '👤', color: 'linear-gradient(135deg, #00FF80, #00A855)' },
  { key: 'effects', name: 'Effects', icon: '✨', color: 'linear-gradient(135deg, #FFD700, #FFA500)' },
  { key: 'vault', name: 'Vault', icon: '🔮', color: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }
];

const mockItems = {
  dice: [
    { id: 1, name: 'Golden Dice', preview: '🎯', rarity: 'masterpiece' },
    { id: 2, name: 'Crystal Dice', preview: '💎', rarity: 'epic' },
    { id: 3, name: 'Fire Dice', preview: '🔥', rarity: 'rare' },
    { id: 4, name: 'Basic Dice', preview: '⚪', rarity: 'common' }
  ],
  avatars: [
    { id: 1, name: 'Warrior', preview: '⚔️', rarity: 'epic' },
    { id: 2, name: 'Mage', preview: '🔮', rarity: 'rare' },
    { id: 3, name: 'Rogue', preview: '🗡️', rarity: 'rare' },
    { id: 4, name: 'Default', preview: '👤', rarity: 'common' }
  ],
  effects: [
    { id: 1, name: 'Lightning', preview: '⚡', rarity: 'masterpiece' },
    { id: 2, name: 'Sparkles', preview: '✨', rarity: 'epic' },
    { id: 3, name: 'Smoke', preview: '💨', rarity: 'rare' },
    { id: 4, name: 'Basic', preview: '○', rarity: 'common' }
  ]
};

const rarityColors = {
  common: '#8B8B8B',
  rare: '#4A90E2',
  epic: '#9B59B6',
  masterpiece: '#F39C12'
};

export const InventorySection: React.FC = () => {
  const { setCurrentSection, sectionParams } = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('vault');
  const [vaultTab, setVaultTab] = useState<'power' | 'vibin' | 'flexin' | 'decider' | 'victory'>(
    sectionParams.vaultTab || 'power'
  );

  // Sync vault tab with navigation params
  React.useEffect(() => {
    if (sectionParams.vaultTab) {
      setVaultTab(sectionParams.vaultTab);
      // If navigating to vault with a specific tab, switch to vault category
      if (selectedCategory !== 'vault') {
        setSelectedCategory('vault');
      }
    }
  }, [sectionParams.vaultTab]);

  // Get current items based on category (only for dice/avatars/effects)
  const getCurrentItems = () => {
    return mockItems[selectedCategory as keyof typeof mockItems] || [];
  };

  return (
    <>
      {/* CSS Animations for Tab Buttons */}
      <style jsx>{`
        @keyframes borderLoad {
          0% {
            background: linear-gradient(90deg, 
              #FFD700 0%, 
              #FFD700 0%, 
              transparent 0%, 
              transparent 100%);
          }
          100% {
            background: linear-gradient(90deg, 
              #FFD700 0%, 
              #FFD700 100%, 
              transparent 100%, 
              transparent 100%);
          }
        }
        
        @keyframes borderLoadComplete {
          0% {
            border-color: transparent;
          }
          100% {
            border-color: #FFD700;
          }
        }
        
        .tab-button {
          position: relative;
          border: 2px solid transparent;
          transition: all 0.3s ease;
          background: transparent !important;
          font-size: 0.875rem; /* Smaller text like friends */
          padding: 0.5rem 1rem; /* Smaller padding */
          min-height: 2.5rem; /* Smaller height */
        }
        
        .tab-button::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(90deg, transparent 0%, transparent 100%);
          border-radius: inherit;
          z-index: -1;
          transition: all 0.3s ease;
        }
        
        .tab-button:hover::before {
          animation: borderLoad 0.8s ease-in-out forwards;
        }
        
        .tab-button.active {
          border-color: #FFD700;
          box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
          background: transparent !important;
        }
        
        .tab-button.active::before {
          background: linear-gradient(90deg, #FFD700 0%, #FFD700 100%);
        }
        
        /* Disable all scrolling */
        .scrollbar-hide {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
          overflow: hidden !important; /* Force hidden overflow */
          touch-action: none; /* Disable touch scrolling */
          -webkit-overflow-scrolling: none; /* Disable iOS momentum scrolling */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        
        /* Prevent any scrolling on the inventory container */
        .inventory-container {
          overflow: hidden !important;
          touch-action: none !important;
          -webkit-overflow-scrolling: none !important;
          overscroll-behavior: none !important;
        }
      `}</style>
      
      <div className="inventory-container w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] min-h-full overflow-hidden">{/* Disable scrolling completely */}
      {/* Header */}
      <div className="text-center mb-8 flex-shrink-0">
        {/* Desktop Title */}
        <h1 
          className="hidden md:block text-5xl font-bold text-white mb-4"
          style={{
            fontFamily: "Audiowide",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
          }}
        >
          Inventory
        </h1>
        
        {/* Mobile Title - Show VAULT title */}
        <div className="block md:hidden mb-4">
          <h1 
            className="text-3xl font-bold text-white mb-4"
            style={{
              fontFamily: "Audiowide",
              textTransform: "uppercase",
              textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
            }}
          >
            VAULT
          </h1>

        </div>
        
        <p 
          className="text-xl text-white/80"
          style={{
            fontFamily: "Montserrat",
          }}
        >
          Manage your collection
        </p>
      </div>

      {/* Category Navigation */}
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8 flex-shrink-0" style={{ marginTop: '-0.5rem' }}>
        {inventoryCategories.map((category) => (
          <motion.button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={`tab-button flex flex-col items-center justify-center gap-2 p-2 md:p-3 rounded-[15px] transition-all duration-300 h-10 md:h-12 px-3 md:px-4 min-w-[100px] md:min-w-[120px] ${selectedCategory === category.key ? 'active' : ''}`}
            style={{
              background: 'transparent',
              boxShadow: selectedCategory === category.key
                ? "0 4px 15px rgba(255, 255, 255, 0.2)" 
                : "0 2px 8px rgba(0, 0, 0, 0.2)",
              minWidth: "140px",
              minHeight: "100px",
              border: 'transparent'
            }}
          >
            <div className="text-sm md:text-lg mb-1">{category.icon}</div>
            <span
              style={{
                color: "#FFF",
                fontFamily: "Audiowide",
                fontSize: "10px",
                fontWeight: 400,
                textTransform: "uppercase",
              }}
            >
              {category.name}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Vault Tabs - Show when vault category is selected */}
      {selectedCategory === 'vault' && (
        <VaultTabs 
          initialTab={vaultTab}
          onTabChange={(tab) => setVaultTab(tab)}
        />
      )}

      {/* Items Grid - Show for other categories */}
      {selectedCategory !== 'vault' && (
        <div className="w-full max-w-[80rem] flex flex-row items-start justify-center flex-wrap gap-[2rem] flex-1 overflow-hidden px-4">{/* Disable scrolling on items grid */}
          {getCurrentItems().map((item) => (
          <motion.div
            key={item.id}
            className="flex flex-col items-center justify-start gap-4 p-6 rounded-[20px] transition-all duration-300"
            style={{
              background: "linear-gradient(rgba(37, 37, 37, 0.12), rgba(37, 37, 37, 0.12)), linear-gradient(242.59deg, #192e39 30%, rgba(153, 153, 153, 0))",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
              minWidth: "200px",
              minHeight: "320px",
              border: `2px solid ${rarityColors[item.rarity as keyof typeof rarityColors]}`
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: `0 8px 25px ${rarityColors[item.rarity as keyof typeof rarityColors]}40`
            }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Item Preview */}
            <div 
              className="w-32 h-32 rounded-[15px] flex items-center justify-center text-6xl"
              style={{
                border: `1px solid ${rarityColors[item.rarity as keyof typeof rarityColors]}`
              }}
            >
              {item.preview}
            </div>

            {/* Item Info */}
            <div className="text-center">
              <h3
                className="text-white font-bold mb-2"
                style={{
                  fontFamily: "Audiowide",
                  fontSize: "18px",
                  textTransform: "uppercase",
                }}
              >
                {item.name}
              </h3>
              <div
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: rarityColors[item.rarity as keyof typeof rarityColors],
                  color: "#FFF",
                  fontFamily: "Montserrat",
                  textTransform: "uppercase",
                }}
              >
                {item.rarity}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto">
              <motion.button
                className="px-4 py-2 rounded-[10px] text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #00FF80, #00A855)",
                  color: "#FFF",
                  fontFamily: "Audiowide",
                  textTransform: "uppercase",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Equip
              </motion.button>
              <motion.button
                className="px-4 py-2 rounded-[10px] text-sm font-bold"
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#FFF",
                  fontFamily: "Audiowide",
                  textTransform: "uppercase",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Details
              </motion.button>
            </div>
          </motion.div>
        ))}
        </div>
      )}

      {/* Back Button */}
      <motion.button
        onClick={() => setCurrentSection('dashboard')}
        className="mt-8 flex items-center justify-center gap-2 px-8 py-4 rounded-[20px] transition-all duration-300 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #192E39, #667eea)",
          boxShadow: "0 4px 15px rgba(25, 46, 57, 0.3)",
        }}
        whileHover={{ 
          scale: 1.05,
          boxShadow: "0 6px 20px rgba(25, 46, 57, 0.4)" 
        }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-2xl">←</span>
        <span
          style={{
            color: "#FFF",
            fontFamily: "Audiowide",
            fontSize: "18px",
            fontWeight: 400,
            textTransform: "uppercase",
          }}
        >
          Back to Dashboard
        </span>
      </motion.button>
    </div>
    </>
  );
};
