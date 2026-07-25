import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'autmanrobotics',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')

const currentHomepageHtml = `
<!doctype html>
  <html lang="en">
  <head>
    <title>Home | Autman Robotics</title>
    <link href="https://www.aut-man.com" rel="canonical" />
  </head>
  <body>
    <a href="https://www.aut-man.com/careers">Careers</a>
    <h1>AUTMAN Robotics</h1>
    <p>Welcome to AUTMAN Robotics</p>
    <a href="mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer"><svg></svg></a>
  </body>
</html>
`

const currentCareersApplyLinksHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Autman Robotics</title>
    <link rel="canonical" href="https://www.aut-man.com/careers" />
  </head>
  <body>
    <h1>WE MAKE BIG IDEAS HAPPEN</h1>
    <p>Welcome to AUTMAN Robotics - a hub of innovation located in the heart of Birmingham, UK</p>
    <h2>CAREER OPPORTUNITIES</h2>
    <h3>Robotics Engineer</h3>
    <p>Birmingham, UK</p>
    <p>We are looking for a Robotics Engineer.</p>
    <a href="mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer" aria-label="Apply Now"><span>Apply Now</span></a>
    <a href="mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer"><svg></svg></a>
    <h3>Neuroscientist</h3>
    <p>Birmingham, UK</p>
    <p>We are seeking a Neuroscientist.</p>
    <a href="mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Neuroscientist%20" aria-label="Apply Now"><span>Apply Now</span></a>
    <a href="mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Neuroscientist%20"><svg></svg></a>
    <p>Don't see a position that matches your skills? We welcome you to submit your CV for our review.</p>
  </body>
</html>
`

const loadAutmanRoboticsModule = async () => {
  try {
    return await import('../autmanrobotics/script.js')
  } catch {
    assert.fail('Expected Autman Robotics scraper module at ../autmanrobotics/script.js')
  }
}

test('Autman Robotics sentinels recognize the verified homepage and first-party careers page', async () => {
  const autmanRobotics = await loadAutmanRoboticsModule()

  assert.equal(autmanRobotics.SOURCE, 'autmanrobotics')
  assert.equal(autmanRobotics.COMPANY, 'Autman Robotics')
  assert.equal(autmanRobotics.COMPANY_DOMAIN, 'aut-man.com')
  assert.equal(autmanRobotics.HOMEPAGE_URL, 'https://www.aut-man.com/')
  assert.equal(autmanRobotics.CAREERS_URL, 'https://www.aut-man.com/careers')
  assert.equal(autmanRobotics.APPLY_EMAIL, 'shini@aut-man.com')
  assert.equal(autmanRobotics.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(autmanRobotics.hasOfficialHomepageSignal(currentHomepageHtml), true)
  assert.equal(autmanRobotics.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(autmanRobotics.extractApplyRoleLinks(careersHtml), [
    {
      title: 'Robotics Engineer',
      applyUrl: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer',
    },
    {
      title: 'Neuroscientist',
      applyUrl: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Neuroscientist%20',
    },
  ])
})

test('Autman Robotics extracts both live mailto apply roles when Wix renders duplicate text and icon anchors', async () => {
  const autmanRobotics = await loadAutmanRoboticsModule()

  assert.deepEqual(autmanRobotics.extractApplyRoleLinks(currentCareersApplyLinksHtml), [
    {
      title: 'Robotics Engineer',
      applyUrl: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer',
    },
    {
      title: 'Neuroscientist',
      applyUrl: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Neuroscientist%20',
    },
  ])
})

test('Autman Robotics extracts the current inline public openings from the verified careers page', async () => {
  const autmanRobotics = await loadAutmanRoboticsModule()

  const jobs = autmanRobotics.extractPublicOpenings(careersHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs, [
    {
      title: 'Robotics Engineer',
      department: null,
      location: 'Birmingham, United Kingdom',
      city: 'Birmingham',
      state: null,
      country: 'United Kingdom',
      sourceUrl: 'https://www.aut-man.com/careers',
      applyUrl: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer',
      jobId: 'autmanrobotics-robotics-engineer',
      requisitionId: 'autmanrobotics-robotics-engineer',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        "We are looking for a Robotics Engineer with expertise in control systems, motion planning, and industrial robot programming. Strong skills in kinematics, real-time feedback control, and sensor fusion are essential. If you excel at problem-solving and designing adaptive robotic systems, let's connect.",
      remoteStatus: null,
    },
    {
      title: 'Neuroscientist',
      department: null,
      location: 'Birmingham, United Kingdom',
      city: 'Birmingham',
      state: null,
      country: 'United Kingdom',
      sourceUrl: 'https://www.aut-man.com/careers',
      applyUrl: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Neuroscientist%20',
      jobId: 'autmanrobotics-neuroscientist',
      requisitionId: 'autmanrobotics-neuroscientist',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        "We are seeking a Neuroscientist with expertise in computational neuroscience, neural encoding, and sensory-motor integration. A strong understanding of bio-inspired control, spiking neural networks, and real-time sensory processing is essential. If you're passionate about applying neuroscience to intelligent robotics, we'd love to hear from you.",
      remoteStatus: null,
    },
  ])
})

test('Autman Robotics run verifies the trusted first-party surfaces and decorates the scraped jobs', async () => {
  const autmanRobotics = await loadAutmanRoboticsModule()
  const requestedUrls = []

  const jobs = await autmanRobotics.createAutmanRoboticsScraper({
    maxJobs: 1,
    now: () => '2026-07-11T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === autmanRobotics.HOMEPAGE_URL) return homepageHtml
      if (url === autmanRobotics.CAREERS_URL) return careersHtml

      throw new Error(`Unexpected Autman Robotics URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    autmanRobotics.HOMEPAGE_URL,
    autmanRobotics.CAREERS_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Robotics Engineer',
    department: null,
    company: 'Autman Robotics',
    location: 'Birmingham, United Kingdom',
    city: 'Birmingham',
    state: null,
    country: 'United Kingdom',
    source: 'autmanrobotics',
    companyCareerPage: 'https://www.aut-man.com/careers',
    companyDomain: 'aut-man.com',
    atsPlatform: 'official-company-careers',
    sourceUrl: 'https://www.aut-man.com/careers',
    applyUrl: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer',
    link: 'mailto:shini@aut-man.com?subject=Interested%20to%20join%20Autman%20%3A%20Robotics%20Engineer',
    jobId: 'autmanrobotics-robotics-engineer',
    requisitionId: 'autmanrobotics-robotics-engineer',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      "We are looking for a Robotics Engineer with expertise in control systems, motion planning, and industrial robot programming. Strong skills in kinematics, real-time feedback control, and sensor fusion are essential. If you excel at problem-solving and designing adaptive robotic systems, let's connect.",
    remoteStatus: null,
    scrapedAt: '2026-07-11T00:00:00.000Z',
  })
})

test('Autman Robotics fails closed when the homepage or careers page contract changes', async () => {
  const autmanRobotics = await loadAutmanRoboticsModule()

  await assert.rejects(
    autmanRobotics.createAutmanRoboticsScraper().run({
      fetchText: async (url) => {
        if (url === autmanRobotics.HOMEPAGE_URL) {
          return currentHomepageHtml.replaceAll('https://www.aut-man.com/careers', 'https://www.aut-man.com/contact-5')
        }

        return careersHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    autmanRobotics.createAutmanRoboticsScraper().run({
      fetchText: async (url) => {
        if (url === autmanRobotics.HOMEPAGE_URL) return homepageHtml
        if (url === autmanRobotics.CAREERS_URL) {
          return careersHtml.replace('CAREER OPPORTUNITIES', 'TEAM OPPORTUNITIES')
        }

        throw new Error(`Unexpected Autman Robotics URL: ${url}`)
      },
    }),
    /verified first-party careers page/i,
  )
})
