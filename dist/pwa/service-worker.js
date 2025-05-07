/* eslint-disable no-console */

const CACHE_NAME = 'bitrise-pwa-cache-v1';

const self = this;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching files');
      return cache.addAll([
        // Add your static assets here
        '/',
        '/index.html',
        // Add other assets as needed
      ]);
    }),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
          return null;
        }),
      );
    }),
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {};

  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'New Notification',
      body: event.data ? event.data.text() : 'No details available',
      icon: '/icon.png',
    };
  }

  const title = notificationData.title || 'Bitrise Notification';
  const options = {
    body: notificationData.body || 'New update from Bitrise',
    icon: notificationData.icon || '/icon.png',
    badge: notificationData.badge || '/badge.png',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    tag: notificationData.tag || 'bitrise-notification',
    renotify: notificationData.renotify || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // This looks to see if the current window is already open and focuses it
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }),
  );
});

// Push subscription change event handler
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);

  // You might want to notify your server about the change
  const options = {};

  event.waitUntil(
    self.registration.pushManager.subscribe(options).then((subscription) => {
      // Send the new subscription to your server
      return fetch('/api/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    }),
  );
});
