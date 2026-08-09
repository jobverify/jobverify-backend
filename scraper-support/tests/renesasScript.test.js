import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = () => import('../../scraper/renesas/script.js')

const page = ({ page = 1, total = 2, jobs = [] } = {}) => `
  <div class="attrax-pagination__total-results">${total} result(s)</div>
  ${jobs.map((job) => `
    <div class="attrax-vacancy-tile" data-jobid="${job.id}">
      <a class="attrax-vacancy-tile__title" href="/job/${job.slug}">${job.title}</a>
      <div class="attrax-vacancy-tile__location-freetext"><p class="attrax-vacancy-tile__item-value">${job.location}</p></div>
      <div class="attrax-vacancy-tile__option-location"><p class="attrax-vacancy-tile__item-value">${job.city}</p></div>
      <div class="attrax-vacancy-tile__option-function"><p class="attrax-vacancy-tile__item-value">Engineering</p></div>
      <div class="attrax-vacancy-tile__option-type-of-employment"><p class="attrax-vacancy-tile__item-value">Full-time</p></div>
      <div class="attrax-vacancy-tile__option-remote"><p class="attrax-vacancy-tile__item-value">No</p></div>
      <div class="attrax-vacancy-tile__description-value">${job.description}</div>
    </div>
  `).join('')}
  <span data-page="${page}"></span>
`

test('Renesas parser extracts official India job cards', async () => {
  const scraper = await loadModule()
  const [job] = scraper.extractRenesasJobs(page({ jobs: [{
    id: '5997',
    slug: 'principal-engineer',
    title: 'Principal Software Engineer &amp; Test',
    location: 'Bengaluru, KA, India',
    city: 'Bengaluru',
    description: 'Build test automation with 10+ years of experience in embedded software validation.',
  }] }))

  assert.equal(job.title, 'Principal Software Engineer & Test')
  assert.equal(job.company, 'Renesas Electronics')
  assert.equal(job.city, 'Bengaluru')
  assert.equal(job.country, 'India')
  assert.equal(job.jobId, '5997')
  assert.equal(job.link, 'https://jobs.renesas.com/job/principal-engineer')
  assert.equal(job.department, 'Engineering')
  assert.equal(job.experienceRequired, '10+ years')
  assert.equal(job.publicExperienceChecked, true)
})

test('Renesas scraper paginates the official India result set and de-duplicates IDs', async () => {
  const scraper = await loadModule()
  const requested = []
  const responses = {
    1: page({ total: 3, jobs: [{ id: '1', slug: 'one', title: 'One', location: 'Bengaluru, KA, India', city: 'Bengaluru', description: 'One' }, { id: '2', slug: 'two', title: 'Two', location: 'Noida, UP, India', city: 'Noida', description: 'Two' }] }),
    2: page({ total: 3, jobs: [{ id: '2', slug: 'two', title: 'Two', location: 'Noida, UP, India', city: 'Noida', description: 'Two' }, { id: '3', slug: 'three', title: 'Three', location: 'Hyderabad, TS, India', city: 'Hyderabad', description: 'Three' }] }),
  }

  const jobs = await scraper.createRenesasScraper().run({
    fetchText: async (url) => {
      const pageNumber = Number(new URL(url).searchParams.get('page'))
      requested.push(pageNumber)
      return responses[pageNumber]
    },
  })

  assert.deepEqual(requested, [1, 2])
  assert.deepEqual(jobs.map((job) => job.jobId), ['1', '2', '3'])
})

test('Renesas exact CSV company name resolves through the isolated alias extension', async () => {
  const { buildCompanyLookup, getCompanyAliasMap, normalizeCompanyNameExact } = await import('../providers/companyCoverage.js')
  const aliases = getCompanyAliasMap()

  assert.equal(aliases['Renesas Electronics India'], 'renesas')
  assert.equal(normalizeCompanyNameExact('Renesas Electronics India'), 'renesas electronics india')
  assert.equal(buildCompanyLookup({
    catalog: [{ source: 'renesas', companyName: 'Renesas Electronics' }],
  }).get(normalizeCompanyNameExact('Renesas Electronics India')), 'renesas')
})
