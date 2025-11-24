'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useBackground } from '@/context/BackgroundContext';
import { BackgroundService } from '@/services/backgroundService';
import { resolveBackgroundPath, getFlexinBackgrounds } from '@/config/backgrounds';
import { MobileBackgroundPreview } from '@/components/ui/MobileBackgroundPreview';

const rarityColors = {
  COMMON: "#9CA3AF",
  RARE: "#3B82F6",
  EPIC: "#A855F7",
  LEGENDARY: "#F59E0B",
};

export default function FlexinTab() {
  const { MatchBackgroundEquip, setMatchBackgroundEquip } = useBackground();
  const [previewBackground, setPreviewBackground] = useState<any>(null);

  // Get only Flexin backgrounds (match backgrounds)
  const flexinBackgrounds = useMemo(() => getFlexinBackgrounds(), []);

  // Convert backgrounds to inventory format with rarity
  const backgroundItems = useMemo(() => {
    return flexinBackgrounds.map((bg, index) => {
      const bgConfig = BackgroundService.getBackgroundSafely(bg.id);
      const resolved = resolveBackgroundPath(bg.id, 'inventory-preview');
      const previewPath = resolved?.path;
      
      return {
        id: bg.id,
        name: bg.name,
        preview: previewPath || '/backgrounds/placeholder.jpg',
        rarity: bg.rarity || 'COMMON',
        background: bgConfig
      };
    });
  }, [flexinBackgrounds]);

  const handleEquipMatch = async (item: any) => {
    try {
      const bgToEquip = flexinBackgrounds.find(bg => bg.id === item.id);
      if (bgToEquip) {
        console.log('🎮 Equipping match background:', bgToEquip);
        await setMatchBackgroundEquip(bgToEquip);
        console.log('✅ Match Background Equipped:', bgToEquip);
      }
    } catch (error) {
      console.error('❌ Error equipping match background:', error);
    }
  };

  const isEquippedMatch = (item: any) => {
    return MatchBackgroundEquip?.id === item.id;
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
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="w-full max-w-[80rem] mx-auto flex flex-row items-start justify-center flex-wrap gap-[2rem]">
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
                className="w-32 h-32 rounded-[15px] flex items-center justify-center overflow-hidden"
                style={{
                  border: `1px solid ${rarityColors[item.rarity as keyof typeof rarityColors]}`
                }}
              >
                <img 
                  className="w-full h-full object-cover rounded-[15px]"
                  src={item.preview}
                  alt={item.name}
                />
              </div>

              {/* Background Info */}
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
              <div className="flex flex-col gap-2 mt-auto w-full">
                <motion.button
                  onClick={() => handleEquipMatch(item)}
                  className="px-4 py-2 rounded-[10px] text-sm font-bold w-full"
                  style={getEquipButtonStyle(isEquippedMatch(item))}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isEquippedMatch(item) ? '✓ Equipped' : 'Equip Flexin'}
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
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile Background Preview Modal */}
      {previewBackground && (
        <MobileBackgroundPreview
          background={previewBackground}
          type="match"
          onClose={() => setPreviewBackground(null)}
        />
      )}
    </>
  );
}
