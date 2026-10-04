import { CONFIG } from './config.js';
import { loadJobs, filterJobs } from './jobs.js';
import { geocodeLocation } from './search.js';
import { createMap, renderMarkers } from './map.js';

const state = { jobs: [], filters: { mode: 'all', includeRemote: true, category: 'all', employmentType: 'all', keyword: '' }, selectedJobs: [], sort: 'relevance' };
const els = {
  summary: document.querySelector('#result-summary'), category: document.querySelector('#category-filter'), employment: document.querySelector('#employment-filter'),
  preview: document.querySelector('#job-preview'), previewContent: document.querySelector('#preview-content'), previewCount: document.querySelector('#preview-result-count'), previewSort: document.querySelector('#preview-sort'),
  location: document.querySelector('#location-query'), keyword: document.querySelector('#keyword-query'), searchStatus: document.querySelector('#search-status'), searchButton: document.querySelector('.search-button'),
  includeRemote: document.querySelector('#include-remote'), remoteButton: document.querySelector('#show-remote-results'), remoteButtonCount: document.querySelector('#remote-button-count'), remoteResults: document.querySelector('#remote-results'), remoteCount: document.querySelector('#remote-results-count'), remoteList: document.querySelector('#remote-results-list')
};
const mapState = createMap('map');

function modeLabel(mode) { return mode === 'onsite' ? 'On-site' : mode.charAt(0).toUpperCase() + mode.slice(1); }
function visibleJobs() { return filterJobs(state.jobs, state.filters); }
function matchingRemoteJobs() { return filterJobs(state.jobs, { ...state.filters, mode: 'all', includeRemote: true }).filter(job => job.remote); }
function mapJobs(jobs) { return jobs.filter(job => !job.remote && job.hasCoordinates); }
function updateSummary(jobs) { const mapped = mapJobs(jobs).length; const remote = jobs.filter(job => job.remote).length; els.summary.textContent = `${mapped} mapped job${mapped === 1 ? '' : 's'}${remote ? ` · ${remote} remote roles` : ''}`; els.remoteButtonCount.textContent = remote ? `(${remote})` : ''; }
function populateSelect(select, values, label) { select.replaceChildren(new Option(`All ${label}`, 'all')); values.sort((a, b) => a.value.localeCompare(b.value)).forEach(({ value, count }) => select.append(new Option(`${value} (${count})`, value))); }
function optionCounts(key) { const counts = new Map(); state.jobs.forEach(job => counts.set(job[key], (counts.get(job[key]) || 0) + 1)); return [...counts].map(([value, count]) => ({ value, count })); }
function render() { const jobs = visibleJobs(); renderMarkers(mapState, jobs, selectJobs, selectJobs); updateSummary(jobs); if (!els.remoteResults.hidden) renderRemoteResults(); }

function sortedJobs(jobs) { return [...jobs].sort((a, b) => state.sort === 'title' ? a.title.localeCompare(b.title) : state.sort === 'company' ? a.company.localeCompare(b.company) : 0); }
function addDetail(details, label, value) { if (!value || value === 'Not listed') return; const row = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; row.append(dt, dd); details.append(row); }
function jobCard(job, compact = false) {
  const card = document.createElement('article'); card.className = `preview-job-card ${compact ? 'compact-job-card' : ''}`; card.tabIndex = 0;
  const kicker = document.createElement('p'); kicker.className = 'preview-kicker'; kicker.textContent = `${modeLabel(job.workMode)} · ${job.category}`;
  const title = document.createElement('h2'); title.textContent = job.title;
  const company = document.createElement('p'); company.className = 'preview-company'; company.textContent = job.company;
  const details = document.createElement('dl'); details.className = 'preview-details'; addDetail(details, 'Location', job.location); addDetail(details, 'Type', job.employmentType); addDetail(details, 'Salary', job.salary);
  const link = document.createElement('a'); link.className = 'view-job'; link.href = job.url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'View ↗';
  card.append(kicker, title, company, details, link);
  const open = () => window.open(job.url, '_blank', 'noopener'); card.addEventListener('click', event => { if (!event.target.closest('a')) open(); }); card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  return card;
}
function selectJobs(jobs) { if (!jobs.length) return; state.selectedJobs = jobs; els.preview.hidden = false; els.previewCount.textContent = `${jobs.length} job${jobs.length === 1 ? '' : 's'}${jobs.length > 1 ? ' in this cluster' : ''}`; renderPreviewJobs(); if (jobs.length === 1) mapState.map.panTo([jobs[0].latitude, jobs[0].longitude], { animate: true }); }
function renderPreviewJobs() { els.previewContent.replaceChildren(...sortedJobs(state.selectedJobs).map(job => jobCard(job))); }
function renderRemoteResults() { const jobs = sortedJobs(matchingRemoteJobs()); els.remoteCount.textContent = `${jobs.length} remote role${jobs.length === 1 ? '' : 's'} · Remote roles are not pinned to a city.`; els.remoteList.replaceChildren(...jobs.map(job => jobCard(job, true))); }
function setActive(button) { document.querySelectorAll('.filter-chip[data-mode]').forEach(chip => { const active = chip === button; chip.classList.toggle('is-active', active); chip.setAttribute('aria-pressed', String(active)); }); }
function distanceKm(a, b) { const radians = degrees => degrees * Math.PI / 180; const dLat = radians(a.lat - b.lat); const dLon = radians(a.lon - b.lon); const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); }

document.querySelectorAll('.filter-chip[data-mode]').forEach(button => button.addEventListener('click', () => { state.filters.mode = button.dataset.mode; setActive(button); render(); }));
els.includeRemote.addEventListener('change', () => { state.filters.includeRemote = els.includeRemote.checked; render(); });
els.category.addEventListener('change', () => { state.filters.category = els.category.value; render(); });
els.employment.addEventListener('change', () => { state.filters.employmentType = els.employment.value; render(); });
els.previewSort.addEventListener('change', () => { state.sort = els.previewSort.value; renderPreviewJobs(); if (!els.remoteResults.hidden) renderRemoteResults(); });
document.querySelector('#more-filters').addEventListener('click', event => { const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true'; event.currentTarget.setAttribute('aria-expanded', String(!expanded)); document.querySelector('#advanced-filters').hidden = expanded; });
document.querySelector('#preview-close').addEventListener('click', () => { els.preview.hidden = true; });
document.querySelector('#show-remote-results').addEventListener('click', () => { els.remoteResults.hidden = false; renderRemoteResults(); });
document.querySelector('#close-remote-results').addEventListener('click', () => { els.remoteResults.hidden = true; });
document.querySelector('#reset-view').addEventListener('click', () => { els.preview.hidden = true; mapState.map.setView(CONFIG.map.center, mapState.map.getMinZoom()); });

document.querySelector('#location-search').addEventListener('submit', async event => {
  event.preventDefault(); const locationQuery = els.location.value.trim(); const keyword = els.keyword.value.trim(); state.filters.keyword = keyword; render();
  if (!locationQuery) { els.searchStatus.textContent = keyword ? `${visibleJobs().length} jobs match “${keyword}”.` : ''; return; }
  els.searchButton.disabled = true; els.searchButton.textContent = 'Searching…'; els.searchStatus.textContent = `Finding ${locationQuery}…`;
  try {
    const result = await geocodeLocation(locationQuery); mapState.map.flyTo([result.lat, result.lon], 11);
    const nearby = visibleJobs().filter(job => !job.remote && job.hasCoordinates && distanceKm({ lat: job.latitude, lon: job.longitude }, result) <= 300);
    els.searchStatus.textContent = nearby.length ? `${nearby.length} mapped job${nearby.length === 1 ? '' : 's'} within 300 km of ${result.label}. Remote roles are listed separately.` : `No mapped jobs in ${locationQuery}. ${matchingRemoteJobs().length} remote roles are listed separately.`;
  } catch (error) { els.searchStatus.textContent = error.message || `No location found for “${locationQuery}”.`; }
  finally { els.searchButton.disabled = false; els.searchButton.textContent = 'Search'; }
});

loadJobs(CONFIG.dataUrl).then(jobs => { state.jobs = jobs; populateSelect(els.category, optionCounts('category'), 'categories'); populateSelect(els.employment, optionCounts('employmentType'), 'job types'); render(); }).catch(error => { els.summary.textContent = 'Jobs could not be loaded'; els.searchStatus.textContent = error.message; console.error(error); });
