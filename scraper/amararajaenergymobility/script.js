import {createPeopleStrongPairScraper} from '../../scraper-support/shared/peopleStrongNativePair20261027.js'
export const CAREERS_ORIGIN='https://amararajacareers.peoplestrong.com'
export const JOBS_API_URL=CAREERS_ORIGIN+'/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=45'
export const run=options=>createPeopleStrongPairScraper('amararajaenergymobility').run(options)
