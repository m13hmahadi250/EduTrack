// Service Worker for EduTrack Web Notifications
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle custom push notifications if push services are configured
self.addEventListener('push', (event) => {
  let data = { title: 'EduTrack Alert', body: 'You have a new update.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'EduTrack Alert', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'New message or notification arrived.',
    icon: data.icon || '/logo.svg',
    badge: '/logo.svg',
    vibrate: [150, 100, 150],
    data: data.url || '/',
    tag: data.tag || 'edutrack-alert',
    actions: [
      { action: 'open', title: 'Open App', icon: '/logo.svg' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EduTrack Notification', options)
  );
});

// Handle notification click events (e.g., focus on the browser, trigger actions, or navigate)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If the user clicked the 'close' button action, do nothing else
  if (event.action === 'close') {
    return;
  }

  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and redirect if needed
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If there's any active window but not on the correct URL, navigate it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client && 'navigate' in client) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

