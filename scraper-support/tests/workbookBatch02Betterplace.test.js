import assert from 'node:assert/strict'
import test from 'node:test'

import { getScraperCatalog } from '../providers/index.js'

const loadModule = async () => {
  try {
    return await import('../../scraper/betterplace/script.js')
  } catch {
    assert.fail('Expected BetterPlace scraper module at ../../scraper/betterplace/script.js')
  }
}

const VERIFIED_LISTINGS = [
  {
    department: 'Operations',
    title: 'Field HR Executive',
    location: 'Bangalore',
    summary:
      'As a Partnership Executive you are Required to On-Board Vendors (Recruitment Companies) with Aasaanjobs',
    slug: 'field-hr-executive-bangalore',
  },
  {
    department: 'Business Development & Sales',
    title: 'Staffing Sales Manager',
    location: 'Delhi/Noida',
    summary:
      'A Staffing Sales Manager must understand the concepts of Temporary Staffing - commercials, contract - and make the sale accordingly.',
    slug: 'staffing-manager-delhi',
  },
]

const buildCardHtml = ({
  title,
  location,
  summary,
  slug,
  headingTag,
}) => `
      <section class="col-xs-12 col-sm-12 col-md-6 col-lg-6 dual-card m-top-md job-card">
        <div class="col-xs-12">
          <div class="row">
            <div class="col-xs-12 bg-primary p-top-xs p-bottom-xs card-title">
              <${headingTag} class="text-light m-y-axis-5 text-medium">${title} &ensp;<span class="text-medium">${location}</span>
              </${headingTag}>
            </div>
          </div>
          <div class="row p-top-sm p-bottom-sm card-content">
            <div class="col-xs-12">
              <p class="text-light text-gray-dark text-base ellipsis-2-lines m-bottom-0">${summary}</p>
            </div>
            <div class="col-xs-12 m-top-md m-bottom"><a href="#" title="" data-value="${slug}" id="${slug}" class="text-primary text-uppercase know-more text-base">Know More</a>
            </div>
          </div>
        </div>
      </section>
`

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>We're Hiring | Work with us - Careers at Betterplace Select</title>
    <script>
      strictApiURI = 'https://ajapi.betterplace.co.in/'
    </script>
  </head>
  <body>
    <div class="row careers-viewport viewport">
      <div class="container">
        <h1 class="h1 text-center text-white m-y-axis-md p-y-axis-lg line-height-64 text-bold static-title">Careers at Aasaanjobs</h1>
      </div>
    </div>
    <section class="row careers-tabs m-top-md p-top-xs m-bottom-lg careers-section">
      <div class="container">
        <p class="m-bottom-0 h4 text-semibold text-center">Open Positions</p>
        <div id="open-positions" class="row m-top-md p-top-sm">
          <div class="col-xs-12 p-x-axis-lg text-center">
            <ul role="tablist" class="nav nav-tabs nav-center nav-fluid-xs display-flex flex-wrap responsive-careers-tab">
              <li role="presentation" class="active m-right-md p-right-xs"><a href="#operations" aria-controls="operations" role="tab" data-toggle="tab" class="text-medium text-gray-dark p-top-0 p-bottom p-x-axis-5">Operations (1)</a></li>
              <li role="presentation"><a href="#bdsales" aria-controls="bdsales" role="tab" data-toggle="tab" class="text-medium text-gray-dark p-top-0 p-bottom p-x-axis-5">Business Development & Sales (1)</a></li>
            </ul>
          </div>
        </div>
        <div class="col-xs-12 p-x-axis-lg">
          <div class="tab-content">
            <div id="operations" role="tabpanel" class="tab-pane fade in active"><div class="row text-center">
              <div class="col-xs-12 m-top-md">
                <div class="row display-flex flex-wrap">
                  ${buildCardHtml({ ...VERIFIED_LISTINGS[0], headingTag: 'h2' })}
                </div>
              </div>
            </div></div>
            <div id="bdsales" role="tabpanel" class="tab-pane fade"><div class="row text-center">
              <div class="col-xs-12 m-top-md">
                <div class="row">
                  ${buildCardHtml({ ...VERIFIED_LISTINGS[1], headingTag: 'h3' })}
                </div>
              </div>
            </div></div>
          </div>
        </div>
      </div>
    </section>
    <footer>
      <p class="text-base text-gray p-top m-top-5 line-height-24">Betterplace Select is a leading end-to-end, tech-based Staffing & Recruitment Services Provider.</p>
    </footer>
  </body>
</html>
`

test('BetterPlace catalog entry points to the verified public careers cards scraper', async () => {
  const betterplace = await loadModule()
  const provider = getScraperCatalog().find((entry) => entry.source === betterplace.SOURCE)

  assert.equal(betterplace.SOURCE, 'betterplace')
  assert.equal(betterplace.COMPANY, 'BetterPlace')
  assert.equal(betterplace.VERIFIED_ON, '2026-07-30')
  assert.equal(betterplace.CAREERS_URL, 'https://aj.betterplace.co.in/careers/')
  assert.equal(
    betterplace.DISPOSITION,
    'verified-first-party-careers-page-visible-cards',
  )
  assert.equal(provider?.modulePath, '../../scraper/betterplace/script.js')
  assert.equal(provider?.companyCareerPage, betterplace.CAREERS_URL)
  assert.equal(provider?.companyDomain, 'betterplace.co.in')
  assert.equal(provider?.atsPlatform, betterplace.DISPOSITION)
})

test('BetterPlace extracts normalized jobs from the verified public careers cards', async () => {
  const betterplace = await loadModule()
  const jobs = await betterplace.createBetterPlaceScraper().run({
    fetchText: async (url) => {
      assert.equal(url, betterplace.CAREERS_URL)
      return VERIFIED_CAREERS_HTML
    },
    now: () => '2026-07-30T12:00:00.000Z',
  })

  assert.equal(jobs.length, VERIFIED_LISTINGS.length)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      department: job.department,
      location: job.location,
      city: job.city,
      country: job.country,
      jobId: job.jobId,
      requisitionId: job.requisitionId,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      jobDescription: job.jobDescription,
      company: job.company,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Field HR Executive',
        department: 'Operations',
        location: 'Bangalore',
        city: 'Bangalore',
        country: 'India',
        jobId: 'field-hr-executive-bangalore',
        requisitionId: 'field-hr-executive-bangalore',
        sourceUrl: 'https://aj.betterplace.co.in/careers/#field-hr-executive-bangalore',
        applyUrl: 'https://aj.betterplace.co.in/careers/#field-hr-executive-bangalore',
        jobDescription:
          'As a Partnership Executive you are Required to On-Board Vendors (Recruitment Companies) with Aasaanjobs',
        company: 'BetterPlace',
        source: 'betterplace',
        link: 'https://aj.betterplace.co.in/careers/#field-hr-executive-bangalore',
        scrapedAt: '2026-07-30T12:00:00.000Z',
      },
      {
        title: 'Staffing Sales Manager',
        department: 'Business Development & Sales',
        location: 'Delhi/Noida',
        city: 'Delhi',
        country: 'India',
        jobId: 'staffing-manager-delhi',
        requisitionId: 'staffing-manager-delhi',
        sourceUrl: 'https://aj.betterplace.co.in/careers/#staffing-manager-delhi',
        applyUrl: 'https://aj.betterplace.co.in/careers/#staffing-manager-delhi',
        jobDescription:
          'A Staffing Sales Manager must understand the concepts of Temporary Staffing - commercials, contract - and make the sale accordingly.',
        company: 'BetterPlace',
        source: 'betterplace',
        link: 'https://aj.betterplace.co.in/careers/#staffing-manager-delhi',
        scrapedAt: '2026-07-30T12:00:00.000Z',
      },
    ],
  )
})

test('BetterPlace fails closed when the verified careers shell changes materially', async () => {
  const betterplace = await loadModule()

  await assert.rejects(
    betterplace.createBetterPlaceScraper().run({
      fetchText: async () => '<html><head><title>Unexpected BetterPlace page</title></head><body>No jobs here</body></html>',
    }),
    /BetterPlace verified official careers page changed materially/i,
  )
})
