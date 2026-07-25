import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, '../grindwellnorton/fixtures')

const readFixture = async (name) => readFile(path.join(fixturesDir, name), 'utf8')

const loadGrindwellNortonModule = async () => {
  try {
    return await import('../grindwellnorton/script.js')
  } catch {
    assert.fail('Expected Grindwell Norton scraper module at ../grindwellnorton/script.js')
  }
}

test('Grindwell Norton validates the official homepage and exact Saint-Gobain Group in India LinkedIn handoff before returning no first-party listings', async () => {
  const grindwellNorton = await loadGrindwellNortonModule()
  const homepageHtml = await readFixture('homepage.html')
  const requestedUrls = []

  assert.equal(grindwellNorton.SOURCE, 'grindwellnorton')
  assert.equal(grindwellNorton.COMPANY, 'Grindwell Norton')
  assert.equal(grindwellNorton.HOMEPAGE_URL, 'https://www.grindwellnorton.co.in/')
  assert.equal(
    grindwellNorton.LINKEDIN_JOBS_URL,
    'https://www.linkedin.com/company/saint-gobain-group-india/jobs/?viewAsMember=true',
  )
  assert.equal(grindwellNorton.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(grindwellNorton.hasVerifiedLinkedInHandoff(homepageHtml), true)
  assert.equal(grindwellNorton.hasFirstPartyJobsSignal(homepageHtml), false)

  const jobs = await grindwellNorton.createGrindwellNortonScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === grindwellNorton.HOMEPAGE_URL) return homepageHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [grindwellNorton.HOMEPAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Grindwell Norton fails closed when the official homepage, LinkedIn handoff, or first-party jobs signal changes', async () => {
  const grindwellNorton = await loadGrindwellNortonModule()
  const homepageHtml = await readFixture('homepage.html')

  await assert.rejects(
    grindwellNorton.createGrindwellNortonScraper().run({
      fetchText: async () => '<html><head><title>Unexpected</title></head><body>No brand markers</body></html>',
    }),
    /Grindwell Norton official homepage changed/i,
  )

  await assert.rejects(
    grindwellNorton.createGrindwellNortonScraper().run({
      fetchText: async () => homepageHtml.replaceAll(
        'https://www.linkedin.com/company/saint-gobain-group-india/jobs/?viewAsMember=true',
        'https://www.linkedin.com/company/grindwell-norton/jobs/',
      ),
    }),
    /Grindwell Norton careers handoff changed/i,
  )

  await assert.rejects(
    grindwellNorton.createGrindwellNortonScraper().run({
      fetchText: async () => `${homepageHtml}
        <section>
          <h2>Current Openings</h2>
          <a href="/careers/process-engineer">Apply now</a>
        </section>`,
    }),
    /first-party public jobs surface/i,
  )
})
