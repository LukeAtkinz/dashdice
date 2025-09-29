'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import UnifiedChatWindow from '@/components/chat/UnifiedChatWindow';
import { useAuth } from '@/context/AuthContext';

interface SwipeUpChatProps {
  children: React.ReactNode;
}

export default function SwipeUpChat({ children }: SwipeUpChatProps) {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const chatControls = useAnimation();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Don't render chat for guests (non-authenticated users)
  if (!user) {
    return <>{children}</>;
  }

  useEffect(() => {
    const updateScreenHeight = () => {
      setScreenHeight(window.innerHeight);
    };
    
    updateScreenHeight();
    window.addEventListener('resize', updateScreenHeight);
    
    return () => window.removeEventListener('resize', updateScreenHeight);
  }, []);

  const handlePanStart = (event: any, info: PanInfo) => {
    // Only start drag from bottom 40% of screen for easier mobile access
    const bottomThreshold = screenHeight * 0.6;
    if (info.point.y < bottomThreshold) return;
    
    // Prevent default to avoid scroll interference on mobile
    event.preventDefault?.();
    
    setIsDragging(true);
    console.log('🚀 Swipe gesture started from bottom 40%', {
      startY: info.point.y,
      threshold: bottomThreshold,
      screenHeight
    });
  };

  const handlePan = (event: any, info: PanInfo) => {
    if (!isDragging) return;

    // Prevent default to avoid interference with mobile scrolling
    event.preventDefault?.();

    // Calculate drag progress (0 = closed, 1 = fully open)
    // Only consider upward swipes (negative offset.y)
    const dragDistance = Math.abs(Math.min(info.offset.y, 0));
    const maxDrag = screenHeight * 0.25; // Reduced for more responsive feel
    const progress = Math.min(dragDistance / maxDrag, 1);
    
    setDragProgress(progress);
    
    // Animate chat window based on drag with immediate response
    chatControls.start({
      y: `${100 - (progress * 100)}%`,
      opacity: progress * 0.9 + 0.1,
      transition: { type: "tween", duration: 0.02 } // Ultra-fast response
    });
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    if (!isDragging) return;

    setIsDragging(false);
    
    // Determine if we should snap to open or closed with more sensitive thresholds
    const velocity = info.velocity.y;
    const dragDistance = Math.abs(Math.min(info.offset.y, 0)); // Only count upward movement
    const threshold = screenHeight * 0.05; // Much lower threshold for easier trigger
    
    // More sensitive velocity threshold for iPhone-like responsiveness
    const shouldOpen = dragDistance > threshold || velocity < -200; // Even more sensitive
    
    console.log('📱 Pan end decision:', {
      dragDistance,
      threshold,
      velocity,
      shouldOpen,
      dragProgress
    });
    
    if (shouldOpen) {
      // Snap to open position with bouncy spring animation
      setIsChatOpen(true);
      setDragProgress(1);
      chatControls.start({
        y: '0%',
        opacity: 1,
        transition: { 
          type: "spring", 
          damping: 15, // Reduced damping for more bounce
          stiffness: 500, // Increased stiffness for snappier response
          duration: 0.25 // Reduced duration
        }
      });
      console.log('📱 Chat snapped open');
    } else {
      // Snap to closed position
      setIsChatOpen(false);
      setDragProgress(0);
      chatControls.start({
        y: '100%',
        opacity: 0,
        transition: { 
          type: "spring", 
          damping: 15, 
          stiffness: 500,
          duration: 0.15 // Faster close animation
        }
      });
      console.log('📱 Chat snapped closed');
    }
  };

  const closeChatWindow = () => {
    setIsChatOpen(false);
    setDragProgress(0);
    chatControls.start({
      y: '100%',
      opacity: 0,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 400,
        duration: 0.25 
      }
    });
  };

  const openChatWindow = () => {
    setIsChatOpen(true);
    setDragProgress(1);
    chatControls.start({
      y: '0%',
      opacity: 1,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 400,
        duration: 0.3 
      }
    });
  };

  return (
    <>
      {/* Main Content with Swipe Detection Overlay */}
      <motion.div
        className="relative w-full h-full"
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{ 
          touchAction: 'pan-y',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        {children}
        
        {/* Enhanced swipe detection area in bottom 40% for easier mobile access */}
        <div
          className="fixed bottom-0 left-0 right-0 pointer-events-auto z-10"
          style={{ 
            height: '40vh',
            background: 'transparent'
          }}
          onTouchStart={(e) => {
            // Improve touch responsiveness on mobile
            console.log('👆 Touch start detected in swipe area');
          }}
        />
      </motion.div>

      {/* Chat Window Overlay */}
      <motion.div
        ref={overlayRef}
        initial={{ y: '100%', opacity: 0 }}
        animate={chatControls}
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ 
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div 
          className="absolute inset-0 pointer-events-auto"
          onClick={closeChatWindow}
        />
        
        {/* Chat Content Container */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-700 pointer-events-auto"
          style={{ 
            height: '80vh',
            minHeight: '400px',
            maxHeight: '80vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <div className="flex justify-center py-2 bg-gray-800 rounded-t-2xl">
            <div className="w-12 h-1 bg-gray-600 rounded-full" />
          </div>
          
          {/* Chat Window */}
          <div className="h-full pb-2">
            <UnifiedChatWindow
              isVisible={true}
              onToggle={closeChatWindow}
              position="bottom-left"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Swipe Up Indicator (only show when not dragging and chat is closed) */}
      {!isChatOpen && !isDragging && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
        >
          <motion.div
            animate={{ 
              y: [0, -12, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ 
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-blue-600/90 text-white px-6 py-3 rounded-full text-sm font-medium backdrop-blur-sm border border-blue-500/60 shadow-lg"
            style={{ fontFamily: "Audiowide" }}
          >
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-center">
                <div className="text-lg">↑</div>
                <div className="text-xs opacity-80">Swipe</div>
              </div>
              <span>Chat</span>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Additional swipe area indicator (bottom edge) */}
      {!isChatOpen && !isDragging && (
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-blue-500/30 to-transparent z-30 pointer-events-none" />
      )}
    </>
  );
}