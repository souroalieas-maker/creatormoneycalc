'use strict';
/*
 * CreatorMoneyCalc — YouTube Tools suite.
 * Exports registerTools(app) + TOOLS config.
 * Offline-first: heavy generation runs in the browser (yt-tools.js);
 * server only proxies the tiny live-data APIs (suggest/oEmbed).
 */

const NICHE_OPTIONS = [
  { value: 'general', label: 'General / Any niche' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'tech', label: 'Tech & AI' },
  { value: 'finance', label: 'Finance & Money' },
  { value: 'fitness', label: 'Fitness & Health' },
  { value: 'cooking', label: 'Cooking & Food' },
  { value: 'travel', label: 'Travel & Vlogs' },
  { value: 'education', label: 'Education' },
  { value: 'music', label: 'Music' },
  { value: 'beauty', label: 'Beauty & Fashion' },
  { value: 'motivation', label: 'Motivation' },
];

const TOOLS = [
  {
    slug: 'seo-description-generator',
    name: 'AI SEO Description Generator',
    h1: 'YouTube SEO Description Generator',
    icon: '✍️',
    badge: 'HOT',
    desc: 'Type just your video topic — get a complete SEO-optimized YouTube description with hook, chapters, hashtags, tags and CTA. Copy-paste ready.',
    buttonLabel: 'Generate Description',
    fields: [
      { name: 'topic', label: 'Video topic', type: 'text', placeholder: 'e.g. how to grow on youtube in 2026' },
      { name: 'style', label: 'Video style', type: 'select', options: [
        { value: 'educational', label: 'Educational' },
        { value: 'tutorial', label: 'Tutorial / How-to' },
        { value: 'review', label: 'Review' },
        { value: 'vlog', label: 'Vlog' },
        { value: 'list', label: 'Listicle / Top 10' },
        { value: 'entertainment', label: 'Entertainment' },
      ]},
      { name: 'channel', label: 'Channel name', type: 'text', placeholder: 'Optional — used in the subscribe CTA', hint: 'optional' },
    ],
    howItWorks: [
      'Type your video topic — just a few words is enough.',
      'Pick your video style so the wording matches your content.',
      'Hit Generate: the tool writes a keyword-rich hook, "in this video" section, chapters, learn-bullets, hashtags, tags and a subscribe call-to-action.',
      'Copy the full description and paste it into YouTube Studio. Adjust the chapter timestamps to match your real video.',
    ],
    proTip: 'Put your main keyword in the <strong>first 2 sentences</strong> — YouTube shows only ~150 characters in search results, so the hook decides the click.',
    faqs: [
      { q: 'How long should a YouTube description be?', a: 'Aim for 200–400 words. The first 150 characters matter most because they appear in search results. The rest helps YouTube understand your video and rank it for more keywords.' },
      { q: 'Do hashtags in the description help?', a: 'Yes — the first 3 hashtags appear above your video title and are clickable. Use 3–5 highly relevant hashtags; stuffing 15+ looks spammy and YouTube may ignore them.' },
      { q: 'Should I copy someone else\'s description?', a: 'No. Duplicate descriptions can hurt both videos. Use this generator to create a unique, keyword-rich description for every upload.' },
    ],
    seoTitle: 'YouTube SEO Description Generator — Free AI Description Maker | TubeBoost',
    seoDesc: 'Type your topic and get a full SEO-optimized YouTube description: hook, chapters, hashtags, tags and CTA. Free, instant, no sign-up.',
  },
  {
    slug: 'ai-title-generator',
    name: 'AI Video Title Generator',
    h1: 'YouTube Video Title Generator',
    icon: '📝',
    desc: 'Get clickable, curiosity-driven title ideas for any topic — YouTube, TikTok or Facebook, each with platform-perfect style.',
    buttonLabel: 'Generate Titles',
    fields: [      { name: 'platform', label: 'Platform', type: 'select', options: [
        { value: 'youtube', label: 'YouTube' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'facebook', label: 'Facebook' },
      ]},
      { name: 'topic', label: 'Video topic', type: 'text', placeholder: 'e.g. homemade pizza recipe' }],
    howItWorks: ['Enter your video topic.', 'Get 16 titles in proven high-CTR formats.', 'Pick your favorite, tweak it, and pair it with a strong thumbnail.'],
    proTip: 'Keep titles under <strong>60 characters</strong> so they don\'t get cut off in search — and always deliver what the title promises.',
    faqs: [
      { q: 'What makes a YouTube title get clicks?', a: 'Curiosity + clarity + a reason to click now. Numbers, brackets, and emotional words ("shocking", "proven", "mistakes") consistently lift click-through rate.' },
      { q: 'Should I use ALL CAPS in titles?', a: 'One or two capitalized words are fine for emphasis, but full ALL CAPS titles look spammy and can hurt trust.' },
      { q: 'How important is the title vs the thumbnail?', a: 'They work as a team: the thumbnail stops the scroll, the title closes the click. Never repeat the exact same words in both — use them to tell one story together.' },
    ],
    seoTitle: 'YouTube Title Generator — 16 Viral Video Title Ideas (Free) | TubeBoost',
    seoDesc: 'Generate clickable YouTube titles from any topic. 16 proven viral formats with power words and numbers — free, instant.',
  },
  {
    slug: 'ai-tags-generator',
    name: 'AI Tags Generator',
    h1: 'YouTube Tags Generator',
    icon: '🏷️',
    desc: 'Generate ~30 optimized tags from your topic — auto-trimmed to fit YouTube\'s 500-character tag limit. Copy straight into YouTube Studio.',
    buttonLabel: 'Generate Tags',
    fields: [{ name: 'topic', label: 'Video topic', type: 'text', placeholder: 'e.g. iphone 17 review' }],
    howItWorks: ['Enter your topic.', 'The tool builds exact-match, long-tail and niche tags.', 'Tags are auto-trimmed to YouTube\'s 500-character limit.', 'Copy and paste into YouTube Studio → Details → Tags.'],
    proTip: 'Put your <strong>exact target keyword first</strong> — tag order matters, and the first few tags carry the most weight.',
    faqs: [
      { q: 'Do YouTube tags still matter in 2026?', a: 'Yes, but less than title, thumbnail and watch time. Tags help YouTube understand edge cases — misspellings, alternate names — and they still matter for ranking in competitive niches.' },
      { q: 'How many tags should I use?', a: 'YouTube allows 500 characters total. Around 20–30 focused tags beat 100 random ones. Never reuse the same giant tag block on every video.' },
      { q: 'Should tags match my title?', a: 'Your first 2–3 tags should closely match your title keywords, then expand into long-tail variations and related terms.' },
    ],
    seoTitle: 'YouTube Tags Generator — Free SEO Tags (500-char optimized) | TubeBoost',
    seoDesc: 'Generate optimized YouTube tags from any topic, auto-fitted to the 500-character limit. Free tag generator, no sign-up.',
  },
  {
    slug: 'tags-extractor',
    name: 'Video Tags Extractor',
    h1: 'YouTube Video Tags Extractor',
    icon: '🔍',
    desc: 'Paste any YouTube video URL to see its details — and get optimized tag suggestions generated from its real title.',
    buttonLabel: 'Extract Tags',
    fields: [{ name: 'url', label: 'YouTube video URL', type: 'text', placeholder: 'https://www.youtube.com/watch?v=…' }],
    howItWorks: ['Paste a YouTube video URL.', 'We read the video\'s public title and channel info.', 'You get optimized tag suggestions built from the real title — ready to adapt for your own video.'],
    proTip: 'Don\'t copy a competitor\'s tags blindly — use them as <strong>research</strong>, then write better tags for your own angle on the topic.',
    faqs: [
      { q: 'Can I see the exact tags of any video?', a: 'YouTube keeps exact tags private. This tool reads the video\'s public info and generates the optimized tags we recommend based on its real title.' },
      { q: 'Is it okay to use a competitor\'s tags?', a: 'Using similar topical tags is normal research. But write your own set — identical tag blocks across channels look spammy to the algorithm.' },
      { q: 'Which video URLs work?', a: 'Standard watch URLs, youtu.be short links, Shorts and embed URLs all work.' },
    ],
    seoTitle: 'YouTube Video Tags Extractor — See Any Video\'s Tags (Free) | TubeBoost',
    seoDesc: 'Paste a YouTube URL to extract video details and get optimized tag suggestions. Free tags extractor tool.',
  },
  {
    slug: 'keyword-suggestion',
    name: 'Keyword Suggestion',
    h1: 'YouTube Keyword Suggestion Tool',
    icon: '🔑',
    badge: 'HOT',
    desc: 'YouTube: live autocomplete suggestions. TikTok & Facebook: smart optimized keyword ideas. Pick your platform.',
    buttonLabel: 'Get Suggestions',
    fields: [      { name: 'platform', label: 'Platform', type: 'select', options: [
        { value: 'youtube', label: 'YouTube' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'facebook', label: 'Facebook' },
      ]},
      { name: 'keyword', label: 'Seed keyword', type: 'text', placeholder: 'e.g. passive income' }],
    howItWorks: ['Type a seed keyword.', 'We pull live autocomplete suggestions from YouTube.', 'Double-click any suggestion to dig deeper into it.', 'Use these exact phrases in your titles, descriptions and tags.'],
    proTip: 'Long, specific suggestions (4+ words) = <strong>low competition keywords</strong>. Small channels should target these first.',
    faqs: [
      { q: 'Where do these suggestions come from?', a: 'Directly from YouTube\'s autocomplete system — the same suggestions viewers see when they type in the search bar. They reflect real, current search behavior.' },
      { q: 'How do I pick the best keyword?', a: 'Look for specific, longer phrases with clear intent ("how to start a faceless youtube channel") over vague ones ("youtube"). Then check the top results: if small channels rank, you can too.' },
      { q: 'How often should I do keyword research?', a: 'Before every video. Five minutes of research beats guessing — it tells you exactly what titles will get searched.' },
    ],
    seoTitle: 'YouTube Keyword Suggestion Tool — Live Search Suggestions (Free) | TubeBoost',
    seoDesc: 'Get live YouTube keyword suggestions from real autocomplete data. Free keyword research tool for YouTubers.',
  },
  {
    slug: 'ai-hashtag-generator',
    name: 'AI Hashtag Generator',
    h1: 'YouTube Hashtag Generator',
    icon: '#️⃣',
    desc: 'Turn any topic into 15 ready-to-paste hashtags — niche-specific plus platform-perfect tags for YouTube, TikTok or Facebook.',
    buttonLabel: 'Generate Hashtags',
    fields: [      { name: 'platform', label: 'Platform', type: 'select', options: [
        { value: 'youtube', label: 'YouTube' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'facebook', label: 'Facebook' },
      ]},
      { name: 'topic', label: 'Video topic', type: 'text', placeholder: 'e.g. morning workout routine' }],
    howItWorks: ['Enter your topic.', 'Get 15 hashtags: topic-specific, niche and generic reach tags.', 'Paste them at the bottom of your description.'],
    proTip: 'YouTube displays only the <strong>first 3 hashtags</strong> above your title — make those your 3 most important ones.',
    faqs: [
      { q: 'How many hashtags should I use on YouTube?', a: '3–5 is the sweet spot. YouTube shows the first 3 above the title. More than 15 can cause YouTube to ignore all of them.' },
      { q: 'Do hashtags help videos go viral?', a: 'They help discovery a little — mainly by grouping your video with trending topics. Title, thumbnail and retention matter far more.' },
      { q: 'Can I create my own branded hashtag?', a: 'Yes! A unique hashtag like #YourChannelName builds a clickable library of all your videos — great for community building.' },
    ],
    seoTitle: 'YouTube Hashtag Generator — Free Hashtags for Videos | TubeBoost',
    seoDesc: 'Generate 15 optimized YouTube hashtags from any topic. Free hashtag generator with niche and trending tags.',
  },
  {
    slug: 'popular-hashtags',
    name: 'Popular Hashtags',
    h1: 'Popular YouTube Hashtags by Niche',
    icon: '📈',
    desc: 'Browse hand-picked popular hashtags for 10 niches — gaming, tech, finance, fitness, cooking, travel and more.',
    buttonLabel: 'Show Hashtags',
    fields: [{ name: 'niche', label: 'Pick your niche', type: 'select', options: NICHE_OPTIONS.filter(function (o) { return o.value !== 'general'; }) }],
    howItWorks: ['Pick your niche.', 'Get the most-used hashtags in that niche.', 'Mix 2–3 niche hashtags with 1–2 topic-specific ones per video.'],
    proTip: 'Trending hashtags change monthly — combine <strong>evergreen niche tags</strong> with tags from this page\'s generator for each video.',
    faqs: [
      { q: 'Should I use the same hashtags on every video?', a: 'Keep 1–2 branded/niche hashtags consistent, but change the rest per video to match the actual topic. Identical blocks on every upload look automated.' },
      { q: 'Do popular hashtags guarantee more views?', a: 'No — they help categorization and discovery, but views come from click-through rate and watch time.' },
    ],
    seoTitle: 'Popular YouTube Hashtags by Niche — Gaming, Tech, Finance… (Free) | TubeBoost',
    seoDesc: 'Browse popular YouTube hashtags for gaming, tech, finance, fitness, cooking, travel, music and more. Free, updated lists.',
  },
  {
    slug: 'ai-channel-name-generator',
    name: 'AI Channel Name Generator',
    h1: 'YouTube Channel Name Generator',
    icon: '📛',
    desc: 'Get 16 professional channel name ideas from your niche — brandable, memorable and search-friendly.',
    buttonLabel: 'Generate Names',
    fields: [{ name: 'topic', label: 'Your niche / topic', type: 'text', placeholder: 'e.g. personal finance' }],
    howItWorks: ['Enter your niche.', 'Get 16 professional name ideas.', 'Check your favorite on YouTube and social media for availability.'],
    proTip: 'The best channel names are <strong>short, spellable and say what the channel is about</strong> — avoid numbers and tricky spellings.',
    faqs: [
      { q: 'What makes a good YouTube channel name?', a: 'Short (2–3 words), easy to spell and say out loud, relevant to your niche, and unique enough to own on Google and social platforms.' },
      { q: 'Can I change my channel name later?', a: 'Yes — YouTube lets you change your channel name without losing subscribers or videos. But rebranding confuses existing viewers, so choose well once.' },
      { q: 'Should my channel name include keywords?', a: 'A niche keyword helps discovery ("Tech", "Cooking"), but brandability matters more long-term. A blend of both is ideal.' },
    ],
    seoTitle: 'YouTube Channel Name Generator — 16 Pro Name Ideas (Free) | TubeBoost',
    seoDesc: 'Generate professional YouTube channel names from your niche. Brandable, memorable ideas — free, instant.',
  },
  {
    slug: 'channel-name-ideas',
    name: 'Channel Name Ideas',
    h1: 'Creative YouTube Channel Name Ideas',
    icon: '💡',
    desc: 'Playful, creative channel name ideas with personality — stand out instead of sounding like everyone else.',
    buttonLabel: 'Get Ideas',
    fields: [{ name: 'topic', label: 'Your niche / topic', type: 'text', placeholder: 'e.g. travel vlogs' }],
    howItWorks: ['Enter your niche.', 'Get 14 creative, personality-packed name ideas.', 'Shortlist 3, then check availability on YouTube, Instagram and TikTok.'],
    proTip: 'Say each name <strong>out loud</strong> — if you have to spell it twice, viewers won\'t remember it.',
    faqs: [
      { q: 'Creative or professional name — which is better?', a: 'It depends on your niche. Entertainment and vlogging reward creativity; finance, tech and education reward clarity and trust. When in doubt, pick clarity.' },
      { q: 'How do I check if a name is taken?', a: 'Search it on YouTube, Google, Instagram and TikTok. Also check domain availability if you ever want a website.' },
    ],
    seoTitle: 'YouTube Channel Name Ideas — Creative & Catchy (Free) | TubeBoost',
    seoDesc: 'Get creative YouTube channel name ideas with personality. Free generator — stand out in your niche.',
  },
  {
    slug: 'trending-videos',
    name: 'Trending Topic Finder',
    h1: 'YouTube Trending Topic Finder',
    icon: '🔥',
    badge: 'HOT',
    desc: 'Discover what viewers are searching for RIGHT NOW in your niche — live trend topics with one-click competitor research.',
    buttonLabel: 'Find Trends',
    fields: [{ name: 'niche', label: 'Pick your niche', type: 'select', options: NICHE_OPTIONS }],
    howItWorks: ['Pick your niche.', 'We pull live search data to surface rising topics.', 'Click any topic to see the top-ranking videos — your competition and your opportunity.'],
    proTip: 'Speed wins trends: the first good video on a rising topic <strong>takes most of the traffic</strong>. Publish within 48 hours.',
    faqs: [
      { q: 'How does the trend finder work?', a: 'It queries YouTube\'s live autocomplete across proven seed searches in your niche and surfaces the phrases viewers are typing most right now.' },
      { q: 'Should small channels chase trends?', a: 'Yes — trends are the fastest way for small channels to get discovered, because search demand temporarily exceeds the supply of good videos.' },
      { q: 'Trend vs evergreen — which is better?', a: 'Do both: 70% evergreen videos for steady growth, 30% trends for spikes. Trends bring subscribers; evergreen keeps them watching.' },
    ],
    seoTitle: 'YouTube Trending Topic Finder — What\'s Hot in Your Niche (Free) | TubeBoost',
    seoDesc: 'Find trending YouTube topics in your niche with live search data. Free trend finder for creators.',
  },
  {
    slug: 'explore-channel',
    name: 'Channel Explorer',
    h1: 'YouTube Channel Explorer',
    icon: '🔎',
    desc: 'Paste any channel or video URL to pull up channel info and quick links — the fastest way to study successful channels.',
    buttonLabel: 'Explore Channel',
    fields: [{ name: 'url', label: 'Channel or video URL', type: 'text', placeholder: 'https://www.youtube.com/@ChannelName or video URL' }],
    howItWorks: ['Paste a channel URL (or any video URL from that channel).', 'Get the channel name plus one-click links to their videos and about page.', 'Sort their videos by "Popular" to reverse-engineer what works.'],
    proTip: 'Study channels <strong>slightly bigger than you</strong>, not the giants — their strategies are actually replicable at your size.',
    faqs: [
      { q: 'What should I look for when studying a channel?', a: 'Their 10 most-viewed videos (topics + titles), average video length, upload frequency, and thumbnail style. Patterns there are the strategy.' },
      { q: 'Is it okay to copy a successful channel?', a: 'Copy the strategy (topics, formats, packaging) — never the content. Put your own angle on proven topics.' },
    ],
    seoTitle: 'YouTube Channel Explorer — Research Any Channel (Free) | TubeBoost',
    seoDesc: 'Look up any YouTube channel instantly and get research links. Free channel explorer for creators.',
  },
  {
    slug: 'find-competitor',
    name: 'Find Competitors',
    h1: 'YouTube Competitor Finder',
    icon: '🎯',
    desc: 'Enter your niche keyword — get the exact searches where your competitors rank, with one-click links to analyze them.',
    buttonLabel: 'Find Competitors',
    fields: [{ name: 'keyword', label: 'Your niche / keyword', type: 'text', placeholder: 'e.g. budget travel' }],
    howItWorks: ['Enter your niche keyword.', 'Get the real searches viewers use in your niche.', 'Open each search to see who ranks — those channels are your competitors.'],
    proTip: 'Your best competitors are channels with <strong>similar subscriber counts</strong> getting strong views — beat their packaging, not MrBeast\'s.',
    faqs: [
      { q: 'Why does competitor research matter?', a: 'YouTube is a zero-sum feed: you win by being the best answer to a search or the most clickable video in suggested. Knowing who you\'re up against tells you the bar to beat.' },
      { q: 'How many competitors should I track?', a: '5–10 channels in your niche and size range. Watch every video they post for a month — you\'ll absorb their strategy by osmosis.' },
    ],
    seoTitle: 'YouTube Competitor Finder — Discover Channels in Your Niche (Free) | TubeBoost',
    seoDesc: 'Find your YouTube competitors with live search data. Free competitor research tool for creators.',
  },
  {
    slug: 'thumbnail-downloader',
    name: 'Thumbnail Downloader',
    h1: 'YouTube Thumbnail Downloader',
    icon: '🖼️',
    desc: 'Download any YouTube video thumbnail in full HD — perfect for studying what makes thumbnails clickable.',
    buttonLabel: 'Get Thumbnails',
    fields: [{ name: 'url', label: 'YouTube video URL', type: 'text', placeholder: 'https://www.youtube.com/watch?v=…' }],
    howItWorks: ['Paste any YouTube video URL.', 'Preview the thumbnail in 4 qualities.', 'Download the size you need — free, no watermark.'],
    proTip: 'Save thumbnails from <strong>viral videos in your niche</strong> and study them: 3 colors max, one focal face/object, 3 words or fewer.',
    faqs: [
      { q: 'Is downloading thumbnails legal?', a: 'Downloading for personal study is fine. Re-uploading someone else\'s thumbnail on your video is not — always design your own.' },
      { q: 'What size should my thumbnails be?', a: '1280×720 pixels (16:9), under 2MB. YouTube displays them small, so bold shapes and big text win.' },
      { q: 'Why does Full HD show a grey image sometimes?', a: 'Some older videos have no HD thumbnail stored. Use the SD version instead — it\'s the same design.' },
    ],
    seoTitle: 'YouTube Thumbnail Downloader — Download HD Thumbnails (Free) | TubeBoost',
    seoDesc: 'Download any YouTube thumbnail in HD quality. Free thumbnail downloader, no watermark, no sign-up.',
  },
  {
    slug: 'earning-calculator',
    name: 'Earning Calculator',
    h1: 'YouTube Earning Calculator',
    icon: '🧮',
    path: '/youtube-earnings-calculator',
    desc: 'Estimate your YouTube ad revenue from views and RPM — monthly, weekly, daily and yearly breakdowns.',
    seoTitle: 'YouTube Earnings Calculator — Estimate Your Ad Revenue | TubeBoost',
    seoDesc: 'Estimate your potential YouTube earnings from views and RPM. Instant monthly, weekly, daily and yearly breakdowns.',
  },
];

const TOOL_MAP = {};
TOOLS.forEach(function (t) { TOOL_MAP[t.slug] = t; });

/* ---------------- live-data API helpers ---------------- */
const _suggestCache = new Map();
const _rate = new Map(); // ip -> {count, reset}

function rateOk(req, res, limit) {
  const ip = req.ip || 'x';
  const now = Date.now();
  let e = _rate.get(ip);
  if (!e || now > e.reset) { e = { count: 0, reset: now + 60000 }; _rate.set(ip, e); }
  e.count += 1;
  if (e.count > (limit || 40)) { res.status(429).json({ ok: false, error: 'rate_limited' }); return false; }
  return true;
}

async function fetchText(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(function () { ctrl.abort(); }, timeoutMs || 12000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; } finally { clearTimeout(t); }
}

async function ytSuggest(q) {
  const key = 's:' + q.toLowerCase();
  const hit = _suggestCache.get(key);
  if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.d;
  const raw = await fetchText('https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=' + encodeURIComponent(q));
  let out = [];
  if (raw) {
    const m = raw.match(/window\.google\.ac\.h\((.*)\)\s*;?\s*$/s);
    if (m) {
      try {
        const parsed = JSON.parse(m[1]);
        if (parsed && Array.isArray(parsed[1])) out = parsed[1].map(function (a) { return a[0]; }).filter(Boolean);
      } catch (e) { /* ignore */ }
    }
  }
  _suggestCache.set(key, { t: Date.now(), d: out });
  return out;
}

function parseVideoId(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

const TREND_SEEDS = {
  general: ['trending now', 'viral video today', 'new song 2026', 'top 10'],
  gaming: ['gta 6', 'minecraft', 'fortnite new season', 'free fire max'],
  tech: ['ai tools 2026', 'iphone 17', 'chatgpt new', 'best laptop 2026'],
  finance: ['crypto news today', 'stock market today', 'passive income 2026', 'bitcoin price'],
  fitness: ['weight loss workout', 'home workout', 'gym routine', 'healthy breakfast'],
  cooking: ['easy dinner recipe', 'biryani recipe', 'baking', 'street food'],
  travel: ['dubai travel', 'best places to visit', 'travel vlog', 'cheap flights'],
  education: ['study tips', 'exam preparation', 'learn english', 'science explained'],
  music: ['new song 2026', 'remix song', 'lyrics video', 'lofi'],
  beauty: ['makeup tutorial', 'skincare routine', 'mehndi design', 'hair care'],
  motivation: ['motivational video', 'success mindset', 'morning routine', 'discipline'],
};

/* ---------------- routes ---------------- */
function registerTools(app) {
  const baseUrl = function () { return (process.env.SITE_URL || '').replace(/\/+$/, ''); };
  const canonicalFor = function (p) { const b = baseUrl(); return b ? b + p : p; };
  const toolPath = function (t) { return t.path || ('/tools/' + t.slug); };

  app.get('/tools', async function (req, res) {
    const site = res.locals.site;
    res.render('public/tools', {
      tools: TOOLS,
      seoTitle: 'Free YouTube SEO Tools — Descriptions, Tags, Titles, Keywords | ' + site.site_name,
      seoDesc: '14 free YouTube tools: SEO description generator, title & tags generator, keyword suggestions, hashtag generator, thumbnail downloader and more. No sign-up.',
      canonical: canonicalFor('/tools'),
      ogImage: site.og_image || null,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Free YouTube SEO Tools',
        itemListElement: TOOLS.map(function (t, i) {
          return { '@type': 'ListItem', position: i + 1, name: t.name, url: canonicalFor(toolPath(t)) };
        }),
      },
    });
  });

  TOOLS.forEach(function (t) {
    if (t.path) return; // external tool page (links straight to calculator)
    app.get('/tools/' + t.slug, async function (req, res) {
      const site = res.locals.site;
      const related = TOOLS.filter(function (x) { return x.slug !== t.slug; }).slice(0, 3);
      res.render('public/tool', {
        tool: t,
        relatedTools: related,
        seoTitle: t.seoTitle,
        seoDesc: t.seoDesc,
        canonical: canonicalFor('/tools/' + t.slug),
        ogImage: site.og_image || null,
        schema: t.faqs && t.faqs.length ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: t.faqs.map(function (f) {
            return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
          }),
        } : null,
      });
    });
  });

  /* ----- live-data APIs ----- */
  app.get('/api/yt-suggest', async function (req, res) {
    if (!rateOk(req, res, 40)) return;
    const q = String(req.query.q || '').slice(0, 80).trim();
    if (!q) return res.json({ ok: false });
    const suggestions = await ytSuggest(q);
    res.json({ ok: true, suggestions: suggestions.slice(0, 12) });
  });

  app.get('/api/yt-meta', async function (req, res) {
    if (!rateOk(req, res, 30)) return;
    const id = parseVideoId(req.query.url);
    if (!id) return res.json({ ok: false });
    let title = null, author = null, authorUrl = null;
    try {
      const raw = await fetchText('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json');
      if (raw) { const j = JSON.parse(raw); title = j.title || null; author = j.author_name || null; authorUrl = j.author_url || null; }
    } catch (e) { /* ignore */ }
    let tags = [];
    try {
      const html = await fetchText('https://www.youtube.com/watch?v=' + id);
      const m = html && html.match(/"keywords":\s*(\[[^\]]*\])/);
      if (m) tags = JSON.parse(m[1]).filter(function (x) { return typeof x === 'string'; }).slice(0, 30);
    } catch (e) { /* ignore */ }
    if (!title) return res.json({ ok: false });
    res.json({ ok: true, title: title, author: author, authorUrl: authorUrl, tags: tags, thumb: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' });
  });

  app.get('/api/yt-trends', async function (req, res) {
    if (!rateOk(req, res, 20)) return;
    const niche = String(req.query.niche || 'general');
    const seeds = TREND_SEEDS[niche] || TREND_SEEDS.general;
    const nicheName = (NICHE_OPTIONS.find(function (o) { return o.value === niche; }) || {}).label || 'General';
    const seen = {};
    const topics = [];
    await Promise.all(seeds.map(async function (s) {
      const sug = await ytSuggest(s);
      sug.forEach(function (t) {
        const k = t.toLowerCase();
        if (!seen[k] && topics.length < 12 && t.length > 3) { seen[k] = 1; topics.push({ term: t }); }
      });
    }));
    res.json({ ok: true, topics: topics, nicheName: nicheName });
  });
}

module.exports = registerTools;
module.exports.TOOLS = TOOLS;
