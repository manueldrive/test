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
      // Showcase creature: its own sheet (code 100), separate rowing flippers, 3D eyes, outline.
      // The box has the same shape as the sheet's drawing area, so the scan maps straight onto it.
      label: 'Sea turtle', box: { x: -118, y: -61.14, w: 238, h: 122.28 }, H: 27, D: 40, size: 1.05, speed: [34, 44], turn: .35, z: [-260, 0], y: [-110, 90],
      base: ['#d3e9b4', '#f7faea'], code: '100', sheetTitle: 'Color your turtle!', widen: 1.45,
      rig: {
        body: [
          function (g) { g.moveTo(-82, 10); g.bezierCurveTo(-80, -38, -36, -58, 2, -58); g.bezierCurveTo(42, -58, 74, -36, 76, 4); g.quadraticCurveTo(66, 16, 40, 18); g.lineTo(-56, 18); g.quadraticCurveTo(-76, 18, -82, 10); g.closePath(); }, // shell
          function (g) { g.moveTo(52, -26); g.quadraticCurveTo(72, -30, 86, -22); g.lineTo(88, 14); g.quadraticCurveTo(70, 19, 52, 15); g.closePath(); },  // neck
          function (g) { ell(g, 94, -6, 24, 21, -.1); },                                                                                                       // head
          function (g) { g.moveTo(-78, 6); g.quadraticCurveTo(-100, 8, -112, 16); g.quadraticCurveTo(-98, 19, -76, 15); g.closePath(); }                      // tail
        ],
        limbs: [
          { name: 'front', pivot: [38, 14], H: 5, D: 9, z: 9,
            part: function (g) { g.moveTo(28, 10); g.bezierCurveTo(52, 10, 76, 28, 84, 52); g.quadraticCurveTo(86, 58, 78, 57); g.bezierCurveTo(60, 48, 36, 34, 22, 22); g.closePath(); },
            // sea turtles "fly": the front flippers flap up and down while sweeping back
            move: function (ph, side, amp) { return { x: -side * (.6 + amp * .5 * Math.sin(ph)), z: -.15 + amp * .28 * Math.sin(ph + 1.3), y: -side * amp * .12 * Math.sin(ph + .6) }; } },
          { name: 'back', pivot: [-56, 15], H: 4, D: 8, z: 8,
            part: function (g) { g.moveTo(-50, 12); g.bezierCurveTo(-64, 14, -86, 26, -100, 40); g.quadraticCurveTo(-102, 46, -94, 44); g.bezierCurveTo(-80, 36, -64, 26, -48, 22); g.closePath(); },
            move: function (ph, side, amp) { return { x: -side * (.5 + amp * .18 * Math.sin(ph + 2)), z: .1 + amp * .1 * Math.sin(ph + 2.4), y: 0 }; } }
        ],
        eyes: { at: [104, -12], r: 5.8, z: 14 },
        outline: { width: 1.7, color: 0x13294b }
      },
      // shell patchwork (printed on the sheet so kids can color each section)
      pattern: [[-70, -14, 0, -32, 66, -14], [-40, -16, -44, -32, -52, -44], [0, -23, 0, -42, 0, -57], [38, -18, 42, -34, 50, -44],
                [-50, -15, -52, 0, -54, 16], [-10, -22, -10, -2, -10, 17], [28, -19, 30, 0, 32, 17], [-76, 9, 0, 6, 70, 9]],
      details: function (g, hasDrawing) {
        // the patchwork is printed on the sheet; draw it lightly only when there's no scan yet
        if (!hasDrawing) lines(g, DEFS.turtle.pattern, 'rgba(40,70,25,.35)', 2);
        lines(g, [[106, 4, 112, 9, 118, 3]], 'rgba(40,30,20,.75)', 2);          // smile
        g.fillStyle = 'rgba(255,140,140,.35)'; g.beginPath(); g.ellipse(100, 2, 4.5, 3, 0, 0, 7); g.fill();  // cheek
      },
      shade: true,
      halfLen: 98, radius: 54,
      // body: a gentle head bob; the flippers move on their own joints
      deform: function (x, y, z, ph, out) { var w = Math.max(0, Math.min(1, (x - 58) / 22)); out[0] = x; out[1] = y + Math.sin(ph * .7) * 2.6 * w; out[2] = z; }
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
  function allParts(def) { return def.rig ? def.rig.body.concat(def.rig.limbs.map(function (l) { return l.part; })) : def.parts; }
  function rot(out, cx, cy, a) { var dx = out[0] - cx, dy = out[1] - cy, c = Math.cos(a), s = Math.sin(a); out[0] = cx + dx * c - dy * s; out[1] = cy + dx * s + dy * c; }

  /* ---------------- texture: base colors, the kid's drawing, then details ---------------- */
  function paintCreature(def, img, S) {
    var B = def.box, cv = document.createElement('canvas'), parts = allParts(def); cv.width = Math.round(B.w * S); cv.height = Math.round(B.h * S);
    var g = cv.getContext('2d');
    function draw() {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(S, 0, 0, S, -B.x * S, -B.y * S);
      if (def.custom) { def.custom(g, img); return; }
      var gr = g.createLinearGradient(0, B.y, 0, B.y + B.h); gr.addColorStop(0, def.base[0]); gr.addColorStop(1, def.base[1]);
      parts.forEach(function (p) { g.beginPath(); p(g); g.fillStyle = gr; g.fill(); });
      if (img && (img.naturalWidth || img.width)) {
        g.globalCompositeOperation = 'multiply'; g.drawImage(img, B.x, B.y, B.w, B.h);
        // trim back to the outline: one mask of all parts together
        var mk = document.createElement('canvas'); mk.width = cv.width; mk.height = cv.height;
        var mg = mk.getContext('2d'); mg.setTransform(S, 0, 0, S, -B.x * S, -B.y * S); mg.fillStyle = '#000';
        parts.forEach(function (p) { mg.beginPath(); p(mg); mg.fill(); });
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(mk, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.setTransform(S, 0, 0, S, -B.x * S, -B.y * S);
      }
      var hasDrawing = !!(img && (img.naturalWidth || img.width));
      if (def.shade) {   // darker back, lighter belly, so the shape reads as round
        var sh = g.createLinearGradient(0, B.y, 0, B.y + B.h);
        sh.addColorStop(0, 'rgba(10,45,40,.24)'); sh.addColorStop(.42, 'rgba(10,45,40,0)'); sh.addColorStop(.62, 'rgba(255,255,240,0)'); sh.addColorStop(1, 'rgba(255,255,240,.22)');
        g.save(); g.beginPath(); parts.forEach(function (p) { p(g); }); g.clip(); g.fillStyle = sh; g.fillRect(B.x, B.y, B.w, B.h); g.restore();
      }
      g.lineWidth = 1.8; g.strokeStyle = 'rgba(20,35,50,.5)'; parts.forEach(function (p) { g.beginPath(); p(g); g.stroke(); });
      if (def.details) def.details(g, hasDrawing);
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
    var def = DEFS[name];
    return def.rig ? inflate(name + ':body', def.box, def.rig.body, def.H, def.D) : inflate(name, def.box, def.parts, def.H, def.D);
  }
  function inflate(key, B, parts, HH, DD) {
    if (geoCache[key]) return geoCache[key];
    var R = 4;
    // mask of the whole outline (union of parts)
    var mw = Math.ceil(B.w * R) + 2, mh = Math.ceil(B.h * R) + 2, cv = document.createElement('canvas'); cv.width = mw; cv.height = mh;
    var g = cv.getContext('2d'); g.setTransform(R, 0, 0, R, -B.x * R + 1, -B.y * R + 1); g.fillStyle = '#000';
    parts.forEach(function (p) { g.beginPath(); p(g); g.fill(); });
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
    function puff(dd) { var t = Math.min(1, dd / DD); return HH * Math.sqrt(t * (2 - t)) * (.42 + .58 * t); }
    var n = verts.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), faces = [];
    // 1) heights, then smooth them over the grid: the raw distance field has creases along the middle
    //    of each shape, which made bodies look faceted. The rim stays at zero.
    var h = new Float64Array(n), rim = new Uint8Array(n), nb = [];
    for (i = 0; i < n; i++) { h[i] = puff(verts[i][2]); nb.push([]); }
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var me = idx[j * nx + i]; if (me < 0) continue;
      if (!ins[j * nx + i]) rim[me] = 1;
      [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(function (o) {
        var ii = i + o[0], jj = j + o[1]; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) return;
        var q = idx[jj * nx + ii]; if (q >= 0) nb[me].push(q);
      });
    }
    var h2 = new Float64Array(n);
    for (var pass = 0; pass < 14; pass++) {
      for (i = 0; i < n; i++) { if (rim[i] || !nb[i].length) { h2[i] = h[i]; continue; } var sum = 0; for (var q2 = 0; q2 < nb[i].length; q2++) sum += h[nb[i][q2]]; h2[i] = .5 * h[i] + .5 * sum / nb[i].length; }
      var tmp = h; h = h2; h2 = tmp;
    }
    // 2) texture coordinates: near the rim, read the drawing a little way inside the outline, so the
    //    printed outline on the sheet doesn't wrap onto the creature's back as a dark seam
    var INSET = 3.2, gs = .9;
    for (i = 0; i < n; i++) {
      var v = verts[i], sx = v[0], sy = v[1], dd0 = v[2];
      if (dd0 < INSET) {
        var gx = dAt(sx + gs, sy) - dAt(sx - gs, sy), gy = dAt(sx, sy + gs) - dAt(sx, sy - gs), gl = Math.hypot(gx, gy);
        if (gl > 1e-6) { sx += gx / gl * (INSET - dd0); sy += gy / gl * (INSET - dd0); }
      }
      var z = h[i], u = (sx - B.x) / B.w, vv = 1 - (sy - B.y) / B.h;
      pos.set([v[0], -v[1], z], i * 3); pos.set([v[0], -v[1], -z], (n + i) * 3);
      uv.set([u, vv], i * 2); uv.set([u, vv], (n + i) * 2);
    }
    for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
      var a = idx[j * nx + i], b = idx[j * nx + i + 1], c = idx[(j + 1) * nx + i], e = idx[(j + 1) * nx + i + 1];
      if (!(ins[j * nx + i] || ins[j * nx + i + 1] || ins[(j + 1) * nx + i] || ins[(j + 1) * nx + i + 1])) continue;
      if (a >= 0 && b >= 0 && c >= 0) { faces.push(a, c, b); faces.push(n + a, n + b, n + c); }
      if (b >= 0 && e >= 0 && c >= 0) { faces.push(b, c, e); faces.push(n + b, n + e, n + c); }
    }
    geoCache[key] = { pos: pos, uv: uv, index: faces };
    return geoCache[key];
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
  // soft dark outline: the same mesh drawn again from the inside, pushed out along its normals
  function outlineMaterial(width, color) {
    return new THREE.ShaderMaterial({
      uniforms: { w: { value: width }, c: { value: new THREE.Color(color) } },
      vertexShader: 'uniform float w; void main(){ vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }',
      side: THREE.BackSide
    });
  }
  function meshFrom(b, mat, outline) {
    var geo = new THREE.BufferGeometry(), pos = new Float32Array(b.pos);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(b.uv, 2));
    geo.setIndex(b.index); geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat), grp = new THREE.Group(); grp.add(m);
    if (outline) grp.add(new THREE.Mesh(geo, outline));
    return { geo: geo, pos: pos, base: b.pos, mesh: m, group: grp };
  }
  function makeEye(r) {
    var eye = new THREE.Group();
    var white = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35 }));
    var pupil = new THREE.Mesh(new THREE.SphereGeometry(r * .62, 18, 12), new THREE.MeshStandardMaterial({ color: 0x0b1a24, roughness: .2 }));
    var shine = new THREE.Mesh(new THREE.SphereGeometry(r * .2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eye.add(white); eye.add(pupil); eye.add(shine);
    return { group: eye, pupil: pupil, shine: shine, r: r };
  }

  function Creature(name, img) {
    var def = DEFS[name];
    this.def = def; this.kind = name; this.phase = Math.random() * 6; this.n = 0; this.tmp = [0, 0, 0];
    var mat = new THREE.MeshStandardMaterial({ map: paintCreature(def, img, 6), roughness: .55, metalness: 0, side: THREE.DoubleSide });
    if (def.opacity) { mat.transparent = true; mat.opacity = def.opacity; mat.depthWrite = false; }
    if (def.glow) { mat.emissive = new THREE.Color(0xffd8f4); mat.emissiveIntensity = def.glow; }
    var rig = def.rig, outline = rig && rig.outline ? outlineMaterial(rig.outline.width, rig.outline.color) : null;
    this.group = new THREE.Group();
    var body = meshFrom(geometryFor(name), mat, outline);
    this.body = body; this.geo = body.geo; this.pos = body.pos; this.base = body.base; this.mesh = body.mesh;
    var wz = def.widen || 1; body.group.scale.z = wz;   // sea turtles are wide and flat
    this.group.add(body.group);
    this.limbs = [];
    if (rig) {
      var self = this;
      rig.limbs.forEach(function (L) {
        var b = inflate(name + ':' + L.name, def.box, [L.part], L.H, L.D);
        [1, -1].forEach(function (side) {            // near side and far side
          var m = meshFrom(b, mat, outline), joint = new THREE.Group();
          m.group.position.set(-L.pivot[0], L.pivot[1], 0);      // rotate around the shoulder / hip
          joint.position.set(L.pivot[0], -L.pivot[1], side * L.z * wz);
          joint.add(m.group); self.group.add(joint);
          self.limbs.push({ def: L, side: side, joint: joint });
        });
      });
      if (rig.eyes) {
        this.eyes = [1, -1].map(function (side) {
          var e = makeEye(rig.eyes.r); e.side = side;
          e.group.position.set(rig.eyes.at[0], -rig.eyes.at[1], side * rig.eyes.z * wz);
          self.group.add(e.group); return e;
        });
        this.blinkT = 1 + Math.random() * 3; this.lookT = 0; this.look = [0, 0];
      }
      this.glideT = 4 + Math.random() * 6; this.amp = 1;
    }
  }
  Creature.prototype.animate = function (dt, effort) {
    var rig = this.def.rig;
    this.phase += dt * (this.def.upright ? 2.2 : rig ? 2.4 : 3.2 + effort * 3);
    var p = this.pos, bp = this.base, ph = this.phase, o = this.tmp, df = this.def.deform;
    for (var i = 0; i < p.length; i += 3) { df(bp[i], -bp[i + 1], bp[i + 2], ph, o); p[i] = o[0]; p[i + 1] = -o[1]; p[i + 2] = o[2]; }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    if (!rig) return;
    // every so often, stop rowing and glide with flippers swept back, then start again
    this.glideT -= dt;
    if (this.glideT < 0) { this.gliding = !this.gliding; this.glideT = this.gliding ? 1.8 + Math.random() * 1.5 : 5 + Math.random() * 7; }
    this.amp += ((this.gliding ? .12 : 1) - this.amp) * Math.min(1, dt * 1.6);
    var amp = this.amp, sweep = (1 - amp) * .55;
    this.limbs.forEach(function (l) {
      var r = l.def.move(ph, l.side, amp);
      l.joint.rotation.set(r.x, r.y, r.z - (l.def.name === 'front' ? sweep : sweep * .4), 'XYZ');
    });
    if (this.eyes) {
      var bob = Math.sin(ph * .7) * 2.6, self = this;
      this.blinkT -= dt; var closed = this.blinkT < .12; if (this.blinkT < 0) this.blinkT = 2.2 + Math.random() * 4;
      this.lookT -= dt; if (this.lookT < 0) { this.look = [Math.random() * .7 - .1, Math.random() * .6 - .3]; this.lookT = 1 + Math.random() * 2.5; }
      this.eyes.forEach(function (e) {
        e.group.position.y = -rig.eyes.at[1] + bob;
        e.group.scale.y = closed ? .12 : 1;
        var r = e.r, fx = .45 + self.look[0] * .35, fy = self.look[1] * .45;
        e.pupil.position.set(r * fx, r * fy, e.side * r * .48);
        e.shine.position.set(r * (fx + .18), r * (fy + .3), e.side * r * .98);
      });
    }
  };

  global.Creatures3D = { DEFS: DEFS, Creature: Creature, geometryFor: geometryFor, inflate: inflate, allParts: allParts };
})(window);
