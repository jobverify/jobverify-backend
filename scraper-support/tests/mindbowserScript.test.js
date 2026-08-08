import assert from 'node:assert/strict'
import test from 'node:test'

const directBoardUrl =
  'https://career.hrone.cloud/career-portal?appId=D4IM8Pter1tGpvCi9qWp3h0li63WVYC-4Cbl_BKzuTL2vSHSOUvAJ4TORFt2EHbhhfmB9gSFEb8yxNeD80N5uO44aEac23GQDGWsG3B0ja3vDYvD5hSh4A9ODQxbmKVE&dc=mindbowser&rqt=UVozgs-AUV1ILPLBxDlf7A&cc=RmRTOEP811ZQ7X23qWFemnOjjDO74eWSy-tIBe7xALk'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Mindbowser</title>
  </head>
  <body>
    <main>
      <h2>Current Openings</h2>
      <p>Ready to reignite your career in an inclusive and supportive environment? Explore opportunities and apply today!</p>
      <p>Send your CVs/Portfolio at ta@mindbowser.com</p>
      <a href="https://hr-1.in/829c17">Current Openings ↗</a>
      <a href="https://hr-1.in/829c17">Apply Now ↗</a>
      <a href="/careers/">Careers</a>
      <a href="/careers/">Apply Now</a>
    </main>
  </body>
</html>
`

const renderedCards = [
  {
    title: 'Senior Business Analyst - US Healthcare Domain (4-7 Years)',
    requisitionId: 'JO00115',
    applyUrl:
      'https://career.hrone.cloud/apply-job?appId=D4IM8Pter1tGpvCi9qWp3h0li63WVYC-4Cbl_BKzuTL2vSHSOUvAJ4TORFt2EHbhhfmB9gSFEb8yxNeD80N5uO44aEac23GQDGWsG3B0ja3vDYvD5hSh4A9ODQxbmKVE&dc=mindbowser&rqt=UVozgs-AUV1ILPLBxDlf7A&cc=RmRTOEP811ZQ7X23qWFemnOjjDO74eWSy-tIBe7xALk&pid=job-115',
  },
  {
    title: 'Associate Business Consultant',
    requisitionId: 'JO00088',
    applyUrl: null,
  },
]

const loadMindbowserModule = async () => {
  try {
    return await import('../../scraper/mindbowser/script.js')
  } catch {
    assert.fail('Expected Mindbowser scraper module at ../../scraper/mindbowser/script.js')
  }
}

test('Mindbowser helpers stay pinned to the verified official careers handoff and trusted HROne board', async () => {
  const mindbowser = await loadMindbowserModule()

  assert.equal(mindbowser.SOURCE, 'mindbowser')
  assert.equal(mindbowser.COMPANY, 'Mindbowser')
  assert.equal(mindbowser.CAREERS_URL, 'https://www.mindbowser.com/careers/')
  assert.equal(mindbowser.HRONE_SHORT_URL, 'https://hr-1.in/829c17')
  assert.equal(mindbowser.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(mindbowser.extractVacanciesBoardUrl(officialCareersHtml), mindbowser.HRONE_SHORT_URL)
  assert.equal(mindbowser.isTrustedBoardPageUrl(directBoardUrl), true)
  assert.equal(
    mindbowser.toTrustedApplyUrl(
      'https://career.hrone.cloud/apply-job?appId=D4IM8Pter1tGpvCi9qWp3h0li63WVYC-4Cbl_BKzuTL2vSHSOUvAJ4TORFt2EHbhhfmB9gSFEb8yxNeD80N5uO44aEac23GQDGWsG3B0ja3vDYvD5hSh4A9ODQxbmKVE&dc=mindbowser&rqt=UVozgs-AUV1ILPLBxDlf7A&cc=RmRTOEP811ZQ7X23qWFemnOjjDO74eWSy-tIBe7xALk&pid=job-115',
    ),
    'https://career.hrone.cloud/apply-job?appId=D4IM8Pter1tGpvCi9qWp3h0li63WVYC-4Cbl_BKzuTL2vSHSOUvAJ4TORFt2EHbhhfmB9gSFEb8yxNeD80N5uO44aEac23GQDGWsG3B0ja3vDYvD5hSh4A9ODQxbmKVE&dc=mindbowser&rqt=UVozgs-AUV1ILPLBxDlf7A&cc=RmRTOEP811ZQ7X23qWFemnOjjDO74eWSy-tIBe7xALk&pid=job-115',
  )
  assert.equal(mindbowser.toTrustedApplyUrl('https://example.com/apply'), null)

  assert.deepEqual(mindbowser.extractMindbowserJobs(renderedCards, { boardUrl: directBoardUrl }), [
    {
      title: 'Senior Business Analyst - US Healthcare Domain (4-7 Years)',
      company: 'Mindbowser',
      department: null,
      location: null,
      city: null,
      country: 'India',
      jobId: 'JO00115',
      requisitionId: 'JO00115',
      sourceUrl:
        'https://career.hrone.cloud/apply-job?appId=D4IM8Pter1tGpvCi9qWp3h0li63WVYC-4Cbl_BKzuTL2vSHSOUvAJ4TORFt2EHbhhfmB9gSFEb8yxNeD80N5uO44aEac23GQDGWsG3B0ja3vDYvD5hSh4A9ODQxbmKVE&dc=mindbowser&rqt=UVozgs-AUV1ILPLBxDlf7A&cc=RmRTOEP811ZQ7X23qWFemnOjjDO74eWSy-tIBe7xALk&pid=job-115',
      applyUrl:
        'https://career.hrone.cloud/apply-job?appId=D4IM8Pter1tGpvCi9qWp3h0li63WVYC-4Cbl_BKzuTL2vSHSOUvAJ4TORFt2EHbhhfmB9gSFEb8yxNeD80N5uO44aEac23GQDGWsG3B0ja3vDYvD5hSh4A9ODQxbmKVE&dc=mindbowser&rqt=UVozgs-AUV1ILPLBxDlf7A&cc=RmRTOEP811ZQ7X23qWFemnOjjDO74eWSy-tIBe7xALk&pid=job-115',
      employmentType: null,
      experienceRequired: '4-7 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'Associate Business Consultant',
      company: 'Mindbowser',
      department: null,
      location: null,
      city: null,
      country: 'India',
      jobId: 'JO00088',
      requisitionId: 'JO00088',
      sourceUrl: directBoardUrl,
      applyUrl: directBoardUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('Mindbowser run validates the official careers handoff and decorates trusted rendered HROne roles', async () => {
  const mindbowser = await loadMindbowserModule()
  const events = []
  const page = {
    async goto(url) {
      events.push(`goto:${url}`)
    },
    async waitForSelector(selector) {
      events.push(`wait:${selector}`)
    },
    url() {
      return directBoardUrl
    },
  }
  const browser = {
    async close() {
      events.push('close')
    },
  }

  const jobs = await mindbowser.createMindbowserScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      events.push(`careers:${url}`)
      return officialCareersHtml
    },
    launchBrowser: async () => browser,
    createPage: async () => page,
    readRenderedCards: async (receivedPage) => {
      assert.equal(receivedPage, page)
      events.push('read:cards')
      return renderedCards
    },
  })

  assert.deepEqual(events, [
    `careers:${mindbowser.CAREERS_URL}`,
    `goto:${mindbowser.HRONE_SHORT_URL}`,
    `wait:${mindbowser.HRONE_CARD_SELECTOR}`,
    'read:cards',
    'close',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Mindbowser')
  assert.equal(jobs[0].source, 'mindbowser')
  assert.equal(
    jobs[0].link,
    'https://career.hrone.cloud/apply-job?appId=D4IM8Pter1tGpvCi9qWp3h0li63WVYC-4Cbl_BKzuTL2vSHSOUvAJ4TORFt2EHbhhfmB9gSFEb8yxNeD80N5uO44aEac23GQDGWsG3B0ja3vDYvD5hSh4A9ODQxbmKVE&dc=mindbowser&rqt=UVozgs-AUV1ILPLBxDlf7A&cc=RmRTOEP811ZQ7X23qWFemnOjjDO74eWSy-tIBe7xALk&pid=job-115',
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Mindbowser readRenderedHrOneCards swallows late popup timeouts after a click failure', async () => {
  const mindbowser = await loadMindbowserModule()
  let unhandledReason = null
  const onUnhandledRejection = (reason) => {
    unhandledReason = reason
  }
  const popupTimeoutError = new Error('Timed out after waiting 5000ms')
  popupTimeoutError.name = 'TimeoutError'

  process.once('unhandledRejection', onUnhandledRejection)

  try {
    const page = {
      async waitForFunction() {},
      async $$eval(selector) {
        if (selector === mindbowser.HRONE_CARD_SELECTOR) {
          return renderedCards.map(({ applyUrl, ...card }) => card)
        }
        throw new Error(`Unexpected selector: ${selector}`)
      },
      async $$(selector) {
        assert.equal(selector, `${mindbowser.HRONE_CARD_SELECTOR} .cls-apply-btn`)
        return [{
          async click() {
            throw new Error('Popup click failed')
          },
        }]
      },
      async bringToFront() {},
      browser() {
        return {
          targets: () => [],
          waitForTarget: async () => new Promise((_, reject) => {
            setTimeout(() => reject(popupTimeoutError), 0)
          }),
        }
      },
      target() {
        return { id: 'main-target' }
      },
    }

    const cards = await mindbowser.readRenderedHrOneCards(page)
    assert.deepEqual(cards, renderedCards.map(({ title, requisitionId }) => ({
      title,
      requisitionId,
      applyUrl: null,
    })))
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.equal(unhandledReason, null)
  } finally {
    process.removeListener('unhandledRejection', onUnhandledRejection)
  }
})

test('Mindbowser fails closed when the careers page drifts or the HROne handoff is no longer trusted', async () => {
  const mindbowser = await loadMindbowserModule()

  await assert.rejects(
    mindbowser.createMindbowserScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    mindbowser.createMindbowserScraper().run({
      fetchText: async () => officialCareersHtml.replaceAll('https://hr-1.in/829c17', 'https://example.com/jobs'),
    }),
    /verified public hrone vacancies surface/i,
  )

  await assert.rejects(
    mindbowser.createMindbowserScraper().run({
      fetchText: async () => officialCareersHtml,
      launchBrowser: async () => ({ close: async () => {} }),
      createPage: async () => ({
        goto: async () => {},
        waitForSelector: async () => {},
        url: () => 'https://example.com/jobs',
      }),
      readRenderedCards: async () => renderedCards,
    }),
    /trusted hrone board/i,
  )
})
