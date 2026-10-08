'use strict';
/* Shared view helpers. */
const { escapeHtml } = require('./md');

const fmtUSD = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '$0.00';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};
const fmtNum = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
};
const todayStr = () => new Date().toISOString().slice(0, 10);

/* Slugify for blog posts. */
const slugify = (s) => String(s || '').toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80);

/* Ad slot renderer: real code when enabled, else a subtle placeholder. */
function adSlot(ads, location, isMobile) {
  const slot = ads && ads[location];
  if (slot && slot.enabled) {
    const code = isMobile ? (slot.mobile_code || slot.desktop_code) : (slot.desktop_code || slot.mobile_code);
    if (code && code.trim()) return `<div class="ad-slot ad-live" data-loc="${escapeHtml(location)}">${code}</div>`;
  }
  return `<div class="ad-slot" data-loc="${escapeHtml(location)}"><span>Advertisement</span></div>`;
}

/* Group a referrer into a traffic-source label. No IPs stored anywhere. */
function sourceLabel(ref) {
  if (!ref) return 'Direct';
  try {
    const h = new URL(ref).hostname.toLowerCase();
    if (h.includes('google.')) return 'Google';
    if (h.includes('bing.')) return 'Bing';
    if (h.includes('youtube.') || h.includes('youtu.be')) return 'YouTube';
    if (h.includes('facebook.') || h.includes('fb.')) return 'Facebook';
    if (h.includes('instagram.')) return 'Instagram';
    if (h.includes('tiktok.')) return 'TikTok';
    if (h.includes('x.com') || h.includes('twitter.')) return 'X / Twitter';
    if (h.includes('reddit.')) return 'Reddit';
    return 'Referral';
  } catch { return 'Direct'; }
}

module.exports = { fmtUSD, fmtNum, todayStr, slugify, adSlot, sourceLabel, escapeHtml };
