/**
 * @file Controllers for manual scraper pipeline invocation and status checks.
 * @module controllers/scrapeController
 */


// Returns a simple status indicating the scrape router is online.
export const scrapeStatus = async (_req, res) => {
  res.status(200).json({
    code: 200,
    success: true,
    message: 'Scrape endpoint is active.',
    scheduledAt: '02:00 IST daily',
  })
}
