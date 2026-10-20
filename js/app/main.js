// Avvio dell'app di gestione: accesso, instradamento, sincronizzazione, eventi.
import { getStore } from '../store.js';
import { DEMO, link } from '../config.js';
import { normalizzaTorneo, esc } from '../core.js';
import { applicaTema, cambiaTema, icon, toast, conferma } from '../ui.js';
import { S, azioni, registra, setRender, inSalvataggio, aggiornaIndicatore, salvaOra, vai } from './stato.js';
import { vistaHome } from './v-home.js';
import { vistaNuovo, initNuovo } from './v-nuovo.js';
import { vistaTorneo } from './v-torneo.js';
import { tourSeServe, avviaTour, riavviaGuide } from './tour.js';

const $ = s => document.querySelector(s);
let unsub = [];
let avviato = false;

applicaTema();

async function avvio() {
  try {
    S.store = await getStore();
  } catch (e) {
    console.error(e);
    erroreFatale('Impossibile caricare l\'app. Controlla la connessione e riprova.');
    return;
  }
  S.store.onUser(async u => {
    if (!u || u.anon) { location.replace(link('accedi.html')); return; }
    if (avviato) return;
    if (!S.store.demo) {
      let attivo = false;
      try { attivo = await S.store.isActive(u.uid); }
      catch (e) { console.error(e); erroreFatale('Non riesco a verificare il tuo account. Controlla la connessione e riprova.'); return; }
      if (!attivo) { await S.store.logout(); location.replace(link('accedi.html', { motivo: 'inattivo' })); return; }
    }
    avviato = true;
    S.user = u;
    document.getElementById('account-mail').textContent = DEMO ? 'Modalità demo' : u.email;
    S.store.watchMieiTornei(u.uid, lista => {
      S.tornei = lista.map(t => ({ ...t }));
      S.torneiPronti = true;
      if (S.route.vista === 'home') renderRemoto();
    }, errore);
    window.addEventListener('hashchange', instrada);
    instrada();
  });
}

function erroreFatale(msg) {
  $('#root').innerHTML = `<div class="empty">${icon('info', 'big')}<h3>Qualcosa non va</h3><p>${esc(msg)}</p><button class="btn btn-primary" onclick="location.reload()">Riprova</button></div>`;
}
function errore(e) {
  console.error(e);
  if (e?.code === 'permission-denied') toast('Accesso ai dati negato. Verifica le regole di Firestore (vedi README).', 'err');
}

// ── Instradamento ─────────────────────────────────────────
function instrada() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const prima = S.route;
  if (p[0] === 't' && p[1]) {
    apriTorneo(p[1]);
    S.route = p[2] === 'c' && p[3] ? { vista: 'torneo', sez: 'cat', catId: p[3] } : { vista: 'torneo', sez: p[2] || 'panoramica' };
  } else if (p[0] === 'nuovo') {
    chiudiTorneo();
    if (!S.nuovo) initNuovo();
    S.route = { vista: 'nuovo' };
  } else {
    chiudiTorneo();
    S.route = { vista: 'home' };
  }
  disegna();
  if (prima.vista !== S.route.vista || prima.sez !== S.route.sez || prima.catId !== S.route.catId) {
    window.scrollTo(0, 0);
    document.getElementById('root').focus({ preventScroll: true });
  }
}

function apriTorneo(tid) {
  if (S.tid === tid) return;
  chiudiTorneo();
  Object.assign(S, { tid, torneo: null, risultati: {}, media: {}, iscrizioni: [], privato: null, bozze: {}, builder: {}, torneoMancante: false, accessoNegato: false });
  const st = S.store;
  unsub.push(st.watchTorneo(tid, dati => {
    if (S.tid !== tid) return;
    if (!dati) { S.torneo = null; S.torneoMancante = true; disegna(); return; }
    if (dati.owner !== S.user.uid) { S.accessoNegato = true; S.torneo = null; disegna(); return; }
    // Le modifiche locali non ancora salvate hanno la precedenza
    if (inSalvataggio() && S.torneo) return;
    const primo = !S.torneo;
    S.torneo = normalizzaTorneo(dati);
    primo ? disegna() : renderRemoto();
  }, e => { errore(e); S.torneoMancante = true; disegna(); }));
  unsub.push(st.watchRisultati(tid, r => { if (S.tid === tid) { S.risultati = r; renderRemoto(); } }, errore));
  unsub.push(st.watchMedia(tid, m => { if (S.tid === tid) { S.media = m; renderRemoto(); } }, errore));
  unsub.push(st.watchIscrizioni(tid, l => { if (S.tid === tid) { S.iscrizioni = l; renderRemoto(); } }, errore));
  st.getPrivato(tid).then(p => { if (S.tid === tid) { S.privato = p; renderRemoto(); } }).catch(errore);
}

function chiudiTorneo() {
  if (!S.tid) return;
  if (inSalvataggio()) salvaOra();
  unsub.forEach(f => f && f());
  unsub = [];
  Object.assign(S, { tid: null, torneo: null, risultati: {}, media: {}, iscrizioni: [], privato: null, bozze: {}, builder: {} });
}

// ── Disegno ───────────────────────────────────────────────
function inModifica() {
  const a = document.activeElement;
  return !!(a && a.closest('#root') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'radio');
}
let inSospeso = false;
function renderRemoto() {
  if (inModifica()) { inSospeso = true; return; }
  inSospeso = false;
  disegna();
}
document.addEventListener('focusout', () => {
  if (!inSospeso) return;
  setTimeout(() => { if (inSospeso && !inModifica()) renderRemoto(); }, 250);
});

function disegna() {
  const root = $('#root');
  const sy = window.scrollY;
  const a = document.activeElement;
  const focusId = a && root.contains(a) && a.id ? a.id : null;
  const sel = focusId && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;

  let html;
  if (S.route.vista === 'nuovo') html = vistaNuovo();
  else if (S.route.vista === 'torneo') html = vistaTorneo();
  else html = vistaHome();
  root.innerHTML = html;
  disegnaTopbar();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch { /* tipo non testuale */ } }
  }
  window.scrollTo(0, sy);
  tourSeServe(guidaDellaPagina());
}

// Quale guida mostrare nella pagina corrente
function guidaDellaPagina() {
  const r = S.route;
  if (r.vista === 'home' && S.torneiPronti) return 'home';
  if (r.vista === 'torneo' && S.torneo && r.sez === 'panoramica') return 'torneo';
  if (r.vista === 'torneo' && S.torneo && r.sez === 'cat' && document.querySelector('.girone-opz')) return 'categoria';
  return null;
}
setRender(disegna);

function disegnaTopbar() {
  const c = $('#crumbs');
  const sync = $('#sync');
  if (S.route.vista === 'torneo' && S.torneo) {
    c.innerHTML = `<a href="#/">Tornei</a>${icon('right')}<span title="${esc(S.torneo.nome)}">${esc(S.torneo.nome)}</span>`;
    sync.hidden = false;
    aggiornaIndicatore();
  } else if (S.route.vista === 'nuovo') {
    c.innerHTML = `<a href="#/">Tornei</a>${icon('right')}<span>Nuovo torneo</span>`;
    sync.hidden = true;
  } else {
    c.innerHTML = '';
    sync.hidden = true;
  }
  $('#tema-btn').innerHTML = icon(document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches) ? 'sun' : 'moon');
}

// ── Eventi (delegati) ─────────────────────────────────────
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  const fn = azioni[el.dataset.a];
  if (!fn) return;
  e.preventDefault();
  Promise.resolve(fn(el, e)).catch(err => { console.error(err); toast(err.message || 'Operazione non riuscita', 'err'); });
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-c]');
  if (el) Promise.resolve(azioni[el.dataset.c]?.(el, e)).catch(err => { console.error(err); toast(err.message || 'Operazione non riuscita', 'err'); });
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-i]');
  if (el) azioni[el.dataset.i]?.(el, e);
});
// Invio in un campo con data-enter esegue l'azione indicata
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  const el = e.target.closest?.('[data-enter]');
  if (el) { e.preventDefault(); azioni[el.dataset.enter]?.(el, e); }
});

registra({
  tema() { cambiaTema(); disegnaTopbar(); },
  guida(el) {
    el.closest('details')?.removeAttribute('open');
    riavviaGuide();
    const g = guidaDellaPagina() || (vai('#/'), null);
    if (g) avviaTour(g);
  },
  async esci() {
    if (DEMO) { location.href = link('index.html').replace(/[?&]demo=1/, ''); return; }
    if (inSalvataggio()) await salvaOra();
    await S.store.logout();
    location.replace('accedi.html');
  },
  async resetDemo() {
    if (!await conferma('La demo tornerà allo stato iniziale e le modifiche fatte andranno perse.', { titolo: 'Ricominciare la demo?', ok: 'Ricomincia' })) return;
    localStorage.removeItem('vh_demo_v2');
    location.hash = '#/';
    location.reload();
  },
});

if (DEMO) {
  const b = $('#demo-banner');
  b.hidden = false;
  b.innerHTML = `${icon('info')}<span>Stai provando la <strong>demo</strong><span class="demo-long">: i dati restano solo in questo browser</span>.</span><button class="btn btn-sm" data-a="resetDemo">Ricomincia</button><a class="btn btn-sm btn-accent" href="accedi.html">Accedi</a>`;
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

avvio();
