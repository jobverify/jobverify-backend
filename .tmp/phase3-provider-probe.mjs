import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const out = new URL('./scraper-run-repairs-40078417408/phase3-provider-evidence/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const capture = async (name, url) => {
    const response = await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' })
    const body = await response.text()
    let payload = null
    try { payload = JSON.parse(body) } catch {}
    const evidence = { capturedAt: new Date().toISOString(), requestedUrl: url,
      url: response.url(), status: response.status(), bodySha256: createHash('sha256').update(body).digest('hex'), payload }
    await writeFile(new URL(name + '.json', out), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify({ name, status: evidence.status, finalUrl: evidence.url,
      keys: payload ? Object.keys(payload) : null, funnelKeys: payload?.funnel ? Object.keys(payload.funnel) : null }))
    return payload
  }
  try {
    await capture('fountain-cms-native-form', 'https://ap-1.fountain.com/internal_api/portal/cms/application_forms/new?funnel_id=b775b39d-2a57-4954-b232-0d460503938b&try_new_ui=true&brand_id=a9218256-8fbf-40ab-936b-49ff5ff7c900')
  } catch (error) { console.log(JSON.stringify({ name: 'fountain-cms-native-form', error: error.message })) }
  try {
    const origin = 'https://fa-etvl-saasfaprod1.fa.ocs.oraclecloud.com'
    const payload = await capture('oracle-zensar-native-one-listing', origin + '/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=1,offset=0,location=India')
    const role = payload?.items?.[0]?.requisitionList?.[0]
    if (role?.Id) await capture('oracle-zensar-native-one-detail', origin + '/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22' + encodeURIComponent(role.Id) + '%22,siteNumber=CX_1')
  } catch (error) { console.log(JSON.stringify({ name: 'oracle-zensar', error: error.message })) }
} finally { await browser.close() }
