importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDp1LSm2HlZ3xBDlwBPnEU62Es_KoyavUw",
  authDomain: "secret-chat-6de59.firebaseapp.com",
  projectId: "secret-chat-6de59",
  messagingSenderId: "107760706349",
  appId: "1:107760706349:web:aad5387e7d0003d90ca9a4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Background message:", payload);

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "TeamChat";

  const options = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      "",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});