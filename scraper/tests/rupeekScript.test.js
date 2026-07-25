import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join our team | Rupeek | Careers</title>
    <link rel="canonical" href="https://rupeek.com/careers" />
  </head>
  <body>
    <section>
      <h2>Why join Us?</h2>
      <h2>Engineering at Rupeek</h2>
      <div>Open Positions</div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 mt-7 text-left">
        <a href="https://www.linkedin.com/jobs/view/assistant-manager-taxation-at-rupeek-4440699084" target="_blank">
          <div>
            <p>Assistant Manager - Taxation</p>
            <p>Location: Bengaluru, Karnataka, India</p>
            <p>13 hours ago</p>
          </div>
        </a>
        <a href="https://www.linkedin.com/jobs/view/back-office-executive-at-rupeek-4437967359" target="_blank">
          <div>
            <p>Back Office Executive</p>
            <p>Location: Greater Bengaluru Area</p>
            <p>6 days ago</p>
          </div>
        </a>
        <a href="https://www.linkedin.com/jobs/view/growth-manager-at-rupeek-9999999999" target="_blank">
          <div>
            <p>Growth Manager</p>
            <p>Location: Singapore</p>
            <p>1 day ago</p>
          </div>
        </a>
      </div>
    </section>
  </body>
</html>
`

const loadRupeekModule = async () => {
  try {
    return await import('../rupeek/script.js')
  } catch {
    assert.fail('Expected Rupeek scraper module at ../rupeek/script.js')
  }
}

test('Rupeek helpers stay pinned to the verified official careers page structure', async () => {
  const rupeek = await loadRupeekModule()

  assert.equal(rupeek.SOURCE, 'rupeek')
  assert.equal(rupeek.COMPANY_NAME, 'Rupeek')
  assert.equal(rupeek.OFFICIAL_BRAND_NAME, 'Rupeek')
  assert.equal(rupeek.VERIFIED_ON, '2026-07-17')
  assert.equal(rupeek.OFFICIAL_CAREERS_URL, 'https://rupeek.com/about/careers')
  assert.equal(rupeek.OFFICIAL_CAREERS_CANONICAL_URL, 'https://rupeek.com/careers')
  assert.equal(rupeek.hasOfficialRupeekCareersSignals(verifiedCareersHtml), true)
  assert.equal(
    rupeek.hasOfficialRupeekCareersSignals(
      verifiedCareersHtml.replace('Open Positions', 'Open Roles'),
    ),
    false,
  )
  assert.deepEqual(rupeek.extractJobCardsFromCareersHtml(verifiedCareersHtml), [
    {
      title: 'Assistant Manager - Taxation',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '4440699084',
      requisitionId: null,
      sourceUrl: 'https://www.linkedin.com/jobs/view/assistant-manager-taxation-at-rupeek-4440699084',
      applyUrl: 'https://www.linkedin.com/jobs/view/assistant-manager-taxation-at-rupeek-4440699084',
      postingDate: '13 hours ago',
    },
    {
      title: 'Back Office Executive',
      location: 'Greater Bengaluru Area',
      city: 'Bengaluru',
      country: 'India',
      jobId: '4437967359',
      requisitionId: null,
      sourceUrl: 'https://www.linkedin.com/jobs/view/back-office-executive-at-rupeek-4437967359',
      applyUrl: 'https://www.linkedin.com/jobs/view/back-office-executive-at-rupeek-4437967359',
      postingDate: '6 days ago',
    },
  ])
})

test('Rupeek run validates the official careers page before returning the verified India subset', async () => {
  const { createRupeekScraper } = await loadRupeekModule()
  const scraper = createRupeekScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    fetchText: async () => verifiedCareersHtml,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Assistant Manager - Taxation',
      company: 'Rupeek',
      department: null,
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '4440699084',
      requisitionId: null,
      sourceUrl: 'https://www.linkedin.com/jobs/view/assistant-manager-taxation-at-rupeek-4440699084',
      applyUrl: 'https://www.linkedin.com/jobs/view/assistant-manager-taxation-at-rupeek-4440699084',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '13 hours ago',
      closingDate: null,
      jobDescription: null,
      source: 'rupeek',
      link: 'https://www.linkedin.com/jobs/view/assistant-manager-taxation-at-rupeek-4440699084',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Back Office Executive',
      company: 'Rupeek',
      department: null,
      location: 'Greater Bengaluru Area',
      city: 'Bengaluru',
      country: 'India',
      jobId: '4437967359',
      requisitionId: null,
      sourceUrl: 'https://www.linkedin.com/jobs/view/back-office-executive-at-rupeek-4437967359',
      applyUrl: 'https://www.linkedin.com/jobs/view/back-office-executive-at-rupeek-4437967359',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '6 days ago',
      closingDate: null,
      jobDescription: null,
      source: 'rupeek',
      link: 'https://www.linkedin.com/jobs/view/back-office-executive-at-rupeek-4437967359',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Rupeek fails closed when the verified first-party careers page drifts', async () => {
  const { createRupeekScraper } = await loadRupeekModule()
  const scraper = createRupeekScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => verifiedCareersHtml.replace('Engineering at Rupeek', 'Team Rupeek'),
    }),
    /verified official careers page/i,
  )
})
