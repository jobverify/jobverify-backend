import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  createDoctreenScraper,
  extractCareerJobs,
} from './script.js'

const careersHtml = `
  <main>
    <h1>Nous rejoindre</h1>
    <section>
      <h2>Nous recherchons activement ces profils</h2>
      <ul>
        <li>Developpeur Full Stack</li>
        <li>Ingenieur DevSecOps</li>
      </ul>
    </section>
    <section>
      <h2>Envie de rejoindre l'aventure Doctreen ?</h2>
      <p>J'envoie ma candidature</p>
    </section>
  </main>
`

test('extractCareerJobs maps Doctreen career roles from the official careers section', () => {
  assert.deepEqual(extractCareerJobs(careersHtml), [
    {
      title: 'Developpeur Full Stack',
      company: 'Doctreen',
      department: null,
      location: 'France',
      city: null,
      country: 'France',
      jobId: 'developpeur-full-stack',
      requisitionId: 'developpeur-full-stack',
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: CAREER_PAGE_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Ingenieur DevSecOps',
      company: 'Doctreen',
      department: null,
      location: 'France',
      city: null,
      country: 'France',
      jobId: 'ingenieur-devsecops',
      requisitionId: 'ingenieur-devsecops',
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: CAREER_PAGE_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('run validates the official Doctreen careers page shape before returning jobs', async () => {
  const scraper = createDoctreenScraper()
  const requests = []
  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requests, [CAREER_PAGE_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'doctreen')
  assert.equal(jobs[0].link, CAREER_PAGE_URL)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('rejects a Doctreen careers page without the expected openings section', () => {
  assert.throws(
    () => extractCareerJobs('<main><h1>Nous rejoindre</h1></main>'),
    /expected openings page shape/,
  )
})
