'use client';

import React, { useState } from 'react';
import { BackgroundSelector } from '@/components/game/BackgroundSelector';
import { InventoryGrid } from '@/components/game/InventoryGrid';
import { useInventory } from '@/context/InventoryContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

type FilterType = 'all' | 'background' | 'dice' | 'avatar' | 'effect';

export const InventorySection: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const { inventory, addItem } = useInventory();

  const filters: { key: FilterType; label: string; emoji: string }[] = [
    { key: 'all', label: 'All Items', emoji: '📦' },
    { key: 'background', label: 'Backgrounds', emoji: '🖼️' },
    { key: 'dice', label: 'Dice', emoji: '🎲' },
    { key: 'avatar', label: 'Avatars', emoji: '👤' },
    { key: 'effect', label: 'Effects', emoji: '✨' }
  ];

  const addSampleItem = () => {
    const sampleItems = [
      {
        id: `item-${Date.now()}`,
        type: 'dice' as const,
        name: 'Golden Dice',
        description: 'A rare golden dice that brings luck',
        imageUrl: '/placeholder-item.svg',
        rarity: 'masterpiece' as const,
        acquiredAt: new Date(),
        equipped: false
      },
      {
        id: `item-${Date.now() + 1}`,
        type: 'avatar' as const,
        name: 'Knight Avatar',
        description: 'A brave knight ready for battle',
        imageUrl: '/placeholder-item.svg',
        rarity: 'epic' as const,
        acquiredAt: new Date(),
        equipped: false
      },
      {
        id: `item-${Date.now() + 2}`,
        type: 'effect' as const,
        name: 'Lightning Strike',
        description: 'Electrifying visual effect',
        imageUrl: '/placeholder-item.svg',
        rarity: 'rare' as const,
        acquiredAt: new Date(),
        equipped: false
      }
    ];

    const randomItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];
    addItem(randomItem);
  };

  const getFilterCount = (filterType: FilterType) => {
    if (filterType === 'all') return inventory.length;
    return inventory.filter(item => item.type === filterType).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-2">
            Manage your collection of {inventory.length} items
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Button onClick={addSampleItem} variant="outline" size="sm">
            + Add Sample Item
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((filterOption) => (
              <Button
                key={filterOption.key}
                variant={filter === filterOption.key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterOption.key)}
                className="flex items-center space-x-2"
              >
                <span>{filterOption.emoji}</span>
                <span>{filterOption.label}</span>
                <span className="bg-white bg-opacity-20 px-1.5 py-0.5 rounded text-xs">
                  {getFilterCount(filterOption.key)}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Background Selector */}
      {filter === 'all' || filter === 'background' ? (
        <div className="space-y-4">
          <BackgroundSelector />
        </div>
      ) : null}

      {/* Inventory Grid */}
      <InventoryGrid filter={filter} />

      {/* Empty State for New Users */}
      {inventory.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎁 Get Started with Your First Items!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Your inventory is empty. Here are some ways to get items:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Win games to earn random rewards</li>
                <li>• Complete daily challenges</li>
                <li>• Purchase items from the shop</li>
                <li>• Participate in special events</li>
              </ul>
              <div className="pt-4">
                <Button onClick={addSampleItem}>
                  Add Sample Item to Get Started
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
