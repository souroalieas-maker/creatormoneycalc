'use strict';
/*
 * CreatorMoneyCalc — Admin routes.
 * Mounted by server.js via: require('./routes/admin')(app)
 *
 * NOTE on CSRF + file uploads: csrfProtect is applied per-POST-route in this
 * file. On the multipart upload route (POST /admin/settings/upload) multer runs
 * BEFORE csrfProtect so the _csrf field can be read from the parsed body.
 * server.js applies csrfProtect globally BEFORE admin routes are mounted, so
 * multipart uploads will 403 there — mount admin routes before any global
 * csrfProtect, or apply csrfProtect per-route, to keep uploads working.
 */
const crypto = require('crypto');
const path = require('path');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const { db, get, set, calcSettings, adSlots, nowStr } = require('../lib/db');
const { hashPassword, verifyPassword, genRecoveryCode, requireAdmin } = require('../lib/auth');
const { csrfProtect } = require('../lib/csrf');
const { put, del } = require('@vercel/blob');
const { fmtUSD, todayStr, slugify } = require('../lib/helpers');

/* ---------- small validation helpers ---------- */
const trim = (v) => String(v ?? '').trim();
const cap = (s, n) => trim(s).slice(0, n);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim(s));
const num = (v) => {
  const n = parseFloat(trim(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const isId = (v) => /^\d+$/.test(String(v || ''));

/* ---------- flash messages (via session, exposed as `flash` local) ---------- */
function setFlash(req, type, msg) {
  req.session.flash = { type, msg };
}

/* ---------- multer: logo / favicon uploads (memory -> Vercel Blob; no disk on serverless) ---------- */
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (/^image\//.test(file.mimetype || '') && ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error('Only image files (png, jpg, gif, webp, svg, ico) up to 2MB are allowed.'));
  },
});
const uploadFields = upload.fields([
  { name: 'logo_file', maxCount: 1 },
  { name: 'favicon_file', maxCount: 1 },
]);

/* ---------- rate limiters (one per auth endpoint: 5 attempts / 15 min each) ---------- */
const makeAuthLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many attempts, try again later.',
});
const loginLimiter = makeAuthLimiter();
const setupLimiter = makeAuthLimiter();
const forgotLimiter = makeAuthLimiter();

/* ---------- analytics helpers ---------- */
function lastNDays(n) {
  const days = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d);
    t.setDate(d.getDate() - i);
    days.push(t.toISOString().slice(0, 10));
  }
  return days;
}
async function dailyRows(days) {
  const rows = await db.prepare(
    'SELECT date, visitors, pageviews FROM analytics_daily WHERE date >= ? ORDER BY date'
  ).all(days[0]);
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));
  return days.map((date) => ({
    date,
    visitors: byDate[date] ? byDate[date].visitors : 0,
    pageviews: byDate[date] ? byDate[date].pageviews : 0,
  }));
}
const sumVisitors = async (from) =>
  await db.prepare("SELECT COALESCE(SUM(visitors),0) AS v, COALESCE(SUM(pageviews),0) AS p FROM analytics_daily WHERE date >= ?").get(from);
const sumCalcUses = async (from) =>
  (await db.prepare('SELECT COALESCE(SUM(uses),0) AS u FROM calc_usage WHERE date >= ?').get(from)).u;
const sumBlogViews = async () =>
  (await db.prepare('SELECT COALESCE(SUM(views),0) AS v FROM blog_posts').get()).v;

const AD_LOCATIONS = [
  ['header', 'Header — below navigation'],
  ['homepage', 'Homepage — below hero'],
  ['calculator', 'Calculator pages — top / sidebar'],
  ['blog_content', 'Inside blog articles'],
  ['before_result', 'Before calculator results'],
  ['after_result', 'After calculator results'],
  ['footer', 'Footer — above footer'],
];
const CALC_KEYS = ['earnings', 'shorts', 'rpm', 'views-money', 'engagement'];

/* ================================================================ */
module.exports = function registerAdmin(app) {

  /* flash + unread badge available to every /admin view */
  app.use('/admin', async (req, res, next) => {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    try {
      res.locals.unreadCount =
        (await db.prepare('SELECT COUNT(*) AS c FROM contact_messages WHERE is_read = 0').get()).c;
    } catch { res.locals.unreadCount = 0; }
    next();
  });

  const renderAdmin = (res, contentView, opts = {}) =>
    res.render('admin/layout', { active: '', pageTitle: 'Admin', contentView, ...opts });

  const adminCount = async () =>
    (await db.prepare('SELECT COUNT(*) AS c FROM admins').get()).c;

  /* ---------------- bare /admin ---------------- */
  app.get('/admin', requireAdmin, async (req, res) => res.redirect('/admin/dashboard'));

  /* ---------------- login ---------------- */
  app.get('/admin/login', async (req, res) => {
    if ((await adminCount()) === 0) return res.redirect('/admin/setup');
    if (req.session.adminId) return res.redirect('/admin/dashboard');
    res.render('admin/login', { error: null, email: '' });
  });

  app.post('/admin/login', loginLimiter, csrfProtect, async (req, res) => {
    const email = trim(req.body.email).toLowerCase();
    const fail = () =>
      res.status(401).render('admin/login', { error: 'Invalid email or password.', email: trim(req.body.email) });
    const admin = await db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
    if (!admin || !verifyPassword(String(req.body.password || ''), admin.password_hash)) return fail();
    req.session.regenerate((err) => {
      if (err) return fail();
      req.session.adminId = admin.id;
      req.session.save(() => res.redirect('/admin/dashboard'));
    });
  });

  /* ---------------- first-run setup ---------------- */
  app.get('/admin/setup', async (req, res) => {
    if ((await adminCount()) > 0) return res.redirect('/admin/login');
    res.render('admin/setup', { error: null, email: '', needsToken: !!process.env.ADMIN_SETUP_TOKEN });
  });

  app.post('/admin/setup', setupLimiter, csrfProtect, async (req, res) => {
    if ((await adminCount()) > 0) return res.redirect('/admin/login');
    const show = (error) =>
      res.status(400).render('admin/setup', { error, email: trim(req.body.email), needsToken: !!process.env.ADMIN_SETUP_TOKEN });
    if (process.env.ADMIN_SETUP_TOKEN && trim(req.body.token) !== process.env.ADMIN_SETUP_TOKEN)
      return show('Invalid setup token.');
    const email = trim(req.body.email).toLowerCase();
    const pw = String(req.body.password || '');
    if (!isEmail(email)) return show('Please enter a valid email address.');
    if (pw.length < 10) return show('Password must be at least 10 characters.');
    if (pw !== String(req.body.confirm || '')) return show('Passwords do not match.');
    try {
      const info = await db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?) RETURNING id').run(email, hashPassword(pw));
      const code = genRecoveryCode();
      await db.prepare('UPDATE admins SET recovery_hash = ? WHERE id = ?').run(hashPassword(code), info.lastInsertRowid);
      req.session.regenerate((err) => {
        if (!err) req.session.adminId = info.lastInsertRowid;
        res.render('admin/setup-success', {
          code,
          heading: 'Admin account created',
          note: 'Save this recovery code now — it will not be shown again. You need it to reset your password.',
        });
      });
    } catch (e) {
      return show('That email is already registered.');
    }
  });

  /* ---------------- forgot / reset password ---------------- */
  app.get('/admin/forgot', async (req, res) => {
    res.render('admin/forgot', { error: null, email: '' });
  });

  app.post('/admin/forgot', forgotLimiter, csrfProtect, async (req, res) => {
    const email = trim(req.body.email).toLowerCase();
    const show = (error) =>
      res.status(400).render('admin/forgot', { error, email: trim(req.body.email) });
    const admin = await db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
    const raw = trim(req.body.recovery_code);
    const compact = raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const dashed = compact.length === 12
      ? compact.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3')
      : compact;
    const ok = admin && admin.recovery_hash &&
      (verifyPassword(raw, admin.recovery_hash) || verifyPassword(dashed, admin.recovery_hash));
    if (!ok) return show('Invalid email or recovery code.');
    req.session.resetAdminId = admin.id;
    res.render('admin/reset', { error: null });
  });

  app.post('/admin/reset', csrfProtect, async (req, res) => {
    const adminId = req.session.resetAdminId;
    if (!adminId) return res.redirect('/admin/forgot');
    const pw = String(req.body.password || '');
    if (pw.length < 10)
      return res.status(400).render('admin/reset', { error: 'Password must be at least 10 characters.' });
    if (pw !== String(req.body.confirm || ''))
      return res.status(400).render('admin/reset', { error: 'Passwords do not match.' });
    const code = genRecoveryCode();
    await db.prepare('UPDATE admins SET password_hash = ?, recovery_hash = ? WHERE id = ?')
      .run(hashPassword(pw), hashPassword(code), adminId);
    delete req.session.resetAdminId;
    res.render('admin/setup-success', {
      code,
      heading: 'Password reset',
      note: 'Your old recovery code is now invalid. Save this new one — it will not be shown again.',
    });
  });

  /* ---------------- logout ---------------- */
  app.post('/admin/logout', csrfProtect, async (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
  });

  /* ---------------- dashboard ---------------- */
  app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    const days14 = lastNDays(14);
    const daily = await dailyRows(days14);
    const today = todayStr();
    const todayRow = await db.prepare('SELECT visitors, pageviews FROM analytics_daily WHERE date = ?').get(today);
    const weekAgo = lastNDays(7)[0];
    const topPages = await db.prepare(
      'SELECT path, SUM(views) AS views FROM page_stats WHERE date >= ? GROUP BY path ORDER BY views DESC LIMIT 5'
    ).all(weekAgo);
    const unread = (await db.prepare('SELECT COUNT(*) AS c FROM contact_messages WHERE is_read = 0').get()).c;
    const recentMessages = await db.prepare(
      'SELECT id, name, email, message, created_at FROM contact_messages WHERE is_read = 0 ORDER BY created_at DESC LIMIT 5'
    ).all();
    const revenue = parseFloat(await get('ad_revenue_estimate')) || 0;

    renderAdmin(res, 'dashboard', {
      active: 'dashboard',
      pageTitle: 'Dashboard',
      stats: {
        totalVisitors: (await db.prepare('SELECT COALESCE(SUM(visitors),0) AS v FROM analytics_daily').get()).v,
        visitorsToday: todayRow ? todayRow.visitors : 0,
        calcUses: (await db.prepare('SELECT COALESCE(SUM(uses),0) AS u FROM calc_usage').get()).u,
        blogViews: await sumBlogViews(),
        revenue,
        revenueFmt: fmtUSD(revenue),
      },
      chart: {
        labels: daily.map((d) => d.date),
        visitors: daily.map((d) => d.visitors),
        pageviews: daily.map((d) => d.pageviews),
      },
      topPages,
      unread,
      recentMessages,
    });
  });

  /* small inline form on the dashboard: update estimated ad revenue */
  app.post('/admin/dashboard/revenue', requireAdmin, csrfProtect, async (req, res) => {
    const v = num(req.body.ad_revenue_estimate);
    if (Number.isNaN(v) || v < 0) {
      setFlash(req, 'error', 'Enter a valid non-negative revenue amount.');
    } else {
      await set('ad_revenue_estimate', String(Math.round(v * 100) / 100));
      setFlash(req, 'success', 'Estimated ad revenue updated.');
    }
    res.redirect('/admin/dashboard');
  });

  /* ---------------- analytics ---------------- */
  app.get('/admin/analytics', requireAdmin, async (req, res) => {
    const days30 = lastNDays(30);
    const daily = await dailyRows(days30);
    const today = todayStr();
    const todayRow = await db.prepare('SELECT visitors, pageviews FROM analytics_daily WHERE date = ?').get(today) || { visitors: 0, pageviews: 0 };
    const w = await sumVisitors(lastNDays(7)[0]);
    const m = await sumVisitors(days30[0]);
    const all = await db.prepare('SELECT COALESCE(SUM(visitors),0) AS v, COALESCE(SUM(pageviews),0) AS p FROM analytics_daily').get();
    const calcRows = await db.prepare(
      'SELECT calc_id, SUM(uses) AS uses FROM calc_usage GROUP BY calc_id ORDER BY uses DESC'
    ).all();
    const calcTitles = Object.fromEntries(
      (await db.prepare('SELECT key, title FROM calculator_settings').all()).map((r) => [r.key, r.title])
    );
    const mostUsed = calcRows[0] || null;
    const topPost = await db.prepare(
      "SELECT title, slug, views FROM blog_posts WHERE status = 'published' ORDER BY views DESC LIMIT 1"
    ).get();
    const topPages = await db.prepare(
      'SELECT path, SUM(views) AS views FROM page_stats WHERE date >= ? GROUP BY path ORDER BY views DESC LIMIT 10'
    ).all(days30[0]);
    const sources = await db.prepare(
      'SELECT source, SUM(count) AS count FROM analytics_sources WHERE date >= ? GROUP BY source ORDER BY count DESC'
    ).all(days30[0]);

    renderAdmin(res, 'analytics', {
      active: 'analytics',
      pageTitle: 'Analytics',
      totals: {
        visitors: all.v, pageviews: all.p,
        calcUses: (await db.prepare('SELECT COALESCE(SUM(uses),0) AS u FROM calc_usage').get()).u,
        blogViews: await sumBlogViews(),
      },
      periods: {
        today: { visitors: todayRow.visitors, pageviews: todayRow.pageviews, calcUses: await sumCalcUses(today) },
        week: { visitors: w.v, pageviews: w.p, calcUses: await sumCalcUses(lastNDays(7)[0]) },
        month: { visitors: m.v, pageviews: m.p, calcUses: await sumCalcUses(days30[0]) },
      },
      calcRows: calcRows.map((r) => ({ ...r, title: calcTitles[r.calc_id] || r.calc_id })),
      mostUsed: mostUsed ? { ...mostUsed, title: calcTitles[mostUsed.calc_id] || mostUsed.calc_id } : null,
      topPost: topPost || null,
      topPages,
      sources,
      chart: {
        labels: daily.map((d) => d.date),
        visitors: daily.map((d) => d.visitors),
        pageviews: daily.map((d) => d.pageviews),
      },
    });
  });

  /* ---------------- calculators ---------------- */
  app.get('/admin/calculators', requireAdmin, async (req, res) => {
    renderAdmin(res, 'calculators', {
      active: 'calculators',
      pageTitle: 'Calculators',
      calcs: await calcSettings(),
      keys: CALC_KEYS,
      error: null,
    });
  });

  app.post('/admin/calculators', requireAdmin, csrfProtect, async (req, res) => {
    const current = await calcSettings();
    const fail = (msg) =>
      res.status(400).render('admin/layout', {
        active: 'calculators', pageTitle: 'Calculators', contentView: 'calculators',
        calcs: current, keys: CALC_KEYS, error: msg,
      });
    const updates = [];
    try {
      for (const key of CALC_KEYS) {
        const cur = current[key];
        if (!cur) continue;
        const p = `${key}_`;
        const title = cap(req.body[p + 'title'], 200) || cur.title;
        const description = cap(req.body[p + 'description'], 2000);
        const enabled = req.body[p + 'enabled'] ? 1 : 0;
        const def = { ...cur.defaults };
        const needNum = (field, label) => {
          const v = num(req.body[p + field]);
          if (Number.isNaN(v) || v < 0) throw new Error(`Invalid number for ${label}.`);
          return v;
        };
        if (key === 'earnings') {
          def.default_rpm = needNum('default_rpm', 'Earnings default RPM');
          def.country_rpms = def.country_rpms || {};
          for (const country of Object.keys(def.country_rpms)) {
            const raw = trim(req.body[p + 'rpm_' + country]);
            const m = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
            if (!m) throw new Error(`Invalid RPM range for ${country} — use "low-high", e.g. 3-8.`);
            const lo = parseFloat(m[1]), hi = parseFloat(m[2]);
            if (lo > hi) throw new Error(`Invalid RPM range for ${country} — low must be ≤ high.`);
            def.country_rpms[country] = [lo, hi];
          }
        } else if (key === 'shorts') {
          def.default_shorts_rpm = needNum('default_shorts_rpm', 'Shorts default RPM');
          def.shorts_rpm_hint = cap(req.body[p + 'shorts_rpm_hint'], 100);
          def.note = cap(req.body[p + 'note'], 2000);
        } else if (key === 'rpm') {
          def.default_revenue = needNum('default_revenue', 'RPM default revenue');
          def.default_views = needNum('default_views', 'RPM default views');
        } else if (key === 'views-money') {
          def.default_rpm = needNum('default_rpm', 'Views-to-money default RPM');
        } else if (key === 'engagement') {
          def.guide = cap(req.body[p + 'guide'], 2000);
        }
        updates.push({ key, title, description, enabled, json: JSON.stringify(def) });
      }
    } catch (e) {
      return fail(e.message);
    }
    const stmt = await db.prepare(
      'UPDATE calculator_settings SET title = ?, description = ?, enabled = ?, defaults_json = ? WHERE key = ?'
    );
    for (const u of updates) stmt.run(u.title, u.description, u.enabled, u.json, u.key);
    setFlash(req, 'success', 'Calculator settings saved.');
    res.redirect('/admin/calculators');
  });

  /* ---------------- blog ---------------- */
  app.get('/admin/blog', requireAdmin, async (req, res) => {
    const posts = await db.prepare(
      'SELECT id, slug, title, status, views, updated_at FROM blog_posts ORDER BY updated_at DESC'
    ).all();
    renderAdmin(res, 'blog-list', { active: 'blog', pageTitle: 'Blog Posts', posts });
  });

  app.get('/admin/blog/new', requireAdmin, async (req, res) => {
    renderAdmin(res, 'blog-form', {
      active: 'blog', pageTitle: 'New Post', error: null, isNew: true,
      post: { title: '', slug: '', category: '', tags: '', image: '', seo_title: '', meta_description: '', body_md: '', status: 'draft' },
    });
  });

  const readBlogFields = (body) => ({
    title: cap(body.title, 200),
    slug: cap(body.slug, 100) || slugify(body.title),
    category: cap(body.category, 100),
    tags: cap(body.tags, 200),
    image: cap(body.image, 500),
    seo_title: cap(body.seo_title, 200),
    meta_description: cap(body.meta_description, 300),
    body_md: String(body.body_md ?? '').slice(0, 200000),
    status: body.status === 'published' ? 'published' : 'draft',
  });

  app.post('/admin/blog', requireAdmin, csrfProtect, async (req, res) => {
    const f = readBlogFields(req.body);
    const show = (error) =>
      res.status(400).render('admin/layout', {
        active: 'blog', pageTitle: 'New Post', contentView: 'blog-form', error, isNew: true, post: f,
      });
    if (!f.title) return show('Title is required.');
    if (!f.slug) return show('Slug is required.');
    if (await db.prepare('SELECT 1 FROM blog_posts WHERE slug = ?').get(f.slug)) return show('That slug is already used.');
    await db.prepare(`INSERT INTO blog_posts
      (slug, title, category, tags, image, seo_title, meta_description, body_md, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(f.slug, f.title, f.category, f.tags, f.image, f.seo_title, f.meta_description, f.body_md, f.status);
    setFlash(req, 'success', 'Post created.');
    res.redirect('/admin/blog');
  });

  app.get('/admin/blog/:id/edit', requireAdmin, async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).send('Not found');
    const post = await db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).send('Not found');
    renderAdmin(res, 'blog-form', {
      active: 'blog', pageTitle: 'Edit Post', error: null, isNew: false, post,
    });
  });

  app.post('/admin/blog/:id', requireAdmin, csrfProtect, async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).send('Not found');
    const cur = await db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
    if (!cur) return res.status(404).send('Not found');
    const f = readBlogFields(req.body);
    const show = (error) =>
      res.status(400).render('admin/layout', {
        active: 'blog', pageTitle: 'Edit Post', contentView: 'blog-form', error, isNew: false, post: { ...cur, ...f },
      });
    if (!f.title) return show('Title is required.');
    if (!f.slug) return show('Slug is required.');
    if (await db.prepare('SELECT 1 FROM blog_posts WHERE slug = ? AND id != ?').get(f.slug, req.params.id))
      return show('That slug is already used.');
    await db.prepare(`UPDATE blog_posts SET slug = ?, title = ?, category = ?, tags = ?, image = ?,
      seo_title = ?, meta_description = ?, body_md = ?, status = ?, updated_at = ? WHERE id = ?`)
      .run(f.slug, f.title, f.category, f.tags, f.image, f.seo_title, f.meta_description, f.body_md, f.status, nowStr(), req.params.id);
    setFlash(req, 'success', 'Post updated.');
    res.redirect('/admin/blog');
  });

  app.post('/admin/blog/:id/toggle', requireAdmin, csrfProtect, async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).send('Not found');
    const cur = await db.prepare('SELECT status FROM blog_posts WHERE id = ?').get(req.params.id);
    if (!cur) return res.status(404).send('Not found');
    await db.prepare("UPDATE blog_posts SET status = ?, updated_at = ? WHERE id = ?")
      .run(cur.status === 'published' ? 'draft' : 'published', nowStr(), req.params.id);
    setFlash(req, 'success', cur.status === 'published' ? 'Post unpublished.' : 'Post published.');
    res.redirect('/admin/blog');
  });

  app.post('/admin/blog/:id/delete', requireAdmin, csrfProtect, async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).send('Not found');
    await db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
    setFlash(req, 'success', 'Post deleted.');
    res.redirect('/admin/blog');
  });

  /* ---------------- pages ---------------- */
  app.get('/admin/pages', requireAdmin, async (req, res) => {
    const pages = await db.prepare('SELECT slug, title, updated_at FROM pages ORDER BY slug').all();
    renderAdmin(res, 'pages-list', { active: 'pages', pageTitle: 'Pages', pages });
  });

  app.get('/admin/pages/:slug', requireAdmin, async (req, res) => {
    const page = await db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
    if (!page) return res.status(404).send('Not found');
    renderAdmin(res, 'page-form', { active: 'pages', pageTitle: 'Edit Page', error: null, page });
  });

  app.post('/admin/pages/:slug', requireAdmin, csrfProtect, async (req, res) => {
    const page = await db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
    if (!page) return res.status(404).send('Not found');
    const title = cap(req.body.title, 200);
    const body_md = String(req.body.body_md ?? '').slice(0, 200000);
    if (!title) {
      return res.status(400).render('admin/layout', {
        active: 'pages', pageTitle: 'Edit Page', contentView: 'page-form',
        error: 'Title is required.', page: { ...page, title, body_md },
      });
    }
    await db.prepare("UPDATE pages SET title = ?, body_md = ?, updated_at = ? WHERE slug = ?")
      .run(title, body_md, nowStr(), req.params.slug);
    setFlash(req, 'success', 'Page updated.');
    res.redirect('/admin/pages');
  });

  /* ---------------- advertisements ---------------- */
  app.get('/admin/ads', requireAdmin, async (req, res) => {
    renderAdmin(res, 'ads', {
      active: 'ads', pageTitle: 'Advertisements', locations: AD_LOCATIONS, slots: await adSlots(), error: null,
    });
  });

  app.post('/admin/ads', requireAdmin, csrfProtect, async (req, res) => {
    const stmt = await db.prepare(`INSERT INTO ad_slots (location, desktop_code, mobile_code, enabled)
      VALUES (?, ?, ?, ?) ON CONFLICT(location) DO UPDATE SET
      desktop_code = excluded.desktop_code, mobile_code = excluded.mobile_code, enabled = excluded.enabled`);
    for (const [loc] of AD_LOCATIONS) {
      const p = `ads_${loc}_`;
      stmt.run(
        loc,
        String(req.body[p + 'desktop'] ?? '').slice(0, 20000),
        String(req.body[p + 'mobile'] ?? '').slice(0, 20000),
        req.body[p + 'enabled'] ? 1 : 0
      );
    }
    setFlash(req, 'success', 'Ad slots saved.');
    res.redirect('/admin/ads');
  });

  /* ---------------- SEO ---------------- */
  const SEO_FIELDS = [
    ['seo_site_title', 'Site Title', 200],
    ['seo_meta_description', 'Meta Description', 300],
    ['seo_keywords', 'Keywords (comma separated)', 300],
    ['seo_home_title', 'Homepage SEO Title', 200],
    ['seo_home_description', 'Homepage Meta Description', 300],
    ['og_image', 'Default Social Image URL (og:image)', 500],
    ['google_verification', 'Google Site Verification Code', 200],
    ['bing_verification', 'Bing Site Verification Code', 200],
  ];
  app.get('/admin/seo', requireAdmin, async (req, res) => {
    const s = {};
    for (const [k] of SEO_FIELDS) s[k] = await get(k);
    renderAdmin(res, 'seo', { active: 'seo', pageTitle: 'SEO Settings', fields: SEO_FIELDS, s, error: null });
  });

  app.post('/admin/seo', requireAdmin, csrfProtect, async (req, res) => {
    for (const [k, , max] of SEO_FIELDS) await set(k, cap(req.body[k], max));
    setFlash(req, 'success', 'SEO settings saved.');
    res.redirect('/admin/seo');
  });

  /* ---------------- website settings ---------------- */
  const SETTING_FIELDS = [
    ['site_name', 'Site Name', 100],
    ['tagline', 'Tagline', 200],
    ['contact_email', 'Contact Email', 200],
    ['footer_text', 'Footer Text', 500],
    ['social_youtube', 'YouTube URL', 300],
    ['social_x', 'X (Twitter) URL', 300],
    ['social_instagram', 'Instagram URL', 300],
    ['social_tiktok', 'TikTok URL', 300],
    ['logo_url', 'Logo Image URL', 500],
    ['favicon_url', 'Favicon URL', 500],
  ];
  app.get('/admin/settings', requireAdmin, async (req, res) => {
    const s = {};
    for (const [k] of SETTING_FIELDS) s[k] = await get(k);
    renderAdmin(res, 'settings', { active: 'settings', pageTitle: 'Website Settings', fields: SETTING_FIELDS, s });
  });

  app.post('/admin/settings', requireAdmin, csrfProtect, async (req, res) => {
    for (const [k, , max] of SETTING_FIELDS) {
      const v = cap(req.body[k], max);
      if (k === 'contact_email' && v && !isEmail(v)) {
        setFlash(req, 'error', 'Please enter a valid contact email address.');
        return res.redirect('/admin/settings');
      }
      await set(k, v);
    }
    setFlash(req, 'success', 'Website settings saved.');
    res.redirect('/admin/settings');
  });

  /* logo / favicon file upload (multipart — multer runs before csrfProtect).
   * Files go to Vercel Blob (public URL saved in settings); serverless has no disk. */
  app.post('/admin/settings/upload',
    requireAdmin,
    async (req, res, next) => uploadFields(req, res, (err) => {
      if (err) {
        setFlash(req, 'error', 'Upload failed: ' + err.message);
        return res.redirect('/admin/settings');
      }
      next();
    }),
    csrfProtect,
    async (req, res) => {
      const files = req.files || {};
      const replace = async (field, file) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
        const blob = await put(`uploads/${field}-${Date.now()}${ext}`, file.buffer, {
          access: 'public',
          contentType: file.mimetype || 'image/png',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        const old = await get(field);
        await set(field, blob.url);
        if (old && /blob\.vercel-storage\.com/.test(old)) {
          try { await del(old, { token: process.env.BLOB_READ_WRITE_TOKEN }); } catch { /* ignore */ }
        }
      };
      try {
        if (files.logo_file && files.logo_file[0]) await replace('logo_url', files.logo_file[0]);
        if (files.favicon_file && files.favicon_file[0]) await replace('favicon_url', files.favicon_file[0]);
        if (!files.logo_file && !files.favicon_file) {
          setFlash(req, 'error', 'Choose an image file first.');
        } else {
          setFlash(req, 'success', 'Image(s) uploaded.');
        }
      } catch (e) {
        setFlash(req, 'error', 'Upload failed: ' + (e.message || e));
      }
      res.redirect('/admin/settings');
    }
  );

  /* ---------------- contact messages ---------------- */
  app.get('/admin/messages', requireAdmin, async (req, res) => {
    const messages = await db.prepare(
      'SELECT id, name, email, message, is_read, created_at FROM contact_messages ORDER BY created_at DESC'
    ).all();
    renderAdmin(res, 'messages', { active: 'messages', pageTitle: 'Messages', messages });
  });

  app.post('/admin/messages/:id/read', requireAdmin, csrfProtect, async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).send('Not found');
    await db.prepare('UPDATE contact_messages SET is_read = 1 - is_read WHERE id = ?').run(req.params.id);
    res.redirect('/admin/messages');
  });

  app.post('/admin/messages/:id/delete', requireAdmin, csrfProtect, async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).send('Not found');
    await db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
    setFlash(req, 'success', 'Message deleted.');
    res.redirect('/admin/messages');
  });
};
