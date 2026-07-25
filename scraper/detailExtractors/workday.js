import { collectListItems, collectSkills, firstMatch, joinItems } from './shared.js'

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const WORKDAY_JSON_LD_STOP_LABELS = [
  'Basic Qualifications',
  'Minimum Qualifications',
  'Required Qualifications',
  'Preferred Qualifications',
  'Desired Qualifications',
  'Qualifications',
  'Inside this Business Group',
  'Business group',
  'Posting Statement',
  'Primary Location',
  'Work Model for this Role',
]

const parseWorkdayJsonLd = (html = '') => {
  const scripts = [...String(html).matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )]

  for (const [, payload] of scripts) {
    try {
      const data = JSON.parse(payload)
      const records = Array.isArray(data) ? data : [data]
      const jobPosting = records.find((record) => {
        const type = Array.isArray(record?.['@type']) ? record['@type'] : [record?.['@type']]
        return type.filter(Boolean).some((value) => /jobposting/i.test(String(value)))
      })

      if (jobPosting) {
        return jobPosting
      }
    } catch {
      continue
    }
  }

  return null
}

const extractLabeledSection = (text, labels, stopLabels = []) => {
  const source = String(text || '').trim()
  if (!source) return null

  for (const label of labels) {
    const pattern = new RegExp(`${escapeRegex(label)}\\s*:`, 'i')
    const match = pattern.exec(source)
    if (!match) continue

    const start = match.index + match[0].length
    const tail = source.slice(start).trim()
    if (!tail) return null

    let end = tail.length
    for (const stopLabel of stopLabels) {
      if (String(stopLabel).toLowerCase() === String(label).toLowerCase()) continue
      const stopPattern = new RegExp(`\\b${escapeRegex(stopLabel)}\\s*:`, 'i')
      const stopMatch = stopPattern.exec(tail)
      if (stopMatch && stopMatch.index < end) {
        end = stopMatch.index
      }
    }

    const section = tail.slice(0, end).trim()
    if (section) return section
  }

  return null
}

const extractExperience = (...values) => {
  for (const value of values.filter(Boolean)) {
    const match = String(value).match(/[^.;\n]*\byears?\b[^.;\n]*/i)
    if (match?.[0]) return match[0].trim()
  }
  return null
}

export const extractWorkdayJobDetail = (html = '') => {
  const jsonLd = parseWorkdayJsonLd(html)
  const jsonLdDescription = String(jsonLd?.description || '').trim()

  const description = firstMatch(html, [
    /data-automation-id="jobPostingDescription"[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,
    /data-automation-id="jobPostingDescription"[\s\S]*?>([\s\S]*?)<\/section>/i,
  ]) || extractLabeledSection(
    jsonLdDescription,
    ['Job Description'],
    WORKDAY_JSON_LD_STOP_LABELS,
  ) || jsonLdDescription || null

  const minimumItems = collectListItems(html, [
    /Basic Qualifications[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
    /Minimum Qualifications[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
  ])

  const preferredItems = collectListItems(html, [
    /Preferred Qualifications[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
    /Desired Qualifications[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
  ])

  const department = firstMatch(html, [
    /<dt[^>]*>\s*Department\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i,
    /<dt[^>]*>\s*Job Family\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i,
  ])

  const requisitionId = firstMatch(html, [
    /<dt[^>]*>\s*Job Requisition ID\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i,
    /<dt[^>]*>\s*Requisition ID\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i,
  ]) || jsonLd?.identifier?.value || null

  const minimumQualification = joinItems(minimumItems) || extractLabeledSection(
    jsonLdDescription,
    ['Basic Qualifications', 'Minimum Qualifications', 'Required Qualifications', 'Qualifications'],
    [
      'Preferred Qualifications',
      'Desired Qualifications',
      'Inside this Business Group',
      'Business group',
      'Posting Statement',
      'Primary Location',
      'Work Model for this Role',
    ],
  )

  const preferredQualification = joinItems(preferredItems) || extractLabeledSection(
    jsonLdDescription,
    ['Preferred Qualifications', 'Desired Qualifications'],
    [
      'Inside this Business Group',
      'Business group',
      'Posting Statement',
      'Primary Location',
      'Work Model for this Role',
    ],
  )

  return {
    jobDescription: description,
    minimumQualification,
    preferredQualification,
    requiredSkills: collectSkills(
      [...minimumItems, ...preferredItems].filter((item) => !/\byears?\b/i.test(item)),
    ),
    experienceRequired:
      [...minimumItems, ...preferredItems].find((item) => /\byears?\b/i.test(item))
      || extractExperience(minimumQualification, preferredQualification, jsonLdDescription),
    department,
    requisitionId,
  }
}
