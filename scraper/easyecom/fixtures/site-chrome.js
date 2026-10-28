/* ============================================================
   EasyEcom — canonical site chrome injector (Direction A)
   Single source of truth for nav + footer across the site.
   Usage on a page:
     <script src="{root}assets/site-chrome.js" defer></script>
   Optional explicit mounts: <div id="ee-nav"></div> / <div id="ee-foot"></div>
   (if absent, nav is prepended to <body>, footer appended).
   Requires the page :root warm tokens + assets/site-chrome.css
   (this script injects the css/fonts links if missing).
   Paths are computed from the page depth, so it works in any folder.
   ============================================================ */
(function () {
  // ---- root prefix from path depth (served from site root) ----
  var segs = location.pathname.split('/').filter(Boolean);
  // last segment is the file; each preceding folder = one ../
  var depth = Math.max(0, segs.length - 1);
  var R = '/';
  var file = (segs[segs.length - 1] || 'index.html').toLowerCase();
  // Dark-hero detection: explicit <body|html data-ee-nav="dark|light"> wins;
  // otherwise auto-detect by sampling the background behind the nav strip.
  // Dark-hero pages opt in explicitly via <body data-ee-nav="dark"> (or <html>).
  // Deterministic on purpose: dark heroes are painted with gradients/pseudo-elements
  // that computed-style probing can't reliably read, so we don't auto-guess.
  var DARK = ((document.body && document.body.getAttribute('data-ee-nav')) ||
              document.documentElement.getAttribute('data-ee-nav')) === 'dark';

  // ---- ensure stylesheet + fonts present ----
  function ensureCss(href) {
    var abs = R + href;
    var have = [].some.call(document.styleSheets, function () { return false; });
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') && links[i].getAttribute('href').indexOf(href) !== -1) return;
    }
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = abs;
    document.head.appendChild(l);
  }
  /* css/fonts links are provided by the page (Next integration) */

  // ---- link map (real destinations) ----
  var U = {
    home: '/',
    oms: '/order-management-system',
    wms: '/warehouse-management-system',
    reco: '/payment-reconciliation',
    vms: '/video-management-system',
    integrations: '/integrations',
    help: 'https://support.easyecom.io/portal/en/home',
    docs: 'https://support.easyecom.io/portal/en/kb/campaigngroup1450092794169/how-to',
    api: 'https://support.easyecom.io/portal/en/kb/campaigngroup1450092794169/easyecom-apis',
    brands: '/solutions/brands',
    tpl: '/solutions/3pl',
    b2b: '/solutions/3pl/b2b-fulfillment',
    apparel: '/solutions/by-industry/apparel-footwear',
    beauty: '/solutions/by-industry/beauty-wellness',
    electronics: '/solutions/by-industry/electronics',
    jewelry: '/solutions/by-industry/jewelry-accessories',
    food: '/solutions/by-industry/food-beverages-fmcg',
    d2c: '/solutions/brands/d2c',
    omni: '/solutions/brands/omnichannel',
    retail: '/solutions/brands/retail-wholesale',
    ecom3pl: '/solutions/3pl/ecommerce-fulfillment',
    fba: '/solutions/3pl/fba-prep',
    quick: '/solutions/3pl/quick-commerce',
    pricing: '/pricing',
    whatsnew: '/whats-new',
    blog: '/resources/blog',
    report: '#',
    customers: '/customers',
    compare: '#',
    certificates: '/trust',
    enterprise: '/enterprise',
    pricingEnterprise: '/pricing/enterprise',
    pricingImplementation: '/pricing/implementation',
    pricingRoi: '/pricing/roi-calculator',
    ucSpreadsheets: '/solutions/use-case/move-off-spreadsheets',
    ucOmni: '/solutions/use-case/sell-omnichannel',
    ucRoute: '/solutions/use-case/route-multi-warehouse',
    ucDisputes: '/solutions/use-case/win-marketplace-disputes',
    growth: '/growth',
    partner: '/company/partners',
    about: '/about',
    contact: '/contact-us',
    careers: '/careers',
    newsroom: '/company/newsroom',
    demo: '/book-a-demo',
    login: 'https://app.easyecom.io'
  };

  // ---- icons (geometric line, single-colour per brand guide) ----
  var IC = {
    oms: '<path d="M3 7h18M3 12h18M3 17h11"/>',
    wms: '<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>',
    reco: '<path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 8a8 8 0 0 0-14-3M4 16a8 8 0 0 0 14 3"/>',
    vms: '<path d="M2 6h13v12H2z"/><path d="M15 10l7-4v12l-7-4"/>',
    brands: '<path d="M4 8h16l-1 12H5z"/><path d="M8.5 8a3.5 3.5 0 0 1 7 0"/>',
    tpl: '<path d="M2 8h11v9H2z"/><path d="M13 11h5l3 3v3h-8z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    blog: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 18h5"/>',
    cust: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6a3 3 0 0 1 0 6M15.5 16.5a5 5 0 0 1 5 3.5"/>'
  };
  function svg(p) { return '<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg></span>'; }
  function pcard(href, acc, icon, title, desc) {
    return '<a class="pcard ' + acc + '" href="' + href + '">' + svg(icon) +
      '<span class="tw"><span class="pt">' + title + '</span><span class="pd">' + desc + '</span></span></a>';
  }

  // ---- mega menus (editorial dark, grouped icon rows) ----
  var MM_CSS = '<style id="mmCss">'
    + 'nav.site-nav .mega.wide{background:#0e1f33;border:1px solid rgba(255,255,255,.07);box-shadow:0 42px 80px -28px rgba(2,8,16,.75),0 12px 28px -12px rgba(2,8,16,.5);transform:translateY(10px) scale(.985);transition:opacity .32s cubic-bezier(.2,.7,.2,1),transform .32s cubic-bezier(.2,.7,.2,1),visibility .32s}'
    + 'nav.site-nav .ni:hover .mega.wide,nav.site-nav .ni:focus-within .mega.wide{opacity:1;visibility:visible;transform:none}'
    + 'nav.site-nav .ni:has(> .mega.sol){position:static}'
    + 'nav.site-nav .menu:has(.mega.sol),nav.site-nav .ninner:has(.mega.sol){position:static;backdrop-filter:none;-webkit-backdrop-filter:none;filter:none;transform:none}'
    + 'nav.site-nav .mega.sol{left:50%;transform:translateX(-50%) translateY(10px) scale(.985)}'
    + 'nav.site-nav .ni:hover .mega.sol,nav.site-nav .ni:focus-within .mega.sol{transform:translateX(-50%)}'
    + 'nav.site-nav .mega.res{left:50%;transform:translateX(-50%) translateY(10px) scale(.985)}'
    + 'nav.site-nav .ni:hover .mega.res,nav.site-nav .ni:focus-within .mega.res{transform:translateX(-50%)}'
    + 'nav.site-nav .mega.prod{left:50%;transform:translateX(-50%) translateY(10px) scale(.985)}'
    + 'nav.site-nav .ni:hover .mega.prod,nav.site-nav .ni:focus-within .mega.prod{transform:translateX(-50%)}'
    + 'nav.site-nav .mega.price{left:50%;transform:translateX(-50%) translateY(10px) scale(.985)}'
    + 'nav.site-nav .ni:hover .mega.price,nav.site-nav .ni:focus-within .mega.price{transform:translateX(-50%)}'
    + 'nav.site-nav .mega.price{grid-template-columns:1.15fr 1.05fr .95fr;min-width:760px;padding:24px 8px 20px;gap:0}'
    + 'nav.site-nav .mega.prod{grid-template-columns:1.05fr 1.12fr .92fr;min-width:790px;padding:24px 8px 20px;gap:0}'
    + 'nav.site-nav .mega.sol{grid-template-columns:1.02fr 1.02fr .92fr .78fr;min-width:1010px;padding:24px 8px 20px;gap:0}'
    + 'nav.site-nav .mega.res{grid-template-columns:1fr 1.05fr 1fr .95fr 1.05fr;min-width:1080px;padding:24px 8px 20px;gap:0}'
    + '.mm-g{display:flex;flex-direction:column;gap:4px;padding:0 18px}'
    + '.mega .mm-g+.mm-g{border-left:1px solid rgba(255,255,255,.07)}'
    + '.mm-h{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#3fce6f;margin:0 0 12px 4px}'
    + '.mm-g.acc-blue .mm-h{color:#57a8ff}'
    + '.mm-i{display:flex;gap:12px;padding:9px 8px;border-radius:12px;text-decoration:none}'
    + '.mm-i:hover{background:rgba(255,255,255,.06)}'
    + '.mm-i.lead{background:rgba(255,255,255,.07)}'
    + '.mm-i.lead:hover{background:rgba(255,255,255,.1)}'
    + '.mm-i .mi{flex:none;width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:rgba(63,206,111,.11);color:#3fce6f;transition:filter .15s}'
    + '.mm-g.acc-blue .mm-i .mi{background:rgba(87,168,255,.11);color:#57a8ff}'
    + '.mm-i:hover .mi{filter:brightness(1.25)}'
    + '.mm-i .mi svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round}'
    + '.mm-i.slim{align-items:center;gap:10px;padding:8px;border-radius:9px}'
    + '.mm-i.slim .mi{width:22px;height:22px;background:transparent;color:rgba(63,206,111,.8)}'
    + '.mm-i.slim .mi svg{width:16px;height:16px}'
    + '.mm-i .tx{display:flex;flex-direction:column;line-height:1.3;justify-content:center}'
    // padding/margin pinned: page CSS with generic class names (whats-new has a
    // .tl timeline rule with 100px padding) must not bleed into the chrome
    + '.mm-i .tl{font-size:13.5px;font-weight:600;color:rgba(255,255,255,.92);letter-spacing:-.005em;padding:0;margin:0}'
    + '.mm-i .td{padding:0}'
    + '.mm-i.lead .tl{color:#fff}'
    + '.mm-i .td{font-size:11.5px;color:rgba(255,255,255,.62);margin-top:1px}'
    + '.mm-i .tl b{font-weight:600;color:rgba(255,255,255,.62)}'
    + '.mm-promo{display:block;margin-top:14px;padding:12px 14px;border-radius:12px;background:linear-gradient(140deg,#018477,#269B4A);text-decoration:none}'
    + '.mm-promo .pk{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;color:rgba(255,255,255,.75)}'
    + '.mm-promo .pt{display:block;font-size:13px;color:#fff;margin-top:6px;font-weight:600}'
    + '.mega .mm-h,.mega .mm-i,.mega .mm-promo{opacity:0;transform:translateY(7px);transition:opacity .34s cubic-bezier(.2,.7,.2,1),transform .34s cubic-bezier(.2,.7,.2,1),background .15s,filter .15s}'
    + '.site-nav .ni:hover .mega .mm-h,.site-nav .ni:hover .mega .mm-i,.site-nav .ni:hover .mega .mm-promo,.site-nav .ni:focus-within .mega .mm-h,.site-nav .ni:focus-within .mega .mm-i,.site-nav .ni:focus-within .mega .mm-promo{opacity:1;transform:none;transition-delay:var(--d,0s)}'
    + '@media (prefers-reduced-motion:reduce){nav.site-nav .mega{transition:opacity .2s,visibility .2s;transform:none}.mega .mm-h,.mega .mm-i,.mega .mm-promo{opacity:1;transform:none;transition:none}}'
    + '</style>';
  function mi(href, ic, label, desc, cls, d){
    var body = desc
      ? '<span class="tx"><span class="tl">' + label + '</span><span class="td">' + desc + '</span></span>'
      : '<span class="tx"><span class="tl">' + label + '</span></span>';
    return '<a class="mm-i' + (cls ? ' ' + cls : '') + '" style="--d:' + (d || 0) + 's" href="' + href + '">'
      + '<span class="mi"><svg viewBox="0 0 24 24" aria-hidden="true">' + ic + '</svg></span>' + body + '</a>';
  }
  function mh(label, d){ return '<div class="mm-h" style="--d:' + (d || 0) + 's">' + label + '</div>'; }
  var MI = {
    oms:'<path d="M3 7h18M3 12h18M3 17h11"/>',
    wms:'<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>',
    reco:'<path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 8a8 8 0 0 0-14-3M4 16a8 8 0 0 0 14 3"/>',
    vms:'<path d="M2 6h13v12H2z"/><path d="M15 10l7-4v12l-7-4"/>',
    plug:'<path d="M9 3v5M15 3v5"/><path d="M6 8h12l-1.5 5a4.5 4.5 0 0 1-9 0z"/><path d="M12 18v3"/>',
    api:'<path d="M8 8l-5 4 5 4"/><path d="M16 8l5 4-5 4"/><path d="M13.5 5l-3 14"/>',
    play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
    cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
    tag:'<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    brands:'<path d="M4 8h16l-1 12H5z"/><path d="M8.5 8a3.5 3.5 0 0 1 7 0"/>',
    tpl:'<path d="M2 8h11v9H2z"/><path d="M13 11h5l3 3v3h-8z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    d2c:'<path d="M3 9l2-5h14l2 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
    omni:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    retail:'<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/>',
    parcel:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    pallet:'<rect x="8" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    inbox:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M12 3v7"/><path d="M9 7.5l3 3 3-3"/>',
    bolt:'<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
    shirt:'<path d="M8 3l4 2 4-2 5 4-3 3v11H6V10L3 7z"/>',
    drop:'<path d="M12 3c3.2 4 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-7 6-11z"/>',
    cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    gem:'<path d="M7 3h10l4 6-9 12L2 9z"/><path d="M2 9h20"/>',
    cup:'<path d="M8 2h8"/><path d="M9 2v5l-3 4v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8l-3-4V2"/>',
    cust:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6a3 3 0 0 1 0 6M15.5 16.5a5 5 0 0 1 5 3.5"/>',
    flag:'<path d="M5 21V4"/><path d="M5 4h13l-2 4 2 4H5"/>',
    hire:'<circle cx="9" cy="8" r="4"/><path d="M3 21a6 6 0 0 1 12 0"/><path d="M18 8v6M15 11h6"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7.5l9 6 9-6"/>',
    news:'<path d="M4 5h13v12.5A1.5 1.5 0 0 1 15.5 19h-10A1.5 1.5 0 0 1 4 17.5z"/><path d="M17 8h3v9.5a1.5 1.5 0 0 1-1.5 1.5"/><path d="M7 9h7M7 12.5h7M7 16h4"/>',
    cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 12h11L21 8H7"/>',
    sheet:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M10 9v12"/>',
    chart:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="M7 15l4-4 3 3 5-6"/>',
    ent:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M10 21v-3h4v3"/>',
    book:'<path d="M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2z"/><path d="M20 17H6a2 2 0 0 0-2 2"/>',
    file:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
    cap:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    pulse:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    star:'<path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.6l6.3-.8z"/>',
    scale:'<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-2.5 5a3 3 0 0 0 6 0z"/><path d="M19 7l-2.5 5a3 3 0 0 0 6 0z"/>',
    map:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 2-2.5 3.5"/><path d="M12 17h.01"/>'
  };

  var PROD =
    '<div class="mm-g">' + mh('Core platform', .05)
    + mi(U.oms, MI.oms, 'EasyOMS', 'Every order, every channel', '', .08)
    + mi(U.wms, MI.wms, 'EasyWMS', 'Pick, pack and ship at 99.7%', '', .12)
    + mi(U.reco, MI.reco, 'EasyReco', 'Match every payout', '', .16)
    + mi(U.vms, MI.vms, 'EasyVMS', 'Video proof for disputes', '', .20)
    + '</div>'
    + '<div class="mm-g acc-blue">' + mh('Integrations &middot; 455+', .07)
    + mi('/integrations/shopify', MI.cart, 'Shopify', '', 'slim', .10)
    + mi('/integrations/amazon', MI.parcel, 'Amazon', '', 'slim', .13)
    + mi('/integrations#market', MI.bolt, 'Flipkart', '', 'slim', .16)
    + mi('/integrations#market', MI.shirt, 'Myntra', '', 'slim', .19)
    + mi('/integrations/woocommerce', MI.omni, 'WooCommerce', '', 'slim', .22)
    + mi('/integrations/sap', MI.cpu, 'SAP', '', 'slim', .25)
    + mi(U.integrations, MI.plug, 'Browse all 455+', 'Marketplaces, carriers &amp; ERPs', '', .28)
    + mi(U.api, MI.api, 'Open API &amp; developers', 'Docs &middot; API reference &middot; SDKs', '', .31)
    + '</div>'
    + '<div class="mm-g">' + mh('Featured', .09)
    + '<a class="mm-promo" style="--d:.12s" href="' + U.home + '"><span class="pk">SEE IT LIVE</span><span class="pt">The platform tour &rarr;</span></a>'
    + mi(U.pricing, MI.tag, 'Pricing', '', 'slim', .16)
    + mi(U.demo, MI.cal, 'Book a demo', '', 'slim', .19)
    + '</div>';

  var SOL =
    '<div class="mm-g">' + mh('By business type', .05)
    + mi(U.brands, MI.brands, 'For Brands', 'D2C &middot; Retail &amp; Wholesale &middot; Omnichannel', 'lead', .08)
    + mi(U.d2c, MI.d2c, 'D2C', '', 'slim', .11)
    + mi(U.omni, MI.omni, 'Omnichannel', '', 'slim', .14)
    + mi(U.retail, MI.retail, 'Retail &amp; Wholesale', '', 'slim', .17)
    + mi(U.tpl, MI.tpl, 'For 3PLs', 'Ecommerce &amp; B2B &middot; FBA Prep &middot; Q-commerce', 'lead', .20)
    + mi(U.ecom3pl, MI.parcel, 'Ecommerce Fulfillment', '', 'slim', .23)
    + mi(U.b2b, MI.pallet, 'B2B &amp; Wholesale', '', 'slim', .26)
    + mi(U.fba, MI.inbox, 'FBA Prep', '', 'slim', .29)
    + mi(U.quick, MI.bolt, 'Quick-commerce', '', 'slim', .32)
    + '</div>'
    + '<div class="mm-g">' + mh('By industry', .07)
    + mi(U.apparel, MI.shirt, 'Apparel &amp; Footwear', '', 'slim', .10)
    + mi(U.beauty, MI.drop, 'Beauty &amp; Wellness', '', 'slim', .13)
    + mi(U.electronics, MI.cpu, 'Electronics', '', 'slim', .16)
    + mi(U.jewelry, MI.gem, 'Jewelry &amp; Accessories', '', 'slim', .19)
    + mi(U.food, MI.cup, 'Food, Beverages &amp; FMCG', '', 'slim', .22)
    + '</div>'
    + '<div class="mm-g acc-blue">' + mh('By use case', .09)
    + mi('/solutions/use-case/move-off-spreadsheets', MI.sheet, 'Move off spreadsheets', '', 'slim', .12)
    + mi('/solutions/use-case/sell-omnichannel', MI.omni, 'Sell omnichannel', '', 'slim', .15)
    + mi('/solutions/use-case/route-multi-warehouse', MI.wms, 'Route multi-warehouse', '', 'slim', .18)
    + mi('/solutions/use-case/win-marketplace-disputes', MI.vms, 'Win marketplace disputes', '', 'slim', .21)
    + mi(U.reco, MI.reco, 'Auto-reconcile payouts', '', 'slim', .24)
    + '</div>'
    + '<div class="mm-g">' + mh('By size', .11)
    + mi(U.growth, MI.chart, 'Growth', '', 'slim', .14)
    + mi(U.enterprise, MI.ent, 'Enterprise', '', 'slim', .17)
    + '<a class="mm-promo" style="--d:.22s" href="' + U.customers + '"><span class="pk">1,800+ BRANDS</span><span class="pt">Customer stories &rarr;</span></a>'
    + '</div>';

  var RES =
    '<div class="mm-g acc-blue">' + mh('Help &amp; developers', .07)
    + mi(U.help, MI.help, 'Help Center', '', 'slim', .10)
    + mi(U.docs, MI.book, 'Documentation', '', 'slim', .13)
    + mi(U.api, MI.api, 'API Reference', '', 'slim', .16)
    + mi(U.newsroom, MI.oms, 'Product Updates', '', 'slim', .19)
    + '</div>'
    + '<div class="mm-g">' + mh('Customers', .09)
    + mi(U.customers, MI.file, 'Case Studies', '', 'slim', .12)
    + mi(U.customers, MI.cust, 'Customer Stories', '', 'slim', .15)
    + mi('https://www.g2.com/products/easyecom/reviews', MI.star, 'Reviews &middot; G2', '', 'slim', .18)
    + '</div>'
    + '<div class="mm-g acc-blue">' + mh('Compare', .11)
    + mi('/increff-alternative', MI.scale, 'Compare WMS platforms', '', 'slim', .14)
    + mi('/unicommerce-alternative', MI.scale, 'Compare OMS platforms', '', 'slim', .17)
    + mi('/vinculum-alternative', MI.scale, 'Compare 3PL platforms', '', 'slim', .20)
    + '</div>'
    // Renamed "Directory + news" -> "News & updates"; What's New first, Newsroom
    // second (Swati, 2026-08-25 — product news and company news are siblings).
    + '<div class="mm-g">' + mh('News &amp; updates', .13)
    + mi(U.blog, MI.book, 'Blog', '', 'slim', .145)
    + mi(U.whatsnew, MI.news, 'What&rsquo;s New', '', 'slim', .16)
    + mi(U.newsroom, MI.news, 'Newsroom &amp; Press', '', 'slim', .19)
    + mi('/fulfillment-directory', MI.map, 'Fulfillment Directory', '', 'slim', .22)
    + mi('#newsletter', MI.mail, 'Newsletter', '', 'slim', .25)
    + '</div>';

  var PRICE =
    '<div class="mm-g">' + mh('Plans', .05)
    + mi(U.pricing, MI.tag, 'Plans &amp; pricing', 'What you pay, and what drives the number', 'lead', .08)
    + mi(U.pricingEnterprise, MI.ent, 'Enterprise &amp; custom', 'How a quote gets made', 'slim', .11)
    + '</div>'
    + '<div class="mm-g acc-blue">' + mh('Before you commit', .07)
    + mi(U.pricingRoi, MI.chart, 'ROI calculator', 'What inefficiency costs you today', 'slim', .10)
    + mi(U.pricingImplementation, MI.file, 'Implementation', 'What it takes to go live', 'slim', .13)
    + '</div>'
    + '<div class="mm-g">' + mh('Talk it through', .09)
    + '<a class="mm-promo" style="--d:.12s" href="' + U.demo + '"><span class="pk">30 MINUTES</span><span class="pt">See a quote on your numbers &rarr;</span></a>'
    + mi(U.contact, MI.inbox, 'Contact sales', '', 'slim', .16)
    + '</div>';

  // ---- active section ----
  var sec = 'products';
  if (/^solution-|industry/.test(file) || location.pathname.indexOf('/solutions') === 0) sec = 'solutions';
  else if (/^pricing/.test(file)) sec = 'pricing';
  else if (/^(blog|report)/.test(file) || segs.indexOf('blog') !== -1 || segs.indexOf('customer-pages') !== -1 ||
           segs.indexOf('site-templates') !== -1 || /^integration|^company/.test(file)) sec = 'resources';
  else if (/^product-/.test(file)) sec = 'products';
  else sec = '';
  function cur(k) { return sec === k ? ' cur' : ''; }

  // ---- nav markup ----
  var nav =
  '<nav class="site-nav' + (DARK ? ' dark' : '') + '"><div class="ninner">' +
    '<a href="' + U.home + '" class="brand" aria-label="EasyEcom home"><img src="' + R + 'assets/logo.svg" alt="EasyEcom" class="brand-logo"></a>' +
    '<div class="menu">' +
      '<div class="ni"><button type="button" class="nlink' + cur('products') + '" aria-haspopup="true" aria-expanded="false">Products <i class="cx"></i></button><div class="mega wide prod">' + PROD + '</div></div>' +
      '<div class="ni"><button type="button" class="nlink' + cur('solutions') + '" aria-haspopup="true" aria-expanded="false">Solutions <i class="cx"></i></button><div class="mega wide sol">' + SOL + '</div></div>' +
      '<div class="ni"><a class="nlink' + cur('pricing') + '" href="' + U.pricing + '">Pricing <i class="cx"></i></a><div class="mega wide price">' + PRICE + '</div></div>' +
      '<div class="ni"><button type="button" class="nlink' + cur('resources') + '" aria-haspopup="true" aria-expanded="false">Resources <i class="cx"></i></button><div class="mega wide res">' + RES + '</div></div>' +
    '</div>' +
    '<div class="cta"><a class="login" href="' + U.login + '">Log in</a><a class="demo" href="' + U.demo + '">Book a demo</a></div>' +
    '<button class="burger" id="navBurger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
    '<div class="mobile" id="navMobile">' +
      macc('Products', [[U.oms,'EasyOMS'],[U.wms,'EasyWMS'],[U.reco,'EasyReco'],[U.vms,'EasyVMS'],['/integrations/shopify','· Shopify'],['/integrations/amazon','· Amazon'],['/integrations#market','· Flipkart & Myntra'],['/integrations/woocommerce','· WooCommerce'],['/integrations/sap','· SAP'],[U.integrations,'Browse all 455+ integrations'],[U.api,'Open API & developers']]) +
      macc('Solutions', [[U.brands,'For Brands'],[U.d2c,'— D2C'],[U.omni,'— Omnichannel'],[U.retail,'— Retail & Wholesale'],[U.tpl,'For 3PLs'],[U.ecom3pl,'— Ecommerce Fulfillment'],[U.b2b,'— B2B & Wholesale'],[U.fba,'— FBA Prep'],[U.quick,'— Quick-commerce'],[U.apparel,'Apparel & Footwear'],[U.beauty,'Beauty & Wellness'],[U.electronics,'Electronics'],[U.jewelry,'Jewelry'],[U.food,'Food & Beverage'],[U.ucSpreadsheets,'Move off spreadsheets'],[U.ucOmni,'Sell omnichannel'],[U.ucRoute,'Route multi-warehouse'],[U.ucDisputes,'Win marketplace disputes'],[U.growth,'Growth teams'],[U.enterprise,'Enterprise']]) +
      macc('Pricing', [[U.pricing,'Plans & pricing'],[U.pricingRoi,'ROI calculator'],[U.pricingEnterprise,'Enterprise & custom'],[U.pricingImplementation,'Implementation']]) +
      macc('Resources', [[U.blog,'Blog'],[U.customers,'Customer Stories'],[U.whatsnew,'What\u2019s New'],[U.newsroom,'Newsroom & Press'],['/unicommerce-alternative','Compare OMS platforms'],['/increff-alternative','Compare WMS platforms'],['/vinculum-alternative','Compare 3PL platforms'],[U.help,'Help Center'],[U.docs,'Documentation'],[U.about,'About us'],[U.careers,'Careers'],[U.contact,'Contact'],[U.partner,'Partners'],[U.certificates,'Trust & security']]) +
      '<div class="macc"><a href="' + U.login + '" style="display:block;font-family:var(--display);font-weight:700;font-size:19px;color:var(--ink);text-decoration:none;padding:14px 0">Log in</a></div>' +
      '<a class="mdemo" href="' + U.demo + '" style="display:block;margin-top:18px;background:var(--teal);color:#fff;text-align:center;border-radius:100px;padding:14px;text-decoration:none;font-family:var(--display);font-weight:700">Book a demo</a>' +
    '</div>' +
  '</div></nav>';

  function macc(title, links) {
    var s = '<div class="macc"><button aria-expanded="false">' + title + ' <i class="cx"></i></button><div class="msub">';
    for (var i = 0; i < links.length; i++) s += '<a href="' + links[i][0] + '">' + links[i][1] + '</a>';
    return s + '</div></div>';
  }

  // ---- footer markup (mirrors legacy site-foot, real links where known) ----
  var foot =
  '<footer class="site-foot"><div class="finner">' +
    '<div class="brandrow"><div>' +
      '<div class="bd"><img src="' + R + 'assets/logo.svg" alt="EasyEcom" class="foot-logo"></div>' +
      // Tagline ends without a period on the home page only ("/"); every other page keeps it (Swati, 24 Sep).
      '<div class="bl">The operating system for e-commerce. Built in India, deployed across 12 countries' + (location.pathname === '/' ? '' : '.') + '</div>' +
      '<div class="badges"><a href="https://www.linkedin.com/company/easyecom" target="_blank" rel="noopener">LinkedIn</a><a href="https://x.com/easyecom" target="_blank" rel="noopener">X</a><a href="https://www.youtube.com/c/EasyEcom_OperatingSystemforeCommerce" target="_blank" rel="noopener">YouTube</a><a href="https://www.instagram.com/easyecom.io/" target="_blank" rel="noopener">Instagram</a>' +
        '<a class="g" href="https://play.google.com/store/apps/details?id=com.edgewise.handheld.easyapp" target="_blank" rel="noopener">&#9656; Android app</a><a class="g" href="https://play.google.com/store/apps/details?id=com.edgewise.handheld.easyapp" target="_blank" rel="noopener">&#9656; HHT scanner</a><a class="g" href="https://apps.shopify.com/easyecom-inventory-management-app" target="_blank" rel="noopener">&#9733; Shopify 5.0</a><a class="g" href="https://www.g2.com/products/easyecom/reviews" target="_blank" rel="noopener">&#9733; G2 4.6</a></div>' +
    '</div><div class="nlh" id="newsletter"><h6>Newsletter</h6><p>Ops &amp; commerce playbooks, monthly.</p>' +
      '<form class="nlform" onsubmit="return false"><input type="email" placeholder="you@company.com" aria-label="Email"/><button>Subscribe</button></form></div></div>' +
    '<div class="cols">' +
      '<div><h6>Trust &amp; Security</h6><ul><li><a href="/trust">Trust Center</a></li><li><a href="/trust#certifications">SOC 2 &middot; ISO 27001</a></li><li><a href="/trust#compliance">GDPR &middot; VAPT</a></li><li><a href="/trust/subprocessors">Subprocessors</a></li></ul></div>' +
      '<div><h6>Integrations</h6><ul><li><a href="/integrations/shopify">Shopify &middot; Amazon</a></li><li><a href="/integrations#market">Flipkart &middot; Myntra</a></li><li><a href="/integrations#cart">WooCommerce &middot; Magento</a></li><li><a href="/integrations#erp">SAP &middot; NetSuite &middot; Tally</a></li><li><a href="' + U.integrations + '">All 455+ &rarr;</a></li></ul></div>' +
      '<div><h6>Compare</h6><ul><li><a href="/unicommerce-alternative">Compare OMS platforms</a></li><li><a href="/increff-alternative">Compare WMS platforms</a></li><li><a href="/vinculum-alternative">Compare 3PL platforms</a></li><li><a href="https://www.g2.com/products/easyecom/reviews" target="_blank" rel="noopener">Reviews &middot; G2</a></li></ul></div>' +
      '<div><h6>Pricing</h6><ul><li><a href="/pricing">Plans &amp; pricing</a></li><li><a href="/pricing/roi-calculator">ROI calculator</a></li><li><a href="/pricing/enterprise">Enterprise &amp; custom</a></li><li><a href="/pricing/implementation">Implementation</a></li></ul></div>' +
      '<div><h6>Company</h6><ul><li><a href="' + U.about + '">About Us</a></li><li><a class="g" href="' + U.careers + '">Careers &middot; hiring</a></li><li><a href="' + U.contact + '">Contact</a></li><li><a href="' + U.newsroom + '">Newsroom</a></li><li><a href="' + U.partner + '">Partners</a></li></ul></div>' +
      '<div><h6>Legal</h6><ul><li><a href="/privacy-policy">Privacy Policy</a></li><li><a href="/terms-of-service">Terms of Service</a></li><li><a href="/dpa">DPA</a></li><li><a href="/gdpr-cookies">GDPR &middot; Cookies</a></li><li><a href="/modern-slavery">Modern Slavery</a></li><li><a href="/accessibility">Accessibility</a></li></ul></div>' +
    '</div>' +
    '<div class="bar"><span><a href="' + U.login + '">Customer login</a> &middot; &#127760; Region &amp; language</span>' +
      '<span>&copy; 2026 EasyEcom &middot; <a href="#" onclick="if(window.eeCookieSettings){window.eeCookieSettings();return false;}">Cookie settings</a></span></div>' +
  '</div></footer>';

  // ---- self-heal derived tokens (pages built on 'The Floor' omit a few) ----
  function ensureTokens() {
    var root = document.documentElement, cs = getComputedStyle(root);
    var defs = {
      '--paper': '#f6f4ef', '--paper-2': '#efece3', '--rule': '#e3ddd0', '--rule-soft': '#ece6d8',
      '--ink': '#0e1a17', '--ink-soft': '#2a3a44', '--ink-faint': '#6b7580', '--card': '#fff',
      '--teal': '#018477', '--teal-deep': '#006a60', '--teal-ink': '#02655c', '--jade': '#269B4A', '--jade-bright': '#3fce6f', '--navy': '#10243b', '--navy-deep': '#0e1f33'
    };
    for (var k in defs) { if (!cs.getPropertyValue(k).trim()) root.style.setProperty(k, defs[k]); }
  }

  // ---- mount ----
  function mount() {
    if (document.querySelector('.site-nav')) return;
    ensureTokens();
    if (!document.getElementById('mmCss')) document.body.insertAdjacentHTML('beforeend', MM_CSS);
    var nm = document.getElementById('ee-nav');
    if (nm) nm.outerHTML = nav; else document.body.insertAdjacentHTML('afterbegin', nav);
    var fm = document.getElementById('ee-foot');
    if (fm) fm.outerHTML = foot; else document.body.insertAdjacentHTML('beforeend', foot);

    // dark nav: solidify on scroll
    if (DARK) {
      var dn = document.querySelector('.site-nav.dark');
      var onScroll = function () { if (dn) dn.classList.toggle('scrolled', window.scrollY > 12); };
      onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    }
    // reveal repair: injecting nav/footer can race a page's entrance transition,
    // leaving an element flagged .in (meant to be visible) but frozen at opacity 0.
    // After load, re-trigger only those specific stuck elements (safe: a correctly
    // revealed element is never exactly 0). Fixes homepage/solution-parent hero cards.
    window.addEventListener('load', function () {
      setTimeout(function () {
        document.querySelectorAll('.in, .hero-os-card').forEach(function (el) {
          var cs = getComputedStyle(el);
          if (cs.transitionDuration !== '0s' && parseFloat(cs.opacity) === 0) {
            el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
          }
        });
      }, 120);
    });
    // mobile drawer toggle
    var b = document.getElementById('navBurger'), m = document.getElementById('navMobile');
    if (b && m) b.addEventListener('click', function () { var o = m.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
    // mobile accordions
    [].forEach.call(document.querySelectorAll('.site-nav .mobile .macc>button'), function (btn) {
      btn.addEventListener('click', function () {
        var acc = btn.parentNode, o = acc.classList.toggle('open');
        btn.setAttribute('aria-expanded', o);
      });
    });
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
