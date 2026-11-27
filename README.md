# Nebojím se / I'm Not Scared — Hack jak Brno 2026, Challenge 05

A zero-install web app (PWA) that prepares children aged 3–13 and their parents for a blood test, ECG or ultrasound at FN Brno Children's Hospital.

## Run it

```bash
python3 -m http.server 5173
```
Open http://localhost:5173. No build step and no dependencies.

To demo on a real phone, deploy the folder to any static HTTPS host (GitHub Pages, Netlify, Vercel). Service workers only work over HTTPS or on localhost.

## QR code on the invitation letter

The URL can pre-select everything, so the parent only has to tap "Let's go":

```
https://<host>/?exam=blood&lang=cs&age=m
```
- `exam`: `blood` | `ecg` | `us`
- `lang`: `cs` | `sk` | `uk` | `en`
- `age`: `y` (3–5) | `m` (6–9) | `t` (10–13)

## User flow (matches the concept PDF)

| Step | Screen |
|---|---|
| 0 | QR → opens in the browser, all files cached for offline use (service worker) |
| 1 | Setup: language, exam, age group |
| 2 | Courage Thermometer BEFORE (5 emojis) |
| 3 | 360° tour: Entrance → Waiting room → exam room. Drag or use the gyroscope, tap the pulsing hotspots, 🔊 read-aloud, door arrow to the next room |
| 4 | "What will happen" 4-step comic for the child + "For parents" tab (preparation, helpful phrases, phrases to avoid, a tip for the child's age) |
| 5 | 3-question quiz with only warm feedback → "Super Explorer" certificate |
| 6 | Courage Thermometer AFTER → before/after comparison + summary card saved as a PNG (shared via the iOS/Android share sheet) |

## Files

- `content.js`: **all text**, in 4 languages × 3 age variants. Static and reviewable by the hospital, no AI at runtime.
- `panos.js`: the 360° rooms. They are currently drawn illustrations. To use real photos, add 4000×1000 panoramas to `/img`, set `PANO_PHOTOS.room = 'img/…jpg'`, and add them to `ASSETS` in `sw.js`. Hotspot x/y values in `content.js` use the same pixel space.
- `app.js`: screens, the panorama viewer (drag, inertia, gyroscope, wrap-around), speech, and the summary card.
- `sw.js`: offline cache.

## Privacy

There are no accounts, names or server calls. The only thing stored is local progress in `localStorage` on the phone: language, exam, age group, and the two emoji answers.

## Known MVP limits / next steps

- Replace the illustrations with real 360° photos of FN Brno (the hospital would need to supply or approve them).
- Read-aloud uses the phone's built-in voices. Slovak and Ukrainian voices aren't installed on every device. For production, record audio files and cache them.
- The Slovak and Ukrainian texts should be checked by native speakers, and all content reviewed by clinic staff.
- Optional: anonymous, opt-in aggregate of before/after scores for the hospital, to measure impact.
