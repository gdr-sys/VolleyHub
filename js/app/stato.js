// Stato dell'app di gestione e meccanismi comuni alle viste.
import { toast } from '../ui.js';

export const S = {
  store: null,
  user: null,
  tornei: [],            // elenco (home)
  torneiPronti: false,
  tid: null,             // torneo aperto
  torneo: null,
  risultati: {},
  media: {},
  iscrizioni: [],
  privato: null,
  route: { vista: 'home' },
  bozze: {},             // punteggi digitati e non ancora salvati: { matchId: [[h,a]...] }
  catTab: {},            // scheda attiva per categoria
  builder: {},           // configurazione "nuova fase" per categoria
  nuovo: null,           // stato della procedura "nuovo torneo"
  aperti: new Set(),     // sezioni espanse/compresse
  salvataggio: 'ok',     // ok | attesa | errore
};

// Registro delle azioni richiamate dal markup (data-a / data-c / data-i)
export const azioni = {};
export function registra(obj) { Object.assign(azioni, obj); }

let renderFn = () => {};
export function setRender(fn) { renderFn = fn; }
export function render() { renderFn(); }

// ── Salvataggio del torneo (con attesa: raggruppa modifiche rapide) ──
let timer = null, inVolo = null;
export function inSalvataggio() { return !!timer || !!inVolo; }

export function modifica(fn, { ridisegna = true } = {}) {
  if (!S.torneo) return;
  fn(S.torneo);
  pianificaSalvataggio();
  if (ridisegna) render();
}

export function pianificaSalvataggio() {
  S.salvataggio = 'attesa';
  aggiornaIndicatore();
  clearTimeout(timer);
  timer = setTimeout(salvaOra, 700);
}

export async function salvaOra() {
  clearTimeout(timer);
  timer = null;
  if (!S.torneo || !S.tid) return;
  const tid = S.tid, dati = S.torneo;
  try {
    inVolo = S.store.saveTorneo(tid, dati);
    await inVolo;
    if (!timer) S.salvataggio = 'ok';
  } catch (e) {
    console.error(e);
    S.salvataggio = 'errore';
    toast(e.code === 'permission-denied' ? 'Non hai i permessi per modificare questo torneo.' : 'Salvataggio non riuscito. Riprovo appena possibile.', 'err');
    if (e.code !== 'permission-denied') setTimeout(() => { if (S.salvataggio === 'errore') pianificaSalvataggio(); }, 5000);
  } finally {
    inVolo = null;
    aggiornaIndicatore();
  }
}

export function aggiornaIndicatore() {
  const el = document.getElementById('sync');
  if (!el) return;
  const offline = !navigator.onLine;
  const stato = S.salvataggio === 'errore' ? 'errore' : offline ? 'offline' : S.salvataggio;
  const testi = { ok: 'Salvato', attesa: 'Salvataggio…', errore: 'Non salvato', offline: 'Offline: salvo appena torna la rete' };
  el.dataset.stato = stato;
  el.querySelector('span').textContent = testi[stato];
}
window.addEventListener('online', aggiornaIndicatore);
window.addEventListener('offline', aggiornaIndicatore);
window.addEventListener('beforeunload', e => { if (timer) { e.preventDefault(); e.returnValue = ''; } });

// ── Utilità per le viste ──
export function cat(catId) { return S.torneo?.categorie.find(c => c.id === catId) || null; }
export function societa(socId) { return S.torneo?.societa.find(s => s.id === socId) || null; }
export function logoSoc(socId) { return S.media['soc_' + socId] || ''; }
export function nomeSoc(socId) { return societa(socId)?.nome || ''; }

export function vai(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
export function hashTorneo(sez = '') { return `#/t/${S.tid}${sez ? '/' + sez : ''}`; }
