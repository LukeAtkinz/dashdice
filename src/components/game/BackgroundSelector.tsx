'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BackgroundService } from '@/services/backgroundService';
import { Background } from '@/config/backgrounds';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface BackgroundSelectorProps {
  onBackgroundChange?: (background: Background) => void;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ onBackgroundChange }) => {
  const { user, refreshUser } = useAuth();
  const [selectedBackground, setSelectedBackground] = useState<string | null>(user?.inventory?.displayBackgroundEquipped || null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!user) {
    return null;
  }

  const ownedBackgrounds = BackgroundService.getUserOwnedBackgrounds(user.inventory.ownedBackgrounds);
  const currentBackground = BackgroundService.getBackgroundSafely(user.inventory.displayBackgroundEquipped);

  const handleBackgroundSelect = async (background: Background) => {
    if (isUpdating) return;
    
    console.log(`🎨 User selecting background: ${background.name} (${background.id})`);
    setSelectedBackground(background.id);
    setIsUpdating(true);

    try {
      console.log('📝 Calling BackgroundService.updateEquippedBackground...');
      await BackgroundService.updateEquippedBackground(user.uid, background.id);
      
      console.log('🔄 Refreshing user data...');
      // Refresh user data to show the updated background immediately
      await refreshUser();
      
      console.log('✅ Background selection complete');
      onBackgroundChange?.(background);
    } catch (error) {
      console.error('❌ Failed to update background:', error);
      setSelectedBackground(user.inventory.displayBackgroundEquipped || null);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderBackgroundPreview = (background: Background) => {
    const backgroundUrl = BackgroundService.getBackgroundUrl(background);
    const isSelected = selectedBackground === background.id;
    const isCurrentlyEquipped = user.inventory.displayBackgroundEquipped === background.id;

    return (
      <div
        key={background.id}
        className={`cursor-pointer transition-all duration-200 hover:scale-105`}
        onClick={() => handleBackgroundSelect(background)}
      >
        <Card className={`h-full ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        } ${isCurrentlyEquipped ? 'border-green-500' : ''}`}>
          <div className="relative">
            {background.type === 'image' ? (
              <img
                src={backgroundUrl}
                alt={background.name}
                className="w-full h-32 object-cover rounded-t-lg"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-32 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-1">🎬</div>
                  <div className="text-sm text-gray-600">Video Background</div>
                </div>
              </div>
            )}
            
            {isCurrentlyEquipped && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                Equipped
              </div>
            )}
          </div>
          
          <CardContent className="p-3">
            <h3 className="font-semibold text-sm mb-1">{background.name}</h3>
            {background.description && (
              <p className="text-xs text-gray-600 mb-2">{background.description}</p>
            )}
            {background.tags && (
              <div className="flex flex-wrap gap-1">
                {background.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-orbitron mb-2">Background Selector</h2>
        <p className="text-gray-600">
          Choose your game background. You own {ownedBackgrounds.length} backgrounds.
        </p>
      </div>

      {/* Current Background Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Currently Equipped</span>
            {isUpdating && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {currentBackground.type === 'image' ? (
              <img
                src={BackgroundService.getBackgroundUrl(currentBackground)}
                alt={currentBackground.name}
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-2xl">🎬</span>
              </div>
            )}
            <div>
              <h3 className="font-semibold">{currentBackground.name}</h3>
              {currentBackground.description && (
                <p className="text-sm text-gray-600">{currentBackground.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Backgrounds</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {ownedBackgrounds.map(renderBackgroundPreview)}
        </div>
      </div>

      {ownedBackgrounds.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 mb-4">You don't have any backgrounds yet.</p>
            <Button onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
