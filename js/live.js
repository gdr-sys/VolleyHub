// Pagina pubblica del torneo: classifiche e risultati in tempo reale, modalità schermo
import { getStore } from './store.js';
import { link, DEMO } from './config.js';
import {
  esc, normalizzaTorneo, regoleDi, classifica, risolviTabellone, squadraDi, esito, isFinita, isInCorso, setDa,
  elencoPartite, formatData, formatOra, normalizzaPrezzo, safeImg, plurale, descriviPunti,
} from './core.js';
import { icon, condividiLink, applicaTema, logoHtml, qrSvg } from './ui.js';

applicaTema();
const qs = new URLSearchParams(location.search);
const TID = qs.get('t');
const SCHERMO = qs.has('schermo');
const app = document.getElementById('app');

const L = { t: null, ris: {}, media: {}, sez: null, sub: 'classifiche', girone: 'tutti', q: '', aggiornato: null, mancante: false };
const FAV_KEY = 'vh_fav_' + TID;
let FAV = new Set();
try { FAV = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { /* storage non disponibile */ }
const salvaFav = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...FAV])); } catch { /* ignora */ } };

// ── Avvio ─────────────────────────────────────────────────
async function avvio() {
  if (!TID) { errore('Link incompleto', 'Manca l\'indicazione del torneo. Chiedi di nuovo il link all\'organizzatore.'); return; }
  let store;
  try { store = await getStore(); } catch { errore('Connessione assente', 'Non riesco a caricare il torneo. Controlla la connessione e ricarica la pagina.'); return; }
  store.watchTorneo(TID, d => {
    if (!d) { L.mancante = true; L.t = null; disegna(); return; }
    L.t = normalizzaTorneo(d);
    L.aggiornato = Date.now();
    document.title = `${L.t.nome} · Live`;
    disegna();
  }, () => errore('Torneo non disponibile', 'Il torneo non esiste più o non è pubblico.'));
  store.watchRisultati(TID, r => { L.ris = r; L.aggiornato = Date.now(); if (L.t) disegna(); }, () => {});
  store.watchMedia(TID, m => { L.media = m; if (L.t) disegna(); }, () => {});
}

function errore(titolo, testo) {
  app.innerHTML = `<div class="live-error"><img src="assets/logo-mark.svg" alt="" width="56" height="56"><h1>${esc(titolo)}</h1><p>${esc(testo)}</p></div>`;
}

const logoSoc = id => L.media['soc_' + id] || '';
const nomeSoc = id => L.t?.societa.find(s => s.id === id)?.nome || '';
const favKey = (catId, nome) => `${catId}|${nome}`;
const isFav = (catId, nome) => FAV.has(favKey(catId, nome));

// ── Disegno ───────────────────────────────────────────────
function disegna() {
  if (L.mancante) { errore('Torneo non trovato', 'Il link potrebbe essere sbagliato oppure il torneo è stato eliminato.'); return; }
  if (!L.t) return;
  if (SCHERMO) { disegnaSchermo(); return; }
  const a = document.activeElement, fid = a?.id, sel = fid && a.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null;
  const sy = window.scrollY;
  const t = L.t;
  const sezioni = [
    ...t.categorie.filter(c => c.fasi.length).map(c => ({ k: c.id, label: c.nome, colore: c.colore })),
    ...(FAV.size ? [{ k: 'mie', label: 'Le mie squadre', ic: 'star' }] : []),
    ...(t.live.info.attivo && t.live.info.blocchi.length ? [{ k: 'info', label: 'Info', ic: 'info' }] : []),
    ...(t.live.menu.attivo && t.live.menu.sezioni.length ? [{ k: 'menu', label: 'Menu', ic: 'utensils' }] : []),
    ...(t.live.sponsor.attivo && t.live.sponsor.gruppi.some(g => g.items.length) ? [{ k: 'sponsor', label: 'Sponsor', ic: 'handshake' }] : []),
  ];
  const daHash = decodeURIComponent(location.hash.slice(1));
  if (!L.sez || !sezioni.some(s => s.k === L.sez)) L.sez = sezioni.some(s => s.k === daHash) ? daHash : sezioni[0]?.k || null;
  const partite = elencoPartite(t, L.ris);
  const inCampo = partite.filter(p => isInCorso(p.risultato));

  let corpo;
  const cat = t.categorie.find(c => c.id === L.sez);
  if (!sezioni.length) corpo = `<div class="empty">${icon('calendar', 'big')}<h3>Il torneo sta per cominciare</h3><p>Gironi e partite compariranno qui appena l'organizzazione li pubblica. La pagina si aggiorna da sola.</p></div>`;
  else if (cat) corpo = vistaCategoria(cat);
  else if (L.sez === 'mie') corpo = vistaMie();
  else if (L.sez === 'info') corpo = vistaInfo();
  else if (L.sez === 'menu') corpo = vistaMenu();
  else if (L.sez === 'sponsor') corpo = vistaSponsor();

  app.innerHTML = `
    <header class="lv-head">
      <div class="lv-head-in">
        <img src="assets/logo-mark.svg" alt="" width="40" height="40" class="lv-mark">
        <div class="lv-title"><h1>${esc(t.nome)}</h1>
          <p>${t.data ? `<span>${esc(formatData(t.data))}</span>` : ''}${t.luogo ? `<span>${icon('pin')}${esc(t.luogo)}</span>` : ''}</p></div>
        <div class="lv-tools">
          <span class="lv-live" title="La pagina si aggiorna da sola"><i></i>Live${L.aggiornato ? ` <span class="num">${formatOra(L.aggiornato)}</span>` : ''}</span>
          <button class="lv-btn" data-a="condividi" aria-label="Condividi">${icon('share')}</button>
        </div>
      </div>
    </header>
    ${inCampo.length ? `<section class="lv-now" aria-label="Partite in corso"><div class="lv-now-in">
      <span class="lv-now-label"><i></i>In campo ora</span>
      ${inCampo.map(p => cardInCampo(p)).join('')}
    </div></section>` : ''}
    ${sezioni.length ? `<nav class="lv-tabs" aria-label="Sezioni"><div class="lv-tabs-in">${sezioni.map(s => `<button data-a="sez" data-k="${esc(s.k)}" aria-current="${L.sez === s.k ? 'page' : 'false'}" style="${s.colore ? `--c:${esc(s.colore)}` : ''}">${s.colore ? `<i class="dot" style="background:${esc(s.colore)}"></i>` : icon(s.ic)}${esc(s.label)}</button>`).join('')}</div></nav>` : ''}
    <main class="lv-main">${corpo}</main>
    <footer class="footer">Risultati in tempo reale con <a href="${esc(link('index.html'))}">VolleyHub</a>. Progetto e idea di <a href="mailto:noemi.marcolini@gmail.com">Noemi Marcolini</a>.</footer>`;

  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch { /* ignora */ } } }
  window.scrollTo(0, sy);
}

function punteggioLive(r) {
  return setDa(r).filter(([h, a]) => h !== '' || a !== '').map(([h, a]) => `<span>${h || 0}<i>–</i>${a || 0}</span>`).join('') || '<span>0<i>–</i>0</span>';
}
function cardInCampo(p) {
  return `<div class="lv-now-card" style="--c:${esc(p.cat.colore)}">
    <span class="lv-now-meta">${esc(p.cat.nome)}${p.campo ? `, ${esc(p.campo)}` : ''}</span>
    <span class="lv-now-teams"><b>${esc(p.h?.nome || p.hLabel)}</b><b>${esc(p.a?.nome || p.aLabel)}</b></span>
    <span class="lv-now-score num">${punteggioLive(p.risultato)}</span>
  </div>`;
}

// ── Categoria ─────────────────────────────────────────────
function vistaCategoria(c) {
  const haElim = c.fasi.some(f => f.tipo === 'elim');
  const haGironi = c.fasi.some(f => f.tipo !== 'elim');
  const subs = [haGironi && ['classifiche', 'Classifiche'], haGironi && ['partite', 'Partite'], haElim && ['tabellone', 'Tabellone']].filter(Boolean);
  if (!subs.some(([k]) => k === L.sub)) L.sub = haElim && !haGironi ? 'tabellone' : 'classifiche';
  const gironi = c.fasi.filter(f => f.tipo !== 'elim').flatMap(f => f.gironi.map(g => ({ f, g })));
  const multiFase = c.fasi.filter(f => f.tipo !== 'elim').length > 1;
  if (L.girone !== 'tutti' && !gironi.some(x => x.g.id === L.girone)) L.girone = 'tutti';
  const scelti = L.girone === 'tutti' ? gironi : gironi.filter(x => x.g.id === L.girone);
  const reg = regoleDi(L.t, c);

  let html = `<div class="lv-sub" style="--c:${esc(c.colore)}">
    <div class="segmented" role="tablist">${subs.map(([k, l]) => `<button role="tab" aria-selected="${L.sub === k}" data-a="sub" data-k="${k}">${l}</button>`).join('')}</div>
    ${L.sub === 'partite' ? `<label class="lv-search"><span class="sr-only">Cerca squadra</span>${icon('search')}<input id="lv-q" class="input" type="search" placeholder="Cerca squadra" value="${esc(L.q)}" data-i="cerca"></label>` : ''}
  </div>`;
  if (L.sub !== 'tabellone' && gironi.length > 1) {
    html += `<div class="lv-pills" role="group" aria-label="Filtra per girone"><button data-a="girone" data-k="tutti" aria-pressed="${L.girone === 'tutti'}">Tutti</button>${gironi.map(x => `<button data-a="girone" data-k="${x.g.id}" aria-pressed="${L.girone === x.g.id}">${multiFase ? esc(x.f.nome) + ', ' : ''}Girone ${esc(x.g.nome)}</button>`).join('')}</div>`;
  }
  if (L.sub === 'tabellone') {
    html += c.fasi.filter(f => f.tipo === 'elim').map(f => tabellone(c, f)).join('');
  } else if (L.sub === 'partite') {
    const q = L.q.trim().toLowerCase();
    const blocchi = scelti.map(({ f, g }) => {
      const lista = g.partite.filter(p => !q || [squadraDi(g, p.h).nome, squadraDi(g, p.a).nome].some(n => n.toLowerCase().includes(q)));
      if (!lista.length) return '';
      return `<section class="lv-card" style="--c:${esc(c.colore)}"><header>${multiFase ? `<small>${esc(f.nome)}</small>` : ''}<h2>Girone ${esc(g.nome)}</h2>${g.campo ? `<span class="chip">${icon('pin')}${esc(g.campo)}</span>` : ''}</header>
        <ul class="lv-matches">${lista.map(p => rigaPartita(c, g, p)).join('')}</ul></section>`;
    }).join('');
    html += blocchi || `<div class="empty"><p>Nessuna partita per “${esc(L.q)}”.</p></div>`;
  } else {
    html += scelti.map(({ f, g }) => {
      const cl = classifica(g, L.ris, reg.punti);
      const giocate = g.partite.filter(p => isFinita(L.ris[p.id])).length;
      return `<section class="lv-card" style="--c:${esc(c.colore)}"><header>${multiFase ? `<small>${esc(f.nome)}</small>` : ''}<h2>Girone ${esc(g.nome)}</h2>${g.campo ? `<span class="chip">${icon('pin')}${esc(g.campo)}</span>` : ''}<span class="spacer"></span><span class="muted small num">${giocate}/${g.partite.length} giocate</span></header>
        <table class="tbl lv-tbl"><thead><tr><th class="pos">#</th><th class="l">Squadra</th><th title="Giocate">G</th><th class="wide" title="Vinte">V</th><th class="wide" title="Perse">P</th><th class="wide" title="Differenza set">DS</th><th class="wide" title="Differenza punti">DP</th><th title="Punti">Pt</th><th class="star-col"><span class="sr-only">Segui</span></th></tr></thead><tbody>
        ${cl.map(r => `<tr class="${isFav(c.id, r.nome) ? 'is-fav' : ''}"><td class="pos">${r.g ? `<span class="pos-badge${r.pos <= 3 ? ' pos-' + r.pos : ''}">${r.pos}</span>` : r.pos}</td>
          <td class="l team"><span class="team-cell">${logoHtml(logoSoc(r.socId), nomeSoc(r.socId) || r.nome)}<span>${esc(r.nome)}${r.socId ? `<span class="soc">${esc(nomeSoc(r.socId))}</span>` : ''}</span></span></td>
          <td>${r.g}</td><td class="wide">${r.v}</td><td class="wide">${r.p}</td><td class="wide">${r.ds > 0 ? '+' : ''}${r.ds}</td><td class="wide">${r.dp > 0 ? '+' : ''}${r.dp}</td><td class="pt">${r.pt}</td>
          <td class="star-col">${stella(c.id, r.nome)}</td></tr>`).join('')}
        </tbody></table></section>`;
    }).join('') + `<p class="hint lv-legend">Punti: ${esc(descriviPunti(reg.punti))}. Tocca la stella per seguire una squadra.</p>`;
  }
  return html;
}

function stella(catId, nome) {
  const on = isFav(catId, nome);
  return `<button class="lv-star${on ? ' on' : ''}" data-a="fav" data-c="${esc(catId)}" data-n="${esc(nome)}" aria-pressed="${on}" aria-label="${on ? 'Smetti di seguire' : 'Segui'} ${esc(nome)}">${icon('star')}</button>`;
}

function rigaPartita(c, g, p) {
  const h = squadraDi(g, p.h), a = squadraDi(g, p.a), r = L.ris[p.id];
  const e = esito(r), live = isInCorso(r);
  const sets = setDa(r).filter(([x, y]) => x !== '' || y !== '');
  const campo = p.campo || '';
  const stato = live ? '<span class="chip chip-live">In corso</span>' : e ? '' : `<span class="muted small">Da giocare${campo ? `, ${esc(campo)}` : ''}</span>`;
  const riga = (sq, lato, vince) => `<div class="lm-team${vince ? ' win' : ''}${isFav(c.id, sq.nome) ? ' fav' : ''}">${logoHtml(logoSoc(sq.socId), nomeSoc(sq.socId) || sq.nome)}<span>${esc(sq.nome)}</span></div>
    ${sets.map(s => `<b class="num lm-s${(lato ? s[1] > s[0] : s[0] > s[1]) ? ' w' : ''}">${s[lato] === '' ? 0 : s[lato]}</b>`).join('')}`;
  return `<li class="lm${live ? ' live' : ''}${e ? ' done' : ''}">
    <div class="lm-grid" style="--n:${Math.max(sets.length, 0)}">${riga(h, 0, e?.vincitore === 'h')}${riga(a, 1, e?.vincitore === 'a')}</div>
    ${stato || p.leg === 2 || p.nota ? `<div class="lm-meta">${p.leg === 2 ? '<span class="muted small">Ritorno</span>' : ''}${p.nota ? `<span class="muted small">${esc(p.nota)}</span>` : ''}${stato}</div>` : ''}
  </li>`;
}

function tabellone(c, f) {
  const res = risolviTabellone(f, L.ris);
  const box = m => {
    const sets = m.risultato ? setDa(m.risultato).filter(([x, y]) => x !== '' || y !== '') : [];
    const live = isInCorso(m.risultato);
    const riga = (sq, label, lato) => `<div class="bm-team${m.vincente && sq && m.vincente.nome === sq.nome ? ' win' : ''}${m.perdente && sq && m.perdente.nome === sq.nome ? ' lose' : ''}">
      ${sq ? `${logoHtml(logoSoc(sq.socId), nomeSoc(sq.socId) || sq.nome)}<span>${esc(sq.nome)}</span>` : `<span class="muted">${esc(label)}</span>`}
      <span class="spacer"></span>${sets.map(s => `<b class="num">${s[lato] === '' ? 0 : s[lato]}</b>`).join('')}</div>`;
    return `<div class="bm${live ? ' live' : ''}"><div class="bm-label">${esc(m.etichetta)}${live ? ' <span class="chip chip-live">In corso</span>' : ''}${f.campi?.[m.id] ? `<span class="muted"> ${esc(f.campi[m.id])}</span>` : ''}</div>${riga(m.h, m.hLabel, 0)}${riga(m.a, m.aLabel, 1)}</div>`;
  };
  return `<section class="lv-card" style="--c:${esc(c.colore)}"><header><h2>${esc(f.nome)}</h2></header>
    ${res.podio ? `<div class="lv-podium">${[[1, '2°'], [0, '1°'], [2, '3°']].map(([i, l]) => res.podio[i] ? `<div class="lp lp-${i + 1}"><span class="num">${l}</span>${logoHtml(logoSoc(res.podio[i].socId), nomeSoc(res.podio[i].socId) || res.podio[i].nome, true)}<strong>${esc(res.podio[i].nome)}</strong></div>` : '').join('')}</div>` : ''}
    <div class="lv-bracket">${res.turni.map(tu => `<div class="lb-col"><h3>${esc(tu.nome)}</h3>${tu.partite.map(box).join('')}</div>`).join('')}
    ${res.terzo ? `<div class="lb-col"><h3>3° posto</h3>${box(res.terzo)}</div>` : ''}</div></section>`;
}

// ── Le mie squadre ────────────────────────────────────────
function vistaMie() {
  const t = L.t;
  const out = [];
  for (const key of FAV) {
    const [catId, nome] = [key.slice(0, key.indexOf('|')), key.slice(key.indexOf('|') + 1)];
    const c = t.categorie.find(x => x.id === catId);
    if (!c) continue;
    const reg = regoleDi(t, c);
    let pos = null, girone = null, socId = '';
    const partite = elencoPartite({ ...t, categorie: [c] }, L.ris).filter(p => p.h?.nome === nome || p.a?.nome === nome);
    for (const f of c.fasi) for (const g of f.gironi || []) {
      const r = classifica(g, L.ris, reg.punti).find(x => x.nome === nome);
      if (r) { pos = r; girone = `${f.nome}, girone ${g.nome}`; socId = r.socId; }
    }
    const prossima = partite.find(p => !isFinita(p.risultato) && p.pronta);
    const giocate = partite.filter(p => isFinita(p.risultato)).reverse();
    out.push(`<section class="lv-card mie" style="--c:${esc(c.colore)}">
      <header>${logoHtml(logoSoc(socId), nomeSoc(socId) || nome, true)}<div style="flex:1;min-width:0"><h2>${esc(nome)}</h2><span class="muted small">${esc(c.nome)}${socId ? `, ${esc(nomeSoc(socId))}` : ''}</span></div>${stella(catId, nome)}</header>
      <div class="mie-body">
        ${pos ? `<div class="mie-pos"><b class="num">${pos.pos}°</b><span>${esc(girone)}<br><strong class="num">${pos.pt}</strong> punti in ${plurale(pos.g, 'partita', 'partite')}</span></div>` : ''}
        ${prossima ? `<div class="mie-next"><span class="label">${isInCorso(prossima.risultato) ? 'In campo ora' : 'Prossima partita'}</span><strong>${esc(prossima.h?.nome)} – ${esc(prossima.a?.nome)}</strong><span class="muted small">${esc(prossima.etichetta)}${prossima.campo ? `, ${esc(prossima.campo)}` : ''}</span>${isInCorso(prossima.risultato) ? `<span class="num mie-score">${punteggioLive(prossima.risultato)}</span>` : ''}</div>` : ''}
        ${giocate.length ? `<ul class="mie-res">${giocate.map(p => { const e = esito(p.risultato); const vinto = (e.vincitore === 'h') === (p.h?.nome === nome); return `<li><span class="mie-wl ${e.vincitore ? (vinto ? 'w' : 'l') : 'd'}">${e.vincitore ? (vinto ? 'V' : 'P') : 'N'}</span><span>${esc(p.h?.nome === nome ? p.a?.nome : p.h?.nome)}</span><span class="num">${e.sets.map(([x, y]) => p.h?.nome === nome ? `${x}–${y}` : `${y}–${x}`).join('  ')}</span></li>`; }).join('')}</ul>` : ''}
      </div></section>`);
  }
  return out.join('') || `<div class="empty">${icon('star', 'big')}<h3>Nessuna squadra seguita</h3><p>Tocca la stella accanto a una squadra in classifica per vederla qui.</p></div>`;
}

// ── Info, menu, sponsor ───────────────────────────────────
function vistaInfo() {
  return L.t.live.info.blocchi.filter(b => b.titolo || b.testo).map(b => `<section class="lv-card lv-text">${b.titolo ? `<header><h2>${esc(b.titolo)}</h2></header>` : ''}<p>${esc(b.testo).replace(/\n/g, '<br>')}</p></section>`).join('');
}
function vistaMenu() {
  const m = L.t.live.menu;
  return `${m.note ? `<p class="note lv-note">${esc(m.note)}</p>` : ''}${m.sezioni.filter(s => s.voci.length).map(s => `<section class="lv-card"><header><h2>${esc(s.nome)}</h2></header><ul class="lv-menu">${s.voci.filter(v => v.nome).map(v => `<li><div><strong>${esc(v.nome)}</strong>${v.desc ? `<small>${esc(v.desc)}</small>` : ''}</div><span class="lv-dots" aria-hidden="true"></span><b class="num">${esc(normalizzaPrezzo(v.prezzo) || v.prezzo)}</b></li>`).join('')}</ul></section>`).join('')}`;
}
function vistaSponsor() {
  return L.t.live.sponsor.gruppi.filter(g => g.items.length).map(g => `<section class="lv-card"><header><h2>${esc(g.nome || 'Sponsor')}</h2></header>
    <div class="lv-sponsors">${g.items.map(it => {
      const src = it.img === 'media' ? L.media['sp_' + it.id] : safeImg(it.img);
      return `<div class="sp sp-${esc(it.size || 'medio')}">${src ? `<img src="${esc(src)}" alt="${esc(it.nome)}" loading="lazy">` : ''}${it.nome ? `<strong>${esc(it.nome)}</strong>` : ''}${it.frase ? `<small>${esc(it.frase)}</small>` : ''}</div>`;
    }).join('')}</div></section>`).join('');
}

// ── Modalità schermo (palazzetto) ─────────────────────────
const SC = { i: 0, pausa: false, timer: null, qr: '', durata: 15000, inizio: 0 };
function slides() {
  const t = L.t, out = [];
  const inCampo = elencoPartite(t, L.ris).filter(p => isInCorso(p.risultato));
  if (inCampo.length) out.push({ tipo: 'campo', titolo: 'In campo ora', partite: inCampo });
  for (const c of t.categorie) {
    const fasiG = c.fasi.filter(f => f.tipo !== 'elim');
    const ultimaG = fasiG[fasiG.length - 1];
    for (const f of c.fasi) {
      if (f.tipo === 'elim') out.push({ tipo: 'elim', c, f, titolo: `${c.nome}: ${f.nome}` });
      else if (f === ultimaG) for (const g of f.gironi) out.push({ tipo: 'girone', c, f, g, titolo: `${c.nome}: girone ${g.nome}` });
    }
  }
  return out;
}
function disegnaSchermo() {
  document.body.classList.add('screen');
  const lista = slides();
  if (!lista.length) { app.innerHTML = `<div class="sc-empty"><img src="assets/logo-mark.svg" alt="" width="96"><h1>${esc(L.t.nome)}</h1><p>Le classifiche compariranno qui a inizio torneo.</p></div>`; return; }
  SC.i = SC.i % lista.length;
  const s = lista[SC.i];
  let corpo = '';
  if (s.tipo === 'campo') {
    corpo = `<div class="sc-campo">${s.partite.map(p => `<div class="sc-live" style="--c:${esc(p.cat.colore)}"><span class="sc-live-meta">${esc(p.cat.nome)}${p.campo ? `, ${esc(p.campo)}` : ''}</span><div class="sc-live-row"><b>${esc(p.h?.nome || p.hLabel)}</b><span class="num">${punteggioLive(p.risultato)}</span><b>${esc(p.a?.nome || p.aLabel)}</b></div></div>`).join('')}</div>`;
  } else if (s.tipo === 'girone') {
    const reg = regoleDi(L.t, s.c);
    const cl = classifica(s.g, L.ris, reg.punti);
    const prossime = s.g.partite.filter(p => !isFinita(L.ris[p.id])).slice(0, 3);
    corpo = `<div class="sc-girone"><table class="sc-tbl"><thead><tr><th></th><th class="l">Squadra</th><th>G</th><th>V</th><th>P</th><th>Pt</th></tr></thead><tbody>
      ${cl.map(r => `<tr><td><span class="pos-badge${r.pos <= 3 && r.g ? ' pos-' + r.pos : ''}">${r.pos}</span></td><td class="l"><span class="team-cell">${logoHtml(logoSoc(r.socId), nomeSoc(r.socId) || r.nome, true)}<span>${esc(r.nome)}<small>${esc(nomeSoc(r.socId))}</small></span></span></td><td>${r.g}</td><td>${r.v}</td><td>${r.p}</td><td class="pt">${r.pt}</td></tr>`).join('')}
    </tbody></table>
    ${prossime.length ? `<aside class="sc-next"><h3>Prossime partite</h3>${prossime.map(p => `<div class="${isInCorso(L.ris[p.id]) ? 'live' : ''}"><b>${esc(squadraDi(s.g, p.h).nome)}</b><span class="muted">contro</span><b>${esc(squadraDi(s.g, p.a).nome)}</b>${isInCorso(L.ris[p.id]) ? `<span class="num sc-mini">${punteggioLive(L.ris[p.id])}</span>` : ''}</div>`).join('')}</aside>` : ''}</div>`;
  } else corpo = tabellone(s.c, s.f);

  app.innerHTML = `<div class="sc" style="--c:${esc(s.c?.colore || '#FFC93C')}">
    <header class="sc-head"><img src="assets/logo-mark.svg" alt="" width="54"><div><p>${esc(L.t.nome)}</p><h1>${esc(s.titolo)}</h1></div><span class="spacer"></span><span class="sc-count num">${SC.i + 1}/${lista.length}</span></header>
    <div class="sc-body">${corpo}</div>
    <div class="sc-qr">${SC.qr}<span>Segui dal telefono</span></div>
    <div class="sc-bar"><i style="animation-duration:${SC.durata}ms;animation-play-state:${SC.pausa ? 'paused' : 'running'}"></i></div>
    <div class="sc-ctrl"><button data-a="scPrev" aria-label="Precedente">${icon('left')}</button><button data-a="scPausa" aria-label="${SC.pausa ? 'Riprendi' : 'Pausa'}">${icon(SC.pausa ? 'play' : 'pause')}</button><button data-a="scNext" aria-label="Successiva">${icon('right')}</button><button data-a="scFull" aria-label="Schermo intero">${icon('tv')}</button></div>
  </div>`;
}
function avviaRotazione() {
  clearInterval(SC.timer);
  SC.timer = setInterval(() => { if (!SC.pausa && L.t) { SC.i++; disegnaSchermo(); } }, SC.durata);
}
if (SCHERMO) {
  const urlPubblico = link('live.html', { t: TID });
  qrSvg(urlPubblico).then(s => { SC.qr = s; if (L.t) disegnaSchermo(); }).catch(() => {});
  avviaRotazione();
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') AZ.scNext();
    else if (e.key === 'ArrowLeft') AZ.scPrev();
    else if (e.key === ' ') { e.preventDefault(); AZ.scPausa(); }
  });
}

// ── Eventi ────────────────────────────────────────────────
const AZ = {
  sez(el) { L.sez = el.dataset.k; L.girone = 'tutti'; L.q = ''; history.replaceState(null, '', '#' + encodeURIComponent(L.sez)); disegna(); window.scrollTo(0, 0); },
  sub(el) { L.sub = el.dataset.k; disegna(); },
  girone(el) { L.girone = el.dataset.k; disegna(); },
  fav(el) {
    const k = favKey(el.dataset.c, el.dataset.n);
    FAV.has(k) ? FAV.delete(k) : FAV.add(k);
    salvaFav();
    disegna();
  },
  condividi() {
    const url = link('live.html', { t: TID });
    if (navigator.share) navigator.share({ title: L.t.nome, text: `Segui ${L.t.nome} in diretta`, url }).catch(() => {});
    else condividiLink({ titolo: 'Condividi il torneo', descrizione: 'Chi apre il link vede classifiche e risultati in tempo reale.', url, messaggio: `Segui ${L.t.nome} in diretta:` });
  },
  scNext() { SC.i++; avviaRotazione(); disegnaSchermo(); },
  scPrev() { SC.i = Math.max(0, SC.i - 1 + slides().length) ; avviaRotazione(); disegnaSchermo(); },
  scPausa() { SC.pausa = !SC.pausa; disegnaSchermo(); },
  scFull() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {}); },
};
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && AZ[el.dataset.a]) { e.preventDefault(); AZ[el.dataset.a](el); } });
document.addEventListener('input', e => { if (e.target.dataset.i === 'cerca') { L.q = e.target.value; disegna(); } });
window.addEventListener('hashchange', () => { const k = decodeURIComponent(location.hash.slice(1)); if (k && k !== L.sez) { L.sez = k; disegna(); } });
if (DEMO) document.documentElement.classList.add('is-demo');

avvio();
