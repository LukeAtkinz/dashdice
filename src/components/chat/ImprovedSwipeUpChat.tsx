'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import UnifiedChatWindow from '@/components/chat/UnifiedChatWindow';
import { useAuth } from '@/context/AuthContext';

interface ImprovedSwipeUpChatProps {
  children: React.ReactNode;
}

export default function ImprovedSwipeUpChat({ children }: ImprovedSwipeUpChatProps) {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const chatControls = useAnimation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Don't render chat for guests (non-authenticated users)
  if (!user) {
    return <>{children}</>;
  }

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 && 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch event handlers with better mobile support
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const screenHeight = window.innerHeight;
    
    // Only start tracking if touch is in bottom 30% of screen
    if (touch.clientY < screenHeight * 0.7) return;
    
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
    
    // Prevent body scroll during swipe
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    console.log('📱 Touch start:', { y: touch.clientY, threshold: screenHeight * 0.7 });
  }, [isMobile]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !touchStartRef.current || !isMobile) return;
    
    e.preventDefault(); // Prevent scrolling
    
    const touch = e.touches[0];
    const startY = touchStartRef.current.y;
    const currentY = touch.clientY;
    const deltaY = startY - currentY; // Positive for upward swipe
    
    lastTouchRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    
    // Only process upward swipes
    if (deltaY <= 0) return;
    
    const screenHeight = window.innerHeight;
    const maxSwipeDistance = screenHeight * 0.4; // 40% of screen
    const progress = Math.min(deltaY / maxSwipeDistance, 1);
    
    setDragProgress(progress);
    
    // Update chat position smoothly
    chatControls.start({
      y: `${100 - (progress * 100)}%`,
      opacity: Math.max(0.1, progress),
      transition: { type: "tween", duration: 0.01 }
    });
    
    console.log('📱 Touch move:', { deltaY, progress, maxSwipeDistance });
  }, [isDragging, isMobile, chatControls]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging || !touchStartRef.current || !isMobile) return;
    
    const endTime = Date.now();
    const swipeTime = endTime - touchStartRef.current.time;
    const screenHeight = window.innerHeight;
    
    let shouldOpen = false;
    
    if (lastTouchRef.current) {
      const totalDeltaY = touchStartRef.current.y - lastTouchRef.current.y;
      const velocity = totalDeltaY / swipeTime; // pixels per ms
      
      // More lenient thresholds for better UX
      const distanceThreshold = screenHeight * 0.15; // 15% of screen
      const velocityThreshold = 0.5; // pixels per ms
      
      shouldOpen = totalDeltaY > distanceThreshold || velocity > velocityThreshold;
      
      console.log('📱 Touch end decision:', {
        totalDeltaY,
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
    
    // Restore body scroll
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
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
      y: '0%',
      opacity: 1,
      transition: { 
        type: "spring", 
        damping: 20, 
        stiffness: 400,
        duration: 0.3 
      }
    });
    console.log('📱 Chat opened');
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
    console.log('📱 Chat closed');
  };

  return (
    <>
      {/* Main Content */}
      <div className="relative w-full h-full">
        {children}
      </div>

      {/* Mobile Swipe Indicator */}
      {isMobile && !isChatOpen && !isDragging && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
        >
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="bg-blue-600/90 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-blue-500/60 shadow-lg"
            style={{ fontFamily: "Audiowide" }}
          >
            <div className="flex items-center space-x-2">
              <div className="text-lg">↑</div>
              <span>Swipe for Chat</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Bottom Edge Swipe Area Visual Indicator */}
      {isMobile && !isChatOpen && (
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-blue-500/20 to-transparent z-30 pointer-events-none" />
      )}

      {/* Chat Window Overlay */}
      {isChatOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ y: '100%', opacity: 0 }}
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
          
          {/* Chat Content Container */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-700"
            style={{ 
              height: isMobile ? '80vh' : '500px',
              minHeight: '400px',
              maxHeight: '80vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3 bg-gray-800 rounded-t-2xl">
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
      )}
    </>
  );
}