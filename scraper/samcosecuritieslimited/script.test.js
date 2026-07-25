import assert from 'node:assert/strict'
import test from 'node:test'

const loadSamcoModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected SAMCO Securities Limited scraper module at ./script.js')
  }
}

const homepageHtml = `
  <html>
    <head>
      <title>Samco Stock Recommendations & Trading App | 20 Brokerage</title>
      <link rel="canonical" href="https://www.samco.in/" />
      <meta property="og:url" content="https://www.samco.in/" />
    </head>
    <body>
      <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "Organization",
          "name": "Samco Securities Limited",
          "alternateName": "Samco",
          "url": "https://www.samco.in/"
        }
      </script>
      <h1>Invest in Indian & US Markets with Scientific Recommendations</h1>
      <a href="https://www.samco.in/careers" id="careers-footer">Careers</a>
      <a href="https://www.samco.in/open-free-demat-account">Open Demat Account</a>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head>
      <title>Explore a career at Samco | Opening Positions & Vacancies</title>
      <meta property="og:url" content="https://www.samco.in/careers" />
      <link rel="canonical" href="https://www.samco.in/careers" />
    </head>
    <body>
      <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "Organization",
          "name": "SAMCO Securities Limited",
          "url": "https://www.samco.in/"
        }
      </script>

      <section class="carrier-section">
        <h1>Discover Your Future at Samco</h1>
        <p>Join a culture that values innovation, learning, and growth.</p>

        <div class="steps-box bene-steps" id="positionsList">
          <a href="javascript:void(0);" data-value="115" data-id="Channel Sales" class="video-listing">
            <div class="ctxt">
              <div class="v-text">Channel Sales</div>
              <div class="apply-txt">Apply now</div>
            </div>
          </a>
          <a href="javascript:void(0);" data-value="127" data-id="Growth" class="video-listing">
            <div class="ctxt">
              <div class="v-text">Growth</div>
              <div class="apply-txt">Apply now</div>
            </div>
          </a>
          <a href="javascript:void(0);" data-value="139" data-id="Operations" class="video-listing">
            <div class="ctxt">
              <div class="v-text">Operations</div>
              <div class="apply-txt">Apply now</div>
            </div>
          </a>
          <a href="javascript:void(0);" data-value="27" data-id="RankMF - B2B Sales" class="video-listing">
            <div class="ctxt">
              <div class="v-text">RankMF - B2B Sales</div>
              <div class="apply-txt">Apply now</div>
            </div>
          </a>
        </div>

        <form class="cmxform" name="careerForm" id="careerForm" method="post" action="javascript:void(0);">
          <select class="op-controller dep_position" id="dep_position">
            <option data-value="115" data-id="Channel Sales" value="115">Channel Sales</option>
            <option data-value="127" data-id="Growth" value="127">Growth</option>
            <option data-value="139" data-id="Operations" value="139">Operations</option>
            <option data-value="27" data-id="RankMF - B2B Sales" value="27">RankMF - B2B Sales</option>
          </select>

          <select class="op-controller select-bg border-gray" id="depPosition" name="depPosition">
            <option selected disabled>Select position</option>
          </select>

          <p id="positionDescription"></p>
          <input type="hidden" id="hiddendescription" name="hiddendescription" value="" />
          <input type="hidden" id="hiddendepartment" name="hiddendepartment" value="" />
          <input type="hidden" id="firsthiddendepartment" name="firsthiddendepartment" value="" />
          <input class="op-controller border-gray" type="file" id="userfile" name="userfile" />
          <button class="btn brand-btn" type="button" id="careerSubmit" name="careerSubmit" value="submit">
            Submit
          </button>
        </form>
      </section>

      <div class="term-consition">
        <p>
          <a href="https://www.samco.in/certificate-of-incorporation">SAMCO Securities Limited</a>
          (Formerly known as Samruddhi Stock Brokers Limited)
        </p>
        <p>
          Registered Address: SAMCO Securities Limited, 1004 - A, 10th Floor, Naman Midtown - A Wing,
          Senapati Bapat Marg, Prabhadevi, Mumbai - 400 013, Maharashtra, India.
        </p>
      </div>
    </body>
  </html>
`

test('SAMCO sentinels recognize the verified homepage and first-party careers page', async () => {
  const samco = await loadSamcoModule()

  assert.equal(samco.SOURCE, 'samcosecuritieslimited')
  assert.equal(samco.COMPANY, 'SAMCO Securities Limited')
  assert.equal(samco.HOMEPAGE_URL, 'https://www.samco.in/')
  assert.equal(samco.CAREERS_URL, 'https://www.samco.in/careers')
  assert.equal(samco.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(samco.hasOfficialCareersSignal(careersHtml), true)
})

test('SAMCO extracts the four current public department openings from the first-party careers page', async () => {
  const samco = await loadSamcoModule()

  const jobs = samco.extractPublicJobs(careersHtml)

  assert.equal(jobs.length, 4)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      department: job.department,
      location: job.location,
      city: job.city,
      country: job.country,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      jobId: job.jobId,
      requisitionId: job.requisitionId,
      requiredSkills: job.requiredSkills,
    })),
    [
      {
        title: 'Channel Sales',
        department: 'Channel Sales',
        location: null,
        city: null,
        country: 'India',
        sourceUrl: 'https://www.samco.in/careers#samcosecuritieslimited-115-channel-sales',
        applyUrl: 'https://www.samco.in/careers',
        jobId: 'samcosecuritieslimited-115-channel-sales',
        requisitionId: '115',
        requiredSkills: [],
      },
      {
        title: 'Growth',
        department: 'Growth',
        location: null,
        city: null,
        country: 'India',
        sourceUrl: 'https://www.samco.in/careers#samcosecuritieslimited-127-growth',
        applyUrl: 'https://www.samco.in/careers',
        jobId: 'samcosecuritieslimited-127-growth',
        requisitionId: '127',
        requiredSkills: [],
      },
      {
        title: 'Operations',
        department: 'Operations',
        location: null,
        city: null,
        country: 'India',
        sourceUrl: 'https://www.samco.in/careers#samcosecuritieslimited-139-operations',
        applyUrl: 'https://www.samco.in/careers',
        jobId: 'samcosecuritieslimited-139-operations',
        requisitionId: '139',
        requiredSkills: [],
      },
      {
        title: 'RankMF - B2B Sales',
        department: 'RankMF - B2B Sales',
        location: null,
        city: null,
        country: 'India',
        sourceUrl: 'https://www.samco.in/careers#samcosecuritieslimited-27-rankmf-b2b-sales',
        applyUrl: 'https://www.samco.in/careers',
        jobId: 'samcosecuritieslimited-27-rankmf-b2b-sales',
        requisitionId: '27',
        requiredSkills: [],
      },
    ],
  )
})

test('SAMCO run verifies the official surface and returns the public openings with metadata', async () => {
  const samco = await loadSamcoModule()
  const requestedUrls = []

  const jobs = await samco.createSamcoSecuritiesLimitedScraper({
    now: () => '2026-07-11T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === samco.HOMEPAGE_URL) return homepageHtml
      if (url === samco.CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [samco.HOMEPAGE_URL, samco.CAREERS_URL])
  assert.equal(jobs.length, 4)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      company: job.company,
      source: job.source,
      link: job.link,
      companyCareerPage: job.companyCareerPage,
      companyDomain: job.companyDomain,
      atsPlatform: job.atsPlatform,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Channel Sales',
        company: 'SAMCO Securities Limited',
        source: 'samcosecuritieslimited',
        link: 'https://www.samco.in/careers',
        companyCareerPage: 'https://www.samco.in/careers',
        companyDomain: 'samco.in',
        atsPlatform: 'official-company-careers',
        scrapedAt: '2026-07-11T00:00:00.000Z',
      },
      {
        title: 'Growth',
        company: 'SAMCO Securities Limited',
        source: 'samcosecuritieslimited',
        link: 'https://www.samco.in/careers',
        companyCareerPage: 'https://www.samco.in/careers',
        companyDomain: 'samco.in',
        atsPlatform: 'official-company-careers',
        scrapedAt: '2026-07-11T00:00:00.000Z',
      },
      {
        title: 'Operations',
        company: 'SAMCO Securities Limited',
        source: 'samcosecuritieslimited',
        link: 'https://www.samco.in/careers',
        companyCareerPage: 'https://www.samco.in/careers',
        companyDomain: 'samco.in',
        atsPlatform: 'official-company-careers',
        scrapedAt: '2026-07-11T00:00:00.000Z',
      },
      {
        title: 'RankMF - B2B Sales',
        company: 'SAMCO Securities Limited',
        source: 'samcosecuritieslimited',
        link: 'https://www.samco.in/careers',
        companyCareerPage: 'https://www.samco.in/careers',
        companyDomain: 'samco.in',
        atsPlatform: 'official-company-careers',
        scrapedAt: '2026-07-11T00:00:00.000Z',
      },
    ],
  )
})

test('SAMCO fails closed when the verified homepage or careers openings drift', async () => {
  const samco = await loadSamcoModule()

  await assert.rejects(
    samco.createSamcoSecuritiesLimitedScraper().run({
      fetchText: async (url) => {
        if (url === samco.HOMEPAGE_URL) {
          return homepageHtml.replace('Samco Securities Limited', 'Another Broker')
        }

        return careersHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    samco.createSamcoSecuritiesLimitedScraper().run({
      fetchText: async (url) => {
        if (url === samco.HOMEPAGE_URL) return homepageHtml
        if (url === samco.CAREERS_URL) {
          return careersHtml.replace(
            '<option data-value="27" data-id="RankMF - B2B Sales" value="27">RankMF - B2B Sales</option>',
            '',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public position options/i,
  )
})
