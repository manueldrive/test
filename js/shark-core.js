/* Draw Jamboree — shared core
   Shark drawing, coloring-sheet geometry, and sheet scanning (corner markers -> shark skin). */
(function (global) {
  'use strict';

  // Shark local box that a skin covers, and the skin texture size (same aspect).
  var BOX = { x: -112, y: -64, w: 218, h: 112 };
  var TEX_W = 440, TEX_H = 226;

  // Coloring sheet, US Letter landscape, in units of 0.01 inch.
  var SHEET = {
    w: 1100, h: 850,
    marker: 100, hole: 34,
    // centers of the 4 corner markers: TL, TR, BR, BL
    centers: [[85, 85], [1015, 85], [1015, 765], [85, 765]],
    // the area that becomes the shark skin (same aspect as BOX)
    region: { x: 150, y: 228, w: 800, h: 800 * BOX.h / BOX.w },
    title: { x: 200, y: 92, w: 700, h: 86 },     // bold title band (orientation check)
    footer: { x: 200, y: 700, w: 700, h: 60 }    // quiet footer band
  };

  /* ---------- Shark outline ---------- */
  function sharkPath(c, s) {
    s = s || 0;
    c.beginPath();
    c.moveTo(104, 2);
    c.bezierCurveTo(100, -14, 70, -26, 30, -28);
    c.bezierCurveTo(0, -29, -40, -22, -68, -9 + s * .4);
    c.quadraticCurveTo(-85, -25 + s * .8, -110, -52 + s);
    c.quadraticCurveTo(-100, -20 + s, -90, -2 + s * .9);
    c.quadraticCurveTo(-98, 14 + s, -104, 32 + s);
    c.quadraticCurveTo(-84, 18 + s * .8, -68, 8 + s * .4);
    c.bezierCurveTo(-35, 22, 10, 27, 50, 22);
    c.bezierCurveTo(80, 18, 100, 12, 104, 2);
    c.closePath();
    c.moveTo(22, -27); c.quadraticCurveTo(8, -45, -4, -62); c.quadraticCurveTo(-6, -40, -18, -25); c.closePath();
    c.moveTo(22, 20); c.quadraticCurveTo(26, 30, 10, 46); c.quadraticCurveTo(28, 32, 40, 18); c.closePath();
    c.moveTo(-48, -15); c.lineTo(-56, -25); c.lineTo(-58, -12); c.closePath();
  }

  // SVG path data for the outline, mapped into sheet coordinates (used by the printable sheet).
  function sheetOutlinePath() {
    var R = SHEET.region, k = R.w / BOX.w, d = [];
    function P(x, y) { return ((x - BOX.x) * k + R.x).toFixed(1) + ' ' + ((y - BOX.y) * k + R.y).toFixed(1); }
    sharkPath({
      beginPath: function () {},
      moveTo: function (x, y) { d.push('M' + P(x, y)); },
      lineTo: function (x, y) { d.push('L' + P(x, y)); },
      quadraticCurveTo: function (a, b, x, y) { d.push('Q' + P(a, b) + ' ' + P(x, y)); },
      bezierCurveTo: function (a, b, e, f, x, y) { d.push('C' + P(a, b) + ' ' + P(e, f) + ' ' + P(x, y)); },
      closePath: function () { d.push('Z'); }
    }, 0);
    return d.join(' ');
  }

  function drawShark(c, tex, sway, opts) {
    opts = opts || {};
    var g = c.createLinearGradient(0, -60, 0, 40);
    g.addColorStop(0, '#86a9bd'); g.addColorStop(.55, '#b9d0dc'); g.addColorStop(.75, '#f3f7f6'); g.addColorStop(1, '#ffffff');
    c.save();
    sharkPath(c, sway);
    c.fillStyle = g; c.fill();
    c.clip();
    if (tex && (tex.naturalWidth || tex.width)) {
      c.globalCompositeOperation = 'multiply';
      c.drawImage(tex, BOX.x, BOX.y, BOX.w, BOX.h);
      c.globalCompositeOperation = 'source-over';
    }
    var sh = c.createLinearGradient(0, -62, 0, 46);
    sh.addColorStop(0, 'rgba(5,30,50,.28)'); sh.addColorStop(.45, 'rgba(5,30,50,0)'); sh.addColorStop(1, 'rgba(5,30,50,.12)');
    c.fillStyle = sh; c.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
    c.restore();
    sharkPath(c, sway);
    c.lineWidth = 2; c.strokeStyle = 'rgba(10,35,55,.55)'; c.stroke();
    c.strokeStyle = 'rgba(10,35,55,.5)'; c.lineWidth = 1.6; c.lineCap = 'round';
    for (var i = 0; i < 3; i++) { c.beginPath(); c.moveTo(56 - i * 6, -12); c.quadraticCurveTo(52 - i * 6, -3, 56 - i * 6, 7); c.stroke(); }
    c.beginPath(); c.moveTo(96, 9); c.quadraticCurveTo(84, 16, 72, 13); c.stroke();
    c.fillStyle = '#0b1a24'; c.beginPath(); c.ellipse(78, -7, 4.2, 4.6, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(79.5, -8.6, 1.4, 0, 7); c.fill();
  }

  /* ---------- 3D-feeling shark ----------
     The flat shark is drawn once into a cached skin, then redrawn each frame as thin
     vertical strips. Each strip is placed with a simple perspective rotation around the
     shark's vertical axis, so a turn swings the head toward or away from the viewer.
     A traveling wave runs down the strips for swimming, shading follows the turn,
     and near edge-on a head-on view (in the kid's colors) fades in. */
  function Shark3D(img, opts) {
    opts = opts || {};
    this.img = img; this.S = opts.scale || 2.4; this.skin = null; this.frame = null;
    this.avg = [150, 175, 190]; this.side = Math.random() < .5 ? -1 : 1;
    var self = this;
    if (img && img.complete && img.naturalWidth) this.build();
    else if (img) img.addEventListener('load', function () { self.build(); }, { once: true });
  }
  Shark3D.prototype.build = function () {
    var S = this.S, sk = document.createElement('canvas');
    sk.width = Math.ceil(BOX.w * S) + 4; sk.height = Math.ceil(BOX.h * S) + 4;
    var g = sk.getContext('2d'); g.setTransform(S, 0, 0, S, -BOX.x * S + 2, -BOX.y * S + 2);
    drawShark(g, this.img, 0);
    this.skin = sk;
    // average color of the kid's drawing for the head-on view
    var t = document.createElement('canvas'); t.width = 16; t.height = 8;
    var tg = t.getContext('2d'); tg.drawImage(this.img, 0, 0, 16, 8);
    var d = tg.getImageData(0, 0, 16, 8).data, r = 0, gg = 0, b = 0, n = 0;
    for (var i = 0; i < d.length; i += 4) { var L = d[i] + d[i + 1] + d[i + 2]; if (L < 735 && L > 150) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } }
    if (n) this.avg = [r / n * .85 + 150 * .15, gg / n * .85 + 175 * .15, b / n * .85 + 190 * .15];
    var f = document.createElement('canvas');
    f.width = Math.ceil(BOX.w * 1.4 * S); f.height = Math.ceil(BOX.h * 1.7 * S);
    this.frame = f; this.fg = f.getContext('2d');
  };
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // turn: -1 (facing left) .. 1 (facing right); phase: swim cycle; tint: 0..1 distance haze
  Shark3D.prototype.draw = function (ctx, turn, phase, tint, wob) {
    if (!this.skin) { ctx.save(); ctx.scale(turn < 0 ? -1 : 1, 1); drawShark(ctx, this.img, Math.sin(phase) * 8); ctx.restore(); return; }
    var S = this.S, f = this.frame, fg = this.fg, FW = f.width, FH = f.height, skin = this.skin;
    var th = Math.acos(Math.max(-1, Math.min(1, turn))) * this.side + (wob || 0);
    var cs = Math.cos(th), sn = Math.sin(th), c = Math.max(.035, Math.abs(cs)), mirror = cs < 0;
    var front = smooth(.34, .07, Math.abs(cs));
    var F = 430, N = 32, skH = skin.height, colW = (skin.width - 4) / N;
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, FW, FH);
    fg.setTransform(S, 0, 0, S, FW / 2, FH / 2);
    fg.globalCompositeOperation = 'source-over';
    fg.globalAlpha = 1 - front * .92;
    var hx = 0, tx = 0;
    for (var i = 0; i < N; i++) {
      var u0 = i / N, u1 = (i + 1) / N, um = (u0 + u1) / 2;
      var x0 = BOX.x + u0 * BOX.w, x1 = BOX.x + u1 * BOX.w;
      var p0 = F / (F - x0 * sn), p1 = F / (F - x1 * sn), pm = (p0 + p1) / 2;
      var X0 = x0 * c * p0, X1 = x1 * c * p1;
      if (i === 0) tx = X0; if (i === N - 1) hx = X1;
      var tailness = Math.pow(1 - um, 2.2);
      var wave = Math.sin(phase - um * 4.6) * 7.5 * tailness + Math.sin(phase - 1.2) * .8;
      fg.drawImage(skin, 2 + u0 * (skin.width - 4), 0, colW + .8, skH,
        X0 - .15, (BOX.y - 2 / S) * pm + wave * pm, (X1 - X0) + .45, (BOX.h + 4 / S) * pm);
    }
    // shading: the side swinging away gets darker, plus haze for far-away sharks
    fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-atop';
    var dark = (1 - Math.abs(cs)) * .5;
    if (dark > .01) {
      var gr = fg.createLinearGradient(tx, 0, hx, 0), near = sn > 0;
      gr.addColorStop(0, 'rgba(3,22,36,' + (dark * (near ? 1 : .25)) + ')');
      gr.addColorStop(1, 'rgba(3,22,36,' + (dark * (near ? .25 : 1)) + ')');
      fg.fillStyle = gr; fg.fillRect(-FW, -FH, FW * 2, FH * 2);
    }
    if (tint > .01) { fg.fillStyle = 'rgba(12,84,112,' + tint + ')'; fg.fillRect(-FW, -FH, FW * 2, FH * 2); }
    fg.globalCompositeOperation = 'source-over';
    if (front > .01) { fg.globalAlpha = front; this.drawFront(fg, phase, tint); fg.globalAlpha = 1; }
    ctx.save(); if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(f, -FW / 2 / S, -FH / 2 / S, FW / S, FH / S);
    ctx.restore();
  };
  // the shark seen nose-on: oval body, dorsal fin up, pectoral fins out, tail peeking behind
  Shark3D.prototype.drawFront = function (g, phase, tint) {
    var a = this.avg, col = function (k, al) { return 'rgba(' + Math.round(a[0] * k) + ',' + Math.round(a[1] * k) + ',' + Math.round(a[2] * k) + ',' + (al == null ? 1 : al) + ')'; };
    var sw = Math.sin(phase) * 9, edge = 'rgba(10,35,55,.5)';
    g.save(); g.scale(1.45, 1.45); g.lineWidth = 1.3; g.strokeStyle = edge;
    // tail fin far behind (small, sweeping)
    g.fillStyle = col(.72); g.beginPath(); g.moveTo(sw * .5, -6); g.quadraticCurveTo(sw * .8 - 3, -30, sw - 2, -44); g.quadraticCurveTo(sw * .8 + 4, -24, sw * .5 + 3, -4);
    g.quadraticCurveTo(sw * .8 + 3, 12, sw + 1, 26); g.quadraticCurveTo(sw * .7 - 3, 12, sw * .5, -6); g.fill(); g.stroke();
    // pectoral fins
    g.fillStyle = col(.8);
    g.beginPath(); g.moveTo(-14, 8); g.quadraticCurveTo(-34, 20, -46, 34); g.quadraticCurveTo(-28, 26, -10, 18); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(14, 8); g.quadraticCurveTo(34, 20, 46, 34); g.quadraticCurveTo(28, 26, 10, 18); g.closePath(); g.fill(); g.stroke();
    // dorsal fin
    g.fillStyle = col(.78); g.beginPath(); g.moveTo(-6, -22); g.quadraticCurveTo(-2, -42, 1, -58); g.quadraticCurveTo(4, -40, 6, -22); g.closePath(); g.fill(); g.stroke();
    // body
    // body painted with the kid's actual drawing (the head end of it)
    g.save(); g.beginPath(); g.ellipse(0, -1, 19, 27, 0, 0, 7); g.clip();
    g.fillStyle = '#c4d6df'; g.fillRect(-20, -29, 40, 56);
    var im = this.img, iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (iw) { g.globalCompositeOperation = 'multiply'; g.drawImage(im, iw * .6, ih * .3, iw * .26, ih * .5, -20, -29, 40, 56); g.globalCompositeOperation = 'source-over'; }
    var bg = g.createRadialGradient(-6, -10, 3, 0, -1, 30);
    bg.addColorStop(0, 'rgba(255,255,255,.22)'); bg.addColorStop(.6, 'rgba(3,22,36,0)'); bg.addColorStop(1, 'rgba(3,22,36,.45)');
    g.fillStyle = bg; g.fillRect(-20, -29, 40, 56);
    g.restore();
    g.beginPath(); g.ellipse(0, -1, 19, 27, 0, 0, 7); g.stroke();
    // white belly
    g.fillStyle = 'rgba(245,250,250,.85)'; g.beginPath(); g.ellipse(0, 12, 12, 12, 0, 0, Math.PI); g.fill();
    // eyes, mouth
    g.fillStyle = '#0b1a24'; g.beginPath(); g.ellipse(-13, -7, 3.2, 3.8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(13, -7, 3.2, 3.8, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-12.2, -8.4, 1.1, 0, 7); g.fill(); g.beginPath(); g.arc(13.8, -8.4, 1.1, 0, 7); g.fill();
    g.strokeStyle = 'rgba(10,35,55,.6)'; g.beginPath(); g.moveTo(-8, 9); g.quadraticCurveTo(0, 13, 8, 9); g.stroke();
    if (tint > .01) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,84,112,' + tint + ')'; g.fillRect(-60, -70, 120, 130); g.globalCompositeOperation = 'source-over'; }
    g.restore();
  };

  /* ---------- Water scene ----------
     Layered silhouettes for depth: a bright surface fading to deep blue, light rays, then
     reef ridges that get darker and closer layer by layer, each with its own coral and kelp.
     Faint fish schools and distant sharks drift between layers. Static layers are painted
     once per screen size; the returned function draws everything behind the kids' sharks,
     and scene.front() draws the dark foreground reef that sits in front of them. */
  var SEA = {
    sky: ['#9be3f2', '#4fb8dc', '#1f7fb5', '#0d4b7c', '#072f55'],
    layers: [ // far -> near: [base height, bump size, color, scale]
      [.56, .07, '#5db8dc', .45], [.64, .08, '#3f9dcb', .6], [.72, .08, '#2a7fb6', .78],
      [.81, .07, '#1a6299', .95], [.93, .06, '#0b3a64', 1.2]
    ],
    schools: ['#7fcbe6', '#5aaed6', '#3f8fc1']
  };
  function seeded(s) { return function () { s = Math.imul(s ^ s >>> 15, s | 1) ^ (s + Math.imul(s ^ s >>> 7, s | 61)); return ((s ^ s >>> 14) >>> 0) / 4294967296; }; }
  function ridgeY(L, x, W, H, r) { return H * (L.base + L.amp * (Math.sin(x / W * 6.3 * r.f1 + r.p1) * .5 + Math.sin(x / W * 6.3 * r.f2 + r.p2) * .32 + Math.sin(x / W * 6.3 * r.f3 + r.p3) * .18)); }

  function kelp(g, x, y, h, k, sway) {
    var seg = 9, px = x, py = y;
    g.lineCap = 'round';
    for (var i = 1; i <= seg; i++) {
      var t = i / seg, nx = x + Math.sin(t * 3 + sway) * h * .06 * t, ny = y - h * t;
      g.lineWidth = Math.max(1, 5 * k * (1 - t * .6));
      g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      if (i > 1 && i < seg) {
        var d = i % 2 ? 1 : -1, lw = 13 * k * (1 - t * .5);
        g.beginPath(); g.ellipse(nx + d * lw * .55, ny + 2 * k, lw * .6, lw * .22, d * -.6, 0, 7); g.fill();
      }
      px = nx; py = ny;
    }
  }
  function branch(g, x, y, len, ang, w, depth, r) {
    var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (r() - .5) * len * .3, (y + y2) / 2, x2, y2); g.stroke();
    if (depth <= 0) return;
    var n = 2 + (r() < .35 ? 1 : 0);
    for (var i = 0; i < n; i++) branch(g, x2, y2, len * (.6 + r() * .2), ang + (i - (n - 1) / 2) * (.5 + r() * .3), w * .7, depth - 1, r);
  }
  function fan(g, x, y, s, r) {
    for (var i = 0; i < 11; i++) branch(g, x, y, s * (.55 + r() * .3), -Math.PI / 2 + (i - 5) * .16, 1.6 * s / 40, 2, r);
  }
  function tuft(g, x, y, s, r) {
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + (i - 2.5) * .22, h = s * (.6 + r() * .5);
      g.lineWidth = Math.max(1, s / 12);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * h * .3, y - h * .6, x + Math.cos(a) * h * .7, y + Math.sin(a) * h); g.stroke();
    }
  }
  function rock(g, x, y, s, r) {
    g.beginPath(); g.moveTo(x - s, y + 4);
    g.quadraticCurveTo(x - s * .9, y - s * (.5 + r() * .4), x - s * .2, y - s * (.7 + r() * .3));
    g.quadraticCurveTo(x + s * .5, y - s * (.8 + r() * .3), x + s, y + 4); g.closePath(); g.fill();
  }
  function paintLayer(g, L, W, H, r, live) {
    var rr = { f1: 1 + r() * 1.5, f2: 2.5 + r() * 2, f3: 5 + r() * 3, p1: r() * 6, p2: r() * 6, p3: r() * 6 };
    var Lo = { base: L[0], amp: L[1] }, k = L[3] * Math.min(1.6, Math.max(.6, H / 700));
    g.fillStyle = L[2]; g.strokeStyle = L[2];
    // coral and rocks sit on the ridge
    var n = Math.round(W / (120 * k) + 4);
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = ridgeY(Lo, x, W, H, rr) + 6 * k, kind = r();
      if (kind < .3) rock(g, x, y, (26 + r() * 40) * k, r);
      else if (kind < .55) branch(g, x, y, (26 + r() * 22) * k, -Math.PI / 2 + (r() - .5) * .5, 5 * k, 4, r);
      else if (kind < .7) fan(g, x, y, (50 + r() * 30) * k, r);
      else if (kind < .85) tuft(g, x, y, (30 + r() * 30) * k, r);
      else if (!live) kelp(g, x, y, (90 + r() * 120) * k, k, r() * 6);
    }
    g.beginPath(); g.moveTo(0, H);
    for (var X = 0; X <= W + 8; X += 8) g.lineTo(X, ridgeY(Lo, X, W, H, rr));
    g.lineTo(W, H); g.closePath(); g.fill();
    return rr;
  }
  function fishShape(g, x, y, s, d) {
    g.beginPath(); g.ellipse(x, y, s, s * .45, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x - d * s * .8, y); g.lineTo(x - d * s * 1.6, y - s * .5); g.lineTo(x - d * s * 1.6, y + s * .5); g.closePath(); g.fill();
  }

  function makeScene() {
    var cache = null, r = seeded(20261108);
    var schools = [], ghosts = [], snow = [], kelps = [];
    for (var i = 0; i < 4; i++) {
      var f = []; for (var j = 0; j < 18 + (i % 2) * 14; j++) f.push([(r() - .5) * 2, (r() - .5) * 2, .6 + r() * .6, r() * 6]);
      schools.push({ x: r(), y: .14 + r() * .4, d: r() < .5 ? -1 : 1, v: .004 + r() * .006, layer: i % 3, size: .6 + (i % 3) * .3, fish: f });
    }
    ghosts.push({ x: .2, y: .3, s: .9, v: .006, d: 1, a: .38 }, { x: .75, y: .45, s: .55, v: .004, d: -1, a: .28 });
    for (i = 0; i < 70; i++) snow.push([r(), r(), .5 + r() * 1.4, r() * 6]);
    for (i = 0; i < 5; i++) kelps.push([.05 + i / 5 + r() * .1, .16 + r() * .14, r() * 6]);

    function build(W, H) {
      var res = Math.min(1.25, (global.devicePixelRatio || 1));
      function cv() { var c = document.createElement('canvas'); c.width = Math.ceil(W * res); c.height = Math.ceil(H * res); var g = c.getContext('2d'); g.scale(res, res); return [c, g]; }
      var lr = seeded(7331), far = cv(), near = cv(), front = cv();
      paintLayer(far[1], SEA.layers[0], W, H, lr); paintLayer(far[1], SEA.layers[1], W, H, lr);
      paintLayer(near[1], SEA.layers[2], W, H, lr); paintLayer(near[1], SEA.layers[3], W, H, lr);
      var frr = paintLayer(front[1], SEA.layers[4], W, H, lr, true);
      cache = { W: W, H: H, far: far[0], near: near[0], front: front[0], frr: frr };
    }
    function drawSchools(ctx, W, H, t, layer) {
      schools.forEach(function (s) {
        if (s.layer !== layer) return;
        var cx = ((s.x + t * s.v * s.d) % 1.4 + 1.4) % 1.4 * W - W * .2, cy = H * s.y + Math.sin(t * .3 + s.x * 9) * H * .02;
        var sz = (3 + layer * 2.2) * Math.max(.7, H / 800) * s.size, spread = sz * 9;
        ctx.fillStyle = SEA.schools[layer];
        s.fish.forEach(function (f) {
          fishShape(ctx, cx + f[0] * spread * 1.6 + Math.sin(t * 1.3 + f[3]) * sz * .6, cy + f[1] * spread * .6 + Math.cos(t * 1.1 + f[3]) * sz * .5, sz * f[2], s.d);
        });
      });
    }
    function scene(ctx, W, H, t) {
      if (!cache || cache.W !== W || cache.H !== H) build(W, H);
      var g = ctx.createLinearGradient(0, 0, 0, H), k;
      for (k = 0; k < SEA.sky.length; k++) g.addColorStop(k / (SEA.sky.length - 1), SEA.sky[k]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // light rays fanning down from the surface
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 7; i++) {
        var x = W * (.1 + i * .14) + Math.sin(t * .12 + i * 1.7) * W * .03, w = W * (.03 + (i % 3) * .018);
        var a = .07 + .035 * Math.sin(t * .35 + i * 2.1);
        var rg = ctx.createLinearGradient(0, 0, 0, H * .8);
        rg.addColorStop(0, 'rgba(225,250,255,' + a + ')'); rg.addColorStop(1, 'rgba(225,250,255,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x - w * .4, 0); ctx.lineTo(x + w * .4, 0);
        ctx.lineTo(x + w * 1.8 - W * .06, H * .8); ctx.lineTo(x - w * 1.8 - W * .06, H * .8); ctx.fill();
      }
      ctx.restore();
      // far: faint fish school, big distant shark shapes
      drawSchools(ctx, W, H, t, 0);
      ghosts.forEach(function (gh) {
        var x = ((gh.x + t * gh.v * gh.d) % 1.6 + 1.6) % 1.6 * W - W * .3, s = gh.s * Math.min(W / 900, H / 560);
        ctx.save(); ctx.globalAlpha = gh.a; ctx.fillStyle = '#5fb3d8';
        ctx.translate(x, H * gh.y + Math.sin(t * .2 + gh.x * 5) * H * .02); ctx.scale(gh.d * s, s);
        sharkPath(ctx, Math.sin(t * 1.2 + gh.x) * 5); ctx.fill(); ctx.restore();
      });
      ctx.drawImage(cache.far, 0, 0, W, H);
      drawSchools(ctx, W, H, t, 1);
      ctx.drawImage(cache.near, 0, 0, W, H);
      drawSchools(ctx, W, H, t, 2);
    }
    // foreground reef in front of the kids' sharks: swaying kelp, the darkest ridge, drifting specks
    scene.front = function (ctx, W, H, t) {
      if (!cache || cache.W !== W || cache.H !== H) build(W, H);
      var L = SEA.layers[4], k = L[3] * Math.min(1.6, Math.max(.6, H / 700));
      ctx.fillStyle = L[2]; ctx.strokeStyle = L[2];
      kelps.forEach(function (kp) {
        var x = kp[0] * W, y = ridgeY({ base: L[0], amp: L[1] }, x, W, H, cache.frr) + 8;
        kelp(ctx, x, y, H * kp[1] * 1.05, k * 1.25, kp[2] + Math.sin(t * .7 + kp[2]) * .9);
      });
      ctx.drawImage(cache.front, 0, 0, W, H);
      ctx.fillStyle = 'rgba(220,245,255,.35)';
      snow.forEach(function (p) {
        var x = ((p[0] + Math.sin(t * .1 + p[3]) * .02) % 1) * W, y = ((p[1] + t * .006 * p[2]) % 1) * H;
        ctx.beginPath(); ctx.arc(x, y, p[2], 0, 7); ctx.fill();
      });
    };
    return scene;
  }

  /* ---------- Geometry helpers ---------- */
  function solve(A, b) { // Gaussian elimination, A is n x n
    var n = b.length, i, j, k;
    for (i = 0; i < n; i++) A[i] = A[i].concat([b[i]]);
    for (i = 0; i < n; i++) {
      var p = i;
      for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
      var t = A[i]; A[i] = A[p]; A[p] = t;
      if (Math.abs(A[i][i]) < 1e-12) return null;
      for (j = i + 1; j < n; j++) { var f = A[j][i] / A[i][i]; for (k = i; k <= n; k++) A[j][k] -= f * A[i][k]; }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) { var s = A[i][n]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
    return x;
  }
  // Homography mapping src points -> dst points (4 pairs).
  function homography(src, dst) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    var h = solve(A, b);
    if (!h) return null;
    return function (x, y) { var d = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d]; };
  }

  /* ---------- Marker detection ---------- */
  function toGray(data, n) {
    var g = new Uint8ClampedArray(n);
    for (var i = 0, j = 0; i < n; i++, j += 4) g[i] = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
    return g;
  }

  function findMarkers(gray, w, h) {
    var n = w * h, x, y, i;
    // integral image for local mean threshold
    var W1 = w + 1, I = new Float64Array(W1 * (h + 1));
    for (y = 0; y < h; y++) { var row = 0; for (x = 0; x < w; x++) { row += gray[y * w + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + row; } }
    var half = Math.max(8, Math.round(Math.min(w, h) / 14));
    var bin = new Uint8Array(n);
    for (y = 0; y < h; y++) {
      var y0 = Math.max(0, y - half), y1 = Math.min(h, y + half + 1);
      for (x = 0; x < w; x++) {
        var x0 = Math.max(0, x - half), x1 = Math.min(w, x + half + 1);
        var sum = I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0];
        var mean = sum / ((x1 - x0) * (y1 - y0));
        var v = gray[y * w + x];
        bin[y * w + x] = (v < mean * 0.72 && v < 170) ? 1 : 0;
      }
    }
    // connected components
    var label = new Int32Array(n), comps = [], stack = new Int32Array(n), cur = 0;
    var minA = Math.pow(Math.min(w, h) * 0.022, 2), maxA = Math.pow(Math.min(w, h) * 0.3, 2);
    for (i = 0; i < n; i++) {
      if (!bin[i] || label[i]) continue;
      cur++; var sp = 0; stack[sp++] = i; label[i] = cur;
      var cnt = 0, mnx = w, mxx = 0, mny = h, mxy = 0, sx = 0, sy = 0;
      while (sp) {
        var p = stack[--sp], px = p % w, py = (p - px) / w;
        cnt++; sx += px; sy += py;
        if (px < mnx) mnx = px; if (px > mxx) mxx = px; if (py < mny) mny = py; if (py > mxy) mxy = py;
        if (px > 0 && bin[p - 1] && !label[p - 1]) { label[p - 1] = cur; stack[sp++] = p - 1; }
        if (px < w - 1 && bin[p + 1] && !label[p + 1]) { label[p + 1] = cur; stack[sp++] = p + 1; }
        if (py > 0 && bin[p - w] && !label[p - w]) { label[p - w] = cur; stack[sp++] = p - w; }
        if (py < h - 1 && bin[p + w] && !label[p + w]) { label[p + w] = cur; stack[sp++] = p + w; }
      }
      if (cnt < minA || cnt > maxA) continue;
      var bw = mxx - mnx + 1, bh = mxy - mny + 1, asp = bw / bh, fill = cnt / (bw * bh);
      if (asp < 0.4 || asp > 2.5 || fill < 0.45 || fill > 0.96) continue;
      var cx = sx / cnt, cy = sy / cnt;
      // hollow center + solid ring = our marker
      var ok = true, L = cur;
      var at = function (xx, yy) { xx = Math.round(xx); yy = Math.round(yy); if (xx < 0 || yy < 0 || xx >= w || yy >= h) return -1; return label[yy * w + xx] === L ? 1 : 0; };
      var offs = [[0, 0], [.07, 0], [-.07, 0], [0, .07], [0, -.07]];
      for (var o = 0; o < offs.length && ok; o++) if (at(cx + offs[o][0] * bw, cy + offs[o][1] * bh) !== 0) ok = false;
      var ring = [[.35, 0], [-.35, 0], [0, .35], [0, -.35], [.3, .3], [-.3, .3], [.3, -.3], [-.3, -.3]], hit = 0;
      for (o = 0; o < ring.length; o++) if (at(cx + ring[o][0] * bw, cy + ring[o][1] * bh) === 1) hit++;
      if (!ok || hit < 7) continue;
      comps.push({ x: cx, y: cy, a: cnt });
    }
    return comps;
  }

  function orderQuad(pts) {
    var cx = 0, cy = 0; pts.forEach(function (p) { cx += p.x; cy += p.y; }); cx /= 4; cy /= 4;
    return pts.slice().sort(function (a, b) { return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx); });
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function pickQuad(cands) {
    cands = cands.sort(function (a, b) { return b.a - a.a; }).slice(0, 10);
    var best = null, bestA = 0, n = cands.length;
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) for (var k = j + 1; k < n; k++) for (var l = k + 1; l < n; l++) {
      var q = orderQuad([cands[i], cands[j], cands[k], cands[l]]);
      var areas = q.map(function (p) { return p.a; }), mx = Math.max.apply(null, areas), mn = Math.min.apply(null, areas);
      if (mx / mn > 5) continue;
      var sign = 0, convex = true, area = 0;
      for (var m = 0; m < 4; m++) {
        var a = q[m], b = q[(m + 1) % 4], c = q[(m + 2) % 4];
        var cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        if (sign === 0) sign = Math.sign(cr); else if (Math.sign(cr) !== sign) convex = false;
        area += a.x * b.y - b.x * a.y;
      }
      if (!convex) continue;
      var s0 = dist(q[0], q[1]), s1 = dist(q[1], q[2]), s2 = dist(q[2], q[3]), s3 = dist(q[3], q[0]);
      if (Math.max(s0, s2) / Math.min(s0, s2) > 2.5 || Math.max(s1, s3) / Math.min(s1, s3) > 2.5) continue;
      var r = (s0 + s2) / (s1 + s3); if (r < 1) r = 1 / r;
      if (r > 2.4) continue;
      area = Math.abs(area) / 2;
      // markers are ~1/9 of the sheet width; reject quads far too big or small for the marker size
      var ratio = Math.sqrt(mn) / Math.sqrt(area);
      if (ratio < 0.02 || ratio > 0.3) continue;
      if (area > bestA) { bestA = area; best = q; }
    }
    return best;
  }

  function sampler(data, w, h) {
    return function (x, y, out) {
      if (x < 0) x = 0; if (y < 0) y = 0; if (x > w - 1.001) x = w - 1.001; if (y > h - 1.001) y = h - 1.001;
      var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = (y0 * w + x0) * 4, j = i + w * 4;
      for (var c = 0; c < 3; c++) {
        var a = data[i + c] * (1 - fx) + data[i + 4 + c] * fx, b = data[j + c] * (1 - fx) + data[j + 4 + c] * fx;
        out[c] = a * (1 - fy) + b * fy;
      }
      return out;
    };
  }

  function bandDarkness(map, sample, B) {
    var s = 0, n = 0, px = [0, 0, 0];
    for (var y = 0; y < 10; y++) for (var x = 0; x < 40; x++) {
      var p = map(B.x + (x + .5) / 40 * B.w, B.y + (y + .5) / 10 * B.h);
      sample(p[0], p[1], px); s += 255 - (px[0] + px[1] + px[2]) / 3; n++;
    }
    return s / n;
  }

  /* scanSheet(source) -> {ok:true, canvas, dataUrl} or {ok:false, reason}
     source: an <img>, <canvas>, or <video> (current frame). */
  function scanSheet(source) {
    var sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) return { ok: false, reason: 'noimage' };
    // working copies: small for detection, large for sampling
    var kS = Math.min(1, 900 / Math.max(sw, sh)), kL = Math.min(1, 1800 / Math.max(sw, sh));
    var sc = document.createElement('canvas'); sc.width = Math.round(sw * kS); sc.height = Math.round(sh * kS);
    var sg = sc.getContext('2d', { willReadFrequently: true }); sg.drawImage(source, 0, 0, sc.width, sc.height);
    var small = sg.getImageData(0, 0, sc.width, sc.height);
    var gray = toGray(small.data, sc.width * sc.height);
    var cands = findMarkers(gray, sc.width, sc.height);
    if (cands.length < 4) return { ok: false, reason: 'markers', found: cands.length };
    var q = pickQuad(cands);
    if (!q) return { ok: false, reason: 'markers', found: cands.length };

    var lc = document.createElement('canvas'); lc.width = Math.round(sw * kL); lc.height = Math.round(sh * kL);
    var lg = lc.getContext('2d', { willReadFrequently: true }); lg.drawImage(source, 0, 0, lc.width, lc.height);
    var big = lg.getImageData(0, 0, lc.width, lc.height);
    var sample = sampler(big.data, lc.width, lc.height), f = kL / kS;

    // long edge first, then pick between the two 180° options using the bold title band
    if (dist(q[0], q[1]) + dist(q[2], q[3]) < dist(q[1], q[2]) + dist(q[3], q[0])) q = [q[1], q[2], q[3], q[0]];
    function mapFor(order) {
      var dst = order.map(function (p) { return [p.x * f, p.y * f]; });
      return homography(SHEET.centers, dst);
    }
    var mA = mapFor(q), mB = mapFor([q[2], q[3], q[0], q[1]]);
    if (!mA || !mB) return { ok: false, reason: 'markers' };
    var dA = bandDarkness(mA, sample, SHEET.title) - bandDarkness(mA, sample, SHEET.footer);
    var map = dA >= 0 ? mA : mB;

    // paper color: brightest quarter of samples across the sheet
    var px = [0, 0, 0], samples = [];
    for (var y = 0; y < 34; y++) for (var x = 0; x < 44; x++) {
      var p = map(40 + x * 1020 / 43, 40 + y * 770 / 33); sample(p[0], p[1], px);
      samples.push([px[0], px[1], px[2], px[0] + px[1] + px[2]]);
    }
    samples.sort(function (a, b) { return b[3] - a[3]; });
    var top = samples.slice(0, Math.floor(samples.length / 4)), paper = [0, 0, 0];
    top.forEach(function (s) { paper[0] += s[0]; paper[1] += s[1]; paper[2] += s[2]; });
    paper = paper.map(function (v) { return Math.max(70, v / top.length); });

    var out = document.createElement('canvas'); out.width = TEX_W; out.height = TEX_H;
    var og = out.getContext('2d'), od = og.createImageData(TEX_W, TEX_H), d = od.data, R = SHEET.region, colored = 0;
    for (var v = 0; v < TEX_H; v++) for (var u = 0; u < TEX_W; u++) {
      var m = map(R.x + (u + .5) / TEX_W * R.w, R.y + (v + .5) / TEX_H * R.h);
      sample(m[0], m[1], px);
      var r = Math.min(255, px[0] * 255 / paper[0]), g = Math.min(255, px[1] * 255 / paper[1]), b = Math.min(255, px[2] * 255 / paper[2]);
      r = 255 - (255 - r) * 1.12; g = 255 - (255 - g) * 1.12; b = 255 - (255 - b) * 1.12;
      if (r > 228 && g > 228 && b > 228) { r = g = b = 255; }
      else { var mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn > 0.25 * mx || mx < 105) colored++; }
      var k = (v * TEX_W + u) * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
    }
    og.putImageData(od, 0, 0);
    if (colored < TEX_W * TEX_H * 0.03) return { ok: false, reason: 'blank', canvas: out };
    return { ok: true, canvas: out, dataUrl: out.toDataURL('image/jpeg', 0.82) };
  }

  global.SharkCore = {
    BOX: BOX, TEX_W: TEX_W, TEX_H: TEX_H, SHEET: SHEET,
    sharkPath: sharkPath, drawShark: drawShark, Shark3D: Shark3D, sheetOutlinePath: sheetOutlinePath,
    makeScene: makeScene, scanSheet: scanSheet,
    reasonText: function (r) {
      return r === 'blank' ? "That shark looks blank. Color it in, then take the photo again."
        : r === 'noimage' ? "That photo didn't load. Try taking it again."
        : "We couldn't find all 4 black corner squares. Lay the sheet flat and fit the whole page in the photo.";
    }
  };
})(window);
