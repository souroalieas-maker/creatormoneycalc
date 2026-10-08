/**
 * CreatorMoneyCalc — public navigation
 * - Mobile hamburger: button.nav-toggle toggles nav.main-nav.open (and body.nav-open)
 * - Dropdowns: li.has-dropdown > a toggles .open on the li (click, touch-friendly)
 * Loaded with `defer`.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Mobile hamburger
    var toggle = document.querySelector('button.nav-toggle');
    var nav = document.querySelector('nav.main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var isOpen = nav.classList.toggle('open');
        document.body.classList.toggle('nav-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', nav.id || 'main-nav');
    }

    // Click-to-toggle dropdowns (touch-friendly; not hover-only)
    var dropdownLinks = document.querySelectorAll('li.has-dropdown > a');
    dropdownLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var li = link.closest('li.has-dropdown');
        if (!li) return;
        e.preventDefault();
        var wasOpen = li.classList.contains('open');
        // Close sibling dropdowns
        document.querySelectorAll('li.has-dropdown.open').forEach(function (other) {
          other.classList.remove('open');
        });
        if (!wasOpen) li.classList.add('open');
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('li.has-dropdown')) {
        document.querySelectorAll('li.has-dropdown.open').forEach(function (li) {
          li.classList.remove('open');
        });
      }
    });
  });
})();
