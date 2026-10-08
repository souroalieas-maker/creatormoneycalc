'use strict';
/*
 * CreatorMoneyCalc — Postgres data layer (Vercel serverless).
 * Async API mirroring the old SQLite layer:
 *   db.prepare(sql) -> { get(...p), all(...p), run(...p) }   (all async)
 *   db.exec(sql)                                            (async)
 *   get(key), set(key, val), siteObj(), calcSettings(), adSlots(), nowStr()
 * `?` placeholders are converted to $1, $2, ... (quote-aware).
 * Timestamps are stored as TEXT in "YYYY-MM-DD HH:MM:SS" (UTC), exactly like
 * the old SQLite datetime('now') values, so views need no changes.
 */
const pg = require('pg');
const { Pool } = pg;
if (pg.types) {
  pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // int8 -> number
  pg.types.setTypeParser(1700, parseFloat); // numeric -> number
}

let _pool = null;
function pool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      options: '-c timezone=UTC',
    });
    _pool.on('error', (e) => console.error('[pg pool error]', e.message));
  }
  return _pool;
}

/* Convert ? placeholders to $1, $2... skipping quoted string literals. */
function toPg(sql) {
  let out = '', i = 0, inS = false, q = '';
  for (let n = 0; n < sql.length; n++) {
    const c = sql[n];
    if (inS) {
      out += c;
      if (c === q) {
        if (sql[n + 1] === q) { out += q; n++; } // '' escaped quote
        else inS = false;
      }
    } else if (c === "'" || c === '"') { inS = true; q = c; out += c; }
    else if (c === '?') { out += '$' + (++i); }
    else out += c;
  }
  return out;
}

const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const TS_DEFAULT = `DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))`; // UTC via options:'-c timezone=UTC'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  recovery_hash TEXT,
  created_at TEXT NOT NULL ${TS_DEFAULT}
);
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  image TEXT DEFAULT '',
  seo_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  body_md TEXT NOT NULL DEFAULT '',
  faqs TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL ${TS_DEFAULT},
  updated_at TEXT NOT NULL ${TS_DEFAULT}
);
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL ${TS_DEFAULT}
);
CREATE TABLE IF NOT EXISTS calculator_settings (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  defaults_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS ad_slots (
  location TEXT PRIMARY KEY,
  desktop_code TEXT NOT NULL DEFAULT '',
  mobile_code TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS analytics_daily (
  date TEXT PRIMARY KEY,
  visitors INTEGER NOT NULL DEFAULT 0,
  pageviews INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS page_stats (
  path TEXT NOT NULL,
  date TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (path, date)
);
CREATE TABLE IF NOT EXISTS calc_usage (
  calc_id TEXT NOT NULL,
  date TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (calc_id, date)
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL ${TS_DEFAULT}
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  expires BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS analytics_sources (
  source TEXT NOT NULL,
  date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (source, date)
);
`;

let _ready = null;
function init() {
  if (!_ready) {
    _ready = (async () => {
      await pool().query(SCHEMA);
      await seedDefaults();
    })().catch((e) => { _ready = null; throw e; });
  }
  return _ready;
}

/* Raw query: no init() — for use inside seedDefaults() (already within init). */
function rawQuery(sql, params) {
  return pool().query(toPg(sql), params || []);
}
/* Seed-scoped query helper mirroring prepare() but without re-entering init(). */
function seedPrepare(sql) {
  const text = toPg(sql);
  return {
    get: (...p) => rawQuery(text, p).then((r) => r.rows[0]),
    all: (...p) => rawQuery(text, p).then((r) => r.rows),
    run: (...p) => rawQuery(text, p).then((r) => ({
      changes: r.rowCount,
      lastInsertRowid: r.rows && r.rows[0] ? r.rows[0].id : undefined,
    })),
  };
}

function prepare(sql) {
  const text = toPg(sql);
  return {
    get: async (...p) => { await init(); return (await rawQuery(text, p)).rows[0]; },
    all: async (...p) => { await init(); return (await rawQuery(text, p)).rows; },
    run: async (...p) => {
      await init();
      const r = await rawQuery(text, p);
      return { changes: r.rowCount, lastInsertRowid: r.rows && r.rows[0] ? r.rows[0].id : undefined };
    },
  };
}
async function exec(sql) { await init(); await rawQuery(sql); }

const get = async (k) => {
  const row = await prepare('SELECT value FROM site_settings WHERE key = ?').get(k);
  return row ? row.value : '';
};
const set = async (k, v) => {
  await prepare(`INSERT INTO site_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(k, String(v ?? ''));
};

async function seedDefaults() {
  const prepare = seedPrepare;
  const set = async (k, v) => {
    await prepare(`INSERT INTO site_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(k, String(v ?? ''));
  };
  const path = require('path');
  const fs = require('fs');
  // ---- calculator settings ----
  const calcs = [
    ['earnings', 'YouTube Earnings Calculator',
      'Estimate your potential monthly, weekly, daily and yearly YouTube earnings from views and RPM.',
      { default_rpm: 4.0, country_rpms: { 'United States': [3, 8], 'Canada': [2.5, 6], 'United Kingdom': [2.5, 6], 'Australia': [2.5, 6], 'Pakistan': [0.4, 1.2], 'India': [0.3, 1], 'Other': [1, 3] } }],
    ['rpm', 'YouTube RPM Calculator',
      'Calculate your Revenue Per Mille (RPM) from your estimated revenue and total views.',
      { default_revenue: 120, default_views: 30000 }],
    ['shorts', 'YouTube Shorts Earnings Calculator',
      'Estimate your YouTube Shorts earnings. Shorts RPM is much lower than long-form RPM.',
      { default_shorts_rpm: 0.07, shorts_rpm_hint: '$0.03 – $0.10', note: 'Shorts revenue comes from a shared ad pool, so Shorts RPM is typically a fraction of long-form RPM.' }],
    ['views-money', 'YouTube Views to Money Calculator',
      'See how much 1K, 10K, 100K, 1M and 10M views could be worth at your RPM.',
      { default_rpm: 4.0 }],
    ['engagement', 'YouTube Engagement Calculator',
      'Measure how engaged your audience is from views, likes, comments and shares.',
      { guide: '<1% low · 1–3% average · 3–6% good · >6% excellent (rough guide)' }],
    ['tiktok', 'TikTok Earnings Calculator',
      'Estimate your TikTok Creator Rewards earnings. TikTok pays far less per view than YouTube — most creators earn more from brand deals.',
      { default_tiktok_rate: 0.03, tiktok_rate_hint: '$0.02 – $0.04 per 1,000 qualified views', note: 'Only videos longer than 1 minute earn from Creator Rewards. Short clips earn nothing from the program.' }],
    ['facebook', 'Facebook Earnings Calculator',
      'Estimate your Facebook in-stream ad earnings from video views.',
      { default_fb_rpm: 3.0, fb_rpm_hint: '$1 – $5 per 1,000 views', note: 'Only monetized views on eligible videos earn revenue.' }],
  ];
  for (const [k, t, d, def] of calcs) {
    await prepare(`INSERT INTO calculator_settings
      (key, title, description, enabled, defaults_json) VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(key) DO NOTHING`).run(k, t, d, JSON.stringify(def));
  }

  // ---- site settings ----
  const site = {
    site_name: 'TubeBoost',
    tagline: 'Free YouTube Tools to Grow Your Channel',
    contact_email: 'hello@creatormoneycalc.com',
    footer_text: 'Free YouTube growth tools for creators.',
    social_youtube: '', social_x: '', social_instagram: '', social_tiktok: '',
    logo_url: '', favicon_url: '',
    seo_site_title: 'TubeBoost — Free YouTube Growth Tools',
    seo_meta_description: 'Free YouTube tools: earnings calculators, SEO description generator, tags, titles, keywords and more. Grow your channel faster.',
    seo_keywords: 'YouTube earnings calculator, YouTube money calculator, YouTube RPM calculator, how much does YouTube pay',
    seo_home_title: 'TubeBoost — Free YouTube Tools: Calculators, SEO & Growth',
    seo_home_description: 'Boost your YouTube growth with free tools: earnings calculators, SEO description generator, titles, tags and keyword research.',
    og_image: '',
    google_verification: '', bing_verification: '',
    ad_revenue_estimate: '0',
  };
  for (const [k, v] of Object.entries(site)) {
    const row = await prepare('SELECT 1 AS one FROM site_settings WHERE key = ?').get(k);
    if (!row) await set(k, v);
  }

  // ---- one-time brand rename: CreatorMoneyCalc -> TubeBoost (2026-10-08) ----
  // Only updates rows that still carry the old default values, so any
  // admin-customized setting is left untouched.
  const brandRenames = [
    ['site_name', 'CreatorMoneyCalc', 'TubeBoost'],
    ['tagline', 'Calculate Your YouTube Earnings in Seconds', 'Free YouTube Tools to Grow Your Channel'],
    ['footer_text', 'Free tools for YouTube creators.', 'Free YouTube growth tools for creators.'],
    ['seo_site_title', 'CreatorMoneyCalc — Free YouTube Earnings Calculators', 'TubeBoost — Free YouTube Growth Tools'],
    ['seo_meta_description', 'Free YouTube earnings, RPM, Shorts and engagement calculators. Estimate your potential creator revenue in seconds.', 'Free YouTube tools: earnings calculators, SEO description generator, tags, titles, keywords and more. Grow your channel faster.'],
    ['seo_home_title', 'YouTube Earnings Calculator — Estimate Your Revenue | CreatorMoneyCalc', 'TubeBoost — Free YouTube Tools: Calculators, SEO & Growth'],
    ['seo_home_description', 'Estimate your potential YouTube earnings from views and RPM in seconds. Free calculators for long-form video and Shorts.', 'Boost your YouTube growth with free tools: earnings calculators, SEO description generator, titles, tags and keyword research.'],
  ];
  for (const [k, oldV, newV] of brandRenames) {
    await prepare('UPDATE site_settings SET value = ? WHERE key = ? AND value = ?').run(newV, k, oldV);
  }
  await prepare(`UPDATE pages SET title = REPLACE(title, 'CreatorMoneyCalc', 'TubeBoost'),
    body_md = REPLACE(body_md, 'CreatorMoneyCalc', 'TubeBoost') WHERE slug = 'about'`).run();

  // ---- ad slots ----
  const slots = ['header', 'homepage', 'calculator', 'blog_content', 'before_result', 'after_result', 'footer'];
  for (const s of slots) {
    await prepare('INSERT INTO ad_slots (location) VALUES (?) ON CONFLICT(location) DO NOTHING').run(s);
  }

  // ---- pages ----
  const pages = {
    'about': ['About Us', `## About TubeBoost\n\nTubeBoost is a free toolkit for YouTube creators. We build simple, honest calculators that help you estimate potential earnings from views, RPM, Shorts and engagement — plus free SEO tools (descriptions, titles, tags, keywords, hashtags) to help your videos rank and get clicked.\n\n### Our approach\n\n- **Estimates, not promises.** Every result is clearly labeled as an estimate.\n- **Transparent formulas.** We show the exact math behind each calculator.\n- **No hype.** We never claim you will earn a specific amount.\n\n### How the estimates work\n\nLong-form earnings are estimated as \`(views / 1000) × RPM\`. Shorts use a separate, much lower RPM because Shorts revenue comes from a shared ad pool. Real revenue depends on monetized views, audience country, niche, season and ad demand.`],
    'contact': ['Contact Us', `## Contact Us\n\nHave a question, suggestion or found a bug? Send us a message using the form on this page and we will get back to you.\n\nWe read every message.`],
    'privacy-policy': ['Privacy Policy', `## Privacy Policy\n\n**Last updated: 2026**\n\n### What we collect\n\n- **Analytics:** we count page views and calculator uses in aggregate. We do not store IP addresses or personal identifiers in analytics.\n- **Contact messages:** if you use the contact form, we store your name, email and message so we can reply.\n\n### Cookies\n\nWe use a session cookie only for admin login. The public site works without tracking cookies.\n\n### Advertising\n\nIf advertisements are shown in the future, ad networks may use their own cookies subject to their policies.\n\n### Your rights\n\nYou can request deletion of a contact message you sent by emailing us.`],
    'terms': ['Terms of Service', `## Terms of Service\n\n### The service\n\nCreatorMoneyCalc provides free estimation tools for YouTube creators.\n\n### Estimates are not guarantees\n\nAll calculator results are **estimates**. Actual YouTube revenue varies based on RPM, monetized views, audience, niche, advertising demand and other factors. Nothing on this site is financial advice.\n\n### Acceptable use\n\nDo not abuse the calculators or attempt to disrupt the service.\n\n### Changes\n\nWe may update these terms; continued use means you accept the current version.`],
    'disclaimer': ['Disclaimer', `## Disclaimer\n\n### Earnings disclaimer\n\nCalculator results on CreatorMoneyCalc are **estimates for educational purposes only**. They are not a promise or guarantee of income. Actual YouTube revenue varies based on RPM, monetized views, audience country, niche, advertising demand and other factors.\n\n### Not financial advice\n\nNothing on this website constitutes financial, investment or business advice.\n\n### Content accuracy\n\nWe work to keep formulas and explanations accurate, but YouTube's monetization rules change. Always verify with YouTube's official documentation.`],
  };
  for (const [slug, [title, body]] of Object.entries(pages)) {
    await prepare('INSERT INTO pages (slug, title, body_md) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING')
      .run(slug, title, body);
  }

  // ---- blog seed import ----
  const seedFile = path.join(__dirname, '..', 'seed', 'blog_posts.json');
  const countRow = await prepare('SELECT COUNT(*) AS c FROM blog_posts').get();
  if (Number(countRow && countRow.c) === 0 && fs.existsSync(seedFile)) {
    const posts = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    for (const p of posts) {
      await prepare(`INSERT INTO blog_posts
        (slug, title, category, tags, image, seo_title, meta_description, body_md, faqs, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
        ON CONFLICT(slug) DO NOTHING`)
        .run(p.slug, p.title, p.category || '', p.tags || '', p.image || '',
          p.seo_title || '', p.meta_description || '', p.body_md, JSON.stringify(p.faqs || []));
    }
    console.log(`Seeded ${posts.length} blog posts.`);
  }
}

// ---- convenience accessors ----
async function siteObj() {
  const rows = await prepare('SELECT key, value FROM site_settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
async function calcSettings() {
  const rows = await prepare('SELECT * FROM calculator_settings').all();
  const out = {};
  for (const r of rows) {
    let def = {};
    try { def = JSON.parse(r.defaults_json); } catch { /* keep {} */ }
    out[r.key] = { title: r.title, description: r.description, enabled: !!r.enabled, defaults: def };
  }
  return out;
}
async function adSlots() {
  const rows = await prepare('SELECT * FROM ad_slots').all();
  return Object.fromEntries(rows.map(r => [r.location, r]));
}

module.exports = { db: { prepare, exec }, get, set, siteObj, calcSettings, adSlots, nowStr, pool };
