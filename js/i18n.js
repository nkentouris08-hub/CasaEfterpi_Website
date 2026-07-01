(function () {
  'use strict';

  var STORAGE_KEY = 'casa-efterpi-lang';
  var DEFAULT_LANG = 'en';
  var SUPPORTED = ['en', 'el'];

  var _current = {};
  var _fallback = {};

  function getSaved() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; }
    catch (e) { return DEFAULT_LANG; }
  }

  function loadJSON(code) {
    return fetch('./i18n/' + code + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  function applyAll(t) {
    // Update textContent for all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t[key] !== undefined ? t[key] : _fallback[key];
      if (val !== undefined) {
        el.textContent = val;
      } else {
        console.warn('[i18n] Missing key: "' + key + '"');
      }
    });

    // Update attributes for all [data-i18n-attr] elements
    // Format: "attr:key" — multiple pairs separated by commas
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(function (part) {
        var idx = part.indexOf(':');
        var attr = part.slice(0, idx).trim();
        var key = part.slice(idx + 1).trim();
        var val = t[key] !== undefined ? t[key] : _fallback[key];
        if (val !== undefined) {
          el.setAttribute(attr, val);
        } else {
          console.warn('[i18n] Missing key: "' + key + '" for attr "' + attr + '"');
        }
      });
    });
  }

  function updateSwitcherUI(code) {
    var isEl = code === 'el';

    // Desktop trigger label
    var flagEl = document.getElementById('lang-flag');
    var labelEl = document.getElementById('lang-label');
    if (flagEl) flagEl.textContent = isEl ? '🇬🇷' : '🇬🇧';
    if (labelEl) labelEl.textContent = isEl ? 'Ελληνικά' : 'English';

    // All [data-lang] buttons (desktop options + mobile buttons)
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      var selected = btn.getAttribute('data-lang') === code;
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (btn.classList.contains('mobile-lang-btn')) {
        btn.classList.toggle('is-active', selected);
      }
    });

    document.documentElement.lang = code;
  }

  function closeDropdown() {
    var dd = document.getElementById('lang-dropdown');
    var tr = document.getElementById('lang-trigger');
    if (dd) dd.classList.remove('is-open');
    if (tr) tr.setAttribute('aria-expanded', 'false');
  }

  function setLanguage(code) {
    if (SUPPORTED.indexOf(code) === -1) {
      console.warn('[i18n] Unsupported language: "' + code + '"');
      return Promise.resolve();
    }

    return loadJSON(code)
      .then(function (t) {
        _current = t;
        try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
        applyAll(t);
        updateSwitcherUI(code);
        closeDropdown();
      })
      .catch(function (err) {
        console.error('[i18n] Failed to load "' + code + '":', err);
      });
  }

  function initDropdown() {
    var trigger = document.getElementById('lang-trigger');
    var dropdown = document.getElementById('lang-dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (dropdown.classList.contains('is-open')) {
        closeDropdown();
      } else {
        dropdown.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    // Close on outside click
    document.addEventListener('click', closeDropdown);

    // Prevent clicks inside dropdown from bubbling to document
    dropdown.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  function initButtons() {
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLanguage(btn.getAttribute('data-lang'));
      });
    });
  }

  function init() {
    var saved = getSaved();

    loadJSON(DEFAULT_LANG)
      .then(function (fb) {
        _fallback = fb;

        if (saved === DEFAULT_LANG) {
          _current = fb;
          applyAll(fb);
          updateSwitcherUI(DEFAULT_LANG);
          initDropdown();
          initButtons();
        } else {
          return loadJSON(saved)
            .then(function (t) {
              _current = t;
              applyAll(t);
              updateSwitcherUI(saved);
              initDropdown();
              initButtons();
            })
            .catch(function () {
              // Requested language failed — silently fall back to English
              _current = fb;
              applyAll(fb);
              updateSwitcherUI(DEFAULT_LANG);
              try { localStorage.setItem(STORAGE_KEY, DEFAULT_LANG); } catch (e) {}
              initDropdown();
              initButtons();
            });
        }
      })
      .catch(function (err) {
        console.error('[i18n] Could not load base translations:', err);
        initDropdown();
        initButtons();
      });
  }

  // Expose globally so inline onclick handlers can call it if needed
  window.setLanguage = setLanguage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
