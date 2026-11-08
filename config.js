/* Draw Together settings.
   Until `firebase` is filled in, the app runs in demo mode: everything works,
   but phones can't reach the big screen (the scan page only works in the same browser).
   See README.md -> "Turn on phone scanning" for the 10-minute setup. */
window.SHARK_CONFIG = {
  // Paste the firebaseConfig object from the Firebase console here, for example:
  // firebase: { apiKey: "...", authDomain: "...", databaseURL: "https://...firebasedatabase.app", projectId: "...", appId: "..." },
  firebase: {
    apiKey: "AIzaSyDidjOEalJT4vZtzJ63pCli-MujuPMo6cs",
    authDomain: "draw-584b0.firebaseapp.com",
    databaseURL: "https://draw-584b0-default-rtdb.firebaseio.com",
    projectId: "draw-584b0",
    storageBucket: "draw-584b0.firebasestorage.app",
    messagingSenderId: "248653502836",
    appId: "1:248653502836:web:3fb29adc90b21941947421"
  },

  // Shown at the bottom of the phone page after a shark swims in. Leave bookingUrl empty to hide it.
  bookingText: "Want this shark tank at your next party?",
  bookingUrl: ""
};
