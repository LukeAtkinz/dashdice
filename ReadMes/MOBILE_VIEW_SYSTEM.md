# 📱 DashDice Mobile View System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Mobile Architecture](#mobile-architecture)
3. [Responsive Design Patterns](#responsive-design-patterns)
4. [Touch Interaction System](#touch-interaction-system)
5. [Mobile Navigation](#mobile-navigation)
6. [Layout Adaptations](#layout-adaptations)
7. [Performance Optimizations](#performance-optimizations)
8. [Device Detection](#device-detection)
9. [Mobile-First Components](#mobile-first-components)
10. [Gesture Handling](#gesture-handling)
11. [Safe Area Management](#safe-area-management)
12. [Future Mobile Enhancements](#future-mobile-enhancements)

## System Overview

The DashDice Mobile View System provides a comprehensive, touch-optimized gaming experience designed specifically for mobile devices. Built with a mobile-first approach, the system adapts seamlessly across different screen sizes while maintaining the full functionality and visual appeal of the desktop version.

### Core Mobile Features
- **Responsive Layout**: Fluid grid system adapting from 320px to tablet sizes
- **Touch-Optimized Interface**: Large tap targets and gesture-friendly interactions
- **Bottom Navigation**: Mobile-native navigation pattern with fixed footer
- **Adaptive Typography**: Scalable text using clamp() and viewport units
- **Performance Optimized**: Lazy loading and reduced animations for mobile
- **Progressive Enhancement**: Core functionality works on all mobile browsers

### Mobile Breakpoint Strategy

```typescript
// Tailwind CSS Mobile Breakpoints
const breakpoints = {
  'mobile': '0px',        // 320px - 767px (mobile phones)
  'md': '768px',          // 768px - 1023px (tablets)
  'lg': '1024px',         // 1024px+ (desktop)
  'xl': '1280px',         // 1280px+ (large desktop)
};

// Responsive Classes Pattern
const responsiveClasses = {
  mobile: 'w-[90vw] h-[12rem] text-[2.5rem] p-[15px] gap-[8px]',
  tablet: 'md:w-[30rem] md:h-[15.625rem] md:text-[4rem] md:p-[20px] md:gap-[10px]'
};
```

## Mobile Architecture

### Component Hierarchy for Mobile

```
MobileApp/
├── SinglePageDashboard (Mobile Layout)
├── MobileNavigation (Bottom Fixed)
├── MobileContent (Scrollable)
├── MobileGameModes (Touch Cards)
├── MobileInventory (Grid Layout)
├── MobileProfile (Compact View)
└── MobileSettings (Touch-Friendly)
```

### State Management for Mobile

```typescript
interface MobileViewState {
  isMobile: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  touchSupport: boolean;
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop';
}

const useMobileView = () => {
  const [viewState, setViewState] = useState<MobileViewState>({
    isMobile: false,
    orientation: 'portrait',
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    touchSupport: false,
    currentBreakpoint: 'desktop'
  });

  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      const hasTouch = 'ontouchstart' in window;
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      
      setViewState(prev => ({
        ...prev,
        isMobile,
        touchSupport: hasTouch,
        orientation,
        currentBreakpoint: isMobile ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
      }));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return viewState;
};
```

## Responsive Design Patterns

### Mobile Game Mode Cards

```typescript
// Game Mode Component with Mobile Adaptations
export const MobileGameModeCard: React.FC<GameModeProps> = ({ mode, config, onAction }) => {
  const { isMobile } = useMobileView();
  
  return (
    <motion.div
      className={`
        h-[12rem] md:h-[15.625rem] 
        w-[90vw] md:w-[30rem] 
        rounded-[30px] overflow-hidden shrink-0 
        flex flex-row items-center justify-start 
        relative text-right 
        text-[2.5rem] md:text-[4rem] 
        text-gainsboro font-audiowide 
        cursor-pointer transition-all duration-300
      `}
      style={{
        background: `var(--ui-game-mode-bg, linear-gradient(rgba(37, 37, 37, 0.12), rgba(37, 37, 37, 0.12)), linear-gradient(242.59deg, #192e39 30%, rgba(153, 153, 153, 0)))`
      }}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: isMobile ? 1 : 1.02 }}
    >
      {/* Mobile-Optimized Content */}
      <div className="w-full h-full flex flex-col justify-center items-center gap-[8px] md:gap-[10px] p-[15px] md:p-[20px] animate-fade-in">
        {/* Touch-Friendly Action Buttons */}
        <button
          onClick={() => onAction(mode, 'live')}
          className="w-full flex flex-col justify-center items-center hover:scale-105 active:scale-95 transition-all duration-300"
          style={{
            borderRadius: '30px',
            background: 'var(--ui-background-container)',
            height: isMobile ? '60px' : '80px',
            minHeight: '44px', // iOS touch target minimum
            border: 0,
            boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
          }}
        >
          <span
            className="text-[20px] md:text-[28px] leading-[24px] md:leading-[40px]"
            style={{
              color: '#E2E2E2',
              textAlign: 'center',
              fontFamily: 'Audiowide',
              fontWeight: 400,
              textTransform: 'uppercase',
            }}
          >
            JOIN LIVE
          </span>
        </button>

        {/* Secondary Action for Mobile */}
        <button
          onClick={() => onAction(mode, 'custom')}
          className="w-full flex flex-col justify-center items-center hover:scale-105 active:scale-95 transition-all duration-300"
          style={{
            borderRadius: '30px',
            background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
            height: isMobile ? '50px' : '70px',
            minHeight: '44px',
            border: 0
          }}
        >
          <span
            className="text-[16px] md:text-[24px] leading-[20px] md:leading-[32px]"
            style={{
              color: '#E2E2E2',
              textAlign: 'center',
              fontFamily: 'Audiowide',
              fontWeight: 400,
              textTransform: 'uppercase',
            }}
          >
            CUSTOM GAME
          </span>
        </button>
      </div>

      {/* Mobile-Adapted Game Mode Info */}
      <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[1rem] md:px-[2.25rem] z-[0] transition-all duration-300">
        <h2
          className="m-0 self-stretch relative text-white uppercase font-normal text-[40px] md:text-[72px] leading-[38px] md:leading-[68px]"
          style={{
            color: "#FFF",
            fontFamily: "Audiowide",
            fontWeight: 400,
          }}
        >
          {config.name}
        </h2>
        
        <div
          className="w-[50%] relative font-light inline-block text-[14px] md:text-[24px] leading-[14px] md:leading-[24px]"
          style={{
            color: "#FFF",
            fontFamily: "Montserrat",
            fontWeight: 300,
            textTransform: "uppercase",
            textAlign: "right",
            opacity: 0.8,
          }}
        >
          {config.description}
        </div>
      </div>

      {/* Mobile-Scaled Icon */}
      <img
        className="w-[15rem] md:w-[25.256rem] absolute max-h-none object-contain z-[1] transition-all duration-300"
        style={{
          top: config.position.top,
          left: config.position.left,
          transform: `rotate(${config.rotation})`,
          opacity: 0.8
        }}
        alt={config.name}
        src={config.icon}
      />
    </motion.div>
  );
};
```

### Mobile Container Layout

```typescript
// Main Container with Mobile-First Responsive Design
export const MobileContainer: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div className="w-[100%] overflow-hidden flex flex-row items-center justify-center flex-wrap content-center gap-x-[0.5rem] md:gap-x-[0.687rem] gap-y-[0.5rem] md:gap-y-[0.625rem] px-[1rem] md:px-[2rem]">
      {children}
    </div>
  );
};
```

## Touch Interaction System

### Touch Event Handling

```typescript
interface TouchInteractionProps {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const useTouchInteractions = (props: TouchInteractionProps) => {
  const [touchStart, setTouchStart] = useState<Touch | null>(null);
  const [touchEnd, setTouchEnd] = useState<Touch | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart(touch);
    setTouchEnd(null);

    // Long press detection
    if (props.onLongPress) {
      const timer = setTimeout(() => {
        props.onLongPress!();
      }, 500);
      setLongPressTimer(timer);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd(touch);

    // Cancel long press if finger moves
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!touchStart || !touchEnd) {
      // Single tap
      const now = Date.now();
      const timeDiff = now - lastTap;
      
      if (timeDiff < 300 && timeDiff > 0) {
        // Double tap
        props.onDoubleTap?.();
        setLastTap(0);
      } else {
        // Single tap
        props.onTap?.();
        setLastTap(now);
      }
      return;
    }

    // Swipe detection
    const deltaX = touchEnd.clientX - touchStart.clientX;
    const deltaY = touchEnd.clientY - touchStart.clientY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) > 50) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          props.onSwipeRight?.();
        } else {
          props.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          props.onSwipeDown?.();
        } else {
          props.onSwipeUp?.();
        }
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
```

### Touch-Optimized Button Component

```typescript
interface TouchButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  hapticFeedback?: boolean;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  size = 'md',
  variant = 'primary',
  disabled = false,
  hapticFeedback = true
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const sizeClasses = {
    sm: 'min-h-[36px] px-4 py-2 text-sm',
    md: 'min-h-[44px] px-6 py-3 text-base',
    lg: 'min-h-[56px] px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  const handleTouchStart = () => {
    if (disabled) return;
    setIsPressed(true);
    
    // Haptic feedback on supported devices
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-xl font-bold transition-all transform
        active:scale-95 select-none
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      disabled={disabled}
      style={{
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {children}
    </button>
  );
};
```

## Mobile Navigation

### Bottom Navigation System

```typescript
interface MobileNavigationItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  disabled?: boolean;
}

export const MobileBottomNavigation: React.FC = () => {
  const { currentSection, setCurrentSection } = useNavigation();
  const { totalUnreadCount } = useFriendNotifications();

  const navigationItems: MobileNavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: '🏠',
    },
    {
      id: 'match',
      label: 'Play',
      icon: '🎲',
    },
    {
      id: 'inventory',
      label: 'Vault',
      icon: '🎒',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
      badge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
    }
  ];

  return (
    <footer 
      className="md:hidden fixed bottom-0 left-0 right-0 w-full flex flex-row items-center justify-center py-[0.75rem] px-[1rem] z-50"
      style={{ 
        background: "var(--ui-navbar-bg)",
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="flex flex-row items-center justify-between w-full max-w-md">
        {navigationItems.map((item) => {
          const isActive = currentSection === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => !item.disabled && setCurrentSection(item.id as any)}
              className={`
                flex flex-col items-center justify-center 
                min-w-[60px] min-h-[60px] 
                rounded-[16px] cursor-pointer 
                transition-all duration-200
                ${item.disabled ? 'opacity-50' : 'opacity-100'}
              `}
              style={{
                background: isActive ? 'rgba(255, 0, 128, 0.2)' : 'transparent',
                border: isActive ? '2px solid #FF0080' : '2px solid transparent',
              }}
              whileTap={{ scale: 0.9 }}
              disabled={item.disabled}
            >
              {/* Icon with Badge */}
              <div className="relative">
                <span className="text-2xl mb-1">{item.icon}</span>
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              
              {/* Label */}
              <span
                className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}
                style={{
                  fontFamily: 'Audiowide',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </footer>
  );
};
```

### Mobile Header Navigation

```typescript
export const MobileHeader: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentSection } = useNavigation();
  const [userGold, setUserGold] = useState(0);

  return (
    <header className="flex-shrink-0 w-full flex flex-row items-center justify-center gap-[1.25rem] relative z-30 px-[1rem] md:px-[4rem] py-[1rem] md:py-[2rem]">
      <div 
        className="flex-1 flex flex-row items-center justify-between rounded-[30px] px-[20px] md:px-[30px] py-[15px] w-full max-w-none" 
        style={{ background: "var(--ui-navbar-bg)" }}
      >
        {/* Logo and Title */}
        <div className="flex flex-row items-center justify-start gap-[1rem] md:gap-[2rem]">
          <div className="flex flex-row items-center justify-start gap-[0.75rem]">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-8 h-8 md:w-14 md:h-14"
              style={{ background: "transparent" }}
            >
              <source src="/Design Elements/logo.webm.mp4" type="video/mp4" />
            </video>
            <div
              onClick={() => setCurrentSection('dashboard')}
              className="relative text-2xl md:text-4xl bg-gradient-to-br from-[#ffd700] to-[#ffed4e] bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                fontFamily: "Audiowide",
                fontWeight: 400,
                lineHeight: "1.2",
              }}
            >
              DashDice
            </div>
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-[12px]">
          {/* Gold Display - Compact for Mobile */}
          <div
            className="flex flex-row items-center justify-start gap-[8px] cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
            style={{
              display: "flex",
              height: "44px",
              padding: "8px 12px",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "18px",
              background: "#FF0080",
              backdropFilter: "blur(20px)",
            }}
          >
            <img
              className="w-5 h-5 object-contain shrink-0"
              alt="Gold"
              src="/Design Elements/Game Coins.webp"
            />
            <div
              className="text-sm font-medium"
              style={{
                color: "#FFF",
                fontFamily: "Audiowide",
                fontSize: "16px",
                fontWeight: 400,
                textTransform: "uppercase",
              }}
            >
              {userGold?.toLocaleString() || 0}
            </div>
          </div>

          {/* Profile Button - Mobile Size */}
          <button
            onClick={() => setCurrentSection('profile')}
            className="flex flex-row items-center justify-between rounded-[30px] px-[8px] py-[8px] cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              background: "linear-gradient(0deg, rgba(37, 37, 37, 0.12) 0%, rgba(37, 37, 37, 0.12) 100%), linear-gradient(243deg, #1929B7 25.17%, rgba(153, 153, 153, 0.00) 109.89%)",
              border: "0px",
            }}
          >
            <img
              className="object-cover rounded-full"
              style={{
                width: "32px",
                height: "32px",
                flexShrink: 0,
                aspectRatio: "1/1"
              }}
              alt="Profile"
              src="/Design Elements/Delivery Man.webp"
            />
            <span
              className="hidden md:inline ml-2"
              style={{
                color: "#FFF",
                fontFamily: "Audiowide",
                fontSize: "18px",
                fontWeight: 400,
              }}
            >
              PROFILE
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
```

## Layout Adaptations

### Mobile Content Container

```typescript
export const MobileContentContainer: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <main 
      className="flex-1 w-full flex items-start justify-center min-h-0 overflow-auto pb-[8rem] md:pb-0" 
      style={{ 
        paddingBottom: 'max(6rem, env(safe-area-inset-bottom) + 6rem)' // Safe area for mobile
      }}
    >
      <div className="w-full max-w-[100rem] flex flex-col items-center justify-center gap-[2rem] py-[2rem] px-[1rem] md:px-[2rem] pr-[1rem] md:pr-[2rem]">
        {children}
      </div>
    </main>
  );
};
```

### Mobile Inventory Grid

```typescript
export const MobileInventoryGrid: React.FC<{items: InventoryItem[]}> = ({ items }) => {
  const { loading, error } = useInventory();

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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <MobileInventoryCard key={item.id} item={item} />
      ))}
    </div>
  );
};

const MobileInventoryCard: React.FC<{item: InventoryItem}> = ({ item }) => {
  const { equipItem, unequipItem } = useInventory();

  return (
    <Card 
      className={`
        transition-all duration-200 hover:shadow-md 
        ${getRarityColor(item.rarity)} 
        ${item.equipped ? 'ring-2 ring-blue-500' : ''}
      `}
      padding="sm"
    >
      <CardContent>
        <div className="relative">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-20 md:h-24 object-cover rounded mb-2"
            loading="lazy"
          />
          {item.equipped && (
            <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              ✓
            </div>
          )}
        </div>
        
        <h3 className="font-medium text-sm text-gray-900 mb-1 truncate">
          {item.name}
        </h3>
        
        <p className="text-xs text-gray-500 mb-2 capitalize">
          {item.rarity} {item.type}
        </p>

        <TouchButton
          size="sm"
          variant={item.equipped ? 'secondary' : 'primary'}
          onClick={() => item.equipped ? unequipItem(item.id) : equipItem(item.id)}
        >
          {item.equipped ? 'Unequip' : 'Equip'}
        </TouchButton>
      </CardContent>
    </Card>
  );
};
```

## Performance Optimizations

### Mobile-Specific Performance

```typescript
const useMobilePerformance = () => {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast'>('fast');

  useEffect(() => {
    // Detect low-end devices
    const navigator = window.navigator as any;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = navigator.deviceMemory || 2;
    
    const isLowEnd = hardwareConcurrency <= 2 || deviceMemory <= 2;
    setIsLowEndDevice(isLowEnd);

    // Detect connection speed
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      setConnectionSpeed(['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast');
    }
  }, []);

  return { isLowEndDevice, connectionSpeed };
};

// Mobile-optimized component with performance adaptations
export const MobileOptimizedComponent: React.FC = () => {
  const { isLowEndDevice, connectionSpeed } = useMobilePerformance();
  
  const animationConfig = {
    duration: isLowEndDevice ? 0.2 : 0.3,
    ease: isLowEndDevice ? "linear" : "easeOut"
  };

  const shouldReduceMotion = isLowEndDevice || 
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={animationConfig}
    >
      {/* Content optimized for mobile performance */}
    </motion.div>
  );
};
```

### Lazy Loading for Mobile

```typescript
const useLazyLoading = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  const loadImage = useCallback((src: string) => {
    if (!loadedImages.has(src)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, src]));
      };
    }
  }, [loadedImages]);

  return { loadedImages, loadImage };
};

// Progressive image loading for mobile
export const MobileLazyImage: React.FC<{src: string, alt: string, className?: string}> = ({ 
  src, 
  alt, 
  className 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Start loading before fully visible
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`${className} bg-gray-200 rounded`}>
      {inView && (
        <img
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
      {!isLoaded && inView && (
        <div className="animate-pulse bg-gray-300 w-full h-full rounded"></div>
      )}
    </div>
  );
};
```

## Device Detection

### Comprehensive Mobile Detection

```typescript
interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  browserName: string;
  viewport: {
    width: number;
    height: number;
  };
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    isIOS: false,
    isAndroid: false,
    browserName: 'unknown',
    viewport: { width: 0, height: 0 },
    orientation: 'landscape',
    pixelRatio: 1
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      const orientation = height > width ? 'portrait' : 'landscape';
      const pixelRatio = window.devicePixelRatio || 1;

      // Browser detection
      let browserName = 'unknown';
      if (userAgent.includes('Chrome')) browserName = 'chrome';
      else if (userAgent.includes('Firefox')) browserName = 'firefox';
      else if (userAgent.includes('Safari')) browserName = 'safari';
      else if (userAgent.includes('Edge')) browserName = 'edge';

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        isIOS,
        isAndroid,
        browserName,
        viewport: { width, height },
        orientation,
        pixelRatio
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

// Usage in components
export const AdaptiveComponent: React.FC = () => {
  const device = useDeviceDetection();
  
  if (device.isMobile) {
    return <MobileView />;
  } else if (device.isTablet) {
    return <TabletView />;
  } else {
    return <DesktopView />;
  }
};
```

## Mobile-First Components

### Adaptive Typography

```typescript
const useAdaptiveTypography = () => {
  const device = useDeviceDetection();
  
  const getTypographyClasses = (element: 'h1' | 'h2' | 'h3' | 'body' | 'caption') => {
    const scales = {
      h1: {
        mobile: 'text-2xl leading-8',
        tablet: 'text-4xl leading-10',
        desktop: 'text-6xl leading-12'
      },
      h2: {
        mobile: 'text-xl leading-6',
        tablet: 'text-3xl leading-8',
        desktop: 'text-5xl leading-10'
      },
      h3: {
        mobile: 'text-lg leading-5',
        tablet: 'text-2xl leading-7',
        desktop: 'text-4xl leading-9'
      },
      body: {
        mobile: 'text-sm leading-4',
        tablet: 'text-base leading-5',
        desktop: 'text-lg leading-6'
      },
      caption: {
        mobile: 'text-xs leading-3',
        tablet: 'text-sm leading-4',
        desktop: 'text-base leading-5'
      }
    };

    if (device.isMobile) return scales[element].mobile;
    if (device.isTablet) return scales[element].tablet;
    return scales[element].desktop;
  };

  return { getTypographyClasses };
};
```

### Mobile Match Summary

```typescript
export const MobileMatchSummary: React.FC<MatchSummaryProps> = ({ matchData, onLeaveMatch }) => {
  const device = useDeviceDetection();
  const winner = matchData.gameData.winner;
  const isWinner = winner === matchData.currentPlayer.playerDisplayName;

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Mobile-Optimized Results */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div
          className="text-6xl md:text-8xl font-bold mb-4"
          style={{
            color: isWinner ? '#FFD700' : '#FF6B6B',
            fontFamily: 'Audiowide',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
          }}
        >
          {isWinner ? 'VICTORY!' : 'DEFEAT'}
        </div>
        
        <div className="text-white text-lg md:text-2xl mb-4" style={{ fontFamily: 'Montserrat' }}>
          {winner} wins the match!
        </div>

        {/* Mobile Score Display */}
        <div className="bg-black/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="text-white text-xl font-bold mb-2">Final Score</div>
          <div className="flex justify-center items-center gap-4">
            {Object.entries(matchData.gameData.players).map(([name, data]) => (
              <div key={name} className="text-center">
                <div className="text-lg font-bold">{name}</div>
                <div className="text-2xl font-bold" style={{ color: name === winner ? '#FFD700' : '#FFFFFF' }}>
                  {data.bankedScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Mobile Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="flex flex-col gap-4 w-full max-w-sm"
      >
        <TouchButton
          onClick={onLeaveMatch}
          size="lg"
          variant="primary"
        >
          BACK TO DASHBOARD
        </TouchButton>
        
        <TouchButton
          onClick={() => {/* Rematch logic */}}
          size="lg"
          variant="secondary"
        >
          REQUEST REMATCH
        </TouchButton>
      </motion.div>
    </div>
  );
};
```

## Gesture Handling

### Swipe Navigation

```typescript
const useSwipeNavigation = () => {
  const { currentSection, setCurrentSection } = useNavigation();
  
  const sections = ['dashboard', 'match', 'inventory', 'profile', 'settings'];
  const currentIndex = sections.indexOf(currentSection);

  const handleSwipeLeft = () => {
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1] as any);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1] as any);
    }
  };

  return { handleSwipeLeft, handleSwipeRight };
};

// Swipe-enabled container
export const SwipeContainer: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { handleSwipeLeft, handleSwipeRight } = useSwipeNavigation();
  const touchInteractions = useTouchInteractions({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight
  });

  return (
    <div
      className="w-full h-full"
      {...touchInteractions}
      style={{ touchAction: 'pan-y' }} // Allow vertical scrolling
    >
      {children}
    </div>
  );
};
```

## Safe Area Management

### iOS Safe Area Handling

```typescript
const useSafeArea = () => {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computed = getComputedStyle(document.documentElement);
      
      setSafeAreaInsets({
        top: parseInt(computed.getPropertyValue('--safe-area-inset-top') || '0'),
        right: parseInt(computed.getPropertyValue('--safe-area-inset-right') || '0'),
        bottom: parseInt(computed.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computed.getPropertyValue('--safe-area-inset-left') || '0')
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeAreaInsets;
};

// Safe area aware layout
export const SafeAreaLayout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const safeArea = useSafeArea();

  return (
    <div 
      className="min-h-screen w-full"
      style={{
        paddingTop: safeArea.top,
        paddingRight: safeArea.right,
        paddingBottom: safeArea.bottom,
        paddingLeft: safeArea.left
      }}
    >
      {children}
    </div>
  );
};
```

## Future Mobile Enhancements

### Planned Mobile Features

#### Progressive Web App (PWA)
```typescript
// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    console.log('SW registered: ', registration);
  }).catch((registrationError) => {
    console.log('SW registration failed: ', registrationError);
  });
}

// App Install Prompt
const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return { isInstallable, installApp };
};
```

#### Advanced Touch Gestures
```typescript
// Multi-touch support for future features
const useMultiTouch = () => {
  const [touches, setTouches] = useState<Touch[]>([]);
  const [gestureState, setGestureState] = useState<'none' | 'pinch' | 'rotate'>('none');

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouches(Array.from(e.touches));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentTouches = Array.from(e.touches);
    setTouches(currentTouches);

    if (currentTouches.length === 2) {
      // Detect pinch/zoom or rotation gestures
      const touch1 = currentTouches[0];
      const touch2 = currentTouches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // Future: Implement pinch-to-zoom for game board
      // Future: Implement rotation for dice rolling
    }
  };

  return {
    touches,
    gestureState,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove
  };
};
```

#### Voice Commands
```typescript
// Voice control for accessibility
const useVoiceCommands = () => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const rec = new SpeechRecognition();
      
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        handleVoiceCommand(command);
      };

      setRecognition(rec);
    }
  }, []);

  const handleVoiceCommand = (command: string) => {
    if (command.includes('roll dice')) {
      // Future: Voice-activated dice rolling
    } else if (command.includes('bank points')) {
      // Future: Voice banking
    } else if (command.includes('go to dashboard')) {
      // Navigation commands
    }
  };

  const startListening = () => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  return { isListening, startListening, stopListening };
};
```

---

## Conclusion

The DashDice Mobile View System provides a comprehensive, touch-optimized gaming experience that adapts seamlessly across mobile devices. Built with performance, accessibility, and user experience as core priorities, the system ensures that mobile players enjoy the full DashDice experience with optimized interactions, responsive layouts, and mobile-native patterns.

### Key Mobile Strengths:
- **Touch-First Design**: Optimized for finger navigation and gesture interactions
- **Performance Focused**: Adaptive rendering based on device capabilities
- **Safe Area Aware**: Proper handling of notches and safe areas on modern devices
- **Progressive Enhancement**: Core functionality works across all mobile browsers
- **Future Ready**: Architected for PWA, voice commands, and advanced gestures

The mobile system seamlessly integrates with the desktop experience while providing mobile-specific optimizations and patterns that make DashDice a premier mobile gaming platform.
