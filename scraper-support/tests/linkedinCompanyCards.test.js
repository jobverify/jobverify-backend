import assert from 'node:assert/strict'
import test from 'node:test'

const sources = ['abinbevgccindia', 'actaai', 'altenindia', 'ami', 'anaptycodeemy', 'arms4ai', 'bootlabstechnologies', 'convinai', 'snapdeal', 'superagi', 'trell', 'vedantu', 'werize']
const card = ({ id = '222', company = 'Example', dateClass = 'job-search-card__listdate--new', complete = true } = {}) => `<div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:${id}"><a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/${id}">View</a>${complete ? `<h3 class="base-search-card__title">Software &amp; Platform Engineer</h3><h4 class="base-search-card__subtitle"><a>${company}</a></h4><span class="job-search-card__location">Bengaluru, India</span><time class="${dateClass}" datetime="2026-10-28">Today</time>` : ''}</div>`

for (const source of sources) {
  const module = await import(`../../scraper/${source}/script.js`)
  const extract = module.extractSearchResults || module.extractIndiaJobListings
  const company = module.OFFICIAL_BRAND_NAME || module.COMPANY || 'Example'
  test(`${source} preserves native dates on current LinkedIn new-date cards`, () => {
    const jobs = extract('<html><body>' + card({ company }) + '</body></html>')
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].jobId, '222')
    assert.equal(jobs[0].postingDate, '2026-10-28')
    assert.equal(jobs[0].title, 'Software & Platform Engineer')
  })
  test(`${source} never borrows a later card's title, employer, location or date`, () => {
    const html = '<html><body>' + card({ id: '111', complete: false }) + card({ company, dateClass: 'job-search-card__listdate' }) + '</body></html>'
    const jobs = extract(html)
    assert.deepEqual(jobs.map(job => job.jobId), ['222'])
    assert.equal(jobs[0].sourceUrl, 'https://www.linkedin.com/jobs/view/222')
  })
}
