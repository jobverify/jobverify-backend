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
    <title>Safran Data Systems - Leader mondial en instrumentation d’essais, télémesure et communications pour l’espace | Safran</title>
  </head>
  <body>
    <h1>Safran Data Systems</h1>
    <p>Rejoignez Safran Data Systems et découvrez nos <strong>52</strong> opportunités</p>
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
    <span class="c-structured-news-list__results--nb">3</span>&nbsp;résultat(s)

    <div class="c-offer-item js-block-link">
      <div class="c-offer-item__content">
        <a href="https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425" class="c-offer-item__title js-block-link--href">Ingénieur qualité logiciel/projet F/H</a>
        <span class="c-offer-item__date">11.07.2026</span>
        <div class="c-offer-item__infos">
          <span class="c-offer-item__infos__item">Safran Data Systems</span>
          <span class="c-offer-item__infos__item">Les Ulis, Ile de France, France</span>
          <span class="c-offer-item__infos__item">Ingénieur &amp; Cadre</span>
          <span class="c-offer-item__infos__item">CDI</span>
          <span class="c-offer-item__infos__item">Qualité</span>
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
          <span class="c-offer-item__infos__item">Ingénieur &amp; Cadre</span>
          <span class="c-offer-item__infos__item">CDI</span>
          <span class="c-offer-item__infos__item">Ingénierie Industrielle</span>
        </div>
      </div>
    </div>

    <a href="?companies%5B0%5D=609-safran-data-systems&amp;page=1" title="Aller à la page suivante" class="pagination__nav-btn pagination__nav-btn--next" rel="next"></a>
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
    <span class="c-structured-news-list__results--nb">3</span>&nbsp;résultat(s)

    <div class="c-offer-item js-block-link">
      <div class="c-offer-item__content">
        <a href="https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282" class="c-offer-item__title js-block-link--href">Architecte en base de données F/H</a>
        <span class="c-offer-item__date">10.07.2026</span>
        <div class="c-offer-item__infos">
          <span class="c-offer-item__infos__item">Safran Data Systems</span>
          <span class="c-offer-item__infos__item">Colombelles, Normandie, France</span>
          <span class="c-offer-item__infos__item">Ingénieur &amp; Cadre</span>
          <span class="c-offer-item__infos__item">CDI</span>
          <span class="c-offer-item__infos__item">Systèmes d&#039;information</span>
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
  occupationalCategory = 'Ingénieur & Cadre',
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
    title: 'Ingénieur qualité logiciel/projet F/H',
    identifier: '2026-183425',
    city: 'Les Ulis',
    state: 'Ile de France',
    industry: 'Qualité',
    description: 'Dans un contexte de forte croissance, Safran Data Systems crée un nouveau poste clé au sein de l’équipe Qualité.',
    qualifications: '• 5+ years in software quality assurance\n• DO-178 / DO-254 experience\n• Strong communication skills',
    sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425',
  }),
  'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733': createDetailHtml({
    title: 'Responsable Test et Informatique Industrielle F/H',
    identifier: '2026-175733',
    city: 'Les Ulis',
    state: 'Ile de France',
    industry: 'Ingénierie Industrielle',
    description: 'Safran Data Systems recherche un responsable test et informatique industrielle pour ses activités spatiales.',
    qualifications: '• Industrial test leadership\n• Lab and automation experience',
    sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733',
  }),
  'https://www.safran-group.com/fr/offres/france/colombelles/architecte-base-donnees-fh-182282': createDetailHtml({
    title: 'Architecte en base de données F/H',
    identifier: '2026-182282',
    city: 'Colombelles',
    state: 'Normandie',
    industry: 'Systèmes d’information',
    description: 'Safran Data Systems développe ses plateformes de données critiques pour les communications spatiales.',
    qualifications: '• Database architecture\n• Cloud and resilience design',
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

test('Safran Data Systems default fetch falls back to browser rendering when the first-party site returns HTTP 403', async () => {
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
    fetchBrowserText: async (url) => {
      calls.push({ type: 'browser', url })
      return '<html>ok</html>'
    },
  })

  const html = await fetchText(COMPANY_PAGE_URL)

  assert.equal(html, '<html>ok</html>')
  assert.equal(calls[0].type, 'fetch')
  assert.equal(calls[1].type, 'browser')
  assert.equal(calls[1].url, COMPANY_PAGE_URL)
})

test('Safran Data Systems scraper extracts exact-company cards and detail metadata from first-party pages', async () => {
  const safranDataSystems = await loadSafranDataSystemsModule()
  const cards = safranDataSystems.extractJobCards(FILTERED_PAGE_1_HTML)

  assert.deepEqual(cards, [
    {
      title: 'Ingénieur qualité logiciel/projet F/H',
      sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/ingenieur-qualite-logicielprojet-fh-183425',
      company: COMPANY,
    },
    {
      title: 'Responsable Test et Informatique Industrielle F/H',
      sourceUrl: 'https://www.safran-group.com/fr/offres/france/ulis/responsable-test-informatique-industrielle-fh-175733',
      company: COMPANY,
    },
  ])

  const detail = safranDataSystems.extractJobDetail(cards[0], DETAIL_HTML_BY_URL[cards[0].sourceUrl])

  assert.deepEqual(detail, {
    title: 'Ingénieur qualité logiciel/projet F/H',
    company: COMPANY,
    department: 'Qualité',
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
      '5+ years in software quality assurance',
      'DO-178 / DO-254 experience',
      'Strong communication skills',
    ],
    postingDate: '2026-07-11',
    closingDate: null,
    jobDescription: 'Dans un contexte de forte croissance, Safran Data Systems crée un nouveau poste clé au sein de l’équipe Qualité.',
    remoteStatus: 'On-site',
    occupationalCategory: 'Ingénieur & Cadre',
  })
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
    title: 'Architecte en base de données F/H',
    company: COMPANY,
    department: 'Systèmes d’information',
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
      'Database architecture',
      'Cloud and resilience design',
    ],
    postingDate: '2026-07-11',
    closingDate: null,
    jobDescription: 'Safran Data Systems développe ses plateformes de données critiques pour les communications spatiales.',
    remoteStatus: 'On-site',
    occupationalCategory: 'Ingénieur & Cadre',
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
