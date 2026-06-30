const admin = require('firebase-admin');

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

const db        = admin.database();
const messaging = admin.messaging();

async function getDisplayName(email) {
  const key  = email.toLowerCase().replace(/\./g, '_');
  const snap = await db.ref(`profiles/${key}/displayName`).once('value');
  return snap.val() || email.split('@')[0];
}

async function getTokens(email) {
  const key  = email.toLowerCase().replace(/\./g, '_');
  const snap = await db.ref(`notificationTokens/${key}`).once('value');
  const val  = snap.val();
  if(!val) return [];
  if(typeof val === 'string') return [val];
  if(typeof val === 'object') return Object.values(val).filter(t => typeof t === 'string');
  return [];
}

async function sendPush(tokens, payload) {
  if(!tokens.length) return;
  const messages = tokens.map(token => ({
    token,
    data: Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, String(v)])
    ),
    android: { priority: 'high', ttl: 60 * 60 * 1000 },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          'content-available': 1,
          sound: 'default',
          alert: { title: payload.title || 'NexChat', body: payload.body || '' }
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
    response.responses.forEach((resp, i) => {
      if(!resp.success) {
        const code = resp.error?.code;
        if(code === 'messaging/registration-token-not-registered' ||
           code === 'messaging/invalid-registration-token') {
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
      if(val === token) await db.ref(`notificationTokens/${key}`).remove();
    }
  } catch(e) {}
}

async function getChatMembers(chatId) {
  const snap = await db.ref(`chats/${chatId}/members`).once('value');
  const val  = snap.val() || {};
  return Object.keys(val).map(k => k.replace(/_/g, '.'));
}

async function getChatLabel(chatId, recipientEmail) {
  const snap    = await db.ref(`chats/${chatId}`).once('value');
  const chat    = snap.val() || {};
  const members = Object.keys(chat.members || {}).map(k => k.replace(/_/g, '.'));
  const others  = members.filter(e => e !== recipientEmail);
  const isDM    = others.length === 1 && !chat.isGroup;
  if(isDM) return getDisplayName(others[0]);
  return chat.name || 'NexChat';
}

/* ── Watch for new messages ── */
const startTime = Date.now();
const processedMessages = new Set();

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
      const members    = await getChatMembers(chatId);
      const senderName = await getDisplayName(msg.sender);
      const recipients = members.filter(e => e !== msg.sender);

      for(const recipient of recipients) {
        const tokens = await getTokens(recipient);
        if(!tokens.length) continue;

        const chatLabel = await getChatLabel(chatId, recipient);
        let body = '';
        if(msg.type === 'image')          body = `${senderName} sent a photo`;
        else if(msg.type === 'video')     body = `${senderName} sent a video`;
        else if(msg.type === 'gif')       body = `${senderName} sent a GIF`;
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

/* ── Watch for incoming calls ── */
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
      type:       'call',          /* lowercase — must match SW check */
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

/* ── HTTP endpoints ── */
module.exports = function registerPushRoutes(app) {

  app.get('/push/test', async (req, res) => {
    const { email } = req.query;
    if(!email) return res.status(400).json({ error: 'email required' });
    try {
      const tokens = await getTokens(email);
      if(!tokens.length) return res.json({ ok: false, reason: 'no tokens registered for this email' });
      await sendPush(tokens, {
        type:  'message',
        title: 'NexChat test 🎉',
        body:  'Push notifications are working!',
        tag:   'test-' + Date.now()
      });
      res.json({ ok: true, tokenCount: tokens.length });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/push/call', async (req, res) => {
    const { token, callerName, callerEmail, callId, chatId } = req.body;
    if(!token || !callId) return res.status(400).json({ error: 'token and callId required' });
    try {
      await sendPush([token], {
        type:       'call',        /* lowercase — must match SW check */
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