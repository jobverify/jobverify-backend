import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Walkaroo - Men's, Women's & Kid's Footwear | India's No.1 PU Brand - Walkaroo Footwear</title>
  </head>
  <body>
    <nav>
      <a href="/pages/about-us">About Us</a>
      <a href="https://www.walkaroo.in/pages/contact-us">Contact Us</a>
    </nav>
    <main>
      <h1>Walkaroo Footwear</h1>
      <p>Homegrown Indian Brand</p>
      <p>Free shipping above ₹500</p>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Walkaroo | Comfort-Driven Footwear for Every Step - Walkaroo Footwear</title>
  </head>
  <body>
    <main>
      <h1>About us</h1>
      <h2>Walkaroo: The SOLE and SOUL of young India</h2>
      <p>At Walkaroo, we believe walking is the simplest solution to staying active and healthy.</p>
      <footer>
        <a href="https://recruitcareers.zappyhire.com/en/walkaroo">Careers</a>
      </footer>
    </main>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Walkaroo Help Desk | Contact Us for Product or Order Support - Walkaroo Footwear</title>
  </head>
  <body>
    <main>
      <h1>Contact Us</h1>
      <p>Walkaroo International Pvt Ltd.</p>
      <p>customercare@walkaroo.in</p>
      <p>CIN : U19200TZ2011PTC029228</p>
      <footer>
        <a href="https://recruitcareers.zappyhire.com/en/walkaroo">Careers</a>
      </footer>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body>
    <main><h1>Careers</h1></main>
  </body>
</html>
`

test('Walkaroo validates the verified homepage, about page, contact page, and official Zappyhire careers handoff', async () => {
  const walkaroo = await loadModule()
  assert.ok(walkaroo, 'Walkaroo scraper module should load')

  assert.equal(walkaroo.SOURCE, 'walkaroo')
  assert.equal(walkaroo.COMPANY, 'Walkaroo')
  assert.equal(walkaroo.HOMEPAGE_URL, 'https://www.walkaroo.in/')
  assert.equal(walkaroo.ABOUT_URL, 'https://www.walkaroo.in/pages/about-us')
  assert.equal(walkaroo.CONTACT_URL, 'https://www.walkaroo.in/pages/contact-us')
  assert.equal(walkaroo.CAREERS_URL, 'https://recruitcareers.zappyhire.com/en/walkaroo')
  assert.equal(walkaroo.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(walkaroo.hasAboutPageSignal(aboutHtml), true)
  assert.equal(walkaroo.hasContactPageSignal(contactHtml), true)
  assert.equal(walkaroo.hasOfficialCareersHandoffSignal(careersHtml), true)
})

test('Walkaroo run returns an empty list only while the verified Zappyhire handoff remains a guarded official surface', async () => {
  const walkaroo = await loadModule()
  assert.ok(walkaroo, 'Walkaroo scraper module should load')

  const requestedUrls = []
  const jobs = await walkaroo.createWalkarooScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
      if (url === walkaroo.ABOUT_URL) return aboutHtml
      if (url === walkaroo.CONTACT_URL) return contactHtml
      if (url === walkaroo.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.walkaroo.in/',
    'https://www.walkaroo.in/pages/about-us',
    'https://www.walkaroo.in/pages/contact-us',
    'https://recruitcareers.zappyhire.com/en/walkaroo',
  ])
  assert.deepEqual(jobs, [])
})

test('Walkaroo fails closed when the homepage, about page, contact page, or careers handoff changes materially', async () => {
  const walkaroo = await loadModule()
  assert.ok(walkaroo, 'Walkaroo scraper module should load')

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return '<html><body><h1>Placeholder</h1></body></html>'
        if (url === walkaroo.ABOUT_URL) return aboutHtml
        if (url === walkaroo.CONTACT_URL) return contactHtml
        if (url === walkaroo.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
        if (url === walkaroo.ABOUT_URL) return '<html><body><h1>About</h1></body></html>'
        if (url === walkaroo.CONTACT_URL) return contactHtml
        if (url === walkaroo.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /about page/i,
  )

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
        if (url === walkaroo.ABOUT_URL) return aboutHtml
        if (url === walkaroo.CONTACT_URL) return '<html><body><h1>Contact</h1></body></html>'
        if (url === walkaroo.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /contact page/i,
  )

  await assert.rejects(
    walkaroo.createWalkarooScraper().run({
      fetchText: async (url) => {
        if (url === walkaroo.HOMEPAGE_URL) return homepageHtml
        if (url === walkaroo.ABOUT_URL) return aboutHtml
        if (url === walkaroo.CONTACT_URL) return contactHtml
        if (url === walkaroo.CAREERS_URL) return '<html><body><h1>Jobs</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers handoff/i,
  )
})


const modernWalkHome = homepageHtml.replace('<p>Free shipping above ₹500</p>', '<meta property="og:site_name" content="Walkaroo Footwear"><link rel="canonical" href="https://www.walkaroo.in/">')
const modernWalkShell = '<title>Careers</title><app-root></app-root><script src="main.current.js" type="module"></script>'
const modernWalkClient = 'endpoint: "zappyhire-multitenant-be-prod.zappyhire.com/" source: "zappyhire" api/careers/configurations/ api/jobs/jobsearch/ api/careers/jobs/ sessionStorage.setItem("TENANT", tenant)'
const walkApiBase = 'https://walkaroo.zappyhire-multitenant-be-prod.zappyhire.com/api/'
const walkConfig = {status:1,errors:'',results:{name:'Walkaroo International',website:'https://www.walkaroo.in/',career_text_heading:'Walkaroo International Careers'}}
const walkRows = [1,2,3].map(job=>({_source:{client:'walkaroo',job,title:'Engineer '+job,location:job===1?'Pune':job===2?'Nellore':'California',entity:'Walkaroo International'}}))
const walkFetchText = async url => url === 'https://www.walkaroo.in/' ? modernWalkHome : url.endsWith('/pages/about-us') ? aboutHtml : url.endsWith('/pages/contact-us') ? contactHtml : url.endsWith('.js') ? modernWalkClient : modernWalkShell
const walkFetchJson = async url => {
  if (url.endsWith('careers/configurations/')) return walkConfig
  if (url.includes('jobs/jobsearch/')) {const page=Number(new URL(url).searchParams.get('page'));return{status:1,errors:'',results:{total:{value:3,relation:'eq'},hits:page===1?walkRows.slice(0,2):walkRows.slice(2)}}}
  const id=Number(url.match(/jobs\/(\d+)\//)?.[1])
  return{status:1,errors:'',results:{id,title:'Engineer '+id,location:[{city:id===1?'Pune-Maharashtra':id===2?'Nellore-Andhra Pradesh':'California',country_code:id===3?'US':null}],description:'<p>Build reliable operations.</p>',skills:['Engineering'],job_type:'Full Time',job_board_urls:[{feature:{name:'career_page'},url:'https://recruitcareers.zappyhire.com/walkaroo/apply?source=1&company=1&job='+id}]}}
}

test('Walkaroo follows the official public client, paginates all jobs and validates India details', async () => {
  const source = await loadModule()
  const calls=[]
  const jobs=await source.createWalkarooScraper({pageSize:2}).run({fetchText:walkFetchText,fetchJson:async url=>{calls.push(url);return walkFetchJson(url)}})
  assert.equal(jobs.length,2)
  assert.deepEqual(jobs.map(job=>job.jobId),['1','2'])
  assert.deepEqual(jobs.map(job=>job.city),['Pune','Nellore'])
  assert.ok(jobs.every(job=>job.country==='India'&&/Build reliable/.test(job.jobDescription)))
  assert.equal(calls.filter(url=>url.includes('jobs/jobsearch/')).length,2)
  assert.ok(jobs.every(job=>new URL(job.applyUrl).hostname==='recruitcareers.zappyhire.com'))
})

test('Walkaroo rejects wrong tenant, pagination gaps, public detail identity and unsafe application URLs', async () => {
  const source=await loadModule()
  const run=(fetchJson,fetchText=walkFetchText)=>source.createWalkarooScraper({pageSize:2}).run({fetchJson,fetchText})
  await assert.rejects(run(async url=>url.endsWith('configurations/')?{...walkConfig,results:{...walkConfig.results,name:'Other Company'}}:walkFetchJson(url)),/tenant identity/)
  await assert.rejects(run(async url=>url.includes('page=2')?{status:1,errors:'',results:{total:{value:3,relation:'eq'},hits:[]}}:walkFetchJson(url)),/incomplete.*pagination/)
  await assert.rejects(run(async url=>{const data=await walkFetchJson(url);if(data.results?.id)data.results.id=999;return data}),/detail identity/)
  await assert.rejects(run(async url=>{const data=await walkFetchJson(url);if(data.results?.id)data.results.job_board_urls[0].url='https://unrelated.example/apply';return data}),/application handoff/)
  await assert.rejects(run(walkFetchJson,async url=>url.endsWith('.js')?modernWalkClient.replace('zappyhire-multitenant-be-prod.zappyhire.com','unrelated.example'):walkFetchText(url)),/public careers client/)
})

test('Walkaroo preserves countryless remote scope and partial India inventory', async () => {
  const source = await loadModule()
  const fetchJson = async url => {
    const data = await walkFetchJson(url)
    if (data.results?.id === 2) data.results.location = [{ city: 'Remote', country_code: null }]
    return data
  }
  const jobs = await source.createWalkarooScraper({ pageSize: 2 }).run({ fetchText: walkFetchText, fetchJson })
  assert.deepEqual(jobs.map(job => job.jobId), ['1'])
  assert.equal(jobs[0].sourceListingComplete, false)
  const { readInventoryEvidence } = await import('../../scraper-support/utils/inventoryEvidence.js')
  assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
  assert.equal(readInventoryEvidence(jobs)?.indiaFacetCount, null)

  await assert.rejects(source.createWalkarooScraper({ pageSize: 2 }).run({
    fetchText: walkFetchText,
    fetchJson: async url => {
      const data = await walkFetchJson(url)
      if (data.results?.id && data.results.id !== 3) data.results.location = [{ city: 'Remote', country_code: null }]
      return data
    },
  }), /incomplete country scope/)
})

test('Walkaroo accepts remote work only with explicit India country evidence', async () => {
  const source = await loadModule()
  const jobs = await source.createWalkarooScraper({ pageSize: 2 }).run({
    fetchText: walkFetchText,
    fetchJson: async url => {
      const data = await walkFetchJson(url)
      if (data.results?.id === 2) data.results.location = [{ city: 'Remote', country_code: 'IN' }]
      return data
    },
  })
  assert.equal(jobs.find(job => job.jobId === '2')?.country, 'India')
})

test('Walkaroo does not infer India from inherited city-map properties',async()=>{
  const source=await loadModule()
  const jobs=await source.createWalkarooScraper({pageSize:2}).run({fetchText:walkFetchText,fetchJson:async url=>{const data=await walkFetchJson(url);if(data.results?.id===2)data.results.location=[{city:'constructor',country_code:null}];return data}})
  assert.deepEqual(jobs.map(job=>job.jobId),['1'])
  assert.equal(jobs[0].sourceListingComplete,false)
})
