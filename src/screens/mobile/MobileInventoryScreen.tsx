import React, { useState } from 'react';
import { useMobileInventory } from '../../context/MobileInventoryContext';
import { useMobileNavigation } from '../../context/MobileNavigationContext';
import { useBackground } from '@/context/BackgroundContext';

interface InventoryItem {
  id: number;
  name: string;
  preview: string;
  rarity: string;
  background?: any;
}

const inventoryCategories = [
  { key: 'backgrounds', name: 'Backgrounds', icon: '🖼️', color: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { key: 'dice', name: 'Dice Sets', icon: '🎲', color: 'linear-gradient(135deg, #FF0080, #FF4DB8)' },
  { key: 'avatars', name: 'Avatars', icon: '👤', color: 'linear-gradient(135deg, #00FF80, #00A855)' },
  { key: 'effects', name: 'Effects', icon: '✨', color: 'linear-gradient(135deg, #FFD700, #FFA500)' }
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

export const MobileInventoryScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('backgrounds');
  const [previewBackground, setPreviewBackground] = useState<any>(null);
  const { setCurrentSection } = useMobileNavigation();
  const { 
    availableBackgrounds, 
    DisplayBackgroundEquip, 
    MatchBackgroundEquip,
    setDisplayBackgroundEquip,
    setMatchBackgroundEquip
  } = useBackground();

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

  const getEquipButtonStyle = (isEquipped: boolean, type: 'display' | 'match') => {
    if (type === 'display') {
      return {
        background: isEquipped 
          ? "linear-gradient(135deg, #00FF80, #00A855)" 
          : "linear-gradient(135deg, #667eea, #764ba2)",
        color: "#FFF",
        fontFamily: "Audiowide",
        textTransform: "uppercase" as const,
      };
    } else {
      return {
        background: isEquipped 
          ? "linear-gradient(135deg, #FFD700, #FFA500)" 
          : "linear-gradient(135deg, #FF0080, #FF4DB8)",
        color: "#FFF",
        fontFamily: "Audiowide",
        textTransform: "uppercase" as const,
      };
    }
  };

  const handleBackToDashboard = () => {
    setCurrentSection('dashboard');
  };

  return (
    <div className="mobile-inventory-screen w-full h-full min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800">
        <button
          onClick={handleBackToDashboard}
          className="text-blue-400 text-lg font-semibold"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold">Inventory</h1>
        <div className="w-16"></div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto p-4 space-x-2">
        {inventoryCategories.map((category) => (
          <button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={`flex items-center justify-center px-4 py-3 rounded-xl min-w-[120px] text-sm font-bold transition-all ${
              selectedCategory === category.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
            style={selectedCategory === category.key ? { background: category.color } : {}}
          >
            <span className="mr-2 text-lg">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4">
          {getCurrentItems().map((item: InventoryItem) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-lg p-4 border"
              style={{
                borderColor: rarityColors[item.rarity as keyof typeof rarityColors]
              }}
            >
              {/* Item Preview */}
              <div
                className="w-full h-32 rounded-lg flex items-center justify-center text-4xl mb-3"
                style={{
                  border: `1px solid ${rarityColors[item.rarity as keyof typeof rarityColors]}`
                }}
              >
                {selectedCategory === 'backgrounds' && item.preview.includes('.') ? (
                  item.preview.includes('.mp4') ? (
                    <video 
                      className="w-full h-full object-cover rounded-lg"
                      src={item.preview}
                      loop
                      muted
                      autoPlay
                      playsInline
                      controls={false}
                    />
                  ) : (
                    <img 
                      src={item.preview} 
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )
                ) : (
                  item.preview
                )}
              </div>

              {/* Item Info */}
              <div className="text-center mb-3">
                <h3 className="font-bold text-sm">{item.name}</h3>
                <div
                  className="text-xs font-bold px-2 py-1 rounded mt-1 inline-block"
                  style={{
                    background: rarityColors[item.rarity as keyof typeof rarityColors],
                    color: "#FFF",
                  }}
                >
                  {item.rarity}
                </div>
              </div>

              {/* Action Buttons - Only show for backgrounds */}
              {selectedCategory === 'backgrounds' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleEquipDisplay(item)}
                    className="px-3 py-2 rounded-lg text-xs font-bold w-full"
                    style={getEquipButtonStyle(isEquippedDisplay(item), 'display')}
                  >
                    {isEquippedDisplay(item) ? 'Vibin' : 'Vibin'}
                  </button>
                  <button
                    onClick={() => handleEquipMatch(item)}
                    className="px-3 py-2 rounded-lg text-xs font-bold w-full"
                    style={getEquipButtonStyle(isEquippedMatch(item), 'match')}
                  >
                    {isEquippedMatch(item) ? 'Flexin' : 'Flexin'}
                  </button>
                  <button
                    onClick={() => setPreviewBackground(previewBackground?.id === item.id ? null : item)}
                    className="px-3 py-2 rounded-lg text-xs font-bold w-full bg-gray-600 text-white"
                  >
                    {previewBackground?.id === item.id ? 'Hide' : 'Preview'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Background Preview Modal */}
      {previewBackground && selectedCategory === 'backgrounds' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{previewBackground.name}</h2>
              <button
                onClick={() => setPreviewBackground(null)}
                className="text-gray-400 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-48 rounded-lg overflow-hidden mb-4">
              {previewBackground.preview.includes('.mp4') ? (
                <video 
                  className="w-full h-full object-cover"
                  src={previewBackground.preview}
                  loop
                  muted
                  autoPlay
                  playsInline
                  controls={false}
                />
              ) : (
                <img 
                  src={previewBackground.preview} 
                  alt={previewBackground.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEquipDisplay(previewBackground)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-bold"
                style={getEquipButtonStyle(isEquippedDisplay(previewBackground), 'display')}
              >
                Equip Display
              </button>
              <button
                onClick={() => handleEquipMatch(previewBackground)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-bold"
                style={getEquipButtonStyle(isEquippedMatch(previewBackground), 'match')}
              >
                Equip Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};