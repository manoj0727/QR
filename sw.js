// Service Worker for offline functionality and performance
const CACHE_NAME = 'qr-inventory-v1';
const STATIC_CACHE_URLS = [
    '/',
    '/index-modern.html',
    '/dashboard-modern.css',
    '/transaction-history.css',
    '/src/main.js',
    '/src/utils/router.js',
    '/src/utils/BaseComponent.js',
    '/src/components/Navigation.js',
    '/src/components/Dashboard.js',
    '/src/components/ProductCreation.js',
    '/src/components/QRScanner.js',
    '/src/components/Inventory.js',
    '/src/components/Transactions.js',
    '/src/components/TailorManagement.js',
    '/src/components/Reports.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('Static assets cached');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Cache cleanup complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle different types of requests
    if (request.method !== 'GET') {
        // Don't cache non-GET requests
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        // API requests - network first, cache fallback
        event.respondWith(networkFirstStrategy(request));
    } else if (isStaticAsset(request.url)) {
        // Static assets - cache first, network fallback
        event.respondWith(cacheFirstStrategy(request));
    } else {
        // Other requests - stale while revalidate
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

// Network first strategy for API calls
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page or error response
        return new Response(
            JSON.stringify({ error: 'Network unavailable' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Cache first strategy for static assets
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Failed to fetch:', request.url);
        return new Response('Asset not found', { status: 404 });
    }
}

// Stale while revalidate strategy
async function staleWhileRevalidateStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    const networkResponsePromise = fetch(request).then((response) => {
        if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
        }
        return response;
    });
    
    return cachedResponse || networkResponsePromise;
}

// Helper function to check if request is for a static asset
function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
    const urlObj = new URL(url);
    return staticExtensions.some(ext => urlObj.pathname.endsWith(ext)) ||
           url.includes('cdnjs.cloudflare.com') ||
           url.includes('fonts.googleapis.com');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(processOfflineActions());
    }
});

// Process actions that were queued while offline
async function processOfflineActions() {
    try {
        const cache = await caches.open(CACHE_NAME + '-offline-actions');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                }
            } catch (error) {
                console.error('Failed to sync offline action:', request.url);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
            actions: data.actions || [],
            data: data.data || {}
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});