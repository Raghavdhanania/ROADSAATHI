# RoadSathi

A mobile-first civic-tech prototype for documenting road issues (potholes, damaged roads, closures, construction) with a photo and GPS location. Built for the MY Bharat Hack for Social Cause, Governance & Civic Technology theme.

## Run locally

```powershell
cd RoadSathi
py -m http.server 8000
```

Open <http://localhost:8000>. Camera and location work on `localhost` after you grant permission.

**Testing on a phone:** browsers block camera and GPS on plain `http://192.168.x.x`. Deploy this folder to an HTTPS host (GitHub Pages, Netlify or Vercel) and open that link on the phone.

## Prototype flow

1. Choose an issue type and add an optional note.
2. Take a photo or choose one (resized to 800 px wide before saving).
3. Tap "Use my location" to capture GPS coordinates.
4. Submit. The report appears in the Reports tab.

Use it while parked. Never operate it while driving.

## What is real and what is simulated

- Real: camera and photo capture, GPS capture, on-device storage (IndexedDB), nearest-zone calculation.
- Simulated: authority routing. The app picks the nearest of 15 Greater Chennai Corporation zone centres using approximate coordinates in `zones.js`. Nothing is sent to GCC or any government system, and there is no server.

## Architecture

- `index.html`: report form and dashboard.
- `style.css`: responsive phone-first styles.
- `zones.js`: demo zone list, haversine distance, nearest-zone lookup.
- `app.js`: camera, geolocation, image resizing, IndexedDB storage, dashboard rendering.

## Sample data

On the Reports tab, "Load sample reports" adds four labelled sample entries (no photos). Real reports come from the form.

## Roadmap (not built)

Automatic road-damage detection, in-vehicle capture mode, a shared backend, and integration with civic grievance systems.

## AI-tool disclosure

Parts of this project were written with AI assistance (ChatGPT and Claude). Update this section with the team's actual use and an honest estimate of the share before submission.

## License

MIT. See `LICENSE`.