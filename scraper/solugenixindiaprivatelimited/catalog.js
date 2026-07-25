export const SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG = {
  source: 'solugenixindiaprivatelimited',
  companyName: 'Solugenix India Private Limited',
  officialBrandName: 'Solugenix',
  companyCareerPage: 'https://www.solugenix.com/jobs',
  companyDomain: 'solugenix.com',
  homepageUrl: 'https://www.solugenix.com/',
  careersLandingUrl: 'https://careers.solugenix.com/',
  ceipalWidgetScriptUrl: 'https://jobsapi.ceipal.com/APISource/widget.js',
  ceipalWidgetUrl: 'https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=RzI5YnRDNlo3OGFmQTVPcVIwcEVaUT09&cp_id=Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
  ceipalApiKey: 'RzI5YnRDNlo3OGFmQTVPcVIwcEVaUT09',
  ceipalCareerPortalId: 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
  adapter: 'script',
  atsPlatform: 'official-jobs-page-with-bot-blocked-ceipal-widget',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-landing-plus-bot-blocked-ceipal-widget-validation',
  extractionStrategy: 'verified-careers-landing+verified-jobs-portal+verified-ceipal-widget-config+blocked-widget-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: 'scraper/solugenixindiaprivatelimited/script.js',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.solugenix.com/ linked first-party Current Opportunities to https://www.solugenix.com/jobs, which embedded a CEIPAL widget with API key RzI5YnRDNlo3OGFmQTVPcVIwcEVaUT09 and portal id Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09. The public CEIPAL widget surface remained placeholder-only and the direct CareerPortalJobPostings API replied "Bot access is not allowed", so no trustworthy public job records were available to scrape.',
}

export default SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG
