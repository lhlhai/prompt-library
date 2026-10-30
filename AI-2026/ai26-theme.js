/* AI-2026 shared theme bootstrap + toggle (additive, no framework needed).
   Reads the same localStorage keys as index.html / token.html so the
   preference is consistent across the whole series. */
(() => {
  'use strict';
  const KEY = 'ai26-theme';
  function readStored() {
    try {
      return localStorage.getItem(KEY) || localStorage.getItem('ai-pattern-theme') || localStorage.getItem('theme');
    } catch (_) { return null; }
  }
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
      localStorage.setItem('ai-pattern-theme', theme);
      localStorage.setItem('theme', theme);
    } catch (_) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f3f6fa' : '#07121d');
    const btn = document.getElementById('ai26ThemeToggle');
    if (btn) {
      btn.textContent = theme === 'light' ? '☾ Giao diện tối' : '☀ Giao diện sáng';
      btn.setAttribute('aria-pressed', String(theme === 'light'));
    }
  }
  const saved = readStored();
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  apply(saved === 'light' || saved === 'dark' ? saved : (prefersLight ? 'light' : 'dark'));

  function injectButton() {
    // Pages that already ship their own toggle (#themeToggle in index.html /
    // token.html) keep it — ai26-theme.js still bootstraps the theme there.
    if (document.getElementById('ai26ThemeToggle') || document.getElementById('themeToggle')) return;
    const host = document.querySelector('.topbar nav')
      || document.querySelector('.tc-header-actions')
      || document.querySelector('.header-actions')
      || document.querySelector('.topbar .nav')
      || document.querySelector('.topbar')
      || document.body;
    const btn = document.createElement('button');
    btn.id = 'ai26ThemeToggle';
    btn.type = 'button';
    btn.className = 'ai26-theme-btn';
    btn.setAttribute('aria-label', 'Chuyển giao diện sáng/tối');
    btn.addEventListener('click', () => {
      apply(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    });
    host.appendChild(btn);
    apply(document.documentElement.dataset.theme);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButton);
  else injectButton();
})();
