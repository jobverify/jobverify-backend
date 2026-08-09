import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career | MMC Infotech</title>
  </head>
  <body>
    <h1>Join Our Family</h1>
    <div class="tab products-details-tab">
      <ul class="tabs">
        <li><a href="#"><div class="dot"></div>Voice Operations </a></li>
      </ul>
      <div class="tab-content">
        <div class="tabs-item">
          <div class="products-details-tab-content">
            <h3>Job Description</h3>
            <p><ol><li>Handle inbound customer calls and process service requests.</li><li>Convey accurate and required information to the clients.</li></ol></p>
            <a href="form.php?job_posting=Voice Operations" class="default-btn"><span class="label">Apply Now</span></a>
          </div>
        </div>
      </div>
    </div>
    <div class="tab products-details-tab">
      <ul class="tabs">
        <li><a href="#"><div class="dot"></div>Backend Process </a></li>
      </ul>
      <div class="tab-content">
        <div class="tabs-item">
          <div class="products-details-tab-content">
            <h3>Job Description</h3>
            <p><ol><li>Support backend processing operations and quality checks.</li><li>Attention to detail and the ability to multi task.</li></ol></p>
            <a href="form.php?job_posting=Backend Process" class="default-btn"><span class="label">Apply Now</span></a>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/mmcinfotechservices/script.js')
  } catch {
    assert.fail('Expected MMC Infotech Services scraper module at ../../scraper/mmcinfotechservices/script.js')
  }
}

test('MMC Infotech Services parses the verified first-party inline openings page', async () => {
  const mmc = await loadModule()

  assert.equal(mmc.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(mmc.extractListingCards(careersHtml).length, 2)

  const jobs = await mmc.createMmcInfotechServicesScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, mmc.CAREERS_URL)
      return careersHtml
    },
  })

  assert.deepEqual(jobs, [
    {
      title: 'Voice Operations',
      company: 'MMC Infotech Services',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'voice-operations',
      requisitionId: 'voice-operations',
      sourceUrl: 'https://www.mmcinfotech.com/form.php?job_posting=Voice%20Operations',
      applyUrl: 'https://www.mmcinfotech.com/form.php?job_posting=Voice%20Operations',
      employmentType: null,
      experienceRequired: null,
      publicExperienceChecked: true,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Handle inbound customer calls and process service requests.\nConvey accurate and required information to the clients.',
      source: 'mmcinfotechservices',
      companyCareerPage: 'https://www.mmcinfotech.com/career.php',
      companyDomain: 'mmcinfotech.com',
      atsPlatform: 'official-company-careers',
      link: 'https://www.mmcinfotech.com/form.php?job_posting=Voice%20Operations',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Backend Process',
      company: 'MMC Infotech Services',
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: 'backend-process',
      requisitionId: 'backend-process',
      sourceUrl: 'https://www.mmcinfotech.com/form.php?job_posting=Backend%20Process',
      applyUrl: 'https://www.mmcinfotech.com/form.php?job_posting=Backend%20Process',
      employmentType: null,
      experienceRequired: null,
      publicExperienceChecked: true,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Support backend processing operations and quality checks.\nAttention to detail and the ability to multi task.',
      source: 'mmcinfotechservices',
      companyCareerPage: 'https://www.mmcinfotech.com/career.php',
      companyDomain: 'mmcinfotech.com',
      atsPlatform: 'official-company-careers',
      link: 'https://www.mmcinfotech.com/form.php?job_posting=Backend%20Process',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('MMC Infotech Services fails when the verified careers page loses its inline openings', async () => {
  const mmc = await loadModule()

  await assert.rejects(
    mmc.createMmcInfotechServicesScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /trusted first-party surface/i,
  )
})
