'use strict';
/* Minimal Markdown → HTML renderer for blog posts and admin-edited pages.
 * Supports: headings, bold, italic, links, images, unordered/ordered lists,
 * paragraphs. HTML is escaped first; only http(s) URLs are linkified. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function safeUrl(u) {
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : '#';
}
function inline(s) {
  let out = escapeHtml(s);
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) =>
    `<img src="${escapeHtml(safeUrl(url))}" alt="${alt}" loading="lazy">`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, url) =>
    `<a href="${escapeHtml(safeUrl(url))}" rel="noopener">${t}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}
function md(src) {
  const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
  let html = '', inUl = false, inOl = false, para = [];
  const flushPara = () => {
    if (para.length) { html += `<p>${inline(para.join(' '))}</p>\n`; para = []; }
  };
  const closeLists = () => {
    if (inUl) { html += '</ul>\n'; inUl = false; }
    if (inOl) { html += '</ol>\n'; inOl = false; }
  };
  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushPara(); closeLists(); continue; }
    const h = t.match(/^(#{1,4})\s+(.*)/);
    if (h) { flushPara(); closeLists(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>\n`; continue; }
    const ul = t.match(/^[-*]\s+(.*)/);
    if (ul) { flushPara(); if (inOl) { html += '</ol>\n'; inOl = false; } if (!inUl) { html += '<ul>\n'; inUl = true; } html += `<li>${inline(ul[1])}</li>\n`; continue; }
    const ol = t.match(/^\d+[.)]\s+(.*)/);
    if (ol) { flushPara(); if (inUl) { html += '</ul>\n'; inUl = false; } if (!inOl) { html += '<ol>\n'; inOl = true; } html += `<li>${inline(ol[1])}</li>\n`; continue; }
    closeLists();
    para.push(t);
  }
  flushPara(); closeLists();
  return html;
}
module.exports = { md, escapeHtml };
