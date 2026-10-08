/**
 * CreatorMoneyCalc — admin UI helpers
 * - Sidebar toggle: button.sidebar-toggle toggles body.sidebar-collapsed
 * - Blog editor live preview: textarea#body_md -> div#md-preview
 *   (tiny client-side markdown: escape HTML first, then headings/bold/
 *   italic/lists/links)
 * - Slug auto-fill: input#title -> input#slug (slugify on input, only if the
 *   slug field is untouched)
 * - Delete confirmations: [data-confirm] -> confirm()
 * Loaded with `defer`.
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  function inlineMd(text) {
    // `text` must already be HTML-escaped.
    return text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/(^|[^a-zA-Z0-9_])_([^_\n]+)_/g, '$1<em>$2</em>');
  }

  function markdownToHtml(src) {
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    var html = '';
    var inList = false;

    function closeList() {
      if (inList) { html += '</ul>'; inList = false; }
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();

      if (/^#{1,6}\s/.test(trimmed)) {
        closeList();
        var level = trimmed.match(/^#+/)[0].length;
        var text = trimmed.replace(/^#{1,6}\s+/, '');
        html += '<h' + level + '>' + inlineMd(escapeHtml(text)) + '</h' + level + '>';
        return;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) { html += '<ul>'; inList = true; }
        var item = trimmed.replace(/^[-*]\s+/, '');
        html += '<li>' + inlineMd(escapeHtml(item)) + '</li>';
        return;
      }

      closeList();
      if (trimmed === '') {
        return; // blank line = paragraph break
      }
      html += '<p>' + inlineMd(escapeHtml(trimmed)) + '</p>';
    });

    closeList();
    return html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Sidebar toggle
    var sidebarToggle = document.querySelector('button.sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        document.body.classList.toggle('sidebar-collapsed');
      });
    }

    // Blog editor live markdown preview
    var bodyMd = document.getElementById('body_md');
    var preview = document.getElementById('md-preview');
    if (bodyMd && preview) {
      var render = function () {
        preview.innerHTML = markdownToHtml(bodyMd.value);
      };
      bodyMd.addEventListener('input', render);
      render();
    }

    // Slug auto-fill (only while untouched)
    var titleInput = document.getElementById('title');
    var slugInput = document.getElementById('slug');
    if (titleInput && slugInput) {
      slugInput.addEventListener('input', function () {
        slugInput.dataset.touched = '1';
      });
      titleInput.addEventListener('input', function () {
        if (!slugInput.dataset.touched) {
          slugInput.value = slugify(titleInput.value);
        }
      });
    }

    // Delete confirmations
    document.querySelectorAll('[data-confirm]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var message = el.getAttribute('data-confirm') || 'Are you sure?';
        if (!window.confirm(message)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);
    });
  });
})();
