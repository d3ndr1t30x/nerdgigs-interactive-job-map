# NerdGigs Interactive Job Map

A small, static, map-first companion to [NerdGigs](https://www.nerdgigs.com/). It loads normalized job records from `data/jobs.json`, maps location-bound jobs, keeps remote roles in a separate “Remote, anywhere” list, and links every preview back to its canonical NerdGigs listing. The UI uses a violet accent palette to match the updated NerdGigs visual direction.

## Run locally

Because browsers block `fetch()` from `file://` pages, serve the folder with any static server. For example, from the project root:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. The browser loads a bundled SVG world map and a bundled city-search index. No map tile, map JavaScript, or geocoding API is requested at runtime.

## Project map

- `index.html` — semantic shell and controls.
- `css/styles.css` — NerdGigs-matching design tokens and responsive UI.
- `js/app.js` — state, UI events, filtering, and rendering orchestration.
- `js/jobs.js` — data loading, normalization, and filtering.
- `js/map.js` — local SVG map, pan/zoom, and marker-cluster rendering.
- `js/search.js` — bundled city/capital search index.
- `js/config.js` — data and map configuration.
- `assets/world-map.svg` — bundled world silhouette used by the map.
- `js/services/location-data.js` — future relocation-data boundary.
- `data/jobs.json` — local mock normalized feed.

## Mock data and feed integration

`data/jobs.json` is intentionally shaped like the frontend's long-term contract. Add fields to each record, normalize them in `js/jobs.js`, and render them in the preview in `js/app.js` as needed. Jobs without numeric `latitude` and `longitude` are treated as non-mappable (useful for “Anywhere in the World” roles).

The repository includes `.github/workflows/sync-feed.yml`. Once GitHub Actions is enabled, it fetches `https://www.nerdgigs.com/jobs.rss` hourly, falls back to `https://www.nerdgigs.com/jobs.xml`, normalizes the items with `scripts/sync-feed.py`, and commits updated `data/jobs.json`. GitHub Pages then serves the latest committed data without requiring the browser to bypass CORS. Run it immediately with **Actions → Sync NerdGigs feed → Run workflow**.

Markers pulse by work mode: red/square is on-site and purple/diamond is hybrid; approximate locations use a dashed outline. Remote roles are deliberately not pinned to an arbitrary city and are shown in the separate “Remote, anywhere” list. When a location-bound feed item names a city, country, or region but does not provide coordinates, the sync assigns a stable, small offset near that location's capital/city without suggesting an exact address.

The browser should not fetch NerdGigs RSS/XML directly: the current feed does not expose browser CORS headers. The included GitHub Action is the recommended static-site sync. Other valid options are:

1. Have the existing NerdGigs importer periodically generate this JSON file.
2. Use a Cloudflare Worker to fetch and transform RSS/XML server-side, then publish JSON.
3. Run another scheduled server-side XML → JSON process and deploy its output.

Replace `CONFIG.dataUrl` in `js/config.js` when the normalized feed has a new location. Do not put private feed credentials in this repository.

## GitHub Pages and custom domain

1. Push the project to a GitHub repository.
2. In **Settings → Pages**, select **Deploy from a branch**, the repository's default branch, and `/ (root)`.
3. The static site will be available at the generated Pages URL.
4. To use `map.nerdgigs.com`, add a `CNAME` file containing `map.nerdgigs.com`, configure the DNS provider with the GitHub Pages records GitHub provides, and set the custom domain in **Settings → Pages**. Enable HTTPS after DNS verification.

If the app is published under a repository subpath, keep data and module URLs relative as they are now; this makes both root-domain and project-page hosting work.

## External services and licensing

- The map has no runtime map-tile, map-library, or geocoding dependency. Its bundled SVG is a deliberately lightweight world silhouette, not a street-level navigation map.
- The only external data connection is the server-side GitHub Action that polls NerdGigs RSS/XML hourly and commits `data/jobs.json`.
- Job links point to NerdGigs and are mock examples until replaced by the real normalized feed.
