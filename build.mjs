import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const esc = (v='') => String(v).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const euro = (n) => `€ ${Number(n).toFixed(0)}`;
const absoluteUrl = (v) => /^https?:\/\//i.test(v) ? v : new URL(v, site.seo.canonical).href;

const site = read('data/site.json');
const treatments = read('data/treatments.json').filter(t => t.active);
const packages = read('data/packages.json');
const legal = read('data/legal.json');

const durationsText = (t) => t.durations?.length ? t.durations.map(d => `${d.minutes} min · ${euro(d.price)}`).join(' · ') : 'Tarief en duur in overleg';
const treatmentCards = treatments.map(t => `
  <article class="treatment-card" data-treatment-id="${esc(t.id)}">
    <button class="treatment-media js-treatment-detail" data-treatment="${esc(t.id)}" aria-label="Bekijk ${esc(t.name)}">
      <img src="${esc(t.image)}" alt="${esc(t.imageAlt)}" loading="lazy" decoding="async">
      <span class="type-chip">${esc(t.typeLabel || 'Massage')}</span>
    </button>
    <div class="treatment-body">
      <div class="treatment-topline"><h3>${esc(t.name)}</h3><span>${t.durations?.length ? `vanaf ${euro(Math.min(...t.durations.map(d=>d.price)))}` : 'In overleg'}</span></div>
      <p>${esc(t.teaser || t.description)}</p>
      <div class="treatment-meta"><span>${esc(t.intensity || 'Afgestemd')}</span><span>${esc(t.oilLabel || '')}</span></div>
      <div class="treatment-actions"><button class="button button-ghost js-treatment-detail" data-treatment="${esc(t.id)}">Bekijk behandeling</button><button class="text-link js-book" data-treatment="${esc(t.id)}">Afspraak <span aria-hidden="true">↗</span></button></div>
    </div>
  </article>`).join('');

const priceRows = treatments.map(t => {
  if (!t.durations?.length) return `<tr><th scope="row">${esc(t.shortName || t.name)}</th><td colspan="4">Tarief en duur in overleg</td></tr>`;
  const by = Object.fromEntries(t.durations.map(d => [d.minutes, d.price]));
  return `<tr><th scope="row">${esc(t.shortName || t.name)}</th>${[30,60,90,120].map(m => `<td>${by[m] ? euro(by[m]) : '—'}</td>`).join('')}</tr>`;
}).join('');

const packageCards = packages.map(p => `<article class="package-card"><div><span class="eyebrow">Pakket</span><h3>${esc(p.name)}</h3>${p.lines.map(x=>`<p>${esc(x)}</p>`).join('')}</div><div class="package-price"><strong>${euro(p.price)}</strong><span>${p.duration} minuten</span></div><button class="button button-light js-package-book" data-package="${esc(p.id)}">Afspraak aanvragen</button></article>`).join('');

const openingRows = site.openingHours.map(h => `<div class="hours-row"><span>${esc(h.day)}</span><strong>${h.open ? `${esc(h.from)}–${esc(h.to)}` : 'Gesloten'}</strong></div>`).join('');
const gallery = site.gallery.map((g,i) => `<figure class="gallery-item gallery-${i+1}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></figure>`).join('');
const socialLinks = (site.socials || []).filter(s => s.url).map(s => `<a class="social-link social-${esc(s.kind || 'link')}" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} <span aria-hidden="true">↗</span></a>`).join('');
const [streetAddress, postalCity='Zoetermeer'] = site.address.split(',').map(x => x.trim());
const termsHtml = legal.terms.map(s => `<section><h3>${esc(s.heading)}</h3>${s.text.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');
const privacyHtml = legal.privacy.map(s => `<section><h3>${esc(s.heading)}</h3>${s.text.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');

const schema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: site.businessName,
  url: site.seo.canonical,
  telephone: `+${site.phoneInternational}`,
  email: site.email,
  image: absoluteUrl(site.hero.image),
  address: {
    '@type': 'PostalAddress',
    streetAddress: streetAddress,
    postalCode: '2729 HB',
    addressLocality: 'Zoetermeer',
    addressCountry: 'NL'
  },
  openingHoursSpecification: site.openingHours.filter(h=>h.open).map(h => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][h.dayIndex]}`,
    opens: h.from,
    closes: h.to
  }))
};

const runtimeData = JSON.stringify({site, treatments, packages}).replace(/</g,'\\u003c');

const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(site.seo.title)}</title>
  <meta name="description" content="${esc(site.seo.description)}">
  <link rel="canonical" href="${esc(site.seo.canonical)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:title" content="${esc(site.seo.title)}">
  <meta property="og:description" content="${esc(site.seo.description)}">
  <meta property="og:url" content="${esc(site.seo.canonical)}">
  <meta property="og:image" content="${esc(absoluteUrl(site.hero.image))}">
  <meta name="theme-color" content="#5f315f">
  <link rel="preconnect" href="https://montrathaimassage.nl">
  <link rel="stylesheet" href="/assets/site.css">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <a class="skip-link" href="#main">Naar inhoud</a>
  <header class="site-header" id="top">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="Ga naar de homepage van Montra Thai Massage"><span class="brand-mark" aria-hidden="true">M</span><span><strong>Montra</strong><small>Thai Massage</small></span></a>
      <nav class="desktop-nav" aria-label="Hoofdnavigatie">
        <a href="#behandelingen">Behandelingen</a><a href="#keuzehulp">Massagekeuze</a><a href="#prijzen">Prijzen</a><a href="#reviews">Reviews</a><a href="#contact">Contact</a>
      </nav>
      <button class="button button-primary header-cta js-book">Afspraak maken</button>
      <button class="menu-toggle" aria-label="Menu openen" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span></button>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden>
      <a href="#behandelingen">Behandelingen</a><a href="#keuzehulp">Massagekeuze</a><a href="#prijzen">Prijzen</a><a href="#reviews">Reviews</a><a href="#over">Over Ratree</a><a href="#contact">Contact & locatie</a>
      <button class="button button-primary js-book">Afspraak maken</button>
    </div>
  </header>

  <main id="main">
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
            <a class="hero-secondary js-start-choice" href="#keuzehulp">${esc(site.hero.secondaryCta)} <span aria-hidden="true">→</span></a>
          </div>

          <div class="hero-trust" aria-label="Kerninformatie">
            <span><strong>${site.reviews.rating.toFixed(1)} ★</strong> Google</span>
            <span>Vanaf <strong>€35</strong></span>
            <span>Zoetermeer</span>
          </div>
        </div>

        <a class="hero-scroll" href="#behandelingen">Bekijk behandelingen <span aria-hidden="true">↓</span></a>
      </div>
    </section>

    <section class="section section-pad" id="behandelingen">
      <div class="section-heading"><span class="eyebrow">Behandelingen</span><h2>Zeven behandelingen. Elk met een ander doel.</h2></div>
      <div class="treatment-grid">${treatmentCards}</div>
    </section>

    <section class="choice-section section-pad" id="keuzehulp">
      <div class="choice-copy"><span class="eyebrow">Persoonlijke massagekeuze</span><h2>In vijf vragen naar jouw beste match.</h2><p>Beantwoord vijf korte vragen en ontdek welke behandeling het beste bij je voorkeuren past. Geen medische diagnose.</p></div>
      <div class="choice-card" data-choice-helper>
        <div class="choice-progress"><span>Vraag <b data-step>1</b> van 5</span><div><i data-progress></i></div></div>
        <div data-choice-content></div>
      </div>
    </section>

    <section class="section section-pad" id="prijzen">
      <div class="section-heading"><span class="eyebrow">Prijzen</span><h2>Alles in één oogopslag.</h2><p>De onderstaande tarieven zijn overgenomen uit de actuele prijslijst van Montra Thai Massage.</p></div>
      <div class="price-table-wrap"><table class="price-table"><thead><tr><th>Behandeling</th><th>30 min</th><th>60 min</th><th>90 min</th><th>120 min</th></tr></thead><tbody>${priceRows}</tbody></table></div>
      <div class="packages-grid">${packageCards}</div>
      <section class="passes-feature" aria-label="Strippenkaart en cadeaubon">
        <div class="passes-feature-copy">
          <span class="eyebrow">Strippenkaart & cadeaubon</span>
          <h3>Kies wat bij je past.</h3>
          <p>Een voordelige strippenkaart voor meerdere massages, of vraag naar de mogelijkheden voor een cadeaubon.</p>
        </div>
        <div class="passes-cards">
          <a class="pass-card" href="https://wa.me/${site.phoneInternational}?text=${encodeURIComponent('Hallo Montra Thai Massage, ik heb interesse in de strippenkaart van 5× 60 minuten voor €300. Kun je mij hierover meer informatie geven?')}" target="_blank" rel="noopener">
            <span class="pass-kicker">Strippenkaart</span>
            <strong>5× 60 minuten</strong>
            <b>€ 300</b>
            <small>12 maanden geldig</small>
            <span class="pass-link">Vraag aan via WhatsApp →</span>
          </a>
          <a class="pass-card pass-card-featured" href="https://wa.me/${site.phoneInternational}?text=${encodeURIComponent('Hallo Montra Thai Massage, ik heb interesse in de strippenkaart van 10× 60 minuten voor €585. Kun je mij hierover meer informatie geven?')}" target="_blank" rel="noopener">
            <span class="pass-kicker">Strippenkaart</span>
            <strong>10× 60 minuten</strong>
            <b>€ 585</b>
            <small>12 maanden geldig</small>
            <span class="pass-link">Vraag aan via WhatsApp →</span>
          </a>
          <a class="pass-card pass-card-gift" href="https://wa.me/${site.phoneInternational}?text=${encodeURIComponent('Hallo Montra Thai Massage, ik heb interesse in een cadeaubon. Kun je mij vertellen welke mogelijkheden er zijn?')}" target="_blank" rel="noopener">
            <span class="pass-kicker">Cadeaubon</span>
            <strong>Geef een massage cadeau</strong>
            <b>Mogelijkheden op aanvraag</b>
            <small>Vraag Montra naar de opties</small>
            <span class="pass-link">Vraag aan via WhatsApp →</span>
          </a>
        </div>
      </section>
    </section>

    <section class="trust-section section-pad" id="over">
      <div class="trust-copy">
        <span class="eyebrow">Over Montra</span>
        <h2>${esc(site.trust.title)}</h2>
        <div class="trust-story">
          <p class="trust-intro">${esc(site.trust.text)}</p>
          <p>${esc(site.trust.secondaryText || '')}</p>
          <p>${esc(site.trust.closingText || '')}</p>
        </div>
      </div>

      <div class="trust-media"><img src="${esc(site.trust.image)}" alt="${esc(site.trust.imageAlt)}" loading="lazy" decoding="async"></div>

      <div class="trust-extra">
        <div class="trust-points">
          <div><span class="trust-number">01</span><strong>Authentieke technieken</strong><span>Traditionele Thaise technieken vormen de basis, met aandacht voor jouw persoonlijke voorkeuren.</span></div>
          <div><span class="trust-number">02</span><strong>Rustige setting</strong><span>Een professionele behandeling in een rustige omgeving, met respect voor jouw grenzen en comfort.</span></div>
          <div><span class="trust-number">03</span><strong>Van ontspanning tot stevig</strong><span>Van Thai Oil en Traditional Thai tot Deep Tissue, sportmassage en gerichte behandelingen.</span></div>
        </div>
      </div>
    </section>

    <section class="gallery-section section-pad"><div class="section-heading"><span class="eyebrow">Sfeer</span><h2>Een rustige indruk van Montra.</h2></div><div class="gallery-grid">${gallery}</div></section>

    <section class="reviews-section section-pad" id="reviews">
      <div class="review-score"><span class="eyebrow">Google reviews</span><div class="score-line"><strong>${site.reviews.rating.toFixed(1)}</strong><span class="stars" aria-hidden="true">★★★★★</span></div><p>${site.reviews.count} Google reviews</p></div>
      <div class="review-copy"><h2>Ervaringen check je rechtstreeks bij Google.</h2><p>${esc(site.reviews.text)} We tonen bewust geen losse reviewteksten die we niet zelfstandig kunnen verifiëren.</p><div class="review-actions"><a class="button button-primary" href="${esc(site.reviews.googleMapsUrl)}" target="_blank" rel="noopener">Bekijk reviews op Google</a><a class="text-link" href="${esc(site.reviews.writeReviewUrl)}" target="_blank" rel="noopener">Schrijf een review ↗</a></div></div>
    </section>

    <section class="booking-band section-pad"><div><span class="eyebrow eyebrow-light">Afspraak aanvragen</span><h2>${esc(site.booking.title)}</h2><p>${esc(site.booking.text)}</p></div><button class="button button-light js-book">Afspraak maken</button></section>

    <section class="contact-section section-pad" id="contact">
      <div class="contact-card"><span class="eyebrow">Contact</span><h2>Montra Thai Massage</h2><a href="tel:+${site.phoneInternational}">${esc(site.phoneDisplay)}</a><a href="mailto:${esc(site.email)}">${esc(site.email)}</a><p>${esc(site.address)}</p><div class="contact-actions"><a class="button button-primary" href="https://wa.me/${site.phoneInternational}" target="_blank" rel="noopener">WhatsApp</a><a class="button button-ghost" href="${esc(site.reviews.googleMapsUrl)}" target="_blank" rel="noopener">Route plannen</a></div><div class="social-links" aria-label="Social en online profielen">${socialLinks}</div><small>KvK ${esc(site.kvk)}</small></div>
      <div class="hours-card"><span class="eyebrow">Openingstijden</span>${openingRows}<p class="hours-note">Afspraak gewenst? Vraag eerst een moment aan; de salon bevestigt de beschikbaarheid.</p></div>
      <div class="map-card"><div class="map-placeholder" data-map><div><span class="map-icon" aria-hidden="true">⌖</span><h3>${esc(streetAddress)}</h3><p>${esc(postalCity)}</p><button class="button button-primary" data-load-map>Kaart laden</button><small>Google Maps wordt pas geladen na jouw keuze.</small></div></div></div>
    </section>
  </main>

  <footer class="site-footer section-pad"><div class="footer-brand"><span class="brand-mark" aria-hidden="true">M</span><div><strong>Montra Thai Massage</strong><p>${esc(site.address)}</p></div></div><div class="footer-links"><button data-legal="terms">Algemene voorwaarden</button><button data-legal="privacy">Privacy & cookies</button><button data-legal="cancellation">Annuleren & afspraken</button><button data-legal="business">Bedrijfsgegevens</button></div><div class="footer-bottom"><span>© 2026 Montra Thai Massage</span><span>${esc(site.noEroticText)}</span></div></footer>

  <div class="mobile-sticky"><button class="button button-primary js-book">Afspraak maken</button></div>

  <dialog class="modal booking-modal" id="booking-modal" aria-labelledby="booking-title">
    <div class="modal-shell"><button class="modal-close" data-close aria-label="Sluiten">×</button><div class="modal-head"><span class="eyebrow">Afspraakaanvraag</span><h2 id="booking-title">Kies je gewenste moment.</h2><p>${esc(site.booking.note)}</p></div><form id="booking-form" novalidate><div class="form-grid"><label><span>Behandeling</span><select id="booking-treatment" required></select></label><label><span>Duur</span><select id="booking-duration" required></select></label><label><span>Datum</span><input id="booking-date" type="date" required></label><label><span>Gewenste tijd</span><select id="booking-time" required></select></label><label class="full"><span>Naam</span><input id="booking-name" type="text" autocomplete="name" required placeholder="Jouw naam"></label><label class="full"><span>Opmerking <em>optioneel</em></span><textarea id="booking-note" rows="3" placeholder="Bijvoorbeeld voorkeur voor druk of aandachtspunt"></textarea></label></div><div class="form-status" id="booking-status" aria-live="polite"></div><button class="button button-primary button-block" type="submit">Verder via WhatsApp</button><small class="form-fineprint">Je aanvraag is pas definitief nadat Montra Thai Massage via WhatsApp heeft bevestigd.</small></form></div>
  </dialog>

  <dialog class="modal treatment-modal" id="treatment-modal" aria-labelledby="treatment-detail-title">
    <div class="modal-shell treatment-detail-shell"><button class="modal-close" data-close aria-label="Sluiten">×</button>
      <div class="treatment-detail-grid">
        <div class="treatment-detail-image"><img id="treatment-detail-image" src="" alt=""></div>
        <div class="treatment-detail-copy"><span class="eyebrow" id="treatment-detail-type"></span><h2 id="treatment-detail-title"></h2><p class="detail-lead" id="treatment-detail-description"></p><div class="detail-facts" id="treatment-detail-facts"></div><div class="detail-best"><strong>Past vooral bij</strong><p id="treatment-detail-best"></p></div><div id="treatment-detail-prices" class="detail-prices"></div><button class="button button-primary" id="treatment-detail-book">Afspraak aanvragen</button></div>
      </div>
    </div>
  </dialog>

  <dialog class="modal legal-modal" id="legal-modal" aria-labelledby="legal-title"><div class="modal-shell legal-shell"><button class="modal-close" data-close aria-label="Sluiten">×</button><div class="modal-head"><span class="eyebrow">Informatie</span><h2 id="legal-title"></h2></div><div class="legal-content" id="legal-content"></div></div></dialog>

  <template id="terms-template">${termsHtml}</template>
  <template id="privacy-template">${privacyHtml}</template>
  <template id="cancellation-template"><section><h3>Afspraak aanvragen</h3><p>Een gekozen moment op deze website is een aanvraag. Montra Thai Massage bevestigt via WhatsApp of het tijdstip beschikbaar is.</p></section><section><h3>Annuleren</h3><p>Bij annulering minder dan 24 uur voor de afspraak behoudt Montra Thai Massage zich het recht voor om kosten in rekening te brengen.</p><p>Bij te late aankomst kan de behandeling worden ingekort zonder prijsreductie.</p></section></template>
  <template id="business-template"><section><h3>Bedrijfsgegevens</h3><p><strong>Montra Thai Massage</strong><br>${esc(site.address)}<br>Telefoon: ${esc(site.phoneDisplay)}<br>E-mail: ${esc(site.email)}<br>KvK: ${esc(site.kvk)}</p></section><section><h3>Dienstverlening</h3><p>Professionele Thaise massagebehandelingen voor ontspanning en welzijn. Geen erotische en/of seksuele diensten.</p></section></template>
  <script id="site-data" type="application/json">${runtimeData}</script>
  <script src="/assets/site.js" defer></script>
</body>
</html>`;

fs.rmSync(path.join(root,'dist'), {recursive:true, force:true});
fs.mkdirSync(path.join(root,'dist','assets'), {recursive:true});
fs.writeFileSync(path.join(root,'dist','index.html'), html);
fs.copyFileSync(path.join(root,'assets','site.css'), path.join(root,'dist','assets','site.css'));
fs.copyFileSync(path.join(root,'assets','site.js'), path.join(root,'dist','assets','site.js'));
const imageDir = path.join(root,'assets','images');
if (fs.existsSync(imageDir)) fs.cpSync(imageDir, path.join(root,'dist','assets','images'), {recursive:true});
fs.copyFileSync(path.join(root,'robots.txt'), path.join(root,'dist','robots.txt'));
fs.copyFileSync(path.join(root,'sitemap.xml'), path.join(root,'dist','sitemap.xml'));
fs.mkdirSync(path.join(root,'dist','data'), {recursive:true});
for (const f of ['site.json','treatments.json','packages.json','legal.json']) fs.copyFileSync(path.join(root,'data',f), path.join(root,'dist','data',f));
console.log('Built dist/index.html');
