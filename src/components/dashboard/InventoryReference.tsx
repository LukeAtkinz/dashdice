'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInventory } from '@/context/InventoryContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';

export const InventorySection: React.FC = () => {
  const { setCurrentSection } = useNavigation();
  const { 
    availableBackgrounds, 
    DisplayBackgroundEquip, 
    MatchBackgroundEquip,
    setDisplayBackgroundEquip,
    setMatchBackgroundEquip
  } = useBackground();

  const [activeTab, setActiveTab] = useState('display'); // 'display' or 'match'
  const [selectedBackground, setSelectedBackground] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Convert backgrounds to inventory format matching reference
  const ownedDisplayBackgrounds = availableBackgrounds.map((bg, index) => ({
    id: index + 1,
    name: bg.name,
    url: bg.file,
    videoUrl: bg.type === 'video' ? bg.file : null,
    isVideo: bg.type === 'video',
    isGradient: false,
    rarity: index === 0 ? 'Epic' : index === 1 ? 'Rare' : index === 2 ? 'Common' : 'Legendary',
    background: bg
  }));

  const ownedMatchBackgrounds = ownedDisplayBackgrounds; // Same backgrounds for both tabs

  const handleBackToDashboard = () => {
    setCurrentSection('dashboard');
  };

  // Set selected background when switching tabs and check equipped state
  useEffect(() => {
    if (activeTab === 'display' && DisplayBackgroundEquip && !selectedBackground) {
      const found = ownedDisplayBackgrounds.find(bg => bg.background.file === DisplayBackgroundEquip.file);
      if (found) setSelectedBackground(found);
    } else if (activeTab === 'match' && MatchBackgroundEquip && !selectedBackground) {
      const found = ownedMatchBackgrounds.find(bg => bg.background.file === MatchBackgroundEquip.file);
      if (found) setSelectedBackground(found);
    }
  }, [activeTab, DisplayBackgroundEquip, MatchBackgroundEquip, selectedBackground]);

  // Check if background is equipped
  const isBackgroundEquipped = (background: any) => {
    if (activeTab === 'display') {
      return DisplayBackgroundEquip && DisplayBackgroundEquip.file === background.background.file;
    } else {
      return MatchBackgroundEquip && MatchBackgroundEquip.file === background.background.file;
    }
  };

  const handleEquipBackground = async (background: any) => {
    console.log('Equip Button Clicked:', { tab: activeTab, background });
    
    if (activeTab === 'display') {
      setDisplayBackgroundEquip(background.background);
      console.log('Equipped Display Background:', background.background);
    } else if (activeTab === 'match') {
      setMatchBackgroundEquip(background.background);
      console.log('Equipped Match Background:', background.background);
    }
  };

  const handleItemSelect = (background: any) => {
    setSelectedBackground(background);
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSelectedBackground(null);
  };

  const getCurrentBackgrounds = () => {
    return activeTab === 'display' ? ownedDisplayBackgrounds : ownedMatchBackgrounds;
  };

  const getEquippedBackground = () => {
    return activeTab === 'display' ? DisplayBackgroundEquip : MatchBackgroundEquip;
  };

  if (loading) {
    return (
      <div 
        className="h-full w-full flex items-center justify-center" 
        style={{ 
          background: 'radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)' 
        }}
      >
        <div className="text-white text-2xl">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Custom scrollbar styles and navigation animations */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(25, 46, 57, 0.4);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #FF0080 0%, #7209B7 100%);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #FF2090 0%, #8219C7 100%);
        }
        .nav-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-button:hover {
          animation: navPulse 0.6s ease-in-out;
          box-shadow: 0 8px 25px rgba(255, 0, 128, 0.3);
          transform: scale(1.05);
        }
        .nav-button:active {
          animation: navClick 0.2s ease-in-out;
          transform: scale(0.95);
        }
        .nav-button.active {
          box-shadow: 0 6px 20px rgba(255, 0, 128, 0.4);
        }
        @keyframes navPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes navClick {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .card-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      {/* Title Section */}
      <div className="w-full flex flex-col items-center justify-center gap-[1rem] py-[0.5rem] md:py-[1rem] pb-[0.5rem] md:pb-[1rem]">
        <h1
          className="text-5xl md:text-7xl leading-12 md:leading-[70px]"
          style={{
            color: "#FFF",
            fontFamily: "Audiowide",
            fontStyle: "normal",
            fontWeight: 400,
            textTransform: "uppercase",
            textAlign: "center",
            margin: 0,
            textShadow: "0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2)"
          }}
        >
          VAULT
        </h1>
      </div>

      {/* Navigation */}
      <div className="w-full px-4 md:px-8 py-2 md:py-4 pb-[0.5rem] md:pb-[1rem]">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          <button
            onClick={() => handleTabChange('display')}
            className={`nav-button ${activeTab === 'display' ? 'active' : ''} h-12 md:h-16 px-6 md:px-10`}
            style={{
              display: 'flex',
              width: 'fit-content',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '18px',
              border: 0,
              background: activeTab === 'display' ? 'var(--ui-inventory-button-bg, var(--ui-button-bg))' : 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <span className="text-base md:text-4xl" style={{ 
              color: activeTab === 'display' ? 'var(--ui-inventory-button-text, var(--ui-button-text))' : '#FFF', 
              fontFamily: 'Audiowide', 
              fontWeight: 400, 
              textTransform: 'uppercase' 
            }}>
              For Visuals
            </span>
          </button>
          <button
            onClick={() => handleTabChange('match')}
            className={`nav-button ${activeTab === 'match' ? 'active' : ''} h-12 md:h-16 px-6 md:px-10`}
            style={{
              display: 'flex',
              width: 'fit-content',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              border: 0,
              borderRadius: '18px',
              background: activeTab === 'match' ? 'var(--ui-inventory-button-bg, var(--ui-button-bg))' : 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <span className="text-base md:text-4xl" style={{ 
              color: activeTab === 'match' ? 'var(--ui-inventory-button-text, var(--ui-button-text))' : '#FFF', 
              fontFamily: 'Audiowide', 
              fontWeight: 400, 
              textTransform: 'uppercase' 
            }}>
              For Flexin
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-8 flex justify-center" style={{ paddingTop: '15px' }}>
        <div className="flex h-full w-[115vw] md:w-auto pl-[0.5rem] md:pl-0" style={{ maxHeight: '410px', height: '410px', maxWidth: '1600px', gap: '20px' }}>
          
          {/* Items List */}
          <div 
            className="w-full md:w-[40vw] rounded-lg overflow-hidden card-fade-in" 
            style={{ 
              borderRadius: '20px'
            }}
          >
            <div className="h-full flex flex-col">
              <div 
                className="flex-1 overflow-y-auto custom-scrollbar relative" 
                style={{ 
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)', 
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)' 
                }}
              >
                <div className="space-y-2.5">
                  {getCurrentBackgrounds().map((background) => (
                    <div
                      key={background.id}
                      onClick={() => handleItemSelect(background)}
                      className="relative rounded-lg cursor-pointer transition-all duration-200 overflow-hidden w-full"
                      style={{ 
                        height: '150px', 
                        borderRadius: '20px', 
                        border: selectedBackground?.id === background.id ? '2px solid #FF0080' : '1px solid rgba(255, 255, 255, 0.1)', 
                        background: background.isGradient ? background.url : `url('${background.url}')`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center', 
                        backgroundRepeat: 'no-repeat', 
                        marginBottom: '10px' 
                      }}
                    >
                      {background.isVideo && background.videoUrl && (
                        <video 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="absolute inset-0 w-full h-full object-cover" 
                          style={{ borderRadius: '20px' }}
                        >
                          <source src={background.videoUrl} type="video/mp4" />
                        </video>
                      )}
                      <div 
                        className="absolute inset-0 rounded-lg z-5" 
                        style={{ 
                          borderRadius: '20px', 
                          background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)' 
                        }}
                      ></div>
                      <div 
                        className="relative z-10" 
                        style={{ 
                          display: 'flex', 
                          padding: '24px', 
                          alignItems: 'center', 
                          gap: '10px', 
                          alignSelf: 'stretch', 
                          height: '100%' 
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex flex-col" style={{ gap: '4px' }}>
                            <h4 style={{ 
                              color: '#E2E2E2', 
                              fontFamily: 'Audiowide', 
                              fontSize: '18px', 
                              fontWeight: 400, 
                              textTransform: 'uppercase', 
                              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' 
                            }}>
                              {background.name}
                            </h4>
                            <p style={{ 
                              color: 'rgba(255, 255, 255, 0.9)', 
                              fontFamily: 'Montserrat', 
                              fontSize: '14px', 
                              fontWeight: 400, 
                              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' 
                            }}>
                              {background.rarity}
                            </p>
                          </div>
                        </div>
                        
                        {selectedBackground?.id === background.id && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleEquipBackground(background); 
                            }} 
                            className="relative transition-all duration-300 hover:scale-105" 
                            style={{ 
                              display: 'flex', 
                              width: 'fit-content', 
                              height: '44px', 
                              padding: '4px 20px', 
                              justifyContent: 'center', 
                              alignItems: 'center', 
                              gap: '10px', 
                              borderRadius: '18px', 
                              background: isBackgroundEquipped(background) ? '#4CAF50' : 'var(--ui-button-bg)', 
                              border: 'none', 
                              cursor: 'pointer' 
                            }}
                          >
                            <span style={{ 
                              color: 'var(--ui-button-text)', 
                              fontFamily: 'Audiowide', 
                              fontSize: '16px', 
                              fontWeight: 400, 
                              textTransform: 'uppercase' 
                            }}>
                              {isBackgroundEquipped(background) ? 'EQUIPPED' : 'EQUIP'}
                            </span>
                          </button>
                        )}
                        
                        {isBackgroundEquipped(background) && selectedBackground?.id !== background.id && (
                          <div 
                            className="relative transition-all duration-300" 
                            style={{ 
                              display: 'flex', 
                              width: 'fit-content', 
                              height: '44px', 
                              padding: '4px 20px', 
                              justifyContent: 'center', 
                              alignItems: 'center', 
                              gap: '10px', 
                              borderRadius: '18px', 
                              background: '#4CAF50', 
                              border: 'none'
                            }}
                          >
                            <span style={{ 
                              color: 'var(--ui-button-text)', 
                              fontFamily: 'Audiowide', 
                              fontSize: '16px', 
                              fontWeight: 400, 
                              textTransform: 'uppercase' 
                            }}>
                              EQUIPPED
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {getCurrentBackgrounds().length === 0 && (
                    <div className="text-center text-white/70 py-8">
                      <div className="text-4xl mb-2">📦</div>
                      <p>No backgrounds owned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Display Panel - Hidden on Mobile */}
          <div 
            key={`display-panel-${selectedBackground?.id || 'none'}`}
            className="hidden md:block rounded-lg overflow-hidden card-fade-in" 
            style={{ 
              width: '40vw', 
              maxWidth: '775px',
              backdropFilter: 'blur(10px)', 
              overflow: 'hidden', 
              borderRadius: '20px' 
            }}
          >
            <div className="p-6 h-full flex flex-col" style={{ overflow: 'hidden', position: 'relative' }}>
              {selectedBackground ? (
                <div 
                  className="relative" 
                  style={{ 
                    display: 'flex', 
                    width: '100%', 
                    height: '410px', 
                    alignItems: 'center', 
                    borderRadius: '20px', 
                    border: '1px solid #FFF', 
                    overflow: 'hidden'
                  }}
                >
                  {selectedBackground.isVideo && selectedBackground.videoUrl ? (
                    <video 
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="absolute inset-0 w-full h-full object-cover" 
                      style={{ borderRadius: '20px' }}
                    >
                      <source src={selectedBackground.videoUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <div
                      className="absolute inset-0 w-full h-full"
                      style={{ 
                        background: selectedBackground.isGradient ? selectedBackground.url : `url('${selectedBackground.url}')`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center',
                        borderRadius: '20px'
                      }}
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                    <h2 style={{ 
                      color: '#FFF', 
                      fontFamily: 'Audiowide', 
                      fontSize: '32px', 
                      fontWeight: 400, 
                      textTransform: 'uppercase', 
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)' 
                    }}>
                      {selectedBackground.name}
                    </h2>
                    <p style={{ 
                      color: 'rgba(255,255,255,0.9)', 
                      fontFamily: 'Montserrat', 
                      fontSize: '20px', 
                      fontWeight: 400, 
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)' 
                    }}>
                      {selectedBackground.rarity}
                    </p>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-center justify-center text-white/50" 
                  style={{ 
                    display: 'flex', 
                    width: '100%', 
                    height: '410px', 
                    padding: '20px 20px 30px 20px', 
                    alignItems: 'center', 
                    borderRadius: '20px', 
                    border: '1px solid #FFF', 
                    justifyContent: 'center', 
                    overflow: 'hidden' 
                  }}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎨</div>
                    <p className="text-xl" style={{ fontFamily: 'Audiowide', textTransform: 'uppercase' }}>
                      Select an item to preview
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
