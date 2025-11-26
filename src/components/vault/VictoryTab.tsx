'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useBackground } from '@/context/BackgroundContext';
import { getVictoryBackgrounds, resolveBackgroundPath } from '@/config/backgrounds';
import { MobileBackgroundPreview } from '@/components/ui/MobileBackgroundPreview';

const rarityColors = {
  COMMON: "#9CA3AF",
  RARE: "#3B82F6",
  EPIC: "#A855F7",
  LEGENDARY: "#F59E0B",
};

export default function VictoryTab() {
  const { VictoryBackgroundEquip, setVictoryBackgroundEquip, user } = useBackground();
  const [previewBackground, setPreviewBackground] = useState<any>(null);

  // Get Victory Screen backgrounds
  const victoryBackgrounds = getVictoryBackgrounds();

  // Convert backgrounds to inventory format with rarity
  const backgroundItems = useMemo(() => {
    return victoryBackgrounds.map((bg) => {
      const resolved = resolveBackgroundPath(bg.id, 'inventory-preview');
      const previewPath = resolved?.path;
      
      return {
        id: bg.id,
        name: bg.name,
        preview: previewPath || '/backgrounds/placeholder.jpg',
        rarity: bg.rarity || 'COMMON',
        background: bg
      };
    });
  }, []);

  const handleEquipVictory = async (item: any) => {
    try {
      const bgToEquip = victoryBackgrounds.find(bg => bg.id === item.id);
      if (bgToEquip) {
        console.log('🏆 Equipping victory background:', bgToEquip);
        await setVictoryBackgroundEquip(bgToEquip);
        console.log('✅ Victory Background Equipped:', bgToEquip);
      }
    } catch (error) {
      console.error('❌ Error equipping victory background:', error);
    }
  };

  const isEquippedVictory = (item: any) => {
    return VictoryBackgroundEquip?.id === item.id;
  };

  const getEquipButtonStyle = (isEquipped: boolean) => {
    return {
      background: isEquipped
        ? "linear-gradient(135deg, #FFD700, #FFA500)"
        : "linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))",
      color: "#FFF",
      fontFamily: "Audiowide",
      textTransform: "uppercase" as const,
      border: isEquipped ? "2px solid #FFD700" : "2px solid transparent",
    };
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:py-0 md:pt-6 h-full md:max-h-[700px]">
        <div className="w-full max-w-[80rem] mx-auto flex flex-row items-start justify-center flex-wrap gap-[2rem] pb-8">
          {backgroundItems.map((item) => (
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
              {/* Background Preview */}
              <div 
                className="w-32 h-32 rounded-[15px] flex items-center justify-center overflow-hidden cursor-pointer"
                style={{
                  border: `1px solid ${rarityColors[item.rarity as keyof typeof rarityColors]}`
                }}
                onClick={() => setPreviewBackground(item)}
              >
                <img 
                  className="w-full h-full object-cover rounded-[15px]"
                  src={item.preview}
                  alt={item.name}
                />
              </div>

              {/* Background Name */}
              <span
                className="text-center font-audiowide uppercase text-white"
                style={{
                  fontSize: "16px",
                  lineHeight: "1.2",
                }}
              >
                {item.name}
              </span>

              {/* Rarity Badge */}
              <div
                className="px-3 py-1 rounded-full text-xs font-audiowide uppercase"
                style={{
                  background: rarityColors[item.rarity as keyof typeof rarityColors],
                  color: "#FFF"
                }}
              >
                {item.rarity}
              </div>

              {/* Equip Button */}
              <button
                onClick={() => handleEquipVictory(item)}
                className="w-full py-2 px-4 rounded-[12px] transition-all duration-200 text-sm"
                style={getEquipButtonStyle(isEquippedVictory(item))}
              >
                {isEquippedVictory(item) ? "✓ Equipped" : "Equip"}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile Preview Modal */}
      {previewBackground && (
        <MobileBackgroundPreview
          background={previewBackground}
          type="dashboard"
          onClose={() => setPreviewBackground(null)}
        />
      )}
    </>
  );
}
