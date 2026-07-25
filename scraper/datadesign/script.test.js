import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures')

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')
const readJsonFixture = (name) => JSON.parse(readFixture(name))

const loadDataDesignModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Data Design scraper module at ./script.js')
  }
}

const homepageHtml = readFixture('homepage.html')
const jobsHtml = readFixture('jobs.html')
const listingPayload = readJsonFixture('jobs-api.json')

test('Data Design helpers stay pinned to the verified homepage, jobs page, and first-party tj_job feed', async () => {
  const datadesign = await loadDataDesignModule()

  assert.equal(datadesign.SOURCE, 'datadesign')
  assert.equal(datadesign.COMPANY, 'Data Design')
  assert.equal(datadesign.HOMEPAGE_URL, 'https://www.datadesign.co.jp/')
  assert.equal(datadesign.CAREERS_PAGE_URL, 'https://recruit.datadesign.co.jp/jobs')
  assert.equal(datadesign.JOBS_API_URL, 'https://recruit.datadesign.co.jp/wp-json/wp/v2/tj_job')
  assert.equal(datadesign.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(datadesign.hasOfficialCareersSignal(jobsHtml), true)
  assert.equal(
    datadesign.buildListingsApiUrl(1),
    'https://recruit.datadesign.co.jp/wp-json/wp/v2/tj_job?_fields=id%2Cdate%2Cslug%2Cstatus%2Ctype%2Clink%2Ctitle%2Cexcerpt%2Ctaro_jobs_fields_data&per_page=100&page=1',
  )

  const jobs = datadesign.extractSearchResults(listingPayload)
  assert.deepEqual(jobs, [
    {
      title: '総合職',
      company: 'Data Design',
      department: null,
      location: '名古屋市, 愛知県, Japan',
      city: '名古屋市',
      state: '愛知県',
      country: 'Japan',
      jobId: 'generalist',
      requisitionId: '1114',
      sourceUrl: 'https://recruit.datadesign.co.jp/jobs/generalist',
      applyUrl: 'https://recruit.datadesign.co.jp/jobs/generalist',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-05-01',
      closingDate: '2027-03-30',
      jobDescription: [
        '仕事内容: 3Dソフトやデジタルツールで企業の課題解決を支援します。',
        '具体的な業務内容: お客様の課題整理 PoCや技術検証',
        '福利厚生: 各種社会保険完備',
        '給与・賃金: 月給245,000円',
        '選考フロー: ご応募 マイナビよりエントリーをお願いします。',
      ].join('\n\n'),
      remoteStatus: 'On-site',
    },
  ])
})

test('run validates the verified first-party Data Design surfaces, paginates the tj_job feed, and decorates jobs', async () => {
  const datadesign = await loadDataDesignModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await datadesign.createDataDesignScraper({ pageSize: 1 }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === datadesign.HOMEPAGE_URL) return homepageHtml
      if (url === datadesign.CAREERS_PAGE_URL) return jobsHtml
      throw new Error(`Unexpected HTML URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === datadesign.buildListingsApiUrl(1, 1)) return listingPayload
      if (url === datadesign.buildListingsApiUrl(2, 1)) return []
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedTextUrls, [
    'https://www.datadesign.co.jp/',
    'https://recruit.datadesign.co.jp/jobs',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://recruit.datadesign.co.jp/wp-json/wp/v2/tj_job?_fields=id%2Cdate%2Cslug%2Cstatus%2Ctype%2Clink%2Ctitle%2Cexcerpt%2Ctaro_jobs_fields_data&per_page=1&page=1',
    'https://recruit.datadesign.co.jp/wp-json/wp/v2/tj_job?_fields=id%2Cdate%2Cslug%2Cstatus%2Ctype%2Clink%2Ctitle%2Cexcerpt%2Ctaro_jobs_fields_data&per_page=1&page=2',
  ])
  assert.deepEqual(jobs, [
    {
      title: '総合職',
      company: 'Data Design',
      department: null,
      location: '名古屋市, 愛知県, Japan',
      city: '名古屋市',
      state: '愛知県',
      country: 'Japan',
      jobId: 'generalist',
      requisitionId: '1114',
      sourceUrl: 'https://recruit.datadesign.co.jp/jobs/generalist',
      applyUrl: 'https://recruit.datadesign.co.jp/jobs/generalist',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-05-01',
      closingDate: '2027-03-30',
      jobDescription: [
        '仕事内容: 3Dソフトやデジタルツールで企業の課題解決を支援します。',
        '具体的な業務内容: お客様の課題整理 PoCや技術検証',
        '福利厚生: 各種社会保険完備',
        '給与・賃金: 月給245,000円',
        '選考フロー: ご応募 マイナビよりエントリーをお願いします。',
      ].join('\n\n'),
      remoteStatus: 'On-site',
      source: 'datadesign',
      link: 'https://recruit.datadesign.co.jp/jobs/generalist',
      scrapedAt: '2026-07-11T00:00:00.000Z',
    },
  ])
})

test('run fails closed when a verified Data Design public surface or first-party feed signal drifts', async () => {
  const datadesign = await loadDataDesignModule()

  await assert.rejects(
    datadesign.createDataDesignScraper().run({
      fetchText: async (url) => {
        if (url === datadesign.HOMEPAGE_URL) return '<html><body>Unexpected</body></html>'
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /verified official Data Design homepage/i,
  )

  await assert.rejects(
    datadesign.createDataDesignScraper().run({
      fetchText: async (url) => {
        if (url === datadesign.HOMEPAGE_URL) return homepageHtml
        if (url === datadesign.CAREERS_PAGE_URL) return '<html><body>Unexpected</body></html>'
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /verified official Data Design jobs surface/i,
  )

  await assert.rejects(
    datadesign.createDataDesignScraper().run({
      fetchText: async (url) => {
        if (url === datadesign.HOMEPAGE_URL) return homepageHtml
        if (url === datadesign.CAREERS_PAGE_URL) return jobsHtml
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => ({ total: 0 }),
    }),
    /verified Data Design jobs feed/i,
  )

  await assert.rejects(
    datadesign.createDataDesignScraper().run({
      fetchText: async (url) => {
        if (url === datadesign.HOMEPAGE_URL) return homepageHtml
        if (url === datadesign.CAREERS_PAGE_URL) return jobsHtml
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => [
        {
          ...listingPayload[0],
          link: 'https://example.com/jobs/generalist',
        },
      ],
    }),
    /verified first-party Data Design job listing/i,
  )
})
