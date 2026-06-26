const express = require('express');
const axios   = require('axios');
const { saveToken, getToken } = require('../firebase');
const router  = express.Router();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/* ── Step 1: Redirect user to Google consent screen ── */
router.get('/connect', (req, res) => {
  const { userKey } = req.query;
  if (!userKey) return res.status(400).json({ error: 'userKey required' });

  // Store userKey in session so we can retrieve it in the callback
  req.session.userKey = userKey;

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',     process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri',  process.env.GOOGLE_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope',         SCOPES);
  url.searchParams.set('access_type',   'offline');
  url.searchParams.set('prompt',        'consent');

  res.redirect(url.toString());
});

/* ── Step 2: Google redirects back with ?code= ── */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const userKey  = req.session.userKey;
  if (!code || !userKey) return res.status(400).send('Missing code or session');

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
      grant_type:    'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Get user email from Google
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    await saveToken(userKey, 'google', {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
      email: userRes.data.email,
    });

    // Close popup and tell parent window to refresh
    res.send(`
      <script>
        window.opener && window.opener.postMessage({ type: 'GOOGLE_CONNECTED' }, '*');
        window.close();
      </script>
      <p>Google Calendar connected! You can close this tab.</p>
    `);
  } catch (err) {
    console.error('Google OAuth error:', err.response?.data || err.message);
    res.status(500).send('OAuth failed. Check server logs.');
  }
});

/* ── Refresh access token using refresh_token ── */
async function refreshAccessToken(userKey, stored) {
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: stored.refresh_token,
    grant_type:    'refresh_token',
  });
  const { access_token, expires_in } = tokenRes.data;
  const updated = { ...stored, access_token, expires_at: Date.now() + expires_in * 1000 };
  await saveToken(userKey, 'google', updated);
  return updated;
}

/* ── GET /auth/google/events?userKey=xxx&start=ISO&end=ISO ── */
router.get('/events', async (req, res) => {
  const { userKey, start, end } = req.query;
  if (!userKey) return res.status(400).json({ error: 'userKey required' });

  try {
    let stored = await getToken(userKey, 'google');
    if (!stored) return res.status(401).json({ error: 'Not connected' });

    // Auto-refresh if token expired
    if (Date.now() > stored.expires_at - 60_000) {
      stored = await refreshAccessToken(userKey, stored);
    }

    const calRes = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${stored.access_token}` },
      params: {
        timeMin:      start || new Date().toISOString(),
        timeMax:      end   || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy:      'startTime',
        maxResults:   50,
      }
    });

    // Normalise to our event format
    const events = calRes.data.items.map(e => ({
      id:       e.id,
      title:    e.summary || '(No title)',
      date:     (e.start.date || e.start.dateTime || '').slice(0, 10),
      time:     e.start.dateTime ? e.start.dateTime.slice(11, 16) : '',
      desc:     e.description || '',
      source:   'google',
      htmlLink: e.htmlLink,
    }));

    res.json({ events });
  } catch (err) {
    console.error('Google events error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/* ── GET /auth/google/status?userKey=xxx ── */
router.get('/status', async (req, res) => {
  const stored = await getToken(req.query.userKey, 'google');
  res.json({ connected: !!stored, email: stored?.email || null });
});

/* ── DELETE /auth/google/disconnect?userKey=xxx ── */
const { deleteToken } = require('../firebase');
router.delete('/disconnect', async (req, res) => {
  await deleteToken(req.query.userKey, 'google');
  res.json({ ok: true });
});

module.exports = router;