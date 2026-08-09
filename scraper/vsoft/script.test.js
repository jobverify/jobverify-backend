import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  APP_CONFIG_URL,
  APP_SHELL_URL,
  APP_ROOT_URL,
  CAREER_PORTAL_PAGE_JSON_URL,
  CAREER_PORTAL_URL,
  CAREERS_PAGE_URL,
  COMPANY,
  SOURCE,
  buildBaseUrl,
  buildSearchUrl,
  createVsoftScraper,
  extractJobs,
  extractPortalIframeUrl,
  getRunnerMetadata,
  hasCareersPageSignal,
  hasPortalAppShellSignal,
  isPortalLoginBlockedResponse,
  normalizeBullhornFields,
} from './script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const readFixture = (name) => readFileSync(path.join(currentDir, 'fixtures', name), 'utf8')

const careersHtml = readFixture('careers.html')
const careerPortalPagePayload = JSON.parse(readFixture('career-portal-page.json'))
const appConfig = JSON.parse(readFixture('app.json'))
const officialSearchResults = JSON.parse(readFixture('search-results.json'))

const currentCareersHtml = `
<!doctype html>
<html lang="en-US">
<head>
  <title>Careers - V-Soft Consulting | Enterprise AI &amp; Digital Transformation</title>
</head>
<body>
  <main>
    <a href="https://www.vsoftconsulting.com/career-portal/">View Roles</a>
  </main>
</body>
</html>
`

const shortcodePortalPagePayload = [{
  id: 22,
  slug: 'career-portal',
  link: 'https://www.vsoftconsulting.com/career-portal/',
  title: { rendered: 'Career' },
  content: {
    rendered: ' [oscp] ',
    protected: false,
  },
}]

const portalAppHtml = `
<!doctype html>
<html lang="en">
<head>
  <title>Career Portal</title>
</head>
<body>
  <app-root><novo-loading></novo-loading></app-root>
</body>
</html>
`

test('pins the verified VSoft official careers surface and first-party Bullhorn portal handoff', () => {
  assert.equal(SOURCE, 'vsoft')
  assert.equal(COMPANY, 'VSoft')
  assert.equal(CAREERS_PAGE_URL, 'https://www.vsoftconsulting.com/careers/')
  assert.equal(CAREER_PORTAL_URL, 'https://www.vsoftconsulting.com/career-portal/')
  assert.equal(
    CAREER_PORTAL_PAGE_JSON_URL,
    'https://www.vsoftconsulting.com/wp-json/wp/v2/pages?slug=career-portal&_fields=id,slug,link,title,content',
  )
  assert.equal(
    APP_CONFIG_URL,
    'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/app.json',
  )
  assert.equal(
    APP_SHELL_URL,
    'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/',
  )
  assert.equal(
    APP_ROOT_URL,
    'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/#/',
  )
  assert.equal(hasCareersPageSignal(careersHtml), true)
  assert.equal(hasCareersPageSignal(currentCareersHtml), true)
  assert.equal(extractPortalIframeUrl(careerPortalPagePayload), APP_ROOT_URL)
  assert.equal(extractPortalIframeUrl(shortcodePortalPagePayload), APP_ROOT_URL)
  assert.equal(hasPortalAppShellSignal(portalAppHtml), true)
  assert.equal(
    isPortalLoginBlockedResponse({
      status: 500,
      text: '{"errorMessage":"Unable to login","errorCode":500}',
    }),
    true,
  )
})

test('normalizes the VSoft Bullhorn field list and builds the public first-party search URL', () => {
  assert.deepEqual(normalizeBullhornFields(appConfig?.service?.fields), [
    'id',
    'title',
    'publishedCategory(id,name)',
    'address(city,state,countryName)',
    'employmentType',
    'dateLastPublished',
    'publicDescription',
    'isOpen',
    'isPublic',
    'isDeleted',
    'publishedZip',
    'salary',
    'salaryUnit',
  ])

  assert.equal(
    buildBaseUrl(appConfig),
    'https://public-rest34.bullhornstaffing.com:443/rest-services/H85C9',
  )

  assert.equal(
    buildSearchUrl(appConfig),
    'https://public-rest34.bullhornstaffing.com:443/rest-services/H85C9/search/JobOrder?query=%28isOpen%3A1%29+AND+%28isDeleted%3A0%29&fields=id%2Ctitle%2CpublishedCategory%28id%2Cname%29%2Caddress%28city%2Cstate%2CcountryName%29%2CemploymentType%2CdateLastPublished%2CpublicDescription%2CisOpen%2CisPublic%2CisDeleted%2CpublishedZip%2Csalary%2CsalaryUnit&count=500&sort=-dateLastPublished&showTotalMatched=true',
  )
})

test('extractJobs keeps only India jobs and maps them to the normalized Jobverify shape', () => {
  const payload = {
    total: 2,
    start: 0,
    count: 2,
    data: [
      {
        id: 501,
        title: 'Senior Data Engineer',
        publishedCategory: { id: 10, name: 'Data Engineering' },
        address: {
          city: 'Hyderabad',
          state: 'Telangana',
          countryName: 'India',
        },
        employmentType: 'Full Time',
        dateLastPublished: 1783709137873,
        publicDescription: '<p>Build pipelines.</p><ul><li>Python</li><li>SQL</li></ul>',
        isOpen: true,
        isPublic: 1,
        isDeleted: false,
        publishedZip: '500081',
        salary: 0,
        salaryUnit: 'Per annum',
      },
      officialSearchResults.data[0],
    ],
  }

  assert.deepEqual(extractJobs(payload), [
    {
      title: 'Senior Data Engineer',
      company: 'VSoft',
      department: 'Data Engineering',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      jobId: '501',
      requisitionId: '501',
      sourceUrl: 'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/#/jobs/501',
      applyUrl: 'https://www.vsoftconsulting.com/wp-content/plugins/bullhorn-oscp/#/jobs/501',
      employmentType: 'Full Time',
      postingDate: '2026-07-10T18:45:37.873Z',
      jobDescription: 'Build pipelines. Python SQL',
      requiredSkills: ['Python', 'SQL'],
    },
  ])
})

test('returns no jobs when the verified first-party public search payload contains no India openings', async () => {
  const jobs = await createVsoftScraper().run({
    fetchText: async (url) => {
      if (url === CAREERS_PAGE_URL) return careersHtml
      if (url === APP_SHELL_URL) return portalAppHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchJson: async (url) => {
      if (url === CAREER_PORTAL_PAGE_JSON_URL) return careerPortalPagePayload
      if (url === APP_CONFIG_URL) return appConfig
      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchApiResponse: async (url) => {
      assert.equal(url, buildSearchUrl(appConfig))
      return {
        status: 200,
        url,
        text: JSON.stringify(officialSearchResults),
      }
    },
  })

  assert.deepEqual(jobs, [])
})

test('returns no jobs when the verified public Bullhorn app shell is live but Bullhorn itself rejects anonymous search with the current login failure', async () => {
  const jobs = await createVsoftScraper().run({
    fetchText: async (url) => {
      if (url === CAREERS_PAGE_URL) return currentCareersHtml
      if (url === APP_SHELL_URL) return portalAppHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchJson: async (url) => {
      if (url === CAREER_PORTAL_PAGE_JSON_URL) return shortcodePortalPagePayload
      if (url === APP_CONFIG_URL) return appConfig
      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchApiResponse: async (url) => ({
      status: 500,
      url,
      text: '{"errorMessage":"Unable to login","errorCode":500}',
    }),
  })

  assert.deepEqual(jobs, [])
})

test('returns runner metadata for later registry integration', () => {
  assert.deepEqual(getRunnerMetadata(), {
    name: SOURCE,
    dryRunFile: 'jobs.json',
    provider: {
      source: SOURCE,
      companyName: COMPANY,
      companyCareerPage: CAREERS_PAGE_URL,
      jobBoardUrl: CAREER_PORTAL_URL,
      jobBoardApi: buildSearchUrl(appConfig),
      adapter: 'script',
      atsPlatform: 'bullhorn-oscp',
      countryFilter: 'India',
    },
  })
})

test('fails closed when the verified careers page or Bullhorn iframe handoff changes', async () => {
  await assert.rejects(
    createVsoftScraper().run({
      fetchText: async () => '<html><body>unexpected</body></html>',
      fetchJson: async () => {
        throw new Error('fetchJson should not be called when the careers page signal is missing')
      },
    }),
    /verified VSoft careers surface/i,
  )

  await assert.rejects(
    createVsoftScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_PAGE_URL) return careersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === CAREER_PORTAL_PAGE_JSON_URL) {
          return [{
            ...careerPortalPagePayload[0],
            content: {
              ...careerPortalPagePayload[0].content,
              rendered: '<iframe src="https://www.vsoftconsulting.com/wp-content/plugins/other-portal/#/"></iframe>',
            },
          }]
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified VSoft Bullhorn portal handoff/i,
  )

  await assert.rejects(
    createVsoftScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_PAGE_URL) return careersHtml
        if (url === APP_SHELL_URL) return '<html><body>missing app shell</body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === CAREER_PORTAL_PAGE_JSON_URL) return careerPortalPagePayload
        if (url === APP_CONFIG_URL) return appConfig
        throw new Error(`Unexpected URL: ${url}`)
      },
      fetchApiResponse: async (url) => ({
        status: 200,
        url,
        text: JSON.stringify(officialSearchResults),
      }),
    }),
    /public first-party portal/i,
  )
})
