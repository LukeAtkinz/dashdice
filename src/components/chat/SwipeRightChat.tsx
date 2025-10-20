'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import UnifiedChatWindow from '@/components/chat/UnifiedChatWindow';
import { useAuth } from '@/context/AuthContext';

interface SwipeRightChatProps {
  children: React.ReactNode;
}

export default function SwipeRightChat({ children }: SwipeRightChatProps) {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showIndicator, setShowIndicator] = useState(true);
  const chatControls = useAnimation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Don't render chat for guests (non-authenticated users)
  if (!user) {
    return <>{children}</>;
  }

  // Hide indicator after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIndicator(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 && 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch event handlers for swipe right gesture
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const screenHeight = window.innerHeight;
    const bottomNavHeight = 80; // Approximate bottom nav height
    
    // Only start tracking if touch is in bottom navigation area (bottom 15% of screen)
    if (touch.clientY < screenHeight * 0.85) return;
    
    // Only start if touch is near the left edge (first 20% of screen width)
    if (touch.clientX > window.innerWidth * 0.2) return;
    
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    lastTouchRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    
    setIsDragging(true);
    
    console.log('📱 Touch start for swipe right:', { 
      x: touch.clientX, 
      y: touch.clientY, 
      bottomThreshold: screenHeight * 0.85,
      leftEdgeThreshold: window.innerWidth * 0.2
    });
  }, [isMobile]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !touchStartRef.current || !isMobile) return;
    
    const touch = e.touches[0];
    const startX = touchStartRef.current.x;
    const currentX = touch.clientX;
    const deltaX = currentX - startX; // Positive for rightward swipe
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // If vertical movement is too much, cancel the gesture
    if (deltaY > 50) {
      setIsDragging(false);
      touchStartRef.current = null;
      lastTouchRef.current = null;
      return;
    }
    
    lastTouchRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    
    // Only process rightward swipes
    if (deltaX <= 0) return;
    
    const screenWidth = window.innerWidth;
    const maxSwipeDistance = screenWidth * 0.4; // 40% of screen width
    const progress = Math.min(deltaX / maxSwipeDistance, 1);
    
    setDragProgress(progress);
    
    // Update chat position smoothly - slide in from left
    chatControls.start({
      x: `${-100 + (progress * 100)}%`, // Start from -100% (off-screen left) to 0%
      opacity: Math.max(0.1, progress * 0.9),
      transition: { type: "tween", duration: 0.01 }
    });
    
    console.log('📱 Touch move (swipe right):', { deltaX, progress, maxSwipeDistance });
  }, [isDragging, isMobile, chatControls]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging || !touchStartRef.current || !isMobile) return;
    
    const endTime = Date.now();
    const swipeTime = endTime - touchStartRef.current.time;
    const screenWidth = window.innerWidth;
    
    let shouldOpen = false;
    
    if (lastTouchRef.current) {
      const totalDeltaX = lastTouchRef.current.x - touchStartRef.current.x;
      const velocity = totalDeltaX / swipeTime; // pixels per ms
      
      // Thresholds for opening chat
      const distanceThreshold = screenWidth * 0.2; // 20% of screen width
      const velocityThreshold = 0.5; // pixels per ms for quick swipes
      
      shouldOpen = totalDeltaX > distanceThreshold || velocity > velocityThreshold;
      
      console.log('📱 Touch end decision (swipe right):', {
        totalDeltaX,
        velocity,
        swipeTime,
        distanceThreshold,
        velocityThreshold,
        shouldOpen,
        progress: dragProgress
      });
    }
    
    // Reset touch tracking
    touchStartRef.current = null;
    lastTouchRef.current = null;
    setIsDragging(false);
    
    if (shouldOpen) {
      openChatWindow();
    } else {
      closeChatWindow();
    }
  }, [isDragging, isMobile, dragProgress]);

  // Register touch events on document for better mobile capture
  useEffect(() => {
    if (!isMobile) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const openChatWindow = () => {
    setIsChatOpen(true);
    setDragProgress(1);
    chatControls.start({
      x: '0%', // Slide to visible position
      opacity: 1,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 400,
        duration: 0.3 
      }
    });
    console.log('📱 Chat opened (slide from left)');
  };

  const closeChatWindow = () => {
    setIsChatOpen(false);
    setDragProgress(0);
    chatControls.start({
      x: '-100%', // Slide back off-screen to the left
      opacity: 0,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 400,
        duration: 0.25 
      }
    });
    console.log('📱 Chat closed (slide to left)');
  };

  return (
    <>
      {/* Main Content */}
      <div className="relative w-full h-full">
        {children}
      </div>

      {/* Mobile Swipe Indicator - Show in bottom left corner */}
      {isMobile && !isChatOpen && !isDragging && showIndicator && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed bottom-20 left-4 z-40 pointer-events-none"
        >
          <motion.div
            animate={{ 
              x: [0, 8, 0],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-blue-600/90 text-white px-3 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-blue-500/60 shadow-lg"
            style={{ fontFamily: "Audiowide" }}
          >
            <div className="flex items-center space-x-2">
              <div className="text-lg">→</div>
              <span>Chat</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Left Edge Swipe Area Visual Indicator */}
      {isMobile && !isChatOpen && (
        <div className="fixed bottom-0 left-0 w-2 h-20 bg-gradient-to-r from-blue-500/20 to-transparent z-30 pointer-events-none" />
      )}

      {/* Chat Window Overlay - Slides in from left */}
      {(isChatOpen || isDragging) && (
        <motion.div
          ref={overlayRef}
          initial={{ x: '-100%', opacity: 0 }}
          animate={chatControls}
          className="fixed inset-0 z-50"
          style={{ 
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Background overlay - tap to close */}
          <div 
            className="absolute inset-0"
            onClick={closeChatWindow}
          />
          
          {/* Chat Content Container - Slides from left */}
          <motion.div
            className="absolute top-0 left-0 bottom-0 bg-gray-900 shadow-2xl border-r border-gray-700"
            style={{ 
              width: isMobile ? '85vw' : '400px', // Take most of screen on mobile
              maxWidth: '400px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chat Header with close button */}
            <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
              <h3 className="text-white font-audiowide text-lg">CHAT</h3>
              <button
                onClick={closeChatWindow}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Chat Window */}
            <div className="h-full">
              <UnifiedChatWindow
                isVisible={true}
                onToggle={closeChatWindow}
                position="bottom-left"
                containerMode={true}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}