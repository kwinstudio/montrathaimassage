# Montra Thai Massage — website

Productieklare statische website voor Montra Thai Massage in Zoetermeer.

## Workflow

Pages CMS → GitHub `main` → Vercel.

De klant past alleen content aan in `data/*.json` via Pages CMS. De layout en interactie blijven in code beschermd.

## Belangrijkste bestanden

- `data/site.json` — hero, contact, openingstijden, reviews, SEO en galerij
- `data/treatments.json` — behandelingen, duur en prijzen
- `data/packages.json` — Montra Touch / Montra Bliss
- `data/legal.json` — voorwaarden en privacytekst
- `.pages.yml` — CMS-velden
- `assets/site.css` — ontwerp
- `assets/site.js` — menu, keuzehulp, reserveringsmodal, WhatsApp, kaart en juridische modals
- `build.mjs` — maakt de deploybare `dist/` map

## Lokaal testen

```bash
npm run build
npm run preview
```

Open daarna `http://localhost:4173`.

## Voor livegang controleren

1. Bevestig de zondagopeningstijd. De huidige website noemt 10:00–19:00; de Google-vermelding is afwijkend.
2. Kopieer de bestaande salonfoto's bij voorkeur naar `assets/images/` en vervang daarna de externe afbeeldings-URL's in de JSON via Pages CMS. Zo is de nieuwe site niet afhankelijk van de oude hosting.
3. Laat de juridische teksten door de ondernemer controleren, met name annulering, aansprakelijkheid en privacy.
4. Controleer alle WhatsApp-, telefoon-, Maps- en e-maillinks op mobiel.
