import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BOSCH_REXROTH_LEGAL_ENTITY_ID,
  CAREER_PAGE_URL,
  buildDetailUrl,
  buildSearchUrl,
  createBoschRexrothScraper,
  extractSearchResults,
  extractSearchResultSet,
} from '../boschrexroth/script.js'

const sampleListingPayload = {
  _embedded: {
    'rh:result': [
      {
        meta: [{ count: 2 }],
        data: [
          {
            refNumber: 'REF289639O',
            name: 'IN_Bosch Rexroth India_Assistant Manager / Deputy Manager_Company Secretarial & Legal',
            releasedDate: '2026-06-29T05:35:54.243Z',
            jobUrl: 'REF289639O-in_bosch-rexroth-india_assistant-manager-deputy-manager_company-secretarial-legal',
            positionType: {
              valueLabel: 'Professional',
            },
            function: {
              id: 'legal',
              label: 'Legal',
            },
            location: {
              workLocation: 'Ahmedabad',
              country: 'in',
              hybrid: false,
              city: 'Ahmedabad',
              remote: false,
            },
            legal_entity: {
              valueId: BOSCH_REXROTH_LEGAL_ENTITY_ID,
              valueLabel: 'Bosch Rexroth (India) Private Limited',
            },
            type_of_contract: {
              valueLabel: 'Unlimited',
            },
            working_hours: {
              valueLabel: 'Full-time',
            },
            work_mode: 'on-site',
          },
          {
            refNumber: 'REF289424C',
            name: 'IN_Bosch Rexroth India_Engineer / Executive_Sales_Industrial Hydraulics_India',
            releasedDate: '2026-06-25T03:55:36.492Z',
            jobUrl: 'REF289424C-in_bosch-rexroth-india_engineer-executive_sales_industrial-hydraulics_india',
            positionType: {
              valueLabel: 'Professional',
            },
            function: {
              id: 'engineering',
              label: 'Engineering',
            },
            location: {
              workLocation: 'Ahmedabad',
              country: 'in',
              hybrid: false,
              city: 'Ahmedabad',
              remote: false,
            },
            legal_entity: {
              valueId: BOSCH_REXROTH_LEGAL_ENTITY_ID,
              valueLabel: 'Bosch Rexroth (India) Private Limited',
            },
            type_of_contract: {
              valueLabel: 'Unlimited',
            },
            working_hours: {
              valueLabel: 'Full-time',
            },
            work_mode: 'on-site',
          },
        ],
      },
    ],
  },
}

const sampleDetailPayloadByRef = {
  REF289639O: [
    {
      releasedDate: '2026-06-29T05:35:54.243Z',
      refNumber: 'REF289639O',
      name: 'IN_Bosch Rexroth India_Assistant Manager / Deputy Manager_Company Secretarial & Legal',
      jobAd: {
        sections: {
          companyDescription: {
            text: '<p>Bosch Rexroth drives motion and control technologies for industrial and mobile applications.</p>',
          },
          jobDescription: {
            text: '<p>Support company secretarial and legal work across the India business.</p>',
          },
          qualifications: {
            text: '<p>Company secretary background with corporate law experience.</p>',
          },
          additionalInformation: {
            text: '<p>Experience : 8+ years</p>',
          },
        },
      },
    },
  ],
  REF289424C: [
    {
      releasedDate: '2026-06-25T03:55:36.492Z',
      refNumber: 'REF289424C',
      name: 'IN_Bosch Rexroth India_Engineer / Executive_Sales_Industrial Hydraulics_India',
      jobAd: {
        sections: {
          companyDescription: {
            text: '<p>Bosch Rexroth drives motion and control technologies for industrial and mobile applications.</p>',
          },
          jobDescription: {
            text: '<p>Grow industrial hydraulics sales with customer-facing engineering support.</p>',
          },
          qualifications: {
            text: '<p>Mechanical or hydraulic systems experience preferred.</p>',
          },
          additionalInformation: {
            text: '<p>Experience : 4+ years</p>',
          },
        },
      },
    },
  ],
}

test('extractSearchResults maps Bosch Rexroth listing rows and detail payloads into job records', () => {
  const jobs = extractSearchResults({
    listingPayload: sampleListingPayload,
    detailPayloadByRef: sampleDetailPayloadByRef,
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'IN_Bosch Rexroth India_Assistant Manager / Deputy Manager_Company Secretarial & Legal',
    company: 'Bosch Rexroth',
    department: 'Legal',
    location: 'Ahmedabad, India',
    city: 'Ahmedabad',
    country: 'India',
    jobId: 'REF289639O',
    requisitionId: 'REF289639O',
    sourceUrl: 'https://jobs.bosch.com/en/job/REF289639O-in_bosch-rexroth-india_assistant-manager-deputy-manager_company-secretarial-legal',
    applyUrl: 'https://jobs.bosch.com/en/job/REF289639O-in_bosch-rexroth-india_assistant-manager-deputy-manager_company-secretarial-legal',
    employmentType: 'Unlimited',
    experienceRequired: '8+ years',
    minimumQualification: 'Company secretary background with corporate law experience.',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-29T05:35:54.243Z',
    closingDate: null,
    jobDescription: 'Bosch Rexroth drives motion and control technologies for industrial and mobile applications. Support company secretarial and legal work across the India business. Company secretary background with corporate law experience. Experience : 8+ years',
  })
  assert.deepEqual(jobs[1], {
    title: 'IN_Bosch Rexroth India_Engineer / Executive_Sales_Industrial Hydraulics_India',
    company: 'Bosch Rexroth',
    department: 'Engineering',
    location: 'Ahmedabad, India',
    city: 'Ahmedabad',
    country: 'India',
    jobId: 'REF289424C',
    requisitionId: 'REF289424C',
    sourceUrl: 'https://jobs.bosch.com/en/job/REF289424C-in_bosch-rexroth-india_engineer-executive_sales_industrial-hydraulics_india',
    applyUrl: 'https://jobs.bosch.com/en/job/REF289424C-in_bosch-rexroth-india_engineer-executive_sales_industrial-hydraulics_india',
    employmentType: 'Unlimited',
    experienceRequired: '4+ years',
    minimumQualification: 'Mechanical or hydraulic systems experience preferred.',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-25T03:55:36.492Z',
    closingDate: null,
    jobDescription: 'Bosch Rexroth drives motion and control technologies for industrial and mobile applications. Grow industrial hydraulics sales with customer-facing engineering support. Mechanical or hydraulic systems experience preferred. Experience : 4+ years',
  })
})

test('run fetches Bosch Rexroth listing and detail data through the public Bosch content API', async () => {
  const requestedUrls = []
  const scraper = createBoschRexrothScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === buildSearchUrl({ page: 1, pageSize: 25 })) {
        return sampleListingPayload
      }

      const refNumber = Object.keys(sampleDetailPayloadByRef).find(
        (candidate) => url === buildDetailUrl(candidate),
      )

      if (refNumber) {
        return sampleDetailPayloadByRef[refNumber]
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(
    requestedUrls,
    [
      buildSearchUrl({ page: 1, pageSize: 25 }),
      buildDetailUrl('REF289639O'),
      buildDetailUrl('REF289424C'),
    ],
  )
  assert.deepEqual(extractSearchResultSet(sampleListingPayload), sampleListingPayload._embedded['rh:result'][0])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'boschrexroth')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, jobs[0].scrapedAt)
  assert.match(buildSearchUrl({ page: 1, pageSize: 25 }), /legal_entity/i)
  assert.match(buildSearchUrl({ page: 1, pageSize: 25 }), /search_term/i)
  assert.equal(CAREER_PAGE_URL, 'https://jobs.bosch.com/en/?pages=1&country=in')
})
