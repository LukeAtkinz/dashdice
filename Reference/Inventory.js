import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBackground } from '../context/BackgroundContext';
import { usePlayerBackground } from '../context/PlayerBackgroundContext';
import {
  getUserOwnedBackgrounds,
  getUserOwnedPlayerBackgrounds,
  equipBackgroundLocal,
  equipPlayerBackgroundLocal,
  loadUserData,
} from '../utils/inventoryLogic';

export default function Inventory({ onBack, onBackToDashboard, setDisplayBackground, setMatchBackground }) {
  const { currentUser } = useAuth();
 const { DisplayBackgroundEquip } = useBackground();
 const { MatchBackgroundEquip } = useBackground();
 // Use equippedPlayerBackground from PlayerBackgroundContext
 const { equippedPlayerBackground } = require('../context/PlayerBackgroundContext').usePlayerBackground();
  const [activeTab, setActiveTab] = useState('display'); // 'display' (Display Background), 'match' (Match Background)
  const [ownedDisplayBackgrounds, setOwnedDisplayBackgrounds] = useState([]);
  const [ownedMatchBackgrounds, setOwnedMatchBackgrounds] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Debug: Log equipped backgrounds and selected background on every render
  useEffect(() => {
    console.log('EquippedPlayerBackground (context):', equippedPlayerBackground);
    console.log('EquippedBackground (context):', equippedBackground);
    console.log('SelectedBackground:', selectedBackground);
  }, [equippedPlayerBackground, equippedBackground, selectedBackground]);

  useEffect(() => {
    if (currentUser?.uid) {
      // Load user backgrounds from localStorage/Firebase
      loadUserData(currentUser.uid);
      const displayBackgrounds = getUserOwnedPlayerBackgrounds(currentUser.uid);
      const matchBackgrounds = getUserOwnedBackgrounds(currentUser.uid);
      console.log('Owned Display Backgrounds:', displayBackgrounds);
      console.log('Owned Match Backgrounds:', matchBackgrounds);
      setOwnedDisplayBackgrounds(displayBackgrounds);
      setOwnedMatchBackgrounds(matchBackgrounds);
      setLoading(false);
    }
  }, [currentUser]);

  // Set selected background when switching tabs
  useEffect(() => {
    if (activeTab === 'display' && equippedPlayerBackground && !selectedBackground) {
      setSelectedBackground(equippedPlayerBackground);
    } else if (activeTab === 'match' && equippedBackground && !selectedBackground) {
      setSelectedBackground(equippedBackground);
    }
  }, [activeTab, equippedPlayerBackground, equippedBackground, selectedBackground]);

  const handleEquipBackground = async (background) => {
    if (!currentUser?.uid) return;
    console.log('Equip Button Clicked:', { tab: activeTab, background });
    // Normalize background object to match debug UI logic
    let normalizedBg = background;
    if (background.isVideo) {
      normalizedBg = {
        name: background.name,
        file: background.videoUrl || background.url || background.file,
        type: 'video',
      };
    } else if (background.isGradient) {
      normalizedBg = {
        name: background.name,
        url: background.url,
        type: 'gradient',
      };
    } else {
      normalizedBg = {
        name: background.name,
        file: background.url || background.file,
        type: 'image',
      };
    }
    if (activeTab === 'display') {
      // Equip DisplayBackgroundEquip in Firestore
      const { equipPlayerBackground } = usePlayerBackground();
      const { equipDisplayBackgroundFirestore } = require('../utils/inventoryLogic');
      await equipPlayerBackground(background.id);
      await equipDisplayBackgroundFirestore(currentUser.uid, background.id);
      console.log('Equipped Display Background ID:', background.id);
      if (typeof setDisplayBackground === 'function') {
        setDisplayBackground(normalizedBg);
      }
      setTimeout(() => {
        setSelectedBackground(equippedPlayerBackground);
        console.log('EquippedPlayerBackground from context:', equippedPlayerBackground);
      }, 300);
    } else if (activeTab === 'match') {
      // Equip MatchBackgroundEquip in Firestore
      const { equipBackground } = useBackground();
      const { equipMatchBackgroundFirestore } = require('../utils/inventoryLogic');
      await equipBackground(background.id);
      await equipMatchBackgroundFirestore(currentUser.uid, background.id);
      console.log('Equipped Match Background ID:', background.id);
      if (typeof setMatchBackground === 'function') {
        setMatchBackground(normalizedBg);
      }
      setTimeout(() => {
        setSelectedBackground(equippedBackground);
        console.log('EquippedBackground from context:', equippedBackground);
      }, 300);
    }
  };

  const handleItemSelect = (background) => {
    setSelectedBackground(background);
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSelectedBackground(null);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)' }}>
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
        }
        .nav-button:active {
          animation: navClick 0.2s ease-in-out;
        }
        .nav-button.active {
          box-shadow: 0 6px 20px rgba(255, 0, 128, 0.4);
        }
      `}</style>
      {/* Navigation */}
      <div className="w-full px-8 py-6">
        <div className="flex items-center justify-center gap-4" style={{ gap: '20px' }}>
          <button
            onClick={() => handleTabChange('display')}
            className={`nav-button ${activeTab === 'display' ? 'active' : ''}`}
            style={{
              display: 'flex',
              width: 'fit-content',
              height: '56px',
              padding: '4px 30px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '18px',
              border: 0,
              background: activeTab === 'display' ? '#FF0080' : 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <span style={{ color: '#FFF', fontFamily: 'Audiowide', fontSize: '32px', fontWeight: 400, textTransform: 'uppercase' }}>
              Display Background
            </span>
          </button>
          <button
            onClick={() => handleTabChange('match')}
            className={`nav-button ${activeTab === 'match' ? 'active' : ''}`}
            style={{
              display: 'flex',
              width: 'fit-content',
              height: '56px',
              padding: '4px 30px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              border: 0,
              borderRadius: '18px',
              background: activeTab === 'match' ? '#FF0080' : 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <span style={{ color: '#FFF', fontFamily: 'Audiowide', fontSize: '32px', fontWeight: 400, textTransform: 'uppercase' }}>
              Match Background
            </span>
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 px-8 flex justify-center" style={{ paddingTop: '20px' }}>
        <div className="flex h-full" style={{ maxHeight: '410px', height: '410px', width: '1600px', gap: '20px' }}>
          {/* Items List */}
          <div className="rounded-lg overflow-hidden" style={{ width: '50%', background: 'transparent', borderRadius: '20px', background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)', padding: '20px' }}>
            <div className="p-4 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar relative" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)' }}>
                {activeTab === 'display' && (
                  <div className="space-y-2.5">
                    {ownedDisplayBackgrounds.map((background) => (
                      <div
                        key={background.id}
                        onClick={() => handleItemSelect(background)}
                        className="relative rounded-lg cursor-pointer transition-all duration-200 overflow-hidden w-full"
                        style={{ height: '150px', borderRadius: '20px', border: selectedBackground?.id === background.id ? '2px solid #FF0080' : '1px solid rgba(255, 255, 255, 0.1)', background: background.isGradient ? background.url : `url('${background.url}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', marginBottom: '10px' }}
                      >
                        {background.isVideo && (
                          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ borderRadius: '20px' }}>
                            <source src={background.videoUrl} type="video/mp4" />
                          </video>
                        )}
                        <div className="absolute inset-0 rounded-lg z-5" style={{ borderRadius: '20px', background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)' }}></div>
                        <div className="relative z-10" style={{ display: 'flex', padding: '24px', alignItems: 'center', gap: '10px', alignSelf: 'stretch', height: '100%' }}>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex flex-col" style={{ gap: '4px' }}>
                              <h4 style={{ color: '#E2E2E2', fontFamily: 'Audiowide', fontSize: '24px', fontWeight: 400, textTransform: 'uppercase', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>{background.name}</h4>
                              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'Montserrat', fontSize: '16px', fontWeight: 400, textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>{background.rarity}</p>
                            </div>
                          </div>
                          {selectedBackground?.id === background.id && (
                            <button onClick={(e) => { e.stopPropagation(); handleEquipBackground(background); }} className="relative transition-all duration-300 hover:scale-105" style={{ display: 'flex', width: 'fit-content', height: '56px', padding: '4px 30px', justifyContent: 'center', alignItems: 'center', gap: '10px', borderRadius: '18px', background: equippedPlayerBackground?.id === background.id ? '#4CAF50' : '#FF0080', border: 'none', cursor: 'pointer' }}>
                              <span style={{ color: '#FFF', fontFamily: 'Audiowide', fontSize: '20px', fontWeight: 400, textTransform: 'uppercase' }}>{equippedPlayerBackground?.id === background.id ? 'EQUIPPED' : 'EQUIP'}</span>
                            </button>
                          )}
                          {equippedPlayerBackground?.id === background.id && selectedBackground?.id !== background.id && (
                            <div className="px-2 py-1 rounded text-xs font-bold flex-shrink-0" style={{ background: '#4CAF50', color: '#FFF', fontFamily: 'Audiowide' }}>EQUIPPED</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {ownedDisplayBackgrounds.length === 0 && (
                      <div className="text-center text-white/70 py-8"><div className="text-4xl mb-2">📦</div><p>No backgrounds owned</p></div>
                    )}
                  </div>
                )}
                {activeTab === 'match' && (
                  <div className="space-y-2.5">
                    {ownedMatchBackgrounds.map((background) => (
                      <div
                        key={background.id}
                        onClick={() => handleItemSelect(background)}
                        className="relative rounded-lg cursor-pointer transition-all duration-200 overflow-hidden w-full"
                        style={{ height: '150px', borderRadius: '20px', border: selectedBackground?.id === background.id ? '2px solid #FF0080' : '1px solid rgba(255, 255, 255, 0.1)', background: background.isGradient ? background.url : `url('${background.url}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', marginBottom: '10px' }}
                      >
                        {background.isVideo && (
                          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ borderRadius: '20px' }}>
                            <source src={background.videoUrl} type="video/mp4" />
                          </video>
                        )}
                        <div className="absolute inset-0 rounded-lg z-5" style={{ borderRadius: '20px', background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)' }}></div>
                        <div className="relative z-10" style={{ display: 'flex', padding: '24px', alignItems: 'center', gap: '10px', alignSelf: 'stretch', height: '100%' }}>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex flex-col" style={{ gap: '4px' }}>
                              <h4 style={{ color: '#E2E2E2', fontFamily: 'Audiowide', fontSize: '24px', fontWeight: 400, textTransform: 'uppercase', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>{background.name}</h4>
                              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'Montserrat', fontSize: '16px', fontWeight: 400, textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>{background.rarity}</p>
                            </div>
                          </div>
                          {selectedBackground?.id === background.id && (
                            <button onClick={(e) => { e.stopPropagation(); handleEquipBackground(background); }} className="relative transition-all duration-300 hover:scale-105" style={{ display: 'flex', width: 'fit-content', height: '56px', padding: '4px 30px', justifyContent: 'center', alignItems: 'center', gap: '10px', borderRadius: '18px', background: equippedBackground?.id === background.id ? '#4CAF50' : '#FF0080', border: 'none', cursor: 'pointer' }}>
                              <span style={{ color: '#FFF', fontFamily: 'Audiowide', fontSize: '20px', fontWeight: 400, textTransform: 'uppercase' }}>{equippedBackground?.id === background.id ? 'EQUIPPED' : 'EQUIP'}</span>
                            </button>
                          )}
                          {equippedBackground?.id === background.id && selectedBackground?.id !== background.id && (
                            <div className="px-2 py-1 rounded text-xs font-bold flex-shrink-0" style={{ background: '#4CAF50', color: '#FFF', fontFamily: 'Audiowide', fontSize: '20px', fontWeight: 400, height: '56px', padding: '4px 30px', justifyContent: 'center', alignItems: 'center', gap: '10px', borderRadius: '18px' }}>EQUIPPED</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {ownedMatchBackgrounds.length === 0 && (
                      <div className="text-center text-white/70 py-8"><div className="text-4xl mb-2">📦</div><p>No backgrounds owned</p></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Display Panel */}
          <div key={`display-panel-${selectedBackground?.id || 'none'}`} className="rounded-lg overflow-hidden" style={{ width: '775px', background: 'linear-gradient(180deg, rgba(25, 46, 57, 0.8) 0%, rgba(25, 46, 57, 0.4) 100%)', backdropFilter: 'blur(10px)', overflow: 'hidden', borderRadius: '20px' }}>
            <div className="p-6 h-full flex flex-col" style={{ overflow: 'hidden', position: 'relative' }}>
              {selectedBackground ? (
                <div className="relative" style={{ display: 'flex', width: '775px', height: '410px', alignItems: 'center', borderRadius: '20px', border: '1px solid #FFF', overflow: 'hidden', background: selectedBackground.isGradient ? selectedBackground.url : `url('${selectedBackground.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  {selectedBackground.isVideo && (
                    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ borderRadius: '20px' }}>
                      <source src={selectedBackground.videoUrl} type="video/mp4" />
                    </video>
                  )}
                  <div className="absolute inset-0 rounded-lg z-5" style={{ borderRadius: '20px', background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)' }}></div>
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                    <h2 style={{ color: '#FFF', fontFamily: 'Audiowide', fontSize: '32px', fontWeight: 400, textTransform: 'uppercase', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{selectedBackground.name}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Montserrat', fontSize: '20px', fontWeight: 400, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{selectedBackground.rarity}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center text-white/50" style={{ display: 'flex', width: '775px', height: '410px', padding: '20px 20px 30px 20px', alignItems: 'center', borderRadius: '20px', border: '1px solid #FFF', justifyContent: 'center', overflow: 'hidden' }}>
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎨</div>
                    <p className="text-xl" style={{ fontFamily: 'Audiowide', textTransform: 'uppercase' }}>Select an item to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
