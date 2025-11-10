declare module 'framer-motion' {
  import type { CSSProperties } from 'react';
  
  // Extend MotionStyle to include all CSS properties
  export interface MotionStyle extends Omit<CSSProperties, 'transition'> {
    // Allow any CSS property
    [key: string]: any;
  }
}
