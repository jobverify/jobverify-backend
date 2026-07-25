import assert from 'node:assert/strict'
import test from 'node:test'

const firstPartyCareersHtml = `
<!DOCTYPE html>
<html lang="id">
  <head>
    <title>Karir - Akulaku</title>
  </head>
  <body>
    <section>
      <h1>Bergabung Bersama Akulaku</h1>
      <p>Cari kesempatan karier terbaru kami.</p>
      <a href="https://akulaku.zhiye.com/" target="_blank">Lihat Lowongan</a>
    </section>
  </body>
</html>
`

const jobsBoardHomeHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>唯思电子商务（商务）有限公司招聘系统</title>
  </head>
  <body>
    <a href="/alljob/?o=1">全部职位</a>
    <a href="https://www.beisen.com">Powered by Beisen</a>
  </body>
</html>
`

const firstListingPageHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>唯思电子商务（商务）有限公司招聘系统--全部职位</title>
  </head>
  <body>
    <table>
      <tr>
        <td><a title="海外业务负责人(J12363)" href="/zpdetail/311160708?o=1">海外业务负责人(J12363)</a></td>
        <td class="tn">3</td>
        <td title="广东省-深圳市">广东省-深圳市</td>
        <td>2026-07-13</td>
      </tr>
      <tr>
        <td><a title="用户运营经理-菲律宾(J12355)" href="/zpdetail/311160697?o=1">用户运营经理-菲律宾(J12355)</a></td>
        <td class="tn">2</td>
        <td title="广东省-深圳市">广东省-深圳市</td>
        <td>2026-07-13</td>
      </tr>
      <tr>
        <td><a title="India Growth Manager (J13001)" href="/zpdetail/399999001?o=1">India Growth Manager (J13001)</a></td>
        <td class="tn">1</td>
        <td title="India-Bengaluru">India-Bengaluru</td>
        <td>2026-07-15</td>
      </tr>
    </table>
    <div class="pager2">
      <span class="pitem"><a href='/alljob/?o=1&PageIndex=2' class="next">下一页<span class="nxt"></span></a></span>
      <span class="pitem"><a href='/alljob/?o=1&PageIndex=20'>尾页</a></span>
    </div>
    <div class="footer3">Powered by <a href="https://www.beisen.com">Beisen</a></div>
  </body>
</html>
`

const secondListingPageHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>唯思电子商务（商务）有限公司招聘系统--全部职位</title>
  </head>
  <body>
    <table>
      <tr>
        <td><a title="海外业务负责人（泰国）(J12305)" href="/zpdetail/311160650?o=1">海外业务负责人（泰国）(J12305)</a></td>
        <td class="tn">1</td>
        <td title="国外-泰国">国外-泰国</td>
        <td>2026-07-06</td>
      </tr>
      <tr>
        <td><a title="Business Analyst - India (J13002)" href="/zpdetail/399999002?o=1">Business Analyst - India (J13002)</a></td>
        <td class="tn">1</td>
        <td title="国外-印度">国外-印度</td>
        <td>2026-07-12</td>
      </tr>
    </table>
    <div class="pager2">
      <span class="pitem"><a href='/alljob/?o=1&PageIndex=1' class="next"><span class="pre"></span>上一页</a></span>
    </div>
    <div class="footer3">Powered by <a href="https://www.beisen.com">Beisen</a></div>
  </body>
</html>
`

const indiaGrowthDetailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>唯思电子商务（商务）有限公司招聘系统--招聘详细</title>
  </head>
  <body>
    <h1>India Growth Manager (J13001)</h1>
    <div>工作地点：India-Bengaluru</div>
    <div>发布时间：2026-07-15</div>
    <div>工作职责：Own the Akulaku India growth roadmap.</div>
    <div>任职资格：7+ years in growth and fintech.</div>
  </body>
</html>
`

const indiaAnalystDetailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>唯思电子商务（商务）有限公司招聘系统--招聘详细</title>
  </head>
  <body>
    <h1>Business Analyst - India (J13002)</h1>
    <div>工作地点：国外-印度</div>
    <div>发布时间：2026-07-12</div>
    <div>工作职责：Support the India market business analysis.</div>
    <div>任职资格：SQL and experimentation experience.</div>
  </body>
</html>
`

const loadAkulakuModule = async () => {
  try {
    return await import('../akulaku/script.js')
  } catch {
    assert.fail('Expected Akulaku scraper module at ../akulaku/script.js')
  }
}

test('Akulaku helpers stay pinned to the verified first-party careers shell, official board, and next-link pagination shape', async () => {
  const akulaku = await loadAkulakuModule()

  assert.equal(akulaku.SOURCE, 'akulaku')
  assert.equal(akulaku.COMPANY, 'Akulaku')
  assert.equal(akulaku.OFFICIAL_BRAND_NAME, 'Akulaku')
  assert.equal(akulaku.VERIFIED_ON, '2026-07-15')
  assert.equal(akulaku.FIRST_PARTY_CAREERS_URL, 'https://www.akulaku.com/staff-life')
  assert.equal(akulaku.OFFICIAL_JOBS_BOARD_URL, 'https://akulaku.zhiye.com/')
  assert.equal(akulaku.JOB_LISTINGS_URL, 'https://akulaku.zhiye.com/alljob/?o=1')
  assert.equal(akulaku.hasFirstPartyCareersSignal(firstPartyCareersHtml), true)
  assert.equal(
    akulaku.extractOfficialJobsBoardUrl(firstPartyCareersHtml),
    'https://akulaku.zhiye.com/',
  )
  assert.equal(akulaku.hasOfficialJobsBoardSignal(jobsBoardHomeHtml), true)
  assert.equal(akulaku.hasJobListingsPageSignal(firstListingPageHtml), true)
  assert.deepEqual(
    akulaku.extractJobCards(firstListingPageHtml),
    [
      {
        title: '海外业务负责人(J12363)',
        detailUrl: 'https://akulaku.zhiye.com/zpdetail/311160708?o=1',
        detailId: '311160708',
        requisitionId: 'J12363',
        location: '广东省-深圳市',
        postingDate: '2026-07-13',
      },
      {
        title: '用户运营经理-菲律宾(J12355)',
        detailUrl: 'https://akulaku.zhiye.com/zpdetail/311160697?o=1',
        detailId: '311160697',
        requisitionId: 'J12355',
        location: '广东省-深圳市',
        postingDate: '2026-07-13',
      },
      {
        title: 'India Growth Manager (J13001)',
        detailUrl: 'https://akulaku.zhiye.com/zpdetail/399999001?o=1',
        detailId: '399999001',
        requisitionId: 'J13001',
        location: 'India-Bengaluru',
        postingDate: '2026-07-15',
      },
    ],
  )
  assert.equal(
    akulaku.extractNextPageUrl(firstListingPageHtml, akulaku.JOB_LISTINGS_URL),
    'https://akulaku.zhiye.com/alljob/?o=1&PageIndex=2',
  )
  assert.equal(
    akulaku.extractNextPageUrl(secondListingPageHtml, 'https://akulaku.zhiye.com/alljob/?o=1&PageIndex=2'),
    null,
  )
  assert.equal(akulaku.isIndiaLocation('India-Bengaluru'), true)
  assert.equal(akulaku.isIndiaLocation('国外-印度'), true)
  assert.equal(akulaku.isIndiaLocation('印度尼西亚'), false)
  assert.equal(akulaku.isIndiaLocation('广东省-深圳市'), false)
  assert.equal(
    akulaku.extractJobDescription(indiaGrowthDetailHtml),
    '工作职责：Own the Akulaku India growth roadmap. 任职资格：7+ years in growth and fintech.',
  )
})

test('Akulaku follows the verified first-party handoff and returns only India jobs from the official board', async () => {
  const akulaku = await loadAkulakuModule()
  const requestedUrls = []

  const jobs = await akulaku.createAkulakuScraper({
    now: () => '2026-07-15T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === akulaku.FIRST_PARTY_CAREERS_URL) {
        return { status: 200, url, html: firstPartyCareersHtml }
      }

      if (url === akulaku.OFFICIAL_JOBS_BOARD_URL) {
        return { status: 200, url, html: jobsBoardHomeHtml }
      }

      if (url === akulaku.JOB_LISTINGS_URL) {
        return { status: 200, url, html: firstListingPageHtml }
      }

      if (url === 'https://akulaku.zhiye.com/alljob/?o=1&PageIndex=2') {
        return { status: 200, url, html: secondListingPageHtml }
      }

      if (url === 'https://akulaku.zhiye.com/zpdetail/399999001?o=1') {
        return { status: 200, url, html: indiaGrowthDetailHtml }
      }

      if (url === 'https://akulaku.zhiye.com/zpdetail/399999002?o=1') {
        return { status: 200, url, html: indiaAnalystDetailHtml }
      }

      throw new Error(`Unexpected Akulaku URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    akulaku.FIRST_PARTY_CAREERS_URL,
    akulaku.OFFICIAL_JOBS_BOARD_URL,
    akulaku.JOB_LISTINGS_URL,
    'https://akulaku.zhiye.com/alljob/?o=1&PageIndex=2',
    'https://akulaku.zhiye.com/zpdetail/399999001?o=1',
    'https://akulaku.zhiye.com/zpdetail/399999002?o=1',
  ])

  assert.deepEqual(jobs, [
    {
      title: 'India Growth Manager',
      company: 'Akulaku',
      department: null,
      location: 'India-Bengaluru',
      city: 'Bengaluru',
      country: 'India',
      jobId: '399999001',
      requisitionId: 'J13001',
      sourceUrl: 'https://akulaku.zhiye.com/zpdetail/399999001?o=1',
      applyUrl: 'https://akulaku.zhiye.com/zpdetail/399999001?o=1',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-15',
      closingDate: null,
      jobDescription: '工作职责：Own the Akulaku India growth roadmap. 任职资格：7+ years in growth and fintech.',
      source: 'akulaku',
      link: 'https://akulaku.zhiye.com/zpdetail/399999001?o=1',
      scrapedAt: '2026-07-15T00:00:00.000Z',
    },
    {
      title: 'Business Analyst - India',
      company: 'Akulaku',
      department: null,
      location: '国外-印度',
      city: null,
      country: 'India',
      jobId: '399999002',
      requisitionId: 'J13002',
      sourceUrl: 'https://akulaku.zhiye.com/zpdetail/399999002?o=1',
      applyUrl: 'https://akulaku.zhiye.com/zpdetail/399999002?o=1',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-12',
      closingDate: null,
      jobDescription: '工作职责：Support the India market business analysis. 任职资格：SQL and experimentation experience.',
      source: 'akulaku',
      link: 'https://akulaku.zhiye.com/zpdetail/399999002?o=1',
      scrapedAt: '2026-07-15T00:00:00.000Z',
    },
  ])
})

test('Akulaku returns [] when the verified official board exposes only non-India roles', async () => {
  const akulaku = await loadAkulakuModule()

  const jobs = await akulaku.createAkulakuScraper().run({
    fetchPage: async (url) => {
      if (url === akulaku.FIRST_PARTY_CAREERS_URL) {
        return { status: 200, url, html: firstPartyCareersHtml }
      }

      if (url === akulaku.OFFICIAL_JOBS_BOARD_URL) {
        return { status: 200, url, html: jobsBoardHomeHtml }
      }

      if (url === akulaku.JOB_LISTINGS_URL) {
        return {
          status: 200,
          url,
          html: firstListingPageHtml.replace(/India-Bengaluru/g, '广东省-深圳市'),
        }
      }

      if (url === 'https://akulaku.zhiye.com/alljob/?o=1&PageIndex=2') {
        return {
          status: 200,
          url,
          html: secondListingPageHtml.replace(/国外-印度/g, '国外-泰国'),
        }
      }

      throw new Error(`Unexpected Akulaku URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Akulaku fails closed when the first-party handoff, board shell, listing structure, or India detail surface drifts', async () => {
  const akulaku = await loadAkulakuModule()

  await assert.rejects(
    akulaku.createAkulakuScraper().run({
      fetchPage: async (url) => {
        if (url === akulaku.FIRST_PARTY_CAREERS_URL) {
          return {
            status: 200,
            url,
            html: firstPartyCareersHtml.replace('https://akulaku.zhiye.com/', 'https://example.com/jobs'),
          }
        }

        throw new Error(`Unexpected Akulaku URL: ${url}`)
      },
    }),
    /verified first-party careers shell/i,
  )

  await assert.rejects(
    akulaku.createAkulakuScraper().run({
      fetchPage: async (url) => {
        if (url === akulaku.FIRST_PARTY_CAREERS_URL) {
          return { status: 200, url, html: firstPartyCareersHtml }
        }

        if (url === akulaku.OFFICIAL_JOBS_BOARD_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Akulaku URL: ${url}`)
      },
    }),
    /verified official jobs board/i,
  )

  await assert.rejects(
    akulaku.createAkulakuScraper().run({
      fetchPage: async (url) => {
        if (url === akulaku.FIRST_PARTY_CAREERS_URL) {
          return { status: 200, url, html: firstPartyCareersHtml }
        }

        if (url === akulaku.OFFICIAL_JOBS_BOARD_URL) {
          return { status: 200, url, html: jobsBoardHomeHtml }
        }

        if (url === akulaku.JOB_LISTINGS_URL) {
          return { status: 200, url, html: '<html><title>Broken</title></html>' }
        }

        throw new Error(`Unexpected Akulaku URL: ${url}`)
      },
    }),
    /listing page surface changed/i,
  )

  await assert.rejects(
    akulaku.createAkulakuScraper().run({
      fetchPage: async (url) => {
        if (url === akulaku.FIRST_PARTY_CAREERS_URL) {
          return { status: 200, url, html: firstPartyCareersHtml }
        }

        if (url === akulaku.OFFICIAL_JOBS_BOARD_URL) {
          return { status: 200, url, html: jobsBoardHomeHtml }
        }

        if (url === akulaku.JOB_LISTINGS_URL) {
          return { status: 200, url, html: firstListingPageHtml }
        }

        if (url === 'https://akulaku.zhiye.com/alljob/?o=1&PageIndex=2') {
          return { status: 200, url, html: secondListingPageHtml }
        }

        if (url === 'https://akulaku.zhiye.com/zpdetail/399999001?o=1') {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        if (url === 'https://akulaku.zhiye.com/zpdetail/399999002?o=1') {
          return { status: 200, url, html: indiaAnalystDetailHtml }
        }

        throw new Error(`Unexpected Akulaku URL: ${url}`)
      },
    }),
    /detail page surface changed/i,
  )
})
