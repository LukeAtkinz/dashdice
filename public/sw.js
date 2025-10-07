const CACHE_NAME = 'dashdice-v1.0.0';
const RUNTIME_CACHE = 'dashdice-runtime-v1.0.0';

// Assets to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/android/mipmap-xxxhdpi/appicons.png',
  '/icons/playstore.png',
  '/icons/appstore.png',
  '/Design Elements/CrownLogo.webp',
  // Add other critical assets
  '/offline.html'
];

// Runtime caching patterns
const RUNTIME_CACHE_PATTERNS = [
  // API routes
  /^https:\/\/api\.dashdice\.com\//,
  // Firebase
  /^https:\/\/.*\.firebaseio\.com\//,
  /^https:\/\/.*\.googleapis\.com\//,
  // Images
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  // Fonts
  /\.(?:woff|woff2|ttf|eot)$/,
  // CSS/JS
  /\.(?:css|js)$/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (request.mode === 'navigate') {
    // Page navigation requests
    event.respondWith(handleNavigateRequest(request));
  } else if (isStaticAsset(request)) {
    // Static assets (images, fonts, etc.)
    event.respondWith(handleStaticAssetRequest(request));
  } else if (isApiRequest(request)) {
    // API requests
    event.respondWith(handleApiRequest(request));
  } else {
    // Other requests - network first
    event.respondWith(handleOtherRequest(request));
  }
});

// Handle page navigation requests
async function handleNavigateRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed for navigation, serving from cache');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    return caches.match('/offline.html');
  }
}

// Handle static asset requests
async function handleStaticAssetRequest(request) {
  // Cache first strategy for static assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    
    // Return a fallback for images
    if (request.destination === 'image') {
      return caches.match('/icons/android/mipmap-hdpi/appicons.png');
    }
    
    throw error;
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Network first for API requests
    const response = await fetch(request);
    
    // Cache successful GET requests
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API request failed, checking cache');
    
    // Try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

// Handle other requests
async function handleOtherRequest(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses for eligible requests
    // Skip partial responses (206) and only cache complete responses (200)
    if (response.ok && response.status === 200 && shouldCacheRequest(request)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Helper functions
function isStaticAsset(request) {
  return RUNTIME_CACHE_PATTERNS.some(pattern => 
    pattern.test(request.url)
  ) || request.destination === 'image' || 
      request.destination === 'font' ||
      request.destination === 'style' ||
      request.destination === 'script';
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('firebaseio.com') ||
         url.hostname.includes('googleapis.com');
}

function shouldCacheRequest(request) {
  const url = new URL(request.url);
  
  // Don't cache certain requests
  if (url.hostname === 'localhost' || 
      url.hostname === '127.0.0.1' ||
      url.search.includes('no-cache')) {
    return false;
  }
  
  return true;
}

// Background sync for failed API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // For example, retry failed API requests
  console.log('[SW] Performing background sync');
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Dashdice!',
    icon: '/icons/android/mipmap-hdpi/appicons.png',
    badge: '/icons/android/mipmap-hdpi/appicons.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Play Now',
        icon: '/icons/android/mipmap-hdpi/appicons.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/android/mipmap-hdpi/appicons.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Dashdice', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Log service worker errors
self.addEventListener('error', (event) => {
  console.error('[SW] Error occurred:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker script loaded');