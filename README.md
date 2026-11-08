# Draw Jamboree

A shared big-screen drawing experience for kids' events. The first world is **Shark Lagoon**, an aquarium: Kids color a shark on a printed sheet, a grown-up scans the QR code on the big screen and snaps a photo, and the shark swims into the tank for everyone to see.

## The pages

| Page | What it's for |
| --- | --- |
| `index.html` | The big screen. Start an event, show the tank and QR code, open host controls. |
| `scan.html` | What parents' phones open from the QR code. Photo, preview, send, and save a keepsake picture. |
| `sheet.html` | The printable coloring sheet (US Letter, landscape). |
| `home.html` | The original at-home version that saves sharks in one browser. |

## Running an event

1. Open `index.html` on a laptop connected to a projector or TV and tap **Start an event**.
2. Print `sheet.html` at 100% size and make copies. The 4 black corner squares are how the app finds the drawing, so don't trim them.
3. Kids color, parents scan the QR code. The screen holds 24 sharks at once. Extra sharks wait their turn and rotate in.
4. **Host** (bottom right, appears when you move the mouse) has:
   - **Scan station:** use the laptop's camera to scan sheets, for when phones can't connect.
   - **Upload a photo:** add a shark from a photo file.
   - **Remove a shark:** tap any shark to take it off the screen and delete it.
   - **End event:** every shark swims one last lap, then the QR code stops working and all drawings are deleted.

Phones can send one shark every 20 seconds. Only the cropped drawing is uploaded. The full photo never leaves the phone.

## Turn on phone scanning (about 10 minutes)

Until this is set up the app runs in **demo mode**: everything works on the laptop, but phones can't reach the screen.

1. Go to [console.firebase.google.com](https://console.firebase.google.com), click **Add project**, and name it `draw-jamboree` (the project ID can't be changed later, so keep it general rather than naming it after one world). Analytics can stay off.
2. **Build → Realtime Database → Create database.** Pick the US location and start in **locked mode**.
3. On the database's **Rules** tab, replace everything with the contents of `firebase-rules.json` and click **Publish**.
   - **Sharing the `bao-buddy` database with Bao Buddy, Lanterncorps, and Houses?** Use `firebase-rules-shared.json` instead. It keeps those apps' paths open as they are today and locks down only the shark events. Using `firebase-rules.json` there would cut those apps off. Export a backup first (**Data** tab → ⋮ → **Export JSON**). If you add another app to this database later, add its top-level path to the rules too.
4. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
5. In **Authentication → Settings → Authorized domains**, add `manueldrive.github.io` (or wherever the site is hosted).
6. **Project settings** (gear icon) **→ Your apps → Web (`</>`)**, register an app, and copy the `firebaseConfig` object.
7. Paste it into `config.js` as `firebase: { ... }`. Make sure it includes `databaseURL`.

Optional: set `bookingUrl` in `config.js` to show a "book this for your party" link on parents' phones after they send a shark.

### What the database rules enforce

- Only the laptop that started an event can remove sharks or end it.
- Phones can only add sharks while the event is open, only small JPEG images, and at most one every ~20 seconds per phone.
- Nobody can list other events, so a QR code only ever shows its own tank.

## Hosting

Turn on GitHub Pages (**Settings → Pages → Deploy from branch → `main` / root**). The screen will be at `https://manueldrive.github.io/test/`. The camera needs HTTPS, which Pages provides.

## Ideas for later

- **Paid safety check add-on:** an AI check of each drawing before it swims in, for public and teen events.
- More worlds, each with its own sheet and scene (dino valley, space station, bug garden), plus themed packs for VBS or holidays.
