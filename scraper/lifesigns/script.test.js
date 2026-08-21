import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  EXPECTED_ROLE_CARDS,
  HOMEPAGE_URL,
  SOURCE,
  createLifeSignsScraper,
  extractVerifiedOpenRoles,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
  hasVerifiedRoleDetailSignal,
} from './script.js'

const homepageSnapshot = {
  status: 200,
  url: 'https://www.lifesigns.us/',
  title: 'Lifesigns | Intelligent patient monitoring for smarter decisions',
  text: `
    Lifesigns | Intelligent patient monitoring for smarter decisions
    AI-powered patient monitoring across the healthcare ecosystem.
    Predictive intelligence and continuous monitoring, unified across every stage of care.
    Home What we do Case Reports Careers Contact Lifesigns Nexus
    Get a demo
  `,
  links: ['/', '/what-we-do/', '/case-reports/', '/careers/', '/contact/'],
}

const careersSnapshot = {
  status: 200,
  url: 'https://www.lifesigns.us/careers/',
  title: 'Careers at Lifesigns | Challenge convention',
  text: `
    Careers at Lifesigns | Challenge convention
    We challenge convention
    See open roles
    Explore our open roles
    Didn't see the role you're looking for?
    Leave a message
  `,
  links: [
    '/',
    '/careers/',
    '/contact/',
    '/careers/junior-video-editor/',
    '/careers/junior-visual-designer/',
    '/careers/digital-patient-monitoring-executive-cmt/',
    '/careers/hospital-support-executive-hse/',
  ],
}

const roleDetailSnapshots = {
  '/careers/junior-video-editor/': {
    status: 200,
    url: 'https://www.lifesigns.us/careers/junior-video-editor/',
    title: 'Junior Video Editor',
    text: 'Junior Video Editor',
    links: [],
  },
  '/careers/junior-visual-designer/': {
    status: 200,
    url: 'https://www.lifesigns.us/careers/junior-visual-designer/',
    title: 'Junior Visual Designer',
    text: 'Junior Visual Designer',
    links: [],
  },
  '/careers/digital-patient-monitoring-executive-cmt/': {
    status: 200,
    url: 'https://www.lifesigns.us/careers/digital-patient-monitoring-executive-cmt/',
    title: 'Digital Patient Monitoring Executive (Central Monitoring Executive)',
    text: 'Digital Patient Monitoring Executive (Central Monitoring Executive)',
    links: [],
  },
  '/careers/hospital-support-executive-hse/': {
    status: 200,
    url: 'https://www.lifesigns.us/careers/hospital-support-executive-hse/',
    title: 'Hospital Support Executive (HSE)',
    text: 'Hospital Support Executive (HSE)',
    links: [],
  },
}

test('LifeSigns scraper recognizes the verified homepage, careers shell, and pinned role detail surfaces', () => {
  assert.equal(SOURCE, 'lifesigns')
  assert.equal(COMPANY, 'LifeSigns')
  assert.equal(HOMEPAGE_URL, 'https://www.lifesigns.us/')
  assert.equal(CAREERS_URL, 'https://www.lifesigns.us/careers/')
  assert.equal(Object.keys(EXPECTED_ROLE_CARDS).length, 4)
  assert.equal(hasOfficialHomepageSignal(homepageSnapshot), true)
  assert.equal(hasOfficialCareersSignal(careersSnapshot), true)
  assert.equal(
    hasVerifiedRoleDetailSignal(
      roleDetailSnapshots['/careers/hospital-support-executive-hse/'],
      '/careers/hospital-support-executive-hse/',
    ),
    true,
  )
})

test('LifeSigns scraper extracts the verified pinned open roles', () => {
  const jobs = extractVerifiedOpenRoles(careersSnapshot, roleDetailSnapshots)

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    location: job.location,
    employmentType: job.employmentType,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
  })), [
    {
      title: 'Junior Video Editor',
      location: 'Chennai, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/junior-video-editor/',
      applyUrl: 'https://www.lifesigns.us/careers/junior-video-editor/',
    },
    {
      title: 'Junior Visual Designer',
      location: 'Chennai, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/junior-visual-designer/',
      applyUrl: 'https://www.lifesigns.us/careers/junior-visual-designer/',
    },
    {
      title: 'Digital Patient Monitoring Executive (Central Monitoring Executive)',
      location: 'Chennai, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/digital-patient-monitoring-executive-cmt/',
      applyUrl: 'https://www.lifesigns.us/careers/digital-patient-monitoring-executive-cmt/',
    },
    {
      title: 'Hospital Support Executive (HSE)',
      location: 'Surat, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/hospital-support-executive-hse/',
      applyUrl: 'https://www.lifesigns.us/careers/hospital-support-executive-hse/',
    },
  ])
})

test('LifeSigns scraper runs end to end and fails closed on rendered-role drift', async () => {
  const requestedUrls = []
  const expectedRoleUrls = Object.keys(EXPECTED_ROLE_CARDS)
    .map((pathname) => new URL(pathname, HOMEPAGE_URL).toString())

  const jobs = await createLifeSignsScraper().run({
    fetchPageSnapshot: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageSnapshot
      if (url === CAREERS_URL) return careersSnapshot
      const pathname = new URL(url).pathname.endsWith('/') ? new URL(url).pathname : `${new URL(url).pathname}/`
      if (roleDetailSnapshots[pathname]) return roleDetailSnapshots[pathname]

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 4)
  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL, ...expectedRoleUrls])
  assert.equal(jobs[0].source, 'lifesigns')
  assert.equal(jobs[0].companyCareerPage, 'https://www.lifesigns.us/careers/')
  assert.equal(jobs[0].companyDomain, 'lifesigns.us')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)

  await assert.rejects(
    createLifeSignsScraper().run({
      fetchPageSnapshot: async (url) => {
        if (url === HOMEPAGE_URL) {
          return { ...homepageSnapshot, title: 'Placeholder' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    createLifeSignsScraper().run({
      fetchPageSnapshot: async (url) => {
        if (url === HOMEPAGE_URL) return homepageSnapshot
        if (url === CAREERS_URL) {
          return careersSnapshot
        }

        const pathname = new URL(url).pathname.endsWith('/') ? new URL(url).pathname : `${new URL(url).pathname}/`
        if (pathname === '/careers/junior-video-editor/') {
          return {
            ...roleDetailSnapshots[pathname],
            title: 'Placeholder',
          }
        }

        if (roleDetailSnapshots[pathname]) {
          return roleDetailSnapshots[pathname]
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /role detail page drifted/i,
  )
})
