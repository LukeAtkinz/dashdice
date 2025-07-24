'use client';

import React from 'react';
import { useInventory } from '@/context/InventoryContext';
import { InventoryItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface InventoryGridProps {
  filter?: 'all' | 'background' | 'dice' | 'avatar' | 'effect';
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({ filter = 'all' }) => {
  const { inventory, loading, equipItem, unequipItem } = useInventory();

  const filteredInventory = filter === 'all' 
    ? inventory 
    : inventory.filter(item => item.type === filter);

  const handleToggleEquip = async (item: InventoryItem) => {
    try {
      if (item.equipped) {
        await unequipItem(item.id);
      } else {
        await equipItem(item.id);
      }
    } catch (error) {
      console.error('Error toggling item equip status:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse" padding="sm">
            <CardContent>
              <div className="h-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredInventory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">No items found</div>
        <div className="text-gray-400 text-sm">
          {filter === 'all' 
            ? 'Your inventory is empty. Play games to earn items!' 
            : `No ${filter} items in your inventory.`
          }
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredInventory.map((item) => (
        <Card 
          key={item.id} 
          className={`transition-all duration-200 hover:shadow-md ${getRarityColor(item.rarity)} ${
            item.equipped ? 'ring-2 ring-blue-500' : ''
          }`}
          padding="sm"
        >
          <CardContent>
            <div className="relative">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-24 object-cover rounded mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-item.svg';
                }}
              />
              {item.equipped && (
                <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Equipped
                </div>
              )}
            </div>
            
            <h3 className="font-medium text-sm text-gray-900 mb-1 truncate">
              {item.name}
            </h3>
            
            <p className="text-xs text-gray-500 mb-2 capitalize">
              {item.rarity} {item.type}
            </p>
            
            {item.description && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {item.description}
              </p>
            )}

            <Button
              size="sm"
              variant={item.equipped ? 'secondary' : 'primary'}
              className="w-full text-xs"
              onClick={() => handleToggleEquip(item)}
            >
              {item.equipped ? 'Unequip' : 'Equip'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
