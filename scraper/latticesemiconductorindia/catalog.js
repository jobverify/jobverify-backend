export const LATTICE_SEMICONDUCTOR_INDIA_CATALOG = {
  source: 'latticesemiconductorindia',
  companyName: 'Lattice Semiconductor India',
  officialBrandName: 'Lattice Semiconductor',
  adapter: 'script',
  modulePath: '../../scraper/latticesemiconductorindia/script.js',
  dryRunFile: 'latticesemiconductorindia/jobs.json',
  homepageUrl: 'https://www.latticesemi.com/en',
  companyCareerPage: 'https://www.latticesemi.com/About/Jobs',
  indiaJobsIntroUrl:
    'https://careers-latticesemi.icims.com/jobs/intro?bga=true&hashed=-625919477&height=500&jan1offset=-480&jun1offset=-420&mobile=false&needsRedirect=false&width=1378',
  indiaJobsSearchWrapperUrl: 'https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1',
  indiaJobsSearchIframeUrl: 'https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1&in_iframe=1',
  officialJobDetailExampleUrl:
    'https://careers-latticesemi.icims.com/jobs/3678/senior-director%2C-global-facilities/job',
  atsPlatform: 'icims',
  countryFilter: 'India',
  paginationStrategy: 'icims-next-page-search',
  extractionStrategy: 'verified-first-party-careers-page+verified-icims-intro+iframe-listings+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'latticesemi.com',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on August 2, 2026 that the first-party Lattice careers page at https://www.latticesemi.com/About/Jobs links Search Job Openings to the public iCIMS intro at https://careers-latticesemi.icims.com/jobs/intro?bga=true&hashed=-625919477&height=500&jan1offset=-480&jun1offset=-420&mobile=false&needsRedirect=false&width=1378, that the intro hands off view all open positions to https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1, that the live listings iframe surface is https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1&in_iframe=1, and that the public detail contract is live at https://careers-latticesemi.icims.com/jobs/3678/senior-director%2C-global-facilities/job for an IN-MH-Pune role.',
}

export default LATTICE_SEMICONDUCTOR_INDIA_CATALOG

