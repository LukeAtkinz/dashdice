import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AuraCounterProps {
  auraValue: number;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  showIcon?: boolean;
}

export default function AuraCounter({ 
  auraValue, 
  className = '', 
  size = 'medium',
  showIcon = true 
}: AuraCounterProps) {
  const [previousValue, setPreviousValue] = useState(auraValue);
  const [shouldPop, setShouldPop] = useState(false);

  // Trigger pop animation when value increases
  useEffect(() => {
    if (auraValue > previousValue) {
      setShouldPop(true);
      setTimeout(() => setShouldPop(false), 300);
    }
    setPreviousValue(auraValue);
  }, [auraValue, previousValue]);

  // Size configurations - made bigger
  const sizeConfig = {
    small: {
      iconSize: 22,
      textSize: 'text-base',
      gap: 'gap-1'
    },
    medium: {
      iconSize: 32,
      textSize: 'text-xl',
      gap: 'gap-1'
    },
    large: {
      iconSize: 36,
      textSize: 'text-2xl',
      gap: 'gap-2'
    },
    'extra-large': {
      iconSize: 48,
      textSize: 'text-4xl',
      gap: 'gap-3'
    }
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={`flex items-center ${config.gap} md:bg-black md:rounded-lg md:px-4 md:py-2 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {showIcon && (
        <motion.div
          animate={{ 
            filter: [
              'drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))',
              'drop-shadow(0 0 12px rgba(139, 92, 246, 0.8))',
              'drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))'
            ]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Image 
            src="/Design Elements/aura.webp" 
            alt="Aura" 
            width={config.iconSize}
            height={config.iconSize}
            className="select-none"
          />
        </motion.div>
      )}
      
      <AnimatePresence mode="wait">
        <motion.span 
          key={auraValue} // This ensures the component re-renders when value changes
          className={`${config.textSize} font-bold text-white select-none`}
          style={{ 
            fontFamily: 'Audiowide',
            textShadow: '0 0 8px rgba(139, 92, 246, 0.8), 0 0 16px rgba(139, 92, 246, 0.4)',
            WebkitFontSmoothing: 'antialiased'
          }}
          initial={{ 
            scale: shouldPop ? 0.8 : 1,
            opacity: 0
          }}
          animate={{
            scale: shouldPop ? [1, 1.3, 1] : 1,
            opacity: 1,
            textShadow: auraValue > 0 ? [
              '0 0 8px rgba(139, 92, 246, 0.8), 0 0 16px rgba(139, 92, 246, 0.4)',
              '0 0 12px rgba(139, 92, 246, 1), 0 0 24px rgba(139, 92, 246, 0.6)',
              '0 0 8px rgba(139, 92, 246, 0.8), 0 0 16px rgba(139, 92, 246, 0.4)'
            ] : '0 0 4px rgba(139, 92, 246, 0.4)'
          }}
          exit={{ 
            scale: 0.8,
            opacity: 0
          }}
          transition={{ 
            scale: { duration: 0.3, ease: "easeOut" },
            opacity: { duration: 0.15 },
            textShadow: { 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          {auraValue}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}