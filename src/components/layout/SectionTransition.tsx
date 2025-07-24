'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSection } from '@/context/NavigationContext';

interface SectionTransitionProps {
  children: ReactNode;
  section: DashboardSection;
  currentSection: DashboardSection;
  transitionType?: 'fade' | 'slide' | 'scale' | 'slideUp';
}

const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" as const }
  },
  slide: {
    initial: { x: 300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
    transition: { duration: 0.4, ease: "easeInOut" as const }
  },
  slideUp: {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -50, opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" as const }
  },
  scale: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.1, opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" as const }
  }
};

export const SectionTransition: React.FC<SectionTransitionProps> = ({
  children,
  section,
  currentSection,
  transitionType = 'fade'
}) => {
  const variants = transitionVariants[transitionType];

  return (
    <AnimatePresence mode="wait">
      {section === currentSection && (
        <motion.div
          key={section}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={variants.transition}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
