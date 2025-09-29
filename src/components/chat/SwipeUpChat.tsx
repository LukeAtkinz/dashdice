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
    // Only start drag from bottom 30% of screen (increased from 25% for easier access)
    const bottomThreshold = screenHeight * 0.7;
    if (info.point.y < bottomThreshold) return;
    
    setIsDragging(true);
    console.log('🚀 Swipe gesture started from bottom 30%');
  };

  const handlePan = (event: any, info: PanInfo) => {
    if (!isDragging) return;

    // Calculate drag progress (0 = closed, 1 = fully open)
    const dragDistance = Math.abs(info.offset.y);
    const maxDrag = screenHeight * 0.3; // Reduced from 50% to 30% for more responsive feel
    const progress = Math.min(dragDistance / maxDrag, 1);
    
    setDragProgress(progress);
    
    // Animate chat window based on drag with immediate response
    chatControls.start({
      y: `${100 - (progress * 100)}%`,
      opacity: progress * 0.9 + 0.1,
      transition: { type: "tween", duration: 0.05 } // Reduced from 0.1 for instant response
    });
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    if (!isDragging) return;

    setIsDragging(false);
    
    // Determine if we should snap to open or closed with more sensitive thresholds
    const velocity = info.velocity.y;
    const dragDistance = Math.abs(info.offset.y);
    const threshold = screenHeight * 0.08; // Reduced from 15% to 8% for easier trigger
    
    // More sensitive velocity threshold for iPhone-like responsiveness
    const shouldOpen = dragDistance > threshold || velocity < -300; // Reduced from -500
    
    if (shouldOpen) {
      // Snap to open position with bouncy spring animation
      setIsChatOpen(true);
      setDragProgress(1);
      chatControls.start({
        y: '0%',
        opacity: 1,
        transition: { 
          type: "spring", 
          damping: 20, // Reduced damping for more bounce
          stiffness: 400, // Increased stiffness for snappier response
          duration: 0.3 // Reduced duration
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
          damping: 20, 
          stiffness: 400,
          duration: 0.2 // Faster close animation
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
        style={{ touchAction: 'pan-y' }}
      >
        {children}
        
        {/* Invisible swipe detection area in bottom 30% for easier access */}
        <div
          className="fixed bottom-0 left-0 right-0 pointer-events-auto z-10"
          style={{ height: '30vh' }}
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
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
        >
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-blue-600/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-blue-500/50"
            style={{ fontFamily: "Audiowide" }}
          >
            ↑ Swipe up for chat
          </motion.div>
        </motion.div>
      )}
    </>
  );
}