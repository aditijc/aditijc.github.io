/*
 * Clicking the bird in the header: the bird turns, swoops down across the page
 * and out to the left, pulling its ribbon behind it. The ribbon widens until
 * it covers the page, and the next page is revealed as the ribbon trails off.
 * Loaded in <head> so the reveal is in place before the next page first paints.
 */
(function () {
    'use strict';
    var root = document.documentElement;
    var KEY = 'bird-arrive';
    var IW = 7082, IH = 1442;                 // header artwork size
    var BIRD = [6828, 61, 7019, 219];         // the bird's box within it
    var DURATION = 1400;
    // Ribbon bands, bottom to top. The top band ends up covering the page.
    var BANDS = {
        dark:  ['#7a2614', '#b4501f', '#6e5233'],
        light: ['#b23424', '#d9a77c', '#ead8ba']
    };

    function store(op, value) {
        try {
            if (op === 'get') return sessionStorage.getItem(KEY);
            if (op === 'set') sessionStorage.setItem(KEY, value);
            if (op === 'del') sessionStorage.removeItem(KEY);
        } catch (e) { /* storage blocked: skip the reveal */ }
        return null;
    }

    // Arriving from a bird click: cover the page, then reveal it (CSS does the reveal).
    if (store('get')) {
        store('del');
        root.classList.add('bird-arriving');
        setTimeout(function () { root.classList.remove('bird-arriving'); }, 1400);
    }

    var busy = false;

    // Coming back with the browser's back button can restore this page mid-flight.
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        busy = false;
        root.classList.remove('bird-flying');
        var o = document.getElementById('bird-flight');
        if (o) o.parentNode.removeChild(o);
    });

    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

    function fly(href, header) {
        var W = window.innerWidth, H = window.innerHeight;
        var diag = Math.sqrt(W * W + H * H);
        var r = header.getBoundingClientRect();
        // The header art is drawn with background-size: cover, anchored at the top.
        var s = Math.max(r.width / IW, r.height / IH);
        var ox = r.left + (r.width - IW * s) / 2, oy = r.top;
        var bx = ox + (BIRD[0] + BIRD[2]) / 2 * s, by = oy + (BIRD[1] + BIRD[3]) / 2 * s;
        var light = root.getAttribute('data-theme') === 'light';
        var colors = BANDS[light ? 'light' : 'dark'];

        var o = document.createElement('div');
        o.id = 'bird-flight';
        o.style.cssText = 'position:fixed;inset:0;z-index:3000;pointer-events:none;overflow:hidden;';

        // The flight path, which the ribbon follows: from the bird, down
        // through the page, and out past the left edge.
        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.style.cssText = 'position:absolute;inset:0;';
        var d = 'M ' + bx + ' ' + by +
                ' C ' + (0.85 * W) + ' ' + (0.6 * H) + ', ' +
                (0.35 * W) + ' ' + (0.95 * H) + ', ' +
                (-0.3 * W) + ' ' + (0.6 * H);
        var paths = colors.map(function (c) {
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', d);
            p.setAttribute('fill', 'none');
            p.setAttribute('stroke', c);
            p.setAttribute('stroke-linecap', 'round');
            svg.appendChild(p);
            return p;
        });
        var L = paths[0].getTotalLength();
        paths.forEach(function (p) { p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
        o.appendChild(svg);

        // The bird: the same layer the header draws, at the same place and size.
        var bird = document.createElement('div');
        bird.style.cssText = 'position:absolute;left:' + ox + 'px;top:' + oy + 'px;width:' + (IW * s) +
            'px;height:' + (IH * s) + 'px;background:url(images/' + (light ? 'header_light_bird' : 'header_bird') +
            '.png) 0 0/100% 100% no-repeat;transform-origin:' + (bx - ox) + 'px ' + (by - oy) + 'px;will-change:transform;';
        o.appendChild(bird);

        document.body.appendChild(o);
        root.classList.add('bird-flying');

        var base = Math.max(24, 0.03 * W);    // starting ribbon width, about the header ribbon's
        var start = null;
        function frame(now) {
            if (start === null) start = now;
            var t = (now - start) / DURATION;

            // Bird: turns to face left, then swoops along the path, growing as it nears.
            var q = ease(clamp(t / 0.85));
            var pt = paths[0].getPointAtLength(q * L);
            var ahead = paths[0].getPointAtLength(Math.min(L, q * L + 2));
            var heading = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
            var turn = clamp(t / 0.12);               // flip from facing right to facing left
            var k = 1 + 1.6 * q;
            bird.style.transform = 'translate(' + (pt.x - bx) + 'px,' + (pt.y - by) + 'px) rotate(' +
                (0.35 * (heading - 180) * turn) + 'deg) scale(' + (k * (1 - 2 * turn)) + ',' + k + ')';

            // Ribbon: drawn out behind the bird, then widening until it covers the page.
            var grow = clamp((t - 0.3) / 0.7);
            paths.forEach(function (path, i) {
                var w = base + grow * grow * grow * 2.3 * diag;
                path.style.strokeDashoffset = L * (1 - q);
                path.style.strokeWidth = w * (1 + 0.4 * (2 - i));
            });

            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                store('set', '1');
                window.location.href = href;
            }
        }
        requestAnimationFrame(frame);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var link = document.querySelector('.bird-link');
        var header = document.querySelector('header');
        if (!link || !header) return;
        link.addEventListener('click', function (e) {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            e.preventDefault();
            if (busy) return;
            busy = true;
            fly(link.href, header);
        });
    });
}());
