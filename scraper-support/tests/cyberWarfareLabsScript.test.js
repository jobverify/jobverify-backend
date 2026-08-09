import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const careersHtml = `
  <main>
    <h3>AI security intern (Offensive side)</h3>
    <p>In this role, you will conduct research in offensive and AI security.</p>
    <h6>Location: Bangalore, India (On-Site)</h6>
    <h6>Joining: Intern (Immediately)</h6>
    <a href="mailto:career@cyberwarfare.live?subject=AI%20security%20intern">Email your resume at career@cyberwarfare.live</a>
    <h3>Security Intern (Red team)</h3>
    <p>Perform basic reverse engineering and support red team simulations.</p>
    <h6>Location: Bangalore, India (On-Site)</h6>
    <h6>Joining: Intern (Immediately)</h6>
    <a href="mailto:career@cyberwarfare.live?subject=Security%20Intern">Email your resume at career@cyberwarfare.live</a>
    <h3>Digital marketing and social media marketing specialist</h3>
    <p>Strong understanding of SEO and paid advertising campaigns.</p>
    <h6>Location: Bangalore, India (On-Site)</h6>
    <h6>Joining: Full Time (Immediately)</h6>
    <a href="mailto:career@cyberwarfare.live?subject=Digital%20marketing">Email your resume at career@cyberwarfare.live</a>
    <h3>Security Researcher</h3>
    <p>Continuously monitor and analyze emerging cybersecurity threats.</p>
    <h6>Location: Bangalore, India (On-Site)</h6>
    <h6>Joining: Full Time (Immediately)</h6>
    <a href="mailto:career@cyberwarfare.live?subject=Security%20Researcher">Email your resume at career@cyberwarfare.live</a>
    <h3>Security Intern</h3>
    <p>Analyze security systems and develop security standards.</p>
    <h6>Location: Bangalore, India (On-Site)</h6>
    <h6>Joining: Immediately</h6>
    <a href="mailto:career@cyberwarfare.live?subject=Security%20Intern">Email your resume at career@cyberwarfare.live</a>
  </main>
`

const loadCyberWarfareLabsModule = async () => {
  try {
    return await import('../../scraper/cyberwarfarelabs/script.js')
  } catch {
    return null
  }
}

test('catalog registers CyberWarFare Labs against its official careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'cyberwarfarelabs')

  assert.ok(provider)
  assert.equal(provider.companyName, 'CyberWarFare Labs')
  assert.equal(provider.companyCareerPage, 'https://cyberwarfare.live/careers/')
  assert.equal(provider.companyDomain, 'cyberwarfare.live')
  assert.equal(provider.extractionStrategy, 'official-html-career-listings+email-application')
  assert.ok(buildScrapers().find((scraper) => scraper.name === 'cyberwarfarelabs'))
})

test('extractCareerJobs maps official CWL careers listings to India job records', async () => {
  const cyberWarfareLabs = await loadCyberWarfareLabsModule()

  assert.ok(cyberWarfareLabs, 'CyberWarFare Labs scraper module must exist')
  const jobs = cyberWarfareLabs.extractCareerJobs(careersHtml)

  assert.equal(jobs.length, 5)
  assert.deepEqual(jobs[0], {
    title: 'AI security intern (Offensive side)',
    company: 'CyberWarFare Labs',
    department: null,
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'cyberwarfarelabs-ai-security-intern-offensive-side',
    requisitionId: 'cyberwarfarelabs-ai-security-intern-offensive-side',
    sourceUrl: 'https://cyberwarfare.live/careers/',
    applyUrl: 'https://cyberwarfare.live/careers/',
    employmentType: 'Internship',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'In this role, you will conduct research in offensive and AI security. Apply by email: career@cyberwarfare.live',
    remoteStatus: 'On-site',
    compensation: null,
  })
})

test('run fetches the official CyberWarFare Labs careers page', async () => {
  const cyberWarfareLabs = await loadCyberWarfareLabsModule()
  assert.ok(cyberWarfareLabs, 'CyberWarFare Labs scraper module must exist')

  const jobs = await cyberWarfareLabs.createCyberWarfareLabsScraper().run({
    fetchText: async (url) => {
      assert.equal(url, cyberWarfareLabs.CAREERS_URL)
      return careersHtml
    },
  })

  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'cyberwarfarelabs')
  assert.equal(jobs[0].link, cyberWarfareLabs.CAREERS_URL)
  assert.equal(jobs[0].applyUrl, cyberWarfareLabs.CAREERS_URL)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
