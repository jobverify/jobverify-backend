import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-25T00:00:00.000Z'

const communityHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Community | LILT</title>
  </head>
  <body>
    <main>
      <h1>Community</h1>
      <h2>Shape the Future of Multilingual AI</h2>
      <p>Join our global network of language experts, leveraging cutting-edge AI to deliver top-tier translations across diverse sectors.</p>
      <p>View all available positions that we are actively hiring for:</p>
      <a href="https://jobs.ashbyhq.com/lilt-production">Open Jobs</a>
      <section>
        <h3>Collaboration with LILT</h3>
        <p>Visit https://jobs.ashbyhq.com/lilt-production, complete and submit your application.</p>
      </section>
    </main>
  </body>
</html>
`

const ashbyPayload = {
  jobs: [
    {
      id: 'b59d2c77-e269-42fd-9fe0-5b4c4b04a763',
      title: 'Subject Matter Expert – Professional, Scientific & Technical Services (English/Tamil) – Remote',
      department: 'LiltLancer Community AI Data Services',
      team: 'Subject Matter Experts',
      employmentType: 'Contract',
      location: 'India (Remote)',
      secondaryLocations: [],
      publishedAt: '2026-07-20T12:00:00.000+00:00',
      isListed: true,
      isRemote: true,
      workplaceType: 'Remote',
      address: {
        postalAddress: {
          addressCountry: 'India',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/lilt-production/b59d2c77-e269-42fd-9fe0-5b4c4b04a763',
      applyUrl: 'https://jobs.ashbyhq.com/lilt-production/b59d2c77-e269-42fd-9fe0-5b4c4b04a763/application',
      descriptionPlain: 'Create and review realistic scenarios for Indian professional and technical services workflows.',
    },
    {
      id: '57d9dd54-a44f-468c-a796-84a054a471d4',
      title: 'Talent Manager',
      department: 'Production',
      team: 'Talent & Community',
      employmentType: 'Contract',
      location: 'Remote',
      secondaryLocations: [
        {
          location: 'India (Remote)',
          address: {
            postalAddress: {
              addressCountry: 'India',
            },
          },
        },
      ],
      publishedAt: '2026-07-18T15:30:00.000+00:00',
      isListed: true,
      isRemote: true,
      workplaceType: 'Remote',
      address: {
        postalAddress: {
          addressCountry: 'Argentina',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/lilt-production/57d9dd54-a44f-468c-a796-84a054a471d4',
      applyUrl: 'https://jobs.ashbyhq.com/lilt-production/57d9dd54-a44f-468c-a796-84a054a471d4/application',
      descriptionPlain: 'Own the full expert lifecycle for LILT’s global community.',
    },
    {
      id: 'head-of-legal',
      title: 'Head of Legal',
      department: 'G&A',
      team: 'Legal',
      employmentType: 'FullTime',
      location: 'Washington D.C.; Boston, MA; New York, NY',
      secondaryLocations: [],
      publishedAt: '2026-07-12T08:00:00.000+00:00',
      isListed: true,
      isRemote: false,
      workplaceType: 'Hybrid',
      address: {
        postalAddress: {
          addressCountry: 'United States',
          addressLocality: 'Washington',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/lilt-corporate/head-of-legal',
      applyUrl: 'https://jobs.ashbyhq.com/lilt-corporate/head-of-legal/application',
      descriptionPlain: 'Lead legal operations for LILT.',
    },
    {
      id: 'ignore-me',
      title: 'Unlisted Role',
      department: 'Operations',
      employmentType: 'Contract',
      location: 'India (Remote)',
      secondaryLocations: [],
      publishedAt: '2026-07-01T00:00:00.000+00:00',
      isListed: false,
      jobUrl: 'https://jobs.ashbyhq.com/lilt-production/ignore-me',
      applyUrl: 'https://jobs.ashbyhq.com/lilt-production/ignore-me/application',
      descriptionPlain: 'This role should be ignored.',
    },
  ],
}

const loadLiltModule = async () => {
  try {
    return await import('../../scraper/lilt/script.js')
  } catch {
    assert.fail('Expected LILT scraper module at ../../scraper/lilt/script.js')
  }
}

test('LILT pins the verified first-party community page and Ashby production endpoints', async () => {
  const lilt = await loadLiltModule()

  assert.equal(lilt.SOURCE, 'lilt')
  assert.equal(lilt.COMPANY, 'LILT')
  assert.equal(lilt.COMMUNITY_PAGE_URL, 'https://lilt.com/products/community')
  assert.equal(lilt.ASHBY_PUBLIC_BOARD_URL, 'https://jobs.ashbyhq.com/lilt-production')
  assert.equal(
    lilt.ASHBY_JOB_BOARD_URL,
    'https://api.ashbyhq.com/posting-api/job-board/lilt-production',
  )
  assert.equal(lilt.hasVerifiedCommunityPageSignal(communityHtml), true)
  assert.equal(
    lilt.extractVerifiedAshbyPublicBoardUrl(communityHtml),
    'https://jobs.ashbyhq.com/lilt-production',
  )
  assert.equal(
    lilt.buildAshbyJobBoardUrl('https://jobs.ashbyhq.com/lilt-production'),
    'https://api.ashbyhq.com/posting-api/job-board/lilt-production',
  )
})

test('LILT extracts only listed India jobs from the verified Ashby payload', async () => {
  const lilt = await loadLiltModule()
  const jobs = lilt.extractAshbyJobs(ashbyPayload)

  assert.deepEqual(jobs, [
    {
      title: 'Subject Matter Expert – Professional, Scientific & Technical Services (English/Tamil) – Remote',
      company: 'LILT',
      department: 'LiltLancer Community AI Data Services',
      location: 'India (Remote)',
      city: null,
      state: null,
      country: 'India',
      jobId: 'b59d2c77-e269-42fd-9fe0-5b4c4b04a763',
      requisitionId: 'b59d2c77-e269-42fd-9fe0-5b4c4b04a763',
      sourceUrl: 'https://jobs.ashbyhq.com/lilt-production/b59d2c77-e269-42fd-9fe0-5b4c4b04a763',
      applyUrl: 'https://jobs.ashbyhq.com/lilt-production/b59d2c77-e269-42fd-9fe0-5b4c4b04a763/application',
      employmentType: 'Contract',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-20T12:00:00.000+00:00',
      closingDate: null,
      jobDescription: 'Create and review realistic scenarios for Indian professional and technical services workflows.',
      remoteStatus: 'Remote',
    },
    {
      title: 'Talent Manager',
      company: 'LILT',
      department: 'Production',
      location: 'India (Remote)',
      city: null,
      state: null,
      country: 'India',
      jobId: '57d9dd54-a44f-468c-a796-84a054a471d4',
      requisitionId: '57d9dd54-a44f-468c-a796-84a054a471d4',
      sourceUrl: 'https://jobs.ashbyhq.com/lilt-production/57d9dd54-a44f-468c-a796-84a054a471d4',
      applyUrl: 'https://jobs.ashbyhq.com/lilt-production/57d9dd54-a44f-468c-a796-84a054a471d4/application',
      employmentType: 'Contract',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-18T15:30:00.000+00:00',
      closingDate: null,
      jobDescription: 'Own the full expert lifecycle for LILT’s global community.',
      remoteStatus: 'Remote',
    },
  ])
})

test('LILT derives experienceRequired from verified Ashby descriptions for India jobs', async () => {
  const lilt = await loadLiltModule()
  const [dtpJob, smeJob] = lilt.extractAshbyJobs({
    jobs: [
      {
        id: 'dtp-specialist',
        title: 'DTP Specialist',
        department: 'Production',
        employmentType: 'Contract',
        location: 'India (Remote)',
        secondaryLocations: [],
        publishedAt: '2026-07-30T00:00:00.000+00:00',
        isListed: true,
        isRemote: true,
        workplaceType: 'Remote',
        address: {
          postalAddress: {
            addressCountry: 'India',
          },
        },
        jobUrl: 'https://jobs.ashbyhq.com/lilt-production/dtp-specialist',
        applyUrl: 'https://jobs.ashbyhq.com/lilt-production/dtp-specialist/application',
        descriptionPlain: 'Experience: 2+ years of experience in desktop publishing, preferably in an LSP or localization environment.',
      },
      {
        id: 'math-sme',
        title: 'Subject Matter Expert – Mathematics (Bengali) – Remote',
        department: 'LiltLancer Community AI Data Services',
        employmentType: 'Contract',
        location: 'India (Remote)',
        secondaryLocations: [],
        publishedAt: '2026-07-30T00:00:00.000+00:00',
        isListed: true,
        isRemote: true,
        workplaceType: 'Remote',
        address: {
          postalAddress: {
            addressCountry: 'India',
          },
        },
        jobUrl: 'https://jobs.ashbyhq.com/lilt-production/math-sme',
        applyUrl: 'https://jobs.ashbyhq.com/lilt-production/math-sme/application',
        descriptionPlain: '5+ years of experience in Mathematics (e.g. applied mathematics, probability and statistics, computational mathematics and physics).',
      },
    ],
  })

  assert.equal(dtpJob.experienceRequired, '2+ years')
  assert.equal(smeJob.experienceRequired, '5+ years')
})

test('LILT run validates the first-party handoff and returns normalized India jobs', async () => {
  const lilt = await loadLiltModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await lilt.createLiltScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === lilt.COMMUNITY_PAGE_URL) return communityHtml
      throw new Error(`Unexpected LILT text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      return ashbyPayload
    },
  })

  assert.deepEqual(requestedTexts, [lilt.COMMUNITY_PAGE_URL])
  assert.deepEqual(requestedJson, [lilt.ASHBY_JOB_BOARD_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'lilt')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('LILT fails closed when the verified community page, Ashby handoff, or payload drift', async () => {
  const lilt = await loadLiltModule()

  await assert.rejects(
    lilt.createLiltScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
      fetchJson: async () => ashbyPayload,
    }),
    /verified lilt community page/i,
  )

  await assert.rejects(
    lilt.createLiltScraper().run({
      fetchText: async () =>
        communityHtml.replaceAll('jobs.ashbyhq.com/lilt-production', 'jobs.ashbyhq.com/lilt-corporate'),
      fetchJson: async () => ashbyPayload,
    }),
    /verified ashby public board handoff/i,
  )

  await assert.rejects(
    lilt.createLiltScraper().run({
      fetchText: async () => communityHtml,
      fetchJson: async () => ({ postings: [] }),
    }),
    /verified ashby payload/i,
  )
})
