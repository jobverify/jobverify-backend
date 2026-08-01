import assert from 'node:assert/strict'
import test from 'node:test'

const loadBgstModule = async () => {
  try {
    return await import('../../scraper/boschglobalsoftwaretechnologies/script.js')
  } catch {
    return null
  }
}

const sampleListingPayload = {
  _embedded: {
    'rh:result': [
      {
        meta: [{ count: 2 }],
        data: [
          {
            refNumber: 'REF310001A',
            name: 'Senior SW developer sensor',
            releasedDate: '2026-06-30T08:00:00.000Z',
            jobUrl: 'REF310001A-senior-sw-developer-sensor',
            function: {
              id: 'engineering',
              label: 'Engineering',
            },
            location: {
              workLocation: 'Bengaluru',
              country: 'in',
              hybrid: true,
              city: 'Bengaluru',
              remote: false,
            },
            legal_entity: {
              valueId: 'Robert Bosch Engineering and Business Solutions Private Ltd.',
              valueLabel: 'Bosch Global Software Technologies Private Limited',
            },
            type_of_contract: {
              valueLabel: 'Unlimited',
            },
          },
          {
            refNumber: 'REF310002B',
            name: 'Software Architect',
            releasedDate: '2026-06-29T08:00:00.000Z',
            jobUrl: 'REF310002B-software-architect',
            function: {
              id: 'engineering',
              label: 'Engineering',
            },
            location: {
              workLocation: 'Coimbatore',
              country: 'in',
              hybrid: false,
              city: 'Coimbatore',
              remote: false,
            },
            legal_entity: {
              valueId: 'Robert Bosch Engineering and Business Solutions Private Ltd.',
              valueLabel: 'Bosch Global Software Technologies Private Limited',
            },
            type_of_contract: {
              valueLabel: 'Unlimited',
            },
          },
        ],
      },
    ],
  },
}

const sampleDetailPayloadByRef = {
  REF310001A: [
    {
      releasedDate: '2026-06-30T08:00:00.000Z',
      refNumber: 'REF310001A',
      name: 'Senior SW developer sensor',
      jobAd: {
        sections: {
          companyDescription: {
            text: '<p>Bosch Global Software Technologies builds software and engineering solutions.</p>',
          },
          jobDescription: {
            text: '<p>Build embedded sensing software for next-generation products.</p>',
          },
          qualifications: {
            text: '<p>Strong C++ and system design experience.</p>',
          },
          additionalInformation: {
            text: '<p>Experience : 6+ years</p>',
          },
        },
      },
    },
  ],
  REF310002B: [
    {
      releasedDate: '2026-06-29T08:00:00.000Z',
      refNumber: 'REF310002B',
      name: 'Software Architect',
      jobAd: {
        sections: {
          companyDescription: {
            text: '<p>Bosch Global Software Technologies builds software and engineering solutions.</p>',
          },
          jobDescription: {
            text: '<p>Lead architecture decisions across distributed product teams.</p>',
          },
          qualifications: {
            text: '<p>Deep architecture and cloud platform knowledge.</p>',
          },
          additionalInformation: {
            text: '<p>Experience : 10+ years</p>',
          },
        },
      },
    },
  ],
}

test('extractSearchResults maps Bosch Global Software Technologies listings and details into job records', async () => {
  const bgst = await loadBgstModule()
  assert.ok(bgst)

  const jobs = bgst.extractSearchResults({
    listingPayload: sampleListingPayload,
    detailPayloadByRef: sampleDetailPayloadByRef,
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior SW developer sensor',
    company: 'Bosch Global Software Technologies',
    department: 'Engineering',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'REF310001A',
    requisitionId: 'REF310001A',
    sourceUrl: 'https://jobs.bosch.com/en/job/REF310001A-senior-sw-developer-sensor',
    applyUrl: 'https://jobs.bosch.com/en/job/REF310001A-senior-sw-developer-sensor',
    employmentType: 'Unlimited',
    experienceRequired: '6+ years',
    minimumQualification: 'Strong C++ and system design experience.',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-30T08:00:00.000Z',
    closingDate: null,
    jobDescription: 'Bosch Global Software Technologies builds software and engineering solutions. Build embedded sensing software for next-generation products. Strong C++ and system design experience. Experience : 6+ years',
  })
  assert.equal(jobs[1].company, 'Bosch Global Software Technologies')
  assert.equal(jobs[1].city, 'Coimbatore')
  assert.equal(jobs[1].jobId, 'REF310002B')
})

test('run fetches Bosch Global Software Technologies listings and details through the public Bosch content API', async () => {
  const bgst = await loadBgstModule()
  assert.ok(bgst)

  const requestedUrls = []
  const scraper = bgst.createBoschGlobalSoftwareTechnologiesScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === bgst.buildSearchUrl({ page: 1, pageSize: 25 })) {
        return sampleListingPayload
      }

      const refNumber = Object.keys(sampleDetailPayloadByRef).find(
        (candidate) => url === bgst.buildDetailUrl(candidate),
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
      bgst.buildSearchUrl({ page: 1, pageSize: 25 }),
      bgst.buildDetailUrl('REF310001A'),
      bgst.buildDetailUrl('REF310002B'),
    ],
  )
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'boschglobalsoftwaretechnologies')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(bgst.buildSearchUrl({ page: 1, pageSize: 25 }), /Robert%20Bosch%20Engineering/i)
  assert.equal(bgst.CAREER_PAGE_URL, 'https://jobs.bosch.com/en/?pages=1&country=in')
})
