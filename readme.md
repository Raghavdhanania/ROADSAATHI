# RoadSaathi

A mobile-first civic-tech prototype for documenting road issues (potholes, damaged roads, closures, construction) with a photo and GPS location. Built for the MY Bharat Hack for Social Cause, Governance & Civic Technology theme.

## Run locally

From inside the project folder:

```powershell
py -m http.server 8000
```

Open <http://localhost:8000>. Camera and location work on `localhost` after you grant permission.

**Testing on a phone:** browsers block camera and GPS on plain `http://192.168.x.x`. Deploy this folder to an HTTPS host (GitHub Pages, Netlify or Vercel) and open that link on the phone.

## Problem

People encountering potholes, damaged surfaces, road closures, or construction may not know which authority to contact or how to follow up. RoadSaathi explores a simpler way to record an issue with evidence and location.

## Prototype flow

1. Choose an issue type and add an optional note.
2. Take a photo or choose one (resized to 800 px wide before saving).
3. Tap "Use my location" to capture GPS coordinates.
4. Submit. The report appears in the Reports tab.

Use it while parked. Never operate it while driving.

## What is real and what is simulated

- Real: camera and photo capture, GPS capture, interactive map (Leaflet with OpenStreetMap tiles), on-device storage (IndexedDB), nearest-zone calculation.
- Simulated: authority routing. The app picks the nearest of 15 Greater Chennai Corporation zone centres using approximate coordinates in `zones.js`. Nothing is sent to GCC or any government system, and there is no server.

## Architecture

- `index.html`: report form and dashboard.
- `style.css`: responsive phone-first styles.
- `zones.js`: demo zone list, haversine distance, nearest-zone lookup.
- `app.js`: camera, geolocation, maps, image resizing, IndexedDB storage, dashboard rendering.

Maps use [Leaflet](https://leafletjs.com) and map data &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. An internet connection is needed for map tiles.

## Sample data

On the Reports tab, "Load sample reports" adds four labelled sample entries (no photos). Real reports come from the form.

## Roadmap (not built)

Automatic road-damage detection, in-vehicle capture mode, a shared backend, and integration with civic grievance systems. The classification, prioritization, duplicate detection ideas are future work.

## Team

- **Raghav Dhanania**: app development and integration (camera, GPS, maps, storage, zone routing).
- **Daivik Patel**: research, documentation and presentation.

## AI-tool disclosure

Generative AI was used to debug issues with the code, add comments for code understandability(verified by the team) and para-phrase documentation(verified by the team). 

## License

MIT. See `LICENSE.txt`.
