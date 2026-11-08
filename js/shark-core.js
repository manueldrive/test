/* Crayon Shark Lagoon — shared core
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

  /* ---------- Water scene ---------- */
  function makeScene() {
    var kelp = [];
    for (var i = 0; i < 9; i++) kelp.push({ x: (i + .3 + Math.random() * .4) / 9, h: .18 + Math.random() * .22, ph: Math.random() * 6 });
    return function scene(ctx, W, H, t) {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1f8fa8'); g.addColorStop(.35, '#0a5675'); g.addColorStop(1, '#03202f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 5; i++) {
        var x = W * (i / 4) + Math.sin(t * .15 + i) * W * .06, w = W * .08 + i % 2 * W * .05, a = .05 + .03 * Math.sin(t * .4 + i * 2);
        var rg = ctx.createLinearGradient(0, 0, 0, H * .85);
        rg.addColorStop(0, 'rgba(200,245,255,' + a + ')'); rg.addColorStop(1, 'rgba(200,245,255,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * .4 - W * .12, H * .85); ctx.lineTo(x - w * .6 - W * .12, H * .85); ctx.fill();
      }
      ctx.restore();
      var sandY = H * .9;
      kelp.forEach(function (k) {
        var x0 = k.x * W, h = k.h * H;
        ctx.strokeStyle = '#2b8a62'; ctx.lineWidth = Math.max(6, W * .009); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, sandY + 10);
        for (var s = 1; s <= 6; s++) ctx.lineTo(x0 + Math.sin(t * .8 + k.ph + s * .6) * s * 3.5, sandY - h * s / 6);
        ctx.stroke();
      });
      ctx.fillStyle = '#c9a96f'; ctx.beginPath(); ctx.moveTo(0, H);
      for (var x2 = 0; x2 <= W; x2 += W / 12) ctx.lineTo(x2, sandY + Math.sin(x2 * .012) * 8);
      ctx.lineTo(W, H); ctx.fill();
      ctx.fillStyle = '#e2c48a'; ctx.beginPath(); ctx.moveTo(0, H);
      for (var x3 = 0; x3 <= W; x3 += W / 12) ctx.lineTo(x3, sandY + 14 + Math.sin(x3 * .009 + 2) * 7);
      ctx.lineTo(W, H); ctx.fill();
    };
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
    sharkPath: sharkPath, drawShark: drawShark, sheetOutlinePath: sheetOutlinePath,
    makeScene: makeScene, scanSheet: scanSheet,
    reasonText: function (r) {
      return r === 'blank' ? "That shark looks blank. Color it in, then take the photo again."
        : r === 'noimage' ? "That photo didn't load. Try taking it again."
        : "We couldn't find all 4 black corner squares. Lay the sheet flat and fit the whole page in the photo.";
    }
  };
})(window);
