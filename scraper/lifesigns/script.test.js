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
  roleCards: [],
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
    '/careers/lead-network-engineer/',
    '/careers/biomedical-field-implementation-engineer-icu-solutions/',
    '/careers/digital-patient-monitoring-executive-cmt/',
    '/careers/hospital-support-executive-hse/',
  ],
  roleCards: [
    {
      href: '/careers/lead-network-engineer/',
      text: 'Lead Network Engineer Full-TimeDelhi',
    },
    {
      href: '/careers/biomedical-field-implementation-engineer-icu-solutions/',
      text: 'Biomedical Field Implementation Engineer Full-TimeBangalore',
    },
    {
      href: '/careers/digital-patient-monitoring-executive-cmt/',
      text: 'Digital Patient Monitoring Executive (Central Monitoring Executive) Full-TimeChennai',
    },
    {
      href: '/careers/hospital-support-executive-hse/',
      text: 'Hospital Support Executive (HSE) Full-TimeMysore',
    },
  ],
}

test('LifeSigns scraper recognizes the verified homepage and careers surfaces', () => {
  assert.equal(SOURCE, 'lifesigns')
  assert.equal(COMPANY, 'LifeSigns')
  assert.equal(HOMEPAGE_URL, 'https://www.lifesigns.us/')
  assert.equal(CAREERS_URL, 'https://www.lifesigns.us/careers/')
  assert.equal(Object.keys(EXPECTED_ROLE_CARDS).length, 4)
  assert.equal(hasOfficialHomepageSignal(homepageSnapshot), true)
  assert.equal(hasOfficialCareersSignal(careersSnapshot), true)
})

test('LifeSigns scraper extracts the verified rendered open roles', () => {
  const jobs = extractVerifiedOpenRoles(careersSnapshot)

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    location: job.location,
    employmentType: job.employmentType,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
  })), [
    {
      title: 'Lead Network Engineer',
      location: 'Delhi, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/',
      applyUrl: 'https://www.lifesigns.us/careers/',
    },
    {
      title: 'Biomedical Field Implementation Engineer',
      location: 'Bangalore, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/',
      applyUrl: 'https://www.lifesigns.us/careers/',
    },
    {
      title: 'Digital Patient Monitoring Executive (Central Monitoring Executive)',
      location: 'Chennai, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/',
      applyUrl: 'https://www.lifesigns.us/careers/',
    },
    {
      title: 'Hospital Support Executive (HSE)',
      location: 'Mysore, India',
      employmentType: 'Full-Time',
      sourceUrl: 'https://www.lifesigns.us/careers/',
      applyUrl: 'https://www.lifesigns.us/careers/',
    },
  ])
})

test('LifeSigns scraper runs end to end and fails closed on rendered-role drift', async () => {
  const requestedUrls = []

  const jobs = await createLifeSignsScraper().run({
    fetchPageSnapshot: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageSnapshot
      if (url === CAREERS_URL) return careersSnapshot

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 4)
  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL])
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
          return {
            ...careersSnapshot,
            roleCards: careersSnapshot.roleCards.slice(0, 3),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /rendered public openings changed materially|missing verified opening/i,
  )
})
