/* Draw Jamboree settings.
   Until `firebase` is filled in, the app runs in demo mode: everything works,
   but phones can't reach the big screen (the scan page only works in the same browser).
   See README.md -> "Turn on phone scanning" for the 10-minute setup. */
window.SHARK_CONFIG = {
  // Paste the firebaseConfig object from the Firebase console here, for example:
  // firebase: { apiKey: "...", authDomain: "...", databaseURL: "https://...firebasedatabase.app", projectId: "...", appId: "..." },
  firebase: null,

  // Shown at the bottom of the phone page after a shark swims in. Leave bookingUrl empty to hide it.
  bookingText: "Want this shark tank at your next party?",
  bookingUrl: ""
};
