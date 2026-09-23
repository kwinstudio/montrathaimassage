(() => {
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const {site, treatments, packages} = data;
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const euro = n => `€ ${Number(n).toFixed(0)}`;

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
  [bookingModal, legalModal].forEach(d => d.addEventListener('click', e => { if(e.target === d){ d.close(); document.body.classList.remove('modal-open'); }}));
  [bookingModal, legalModal].forEach(d => d.addEventListener('close', () => document.body.classList.remove('modal-open')));

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

  qsa('[data-legal]').forEach(btn => btn.addEventListener('click', () => {
    const key = btn.dataset.legal;
    const titles = {terms:'Algemene voorwaarden',privacy:'Privacy & cookies',cancellation:'Annuleren & afspraken',business:'Bedrijfsgegevens'};
    qs('#legal-title').textContent = titles[key];
    qs('#legal-content').innerHTML = qs(`#${key}-template`).innerHTML;
    legalModal.showModal(); document.body.classList.add('modal-open');
  }));

  qs('[data-load-map]')?.addEventListener('click', () => {
    const wrap = qs('[data-map]');
    wrap.innerHTML = `<iframe title="Google Maps locatie Montra Thai Massage" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed"></iframe>`;
  });

  const helper = qs('[data-choice-helper]');
  const helperContent = qs('[data-choice-content]', helper);
  const stepEl = qs('[data-step]', helper);
  const progress = qs('[data-progress]', helper);
  const answers = {};
  const questions = [
    {key:'goal', title:'Waar heb je vooral behoefte aan?', options:[['relax','Rust en ontspanning'],['firm','Stevigere spierbehandeling'],['traditional','Traditionele Thaise technieken'],['upper','Nek, rug of schouders'],['head','Hoofd, nek en rust']]},
    {key:'pressure', title:'Welke druk heeft je voorkeur?', options:[['soft','Zacht tot rustig'],['medium','Gemiddeld'],['firm','Stevig']]},
    {key:'oil', title:'Heb je een voorkeur voor olie?', options:[['yes','Ja, graag met olie'],['no','Liever zonder olie'],['either','Geen voorkeur']]}
  ];
  let step=0;
  function renderQuestion(){
    stepEl.textContent=String(step+1); progress.style.width=`${((step+1)/questions.length)*100}%`;
    const q=questions[step];
    helperContent.innerHTML=`<div class="choice-question"><h3>${q.title}</h3><div class="choice-options">${q.options.map(([v,l])=>`<button type="button" class="choice-option" data-value="${v}">${l}</button>`).join('')}</div></div>`;
    qsa('.choice-option',helperContent).forEach(btn=>btn.addEventListener('click',()=>{answers[q.key]=btn.dataset.value;step++; step<questions.length?renderQuestion():renderResult();}));
  }
  function chooseResult(){
    const byId = id => activeTreatments.find(t=>t.id===id);
    if(answers.goal==='head') return byId('migraine');
    if(answers.goal==='upper') return byId('neck-back-shoulders');
    if(answers.goal==='traditional') return byId('traditional-thai');
    if(answers.goal==='relax') return answers.oil==='no'?byId('traditional-thai'):byId('thai-oil');
    if(answers.goal==='firm') return answers.pressure==='firm' ? byId('deep-tissue') : byId('thai-sport');
    return answers.oil==='yes'?byId('thai-oil'):byId('traditional-thai');
  }
  function renderResult(){
    stepEl.textContent='3';progress.style.width='100%'; const t=chooseResult();
    helperContent.innerHTML=`<div class="choice-result"><span class="eyebrow">Suggestie</span><h3>${t.name}</h3><div class="result-card"><p>${t.description}</p></div><p><small>Dit is alleen een keuzehulp op basis van voorkeuren en geen medisch advies.</small></p><div><button class="button button-primary" id="choice-book">Afspraak aanvragen</button> <button class="button button-ghost" id="choice-restart">Opnieuw kiezen</button></div></div>`;
    qs('#choice-book').addEventListener('click',()=>openBooking(t.id)); qs('#choice-restart').addEventListener('click',()=>{step=0;Object.keys(answers).forEach(k=>delete answers[k]);renderQuestion();});
  }
  renderQuestion();
})();
