import { collectListItems, collectSkills, firstMatch, joinItems } from './shared.js'

export const extractGoogleJobDetail = (html = '') => {
  const description = firstMatch(html, [
    /Responsibilities[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,
    /About the job[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,
  ])
  const minimumItems = collectListItems(html, [/Minimum qualifications[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i])
  const preferredItems = collectListItems(html, [/Preferred qualifications[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i])

  return {
    jobDescription: description,
    minimumQualification: joinItems(minimumItems),
    preferredQualification: joinItems(preferredItems),
    requiredSkills: collectSkills([...minimumItems, ...preferredItems]),
    experienceRequired: [...minimumItems, ...preferredItems].find((item) => /\byears?\b/i.test(item)) || null,
    department: null,
  }
}

export const extractRubrikJobDetail = (html = '') => {
  const description = firstMatch(html, [
    /What you'll do[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
    /About the role[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i,
  ])
  const minimumItems = collectListItems(html, [
    /Requirements[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
    /Qualifications[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
  ])

  return {
    jobDescription: description || joinItems(minimumItems),
    minimumQualification: joinItems(minimumItems),
    preferredQualification: null,
    requiredSkills: collectSkills(minimumItems),
    experienceRequired: minimumItems.find((item) => /\byears?\b/i.test(item)) || null,
    department: null,
  }
}
