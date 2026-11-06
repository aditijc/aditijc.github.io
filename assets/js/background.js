/*
 * Animated background shared by index.html and thoughts.html.
 *
 * Dark theme  : drifting dots joined into a constellation.
 * Light theme : the same (now invisible) dots become hills on a topographic
 *               map; contour lines are traced around them with marching squares.
 *
 * The pure helpers (computeField, contourSegments) are exported for the
 * Node test suite in tests/topo.test.js.
 */
(function (root) {
    'use strict';

    /* ---------- pure helpers ---------- */

    // Accumulate Gaussian hills into `out` (a Float32Array of cols*rows).
    // peaks: [{x, y, h, sigma}] in pixels; cell: grid spacing in pixels.
    function computeField(peaks, cols, rows, cell, out) {
        out.fill(0);
        for (var i = 0; i < peaks.length; i++) {
            var p = peaks[i];
            var R = p.sigma * 3;
            var R2 = R * R;
            var inv = 1 / (2 * p.sigma * p.sigma);
            var gx0 = Math.max(0, Math.floor((p.x - R) / cell));
            var gx1 = Math.min(cols - 1, Math.ceil((p.x + R) / cell));
            var gy0 = Math.max(0, Math.floor((p.y - R) / cell));
            var gy1 = Math.min(rows - 1, Math.ceil((p.y + R) / cell));
            for (var gy = gy0; gy <= gy1; gy++) {
                var dy = gy * cell - p.y;
                var dy2 = dy * dy;
                var row = gy * cols;
                for (var gx = gx0; gx <= gx1; gx++) {
                    var dx = gx * cell - p.x;
                    var d2 = dx * dx + dy2;
                    if (d2 < R2) out[row + gx] += p.h * Math.exp(-d2 * inv);
                }
            }
        }
        return out;
    }

    // Marching squares. Returns a flat array [x0,y0,x1,y1, ...] of line
    // segments (in pixels) tracing the iso-line field == level.
    function contourSegments(field, cols, rows, cell, level) {
        var segs = [];
        function lerp(ax, ay, av, bx, by, bv) {
            var t = (level - av) / (bv - av);
            return [(ax + (bx - ax) * t) * cell, (ay + (by - ay) * t) * cell];
        }
        for (var gy = 0; gy < rows - 1; gy++) {
            var r0 = gy * cols, r1 = r0 + cols;
            for (var gx = 0; gx < cols - 1; gx++) {
                var a = field[r0 + gx],     b = field[r0 + gx + 1];
                var d = field[r1 + gx],     c = field[r1 + gx + 1];
                var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
                if (idx === 0 || idx === 15) continue;

                // edge points: top (a-b), right (b-c), bottom (d-c), left (a-d)
                var top, right, bottom, left;
                if ((a > level) !== (b > level)) top = lerp(gx, gy, a, gx + 1, gy, b);
                if ((b > level) !== (c > level)) right = lerp(gx + 1, gy, b, gx + 1, gy + 1, c);
                if ((d > level) !== (c > level)) bottom = lerp(gx, gy + 1, d, gx + 1, gy + 1, c);
                if ((a > level) !== (d > level)) left = lerp(gx, gy, a, gx, gy + 1, d);

                switch (idx) {
                    case 1: case 14: push(left, bottom); break;
                    case 2: case 13: push(bottom, right); break;
                    case 3: case 12: push(left, right); break;
                    case 4: case 11: push(top, right); break;
                    case 6: case 9:  push(top, bottom); break;
                    case 7: case 8:  push(left, top); break;
                    case 5: case 10: {
                        // saddle: disambiguate with the cell centre
                        var centreHigh = (a + b + c + d) / 4 > level;
                        if ((idx === 5) === centreHigh) { push(left, top); push(bottom, right); }
                        else { push(left, bottom); push(top, right); }
                        break;
                    }
                }
            }
        }
        function push(p, q) { segs.push(p[0], p[1], q[0], q[1]); }
        return segs;
    }

    // Join loose segments into polylines by their shared endpoints.
    // Returns [{points: [[x,y], ...], closed: bool}, ...].
    function chainSegments(segs) {
        var n = segs.length / 4;
        var pts = new Array(n * 2);
        var byVertex = new Map();
        function key(x, y) { return Math.round(x * 1024) * 1e6 + Math.round(y * 1024); }
        for (var i = 0; i < n; i++) {
            var a = [segs[i * 4], segs[i * 4 + 1]];
            var b = [segs[i * 4 + 2], segs[i * 4 + 3]];
            pts[i * 2] = a; pts[i * 2 + 1] = b;
            var ka = key(a[0], a[1]), kb = key(b[0], b[1]);
            (byVertex.get(ka) || byVertex.set(ka, []).get(ka)).push(i);
            (byVertex.get(kb) || byVertex.set(kb, []).get(kb)).push(i);
        }
        var used = new Uint8Array(n);
        var chains = [];

        // Walk from segment `seg` leaving through vertex `end` (0 = a, 1 = b).
        function walk(seg, end, out) {
            var cur = seg, e = end;
            for (;;) {
                var p = pts[cur * 2 + e];
                out.push(p);
                var list = byVertex.get(key(p[0], p[1]));
                var next = -1;
                for (var k = 0; k < list.length; k++) if (!used[list[k]]) { next = list[k]; break; }
                if (next < 0) return false;            // open end
                used[next] = 1;
                var na = pts[next * 2];
                e = (na[0] === p[0] && na[1] === p[1]) ? 1 : 0;   // leave through the far vertex
                cur = next;
                var q = pts[cur * 2 + e];
                if (q[0] === out[0][0] && q[1] === out[0][1] && out.length > 1) return true; // closed
            }
        }

        for (var s = 0; s < n; s++) {
            if (used[s]) continue;
            used[s] = 1;
            var forward = [pts[s * 2]];
            var closed = walk(s, 1, forward);
            if (closed) { chains.push({ points: forward, closed: true }); continue; }
            var backward = [];
            walk(s, 0, backward);
            backward.reverse();
            backward.pop(); // the starting vertex is already forward[0]
            chains.push({ points: backward.concat(forward), closed: false });
        }
        return chains;
    }

    var api = { computeField: computeField, contourSegments: contourSegments, chainSegments: chainSegments };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof document === 'undefined') return;

    /* ---------- browser animation ---------- */

    var canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var mobile = window.innerWidth <= 768;
    var COUNT = mobile ? 35 : 100;
    var MAX_DIST = mobile ? 100 : 130;
    var MOUSE_DIST = 180;
    var CELL = mobile ? 8 : 6;
    var TOPO_COUNT = Math.ceil(COUNT * 0.75); // light mode uses three quarters of the dots as hills
    var LEVEL_STEP = 0.12;
    var LEVELS = [];
    for (var L = LEVEL_STEP; L < 1.6; L += LEVEL_STEP) LEVELS.push(L);

    var W, H, cols, rows, field;
    var particles = [];
    var mouse = { x: null, y: null };

    function isLight() {
        return document.documentElement.getAttribute('data-theme') === 'light';
    }

    if (!mobile) {
        window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
        window.addEventListener('mouseleave', function () { mouse.x = null; mouse.y = null; });
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        // Render at device resolution so hairlines stay crisp on HiDPI screens.
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(W / CELL) + 1;
        rows = Math.ceil(H / CELL) + 1;
        field = new Float32Array(cols * rows);
    }

    function Particle() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.r = mobile ? Math.random() * 0.8 + 0.4 : Math.random() * 1.65 + 0.55;
        // hill shape for the topographic theme
        this.h = 0.55 + Math.random() * 0.6;
        this.sigma = mobile ? 30 + Math.random() * 25 : 38 + Math.random() * 34;
    }

    function init() {
        resize();
        particles = [];
        for (var i = 0; i < COUNT; i++) particles.push(new Particle());
    }

    function step() {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
        }
    }

    function drawConstellation() {
        ctx.fillStyle = '#201d1b';
        ctx.fillRect(0, 0, W, H);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            for (var j = i + 1; j < particles.length; j++) {
                var q = particles[j];
                var dx = p.x - q.x, dy = p.y - q.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - dist / MAX_DIST) * 0.2) + ')';
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
            if (mouse.x !== null) {
                var mdx = p.x - mouse.x, mdy = p.y - mouse.y;
                var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < MOUSE_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - mdist / MOUSE_DIST) * 0.4) + ')';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fill();
        }
    }

    function drawTopography() {
        ctx.fillStyle = '#f7efdd';
        ctx.fillRect(0, 0, W, H);

        var peaks = particles.slice(0, TOPO_COUNT);
        if (mouse.x !== null) {
            peaks.push({ x: mouse.x, y: mouse.y, h: 0.9, sigma: 70 });
        }
        computeField(peaks, cols, rows, CELL, field);

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (var li = 0; li < LEVELS.length; li++) {
            var segs = contourSegments(field, cols, rows, CELL, LEVELS[li]);
            if (!segs.length) continue;
            var index = (li + 1) % 4 === 0;        // every 4th line is an "index contour"
            var chains = chainSegments(segs);
            ctx.beginPath();
            for (var c = 0; c < chains.length; c++) tracePath(chains[c]);
            ctx.strokeStyle = index ? 'rgba(150, 70, 45, 0.315)' : 'rgba(150, 70, 45, 0.165)';
            ctx.lineWidth = index ? 1.1 : 0.65;
            ctx.stroke();
        }
    }

    // Draw a polyline as a smooth curve: quadratic arcs through the midpoints
    // of consecutive points, with each original point as the control point.
    function tracePath(chain) {
        var p = chain.points, n = p.length;
        if (n < 2) return;
        if (chain.closed) {
            ctx.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
            for (var i = 0; i < n; i++) {
                var q = p[(i + 1) % n];
                ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + q[0]) / 2, (p[i][1] + q[1]) / 2);
            }
            ctx.closePath();
        } else {
            ctx.moveTo(p[0][0], p[0][1]);
            for (var j = 1; j < n - 1; j++) {
                ctx.quadraticCurveTo(p[j][0], p[j][1], (p[j][0] + p[j + 1][0]) / 2, (p[j][1] + p[j + 1][1]) / 2);
            }
            ctx.lineTo(p[n - 1][0], p[n - 1][1]);
        }
    }

    function frame() {
        step();
        if (isLight()) drawTopography(); else drawConstellation();
        requestAnimationFrame(frame);
    }

    window.addEventListener('resize', init);
    init();
    frame();
}(this));
