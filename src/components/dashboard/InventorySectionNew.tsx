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
  const { setCurrentSection } = useNavigation();
  const { 
    availableBackgrounds, 
    DisplayBackgroundEquip, 
    MatchBackgroundEquip,
    setDisplayBackgroundEquip,
    setMatchBackgroundEquip
  } = useBackground();

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
    <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 
          className="text-5xl font-bold text-white mb-4"
          style={{
            fontFamily: "Orbitron",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
          }}
        >
          Inventory
        </h1>
        <p 
          className="text-xl text-white/80"
          style={{
            fontFamily: "Orbitron",
          }}
        >
          Manage your collection
        </p>
      </div>

      {/* Category Navigation */}
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8">
        {inventoryCategories.map((category) => (
          <motion.button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] transition-all duration-300"
            style={{
              background: selectedCategory === category.key ? category.color : 'rgba(255, 255, 255, 0.1)',
              boxShadow: selectedCategory === category.key 
                ? "0 4px 15px rgba(255, 255, 255, 0.2)" 
                : "0 2px 8px rgba(0, 0, 0, 0.2)",
              minWidth: "140px",
              minHeight: "100px",
              border: selectedCategory === category.key ? '2px solid #FFD700' : '2px solid transparent'
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 6px 20px rgba(255, 255, 255, 0.3)" 
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-3xl mb-2">{category.icon}</div>
            <span
              style={{
                color: "#FFF",
                fontFamily: "Orbitron",
                fontSize: "14px",
                fontWeight: 400,
                textTransform: "uppercase",
              }}
            >
              {category.name}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="w-full max-w-[80rem] flex flex-row items-start justify-center flex-wrap gap-[2rem]">
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
                background: "rgba(255, 255, 255, 0.1)",
                border: `1px solid ${rarityColors[item.rarity as keyof typeof rarityColors]}`
              }}
            >
              {selectedCategory === 'backgrounds' && item.preview.includes('.') ? (
                item.preview.includes('.mp4') ? (
                  <video 
                    className="w-full h-full object-cover rounded-[15px]"
                    src={item.preview}
                    loop
                    muted
                    autoPlay
                  />
                ) : (
                  <img 
                    className="w-full h-full object-cover rounded-[15px]"
                    src={item.preview}
                    alt={item.name}
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
                  fontFamily: "Orbitron",
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
                  fontFamily: "Orbitron",
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
                  style={{
                    background: isEquippedDisplay(item) 
                      ? "linear-gradient(135deg, #FFD700, #FFA500)" 
                      : "linear-gradient(135deg, #00FF80, #00A855)",
                    color: "#FFF",
                    fontFamily: "Orbitron",
                    textTransform: "uppercase",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isEquippedDisplay(item) ? 'Equipped Display' : 'Equip Display'}
                </motion.button>
                <motion.button
                  onClick={() => handleEquipMatch(item)}
                  className="px-4 py-2 rounded-[10px] text-sm font-bold w-full"
                  style={{
                    background: isEquippedMatch(item) 
                      ? "linear-gradient(135deg, #FFD700, #FFA500)" 
                      : "linear-gradient(135deg, #FF0080, #FF4DB8)",
                    color: "#FFF",
                    fontFamily: "Orbitron",
                    textTransform: "uppercase",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isEquippedMatch(item) ? 'Equipped Match' : 'Equip Match'}
                </motion.button>
              </div>
            ) : (
              <div className="flex gap-2 mt-auto">
                <motion.button
                  className="px-4 py-2 rounded-[10px] text-sm font-bold"
                  style={{
                    background: "linear-gradient(135deg, #00FF80, #00A855)",
                    color: "#FFF",
                    fontFamily: "Orbitron",
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
                    fontFamily: "Orbitron",
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
        className="mt-8 flex items-center justify-center gap-2 px-8 py-4 rounded-[20px] transition-all duration-300"
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
            fontFamily: "Orbitron",
            fontSize: "18px",
            fontWeight: 400,
            textTransform: "uppercase",
          }}
        >
          Back to Dashboard
        </span>
      </motion.button>
    </div>
  );
};
