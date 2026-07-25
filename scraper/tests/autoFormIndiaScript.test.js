import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Software Solutions for Sheet Metal Forming and BiW Assembly | AutoForm Engineering</title>
    <link rel="canonical" href="https://www.autoform.com/en/" />
  </head>
  <body>
    <a href="https://careers.autoform.com/en/">Careers</a>
    <section>
      <p>Your ideas will matter. Join a winning team.</p>
      <a href="https://careers.autoform.com/en/">Visit our career website</a>
    </section>
  </body>
</html>
`

const careersHomeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>careers.autoform.com</title>
    <link rel="canonical" href="https://careers.autoform.com/en/" />
    <meta property="og:title" content="Your career at AutoForm" />
  </head>
  <body>
    <h1>Your ideas will matter.</h1>
    <p>Join a winning team.</p>
    <p>We are AutoForm</p>
    <p>Our innovative software helps the automotive industry produce smarter, more efficiently and more sustainably.</p>
    <a href="https://careers.autoform.com/en/jobs/">Jobs</a>
    <a href="https://careers.autoform.com/en/jobs/">Join our great team now. Browse our job offerings.</a>
  </body>
</html>
`

const currentCareersHomeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>careers.autoform.com</title>
  </head>
  <body>
    <nav>
      <a href="/en/jobs/">Jobs</a>
      <a href="/en/jobs/job-search/">Job search</a>
    </nav>
    <h1>Your ideas will matter.</h1>
    <h3>Join a winning team.</h3>
    <p>We are AutoForm</p>
    <a href="/en/jobs/job-search/">Search now</a>
    <h3>Join our great team now. Browse our job offerings.</h3>
  </body>
</html>
`

const jobSearchHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job search</title>
    <link rel="canonical" href="https://careers.autoform.com/en/jobs/job-search/" />
  </head>
  <body>
    <form>
      <label for="location">Location</label>
      <select name="tx_news_pi1[jobSearch][location]" id="location">
        <option value="">All locations</option>
        <optgroup label="Asia &amp; Pacific">
          <option value="976">India</option>
          <option value="225">China</option>
        </optgroup>
      </select>
      <label for="function">Function</label>
      <select name="tx_news_pi1[jobSearch][function]" id="function">
        <option value="">All functions</option>
        <option value="r-and-d">R&amp;D</option>
        <option value="technical-services">Technical Services</option>
        <option value="marketing">Marketing</option>
        <option value="sales">Sales</option>
        <option value="support-corporate-services">Support &amp; Corporate Services</option>
      </select>
      <label for="career-level">Career level</label>
      <select name="tx_news_pi1[jobSearch][careerLevel]" id="career-level">
        <option value="">All career levels</option>
        <option value="students">Students</option>
        <option value="beginners">Beginners</option>
        <option value="professionals">Professionals</option>
      </select>
    </form>
    <article>
      <a href="/en/jobs/job-search/advertisement/project-engineer/">Project Engineer</a>
      <p>Enschede, the Netherlands</p>
    </article>
    <article>
      <a href="/en/jobs/job-search/advertisement/digitalization-project-engineer-m-f/">Digitalization Project Engineer (m/f)</a>
      <p>Shanghai or Shenzhen</p>
    </article>
  </body>
</html>
`

const currentJobSearchHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job search</title>
  </head>
  <body>
    <nav>
      <a href="https://careers.autoform.com/en/jobs/job-search/">Job search</a>
      <a href="https://careers.autoform.com/en/jobs/">Jobs</a>
    </nav>
    <p>All locations Europe Switzerland Germany The Netherlands France Spain Italy Czech Republic Sweden North America USA Mexico South America Brazil Asia &amp; Pacific China Japan India Korea</p>
    <p>Job function R&amp;D Technical Services Marketing Sales Support &amp; Corporate Services</p>
    <p>Career level Students Beginners Professionals</p>
    <article>
      <a href="/en/jobs/job-search/advertisement/project-engineer/">Project Engineer</a>
    </article>
    <p>A speculative application is always a good idea if you can&rsquo;t find a suitable offer here.</p>
  </body>
</html>
`

const rssWithoutIndiaXml = `
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>careers.autoform</title>
    <link>https://careers.autoform.com/</link>
    <atom:link href="https://careers.autoform.com/en/jobs.rss" rel="self" type="application/rss+xml" />
    <generator>TYPO3 EXT:news</generator>
    <lastBuildDate>Tue, 14 Jul 2026 23:07:15 +0200</lastBuildDate>
    <item>
      <title>Project Engineer</title>
      <link>https://careers.autoform.com/en/jobs/job-search/advertisement/project-engineer/</link>
      <pubDate>Tue, 14 Jul 2026 22:57:00 +0200</pubDate>
      <category>The Netherlands</category>
      <category>Enschede</category>
      <category>Technical Services</category>
      <category>Professionals</category>
      <description><![CDATA[<p>Location: Enschede, the Netherlands</p><p>Join our Technical Services team.</p>]]></description>
      <content:encoded><![CDATA[<p>Location: Enschede, the Netherlands</p><p>Join our Technical Services team.</p>]]></content:encoded>
    </item>
    <item>
      <title>Digitalization Project Engineer (m/f)</title>
      <link>https://careers.autoform.com/en/jobs/job-search/advertisement/digitalization-project-engineer-m-f/</link>
      <pubDate>Tue, 14 Jul 2026 21:03:00 +0200</pubDate>
      <category>China</category>
      <category>Shanghai</category>
      <category>Shenzhen</category>
      <category>Technical Services</category>
      <category>Professionals</category>
      <description><![CDATA[<p>Location: Shanghai or Shenzhen</p><p>Drive digitalization projects for AutoForm China.</p>]]></description>
      <content:encoded><![CDATA[<p>Location: Shanghai or Shenzhen</p><p>Drive digitalization projects for AutoForm China.</p>]]></content:encoded>
    </item>
  </channel>
</rss>
`

const indiaRssItem = `
    <item>
      <title>Application Engineer India</title>
      <link>https://careers.autoform.com/en/jobs/job-search/advertisement/application-engineer-india/</link>
      <pubDate>Wed, 15 Jul 2026 09:15:00 +0200</pubDate>
      <category>India</category>
      <category>Pune</category>
      <category>R&amp;D</category>
      <category>Professionals</category>
      <description><![CDATA[<p>Location: Pune, India</p><p>Support AutoForm customers with sheet metal simulation workflows.</p>]]></description>
      <content:encoded><![CDATA[<p>Location: Pune, India</p><p>Support AutoForm customers with sheet metal simulation workflows.</p>]]></content:encoded>
    </item>
`

const rssWithIndiaXml = rssWithoutIndiaXml.replace('</channel>', `${indiaRssItem}\n  </channel>`)

const loadScriptModule = async () => {
  try {
    return await import('../autoformindia/script.js')
  } catch {
    assert.fail('Expected AutoForm India scraper module at ../autoformindia/script.js')
  }
}

test('AutoForm India pins the verified homepage, first-party careers shell, job search page, and RSS feed', async () => {
  const autoformIndia = await loadScriptModule()

  assert.equal(autoformIndia.SOURCE, 'autoformindia')
  assert.equal(autoformIndia.COMPANY_NAME, 'AutoForm India')
  assert.equal(autoformIndia.VERIFIED_AT, '2026-07-15')
  assert.equal(autoformIndia.HOMEPAGE_URL, 'https://www.autoform.com/en/')
  assert.equal(autoformIndia.CAREERS_HOME_URL, 'https://careers.autoform.com/en/')
  assert.equal(autoformIndia.JOBS_LANDING_URL, 'https://careers.autoform.com/en/jobs/')
  assert.equal(autoformIndia.JOB_SEARCH_URL, 'https://careers.autoform.com/en/jobs/job-search/')
  assert.equal(autoformIndia.JOBS_RSS_URL, 'https://careers.autoform.com/en/jobs.rss')
  assert.equal(autoformIndia.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(autoformIndia.hasOfficialCareersHomeSignal(careersHomeHtml), true)
  assert.equal(autoformIndia.hasOfficialCareersHomeSignal(currentCareersHomeHtml), true)
  assert.equal(autoformIndia.hasOfficialJobSearchSignal(jobSearchHtml), true)
  assert.equal(autoformIndia.hasOfficialJobSearchSignal(currentJobSearchHtml), true)
  assert.equal(autoformIndia.hasOfficialJobsRssSignal(rssWithoutIndiaXml), true)
  assert.deepEqual(autoformIndia.extractLocationOptions(jobSearchHtml), [
    { value: '', label: 'All locations' },
    { value: '976', label: 'India' },
    { value: '225', label: 'China' },
  ])
  assert.deepEqual(autoformIndia.extractRssItems(rssWithoutIndiaXml), [
    {
      title: 'Project Engineer',
      sourceUrl: 'https://careers.autoform.com/en/jobs/job-search/advertisement/project-engineer/',
      postingDate: '2026-07-14T20:57:00.000Z',
      categories: ['The Netherlands', 'Enschede', 'Technical Services', 'Professionals'],
      description: 'Location: Enschede, the Netherlands Join our Technical Services team.',
    },
    {
      title: 'Digitalization Project Engineer (m/f)',
      sourceUrl: 'https://careers.autoform.com/en/jobs/job-search/advertisement/digitalization-project-engineer-m-f/',
      postingDate: '2026-07-14T19:03:00.000Z',
      categories: ['China', 'Shanghai', 'Shenzhen', 'Technical Services', 'Professionals'],
      description: 'Location: Shanghai or Shenzhen Drive digitalization projects for AutoForm China.',
    },
  ])
})

test('AutoForm India extracts only India jobs from the first-party RSS feed', async () => {
  const autoformIndia = await loadScriptModule()

  assert.deepEqual(autoformIndia.extractIndiaJobsFromFeed(rssWithIndiaXml), [
    {
      title: 'Application Engineer India',
      company: 'AutoForm India',
      department: 'R&D',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: 'application-engineer-india',
      requisitionId: 'application-engineer-india',
      sourceUrl: 'https://careers.autoform.com/en/jobs/job-search/advertisement/application-engineer-india/',
      applyUrl: 'https://careers.autoform.com/en/jobs/job-search/advertisement/application-engineer-india/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-15T07:15:00.000Z',
      closingDate: null,
      jobDescription: 'Location: Pune, India Support AutoForm customers with sheet metal simulation workflows.',
    },
  ])
})

test('AutoForm India run returns an honest zero-job result while the verified public surface exposes no India roles', async () => {
  const autoformIndia = await loadScriptModule()
  const requestedUrls = []

  const jobs = await autoformIndia.createAutoFormIndiaScraper({
    now: () => '2026-07-15T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === autoformIndia.HOMEPAGE_URL) return homepageHtml
      if (url === autoformIndia.CAREERS_HOME_URL) return careersHomeHtml
      if (url === autoformIndia.JOB_SEARCH_URL) return jobSearchHtml
      if (url === autoformIndia.JOBS_RSS_URL) return rssWithoutIndiaXml

      throw new Error(`Unexpected AutoForm India URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    autoformIndia.HOMEPAGE_URL,
    autoformIndia.CAREERS_HOME_URL,
    autoformIndia.JOB_SEARCH_URL,
    autoformIndia.JOBS_RSS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('AutoForm India fails closed when the verified homepage, careers home, job search page, or RSS feed drifts', async () => {
  const autoformIndia = await loadScriptModule()

  await assert.rejects(
    autoformIndia.createAutoFormIndiaScraper().run({
      fetchText: async (url) => {
        if (url === autoformIndia.HOMEPAGE_URL) {
          return homepageHtml.replace('Visit our career website', 'Learn more')
        }
        throw new Error(`Unexpected AutoForm India URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    autoformIndia.createAutoFormIndiaScraper().run({
      fetchText: async (url) => {
        if (url === autoformIndia.HOMEPAGE_URL) return homepageHtml
        if (url === autoformIndia.CAREERS_HOME_URL) {
          return careersHomeHtml.replace('Join our great team now. Browse our job offerings.', 'Read more about AutoForm culture.')
        }
        throw new Error(`Unexpected AutoForm India URL: ${url}`)
      },
    }),
    /verified first-party careers home/i,
  )

  await assert.rejects(
    autoformIndia.createAutoFormIndiaScraper().run({
      fetchText: async (url) => {
        if (url === autoformIndia.HOMEPAGE_URL) return homepageHtml
        if (url === autoformIndia.CAREERS_HOME_URL) return careersHomeHtml
        if (url === autoformIndia.JOB_SEARCH_URL) {
          return jobSearchHtml.replace('<option value="976">India</option>', '')
        }
        throw new Error(`Unexpected AutoForm India URL: ${url}`)
      },
    }),
    /verified job search page/i,
  )

  await assert.rejects(
    autoformIndia.createAutoFormIndiaScraper().run({
      fetchText: async (url) => {
        if (url === autoformIndia.HOMEPAGE_URL) return homepageHtml
        if (url === autoformIndia.CAREERS_HOME_URL) return careersHomeHtml
        if (url === autoformIndia.JOB_SEARCH_URL) return jobSearchHtml
        if (url === autoformIndia.JOBS_RSS_URL) {
          return rssWithoutIndiaXml.replace('TYPO3 EXT:news', 'Unexpected Feed')
        }
        throw new Error(`Unexpected AutoForm India URL: ${url}`)
      },
    }),
    /verified jobs rss feed/i,
  )
})
