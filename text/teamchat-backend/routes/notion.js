const express = require('express');
const axios   = require('axios');
const { saveToken, getToken, deleteToken } = require('../firebase');
const router  = express.Router();

/* ── Step 1: Redirect to Notion ── */
router.get('/connect', (req, res) => {
  const { userKey } = req.query;
  if (!userKey) return res.status(400).json({ error: 'userKey required' });
  req.session.userKey = userKey;

  const url = new URL('https://api.notion.com/v1/oauth/authorize');
  url.searchParams.set('client_id',     process.env.NOTION_CLIENT_ID);
  url.searchParams.set('redirect_uri',  process.env.NOTION_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('owner',         'user');
  res.redirect(url.toString());
});

/* ── Step 2: Notion callback ── */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const userKey  = req.session.userKey;
  if (!code || !userKey) return res.status(400).send('Missing code or session');

  try {
    const credentials = Buffer.from(
      `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      { grant_type: 'authorization_code', code, redirect_uri: process.env.NOTION_REDIRECT_URI },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        }
      }
    );

    const { access_token, workspace_name, owner } = tokenRes.data;

    await saveToken(userKey, 'notion', {
      access_token,
      workspace: workspace_name,
      email: owner?.user?.person?.email || '',
    });

    res.send(`
      <script>
        window.opener && window.opener.postMessage({ type: 'NOTION_CONNECTED' }, '*');
        window.close();
      </script>
      <p>Notion connected! You can close this tab.</p>
    `);
  } catch (err) {
    console.error('Notion OAuth error:', err.response?.data || err.message);
    res.status(500).send('OAuth failed.');
  }
});

/* ── GET /auth/notion/pages?userKey=xxx ── */
router.get('/pages', async (req, res) => {
  const { userKey } = req.query;
  const stored = await getToken(userKey, 'notion');
  if (!stored) return res.status(401).json({ error: 'Not connected' });

  try {
    const searchRes = await axios.post(
      'https://api.notion.com/v1/search',
      { filter: { value: 'page', property: 'object' }, page_size: 20 },
      {
        headers: {
          Authorization: `Bearer ${stored.access_token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        }
      }
    );

    const pages = searchRes.data.results.map(p => ({
      id:    p.id,
      title: p.properties?.title?.title?.[0]?.plain_text || p.object,
      url:   p.url,
      edited: p.last_edited_time,
    }));

    res.json({ pages, workspace: stored.workspace });
  } catch (err) {
    console.error('Notion pages error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

/* ── GET /auth/notion/status?userKey=xxx ── */
router.get('/status', async (req, res) => {
  const stored = await getToken(req.query.userKey, 'notion');
  res.json({ connected: !!stored, workspace: stored?.workspace || null });
});

/* ── DELETE /auth/notion/disconnect?userKey=xxx ── */
router.delete('/disconnect', async (req, res) => {
  await deleteToken(req.query.userKey, 'notion');
  res.json({ ok: true });
});

module.exports = router;