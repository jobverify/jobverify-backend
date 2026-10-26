import { createHash } from 'node:crypto';
import { outreachError } from './outreachUsage.js';

const text = (value, length = 3000) => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, length) : '';
const DISCOVERY_POLICY = 'referrals-v2';
export function discoveryProvider() {
  const provider = String(process.env.OUTREACH_DISCOVERY_PROVIDER || 'actions').trim().toLowerCase();
  if (!['actions', 'tavily'].includes(provider)) throw outreachError('Referral search provider configuration is invalid.', 503);
  return provider;
}
const blockedDomains = ['lever.co', 'greenhouse.io', 'workday.com', 'myworkdayjobs.com', 'smartrecruiters.com', 'icims.com', 'taleo.net', 'successfactors.com', 'successfactors.eu', 'oraclecloud.com', 'bamboohr.com', 'recruitee.com', 'ashbyhq.com', 'breezy.hr', 'applytojob.com', 'keka.com', 'darwinbox.com', 'zohorecruit.com', 'linkedin.com', 'indeed.com', 'naukri.com', 'wellfound.com', 'foundit.in', 'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me'];
export const safePublicUrl = value => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(url.hostname) || /^\[/.test(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
};
export function employerDomain(job) {
  for (const candidate of [job.companyDomain, job.companyCareerPage]) {
    if (!candidate || typeof candidate !== 'string') continue;
    try {
      const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
      let host = url.hostname.toLowerCase().replace(/^(www|careers?|jobs)\./, '');
      if (!safePublicUrl(url.href) || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || blockedDomains.some(domain => host === domain || host.endsWith(`.${domain}`))) continue;
      return host;
    } catch { /* An absent employer domain leaves email discovery unavailable. */ }
  }
  return '';
}
export function buildJobContext(job, { provider = discoveryProvider() } = {}) {
  const context = { title: text(job.title, 1000), company: text(job.company, 500), companyDomain: employerDomain(job), department: text(job.department, 500), location: text(job.location, 2000), description: text(job.sourceDescription || job.description, 24000), jobUrl: safePublicUrl(job.applyUrl) || safePublicUrl(job.sourceUrl) || '' };
  return { ...context, contextHash: createHash('sha256').update(JSON.stringify({ policy: provider === 'actions' ? 'referrals-v3-public-email' : DISCOVERY_POLICY, provider, ...context })).digest('hex') };
}
export const jobSnapshot = context => Object.fromEntries(['title', 'company', 'companyDomain', 'location', 'jobUrl'].map(key => [key, context[key]]));

const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeEmployer = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim().replace(/[.,;:!?]+$/, '');
const employmentRole = /\b(engineer|developer|designer|analyst|scientist|manager|director|head|lead|vp|vice president|cto|chief technology|recruiter|recruiting|recruitment|talent acquisition)\b/i;
const referralOffer = /(?:^|[.!?:]\s+)(?:(?:I|we)\s+can|I(?:'m|\s+am)\s+happy\s+to|we\s+are\s+happy\s+to|happy\s+to)\s+refer\b|(?:^|[.!?:]\s+)(?:dm|message|contact)\s+me\s+for\s+(?:(?:an?|employee|internal)\s+)?referrals?\b/i;

function hasReferralOffer(source, company) {
  const offer = referralOffer.exec(source);
  if (!offer) return false;
  const employer = /\bat\s+(.+)/i.exec(source.slice(offer.index + offer[0].length));
  if (!employer) return true;
  const expected = normalizeEmployer(company);
  const actual = normalizeEmployer(employer[1]);
  return actual === expected || new RegExp(`^${escapePattern(expected)}[.!?](?:\\s|$)`, 'u').test(actual);
}

/** Compare complete employer fields. Names, mentions and legal-name suffixes are not aliases. */
function employerEvidence(name, roleTitle, evidence, company) {
  const expected = normalizeEmployer(company);
  if (!expected) return { employed: false, hiring: false };
  const exact = value => normalizeEmployer(value) === expected;
  const sentenceStart = value => {
    const normalized = normalizeEmployer(value);
    return normalized === expected || new RegExp(`^${escapePattern(expected)}[.!?](?:\\s|$)`, 'u').test(normalized);
  };
  const fields = roleTitle.split(/\s+[-\u2013\u2014|\u00b7]\s+/).map(value => value.trim()).filter(Boolean);
  const explicit = fields[0]?.match(/\b(?:at|with|for)\s+(.+)$/i);
  // A primary title naming another employer takes precedence over incidental mentions in snippets.
  let employed;
  if (explicit) employed = exact(explicit[1]);
  else if (fields.length > 1 && employmentRole.test(fields[0])) employed = exact(fields[1]);
  else if (fields.length > 1 && employmentRole.test(fields[1])) employed = exact(fields[0]);
  else {
    const sentence = new RegExp(`(?:^|[.!?]\\s+)${escapePattern(name)}\\s+(?:is|works|serves|leads|heads)\\b[^.!?]{0,140}?\\b(?:at|with|for)\\s+(.+)`, 'i').exec(evidence);
    employed = Boolean(sentence && sentenceStart(sentence[1]));
  }
  const position = (employmentRole.test(fields[0] || '') ? fields[0] : fields[1] || fields[0] || '').split(/\b(?:at|with|for)\b/i)[0];
  if (/\b(?:former|previously)\b|\bex[-\s]/i.test(position)) return { employed: false, hiring: false };
  const hiring = [roleTitle, evidence].some(source => {
    const before = /\b(?:my team|our team|we|I)(?:\s+(?:are|am))?\s+at\s+(.{1,140}?)\s+(?:(?:is|are|am)\s+)?(?:hiring|looking for|recruiting)\b/i.exec(source);
    if (before && exact(before[1])) return true;
    const after = /\b(?:my team|our team|we|I)\b[^.!?]{0,100}?\b(?:hiring|looking for|recruiting)\b[^.!?]{0,160}?\bat\s+(.+)/i.exec(source);
    return Boolean(after && sentenceStart(after[1]));
  });
  return { employed, hiring };
}

/** Conservative extraction from provider source titles, never from generated answers or URL slugs. */
export function groundedContacts(results, context, { limit = 3 } = {}) {
  const roleWords = `${context.title} ${context.department}`.toLowerCase().match(/[a-z]{4,}/g)?.filter(word => !['senior', 'junior', 'associate', 'intern', 'india', 'remote'].includes(word)) || [];
  const contacts = [];
  for (const result of results || []) {
    const sourceUrl = safePublicUrl(result.url);
    const title = text(result.title, 1000);
    const evidence = text(result.content, 3000);
    if (!sourceUrl || !title || !evidence) continue;
    const combined = `${title} ${evidence}`;
    const prefix = title.split(/\s+on LinkedIn\s*:|\s+[-–—|·]\s+/i)[0].trim();
    const words = prefix.split(/\s+/);
    if (words.length < 2 || words.length > 5 || !/^[\p{L}][\p{L}.'’ -]+$/u.test(prefix) || /\b(jobs?|hiring|careers?|engineer|manager|recruiter|team|corp|limited|private|apply|linkedin)\b/i.test(prefix)) continue;
    // Individual LinkedIn profiles/posts or named biographies on the trusted employer domain.
    const url = new URL(sourceUrl);
    const linkedin = /(^|\.)linkedin\.com$/.test(url.hostname);
    if (linkedin ? !/^\/(in|posts)\//.test(url.pathname) : !(context.companyDomain && (url.hostname === context.companyDomain || url.hostname.endsWith(`.${context.companyDomain}`)))) continue;
    const roleMatch = roleWords.some(word => combined.toLowerCase().includes(word));
    const role = title.slice(prefix.length).replace(/^\s*(?:[-\u2013\u2014|\u00b7]|on LinkedIn\s*:)\s*/i, '').replace(/\s*[|\u00b7]\s*LinkedIn.*$/i, '').slice(0, 500);
    const relation = employerEvidence(prefix, role, evidence, context.company);
    const namedPost = linkedin && /^\/posts\//.test(url.pathname) && /\bon LinkedIn\s*:/i.test(title);
    const authoredPost = namedPost && relation.hiring && roleMatch;
    const referralPost = namedPost && relation.employed && roleMatch && hasReferralOffer(`${role}. ${evidence}`, context.company);
    if (!authoredPost && !relation.employed) continue;
    const recruiter = /\b(recruiter|recruiting|recruitment|talent acquisition)\b/i.test(combined);
    if (!authoredPost && !roleMatch && !recruiter) continue;
    contacts.push({ name: prefix, title: referralPost ? 'Referral-post author' : authoredPost ? 'Hiring-post author' : role, linkedinUrl: linkedin ? sourceUrl : '', sourceUrl, evidence, kind: referralPost ? 'referral_post_author' : authoredPost ? 'hiring_post_author' : 'likely_contact', email: '', emailStatus: 'unavailable', emailConfirmed: false, rank: referralPost ? 0 : authoredPost ? 1 : recruiter ? 3 : 2 });
  }
  const seen = new Set();
  return contacts.sort((a, b) => a.rank - b.rank).filter(contact => {
    const key = contact.name.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, Math.max(0, Math.min(12, Number.isInteger(limit) ? limit : 3))).map(({ rank: _rank, ...contact }) => contact);
}

export async function searchTavily(context, { apiKey = process.env.TAVILY_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw outreachError('Referral search is not configured yet.', 503);
  let response;
  try {
    response = await fetchImpl('https://api.tavily.com/search', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `"${context.company}" "${context.title}" ${context.department} ${context.location} employee referral team hiring recruiter LinkedIn`, topic: 'general', search_depth: 'basic', max_results: 12, include_answer: false, include_raw_content: false, auto_parameters: false }), signal: AbortSignal.timeout(25000) });
  } catch { throw outreachError('Referral search could not be reached. Please retry.', 502); }
  if (!response.ok) throw outreachError(response.status === 429 || response.status === 432 || response.status === 433 ? 'The shared search allowance is unavailable. Please try next month.' : 'Referral search is temporarily unavailable.', response.status === 429 ? 429 : 502);
  const payload = await response.json();
  if (!Array.isArray(payload.results)) throw outreachError('Search returned an invalid response.', 502);
  return payload.results;
}
export function hunterEmail(data, domain) {
  const empty = { email: '', emailStatus: 'unavailable' };
  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.split('@')[1] !== domain || data?.verification?.status === 'invalid') return empty;
  const verified = data?.verification?.status === 'valid' && data?.accept_all !== true;
  const publicSource = data?.sources?.some(source => safePublicUrl(source.uri || source.url));
  return { email, emailStatus: verified ? 'verified' : publicSource ? 'public' : 'unverified' };
}
export async function findHunterEmail(contact, domain, { apiKey = process.env.HUNTER_API_KEY, fetchImpl = fetch, remainingMs = 15000 } = {}) {
  if (!apiKey || !domain) return { email: '', emailStatus: 'unavailable' };
  const url = new URL('https://api.hunter.io/v2/email-finder');
  url.search = new URLSearchParams({ domain, full_name: contact.name, api_key: apiKey }).toString();
  let response;
  try { response = await fetchImpl(url, { signal: AbortSignal.timeout(Math.max(1, Math.min(15000, remainingMs))) }); }
  catch { throw outreachError('Email discovery is temporarily unavailable.', 502); }
  if (!response.ok) throw outreachError('Email discovery is temporarily unavailable or its allowance is exhausted.', 502);
  const payload = await response.json();
  return hunterEmail(payload.data, domain);
}
