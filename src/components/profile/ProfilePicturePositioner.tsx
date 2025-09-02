'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Move, RotateCw, ZoomIn, ZoomOut, Save, X } from 'lucide-react';

interface ProfilePicturePositionerProps {
  imageUrl: string;
  onSave: (positioning: ImagePositioning) => void;
  onCancel: () => void;
  initialPosition?: ImagePositioning;
}

export interface ImagePositioning {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export const ProfilePicturePositioner: React.FC<ProfilePicturePositionerProps> = ({
  imageUrl,
  onSave,
  onCancel,
  initialPosition = { x: 0, y: 0, scale: 1, rotation: 0 }
}) => {
  const [position, setPosition] = useState<ImagePositioning>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  }, [position.x, position.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newX = e.clientX - dragStart.x - rect.left - centerX;
    const newY = e.clientY - dragStart.y - rect.top - centerY;

    // Limit movement within reasonable bounds
    const maxMove = 50;
    const clampedX = Math.max(-maxMove, Math.min(maxMove, newX));
    const clampedY = Math.max(-maxMove, Math.min(maxMove, newY));

    setPosition(prev => ({
      ...prev,
      x: clampedX,
      y: clampedY
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleScaleChange = (delta: number) => {
    setPosition(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2, prev.scale + delta))
    }));
  };

  const handleRotationChange = (delta: number) => {
    setPosition(prev => ({
      ...prev,
      rotation: (prev.rotation + delta) % 360
    }));
  };

  const handleSave = () => {
    onSave(position);
  };

  const handleReset = () => {
    setPosition({ x: 0, y: 0, scale: 1, rotation: 0 });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white font-[var(--font-audiowide)]">Position Profile Picture</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Preview Container */}
        <div className="mb-6">
          <div
            ref={containerRef}
            className="relative w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-700 border-2 border-gray-600"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Profile picture preview"
              className="absolute inset-0 w-full h-full object-cover select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${position.scale}) rotate(${position.rotation}deg)`,
                transformOrigin: 'center center'
              }}
              onMouseDown={handleMouseDown}
              draggable={false}
            />
          </div>
          <p className="text-center text-gray-400 text-sm mt-2 font-[var(--font-montserrat)]">
            Drag to reposition • Use controls below to adjust
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">
          {/* Position Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-[var(--font-montserrat)]">
              <Move className="w-4 h-4 inline mr-1" />
              Position
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPosition(prev => ({ ...prev, x: prev.x - 5 }))}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                ←
              </button>
              <button
                onClick={() => setPosition(prev => ({ ...prev, x: prev.x + 5 }))}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                →
              </button>
              <button
                onClick={() => setPosition(prev => ({ ...prev, y: prev.y - 5 }))}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                ↑
              </button>
              <button
                onClick={() => setPosition(prev => ({ ...prev, y: prev.y + 5 }))}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                ↓
              </button>
            </div>
          </div>

          {/* Scale Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-[var(--font-montserrat)]">
              Scale: {position.scale.toFixed(1)}x
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleScaleChange(-0.1)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                <ZoomOut className="w-3 h-3" />
                Smaller
              </button>
              <button
                onClick={() => handleScaleChange(0.1)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                <ZoomIn className="w-3 h-3" />
                Larger
              </button>
            </div>
          </div>

          {/* Rotation Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-[var(--font-montserrat)]">
              Rotation: {position.rotation}°
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleRotationChange(-15)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                <RotateCw className="w-3 h-3 transform scale-x-[-1]" />
                -15°
              </button>
              <button
                onClick={() => handleRotationChange(15)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors font-[var(--font-montserrat)]"
              >
                <RotateCw className="w-3 h-3" />
                +15°
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors font-[var(--font-montserrat)]"
          >
            Reset
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center font-[var(--font-montserrat)]"
          >
            Apply
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
