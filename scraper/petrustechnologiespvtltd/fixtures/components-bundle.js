(function () {
  const PAGE_CONFIG = {
    home: { crumbs: [], navPage: null },
    resource: { crumbs: [{ label: 'Resource', page: 'resource' }], navPage: 'resource' },
    'about-us': { crumbs: [{ label: 'About Us', page: null }], navPage: null },
    'contact-us': { crumbs: [{ label: 'Contact Us', page: null }], navPage: null },
  };

  const PAGE_FILES = {
    home: 'components/home.html',
    resource: 'components/resource.html',
    'about-us': 'components/about-us.html',
    'contact-us': 'components/contact-us.html',
  };

  window.__PETRUS_PAGE_CONFIG__ = PAGE_CONFIG;
  window.__PETRUS_PAGE_FILES__ = PAGE_FILES;
})();
