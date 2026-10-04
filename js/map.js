import { CONFIG } from './config.js';

export function createMap(elementId) {
  const map = L.map(elementId, {
    center: CONFIG.map.center,
    zoom: CONFIG.map.zoom,
    minZoom: CONFIG.map.minZoom,
    maxZoom: CONFIG.map.maxZoom,
    maxBounds: CONFIG.map.bounds,
    maxBoundsViscosity: 1,
    zoomControl: true,
    worldCopyJump: false,
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
    noWrap: true,
    bounds: CONFIG.map.bounds,
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
  const fitSingleWorld = () => {
    refreshSize();
    const worldFitZoom = map.getBoundsZoom(CONFIG.map.bounds, false);
    if (Number.isFinite(worldFitZoom) && map.getMinZoom() !== worldFitZoom) map.setMinZoom(worldFitZoom);
    if (Number.isFinite(worldFitZoom) && map.getZoom() < worldFitZoom) map.setZoom(worldFitZoom, { animate: false });
  };
  map.whenReady(() => { fitSingleWorld(); requestAnimationFrame(fitSingleWorld); setTimeout(fitSingleWorld, 250); });
  if (window.ResizeObserver) new ResizeObserver(refreshSize).observe(document.getElementById(elementId));
  window.addEventListener('resize', fitSingleWorld, { passive: true });
  tiles.on('load', refreshSize);

  return { map, cluster };
}
export function renderMarkers(mapState, jobs, onSelect, onClusterSelect) {
  mapState.cluster.clearLayers();
  jobs.filter(job => job.hasCoordinates).forEach(job => {
    const icon = L.divIcon({ className: `job-pin job-pin-${job.workMode}`, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10] });
    const marker = L.marker([job.latitude, job.longitude], { icon, title: job.title, alt: `${job.title} at ${job.company}`, job });
    marker.on('click', () => onSelect([job]));
    mapState.cluster.addLayer(marker);
  });
  mapState.cluster.off('clusterclick');
  mapState.cluster.on('clusterclick', event => {
    const jobsInCluster = event.layer.getAllChildMarkers().map(marker => marker.options.job).filter(Boolean);
    onClusterSelect(jobsInCluster);
  });
}
