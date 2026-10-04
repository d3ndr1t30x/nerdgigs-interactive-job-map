import { CONFIG } from './config.js';
import { loadJobs, filterJobs } from './jobs.js';
import { geocodeLocation } from './search.js';
import { createMap, renderMarkers } from './map.js';

const state = { jobs: [], filters: { mode: 'all', category: 'all', employmentType: 'all' } };
const els = { summary: document.querySelector('#result-summary'), globalCount: document.querySelector('#global-count'), category: document.querySelector('#category-filter'), employment: document.querySelector('#employment-filter'), preview: document.querySelector('#job-preview'), previewMode: document.querySelector('#preview-mode'), previewTitle: document.querySelector('#preview-title'), previewCompany: document.querySelector('#preview-company'), previewLocation: document.querySelector('#preview-location'), previewMeta: document.querySelector('#preview-meta'), previewLink: document.querySelector('#preview-link') };
const mapState = createMap('map');

function modeLabel(mode) { return mode === 'onsite' ? 'On-site' : mode.charAt(0).toUpperCase() + mode.slice(1); }
function updateSummary(jobs) { const mapped = jobs.filter(job => job.hasCoordinates).length; const global = jobs.filter(job => !job.hasCoordinates).length; els.summary.textContent = `${mapped} mapped job${mapped === 1 ? '' : 's'}${global ? ` · ${global} global remote` : ''}`; els.globalCount.textContent = `${global} global remote`; }
function populateSelect(select, values) { values.sort().forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); }); }
function render() { const visible = filterJobs(state.jobs, state.filters); renderMarkers(mapState, visible, selectJob); updateSummary(visible); }
function selectJob(job) { els.preview.hidden = false; els.previewMode.textContent = `${modeLabel(job.workMode)} · ${job.category}`; els.previewTitle.textContent = job.title; els.previewCompany.textContent = job.company; els.previewLocation.textContent = job.location; els.previewMeta.textContent = `${job.salary} · ${job.employmentType}`; els.previewLink.href = job.url; if (job.hasCoordinates) mapState.map.panTo([job.latitude, job.longitude], { animate: true }); }
function setActive(button) { document.querySelectorAll('.filter-chip[data-mode]').forEach(chip => { const active = chip === button; chip.classList.toggle('is-active', active); chip.setAttribute('aria-pressed', String(active)); }); }

document.querySelectorAll('.filter-chip[data-mode]').forEach(button => button.addEventListener('click', () => { state.filters.mode = button.dataset.mode; setActive(button); render(); }));
els.category.addEventListener('change', () => { state.filters.category = els.category.value; render(); });
els.employment.addEventListener('change', () => { state.filters.employmentType = els.employment.value; render(); });
document.querySelector('#more-filters').addEventListener('click', event => { const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true'; event.currentTarget.setAttribute('aria-expanded', String(!expanded)); document.querySelector('#advanced-filters').hidden = expanded; });
document.querySelector('#preview-close').addEventListener('click', () => { els.preview.hidden = true; });
document.querySelector('#reset-view').addEventListener('click', () => { mapState.map.setView(CONFIG.map.center, CONFIG.map.zoom); });
document.querySelector('#location-search').addEventListener('submit', async event => { event.preventDefault(); const input = document.querySelector('#location-query'); const button = event.currentTarget.querySelector('button'); const query = input.value.trim(); if (!query) return; button.disabled = true; button.textContent = 'Finding…'; try { const result = await geocodeLocation(query); mapState.map.flyTo([result.lat, result.lon], 11); input.setAttribute('aria-label', `Location search. Showing ${result.label}`); } catch (error) { input.setCustomValidity(error.message); input.reportValidity(); setTimeout(() => input.setCustomValidity(''), 3000); } finally { button.disabled = false; button.textContent = 'Search'; } });

loadJobs(CONFIG.dataUrl).then(jobs => { state.jobs = jobs; populateSelect(els.category, [...new Set(jobs.map(job => job.category))]); populateSelect(els.employment, [...new Set(jobs.map(job => job.employmentType))]); render(); }).catch(error => { els.summary.textContent = 'Jobs could not be loaded'; console.error(error); });
