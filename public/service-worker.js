// service-worker.js
self.addEventListener('push', function(event) {
  try {
      const data = event.data.json();
      
      const options = {
          body: data.body || 'Tienes un nuevo mensaje',
          icon: data.icon || '/img/favicon.ico',
          badge: '/img/favicon.ico',
          vibrate: [100, 50, 100],
          data: {
              url: data.url || '/messages.html'
          }
      };
      
      event.waitUntil(
          self.registration.showNotification(data.title || 'Nuevo mensaje', options)
      );
  } catch (error) {
      console.error('Error al procesar notificación push:', error);
      
      // Mostrar notificación genérica en caso de error
      event.waitUntil(
          self.registration.showNotification('Nuevo mensaje', {
              body: 'Tienes un nuevo mensaje en la aplicación',
              icon: '/img/favicon.ico',
              badge: '/img/favicon.ico'
          })
      );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Obtener la URL a la que dirigir al usuario
  const url = event.notification.data && event.notification.data.url ? 
      event.notification.data.url : '/messages.html';
  
  event.waitUntil(
      clients.openWindow(url)
  );
});

// Evento de instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

// Evento de activación del Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker activado');
  return self.clients.claim();
});
