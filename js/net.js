/* Draw Jamboree — event connection.
   Live mode: Firebase Realtime Database + anonymous sign-in (set up in config.js).
   Demo mode: when Firebase isn't set up, the screen and scan page talk only inside one browser. */
(function (global) {
  'use strict';
  var cfg = global.SHARK_CONFIG || {};
  var live = !!(cfg.firebase && cfg.firebase.apiKey && global.firebase && global.firebase.database);
  var SEND_GAP = 20000; // ms between sharks from one phone (also enforced by the database rules)

  function newId() {
    var a = 'abcdefghjkmnpqrstuvwxyz23456789', out = '', r = new Uint8Array(8);
    (global.crypto || global.msCrypto).getRandomValues(r);
    for (var i = 0; i < 8; i++) out += a[r[i] % a.length];
    return out;
  }
  function lastSend(id) { try { return +localStorage.getItem('shark-last-' + id) || 0; } catch (e) { return 0; } }
  function markSend(id) { try { localStorage.setItem('shark-last-' + id, String(Date.now())); } catch (e) {} }
  function waitLeft(id) { return Math.max(0, SEND_GAP - (Date.now() - lastSend(id))); }

  var api;
  if (live) {
    firebase.initializeApp(cfg.firebase);
    var db = firebase.database(), TS = firebase.database.ServerValue.TIMESTAMP;
    var uidP = new Promise(function (res, rej) {
      firebase.auth().onAuthStateChanged(function (u) { if (u) res(u.uid); });
      firebase.auth().signInAnonymously().catch(rej);
    });
    api = {
      live: true,
      createEvent: function () {
        return uidP.then(function (uid) {
          var id = newId();
          return db.ref('events/' + id).set({ owner: uid, open: true, created: TS }).then(function () { return id; });
        });
      },
      isOwner: function (id) {
        return uidP.then(function (uid) { return db.ref('events/' + id + '/owner').once('value').then(function (s) { return s.val() === uid; }); });
      },
      isOpen: function (id) { return db.ref('events/' + id + '/open').once('value').then(function (s) { return s.val() === true; }); },
      watch: function (id, h) {
        var sharks = db.ref('events/' + id + '/sharks'), open = db.ref('events/' + id + '/open');
        sharks.on('child_added', function (s) { var v = s.val() || {}; if (v.img) h.add({ key: s.key, img: v.img }); });
        sharks.on('child_removed', function (s) { h.remove && h.remove(s.key); });
        open.on('value', function (s) { if (s.val() !== true) h.end && h.end(); });
        return function () { sharks.off(); open.off(); };
      },
      send: function (id, img) {
        var w = waitLeft(id); if (w) return Promise.reject({ code: 'wait', wait: w });
        return uidP.then(function (uid) {
          var key = db.ref().push().key, u = {};
          u['events/' + id + '/sharks/' + key] = { img: img, by: uid, t: TS };
          u['events/' + id + '/last/' + uid] = TS;
          return db.ref().update(u).then(function () { markSend(id); return key; }, function (e) {
            return api.isOpen(id).then(function (o) { throw { code: o ? 'wait' : 'closed', wait: SEND_GAP, raw: e }; });
          });
        });
      },
      hostAdd: function (id, img) {
        return uidP.then(function (uid) {
          var ref = db.ref('events/' + id + '/sharks').push();
          return ref.set({ img: img, by: uid, t: TS }).then(function () { return ref.key; });
        });
      },
      remove: function (id, key) { return db.ref('events/' + id + '/sharks/' + key).remove(); },
      close: function (id) { return db.ref('events/' + id + '/open').set(false); },
      destroy: function (id) { return db.ref('events/' + id).remove(); }
    };
  } else {
    var chans = {};
    function chan(id) { return chans[id] || (chans[id] = 'BroadcastChannel' in global ? new BroadcastChannel('shark-lagoon-' + id) : null); }
    function key() { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    function getOpen() { try { return JSON.parse(localStorage.getItem('shark-demo-open') || '{}'); } catch (e) { return {}; } }
    function setOpen(id, v) { try { var o = getOpen(); if (v) o[id] = 1; else delete o[id]; localStorage.setItem('shark-demo-open', JSON.stringify(o)); } catch (e) {} }
    api = {
      live: false,
      createEvent: function () { var id = 'demo' + newId().slice(0, 4); setOpen(id, true); return Promise.resolve(id); },
      isOwner: function () { return Promise.resolve(true); },
      isOpen: function (id) { return Promise.resolve(!!getOpen()[id]); },
      watch: function (id, h) {
        var c = chan(id); if (!c) return function () {};
        c.onmessage = function (e) {
          var m = e.data || {};
          if (m.type === 'shark') h.add({ key: m.key, img: m.img });
          if (m.type === 'end') h.end && h.end();
        };
        return function () { c.onmessage = null; };
      },
      send: function (id, img) {
        var w = waitLeft(id); if (w) return Promise.reject({ code: 'wait', wait: w });
        if (!getOpen()[id]) return Promise.reject({ code: 'closed' });
        var c = chan(id), k = key();
        if (c) c.postMessage({ type: 'shark', key: k, img: img });
        markSend(id); return Promise.resolve(k);
      },
      hostAdd: function () { return Promise.resolve(key()); },
      remove: function () { return Promise.resolve(); },
      close: function (id) { setOpen(id, false); var c = chan(id); if (c) c.postMessage({ type: 'end' }); return Promise.resolve(); },
      destroy: function () { return Promise.resolve(); }
    };
  }
  api.SEND_GAP = SEND_GAP;
  api.waitLeft = waitLeft;
  global.SharkNet = api;
})(window);
