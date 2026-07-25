const brand = {
  name: 'KodNest',
  title: 'KodNest - Placement-ready engineering training',
  description:
    'KodNest helps freshers become placement-ready with hands-on Java, Python, Data Science & GenAI tracks, real projects, and outcome-driven coaching.',
}

const redirects = [
  { from: '/testimonials', to: '/companies', action: '301', note: 'P0: success stories live in companies dir' },
  { from: '/devops', action: '410', note: 'P0: DevOps program retired' },
  { from: '/careers', action: '410', note: 'P0: no careers page yet' },
  { from: '/privacy-policy', to: '/legal/privacy', action: '301', note: 'P0: legal page live' },
]

const routes = [
  { path: '/' },
  { path: '/about' },
  { path: '/companies' },
  { path: '/blog' },
  { path: '/programs' },
]
