import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  SOUTH_INDIA_PORTAL_URL,
  SOUTH_INDIA_JOB_POSTS_URL,
  SOUTH_INDIA_COMPANY_IDS,
  createMuthootFinanceScraper,
  extractAttachmentRows,
  extractDocxMainDocumentXml,
  extractPdfTextFromBuffer,
  extractSouthIndiaPortalJobs,
  parseAhmedabadRegionalPdfText,
  parseRegionalTrainerDocumentXml,
  pageIndicatesOfficialCareersSurface,
  pageIndicatesOfficialHomepage,
} from './script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(currentDir, '../tests/fixtures/muthootfinance')

const homepageHtml = fs.readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = fs.readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')
const trainerDocumentXml = fs.readFileSync(path.join(fixturesDir, 'regional-trainer-document.xml'), 'utf8')
const ahmedabadPdfText = fs.readFileSync(path.join(fixturesDir, 'ahmedabad-pdf-text.txt'), 'utf8')

const southIndiaPortalRows = [
  {
    JOB_POST_ID: '17186',
    JOB_POST_CODE: '025N-LUD-0288/26-GN',
    JOB_POST_NAME: 'CUSTOMER CARE EXECUTIVE ',
    JOB_DESCRIPTION: '<p>&nbsp;NEW CLIENT AQUISITION FOR BUSINESS</p>',
    STATE_NAME: 'PUNJAB',
    DISTRICT_NAME: 'LUDHIANA',
    JOB_LOCATION: 'LUDHIANA ',
    NO_OF_VACANCIES: '5',
    OPEN_DATE: '7/17/2026 12:00:00 AM',
    CLOSE_DATE: '9/23/2026 12:00:00 AM',
    EXPERIENCE_FROM: '0',
    EXPERIENCE_TO: '2',
  },
  {
    JOB_POST_ID: '17172',
    JOB_POST_CODE: '025-BDM-0175/26-GN',
    JOB_POST_NAME: 'BUSINESS DEVELOPMENT MANAGER FOR MSTL - THRICHI',
    JOB_DESCRIPTION: '<div>Promote and sell mutual fund products to new and existing clients.</div>',
    STATE_NAME: 'TAMIL NADU',
    DISTRICT_NAME: 'TRICHY',
    JOB_LOCATION: 'Thichi',
    NO_OF_VACANCIES: '1',
    OPEN_DATE: '7/9/2026 12:00:00 AM',
    CLOSE_DATE: '10/9/2026 12:00:00 AM',
    EXPERIENCE_FROM: '1',
    EXPERIENCE_TO: '3',
  },
]

const createCrc32Table = () => {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index += 1) {
    let crc = index
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1)
    }
    table[index] = crc >>> 0
  }

  return table
}

const CRC32_TABLE = createCrc32Table()

const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const buildDocxFixture = (xml) => {
  const filename = Buffer.from('word/document.xml')
  const uncompressed = Buffer.from(xml, 'utf8')
  const compressed = zlib.deflateRawSync(uncompressed)
  const checksum = crc32(uncompressed)

  const localHeader = Buffer.alloc(30)
  localHeader.writeUInt32LE(0x04034b50, 0)
  localHeader.writeUInt16LE(20, 4)
  localHeader.writeUInt16LE(0, 6)
  localHeader.writeUInt16LE(8, 8)
  localHeader.writeUInt32LE(checksum, 14)
  localHeader.writeUInt32LE(compressed.length, 18)
  localHeader.writeUInt32LE(uncompressed.length, 22)
  localHeader.writeUInt16LE(filename.length, 26)
  localHeader.writeUInt16LE(0, 28)

  const centralDirectory = Buffer.alloc(46)
  centralDirectory.writeUInt32LE(0x02014b50, 0)
  centralDirectory.writeUInt16LE(20, 4)
  centralDirectory.writeUInt16LE(20, 6)
  centralDirectory.writeUInt16LE(0, 8)
  centralDirectory.writeUInt16LE(8, 10)
  centralDirectory.writeUInt32LE(checksum, 16)
  centralDirectory.writeUInt32LE(compressed.length, 20)
  centralDirectory.writeUInt32LE(uncompressed.length, 24)
  centralDirectory.writeUInt16LE(filename.length, 28)
  centralDirectory.writeUInt16LE(0, 30)
  centralDirectory.writeUInt16LE(0, 32)
  centralDirectory.writeUInt16LE(0, 34)
  centralDirectory.writeUInt16LE(0, 36)
  centralDirectory.writeUInt32LE(0, 38)
  centralDirectory.writeUInt32LE(0, 42)

  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0)
  endOfCentralDirectory.writeUInt16LE(0, 4)
  endOfCentralDirectory.writeUInt16LE(0, 6)
  endOfCentralDirectory.writeUInt16LE(1, 8)
  endOfCentralDirectory.writeUInt16LE(1, 10)
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length + filename.length, 12)
  endOfCentralDirectory.writeUInt32LE(localHeader.length + filename.length + compressed.length, 16)
  endOfCentralDirectory.writeUInt16LE(0, 20)

  return Buffer.concat([
    localHeader,
    filename,
    compressed,
    centralDirectory,
    filename,
    endOfCentralDirectory,
  ])
}

const escapePdfString = (value) => value
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')

const buildPdfFixture = (text) => {
  const lines = String(text)
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trimEnd())

  const body = [
    'BT',
    '/F1 12 Tf',
    '1 0 0 1 36 750 Tm',
    ...lines.map((line, index) => `${index === 0 ? '' : '0 -14 Td ' }(${escapePdfString(line)}) Tj`),
    'ET',
  ].join('\n')

  const compressed = zlib.deflateSync(Buffer.from(body, 'latin1'))

  return Buffer.concat([
    Buffer.from('%PDF-1.5\n1 0 obj\n', 'latin1'),
    Buffer.from(`<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'),
    compressed,
    Buffer.from('\nendstream\nendobj\ntrailer <<>>\n%%EOF', 'latin1'),
  ])
}

test('verified official homepage and careers fixtures expose the current attachment-backed jobs surface', () => {
  assert.equal(pageIndicatesOfficialHomepage(homepageHtml), true)
  assert.equal(pageIndicatesOfficialCareersSurface(careersHtml), true)

  const extracted = extractAttachmentRows(careersHtml)

  assert.equal(extracted.southIndiaUrl, SOUTH_INDIA_PORTAL_URL)
  assert.equal(extracted.entries.length, 24)
  assert.deepEqual(extracted.entries[0], {
    label: 'AHMEDABAD',
    attachmentUrl: 'https://www.muthootfinance.com/sites/default/files/2020-12/Ahmedabad_1.pdf',
  })
  assert.deepEqual(extracted.entries.at(-1), {
    label: 'RAIPUR',
    attachmentUrl: 'https://www.muthootfinance.com/sites/default/files/2024-11/JD%20Regional%20Trainer_012.docx',
  })
})

test('DOCX helpers recover and parse the verified regional trainer document', () => {
  const buffer = buildDocxFixture(trainerDocumentXml)
  const xml = extractDocxMainDocumentXml(buffer)
  const trainerProfile = parseRegionalTrainerDocumentXml(xml)

  assert.equal(xml, trainerDocumentXml)
  assert.equal(trainerProfile.title, 'Human Resource Trainer (Regional Trainer)')
  assert.match(trainerProfile.jobDescription, /digital and in person platforms/i)
  assert.match(trainerProfile.jobDescription, /3-5 years of experience/i)
  assert.deepEqual(trainerProfile.locations, [
    'Amritsar',
    'Chandigarh',
    'Varanasi',
    'Guwahati',
    'Siliguri',
    'Pune',
    'Surat',
    'Jodhpur',
    'Bhopal',
    'Raipur',
    'Karnal',
    'Nagpur',
    'Navi Mumbai',
  ])
})

test('PDF helpers inflate the verified Ahmedabad attachment and parse grouped role listings', () => {
  const buffer = buildPdfFixture(ahmedabadPdfText)
  const extractedText = extractPdfTextFromBuffer(buffer)
  const jobs = parseAhmedabadRegionalPdfText(extractedText, {
    attachmentUrl: 'https://www.muthootfinance.com/sites/default/files/2020-12/Ahmedabad_1.pdf',
  })

  assert.match(extractedText, /Relationship Executives/i)
  assert.match(extractedText, /Customer Care Executives/i)
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => ({ title: job.title, location: job.location, applyUrl: job.applyUrl })),
    [
      {
        title: 'Branch Head / Branch Manager / Assistant Branch Manager',
        location: 'Ahmedabad Region, Gujarat, India',
        applyUrl: 'mailto:hramd@muthootgroup.com',
      },
      {
        title: 'Relationship Executives',
        location: 'Ahmedabad Region, Gujarat, India',
        applyUrl: 'mailto:hramd@muthootgroup.com',
      },
      {
        title: 'Customer Care Executives',
        location: 'Ahmedabad Region, Gujarat, India',
        applyUrl: 'mailto:hramd@muthootgroup.com',
      },
    ],
  )
})

test('run normalizes the verified Muthoot Finance careers page into current public jobs', async () => {
  const requestedTextUrls = []
  const requestedBinaryUrls = []
  const scraper = createMuthootFinanceScraper({
    now: () => '2026-07-11T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchBinary: async (url) => {
      requestedBinaryUrls.push(url)
      if (/\.docx$/i.test(url)) return buildDocxFixture(trainerDocumentXml)
      if (/\.pdf$/i.test(url)) return buildPdfFixture(ahmedabadPdfText)
      throw new Error(`Unexpected binary URL: ${url}`)
    },
    probeSouthIndiaPortal: async () => false,
  })

  assert.deepEqual(requestedTextUrls, [HOMEPAGE_URL, CAREERS_URL])
  assert.equal(requestedBinaryUrls.length, 2)
  assert.ok(requestedBinaryUrls.some((url) => /\.docx$/i.test(url)))
  assert.ok(requestedBinaryUrls.some((url) => /\.pdf$/i.test(url)))
  assert.equal(jobs.length, 26)
  assert.ok(jobs.every((job) => job.company === 'Muthoot Finance'))
  assert.ok(jobs.every((job) => job.source === 'muthootfinance'))
  assert.ok(jobs.every((job) => job.scrapedAt === '2026-07-11T00:00:00.000Z'))
  assert.ok(
    jobs.some((job) =>
      job.title === 'Human Resource Trainer (Regional Trainer)'
      && job.location === 'Bhopal, India'
      && job.sourceUrl.endsWith('JD%20Regional%20Trainer_003.docx'),
    ),
  )
  assert.ok(
    jobs.some((job) =>
      job.title === 'Regional Marketing Manager / BTL Manager'
      && job.location === 'Delhi East, India'
      && job.applyUrl === 'mailto:hrdelhi4@muthootgroup.com',
    ),
  )
  assert.ok(
    jobs.some((job) =>
      job.title === 'Relationship Executives'
      && job.location === 'Ahmedabad Region, Gujarat, India'
      && job.applyUrl === 'mailto:hramd@muthootgroup.com',
    ),
  )
})

test('South India portal rows from the public JSON endpoint map into jobs without invented details', () => {
  const jobs = extractSouthIndiaPortalJobs(southIndiaPortalRows, {
    scrapedAt: '2026-07-19T00:00:00.000Z',
  })

  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      jobId: job.jobId,
      location: job.location,
      city: job.city,
      postingDate: job.postingDate,
      closingDate: job.closingDate,
      experienceRequired: job.experienceRequired,
      vacancies: job.vacancies,
    })),
    [
      {
        title: 'Customer Care Executive',
        jobId: 'muthootfinance-south-17186',
        location: 'Ludhiana, Punjab, India',
        city: 'Ludhiana',
        postingDate: '2026-07-17',
        closingDate: '2026-09-23',
        experienceRequired: '0-2 years',
        vacancies: 5,
      },
      {
        title: 'Business Development Manager For Mstl - Thrichi',
        jobId: 'muthootfinance-south-17172',
        location: 'Thichi, Tamil Nadu, India',
        city: 'Thichi',
        postingDate: '2026-07-09',
        closingDate: '2026-10-09',
        experienceRequired: '1-3 years',
        vacancies: 1,
      },
    ],
  )

  assert.ok(jobs.every((job) => job.applyUrl === SOUTH_INDIA_PORTAL_URL))
  assert.ok(jobs.every((job) => job.sourceUrl === SOUTH_INDIA_JOB_POSTS_URL))
  assert.deepEqual(SOUTH_INDIA_COMPANY_IDS, [1, 20])
})

test('run includes public South India portal jobs when that portal is reachable', async () => {
  const scraper = createMuthootFinanceScraper({
    now: () => '2026-07-19T00:00:00.000Z',
  })
  const requestedSouthIndiaDates = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchBinary: async (url) => {
      if (/\.docx$/i.test(url)) return buildDocxFixture(trainerDocumentXml)
      if (/\.pdf$/i.test(url)) return buildPdfFixture(ahmedabadPdfText)
      throw new Error(`Unexpected binary URL: ${url}`)
    },
    probeSouthIndiaPortal: async () => true,
    fetchSouthIndiaJobPosts: async ({ date }) => {
      requestedSouthIndiaDates.push(date)
      return southIndiaPortalRows
    },
  })

  assert.deepEqual(requestedSouthIndiaDates, ['07/19/2026'])
  assert.equal(jobs.length, 28)
  assert.ok(
    jobs.some((job) =>
      job.jobId === 'muthootfinance-south-17186'
      && job.title === 'Customer Care Executive'
      && job.location === 'Ludhiana, Punjab, India',
    ),
  )
})
