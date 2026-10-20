// VolleyHub — logica di dominio condivisa da tutte le pagine.
// Nessun accesso al DOM o al database: solo funzioni pure.

// ── Utility ────────────────────────────────────────────────
const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789';
export function uid(n = 10) {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let s = '';
  for (const b of buf) s += ALFABETO[b % ALFABETO.length];
  return s;
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Solo immagini incorporate o URL https: evita injection negli attributi src
export function safeImg(s) {
  s = String(s || '').trim();
  return /^(data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+|https:\/\/[^\s"'<>]+)$/i.test(s) ? s : '';
}

export function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
export function intOr(v, def = 0) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; }
export function plurale(n, uno, molti) { return `${n} ${n === 1 ? uno : molti}`; }
export function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

export function formatData(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function formatOra(ts) {
  return ts ? new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
}

// Normalizza un prezzo scritto a mano: "1,5" "€2" "3.00" → "€ 1,50"
export function normalizzaPrezzo(raw) {
  let s = String(raw ?? '').replace(/€/g, '').replace(/\s/g, '');
  if (!s) return '';
  if (s.includes('.') && s.includes(',')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const p = s.split(',');
    s = p.length === 2 && p[1].length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return String(raw).trim();
  return '€ ' + n.toFixed(2).replace('.', ',');
}

// ── Colori categorie ───────────────────────────────────────
export const COLORI = [
  { hex: '#1E40AF', nome: 'Blu' },
  { hex: '#166534', nome: 'Verde' },
  { hex: '#991B1B', nome: 'Rosso' },
  { hex: '#7A3FD1', nome: 'Viola' },
  { hex: '#D9730D', nome: 'Arancio' },
  { hex: '#0E8A9E', nome: 'Petrolio' },
  { hex: '#C2307A', nome: 'Fucsia' },
  { hex: '#A27C00', nome: 'Ocra' },
  { hex: '#5B6680', nome: 'Ardesia' },
  { hex: '#8B4A2B', nome: 'Mattone' },
];

// Simboli delle categorie: disegnati in bianco sul colore della categoria
export const ICONE_CAT = [
  { id: '', nome: 'Solo colore', svg: '' },
  { id: 'palla', nome: 'Pallone', svg: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c2.6 2.2 3.8 5.2 3.4 8.6M12 12c-3.2 1.8-6.4 1.9-8.2 1.2M12 12c1.3 3 3.6 5.2 6.4 6"/>' },
  { id: 'stella', nome: 'Stella', svg: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>' },
  { id: 'cuore', nome: 'Cuore', svg: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>' },
  { id: 'fulmine', nome: 'Fulmine', svg: '<path d="M13 3.5L5.5 13H11l-1 7.5L17.5 11H12z"/>' },
  { id: 'sole', nome: 'Sole', svg: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>' },
  { id: 'luna', nome: 'Luna', svg: '<path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z"/>' },
  { id: 'fiamma', nome: 'Fiamma', svg: '<path d="M12 20.5a5.8 5.8 0 0 0 5.8-5.8c0-3.8-2.8-5.8-3.8-9.7-1 2-2.2 3-3.4 3.6C9 9.5 6.2 11 6.2 14.7A5.8 5.8 0 0 0 12 20.5z"/>' },
  { id: 'montagna', nome: 'Montagna', svg: '<path d="M3.5 18.5l5.8-9.5 3.4 5.4 2.4-3.4 5.4 7.5z"/>' },
  { id: 'foglia', nome: 'Foglia', svg: '<path d="M5.5 18.5C5.5 10.6 10.4 5.5 18.5 5.5c0 8.1-5.1 13-13 13zM5.5 18.5l6.5-6.5"/>' },
  { id: 'fiore', nome: 'Fiore', svg: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.6a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 1 1 0 5.8zM12 14.4a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 1 0 0-5.8zM9.6 12a2.9 2.9 0 1 0-5.8 0 2.9 2.9 0 1 0 5.8 0zM14.4 12a2.9 2.9 0 1 1 5.8 0 2.9 2.9 0 1 1-5.8 0z"/>' },
  { id: 'onda', nome: 'Onda', svg: '<path d="M3.5 9.5c1.9-1.8 3.8-1.8 5.7 0s3.8 1.8 5.7 0 3.8-1.8 5.6 0M3.5 15c1.9-1.8 3.8-1.8 5.7 0s3.8 1.8 5.7 0 3.8-1.8 5.6 0"/>' },
  { id: 'corona', nome: 'Corona', svg: '<path d="M5 18h14M5 18L4 8l4.5 3.5L12 6l3.5 5.5L20 8l-1 10"/>' },
  { id: 'scudo', nome: 'Scudo', svg: '<path d="M12 3.5l6.5 2.7v4.9c0 4.6-2.8 7.7-6.5 9.4-3.7-1.7-6.5-4.8-6.5-9.4V6.2z"/>' },
  { id: 'razzo', nome: 'Razzo', svg: '<path d="M12 3.5c2.9 2 4.6 5.6 4.6 9.4L15 16H9l-1.6-3.1c0-3.8 1.7-7.4 4.6-9.4zM9.5 16l-1.8 3.5M14.5 16l1.8 3.5"/><circle cx="12" cy="10" r="1.4"/>' },
  { id: 'zampa', nome: 'Zampa', svg: '<circle cx="6.8" cy="10.2" r="1.6"/><circle cx="10.2" cy="6.6" r="1.6"/><circle cx="13.8" cy="6.6" r="1.6"/><circle cx="17.2" cy="10.2" r="1.6"/><path d="M12 11.8c-2.8 0-4.8 2.9-4.8 5.2 0 1.5 1.4 2 2.8 1.5s2.6-.5 4 0 2.8 0 2.8-1.5c0-2.3-2-5.2-4.8-5.2z"/>' },
];

// Categorie proposte per un nuovo torneo
export const CATEGORIE_DEFAULT = Object.freeze([
  { nome: 'White', colore: '#1E40AF', icona: '' },
  { nome: 'Green', colore: '#166534', icona: '' },
  { nome: 'Red', colore: '#991B1B', icona: '' },
]);

export const catNome = c => c?.nome || '';

// Contrassegno della categoria: quadratino nel suo colore con il simbolo scelto.
// Senza colore eredita --c dal contenitore (anteprime nel selettore).
export function catIcona(c, taglia = '') {
  const ic = ICONE_CAT.find(x => x.id === (c?.icona || ''));
  const stile = c?.colore ? ` style="--c:${esc(c.colore)}"` : '';
  return `<span class="cat-ic${taglia ? ' cat-ic-' + taglia : ''}"${stile} aria-hidden="true">${ic?.svg ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>` : ''}</span>`;
}

// ── Regole di punteggio ────────────────────────────────────
// punti.perSet: punti per ogni set vinto; vittoria/pareggio/sconfitta: bonus a fine partita.
// Il default replica il comportamento storico: 1 punto per set vinto.
export const PUNTI_DEFAULT = Object.freeze({ perSet: 1, vittoria: 0, pareggio: 0, sconfitta: 0 });
export const REGOLE_DEFAULT = Object.freeze({ punti: PUNTI_DEFAULT, set: 2, timer: 0 });

export const PRESET_PUNTI = [
  { id: 'set', nome: '1 punto per set vinto', punti: { perSet: 1, vittoria: 0, pareggio: 0, sconfitta: 0 } },
  { id: '310', nome: '3 alla vittoria, 1 al pareggio', punti: { perSet: 0, vittoria: 3, pareggio: 1, sconfitta: 0 } },
  { id: '210', nome: '2 alla vittoria, 1 al pareggio', punti: { perSet: 0, vittoria: 2, pareggio: 1, sconfitta: 0 } },
  { id: 'set+v', nome: '1 per set vinto + 1 alla vittoria', punti: { perSet: 1, vittoria: 1, pareggio: 0, sconfitta: 0 } },
];

export function normalizzaPunti(p) {
  const n = (v, d) => clamp(intOr(v, d), 0, 99);
  p = p || {};
  return {
    perSet: n(p.perSet, PUNTI_DEFAULT.perSet),
    vittoria: n(p.vittoria, 0),
    pareggio: n(p.pareggio, 0),
    sconfitta: n(p.sconfitta, 0),
  };
}

export function presetDi(punti) {
  const p = normalizzaPunti(punti);
  return PRESET_PUNTI.find(x => Object.keys(x.punti).every(k => x.punti[k] === p[k]))?.id || 'custom';
}

export function descriviPunti(punti) {
  const p = normalizzaPunti(punti);
  const parti = [];
  if (p.perSet) parti.push(`${plurale(p.perSet, 'punto', 'punti')} per set vinto`);
  if (p.vittoria) parti.push(`${p.vittoria} alla vittoria`);
  if (p.pareggio) parti.push(`${p.pareggio} al pareggio`);
  if (p.sconfitta) parti.push(`${p.sconfitta} alla sconfitta`);
  return parti.length ? parti.join(', ') : 'Nessun punto assegnato';
}

// Regole effettive di una categoria: quelle del torneo, sovrascritte da quelle della categoria
export function regoleDi(torneo, cat) {
  const base = torneo?.regole || {};
  const over = cat?.regole || null;
  return {
    punti: normalizzaPunti(over?.punti || base.punti),
    set: clamp(intOr(over?.set ?? base.set, REGOLE_DEFAULT.set), 1, 5),
    timer: clamp(intOr(over?.timer ?? base.timer, 0), 0, 90),
    personalizzate: !!over,
  };
}

// ── Risultati ──────────────────────────────────────────────
// Un risultato è { set: [[h,a], ...], stato: 'in_corso' | 'finita', ts }
// (Firestore non accetta array annidati: nel database i set sono salvati come oggetti {h,a})
export function setDa(r) {
  return (r?.set || []).map(s => Array.isArray(s) ? s : [s?.h, s?.a]);
}
export function setPerDb(sets) { return sets.map(([h, a]) => ({ h, a })); }

export function setCompleti(r) {
  const out = [];
  for (const [h, a] of setDa(r)) {
    if (h === '' || h == null || a === '' || a == null) break;
    out.push([intOr(h), intOr(a)]);
  }
  return out;
}

export function isFinita(r) { return r?.stato === 'finita' && setCompleti(r).length > 0; }
export function isInCorso(r) { return r?.stato === 'in_corso'; }

// Riepilogo di una partita conclusa (o null)
export function esito(r) {
  if (!isFinita(r)) return null;
  const sets = setCompleti(r);
  let sh = 0, sa = 0, ph = 0, pa = 0;
  for (const [h, a] of sets) {
    ph += h; pa += a;
    if (h > a) sh++; else if (a > h) sa++;
  }
  // A parità di set vinti decide il totale punti; se pari anche quello è pareggio
  let vincitore = null;
  if (sh !== sa) vincitore = sh > sa ? 'h' : 'a';
  else if (ph !== pa) vincitore = ph > pa ? 'h' : 'a';
  return { sets, sh, sa, ph, pa, vincitore, pareggioSet: sh === sa };
}

// Punti classifica assegnati alle due squadre
export function puntiPartita(e, punti) {
  const p = normalizzaPunti(punti);
  let h = e.sh * p.perSet, a = e.sa * p.perSet;
  if (e.sh > e.sa) { h += p.vittoria; a += p.sconfitta; }
  else if (e.sa > e.sh) { a += p.vittoria; h += p.sconfitta; }
  else { h += p.pareggio; a += p.pareggio; }
  return [h, a];
}

// Valida i set inseriti (stringhe o numeri). Restituisce un messaggio d'errore o null.
// Regole: almeno il primo set, nessun buco, nessun set in parità, interi 0–99.
export function validaSet(sets, opts = {}) {
  let vuotoTrovato = false, compilati = 0;
  for (let i = 0; i < sets.length; i++) {
    const [h, a] = sets[i].map(v => String(v ?? '').trim());
    if (h === '' && a === '') { vuotoTrovato = true; continue; }
    if (h === '' || a === '') return `Set ${i + 1}: inserisci il punteggio di entrambe le squadre.`;
    if (vuotoTrovato) return `Compila i set in ordine: il set ${i} è vuoto.`;
    const nh = Number(h), na = Number(a);
    if (!Number.isInteger(nh) || !Number.isInteger(na) || nh < 0 || na < 0 || nh > 99 || na > 99)
      return `Set ${i + 1}: usa numeri interi tra 0 e 99.`;
    if (nh === na) return `Set ${i + 1}: un set non può finire in parità.`;
    compilati++;
  }
  if (!compilati) return 'Inserisci almeno il punteggio del primo set.';
  if (opts.tutti && compilati < sets.length) return `Compila tutti i ${sets.length} set.`;
  if (opts.serveVincitore) {
    const e = esito({ stato: 'finita', set: sets });
    if (!e.vincitore) return 'In eliminazione serve una vincitrice: il risultato è in perfetta parità.';
  }
  return null;
}

// ── Classifica di un girone ────────────────────────────────
export function classifica(girone, risultati, punti) {
  const righe = new Map();
  for (const s of girone.squadre || []) {
    righe.set(s.id, { id: s.id, nome: s.nome, socId: s.socId || '', g: 0, v: 0, n: 0, p: 0, pt: 0, sv: 0, sp: 0, pf: 0, ps: 0 });
  }
  for (const m of girone.partite || []) {
    const e = esito(risultati?.[m.id]);
    const H = righe.get(m.h), A = righe.get(m.a);
    if (!e || !H || !A) continue;
    const [pth, pta] = puntiPartita(e, punti);
    H.g++; A.g++;
    H.pt += pth; A.pt += pta;
    H.sv += e.sh; H.sp += e.sa; A.sv += e.sa; A.sp += e.sh;
    H.pf += e.ph; H.ps += e.pa; A.pf += e.pa; A.ps += e.ph;
    if (e.sh > e.sa) { H.v++; A.p++; } else if (e.sa > e.sh) { A.v++; H.p++; } else { H.n++; A.n++; }
  }
  const out = [...righe.values()];
  for (const r of out) { r.ds = r.sv - r.sp; r.dp = r.pf - r.ps; }
  out.sort(confrontaRighe);
  out.forEach((r, i) => { r.pos = i + 1; });
  return out;
}

// Criteri: punti, differenza set, differenza punti, punti fatti, nome
export function confrontaRighe(a, b) {
  return b.pt - a.pt || b.ds - a.ds || b.dp - a.dp || b.pf - a.pf || a.nome.localeCompare(b.nome, 'it');
}

// Classifica avulsa fra gironi: prima la posizione, poi le medie per partita
// (così gironi di dimensioni diverse restano confrontabili)
export function classificaAvulsa(fase, risultati, punti) {
  const out = [];
  for (const g of fase.gironi || []) {
    for (const r of classifica(g, risultati, punti)) {
      const div = r.g || 1;
      out.push({ ...r, girone: g.nome, da: `${r.pos}° girone ${g.nome}`, mpt: r.pt / div, mds: r.ds / div, mdp: r.dp / div, mpf: r.pf / div });
    }
  }
  out.sort((a, b) => a.pos - b.pos || b.mpt - a.mpt || b.mds - a.mds || b.mdp - a.mdp || b.mpf - a.mpf || a.nome.localeCompare(b.nome, 'it'));
  return out;
}

// ── Generazione calendario ─────────────────────────────────
// Metodo del cerchio: turni bilanciati; poi si evita che una squadra giochi due partite di fila.
export function generaPartite(squadre, ritorno = false) {
  const ids = squadre.map(s => s.id);
  if (ids.length < 2) return [];
  if (ids.length % 2) ids.push(null);
  const n = ids.length, turni = [];
  let giro = [...ids];
  for (let t = 0; t < n - 1; t++) {
    const turno = [];
    for (let i = 0; i < n / 2; i++) {
      const x = giro[i], y = giro[n - 1 - i];
      if (x && y) turno.push((t + i) % 2 ? [y, x] : [x, y]);
    }
    turni.push(turno);
    giro = [giro[0], giro[n - 1], ...giro.slice(1, n - 1)];
  }
  let ordine = [];
  for (const turno of turni) {
    const prec = ordine[ordine.length - 1];
    if (prec) {
      const k = turno.findIndex(([h, a]) => ![h, a].some(x => prec.includes(x)));
      if (k > 0) turno.unshift(...turno.splice(k, 1));
    }
    ordine.push(...turno);
  }
  const andata = ordine.map(([h, a]) => ({ id: uid(), h, a, leg: 1 }));
  if (!ritorno) return andata;
  return [...andata, ...andata.map(p => ({ id: uid(), h: p.a, a: p.h, leg: 2 }))];
}

// Rigenera mantenendo i match (stessa coppia, stessa gara) già esistenti, così i risultati restano validi
export function rigeneraPartite(girone) {
  const nuove = generaPartite(girone.squadre, girone.ritorno);
  const vecchie = new Map((girone.partite || []).map(p => [`${p.h}|${p.a}|${p.leg || 1}`, p]));
  return nuove.map(p => {
    const v = vecchie.get(`${p.h}|${p.a}|${p.leg}`) || (p.leg === 1 ? vecchie.get(`${p.a}|${p.h}|1`) : null);
    return v ? { ...v, leg: p.leg } : p;
  });
}

// Quanti gironi conviene fare dati squadre e campi (gironi da almeno 3, uno per campo)
export function suggerisciGironi(totSquadre, campi) {
  if (totSquadre < 2) return null;
  // Un girone per campo (si gioca in parallelo), purché ognuno abbia almeno 3 squadre
  let g = Math.max(1, campi || 1);
  while (g > 1 && Math.floor(totSquadre / g) < 3) g--;
  return { gironi: g, dimensioni: dimensioniUniformi(totSquadre, g) };
}

export function dimensioniUniformi(tot, g) {
  g = clamp(g, 1, Math.max(1, tot));
  const base = Math.floor(tot / g), resto = tot % g;
  return Array.from({ length: g }, (_, i) => base + (i < resto ? 1 : 0));
}

export const NOMI_SQUADRE = [
  ['Leoni', 'Tigri', 'Pantere', 'Linci', 'Lupi', 'Orsi', 'Falchi', 'Aquile', 'Volpi', 'Gufi', 'Ghepardi', 'Puma', 'Fenici', 'Delfini', 'Cigni', 'Castori', 'Pinguini', 'Zebre', 'Bisonti', 'Giaguari', 'Koala', 'Lontre', 'Camosci', 'Stambecchi'],
  ['Comete', 'Stelle', 'Meteore', 'Pianeti', 'Galassie', 'Nebulose', 'Aurore', 'Orione', 'Vega', 'Sirio', 'Altair', 'Rigel', 'Antares', 'Polluce', 'Castore', 'Arturo', 'Deneb', 'Andromeda', 'Pegaso', 'Cassiopea', 'Lyra', 'Draco', 'Perseo', 'Fenice'],
  ['Onde', 'Maree', 'Coralli', 'Conchiglie', 'Scogli', 'Fari', 'Baie', 'Lagune', 'Brezze', 'Golfi', 'Calette', 'Approdi', 'Velieri', 'Bussole', 'Ancore', 'Delte', 'Rade', 'Moli', 'Isole', 'Lidi', 'Correnti', 'Scie', 'Gabbiani', 'Spume'],
  ['Rubini', 'Zaffiri', 'Smeraldi', 'Topazi', 'Ametiste', 'Opali', 'Perle', 'Ambre', 'Giade', 'Quarzi', 'Agate', 'Onici', 'Granati', 'Diamanti', 'Cristalli', 'Corniole', 'Malachiti', 'Turchesi', 'Coralline', 'Lapislazzuli', 'Berilli', 'Spinelli', 'Peridoti', 'Ossidiane'],
];

// Crea i gironi distribuendo le squadre delle società in modo che, se possibile,
// due squadre della stessa società non finiscano nello stesso girone.
// opts: { dimensioni:[n...], nomi:'fantasia'|'societa', pool:indice, set, ritorno, timer, nomiUsati:Set }
export function creaGironi(societa, catId, opts) {
  const squadre = [];
  for (const s of societa) {
    const n = clamp(intOr(s.squadre?.[catId]), 0, 50);
    for (let i = 0; i < n; i++) squadre.push({ socId: s.id, socNome: s.nome, k: i, tot: n });
  }
  // Prima le società con più squadre: sono le più difficili da separare
  squadre.sort((a, b) => b.tot - a.tot || a.socNome.localeCompare(b.socNome, 'it') || a.k - b.k);
  const dim = opts.dimensioni;
  const gironi = dim.map((d, i) => ({ cap: d, membri: [], nome: String.fromCharCode(65 + i) }));
  for (const sq of squadre) {
    let migliore = null;
    for (const g of gironi) {
      if (g.membri.length >= g.cap) continue;
      const stessi = g.membri.filter(m => m.socId === sq.socId).length;
      const score = stessi * 1000 + g.membri.length / g.cap;
      if (!migliore || score < migliore.score) migliore = { g, score };
    }
    (migliore ? migliore.g : gironi.reduce((a, b) => a.membri.length <= b.membri.length ? a : b)).membri.push(sq);
  }
  const pool = NOMI_SQUADRE[(opts.pool || 0) % NOMI_SQUADRE.length].filter(n => !opts.nomiUsati?.has(n));
  let pi = 0;
  return gironi.map(g => {
    const membri = mescola(g.membri);
    while (membri.length < g.cap) membri.push({ socId: '', socNome: '' });
    const sq = membri.map((m, idx) => {
      let nome;
      if (opts.nomi === 'societa' && m.socNome) nome = m.tot > 1 ? `${m.socNome} ${String.fromCharCode(65 + m.k)}` : m.socNome;
      else nome = pool[pi++] || `Squadra ${g.nome}${idx + 1}`;
      return { id: uid(), nome, socId: m.socId || '' };
    });
    const girone = { id: uid(), nome: g.nome, campo: '', set: opts.set, ritorno: !!opts.ritorno, timer: opts.timer || 0, squadre: sq, partite: [] };
    girone.partite = generaPartite(girone.squadre, girone.ritorno);
    return girone;
  });
}

export function mescola(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ripartisce squadre già ordinate (es. classifica avulsa) in gironi "a serpentina"
// così ogni girone riceve teste di serie diverse.
export function serpentina(squadre, nGironi) {
  const gironi = Array.from({ length: nGironi }, () => []);
  squadre.forEach((s, i) => {
    const giro = Math.floor(i / nGironi), pos = i % nGironi;
    gironi[giro % 2 ? nGironi - 1 - pos : pos].push(s);
  });
  return gironi;
}

// ── Tabellone a eliminazione ───────────────────────────────
export const DIMENSIONI_TABELLONE = [2, 4, 8, 16];

export function ordineTeste(n) {
  let ordine = [1];
  while (ordine.length < n) {
    const m = ordine.length * 2, next = [];
    for (const s of ordine) next.push(s, m + 1 - s);
    ordine = next;
  }
  return ordine;
}

// teste: [{nome, socId, da}] già in ordine di merito
export function creaTabellone(teste, dimensione, opts = {}) {
  return {
    dimensione,
    set: opts.set || 1,
    terzoPosto: dimensione >= 4 && opts.terzoPosto !== false,
    teste: teste.slice(0, dimensione).map(t => ({ nome: t.nome, socId: t.socId || '', da: t.da || '' })),
  };
}

export function nomeTurno(round, nRound) {
  const daFine = nRound - round;
  if (daFine === 0) return 'Finale';
  if (daFine === 1) return 'Semifinali';
  if (daFine === 2) return 'Quarti di finale';
  if (daFine === 3) return 'Ottavi di finale';
  return `Turno ${round}`;
}

// Calcola lo stato del tabellone a partire dai risultati: chi gioca contro chi, chi passa, podio.
export function risolviTabellone(fase, risultati) {
  const tab = fase.tabellone;
  if (!tab) return null;
  const n = tab.dimensione, nRound = Math.log2(n), ordine = ordineTeste(n);
  const pid = k => `${fase.id}_${k}`;
  const turni = [];
  let precedenti = [];
  for (let r = 1; r <= nRound; r++) {
    const partite = [];
    const nMatch = n / 2 ** r;
    for (let i = 0; i < nMatch; i++) {
      let h, a, hLabel, aLabel;
      if (r === 1) {
        h = tab.teste[ordine[2 * i] - 1] || null;
        a = tab.teste[ordine[2 * i + 1] - 1] || null;
      } else {
        const ph = precedenti[2 * i], pa = precedenti[2 * i + 1];
        h = ph.vincente; a = pa.vincente;
        hLabel = `Vincente ${ph.etichetta}`; aLabel = `Vincente ${pa.etichetta}`;
      }
      const etichetta = etichettaMatch(r, nRound, i);
      partite.push(nodoMatch(pid(`r${r}m${i}`), h, a, hLabel, aLabel, etichetta, risultati, tab.set));
    }
    turni.push({ nome: nomeTurno(r, nRound), partite });
    precedenti = partite;
  }
  let terzo = null;
  if (tab.terzoPosto && nRound >= 2) {
    const semi = turni[nRound - 2].partite;
    terzo = nodoMatch(pid('t3'), semi[0].perdente, semi[1].perdente, `Perdente ${semi[0].etichetta}`, `Perdente ${semi[1].etichetta}`, 'Finale 3° posto', risultati, tab.set);
  }
  const finale = turni[nRound - 1].partite[0];
  const podio = finale.vincente ? [finale.vincente, finale.perdente, terzo?.vincente || null] : null;
  return { turni, terzo, finale, podio, tutte: [...turni.flatMap(t => t.partite), ...(terzo ? [terzo] : [])] };
}

function etichettaMatch(r, nRound, i) {
  const daFine = nRound - r;
  if (daFine === 0) return 'Finale';
  if (daFine === 1) return `Semifinale ${i + 1}`;
  if (daFine === 2) return `Quarto ${i + 1}`;
  if (daFine === 3) return `Ottavo ${i + 1}`;
  return `Turno ${r} · gara ${i + 1}`;
}

function nodoMatch(id, h, a, hLabel, aLabel, etichetta, risultati, nSet) {
  const r = risultati?.[id];
  // Il risultato ricorda chi giocava: se nel frattempo è cambiato un turno precedente non vale più
  const obsoleto = !!(r?.squadre && h && a && (r.squadre[0] !== h.nome || r.squadre[1] !== a.nome));
  const e = h && a && !obsoleto ? esito(r) : null;
  let vincente = null, perdente = null;
  if (e?.vincitore) {
    vincente = e.vincitore === 'h' ? h : a;
    perdente = e.vincitore === 'h' ? a : h;
  }
  return { id, h, a, hLabel: hLabel || 'Da definire', aLabel: aLabel || 'Da definire', etichetta, risultato: obsoleto ? null : r || null, obsoleto, esito: e, vincente, perdente, set: nSet, pronta: !!(h && a) };
}

// ── Navigazione nella struttura del torneo ─────────────────
export function trovaPartita(torneo, matchId) {
  for (const cat of torneo.categorie || []) {
    for (const fase of cat.fasi || []) {
      if (fase.tipo === 'elim') {
        if (!matchId.startsWith(fase.id + '_')) continue;
        const res = risolviTabellone(fase, {});
        const m = res?.tutte.find(x => x.id === matchId);
        if (m) return { cat, fase, tipo: 'elim', match: m, set: fase.tabellone.set };
      } else {
        for (const g of fase.gironi || []) {
          const m = (g.partite || []).find(p => p.id === matchId);
          if (m) return { cat, fase, girone: g, tipo: 'girone', match: m, set: g.set };
        }
      }
    }
  }
  return null;
}

export function squadraDi(girone, id) { return girone.squadre.find(s => s.id === id) || { nome: '—', socId: '' }; }

// Tutte le partite di un torneo in forma uniforme, utile per live, statistiche, "in campo ora"
export function elencoPartite(torneo, risultati) {
  const out = [];
  for (const cat of torneo.categorie || []) {
    for (const fase of cat.fasi || []) {
      if (fase.tipo === 'elim') {
        const res = risolviTabellone(fase, risultati);
        for (const m of res?.tutte || []) {
          out.push({ id: m.id, cat, fase, tipo: 'elim', etichetta: m.etichetta, h: m.h, a: m.a, hLabel: m.hLabel, aLabel: m.aLabel, set: fase.tabellone.set, campo: fase.campi?.[m.id] || '', risultato: m.risultato, obsoleto: m.obsoleto, pronta: m.pronta });
        }
      } else {
        for (const g of fase.gironi || []) {
          for (const p of g.partite || []) {
            out.push({ id: p.id, cat, fase, girone: g, tipo: 'girone', etichetta: `Girone ${g.nome}`, h: squadraDi(g, p.h), a: squadraDi(g, p.a), set: g.set, campo: p.campo || g.campo || '', nota: p.nota || '', leg: p.leg || 1, risultato: risultati?.[p.id] || null, pronta: true });
          }
        }
      }
    }
  }
  return out;
}

// Statistiche aggregate per squadra (per nome) su tutte le fasi a gironi di una categoria
export function statisticheCategoria(torneo, cat, risultati) {
  const punti = regoleDi(torneo, cat).punti;
  const mappa = new Map();
  for (const fase of cat.fasi || []) {
    if (fase.tipo === 'elim') continue;
    for (const g of fase.gironi || []) {
      for (const r of classifica(g, risultati, punti)) {
        if (!r.g) continue;
        const x = mappa.get(r.nome) || { nome: r.nome, socId: r.socId, g: 0, v: 0, n: 0, p: 0, pt: 0, sv: 0, sp: 0, pf: 0, ps: 0 };
        for (const k of ['g', 'v', 'n', 'p', 'pt', 'sv', 'sp', 'pf', 'ps']) x[k] += r[k];
        mappa.set(r.nome, x);
      }
    }
  }
  const out = [...mappa.values()];
  for (const r of out) { r.ds = r.sv - r.sp; r.dp = r.pf - r.ps; }
  return out.sort(confrontaRighe);
}

export function contaPartite(cat, risultati) {
  let tot = 0, giocate = 0;
  for (const fase of cat.fasi || []) {
    if (fase.tipo === 'elim') {
      const res = risolviTabellone(fase, risultati);
      for (const m of res?.tutte || []) { tot++; if (m.esito) giocate++; }
    } else {
      for (const g of fase.gironi || []) for (const p of g.partite || []) { tot++; if (isFinita(risultati?.[p.id])) giocate++; }
    }
  }
  return { tot, giocate };
}

export function nomiSquadreCategoria(cat) {
  const s = new Set();
  for (const f of cat.fasi || []) for (const g of f.gironi || []) for (const q of g.squadre || []) s.add(q.nome);
  return s;
}

// Società con le squadre arrivate al posto delle iscritte, se per la categoria sono cominciate le presenze.
// Chi non è ancora stato segnato non conta.
export function societaPresenti(torneo, catId) {
  const pr = torneo.presenze?.[catId];
  if (!pr) return torneo.societa || [];
  return (torneo.societa || []).map(s => ({ ...s, squadre: { ...s.squadre, [catId]: s.id in pr ? Math.min(intOr(pr[s.id]), clamp(intOr(s.squadre?.[catId]), 0, 50)) : 0 } }));
}

export function squadreTotali(torneo, catId) {
  return (torneo.societa || []).reduce((t, s) => t + clamp(intOr(s.squadre?.[catId]), 0, 50), 0);
}

// Struttura iniziale di un torneo nuovo
export function nuovoTorneo({ nome, data, luogo, owner, categorie, regole }) {
  return {
    owner, nome, data: data || '', luogo: luogo || '',
    createdAt: Date.now(), archiviato: false,
    regole: { punti: normalizzaPunti(regole?.punti), set: clamp(intOr(regole?.set, 2), 1, 5), timer: clamp(intOr(regole?.timer, 0), 0, 90) },
    categorie: (categorie || []).map(c => ({ id: c.id || uid(), nome: c.nome, colore: c.colore, icona: c.icona || '', campi: c.campi || 0, regole: null, fasi: [] })),
    societa: [],
    presenze: {}, assenti: {},
    live: { sponsor: { attivo: false, gruppi: [] }, info: { attivo: false, blocchi: [] }, menu: { attivo: false, sezioni: [], note: '' } },
    iscrizioni: { aperte: false, scadenza: '', testoSquadre: '', testoRegolamento: 'La società, inviando questo modulo, dichiara di aver letto il regolamento del torneo e di accettarlo.', disclaimer: '', catInfo: {} },
  };
}

// Completa i campi mancanti (tornei importati o creati da versioni precedenti)
export function normalizzaTorneo(t) {
  const base = nuovoTorneo({ nome: t.nome || 'Torneo', owner: t.owner });
  const out = { ...base, ...t };
  out.regole = { ...base.regole, ...(t.regole || {}), punti: normalizzaPunti(t.regole?.punti) };
  out.live = {
    sponsor: { ...base.live.sponsor, ...(t.live?.sponsor || {}) },
    info: { ...base.live.info, ...(t.live?.info || {}) },
    menu: { ...base.live.menu, ...(t.live?.menu || {}) },
  };
  out.iscrizioni = { ...base.iscrizioni, ...(t.iscrizioni || {}), catInfo: { ...(t.iscrizioni?.catInfo || {}) } };
  out.categorie = (t.categorie || []).map(({ emoji, ...c }) => ({ campi: 0, regole: null, fasi: [], icona: '', ...c }));
  out.societa = (t.societa || []).map(s => ({ id: s.id || uid(), nome: s.nome || 'Società', squadre: { ...(s.squadre || {}) }, atleti: { ...(s.atleti || {}) }, logo: !!s.logo }));
  return out;
}
