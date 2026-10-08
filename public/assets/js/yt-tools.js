/* ==========================================================================
   CreatorMoneyCalc — YouTube Tools engine (client-side)
   Offline smart generators + thin API clients. No sign-up, no keys.
   ========================================================================== */
(function () {
'use strict';

/* ---------------- utils ---------------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function cleanTopic(s) {
  return String(s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();
}
var BRAND_WORDS = { youtube: 'YouTube', iphone: 'iPhone', ipad: 'iPad', ai: 'AI', tv: 'TV', gta: 'GTA', fifa: 'FIFA', ps5: 'PS5', xbox: 'Xbox' };
function titleCase(s) {
  var small = { a: 1, an: 1, the: 1, and: 1, or: 1, of: 1, in: 1, on: 1, to: 1, for: 1, vs: 1, with: 1 };
  return cleanTopic(s).split(' ').map(function (w, i) {
    var lw = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (BRAND_WORDS[lw]) return BRAND_WORDS[lw];
    if (i > 0 && small[lw]) return lw;
    var c = w.toLowerCase();
    return c.charAt(0).toUpperCase() + c.slice(1);
  }).join(' ');
}
function hashTag(s) {
  return '#' + cleanTopic(s).split(' ').map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join('').replace(/[^A-Za-z0-9_]/g, '');
}
function uniq(arr) {
  var seen = {}, out = [];
  arr.forEach(function (x) {
    var k = String(x).toLowerCase();
    if (x && !seen[k]) { seen[k] = 1; out.push(x); }
  });
  return out;
}
function getVals(panel) {
  var vals = {};
  $all('input, textarea, select', panel).forEach(function (el) { vals[el.name] = el.value; });
  return vals;
}
function setStatus(panel, msg, busy) {
  var st = $('[data-role="status"]', panel);
  if (st) st.innerHTML = busy ? '<span class="spinner"></span> ' + esc(msg) : esc(msg || '');
}
function showResult(panel, opts) {
  var card = $('[data-role="result"]', panel);
  var title = $('[data-role="resultTitle"]', card);
  var actions = $('[data-role="actions"]', card);
  var body = $('[data-role="body"]', card);
  title.textContent = opts.title || 'Result';
  actions.innerHTML = '';
  (opts.actions || []).forEach(function (a) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copy-btn'; b.textContent = a.label;
    b.addEventListener('click', function () { copyText(a.text(), b); });
    actions.appendChild(b);
  });
  body.innerHTML = opts.html || '';
  card.classList.add('show');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function copyText(text, btn) {
  function done() {
    if (!btn) return;
    var old = btn.textContent;
    btn.textContent = 'Copied ✓'; btn.classList.add('copied');
    setTimeout(function () { btn.textContent = old; btn.classList.remove('copied'); }, 1600);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { fallback(); });
  } else fallback();
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); done();
  }
}
function chipsHtml(items, cls) {
  return '<div class="chips">' + items.map(function (t) {
    return '<button type="button" class="chip' + (cls ? ' ' + cls : '') + '" data-chip="' + esc(t) + '">' + esc(t) + '</button>';
  }).join('') + '</div>';
}
function bindChips(panel, onPick) {
  $all('[data-chip]', panel).forEach(function (c) {
    c.addEventListener('click', function () {
      c.classList.toggle('picked');
      if (onPick) onPick(c.getAttribute('data-chip'), c.classList.contains('picked'));
    });
  });
}
function videoIdFromUrl(url) {
  var m = String(url || '').match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/* ---------------- niche knowledge ---------------- */
var NICHES = [
  { id: 'gaming', name: 'Gaming', match: ['game', 'gaming', 'gta', 'minecraft', 'fortnite', 'pubg', 'free fire', 'valorant', 'fifa', 'fc 25', 'ps5', 'xbox', 'roblox', 'bgmi', 'call of duty', 'esports'],
    tags: ['gaming', 'gamer', 'gameplay', 'gaming videos', 'walkthrough'], hashtags: ['#Gaming', '#Gamer', '#Gameplay', '#GamingCommunity'],
    learn: ['pro settings and configurations', 'advanced strategies used by top players', 'common mistakes that hold most players back'] },
  { id: 'tech', name: 'Tech', match: ['tech', 'ai', 'artificial intelligence', 'iphone', 'android', 'laptop', 'software', 'coding', 'python', 'programming', 'app', 'gadget', 'review'],
    tags: ['tech', 'technology', 'tech review', 'gadgets'], hashtags: ['#Tech', '#Technology', '#Gadgets', '#TechReview'],
    learn: ['how the technology actually works under the hood', 'real-world performance tests and results', 'whether it is worth your money in 2026'] },
  { id: 'finance', name: 'Finance & Money', match: ['money', 'finance', 'invest', 'stock', 'crypto', 'bitcoin', 'trading', 'passive income', 'earn money', 'business', 'startup', 'rich'],
    tags: ['finance', 'money', 'investing', 'passive income', 'financial freedom'], hashtags: ['#Finance', '#Money', '#Investing', '#PassiveIncome'],
    learn: ['the exact numbers and math behind it', 'risks most people ignore', 'how to get started with little money'] },
  { id: 'fitness', name: 'Fitness', match: ['fitness', 'workout', 'gym', 'exercise', 'weight loss', 'muscle', 'diet', 'yoga', 'health'],
    tags: ['fitness', 'workout', 'gym', 'health', 'weight loss'], hashtags: ['#Fitness', '#Workout', '#Gym', '#Health'],
    learn: ['the correct form that prevents injury', 'a simple routine you can follow at home', 'nutrition basics that actually matter'] },
  { id: 'cooking', name: 'Cooking', match: ['cook', 'recipe', 'food', 'kitchen', 'baking', 'chicken', 'biryani', 'curry'],
    tags: ['cooking', 'recipe', 'food', 'easy recipes'], hashtags: ['#Cooking', '#Recipe', '#Food', '#Foodie'],
    learn: ['the full ingredient list with measurements', 'step-by-step cooking process', 'pro tips for perfect texture and taste'] },
  { id: 'travel', name: 'Travel', match: ['travel', 'trip', 'tour', 'vlog', 'destination', 'dubai', 'pakistan', 'places to visit'],
    tags: ['travel', 'travel vlog', 'tourism', 'places to visit'], hashtags: ['#Travel', '#TravelVlog', '#Wanderlust'],
    learn: ['the best places most tourists miss', 'exact budget breakdown for the trip', 'tips for traveling safe and cheap'] },
  { id: 'education', name: 'Education', match: ['learn', 'study', 'exam', 'course', 'tutorial', 'explained', 'science', 'history', 'math'],
    tags: ['education', 'learning', 'tutorial', 'explained'], hashtags: ['#Education', '#Learning', '#StudyTips'],
    learn: ['the core concepts explained simply', 'real examples that make it stick', 'how to apply this in exams and real life'] },
  { id: 'music', name: 'Music', match: ['music', 'song', 'sing', 'guitar', 'piano', 'remix', 'lyrics'],
    tags: ['music', 'song', 'new song', 'music video'], hashtags: ['#Music', '#NewSong', '#MusicVideo'],
    learn: ['the story behind the track', 'a breakdown of the composition', 'how to play/sing it yourself'] },
  { id: 'beauty', name: 'Beauty', match: ['beauty', 'makeup', 'skincare', 'fashion', 'style', 'hair'],
    tags: ['beauty', 'makeup', 'skincare', 'fashion'], hashtags: ['#Beauty', '#Makeup', '#Skincare'],
    learn: ['the exact products used (with alternatives)', 'step-by-step application technique', 'mistakes that ruin the final look'] },
  { id: 'motivation', name: 'Motivation', match: ['motivation', 'motivational', 'success', 'mindset', 'self improvement', 'discipline', 'habits'],
    tags: ['motivation', 'motivational video', 'success', 'mindset'], hashtags: ['#Motivation', '#Success', '#Mindset'],
    learn: ['the mindset shift that changes everything', 'daily habits of highly successful people', 'how to stay consistent when motivation fades'] },
  { id: 'movies', name: 'Movies & Entertainment', match: ['movie', 'film', 'cinema', 'netflix', 'hollywood', 'bollywood', 'drama', 'series', 'trailer', 'web series'],
    tags: ['movie', 'film', 'movie review', 'new movie', 'film review'], hashtags: ['#Movies', '#MovieReview', '#Film', '#Cinema'],
    learn: ['the full story without spoilers', 'hidden details most viewers missed', 'whether it is worth your time'] }
];
function detectNiche(topic) {
  var t = ' ' + topic.toLowerCase() + ' ';
  for (var i = 0; i < NICHES.length; i++) {
    for (var j = 0; j < NICHES[i].match.length; j++) {
      if (t.indexOf(NICHES[i].match[j]) !== -1) return NICHES[i];
    }
  }
  return null;
}

/* ---------------- generators ---------------- */
function genTags(topic) {
  var t = cleanTopic(topic), tl = t.toLowerCase();
  var niche = detectNiche(t);
  var tags = [tl];
  ['2026', 'tutorial', 'guide', 'explained', 'for beginners', 'step by step', 'tips', 'tricks', 'review', 'how to'].forEach(function (m) {
    tags.push(tl + ' ' + m);
  });
  tags.push('how to ' + tl, 'what is ' + tl, tl + ' in hindi', 'best ' + tl);
  if (niche) tags = tags.concat(niche.tags);
  tags.push('youtube video', 'viral video', 'trending');
  tags = uniq(tags).slice(0, 30);
  // YouTube allows 500 chars of tags — trim to fit
  var out = [], chars = 0;
  tags.forEach(function (tag) {
    if (chars + tag.length + 2 <= 500) { out.push(tag); chars += tag.length + 2; }
  });
  return { tags: out, chars: chars };
}
var PLATFORM_HASHTAGS = {
  youtube: ['#YouTube', '#Viral', '#Trending'],
  tiktok: ['#fyp', '#foryou', '#foryoupage', '#viral', '#trending', '#tiktok'],
  facebook: ['#reels', '#facebookreels', '#viral', '#trending']
};
function genHashtags(topic, platform) {
  var t = cleanTopic(topic), niche = detectNiche(t);
  var tags = [hashTag(t)];
  t.split(' ').forEach(function (w) { if (w.length > 3) tags.push(hashTag(w)); });
  if (niche) tags = tags.concat(niche.hashtags);
  tags = tags.concat(PLATFORM_HASHTAGS[platform] || PLATFORM_HASHTAGS.youtube);
  return uniq(tags).slice(0, 15);
}
var TITLE_TEMPLATES = {
  youtube: [
    'I Tried {T} for 30 Days — Here\'s What Happened',
    '{T} Explained in 10 Minutes (2026 Guide)',
    '10 {T} Tips You Wish You Knew Earlier',
    'Why Everyone Is Talking About {T} in 2026',
    '{T} for Beginners: Complete Step-by-Step Tutorial',
    'STOP Doing {T} Wrong! (Do THIS Instead)',
    'The Untold Truth About {T} (Nobody Tells You This)',
    '{T}: 7 Mistakes Beginners Always Make',
    'How to Master {T} Fast (Proven Method)',
    '$1 vs $1,000 {T} — What\'s the Difference?',
    '{T} in 2026: What\'s Changed & What Still Works',
    'I Asked Experts About {T} — Their Answers Shocked Me',
    'The Ultimate {T} Guide (Beginner to Pro)',
    '5 {T} Secrets the Pros Don\'t Want You to Know',
    '{T} — Everything You Need to Know Before You Start',
    'Rating Popular {T} Advice: What Actually Works?'
  ],
  tiktok: [
    'POV: You Finally Try {T} 😱',
    'Wait for It… This {T} Broke the Internet 🤯',
    'Nobody Talks About This {T} Trick 🤫',
    '3 {T} Hacks in 30 Seconds ⚡',
    'I Tried {T} So You Don\'t Have To 😅',
    '{T} Check ✅ Did I Do It Right?',
    'The {T} Hack Everyone Needs to Know 🔥',
    'Rating {T} Until I Find a 10/10 ⭐',
    'This {T} Has 10M Views for a Reason 👀',
    '{T} in 15 Seconds — Go! ⏱️',
    'Stop Scrolling! You Need This {T} 🛑',
    'Day 1 of {T} — Follow My Journey 📈'
  ],
  facebook: [
    '{T} That Will Blow Your Mind 🤯 (Share This!)',
    'Everyone Is Sharing This {T} Video — Here\'s Why',
    'You Won\'t Believe What This {T} Can Do 😲',
    '{T} for Beginners — Tag Someone Who Needs This 👇',
    'The {T} Video Your Friends Will Thank You For Sharing ❤️',
    '10 {T} Tips That Actually Work in 2026',
    'This {T} Changed Everything for Me 🙏',
    '{T} Explained Simply — Perfect for Sharing 📤',
    'Watch Till the End: {T} Surprise! 🎁',
    'The Truth About {T} Nobody Tells You 🤫'
  ]
};
function genTitles(topic, platform) {
  var T = titleCase(topic);
  var templates = TITLE_TEMPLATES[platform] || TITLE_TEMPLATES.youtube;
  return templates.map(function (s) { return s.split('{T}').join(T); });
}
function genChannelNames(topic, playful) {
  var words = cleanTopic(topic).split(' ').filter(function (w) { return w.length > 2; });
  var base = words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join('');
  var short = words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
  var names;
  if (playful) {
    names = [base + 'Verse', 'The' + base + 'Show', base + 'Zone', 'Daily' + base, base + 'Uncut',
      'Real' + base, base + 'Adda', 'The' + base + 'Lab', base + 'Diaries', 'Ask' + base,
      base + 'Simplified', base + 'WithTwist', 'The' + base + 'Guy', base + 'ExplainedDaily'];
  } else {
    names = [base + 'Hub', base + 'Lab', 'The' + base + 'Channel', base + 'Official', base + 'TV',
      base + 'Mastery', 'Learn' + base, base + 'Insider', 'Pro' + base, base + 'Academy',
      'The' + base + 'Guide', base + 'World', short + ' Central', 'AllAbout' + base];
  }
  return uniq(names).slice(0, 16);
}
function genPlatformKeywords(topic, platform) {
  var t = cleanTopic(topic).toLowerCase();
  var out = [t, t + ' viral', t + ' trending', 'best ' + t, t + ' 2026',
    'how to ' + t, t + ' challenge', t + ' tips', t + ' for beginners',
    'viral ' + t + ' video', t + ' hack'];
  if (platform === 'tiktok') out = out.concat([t + ' tiktok', '#'+t.replace(/\s+/g,'') + ' trend']);
  if (platform === 'facebook') out = out.concat([t + ' reels', t + ' facebook']);
  return uniq(out).slice(0, 15);
}
var COMMENT_QUESTIONS = [
  'What is YOUR experience with this? Tell me in the comments!',
  'Which tip will you try first? Let me know below!',
  'Did I miss anything? Drop your questions in the comments!',
  'What topic should I cover next? Comment your suggestion!',
  'Agree or disagree? Let\'s discuss in the comments!'
];
function genDescription(topic, style, channel) {
  var t = cleanTopic(topic), T = titleCase(t);
  var niche = detectNiche(t);
  var nicheName = niche ? niche.name : 'creator';
  var styleLabel = { tutorial: 'tutorial', review: 'review', vlog: 'vlog', educational: 'educational video', entertainment: 'video', list: 'video' }[style] || 'video';
  var aspects = [
    'the basics of ' + t,
    'advanced ' + t + ' strategies that actually work',
    'common ' + t + ' mistakes to avoid'
  ];
  var learns = (niche ? niche.learn : [
    'the fundamentals explained in simple words',
    'practical steps you can apply immediately',
    'mistakes most beginners make (and how to avoid them)'
  ]).concat([
    'pro tips that save you time and effort',
    'answers to the most asked questions about ' + t
  ]);
  var q = COMMENT_QUESTIONS[t.length % COMMENT_QUESTIONS.length];
  var tags = genTags(t).tags.join(', ');
  var hashtags = genHashtags(t).join(' ');
  var ch = cleanTopic(channel);
  var hasYear = /\b(20\d{2})\b/.test(t);
  var yr = hasYear ? '' : ' 2026';

  var lines = [];
  lines.push('🎬 ' + T + ' — ' + (niche ? niche.name + ' ' : '') + 'Complete ' + titleCase(styleLabel) + (hasYear ? '' : ' (2026)'));
  lines.push('');
  lines.push('In this ' + styleLabel + ', we break down ' + t + ' step by step — ' + aspects.join(', ') + '.');
  lines.push('Whether you are a complete beginner or looking to level up, this video covers everything you need to know about ' + t + yr + '.');
  lines.push('');
  lines.push('📌 IN THIS VIDEO:');
  lines.push('Everything about ' + t + ', explained simply: ' + aspects[0] + ', ' + aspects[1] + ', and ' + aspects[2] + '.');
  lines.push('');
  lines.push('✅ WHAT YOU\'LL LEARN:');
  learns.slice(0, 5).forEach(function (l) { lines.push('• ' + l.charAt(0).toUpperCase() + l.slice(1)); });
  lines.push('');
  lines.push('⏱️ CHAPTERS:');
  lines.push('00:00 – Introduction to ' + t);
  lines.push('02:15 – ' + titleCase(aspects[0]));
  lines.push('05:40 – ' + titleCase(aspects[1]));
  lines.push('09:20 – ' + titleCase(aspects[2]));
  lines.push('12:45 – Pro tips & mistakes to avoid');
  lines.push('15:10 – Final thoughts');
  lines.push('(Tip: adjust these timestamps to match your actual video!)');
  lines.push('');
  lines.push('🔍 ABOUT THIS VIDEO:');
  lines.push('This ' + styleLabel + ' on ' + t + ' is perfect for anyone interested in ' + nicheName.toLowerCase() + '. We cover ' + t + ' for beginners as well as advanced ' + t + ' techniques, with real examples and actionable advice you can use right away. If you have been searching for a complete ' + t + ' guide in 2026, this is it.');
  lines.push('');
  lines.push('👍 If this video helped you, please LIKE and SUBSCRIBE' + (ch ? ' to ' + ch : '') + ' for more ' + nicheName.toLowerCase() + ' content every week!');
  lines.push('');
  lines.push('💬 ' + q);
  lines.push('');
  if (ch) { lines.push('🔗 More from ' + ch + ': [paste your channel link]'); lines.push(''); }
  lines.push('🏷️ TAGS (paste into YouTube Studio → video details → tags):');
  lines.push(tags);
  lines.push('');
  lines.push(hashtags);
  lines.push('');
  lines.push('⚠️ Disclaimer: This video is for educational and informational purposes only. Results may vary.');
  return { text: lines.join('\n'), titles: genTitles(t).slice(0, 3), hashtags: hashtags, tags: tags };
}

/* ---------------- video/channel analyzer ---------------- */
function coreTopicFromTitle(title) {
  var t = String(title || '');
  t = t.replace(/[\(\[].*?[\)\]]/g, ' ')          // strip (brackets)
       .replace(/20\d{2}/g, ' ')                        // strip year
       .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')  // strip emojis
       .replace(/please (watch|subscribe)|like and subscribe|sub ?4 ?sub/gi, ' ')
       .replace(/\s+/g, ' ').trim()
       .replace(/^(i tried|i tested|i spent \d+ days?|i built|i made)\s+/i, '')
       .replace(/\s+for \d+ days?$/i, '')
       .replace(/\s+(and )?subscribe$/i, '')
       .replace(/^(the|a|an)\s+/i, '');
  return t || title;
}
function hasRepeat(t) {
  var w = String(t || '').toLowerCase().split(' '), seen = {};
  for (var i = 0; i < w.length - 1; i++) {
    var b = w[i] + ' ' + w[i + 1];
    if (seen[b]) return true;
    seen[b] = 1;
  }
  return false;
}
function tooSimilar(gen, orig) {
  var o = ' ' + String(orig || '').toLowerCase() + ' ';
  var w = String(gen || '').toLowerCase().split(' ');
  for (var i = 0; i < w.length - 2; i++) {
    if (o.indexOf(' ' + w[i] + ' ' + w[i+1] + ' ' + w[i+2] + ' ') !== -1) return true;
  }
  return false;
}
function keywordsFromTitle(title) {
  var stop = ['new','video','please','watch','the','and','for','vlog','part','my','this','that','with','your','you','are','was'];
  var freq = {};
  String(title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').forEach(function (w) {
    if (w.length > 3 && stop.indexOf(w) === -1) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 4);
}
/* ---------------- video/channel analyzer ---------------- */
function analyzeTitle(title) {
  var t = String(title || '').trim();
  var issues = [], score = 100;
  function add(sev, text, pts) {
    issues.push({ sev: sev, text: text });
    if (pts) score -= pts;
  }
  if (!t) return { score: 0, issues: [{ sev: 'bad', text: 'No title found.' }] };
  // length
  if (t.length > 60) add('bad', 'Title is ' + t.length + ' characters — YouTube cuts titles after ~60 chars in search. Move your main keyword to the very front.', 10);
  else if (t.length < 30) add('warn', 'Title is short (' + t.length + ' chars). Keyword-rich titles of 40–60 chars rank better.', 8);
  else add('good', 'Title length is ideal (' + t.length + ' characters).', 0);
  // caps
  var caps = t.split(' ').filter(function (w) { return w.length > 3 && /[A-Z]/.test(w) && w === w.toUpperCase(); });
  if (caps.length >= 2) add('bad', 'Too many ALL-CAPS words (' + caps.slice(0, 3).join(', ') + ') — looks spammy and hurts trust.', 8);
  else if (caps.length === 1) add('warn', 'One ALL-CAPS word is okay for emphasis — do not add more.', 2);
  // number
  if (/\d/.test(t)) add('good', 'Contains a number — numbers lift click-through rate.', 0);
  else add('warn', 'No number in the title. "7 tips" or "2026" style numbers usually lift clicks.', 5);
  // power words
  var pw = ['ultimate', 'proven', 'secret', 'shocking', 'mistakes', 'free', 'best', 'new', 'how', 'why', 'stop', 'truth', 'amazing', 'easy', 'fast', 'complete', 'guide', 'never', 'always'];
  var found = pw.filter(function (w) { return t.toLowerCase().indexOf(w) !== -1; });
  if (found.length) add('good', 'Power word detected ("' + found[0] + '") — good for curiosity and clicks.', 0);
  else add('warn', 'No power/emotion word. Words like "proven", "secret" or "mistakes" increase clicks.', 5);
  // brackets
  if (/[\(\[].*?[\)\]]/.test(t)) add('good', 'Brackets used — great for bonus info and CTR.', 0);
  else add('tip', 'Tip: add brackets like "(2026 Guide)" — they consistently boost clicks.', 3);
  // year = freshness
  if (/20\d{2}/.test(t)) add('good', 'Contains a year — signals fresh, relevant content.', 0);
  // curiosity hook
  if (/\?|…|\.\.\.|—|!/.test(t)) add('good', 'Curiosity/emotion punctuation present — good hook.', 0);
  else add('tip', 'Tip: a question or "…" curiosity gap can lift clicks.', 2);
  // begging / spam phrases
  if (/please (watch|subscribe)|sub ?4 ?sub|like and subscribe/i.test(t))
    add('bad', 'Begging phrases like "please subscribe" in the title scream desperation and kill clicks. Put the CTA in the video, not the title.', 15);
  // generic titles with no real topic
  var meaningful = t.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(function (w) {
    return w.length > 2 && ['new', 'video', 'please', 'watch', 'the', 'and', 'for', 'vlog', 'part'].indexOf(w) === -1;
  });
  if (meaningful.length < 2)
    add('bad', 'Title has no clear topic/keyword — YouTube cannot rank what it cannot understand. Name the actual subject.', 12);
  // entire title in caps
  if (t.length > 10 && t === t.toUpperCase() && /[A-Z]/.test(t))
    add('bad', 'Entire title is in ALL CAPS — this looks like spam and suppresses clicks.', 7);
  score = Math.max(5, Math.min(100, score));
  return { score: score, issues: issues };
}
function scoreColor(s) { return s >= 80 ? '#16a34a' : (s >= 55 ? '#f59e0b' : '#dc2626'); }
function scoreLabel(s) { return s >= 80 ? 'Excellent' : (s >= 55 ? 'Needs work' : 'Critical issues'); }

/* ---------------- tool runners ---------------- */
function needTopic(panel) {
  var v = getVals(panel);
  if (!cleanTopic(v.topic)) { setStatus(panel, 'Please enter a topic first.'); return null; }
  return v;
}
var runners = {
  'seo-description-generator': function (panel) {
    var v = needTopic(panel); if (!v) return;
    var d = genDescription(v.topic, v.style || 'educational', v.channel || '');
    var html = '<div class="result-text" id="descOut">' + esc(d.text) + '</div>' +
      '<div class="char-count">' + d.text.length + ' characters</div>' +
      '<div class="pro-tip" style="margin:12px 0 0"><strong>Bonus title ideas:</strong><br>• ' +
      d.titles.map(esc).join('<br>• ') + '</div>';
    showResult(panel, {
      title: 'Your SEO-optimized description',
      html: html,
      actions: [{ label: 'Copy full description', text: function () { return d.text; } }]
    });
  },
  'ai-title-generator': function (panel) {
    var v = needTopic(panel); if (!v) return;
    var titles = genTitles(v.topic, v.platform || 'youtube');
    showResult(panel, {
      title: titles.length + ' viral title ideas',
      html: '<ol class="result-list">' + titles.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>',
      actions: [{ label: 'Copy all titles', text: function () { return titles.join('\n'); } }]
    });
  },
  'ai-tags-generator': function (panel) {
    var v = needTopic(panel); if (!v) return;
    var g = genTags(v.topic);
    var over = g.chars > 500;
    showResult(panel, {
      title: g.tags.length + ' optimized tags (auto-fit to YouTube\'s 500-char limit)',
      html: chipsHtml(g.tags) + '<div class="char-count' + (over ? ' over' : '') + '">' + g.chars + ' / 500 characters used</div>',
      actions: [
        { label: 'Copy all tags', text: function () { return g.tags.join(', '); } },
        { label: 'Copy selected', text: function () { return $all('.chip.picked', panel).map(function (c) { return c.getAttribute('data-chip'); }).join(', ') || g.tags.join(', '); } }
      ]
    });
    bindChips(panel);
  },
  'ai-hashtag-generator': function (panel) {
    var v = needTopic(panel); if (!v) return;
    var tags = genHashtags(v.topic, v.platform || 'youtube');
    showResult(panel, {
      title: tags.length + ' hashtags',
      html: chipsHtml(tags) + '<div class="char-count">Tip: YouTube shows the first 3 hashtags above your video title — put your best 3 first.</div>',
      actions: [
        { label: 'Copy all', text: function () { return tags.join(' '); } },
        { label: 'Copy selected', text: function () { return $all('.chip.picked', panel).map(function (c) { return c.getAttribute('data-chip'); }).join(' ') || tags.join(' '); } }
      ]
    });
    bindChips(panel);
  },
  'ai-channel-name-generator': function (panel) {
    var v = needTopic(panel); if (!v) return;
    var names = genChannelNames(v.topic, false);
    showResult(panel, {
      title: names.length + ' channel name ideas',
      html: '<ol class="result-list">' + names.map(function (n) { return '<li><strong>' + esc(n) + '</strong></li>'; }).join('') + '</ol>',
      actions: [{ label: 'Copy all', text: function () { return names.join('\n'); } }]
    });
  },
  'channel-name-ideas': function (panel) {
    var v = needTopic(panel); if (!v) return;
    var names = genChannelNames(v.topic, true);
    showResult(panel, {
      title: names.length + ' creative channel name ideas',
      html: '<ol class="result-list">' + names.map(function (n) { return '<li><strong>' + esc(n) + '</strong></li>'; }).join('') + '</ol>' +
        '<div class="pro-tip" style="margin:12px 0 0"><strong>Pro tip:</strong> before you decide, search the name on YouTube to make sure no big channel already uses it.</div>',
      actions: [{ label: 'Copy all', text: function () { return names.join('\n'); } }]
    });
  },
  'keyword-suggestion': function (panel) {
    var v = getVals(panel);
    var q = cleanTopic(v.keyword);
    if (!q) { setStatus(panel, 'Please enter a keyword first.'); return; }
    var platform = v.platform || 'youtube';
    if (platform !== 'youtube') {
      var kws = genPlatformKeywords(q, platform);
      showResult(panel, {
        title: kws.length + ' ' + platform.charAt(0).toUpperCase() + platform.slice(1) + ' keyword ideas for "' + q + '"',
        html: chipsHtml(kws) + '<div class="char-count">Optimized keyword ideas for ' + platform + ' — mix these into your captions and hashtags.</div>',
        actions: [{ label: 'Copy all keywords', text: function () { return kws.join('\n'); } }]
      });
      return;
    }
    setStatus(panel, 'Fetching live YouTube suggestions…', true);
    fetch('/api/yt-suggest?q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setStatus(panel, '');
        if (!d.ok || !d.suggestions.length) {
          showResult(panel, { title: 'No suggestions', html: '<p class="muted">Could not fetch suggestions right now. Try again in a moment.</p>' });
          return;
        }
        showResult(panel, {
          title: d.suggestions.length + ' real YouTube search suggestions for "' + q + '"',
          html: chipsHtml(d.suggestions) + '<div class="char-count">Click any suggestion to search it again deeper. These are live autocomplete results from YouTube.</div>',
          actions: [{ label: 'Copy all keywords', text: function () { return d.suggestions.join('\n'); } }]
        });
        $all('[data-chip]', panel).forEach(function (c) {
          c.addEventListener('dblclick', function () {
            $('#f_keyword', panel).value = c.getAttribute('data-chip');
            runners['keyword-suggestion'](panel);
          });
        });
      })
      .catch(function () { setStatus(panel, 'Network error — please try again.'); });
  },
  'thumbnail-downloader': function (panel) {
    var v = getVals(panel);
    var id = videoIdFromUrl(v.url);
    if (!id) { setStatus(panel, 'Please paste a valid YouTube video URL.'); return; }
    var quals = [
      { k: 'maxresdefault', label: 'Full HD', sub: '1920×1080 (if available)' },
      { k: 'sddefault', label: 'SD', sub: '640×480' },
      { k: 'hqdefault', label: 'High quality', sub: '480×360' },
      { k: 'mqdefault', label: 'Medium', sub: '320×180' }
    ];
    var html = '<div class="thumb-grid">' + quals.map(function (q) {
      var src = 'https://i.ytimg.com/vi/' + id + '/' + q.k + '.jpg';
      return '<div class="thumb-item"><img src="' + src + '" alt="' + q.label + ' thumbnail" loading="lazy">' +
        '<div class="thumb-meta"><div><strong>' + q.label + '</strong><br><span>' + q.sub + '</span></div>' +
        '<a class="btn btn-secondary" href="' + src + '" download="thumbnail-' + q.k + '.jpg" target="_blank" rel="noopener">Download</a></div></div>';
    }).join('') + '</div><div class="char-count">If Full HD shows a grey placeholder, the video has no HD thumbnail — use SD instead.</div>';
    showResult(panel, { title: 'Thumbnails ready', html: html });
  },
  'popular-hashtags': function (panel) {
    var v = getVals(panel);
    var niche = null;
    for (var i = 0; i < NICHES.length; i++) if (NICHES[i].id === v.niche) niche = NICHES[i];
    var extra = {
      gaming: ['#Fortnite', '#Minecraft', '#GTA6', '#FreeFire', '#BGMI'],
      tech: ['#iPhone', '#Android', '#AI', '#ChatGPT', '#Coding'],
      finance: ['#Crypto', '#Bitcoin', '#StockMarket', '#Business', '#SideHustle'],
      fitness: ['#GymLife', '#WeightLoss', '#Yoga', '#HealthyLifestyle'],
      cooking: ['#Biryani', '#EasyRecipe', '#StreetFood', '#Baking'],
      travel: ['#Dubai', '#Pakistan', '#Vlog', '#TravelGuide'],
      education: ['#ExamPrep', '#OnlineLearning', '#ScienceExplained'],
      music: ['#Remix', '#Lyrics', '#CoverSong'],
      beauty: ['#MakeupTutorial', '#Fashion', '#GlowUp'],
      motivation: ['#NeverGiveUp', '#Discipline', '#Habits'],
      movies: ['#Hollywood', '#Bollywood', '#Netflix', '#MovieNight', '#Trailer', '#CinemaLovers']
    };
    var tags = uniq(((niche && niche.hashtags) || []).concat(extra[v.niche] || []).concat(['#Shorts', '#YouTubeShorts']));
    showResult(panel, {
      title: 'Popular hashtags' + (niche ? ' — ' + niche.name : ''),
      html: chipsHtml(tags),
      actions: [{ label: 'Copy all', text: function () { return tags.join(' '); } }]
    });
    bindChips(panel);
  },
  'tags-extractor': function (panel) {
    var v = getVals(panel);
    var id = videoIdFromUrl(v.url);
    if (!id) { setStatus(panel, 'Please paste a valid YouTube video URL.'); return; }
    setStatus(panel, 'Reading video info…', true);
    fetch('/api/yt-meta?url=' + encodeURIComponent(v.url))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setStatus(panel, '');
        if (!d.ok) {
          showResult(panel, { title: 'Could not read video', html: '<p class="muted">YouTube blocked the lookup. Try another video, or use the <a href="/tools/ai-tags-generator">AI Tags Generator</a> with the video title instead.</p>' });
          return;
        }
        var body = '';
        if (d.title) body += '<div class="stat-row"><div class="stat"><b>Video found</b><span>' + esc(d.title) + '</span></div>' +
          (d.author ? '<div class="stat"><b>Channel</b><span>' + esc(d.author) + '</span></div>' : '') + '</div>';
        if (d.tags && d.tags.length) {
          body += '<p><strong>Tags used on this video (' + d.tags.length + '):</strong></p>' + chipsHtml(d.tags);
        } else {
          var g = genTags(d.title || 'video');
          body += '<div class="pro-tip"><strong>Note:</strong> this video\'s exact tags are private, so we generated optimized tags from its real title instead — these are the tags we recommend:</div>' +
            chipsHtml(g.tags) + '<div class="char-count">' + g.chars + ' / 500 characters</div>';
          d.tags = g.tags;
        }
        showResult(panel, {
          title: 'Tags extracted',
          html: body,
          actions: [{ label: 'Copy all tags', text: function () { return (d.tags || []).join(', '); } }]
        });
        bindChips(panel);
      })
      .catch(function () { setStatus(panel, 'Network error — please try again.'); });
  },
  'trending-videos': function (panel) {
    var v = getVals(panel);
    setStatus(panel, 'Finding what viewers are searching right now…', true);
    fetch('/api/yt-trends?niche=' + encodeURIComponent(v.niche || 'general'))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setStatus(panel, '');
        if (!d.ok || !d.topics.length) {
          showResult(panel, { title: 'Try again', html: '<p class="muted">Could not load trends right now. Please retry in a moment.</p>' });
          return;
        }
        var html = '<p>Live search trends on YouTube right now' + (d.nicheName ? ' for <strong>' + esc(d.nicheName) + '</strong>' : '') + ' — make videos on these topics:</p>' +
          '<ol class="result-list">' + d.topics.map(function (t) {
            return '<li><strong>' + esc(t.term) + '</strong><br><a href="https://www.youtube.com/results?search_query=' + encodeURIComponent(t.term) + '" target="_blank" rel="noopener">See top videos for this search &rarr;</a></li>';
          }).join('') + '</ol>';
        showResult(panel, { title: d.topics.length + ' trending topics', html: html });
      })
      .catch(function () { setStatus(panel, 'Network error — please try again.'); });
  },
  'explore-channel': function (panel) {
    var v = getVals(panel);
    var url = cleanTopic(v.url);
    if (!url) { setStatus(panel, 'Please paste a channel or video URL.'); return; }
    setStatus(panel, 'Looking up…', true);
    fetch('/api/yt-meta?url=' + encodeURIComponent(url))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setStatus(panel, '');
        if (!d.ok) {
          showResult(panel, { title: 'Not found', html: '<p class="muted">Could not look this up. For best results paste any <strong>video URL</strong> from the channel.</p>' });
          return;
        }
        var html = '<div class="stat-row">' +
          (d.author ? '<div class="stat"><b>Channel</b><span>' + esc(d.author) + '</span></div>' : '') +
          (d.title ? '<div class="stat"><b>Latest video seen</b><span>' + esc(d.title) + '</span></div>' : '') + '</div>' +
          (d.authorUrl ? '<div class="btn-row"><a class="btn btn-secondary" href="' + esc(d.authorUrl) + '" target="_blank" rel="noopener">Open channel</a>' +
          '<a class="btn btn-secondary" href="' + esc(d.authorUrl) + '/videos" target="_blank" rel="noopener">Channel videos</a>' +
          '<a class="btn btn-secondary" href="' + esc(d.authorUrl) + '/about" target="_blank" rel="noopener">About page</a></div>' : '') +
          '<div class="pro-tip" style="margin:14px 0 0"><strong>How to study a channel:</strong> check their most-viewed videos (sort by Popular), note video length, titles and upload frequency — then make a better version of their best topic.</div>';
        showResult(panel, { title: 'Channel found', html: html });
      })
      .catch(function () { setStatus(panel, 'Network error — please try again.'); });
  },
  'video-analyzer': function (panel) {
    var v = getVals(panel);
    var url = cleanTopic(v.url);
    if (!url) { setStatus(panel, 'Please paste a YouTube link first.'); return; }
    var id = videoIdFromUrl(url);
    if (id) {
      setStatus(panel, 'Analyzing video…', true);
      fetch('/api/yt-meta?url=' + encodeURIComponent(url))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          setStatus(panel, '');
          if (!d.ok || !d.title) {
            showResult(panel, { title: 'Could not read video', html: '<p class="muted">YouTube blocked the lookup. Check the URL and try again.</p>' });
            return;
          }
          var a = analyzeTitle(d.title);
          var sevIcon = { good: '✅', warn: '⚠️', bad: '🔴', tip: '💡' };
          var circ = 2 * Math.PI * 52;
          var gauge = '<div class="score-gauge"><svg viewBox="0 0 120 120">' +
            '<circle cx="60" cy="60" r="52" class="gauge-bg"/>' +
            '<circle cx="60" cy="60" r="52" class="gauge-fg" style="stroke:' + scoreColor(a.score) + ';stroke-dasharray:' + (circ * a.score / 100).toFixed(1) + ' ' + circ.toFixed(1) + '"/>' +
            '</svg><div class="gauge-num"><b style="color:' + scoreColor(a.score) + '">' + a.score + '</b><span>' + scoreLabel(a.score) + '</span></div></div>';
          var html = '<div class="audit-top">' + gauge +
            '<div class="audit-meta"><p><strong>Analyzing:</strong><br>' + esc(d.title) + '</p>' +
            (d.author ? '<p><strong>Channel:</strong> ' + esc(d.author) + '</p>' : '') + '</div></div>' +
            '<h3 style="margin-top:16px">🔍 Issues found (' + a.issues.filter(function (x) { return x.sev !== 'good'; }).length + ')</h3><ul class="result-list">' +
            a.issues.map(function (it) { return '<li>' + sevIcon[it.sev] + ' ' + esc(it.text) + '</li>'; }).join('') + '</ul>';
          // rewritten titles — the "special" part
          var core = coreTopicFromTitle(d.title);
          var fixed = genTitles(core, 'youtube').filter(function (t) { return t.toLowerCase() !== String(d.title).toLowerCase() && !hasRepeat(t); }).slice(0, 3);
          html += '<h3 style="margin-top:16px">✨ Rewritten for you — better titles</h3><ol class="result-list">' +
            fixed.map(function (t) { return '<li><strong>' + esc(t) + '</strong></li>'; }).join('') + '</ol>';
          // keyword targeting
          var kws = keywordsFromTitle(d.title);
          html += '<h3 style="margin-top:16px">🎯 Keywords your title targets</h3>' + chipsHtml(kws) +
            '<div data-role="moresugs"><div class="char-count">Fetching more keywords to target…</div></div>';
          var ideas = genTitles(d.title, 'youtube').slice(0, 6);
          html += '<h3 style="margin-top:16px">🎬 Next video ideas for this channel</h3><ol class="result-list">' +
            ideas.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
            '<div class="pro-tip" style="margin:12px 0 0"><strong>Pro tip:</strong> run your next title through this analyzer <em>before</em> publishing — 30 seconds can save a video.</div>';
          var reportText = function () {
            return 'VIDEO SEO AUDIT — ' + d.title + '\nScore: ' + a.score + '/100 (' + scoreLabel(a.score) + ')\n\nISSUES:\n' +
              a.issues.map(function (it) { return '- [' + it.sev + '] ' + it.text; }).join('\n') +
              '\n\nREWRITTEN TITLES:\n' + fixed.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') +
              '\n\nNEXT VIDEO IDEAS:\n' + ideas.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n');
          };
          showResult(panel, {
            title: 'Video SEO audit complete',
            html: html,
            actions: [
              { label: 'Copy full audit report', text: reportText },
              { label: 'Copy rewritten titles', text: function () { return fixed.join('\n'); } }
            ]
          });
          // live extra keyword suggestions for the main keyword
          if (kws.length) {
            fetch('/api/yt-suggest?q=' + encodeURIComponent(kws[0]))
              .then(function (r) { return r.json(); })
              .then(function (sd) {
                var box = $('[data-role="moresugs"]', panel);
                if (!box) return;
                if (sd.ok && sd.suggestions.length) {
                  box.innerHTML = '<p style="margin:10px 0 4px"><strong>Also target these live searches:</strong></p>' + chipsHtml(sd.suggestions.slice(0, 8));
                } else box.innerHTML = '';
              }).catch(function () {});
          }
        })
        .catch(function () { setStatus(panel, 'Network error — please try again.'); });
    } else {
      // channel mode: offline audit
      var nicheName = (v.niche && v.niche !== 'general') ? v.niche : 'your niche';
      var checks = [
        ['🔴', '<strong>Niche clarity:</strong> can a new visitor tell what your channel is about in 3 seconds? If not, rewrite your channel description with your main keywords.'],
        ['🔴', '<strong>Upload consistency:</strong> YouTube promotes predictable channels. Aim for at least 1 video per week — same day if possible.'],
        ['⚠️', '<strong>Packaging:</strong> run your last 5 titles through the video analyzer above. Weak titles = invisible videos, no matter how good the content.'],
        ['⚠️', '<strong>Playlists:</strong> group videos into keyword-rich playlists — they rank in search and boost session time.'],
        ['💡', '<strong>Channel trailer:</strong> pin a 30–60 second trailer telling new visitors what they get and why to subscribe.'],
        ['💡', '<strong>About section:</strong> pack it with niche keywords — it helps channel-level search discovery.']
      ];
      var ideas = genTitles(nicheName === 'your niche' ? 'youtube growth' : nicheName, 'youtube').slice(0, 6);
      var html = '<div class="stat-row"><div class="stat"><b>Channel Audit</b><span>6-point health checklist</span></div></div>' +
        '<div class="pro-tip"><strong>Note:</strong> private stats (watch time, CTR) need YouTube Studio access — this audits everything public, where most small channels lose 80% of views.</div>' +
        '<h3>Health checklist</h3><ul class="result-list">' +
        checks.map(function (c) { return '<li>' + c[0] + ' ' + c[1] + '</li>'; }).join('') + '</ul>' +
        '<h3 style="margin-top:16px">🎬 Next video ideas</h3><ol class="result-list">' +
        ideas.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>';
      showResult(panel, {
        title: 'Channel audit complete',
        html: html,
        actions: [{ label: 'Copy video ideas', text: function () { return ideas.join('\n'); } }]
      });
    }
  },
  'find-competitor': function (panel) {
    var v = getVals(panel);
    var q = cleanTopic(v.keyword);
    if (!q) { setStatus(panel, 'Please enter your niche or keyword.'); return; }
    setStatus(panel, 'Discovering competitor searches…', true);
    fetch('/api/yt-suggest?q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setStatus(panel, '');
        var terms = (d.ok && d.suggestions.length ? d.suggestions : [q]).slice(0, 10);
        var html = '<p>Search these on YouTube — the channels ranking at the top are your real competitors. Study their titles, thumbnails and upload schedule:</p>' +
          '<ol class="result-list">' + terms.map(function (t) {
            return '<li><strong>' + esc(t) + '</strong><br><a href="https://www.youtube.com/results?search_query=' + encodeURIComponent(t) + '" target="_blank" rel="noopener">Find competitors for this search &rarr;</a></li>';
          }).join('') + '</ol>' +
          '<div class="pro-tip" style="margin:14px 0 0"><strong>Pro tip:</strong> pick 3 competitors with similar subscriber counts (not the giants). If they get views on a topic, you can too.</div>';
        showResult(panel, { title: 'Competitor discovery', html: html });
      })
      .catch(function () { setStatus(panel, 'Network error — please try again.'); });
  }
};

/* ---------------- init ---------------- */
function init() {
  $all('[data-tool]').forEach(function (panel) {
    var slug = panel.getAttribute('data-tool');
    var btn = $('[data-action="run"]', panel);
    if (!btn || !runners[slug]) return;
    btn.addEventListener('click', function () { runners[slug](panel); });
    // Enter key in text inputs triggers run
    $all('input[type="text"]', panel).forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); runners[slug](panel); }
      });
    });
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* exposed for debugging / automated tests */
if (typeof window !== 'undefined') {
  window.__ytTools = {
    genTags: genTags, genTitles: genTitles, genHashtags: genHashtags,
    genDescription: genDescription, genChannelNames: genChannelNames, genPlatformKeywords: genPlatformKeywords, analyzeTitle: analyzeTitle, coreTopicFromTitle: coreTopicFromTitle, keywordsFromTitle: keywordsFromTitle, tooSimilar: tooSimilar,
    detectNiche: detectNiche, titleCase: titleCase, cleanTopic: cleanTopic,
    videoIdFromUrl: videoIdFromUrl
  };
}
})();
