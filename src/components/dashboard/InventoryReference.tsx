'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInventory } from '@/context/InventoryContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { MatchPreview } from '@/components/ui/MatchPreview';
import { FriendCardPreview } from '@/components/ui/FriendCardPreview';
import PowerTab from '@/components/vault/PowerTab';

export const InventorySection: React.FC = () => {
  console.log('🚨 INVENTORY SECTION: COMPONENT IS STARTING TO RENDER!!!');
  
  const { setCurrentSection } = useNavigation();
  const { user } = useAuth();
  
  console.log('🏪 InventoryReference: Component rendering, user:', user ? 'authenticated' : 'not authenticated');
  const { 
    availableBackgrounds, 
    DisplayBackgroundEquip, 
    MatchBackgroundEquip,
    setDisplayBackgroundEquip,
    setMatchBackgroundEquip
  } = useBackground();

  const [activeTab, setActiveTab] = useState('power'); // 'display', 'match', or 'power' - Start with power for testing
  const [selectedBackground, setSelectedBackground] = useState<any>(null);
  
  console.log('🏪 InventoryReference: activeTab is:', activeTab);
  if (activeTab === 'power') {
    console.log('🚨 INVENTORY: About to render PowerTab - activeTab is power!');
  }
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Component tracking (cleaned up)

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Scrolling is now enabled for better user experience

  // Convert backgrounds to inventory format matching reference
  const ownedDisplayBackgrounds = availableBackgrounds.map((bg, index) => ({
    id: index + 1,
    name: bg.name,
    url: bg.file,
    videoUrl: bg.type === 'video' ? bg.file : null,
    isVideo: bg.type === 'video',
    isGradient: false,
    rarity: index === 0 ? 'Epic' : index === 1 ? 'Rare' : index === 2 ? 'Common' : 'Masterpiece',
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
      >
        <div className="text-white text-2xl">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start gap-[0.5rem] md:gap-[2rem] pt-[0.25rem] md:pt-[2rem] pb-[2rem] h-screen overflow-hidden"
      style={{
        touchAction: 'none', // Prevent touch scrolling on main container
        overscrollBehavior: 'none', // Prevent overscroll behavior
        position: 'fixed', // Fix position to prevent body scrolling
        top: '60px', // Reduced top margin for navigation on mobile
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        height: 'calc(100vh - 80px)' // Adjust height to account for top offset
      }}
    >
      {/* Custom scrollbar styles and navigation animations */}
      <style jsx global>{`
        /* Prevent body scrolling when inventory is open */
        body {
          overflow: hidden;
          position: fixed;
          width: 100%;
          height: 100%;
        }
        
        /* Hide scrollbars on desktop but allow scrolling */
        .scrollbar-hide {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        
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
        
        /* Tab button hover effects - keep text white */
        .tab-button:hover span {
          color: #FFF !important;
        }
        .tab-button.active:hover span {
          color: #FFD700 !important;
        }
        
        /* Responsive height for vault containers */
        @media (min-width: 768px) {
          div[data-desktop-height] {
            height: auto !important;
            min-height: 600px !important;
            max-height: 80vh !important;
          }
          
          /* Desktop font sizes for inventory items */
          .inventory-item-title {
            font-size: 24px !important;
          }
          .inventory-item-rarity {
            font-size: 18px !important;
          }
          .inventory-button {
            height: 52px !important;
            padding: 4px 24px !important;
          }
          .inventory-button-text {
            font-size: 18px !important;
          }
          .preview-title {
            font-size: 36px !important;
            margin-bottom: 12px !important;
          }
          .preview-rarity {
            font-size: 24px !important;
          }
        }
        
        /* Mobile font sizes */
        @media (max-width: 767px) {
          .inventory-item-title {
            font-size: 18px !important;
          }
          .inventory-item-rarity {
            font-size: 14px !important;
          }
          .inventory-button {
            height: 44px !important;
            padding: 4px 20px !important;
          }
          .inventory-button-text {
            font-size: 16px !important;
          }
          .preview-title {
            font-size: 32px !important;
            margin-bottom: 8px !important;
          }
          .preview-rarity {
            font-size: 20px !important;
          }
        }
        
        .nav-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-button:active {
          transform: scale(0.95);
        }
        .nav-button.active {
          border: 2px solid #FFD700;
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
          Vault
        </h1>
        
        {/* Mobile Title - Hidden when Power tab is active */}
        <h1 
          className={`block md:hidden text-5xl font-bold text-white mb-4 mt-12 ${activeTab === 'power' ? 'hidden' : ''}`}
          style={{
            fontFamily: "Audiowide",
            textTransform: "uppercase",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)"
          }}
        >
          Vault
        </h1>
      </div>
      
      {/* Mobile Power Tab Loadout Card - Positioned tightly above navigation */}
      <div className="block md:hidden w-full max-w-[60rem] px-4 mb-4 mt-2">
        {activeTab === 'power' && <PowerTab mobileHeaderOnly={true} />}
      </div>
      
      {/* Navigation */}
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          <button
            onClick={() => handleTabChange('power')}
            className={`tab-button nav-button ${activeTab === 'power' ? 'active' : ''} flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] transition-all duration-300 h-12 md:h-16 px-4 md:px-6 min-w-[120px] md:min-w-[140px]`}
            style={{
              display: 'flex',
              width: 'fit-content',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              border: activeTab === 'power' ? '2px solid #FFD700' : '2px solid transparent',
              borderRadius: '18px',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span className="text-base md:text-lg font-audiowide uppercase" style={{ 
              color: activeTab === 'power' ? '#FFF' : '#FFF', 
              fontFamily: 'Audiowide', 
              fontWeight: 400, 
              textTransform: 'uppercase' 
            }}>
              Power
            </span>
          </button>
          <button
            onClick={() => handleTabChange('display')}
            className={`tab-button nav-button ${activeTab === 'display' ? 'active' : ''} flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] transition-all duration-300 h-12 md:h-16 px-4 md:px-6 min-w-[120px] md:min-w-[140px]`}
            style={{
              display: 'flex',
              width: 'fit-content',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '18px',
              border: activeTab === 'display' ? '2px solid #FFD700' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span className="text-base md:text-lg font-audiowide uppercase" style={{ 
              color: activeTab === 'display' ? '#FFF' : '#FFF', 
              fontFamily: 'Audiowide', 
              fontWeight: 400, 
              textTransform: 'uppercase' 
            }}>
              Vibin
            </span>
          </button>
          <button
            onClick={() => handleTabChange('match')}
            className={`tab-button nav-button ${activeTab === 'match' ? 'active' : ''} flex flex-col items-center justify-center gap-2 p-4 rounded-[20px] transition-all duration-300 h-12 md:h-16 px-4 md:px-6 min-w-[120px] md:min-w-[140px]`}
            style={{
              display: 'flex',
              width: 'fit-content',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              border: activeTab === 'match' ? '2px solid #FFD700' : '2px solid transparent',
              borderRadius: '18px',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span className="text-base md:text-lg font-audiowide uppercase" style={{ 
              color: activeTab === 'match' ? '#FFF' : '#FFF', 
              fontFamily: 'Audiowide', 
              fontWeight: 400, 
              textTransform: 'uppercase' 
            }}>
              Flexin
            </span>
          </button>
        </div>
      </div>



      {/* Content */}
      {activeTab === 'power' ? (
        <div className="w-full max-w-[80rem] flex-1 overflow-hidden px-4"
          style={{
            touchAction: 'pan-y', // Only allow vertical panning within content
            overscrollBehavior: 'contain' // Contain scrolling within this element
          }}
        >
          <div className="flex h-auto w-full md:w-auto pl-[0.5rem] md:pl-0" style={{ minHeight: '600px', height: 'auto', maxHeight: '80vh', maxWidth: '1600px', gap: '20px' }} data-mobile-height="410px" data-desktop-height="auto">
            
            {/* Power Tab Content */}
            <div 
              className="w-full rounded-lg overflow-hidden card-fade-in" 
              style={{ 
                borderRadius: '20px'
              }}
            >
              <div className="h-full flex flex-col">
                <div 
                  className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide" 
                  style={{ 
                    touchAction: 'pan-y',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    transform: 'translateZ(0)', // Forces hardware acceleration
                    willChange: 'scroll-position', // Optimizes for scrolling
                    paddingBottom: '120px', // Increased padding to ensure all cards are scrollable
                    maxHeight: '60vh' // Limit height to ensure scrolling works properly
                  }}
                >
                  <div className="space-y-2.5 pb-20 pt-4">
                    <PowerTab mobileHeaderOnly={false} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[80rem] flex-1 overflow-hidden px-4 pt-4 md:pt-0"
          style={{
            touchAction: 'pan-y', // Only allow vertical panning within content
            overscrollBehavior: 'contain' // Contain scrolling within this element
          }}
        >
          <div className="flex h-auto w-full md:w-auto pl-[0.5rem] md:pl-0" style={{ minHeight: '600px', height: 'auto', maxHeight: '80vh', maxWidth: '1600px', gap: '20px' }} data-mobile-height="410px" data-desktop-height="auto">
            
            {/* Items List */}
            <div 
              className="w-full rounded-lg overflow-hidden card-fade-in" 
              style={{ 
                borderRadius: '20px'
              }}
            >
              <div className="h-full flex flex-col">
                <div 
                  className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide" 
                  style={{ 
                    touchAction: 'pan-y',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    transform: 'translateZ(0)', // Forces hardware acceleration
                    willChange: 'scroll-position', // Optimizes for scrolling
                    paddingBottom: '120px', // Increased padding to ensure all cards are scrollable
                    maxHeight: '60vh' // Limit height to ensure scrolling works properly
                  }}
                >
                  <div className="space-y-2.5 pb-20 pt-4">
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
                            key={`video-${background.id}-${background.videoUrl}`} // Force re-render when video changes
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            controls={false}
                            webkit-playsinline="true"
                            x5-playsinline="true"
                            preload="metadata"
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
                              <h4 className="inventory-item-title" style={{ 
                                color: '#E2E2E2', 
                                fontFamily: 'Audiowide', 
                                fontWeight: 400, 
                                textTransform: 'uppercase', 
                                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' 
                              }}>
                                {background.name}
                              </h4>
                              <p className="inventory-item-rarity" style={{ 
                                color: 'rgba(255, 255, 255, 0.9)', 
                                fontFamily: 'Montserrat', 
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
                              className="inventory-button relative transition-all duration-300 hover:scale-105" 
                              style={{ 
                                display: 'flex', 
                                width: 'fit-content', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '10px', 
                                borderRadius: '18px', 
                                background: isBackgroundEquipped(background) ? '#4CAF50' : 'var(--ui-button-bg)', 
                                border: 'none', 
                                cursor: 'pointer' 
                              }}
                            >
                              <span className="inventory-button-text" style={{ 
                                color: 'var(--ui-button-text)', 
                                fontFamily: 'Audiowide', 
                                fontWeight: 400, 
                                textTransform: 'uppercase' 
                              }}>
                                {isBackgroundEquipped(background) ? 'EQUIPPED' : 'EQUIP'}
                              </span>
                            </button>
                          )}
                          
                          {isBackgroundEquipped(background) && selectedBackground?.id !== background.id && (
                            <div 
                              className="inventory-button relative transition-all duration-300" 
                              style={{ 
                                display: 'flex', 
                                width: 'fit-content', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '10px', 
                                borderRadius: '18px', 
                                background: '#4CAF50', 
                                border: 'none'
                              }}
                            >
                              <span className="inventory-button-text" style={{ 
                                color: 'var(--ui-button-text)', 
                                fontFamily: 'Audiowide', 
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
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySection;
