/* Draw Together - event reel.
   Builds an animated GIF of every drawing from an event: a title card, one shark swimming across
   while its skin changes to each drawing, and a finale with the whole school together. Runs on
   the host laptop from drawings already in memory, so it works after the online data is deleted. */
(function (global) {
  'use strict';
  var C = global.SharkCore;
  // soft & bubbly: cream and butter yellow with a chunky navy outline and drop
  var INK = '#13294b', CREAM = '#fff6e0', BUTTER = '#ffc93c';
  var DISPLAY = '"DynaPuff", "Lilita One", "Arial Rounded MT Bold", sans-serif', LABEL = 'Nunito, system-ui, sans-serif';

  function loadAll(srcs) {
    return Promise.all(srcs.map(function (src) {
      return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
    })).then(function (a) { return a.filter(Boolean); });
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var want = ['700 56px "DynaPuff"', '900 12px Nunito', '800 12px Nunito'];
    return Promise.race([
      Promise.all(want.map(function (f) { return document.fonts.load(f); })),
      new Promise(function (r) { setTimeout(r, 2500); })
    ]).catch(function () {});
  }
  function pick(list, max) {
    if (list.length <= max) return list;
    var out = []; for (var i = 0; i < max; i++) out.push(list[Math.floor(i * list.length / max)]); return out;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }

  /* ---- type helpers ---- */
  // letter-spaced small caps label; returns width
  function spaced(g, txt, x, y, track, align) {
    var w = 0, i, ws = [];
    for (i = 0; i < txt.length; i++) { ws.push(g.measureText(txt[i]).width); w += ws[i] + (i < txt.length - 1 ? track : 0); }
    var cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.textAlign = 'left';
    for (i = 0; i < txt.length; i++) { g.fillText(txt[i], cx, y); cx += ws[i] + track; }
    return w;
  }
  function spacedWidth(g, txt, track) { var w = 0; for (var i = 0; i < txt.length; i++) w += g.measureText(txt[i]).width + (i < txt.length - 1 ? track : 0); return w; }
  function round(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // a rounded pill with a letter-spaced label, centered on cx: cream (with a navy drop) or butter yellow
  function pill(g, txt, cx, cy, size, alpha, bg) {
    if (alpha != null && alpha <= 0) return;
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha;
    g.font = '900 ' + size + 'px ' + LABEL; g.textBaseline = 'middle';
    var track = size * .16, tw = spacedWidth(g, txt, track), padX = size * 1.2, h = size * 2.4, w = tw + padX * 2;
    if (bg !== BUTTER) { g.fillStyle = INK; round(g, cx - w / 2, cy - h / 2 + 3, w, h, h / 2); g.fill(); }
    g.fillStyle = bg || CREAM; round(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = INK; spaced(g, txt, cx, cy + 1, track, 'center');
    g.restore();
  }
  // puffy display word: fill color on a thick navy outline, with a solid navy drop underneath
  function display(g, txt, x, y, size, align, alpha, scale, fill) {
    if (alpha != null && alpha <= 0) return;
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha;
    g.translate(x, y); if (scale) g.scale(scale, scale);
    g.font = '700 ' + size + 'px ' + DISPLAY; g.textAlign = align || 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    g.lineWidth = size * .17; g.strokeStyle = INK; g.fillStyle = INK;
    var drop = Math.max(2, size * .06);
    g.strokeText(txt, 0, drop); g.fillText(txt, 0, drop);
    g.strokeText(txt, 0, 0);
    g.fillStyle = fill || CREAM; g.fillText(txt, 0, 0);
    g.restore();
  }
  function topShade(g, W, H, a) {
    var gr = g.createLinearGradient(0, 0, 0, H * .42);
    gr.addColorStop(0, 'rgba(7,40,72,' + a + ')'); gr.addColorStop(1, 'rgba(7,40,72,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * .42);
  }

  // makeReel(imageSrcs, {world, onProgress}) -> Promise<Blob>
  function makeReel(srcs, opts) {
    opts = opts || {};
    var W = 480, H = 270, enc = global.gifenc, world = (opts.world || 'Shark Lagoon').toUpperCase();
    return Promise.all([loadAll(srcs), fontsReady()]).then(function (r) {
      var imgs = r[0], all = imgs.length, show = pick(imgs, 45), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var g = cv.getContext('2d', { willReadFrequently: true }), scene = C.makeScene(), t = 0, frames = [];
      var date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

      /* 1. title card */
      for (var i = 0; i < 14; i++) frames.push({ d: i < 13 ? 110 : 900, f: (function (i) { return function () {
        scene(g, W, H, t); scene.front(g, W, H, t);
        var a = ease(i / 5);
        display(g, 'Draw Together', W / 2, H * .5, 48, 'center', a, .86 + .14 * a);
        pill(g, world + '  \u2022  ' + date, W / 2, H * .66, 10, ease((i - 4) / 4), BUTTER);
      }; })(i) });

      /* 2. one shark swims across while its skin changes to each drawing */
      var PER = 4, EDGE = 5, passes = Math.ceil(show.length / 30), perPass = Math.ceil(show.length / passes);
      var xa = W * .27, xb = W * .74;
      for (var pi = 0; pi < passes; pi++) {
        var skins = show.slice(pi * perPass, (pi + 1) * perPass), cruise = skins.length * PER;
        for (var q = 0; q < cruise + EDGE * 2; q++) frames.push({ d: 110, f: (function (skins, q, cruise, base) { return function () {
          var x, k;
          if (q < EDGE) { x = -W * .3 + (xa + W * .3) * (q / EDGE); k = 0; }
          else if (q < EDGE + cruise) { var c = q - EDGE; x = xa + (xb - xa) * (c / cruise); k = Math.floor(c / PER); }
          else { var e = q - EDGE - cruise + 1; x = xb + (W * 1.3 - xb) * (e / EDGE); k = skins.length - 1; }
          var y = H * .46 + Math.sin(q * .35) * 6;
          scene(g, W, H, t);
          g.save(); g.translate(x, y); g.rotate(Math.sin(q * .35 + 1) * .03);
          C.drawShark(g, skins[k], Math.sin(q * 1.3) * 8); g.restore();
          var c2 = q - EDGE;
          if (c2 > 0 && c2 < cruise && c2 % PER === 0) {
            g.save(); g.fillStyle = 'rgba(255,255,255,.6)';
            for (var b = 0; b < 7; b++) { g.beginPath(); g.arc(x - 70 + b * 22, y - 48 - (b % 3) * 12, 2.5 + (b % 2) * 2, 0, 7); g.fill(); }
            g.restore();
          }
          scene.front(g, W, H, t);
          counter(g, base + k + 1, show.length);
        }; })(skins, q, cruise, pi * perPass) });
      }

      /* 3. finale: the whole school, with the count */
      var school = pick(imgs, 28).map(function (img, n) { return { img: img, x: (n * 97 % W), y: H * (.58 + ((n * 37) % 100) / 100 * .26), s: .32 + (n % 4) * .05, v: 3 + (n % 3) }; });
      for (i = 0; i < 20; i++) frames.push({ d: i < 19 ? 130 : 1400, f: (function (i) { return function () {
        scene(g, W, H, t);
        school.forEach(function (sh) { g.save(); g.translate((sh.x + i * sh.v * 2.2) % (W + 80) - 40, sh.y); g.scale(sh.s, sh.s); C.drawShark(g, sh.img, Math.sin(i * 1.4 + sh.x) * 8); g.restore(); });
        scene.front(g, W, H, t);
        var a = ease(i / 4), word = all === 1 ? 'shark swam today!' : 'sharks swam today!';
        display(g, String(all), W / 2, H * .36, 72, 'center', a, .8 + .2 * a, BUTTER);
        display(g, word, W / 2, H * .5, 22, 'center', ease((i - 2) / 4));
        pill(g, 'THANKS FOR DRAWING TOGETHER', W / 2, H * .9, 9, ease((i - 5) / 4));
      }; })(i) });

      function counter(g, n, total) {
        // top-right badge: big number, small "OF N", cream with a navy drop
        g.save(); g.textBaseline = 'alphabetic';
        g.font = '700 20px ' + DISPLAY; var nw = g.measureText(String(n)).width;
        g.font = '900 9px ' + LABEL; var ow = spacedWidth(g, 'OF ' + total, 1.3);
        var w = 13 + nw + 6 + ow + 13, h = 30, x = W - w - 12, y = 12;
        g.fillStyle = INK; round(g, x, y + 3, w, h, 12); g.fill();
        g.fillStyle = CREAM; round(g, x, y, w, h, 12); g.fill();
        g.fillStyle = INK; g.font = '700 20px ' + DISPLAY; g.textAlign = 'left'; g.fillText(String(n), x + 13, y + 22);
        g.font = '900 9px ' + LABEL; spaced(g, 'OF ' + total, x + 13 + nw + 6, y + 19, 1.3, 'left');
        g.restore();
      }

      var gif = enc.GIFEncoder(), n = 0, total = frames.length;
      return new Promise(function (res, rej) {
        function chunk() {
          try {
            var end = Math.min(total, n + 6);
            for (; n < end; n++) {
              frames[n].f(); t += frames[n].d / 1000;
              var data = g.getImageData(0, 0, W, H).data, pal = enc.quantize(data, 256), idx = enc.applyPalette(data, pal);
              gif.writeFrame(idx, W, H, { palette: pal, delay: frames[n].d, repeat: 0 });
            }
            if (opts.onProgress) opts.onProgress(n / total);
            if (n < total) setTimeout(chunk, 0);
            else { gif.finish(); res(new Blob([gif.bytes()], { type: 'image/gif' })); }
          } catch (e) { rej(e); }
        }
        chunk();
      });
    });
  }
  global.SharkReel = { makeReel: makeReel };
})(window);
