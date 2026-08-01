import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <html>
    <head><title>Careers at Chingari</title></head>
    <body>
      <a href="https://careers.chingari.io/career/engineering/senior-software-engineer-android/">Senior Software Engineer Android</a>
      <script>var apiRoot = "https://careers.chingari.io/wp-json/"</script>
    </body>
  </html>
`

const categories = [
  { id: 11, name: 'Engineering', slug: 'engineering', count: 1 },
]

const posts = [
  {
    id: 501,
    date: '2026-07-10T06:30:00',
    date_gmt: '2026-07-10T06:30:00',
    slug: 'senior-software-engineer-android',
    link: 'https://careers.chingari.io/career/engineering/senior-software-engineer-android/',
    title: {
      rendered: 'Senior Software Engineer Android',
    },
    content: {
      rendered: '<p>Build consumer video features at scale.</p>',
    },
    categories: [11],
  },
]

const detailPageHtml = `
  <html>
    <body>
      <div class="elementor-heading-title">Senior Software Engineer Android</div>
      <div class="job-meta">
        <span>Location: Bengaluru, India</span>
      </div>
      <form action="/career/apply"></form>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/chingari/script.js')
  } catch {
    assert.fail('Expected Chingari scraper module at ../../scraper/scraper/chingari/script.js')
  }
}

test('Chingari exposes the expected WordPress API endpoints and validates the careers surface', async () => {
  const chingari = await loadModule()

  assert.equal(chingari.CAREERS_PAGE_URL, 'https://careers.chingari.io/career/')
  assert.equal(
    chingari.CAREERS_CATEGORY_API_URL,
    'https://careers.chingari.io/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count',
  )
  assert.equal(
    chingari.CAREERS_POSTS_API_URL,
    'https://careers.chingari.io/wp-json/wp/v2/posts?per_page=100&_fields=id,date,date_gmt,link,slug,title,content,categories',
  )
  assert.equal(chingari.hasOfficialCareersSignal(careersHtml), true)
})

test('extractCareerPosts maps Chingari WordPress career posts and detail pages into the shared job shape', async () => {
  const chingari = await loadModule()
  const jobs = chingari.extractCareerPosts(posts, {
    categoryMap: new Map([[11, 'Engineering']]),
    detailPages: new Map([
      ['https://careers.chingari.io/career/engineering/senior-software-engineer-android/', detailPageHtml],
    ]),
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Software Engineer Android',
    company: 'Chingari',
    department: 'Engineering',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '501',
    requisitionId: '501',
    sourceUrl: 'https://careers.chingari.io/career/engineering/senior-software-engineer-android/',
    applyUrl: 'https://careers.chingari.io/career/engineering/senior-software-engineer-android/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-10T06:30:00.000Z',
    closingDate: null,
    jobDescription: 'Build consumer video features at scale.',
    remoteStatus: 'On-site',
  })
})

test('run loads Chingari posts and hydrates each detail page', async () => {
  const chingari = await loadModule()
  const requests = []

  const jobs = await chingari.createChingariScraper().run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === chingari.CAREERS_PAGE_URL) return careersHtml
      if (url === 'https://careers.chingari.io/career/engineering/senior-software-engineer-android/') return detailPageHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requests.push(url)
      if (url === chingari.CAREERS_CATEGORY_API_URL) return categories
      if (url === chingari.CAREERS_POSTS_API_URL) return posts
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    chingari.CAREERS_PAGE_URL,
    chingari.CAREERS_CATEGORY_API_URL,
    chingari.CAREERS_POSTS_API_URL,
    'https://careers.chingari.io/career/engineering/senior-software-engineer-android/',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'chingari')
  assert.equal(jobs[0].link, 'https://careers.chingari.io/career/engineering/senior-software-engineer-android/')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
