(() => {
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const {site, treatments, packages} = data;
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const euro = n => `€ ${Number(n).toFixed(0)}`;

  const stickyCta = qs('.mobile-sticky');
  const updateStickyCta = () => {
    if (!stickyCta) return;
    stickyCta.classList.toggle('is-visible', window.scrollY > Math.max(420, window.innerHeight * .65));
  };
  window.addEventListener('scroll', updateStickyCta, {passive:true});
  window.addEventListener('resize', updateStickyCta);
  updateStickyCta();

  const menuButton = qs('.menu-toggle');
  const mobileMenu = qs('#mobile-menu');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    mobileMenu.hidden = open;
  });
  qsa('#mobile-menu a, #mobile-menu .js-book').forEach(el => el.addEventListener('click', () => { mobileMenu.hidden = true; menuButton?.setAttribute('aria-expanded','false'); }));

  const bookingModal = qs('#booking-modal');
  const legalModal = qs('#legal-modal');
  const treatmentModal = qs('#treatment-modal');
  const treatmentSelect = qs('#booking-treatment');
  const durationSelect = qs('#booking-duration');
  const dateInput = qs('#booking-date');
  const timeSelect = qs('#booking-time');
  const status = qs('#booking-status');
  const nameInput = qs('#booking-name');
  const noteInput = qs('#booking-note');

  const activeTreatments = treatments.filter(t => t.active);
  const bookableItems = [
    ...activeTreatments.map(t => ({type:'treatment', id:t.id, name:t.name, durations:t.durations || []})),
    ...packages.map(p => ({type:'package', id:`package:${p.id}`, name:p.name, durations:[{minutes:p.duration,price:p.price}]}))
  ];
  treatmentSelect.innerHTML = '<option value="">Kies behandeling</option>' + bookableItems.map(x => `<option value="${x.id}">${x.name}</option>`).join('');

  const today = new Date();
  const localIso = new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  dateInput.min = localIso;

  function selectedItem(){ return bookableItems.find(x => x.id === treatmentSelect.value); }
  function updateDurations(){
    const item = selectedItem();
    if (!item) { durationSelect.innerHTML = '<option value="">Kies eerst een behandeling</option>'; durationSelect.disabled = true; updateTimes(); return; }
    if (!item.durations.length) {
      durationSelect.innerHTML = '<option value="contact">Duur & tarief in overleg</option>';
      durationSelect.disabled = false;
    } else {
      durationSelect.innerHTML = '<option value="">Kies duur</option>' + item.durations.map(d => `<option value="${d.minutes}" data-price="${d.price}">${d.minutes} minuten · ${euro(d.price)}</option>`).join('');
      durationSelect.disabled = false;
    }
    updateTimes();
  }

  const toMin = t => { if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
  const minToTime = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  function updateTimes(){
    status.textContent = '';
    const date = dateInput.value ? new Date(`${dateInput.value}T12:00:00`) : null;
    if (!date) { timeSelect.innerHTML = '<option value="">Kies eerst een datum</option>'; timeSelect.disabled = true; return; }
    const hours = site.openingHours.find(h => Number(h.dayIndex) === date.getDay());
    if (!hours?.open) { timeSelect.innerHTML = '<option value="">Gesloten op deze dag</option>'; timeSelect.disabled = true; status.textContent = 'Kies een dag waarop de salon geopend is.'; return; }
    const item = selectedItem();
    const durationVal = durationSelect.value;
    const duration = Number(durationVal) || 30;
    let start = toMin(hours.from), end = toMin(hours.to);
    const slots = [];
    for (let t=start; t+duration<=end; t+=30) slots.push(minToTime(t));
    if (!slots.length) { timeSelect.innerHTML = '<option value="">Geen passend tijdslot</option>'; timeSelect.disabled=true; return; }
    timeSelect.innerHTML = '<option value="">Kies gewenste tijd</option>'+slots.map(t=>`<option value="${t}">${t}</option>`).join('');
    timeSelect.disabled = false;
    if (item && !item.durations.length) status.textContent = 'Voor deze behandeling worden duur en tarief vooraf afgestemd.';
  }
  treatmentSelect.addEventListener('change', updateDurations);
  durationSelect.addEventListener('change', updateTimes);
  dateInput.addEventListener('change', updateTimes);
  updateDurations();

  function openBooking(id){
    if (id) {
      treatmentSelect.value = id;
      updateDurations();
      if (durationSelect.options.length === 2 && durationSelect.options[1]?.value) durationSelect.selectedIndex = 1;
    }
    bookingModal.showModal();
    document.body.classList.add('modal-open');
    setTimeout(() => treatmentSelect.focus(), 30);
  }
  qsa('.js-book').forEach(btn => btn.addEventListener('click', () => openBooking(btn.dataset.treatment || '')));
  qsa('.js-package-book').forEach(btn => btn.addEventListener('click', () => openBooking(`package:${btn.dataset.package}`)));
  qsa('[data-close]').forEach(btn => btn.addEventListener('click', () => { btn.closest('dialog')?.close(); document.body.classList.remove('modal-open'); }));
  [bookingModal, legalModal, treatmentModal].forEach(d => d.addEventListener('click', e => { if(e.target === d){ d.close(); document.body.classList.remove('modal-open'); }}));
  [bookingModal, legalModal, treatmentModal].forEach(d => d.addEventListener('close', () => document.body.classList.remove('modal-open')));

  qs('#booking-form').addEventListener('submit', e => {
    e.preventDefault(); status.textContent = '';
    const item = selectedItem();
    if (!item || !dateInput.value || !timeSelect.value || !nameInput.value.trim()) { status.textContent='Vul behandeling, datum, tijd en naam in.'; return; }
    const durationOption = durationSelect.options[durationSelect.selectedIndex];
    const durationText = durationSelect.value === 'contact' ? 'In overleg' : `${durationSelect.value} minuten`;
    const priceText = durationSelect.value === 'contact' ? 'In overleg' : euro(durationOption?.dataset.price || 0);
    const [y,m,d] = dateInput.value.split('-');
    const lines = [site.booking.whatsappIntro,'',`Behandeling: ${item.name}`,`Duur: ${durationText}`,`Prijs: ${priceText}`,`Datum: ${d}-${m}-${y}`,`Tijd: ${timeSelect.value}`,`Naam: ${nameInput.value.trim()}`];
    if (noteInput.value.trim()) lines.push(`Opmerking: ${noteInput.value.trim()}`);
    lines.push('',site.booking.whatsappOutro);
    window.open(`https://wa.me/${site.phoneInternational}?text=${encodeURIComponent(lines.join('\n'))}`,'_blank','noopener');
  });

  function openTreatmentDetail(id){
    const t = activeTreatments.find(x => x.id === id);
    if (!t) return;
    const image = qs('#treatment-detail-image');
    image.src = t.image;
    image.alt = t.imageAlt || t.name;
    qs('#treatment-detail-type').textContent = t.typeLabel || 'Behandeling';
    qs('#treatment-detail-title').textContent = t.name;
    qs('#treatment-detail-description').textContent = t.description;
    qs('#treatment-detail-best').textContent = t.bestFor || '';
    qs('#treatment-detail-facts').innerHTML = `<span><b>Intensiteit</b>${t.intensity || 'Afgestemd'}</span><span><b>Olie</b>${t.oilLabel || 'In overleg'}</span>`;
    qs('#treatment-detail-prices').innerHTML = t.durations?.length
      ? t.durations.map(d => `<span><b>${d.minutes} min</b>${euro(d.price)}</span>`).join('')
      : '<span><b>Duur & tarief</b>In overleg</span>';
    const book = qs('#treatment-detail-book');
    book.dataset.treatment = t.id;
    treatmentModal.showModal();
    document.body.classList.add('modal-open');
  }

  qsa('.js-treatment-detail').forEach(btn => btn.addEventListener('click', () => openTreatmentDetail(btn.dataset.treatment)));
  qs('#treatment-detail-book')?.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.treatment;
    treatmentModal.close();
    openBooking(id);
  });

  qsa('[data-legal]').forEach(btn => btn.addEventListener('click', () => {
    const key = btn.dataset.legal;
    const titles = {terms:'Algemene voorwaarden',privacy:'Privacy & cookies',cancellation:'Annuleren & afspraken',business:'Bedrijfsgegevens'};
    qs('#legal-title').textContent = titles[key];
    qs('#legal-content').innerHTML = qs(`#${key}-template`).innerHTML;
    legalModal.showModal(); document.body.classList.add('modal-open');
  }));

  qs('[data-load-map]')?.addEventListener('click', () => {
    const wrap = qs('[data-map]');
    wrap.classList.add('is-loaded');
    wrap.innerHTML = `<iframe title="Google Maps locatie Montra Thai Massage" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed"></iframe>`;
  });

  const helper = qs('[data-choice-helper]');
  const helperContent = qs('[data-choice-content]', helper);
  const stepEl = qs('[data-step]', helper);
  const progress = qs('[data-progress]', helper);
  const answers = {};
  const questions = [
    {key:'goal', title:'Wat wil je vooral uit de massage halen?', options:[
      ['relax','Volledig ontspannen','Rust in mijn hoofd en lichaam'],
      ['muscles','Vastzittende spieren aanpakken','Ik wil duidelijk spierwerk voelen'],
      ['mobility','Meer ruimte en beweging','Stretching en traditionele technieken'],
      ['upper','Nek, rug of schouders','Daar zit mijn meeste spanning'],
      ['head','Hoofd en nek tot rust brengen','Rustige aandacht voor bovenlichaam']
    ]},
    {key:'area', title:'Waar wil je vooral aandacht voor?', options:[
      ['full','Mijn hele lichaam','Een complete behandeling'],
      ['upper','Nek, rug en schouders','Vooral mijn bovenlichaam'],
      ['legs','Benen en sportspieren','Na sporten of fysieke belasting'],
      ['head','Hoofd, nek en schouders','Rustig en gericht'],
      ['specific','Een specifieke gespannen plek','Gerichte spierbehandeling']
    ]},
    {key:'pressure', title:'Hoe stevig mag de massage zijn?', options:[
      ['soft','Zacht','Ik wil vooral ontspannen'],
      ['medium','Gemiddeld','Voelbaar maar comfortabel'],
      ['firm','Stevig','Er mag goed druk worden gezet'],
      ['intense','Heel stevig','Ik kies bewust voor intensief'],
      ['either','Geen voorkeur','Ik laat Ratree afstemmen']
    ]},
    {key:'oil', title:'Wat vind je prettig qua olie?', options:[
      ['yes','Graag met olie','Vloeiend en ontspannend'],
      ['no','Liever zonder olie','Traditioneler of gerichter'],
      ['either','Maakt mij niet uit','Kies wat het beste past'],
      ['unsure','Weet ik nog niet','Ik sta open voor advies']
    ]},
    {key:'context', title:'Welke situatie past het beste bij vandaag?', options:[
      ['desk','Veel zitten of kantoorwerk','Spanning bouwt op in mijn bovenlichaam'],
      ['sport','Sport of fysieke belasting','Mijn spieren hebben veel gedaan'],
      ['stress','Stress of behoefte aan rust','Ik wil vooral ontprikkelen'],
      ['traditional','Ik wil echt Thaise technieken ervaren','Drukpunten en stretching spreken mij aan'],
      ['oncology','Tijdens of na een oncologisch traject','Ik wil eerst zorgvuldig afstemmen']
    ]}
  ];
  let step=0;

  function resetChoice(){
    step=0;
    Object.keys(answers).forEach(k=>delete answers[k]);
    renderQuestion();
  }

  function renderQuestion(){
    const q=questions[step];
    stepEl.textContent=String(step+1);
    progress.style.width=`${((step+1)/questions.length)*100}%`;
    helperContent.innerHTML=`<div class="choice-question"><h3>${q.title}</h3><div class="choice-options">${q.options.map(([v,l,s])=>`<button type="button" class="choice-option" data-value="${v}"><strong>${l}</strong><span>${s}</span></button>`).join('')}</div></div>`;
    qsa('.choice-option',helperContent).forEach(btn=>btn.addEventListener('click',()=>{
      answers[q.key]=btn.dataset.value;
      step++;
      step<questions.length?renderQuestion():renderResult();
    }));
  }

  function chooseResult(){
    const scores = Object.fromEntries(activeTreatments.map(t => [t.id,0]));
    const add=(id,n)=>{ if(id in scores) scores[id]+=n; };
    if(answers.context==='oncology') return activeTreatments.find(t=>t.id==='oncology');

    const goalMap={
      relax:[['thai-oil',6],['migraine',2]],
      muscles:[['deep-tissue',6],['thai-sport',4]],
      mobility:[['traditional-thai',7],['thai-sport',2]],
      upper:[['neck-back-shoulders',7],['deep-tissue',2]],
      head:[['migraine',7],['neck-back-shoulders',2]]
    };
    const areaMap={
      full:[['thai-oil',3],['traditional-thai',3],['deep-tissue',2]],
      upper:[['neck-back-shoulders',6],['deep-tissue',2],['migraine',1]],
      legs:[['thai-sport',6],['deep-tissue',2]],
      head:[['migraine',7],['neck-back-shoulders',2]],
      specific:[['deep-tissue',4],['neck-back-shoulders',3],['thai-sport',2]]
    };
    const pressureMap={
      soft:[['thai-oil',4],['migraine',4]],
      medium:[['traditional-thai',4],['neck-back-shoulders',3],['thai-oil',2]],
      firm:[['deep-tissue',5],['thai-sport',4],['traditional-thai',2]],
      intense:[['deep-tissue',7],['thai-sport',4]],
      either:[]
    };
    const oilMap={
      yes:[['thai-oil',5],['deep-tissue',3]],
      no:[['traditional-thai',4],['neck-back-shoulders',3],['migraine',2],['thai-sport',2]],
      either:[],
      unsure:[['thai-oil',1],['traditional-thai',1]]
    };
    const contextMap={
      desk:[['neck-back-shoulders',6],['deep-tissue',2]],
      sport:[['thai-sport',7],['deep-tissue',3]],
      stress:[['thai-oil',6],['migraine',2]],
      traditional:[['traditional-thai',8]]
    };
    [goalMap[answers.goal],areaMap[answers.area],pressureMap[answers.pressure],oilMap[answers.oil],contextMap[answers.context]]
      .filter(Boolean).flat().forEach(([id,n])=>add(id,n));

    const priority=['thai-oil','neck-back-shoulders','deep-tissue','traditional-thai','thai-sport','migraine','oncology'];
    return [...activeTreatments].sort((a,b)=>{
      const diff=(scores[b.id]||0)-(scores[a.id]||0);
      return diff || priority.indexOf(a.id)-priority.indexOf(b.id);
    })[0];
  }

  function renderResult(){
    stepEl.textContent='5';
    progress.style.width='100%';
    const t=chooseResult();
    const special=t.id==='oncology';
    helperContent.innerHTML=`<div class="choice-result"><span class="eyebrow">${special?'Eerst persoonlijk afstemmen':'Jouw beste match'}</span><h3>${t.name}</h3><div class="result-type">${t.typeLabel || ''}</div><div class="result-card"><p>${t.description}</p><div class="result-facts"><span>${t.intensity || ''}</span><span>${t.oilLabel || ''}</span></div></div><p><small>${special?'Bespreek je situatie eerst met Ratree. Deze keuzehulp geeft geen medisch advies.':'Deze suggestie is gebaseerd op je vijf antwoorden en is geen medische diagnose.'}</small></p><div class="choice-result-actions"><button class="button button-primary" id="choice-book">${special?'Neem contact op':'Afspraak aanvragen'}</button><button class="button button-ghost" id="choice-detail">Bekijk behandeling</button><button class="text-link" id="choice-restart">Opnieuw kiezen</button></div></div>`;
    qs('#choice-book').addEventListener('click',()=>openBooking(t.id));
    qs('#choice-detail').addEventListener('click',()=>openTreatmentDetail(t.id));
    qs('#choice-restart').addEventListener('click',resetChoice);
  }

  function startChoiceFromHero(value){
    Object.keys(answers).forEach(k=>delete answers[k]);
    if(value && value!=='help'){
      answers.goal=value;
      step=1;
    }else{
      step=0;
    }
    renderQuestion();
    qs('#keuzehulp')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  qsa('[data-hero-choice]').forEach(btn=>btn.addEventListener('click',()=>startChoiceFromHero(btn.dataset.heroChoice)));
  qsa('.js-start-choice').forEach(link=>link.addEventListener('click',()=>{ if(step>=questions.length) resetChoice(); }));
  renderQuestion();
})();
