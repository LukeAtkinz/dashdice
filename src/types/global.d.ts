// Type declarations for packages without TypeScript definitions

declare module 'istanbul-lib-report' {
  const content: any;
  export = content;
}

declare module 'istanbul-reports' {
  const content: any;
  export = content;
}

// Import styled-jsx types
/// <reference types="styled-jsx" />

// Expo-related type augmentations
declare global {
  interface Window {
    gc?: () => void;
  }
  
  interface Navigator {
    connection?: {
      effectiveType: string;
      addEventListener: (event: string, callback: () => void) => void;
    };
  }
}

// Service Worker types
declare const self: ServiceWorkerGlobalScope;

export {};