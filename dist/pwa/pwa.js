/* eslint-disable no-console */

/**
 * Helper function to convert base64 string to Uint8Array for VAPID key
 * @param {string} base64String
 * @returns {Uint8Array<ArrayBuffer>}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Send the subscription to your server
 * @param {PushSubscription} subscription
 * @returns {Promise<void>}
 */
async function sendSubscriptionToServer(subscription) {
  try {
    const response = await fetch('/api/save-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) {
      throw new Error('Failed to save subscription on server');
    }
    const data = await response.json();
    console.log('Subscription saved on server:', data);
  } catch (error) {
    console.error('Error saving subscription:', error);
  }
}

/**
 * Function to subscribe to push notifications
 * @param {ServiceWorkerRegistration} registration
 */
function subscribeToPushNotifications(registration) {
  // Replace this with your actual VAPID public key
  // This should be a URL-safe base64 encoded string generated on your server
  const vapidPublicKey = 'BMZj5q0YDTygFXc3drQUVEBXpGv9PVXAwFG-JpOGHkG6HbLGUqdGc1GnEFFzTzqONqxV9RSuFcRJHiDvSmGeN3E';

  try {
    console.log('Converting VAPID key...');
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    console.log('Attempting to subscribe with application server key...');

    registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
      .then((subscription) => {
        console.log('User is subscribed to push notifications:', subscription);
        // Send the subscription to your server
        sendSubscriptionToServer(subscription);
      })
      .catch((error) => {
        console.error('Failed to subscribe to push notifications:', error);
        if (error.message.includes('applicationServerKey')) {
          console.error('Invalid applicationServerKey format. Check your VAPID key.');
        }
      });
  } catch (error) {
    console.error('Error in subscription process:', error);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('service-worker.js', {
      scope: './',
    })
    .then((registration) => {
      let serviceWorker;
      if (registration.installing) {
        serviceWorker = registration.installing;
        document.querySelector('#kind').textContent = 'installing';
      } else if (registration.waiting) {
        serviceWorker = registration.waiting;
        document.querySelector('#kind').textContent = 'waiting';
      } else if (registration.active) {
        serviceWorker = registration.active;
        document.querySelector('#kind').textContent = 'active';
      }
      if (serviceWorker) {
        // logState(serviceWorker.state);
        serviceWorker.addEventListener('statechange', (e) => {
          console.log(e.target.state);
        });
      }

      // Request notification permission once the service worker is ready
      if ('Notification' in window) {
        // Check if permission is not already granted or denied
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          // Request permission
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              console.log('Notification permission granted.');

              // Subscribe to push notifications if permission is granted
              subscribeToPushNotifications(registration);
            } else {
              console.log('Notification permission denied.');
            }
          });
        } else if (Notification.permission === 'granted') {
          // If permission is already granted, set up push subscription
          subscribeToPushNotifications(registration);
        }
      }
    })
    .catch((error) => {
      // Something went wrong during registration. The service-worker.js file
      // might be unavailable or contain a syntax error.
      console.error('Service worker registration failed:', error);
    });
} else {
  // The current browser doesn't support service workers.
  // Perhaps it is too old or we are not in a Secure Context.
  console.warn('Service workers are not supported in this browser.');
}
