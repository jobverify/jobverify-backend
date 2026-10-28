// Synthetic future inventories exercise runtime behavior; these are not current job evidence.
export const futureJob = (overrides = {}) => ({
  id: '11111111-1111-4111-8111-111111111111', text: 'Synthetic future contract engineer',
  country: 'IN', categories: { location: 'Bengaluru, India', allLocations: ['Bengaluru, India'], commitment: 'Full-time', department: 'Product', team: 'Engineering' },
  workplaceType: 'remote', createdAt: 1793059200000,
  description: '<p>Build contract systems.</p>', descriptionPlain: 'Build contract systems.',
  lists: [{ text: 'Responsibilities', content: '<ul><li>Design secure services.</li></ul>' }],
  additional: '<p>Equal opportunity employer.</p>', additionalPlain: 'Equal opportunity employer.',
  ...overrides,
  hostedUrl: `https://jobs.lever.co/agiloft/${overrides.id || '11111111-1111-4111-8111-111111111111'}`,
  applyUrl: `https://jobs.lever.co/agiloft/${overrides.id || '11111111-1111-4111-8111-111111111111'}/apply`,
})
export const futureCareers = '<title>Agiloft Careers</title><h1>Level Up With Us</h1><a href="https://jobs.lever.co/agiloft">Open roles</a>'
export const futureBoard = jobs => `<a class="main-header-logo" href="https://jobs.lever.co/agiloft"><img alt="Agiloft logo"></a>${jobs.length ? jobs.map(j => `<a href="${j.hostedUrl}">${j.text}</a>`).join('') : '<p>No open positions</p>'}`
export const futureDetail = (job, schemaOverrides = {}) => {
  const schema = { '@type': 'JobPosting', title: job.text, hiringOrganization: { name: 'Agiloft' }, datePosted: '2026-10-27',
    description: `${job.description}<h3>Responsibilities</h3>${job.lists[0].content}${job.additional}`, ...schemaOverrides }
  return `<div class="content"><div class="section page-centered posting-header"><div class="posting-headline"><h2>${job.text}</h2><div class="location">${job.categories.location}</div></div><a href="${job.applyUrl}">Apply for this job</a></div><div class="section page-centered" data-qa="job-description">${job.description}</div><div class="section page-centered"><h3>Responsibilities</h3>${job.lists[0].content}</div><div class="section page-centered" data-qa="closing-description">${job.additional}</div><div class="section page-centered" data-qa="ai-disclaimer">Synthetic visible AI recruiting notice.</div></div><script type="application/ld+json">${JSON.stringify(schema)}</script>`
}
