import assert from 'node:assert/strict'
import test from 'node:test'

const loadIntuitiveModule = async () => {
  try {
    return await import('../../scraper/intuitive/script.js')
  } catch {
    assert.fail('Expected Intuitive scraper module at ../../scraper/intuitive/script.js')
  }
}

const indiaListing = {
  id: '744000139700000',
  name: 'Software Engineer',
  refNumber: 'JOB216999',
  releasedDate: '2026-07-25T00:00:00.000Z',
  company: { identifier: 'Intuitive', name: 'Intuitive' },
  location: {
    city: 'Bengaluru',
    region: 'KA',
    country: 'in',
    fullLocation: 'Bengaluru, KA, India',
  },
  function: { label: 'Engineering' },
  typeOfEmployment: { label: 'Full-time' },
  visibility: 'PUBLIC',
  ref: 'https://api.smartrecruiters.com/v1/companies/Intuitive/postings/744000139700000',
}

test('Intuitive maps India jobs only from its pinned SmartRecruiters tenant', async () => {
  const intuitive = await loadIntuitiveModule()
  const jobs = await intuitive.createIntuitiveScraper().run({
    fetchJson: async (url) => {
      if (url.includes('/postings?')) {
        return { offset: 0, totalFound: 1, content: [indiaListing] }
      }
      return {
        ...indiaListing,
        postingUrl: 'https://careers.intuitive.com/en/jobs/744000139700000/JOB216999/software-engineer/',
        applyUrl: 'https://careers.intuitive.com/en/jobs/744000139700000/JOB216999/software-engineer/?oga=true',
        jobAd: { sections: { jobDescription: { text: '<p>Build medical software.</p>' } } },
      }
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [{
    title: 'Software Engineer',
    company: 'Intuitive',
    department: 'Engineering',
    location: 'Bengaluru, KA, India',
    city: 'Bengaluru',
    country: 'India',
    link: 'https://careers.intuitive.com/en/jobs/744000139700000/JOB216999/software-engineer/',
    applyUrl: 'https://careers.intuitive.com/en/jobs/744000139700000/JOB216999/software-engineer/?oga=true',
    sourceUrl: 'https://careers.intuitive.com/en/jobs/744000139700000/JOB216999/software-engineer/',
    source: 'intuitive',
    jobId: '744000139700000',
    requisitionId: 'JOB216999',
    employmentType: 'Full-time',
    postingDate: '2026-07-25T00:00:00.000Z',
    jobDescription: 'Build medical software.',
    scrapedAt: '2026-07-25T00:00:00.000Z',
  }])
})

test('Intuitive fails closed when the official SmartRecruiters tenant changes', async () => {
  const intuitive = await loadIntuitiveModule()

  await assert.rejects(
    intuitive.createIntuitiveScraper().run({
      fetchJson: async () => ({
        offset: 0,
        totalFound: 1,
        content: [{ ...indiaListing, company: { identifier: 'AnotherCompany' } }],
      }),
    }),
    /company identifier changed/i,
  )
})

test('Intuitive accepts only its official SmartRecruiters-hosted application URL', async () => {
  const intuitive = await loadIntuitiveModule()
  const jobs = await intuitive.createIntuitiveScraper().run({
    fetchJson: async (url) => {
      if (url.includes('/postings?')) return { offset: 0, totalFound: 1, content: [indiaListing] }
      return {
        ...indiaListing,
        postingUrl: 'https://jobs.smartrecruiters.com/Intuitive/744000139700000-software-engineer',
        applyUrl: 'https://jobs.smartrecruiters.com/Intuitive/744000139700000-software-engineer?oga=true',
        jobAd: { sections: { jobDescription: { text: '<p>Build medical software.</p>' } } },
      }
    },
  })

  assert.equal(jobs[0].sourceUrl, 'https://jobs.smartrecruiters.com/Intuitive/744000139700000-software-engineer')
})
