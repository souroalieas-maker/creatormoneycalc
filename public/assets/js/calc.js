/**
 * CreatorMoneyCalc — calculator wiring
 *
 * DOM contract (exact):
 *   <form class="calc-form" data-calc="earnings|rpm|shorts|views-money|engagement"
 *         data-default-rpm="4" data-default-shorts-rpm="0.07" novalidate>
 *
 * After a successful calculation:
 *   fetch('/api/track', { method:'POST', headers:{'Content-Type':'application/json'},
 *          body: JSON.stringify({ type:'calc', id:<data-calc> }) })
 * in try/catch, never blocking the UI.
 *
 * Loaded with `defer`.
 */
(function () {
  'use strict';

  // Labels must match the <option> text in the country select.
  var COUNTRY_RPM = {
    'United States': [3, 8],
    'Canada': [2.5, 6],
    'United Kingdom': [2.5, 6],
    'Australia': [2.5, 6],
    'Pakistan': [0.4, 1.2],
    'India': [0.3, 1],
    'Other': [1, 3]
  };

  var SHORTS_RPM_MIN = 0.03;
  var SHORTS_RPM_MAX = 0.10;

  function money(n) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function showError(form, message) {
    var el = form.querySelector('.calc-error');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
  }

  function clearError(form) {
    var el = form.querySelector('.calc-error');
    if (el) {
      el.textContent = '';
      el.classList.remove('show');
    }
  }

  function getNumber(input) {
    if (!input) return NaN;
    var raw = String(input.value).trim().replace(/,/g, '');
    if (raw === '') return NaN;
    return Number(raw);
  }

  function fill(form, name, value) {
    var el = form.querySelector('[data-result="' + name + '"]');
    if (el) el.textContent = value;
  }

  function revealResults(form) {
    var box = form.querySelector('.calc-results');
    if (box) {
      box.classList.add('show');
      if (typeof box.scrollIntoView === 'function') {
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  function trackCalc(id) {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'calc', id: id })
      }).catch(function () { /* analytics must never break the UI */ });
    } catch (e) { /* never block UI */ }
  }

  function validFinite(n) {
    return typeof n === 'number' && isFinite(n);
  }

  /* ---------- earnings ---------- */
  function wireEarnings(form) {
    var viewsInput = form.querySelector('input[name=views]');
    var rpmInput = form.querySelector('input[name=rpm]');
    var countrySel = form.querySelector('select[name=country]');
    var hint = form.querySelector('[data-country-hint]');
    var rpmLabel = form.querySelector('[data-rpm-label]');
    var typeRadios = form.querySelectorAll('input[type=radio][name=ctype]');

    var defaultRpm = parseFloat(form.getAttribute('data-default-rpm')) || 4;
    var defaultShortsRpm = parseFloat(form.getAttribute('data-default-shorts-rpm')) || 0.07;

    function currentType() {
      var checked = form.querySelector('input[type=radio][name=ctype]:checked');
      return checked ? checked.value : 'long';
    }

    function refreshHint() {
      if (!hint) return;
      if (currentType() === 'shorts') {
        hint.textContent = 'Typical Shorts RPM: $' + SHORTS_RPM_MIN.toFixed(2) +
          '–$' + SHORTS_RPM_MAX.toFixed(2);
        return;
      }
      var label = countrySel ? countrySel.options[countrySel.selectedIndex].text : 'Other';
      var range = COUNTRY_RPM[label] || COUNTRY_RPM['Other'];
      hint.textContent = 'Typical RPM range: $' + range[0] + '–$' + range[1];
    }

    function refreshRpmForType() {
      if (currentType() === 'shorts') {
        if (rpmLabel) rpmLabel.textContent = 'Shorts RPM (USD)';
        if (rpmInput) rpmInput.value = defaultShortsRpm;
      } else {
        if (rpmLabel) rpmLabel.textContent = 'RPM (USD)';
        if (rpmInput && (rpmInput.value === '' || rpmInput.value === String(defaultShortsRpm))) {
          rpmInput.value = defaultRpm;
        }
      }
    }

    if (countrySel) countrySel.addEventListener('change', refreshHint);
    typeRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        refreshRpmForType();
        refreshHint();
      });
    });
    refreshRpmForType();
    refreshHint();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(form);

      var views = getNumber(viewsInput);
      var rpm = getNumber(rpmInput);

      if (!validFinite(views) || views <= 0) {
        showError(form, 'Please enter your views (a number greater than 0).');
        return;
      }
      if (!validFinite(rpm) || rpm < 0) {
        showError(form, 'Please enter a valid RPM (0 or higher).');
        return;
      }

      var monthly = (views / 1000) * rpm;
      if (!validFinite(monthly)) {
        showError(form, 'That calculation produced an invalid number. Please check your inputs.');
        return;
      }

      fill(form, 'monthly', money(monthly));
      fill(form, 'daily', money(monthly / 30));
      fill(form, 'weekly', money(monthly / 4.33));
      fill(form, 'yearly', money(monthly * 12));
      revealResults(form);
      trackCalc(form.getAttribute('data-calc') || 'earnings');
    });
  }

  /* ---------- rpm (revenue ÷ views × 1000) ---------- */
  function wireRpm(form) {
    var revenueInput = form.querySelector('input[name=revenue]');
    var viewsInput = form.querySelector('input[name=views]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(form);

      var revenue = getNumber(revenueInput);
      var views = getNumber(viewsInput);

      if (!validFinite(revenue) || revenue < 0) {
        showError(form, 'Please enter a valid revenue (0 or higher).');
        return;
      }
      if (!validFinite(views) || views <= 0) {
        showError(form, 'Please enter your views (a number greater than 0).');
        return;
      }

      var rpm = (revenue / views) * 1000;
      if (!validFinite(rpm)) {
        showError(form, 'That calculation produced an invalid number. Please check your inputs.');
        return;
      }

      fill(form, 'rpm', '$' + rpm.toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      }));
      revealResults(form);
      trackCalc(form.getAttribute('data-calc') || 'rpm');
    });
  }

  /* ---------- shorts ---------- */
  function wireShorts(form) {
    var viewsInput = form.querySelector('input[name=views]');
    var rpmInput = form.querySelector('input[name=rpm]');
    var defaultShortsRpm = parseFloat(form.getAttribute('data-default-shorts-rpm')) || 0.07;
    if (rpmInput && rpmInput.value === '') rpmInput.value = defaultShortsRpm;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(form);

      var views = getNumber(viewsInput);
      var rpm = getNumber(rpmInput);

      if (!validFinite(views) || views <= 0) {
        showError(form, 'Please enter your views (a number greater than 0).');
        return;
      }
      if (!validFinite(rpm) || rpm < 0) {
        showError(form, 'Please enter a valid RPM (0 or higher).');
        return;
      }

      var monthly = (views / 1000) * rpm;
      if (!validFinite(monthly)) {
        showError(form, 'That calculation produced an invalid number. Please check your inputs.');
        return;
      }

      fill(form, 'monthly', money(monthly));
      fill(form, 'daily', money(monthly / 30));
      fill(form, 'weekly', money(monthly / 4.33));
      fill(form, 'yearly', money(monthly * 12));
      revealResults(form);
      trackCalc(form.getAttribute('data-calc') || 'shorts');
    });
  }

  /* ---------- views-money (tier table) ---------- */
  function wireViewsMoney(form) {
    var viewsInput = form.querySelector('input[name=views]');
    var rpmInput = form.querySelector('input[name=rpm]');
    var defaultRpm = parseFloat(form.getAttribute('data-default-rpm')) || 4;
    if (rpmInput && rpmInput.value === '') rpmInput.value = defaultRpm;

    var TIERS = [1000, 10000, 100000, 1000000, 10000000];

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(form);

      var views = getNumber(viewsInput); // base views only used for validation context
      var rpm = getNumber(rpmInput);

      if (viewsInput && viewsInput.value.trim() !== '' && (!validFinite(views) || views <= 0)) {
        showError(form, 'Please enter your views (a number greater than 0).');
        return;
      }
      if (!validFinite(rpm) || rpm < 0) {
        showError(form, 'Please enter a valid RPM (0 or higher).');
        return;
      }

      var ok = true;
      TIERS.forEach(function (tier) {
        var cell = form.querySelector('[data-tier="' + tier + '"]');
        var amount = (tier / 1000) * rpm;
        if (!validFinite(amount)) { ok = false; return; }
        if (cell) cell.textContent = money(amount);
      });
      if (!ok) {
        showError(form, 'That calculation produced an invalid number. Please check your inputs.');
        return;
      }

      revealResults(form);
      trackCalc(form.getAttribute('data-calc') || 'views-money');
    });
  }

  /* ---------- engagement ---------- */
  function wireEngagement(form) {
    var viewsInput = form.querySelector('input[name=views]');
    var likesInput = form.querySelector('input[name=likes]');
    var commentsInput = form.querySelector('input[name=comments]');
    var sharesInput = form.querySelector('input[name=shares]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(form);

      var views = getNumber(viewsInput);
      var likes = getNumber(likesInput);
      var comments = getNumber(commentsInput);
      var shares = getNumber(sharesInput);

      if (!validFinite(views) || views <= 0) {
        showError(form, 'Please enter your views (a number greater than 0).');
        return;
      }
      var parts = { Likes: likes, Comments: comments, Shares: shares };
      for (var name in parts) {
        if (!validFinite(parts[name]) || parts[name] < 0) {
          showError(form, 'Please enter a valid number for ' + name + ' (0 or higher).');
          return;
        }
      }

      var pct = ((likes + comments + shares) / views) * 100;
      if (!validFinite(pct)) {
        showError(form, 'That calculation produced an invalid number. Please check your inputs.');
        return;
      }

      var rating = pct < 1 ? 'Low' : pct < 3 ? 'Average' : pct < 6 ? 'Good' : 'Excellent';
      fill(form, 'rate', pct.toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      }) + '%');
      fill(form, 'rating', rating + ' (rough guide)');
      revealResults(form);
      trackCalc(form.getAttribute('data-calc') || 'engagement');
    });
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('form.calc-form');
    forms.forEach(function (form) {
      var type = form.getAttribute('data-calc');
      switch (type) {
        case 'earnings': wireEarnings(form); break;
        case 'rpm': wireRpm(form); break;
        case 'shorts': wireShorts(form); break;
        case 'views-money': wireViewsMoney(form); break;
        case 'engagement': wireEngagement(form); break;
        default: break;
      }
    });
  });
})();
