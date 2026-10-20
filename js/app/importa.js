// Esportazione/importazione dei tornei, compresa la conversione dalla vecchia app "Torneo Volley Manager".
import { uid, normalizzaTorneo, setPerDb, PUNTI_DEFAULT } from '../core.js';

export const FORMATO = 'volleyhub';

export async function esportaTorneo(store, tid, torneo) {
  const [risultati, media, privato] = await Promise.all([store.getRisultati(tid), store.getMedia(tid), store.getPrivato(tid)]);
  const { owner, ...resto } = torneo;
  return { formato: FORMATO, versione: 1, esportatoIl: new Date().toISOString(), torneo: resto, risultati, media, contatti: privato.contatti || {} };
}

// Restituisce un elenco di { torneo, risultati, media, contatti } pronti da salvare
export function leggiFileImport(json) {
  if (json?.formato === FORMATO && Array.isArray(json.tornei)) {
    return json.tornei.filter(x => x?.torneo).map(x => ({ torneo: normalizzaTorneo(x.torneo), risultati: x.risultati || {}, media: x.media || {}, contatti: x.contatti || {} }));
  }
  if (json?.formato === FORMATO && json.torneo) {
    return [{ torneo: normalizzaTorneo(json.torneo), risultati: json.risultati || {}, media: json.media || {}, contatti: json.contatti || {} }];
  }
  // Vecchia app: { tornei: { id: t } } oppure { torneo: t }
  const vecchi = json?.tornei ? Object.values(json.tornei) : json?.torneo ? [json.torneo] : json?.nome ? [json] : [];
  if (!vecchi.length) throw new Error('Il file non contiene tornei riconoscibili.');
  return vecchi.map(convertiVecchio);
}

const V_COLORI = { white: '#1E40AF', green: '#166534', red: '#991B1B' };

function convertiVecchio(v) {
  const risultati = {}, media = {}, contatti = {};
  // Categorie: formato attuale categorie[] o storico cats{white,green,red}
  let cats = v.categorie;
  if (!cats && v.cats) cats = Object.entries(v.cats).map(([id, c]) => ({ id, nome: id[0].toUpperCase() + id.slice(1), colore: V_COLORI[id], fasi: c.fasi || [] }));
  cats = cats || [];

  const societa = (v.societa || []).map(s => {
    const id = uid();
    if (s.logo && /^data:image|^https:/.test(s.logo)) media['soc_' + id] = s.logo;
    const ref = (s.referenti || []).filter(r => r.nome || r.email || r.tel);
    if (ref.length) contatti[id] = ref.map(r => ({ nome: r.nome || '', email: r.email || '', tel: r.tel || '' }));
    return { id, nome: s.nome, squadre: { ...(s.sqPerCat || {}) }, atleti: { ...(s.bambini || {}) }, logo: !!media['soc_' + id] };
  });
  const socPerNome = new Map(societa.map(s => [s.nome.toLowerCase(), s.id]));

  const categorie = cats.map(c => {
    const fasi = [];
    for (const f of c.fasi || []) {
      if (f.tipo === 'elim' && f.elim) { const fe = convertiElim(f, risultati); if (fe) fasi.push(fe); continue; }
      const gironi = (f.gironi || []).map(g => {
        const sq = (g.squadre || []).map(s => ({ id: uid(), nome: s.nome || 'Squadra', socId: socPerNome.get(String(s.soc || '').toLowerCase()) || '' }));
        const partite = (g.partite || []).map(p => {
          const m = { id: uid(), h: sq[p.h]?.id, a: sq[p.a]?.id, leg: p.leg || 1, campo: p.campo || '', nota: p.nota || '' };
          const sets = [[p.s1h, p.s1a]];
          if ((g.sets || 2) >= 2) sets.push([p.s2h ?? '', p.s2a ?? '']);
          if (p.s1h !== '' && p.s1h != null && p.s1a !== '' && p.s1a != null) {
            risultati[m.id] = { stato: p.inCorso ? 'in_corso' : 'finita', set: setPerDb(sets.map(([h, a]) => [h ?? '', a ?? ''])), ts: p.ts || Date.now() };
          } else if (p.inCorso) risultati[m.id] = { stato: 'in_corso', set: setPerDb(sets.map(() => ['', ''])), ts: Date.now() };
          return m;
        }).filter(m => m.h && m.a);
        return { id: uid(), nome: g.label || 'A', campo: g.campo || '', set: g.sets || 2, ritorno: !!g.ritorno, timer: g.timerAttivo ? (g.timerMinuti || 12) : 0, squadre: sq, partite };
      });
      fasi.push({ id: uid(), nome: f.label || 'Fase', tipo: 'gironi', gironi });
    }
    return { id: c.id || uid(), nome: c.nome || 'Categoria', colore: /^#[0-9a-f]{6}$/i.test(c.colore || '') ? c.colore : '#1E40AF', icona: '', campi: 0, regole: null, fasi };
  });

  const cfg = v.pageConfig || {}, isc = v.iscrizioniConfig || {};
  const torneo = normalizzaTorneo({
    nome: v.nome || 'Torneo importato', createdAt: v.createdAt || Date.now(), archiviato: !!v.archiviato,
    regole: { punti: { ...PUNTI_DEFAULT }, set: 2, timer: 0 },
    categorie, societa,
    live: {
      sponsor: { attivo: !!cfg.sponsorEnabled, gruppi: (cfg.sponsor?.cats || []).map(g => ({ id: uid(), nome: g.nome || '', items: (g.items || []).map(it => {
        const id = uid();
        let img = '';
        if (/^data:image/.test(it.immagine || '')) { media['sp_' + id] = it.immagine; img = 'media'; }
        else if (/^https:/.test(it.immagine || '')) img = it.immagine;
        return { id, nome: it.nome || '', frase: it.frase || '', img, size: it.size || 'medio' };
      }) })) },
      info: { attivo: !!cfg.infoEnabled, blocchi: (cfg.infoBlocks || []).map(b => ({ id: uid(), titolo: b.titolo || '', testo: b.testo || '' })) },
      menu: { attivo: !!cfg.menuEnabled, note: cfg.menu?.note || '', sezioni: (cfg.menu?.sezioni || []).map(s => ({ id: uid(), nome: s.nome || '', voci: (s.voci || []).map(x => ({ id: uid(), nome: x.nome || '', desc: x.desc || '', prezzo: x.prezzo || '' })) })) },
    },
    iscrizioni: {
      aperte: false, scadenza: isc.scadenza || '', testoSquadre: isc.testoComposizione || '',
      testoRegolamento: isc.testoAccettazione || undefined, disclaimer: isc.disclaimer || '',
      catInfo: Object.fromEntries(Object.entries(isc.catInfo || {}).map(([k, x]) => [k, { formato: x.formato || '', anni: x.anni || '', minAtleti: x.minAtleti || 0 }])),
    },
  });
  if (!torneo.iscrizioni.testoRegolamento) torneo.iscrizioni.testoRegolamento = normalizzaTorneo({}).iscrizioni.testoRegolamento;
  if (/^data:image|^https:/.test(isc.logoOrg || '')) media.org = isc.logoOrg;
  return { torneo, risultati, media, contatti };
}

// Il vecchio tabellone (q1..q4, sf1/sf2, fin12/fin34) corrisponde all'ordine standard delle teste di serie
function convertiElim(f, risultati) {
  const e = f.elim, id = uid();
  const sets = f.elimSets || 1;
  let dim, mappa, teste;
  if (e.q1) {
    dim = 8;
    teste = [e.q1.t1, e.q2.t1, e.q3.t1, e.q4.t1, e.q4.t2, e.q3.t2, e.q2.t2, e.q1.t2];
    mappa = { q1: 'r1m0', q4: 'r1m1', q2: 'r1m2', q3: 'r1m3', sf1: 'r2m0', sf2: 'r2m1', fin12: 'r3m0', fin34: 't3' };
  } else if (e.sf1 && e.sf2) {
    dim = 4;
    teste = [e.sf1.t1, e.sf2.t1, e.sf2.t2, e.sf1.t2];
    mappa = { sf1: 'r1m0', sf2: 'r1m1', fin12: 'r2m0', fin34: 't3' };
  } else if (e.fin12) {
    dim = 2;
    teste = [e.fin12.t1, e.fin12.t2];
    mappa = { fin12: 'r1m0' };
  } else return null;
  for (const [k, nk] of Object.entries(mappa)) {
    const m = e[k];
    if (!m || m.s1h === '' || m.s1h == null) continue;
    const s = [[m.s1h, m.s1a]];
    if (sets >= 2) s.push([m.s2h ?? '', m.s2a ?? '']);
    risultati[`${id}_${nk}`] = { stato: 'finita', set: setPerDb(s), ts: Date.now() };
  }
  return { id, nome: f.label || 'Eliminazione', tipo: 'elim', gironi: [], tabellone: { dimensione: dim, set: sets, terzoPosto: !!e.fin34, teste: teste.map(n => ({ nome: n || '—', socId: '', da: '' })) } };
}

// Salva nel database un torneo letto da file
export async function importaInStore(store, owner, voce, suffisso = '') {
  const t = { ...voce.torneo, owner, nome: voce.torneo.nome + suffisso, createdAt: Date.now() };
  const tid = await store.createTorneo(t);
  const ids = Object.keys(voce.risultati || {});
  for (const k of ids) await store.setRisultato(tid, k, voce.risultati[k]);
  for (const [k, v] of Object.entries(voce.media || {})) await store.setMedia(tid, k, v);
  if (Object.keys(voce.contatti || {}).length) await store.patchPrivato(tid, { contatti: voce.contatti });
  return tid;
}
