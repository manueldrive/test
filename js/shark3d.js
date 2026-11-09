/* Draw Together — 3D "inflated" sharks (prototype).
   The flat shark outline is puffed up into a rounded 3D body: thick through the middle, thin
   at the fin tips and tail. The kid's drawing is projected onto it from the side (both sides),
   so the coloring lines up exactly with the printed sheet. Needs THREE (three.min.js). */
(function (global) {
  'use strict';
  var C = global.SharkCore, BOX = C.BOX;

  /* ---------- 1. silhouette mask + distance to edge ---------- */
  function buildMask(R) {
    var w = Math.ceil(BOX.w * R) + 2, h = Math.ceil(BOX.h * R) + 2, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d'); g.setTransform(R, 0, 0, R, -BOX.x * R + 1, -BOX.y * R + 1);
    C.sharkPath(g, 0); g.fillStyle = '#000'; g.fill('nonzero');
    var d = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (var i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return { w: w, h: h, m: m, R: R };
  }
  // exact Euclidean distance transform (Felzenszwalb), distance in mask pixels to the nearest outside pixel
  function edt(mask) {
    var w = mask.w, h = mask.h, INF = 1e12, f = new Float64Array(Math.max(w, h)), out = new Float64Array(w * h);
    for (var i = 0; i < w * h; i++) out[i] = mask.m[i] ? INF : 0;
    function pass(get, set, n) {
      var v = new Int32Array(n), z = new Float64Array(n + 1), k = 0, q, s;
      for (q = 0; q < n; q++) f[q] = get(q);
      v[0] = 0; z[0] = -INF; z[1] = INF;
      for (q = 1; q < n; q++) {
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (q = 0; q < n; q++) { while (z[k + 1] < q) k++; set(q, (q - v[k]) * (q - v[k]) + f[v[k]]); }
    }
    var x, y;
    for (x = 0; x < w; x++) pass(function (q) { return out[q * w + x]; }, function (q, val) { out[q * w + x] = val; }, h);
    for (y = 0; y < h; y++) pass(function (q) { return out[y * w + q]; }, function (q, val) { out[y * w + q] = val; }, w);
    for (i = 0; i < w * h; i++) out[i] = Math.sqrt(out[i]);
    return out;
  }

  /* ---------- 2. inflated geometry ---------- */
  var baseCache = null;
  function baseGeometry() {
    if (baseCache) return baseCache;
    var R = 4, mask = buildMask(R), dist = edt(mask), STEP = 1.5;
    function inside(x, y) { var px = Math.round((x - BOX.x) * R + 1), py = Math.round((y - BOX.y) * R + 1); return px >= 0 && py >= 0 && px < mask.w && py < mask.h && mask.m[py * mask.w + px] === 1; }
    function dAt(x, y) { var px = Math.round((x - BOX.x) * R + 1), py = Math.round((y - BOX.y) * R + 1); if (px < 0 || py < 0 || px >= mask.w || py >= mask.h) return 0; return dist[py * mask.w + px] / R; }
    var nx = Math.ceil(BOX.w / STEP) + 1, ny = Math.ceil(BOX.h / STEP) + 1, gx = [], idx = new Int32Array(nx * ny).fill(-1);
    var ins = new Uint8Array(nx * ny), i, j;
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) ins[j * nx + i] = inside(BOX.x + i * STEP, BOX.y + j * STEP) ? 1 : 0;
    // keep a vertex if it is inside, or outside but touching an inside neighbor (it gets snapped to the edge)
    var verts = [];
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var k = j * nx + i, x = BOX.x + i * STEP, y = BOX.y + j * STEP;
      if (ins[k]) { idx[k] = verts.length; verts.push([x, y, dAt(x, y)]); continue; }
      var best = null, bd = 1e9;
      for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
        var ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || !ins[jj * nx + ii]) continue;
        // walk from the inside neighbor toward this vertex and stop at the edge
        var ax = BOX.x + ii * STEP, ay = BOX.y + jj * STEP, lo = 0, hi = 1;
        for (var it = 0; it < 10; it++) { var mid = (lo + hi) / 2; if (inside(ax + (x - ax) * mid, ay + (y - ay) * mid)) lo = mid; else hi = mid; }
        var ex = ax + (x - ax) * lo, ey = ay + (y - ay) * lo, dd = (ex - x) * (ex - x) + (ey - y) * (ey - y);
        if (dd < bd) { bd = dd; best = [ex, ey]; }
      }
      if (best) { idx[k] = verts.length; verts.push([best[0], best[1], 0]); }
    }
    // puff: rounded profile, thin at the fins, thickest through the body
    var D = 24, H = 15.5;
    function puff(d) { var t = Math.min(1, d / D); return H * Math.sqrt(t * (2 - t)) * (.42 + .58 * t); }
    var n = verts.length, pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), faces = [];
    for (i = 0; i < n; i++) {
      var v = verts[i], z = puff(v[2]), u = (v[0] - BOX.x) / BOX.w, vv = 1 - (v[1] - BOX.y) / BOX.h;
      pos.set([v[0], -v[1], z], i * 3); pos.set([v[0], -v[1], -z], (n + i) * 3);
      uv.set([u, vv], i * 2); uv.set([u, vv], (n + i) * 2);
    }
    for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
      var a = idx[j * nx + i], b = idx[j * nx + i + 1], c = idx[(j + 1) * nx + i], d2 = idx[(j + 1) * nx + i + 1];
      if (!(ins[j * nx + i] || ins[j * nx + i + 1] || ins[(j + 1) * nx + i] || ins[(j + 1) * nx + i + 1])) continue;
      if (a >= 0 && b >= 0 && c >= 0) { faces.push(a, c, b); faces.push(n + a, n + b, n + c); }
      if (b >= 0 && d2 >= 0 && c >= 0) { faces.push(b, c, d2); faces.push(n + b, n + d2, n + c); }
    }
    baseCache = { pos: pos, uv: uv, index: faces, count: n * 2 };
    return baseCache;
  }

  /* ---------- 3. texture: the same skin compositing as the flat shark ---------- */
  function skinTexture(img) {
    var S = 6, cv = document.createElement('canvas'); cv.width = Math.round(BOX.w * S); cv.height = Math.round(BOX.h * S);
    var g = cv.getContext('2d');
    function paint() { g.clearRect(0, 0, cv.width, cv.height); g.setTransform(S, 0, 0, S, -BOX.x * S, -BOX.y * S); C.drawShark(g, img, 0); tex.needsUpdate = true; }
    var tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else tex.encoding = THREE.sRGBEncoding;
    if (img && img.complete && img.naturalWidth) paint(); else if (img) img.addEventListener('load', paint, { once: true });
    paint();
    return tex;
  }

  /* ---------- 4. a swimming shark ---------- */
  function Shark3D(img) {
    var b = baseGeometry(), geo = new THREE.BufferGeometry();
    this.base = b.pos; this.pos = new Float32Array(b.pos);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(b.uv, 2));
    geo.setIndex(b.index); geo.computeVertexNormals();
    this.geo = geo;
    var mat = new THREE.MeshStandardMaterial({ map: skinTexture(img), roughness: .55, metalness: 0, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group = new THREE.Group(); this.group.add(this.mesh);
    this.phase = Math.random() * 6; this.n = 0;
  }
  // body wave: the tail sweeps side to side (in depth), the head stays steady
  Shark3D.prototype.swim = function (dt, speed) {
    this.phase += dt * (3.2 + speed * 3);
    var p = this.pos, bp = this.base, ph = this.phase;
    for (var i = 0; i < p.length; i += 3) {
      var x = bp[i], u = (106 - x) / 218;                // 0 at the nose, 1 at the tail tip
      var w = Math.pow(Math.max(0, u - .18) / .82, 1.6); // only the back part bends
      p[i + 2] = bp[i + 2] + Math.sin(ph - u * 4.2) * 15 * w;
      p[i] = bp[i] - Math.abs(Math.sin(ph - u * 4.2)) * 2.5 * w;
    }
    this.geo.attributes.position.needsUpdate = true;
    if ((this.n++ & 3) === 0) this.geo.computeVertexNormals();
  };

  global.Shark3DKit = { Shark3D: Shark3D, baseGeometry: baseGeometry };
})(window);
