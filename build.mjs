import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const esc = (v='') => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const euro = (n) => `€ ${Number(n).toFixed(0)}`;
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// Nederlands is de bron: prijzen, duur, foto's, openingstijden en contact komen altijd hieruit.
const baseSite = read('data/site.json');
const baseTreatments = read('data/treatments.json').filter(t => t.active);
const basePackages = read('data/packages.json');
const baseLegal = read('data/legal.json');
const ui = read('data/ui.json');
const en = read('data/en.json');

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (base, over) => {
  const out = {...base};
  for (const [k, v] of Object.entries(over || {})) out[k] = isObj(v) && isObj(base?.[k]) ? merge(base[k], v) : (v === '' || v == null ? base?.[k] : v);
  return out;
};

const LANGS = {
  nl: {prefix: '', t: ui.nl, site: baseSite, treatments: baseTreatments, packages: basePackages, legal: baseLegal},
  en: (() => {
    const {galleryAlts = [], ...siteOver} = en.site || {};
    const site = merge(baseSite, siteOver);
    site.gallery = baseSite.gallery.map((g, i) => ({...g, alt: galleryAlts[i] || g.alt}));
    const treatments = baseTreatments.map(t => merge(t, (en.treatments || {})[t.id]));
    const packages = basePackages.map(p => merge(p, (en.packages || {})[p.id]));
    const legal = {terms: en.legal?.terms || baseLegal.terms, privacy: en.legal?.privacy || baseLegal.privacy};
    return {prefix: '/en', t: ui.en, site, treatments, packages, legal};
  })()
};

const PAGE_KEYS = ['home', 'treatments', 'choice', 'prices', 'about', 'reviews', 'contact'];
const pagePath = (lang, key) => {
  const slug = LANGS[lang].t.pages[key].slug;
  const p = `${LANGS[lang].prefix}${slug ? `/${slug}` : ''}`;
  return p || '/';
};
const canonicalBase = baseSite.seo.canonical;
const urlFor = (lang, key) => new URL(pagePath(lang, key), canonicalBase).href;
const absoluteUrl = (v) => /^https?:\/\//i.test(v) ? v : new URL(v, canonicalBase).href;

function render(lang, key){
  const {t, site, treatments, packages, legal} = LANGS[lang];
  const P = (k) => pagePath(lang, k);
  const page = t.pages[key];
  const wa = (text) => `https://wa.me/${site.phoneInternational}?text=${encodeURIComponent(text)}`;
  const seo = key === 'home' ? {title: site.seo.title, description: site.seo.description} : {title: page.title, description: page.description};

  /* ---------- bouwstenen ---------- */
  const treatmentCard = tr => `
  <article class="treatment-card" data-treatment-id="${esc(tr.id)}">
    <button class="treatment-media js-treatment-detail" data-treatment="${esc(tr.id)}" aria-label="${esc(fill(t.viewAria, {name: tr.name}))}">
      <img src="${esc(tr.image)}" alt="${esc(tr.imageAlt)}" loading="lazy" decoding="async">
      <span class="type-chip">${esc(tr.typeLabel || t.massage)}</span>
    </button>
    <div class="treatment-body">
      <div class="treatment-topline"><h3>${esc(tr.name)}</h3><span>${tr.durations?.length ? `${t.fromLower} ${euro(Math.min(...tr.durations.map(d=>d.price)))}` : esc(t.onRequest)}</span></div>
      <p>${esc(tr.teaser || tr.description)}</p>
      <div class="treatment-meta"><span>${esc(tr.intensity || t.tailored)}</span><span>${esc(tr.oilLabel || '')}</span></div>
      <div class="treatment-actions"><button class="button button-ghost js-treatment-detail" data-treatment="${esc(tr.id)}">${esc(t.viewTreatment)}</button><button class="text-link js-book" data-treatment="${esc(tr.id)}">${esc(t.bookShort)} <span aria-hidden="true">↗</span></button></div>
    </div>
  </article>`;

  const pageHero = (pg) => `
    <section class="page-hero section-pad">
      <span class="eyebrow">${esc(pg.eyebrow)}</span>
      <h1>${esc(pg.h1)}</h1>
      ${pg.lead ? `<p class="page-lead">${esc(pg.lead)}</p>` : ''}
    </section>`;

  const homeHero = () => `
    <section class="hero hero-immersive">
      <img class="hero-bg" src="${esc(site.hero.image)}" alt="${esc(site.hero.imageAlt)}" fetchpriority="high">
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="hero-content section-pad">
        <div class="hero-copy">
          <span class="eyebrow">${esc(site.hero.eyebrow)}</span>
          <h1>${esc(site.hero.title)}</h1>
          <p class="lead">${esc(site.hero.copy)}</p>
          <div class="hero-actions">
            <button class="button button-primary js-book">${esc(site.hero.primaryCta)}</button>
            <a class="hero-secondary" href="${P('choice')}">${esc(site.hero.secondaryCta)} <span aria-hidden="true">→</span></a>
          </div>
          <div class="hero-trust" aria-label="${esc(t.heroTrustAria)}">
            <span><strong>${site.reviews.rating.toFixed(1)} ★</strong> Google</span>
            <span><a class="hero-trust-link" href="${P('prices')}">${esc(t.fromUpper)} <strong>€${Number.isFinite(minPrice) ? minPrice : 35}</strong></a></span>
            <span>Zoetermeer</span>
          </div>
        </div>
        <a class="hero-scroll" href="#behandelingen">${esc(t.scrollTreatments)} <span aria-hidden="true">↓</span></a>
      </div>
    </section>`;

  const treatmentsSection = ({preview} = {}) => `
    <section class="section section-pad" id="behandelingen">
      ${preview ? `<div class="section-heading"><span class="eyebrow">${esc(t.treatmentsEyebrow)}</span><h2>${esc(t.treatmentsTitle)}</h2></div>` : ''}
      <div class="treatment-grid">${(preview ? treatments.slice(0, 4) : treatments).map(treatmentCard).join('')}</div>
      ${preview ? `<div class="section-more"><a class="button button-ghost" href="${P('treatments')}">${esc(t.allTreatments)} <span aria-hidden="true">→</span></a></div>` : ''}
    </section>`;

  const choiceSection = () => `
    <section class="choice-section section-pad" id="keuzehulp">
      <div class="choice-copy"><span class="eyebrow">${esc(page.eyebrow)}</span><h1>${esc(page.h1)}</h1><p class="page-lead">${esc(page.lead)}</p></div>
      <div class="choice-card" data-choice-helper>
        <div class="choice-progress"><span>${esc(t.question)} <b data-step>1</b> ${esc(t.of)} 5</span><div><i data-progress></i></div></div>
        <div data-choice-content></div>
      </div>
    </section>`;

  const choiceTeaser = () => `
    <section class="cta-split section-pad">
      <div><span class="eyebrow">${esc(t.choiceTeaserEyebrow)}</span><h2>${esc(t.choiceTeaserTitle)}</h2><p>${esc(t.choiceTeaserText)}</p></div>
      <a class="button button-primary" href="${P('choice')}">${esc(t.choiceTeaserCta)} <span aria-hidden="true">→</span></a>
    </section>`;

  const priceRows = treatments.map(tr => {
    if (!tr.durations?.length) return `<tr><th scope="row">${esc(tr.shortName || tr.name)}</th><td colspan="4">${esc(t.durationsOnRequest)}</td></tr>`;
    const by = Object.fromEntries(tr.durations.map(d => [d.minutes, d.price]));
    return `<tr><th scope="row">${esc(tr.shortName || tr.name)}</th>${[30,60,90,120].map(m => `<td>${by[m] ? euro(by[m]) : '—'}</td>`).join('')}</tr>`;
  }).join('');
  const packageCards = packages.map(p => `<article class="package-card"><div><span class="eyebrow">${esc(t.package)}</span><h3>${esc(p.name)}</h3>${p.lines.map(x=>`<p>${esc(x)}</p>`).join('')}</div><div class="package-price"><strong>${euro(p.price)}</strong><span>${p.duration} ${esc(t.minutes)}</span></div><button class="button button-light js-package-book" data-package="${esc(p.id)}">${esc(t.requestAppointment)}</button></article>`).join('');

  const pricesSection = () => `
    <section class="section section-pad section-tight-top" id="prijzen">
      <div class="price-table-wrap"><table class="price-table"><thead><tr><th>${esc(t.treatment)}</th><th>30 min</th><th>60 min</th><th>90 min</th><th>120 min</th></tr></thead><tbody>${priceRows}</tbody></table></div>
      <div class="packages-grid">${packageCards}</div>
      <section class="passes-feature" aria-label="${esc(t.passesAria)}">
        <div class="passes-feature-copy">
          <span class="eyebrow">${esc(t.passesEyebrow)}</span>
          <h3>${esc(t.passesTitle)}</h3>
        </div>
        <div class="passes-cards">
          <a class="pass-card" href="${wa(t.waPass5)}" target="_blank" rel="noopener">
            <span class="pass-kicker">${esc(t.passKicker)}</span><strong>${esc(t.pass5)}</strong><b>€ 300</b><small>${esc(t.passValid)}</small><span class="pass-link">${esc(t.passLink)}</span>
          </a>
          <a class="pass-card pass-card-featured" href="${wa(t.waPass10)}" target="_blank" rel="noopener">
            <span class="pass-kicker">${esc(t.passKicker)}</span><strong>${esc(t.pass10)}</strong><b>€ 585</b><small>${esc(t.passValid)}</small><span class="pass-link">${esc(t.passLink)}</span>
          </a>
          <a class="pass-card pass-card-gift" href="${wa(t.waGift)}" target="_blank" rel="noopener">
            <span class="pass-kicker">${esc(t.giftKicker)}</span><strong>${esc(t.giftTitle)}</strong><b>${esc(t.giftPrice)}</b><small>${esc(t.giftNote)}</small><span class="pass-link">${esc(t.passLink)}</span>
          </a>
        </div>
      </section>
    </section>`;

  const aboutSection = ({teaser} = {}) => {
    const H = teaser ? 'h2' : 'h1';
    return `
    <section class="trust-section section-pad" id="over">
      <div class="trust-copy">
        <span class="eyebrow">${esc(t.aboutEyebrow)}</span>
        <${H}>${esc(site.trust.title)}</${H}>
        <div class="trust-story">
          <p class="trust-intro">${esc(site.trust.text)}</p>
          ${teaser ? `<a class="button button-ghost trust-more" href="${P('about')}">${esc(t.moreAbout)} <span aria-hidden="true">→</span></a>` : `<p>${esc(site.trust.secondaryText || '')}</p><p>${esc(site.trust.closingText || '')}</p>`}
        </div>
      </div>
      <div class="trust-media"><img src="${esc(site.trust.image)}" alt="${esc(site.trust.imageAlt)}" loading="lazy" decoding="async"></div>
      ${teaser ? '' : `<div class="trust-extra"><div class="trust-points">${t.trustPoints.map(([title, text], i) => `<div><span class="trust-number">0${i+1}</span><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`).join('')}</div></div>`}
    </section>`;
  };

  const gallerySection = () => `<section class="gallery-section section-pad"><div class="section-heading"><span class="eyebrow">${esc(t.galleryEyebrow)}</span><h2>${esc(t.galleryTitle)}</h2></div><div class="gallery-grid">${site.gallery.map((g,i) => `<figure class="gallery-item gallery-${i+1}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></figure>`).join('')}</div></section>`;

  const reviewsSection = ({main} = {}) => {
    const H = main ? 'h1' : 'h2';
    return `
    <section class="reviews-section section-pad" id="reviews">
      <div class="review-score"><span class="eyebrow">Google reviews</span><div class="score-line"><strong>${site.reviews.rating.toFixed(1)}</strong><span class="stars" aria-hidden="true">★★★★★</span></div><p>${esc(fill(t.reviewsCount, {n: site.reviews.count}))}</p></div>
      <div class="review-copy"><${H}>${esc(t.reviewsTitle)}</${H}><div class="review-actions"><a class="button button-primary" href="${esc(site.reviews.googleMapsUrl)}" target="_blank" rel="noopener">${esc(t.reviewsView)}</a><a class="text-link" href="${esc(site.reviews.writeReviewUrl)}" target="_blank" rel="noopener">${esc(t.reviewsWrite)}</a></div></div>
    </section>`;
  };

  const bookingBand = () => `<section class="booking-band section-pad"><div><span class="eyebrow eyebrow-light">${esc(t.bookingEyebrow)}</span><h2>${esc(site.booking.title)}</h2></div><button class="button button-light js-book">${esc(t.book)}</button></section>`;

  const [streetAddress, postalCity='Zoetermeer'] = site.address.split(',').map(x => x.trim());
  const openingRows = site.openingHours.map(h => `<div class="hours-row"><span>${esc(t.days[h.dayIndex] || h.day)}</span><strong>${h.open ? `${esc(h.from)}–${esc(h.to)}` : esc(t.closed)}</strong></div>`).join('');
  const socialLinks = (site.socials || []).filter(s => s.url).map(s => `<a class="social-link social-${esc(s.kind || 'link')}" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} <span aria-hidden="true">↗</span></a>`).join('');
  const contactSection = () => `
    <section class="contact-section section-pad section-tight-top" id="contact">
      <div class="contact-card"><span class="eyebrow">${esc(t.contactEyebrow)}</span><h2>Montra Thai Massage</h2><a href="tel:+${site.phoneInternational}">${esc(site.phoneDisplay)}</a><a href="mailto:${esc(site.email)}">${esc(site.email)}</a><p>${esc(site.address)}</p><div class="contact-actions"><a class="button button-primary" href="https://wa.me/${site.phoneInternational}" target="_blank" rel="noopener">WhatsApp</a><a class="button button-ghost" href="${esc(site.reviews.googleMapsUrl)}" target="_blank" rel="noopener">${esc(t.directions)}</a></div><div class="social-links" aria-label="${esc(t.socialAria)}">${socialLinks}</div><small>${esc(t.kvk)} ${esc(site.kvk)}</small></div>
      <div class="hours-card"><span class="eyebrow">${esc(t.hoursEyebrow)}</span>${openingRows}<p class="hours-note">${esc(t.hoursNote)}</p></div>
      <div class="map-card"><div class="map-placeholder" data-map><div><span class="map-icon" aria-hidden="true">⌖</span><h3>${esc(streetAddress)}</h3><p>${esc(postalCity)}</p><button class="button button-primary" data-load-map>${esc(t.loadMap)}</button><small>${esc(t.mapNote)}</small></div></div></div>
    </section>`;

  /* ---------- pagina-inhoud ---------- */
  const body = {
    home: () => homeHero() + treatmentsSection({preview: true}) + choiceTeaser() + aboutSection({teaser: true}) + reviewsSection() + bookingBand(),
    treatments: () => pageHero(page) + treatmentsSection() + choiceTeaser() + bookingBand(),
    choice: () => choiceSection() + bookingBand(),
    prices: () => pageHero(page) + pricesSection() + choiceTeaser() + bookingBand(),
    about: () => aboutSection() + gallerySection() + choiceTeaser() + bookingBand(),
    reviews: () => reviewsSection({main: true}) + gallerySection() + bookingBand(),
    contact: () => pageHero(page) + contactSection()
  }[key]();

  const navLink = (k, label) => `<a href="${P(k)}"${k === key ? ' aria-current="page"' : ''}>${esc(label ?? t.pages[k].nav)}</a>`;
  const legalHtml = (list) => list.map(s => `<section><h3>${esc(s.heading)}</h3>${s.text.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.businessName,
    url: urlFor(lang, 'home'),
    telephone: `+${site.phoneInternational}`,
    email: site.email,
    image: absoluteUrl(site.hero.image),
    address: {'@type': 'PostalAddress', streetAddress, postalCode: '2729 HB', addressLocality: 'Zoetermeer', addressCountry: 'NL'},
    openingHoursSpecification: site.openingHours.filter(h=>h.open).map(h => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][h.dayIndex]}`,
      opens: h.from,
      closes: h.to
    }))
  };

  // Oude one-page links (/#prijzen) doorsturen naar de nieuwe pagina's.
  const legacyAnchors = {keuzehulp: P('choice'), prijzen: P('prices'), over: P('about'), contact: P('contact')};
  const runtimeData = JSON.stringify({lang, page: key, site, treatments, packages, t: t.js, legacyAnchors}).replace(/</g,'\\u003c');
  const langSwitch = `<div class="lang-switch" role="group" aria-label="${esc(t.langAria)}">${Object.keys(LANGS).map(code => `<a href="${pagePath(code, key)}" hreflang="${code}" lang="${code}" data-lang="${code}"${code===lang?' aria-current="true"':''}>${code.toUpperCase()}</a>`).join('')}</div>`;

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(seo.title)}</title>
  <meta name="description" content="${esc(seo.description)}">
  <link rel="canonical" href="${esc(urlFor(lang, key))}">
  <link rel="alternate" hreflang="nl" href="${esc(urlFor('nl', key))}">
  <link rel="alternate" hreflang="en" href="${esc(urlFor('en', key))}">
  <link rel="alternate" hreflang="x-default" href="${esc(urlFor('nl', key))}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${t.ogLocale}">
  <meta property="og:locale:alternate" content="${lang === 'nl' ? ui.en.ogLocale : ui.nl.ogLocale}">
  <meta property="og:title" content="${esc(seo.title)}">
  <meta property="og:description" content="${esc(seo.description)}">
  <meta property="og:url" content="${esc(urlFor(lang, key))}">
  <meta property="og:image" content="${esc(absoluteUrl(site.hero.image))}">
  <meta name="theme-color" content="#5f315f">
  <link rel="stylesheet" href="/assets/site.css">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body class="page-${key}">
  <a class="skip-link" href="#main">${esc(t.skip)}</a>
  <header class="site-header" id="top">
    <div class="header-inner">
      <a class="brand" href="${P('home')}" aria-label="${esc(t.brandAria)}"><span class="brand-mark" aria-hidden="true">M</span><span><strong>Montra</strong><small>Thai Massage</small></span></a>
      <nav class="desktop-nav" aria-label="${esc(t.navAria)}">
        ${['treatments','choice','prices','about','reviews','contact'].map(k => navLink(k)).join('')}
      </nav>
      ${langSwitch}
      <button class="button button-primary header-cta js-book">${esc(t.book)}</button>
      <button class="menu-toggle" aria-label="${esc(t.menuOpen)}" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span></button>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden>
      ${PAGE_KEYS.map(k => navLink(k)).join('')}
      <button class="button button-primary js-book">${esc(t.book)}</button>
    </div>
  </header>

  <main id="main">${body}
  </main>

  <footer class="site-footer section-pad"><div class="footer-brand"><span class="brand-mark" aria-hidden="true">M</span><div><strong>Montra Thai Massage</strong><p>${esc(site.address)}</p></div></div><nav class="footer-nav" aria-label="${esc(t.footerNavAria)}">${PAGE_KEYS.map(k => navLink(k)).join('')}</nav><div class="footer-links">${Object.entries(t.legalTitles).map(([k, v]) => `<button data-legal="${k}">${esc(v)}</button>`).join('')}</div><div class="footer-bottom"><span>© 2026 Montra Thai Massage</span><span>${esc(site.noEroticText)}</span></div></footer>

  <div class="mobile-sticky"><button class="button button-primary js-book">${esc(t.book)}</button></div>

  <dialog class="modal booking-modal" id="booking-modal" aria-labelledby="booking-title">
    <div class="modal-shell"><button class="modal-close" data-close aria-label="${esc(t.close)}">×</button><div class="modal-head"><span class="eyebrow">${esc(t.bookingModalEyebrow)}</span><h2 id="booking-title">${esc(t.bookingModalTitle)}</h2><p>${esc(site.booking.note)}</p></div><form id="booking-form" novalidate><div class="form-grid"><label><span>${esc(t.fieldTreatment)}</span><select id="booking-treatment" required></select></label><label><span>${esc(t.fieldDuration)}</span><select id="booking-duration" required></select></label><label><span>${esc(t.fieldDate)}</span><input id="booking-date" type="date" lang="${t.htmlLang}" required></label><label><span>${esc(t.fieldTime)}</span><select id="booking-time" required></select></label><label class="full"><span>${esc(t.fieldName)}</span><input id="booking-name" type="text" autocomplete="name" required placeholder="${esc(t.namePlaceholder)}"></label><label class="full"><span>${esc(t.fieldNote)} <em>${esc(t.optional)}</em></span><textarea id="booking-note" rows="3" placeholder="${esc(t.notePlaceholder)}"></textarea></label></div><div class="form-status" id="booking-status" aria-live="polite"></div><button class="button button-primary button-block" type="submit">${esc(t.submit)}</button><small class="form-fineprint">${esc(t.fineprint)}</small></form></div>
  </dialog>

  <dialog class="modal treatment-modal" id="treatment-modal" aria-labelledby="treatment-detail-title">
    <div class="modal-shell treatment-detail-shell"><button class="modal-close" data-close aria-label="${esc(t.close)}">×</button>
      <div class="treatment-detail-grid">
        <div class="treatment-detail-image"><img id="treatment-detail-image" src="" alt=""></div>
        <div class="treatment-detail-copy"><span class="eyebrow" id="treatment-detail-type"></span><h2 id="treatment-detail-title"></h2><p class="detail-lead" id="treatment-detail-description"></p><div class="detail-facts" id="treatment-detail-facts"></div><div class="detail-best"><strong>${esc(t.bestFor)}</strong><p id="treatment-detail-best"></p></div><div id="treatment-detail-prices" class="detail-prices"></div><button class="button button-primary" id="treatment-detail-book">${esc(t.requestAppointment)}</button></div>
      </div>
    </div>
  </dialog>

  <dialog class="modal legal-modal" id="legal-modal" aria-labelledby="legal-title"><div class="modal-shell legal-shell"><button class="modal-close" data-close aria-label="${esc(t.close)}">×</button><div class="modal-head"><span class="eyebrow">${esc(t.legalEyebrow)}</span><h2 id="legal-title"></h2></div><div class="legal-content" id="legal-content"></div></div></dialog>

  <template id="terms-template">${legalHtml(legal.terms)}</template>
  <template id="privacy-template">${legalHtml(legal.privacy)}</template>
  <template id="cancellation-template">${t.cancellationHtml}</template>
  <template id="business-template"><section><h3>${esc(t.businessHeading)}</h3><p><strong>Montra Thai Massage</strong><br>${esc(site.address)}<br>${esc(t.phone)}: ${esc(site.phoneDisplay)}<br>${esc(t.email)}: ${esc(site.email)}<br>${esc(t.kvk)}: ${esc(site.kvk)}</p></section><section><h3>${esc(t.serviceHeading)}</h3><p>${esc(t.serviceText)}</p></section></template>
  <script id="site-data" type="application/json">${runtimeData}</script>
  <script src="/assets/site.js" defer></script>
</body>
</html>`;
}

const minPrice = Math.min(...baseTreatments.flatMap(tr => (tr.durations || []).map(d => d.price)));

/* ---------- schrijven ---------- */
fs.rmSync(path.join(root,'dist'), {recursive:true, force:true});
fs.mkdirSync(path.join(root,'dist','assets'), {recursive:true});
const written = [];
for (const lang of Object.keys(LANGS)) {
  for (const key of PAGE_KEYS) {
    const rel = pagePath(lang, key).replace(/^\//, '');
    const file = path.join(root, 'dist', rel, 'index.html');
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, render(lang, key));
    written.push(pagePath(lang, key));
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${Object.keys(LANGS).flatMap(lang => PAGE_KEYS.map(key => `  <url>
    <loc>${urlFor(lang, key)}</loc>
    <xhtml:link rel="alternate" hreflang="nl" href="${urlFor('nl', key)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${urlFor('en', key)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor('nl', key)}"/>
    <changefreq>weekly</changefreq>
    <priority>${key === 'home' ? (lang === 'nl' ? '1.0' : '0.8') : '0.7'}</priority>
  </url>`)).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(root,'dist','sitemap.xml'), sitemap);

fs.copyFileSync(path.join(root,'assets','site.css'), path.join(root,'dist','assets','site.css'));
fs.copyFileSync(path.join(root,'assets','site.js'), path.join(root,'dist','assets','site.js'));
const imageDir = path.join(root,'assets','images');
if (fs.existsSync(imageDir)) fs.cpSync(imageDir, path.join(root,'dist','assets','images'), {recursive:true});
fs.copyFileSync(path.join(root,'robots.txt'), path.join(root,'dist','robots.txt'));
fs.mkdirSync(path.join(root,'dist','data'), {recursive:true});
for (const f of ['site.json','treatments.json','packages.json','legal.json']) fs.copyFileSync(path.join(root,'data',f), path.join(root,'dist','data',f));
console.log(`Built ${written.length} pages:\n  ${written.join('\n  ')}`);
