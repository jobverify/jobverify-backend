import assert from 'node:assert/strict'
import test from 'node:test'

const loadSayOneModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const careersPageData = {
  url: 'https://www.sayonetech.com/career/',
  title: 'Careers | Jobs in Kochi | SayOne',
  text: `
    Find the Right Place
    Our Culture
    Are You Ready to be an Integral Part of SayOne?
    Job Offers
    Career Email: careers@sayonetech.com
  `,
}

const zeroVacancyPageData = {
  text: `
    Job Offers
    No vacancies available
    Please check back later for new opportunities.
  `,
  jobCardCount: 0,
}

const renderedJobCards = [
  {
    index: 0,
    title: 'Java Spring Boot Developer',
    shortDescription: 'We are looking for a skilled and motivated Software Developer.',
    experience: '3-5',
    location: 'Infopark, Kochi',
    buttonText: 'View Job',
  },
  {
    index: 1,
    title: 'Project Coordinator/Project Manager',
    shortDescription: 'We are seeking a detail-oriented project coordinator.',
    experience: '4+',
    location: 'Kochi',
    buttonText: 'View Job',
  },
]

const modalDetailsByCardIndex = {
  0: {
    title: 'Java Spring Boot Developer',
    experience: '3-5',
    location: 'Infopark, Kochi',
    description: 'We are looking for a skilled and motivated Software Developer with 3+ years of hands-on experience.',
    sections: [
      {
        heading: 'Responsibilities',
        content: 'Design, develop, and maintain Java Spring Boot microservices\nCollaborate with cross-functional teams',
      },
      {
        heading: 'Requirements',
        content: '3-5 years of professional experience\nStrong proficiency in Java and Spring Boot\nSoft Skills\nGood communication',
      },
    ],
    applyUrl: 'mailto:careers@sayonetech.com',
  },
  1: {
    title: 'Project Coordinator/Project Manager',
    experience: '4+',
    location: 'Kochi',
    description: 'We are seeking a detail-oriented project coordinator who can work across teams.',
    sections: [
      {
        heading: 'Responsibilities',
        content: 'Track project progress\nCoordinate with internal stakeholders',
      },
      {
        heading: 'Requirements',
        content: '4+ years of project coordination experience\nExperience with Agile delivery',
      },
    ],
    applyUrl: 'mailto:careers@sayonetech.com',
  },
}

test('SayOne Technologies validates the verified first-party careers surface and zero-vacancy signal', async () => {
  const sayOne = await loadSayOneModule()
  assert.ok(sayOne, 'Expected SayOne Technologies scraper module at ./script.js')

  assert.equal(sayOne.SOURCE, 'sayonetechnologies')
  assert.equal(sayOne.COMPANY, 'SayOne Technologies')
  assert.equal(sayOne.CAREERS_PAGE_URL, 'https://www.sayonetech.com/career/')
  assert.equal(sayOne.hasOfficialCareersSignal(careersPageData), true)
  assert.equal(sayOne.hasExplicitNoVacanciesSignal(zeroVacancyPageData), true)
})

test('SayOne Technologies normalizes rendered cards and modal details into India job records', async () => {
  const sayOne = await loadSayOneModule()
  assert.ok(sayOne, 'Expected SayOne Technologies scraper module at ./script.js')

  assert.deepEqual(
    sayOne.buildJobFromCardAndDetail(renderedJobCards[0], modalDetailsByCardIndex[0]),
    {
      title: 'Java Spring Boot Developer',
      company: 'SayOne Technologies',
      department: null,
      location: 'Infopark, Kochi',
      city: 'Kochi',
      country: 'India',
      jobId: 'java-spring-boot-developer-infopark-kochi-3-5',
      requisitionId: 'java-spring-boot-developer-infopark-kochi-3-5',
      sourceUrl: 'https://www.sayonetech.com/career/',
      applyUrl: 'mailto:careers@sayonetech.com',
      employmentType: null,
      experienceRequired: '3-5',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        '3-5 years of professional experience',
        'Strong proficiency in Java and Spring Boot',
        'Good communication',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: [
        'Description: We are looking for a skilled and motivated Software Developer with 3+ years of hands-on experience.',
        'Responsibilities:\n- Design, develop, and maintain Java Spring Boot microservices\n- Collaborate with cross-functional teams',
        'Requirements:\n- 3-5 years of professional experience\n- Strong proficiency in Java and Spring Boot\n- Soft Skills\n- Good communication',
      ].join('\n\n'),
      remoteStatus: 'On-site',
    },
  )
})

test('SayOne Technologies runs through the verified browser-rendered public careers surface', async () => {
  const sayOne = await loadSayOneModule()
  assert.ok(sayOne, 'Expected SayOne Technologies scraper module at ./script.js')

  const requestedUrls = []
  const detailRequests = []

  const jobs = await sayOne.createSayonetechnologiesScraper({ maxJobs: 2 }).run({
    collectPageDataImpl: async (_page, url) => {
      requestedUrls.push(url)
      return careersPageData
    },
    waitForRenderedJobsImpl: async () => ({
      text: careersPageData.text,
      jobCardCount: renderedJobCards.length,
    }),
    readRenderedJobCardsImpl: async () => renderedJobCards,
    readJobDetailModalImpl: async (_page, cardIndex) => {
      detailRequests.push(cardIndex)
      return modalDetailsByCardIndex[cardIndex]
    },
    launchBrowserImpl: async () => ({ close: async () => {} }),
    createOptimizedPageImpl: async () => ({}),
    now: () => '2026-07-11T07:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [sayOne.CAREERS_PAGE_URL])
  assert.deepEqual(detailRequests, [0, 1])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'sayonetechnologies')
  assert.equal(jobs[0].link, 'mailto:careers@sayonetech.com')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T07:00:00.000Z')
  assert.equal(jobs[1].city, 'Kochi')
})

test('SayOne Technologies returns no jobs only when the verified public page shows an explicit zero-vacancy state', async () => {
  const sayOne = await loadSayOneModule()
  assert.ok(sayOne, 'Expected SayOne Technologies scraper module at ./script.js')

  const jobs = await sayOne.createSayonetechnologiesScraper().run({
    collectPageDataImpl: async () => careersPageData,
    waitForRenderedJobsImpl: async () => zeroVacancyPageData,
    launchBrowserImpl: async () => ({ close: async () => {} }),
    createOptimizedPageImpl: async () => ({}),
  })

  assert.deepEqual(jobs, [])
})

test('SayOne Technologies fails closed when the verified first-party careers contract changes', async () => {
  const sayOne = await loadSayOneModule()
  assert.ok(sayOne, 'Expected SayOne Technologies scraper module at ./script.js')

  await assert.rejects(
    sayOne.createSayonetechnologiesScraper().run({
      collectPageDataImpl: async () => ({
        url: sayOne.CAREERS_PAGE_URL,
        title: 'Unexpected Careers Page',
        text: 'Open roles somewhere else',
      }),
      launchBrowserImpl: async () => ({ close: async () => {} }),
      createOptimizedPageImpl: async () => ({}),
    }),
    /verified official public surface/i,
  )
})
