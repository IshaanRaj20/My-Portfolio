/* ================================================================
   push.js  —  Drop this into your Railway Express server.
   
   SETUP (one-time, 5 minutes, completely free):
   -----------------------------------------------
   1. Go to Firebase Console → Project Settings → Service Accounts
   2. Click "Generate new private key" → downloads a JSON file
   3. In Railway dashboard → your service → Variables, add:
        FIREBASE_SERVICE_ACCOUNT  =  <paste the entire JSON as one line>
   4. In your main server file (e.g. server.js / index.js) add:
        require('./push');
   That's it. No paid plan needed — FCM is free forever.

   HOW IT WORKS:
   -----------------------------------------------
   • This module connects to Firebase Realtime Database using the
     Admin SDK (server-side, not browser).
   • It watches for new messages and new calls.
   • When one arrives it looks up the recipient's FCM token(s) from
     /notificationTokens/{userKey} in the DB.
   • It sends a push via FCM — this wakes up the browser/PWA even
     when it's completely closed, the tab is closed, or the device
     is locked (on Android; iOS has limited support).
   • The Service Worker (firebase-messaging-sw.js) receives the push
     and shows the notification.
   ================================================================ */

const admin = require('firebase-admin');

/* ── Initialize Firebase Admin (uses env var set in Railway) ── */
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
} catch(e) {
  console.error('[Push] Could not parse FIREBASE_SERVICE_ACCOUNT env var:', e.message);
  process.exit(1);
}

if(!admin.apps.length) {
  admin.initializeApp({
    credential:  admin.credential.cert(serviceAccount),
    databaseURL: 'https://secret-chat-6de59-default-rtdb.firebaseio.com'
  });
}

const db       = admin.database();
const messaging = admin.messaging();

/* ── Helper: get a user's display name from /profiles ── */
async function getDisplayName(email) {
  const key  = email.toLowerCase().replace(/\./g, '_');
  const snap = await db.ref(`profiles/${key}/displayName`).once('value');
  return snap.val() || email.split('@')[0];
}

/* ── Helper: get all FCM tokens for a user ── */
async function getTokens(email) {
  const key  = email.toLowerCase().replace(/\./g, '_');
  const snap = await db.ref(`notificationTokens/${key}`).once('value');
  const val  = snap.val();
  if(!val) return [];
  /* tokens can be stored as a single string or object of {token: true} */
  if(typeof val === 'string') return [val];
  if(typeof val === 'object') return Object.values(val).filter(t => typeof t === 'string');
  return [];
}

/* ── Helper: send FCM push and clean up stale tokens ── */
async function sendPush(tokens, payload) {
  if(!tokens.length) return;

  const messages = tokens.map(token => ({
    token,
    /* Use data-only payload so the SW controls everything.
       Notification key is omitted intentionally — the SW
       calls showNotification() itself for full control. */
    data: Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, String(v)])
    ),
    android: {
      priority: 'high',
      ttl:      60 * 60 * 1000  /* 1 hour */
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          'content-available': 1,
          sound: 'default',
          alert: {
            title: payload.title || 'TeamChat',
            body:  payload.body  || ''
          }
        }
      }
    },
    webpush: {
      headers:    { Urgency: 'high' },
      fcmOptions: { analyticsLabel: payload.type || 'message' }
    }
  }));

  try {
    const response = await messaging.sendEach(messages);
    /* Remove tokens that are no longer valid */
    response.responses.forEach((resp, i) => {
      if(!resp.success) {
        const code = resp.error?.code;
        if(code === 'messaging/registration-token-not-registered' ||
           code === 'messaging/invalid-registration-token') {
          console.log('[Push] Removing stale token:', tokens[i].slice(0, 20) + '…');
          /* Find the user this token belongs to and remove it */
          removeStaleToken(tokens[i]);
        }
      }
    });
    console.log(`[Push] Sent ${response.successCount}/${tokens.length} notifications`);
  } catch(err) {
    console.error('[Push] sendEach error:', err.message);
  }
}

async function removeStaleToken(token) {
  try {
    const snap = await db.ref('notificationTokens').once('value');
    const all  = snap.val() || {};
    for(const [key, val] of Object.entries(all)) {
      if(val === token) {
        await db.ref(`notificationTokens/${key}`).remove();
      }
    }
  } catch(e) { /* best effort */ }
}

/* ── Helper: get chat members ── */
async function getChatMembers(chatId) {
  const snap = await db.ref(`chats/${chatId}/members`).once('value');
  const val  = snap.val() || {};
  return Object.keys(val).map(k => k.replace(/_/g, '.'));
}

/* ── Helper: get chat display name for a recipient ── */
async function getChatLabel(chatId, recipientEmail) {
  const snap    = await db.ref(`chats/${chatId}`).once('value');
  const chat    = snap.val() || {};
  const members = Object.keys(chat.members || {}).map(k => k.replace(/_/g, '.'));
  const others  = members.filter(e => e !== recipientEmail);
  const isDM    = others.length === 1 && !chat.isGroup;
  if(isDM) return getDisplayName(others[0]);
  return chat.name || 'TeamChat';
}

/* ================================================================
   WATCH FOR NEW MESSAGES
   We use child_added with a startAt timestamp so we only get
   messages sent AFTER the server started (not historical ones).
   ================================================================ */
const startTime = Date.now();
const processedMessages = new Set(); /* dedup within this server run */

db.ref('chats').on('child_added', chatSnap => {
  const chatId = chatSnap.key;

  db.ref(`chats/${chatId}/messages`).on('child_added', async msgSnap => {
    const msg = msgSnap.val();
    if(!msg || !msg.time || msg.time < startTime) return;
    if(msg.sender === 'system') return;

    const msgKey = `${chatId}:${msgSnap.key}`;
    if(processedMessages.has(msgKey)) return;
    processedMessages.add(msgKey);
    setTimeout(() => processedMessages.delete(msgKey), 60000);

    try {
      const members     = await getChatMembers(chatId);
      const senderName  = await getDisplayName(msg.sender);
      const recipients  = members.filter(e => e !== msg.sender);

      for(const recipient of recipients) {
        const tokens   = await getTokens(recipient);
        if(!tokens.length) continue;

        const chatLabel = await getChatLabel(chatId, recipient);
        let   body      = '';

        if(msg.type === 'image')     body = `${senderName} sent a photo`;
        else if(msg.type === 'video') body = `${senderName} sent a video`;
        else if(msg.type === 'gif')   body = `${senderName} sent a GIF`;
        else if(msg.type === 'recording') body = `${senderName} shared a call recording`;
        else body = msg.text ? `${senderName}: ${msg.text.slice(0, 100)}` : `${senderName} sent a message`;

        await sendPush(tokens, {
          type:       'message',
          title:      chatLabel,
          body,
          chatId,
          senderName,
          tag:        `msg-${chatId}`,
          url:        `/?chat=${chatId}`
        });
      }
    } catch(err) {
      console.error('[Push] message handler error:', err.message);
    }
  });
});

/* ================================================================
   WATCH FOR INCOMING CALLS
   ================================================================ */
const processedCalls = new Set();

db.ref('calls').on('child_added', async callSnap => {
  const call   = callSnap.val();
  const callId = callSnap.key;

  if(!call || call.status !== 'ringing') return;
  if(processedCalls.has(callId)) return;
  processedCalls.add(callId);
  setTimeout(() => processedCalls.delete(callId), 120000);

  try {
    const callerName = await getDisplayName(call.from);
    const tokens     = await getTokens(call.to);
    if(!tokens.length) return;

    await sendPush(tokens, {
      type:       'call',
      title:      `📞 ${callerName} is calling`,
      body:       'Tap to answer',
      callId,
      chatId:     call.chatId || '',
      senderName: callerName,
      tag:        `call-${callId}`,
      url:        `/?call=${callId}`
    });
  } catch(err) {
    console.error('[Push] call handler error:', err.message);
  }
});

/* ================================================================
   ALSO EXPOSE HTTP ENDPOINTS
   ================================================================ */
module.exports = function registerPushRoutes(app) {

  /* Test endpoint */
  app.get('/push/test', async (req, res) => {
    const { email } = req.query;
    if(!email) return res.status(400).json({ error: 'email required' });
    try {
      const tokens = await getTokens(email);
      if(!tokens.length) return res.json({ ok: false, reason: 'no tokens registered for this email' });
      await sendPush(tokens, {
        type:  'message',
        title: 'TeamChat test 🎉',
        body:  'Push notifications are working!',
        tag:   'test-' + Date.now()
      });
      res.json({ ok: true, tokenCount: tokens.length });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* Instant call push — called directly from the caller's browser
     so notification arrives immediately without waiting for the
     backend DB watcher to fire (avoids Render sleep delay) */
  app.post('/push/call', async (req, res) => {
    const { token, callerName, callerEmail, callId, chatId } = req.body;
    if(!token || !callId) return res.status(400).json({ error: 'token and callId required' });
    try {
      await sendPush([token], {
        type:       'call',
        title:      `📞 ${callerName || callerEmail} is calling`,
        body:       'Tap to answer',
        callId,
        chatId:     chatId || '',
        senderName: callerName || callerEmail,
        tag:        'call-' + callId
      });
      res.json({ ok: true });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

};