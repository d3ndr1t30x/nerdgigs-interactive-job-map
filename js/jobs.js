export async function loadJobs(url) { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error(`Could not load jobs (${response.status})`); const jobs = await response.json(); return jobs.map(normalizeJob); }
export function normalizeJob(job) { return { ...job, workMode: job.workMode || (job.remote ? 'remote' : 'onsite'), remote: Boolean(job.remote), latitude: Number.isFinite(job.latitude) ? job.latitude : null, longitude: Number.isFinite(job.longitude) ? job.longitude : null, hasCoordinates: Number.isFinite(job.latitude) && Number.isFinite(job.longitude) }; }
export function filterJobs(jobs, filters) {
  const keyword = (filters.keyword || '').trim().toLowerCase();
  return jobs.filter(job => {
    const modeMatches = filters.mode === 'all' ? (!job.remote || filters.includeRemote) : (job.workMode === filters.mode || (filters.includeRemote && job.remote));
    const keywordMatches = !keyword || [job.title, job.company, job.category, job.location].some(value => String(value || '').toLowerCase().includes(keyword));
    return modeMatches && keywordMatches && (filters.category === 'all' || job.category === filters.category) && (filters.employmentType === 'all' || job.employmentType === filters.employmentType);
  });
}
