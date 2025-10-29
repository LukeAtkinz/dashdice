import { motion } from 'framer-motion';
import Image from 'next/image';

interface AuraCounterProps {
  auraValue: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export default function AuraCounter({ 
  auraValue, 
  className = '', 
  size = 'medium',
  showIcon = true 
}: AuraCounterProps) {
  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 16,
      textSize: 'text-sm',
      gap: 'gap-1'
    },
    medium: {
      iconSize: 20,
      textSize: 'text-base',
      gap: 'gap-2'
    },
    large: {
      iconSize: 24,
      textSize: 'text-lg',
      gap: 'gap-2'
    }
  };

  const config = sizeConfig[size];

  return (
    <motion.div 
      className={`flex items-center ${config.gap} ${className}`}
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
      
      <motion.span 
        className={`${config.textSize} font-bold text-white select-none`}
        style={{ 
          fontFamily: 'Audiowide',
          textShadow: '0 0 8px rgba(139, 92, 246, 0.8), 0 0 16px rgba(139, 92, 246, 0.4)',
          WebkitFontSmoothing: 'antialiased'
        }}
        animate={{
          textShadow: auraValue > 0 ? [
            '0 0 8px rgba(139, 92, 246, 0.8), 0 0 16px rgba(139, 92, 246, 0.4)',
            '0 0 12px rgba(139, 92, 246, 1), 0 0 24px rgba(139, 92, 246, 0.6)',
            '0 0 8px rgba(139, 92, 246, 0.8), 0 0 16px rgba(139, 92, 246, 0.4)'
          ] : '0 0 4px rgba(139, 92, 246, 0.4)'
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {auraValue}
      </motion.span>
    </motion.div>
  );
}