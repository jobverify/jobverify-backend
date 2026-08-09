import assert from 'node:assert/strict'
import test from 'node:test'

const officialCurrentOpeningsHtml = `
  <main>
    <h1>WORK WITH US</h1>
    <h2>We are looking for exceptional talent</h2>
    <p>If you are interested in embarking on a career at Sagacious then contact us at careers@sagaciousresearch.com.</p>

    <section>
      <p>Accounts Team</p>
      <h3>Senior Executive- Accounts Receivable</h3>
      <ul>
        <li>Gurugram (India)</li>
        <li>Full-Time from Office</li>
        <li>Experience: 2 -4 years</li>
      </ul>
      <a href="https://sagaciousresearch.com/apply/accounts-receivable">Apply Now</a>
    </section>

    <section>
      <p>Engineering Searching Team</p>
      <h3>Patent Analyst</h3>
      <ul>
        <li>Gurugram, Nagpur (India)</li>
        <li>Full-Time from Office</li>
        <li>Experience: 1 - 2 years</li>
      </ul>
      <a href="https://sagaciousresearch.com/apply/patent-analyst">Apply Now</a>
    </section>

    <section>
      <p>ICT Licensing Team</p>
      <h3>Project Manager</h3>
      <ul>
        <li>Gurugram, Nagpur, Bangalore (India)</li>
        <li>Hybrid/Remote; Full-time/Part-time</li>
        <li>Experience: 2 - 5 years</li>
      </ul>
      <a href="https://sagaciousresearch.com/apply/project-manager">Apply Now</a>
    </section>
  </main>
`

test('Sagacious Research maps official current openings cards into runner-ready records', async () => {
  const sagaciousResearch = await import('../../scraper/sagaciousresearch/script.js')
  const requestedUrls = []

  assert.equal(sagaciousResearch.hasOfficialCareersSignal(officialCurrentOpeningsHtml), true)

  const jobs = await sagaciousResearch.createSagaciousResearchScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCurrentOpeningsHtml
    },
  })

  assert.deepEqual(requestedUrls, [sagaciousResearch.CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Senior Executive- Accounts Receivable',
    'Patent Analyst',
    'Project Manager',
  ])
  assert.equal(jobs[0].company, 'Sagacious Research')
  assert.equal(jobs[0].department, 'Accounts Team')
  assert.equal(jobs[0].location, 'Gurugram, India')
  assert.equal(jobs[0].city, 'Gurugram')
  assert.equal(jobs[0].employmentType, 'Full-Time from Office')
  assert.equal(jobs[0].experienceRequired, '2 - 4 years')
  assert.equal(jobs[1].location, 'Gurugram, Nagpur, India')
  assert.equal(jobs[2].location, 'Gurugram, Nagpur, Bangalore, India')
  assert.equal(jobs[2].employmentType, 'Hybrid/Remote; Full-time/Part-time')
  assert.equal(jobs[2].experienceRequired, '2 - 5 years')
  assert.equal(jobs[2].applyUrl, 'https://sagaciousresearch.com/apply/project-manager')
  assert.equal(jobs[0].source, 'sagaciousresearch')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].jobId, /^sagaciousresearch-senior-executive-accounts-receivable-/)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Sagacious Research refuses to scrape when the official careers surface changes', async () => {
  const sagaciousResearch = await import('../../scraper/sagaciousresearch/script.js')

  await assert.rejects(
    sagaciousResearch.createSagaciousResearchScraper().run({
      fetchText: async () => '<html><body>Unrelated site</body></html>',
    }),
    /official careers surface/i,
  )
})
