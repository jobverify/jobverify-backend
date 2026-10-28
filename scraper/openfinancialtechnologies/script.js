import config from './nativeConfig.js'
import {runNativeKeka,extractCareerConfig as extractConfig,extractDocument,buildActiveJobsUrl as activeUrl} from '../acciojob/nativeKeka.js'
export const CAREER_PAGE_URL=config.shellUrl
export const SOURCE=config.source
export const COMPANY=config.companyName
export const extractCareerDocumentUrl=html=>extractDocument(html,config)
export const extractCareerConfig=html=>extractConfig(html,config)
export const buildActiveJobsUrl=input=>activeUrl(input,config)
export const createOpenFinancialTechnologiesScraper=(defaults={})=>({run:(options={})=>runNativeKeka(config,{...defaults,...options})})
export const run=(options={})=>createOpenFinancialTechnologiesScraper().run(options)
