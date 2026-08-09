import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career - RuralShores</title>
  </head>
  <body>
    <section>
      <h2 id="jobsTitle">Current Openings</h2>
      <article class="jobcard" data-job-id="assistant-manager-projects">
        <h3 class="jobcard__title">Assistant Manager - Projects</h3>
        <div class="jobcard__meta">
          <span>7-10 Years</span>
          <span>Uthiramerur, Tamil Nadu</span>
          <span>ID: RSBS/REC/2026026</span>
        </div>
        <p class="jobcard__desc">Lead rural delivery and project execution.</p>
        <div class="jobcard__tags">
          <span>Capex</span>
          <span>Operations</span>
        </div>
        <div class="jobcard__actions">
          <a href="mailto:careers@ruralshores.com?subject=Application%20for%20Assistant%20Manager%20-%20Projects%20(RSBS/REC/2026013)">Apply Now</a>
        </div>
      </article>
      <article class="jobcard" data-job-id="senior-executive-quality-garchuk">
        <h3 class="jobcard__title">Senior Executive - Quality</h3>
        <div class="jobcard__meta">
          <span>3-5 Years</span>
          <span>Garchuk, Assam</span>
        </div>
        <p class="jobcard__desc">Audit quality metrics for distributed teams.</p>
        <div class="jobcard__actions">
          <a href="mailto:careers@ruralshores.com?subject=Application%20for%20Senior%20Executive%20-%20Quality%20(Garchuk)">Apply Now</a>
        </div>
      </article>
      <article class="jobcard" data-job-id="business-analyst-dubai">
        <h3 class="jobcard__title">Business Analyst</h3>
        <div class="jobcard__meta">
          <span>4-6 Years</span>
          <span>Dubai, UAE</span>
          <span>ID: RSBS/REC/2026999</span>
        </div>
        <p class="jobcard__desc">Ignore non-India role.</p>
        <div class="jobcard__actions">
          <a href="mailto:careers@ruralshores.com?subject=Application%20for%20Business%20Analyst%20(RSBS/REC/2026999)">Apply Now</a>
        </div>
      </article>
    </section>
    <footer>
      <a href="mailto:careers@ruralshores.com">careers@ruralshores.com</a>
    </footer>
  </body>
</html>
`

const loadRuralShoresModule = async () => {
  try {
    return await import('../../scraper/ruralshores/script.js')
  } catch {
    assert.fail('Expected RuralShores scraper module at ../../scraper/ruralshores/script.js')
  }
}

test('RuralShores helpers stay pinned to the verified HTML jobcard structure', async () => {
  const ruralShores = await loadRuralShoresModule()

  assert.equal(ruralShores.SOURCE, 'ruralshores')
  assert.equal(ruralShores.COMPANY_NAME, 'RuralShores')
  assert.equal(ruralShores.OFFICIAL_BRAND_NAME, 'RuralShores')
  assert.equal(ruralShores.VERIFIED_ON, '2026-07-17')
  assert.equal(ruralShores.OFFICIAL_CAREERS_URL, 'https://www.ruralshores.com/career.html')
  assert.equal(ruralShores.hasOfficialRuralShoresCareersSignals(verifiedCareersHtml), true)
  assert.equal(
    ruralShores.hasOfficialRuralShoresCareersSignals(
      verifiedCareersHtml.replace('Current Openings', 'Open Roles'),
    ),
    false,
  )
  assert.deepEqual(ruralShores.extractVisibleJobCards(verifiedCareersHtml), [
    {
      slug: 'assistant-manager-projects',
      title: 'Assistant Manager - Projects',
      location: 'Uthiramerur, Tamil Nadu',
      city: 'Uthiramerur',
      country: 'India',
      jobId: 'RSBS/REC/2026026',
      requisitionId: 'RSBS/REC/2026026',
      sourceUrl: 'https://www.ruralshores.com/career.html#assistant-manager-projects',
      applyUrl: 'mailto:careers@ruralshores.com?subject=Application%20for%20Assistant%20Manager%20-%20Projects%20(RSBS/REC/2026013)',
      experienceRequired: '7-10 Years',
      jobDescription: 'Lead rural delivery and project execution.',
      requiredSkills: ['Capex', 'Operations'],
    },
    {
      slug: 'senior-executive-quality-garchuk',
      title: 'Senior Executive - Quality',
      location: 'Garchuk, Assam',
      city: 'Garchuk',
      country: 'India',
      jobId: 'senior-executive-quality-garchuk',
      requisitionId: null,
      sourceUrl: 'https://www.ruralshores.com/career.html#senior-executive-quality-garchuk',
      applyUrl: 'mailto:careers@ruralshores.com?subject=Application%20for%20Senior%20Executive%20-%20Quality%20(Garchuk)',
      experienceRequired: '3-5 Years',
      jobDescription: 'Audit quality metrics for distributed teams.',
      requiredSkills: [],
    },
  ])
})

test('RuralShores run validates the official careers page before returning visible India jobcards', async () => {
  const { createRuralShoresScraper } = await loadRuralShoresModule()
  const scraper = createRuralShoresScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    fetchText: async () => verifiedCareersHtml,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Assistant Manager - Projects',
      company: 'RuralShores',
      department: null,
      location: 'Uthiramerur, Tamil Nadu',
      city: 'Uthiramerur',
      country: 'India',
      jobId: 'RSBS/REC/2026026',
      requisitionId: 'RSBS/REC/2026026',
      sourceUrl: 'https://www.ruralshores.com/career.html#assistant-manager-projects',
      applyUrl: 'mailto:careers@ruralshores.com?subject=Application%20for%20Assistant%20Manager%20-%20Projects%20(RSBS/REC/2026013)',
      employmentType: null,
      experienceRequired: '7-10 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Capex', 'Operations'],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Lead rural delivery and project execution.',
      source: 'ruralshores',
      link: 'mailto:careers@ruralshores.com?subject=Application%20for%20Assistant%20Manager%20-%20Projects%20(RSBS/REC/2026013)',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Senior Executive - Quality',
      company: 'RuralShores',
      department: null,
      location: 'Garchuk, Assam',
      city: 'Garchuk',
      country: 'India',
      jobId: 'senior-executive-quality-garchuk',
      requisitionId: null,
      sourceUrl: 'https://www.ruralshores.com/career.html#senior-executive-quality-garchuk',
      applyUrl: 'mailto:careers@ruralshores.com?subject=Application%20for%20Senior%20Executive%20-%20Quality%20(Garchuk)',
      employmentType: null,
      experienceRequired: '3-5 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Audit quality metrics for distributed teams.',
      source: 'ruralshores',
      link: 'mailto:careers@ruralshores.com?subject=Application%20for%20Senior%20Executive%20-%20Quality%20(Garchuk)',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('RuralShores fails closed when the verified first-party careers page drifts', async () => {
  const { createRuralShoresScraper } = await loadRuralShoresModule()
  const scraper = createRuralShoresScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => verifiedCareersHtml.replaceAll('careers@ruralshores.com', 'hr@example.com'),
    }),
    /verified official careers page/i,
  )
})
