import assert from 'node:assert/strict'
import test from 'node:test'
import { createTudipTechnologiesScraper } from '../scraper/tudiptechnologies/script.js'
import { createFlexsinTechnologiesScraper } from '../scraper/flexsintechnologies/script.js'
import { resolvePostScrapeClassification } from '../src/services/postScrapeClassification.js'

const tudipUrl = 'https://tudip.com/jobs/'
const flexsinUrl = 'https://www.flexsin.com/careers/'
const tudipRoles = [
  ['Graduate Engineering Trainee (Fresher)', 'graduate-engineering-trainee-fresher'],
  ['Data Analyst', 'data-analyst'],
]
const flexsinRoles = [['Fresher - BD & Sales', 'fresher-bd-sales'], ['Fresher - Content Writing', 'fresher-content-writing']]
const tudipListing = (roles = tudipRoles) => `<title>Current Job Openings at Tudip | Explore Your Career</title>
  <button class="category-btn active" data-category="india-en">India</button><ul>
  ${roles.map(([title, slug]) => `<li class="job_listing" data-category="india-en"><h3>${title}</h3>
  <a class="apply-btn" href="https://tudip.com/jobs/india/${slug}/">Apply</a></li>`).join('')}</ul>`
const flexsinListing = `<title>Career Opportunities</title><ul class="jobsList flexBox">
  ${flexsinRoles.map(([title, slug]) => `<li><a href="${flexsinUrl}${slug}/" class="inner"><div class="hd">${title}</div>
  <div class="info">Fresher</div><div class="info location">Noida</div></a></li>`).join('')}</ul>`
const detail = (title, url, tudip, body = 'Basic technical knowledge and willingness to learn.') => ({ status: 200, url,
  html: `<link rel="canonical" href="${url}"><nav>Minimum 15 years of professional experience required.</nav>
    <h1>${title}</h1><h3>About Company</h3><p>Our company has 20 years of experience.</p>
    <h3>${tudip ? 'Position Summary' : 'Job Description:'}</h3>
    <p>Build and test applications and collaborate with the project team to deliver useful customer services.</p>
    <h4>Requirements:</h4><p>${body}</p><form><label>Required experience: 9 years</label><input></form>` })
const prediction = { modelLabel: 'Full-time Experienced', fullDescriptionCovered: true, windows: 1,
  scores: { 'Full-time Experienced': .97, 'Full-time Fresher': .01, Intern: .01, Contract: .01 } }

for (const [name, create, listingUrl, listing, roles, isTudip] of [
  ['Tudip', createTudipTechnologiesScraper, tudipUrl, tudipListing(), tudipRoles, true],
  ['Flexsin', createFlexsinTechnologiesScraper, flexsinUrl, flexsinListing, flexsinRoles, false],
]) {
  const roleUrl = slug => isTudip ? `https://tudip.com/jobs/india/${slug}/` : `${flexsinUrl}${slug}/`

  test(`${name} saves full matching role content before classification instead of title captions or page chrome`, async () => {
    const pages = new Map(roles.map(([title, slug]) => [roleUrl(slug), detail(title, roleUrl(slug), isTudip)]))
    const jobs = await create().run({ fetchText: async url => {
      if (url === listingUrl) return listing
      if (!pages.has(url)) throw new Error('Unexpected detail URL')
      return pages.get(url)
    } })
    assert.equal(jobs.length, 2)
    assert.deepEqual(jobs.map(job => job.title), roles.map(([title]) => title))
    for (const job of jobs) {
      assert.match(job.sourceDescription, /Build and test applications/)
      assert.match(job.jobDescription, /Basic technical knowledge/)
      assert.doesNotMatch(job.sourceDescription, /15 years|20 years|9 years/)
    }
    const fresher = resolvePostScrapeClassification(jobs[0], prediction, { mode: 'policy', now: new Date('2026-11-04T00:00:00Z') })
    assert.equal(fresher.resolved.jobType, 'Full-time Fresher')
    assert.deepEqual(fresher.reviewReasons, [])
  })

  test(`${name} retains jobs with explicitly missing descriptions when detail retrieval fails or redirects`, async () => {
    const jobs = await create().run({ fetchText: async url => {
      if (url === listingUrl) return listing
      if (url === roleUrl(roles[0][1])) throw new Error('Detail unavailable')
      return detail(roles[1][0], listingUrl, isTudip)
    } })
    assert.equal(jobs.length, 2)
    for (const job of jobs) {
      assert.equal(job.sourceDescription, null)
      assert.equal(job.jobDescription, null)
      assert.ok(job.applyUrl.startsWith(listingUrl))
    }
  })

  test(`${name} refuses to claim source identity from injected text without response metadata`, async () => {
    const jobs = await create().run({ fetchText: async url => url === listingUrl ? listing
      : detail(roles[0][0], url, isTudip).html })
    assert.equal(jobs.length, 2)
    assert.equal(jobs[0].sourceDescription, null)
    assert.equal(jobs[0].jobDescription, null)
  })

  test(`${name} preserves explicit experience requirements from the actual role`, async () => {
    const jobs = await create().run({ fetchText: async url => url === listingUrl ? listing
      : detail(roles[0][0], url, isTudip, 'Minimum 3 years of professional experience required.') })
    assert.match(jobs[0].sourceDescription, /Minimum 3 years/)
    const result = resolvePostScrapeClassification(jobs[0], prediction, { mode: 'policy' })
    assert.equal(result.resolved.jobType, 'Unspecified')
    assert.ok(result.reviewReasons.includes('conflicting_role_eligibility'))
  })

  test(`${name} propagates caller cancellation during detail capture`, async () => {
    const controller = new AbortController()
    const reason = new Error('Caller stopped description capture')
    await assert.rejects(create().run({ signal: controller.signal, fetchText: async url => {
      if (url === listingUrl) return listing
      controller.abort(reason)
      throw reason
    } }), error => error === reason)
  })
}

test('Tudip detail capture uses bounded concurrency while preserving listing order', async () => {
  const roles = Array.from({ length: 9 }, (_, i) => [`Engineer ${i}`, `engineer-${i}`])
  let active = 0, peak = 0
  const jobs = await createTudipTechnologiesScraper().run({ fetchText: async url => {
    if (url === tudipUrl) return tudipListing(roles)
    active++
    peak = Math.max(active, peak)
    await new Promise(resolve => setImmediate(resolve))
    active--
    const index = Number(url.match(/engineer-(\d+)/)[1])
    return detail(`Engineer ${index}`, url, true)
  } })
  assert.deepEqual(jobs.map(job => job.title), roles.map(([title]) => title))
  assert.ok(jobs.every(job => /Build and test/.test(job.sourceDescription)))
  assert.ok(peak >= 2 && peak <= 4, `Expected 2–4 concurrent detail requests, observed ${peak}`)
})

test('Tudip refuses India cards pointing outside the trusted role surface', async () => {
  for (const target of ['https://other.example/jobs/india/graduate-engineering-trainee-fresher/',
    'https://tudip.com/jobs/argentina/graduate-engineering-trainee-fresher/',
    'https://user:password@tudip.com/jobs/india/graduate-engineering-trainee-fresher/']) {
    const html = tudipListing().replace('https://tudip.com/jobs/india/graduate-engineering-trainee-fresher/', target)
    await assert.rejects(createTudipTechnologiesScraper().run({ fetchText: async () => html }), /trusted.*role|role.*identity/i)
  }
})
