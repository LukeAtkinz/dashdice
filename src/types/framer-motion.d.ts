// Type declarations for framer-motion
declare module 'framer-motion' {
  import * as React from 'react';
  import type { CSSProperties } from 'react';

  // Extend MotionStyle to include all CSS properties
  export interface MotionStyle extends Omit<CSSProperties, 'transition'> {
    [key: string]: any;
  }

  export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    whileHover?: any;
    whileTap?: any;
    whileInView?: any;
    drag?: any;
    dragConstraints?: any;
    dragElastic?: any;
    onDragEnd?: any;
    layout?: any;
    layoutId?: string;
    variants?: any;
    style?: MotionStyle;
    className?: string;
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    [key: string]: any;
  }

  export interface AnimatePresenceProps {
    children?: React.ReactNode;
    initial?: boolean;
    mode?: 'sync' | 'wait' | 'popLayout';
    onExitComplete?: () => void;
    custom?: any;
    exitBeforeEnter?: boolean;
  }

  export const motion: {
    div: React.ForwardRefExoticComponent<MotionProps & React.HTMLAttributes<HTMLDivElement>>;
    button: React.ForwardRefExoticComponent<MotionProps & React.ButtonHTMLAttributes<HTMLButtonElement>>;
    span: React.ForwardRefExoticComponent<MotionProps & React.HTMLAttributes<HTMLSpanElement>>;
    p: React.ForwardRefExoticComponent<MotionProps & React.HTMLAttributes<HTMLParagraphElement>>;
    h1: React.ForwardRefExoticComponent<MotionProps & React.HTMLAttributes<HTMLHeadingElement>>;
    h2: React.ForwardRefExoticComponent<MotionProps & React.HTMLAttributes<HTMLHeadingElement>>;
    h3: React.ForwardRefExoticComponent<MotionProps & React.HTMLAttributes<HTMLHeadingElement>>;
    img: React.ForwardRefExoticComponent<MotionProps & React.ImgHTMLAttributes<HTMLImageElement>>;
    a: React.ForwardRefExoticComponent<MotionProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>;
    ul: React.ForwardRefExoticComponent<MotionProps & React.HTMLAttributes<HTMLUListElement>>;
    li: React.ForwardRefExoticComponent<MotionProps & React.LiHTMLAttributes<HTMLLIElement>>;
    [key: string]: any;
  };

  export const AnimatePresence: React.FC<AnimatePresenceProps>;

  export function useAnimation(): any;
  export function useMotionValue(initial: any): any;
  export function useTransform(...args: any[]): any;
  export function useSpring(value: any, config?: any): any;
  export function useScroll(options?: any): any;
  export function useInView(ref: any, options?: any): boolean;
}
