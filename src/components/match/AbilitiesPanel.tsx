'use client';

import React from 'react';

interface AbilitiesPanelProps {
  onAbilityUse?: (abilityId: string) => void;
  abilities?: any[];
  disabled?: boolean;
}

export default function AbilitiesPanel({ onAbilityUse, abilities = [], disabled = true }: AbilitiesPanelProps) {
  if (disabled) {
    return (
      <div className="fixed bottom-4 left-4 bg-gray-800/90 rounded-lg p-4 border border-gray-600 backdrop-blur-sm">
        <div className="text-center text-gray-400">
          <div className="text-2xl mb-2">⚡</div>
          <p className="text-sm">Abilities disabled temporarily</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800/90 rounded-lg p-4 border border-gray-600 backdrop-blur-sm">
      <div className="text-center text-gray-400">
        <div className="text-2xl mb-2">⚡</div>
        <p className="text-sm">No abilities available</p>
      </div>
    </div>
  );
}