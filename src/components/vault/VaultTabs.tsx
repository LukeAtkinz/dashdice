'use client';

import React, { useState } from 'react';
import PowerTab from './PowerTab';
import VibinTab from '@/components/vault/VibinTab';
import FlexinTab from '@/components/vault/FlexinTab';

export type VaultTabType = 'power' | 'vibin' | 'flexin';

interface VaultTabsProps {
  initialTab?: VaultTabType;
  onTabChange?: (tab: VaultTabType) => void;
}

export default function VaultTabs({ initialTab = 'power', onTabChange }: VaultTabsProps) {
  const [activeTab, setActiveTab] = useState<VaultTabType>(initialTab);

  const handleTabChange = (tab: VaultTabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Unified Tab Buttons - Always Visible */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <button
          onClick={() => handleTabChange('power')}
          className={`tab-button flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300 min-w-[120px]`}
          style={{
            border: activeTab === 'power' ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.1)',
            background: activeTab === 'power' 
              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(109, 40, 217, 0.2))' 
              : 'transparent',
            boxShadow: activeTab === 'power' ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none',
          }}
        >
          <span className="text-lg">🔮</span>
          <span className="text-sm font-audiowide uppercase text-white">
            Power
          </span>
        </button>

        <button
          onClick={() => handleTabChange('vibin')}
          className={`tab-button flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300 min-w-[120px]`}
          style={{
            border: activeTab === 'vibin' ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.1)',
            background: activeTab === 'vibin' 
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))' 
              : 'transparent',
            boxShadow: activeTab === 'vibin' ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none',
          }}
        >
          <span className="text-lg">🖼️</span>
          <span className="text-sm font-audiowide uppercase text-white">
            Vibin
          </span>
        </button>

        <button
          onClick={() => handleTabChange('flexin')}
          className={`tab-button flex items-center justify-center gap-2 px-6 py-2.5 rounded-[18px] transition-all duration-300 min-w-[120px]`}
          style={{
            border: activeTab === 'flexin' ? '2px solid #FFD700' : '2px solid rgba(255, 255, 255, 0.1)',
            background: activeTab === 'flexin' 
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))' 
              : 'transparent',
            boxShadow: activeTab === 'flexin' ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none',
          }}
        >
          <span className="text-lg">🖼️</span>
          <span className="text-sm font-audiowide uppercase text-white">
            Flexin
          </span>
        </button>
      </div>

      {/* Tab Content - Instant Switching */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'power' && (
          <div className="h-full">
            <PowerTab activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        )}

        {activeTab === 'vibin' && (
          <div className="h-full">
            <VibinTab />
          </div>
        )}

        {activeTab === 'flexin' && (
          <div className="h-full">
            <FlexinTab />
          </div>
        )}
      </div>
    </div>
  );
}
