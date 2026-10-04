import { CONFIG } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1000;

function project(latitude, longitude) { return { x: ((longitude + 180) / 360) * WORLD_WIDTH, y: ((90 - latitude) / 180) * WORLD_HEIGHT }; }
function createSvgElement(name, attributes = {}) { const element = document.createElementNS(SVG_NS, name); Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value)); return element; }

export function createMap(elementId) {
  const host = document.getElementById(elementId);
  const svg = createSvgElement('svg', { class: 'local-map-svg', viewBox: '0 0 2000 1000', role: 'img', 'aria-label': 'World map with NerdGigs jobs', preserveAspectRatio: 'xMidYMid meet' });
  const defs = createSvgElement('defs');
  const pattern = createSvgElement('pattern', { id: 'map-grid', width: '100', height: '100', patternUnits: 'userSpaceOnUse' });
  pattern.append(createSvgElement('path', { d: 'M 100 0 L 0 0 0 100', fill: 'none', stroke: '#d7e1df', 'stroke-width': '1' })); defs.append(pattern); svg.append(defs);
  svg.append(createSvgElement('rect', { class: 'local-map-ocean', x: '0', y: '0', width: WORLD_WIDTH, height: WORLD_HEIGHT }));
  const grid = createSvgElement('rect', { class: 'local-map-grid', x: '0', y: '0', width: WORLD_WIDTH, height: WORLD_HEIGHT, fill: 'url(#map-grid)' }); svg.append(grid);
  const land = createSvgElement('g', { class: 'local-map-land' }); svg.append(land);
  const markers = createSvgElement('g', { class: 'local-map-markers' }); svg.append(markers);
  host.replaceChildren(svg);

  fetch('./assets/world-map.svg', { cache: 'force-cache' }).then(response => response.text()).then(markup => { land.innerHTML = markup; }).catch(() => { land.innerHTML = '<text x="1000" y="500" text-anchor="middle" fill="#72807d">World map unavailable</text>'; });

  const view = { centerX: 1000, centerY: 500, scale: 1, minScale: 1, maxScale: 18 };
  const updateViewBox = () => { const rect = host.getBoundingClientRect(); const aspect = Math.max(rect.width / Math.max(rect.height, 1), 1); const width = WORLD_WIDTH / view.scale; const height = width / aspect; view.centerY = Math.max(height / 2, Math.min(WORLD_HEIGHT - height / 2, view.centerY)); view.centerX = Math.max(width / 2, Math.min(WORLD_WIDTH - width / 2, view.centerX)); svg.setAttribute('viewBox', `${view.centerX - width / 2} ${view.centerY - height / 2} ${width} ${height}`); };
  const zoomAt = (factor, clientX, clientY) => { const rect = host.getBoundingClientRect(); const oldWidth = WORLD_WIDTH / view.scale; const oldHeight = oldWidth / Math.max(rect.width / Math.max(rect.height, 1), 1); const mapX = view.centerX - oldWidth / 2 + ((clientX - rect.left) / rect.width) * oldWidth; const mapY = view.centerY - oldHeight / 2 + ((clientY - rect.top) / rect.height) * oldHeight; view.scale = Math.max(view.minScale, Math.min(view.maxScale, view.scale * factor)); const newWidth = WORLD_WIDTH / view.scale; const newHeight = newWidth / Math.max(rect.width / Math.max(rect.height, 1), 1); view.centerX = mapX - ((clientX - rect.left) / rect.width - 0.5) * newWidth; view.centerY = mapY - ((clientY - rect.top) / rect.height - 0.5) * newHeight; updateViewBox(); };

  let drag = null;
  svg.addEventListener('pointerdown', event => { if (event.target.closest('.local-map-marker, .local-map-controls')) return; drag = { id: event.pointerId, x: event.clientX, y: event.clientY, centerX: view.centerX, centerY: view.centerY }; svg.setPointerCapture(event.pointerId); });
  svg.addEventListener('pointermove', event => { if (!drag || drag.id !== event.pointerId) return; const rect = host.getBoundingClientRect(); const width = WORLD_WIDTH / view.scale; const aspect = Math.max(rect.width / Math.max(rect.height, 1), 1); const height = width / aspect; view.centerX = drag.centerX - ((event.clientX - drag.x) / rect.width) * width; view.centerY = drag.centerY - ((event.clientY - drag.y) / rect.height) * height; updateViewBox(); });
  svg.addEventListener('pointerup', event => { if (drag?.id === event.pointerId) drag = null; });
  svg.addEventListener('pointercancel', () => { drag = null; });
  svg.addEventListener('wheel', event => { event.preventDefault(); zoomAt(event.deltaY < 0 ? 1.25 : 0.8, event.clientX, event.clientY); }, { passive: false });
  const controls = document.createElement('div'); controls.className = 'local-map-controls'; const zoomIn = document.createElement('button'); zoomIn.type = 'button'; zoomIn.setAttribute('aria-label', 'Zoom in'); zoomIn.textContent = '+'; const zoomOut = document.createElement('button'); zoomOut.type = 'button'; zoomOut.setAttribute('aria-label', 'Zoom out'); zoomOut.textContent = '−'; controls.append(zoomIn, zoomOut); host.append(controls); zoomIn.addEventListener('click', () => zoomAt(1.5, host.getBoundingClientRect().left + host.clientWidth / 2, host.getBoundingClientRect().top + host.clientHeight / 2)); zoomOut.addEventListener('click', () => zoomAt(.67, host.getBoundingClientRect().left + host.clientWidth / 2, host.getBoundingClientRect().top + host.clientHeight / 2));
  const fit = () => { const rect = host.getBoundingClientRect(); view.minScale = Math.max(1, Math.min(2.2, rect.width > 1600 ? 1.15 : 1)); updateViewBox(); }; window.addEventListener('resize', fit, { passive: true }); fit();

  const map = { panTo: ([latitude, longitude]) => { const point = project(latitude, longitude); view.centerX = point.x; view.centerY = point.y; view.scale = Math.max(view.scale, 4); updateViewBox(); }, flyTo: ([latitude, longitude], zoom = 4) => { const point = project(latitude, longitude); const start = { x: view.centerX, y: view.centerY, scale: view.scale }; const targetScale = Math.max(view.minScale, Math.min(view.maxScale, 2 ** (zoom - 2))); const started = performance.now(); const animate = now => { const progress = Math.min(1, (now - started) / 450); const eased = 1 - (1 - progress) ** 3; view.centerX = start.x + (point.x - start.x) * eased; view.centerY = start.y + (point.y - start.y) * eased; view.scale = start.scale + (targetScale - start.scale) * eased; updateViewBox(); if (progress < 1) requestAnimationFrame(animate); }; requestAnimationFrame(animate); }, setView: ([latitude, longitude], zoom = 2) => { const point = project(latitude, longitude); view.centerX = point.x; view.centerY = point.y; view.scale = Math.max(view.minScale, Math.min(view.maxScale, 2 ** (zoom - 2))); updateViewBox(); }, getMinZoom: () => 2 };
  return { map, markers, cluster: { clearLayers() {} } };
}

export function renderMarkers(mapState, jobs, onSelect, onClusterSelect) {
  const markers = mapState.markers; markers.replaceChildren(); const groups = new Map(); const gridSize = 38 / Math.max(mapState.map.getMinZoom(), 1);
  jobs.filter(job => job.hasCoordinates && !job.remote).forEach(job => { const point = project(job.latitude, job.longitude); const key = `${Math.round(point.x / gridSize)}:${Math.round(point.y / gridSize)}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push({ job, point }); });
  groups.forEach(group => { const point = group[0].point; const marker = createSvgElement('g', { class: group.length > 1 ? 'local-map-marker local-cluster' : `local-map-marker local-pin local-pin-${group[0].job.workMode} ${group[0].job.geographicScope === 'approximate' ? 'local-pin-approximate' : ''}`, tabindex: '0', role: 'button' }); const size = group.length > 1 ? Math.min(27, 14 + Math.log2(group.length) * 4) : 8; let shape; if (group.length > 1 || group[0].job.workMode === 'hybrid') shape = createSvgElement('polygon', { points: `${point.x},${point.y - size} ${point.x + size},${point.y} ${point.x},${point.y + size} ${point.x - size},${point.y}` }); else if (group[0].job.workMode === 'onsite') shape = createSvgElement('rect', { x: point.x - size, y: point.y - size, width: size * 2, height: size * 2, rx: 3 }); else shape = createSvgElement('circle', { cx: point.x, cy: point.y, r: size }); marker.append(shape); if (group.length > 1) { const label = createSvgElement('text', { x: point.x, y: point.y + 5, 'text-anchor': 'middle' }); label.textContent = group.length; marker.append(label); } const title = createSvgElement('title'); title.textContent = group.length > 1 ? `${group.length} jobs` : `${group[0].job.title} at ${group[0].job.company}`; marker.append(title); marker.addEventListener('click', () => onSelect(group.map(item => item.job))); marker.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(group.map(item => item.job)); } }); markers.append(marker); });
}
