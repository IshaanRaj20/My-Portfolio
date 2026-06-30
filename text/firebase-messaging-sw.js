importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyDp1LSm2HlZ3xBDlwBPnEU62Es_KoyavUw",
  authDomain:        "secret-chat-6de59.firebaseapp.com",
  projectId:         "secret-chat-6de59",
  messagingSenderId: "107760706349",
  appId:             "1:107760706349:web:aad5387e7d0003d90ca9a4"
});

const messaging = firebase.messaging();

/* ── Dedup ── */
const shownTags = new Set();
function isDupe(tag) {
  if(!tag) return false;
  if(shownTags.has(tag)) return true;
  shownTags.add(tag);
  setTimeout(() => shownTags.delete(tag), 30000);
  return false;
}

/* ── Build URL with action param ── */
function buildUrl(data, action) {
  const base = self.registration.scope.replace(/\/$/, '');
  if(data && data.type === 'call' && data.callId) {
    return base + '/?call=' + data.callId + (action ? '&action=' + action : '');
  }
  if(data && data.chatId) return base + '/?chat=' + data.chatId;
  return base + '/';
}

/* ── BACKGROUND PUSH ── */
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] background message:', payload);

  var data  = payload.data        || {};
  var notif = payload.notification || {};
  var title = data.title  || notif.title || 'NexChat';
  var body  = data.body   || notif.body  || '';
  var type  = data.type   || 'message';
  var tag   = data.tag    || (type === 'call' ? 'call-' + data.callId : 'msg-' + data.chatId) || 'nexchat';

  if(isDupe(tag)) return;

  var options = {
    body:     body,
    icon:     '/android-chrome-192x192.png',
    badge:    '/android-chrome-192x192.png',
    tag:      tag,
    renotify: type !== 'call',
    data:     {
      url:    buildUrl(data),
      type:   type,
      chatId: data.chatId || '',
      callId: data.callId || ''
    }
  };

  if(type === 'call') {
    options.requireInteraction = true;
    options.vibrate            = [200, 100, 200, 100, 200];
    options.actions            = [
      { action: 'decline', title: '📵 Decline' },
      { action: 'accept',  title: '📞 Accept'  }
    ];
  } else {
    options.vibrate = [100, 50, 100];
    options.actions = [
      { action: 'open',    title: '💬 Open'    },
      { action: 'dismiss', title: '✕ Dismiss'  }
    ];
  }

  return self.registration.showNotification(title, options);
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', function(event) {
  var notification = event.notification;
  var action       = event.action;
  var data         = notification.data || {};

  notification.close();

  /* Dismiss only — close and do nothing */
  if(action === 'dismiss') return;

  /* For decline — we need to open the app briefly to update Firebase,
     then it will close itself. Pass action=decline in URL. */
  var targetUrl = action
    ? buildUrl(data, action)
    : (data.url || buildUrl(data));

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      var origin = new URL(self.registration.scope).origin;
      var best   = null;

      for(var i = 0; i < list.length; i++) {
        var c = list[i];
        if(c.url.indexOf(origin) !== 0) continue;
        if(!best) best = c;
        if(c.visibilityState === 'visible') { best = c; break; }
      }

      if(best && action !== 'decline') {
        /* App is open — send message to navigate */
        best.postMessage({
          type:   data.type === 'call' ? 'OPEN_CALL' : 'OPEN_CHAT',
          chatId: data.chatId || '',
          callId: data.callId || '',
          action: action || 'open'
        });
        return best.focus();
      }

      /* Open app at the correct URL (with action param if needed) */
      return clients.openWindow(targetUrl);
    })
  );
});

/* ── LIFECYCLE ── */
self.addEventListener('install',  function()    { self.skipWaiting(); });
self.addEventListener('activate', function(evt) { evt.waitUntil(self.clients.claim()); });