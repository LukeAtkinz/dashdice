'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInventory } from '@/context/InventoryContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';

const inventoryCategories = [
  { key: 'backgrounds', name: 'Backgrounds', icon: '🖼️', color: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { key: 'dice', name: 'Dice Sets', icon: '🎲', color: 'linear-gradient(135deg, #FF0080, #FF4DB8)' },
  { key: 'avatars', name: 'Avatars', icon: '👤', color: 'linear-gradient(135deg, #00FF80, #00A855)' },
  { key: 'effects', name: 'Effects', icon: '✨', color: 'linear-gradient(135deg, #FFD700, #FFA500)' }
];

const mockItems = {
  dice: [
    { id: 1, name: 'Golden Dice', preview: '🎯', rarity: 'legendary' },
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
    { id: 1, name: 'Lightning', preview: '⚡', rarity: 'legendary' },
    { id: 2, name: 'Sparkles', preview: '✨', rarity: 'epic' },
    { id: 3, name: 'Smoke', preview: '💨', rarity: 'rare' },
    { id: 4, name: 'Basic', preview: '○', rarity: 'common' }
  ]
};

const rarityColors = {
  common: '#8B8B8B',
  rare: '#4A90E2',
  epic: '#9B59B6',
  legendary: '#F39C12'
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
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(14, 165, 233, 0.4) 50%, rgba(14, 165, 233, 0.2) 100%)'
          : 'linear-gradient(135deg, rgba(14, 165, 233, 0.6) 0%, rgba(14, 165, 233, 0.3) 50%, rgba(14, 165, 233, 0.1) 100%)',
        boxShadow: isSelected 
          ? "0 4px 15px rgba(14, 165, 233, 0.4)" 
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        minWidth: "140px",
        minHeight: "100px",
        border: isSelected ? '2px solid rgba(14, 165, 233, 0.6)' : '2px solid transparent',
        backdropFilter: 'blur(6px)'
      };
    }
    
    return {
      background: isSelected ? category.color : 'rgba(255, 255, 255, 0.1)',
      boxShadow: isSelected 
        ? "0 4px 15px rgba(255, 255, 255, 0.2)" 
        : "0 2px 8px rgba(0, 0, 0, 0.2)",
      minWidth: "140px",
      minHeight: "100px",
      border: isSelected ? '2px solid #FFD700' : '2px solid transparent'
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
    rarity: index === 0 ? 'epic' : index === 1 ? 'rare' : index === 2 ? 'common' : 'legendary',
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
    if (selectedCategory === 'backgrounds' && item.background) {
      setDisplayBackgroundEquip(item.background);
    }
  };

  const handleEquipMatch = (item: any) => {
    if (selectedCategory === 'backgrounds' && item.background) {
      setMatchBackgroundEquip(item.background);
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
        }
        
        .tab-button.active::before {
          background: linear-gradient(90deg, #FFD700 0%, #FFD700 100%);
        }
      `}</style>
      
      <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] min-h-full overflow-hidden">{/* Disabled scrolling on main container */}
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
        
        {/* Mobile Title - Hide and show previews instead */}
        <div className="block md:hidden mb-4">
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
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8 flex-shrink-0">
        {inventoryCategories.map((category) => (
          <motion.button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={`tab-button flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] transition-all duration-300 h-12 md:h-16 px-4 md:px-6 min-w-[120px] md:min-w-[140px] ${selectedCategory === category.key ? 'active' : ''}`}
            style={getNavButtonStyle(category, selectedCategory === category.key)}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 6px 20px rgba(255, 255, 255, 0.3)" 
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-lg md:text-xl mb-1">{category.icon}</div>
            <span
              style={{
                color: DisplayBackgroundEquip?.name === 'On A Mission' ? "#FFF" : "#FFF",
                fontFamily: "Audiowide",
                fontSize: "12px",
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-[50rem] mb-6 p-2 md:p-4 rounded-[15px] md:rounded-[20px] bg-black/30 backdrop-blur-md border border-white/20"
        >
          <div className="text-center mb-2 md:mb-4 hidden md:block">
            <h3 className="text-xl font-bold text-white/90" style={{ fontFamily: "Audiowide" }}>
              Match Preview: {previewBackground.name}
            </h3>
          </div>
          
          {/* Mini Match UI - Mobile optimized */}
          <div 
            className="relative w-full h-[120px] md:h-[200px] rounded-[10px] md:rounded-[15px] overflow-hidden border border-white/30 md:border-2"
            style={{
              backgroundImage: previewBackground.preview.includes('.') 
                ? `url(${previewBackground.preview})`
                : 'none',
              backgroundColor: !previewBackground.preview.includes('.') 
                ? previewBackground.preview 
                : 'transparent',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay game elements - Mobile optimized */}
            <div className="absolute inset-0 bg-black/20">
              {/* Player areas */}
              <div className="absolute top-1 md:top-4 left-1 md:left-4 bg-black/50 rounded p-1 md:p-2 backdrop-blur-sm">
                <div className="text-white text-xs md:text-sm font-bold">You</div>
                <div className="text-white/70 text-xs">HP: 100</div>
              </div>
              <div className="absolute top-1 md:top-4 right-1 md:right-4 bg-black/50 rounded p-1 md:p-2 backdrop-blur-sm">
                <div className="text-white text-xs md:text-sm font-bold">Opponent</div>
                <div className="text-white/70 text-xs">HP: 100</div>
              </div>
              
              {/* Dice area */}
              <div className="absolute bottom-1 md:bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 rounded p-1 md:p-3 backdrop-blur-sm">
                <div className="flex gap-1 md:gap-2">
                  <div className="w-4 md:w-8 h-4 md:h-8 bg-white/20 rounded border border-white/40 md:border-2 flex items-center justify-center text-white font-bold text-xs md:text-base">🎲</div>
                  <div className="w-4 md:w-8 h-4 md:h-8 bg-white/20 rounded border border-white/40 md:border-2 flex items-center justify-center text-white font-bold text-xs md:text-base">🎲</div>
                </div>
              </div>
              
              {/* Action button */}
              <div className="absolute bottom-1 md:bottom-4 right-1 md:right-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded px-2 md:px-4 py-1 md:py-2">
                <span className="text-white font-bold text-xs md:text-sm">ROLL</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-1 md:mt-3">
            <button
              onClick={() => setPreviewBackground(null)}
              className="px-2 md:px-4 py-1 md:py-2 bg-white/20 rounded text-white/80 hover:bg-white/30 transition-all text-xs md:text-sm"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}

      {/* Dashboard Preview - Only show for backgrounds and when display preview is active */}
      {selectedCategory === 'backgrounds' && previewDisplayBackground && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-[50rem] mb-6 p-2 md:p-4 rounded-[15px] md:rounded-[20px] bg-black/30 backdrop-blur-md border border-white/20"
        >
          <div className="text-center mb-2 md:mb-4 hidden md:block">
            <h3 className="text-xl font-bold text-white/90" style={{ fontFamily: "Audiowide" }}>
              Dashboard Preview: {previewDisplayBackground.name}
            </h3>
          </div>
          
          {/* Mini Dashboard UI - Mobile optimized */}
          <div 
            className="relative w-full h-[120px] md:h-[200px] rounded-[10px] md:rounded-[15px] overflow-hidden border border-white/30 md:border-2"
            style={{
              backgroundImage: previewDisplayBackground.preview.includes('.') 
                ? `url(${previewDisplayBackground.preview})`
                : 'none',
              backgroundColor: !previewDisplayBackground.preview.includes('.') 
                ? previewDisplayBackground.preview 
                : 'transparent',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay dashboard elements - Mobile optimized */}
            <div className="absolute inset-0 bg-black/20">
              {/* Navigation bar */}
              <div className="absolute top-1 md:top-4 left-1 md:left-4 right-1 md:right-4 bg-black/50 rounded p-1 md:p-2 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <div className="text-white text-xs md:text-sm font-bold">DashDice</div>
                  <div className="text-white/70 text-xs">Profile</div>
                </div>
              </div>
              
              {/* Main dashboard cards */}
              <div className="absolute bottom-1 md:bottom-4 left-1 md:left-4 right-1 md:right-4 grid grid-cols-3 gap-1 md:gap-2">
                <div className="bg-black/50 rounded p-1 md:p-2 backdrop-blur-sm">
                  <div className="text-white text-xs font-bold">Inventory</div>
                </div>
                <div className="bg-black/50 rounded p-1 md:p-2 backdrop-blur-sm">
                  <div className="text-white text-xs font-bold">Friends</div>
                </div>
                <div className="bg-black/50 rounded p-1 md:p-2 backdrop-blur-sm">
                  <div className="text-white text-xs font-bold">Ranked</div>
                </div>
              </div>
              
              {/* Center action */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-600 rounded px-2 md:px-4 py-1 md:py-2">
                <span className="text-white font-bold text-xs md:text-sm">PLAY</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-1 md:mt-3">
            <button
              onClick={() => setPreviewDisplayBackground(null)}
              className="px-2 md:px-4 py-1 md:py-2 bg-white/20 rounded text-white/80 hover:bg-white/30 transition-all text-xs md:text-sm"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}

      {/* Items Grid */}
      <div className="w-full max-w-[80rem] flex flex-row items-start justify-center flex-wrap gap-[2rem] flex-1 overflow-y-auto px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
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
                  {isEquippedDisplay(item) ? 'Vibin' : 'Vibin'}
                </motion.button>
                <motion.button
                  onClick={() => handleEquipMatch(item)}
                  className="px-4 py-2 rounded-[10px] text-sm font-bold w-full"
                  style={getEquipButtonStyle(isEquippedMatch(item), 'match')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isEquippedMatch(item) ? 'Flexin' : 'Flexin'}
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
