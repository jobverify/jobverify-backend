import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const careersHubHtml = `
<!doctype html>
<html lang="ja">
  <head>
    <title>オープンアップコンストラクション | オープンアップブランドサイト</title>
  </head>
  <body>
    <main>
      <h1>JOB DESCRIPTION 求人情報 オープンアップコンストラクション</h1>
      <section>
        <p><strong>募集求人</strong></p>
        <p>施工管理技術者</p>
        <p><strong>対象</strong></p>
        <p>新卒・中途未経験</p>
      </section>
      <section>
        <a href="https://goodwork.openupgroup.co.jp/job-info/opc/application/">中途未経験 ：募集要項・応募フォーム</a>
        <a href="https://goodwork.openupgroup.co.jp/job-info/opc/newgraduate/">新卒採用 ：募集要項・応募フォーム</a>
        <a href="https://www.sekoukanri-search.com/">経験者採用はこちら</a>
      </section>
    </main>
  </body>
</html>
`

const midcareerHtml = `
<!doctype html>
<html lang="ja">
  <head>
    <title>募集要項（中途未経験） | オープンアップブランドサイト</title>
  </head>
  <body>
    <main>
      <h1>JOB APPLICATION 募集要項（応募フォーム） オープンアップコンストラクション</h1>
      <section>
        <p><strong>募集求人</strong></p>
        <p>施工管理技術者</p>
        <p><strong>対象</strong></p>
        <p>中途未経験</p>
      </section>
      <section>
        <h2>対象となる方</h2>
        <p>前職の経歴・学歴不問、未経験・第二新卒・フリーターからでも安心して始められます！</p>
        <a href="https://www55.rpm-sys.jp/web/openup-construction/index.cfm?fuseaction=web.application_form&formid=8527D69A-02CC-B12A-ACF26E164BBC02C6&sgtno=h">中途未経験 ：募集要項・応募フォーム</a>
      </section>
      <section>
        <h2>募集要項</h2>
        <p><strong>雇用形態</strong></p>
        <p>正社員（期間の定め無し・試用期間 6ヶ月）</p>
        <p><strong>勤務時間</strong></p>
        <p>8：00～17：00、9：00～18：00（休憩時間1時間） ※配属先により変動あり</p>
        <p><strong>勤務地</strong></p>
        <p>《転勤なし／腰を据えて働ける環境！》</p>
        <p>全国の各プロジェクト先が勤務地です♪</p>
        <p><strong>給与</strong></p>
        <p>【未経験者 給与例】</p>
        <p>＜東京＞ 合計 285,000円</p>
        <p><strong>諸手当</strong></p>
        <p>交通費全額支給、残業手当、引っ越し手当</p>
        <p><strong>休日・休暇</strong></p>
        <p>年間休日120日、完全週休2日制（土、日、祝）、年末年始休暇、有給休暇、産前後休暇、育児休暇、介護休暇、慶弔休暇</p>
      </section>
    </main>
  </body>
</html>
`

const newGraduateHtml = `
<!doctype html>
<html lang="ja">
  <head>
    <title>募集要項（新卒） | オープンアップブランドサイト</title>
  </head>
  <body>
    <main>
      <h1>JOB APPLICATION 募集要項（応募フォーム） オープンアップコンストラクション</h1>
      <section>
        <p><strong>募集求人</strong></p>
        <p>建築技術職 / CAD（オートCAD、JWCAD等）習得者尚可。</p>
        <p><strong>対象</strong></p>
        <p>2027年3月専門学校、短大、大学卒業見込みの方</p>
      </section>
      <section>
        <h2>対象となる方</h2>
        <p>文系理系は問いません。2027年3月専門学校、短大、大学卒業見込みの方、建築技術職/CAD（オートCAD、JWCAD等）習得者尚可！</p>
        <a href="https://www55.rpm-sys.jp/rsv/openup-construction/index.cfm?fuseaction=web.interview_reservation&tgt=0&rvs_flg=1&formid=AC93AC7A-F134-A1F2-FB2E84DA063104C3&sgtno=HPs&rsv_flg=2">新卒採用 ：募集要項・応募フォーム</a>
      </section>
      <section>
        <h2>募集要項</h2>
        <p><strong>雇用形態</strong></p>
        <p>正社員（期間の定め無し・試用期間 6ヶ月）</p>
        <p><strong>勤務時間</strong></p>
        <p>8：00～17：00、9：00～18：00（休憩時間1時間） ※配属先により変動あり</p>
        <p><strong>勤務地</strong></p>
        <p>《転勤なし／腰を据えて働ける環境！》</p>
        <p>全国の各プロジェクト先が勤務地です！</p>
        <p><strong>給与</strong></p>
        <p>【未経験者 給与例】</p>
        <p>＜東京＞ 合計 285,000円</p>
        <p><strong>諸手当</strong></p>
        <p>交通費全額支給、残業手当、エリア職種手当、稼働手当、引っ越し手当、着任交通費</p>
        <p><strong>休日・休暇</strong></p>
        <p>年間休日120日、完全週休2日制（土、日、祝）、年末年始休暇、有給休暇、産前後休暇、育児休暇、介護休暇、慶弔休暇</p>
      </section>
    </main>
  </body>
</html>
`

test('Open Up Construction pins the verified first-party careers hub and linked first-party job pages', async () => {
  const openupconstruction = await loadModule()
  assert.ok(openupconstruction, 'Open Up Construction scraper module should load')

  assert.equal(openupconstruction.SOURCE, 'openupconstruction')
  assert.equal(openupconstruction.COMPANY, 'Open Up Construction')
  assert.equal(openupconstruction.CAREERS_URL, 'https://goodwork.openupgroup.co.jp/job-info/opc/')
  assert.equal(openupconstruction.MIDCAREER_URL, 'https://goodwork.openupgroup.co.jp/job-info/opc/application/')
  assert.equal(openupconstruction.NEW_GRADUATE_URL, 'https://goodwork.openupgroup.co.jp/job-info/opc/newgraduate/')
  assert.equal(openupconstruction.hasVerifiedCareersHub(careersHubHtml), true)
  assert.deepEqual(openupconstruction.extractFirstPartyListingLinks(careersHubHtml), [
    openupconstruction.MIDCAREER_URL,
    openupconstruction.NEW_GRADUATE_URL,
  ])

  const midcareerJob = openupconstruction.extractJobDetail(midcareerHtml, {
    sourceUrl: openupconstruction.MIDCAREER_URL,
  })
  assert.equal(midcareerJob.title, '施工管理技術者')
  assert.equal(midcareerJob.applyUrl.startsWith('https://www55.rpm-sys.jp/web/openup-construction/'), true)
  assert.equal(midcareerJob.location, 'Nationwide project sites, Japan')
  assert.equal(midcareerJob.country, 'Japan')
  assert.equal(midcareerJob.employmentType, '正社員（期間の定め無し・試用期間 6ヶ月）')
  assert.match(midcareerJob.jobDescription, /年間休日120日/)

  const newGraduateJob = openupconstruction.extractJobDetail(newGraduateHtml, {
    sourceUrl: openupconstruction.NEW_GRADUATE_URL,
  })
  assert.equal(newGraduateJob.title, '建築技術職 / CAD（オートCAD、JWCAD等）習得者尚可。')
  assert.equal(newGraduateJob.applyUrl.startsWith('https://www55.rpm-sys.jp/rsv/openup-construction/'), true)
  assert.equal(newGraduateJob.location, 'Nationwide project sites, Japan')
  assert.equal(newGraduateJob.country, 'Japan')
  assert.equal(newGraduateJob.employmentType, '正社員（期間の定め無し・試用期間 6ヶ月）')
  assert.match(newGraduateJob.jobDescription, /2027年3月専門学校/)
})

test('Open Up Construction run returns the two verified first-party public roles', async () => {
  const openupconstruction = await loadModule()
  assert.ok(openupconstruction, 'Open Up Construction scraper module should load')

  const requestedUrls = []
  const jobs = await openupconstruction.createOpenUpConstructionScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === openupconstruction.CAREERS_URL) {
        return { status: 200, url, html: careersHubHtml }
      }

      if (url === openupconstruction.MIDCAREER_URL) {
        return { status: 200, url, html: midcareerHtml }
      }

      if (url === openupconstruction.NEW_GRADUATE_URL) {
        return { status: 200, url, html: newGraduateHtml }
      }

      throw new Error(`Unexpected Open Up Construction URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    openupconstruction.CAREERS_URL,
    openupconstruction.MIDCAREER_URL,
    openupconstruction.NEW_GRADUATE_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Open Up Construction')
  assert.equal(jobs[0].companyCareerPage, openupconstruction.CAREERS_URL)
  assert.equal(jobs[0].companyDomain, 'openupgroup.co.jp')
  assert.equal(jobs[0].sourceUrl, openupconstruction.MIDCAREER_URL)
  assert.equal(jobs[1].sourceUrl, openupconstruction.NEW_GRADUATE_URL)
  assert.equal(jobs[1].jobId, 'opc-newgraduate')
})

test('Open Up Construction fails closed when the verified first-party hub or job page contract drifts', async () => {
  const openupconstruction = await loadModule()
  assert.ok(openupconstruction, 'Open Up Construction scraper module should load')

  await assert.rejects(
    openupconstruction.createOpenUpConstructionScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>Unexpected page</h1></body></html>',
      }),
    }),
    /verified first-party careers hub/i,
  )

  assert.throws(
    () => openupconstruction.extractJobDetail(
      midcareerHtml.replace('全国の各プロジェクト先が勤務地です♪', '海外案件中心です'),
      { sourceUrl: openupconstruction.MIDCAREER_URL },
    ),
    /verified first-party job detail page/i,
  )

  await assert.rejects(
    openupconstruction.createOpenUpConstructionScraper().run({
      fetchPage: async (url) => {
        if (url === openupconstruction.CAREERS_URL) {
          return { status: 200, url, html: careersHubHtml.replace(openupconstruction.NEW_GRADUATE_URL, 'https://example.com/newgraduate/') }
        }

        return { status: 200, url, html: midcareerHtml }
      },
    }),
    /verified first-party listing links/i,
  )
})
