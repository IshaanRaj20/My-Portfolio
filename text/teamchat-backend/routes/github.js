const express = require('express');
const axios   = require('axios');
const { saveToken, getToken, deleteToken } = require('../firebase');
const router  = express.Router();

/* ── Step 1: Redirect to GitHub ── */
router.get('/connect', (req, res) => {
  const { userKey } = req.query;
  if (!userKey) return res.status(400).json({ error: 'userKey required' });
  req.session.userKey = userKey;

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.GITHUB_REDIRECT_URI);
  url.searchParams.set('scope', 'read:user notifications repo');
  res.redirect(url.toString());
});

/* ── Step 2: GitHub callback ── */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const userKey  = req.session.userKey;
  if (!code || !userKey) return res.status(400).send('Missing code or session');

  try {
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  process.env.GITHUB_REDIRECT_URI,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenRes.data;

    // Get GitHub username
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    await saveToken(userKey, 'github', {
      access_token,
      username: userRes.data.login,
      avatar:   userRes.data.avatar_url,
    });

    res.send(`
      <script>
        window.opener && window.opener.postMessage({ type: 'GITHUB_CONNECTED' }, '*');
        window.close();
      </script>
      <p>GitHub connected! You can close this tab.</p>
    `);
  } catch (err) {
    console.error('GitHub OAuth error:', err.response?.data || err.message);
    res.status(500).send('OAuth failed.');
  }
});

/* ── GET /auth/github/notifications?userKey=xxx ── */
router.get('/notifications', async (req, res) => {
  const { userKey } = req.query;
  const stored = await getToken(userKey, 'github');
  if (!stored) return res.status(401).json({ error: 'Not connected' });

  try {
    const notifRes = await axios.get('https://api.github.com/notifications', {
      headers: { Authorization: `Bearer ${stored.access_token}` },
      params: { all: false, per_page: 20 }
    });

    const notifications = notifRes.data.map(n => ({
      id:       n.id,
      title:    n.subject.title,
      type:     n.subject.type,
      repo:     n.repository.full_name,
      url:      n.subject.url,
      unread:   n.unread,
      updated:  n.updated_at,
    }));

    res.json({ notifications, username: stored.username });
  } catch (err) {
    console.error('GitHub notifications error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/* ── GET /auth/github/status?userKey=xxx ── */
router.get('/status', async (req, res) => {
  const stored = await getToken(req.query.userKey, 'github');
  res.json({ connected: !!stored, username: stored?.username || null });
});

/* ── DELETE /auth/github/disconnect?userKey=xxx ── */
router.delete('/disconnect', async (req, res) => {
  await deleteToken(req.query.userKey, 'github');
  res.json({ ok: true });
});

module.exports = router;
