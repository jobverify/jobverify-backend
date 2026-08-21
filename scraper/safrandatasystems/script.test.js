import assert from 'node:assert/strict'
import test from 'node:test'

const SOURCE = 'safrandatasystems'
const COMPANY = 'Safran Data Systems'
const COMPANY_PAGE_URL = 'https://www.safran-group.com/fr/societes/safran-data-systems'
const FILTERED_JOBS_URL = 'https://www.safran-group.com/fr/offres?companies%5B%5D=609-safran-data-systems'
const NEXT_PAGE_URL = 'https://www.safran-group.com/fr/offres?companies%5B0%5D=609-safran-data-systems&page=1'

const loadSafranDataSystemsModule = async () => import('./script.js')

const COMPANY_PAGE_HTML = `
<!doctype html>
<html lang="fr">
  <head>
    <title>Safran Data Systems - Leader mondial en instrumentation dâ€™essais, tÃ©lÃ©mesure et communications pour lâ€™espace | Safran</title>
  </head>
  <body>
    <h1>Safran Data Systems</h1>
    <p>Rejoignez Safran Data Systems et dÃ©couvrez nos <strong>52</strong> opportunitÃ©s</p>
    <a class="c-btn c-btn--arrow-btn" href="/fr/offres?companies%5B%5D=609-safran-data-systems">
      Voir nos offres d'emplois
    </a>
  </body>
</html>
`

const FILTERED_PAGE_1_HTML = `
<!doctype html>
<html lang="fr">
  <head>
    <title>Offres d&#039;emploi | Safran</title>
    <link rel="canonical" href="https://www.safran-group.com/fr/offres" />
  </head>
  <body>
    <select name="companies[]" id="edit-companies">
      <option value="609-safran-data-systems" selected="selected">Safran Data Systems</option>
    </select>
    <span class="c-structured-news-list__results--nb">3</span>&nbsp;rÃ©sultat(s)

    <div class="c-offer-item js-block-link">
      <div class="c-offer-item__content">
        <a href="https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425" class="c-offer-item__title js-block-link--href">IngÃ©nieur qualitÃ© logiciel/projet F/H</a>
        <span class="c-offer-item__date">11.07.2026</span>
        <div class="c-offer-item__infos">
          <span class="c-offer-item__infos__item">Safran Data Systems</span>
          <span class="c-offer-item__infos__item">Les Ulis, Ile de France, France</span>
          <span class="c-offer-item__infos__item">IngÃ©nieur &amp; Cadre</span>
          <span class="c-offer-item__infos__item">CDI</span>
          <span class="c-offer-item__infos__item">QualitÃ©</span>
        </div>
      </div>
    </div>

    <div class="c-offer-item js-block-link">
      <div class="c-offer-item__content">
        <a href="https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733" class="c-offer-item__title js-block-link--href">Responsable Test et Informatique Industrielle F/H</a>
        <span class="c-offer-item__date">11.07.2026</span>
        <div class="c-offer-item__infos">
          <span class="c-offer-item__infos__item">Safran Data Systems</span>
          <span class="c-offer-item__infos__item">Les Ulis, Ile de France, France</span>
          <span class="c-offer-item__infos__item">IngÃ©nieur &amp; Cadre</span>
          <span class="c-offer-item__infos__item">CDI</span>
          <span class="c-offer-item__infos__item">IngÃ©nierie Industrielle</span>
        </div>
      </div>
    </div>

    <a href="?companies%5B0%5D=609-safran-data-systems&amp;page=1" title="Aller Ã  la page suivante" class="pagination__nav-btn pagination__nav-btn--next" rel="next"></a>
  </body>
</html>
`

const FILTERED_PAGE_2_HTML = `
<!doctype html>
<html lang="fr">
  <head>
    <title>Offres d&#039;emploi | Safran</title>
  </head>
  <body>
    <select name="companies[]" id="edit-companies">
      <option value="609-safran-data-systems" selected="selected">Safran Data Systems</option>
    </select>
    <span class="c-structured-news-list__results--nb">3</span>&nbsp;rÃ©sultat(s)

    <div class="c-offer-item js-block-link">
      <div class="c-offer-item__content">
        <a href="https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282" class="c-offer-item__title js-block-link--href">Architecte en base de donnÃ©es F/H</a>
        <span class="c-offer-item__date">10.07.2026</span>
        <div class="c-offer-item__infos">
          <span class="c-offer-item__infos__item">Safran Data Systems</span>
          <span class="c-offer-item__infos__item">Colombelles, Normandie, France</span>
          <span class="c-offer-item__infos__item">IngÃ©nieur &amp; Cadre</span>
          <span class="c-offer-item__infos__item">CDI</span>
          <span class="c-offer-item__infos__item">SystÃ¨mes d&#039;information</span>
        </div>
      </div>
    </div>
  </body>
</html>
`

const createDetailHtml = ({
  title,
  identifier,
  city,
  state,
  country = 'France',
  description,
  qualifications,
  industry,
  occupationalCategory = 'IngÃ©nieur & Cadre',
  employmentType = 'CDI',
  datePosted = '2026-07-11',
  sourceUrl,
}) => `
<!doctype html>
<html lang="fr">
  <head>
    <title>${title} - ${country}, ${city} - ${identifier.split('-').at(-1)} | Safran</title>
    <link rel="canonical" href="${sourceUrl}" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": ${JSON.stringify(title)},
        "employmentType": ${JSON.stringify(employmentType)},
        "datePosted": ${JSON.stringify(datePosted)},
        "identifier": ${JSON.stringify(identifier)},
        "hiringOrganization": {
          "@type": "Organization",
          "name": "Safran Data Systems"
        },
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": ${JSON.stringify(city)},
            "addressRegion": ${JSON.stringify(state)},
            "addressCountry": ${JSON.stringify(country)}
          }
        },
        "description": ${JSON.stringify(description)},
        "industry": ${JSON.stringify(industry)},
        "occupationalCategory": ${JSON.stringify(occupationalCategory)},
        "qualifications": ${JSON.stringify(qualifications)}
      }
    </script>
  </head>
  <body>
    <div class="c-references-block-container__details">
      <span><a href="/fr/societes/safran-data-systems">Safran Data Systems</a></span>
    </div>
    <div class="c-references-block-container__button">
      <a id="simple-apply" href="${new URL('jobapplication', `${sourceUrl}/`).pathname}" class="c-btn c-btn--primary c-btn--full-width" rel="nofollow">Postuler</a>
      <a id="one-click-apply" href="${new URL('one-click-jobapplication', `${sourceUrl}/`).pathname}" class="c-btn c-btn--primary-inverted c-btn--full-width" rel="nofollow">Postuler en un clic</a>
    </div>
    <div class="c-details-offers-container__description--text">
      <p>${description}</p>
    </div>
  </body>
</html>
`

const DETAIL_HTML_BY_URL = {
  'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425': createDetailHtml({
    title: 'IngÃ©nieur qualitÃ© logiciel/projet F/H',
    identifier: '2026-183425',
    city: 'Les Ulis',
    state: 'Ile de France',
    industry: 'QualitÃ©',
    description: 'Dans un contexte de forte croissance, Safran Data Systems crÃ©e un nouveau poste clÃ© au sein de lâ€™Ã©quipe QualitÃ©.',
    qualifications: 'â€¢ 5+ years in software quality assurance\nâ€¢ DO-178 / DO-254 experience\nâ€¢ Strong communication skills',
    sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425',
  }),
  'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733': createDetailHtml({
    title: 'Responsable Test et Informatique Industrielle F/H',
    identifier: '2026-175733',
    city: 'Les Ulis',
    state: 'Ile de France',
    industry: 'IngÃ©nierie Industrielle',
    description: 'Safran Data Systems recherche un responsable test et informatique industrielle pour ses activitÃ©s spatiales.',
    qualifications: 'â€¢ Industrial test leadership\nâ€¢ Lab and automation experience',
    sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733',
  }),
  'https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282': createDetailHtml({
    title: 'Architecte en base de donnÃ©es F/H',
    identifier: '2026-182282',
    city: 'Colombelles',
    state: 'Normandie',
    industry: 'SystÃ¨mes dâ€™information',
    description: 'Safran Data Systems dÃ©veloppe ses plateformes de donnÃ©es critiques pour les communications spatiales.',
    qualifications: 'â€¢ Database architecture\nâ€¢ Cloud and resilience design',
    sourceUrl: 'https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282',
  }),
}

test('Safran Data Systems scraper locks the exact first-party company page and filtered jobs surface', async () => {
  const safranDataSystems = await loadSafranDataSystemsModule()

  assert.equal(safranDataSystems.SOURCE, SOURCE)
  assert.equal(safranDataSystems.COMPANY, COMPANY)
  assert.equal(safranDataSystems.COMPANY_PAGE_URL, COMPANY_PAGE_URL)
  assert.equal(safranDataSystems.FILTERED_JOBS_URL, FILTERED_JOBS_URL)
  assert.equal(safranDataSystems.COMPANY_FILTER_VALUE, '609-safran-data-systems')
  assert.equal(safranDataSystems.hasOfficialCompanyPageSignal(COMPANY_PAGE_HTML), true)
  assert.equal(safranDataSystems.extractCompanyJobsUrl(COMPANY_PAGE_HTML), FILTERED_JOBS_URL)
  assert.equal(safranDataSystems.hasFilteredJobsPageSignal(FILTERED_PAGE_1_HTML), true)
  assert.equal(safranDataSystems.extractResultCount(FILTERED_PAGE_1_HTML), 3)
  assert.equal(safranDataSystems.extractNextPageUrl(FILTERED_PAGE_1_HTML), NEXT_PAGE_URL)
})

test('Safran Data Systems default fetch falls back to curl before browser rendering when the first-party site returns HTTP 403', async () => {
  const safranDataSystems = await loadSafranDataSystemsModule()
  const calls = []
  const fetchText = safranDataSystems.createDefaultFetchText({
    fetchImpl: async (url, options) => {
      calls.push({ type: 'fetch', url, options })
      return {
        ok: false,
        status: 403,
      }
    },
    execFileImpl: (command, args, callback) => {
      calls.push({ type: 'curl', command, args })
      callback(null, `${COMPANY_PAGE_HTML}\n__SAFRAN_STATUS__200`, '')
    },
    fetchBrowserText: async (url) => {
      calls.push({ type: 'browser', url })
      return '<html>ok</html>'
    },
  })

  const html = await fetchText(COMPANY_PAGE_URL)

  assert.equal(html.includes('Safran Data Systems'), true)
  assert.equal(calls[0].type, 'fetch')
  assert.equal(calls[1].type, 'curl')
  assert.match(calls[1].command, /curl(?:\.exe)?$/i)
  assert.equal(calls.some((call) => call.type === 'browser'), false)
})

test('Safran Data Systems scraper extracts exact-company cards and detail metadata from first-party pages', async () => {
  const safranDataSystems = await loadSafranDataSystemsModule()
  const cards = safranDataSystems.extractJobCards(FILTERED_PAGE_1_HTML)

  assert.deepEqual(cards, [
    {
      title: 'IngÃ©nieur qualitÃ© logiciel/projet F/H',
      sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425',
      company: COMPANY,
      location: 'Les Ulis, Ile de France, France',
      city: 'Les Ulis',
      state: 'Ile de France',
      country: 'France',
      jobId: '183425',
      requisitionId: '183425',
      applyUrl: 'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425',
      employmentType: 'CDI',
      department: 'QualitÃ©',
      postingDate: '11.07.2026',
      jobDescription: null,
    },
    {
      title: 'Responsable Test et Informatique Industrielle F/H',
      sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733',
      company: COMPANY,
      location: 'Les Ulis, Ile de France, France',
      city: 'Les Ulis',
      state: 'Ile de France',
      country: 'France',
      jobId: '175733',
      requisitionId: '175733',
      applyUrl: 'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733',
      employmentType: 'CDI',
      department: 'IngÃ©nierie Industrielle',
      postingDate: '11.07.2026',
      jobDescription: null,
    },
  ])

  const detail = safranDataSystems.extractJobDetail(cards[0], DETAIL_HTML_BY_URL[cards[0].sourceUrl])

  assert.deepEqual(detail, {
    title: 'IngÃ©nieur qualitÃ© logiciel/projet F/H',
    company: COMPANY,
    department: 'QualitÃ©',
    location: 'Les Ulis, Ile de France, France',
    city: 'Les Ulis',
    state: 'Ile de France',
    country: 'France',
    jobId: '2026-183425',
    requisitionId: '2026-183425',
    sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425',
    applyUrl: 'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425/jobapplication',
    employmentType: 'CDI',
    experienceRequired: '5+ years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'â€¢ 5+ years in software quality assurance',
      'â€¢ DO-178 / DO-254 experience',
      'â€¢ Strong communication skills',
    ],
    postingDate: '2026-07-11',
    closingDate: null,
    jobDescription: 'Dans un contexte de forte croissance, Safran Data Systems crÃ©e un nouveau poste clÃ© au sein de lâ€™Ã©quipe QualitÃ©.',
    remoteStatus: 'On-site',
    occupationalCategory: 'IngÃ©nieur & Cadre',
  })
})

test('Safran Data Systems scraper falls back to listing data when detail pages are Cloudflare-blocked', async () => {
  const safranDataSystems = await loadSafranDataSystemsModule()

  const jobs = await safranDataSystems.createSafranDataSystemsScraper({
    now: () => '2026-07-11T08:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      if (url === COMPANY_PAGE_URL) return COMPANY_PAGE_HTML
      if (url === FILTERED_JOBS_URL) return FILTERED_PAGE_1_HTML
      if (url === NEXT_PAGE_URL) return FILTERED_PAGE_2_HTML
      if (DETAIL_HTML_BY_URL[url]) {
        throw new Error(`Safran Data Systems curl fetch returned HTTP 403 for ${url}`)
      }

      throw new Error(`Unexpected URL ${url}`)
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].applyUrl, jobs[0].sourceUrl)
  assert.equal(jobs[0].jobDescription, null)
  assert.equal(jobs[0].employmentType, 'CDI')
})

test('Safran Data Systems scraper run() follows the exact company page, paginated filter, and same-domain detail pages', async () => {
  const safranDataSystems = await loadSafranDataSystemsModule()
  const requestedUrls = []

  const jobs = await safranDataSystems.createSafranDataSystemsScraper({
    now: () => '2026-07-11T08:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === COMPANY_PAGE_URL) return COMPANY_PAGE_HTML
      if (url === FILTERED_JOBS_URL) return FILTERED_PAGE_1_HTML
      if (url === NEXT_PAGE_URL) return FILTERED_PAGE_2_HTML
      if (DETAIL_HTML_BY_URL[url]) return DETAIL_HTML_BY_URL[url]

      throw new Error(`Unexpected URL ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    COMPANY_PAGE_URL,
    FILTERED_JOBS_URL,
    NEXT_PAGE_URL,
    'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425',
    'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733',
    'https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282',
  ])
  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Architecte en base de donnÃ©es F/H',
    company: COMPANY,
    department: 'SystÃ¨mes dâ€™information',
    location: 'Colombelles, Normandie, France',
    city: 'Colombelles',
    state: 'Normandie',
    country: 'France',
    jobId: '2026-182282',
    requisitionId: '2026-182282',
    sourceUrl: 'https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282',
    applyUrl: 'https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282/jobapplication',
    employmentType: 'CDI',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'â€¢ Database architecture',
      'â€¢ Cloud and resilience design',
    ],
    postingDate: '2026-07-11',
    closingDate: null,
    jobDescription: 'Safran Data Systems dÃ©veloppe ses plateformes de donnÃ©es critiques pour les communications spatiales.',
    remoteStatus: 'On-site',
    occupationalCategory: 'IngÃ©nieur & Cadre',
    source: SOURCE,
    link: 'https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282/jobapplication',
    scrapedAt: '2026-07-11T08:00:00.000Z',
  })
})

test('Safran Data Systems scraper fails closed when the exact company filter is missing', async () => {
  const safranDataSystems = await loadSafranDataSystemsModule()

  await assert.rejects(
    safranDataSystems.createSafranDataSystemsScraper().run({
      fetchText: async (url) => {
        if (url === COMPANY_PAGE_URL) return COMPANY_PAGE_HTML
        if (url === FILTERED_JOBS_URL) {
          return FILTERED_PAGE_1_HTML.replace(' selected="selected"', '')
        }
        throw new Error(`Unexpected URL ${url}`)
      },
    }),
    /exact company filter/i,
  )
})
