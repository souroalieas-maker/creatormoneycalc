'use strict';
/*
 * CreatorMoneyCalc — server entrypoint (public site + admin).
 * Public routes live in routes/public.js; admin routes in routes/admin.js.
 */
require('dotenv').config();
require('express-async-errors'); // async route errors -> Express error handler (Express 4)

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');

const { db, siteObj, calcSettings, adSlots } = require('./lib/db');
const { csrfEnsure, csrfProtect } = require('./lib/csrf');
const PgStore = require('./lib/store');
const helpers = require('./lib/helpers');

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
  console.error('FATAL: SESSION_SECRET is missing or too short. Copy .env.example to .env and set a long random value.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* Security headers. CSP keeps defaults but allows the inline JSON-LD SEO
 * blocks and third-party ad iframes (script-src unsafe-inline is scoped to
 * JSON-LD data blocks we render ourselves). */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", "'unsafe-inline'"],
      'frame-src': ["'self'", 'https:'],
    },
  },
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(express.json({ limit: '64kb' }));

app.use(session({
  store: new PgStore(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 12 * 3600 * 1000, // 12 hours
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.SITE_URL || '').startsWith('https'),
  },
}));

app.use(csrfEnsure);
app.use(csrfProtect.deferMultipart);

/* Calculator nav used by header/footer/cards on every page. */
const CALC_NAV = [
  { key: 'earnings', path: '/youtube-earnings-calculator' },
  { key: 'rpm', path: '/youtube-rpm-calculator' },
  { key: 'shorts', path: '/youtube-shorts-earnings-calculator' },
  { key: 'views-money', path: '/youtube-views-to-money' },
  { key: 'engagement', path: '/youtube-engagement-calculator' },
  { key: 'tiktok', path: '/tiktok-earnings-calculator' },
  { key: 'facebook', path: '/facebook-earnings-calculator' },
];

/* Shared template locals on every request. */
app.use(async (req, res, next) => {
  res.locals.site = await siteObj();
  res.locals.ads = await adSlots();
  res.locals.calcs = await calcSettings();
  res.locals.helpers = helpers;
  res.locals.calcNav = CALC_NAV;
  res.locals.currentPath = req.path;
  next();
});

/* Anonymous aggregate analytics. No IPs or personal data are stored.
 * Wrapped so a tracking failure can never break a page. */
app.use(async (req, res, next) => {
  try {
    if (req.method === 'GET' && !/^\/(admin|assets|api)(\/|$)/.test(req.path)) {
      const date = helpers.todayStr();
      await db.prepare(`INSERT INTO analytics_daily (date, visitors, pageviews) VALUES (?, 0, 1)
        ON CONFLICT(date) DO UPDATE SET pageviews = analytics_daily.pageviews + 1`).run(date);
      if (!req.session.counted) {
        await db.prepare(`INSERT INTO analytics_daily (date, visitors, pageviews) VALUES (?, 1, 0)
          ON CONFLICT(date) DO UPDATE SET visitors = analytics_daily.visitors + 1`).run(date);
        req.session.counted = true;
      }
      await db.prepare(`INSERT INTO page_stats (path, date, views) VALUES (?, ?, 1)
        ON CONFLICT(path, date) DO UPDATE SET views = page_stats.views + 1`).run(req.path, date);
      await db.prepare(`INSERT INTO analytics_sources (source, date, count) VALUES (?, ?, 1)
        ON CONFLICT(source, date) DO UPDATE SET count = analytics_sources.count + 1`)
        .run(helpers.sourceLabel(req.get('referer')), date);
    }
  } catch (e) { /* tracking must never break a page */ }
  next();
});

require('./routes/public')(app);
require('./routes/tools')(app);
require('./routes/admin')(app);

/* 404 — friendly page, no stack traces. */
app.use(async (req, res) => {
  res.status(404).render('public/404', {
    seoTitle: `Page Not Found | ${res.locals.site.site_name}`,
    seoDesc: 'The page you are looking for does not exist.',
    canonical: null,
    ogImage: null,
    schema: null,
  });
});

/* 500 — log it, show a friendly page, never leak internals. */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err && err.message ? err.message : err);
  if (res.headersSent) return next(err);
  const siteName = (res.locals.site && res.locals.site.site_name) || 'TubeBoost';
  res.status(err.status || 500).render('public/500', {
    site: res.locals.site || { site_name: siteName, seo_site_title: siteName, seo_meta_description: '' },
    seoTitle: `Something went wrong | ${siteName}`,
    seoDesc: 'An unexpected error occurred. Please try again.',
    canonical: null,
    ogImage: null,
    schema: null,
  });
});

module.exports = app;

/* Local dev: `node server.js`. On Vercel the serverless entry (api/index.js)
 * requires the app instead — do not listen there. */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    const base = (process.env.SITE_URL || '').replace(/\/+$/, '') || `http://localhost:${PORT}`;
    console.log(`TubeBoost running at ${base}`);
    try {
      const row = await db.prepare('SELECT COUNT(*) AS c FROM admins').get();
      if (!row || Number(row.c) === 0) console.log('No admin users yet — visit /admin/setup to create the first admin.');
    } catch (e) { /* ignore */ }
  });
}
