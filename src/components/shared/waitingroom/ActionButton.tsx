import React from 'react';

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant: 'ready' | 'leave' | 'primary';
  children: React.ReactNode;
  isMobile?: boolean;
  isScrolled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  onClick, 
  disabled = false, 
  loading = false,
  variant,
  children,
  isMobile = false,
  isScrolled = false
}) => {
  const getButtonStyles = () => {
    const baseStyles = {
      display: 'flex',
      padding: isMobile ? '15px 20px' : '20px',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      borderRadius: '18px',
      backdropFilter: 'blur(20px)',
      color: '#FFF',
      fontFamily: 'Audiowide',
      fontSize: isMobile ? '18px' : (variant === 'leave' ? '40px' : '36px'),
      fontStyle: 'normal',
      fontWeight: 400,
      lineHeight: '30px',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? (variant === 'leave' ? 0.5 : 0.7) : 1,
      textTransform: 'uppercase' as const,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      margin: isMobile ? (variant === 'leave' ? '0' : '10px 20px') : (variant === 'leave' ? 'auto' : '20px auto'),
      width: isMobile ? 'calc(100vw - 40px)' : 'auto'
    };

    // Variant-specific styles
    switch (variant) {
      case 'ready':
        return {
          ...baseStyles,
          background: loading ? '#666666' : '#00FF80',
          boxShadow: '0 4px 15px rgba(0, 255, 128, 0.4)'
        };
      
      case 'leave':
        return {
          ...baseStyles,
          background: disabled ? '#666666' : '#FF0080',
          position: isMobile ? 'fixed' as const : 'static' as const,
          bottom: isMobile ? (isScrolled ? '140px' : '0px') : 'auto',
          left: isMobile ? '20px' : 'auto',
          right: isMobile ? '20px' : 'auto',
          zIndex: isMobile ? 45 : 'auto',
          transform: isMobile ? 
            (isScrolled ? 'translateY(0) scale(1)' : 'translateY(calc(100% + 140px)) scale(0.95)') : 
            'none',
          animation: isMobile && isScrolled ? 'buttonPulse 2s infinite' : 'none',
          boxShadow: isMobile && isScrolled ? 
            '0 8px 25px rgba(255, 0, 128, 0.4), 0 0 40px rgba(255, 0, 128, 0.2)' : 
            '0 4px 15px rgba(0, 0, 0, 0.3)'
        };
      
      case 'primary':
      default:
        return {
          ...baseStyles,
          background: disabled ? '#666666' : '#0080FF',
          boxShadow: '0 4px 15px rgba(0, 128, 255, 0.3)'
        };
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    const button = e.currentTarget;
    
    switch (variant) {
      case 'ready':
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 10px 30px rgba(0, 255, 128, 0.5)';
        break;
      
      case 'leave':
        button.style.transform = isMobile ? 
          (isScrolled ? 'translateY(0) scale(1.03)' : 'translateY(calc(100% + 140px))') :
          'scale(1.05)';
        button.style.boxShadow = '0 10px 30px rgba(255, 0, 128, 0.5)';
        break;
      
      case 'primary':
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 10px 30px rgba(0, 128, 255, 0.5)';
        break;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    const button = e.currentTarget;
    
    switch (variant) {
      case 'ready':
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 15px rgba(0, 255, 128, 0.4)';
        break;
      
      case 'leave':
        button.style.transform = isMobile ? 
          (isScrolled ? 'translateY(0) scale(1)' : 'translateY(calc(100% + 140px))') :
          'scale(1)';
        button.style.boxShadow = isMobile && isScrolled ? 
          '0 8px 25px rgba(255, 0, 128, 0.4)' : 
          '0 4px 15px rgba(0, 0, 0, 0.3)';
        break;
      
      case 'primary':
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 15px rgba(0, 128, 255, 0.3)';
        break;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={getButtonStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
};

export default ActionButton;