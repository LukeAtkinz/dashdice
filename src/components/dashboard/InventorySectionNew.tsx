'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInventory } from '@/context/InventoryContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';
import { MobileBackgroundPreview } from '@/components/ui/MobileBackgroundPreview';
import PowerTab from '@/components/vault/PowerTab';

const inventoryCategories = [
  { key: 'backgrounds', name: 'Backgrounds', icon: '🖼️', color: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { key: 'dice', name: 'Dice Sets', icon: '🎲', color: 'linear-gradient(135deg, #FF0080, #FF4DB8)' },
  { key: 'avatars', name: 'Avatars', icon: '👤', color: 'linear-gradient(135deg, #00FF80, #00A855)' },
  { key: 'effects', name: 'Effects', icon: '✨', color: 'linear-gradient(135deg, #FFD700, #FFA500)' },
  { key: 'power', name: 'Power', icon: '🔮', color: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }
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
  const [selectedCategory, setSelectedCategory] = useState('backgrounds');
  const [previewBackground, setPreviewBackground] = useState<any>(null);
  const [previewDisplayBackground, setPreviewDisplayBackground] = useState<any>(null);
  const { setCurrentSection } = useNavigation();
  const { 
    availableBackgrounds, 
    DisplayBackgroundEquip, 
    MatchBackgroundEquip,
    setDisplayBackgroundEquip,
    setMatchBackgroundEquip
  } = useBackground();

  // Get background-specific styling for navigation buttons
  const getNavButtonStyle = (category: any, isSelected: boolean) => {
    if (DisplayBackgroundEquip?.name === 'On A Mission') {
      return {
        background: 'transparent',
        boxShadow: isSelected 
          ? "0 4px 15px rgba(14, 165, 233, 0.4)" 
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        minWidth: "140px",
        minHeight: "100px",
        border: 'transparent',
        backdropFilter: 'blur(6px)'
      };
    }
    
    return {
      background: 'transparent',
      boxShadow: isSelected 
        ? "0 4px 15px rgba(255, 255, 255, 0.2)" 
        : "0 2px 8px rgba(0, 0, 0, 0.2)",
      minWidth: "140px",
      minHeight: "100px",
      border: 'transparent'
    };
  };

  // Get background-specific styling for equip buttons
  const getEquipButtonStyle = (isEquipped: boolean, buttonType: 'display' | 'match') => {
    // Default styling for all backgrounds
    if (buttonType === 'display') {
      return {
        background: isEquipped 
          ? "linear-gradient(135deg, #FFD700, #FFA500)" 
          : "linear-gradient(135deg, #00FF80, #00A855)",
        color: "#FFF !important",
        fontFamily: "Audiowide",
        textTransform: "uppercase" as const,
      };
    } else {
      return {
        background: isEquipped 
          ? "linear-gradient(135deg, #FFD700, #FFA500)" 
          : "linear-gradient(135deg, #FF0080, #FF4DB8)",
        color: "#FFF !important",
        fontFamily: "Audiowide",
        textTransform: "uppercase" as const,
      };
    }
  };

  const handleBackToDashboard = () => {
    setCurrentSection('dashboard');
  };

  // Convert backgrounds to inventory format with rarity
  const backgroundItems = availableBackgrounds.map((bg, index) => ({
    id: index + 1,
    name: bg.name,
    preview: bg.file,
    rarity: index === 0 ? 'epic' : index === 1 ? 'rare' : index === 2 ? 'common' : 'masterpiece',
    background: bg
  }));

  // Get current items based on category
  const getCurrentItems = () => {
    if (selectedCategory === 'backgrounds') {
      return backgroundItems;
    }
    return mockItems[selectedCategory as keyof typeof mockItems] || [];
  };

  const handleEquipDisplay = (item: any) => {
    console.log('🎯 Equipping Display Background:', item);
    if (selectedCategory === 'backgrounds' && item.background) {
      setDisplayBackgroundEquip(item.background);
      console.log('✅ Display Background Equipped:', item.background);
    }
  };

  const handleEquipMatch = (item: any) => {
    console.log('🎯 Equipping Match Background:', item);
    if (selectedCategory === 'backgrounds' && item.background) {
      setMatchBackgroundEquip(item.background);
      console.log('✅ Match Background Equipped:', item.background);
    }
  };

  const isEquippedDisplay = (item: any) => {
    return selectedCategory === 'backgrounds' && 
           DisplayBackgroundEquip?.file === item.background?.file;
  };

  const isEquippedMatch = (item: any) => {
    return selectedCategory === 'backgrounds' && 
           MatchBackgroundEquip?.file === item.background?.file;
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
          
          {(previewBackground || previewDisplayBackground) ? (
            <div className="space-y-2">
              <h1 
                className="text-xl font-bold text-white"
                style={{
                  fontFamily: "Audiowide",
                  textTransform: "uppercase",
                  textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
                }}
              >
                {previewBackground ? `Match Preview` : 
                 previewDisplayBackground ? `Dashboard Preview` : ''}
              </h1>
              <p className="text-sm text-white/70" style={{ fontFamily: "Montserrat" }}>
                {previewBackground ? previewBackground.name : 
                 previewDisplayBackground ? previewDisplayBackground.name : ''}
              </p>
            </div>
          ) : null}
        </div>
        
        <p 
          className="text-xl text-white/80"
          style={{
            fontFamily: "Montserrat",
          }}
        >
          {previewBackground ? 'See how this background looks in matches' : 
           previewDisplayBackground ? 'See how this background looks on dashboard' : 
           'Manage your collection'}
        </p>
      </div>

      {/* Category Navigation */}
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8 flex-shrink-0" style={{ marginTop: '-0.5rem' }}>
        {inventoryCategories.map((category) => (
          <motion.button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={`tab-button flex flex-col items-center justify-center gap-2 p-2 md:p-3 rounded-[15px] transition-all duration-300 h-10 md:h-12 px-3 md:px-4 min-w-[100px] md:min-w-[120px] ${selectedCategory === category.key ? 'active' : ''}`}
            style={getNavButtonStyle(category, selectedCategory === category.key)}
          >
            <div className="text-sm md:text-lg mb-1">{category.icon}</div>
            <span
              style={{
                color: DisplayBackgroundEquip?.name === 'On A Mission' ? "#FFF" : "#FFF",
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

      {/* Match UI Preview - Only show for backgrounds and when preview is active */}
      {selectedCategory === 'backgrounds' && previewBackground && (
        <MobileBackgroundPreview
          background={previewBackground}
          type="match"
          onClose={() => setPreviewBackground(null)}
        />
      )}

      {/* Dashboard Preview - Only show for backgrounds and when display preview is active */}
      {selectedCategory === 'backgrounds' && previewDisplayBackground && (
        <MobileBackgroundPreview
          background={previewDisplayBackground}
          type="dashboard"
          onClose={() => setPreviewDisplayBackground(null)}
        />
      )}

      {/* Power Tab - Show when power category is selected */}
      {selectedCategory === 'power' && (
        <PowerTab />
      )}

      {/* Items Grid - Show for other categories */}
      {selectedCategory !== 'power' && (
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
              {selectedCategory === 'backgrounds' && item.preview.includes('.') ? (
                item.preview.includes('.mp4') ? (
                  <video 
                    className="w-full h-full object-cover rounded-[15px] scrollbar-hide"
                    src={item.preview}
                    loop
                    muted
                    autoPlay
                    playsInline
                    controls={false}
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    x5-video-player-type="h5"
                    x5-video-player-fullscreen="false"
                    preload="metadata"
                    style={{
                      /* Ensure no scrollbars appear on background videos */
                      overflow: 'hidden'
                    }}
                    onLoadStart={(e) => {
                      // Force autoplay on mobile
                      if (typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        e.currentTarget.play().catch(err => console.log('Inventory video autoplay failed:', err));
                      }
                    }}
                  />
                ) : (
                  <img 
                    className="w-full h-full object-cover rounded-[15px] scrollbar-hide"
                    src={item.preview}
                    alt={item.name}
                    style={{
                      /* Ensure no scrollbars appear on background images */
                      overflow: 'hidden'
                    }}
                  />
                )
              ) : (
                item.preview
              )}
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

            {/* Action Buttons - Only show for backgrounds */}
            {selectedCategory === 'backgrounds' ? (
              <div className="flex flex-col gap-2 mt-auto w-full">
                <motion.button
                  onClick={() => handleEquipDisplay(item)}
                  className="px-4 py-2 rounded-[10px] text-sm font-bold w-full"
                  style={getEquipButtonStyle(isEquippedDisplay(item), 'display')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isEquippedDisplay(item) ? '✓ Vibin' : 'Vibin'}
                </motion.button>
                <motion.button
                  onClick={() => handleEquipMatch(item)}
                  className="px-4 py-2 rounded-[10px] text-sm font-bold w-full"
                  style={getEquipButtonStyle(isEquippedMatch(item), 'match')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isEquippedMatch(item) ? '✓ Flexin' : 'Flexin'}
                </motion.button>
                <motion.button
                  onClick={() => setPreviewBackground(previewBackground?.id === item.id ? null : item)}
                  className="px-4 py-2 rounded-[10px] text-sm font-bold w-full"
                  style={{
                    background: previewBackground?.id === item.id
                      ? "linear-gradient(135deg, #FFD700, #FFA500)"
                      : "linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))",
                    color: "#FFF",
                    fontFamily: "Audiowide",
                    textTransform: "uppercase",
                    border: previewBackground?.id === item.id 
                      ? "2px solid #FFD700" 
                      : "2px solid transparent",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {previewBackground?.id === item.id ? 'Hide Preview' : 'Preview Match'}
                </motion.button>
                <motion.button
                  onClick={() => setPreviewDisplayBackground(previewDisplayBackground?.id === item.id ? null : item)}
                  className="px-4 py-2 rounded-[10px] text-sm font-bold w-full"
                  style={{
                    background: previewDisplayBackground?.id === item.id
                      ? "linear-gradient(135deg, #00FF80, #00A855)"
                      : "linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))",
                    color: "#FFF",
                    fontFamily: "Audiowide",
                    textTransform: "uppercase",
                    border: previewDisplayBackground?.id === item.id 
                      ? "2px solid #00FF80" 
                      : "2px solid transparent",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {previewDisplayBackground?.id === item.id ? 'Hide Dashboard' : 'Preview Dashboard'}
                </motion.button>
              </div>
            ) : (
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
            )}
          </motion.div>
        ))}
        </div>
      )}

      {/* Back Button */}
      <motion.button
        onClick={handleBackToDashboard}
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
