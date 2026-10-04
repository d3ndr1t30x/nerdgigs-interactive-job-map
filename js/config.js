export const CONFIG = {
  dataUrl: './data/jobs.json',
  map: { center: [25, 8], zoom: 2, minZoom: 2, maxZoom: 18 },
  tiles: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
  geocoder: { endpoint: 'https://nominatim.openstreetmap.org/search', countryCodes: '' }
};
