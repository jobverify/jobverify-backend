import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Bajaj Auto - Bikes, Scooters, Three Wheelers &amp; Qute (2026)</title>
  </head>
  <body>
    <nav>
      <a href="/careers">Careers</a>
    </nav>
  </body>
</html>
`

const careersHubHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Why Work With Bajaj Auto – Careers & Opportunities</title>
  </head>
  <body>
    <h1>Select your preferences to find a job</h1>
    <a href="/careers/search-result">View All Jobs</a>
    <a href="/careers/Search-Result?type=dropresume">Drop Resume</a>
    <a href="/careers/public-notice">Public Notice: Job Fraud Alert</a>
  </body>
</html>
`

const searchResultsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Bajaj Auto Careers – Explore Latest Job Openings</title>
  </head>
  <body>
    <div class="detailTitle">Showing latest job postings</div>
    <div class="jobWrapper" id="div_jobRequisitions"></div>
    <ul id="pagin"></ul>
    <script src="https://cdn.bajajauto.com/js/new-design/js/career-header.js?v=271"></script>
    <script>
      $(document).ready(function () {
        fnGetJobFamilyWithExperience();
        fnBindJobDetails();
      });
    </script>
  </body>
</html>
`

const careerHeaderJs = `
var arrjobRequisitions, arrjobFamilies, portal = "careers";
function fnBindRequisitions(e) {
  var o = "";
  for (var t = 0; t < e.length; t++) {
    o += '<div class="jobContainer">';
    o += '<div class="knowMoreBtn"><a href="/' + portal + "/job/" + e[t].jobUrl.replaceAll("_", "-").replaceAll("#", "-").replaceAll("|", "").replaceAll("--", "-") + "/" + e[t].jobReqId + '">Know more</a></div>';
    o += "</div>";
  }
  $("#div_jobRequisitions").html(o);
}
$((function () {
  $.ajax({ async: !1, url: "/handlers/careers/get-requisitions.ashx", success: function (e) { arrjobRequisitions = e } });
  $.ajax({ async: !1, url: "/handlers/careers/get-job-types.ashx", success: function (e) { arrjobFamilies = e.jobCategories } });
}));
`

const requisitionsPayload = {
  jobRequisitions: [
    {
      jobReqId: 14413,
      custAppStatus: 383,
      custjobRole: 'Finance',
      custjobFamily: 'Business Support',
      jobTitle: 'MGR',
      jobUrl: 'mgr',
      jobDescription:
        '<table><tr><td>Plant / RO</td><td>Akurdi</td></tr><tr><td>Designation</td><td>Manager</td></tr></table><p>Accounts background</p>',
      createdDateTime: '2026-04-16T18:42:45',
      lastModifiedDateTime: '2026-04-16T18:52:14',
      openingsFilled: 0,
      numberOpenings: 1,
      cust_experience: '',
      jobCode: null,
      status: 'Open',
      internalStatus: 'Approved',
      country: 'India',
      State: 'Maharashtra',
      location: '',
      JobLevel: '',
      jobType: 'Full time',
      jobStartDate: '2026-04-16T05:30:00',
      postStartDate: '2026-04-16T09:04:13',
      postEndDate: null,
      custMinexperience: '5',
      custMaxExperience: '8',
    },
    {
      jobReqId: 15555,
      custAppStatus: 383,
      custjobRole: 'Production',
      custjobFamily: 'Manufacturing',
      jobTitle: 'Engineer',
      jobUrl: 'engineer-role',
      jobDescription: '<p>Manufacturing engineering support</p>',
      createdDateTime: '2026-05-01T10:00:00',
      lastModifiedDateTime: '2026-05-02T10:00:00',
      openingsFilled: 0,
      numberOpenings: 2,
      cust_experience: '1-3 Years',
      jobCode: null,
      status: 'Open',
      internalStatus: 'Approved',
      country: 'India',
      State: 'Maharashtra',
      location: 'Waluj',
      JobLevel: '',
      jobType: 'Full time',
      jobStartDate: '2026-05-01T05:30:00',
      postStartDate: '2026-05-02T08:00:00',
      postEndDate: null,
      custMinexperience: '1',
      custMaxExperience: '3',
    },
    {
      jobReqId: 16666,
      custAppStatus: 383,
      custjobRole: 'Sales',
      custjobFamily: 'Sales & Marketing',
      jobTitle: 'Manager - Export',
      jobUrl: 'manager-export',
      jobDescription: '<p>International business role</p>',
      createdDateTime: '2026-05-10T10:00:00',
      lastModifiedDateTime: '2026-05-11T10:00:00',
      openingsFilled: 0,
      numberOpenings: 1,
      cust_experience: '5-8 Years',
      jobCode: null,
      status: 'Closed',
      internalStatus: 'Approved',
      country: 'India',
      State: 'Maharashtra',
      location: 'Pune',
      JobLevel: '',
      jobType: 'Full time',
      jobStartDate: '2026-05-10T05:30:00',
      postStartDate: '2026-05-11T08:00:00',
      postEndDate: '2026-06-01T08:00:00',
      custMinexperience: '5',
      custMaxExperience: '8',
    },
  ],
  jobFamily: [],
  CustExperience: [
    {
      cust_experience: '1-3 Years',
    },
  ],
}

const jobTypesPayload = {
  jobCategories: [
    {
      job_family_Id: 77879,
      job_family: 'Manufacturing',
      cat_sort: 1,
      job_Roles: [
        {
          jobRole: 'Production',
          subcat_sort: 1,
        },
      ],
    },
    {
      job_family_Id: 77880,
      job_family: 'Business Support',
      cat_sort: 2,
      job_Roles: [
        {
          jobRole: 'Finance',
          subcat_sort: 1,
        },
      ],
    },
  ],
}

const detailShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Bajaj Auto Careers – Explore Latest Job Openings</title>
  </head>
  <body>
    <h1 id="job_title"></h1>
    <div class="apply-now">Apply Now</div>
    <button onclick="fnSubmitApplyNow()">Submit</button>
    <a href="https://career10.successfactors.com/career?career_company=BAL&lang=en_GB&company=BAL&site=&loginFlowRequired=true" target="_blank">Login here</a>
    <input type="hidden" id="jobRequisitionId" name="jobRequisitionId" value="14096" />
    <script src="https://cdn.bajajauto.com/js/new-design/js/career-header.js?v=271"></script>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../bajajauto/script.js')
  } catch {
    assert.fail('Expected Bajaj Auto scraper module at ../bajajauto/script.js')
  }
}

test('Bajaj Auto pins the verified first-party careers hub, search page, career bundle, api contracts, and detail shell', async () => {
  const bajajAuto = await loadModule()

  assert.equal(bajajAuto.SOURCE, 'bajajauto')
  assert.equal(bajajAuto.COMPANY, 'Bajaj Auto')
  assert.equal(bajajAuto.OFFICIAL_BRAND_NAME, 'Bajaj Auto Limited')
  assert.equal(bajajAuto.VERIFIED_AT, '2026-07-19')
  assert.equal(bajajAuto.HOMEPAGE_URL, 'https://www.bajajauto.com/')
  assert.equal(bajajAuto.CAREERS_HUB_URL, 'https://www.bajajauto.com/careers')
  assert.equal(bajajAuto.CAREERS_HUB_FINAL_URL, 'https://www.bajajauto.com/careers/why-us')
  assert.equal(bajajAuto.SEARCH_RESULTS_URL, 'https://www.bajajauto.com/careers/search-result')
  assert.equal(
    bajajAuto.CAREER_HEADER_SCRIPT_URL,
    'https://cdn.bajajauto.com/js/new-design/js/career-header.js?v=271',
  )
  assert.equal(
    bajajAuto.REQUISITIONS_API_URL,
    'https://www.bajajauto.com/handlers/careers/get-requisitions.ashx',
  )
  assert.equal(
    bajajAuto.JOB_TYPES_API_URL,
    'https://www.bajajauto.com/handlers/careers/get-job-types.ashx',
  )
  assert.equal(
    bajajAuto.APPLICATION_TRACKING_URL,
    'https://career10.successfactors.com/career?career_company=BAL&lang=en_GB&company=BAL&site=&loginFlowRequired=true',
  )
  assert.equal(bajajAuto.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(bajajAuto.hasOfficialCareersHubSignal(careersHubHtml), true)
  assert.equal(bajajAuto.hasSearchResultsSurfaceSignal(searchResultsHtml), true)
  assert.equal(bajajAuto.hasVerifiedCareerHeaderContract(careerHeaderJs), true)
  assert.equal(bajajAuto.hasVerifiedJobRequisitionsPayload(requisitionsPayload), true)
  assert.equal(bajajAuto.hasVerifiedJobTypesPayload(jobTypesPayload), true)
  assert.equal(bajajAuto.hasOfficialJobDetailShellSignal(detailShellHtml), true)
  assert.equal(
    bajajAuto.buildDetailUrl(requisitionsPayload.jobRequisitions[0]),
    'https://www.bajajauto.com/careers/job/mgr/14413',
  )
  assert.equal(
    bajajAuto.extractLocationHintFromDescription(requisitionsPayload.jobRequisitions[0].jobDescription),
    'Akurdi',
  )
  assert.deepEqual(
    bajajAuto.mapJobRecordToJob(requisitionsPayload.jobRequisitions[0], {
      scrapedAt: '2026-07-15T09:00:00.000Z',
    }),
    {
      title: 'MGR',
      company: 'Bajaj Auto',
      department: 'Finance',
      location: 'Akurdi, Maharashtra, India',
      city: 'Akurdi',
      country: 'India',
      sourceUrl: 'https://www.bajajauto.com/careers/job/mgr/14413',
      applyUrl: 'https://www.bajajauto.com/careers/job/mgr/14413',
      jobId: 'bajajauto-14413',
      requisitionId: '14413',
      employmentType: 'Full time',
      workplaceType: null,
      experienceRequired: '5-8 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      compensation: null,
      postingDate: '2026-04-16',
      closingDate: null,
      jobDescription: 'Plant / RO Akurdi Designation Manager Accounts background',
      source: 'bajajauto',
      companyCareerPage: 'https://www.bajajauto.com/careers/search-result',
      companyDomain: 'bajajauto.com',
      atsPlatform: 'first-party-careers-api',
      link: 'https://www.bajajauto.com/careers/job/mgr/14413',
      scrapedAt: '2026-07-15T09:00:00.000Z',
    },
  )
})

test('Bajaj Auto run verifies the first-party surfaces and returns normalized jobs from the requisitions api', async () => {
  const bajajAuto = await loadModule()
  const pageRequests = []
  const textRequests = []
  const jsonRequests = []

  const jobs = await bajajAuto.createBajajAutoScraper({
    now: () => '2026-07-15T10:15:00.000Z',
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === bajajAuto.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === bajajAuto.CAREERS_HUB_URL) {
        return { status: 200, url: bajajAuto.CAREERS_HUB_FINAL_URL, html: careersHubHtml }
      }

      if (url === bajajAuto.SEARCH_RESULTS_URL) {
        return { status: 200, url, html: searchResultsHtml }
      }

      if (url === 'https://www.bajajauto.com/careers/job/mgr/14413') {
        return { status: 200, url, html: detailShellHtml }
      }

      throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
    },
    fetchText: async (url) => {
      textRequests.push(url)

      if (url === bajajAuto.CAREER_HEADER_SCRIPT_URL) {
        return careerHeaderJs
      }

      throw new Error(`Unexpected Bajaj Auto text URL: ${url}`)
    },
    fetchJson: async (url) => {
      jsonRequests.push(url)

      if (url === bajajAuto.REQUISITIONS_API_URL) {
        return requisitionsPayload
      }

      if (url === bajajAuto.JOB_TYPES_API_URL) {
        return jobTypesPayload
      }

      throw new Error(`Unexpected Bajaj Auto JSON URL: ${url}`)
    },
  })

  assert.deepEqual(pageRequests, [
    bajajAuto.HOMEPAGE_URL,
    bajajAuto.CAREERS_HUB_URL,
    bajajAuto.SEARCH_RESULTS_URL,
    'https://www.bajajauto.com/careers/job/mgr/14413',
  ])
  assert.deepEqual(textRequests, [bajajAuto.CAREER_HEADER_SCRIPT_URL])
  assert.deepEqual(jsonRequests, [
    bajajAuto.REQUISITIONS_API_URL,
    bajajAuto.JOB_TYPES_API_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'MGR')
  assert.equal(jobs[0].location, 'Akurdi, Maharashtra, India')
  assert.equal(jobs[0].applyUrl, jobs[0].sourceUrl)
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-15T10:15:00.000Z')
  assert.equal(jobs[1].title, 'Engineer')
  assert.equal(jobs[1].location, 'Waluj, Maharashtra, India')
  assert.equal(jobs[1].experienceRequired, '1-3 Years')
  assert.equal(jobs[1].postingDate, '2026-05-02')
})

test('Bajaj Auto fails closed when the verified careers page, bundle, api contracts, or detail shell drift', async () => {
  const bajajAuto = await loadModule()

  await assert.rejects(
    bajajAuto.createBajajAutoScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAuto.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><head><title>Unexpected</title></head><body>No careers link</body></html>' }
        }

        throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
      },
    }),
    /verified homepage/i,
  )

  await assert.rejects(
    bajajAuto.createBajajAutoScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAuto.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bajajAuto.CAREERS_HUB_URL) {
          return {
            status: 200,
            url: bajajAuto.CAREERS_HUB_FINAL_URL,
            html: careersHubHtml.replace('/careers/search-result', '/careers/jobs'),
          }
        }

        throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
      },
    }),
    /verified careers hub/i,
  )

  await assert.rejects(
    bajajAuto.createBajajAutoScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAuto.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bajajAuto.CAREERS_HUB_URL) {
          return { status: 200, url: bajajAuto.CAREERS_HUB_FINAL_URL, html: careersHubHtml }
        }

        if (url === bajajAuto.SEARCH_RESULTS_URL) {
          return { status: 200, url, html: '<html><head><title>Broken</title></head><body>Placeholder</body></html>' }
        }

        throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
      },
    }),
    /verified search results page/i,
  )

  await assert.rejects(
    bajajAuto.createBajajAutoScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAuto.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bajajAuto.CAREERS_HUB_URL) {
          return { status: 200, url: bajajAuto.CAREERS_HUB_FINAL_URL, html: careersHubHtml }
        }

        if (url === bajajAuto.SEARCH_RESULTS_URL) {
          return { status: 200, url, html: searchResultsHtml }
        }

        throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
      },
      fetchText: async () => 'console.log("missing verified endpoints");',
    }),
    /career header bundle/i,
  )

  await assert.rejects(
    bajajAuto.createBajajAutoScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAuto.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bajajAuto.CAREERS_HUB_URL) {
          return { status: 200, url: bajajAuto.CAREERS_HUB_FINAL_URL, html: careersHubHtml }
        }

        if (url === bajajAuto.SEARCH_RESULTS_URL) {
          return { status: 200, url, html: searchResultsHtml }
        }

        throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
      },
      fetchText: async () => careerHeaderJs,
      fetchJson: async (url) => {
        if (url === bajajAuto.REQUISITIONS_API_URL) {
          return { jobs: [] }
        }

        if (url === bajajAuto.JOB_TYPES_API_URL) {
          return jobTypesPayload
        }

        throw new Error(`Unexpected Bajaj Auto JSON URL: ${url}`)
      },
    }),
    /requisitions api/i,
  )

  await assert.rejects(
    bajajAuto.createBajajAutoScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAuto.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bajajAuto.CAREERS_HUB_URL) {
          return { status: 200, url: bajajAuto.CAREERS_HUB_FINAL_URL, html: careersHubHtml }
        }

        if (url === bajajAuto.SEARCH_RESULTS_URL) {
          return { status: 200, url, html: searchResultsHtml }
        }

        throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
      },
      fetchText: async () => careerHeaderJs,
      fetchJson: async (url) => {
        if (url === bajajAuto.REQUISITIONS_API_URL) {
          return requisitionsPayload
        }

        if (url === bajajAuto.JOB_TYPES_API_URL) {
          return { categories: [] }
        }

        throw new Error(`Unexpected Bajaj Auto JSON URL: ${url}`)
      },
    }),
    /job types api/i,
  )

  await assert.rejects(
    bajajAuto.createBajajAutoScraper().run({
      fetchPage: async (url) => {
        if (url === bajajAuto.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === bajajAuto.CAREERS_HUB_URL) {
          return { status: 200, url: bajajAuto.CAREERS_HUB_FINAL_URL, html: careersHubHtml }
        }

        if (url === bajajAuto.SEARCH_RESULTS_URL) {
          return { status: 200, url, html: searchResultsHtml }
        }

        if (url === 'https://www.bajajauto.com/careers/job/mgr/14413') {
          return {
            status: 200,
            url,
            html: '<html><head><title>Broken detail</title></head><body>No apply shell</body></html>',
          }
        }

        throw new Error(`Unexpected Bajaj Auto page URL: ${url}`)
      },
      fetchText: async () => careerHeaderJs,
      fetchJson: async (url) => {
        if (url === bajajAuto.REQUISITIONS_API_URL) {
          return requisitionsPayload
        }

        if (url === bajajAuto.JOB_TYPES_API_URL) {
          return jobTypesPayload
        }

        throw new Error(`Unexpected Bajaj Auto JSON URL: ${url}`)
      },
    }),
    /detail shell/i,
  )
})
