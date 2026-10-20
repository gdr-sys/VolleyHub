// Segnapunti a bordo campo: punto per punto o risultato finale, per una sola partita
import { getStore } from './store.js';
import { esc, catIcona, catNome, normalizzaTorneo, trovaPartita, risolviTabellone, squadraDi, regoleDi, setDa, setPerDb, validaSet, esito, isFinita, plurale } from './core.js';
import { icon, toast, modal, applicaTema } from './ui.js';

applicaTema();
const qs = new URLSearchParams(location.search);
const TID = qs.get('t'), MID = qs.get('m'), TOKEN = qs.get('k');
const app = document.getElementById('app');

const P = { store: null, t: null, ris: {}, modo: 'live', set: 0, sets: null, inverti: false, stato: 'ok', fatto: false, pronto: false };
let invio = null, inVolo = false;

function errore(titolo, testo) {
  app.innerHTML = `<div class="sg-msg"><img src="assets/logo-mark.svg" alt="" width="56" height="56"><h1>${esc(titolo)}</h1><p>${esc(testo)}</p></div>`;
}

async function avvio() {
  if (!TID || !MID || !TOKEN) { errore('Link incompleto', 'Chiedi all\'organizzatore di inviarti di nuovo il link del segnapunti.'); return; }
  try {
    P.store = await getStore();
    await P.store.claimArbitro(TID, MID, TOKEN);
  } catch (e) {
    console.error(e);
    if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/admin-restricted-operation') errore('Segnapunti non attivo', 'L\'organizzatore deve abilitare l\'accesso anonimo in Firebase (vedi le istruzioni di VolleyHub).');
    else if (e.code === 'permission-denied') errore('Link non valido', 'Questo link non corrisponde a nessuna partita. Chiedi un nuovo link all\'organizzatore.');
    else errore('Connessione assente', 'Non riesco a raggiungere il server. Controlla la connessione e ricarica la pagina.');
    return;
  }
  P.store.watchTorneo(TID, d => { P.t = d ? normalizzaTorneo(d) : null; disegna(); }, () => errore('Torneo non disponibile', 'Il torneo non esiste più.'));
  P.store.watchRisultati(TID, r => {
    P.ris = r;
    if (P.modo !== 'live' && document.activeElement?.matches('.sg-form input')) return;
    // Se un altro dispositivo aggiorna il punteggio, lo seguiamo (salvo modifiche nostre in attesa)
    if (!invio && !inVolo) P.sets = null;
    disegna();
  }, () => {});
}

function partita() {
  const t = P.t;
  if (!t) return null;
  const f = trovaPartita(t, MID);
  if (!f) return null;
  const reg = regoleDi(t, f.cat);
  if (f.tipo === 'girone') {
    const g = f.girone, p = f.match;
    return { cat: f.cat, fase: f.fase, etichetta: `Girone ${g.nome}`, campo: p.campo || g.campo, h: squadraDi(g, p.h), a: squadraDi(g, p.a), nSet: g.set, timer: g.timer, elim: false, pronta: true };
  }
  const x = risolviTabellone(f.fase, P.ris).tutte.find(k => k.id === MID);
  return { cat: f.cat, fase: f.fase, etichetta: x.etichetta, campo: f.fase.campi?.[MID] || '', h: x.h, a: x.a, hLabel: x.hLabel, aLabel: x.aLabel, nSet: f.fase.tabellone.set, timer: reg.timer, elim: true, pronta: x.pronta };
}

function setCorrenti(p) {
  if (!P.sets) {
    const s = setDa(P.ris[MID]);
    P.sets = Array.from({ length: p.nSet }, (_, i) => [+s[i]?.[0] || 0, +s[i]?.[1] || 0]);
    // Riparte dal primo set non iniziato
    if (!P.pronto) {
      const ultimo = P.sets.reduce((k, [h, a], i) => (h || a ? i : k), 0);
      P.set = Math.min(ultimo, p.nSet - 1);
      P.pronto = true;
    }
  }
  return P.sets;
}

// ── Disegno ───────────────────────────────────────────────
function disegna() {
  if (!P.t) return;
  const p = partita();
  if (!p) { errore('Partita non trovata', 'La partita è stata eliminata o il girone è stato modificato. Chiedi un nuovo link.'); return; }
  if (!p.pronta) { errore('Partita non ancora definita', `Le squadre di “${p.etichetta}” si conoscono quando finiscono i turni precedenti. La pagina si aggiorna da sola.`); return; }
  const r = P.ris[MID];
  const sets = setCorrenti(p);
  const nomi = [p.h.nome, p.a.nome];
  const testa = `<header class="sg-head" style="--c:${esc(p.cat.colore)}">
      <div><span class="sg-cat">${catIcona(p.cat)}${esc(catNome(p.cat))}</span>
      <p>${esc(P.t.nome)}, ${esc(p.etichetta)}${p.campo ? `, ${esc(p.campo)}` : ''}</p></div>
      ${!P.fatto && !isFinita(r) ? `<div class="segmented sg-mode" role="tablist">
        <button role="tab" aria-selected="${P.modo === 'live'}" data-a="modo" data-k="live">Punto per punto</button>
        <button role="tab" aria-selected="${P.modo === 'finale'}" data-a="modo" data-k="finale">Risultato finale</button></div>` : ''}
    </header>`;

  if (isFinita(r) && P.modo !== 'correggi') {
    const e = esito(r);
    app.innerHTML = `${testa}<main class="sg-done">
      <div class="sg-done-ic">${icon('check')}</div><h1>Risultato salvato</h1>
      <div class="sg-final">${[0, 1].map(l => `<div class="${e.vincitore === (l ? 'a' : 'h') ? 'win' : ''}"><strong>${esc(nomi[l])}</strong>${e.sets.map(s => `<b class="num">${s[l]}</b>`).join('')}</div>`).join('')}</div>
      <p class="muted">Classifica e pagina pubblica sono già aggiornate.</p>
      <button class="btn btn-lg" data-a="correggi">${icon('edit')}Correggi il punteggio</button>
    </main>`;
    rilasciaSchermo();
    return;
  }

  if (P.modo === 'finale' || P.modo === 'correggi') {
    const s = setDa(r);
    app.innerHTML = `${testa}<main class="sg-main">
      <div class="sg-form" style="--n:${p.nSet}">
        <span></span>${sets.map((_, i) => `<span class="sg-sh num">${p.nSet > 1 ? `Set ${i + 1}` : 'Punti'}</span>`).join('')}
        ${[0, 1].map(l => `<strong class="sg-fn">${esc(nomi[l])}</strong>${sets.map((_, i) => `<input class="sc num" id="f-${i}-${l}" type="number" inputmode="numeric" min="0" max="99" value="${esc(s[i]?.[l] ?? '')}" aria-label="Set ${i + 1}, ${esc(nomi[l])}">`).join('')}`).join('')}
      </div>
      <p class="hint">Inserisci i set in ordine. Un set non può finire in parità.</p>
      <button class="btn btn-accent btn-lg btn-block" data-a="salvaFinale">${icon('check')}Salva risultato</button>
      ${P.modo === 'correggi' ? '<button class="btn btn-ghost btn-block" data-a="annullaCorreggi">Annulla</button>' : ''}
    </main>`;
    return;
  }

  // Punto per punto
  const lati = P.inverti ? [1, 0] : [0, 1];
  // Il set in corso non conta ancora come vinto
  const vinti = [0, 1].map(l => sets.filter(([h, a], i) => i !== P.set && (l ? a > h : h > a)).length);
  const T = timerStato(p);
  app.innerHTML = `${testa}<main class="sg-live">
    ${p.nSet > 1 ? `<div class="sg-sets" role="tablist">${sets.map((s, i) => `<button role="tab" aria-selected="${P.set === i}" data-a="set" data-i="${i}">Set ${i + 1}<span class="num">${s[0] || s[1] ? `${s[0]}–${s[1]}` : ''}</span></button>`).join('')}</div>` : ''}
    ${T ? `<div class="sg-timer${T.resto <= 0 ? ' over' : T.resto <= 60 ? ' warn' : ''}"><span class="num" id="tm">${fmt(T.resto)}</span>
      <button class="btn btn-sm" data-a="timer">${icon(T.attivo ? 'pause' : 'play')}${T.attivo ? 'Pausa' : T.resto < T.durata ? 'Riprendi' : 'Avvia'}</button>
      <button class="btn btn-sm btn-ghost btn-icon" data-a="timerReset" aria-label="Azzera cronometro">${icon('reset')}</button></div>` : ''}
    <div class="sg-board">${lati.map(l => `<section class="sg-team t${l}">
      <h2>${esc(nomi[l])}</h2>
      ${p.nSet > 1 ? `<span class="sg-won">${plurale(vinti[l], 'set vinto', 'set vinti')}</span>` : ''}
      <button class="sg-plus" data-a="punto" data-l="${l}" data-d="1" aria-label="Punto per ${esc(nomi[l])}"><span class="num" id="pt-${l}">${sets[P.set][l]}</span><small>+1</small></button>
      <button class="sg-minus" data-a="punto" data-l="${l}" data-d="-1" aria-label="Togli un punto a ${esc(nomi[l])}">−1</button>
    </section>`).join('')}</div>
    <div class="sg-bar">
      <button class="btn btn-ghost btn-sm" data-a="inverti">${icon('shuffle')}Inverti lati</button>
      <span class="sg-save" data-stato="${P.stato}" id="sg-save">${P.stato === 'attesa' ? 'Invio…' : P.stato === 'errore' ? 'Non inviato: riprovo' : 'In diretta sulla pagina pubblica'}</span>
    </div>
    <button class="btn btn-accent btn-lg btn-block" data-a="chiudi">${icon('check')}Chiudi la partita</button>
  </main>`;
  tieniSchermo();
}

// ── Salvataggio ───────────────────────────────────────────
function risultatoInCorso(p) {
  const ultimo = P.sets.reduce((k, [h, a], i) => (h || a ? i : k), P.set);
  const r = { stato: 'in_corso', set: setPerDb(P.sets.map((s, i) => i <= ultimo ? s : ['', ''])), ts: Date.now() };
  if (p.elim) r.squadre = [p.h.nome, p.a.nome];
  return r;
}
function invia(r) {
  clearTimeout(invio);
  P.stato = 'attesa';
  aggiornaStato();
  invio = setTimeout(async () => {
    invio = null;
    inVolo = true;
    try { await P.store.setRisultato(TID, MID, r()); P.stato = 'ok'; }
    catch (e) { console.error(e); P.stato = 'errore'; setTimeout(() => { if (P.stato === 'errore') invia(r); }, 3000); }
    finally { inVolo = false; aggiornaStato(); }
  }, 450);
}
function aggiornaStato() {
  const el = document.getElementById('sg-save');
  if (!el) return;
  el.dataset.stato = P.stato;
  el.textContent = P.stato === 'attesa' ? 'Invio…' : P.stato === 'errore' ? 'Non inviato: riprovo' : 'In diretta sulla pagina pubblica';
}

async function salvaFinita(sets, p) {
  const r = { stato: 'finita', set: setPerDb(sets), ts: P.ris[MID]?.ts && isFinita(P.ris[MID]) ? P.ris[MID].ts : Date.now() };
  if (p.elim) r.squadre = [p.h.nome, p.a.nome];
  clearTimeout(invio); invio = null;
  try {
    await P.store.setRisultato(TID, MID, r);
    P.ris = { ...P.ris, [MID]: r };
    P.modo = 'live'; P.sets = null; P.fatto = true;
    disegna();
  } catch (e) { console.error(e); toast('Risultato non salvato. Controlla la connessione e riprova.', 'err'); }
}

// ── Cronometro (sopravvive al ricaricamento della pagina) ──
const TKEY = 'vh_timer_' + MID;
function timerStato(p) {
  if (!p.timer) return null;
  let s; try { s = JSON.parse(sessionStorage.getItem(TKEY)); } catch { s = null; }
  s ||= { durata: p.timer * 60, consumato: 0, avvio: null };
  const trascorso = s.consumato + (s.avvio ? (Date.now() - s.avvio) / 1000 : 0);
  return { ...s, attivo: !!s.avvio, resto: Math.ceil(s.durata - trascorso) };
}
function salvaTimer(s) { try { sessionStorage.setItem(TKEY, JSON.stringify(s)); } catch { /* ignora */ } }
const fmt = sec => { const x = Math.max(0, sec); return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
let avvisato = false;
setInterval(() => {
  const el = document.getElementById('tm');
  if (!el || !P.t) return;
  const T = timerStato(partita());
  if (!T) return;
  el.textContent = fmt(T.resto);
  el.parentElement.classList.toggle('warn', T.resto <= 60 && T.resto > 0);
  el.parentElement.classList.toggle('over', T.resto <= 0);
  if (T.resto <= 0 && T.attivo && !avvisato) { avvisato = true; navigator.vibrate?.([400, 150, 400, 150, 400]); toast('Tempo scaduto', 'err'); }
}, 500);

// ── Schermo sempre acceso durante la partita ──
let wake = null;
async function tieniSchermo() {
  if (wake || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } catch { /* non supportato */ }
}
function rilasciaSchermo() { wake?.release(); wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && P.modo === 'live' && !P.fatto) tieniSchermo(); });

// ── Azioni ────────────────────────────────────────────────
const AZ = {
  modo(el) { P.modo = el.dataset.k; disegna(); },
  set(el) { P.set = +el.dataset.i; disegna(); },
  inverti() { P.inverti = !P.inverti; disegna(); },
  punto(el) {
    const p = partita(), l = +el.dataset.l, d = +el.dataset.d;
    const s = P.sets[P.set];
    s[l] = Math.max(0, Math.min(99, s[l] + d));
    if (d > 0) navigator.vibrate?.(15);
    document.getElementById('pt-' + l).textContent = s[l];
    invia(() => risultatoInCorso(p));
    // Aggiorna anche il riepilogo dei set senza ridisegnare tutto
    const tab = document.querySelector(`.sg-sets [data-i="${P.set}"] .num`);
    if (tab) tab.textContent = s[0] || s[1] ? `${s[0]}–${s[1]}` : '';
  },
  async chiudi() {
    const p = partita();
    const giocati = P.sets.filter(([h, a]) => h || a).map(([h, a]) => [String(h), String(a)]);
    const err = validaSet(giocati.length ? giocati : [['', '']], { serveVincitore: p.elim });
    if (err) { toast(err, 'err'); return; }
    const e = esito({ stato: 'finita', set: giocati });
    const vince = e.vincitore === 'h' ? p.h.nome : e.vincitore === 'a' ? p.a.nome : null;
    const ok = await modal({
      title: 'Chiudere la partita?',
      body: `<div class="sg-final">${[0, 1].map(l => `<div class="${e.vincitore === (l ? 'a' : 'h') ? 'win' : ''}"><strong>${esc(l ? p.a.nome : p.h.nome)}</strong>${e.sets.map(s => `<b class="num">${s[l]}</b>`).join('')}</div>`).join('')}</div>
        <p>${vince ? `Vince <strong>${esc(vince)}</strong>.` : 'La partita finisce in parità.'}${giocati.length < p.nSet ? ` Sono stati giocati ${giocati.length} set su ${p.nSet}.` : ''}</p>`,
      azioni: [{ label: 'Continua a segnare', value: false }, { label: 'Chiudi e salva', value: true, cls: 'btn-accent' }],
    });
    if (ok) salvaFinita(giocati.map(([h, a]) => [+h, +a]), p);
  },
  salvaFinale() {
    const p = partita();
    const sets = Array.from({ length: p.nSet }, (_, i) => [0, 1].map(l => document.getElementById(`f-${i}-${l}`).value.trim()));
    const err = validaSet(sets, { serveVincitore: p.elim });
    if (err) { toast(err, 'err'); return; }
    const pieni = sets.filter(([h, a]) => h !== '' && a !== '').map(([h, a]) => [+h, +a]);
    salvaFinita([...pieni, ...sets.slice(pieni.length).map(() => ['', ''])], p);
  },
  correggi() { P.modo = 'correggi'; P.fatto = false; disegna(); },
  annullaCorreggi() { P.modo = 'live'; P.fatto = true; disegna(); },
  timer() {
    const T = timerStato(partita());
    if (T.attivo) salvaTimer({ durata: T.durata, consumato: T.consumato + (Date.now() - T.avvio) / 1000, avvio: null });
    else { if (T.resto <= 0) return AZ.timerReset(); salvaTimer({ durata: T.durata, consumato: T.consumato, avvio: Date.now() }); avvisato = false; }
    disegna();
  },
  timerReset() { const T = timerStato(partita()); salvaTimer({ durata: T.durata, consumato: 0, avvio: null }); avvisato = false; disegna(); },
};
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && AZ[el.dataset.a]) { e.preventDefault(); AZ[el.dataset.a](el); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.sg-form input')) AZ.salvaFinale(); });
window.addEventListener('beforeunload', e => { if (invio) { e.preventDefault(); e.returnValue = ''; } });

avvio();
