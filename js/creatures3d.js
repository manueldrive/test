/* Draw Together — 3D "inflated" sea creatures (prototype).
   Each creature is a side-view outline made of a few parts. The outline is puffed into a rounded
   3D body (thick in the middle, thin at fins and tips) and the kid's drawing is projected onto it
   from the side, so the coloring lines up with that creature's printed sheet.
   Needs THREE (three.min.js) and SharkCore. */
(function (global) {
  'use strict';
  var C = global.SharkCore;

  /* ---------------- helpers for drawing outlines ---------------- */
  function ell(g, x, y, rx, ry, rot) { g.moveTo(x + Math.cos(rot || 0) * rx, y + Math.sin(rot || 0) * rx); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
  // a tapered strip along a list of center points (for tentacles, ribbons)
  function strip(g, pts, w0, w1) {
    var L = [], R = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      var w = (w0 + (w1 - w0) * i / (n - 1)) / 2, nx = -dy / l * w, ny = dx / l * w;
      L.push([pts[i][0] + nx, pts[i][1] + ny]); R.push([pts[i][0] - nx, pts[i][1] - ny]);
    }
    g.moveTo(L[0][0], L[0][1]); for (i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
    g.arc(pts[n - 1][0], pts[n - 1][1], w1 / 2, 0, Math.PI * 2);
    g.moveTo(R[n - 1][0], R[n - 1][1]); for (i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.lineTo(L[0][0], L[0][1]); g.closePath();
  }
  function eye(g, x, y, r) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * 1.35, 0, 7); g.fill();
    g.fillStyle = '#0b1a24'; g.beginPath(); g.arc(x + r * .25, y, r, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + r * .55, y - r * .4, r * .35, 0, 7); g.fill();
  }
  function lines(g, segs, color, w) { g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; segs.forEach(function (s) { g.beginPath(); g.moveTo(s[0], s[1]); g.quadraticCurveTo(s[2], s[3], s[4], s[5]); g.stroke(); }); }
  function tentaclePts(x0, y0, len, curl, phase) {
    var p = []; for (var i = 0; i <= 14; i++) { var t = i / 14; p.push([x0 + Math.sin(t * 2.6 + phase) * 10 * t + curl * t * t * 16, y0 + t * len - curl * t * t * t * 18]); } return p;
  }

  /* ---------------- the creatures ----------------
     box: the area the kid's drawing covers (local units). parts: outline pieces (each filled on its own).
     base: [top color, belly color]. H/D: how puffy (max half-thickness, and how far in it reaches full height).
     size: scale in the tank. upright: floats upright instead of steering like a swimmer. */
  var DEFS = {
    shark: {
      label: 'Shark', box: C.BOX, H: 17, D: 24, size: 1, speed: [70, 95], turn: .55, z: [-380, 30], y: [-130, 105],
      parts: [function (g) { C.sharkPath(g, 0); }], custom: function (g, img) { C.drawShark(g, img, 0); },
      halfLen: 100, radius: 46,
      deform: function (x, y, z, ph, out) { var u = (106 - x) / 218, w = Math.pow(Math.max(0, u - .18) / .82, 1.6); out[0] = x - Math.abs(Math.sin(ph - u * 4.2)) * 2.5 * w; out[1] = y; out[2] = z + Math.sin(ph - u * 4.2) * 15 * w; }
    },
    turtle: {
      label: 'Sea turtle', box: { x: -112, y: -62, w: 238, h: 128 }, H: 22, D: 34, size: .95, speed: [34, 44], turn: .35, z: [-260, 0], y: [-110, 90],
      base: ['#8fb86c', '#d9e8b4'],
      parts: [
        function (g) { g.moveTo(-86, 12); g.bezierCurveTo(-80, -40, -30, -60, 8, -58); g.bezierCurveTo(50, -56, 78, -30, 80, 10); g.quadraticCurveTo(0, 30, -86, 12); g.closePath(); },     // shell
        function (g) { ell(g, 100, -2, 26, 18, -.15); g.moveTo(64, -8); g.lineTo(88, -14); g.lineTo(90, 12); g.lineTo(62, 14); g.closePath(); },  // head + neck
        function (g) { g.moveTo(26, 6); g.quadraticCurveTo(84, 26, 92, 62); g.quadraticCurveTo(48, 60, 8, 22); g.closePath(); },        // front flipper
        function (g) { g.moveTo(-58, 12); g.quadraticCurveTo(-88, 34, -108, 40); g.quadraticCurveTo(-78, 16, -46, 18); g.closePath(); }, // back flipper
        function (g) { g.moveTo(-84, 6); g.lineTo(-108, 12); g.lineTo(-82, 16); g.closePath(); }                                       // tail
      ],
      details: function (g) {
        lines(g, [[-60, 4, -40, -30, -20, -48], [-20, -48, 5, -40, 25, -48], [25, -48, 45, -30, 62, 2], [-30, 14, -26, -14, -6, -22], [-6, -22, 14, -14, 18, 16], [-60, 4, -20, 10, 18, 16]], 'rgba(40,60,20,.45)', 2.2);
        eye(g, 108, -8, 3.6); lines(g, [[118, 6, 108, 10, 98, 7]], 'rgba(40,40,20,.6)', 1.8);
      },
      halfLen: 95, radius: 52,
      deform: function (x, y, z, ph, out) {
        out[0] = x; out[1] = y; out[2] = z;
        var a;
        if (x > 8 && y > 6 && x < 96) { a = Math.sin(ph * .7) * .55 * Math.min(1, (y - 6) / 20); rot(out, 30, 10, a); out[2] = z + Math.cos(ph * .7) * 10 * Math.min(1, (y - 6) / 40); }
        else if (x < -44 && y > 10) { a = -Math.sin(ph * .7 + 1) * .35; rot(out, -50, 14, a); }
      }
    },
    whale: {
      label: 'Whale', box: { x: -152, y: -50, w: 280, h: 116 }, H: 24, D: 36, size: 1.9, speed: [32, 40], turn: .18, z: [-700, -560], y: [-20, 120],
      base: ['#5f87ab', '#e4ecf1'],
      parts: [
        function (g) { g.moveTo(124, 0); g.bezierCurveTo(124, -38, 70, -46, 0, -40); g.bezierCurveTo(-60, -34, -100, -14, -124, -5); g.lineTo(-124, 5); g.bezierCurveTo(-100, 12, -60, 30, 0, 32); g.bezierCurveTo(70, 38, 124, 30, 124, 0); g.closePath(); },
        function (g) { g.moveTo(-116, -2); g.quadraticCurveTo(-132, -28, -150, -44); g.quadraticCurveTo(-140, -10, -132, 0); g.quadraticCurveTo(-140, 10, -150, 44); g.quadraticCurveTo(-132, 28, -116, 4); g.closePath(); },
        function (g) { g.moveTo(42, 20); g.quadraticCurveTo(30, 52, 0, 64); g.quadraticCurveTo(14, 40, 22, 22); g.closePath(); },
        function (g) { g.moveTo(-48, -34); g.quadraticCurveTo(-58, -48, -70, -46); g.quadraticCurveTo(-62, -38, -60, -31); g.closePath(); }
      ],
      details: function (g) {
        lines(g, [[122, 8, 96, 22, 58, 16]], 'rgba(20,40,60,.55)', 2.4);
        for (var i = 0; i < 6; i++) lines(g, [[100 - i * 6, 20 + i * 1.5, 70 - i * 10, 26 + i, 30 - i * 12, 26 + i * .5]], 'rgba(20,40,60,.25)', 1.4);
        eye(g, 90, 2, 3.4);
      },
      halfLen: 135, radius: 60,
      deform: function (x, y, z, ph, out) { var u = (124 - x) / 274, w = Math.pow(Math.max(0, u - .3) / .7, 1.5); out[0] = x; out[1] = y + Math.sin(ph - u * 3) * 14 * w; out[2] = z; }
    },
    fish: {
      label: 'Tropical fish', box: { x: -98, y: -90, w: 182, h: 180 }, H: 9, D: 30, size: .48, speed: [95, 120], turn: 1.1, z: [-140, 60], y: [-110, 100],
      base: ['#ffcf6e', '#fff1c4'],
      parts: [
        function (g) { g.moveTo(80, 0); g.bezierCurveTo(72, -56, -10, -68, -48, -20); g.lineTo(-48, 20); g.bezierCurveTo(-10, 68, 72, 56, 80, 0); g.closePath(); },
        function (g) { g.moveTo(-44, 0); g.lineTo(-96, -42); g.quadraticCurveTo(-82, 0, -96, 42); g.closePath(); },
        function (g) { g.moveTo(10, -56); g.quadraticCurveTo(-14, -94, -44, -84); g.quadraticCurveTo(-36, -56, -28, -38); g.closePath(); },
        function (g) { g.moveTo(10, 56); g.quadraticCurveTo(-14, 94, -44, 84); g.quadraticCurveTo(-36, 56, -28, 38); g.closePath(); }
      ],
      details: function (g) { lines(g, [[40, -40, 30, 0, 40, 40]], 'rgba(60,40,10,.35)', 2.2); eye(g, 56, -12, 6); lines(g, [[80, 6, 74, 10, 70, 6]], 'rgba(60,30,10,.6)', 2); },
      halfLen: 60, radius: 40,
      deform: function (x, y, z, ph, out) { var u = (80 - x) / 176, w = Math.pow(Math.max(0, u - .3) / .7, 1.4); out[0] = x; out[1] = y; out[2] = z + Math.sin(ph * 1.6 - u * 3.5) * 16 * w; }
    },
    jelly: {
      label: 'Jellyfish', box: { x: -78, y: -94, w: 156, h: 204 }, H: 26, D: 40, size: .82, upright: true, z: [-260, -40], y: [-100, 110],
      base: ['#f9c8ef', '#ffe9f8'], glow: .22,
      parts: [
        function (g) { g.moveTo(-70, 0); g.bezierCurveTo(-70, -62, -36, -92, 0, -92); g.bezierCurveTo(36, -92, 70, -62, 70, 0); g.quadraticCurveTo(35, 12, 0, 6); g.quadraticCurveTo(-35, 12, -70, 0); g.closePath(); },
        function (g) { strip(g, tentaclePts(-40, 2, 100, 0, 0), 12, 5); },
        function (g) { strip(g, tentaclePts(-13, 4, 104, 0, 1.6), 13, 5); },
        function (g) { strip(g, tentaclePts(14, 4, 102, 0, 3.1), 13, 5); },
        function (g) { strip(g, tentaclePts(40, 2, 98, 0, 4.4), 12, 5); }
      ],
      details: function (g) { eye(g, -16, -36, 4.5); eye(g, 18, -36, 4.5); lines(g, [[-8, -18, 0, -12, 8, -18]], 'rgba(90,30,70,.6)', 2.2); },
      halfLen: 60, radius: 52,
      deform: function (x, y, z, ph, out) {
        var p = Math.max(0, Math.sin(ph)), k;
        out[0] = x; out[1] = y; out[2] = z;
        if (y < 8) { k = 1 - Math.max(0, -y) / 92; out[0] = x * (1 + .12 * p * (1 - k * .3)); out[1] = y * (1 - .13 * p); }
        else { out[0] = x + Math.sin(ph * .8 + y * .06 + x * .04) * 9 * (y / 100); out[2] = z + Math.cos(ph * .7 + y * .05) * 6 * (y / 100); }
      }
    },
    seahorse: {
      label: 'Seahorse', box: { x: -42, y: -100, w: 112, h: 210 }, H: 11, D: 16, size: .55, upright: true, z: [-120, 40], y: [-120, 40],
      base: ['#ffd451', '#ffefb0'],
      parts: [
        function (g) {
          g.moveTo(8, -96); g.quadraticCurveTo(40, -102, 46, -82); g.lineTo(68, -80); g.lineTo(68, -68); g.quadraticCurveTo(40, -64, 36, -52);
          g.quadraticCurveTo(58, -12, 42, 28); g.quadraticCurveTo(28, 58, 8, 68); g.quadraticCurveTo(-12, 80, -4, 94); g.quadraticCurveTo(10, 108, 18, 96);
          g.quadraticCurveTo(22, 84, 8, 84); g.quadraticCurveTo(-28, 88, -20, 60); g.quadraticCurveTo(-4, 40, 0, 10); g.quadraticCurveTo(-14, -30, -4, -60); g.quadraticCurveTo(-10, -86, 8, -96); g.closePath();
        },
        function (g) { g.moveTo(-4, -16); g.quadraticCurveTo(-38, -10, -32, 24); g.quadraticCurveTo(-16, 14, -2, 12); g.closePath(); },
        function (g) { g.moveTo(14, -98); g.lineTo(18, -110); g.lineTo(26, -98); g.closePath(); }
      ],
      details: function (g) { eye(g, 34, -80, 4); for (var i = 0; i < 6; i++) lines(g, [[38 - i * 1.5, -40 + i * 12, 30 - i * 2, -36 + i * 12, 22 - i * 2.5, -40 + i * 12]], 'rgba(120,70,10,.35)', 1.6); },
      halfLen: 70, radius: 34,
      deform: function (x, y, z, ph, out) { out[0] = x; out[1] = y; out[2] = z; if (x < -2 && y > -20 && y < 30) out[2] = z + Math.sin(ph * 4 + y * .2) * 5; if (y > 50) out[0] = x + Math.sin(ph * .6) * 4 * (y - 50) / 50; }
    },
    octopus: {
      label: 'Octopus', box: { x: -96, y: -100, w: 196, h: 210 }, H: 22, D: 30, size: .72, upright: true, z: [-200, 0], y: [-120, -20],
      base: ['#ff9a82', '#ffd6c9'],
      parts: [
        function (g) { ell(g, 0, -46, 56, 54, 0); },
        function (g) { strip(g, tentaclePts(-46, -8, 92, -1, 0), 20, 6); },
        function (g) { strip(g, tentaclePts(-22, -4, 100, -.5, 1.3), 22, 6); },
        function (g) { strip(g, tentaclePts(4, -2, 104, .3, 2.6), 22, 6); },
        function (g) { strip(g, tentaclePts(28, -4, 100, .8, 3.7), 22, 6); },
        function (g) { strip(g, tentaclePts(50, -8, 92, 1.2, 5), 20, 6); }
      ],
      details: function (g) { eye(g, -18, -40, 6); eye(g, 20, -40, 6); lines(g, [[-10, -18, 0, -10, 10, -18]], 'rgba(110,30,20,.6)', 2.4); },
      halfLen: 70, radius: 60,
      deform: function (x, y, z, ph, out) {
        out[0] = x; out[1] = y; out[2] = z;
        if (y > -10) { var t = (y + 10) / 110; out[0] = x + Math.sin(ph * .9 + y * .05 + x * .03) * 12 * t; out[2] = z + Math.cos(ph * .8 + x * .05) * 10 * t; }
        else { var p = Math.sin(ph * .5) * .04; out[0] = x * (1 + p); out[1] = -46 + (y + 46) * (1 - p); }
      }
    }
  };
  function rot(out, cx, cy, a) { var dx = out[0] - cx, dy = out[1] - cy, c = Math.cos(a), s = Math.sin(a); out[0] = cx + dx * c - dy * s; out[1] = cy + dx * s + dy * c; }

  /* ---------------- texture: base colors, the kid's drawing, then details ---------------- */
  function paintCreature(def, img, S) {
    var B = def.box, cv = document.createElement('canvas'); cv.width = Math.round(B.w * S); cv.height = Math.round(B.h * S);
    var g = cv.getContext('2d');
    function draw() {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(S, 0, 0, S, -B.x * S, -B.y * S);
      if (def.custom) { def.custom(g, img); return; }
      var gr = g.createLinearGradient(0, B.y, 0, B.y + B.h); gr.addColorStop(0, def.base[0]); gr.addColorStop(1, def.base[1]);
      def.parts.forEach(function (p) { g.beginPath(); p(g); g.fillStyle = gr; g.fill(); });
      if (img && (img.naturalWidth || img.width)) {
        g.globalCompositeOperation = 'multiply'; g.drawImage(img, B.x, B.y, B.w, B.h);
        // trim back to the outline: one mask of all parts together
        var mk = document.createElement('canvas'); mk.width = cv.width; mk.height = cv.height;
        var mg = mk.getContext('2d'); mg.setTransform(S, 0, 0, S, -B.x * S, -B.y * S); mg.fillStyle = '#000';
        def.parts.forEach(function (p) { mg.beginPath(); p(mg); mg.fill(); });
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(mk, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.setTransform(S, 0, 0, S, -B.x * S, -B.y * S);
      }
      g.lineWidth = 1.8; g.strokeStyle = 'rgba(20,35,50,.5)'; def.parts.forEach(function (p) { g.beginPath(); p(g); g.stroke(); });
      if (def.details) def.details(g);
    }
    var tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else tex.encoding = THREE.sRGBEncoding;
    var redraw = function () { draw(); tex.needsUpdate = true; };
    if (img && !(img.complete && img.naturalWidth)) img.addEventListener('load', redraw, { once: true });
    redraw();
    return tex;
  }

  /* ---------------- inflated geometry (cached per creature) ---------------- */
  var geoCache = {};
  function geometryFor(name) {
    if (geoCache[name]) return geoCache[name];
    var def = DEFS[name], B = def.box, R = 4;
    // mask of the whole outline (union of parts)
    var mw = Math.ceil(B.w * R) + 2, mh = Math.ceil(B.h * R) + 2, cv = document.createElement('canvas'); cv.width = mw; cv.height = mh;
    var g = cv.getContext('2d'); g.setTransform(R, 0, 0, R, -B.x * R + 1, -B.y * R + 1); g.fillStyle = '#000';
    def.parts.forEach(function (p) { g.beginPath(); p(g); g.fill(); });
    var d = g.getImageData(0, 0, mw, mh).data, m = new Uint8Array(mw * mh), i, j;
    for (i = 0; i < mw * mh; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    var dist = edt(m, mw, mh);
    function inside(x, y) { var px = Math.round((x - B.x) * R + 1), py = Math.round((y - B.y) * R + 1); return px >= 0 && py >= 0 && px < mw && py < mh && m[py * mw + px] === 1; }
    function dAt(x, y) { var px = Math.round((x - B.x) * R + 1), py = Math.round((y - B.y) * R + 1); if (px < 0 || py < 0 || px >= mw || py >= mh) return 0; return dist[py * mw + px] / R; }
    var STEP = Math.max(B.w, B.h) / 150, nx = Math.ceil(B.w / STEP) + 1, ny = Math.ceil(B.h / STEP) + 1;
    var ins = new Uint8Array(nx * ny), idx = new Int32Array(nx * ny).fill(-1), verts = [];
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) ins[j * nx + i] = inside(B.x + i * STEP, B.y + j * STEP) ? 1 : 0;
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var k = j * nx + i, x = B.x + i * STEP, y = B.y + j * STEP;
      if (ins[k]) { idx[k] = verts.length; verts.push([x, y, dAt(x, y)]); continue; }
      var best = null, bd = 1e9;
      for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
        var ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || !ins[jj * nx + ii]) continue;
        var ax = B.x + ii * STEP, ay = B.y + jj * STEP, lo = 0, hi = 1;
        for (var it = 0; it < 10; it++) { var mid = (lo + hi) / 2; if (inside(ax + (x - ax) * mid, ay + (y - ay) * mid)) lo = mid; else hi = mid; }
        var ex = ax + (x - ax) * lo, ey = ay + (y - ay) * lo, dd = (ex - x) * (ex - x) + (ey - y) * (ey - y);
        if (dd < bd) { bd = dd; best = [ex, ey]; }
      }
      if (best) { idx[k] = verts.length; verts.push([best[0], best[1], 0]); }
    }
    function puff(dd) { var t = Math.min(1, dd / def.D); return def.H * Math.sqrt(t * (2 - t)) * (.42 + .58 * t); }
    var n = verts.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), faces = [];
    for (i = 0; i < n; i++) {
      var v = verts[i], z = puff(v[2]), u = (v[0] - B.x) / B.w, vv = 1 - (v[1] - B.y) / B.h;
      pos.set([v[0], -v[1], z], i * 3); pos.set([v[0], -v[1], -z], (n + i) * 3);
      uv.set([u, vv], i * 2); uv.set([u, vv], (n + i) * 2);
    }
    for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
      var a = idx[j * nx + i], b = idx[j * nx + i + 1], c = idx[(j + 1) * nx + i], e = idx[(j + 1) * nx + i + 1];
      if (!(ins[j * nx + i] || ins[j * nx + i + 1] || ins[(j + 1) * nx + i] || ins[(j + 1) * nx + i + 1])) continue;
      if (a >= 0 && b >= 0 && c >= 0) { faces.push(a, c, b); faces.push(n + a, n + b, n + c); }
      if (b >= 0 && e >= 0 && c >= 0) { faces.push(b, c, e); faces.push(n + b, n + e, n + c); }
    }
    geoCache[name] = { pos: pos, uv: uv, index: faces };
    return geoCache[name];
  }
  function edt(m, w, h) {
    var INF = 1e12, out = new Float64Array(w * h), f = new Float64Array(Math.max(w, h)), i;
    for (i = 0; i < w * h; i++) out[i] = m[i] ? INF : 0;
    function pass(get, set, n) {
      var v = new Int32Array(n), z = new Float64Array(n + 1), k = 0, q, s;
      for (q = 0; q < n; q++) f[q] = get(q);
      v[0] = 0; z[0] = -INF; z[1] = INF;
      for (q = 1; q < n; q++) {
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0; for (q = 0; q < n; q++) { while (z[k + 1] < q) k++; set(q, (q - v[k]) * (q - v[k]) + f[v[k]]); }
    }
    var x, y;
    for (x = 0; x < w; x++) pass(function (q) { return out[q * w + x]; }, function (q, val) { out[q * w + x] = val; }, h);
    for (y = 0; y < h; y++) pass(function (q) { return out[y * w + q]; }, function (q, val) { out[y * w + q] = val; }, w);
    for (i = 0; i < w * h; i++) out[i] = Math.sqrt(out[i]);
    return out;
  }

  /* ---------------- a creature in the tank ---------------- */
  function Creature(name, img) {
    var def = DEFS[name], b = geometryFor(name), geo = new THREE.BufferGeometry();
    this.def = def; this.kind = name; this.base = b.pos; this.pos = new Float32Array(b.pos);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(b.uv, 2));
    geo.setIndex(b.index); geo.computeVertexNormals(); this.geo = geo;
    var mat = new THREE.MeshStandardMaterial({ map: paintCreature(def, img, 6), roughness: .55, metalness: 0, side: THREE.DoubleSide });
    if (def.opacity) { mat.transparent = true; mat.opacity = def.opacity; mat.depthWrite = false; }
    if (def.glow) { mat.emissive = new THREE.Color(0xffd8f4); mat.emissiveIntensity = def.glow; }
    this.mesh = new THREE.Mesh(geo, mat); this.group = new THREE.Group(); this.group.add(this.mesh);
    this.phase = Math.random() * 6; this.n = 0; this.tmp = [0, 0, 0];
  }
  Creature.prototype.animate = function (dt, effort) {
    this.phase += dt * (this.def.upright ? 2.2 : 3.2 + effort * 3);
    var p = this.pos, bp = this.base, ph = this.phase, o = this.tmp, df = this.def.deform;
    for (var i = 0; i < p.length; i += 3) { df(bp[i], -bp[i + 1], bp[i + 2], ph, o); p[i] = o[0]; p[i + 1] = -o[1]; p[i + 2] = o[2]; }
    this.geo.attributes.position.needsUpdate = true;
    if ((this.n++ & 3) === 0) this.geo.computeVertexNormals();
  };

  global.Creatures3D = { DEFS: DEFS, Creature: Creature, geometryFor: geometryFor };
})(window);
