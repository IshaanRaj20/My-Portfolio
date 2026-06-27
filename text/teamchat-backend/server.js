require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const session    = require('express-session');

const googleRoute  = require('./routes/google');
const githubRoute  = require('./routes/github');
const weatherRoute = require('./routes/weather');
const zoomRoute    = require('./routes/zoom');
const notionRoute  = require('./routes/notion');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'teamchat-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

/* ── Health check ── */
app.get('/', (req, res) => res.json({ status: 'TeamChat backend running ✅' }));

/* ── Integration routes ── */
app.use('/auth/google',  googleRoute);
app.use('/auth/github',  githubRoute);
app.use('/weather',      weatherRoute);
app.use('/auth/zoom',    zoomRoute);
app.use('/auth/notion',  notionRoute);

/* ── Push notifications (must be after app is defined) ── */
const registerPushRoutes = require('./push');
registerPushRoutes(app);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`TeamChat backend listening on port ${PORT}`));
