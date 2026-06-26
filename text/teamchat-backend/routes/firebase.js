const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

/** Save an integration token for a user */
async function saveToken(userKey, integration, data) {
  await db.ref(`integrations/${userKey}/${integration}`).set({
    ...data,
    savedAt: Date.now(),
  });
}

/** Load an integration token for a user */
async function getToken(userKey, integration) {
  const snap = await db.ref(`integrations/${userKey}/${integration}`).once('value');
  return snap.val();
}

/** Delete an integration token (disconnect) */
async function deleteToken(userKey, integration) {
  await db.ref(`integrations/${userKey}/${integration}`).remove();
}

module.exports = { db, saveToken, getToken, deleteToken };