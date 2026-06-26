const express = require('express');
const axios   = require('axios');
const { saveToken, getToken, deleteToken } = require('../firebase');
const router  = express.Router();

/* ── Step 1: Redirect to Zoom ── */
router.get('/connect', (req, res) => {
  const { userKey } = req.query;
  if (!userKey) return res.status(400).json({ error: 'userKey required' });
  req.session.userKey = userKey;

  const url = new URL('https://zoom.us/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id',    process.env.ZOOM_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.ZOOM_REDIRECT_URI);
  res.redirect(url.toString());
});

/* ── Step 2: Zoom callback ── */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const userKey  = req.session.userKey;
  if (!code || !userKey) return res.status(400).send('Missing code or session');

  try {
    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: process.env.ZOOM_REDIRECT_URI }),
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Get Zoom user info
    const userRes = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    await saveToken(userKey, 'zoom', {
      access_token, refresh_token,
      expires_at: Date.now() + expires_in * 1000,
      email: userRes.data.email,
      name:  userRes.data.display_name,
    });

    res.send(`
      <script>
        window.opener && window.opener.postMessage({ type: 'ZOOM_CONNECTED' }, '*');
        window.close();
      </script>
      <p>Zoom connected! You can close this tab.</p>
    `);
  } catch (err) {
    console.error('Zoom OAuth error:', err.response?.data || err.message);
    res.status(500).send('OAuth failed.');
  }
});

/* ── GET /auth/zoom/meetings?userKey=xxx ── */
router.get('/meetings', async (req, res) => {
  const { userKey } = req.query;
  const stored = await getToken(userKey, 'zoom');
  if (!stored) return res.status(401).json({ error: 'Not connected' });

  try {
    const meetRes = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
      headers: { Authorization: `Bearer ${stored.access_token}` },
      params: { type: 'upcoming', page_size: 20 }
    });

    const meetings = meetRes.data.meetings.map(m => ({
      id:        m.id,
      topic:     m.topic,
      startTime: m.start_time,
      duration:  m.duration,
      joinUrl:   m.join_url,
    }));

    res.json({ meetings, name: stored.name });
  } catch (err) {
    console.error('Zoom meetings error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

/* ── GET /auth/zoom/status?userKey=xxx ── */
router.get('/status', async (req, res) => {
  const stored = await getToken(req.query.userKey, 'zoom');
  res.json({ connected: !!stored, email: stored?.email || null });
});

/* ── DELETE /auth/zoom/disconnect?userKey=xxx ── */
router.delete('/disconnect', async (req, res) => {
  await deleteToken(req.query.userKey, 'zoom');
  res.json({ ok: true });
});

module.exports = router;