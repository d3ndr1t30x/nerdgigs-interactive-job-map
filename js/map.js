import { CONFIG } from './config.js';

export function createMap(elementId) {
  const map = L.map(elementId, {
    center: CONFIG.map.center,
    zoom: CONFIG.map.zoom,
    minZoom: CONFIG.map.minZoom,
    maxZoom: CONFIG.map.maxZoom,
    zoomControl: true,
    worldCopyJump: true,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    zoomSnap: 0.5,
    zoomDelta: 1,
    wheelDebounceTime: 40,
    wheelPxPerZoomLevel: 80,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    touchZoom: true,
    dragging: true,
  });

  const tiles = L.tileLayer(CONFIG.tiles.url, {
    attribution: CONFIG.tiles.attribution,
    maxZoom: CONFIG.map.maxZoom,
    maxNativeZoom: 19,
    updateWhenIdle: false,
    updateWhenZooming: true,
    keepBuffer: 4,
    reuseTiles: true,
  }).addTo(map);

  const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48, spiderfyOnMaxZoom: true, animate: true });
  cluster.addTo(map);

  // Leaflet needs an explicit size refresh when a responsive/flex layout has
  // finished settling. Without this, only newly panned tile regions appear.
  const refreshSize = () => map.invalidateSize({ pan: false, animate: false });
  map.whenReady(() => { refreshSize(); requestAnimationFrame(refreshSize); setTimeout(refreshSize, 250); });
  if (window.ResizeObserver) new ResizeObserver(refreshSize).observe(document.getElementById(elementId));
  window.addEventListener('resize', refreshSize, { passive: true });
  tiles.on('load', refreshSize);

  return { map, cluster };
}
export function renderMarkers(mapState, jobs, onSelect) { mapState.cluster.clearLayers(); jobs.filter(job => job.hasCoordinates).forEach(job => { const icon = L.divIcon({ className: 'job-pin', iconSize: [32, 32], iconAnchor: [16, 30], popupAnchor: [0, -28] }); const marker = L.marker([job.latitude, job.longitude], { icon, title: job.title, alt: `${job.title} at ${job.company}` }); marker.on('click', () => onSelect(job)); mapState.cluster.addLayer(marker); }); }
