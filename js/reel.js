/* Draw Jamboree — event reel.
   Builds an animated GIF of every drawing from an event: a title card, each shark swimming
   past in turn, and a finale with the whole school together. Runs on the host laptop from
   drawings already in memory, so it works even after the event's online data is deleted. */
(function (global) {
  'use strict';
  var C = global.SharkCore;
  function loadAll(srcs) {
    return Promise.all(srcs.map(function (src) {
      return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
    })).then(function (a) { return a.filter(Boolean); });
  }
  function pick(list, max) {
    if (list.length <= max) return list;
    var out = []; for (var i = 0; i < max; i++) out.push(list[Math.floor(i * list.length / max)]); return out;
  }
  function title(g, W, txt, y, size, alpha) {
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    g.lineJoin = 'round'; g.lineWidth = Math.max(4, size * .16); g.strokeStyle = '#ffffff'; g.strokeText(txt, W / 2, y);
    g.fillStyle = '#0b3a64'; g.fillText(txt, W / 2, y); g.restore();
  }
  function small(g, W, txt, y, size) {
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 ' + size + 'px Nunito, system-ui, sans-serif';
    g.fillStyle = 'rgba(3,32,47,.75)'; g.fillText(txt, W / 2, y); g.restore();
  }

  // makeReel(imageSrcs, {world, onProgress}) -> Promise<Blob>
  function makeReel(srcs, opts) {
    opts = opts || {};
    var W = 480, H = 270, enc = global.gifenc, world = opts.world || 'Shark Lagoon';
    return loadAll(srcs).then(function (imgs) {
      var all = imgs.length, show = pick(imgs, 45), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var g = cv.getContext('2d', { willReadFrequently: true }), scene = C.makeScene(), t = 0, frames = [];
      var date = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      var count = all + (all === 1 ? ' shark' : ' sharks') + ' swam today!';
      // plan the frames as small draw functions so encoding can run in chunks
      for (var i = 0; i < 10; i++) frames.push({ d: 140, f: (function (i) { return function () {
        scene(g, W, H, t); scene.front(g, W, H, t);
        title(g, W, 'Draw Jamboree', H * .36, 46, Math.min(1, i / 3)); small(g, W, world + ' \u00b7 ' + date, H * .56, 16);
      }; })(i) });
      // one shark swims left to right: it dashes in, cruises across while its skin changes to each
      // drawing in turn (only while fully on screen), then dashes out. Big events use a few passes.
      var PER = 4, EDGE = 5, passes = Math.ceil(show.length / 30), perPass = Math.ceil(show.length / passes);
      var xa = W * .27, xb = W * .74, scale = 1.0;
      for (var pi = 0; pi < passes; pi++) {
        var skins = show.slice(pi * perPass, (pi + 1) * perPass), cruise = skins.length * PER;
        for (var q = 0; q < cruise + EDGE * 2; q++) frames.push({ d: 110, f: (function (skins, q, cruise, base) { return function () {
          var x, k;
          if (q < EDGE) { x = -W * .3 + (xa + W * .3) * (q / EDGE); k = 0; }
          else if (q < EDGE + cruise) { var c = q - EDGE; x = xa + (xb - xa) * (c / cruise); k = Math.floor(c / PER); }
          else { var e = q - EDGE - cruise + 1; x = xb + (W * 1.3 - xb) * (e / EDGE); k = skins.length - 1; }
          var y = H * .47 + Math.sin(q * .35) * 6;
          scene(g, W, H, t);
          g.save(); g.translate(x, y); g.rotate(Math.sin(q * .35 + 1) * .03); g.scale(scale, scale);
          C.drawShark(g, skins[k], Math.sin(q * 1.3) * 8); g.restore();
          var c2 = q - EDGE;
          if (c2 > 0 && c2 < cruise && c2 % PER === 0) { // a little sparkle as the skin changes
            g.save(); g.fillStyle = 'rgba(255,255,255,.6)';
            for (var b = 0; b < 7; b++) { g.beginPath(); g.arc(x - 70 + b * 22, y - 48 - (b % 3) * 12, 2.5 + (b % 2) * 2, 0, 7); g.fill(); }
            g.restore();
          }
          scene.front(g, W, H, t); small(g, W, 'Shark ' + (base + k + 1) + ' of ' + show.length, H * .91, 14);
        }; })(skins, q, cruise, pi * perPass) });
      }
      var school = pick(imgs, 28).map(function (img, n) { return { img: img, x: (n * 97 % W), y: H * (.16 + ((n * 37) % 100) / 100 * .58), s: .34 + (n % 4) * .05, v: 3 + (n % 3) }; });
      for (i = 0; i < 18; i++) frames.push({ d: 130, f: (function (i) { return function () {
        scene(g, W, H, t);
        school.forEach(function (sh) { g.save(); g.translate((sh.x + i * sh.v * 2.2) % (W + 80) - 40, sh.y); g.scale(sh.s, sh.s); C.drawShark(g, sh.img, Math.sin(i * 1.4 + sh.x) * 8); g.restore(); });
        scene.front(g, W, H, t);
        title(g, W, count, H * .13, 30, Math.min(1, i / 3)); small(g, W, 'Thanks for swimming with us!', H * .92, 15);
      }; })(i) });

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
