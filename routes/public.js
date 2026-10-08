'use strict';
/*
 * CreatorMoneyCalc — public routes.
 * Exports registerPublic(app). Admin routes live in routes/admin.js.
 */
const { db } = require('../lib/db');
const { md } = require('../lib/md');
const helpers = require('../lib/helpers');
const { TOOLS } = require('./tools');

const CALC_IDS = ['earnings', 'rpm', 'shorts', 'views-money', 'engagement', 'tiktok', 'facebook'];

const CALC_PAGES = {
  'earnings': {
    path: '/youtube-earnings-calculator',
    view: 'public/calc-earnings',
    seoTitle: 'YouTube Earnings Calculator — Estimate Your Ad Revenue | CreatorMoneyCalc',
    seoDesc: 'Estimate your potential YouTube earnings from views and RPM. Instant monthly, weekly, daily and yearly breakdowns — free, no sign-up.',
    formula: '(Views ÷ 1,000) × RPM = Estimated earnings',
    formulaNote: 'Your monthly views divided by 1,000, multiplied by your RPM (revenue per 1,000 views). That is the same basic math behind the revenue figures in YouTube Studio.',
    examples: [
      '100,000 views at a $4 RPM: (100,000 ÷ 1,000) × $4 = $400 in estimated earnings.',
      '1,000,000 views at a $6 RPM: (1,000,000 ÷ 1,000) × $6 = $6,000 in estimated earnings.',
      'Switch the content type to Shorts and try 2,000,000 Shorts views at a $0.07 Shorts RPM: (2,000,000 ÷ 1,000) × $0.07 = $140.',
    ],
    faqs: [
      { q: 'What is the difference between RPM and CPM?', a: 'CPM (cost per mille) is what advertisers pay for 1,000 ad impressions. RPM (revenue per mille) is what you, the creator, actually earn per 1,000 video views after YouTube takes its share. RPM is always lower than CPM, and it is the number creators should watch.' },
      { q: 'Do all of my views earn money?', a: 'No. Only monetized views earn revenue. Viewers using ad blockers, watching on YouTube Premium (which pays out differently), or located in regions with little ad demand may not generate ad revenue. Many creators find that 40–80% of their total views are actually monetized.' },
      { q: 'Why does the country selector change my estimate?', a: 'Advertisers pay very different rates around the world. Views from the United States, United Kingdom, Canada and Australia typically carry RPMs of $3–$8, while views from many other countries carry RPMs under $1. Pick the country most of your audience lives in for a more realistic estimate.' },
      { q: 'How often does YouTube pay creators?', a: 'YouTube pays monthly through Google AdSense, once your balance reaches the $100 payment threshold. Earnings shown in YouTube Studio are usually finalized around the middle of the following month.' },
      { q: 'How can I increase my YouTube earnings?', a: 'The biggest levers are your niche (finance, business and software content attracts premium advertisers), your audience country mix, average watch time, and publishing consistently. Revenue also rises in the holiday season (October–December) when advertisers spend more.' },
    ],
  },
  'rpm': {
    path: '/youtube-rpm-calculator',
    view: 'public/calc-rpm',
    seoTitle: 'YouTube RPM Calculator — Find Your Revenue Per Mille | CreatorMoneyCalc',
    seoDesc: 'Calculate your YouTube RPM from revenue and views. See exactly what you earn per 1,000 views and how you compare to typical ranges.',
    formula: '(Revenue ÷ Views) × 1,000 = RPM',
    formulaNote: 'Take the revenue a video or channel earned, divide it by the number of views, and multiply by 1,000. The result is your RPM — revenue per mille (per thousand views).',
    examples: [
      '$120 earned from 30,000 views: ($120 ÷ 30,000) × 1,000 = $4.00 RPM.',
      '$2,500 earned from 400,000 views: ($2,500 ÷ 400,000) × 1,000 = $6.25 RPM — a strong result for most niches.',
    ],
    faqs: [
      { q: 'How is RPM calculated on YouTube?', a: 'Divide your estimated revenue by your total views, then multiply by 1,000. For example, $120 from 30,000 views gives ($120 ÷ 30,000) × 1,000 = $4.00 RPM. YouTube Studio shows this figure directly in your analytics.' },
      { q: 'What is a good RPM on YouTube?', a: 'For long-form videos, $3–$8 is typical in higher-ad-spend countries. Finance, business and B2B software channels often see $8–$15 or more, while gaming and broad entertainment channels often sit at $1–$3. Anything consistently above your niche average is a good sign.' },
      { q: 'Why is my RPM different from another channel’s?', a: 'RPM depends on audience country, niche, video length, viewer demographics, the season, and even the types of ads shown. Two channels with identical view counts can have very different RPMs.' },
      { q: 'How can I raise my RPM?', a: 'Target topics that premium advertisers bid on, attract viewers in high-ad-spend countries, make longer videos that hold attention (more ad slots), and publish more during the October–December advertising peak.' },
    ],
  },
  'shorts': {
    path: '/youtube-shorts-earnings-calculator',
    view: 'public/calc-shorts',
    seoTitle: 'YouTube Shorts Earnings Calculator — How Much Do Shorts Pay? | CreatorMoneyCalc',
    seoDesc: 'Estimate your YouTube Shorts earnings with realistic Shorts RPM values. Free Shorts revenue calculator — no sign-up needed.',
    formula: '(Shorts views ÷ 1,000) × Shorts RPM = Estimated Shorts earnings',
    formulaNote: 'The math is the same as long-form, but the RPM is far lower: Shorts ad revenue goes into one shared pool that is divided among creators by their share of total Shorts views. A typical Shorts RPM is $0.03–$0.10.',
    examples: [
      '1,000,000 Shorts views at a $0.07 Shorts RPM: (1,000,000 ÷ 1,000) × $0.07 = $70.',
      '10,000,000 Shorts views at a $0.07 Shorts RPM: (10,000,000 ÷ 1,000) × $0.07 = $700 — Shorts are a volume game.',
    ],
    faqs: [
      { q: 'Why is Shorts RPM so much lower than long-form RPM?', a: 'Shorts revenue comes from a single shared advertising pool. YouTube adds up all Shorts ad revenue, takes its cut, then splits the rest among creators based on each creator’s share of total Shorts views. With billions of Shorts views competing for the pool, each thousand views earns only a few cents.' },
      { q: 'What is a typical YouTube Shorts RPM?', a: 'Most creators report Shorts RPMs between $0.03 and $0.10. That means one million Shorts views typically earns somewhere around $30–$100.' },
      { q: 'Can you make real money from YouTube Shorts?', a: 'Ad revenue alone is modest — you need tens of millions of views for meaningful income. Many Shorts creators earn more from brand deals, affiliate links, and using Shorts to funnel viewers to long-form videos or products.' },
      { q: 'Do Shorts views count toward the YouTube Partner Program?', a: 'Yes. One way to qualify for the YouTube Partner Program is 10 million valid public Shorts views in the last 90 days (plus 500 subscribers). The alternative path is 3,000 watch hours in the last 12 months with 500 subscribers.' },
    ],
  },
  'views-money': {
    path: '/youtube-views-to-money',
    view: 'public/calc-views',
    seoTitle: 'YouTube Views to Money Calculator — What Are Views Worth? | CreatorMoneyCalc',
    seoDesc: 'See what 1K, 10K, 100K, 1M and 10M YouTube views could be worth at your RPM. Free instant estimates — no sign-up.',
    formula: '(Views ÷ 1,000) × RPM = Estimated earnings',
    formulaNote: 'Enter any RPM to see what each view milestone could be worth. Change the RPM and submit again to compare scenarios — for example, a $2 RPM versus a $6 RPM.',
    examples: [
      'At a $4 RPM, 100,000 views are worth about $400, and 1,000,000 views about $4,000.',
      'At a $6 RPM (typical for a US finance audience), 1,000,000 views are worth about $6,000.',
      'At a $0.50 RPM (common for broad global audiences), 1,000,000 views are worth about $500.',
    ],
    faqs: [
      { q: 'How much is 1 million YouTube views worth?', a: 'It depends entirely on RPM. At a $4 RPM, one million views are worth about $4,000. At $1 RPM they are worth about $1,000, and at $8 RPM about $8,000. Use the calculator above with your own RPM to see your number.' },
      { q: 'Do all views pay the same amount?', a: 'No. Only monetized views generate ad revenue, and RPM varies by audience country, niche, season and ad demand. Two videos with the same view count can earn very different amounts.' },
      { q: 'Why do two channels earn different amounts for the same views?', a: 'Because their RPMs differ. A finance channel with a mostly US audience might have a $7 RPM while an entertainment channel with a global audience has a $1.50 RPM — the same million views would earn $7,000 versus $1,500.' },
    ],
  },
  'engagement': {
    path: '/youtube-engagement-calculator',
    view: 'public/calc-engagement',
    seoTitle: 'YouTube Engagement Rate Calculator — Measure Your Audience | CreatorMoneyCalc',
    seoDesc: 'Calculate your YouTube engagement rate from views, likes, comments and shares. See how your audience stacks up — free and instant.',
    formula: '((Likes + Comments + Shares) ÷ Views) × 100 = Engagement rate %',
    formulaNote: 'Add up the visible interactions on a video (likes, comments and shares), divide by total views, and multiply by 100. The result is your engagement rate as a percentage.',
    examples: [
      '100,000 views with 4,000 likes, 500 comments and 200 shares: ((4,000 + 500 + 200) ÷ 100,000) × 100 = 4.7% — a good engagement rate.',
      '10,000 views with 150 likes, 20 comments and 5 shares: ((150 + 20 + 5) ÷ 10,000) × 100 = 1.75% — about average.',
    ],
    faqs: [
      { q: 'What is a good engagement rate on YouTube?', a: 'As a rough guide: under 1% is low, 1–3% is average, 3–6% is good, and above 6% is excellent. Small channels often have higher rates than large ones because their audiences are more loyal.' },
      { q: 'How is YouTube engagement rate calculated?', a: 'Add likes, comments and shares, divide by views, and multiply by 100. For example, 4,700 interactions on 100,000 views is a 4.7% engagement rate.' },
      { q: 'Does engagement affect the YouTube algorithm?', a: 'Engagement signals that viewers are satisfied, which the recommendation system pays attention to. Likes, comments and especially shares correlate with videos getting suggested more — though watch time and click-through rate matter too.' },
      { q: 'How can I improve my engagement rate?', a: 'Ask a specific question in each video, use a clear call to action, pin a comment to start discussion, reply to early comments, and make content that people want to share with a friend.' },
    ],
  },
  'tiktok': {
    path: '/tiktok-earnings-calculator',
    view: 'public/calc-tiktok',
    seoTitle: 'TikTok Earnings Calculator — How Much Does TikTok Pay? | CreatorMoneyCalc',
    seoDesc: 'Estimate your TikTok Creator Rewards earnings from views. Free TikTok money calculator with honest rates — no sign-up needed.',
    formula: '(TikTok views ÷ 1,000) × Rate per 1,000 views = Estimated TikTok earnings',
    formulaNote: 'TikTok pays creators through the Creator Rewards program (formerly Creator Fund). Only qualified views on videos longer than 1 minute count, and the rate is far lower than YouTube — typically $0.02–$0.04 per 1,000 views. Enter your own rate to see your estimate.',
    examples: [
      '1,000,000 TikTok views at a $0.03 rate: (1,000,000 ÷ 1,000) × $0.03 = $30.',
      '10,000,000 TikTok views at a $0.03 rate: (10,000,000 ÷ 1,000) × $0.03 = $300 — TikTok ad payouts are small, which is why most creators earn more from brand deals.',
    ],
    faqs: [
      { q: 'How much does TikTok pay per 1,000 views?', a: 'Through the Creator Rewards program, TikTok typically pays around $0.02–$0.04 per 1,000 qualified views. That means one million views might earn roughly $20–$40 — far less than YouTube.' },
      { q: 'Why is TikTok pay so low?', a: 'TikTok divides a fixed rewards pool among all eligible creators, and short videos generate less ad revenue per view than long YouTube videos. Most TikTok creators earn far more from brand sponsorships, TikTok Shop affiliate commissions and live gifts than from Creator Rewards.' },
      { q: 'Which TikTok views count for earnings?', a: 'Only "qualified views" count: views on original videos longer than 1 minute, watched by real viewers (not from the For You feed autoplay loops that TikTok excludes), from eligible regions. Short clips under 1 minute earn nothing from Creator Rewards.' },
      { q: 'How do TikTok creators actually make money?', a: 'The biggest income sources are brand deals and sponsorships, TikTok Shop affiliate sales, live stream gifts, and using TikTok to drive followers to YouTube, products or services. Creator Rewards is usually a small bonus, not the main income.' },
    ],
  },
  'facebook': {
    path: '/facebook-earnings-calculator',
    view: 'public/calc-facebook',
    seoTitle: 'Facebook Earnings Calculator — How Much Do Facebook Views Pay? | CreatorMoneyCalc',
    seoDesc: 'Estimate your Facebook in-stream ad earnings from video views. Free Facebook money calculator — no sign-up needed.',
    formula: '(Facebook views ÷ 1,000) × RPM = Estimated Facebook earnings',
    formulaNote: 'Facebook pays creators through in-stream ads on eligible videos. Your RPM (revenue per 1,000 views) depends on audience country, niche and ad demand — typically $1–$5. Enter your own RPM to see your estimate.',
    examples: [
      '100,000 Facebook views at a $3 RPM: (100,000 ÷ 1,000) × $3 = $300.',
      '1,000,000 Facebook views at a $3 RPM: (1,000,000 ÷ 1,000) × $3 = $3,000.',
    ],
    faqs: [
      { q: 'How much does Facebook pay per 1,000 views?', a: 'Facebook in-stream ad RPM typically ranges from about $1 to $5, depending on audience country, niche and season. US audiences and business/finance content sit at the higher end.' },
      { q: 'Which Facebook views earn money?', a: 'Only monetized views on eligible videos earn revenue — generally videos at least 1 minute long (3 minutes for some ad formats) from pages that meet Facebook\'s monetization policies. Views from ineligible regions or policy violations earn nothing.' },
      { q: 'How does Facebook pay creators?', a: 'Facebook pays monthly once your balance reaches the $100 threshold, similar to YouTube. Earnings appear in Meta Business Suite under Monetization.' },
      { q: 'How can I increase my Facebook earnings?', a: 'Post longer original videos (3+ minutes unlock more ad breaks), target audiences in high-ad-spend countries, stay consistent, and avoid policy violations that demonetize your page.' },
    ],
  },
};

const HOME_FAQS = [
  { q: 'How much does YouTube pay for 1,000 views?', a: 'There is no fixed rate — YouTube does not pay per view directly. What matters is RPM (revenue per 1,000 views). On long-form videos a typical RPM is roughly $3–$8 in higher-ad-spend countries like the US and UK, and under $1 in many other regions. So 1,000 monetized views might earn anywhere from a few cents to about $8, depending on your audience, niche and season.' },
  { q: 'How much does YouTube pay for 100,000 views?', a: 'At a $4 RPM, 100,000 views would earn roughly $400. Realistically, 100K long-form views can pay anywhere from about $100 to over $1,000. Finance, business and tech channels with US audiences sit at the high end; entertainment channels with global audiences sit lower.' },
  { q: 'How much does YouTube pay for 1 million views?', a: 'At a $4 RPM, one million views earns roughly $4,000. Typical long-form ranges run about $1,000–$10,000, while a million Shorts views usually earns far less — often $30–$100. These are estimates based on monetized views, which are usually fewer than total views.' },
  { q: 'What is RPM on YouTube?', a: 'RPM (revenue per mille) is the amount you actually earn per 1,000 video views after YouTube takes its share. It is different from CPM (cost per mille), which is what advertisers pay. RPM is the number creators should watch — multiply it by your views in thousands to estimate earnings.' },
  { q: 'Do YouTube Shorts pay differently?', a: 'Yes. Shorts revenue comes from a shared ad pool divided among creators based on their share of total Shorts views, so Shorts RPM is much lower — typically $0.03–$0.10. A million Shorts views might earn around $70, while a million long-form views could earn $4,000 or more.' },
  { q: 'Does my audience’s country affect how much I earn?', a: 'A lot. Advertisers pay more to reach viewers in the US, UK, Canada and Australia, so channels with audiences there have higher RPMs. The same view count with viewers mostly in lower-ad-spend countries earns noticeably less. Use the country selector on our calculator to see the difference.' },
  { q: 'How accurate is this calculator?', a: 'It gives a realistic estimate using the standard YouTube earnings formula, but it cannot predict your exact revenue. Real earnings depend on monetized views (not all views earn), your niche, audience country, watch time, season and ad demand. Treat every result as a ballpark figure — useful for planning, not a promise of income.' },
];

const baseUrl = () => (process.env.SITE_URL || '').replace(/\/+$/, '');
const canonicalFor = (p) => { const b = baseUrl(); return b ? b + p : p; };

const faqSchema = (faqs) => (!faqs || !faqs.length ? null : {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

function registerPublic(app) {
  /* ---------------- Home ---------------- */
  app.get('/', async (req, res) => {
    const site = res.locals.site;
    res.render('public/home', {
      homeFaqs: HOME_FAQS,
      seoTitle: site.seo_home_title || site.seo_site_title,
      seoDesc: site.seo_home_description || site.seo_meta_description,
      canonical: canonicalFor('/'),
      ogImage: site.og_image || null,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.site_name,
        url: canonicalFor('/'),
        description: site.seo_home_description || site.seo_meta_description,
      },
    });
  });

  /* ---------------- Calculators hub ---------------- */
  app.get('/calculators', async (req, res) => {
    const site = res.locals.site;
    res.render('public/calculators', {
      seoTitle: `All YouTube Calculators — Earnings, RPM, Shorts & More | ${site.site_name}`,
      seoDesc: 'Browse every free CreatorMoneyCalc tool: YouTube earnings, RPM, Shorts earnings, views-to-money and engagement calculators.',
      canonical: canonicalFor('/calculators'),
      ogImage: site.og_image || null,
      schema: faqSchema([]),
    });
  });

  /* ---------------- Individual calculators ---------------- */
  for (const key of CALC_IDS) {
    const cfg = CALC_PAGES[key];
    app.get(cfg.path, async (req, res) => {
      const site = res.locals.site;
      res.render(cfg.view, {
        calcKey: key,
        pageFaqs: cfg.faqs,
        pageExamples: cfg.examples,
        pageFormula: cfg.formula,
        pageFormulaNote: cfg.formulaNote,
        seoTitle: cfg.seoTitle,
        seoDesc: cfg.seoDesc,
        canonical: canonicalFor(cfg.path),
        ogImage: site.og_image || null,
        schema: null, // FAQPage JSON-LD is emitted by the faq partial
      });
    });
  }

  /* ---------------- Blog ---------------- */
  app.get('/blog', async (req, res) => {
    const site = res.locals.site;
    const posts = await db.prepare(
      `SELECT slug, title, category, meta_description, created_at
       FROM blog_posts WHERE status = 'published'
       ORDER BY created_at DESC`
    ).all();
    res.render('public/blog-index', {
      posts,
      seoTitle: `Blog — YouTube Earnings Guides & Tips | ${site.site_name}`,
      seoDesc: 'Guides on YouTube RPM, monetization, Shorts earnings and growing creator revenue.',
      canonical: canonicalFor('/blog'),
      ogImage: site.og_image || null,
      schema: null,
    });
  });

  app.get('/blog/:slug', async (req, res) => {
    const site = res.locals.site;
    const post = await db.prepare(
      `SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'`
    ).get(req.params.slug);
    if (!post) {
      return res.status(404).render('public/404', {
        seoTitle: `Article Not Found | ${site.site_name}`,
        seoDesc: 'The article you are looking for does not exist.',
        canonical: null, ogImage: null, schema: null,
      });
    }
    try {
      await db.prepare('UPDATE blog_posts SET views = views + 1 WHERE id = ?').run(post.id);
      post.views = (post.views || 0) + 1;
    } catch (e) { /* non-fatal */ }

    // faqs may arrive as a JSON string or array (seed JSON field "faqs");
    // the bundled lib schema has no faqs column, so this is defensive.
    let postFaqs = [];
    try {
      const raw = post.faqs;
      postFaqs = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    } catch (e) { postFaqs = []; }
    if (!Array.isArray(postFaqs)) postFaqs = [];
    postFaqs = postFaqs.filter((f) => f && f.q);

    const ordered = await db.prepare(
      `SELECT slug, title FROM blog_posts WHERE status = 'published' ORDER BY created_at DESC`
    ).all();
    const idx = ordered.findIndex((p) => p.slug === post.slug);
    const prev = idx > 0 ? ordered[idx - 1] : null; // newer
    const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null; // older

    res.render('public/blog-post', {
      post,
      postFaqs,
      prev,
      next,
      md,
      seoTitle: post.seo_title || `${post.title} | ${site.site_name}`,
      seoDesc: post.meta_description || site.seo_meta_description,
      canonical: canonicalFor(`/blog/${post.slug}`),
      ogImage: post.image || site.og_image || null,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.meta_description || '',
        ...(post.image ? { image: post.image } : {}),
        author: { '@type': 'Organization', name: site.site_name },
        publisher: { '@type': 'Organization', name: site.site_name },
        datePublished: post.created_at,
        dateModified: post.updated_at || post.created_at,
        mainEntityOfPage: canonicalFor(`/blog/${post.slug}`),
      },
    });
  });

  /* ---------------- Static pages ---------------- */
  const staticPage = (slug) => async (req, res) => {
    const site = res.locals.site;
    const row = await db.prepare('SELECT title, body_md FROM pages WHERE slug = ?').get(slug);
    if (!row) {
      return res.status(404).render('public/404', {
        seoTitle: `Page Not Found | ${site.site_name}`,
        seoDesc: 'The page you are looking for does not exist.',
        canonical: null, ogImage: null, schema: null,
      });
    }
    res.render('public/page', {
      pageTitle: row.title,
      pageBody: md(row.body_md),
      md,
      seoTitle: `${row.title} | ${site.site_name}`,
      seoDesc: site.seo_meta_description,
      canonical: canonicalFor(`/${slug}`),
      ogImage: site.og_image || null,
      schema: null,
    });
  };
  app.get('/about', staticPage('about'));
  app.get('/privacy-policy', staticPage('privacy-policy'));
  app.get('/terms', staticPage('terms'));
  app.get('/disclaimer', staticPage('disclaimer'));

  /* ---------------- Contact ---------------- */
  const renderContact = async (res, extra) => {
    const site = res.locals.site;
    const row = await db.prepare('SELECT title, body_md FROM pages WHERE slug = ?').get('contact');
    res.render('public/contact', {
      pageTitle: row ? row.title : 'Contact Us',
      pageBody: row ? md(row.body_md) : '',
      errors: [],
      values: { name: '', email: '', message: '' },
      success: false,
      seoTitle: `Contact Us | ${site.site_name}`,
      seoDesc: 'Questions, suggestions or bug reports — send us a message and we will get back to you.',
      canonical: canonicalFor('/contact'),
      ogImage: site.og_image || null,
      schema: null,
      ...extra,
    });
  };
  app.get('/contact', async (req, res) => renderContact(res, {}));

  app.post('/contact', async (req, res) => {
    const name = String(req.body.name || '').trim().slice(0, 120);
    const email = String(req.body.email || '').trim().slice(0, 160);
    const message = String(req.body.message || '').trim().slice(0, 5000);
    const errors = [];
    if (name.length < 2) errors.push('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push('Please enter a valid email address so we can reply to you.');
    if (message.length < 10) errors.push('Please write a message of at least 10 characters.');
    if (errors.length) {
      return renderContact(res, { errors, values: { name, email, message } });
    }
    try {
      await db.prepare('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)').run(name, email, message);
    } catch (e) {
      return renderContact(res, { errors: ['Something went wrong saving your message. Please try again.'], values: { name, email, message } });
    }
    renderContact(res, { success: true });
  });

  /* ---------------- Calculator usage beacon ---------------- */
  app.post('/api/track', async (req, res) => {
    const body = req.body || {};
    if (body.type !== 'calc' || !CALC_IDS.includes(body.id)) {
      return res.status(400).json({ ok: false });
    }
    try {
      await db.prepare(`INSERT INTO calc_usage (calc_id, date, uses) VALUES (?, ?, 1)
        ON CONFLICT(calc_id, date) DO UPDATE SET uses = calc_usage.uses + 1`).run(body.id, helpers.todayStr());
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false });
    }
  });

  /* ---------------- SEO files ---------------- */
  app.get('/sitemap.xml', async (req, res) => {
    const base = baseUrl();
    const today = helpers.todayStr();
    const toolPaths = ['/tools', ...TOOLS.map((t) => t.path || ('/tools/' + t.slug))];
    const staticPaths = ['/', '/calculators',
      ...CALC_IDS.map((k) => CALC_PAGES[k].path),
      ...toolPaths,
      '/blog', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer'];
    const posts = await db.prepare("SELECT slug FROM blog_posts WHERE status = 'published'").all();
    const urls = [
      ...staticPaths.map((p) => `${base}${p}`),
      ...posts.map((p) => `${base}/blog/${p.slug}`),
    ];
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map((u) => `  <url>\n    <loc>${helpers.escapeHtml(u)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n') +
      '\n</urlset>';
    res.type('application/xml').send(xml);
  });

  app.get('/robots.txt', async (req, res) => {
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${baseUrl()}/sitemap.xml\n`
    );
  });
}

module.exports = registerPublic;
