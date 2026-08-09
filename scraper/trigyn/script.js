export const SOURCE = 'trigyn'
export const COMPANY = 'Trigyn'
export const CAREERS_URL = 'https://www.trigyn.com/careers'

// The verified Drupal careers page advertises current opportunities but returns
// an empty #ajax-wrapper for both GET and an empty-filter POST. It exposes no
// JobPosting data, job links, or documented listing endpoint to enumerate.
export const BLOCKED_LISTING_CONTRACT =
  'The official careers surface has no enumerable first-party jobs response; do not derive roles from unlinked /job/ detail pages.'

export const createTrigynScraper = () => ({
  async run() {
    return []
  },
})

export const run = async () => createTrigynScraper().run()
