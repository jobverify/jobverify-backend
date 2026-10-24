const normalize = value => String(value || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function currentMessageText(value) {
  return String(value || '').slice(0, 100000).split(/\n\s*(?:On .{0,200}wrote:|-----Original Message-----|From:)/i)[0]
    .split('\n').filter(line => !/^\s*>/.test(line)).join('\n');
}

export function isAcknowledgement(message) {
  const text = `${message.subject || ''}\n${currentMessageText(message.text)}`.toLowerCase();
  if (/\b(?:not submitted|not received|unsuccessful|incomplete|unfortunately|rejected|not be moving forward|delivery fail|undeliverable)\b/.test(text)
    || /\b(?:complete|finish|continue) (?:your |the )?application\b/.test(text)
    || /\b(?:error|failed|unable)\b.{0,80}\b(?:submit|application)\b/.test(text)) return false;
  return /\b(?:thank(?:s| you) for (?:applying|your application)|(?:we (?:have |have now )?received|we['’]ve received) your (?:application|resume)|your application (?:has been |was )?(?:received|submitted)|application (?:successfully )?(?:submitted|received))\b/.test(text);
}

export function jobLinkIdentity(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return '';
    // Only the actual destination identifies a posting; never follow redirect parameters.
    const path = url.pathname.replace(/\/(?:apply)?\/?$/, '').replace(/\/$/, '');
    if (!path || path === '/') return '';
    const pathIdentifiesJob = (['jobs.lever.co', 'jobs.eu.lever.co'].includes(url.hostname) && /\/[a-f\d-]{36}$/i.test(path))
      || (['boards.greenhouse.io', 'job-boards.greenhouse.io', 'job-boards.eu.greenhouse.io'].includes(url.hostname) && /\/jobs\/\d+$/.test(path));
    if (pathIdentifiesJob) url.search = '';
    else for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return `${url.hostname.toLowerCase()}${path}${url.search}`;
  } catch { return ''; }
}

export function matchAcknowledgement(message, applications) {
  if (!isAcknowledgement(message)) return { acknowledgement: false, applicationId: null, candidates: [] };
  const links = new Set((message.links || []).map(jobLinkIdentity).filter(Boolean));
  const exact = applications.filter(item => links.has(jobLinkIdentity(item.jobSnapshot?.applicationUrl)));
  if (exact.length === 1) return { acknowledgement: true, applicationId: String(exact[0]._id), candidates: [String(exact[0]._id)], reason: 'job_link' };
  const text = ` ${normalize(`${message.subject || ''} ${currentMessageText(message.text)}`)} `;
  const contains = value => { const part = normalize(value); return part.length >= 3 && text.includes(` ${part} `); };
  const company = applications.filter(item => contains(item.jobSnapshot?.company));
  const specific = company.filter(item => contains(item.jobSnapshot?.title));
  if (specific.length === 1 && exact.length === 0) return { acknowledgement: true, applicationId: String(specific[0]._id), candidates: [String(specific[0]._id)], reason: 'company_and_role' };
  return { acknowledgement: true, applicationId: null, candidates: (specific.length ? specific : company).slice(0, 20).map(item => String(item._id)), reason: 'needs_review' };
}
