'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, prompt user to reload
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from SW:', event.data);
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
        // Optionally reload the page
        // window.location.reload();
      });
    }

    // Register for push notifications (optional)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Request notification permission if not already granted
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          console.log('Notification permission:', permission);
        });
      }
    }
  }, []);

  return null; // This component doesn't render anything
};

export default ServiceWorkerRegistration;