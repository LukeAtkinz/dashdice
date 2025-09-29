'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInventory } from '@/context/InventoryContext';
import { useNavigation } from '@/context/NavigationContext';
import { useBackground } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { MatchPreview } from '@/components/ui/MatchPreview';
import { FriendCardPreview } from '@/components/ui/FriendCardPreview';

export const InventorySection: React.FC = () => {
  const { setCurrentSection } = useNavigation();
  const { user } = useAuth();
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
  const [isDesktop, setIsDesktop] = useState(false);

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
    <div className="w-full flex flex-col items-center justify-start gap-[2rem] py-[2rem] overflow-hidden fixed inset-0 pt-20 md:pt-24" style={{ height: 'calc(100vh - 5rem)', top: '5rem' }}>
      {/* Custom scrollbar styles and navigation animations */}
      <style jsx global>{`
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
            height: 615px !important;
            max-height: 615px !important;
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
          VAULT
        </h1>
      </div>      {/* Navigation */}
      <div className="w-full max-w-[60rem] flex flex-row items-center justify-center gap-[1rem] mb-8 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 md:gap-4">
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
      <div className="w-full max-w-[80rem] flex-1 overflow-hidden px-4">
        <div className="flex h-full w-full md:w-auto pl-[0.5rem] md:pl-0" style={{ maxHeight: '410px', height: '410px', maxWidth: '1600px', gap: '20px' }} data-mobile-height="410px" data-desktop-height="615px">
          
          {/* Items List */}
          <div 
            className="w-full md:w-[40vw] rounded-lg overflow-hidden card-fade-in" 
            style={{ 
              borderRadius: '20px'
            }}
          >
            <div className="h-full flex flex-col">
              <div 
                className="flex-1 overflow-y-auto overflow-x-hidden relative" 
                style={{ 
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)', 
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
                  touchAction: 'pan-y',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  transform: 'translateZ(0)', // Forces hardware acceleration
                  willChange: 'scroll-position' // Optimizes for scrolling
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

          {/* Display Panel - Hidden on Mobile */}
          <div 
            key={`display-panel-${selectedBackground?.id || 'none'}`}
            className="hidden md:block rounded-lg overflow-hidden card-fade-in" 
            style={{ 
              width: '40vw', 
              maxWidth: '775px',
              overflow: 'hidden', 
              borderRadius: '20px' 
            }}
          >
            <div className="p-6 flex flex-col" style={{ overflow: 'hidden', position: 'relative' }}>
              {selectedBackground ? (
                <div 
                  className="relative" 
                  style={{ 
                    display: 'flex', 
                    width: '100%', 
                    alignItems: 'center', 
                    borderRadius: '20px', 
                    border: '1px solid #FFF', 
                    overflow: 'hidden',
                    padding: '20px'
                  }}
                >
                  {selectedBackground.isVideo && selectedBackground.videoUrl ? (
                    <video 
                      key={`display-video-${selectedBackground.id}-${selectedBackground.videoUrl}`} // Force re-render when video changes
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
                  <div className="relative z-10 flex flex-col items-center justify-center w-full" style={{ minHeight: '300px', padding: '40px 20px' }}>
                    {activeTab === 'match' ? (
                      /* Use MatchPreview Component */
                      <MatchPreview 
                        background={selectedBackground ? {
                          name: selectedBackground.name,
                          preview: selectedBackground.url,
                          type: selectedBackground.isVideo ? 'video' : 'image'
                        } : { name: '', preview: '', type: 'image' }}
                        size="medium"
                        username={user?.displayName || 'Player'}
                        DisplayBackgroundEquip={DisplayBackgroundEquip}
                        MatchBackgroundEquip={MatchBackgroundEquip}
                        className="w-full max-w-none h-auto"
                        showFriendCard={true}
                        isDesktop={isDesktop}
                      />
                    ) : (
                      /* Dashboard Preview - Exact Dashboard Replica */
                      <div 
                        className="flex flex-col w-full overflow-hidden"
                        style={{ 
                          height: '300px',
                          background: 'rgba(0, 0, 0, 0.1)',
                          borderRadius: '12px',
                          position: 'relative'
                        }}
                      >
                        {/* Top Navigation Bar - Exact DashboardNavigation Replica */}
                        <div className="flex-1 flex flex-row items-center justify-between bg-gradient-to-br from-[#192E39] to-[#99999900] rounded-[20px] px-[15px] py-[8px] mx-2 mt-2">
                          {/* Left Navigation */}
                          <div className="flex flex-row items-center justify-start gap-[8px]">
                            {/* Logo Section */}
                            <div className="flex flex-row items-center justify-start gap-[8px]">
                              <div className="w-4 h-4 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-full flex items-center justify-center text-xs">
                                🎲
                              </div>
                              <div
                                className="relative text-sm bg-gradient-to-br from-[#ffd700] to-[#ffed4e] bg-clip-text text-transparent cursor-pointer"
                                style={{
                                  fontFamily: "Audiowide",
                                  fontWeight: 400,
                                }}
                              >
                                DashDice
                              </div>
                            </div>

                            {/* Navigation Items */}
                            <div className="flex items-center gap-[8px]">
                              <button
                                className="flex items-center justify-center px-[8px] py-[4px] rounded-[8px] border-0"
                                style={{
                                  background: '#FF0080',
                                }}
                              >
                                <span
                                  style={{
                                    color: '#FFF',
                                    fontFamily: 'Audiowide',
                                    fontSize: '8px',
                                    fontWeight: 400,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  DASHBOARD
                                </span>
                              </button>
                              <button
                                className="flex items-center justify-center px-[8px] py-[4px] rounded-[8px] border-0"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                <span
                                  style={{
                                    color: '#FFF',
                                    fontFamily: 'Audiowide',
                                    fontSize: '8px',
                                    fontWeight: 400,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  VAULT
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Right Navigation */}
                          <div className="flex flex-row items-center justify-end gap-[8px]">
                            <button
                              className="flex items-center justify-center px-[8px] py-[4px] rounded-[8px] border-0"
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              <span
                                style={{
                                  color: '#FFF',
                                  fontFamily: 'Audiowide',
                                  fontSize: '8px',
                                  fontWeight: 400,
                                  textTransform: 'uppercase',
                                }}
                              >
                                PROFILE
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Skill Rating Display - Exact Replica */}
                        <div className="flex justify-center py-2">
                          <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-700/50">
                            <div className="flex items-center gap-2">
                              <div className="text-white">
                                <span className="text-xs font-medium opacity-80">Elo: </span>
                                <span className="font-bold text-yellow-400 text-xs" style={{ fontFamily: 'Audiowide' }}>
                                  1250
                                </span>
                              </div>
                              <div className="h-3 w-px bg-gray-600"></div>
                              <div className="text-white">
                                <span className="text-xs font-medium opacity-80">Rank: </span>
                                <span className="font-bold text-yellow-400 text-xs" style={{ fontFamily: 'Audiowide' }}>
                                  Dash 5
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Game Mode Cards - Exact DashboardSectionNew Replica */}
                        <div className="flex flex-wrap items-center justify-center gap-1 px-2 flex-1 overflow-y-auto max-h-64">
                          {/* Quick Fire Card - Exact Replica */}
                          <div 
                            className="relative cursor-pointer flex items-center justify-start text-right"
                            style={{
                              height: '60px',
                              width: '120px',
                              borderRadius: '15px',
                              background: selectedBackground?.isGradient ? selectedBackground.url : `url('${selectedBackground?.url}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="game-mode-text relative flex-1 flex flex-col items-end px-2 z-[2]">
                              <h2
                                className="m-0 text-white uppercase font-normal text-xs leading-tight"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Audiowide",
                                  fontStyle: "normal",
                                  fontWeight: 400,
                                  textTransform: "uppercase",
                                  whiteSpace: "pre-line"
                                }}
                              >
                                QUICK{'\n'}FIRE
                              </h2>
                              <div
                                className="relative font-light text-xs leading-tight opacity-80"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Montserrat",
                                  fontStyle: "normal",
                                  fontWeight: 300,
                                  textTransform: "uppercase",
                                  textAlign: "right",
                                  fontSize: '6px'
                                }}
                              >
                                more speed,{'\n'}more skill
                              </div>
                            </div>
                            <img
                              className="w-8 h-8 absolute object-contain z-[1] opacity-40"
                              alt="quickfire"
                              src="/Design Elements/Shield.webp"
                              style={{
                                top: '-8px',
                                left: '-20px',
                                transform: 'rotate(0deg)'
                              }}
                            />
                          </div>

                          {/* Classic Mode Card - Exact Replica */}
                          <div 
                            className="relative cursor-pointer flex items-center justify-start text-right"
                            style={{
                              height: '60px',
                              width: '120px',
                              borderRadius: '15px',
                              background: selectedBackground?.isGradient ? selectedBackground.url : `url('${selectedBackground?.url}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="game-mode-text relative flex-1 flex flex-col items-end px-2 z-[2]">
                              <h2
                                className="m-0 text-white uppercase font-normal text-xs leading-tight"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Audiowide",
                                  fontStyle: "normal",
                                  fontWeight: 400,
                                  textTransform: "uppercase",
                                  whiteSpace: "pre-line"
                                }}
                              >
                                CLASSIC{'\n'}MODE
                              </h2>
                              <div
                                className="relative font-light text-xs leading-tight opacity-80"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Montserrat",
                                  fontStyle: "normal",
                                  fontWeight: 300,
                                  textTransform: "uppercase",
                                  textAlign: "right",
                                  fontSize: '6px'
                                }}
                              >
                                ONLY ONE{'\n'}WILL RISE
                              </div>
                            </div>
                            <img
                              className="w-8 h-8 absolute object-contain z-[1] opacity-40"
                              alt="classic"
                              src="/Design Elements/Crown Mode.webp"
                              style={{
                                top: '-8px',
                                left: '-20px',
                                transform: 'rotate(0deg)'
                              }}
                            />
                          </div>

                          {/* Zero Hour Card - Exact Replica */}
                          <div 
                            className="relative cursor-pointer flex items-center justify-start text-right"
                            style={{
                              height: '60px',
                              width: '120px',
                              borderRadius: '15px',
                              background: selectedBackground?.isGradient ? selectedBackground.url : `url('${selectedBackground?.url}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="game-mode-text relative flex-1 flex flex-col items-end px-2 z-[2]">
                              <h2
                                className="m-0 text-white uppercase font-normal text-xs leading-tight"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Audiowide",
                                  fontStyle: "normal",
                                  fontWeight: 400,
                                  textTransform: "uppercase",
                                  whiteSpace: "pre-line"
                                }}
                              >
                                ZERO{'\n'}HOUR
                              </h2>
                              <div
                                className="relative font-light text-xs leading-tight opacity-80"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Montserrat",
                                  fontStyle: "normal",
                                  fontWeight: 300,
                                  textTransform: "uppercase",
                                  textAlign: "right",
                                  fontSize: '6px'
                                }}
                              >
                                countdown{'\n'}to victory
                              </div>
                            </div>
                            <img
                              className="w-8 h-8 absolute object-contain z-[1] opacity-40"
                              alt="zerohour"
                              src="/Design Elements/time out.webp"
                              style={{
                                top: '-8px',
                                left: '-24px',
                                transform: 'rotate(0deg)'
                              }}
                            />
                          </div>

                          {/* Last Line Card - Exact Replica */}
                          <div 
                            className="relative cursor-pointer flex items-center justify-start text-right"
                            style={{
                              height: '60px',
                              width: '120px',
                              borderRadius: '15px',
                              background: selectedBackground?.isGradient ? selectedBackground.url : `url('${selectedBackground?.url}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="game-mode-text relative flex-1 flex flex-col items-end px-2 z-[2]">
                              <h2
                                className="m-0 text-white uppercase font-normal text-xs leading-tight"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Audiowide",
                                  fontStyle: "normal",
                                  fontWeight: 400,
                                  textTransform: "uppercase",
                                  whiteSpace: "pre-line"
                                }}
                              >
                                LAST{'\n'}LINE
                              </h2>
                              <div
                                className="relative font-light text-xs leading-tight opacity-80"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Montserrat",
                                  fontStyle: "normal",
                                  fontWeight: 300,
                                  textTransform: "uppercase",
                                  textAlign: "right",
                                  fontSize: '6px'
                                }}
                              >
                                SHIFT THE{'\n'}BALANCE
                              </div>
                            </div>
                            <img
                              className="w-8 h-8 absolute object-contain z-[1] opacity-40"
                              alt="lastline"
                              src="/Design Elements/skull.webp"
                              style={{
                                top: '-8px',
                                left: '-24px',
                                transform: 'rotate(0deg)'
                              }}
                            />
                          </div>

                          {/* True Grit Card - Disabled Exact Replica */}
                          <div 
                            className="relative opacity-50 flex items-center justify-start text-right"
                            style={{
                              height: '60px',
                              width: '120px',
                              borderRadius: '15px',
                              background: selectedBackground?.isGradient ? selectedBackground.url : `url('${selectedBackground?.url}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="game-mode-text relative flex-1 flex flex-col items-end px-2 z-[2]">
                              <h2
                                className="m-0 text-white uppercase font-normal text-xs leading-tight"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Audiowide",
                                  fontStyle: "normal",
                                  fontWeight: 400,
                                  textTransform: "uppercase",
                                  whiteSpace: "pre-line"
                                }}
                              >
                                TRUE{'\n'}GRIT
                              </h2>
                              <div
                                className="relative font-light text-xs leading-tight opacity-80"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Montserrat",
                                  fontStyle: "normal",
                                  fontWeight: 300,
                                  textTransform: "uppercase",
                                  textAlign: "right",
                                  fontSize: '6px'
                                }}
                              >
                                no banking,{'\n'}no mercy
                              </div>
                            </div>
                            <img
                              className="w-8 h-8 absolute object-contain z-[1] opacity-20"
                              alt="truegrit"
                              src="/Design Elements/Castle.webp"
                              style={{
                                top: '-8px',
                                left: '-24px',
                                transform: 'rotate(0deg)'
                              }}
                            />
                          </div>

                          {/* Tag Team Card - Disabled Exact Replica */}
                          <div 
                            className="relative opacity-50 flex items-center justify-start text-right"
                            style={{
                              height: '60px',
                              width: '120px',
                              borderRadius: '15px',
                              background: selectedBackground?.isGradient ? selectedBackground.url : `url('${selectedBackground?.url}')`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            <div className="game-mode-text relative flex-1 flex flex-col items-end px-2 z-[2]">
                              <h2
                                className="m-0 text-white uppercase font-normal text-xs leading-tight"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Audiowide",
                                  fontStyle: "normal",
                                  fontWeight: 400,
                                  textTransform: "uppercase",
                                  whiteSpace: "pre-line"
                                }}
                              >
                                TAG{'\n'}TEAM
                              </h2>
                              <div
                                className="relative font-light text-xs leading-tight opacity-80"
                                style={{
                                  color: "#FFF",
                                  fontFamily: "Montserrat",
                                  fontStyle: "normal",
                                  fontWeight: 300,
                                  textTransform: "uppercase",
                                  textAlign: "right",
                                  fontSize: '6px'
                                }}
                              >
                                rise or fall{'\n'}together
                              </div>
                            </div>
                            <img
                              className="w-8 h-8 absolute object-contain z-[1] opacity-20"
                              alt="tagteam"
                              src="/Design Elements/friends.webp"
                              style={{
                                top: '-12px',
                                left: '-12px',
                                transform: 'rotate(0deg)'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-center justify-center text-white/50" 
                  style={{ 
                    display: 'flex', 
                    width: '100%', 
                    padding: '60px 20px', 
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
          
          {/* Desktop Friend Card Preview - Separate Container */}
          {isDesktop && activeTab === 'match' && (
            <div className="w-full mt-4">
              <FriendCardPreview 
                username={user?.displayName || 'Player'}
                MatchBackgroundEquip={MatchBackgroundEquip}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventorySection;
