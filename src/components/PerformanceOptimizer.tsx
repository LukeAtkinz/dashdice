'use client';

import { useEffect } from 'react';

export const PerformanceOptimizer = () => {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload fonts
      const fontLinks = [
        'https://fonts.googleapis.com/css2?family=Audiowide:wght@400&display=swap'
      ];

      fontLinks.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
      });

      // Preload critical images
      const criticalImages = [
        '/Design Elements/CrownLogo.webp',
        '/App Icons/android/mipmap-xxxhdpi/appicons.png'
      ];

      criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      });
    };

    // Lazy load non-critical resources
    const lazyLoadResources = () => {
      // Defer loading of non-critical CSS
      const deferredStyles = document.querySelectorAll('link[rel="deferred-style"]');
      deferredStyles.forEach((link) => {
        const actualLink = link as HTMLLinkElement;
        actualLink.rel = 'stylesheet';
      });
    };

    // Optimize images with intersection observer
    const optimizeImages = () => {
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
              }
            }
          });
        });

        // Observe all images with data-src attribute
        document.querySelectorAll('img[data-src]').forEach(img => {
          imageObserver.observe(img);
        });
      }
    };

    // Memory management
    const optimizeMemory = () => {
      // Clean up unused objects periodically
      const cleanup = () => {
        // Force garbage collection if available (Chrome DevTools)
        if (window.gc) {
          window.gc();
        }
      };

      // Run cleanup every 30 seconds
      const cleanupInterval = setInterval(cleanup, 30000);

      return () => clearInterval(cleanupInterval);
    };

    // Network optimization
    const optimizeNetwork = () => {
      // Use connection API to adapt to network conditions
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        
        if (connection) {
          // Adjust resource loading based on connection speed
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            // Reduce image quality, defer non-critical resources
            document.documentElement.classList.add('slow-connection');
          } else if (connection.effectiveType === '4g') {
            // Enable high-quality resources
            document.documentElement.classList.add('fast-connection');
          }

          // Listen for connection changes
          connection.addEventListener('change', () => {
            console.log('Connection changed:', connection.effectiveType);
          });
        }
      }
    };

    // Performance monitoring
    const monitorPerformance = () => {
      // Monitor Core Web Vitals
      if ('PerformanceObserver' in window) {
        try {
          // Monitor Largest Contentful Paint (LCP)
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // Monitor First Input Delay (FID)
          const fidObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
              console.log('FID:', entry.processingStart - entry.startTime);
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Monitor Cumulative Layout Shift (CLS)
          let clsScore = 0;
          const clsObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsScore += entry.value;
                console.log('CLS Score:', clsScore);
              }
            });
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
          console.warn('Performance monitoring not fully supported:', error);
        }
      }
    };

    // Initialize optimizations
    preloadCriticalResources();
    
    // Use requestIdleCallback for non-critical optimizations
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        lazyLoadResources();
        optimizeImages();
        optimizeNetwork();
        monitorPerformance();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        lazyLoadResources();
        optimizeImages();
        optimizeNetwork();
        monitorPerformance();
      }, 100);
    }

    // Memory optimization cleanup
    const memoryCleanup = optimizeMemory();

    return () => {
      memoryCleanup();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceOptimizer;