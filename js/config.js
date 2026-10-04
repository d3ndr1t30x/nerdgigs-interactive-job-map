export const CONFIG = {
  dataUrl: './data/jobs.json',
  feedUrl: 'https://www.nerdgigs.com/jobs.rss',
  feedFallbackUrl: 'https://www.nerdgigs.com/jobs.xml',
  dataSource: 'GitHub Actions RSS/XML sync → data/jobs.json',
  map: { center: [25, 8], zoom: 2, minZoom: 2, maxZoom: 18, bounds: [[-85, -180], [85, 180]] },
  tiles: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors, &copy; CARTO', subdomains: 'abcd' },
  geocoder: { endpoint: 'https://nominatim.openstreetmap.org/search', countryCodes: '' }
};
