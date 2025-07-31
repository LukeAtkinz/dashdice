import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete: () => void;
  isActive: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  initialSeconds,
  onComplete,
  isActive,
  size = 'medium',
  className = ''
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isActive) return;

    if (seconds <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, isActive, onComplete]);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-sm px-2 py-1';
      case 'large':
        return 'text-xl px-4 py-2';
      default:
        return 'text-base px-3 py-1.5';
    }
  };

  const getTimerColor = () => {
    if (seconds <= 3) return 'bg-red-600/30 border-red-500 text-red-400';
    if (seconds <= 5) return 'bg-yellow-600/30 border-yellow-500 text-yellow-400';
    return 'bg-blue-600/30 border-blue-500 text-blue-400';
  };

  if (!isActive) return null;

  return (
    <div 
      className={`inline-flex items-center justify-center rounded-lg border-2 backdrop-blur-sm font-bold ${getSizeClasses()} ${getTimerColor()} ${className}`}
      style={{ fontFamily: "Audiowide" }}
    >
      {seconds}
    </div>
  );
};
