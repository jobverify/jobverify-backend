import assert from 'node:assert/strict'
import test from 'node:test'

const loadSolarSquareModule = async () => import('../../scraper/solarsquare/script.js')

test('run fetches SolarSquare public Keka jobs plus departments and keeps only India roles', async () => {
  const solarsquare = await loadSolarSquareModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await solarsquare.createSolarSquareScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === solarsquare.CAREER_PAGE_URL) {
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <base href="/careers/" id="baseHref" />
              <meta name="portalName" content="" />
            </head>
            <body>
              <h1>Careers at SolarSquare</h1>
            </body>
          </html>
        `
      }

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)

      if (url === solarsquare.ACTIVE_JOBS_URL) {
        return [
          {
            id: 133829,
            title: 'ADOS - Tamil Nadu',
            description: '<div>Drive residential solar growth in Tamil Nadu.</div>',
            departmentId: 333291,
            jobLocations: [
              {
                name: 'Chennai',
                city: 'Chennai',
                countryCode: 'IN',
                countryName: 'India',
              },
            ],
            jobType: 2,
            experience: '2-5 years',
            salaryRangeFormat: '',
            publishedOn: '2026-07-09T10:00:00.000Z',
            skillNames: ['Sales', 'Field Operations'],
          },
          {
            id: 133830,
            title: 'US Partnerships Lead',
            description: '<div>Own new market partnerships.</div>',
            departmentId: 333291,
            jobLocations: [
              {
                name: 'Austin',
                city: 'Austin',
                countryCode: 'US',
                countryName: 'United States',
              },
            ],
            jobType: 2,
            experience: '6-9 years',
            salaryRangeFormat: '',
            publishedOn: '2026-07-09T10:00:00.000Z',
            skillNames: ['Partnerships'],
          },
        ]
      }

      if (url === solarsquare.DEPARTMENTS_URL) {
        return [
          { id: 333291, name: 'BTL Sales' },
        ]
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requestedTexts, [solarsquare.CAREER_PAGE_URL])
  assert.deepEqual(requestedJson, [
    solarsquare.DEPARTMENTS_URL,
    solarsquare.ACTIVE_JOBS_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'ADOS - Tamil Nadu',
    company: 'SolarSquare',
    department: 'BTL Sales',
    location: 'Chennai, India',
    city: 'Chennai',
    country: 'India',
    jobId: '133829',
    requisitionId: '133829',
    sourceUrl: 'https://solarsquare.keka.com/careers/jobdetails/133829',
    applyUrl: 'https://solarsquare.keka.com/careers/applyjob/133829',
    employmentType: 'Full Time',
    experienceRequired: '2-5 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Sales', 'Field Operations'],
    postingDate: '2026-07-09',
    closingDate: null,
    jobDescription: 'Drive residential solar growth in Tamil Nadu.',
    remoteStatus: 'On-site',
    compensation: null,
    source: 'solarsquare',
    link: 'https://solarsquare.keka.com/careers/applyjob/133829',
    scrapedAt: '2026-07-10T00:00:00.000Z',
  })
})
