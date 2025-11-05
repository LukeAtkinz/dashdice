/**
 * Score Saw Ability Component
 * Special UI for Score Saw's variable AURA cost selection
 */

import React, { useState } from 'react';

export interface ScoreSawProps {
  onUse: (auraCost: number) => void;
  disabled?: boolean;
  currentAura: number;
  className?: string;
}

const SCORE_SAW_OPTIONS = [
  {
    auraCost: 2,
    name: 'Light Cut',
    effect: 'Reduce opponent\'s turn score by 25%',
    risk: 'Low',
    color: 'bg-yellow-500',
    description: 'Safe disruption for minor interference'
  },
  {
    auraCost: 4,
    name: 'Deep Cut',
    effect: 'Reduce opponent\'s turn score by 50%',
    risk: 'Moderate',
    color: 'bg-orange-500',
    description: 'Significant damage to opponent\'s progress'
  },
  {
    auraCost: 6,
    name: 'Reset Cut',
    effect: 'Reset opponent\'s turn score to 0',
    risk: 'High',
    color: 'bg-red-500',
    description: 'Complete turn destruction - high stakes'
  },
  {
    auraCost: 10,
    name: 'Bank Devastation',
    effect: 'Remove 50% of opponent\'s banked score',
    risk: 'Very High',
    color: 'bg-purple-600',
    description: 'Game-changing bank attack - ultimate risk'
  }
];

export const ScoreSawComponent: React.FC<ScoreSawProps> = ({
  onUse,
  disabled = false,
  currentAura,
  className = ''
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleOptionSelect = (auraCost: number) => {
    if (currentAura >= auraCost && !disabled) {
      setSelectedOption(auraCost);
      setShowConfirmation(true);
    }
  };

  const handleConfirm = () => {
    if (selectedOption !== null) {
      onUse(selectedOption);
      setSelectedOption(null);
      setShowConfirmation(false);
    }
  };

  const handleCancel = () => {
    setSelectedOption(null);
    setShowConfirmation(false);
  };

  const selectedOptionData = SCORE_SAW_OPTIONS.find(opt => opt.auraCost === selectedOption);

  return (
    <div className={`score-saw-component ${className}`}>
      {/* Ability Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🪚</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Score Saw</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Channel AURA into devastating strikes • Current AURA: {currentAura}
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedOptionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Confirm Score Saw: {selectedOptionData.name}
            </h4>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">AURA Cost:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {selectedOptionData.auraCost}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Effect:</span>
                <span className="font-medium text-gray-900 dark:text-white text-right max-w-64">
                  {selectedOptionData.effect}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Risk Level:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${selectedOptionData.color}`}>
                  {selectedOptionData.risk}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Remaining AURA:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {currentAura - selectedOptionData.auraCost}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Backfire Risk:</strong> 15% chance that opponent recovers half damage and you lose 10% of your turn score.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
              >
                Execute Score Saw
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AURA Cost Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SCORE_SAW_OPTIONS.map((option) => {
          const canAfford = currentAura >= option.auraCost;
          const isSelected = selectedOption === option.auraCost;
          
          return (
            <button
              key={option.auraCost}
              onClick={() => handleOptionSelect(option.auraCost)}
              disabled={disabled || !canAfford}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${canAfford && !disabled
                  ? `border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer ${option.color} hover:opacity-90`
                  : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                }
                ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-lg">
                  {option.name}
                </span>
                <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded-full text-sm font-bold">
                  {option.auraCost} AURA
                </span>
              </div>
              
              <p className="text-white text-sm mb-2 opacity-90">
                {option.effect}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-white text-xs opacity-75">
                  {option.description}
                </span>
                <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded-full text-xs">
                  {option.risk} Risk
                </span>
              </div>
              
              {!canAfford && (
                <div className="mt-2 text-red-400 text-xs">
                  Need {option.auraCost - currentAura} more AURA
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Strategy Tips */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
          💡 Strategic Tips
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Use Light Cut early to disrupt opponent momentum</li>
          <li>• Deep Cut is perfect for mid-game score interference</li>
          <li>• Reset Cut best used when opponent has a high turn score</li>
          <li>• Bank Devastation is a late-game comeback mechanic</li>
          <li>• Higher costs = higher backfire risk - time carefully!</li>
        </ul>
      </div>

      {/* Lore */}
      <div className="mt-4 text-center">
        <p className="text-sm italic text-gray-600 dark:text-gray-400">
          "A well-timed strike can undo an empire built in a single turn. 
          Precision is everything — slice carefully, or bleed yourself dry."
        </p>
      </div>
    </div>
  );
};

export default ScoreSawComponent;