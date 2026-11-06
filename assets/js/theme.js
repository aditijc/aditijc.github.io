/*
 * Light / dark theme switch. Loaded synchronously in <head> so the stored
 * preference is applied before the first paint. Light is the default for
 * visitors with no saved choice; the light theme is turned on with
 * data-theme="light" on <html>.
 */
(function () {
    'use strict';
    var KEY = 'theme';
    var root = document.documentElement;

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function apply(theme) {
        var light = theme === 'light';
        if (light) root.setAttribute('data-theme', 'light');
        else root.removeAttribute('data-theme');

        var btn = document.getElementById('theme-toggle');
        if (btn) {
            var label = light ? 'Switch to dark mode' : 'Switch to light mode';
            btn.setAttribute('aria-pressed', String(light));
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);
        }
    }

    apply(stored() === 'dark' ? 'dark' : 'light');

    var BUTTON =
        '<button id="theme-toggle" class="theme-toggle" type="button">' +
        '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4.2"/>' +
        '<path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>' +
        '</svg>' +
        '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>' +
        '</svg>' +
        '</button>';

    document.addEventListener('DOMContentLoaded', function () {
        document.body.insertAdjacentHTML('beforeend', BUTTON);
        var btn = document.getElementById('theme-toggle');
        apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
        btn.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            try { localStorage.setItem(KEY, next); } catch (e) { /* private mode etc. */ }
            apply(next);
        });
    });
}());
