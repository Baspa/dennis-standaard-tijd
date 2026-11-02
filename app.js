(() => {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PHRASES = [
    {id:'bijna',    label:'Ik ben er bijna',             short:'BIJNA',       claim:5,  bias:2.2, sigma:.6,  bubble:'Ben er bijnaaa!'},
    {id:'vijf',     label:'Over 5 minuutjes',            short:'5 MINUUTJES', claim:5,  bias:1.5, sigma:.55, bubble:'5 minuutjes!'},
    {id:'kwartier', label:'Over een kwartiertje',        short:'KWARTIERTJE', claim:15, bias:1,   sigma:.5,  bubble:'Kwartiertje!'},
    {id:'halfuur',  label:'Ik ben er over een half uur', short:'HALF UUR',    claim:30, bias:1,   sigma:.45, bubble:'Ben er over een half uur!'},
    {id:'onderweg', label:'Ben onderweg',                short:'ONDERWEG',    claim:15, bias:1.1, sigma:.5,  bubble:'Onderweg!'},
    {id:'vertrek',  label:'Ik vertrek nu',               short:'VERTREKT NU', claim:20, bias:1,   sigma:.55, bubble:'Vertrek nu!'},
    {id:'eigen',    label:'Iets anders',                 short:null,          claim:null, bias:1, sigma:.5,  bubble:null}
  ];

  const REMARKS = ['KIPPEN NOG VOEREN','MOESTUIN WATER GEVEN','ZOEKT ZIJN SLEUTELS','NOG EEN FILMPJE','ZIT NOG IN TUINSTOEL','MUTS KWIJT (OP HOOFD)','NOG EVEN TANKEN','TELEFOON OP 3%','BUURMAN KWAM LANGS','SCHOEN KWIJT (1 VAN 2)','DACHT: HET IS MORGEN'];
  const EXCUSES = ['De kippen moesten nog eten.','De moestuin moest nog water.','Zoekt zijn muts. Hij heeft hem op.','Nog één filmpje.','Buurman kwam even buurten.','Telefoon op 3%. Zoekt een oplader.','Moet nog even tanken.','Eén schoen kwijt.'];

  const STORY = [
    {p:0,    text:c => `Appt: “${c.label}”`, say:c => c.bubble},
    {p:.07,  text:() => 'Leest zijn eigen bericht terug. Tevreden.'},
    {p:.16,  text:() => 'Zit nog in de tuinstoel. Bevestigd door tuincamera.'},
    {p:.28,  text:c => c.ex[0]},
    {p:.4,   text:() => 'Staat op. Gaat weer zitten.'},
    {p:.5,   text:() => 'Rijdt terug: portemonnee vergeten.'},
    {p:.63,  text:c => c.ex[1]},
    {p:.76,  text:() => 'Live locatie beweegt! Richting snackbar.'},
    {p:.9,   text:() => 'Appt: “bijna!!”', say:() => 'bijna!!'},
    {p:1,    text:() => 'Beste gok bereikt. Kijk eens uit het raam.'},
    {p:1.3,  text:() => 'Nog niks. Valt binnen de marge.'},
    {p:1.7,  text:() => 'Dennis is officieel een uitschieter.'}
  ];

  const SEED = [
    {date:'za 31 okt', said:'Ik ben er over een half uur', claim:30, actual:100, example:true},
    {date:'do 22 okt', said:'Ik ben er bijna',             claim:5,  actual:38,  example:true},
    {date:'za 17 okt', said:'Over 5 minuutjes',            claim:5,  actual:22,  example:true},
    {date:'vr 9 okt',  said:'Ik vertrek nu',               claim:20, actual:64,  example:true},
    {date:'zo 4 okt',  said:'Over een kwartiertje',        claim:15, actual:15,  example:true},
    {date:'za 26 sep', said:'Ben onderweg',                claim:15, cancelled:true, example:true},
    {date:'vr 18 sep', said:'Ik ben er over een half uur', claim:30, actual:75,  example:true}
  ];

  const STORAGE_KEY = 'dennis-logboek';

  function loadLog(){
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) return saved.map(e => ({...e, fresh:false}));
    } catch {}
    return SEED.map(e => ({...e}));
  }
  function saveLog(){
    // Storage can be blocked (private mode); the log then only lives for this visit.
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.log)); } catch {}
  }

  const state = {phraseId:'halfuur', log:loadLog(), run:null, offset:0};

  const pad = n => String(n).padStart(2,'0');
  const now = () => Date.now() + state.offset;
  const hhmm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const addMin = (t, m) => t + m*60000;
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const shuffle = a => { for (let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
  const gauss = () => Math.sqrt(-2*Math.log(1-Math.random())) * Math.cos(2*Math.PI*Math.random());
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtF = f => '×' + f.toFixed(1).replace('.', ',');
  const pct = x => x < .01 ? '<1%' : `${Math.round(x*100)}%`;
  function fmtDur(m){
    m = Math.round(Math.abs(m));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m/60), r = m % 60;
    return r ? `${h} u ${r} min` : `${h} uur`;
  }
  function hms(sec){
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec/3600), mi = Math.floor(sec % 3600 / 60), s = sec % 60;
    return h ? `${h}:${pad(mi)}:${pad(s)}` : `${mi}:${pad(s)}`;
  }
  const DAYS = ['zo','ma','di','wo','do','vr','za'];
  const MONTHS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  const dayLabel = t => { const d = new Date(t); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

  function stats(log){
    const done = log.filter(e => !e.cancelled);
    const logs = done.map(e => Math.log(Math.max(e.actual, 1) / e.claim));
    const F = logs.length ? Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length) : 2.5;
    const lates = done.map(e => Math.max(0, e.actual - e.claim));
    const cancels = log.length - done.length;
    return {
      F,
      avgLate: lates.length ? lates.reduce((a, b) => a + b, 0) / lates.length : 0,
      record: lates.length ? Math.max(...lates) : 0,
      onTime: done.filter(e => e.actual <= e.claim).length,
      done: done.length, n: log.length, cancels,
      cancelRate: Math.max(.03, log.length ? cancels / log.length : .1)
    };
  }

  function predict(claim, phrase, st){
    const median = claim * st.F * phrase.bias;
    const N = 4000, s = new Float64Array(N);
    for (let i = 0; i < N; i++) s[i] = median * Math.exp(phrase.sigma * gauss());
    s.sort();
    let on = 0;
    for (const v of s) if (v <= claim) on++;
    const q = f => s[Math.floor(f*(N-1))];
    return {median, samples:s, p10:q(.1), p25:q(.25), p75:q(.75), p90:q(.9), onTime:on/N, cancel:st.cancelRate};
  }

  const CH = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:+-%().';
  function flap(el, text, len){
    text = String(text).toUpperCase().padEnd(len, ' ').slice(0, len);
    if (el.children.length !== len){
      el.textContent = '';
      for (let i = 0; i < len; i++){ const s = document.createElement('span'); s.setAttribute('aria-hidden','true'); s.textContent = ' '; el.appendChild(s); }
    }
    el.setAttribute('aria-label', text.trim() || 'leeg');
    [...el.children].forEach((s, i) => {
      clearTimeout(s._t);
      const target = text[i];
      if (reduce){ s.textContent = target; return; }
      let n = 3 + i + Math.floor(Math.random()*6);
      const step = () => {
        s.classList.remove('flip'); void s.offsetWidth; s.classList.add('flip');
        if (n-- <= 0){ s.textContent = target; return; }
        s.textContent = CH[Math.floor(Math.random()*CH.length)];
        s._t = setTimeout(step, 55);
      };
      step();
    });
  }

  const bubble = $('#bubble');
  let bubbleT;
  function say(text, hold = 5200){
    clearTimeout(bubbleT);
    bubble.hidden = false;
    bubble.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    bubbleT = setTimeout(() => {
      bubble.textContent = text;
      bubbleT = setTimeout(() => { bubble.hidden = true; }, hold);
    }, reduce ? 0 : 900);
  }
  const setStatus = t => { $('#status').textContent = t; };

  const chips = $('#chips');
  PHRASES.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.id = 'chip-' + p.id; b.dataset.id = p.id;
    b.textContent = p.id === 'eigen' ? 'Iets anders…' : `“${p.label}”`;
    chips.appendChild(b);
  });
  function selectPhrase(id){
    state.phraseId = id;
    chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    $('#customField').hidden = id !== 'eigen';
  }
  chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) selectPhrase(b.dataset.id); });

  function parseSent(){
    const v = $('#sentAt').value;
    const t = now();
    if (!/^\d{2}:\d{2}/.test(v)) return t;
    const [h, mi] = v.split(':').map(Number);
    const d = new Date(t); d.setHours(h, mi, 0, 0);
    if (d.getTime() - t > 6*3600e3) d.setDate(d.getDate() - 1);
    return d.getTime();
  }

  function start(){
    const ph = PHRASES.find(p => p.id === state.phraseId);
    let {claim, label, short, bubble: bub} = ph;
    if (ph.id === 'eigen'){
      const n = Math.min(600, Math.max(1, parseInt($('#customMin').value, 10) || 30));
      claim = n; label = `Ik ben er over ${n} minuten`; short = `${n} MINUTEN`; bub = `Ben er over ${n} min!`;
    }
    const st = stats(state.log);
    const pred = predict(claim, ph, st);
    const ctx = {label, bubble:bub, ex:shuffle(EXCUSES.slice())};
    state.run = {
      label, short, claim, sentAt:parseSent(), median:pred.median, pred,
      remark:pick(REMARKS), status:'tracking',
      story:STORY.map(s => ({p:s.p, text:s.text(ctx), say:s.say ? s.say(ctx) : null, fired:false}))
    };
    $('#events').innerHTML = '';
    $('#stage').classList.remove('is-gone','is-staying');
    setButtons(true);
    renderBoard();
    renderFacts();
    drawChart();
    tick();
  }

  function renderBoard(){
    const r = state.run;
    flap($('#fSaid'), r.short, 11);
    flap($('#fPromise'), hhmm(addMin(r.sentAt, r.claim)), 5);
    flap($('#fExpect'), hhmm(addMin(r.sentAt, r.median)), 5);
    flap($('#fDelay'), '+' + Math.round(r.median - r.claim), 4);
    flap($('#fNote'), r.remark, 22);
  }

  function renderFacts(){
    const r = state.run, p = r.pred, t = m => hhmm(addMin(r.sentAt, m));
    $('#kMed').textContent = t(r.median);
    $('#kRange').textContent = `${t(p.p10)}–${t(p.p90)}`;
    $('#kOn').textContent = pct(p.onTime);
    $('#kCan').textContent = pct(p.cancel);
    $('#pctBody').innerHTML = [[.1,p.p10],[.25,p.p25],[.5,r.median],[.75,p.p75],[.9,p.p90]]
      .map(([k, m]) => `<tr><td>${Math.round(k*100)}%</td><td>${t(m)}</td></tr>`).join('');
  }

  const chart = $('#chart'), chartBox = $('#chartBox'), tip = $('#tip');
  let cd = null;
  function drawChart(){
    const r = state.run; if (!r) return;
    const W = Math.max(300, Math.round(chartBox.clientWidth - 28)), H = 270;
    const m = {l:44, r:18, t:58, b:34};
    const s = r.pred.samples, N = s.length;
    const hi = Math.max(s[Math.floor(N*.97)], r.claim*1.25);
    const maxBins = W < 480 ? 16 : 26;
    const bin = [2,5,10,15,20,30,60].find(b => hi/b <= maxBins) || 60;
    const nb = Math.ceil(hi/bin), xMax = nb*bin;
    const counts = new Array(nb).fill(0);
    for (const v of s) counts[Math.min(nb-1, Math.floor(v/bin))]++;
    const maxP = Math.max(...counts)/N;
    const yStep = [.01,.02,.05,.1,.2].find(st => Math.ceil(maxP/st) <= 5) || .25;
    const yMax = Math.ceil(maxP/yStep)*yStep;
    const X = v => m.l + v/xMax*(W - m.l - m.r);
    const Y = p => H - m.b - p/yMax*(H - m.t - m.b);
    const base = H - m.b;
    let g = '';
    const zw = X(Math.min(r.claim, xMax)) - X(0);
    g += `<rect x="${X(0)}" y="${m.t}" width="${zw}" height="${base - m.t}" fill="var(--zone)"/>`;
    if (zw > 56) g += `<text class="zl" x="${X(0) + 8}" y="${m.t + 18}">OP TIJD</text>`;
    for (let i = 1; i*yStep <= yMax + 1e-9; i++){
      const y = Y(i*yStep);
      g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}"/><text class="ax" x="${m.l - 8}" y="${y + 4}" text-anchor="end">${Math.round(i*yStep*100)}%</text>`;
    }
    counts.forEach((c, i) => {
      const x0 = X(i*bin) + 1, w = Math.max(1, X((i+1)*bin) - X(i*bin) - 2);
      if (c){
        const y0 = Y(c/N), rr = Math.min(4, w/2, base - y0);
        g += `<path class="bar" data-i="${i}" d="M${x0} ${base}V${y0 + rr}Q${x0} ${y0} ${x0 + rr} ${y0}H${x0 + w - rr}Q${x0 + w} ${y0} ${x0 + w} ${y0 + rr}V${base}Z"/>`;
      }
    });
    g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${base}" y2="${base}"/>`;
    const ts = [5,10,15,30,60,120,240].find(t => xMax/t <= Math.floor((W - m.l - m.r)/72)) || 240;
    for (let t = 0; t <= xMax + 1e-9; t += ts){
      g += `<line class="tick" x1="${X(t)}" x2="${X(t)}" y1="${base}" y2="${base + 5}"/><text class="ax" x="${X(t)}" y="${base + 21}" text-anchor="middle">${hhmm(addMin(r.sentAt, t))}</text>`;
    }
    const mk = (v, cls, label, y) => {
      const x = X(Math.min(v, xMax));
      const a = x < m.l + 70 ? 'start' : x > W - m.r - 70 ? 'end' : 'middle';
      return `<line class="${cls}" x1="${x}" x2="${x}" y1="${m.t - 6}" y2="${base}"/><text class="mk" x="${x}" y="${y}" text-anchor="${a}">${label}</text>`;
    };
    g += mk(r.claim, 'm-claim', `belooft ${hhmm(addMin(r.sentAt, r.claim))}`, m.t - 34);
    g += mk(r.median, 'm-med', `beste gok ${hhmm(addMin(r.sentAt, r.median))}`, m.t - 14);
    counts.forEach((c, i) => {
      const x0 = X(i*bin);
      g += `<rect class="hit" data-i="${i}" x="${x0}" y="${m.t}" width="${X((i+1)*bin) - x0}" height="${base - m.t}" fill="transparent"/>`;
    });
    chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
    chart.setAttribute('width', W); chart.setAttribute('height', H);
    chart.innerHTML = g;
    cd = {counts, N, bin, X, Y, W, H};
  }
  function showTip(i){
    const c = cd.counts[i], r = state.run;
    const from = addMin(r.sentAt, i*cd.bin), last = i === cd.counts.length - 1;
    tip.innerHTML = `${hhmm(from)}–${last ? 'later' : hhmm(addMin(r.sentAt, (i+1)*cd.bin))}<br><b>${(c/cd.N*100).toFixed(1).replace('.', ',')}%</b> kans`;
    const sr = chart.getBoundingClientRect(), br = chartBox.getBoundingClientRect();
    const k = sr.width / cd.W;
    const cx = sr.left - br.left + cd.X((i + .5)*cd.bin)*k;
    const cy = sr.top - br.top + cd.Y(c/cd.N)*k - 10;
    tip.style.left = Math.min(Math.max(cx, 70), br.width - 70) + 'px';
    tip.style.top = cy + 'px';
    tip.hidden = false;
    chart.classList.add('hovering');
    chart.querySelectorAll('.bar').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
  }
  function hideTip(){ tip.hidden = true; chart.classList.remove('hovering'); }
  chart.addEventListener('pointermove', e => { const h = e.target.closest && e.target.closest('.hit'); h ? showTip(+h.dataset.i) : hideTip(); });
  chart.addEventListener('pointerleave', hideTip);
  let rz;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(drawChart, 120); }).observe(chartBox);

  function addEvent(t, text, cls = ''){
    const list = $('#events');
    list.querySelectorAll('.new').forEach(li => li.classList.remove('new'));
    const li = document.createElement('li');
    li.className = 'new ' + cls;
    li.innerHTML = `<time>${hhmm(t)}</time><span>${esc(text)}</span>`;
    list.prepend(li);
    while (list.children.length > 7) list.lastElementChild.remove();
  }
  function shown(p){
    if (p < .5) return p*.9;
    if (p < .6) return .45 - (p - .5)*1.6;
    return Math.min(.96, .29 + (p - .6)*(.67/.4));
  }
  function setButtons(on){ ['#btnArrive','#btnCancel','#btnFF'].forEach(s => { $(s).disabled = !on; }); }

  function tick(){
    const t = now(), d = new Date(t);
    $('#camClock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const r = state.run;
    if (!r || r.status !== 'tracking') return;
    const el = (t - r.sentAt)/60000, p = el / r.median;
    let latestSay = null;
    r.story.forEach(ev => {
      if (!ev.fired && p >= ev.p){
        ev.fired = true;
        addEvent(addMin(r.sentAt, ev.p*r.median), ev.text);
        setStatus(ev.text);
        if (ev.say) latestSay = ev.say;
      }
    });
    if (latestSay) say(latestSay);
    const left = r.median - el;
    const box = $('#countBox');
    if (left >= 0){
      $('#count').textContent = hms(left*60);
      $('#countLbl').textContent = 'tot Dennis voor de deur staat (beste gok)';
      box.classList.remove('over');
    } else {
      $('#count').textContent = '+' + hms(-left*60);
      $('#countLbl').textContent = 'over de beste gok heen. Rustig blijven.';
      box.classList.add('over');
    }
    const promLeft = r.claim - el;
    $('#promise').textContent = promLeft > 0
      ? `Volgens Dennis zelf: nog ${fmtDur(promLeft)}.`
      : `Volgens Dennis zelf was hij er ${fmtDur(-promLeft)} geleden al.`;
    $('#pin').style.left = `calc(18px + ${shown(p).toFixed(4)} * (100% - 36px))`;
  }

  function arrive(){
    const r = state.run; if (!r || r.status !== 'tracking') return;
    const t = now();
    const actual = Math.max(0, Math.round((t - r.sentAt)/60000));
    const late = actual - r.claim;
    r.status = 'arrived';
    state.log.forEach(e => { e.fresh = false; });
    state.log.unshift({date:dayLabel(t), said:r.label, claim:r.claim, actual, fresh:true});
    const verdict = actual < r.pred.p25 ? 'Sneller dan het model. Verdacht.'
      : actual <= r.pred.p75 ? 'Keurig binnen de marge van het model.'
      : 'Zelfs het model is verrast.';
    const msg = late <= 0 ? 'Dennis is op tijd. Laat dit notarieel vastleggen.' : `Dennis is binnen, ${fmtDur(late)} te laat. ${verdict}`;
    addEvent(t, msg, 'end');
    flap($('#fDelay'), late <= 0 ? '0' : '+' + late, 4);
    flap($('#fNote'), late <= 0 ? 'OP TIJD (?!)' : `BINNEN: +${late} MIN`, 22);
    $('#stage').classList.add('is-gone');
    bubble.hidden = true; clearTimeout(bubbleT);
    setStatus('Tuinstoel verlaten. Dit is geen oefening.');
    $('#count').textContent = hms((t - r.sentAt)/1000);
    $('#countLbl').textContent = 'onderweg geweest, alles bij elkaar';
    $('#countBox').classList.remove('over');
    $('#pin').style.left = 'calc(100% - 18px)';
    setButtons(false);
    saveLog();
    renderLog();
  }

  function cancel(){
    const r = state.run; if (!r || r.status !== 'tracking') return;
    const t = now();
    r.status = 'cancelled';
    state.log.forEach(e => { e.fresh = false; });
    state.log.unshift({date:dayLabel(t), said:r.label, claim:r.claim, cancelled:true, fresh:true});
    addEvent(t, 'Afgezegd. De kippen gingen voor.', 'end');
    flap($('#fExpect'), '--:--', 5);
    flap($('#fDelay'), '', 4);
    flap($('#fNote'), 'AFGEZEGD', 22);
    $('#stage').classList.add('is-staying');
    say('Volgende keer!', 6000);
    setStatus('Blijft zitten. Benen omhoog.');
    $('#countLbl').textContent = 'Dennis komt niet meer. Het model wist het.';
    setButtons(false);
    saveLog();
    renderLog();
  }

  function renderLog(){
    const st = stats(state.log);
    $('#factor').textContent = fmtF(st.F);
    $('#factorHint').textContent = `Rekent met de Dennis-factor uit het logboek: nu ${fmtF(st.F)}.`;
    $('#sAvg').textContent = fmtDur(st.avgLate);
    $('#sRec').textContent = '+' + fmtDur(st.record);
    $('#sOn').textContent = `${st.onTime} van ${st.done}`;
    $('#sCan').textContent = `${st.cancels} van ${st.n}`;
    $('#exampleNote').hidden = !state.log.some(e => e.example);
    if (!state.log.length){
      $('#logBody').innerHTML = '<tr><td colspan="6">Nog geen metingen. Druk op “Dennis staat voor de deur” zodra hij er is.</td></tr>';
      return;
    }
    $('#logBody').innerHTML = state.log.map(e => {
      const late = e.cancelled ? null : e.actual - e.claim;
      const lateCell = e.cancelled ? '–' : late <= 0 ? '<span class="pill">op tijd</span>' : `<span class="late">+${fmtDur(late)}</span>`;
      return `<tr class="${e.fresh ? 'fresh' : ''}"><td>${esc(e.date)}${e.example ? '<span class="tag">voorbeeld</span>' : ''}</td><td>“${esc(e.said)}”</td><td>${fmtDur(e.claim)}</td><td>${e.cancelled ? 'afgezegd' : fmtDur(e.actual)}</td><td>${lateCell}</td><td>${e.cancelled ? '–' : fmtF(Math.max(e.actual, 1)/e.claim)}</td></tr>`;
    }).join('');
  }

  $('#ask').addEventListener('submit', e => { e.preventDefault(); start(); });
  $('#btnArrive').addEventListener('click', arrive);
  $('#btnCancel').addEventListener('click', cancel);
  $('#btnFF').addEventListener('click', () => { state.offset += 10*60000; tick(); });

  $('#btnClearExamples').addEventListener('click', () => {
    state.log = state.log.filter(e => !e.example);
    saveLog();
    renderLog();
  });

  selectPhrase('halfuur');
  $('#sentAt').value = hhmm(now());
  renderLog();
  start();
  setInterval(tick, 1000);
})();
