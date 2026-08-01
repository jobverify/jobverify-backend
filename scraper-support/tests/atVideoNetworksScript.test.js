import assert from 'node:assert/strict'
import test from 'node:test'

const loadATVideoNetworksModule = async () => {
  try {
    return await import('../../scraper/atvideonetworks/script.js')
  } catch {
    assert.fail('Expected A&T Video Networks scraper module at ../../scraper/scraper/atvideonetworks/script.js')
  }
}

const sampleHtml = `
<div class="toggles accordion" data-starting="closed" data-style="minimal">
  <div class="toggle default" data-inner-wrap="true">
    <h3><a href="#"><i class="fa fa-plus-circle"></i>Channel Sales Manager @ Hyderabad</a></h3>
    <div>
      <div class="inner-toggle-wrap">
        <div class="wpb_text_column wpb_content_element">
          <div class="wpb_wrapper">
            <ul>
              <li>Job Location: Hyderabad</li>
              <li>Experience: 5+ - 10+ years of experience in AV industry</li>
              <li><strong>Job Exposure:</strong>
                <ul>
                  <li>Worked with AV hardware OEM's / Distributors with excellent Channel Partners and Customer Contacts across Hyderabad</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        <a class="nectar-button medium regular accent-color regular-button" href="https://zfrmz.in/asGqF0N9kzqX6IMVZoaR"><span>Apply Now</span></a>
      </div>
    </div>
  </div>
  <div class="toggle default" data-inner-wrap="true">
    <h3><a href="#"><i class="fa fa-plus-circle"></i>Purchase Executive @ Madurai</a></h3>
    <div>
      <div class="inner-toggle-wrap">
        <div class="wpb_text_column wpb_content_element">
          <div class="wpb_wrapper">
            <ul>
              <li>Location : Madurai</li>
              <li>Educational Qualification : MBA - Supply chain and logistics (Preferrable) / Any degree</li>
              <li>Experience : 1-2 years experience in end to end purchase process</li>
              <li>Tools: Tally / Excel</li>
            </ul>
          </div>
        </div>
        <a class="nectar-button medium regular accent-color regular-button" href="https://zfrmz.in/asGqF0N9kzqX6IMVZoaR"><span>Apply Now</span></a>
      </div>
    </div>
  </div>
  <div class="toggle default" data-inner-wrap="true">
    <h3><a href="#"><i class="fa fa-plus-circle"></i>Channel Sales Manager @ Chennai</a></h3>
    <div>
      <div class="inner-toggle-wrap">
        <div class="wpb_text_column wpb_content_element">
          <div class="wpb_wrapper">
            <ul>
              <li>Job Location: Chennai</li>
              <li>Experience: 5+ - 10+ years of experience in AV industry</li>
            </ul>
          </div>
        </div>
        <a class="nectar-button medium regular accent-color regular-button" href="https://zfrmz.in/asGqF0N9kzqX6IMVZoaR"><span>Apply Now</span></a>
      </div>
    </div>
  </div>
</div>
`

test('extractSearchResults maps A&T careers accordion entries into conservative job records', async () => {
  const atvideo = await loadATVideoNetworksModule()
  const jobs = atvideo.extractSearchResults(sampleHtml)

  assert.equal(atvideo.pageIndicatesJobsAccordion(sampleHtml), true)
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Channel Sales Manager',
    company: 'A&T Video Networks',
    department: 'Channel Sales Manager',
    location: 'Chennai, India',
    city: 'Chennai',
    country: 'India',
    jobId: 'atvideonetworks-channel-sales-manager-chennai',
    requisitionId: 'atvideonetworks-channel-sales-manager-chennai',
    sourceUrl: 'https://www.atnetindia.net/career/',
    applyUrl: 'https://zfrmz.in/asGqF0N9kzqX6IMVZoaR',
    employmentType: null,
    experienceRequired: '5+ - 10+ years of experience in AV industry',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Job Location: Chennai Experience: 5+ - 10+ years of experience in AV industry Apply via the A&T Video Networks careers form.',
  })
  assert.deepEqual(jobs[2], {
    title: 'Purchase Executive',
    company: 'A&T Video Networks',
    department: 'Purchase Executive',
    location: 'Madurai, India',
    city: 'Madurai',
    country: 'India',
    jobId: 'atvideonetworks-purchase-executive-madurai',
    requisitionId: 'atvideonetworks-purchase-executive-madurai',
    sourceUrl: 'https://www.atnetindia.net/career/',
    applyUrl: 'https://zfrmz.in/asGqF0N9kzqX6IMVZoaR',
    employmentType: null,
    experienceRequired: '1-2 years experience in end to end purchase process',
    minimumQualification: 'MBA - Supply chain and logistics (Preferrable) / Any degree',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Location : Madurai Educational Qualification : MBA - Supply chain and logistics (Preferrable) / Any degree Experience : 1-2 years experience in end to end purchase process Tools: Tally / Excel Apply via the A&T Video Networks careers form.',
  })
})

test('run fetches the A&T careers page and decorates the extracted openings', async () => {
  const atvideo = await loadATVideoNetworksModule()
  const requestedUrls = []
  const scraper = atvideo.createATVideoNetworksScraper({ maxJobs: 2 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return sampleHtml
    },
  })

  assert.equal(atvideo.buildSearchUrl(), atvideo.CAREER_PAGE_URL)
  assert.deepEqual(requestedUrls, [atvideo.CAREER_PAGE_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'atvideonetworks')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
