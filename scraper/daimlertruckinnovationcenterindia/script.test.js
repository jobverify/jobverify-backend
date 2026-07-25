import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DTICI_PARENT_ORGANIZATION_ID,
  SEARCH_API_URL,
  buildSearchRequest,
  createDaimlerTruckInnovationCenterIndiaScraper,
  normalizeJob,
} from './script.js'

test('builds the official Daimler Truck search request for the DTICI organization', () => {
  const request = buildSearchRequest()

  assert.equal(SEARCH_API_URL, 'https://global-jobboard-api-jobsearch.daimlertruck.com/search/')
  assert.equal(request.LanguageCode, '1')
  assert.deepEqual(request.SearchParameters, {
    FirstItem: 1,
    CountItem: 100,
    Sort: [{ Criterion: 'PublicationStartDate', Direction: 'DESC' }],
    MatchedObjectDescriptor: [
      'PositionTitle',
      'PositionURI',
      'PositionLocation',
      'PositionFormattedDescription',
      'PositionID',
      'PublicationStartDate',
      'PositionSchedule',
      'ParentOrganization',
    ],
  })
  assert.deepEqual(request.SearchCriteria, [{
    CriterionName: 'ParentOrganization',
    CriterionValue: [DTICI_PARENT_ORGANIZATION_ID],
  }])
})

test('normalizes a DTICI listing and rejects listings from other organizations', () => {
  const entry = {
    MatchedObjectId: '421999',
    MatchedObjectDescriptor: {
      ID: '421999',
      PositionID: 'J000421999',
      PositionTitle: 'Senior Software Engineer',
      PositionURI: 'https://jobsearch.daimlertruck.com//index.php?ac=jobad&id=421999',
      ParentOrganization: DTICI_PARENT_ORGANIZATION_ID,
      ParentOrganizationName: 'Bengaluru, Daimler Truck Innovation Center India Private Limited',
      PositionLocation: [{ CityName: 'Bengaluru', CountryName: 'Indien', CountryCode: 'IN' }],
      PositionFormattedDescription: '<p>Build connected vehicle software.</p>',
      PublicationStartDate: '2026-07-01',
      PositionSchedule: [{ Name: 'Vollzeit' }],
    },
  }

  const job = normalizeJob(entry, '2026-07-07T00:00:00.000Z')

  assert.deepEqual(job, {
    title: 'Senior Software Engineer',
    company: 'Daimler Truck Innovation Center India (DTICI)',
    department: null,
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'J000421999',
    requisitionId: 'J000421999',
    sourceUrl: 'https://dtici.daimlertruck.com/career/',
    applyUrl: 'https://jobsearch.daimlertruck.com//index.php?ac=jobad&id=421999',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-01',
    closingDate: null,
    jobDescription: 'Build connected vehicle software.',
    attachmentUrl: null,
    source: 'daimlertruckinnovationcenterindia',
    link: 'https://jobsearch.daimlertruck.com//index.php?ac=jobad&id=421999',
    scrapedAt: '2026-07-07T00:00:00.000Z',
  })

  assert.equal(normalizeJob({
    MatchedObjectDescriptor: {
      ParentOrganization: '1249',
      PositionTitle: 'Other Company Job',
    },
  }, '2026-07-07T00:00:00.000Z'), null)
})

test('scraper posts JSON to the official API and returns normalized DTICI jobs', async () => {
  let request
  const scraper = createDaimlerTruckInnovationCenterIndiaScraper({
    fetchJson: async (url, options) => {
      request = { url, options }
      return {
        SearchResult: {
          SearchResultItems: [],
        },
      }
    },
    now: () => '2026-07-07T00:00:00.000Z',
  })

  assert.deepEqual(await scraper.run(), [])
  assert.equal(request.url, SEARCH_API_URL)
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers['Content-Type'], 'application/x-www-form-urlencoded')
  assert.deepEqual(JSON.parse(request.options.body.get('data')), buildSearchRequest())
})
