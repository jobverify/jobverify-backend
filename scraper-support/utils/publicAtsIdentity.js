export const identifyPublicAtsBoard = value => {
  let url
  try { url = new URL(value) } catch { return null }
  if (!['http:', 'https:'].includes(url.protocol)) return null
  const parts = url.pathname.split('/').filter(Boolean)
  let atsPlatform, boardToken
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io', 'boards.eu.greenhouse.io', 'job-boards.eu.greenhouse.io', 'boards-api.greenhouse.io', 'api.greenhouse.io'].includes(url.hostname)) {
    atsPlatform = 'greenhouse'
    boardToken = ['boards-api.greenhouse.io', 'api.greenhouse.io'].includes(url.hostname)
      ? parts[0] === 'v1' && parts[1] === 'boards' ? parts[2] : null
      : parts[0] === 'embed' ? url.searchParams.get('for') : parts[0]
  } else if (url.hostname === 'jobs.ashbyhq.com' || url.hostname === 'api.ashbyhq.com') {
    atsPlatform = 'ashby'
    boardToken = url.hostname === 'jobs.ashbyhq.com' ? parts[0]
      : parts[0] === 'posting-api' && parts[1] === 'job-board' ? parts[2] : null
  } else if (url.hostname === 'jobs.lever.co' || url.hostname === 'api.lever.co') {
    atsPlatform = 'lever'
    boardToken = url.hostname === 'jobs.lever.co' ? parts[0]
      : parts[0] === 'v0' && parts[1] === 'postings' ? parts[2] : null
  }
  if (!boardToken || !/^[a-z\d][a-z\d._-]{0,100}$/i.test(boardToken)) return null
  return { atsPlatform, boardToken }
}

export const hasMatchingPublicAtsBinding = provider => provider.bindingEvidence?.verified === true
  && (provider.bindingEvidence.matchedLinks || []).some(link => {
    const board = identifyPublicAtsBoard(link)
    return board?.atsPlatform === provider.atsPlatform && board.boardToken === provider.boardToken
  })
