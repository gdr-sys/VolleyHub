// Archivio demo: tutto nel localStorage del browser, con aggiornamenti in tempo reale fra le schede.
import { uid, deepClone } from './core.js';
import { creaTorneoDemo } from './demo-data.js';

const KEY = 'vh_demo_v1';
const UTENTE = { uid: 'demo', email: 'demo@volleyhub.app', anon: false };

function leggi() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}

export function creaStoreDemo() {
  let db = leggi();
  if (!db) {
    db = { tornei: {}, risultati: {}, media: {}, privato: {}, iscrizioni: {}, token: {} };
    const { id, torneo, risultati } = creaTorneoDemo('demo');
    db.tornei[id] = torneo;
    db.risultati[id] = risultati;
    scrivi();
  }
  const ascoltatori = new Set();

  function scrivi() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch { /* spazio pieno: la demo continua in memoria */ }
  }
  function notifica() { for (const a of ascoltatori) a(); }
  function cambia(fn) { fn(); scrivi(); queueMicrotask(notifica); }

  // Modifiche fatte in un'altra scheda (es. segnapunti aperto accanto all'admin)
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    db = leggi() || db;
    notifica();
  });

  function osserva(estrai, cb) {
    let ultimo;
    const run = () => {
      const v = JSON.stringify(estrai() ?? null);
      if (v === ultimo) return;
      ultimo = v;
      cb(JSON.parse(v));
    };
    ascoltatori.add(run);
    queueMicrotask(run);
    return () => ascoltatori.delete(run);
  }
  const bucket = (nome, tid) => (db[nome][tid] ||= {});

  return {
    demo: true,
    onUser(cb) { queueMicrotask(() => cb(UTENTE)); return () => {}; },
    async login() {},
    async logout() {},
    async resetPassword() {},
    async isActive() { return true; },
    async ensureAnon() { return 'demo-arbitro'; },

    watchMieiTornei(owner, cb) {
      return osserva(() => Object.entries(db.tornei).filter(([, t]) => t.owner === owner).map(([id, t]) => ({ id, ...t })), cb);
    },
    watchTorneo(tid, cb) { return osserva(() => db.tornei[tid] || null, v => cb(v, { locale: false })); },
    async getTorneo(tid) { return db.tornei[tid] ? deepClone(db.tornei[tid]) : null; },
    async createTorneo(data) { const id = uid(14); cambia(() => { db.tornei[id] = deepClone({ ...data, updatedAt: Date.now() }); }); return id; },
    async saveTorneo(tid, data) { cambia(() => { db.tornei[tid] = deepClone({ ...data, updatedAt: Date.now() }); }); },
    async deleteTorneo(tid) {
      cambia(() => { for (const k of ['tornei', 'risultati', 'media', 'privato', 'iscrizioni']) delete db[k][tid]; });
    },

    watchRisultati(tid, cb) { return osserva(() => db.risultati[tid] || {}, cb); },
    async getRisultati(tid) { return deepClone(db.risultati[tid] || {}); },
    async setRisultato(tid, mid, r) { cambia(() => { bucket('risultati', tid)[mid] = deepClone(r); }); },
    async delRisultati(tid, mids) { cambia(() => { const b = bucket('risultati', tid); mids.forEach(m => delete b[m]); }); },
    async copiaRisultati(da, a) { cambia(() => { db.risultati[a] = deepClone(db.risultati[da] || {}); }); },

    watchMedia(tid, cb) { return osserva(() => db.media[tid] || {}, cb); },
    async getMedia(tid) { return deepClone(db.media[tid] || {}); },
    async setMedia(tid, id, data) { cambia(() => { bucket('media', tid)[id] = data; }); },
    async delMedia(tid, id) { cambia(() => { delete bucket('media', tid)[id]; }); },

    async getPrivato(tid) { return deepClone(db.privato[tid] || {}); },
    async patchPrivato(tid, patch) {
      cambia(() => {
        const p = bucket('privato', tid);
        for (const [k, v] of Object.entries(patch)) p[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(p[k] || {}), ...v } : v;
      });
    },

    watchIscrizioni(tid, cb) { return osserva(() => Object.entries(db.iscrizioni[tid] || {}).map(([id, v]) => ({ id, ...v })), cb); },
    async inviaIscrizione(tid, data) {
      if (!db.tornei[tid]?.iscrizioni?.aperte) throw new Error('Le iscrizioni sono chiuse.');
      cambia(() => { bucket('iscrizioni', tid)[uid()] = deepClone(data); });
    },
    async aggiornaIscrizione(tid, iid, patch) { cambia(() => { Object.assign(bucket('iscrizioni', tid)[iid] || {}, patch); }); },
    async eliminaIscrizione(tid, iid) { cambia(() => { delete bucket('iscrizioni', tid)[iid]; }); },

    async creaToken(tid, mid) {
      const p = bucket('privato', tid);
      if (p.token?.[mid]) return p.token[mid];
      const token = uid(24);
      cambia(() => { p.token = { ...(p.token || {}), [mid]: token }; db.token[token] = { tid, mid }; });
      return token;
    },
    async claimArbitro(tid, mid, token) {
      const t = db.token[token];
      if (!t || t.tid !== tid || t.mid !== mid) { const e = new Error('Link non valido'); e.code = 'permission-denied'; throw e; }
      return 'demo-arbitro';
    },
  };
}
