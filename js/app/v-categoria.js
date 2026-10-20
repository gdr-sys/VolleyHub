// Pagina di una categoria: creazione gironi, risultati, tabellone, classifiche, fasi successive
import {
  esc, uid, plurale, clamp, intOr, regoleDi, descriviPunti, squadreTotali, suggerisciGironi, dimensioniUniformi,
  creaGironi, classifica, classificaAvulsa, risolviTabellone, creaTabellone, DIMENSIONI_TABELLONE, setDa, setPerDb,
  validaSet, isFinita, isInCorso, esito, rigeneraPartite, generaPartite, squadraDi, serpentina, statisticheCategoria,
  nomiSquadreCategoria, contaPartite, formatOra, normalizzaPunti,
} from '../core.js';
import { link } from '../config.js';
import { icon, toast, conferma, modal, chiedi, condividiLink, logoHtml } from '../ui.js';
import { S, registra, modifica, render, cat, societa, logoSoc, nomeSoc, hashTorneo, salvaOra } from './stato.js';
import { editorRegole, stepper, vuoto } from './comp.js';
import { finestraCategoria } from './v-torneo.js';

const TAB = [['partite', 'Partite', 'list'], ['classifiche', 'Classifiche', 'trophy'], ['risultati', 'Risultati', 'clock'], ['statistiche', 'Statistiche', 'chart'], ['regole', 'Regole', 'settings']];

export function vistaCategoria(c) {
  const t = S.torneo, reg = regoleDi(t, c);
  const b = S.builder[c.id];
  const tab = S.catTab[c.id] || 'partite';
  const head = `<div class="page-head cat-head" style="--cat:${esc(c.colore)}">
      <div><h1 class="cat-title"><i class="dot dot-xl" style="background:${esc(c.colore)}"></i>${esc(c.nome)}</h1>
        <p class="muted small" style="margin-top:6px">${esc(descriviPunti(reg.punti))}, ${plurale(reg.set, 'set', 'set')} per partita${reg.personalizzate ? ' (regole della categoria)' : ''}</p></div>
      <div class="row-wrap">
        ${c.fasi.length ? `<a class="btn" href="${esc(link('stampa.html', { t: S.tid, c: c.id }))}" target="_blank" rel="noopener">${icon('print')}Stampa</a>` : ''}
        <button class="btn" data-a="modificaCategoria" data-id="${c.id}">${icon('edit')}Modifica</button>
      </div>
    </div>`;

  if (b?.aperto) return head + vistaBuilder(c, b);
  if (!c.fasi.length && tab !== 'regole') return head + tabs(c, 'partite', true) + vistaSetup(c);

  let corpo;
  if (tab === 'classifiche') corpo = vistaClassifiche(c);
  else if (tab === 'risultati') corpo = vistaRisultati(c);
  else if (tab === 'statistiche') corpo = vistaStatistiche(c);
  else if (tab === 'regole') corpo = vistaRegole(c);
  else corpo = vistaPartite(c);
  return head + tabs(c, tab, !c.fasi.length) + corpo;
}

function tabs(c, attiva, soloSetup) {
  const voci = soloSetup ? TAB.filter(([k]) => k === 'partite' || k === 'regole') : TAB;
  return `<div class="segmented tabs-bar" role="tablist">${voci.map(([k, l, ic]) => `<button role="tab" aria-selected="${k === attiva}" data-a="catTab" data-id="${c.id}" data-tab="${k}">${icon(ic)}${soloSetup && k === 'partite' ? 'Gironi' : l}</button>`).join('')}</div>`;
}

// ── Creazione gironi ──────────────────────────────────────
function setupDi(c) {
  const k = 'setup:' + c.id;
  if (!S.builder[k]) S.builder[k] = { gironi: null, nomi: 'fantasia', ritorno: false, set: null };
  return S.builder[k];
}

function vistaSetup(c) {
  const t = S.torneo, st = setupDi(c), reg = regoleDi(t, c);
  const tot = squadreTotali(t, c.id);
  const conSquadre = t.societa.filter(s => intOr(s.squadre?.[c.id]) > 0);
  const sug = suggerisciGironi(tot, c.campi || 1);
  const nG = clamp(st.gironi ?? sug?.gironi ?? 1, 1, Math.max(1, Math.floor(tot / 2)));
  const dim = tot >= 2 ? dimensioniUniformi(tot, nG) : [];
  const nSet = st.set ?? reg.set;
  const partite = dim.reduce((s, n) => s + n * (n - 1) / 2, 0) * (st.ritorno ? 2 : 1);

  if (tot < 2) {
    return `<section class="panel">${vuoto({
      icona: 'users', titolo: tot ? 'Serve almeno un\'altra squadra' : 'Nessuna squadra iscritta in questa categoria',
      testo: 'I gironi si creano dalle squadre delle società. Aggiungi le società indicando quante squadre portano, oppure crea un girone vuoto e scrivi tu i nomi.',
      azioni: `<a class="btn btn-primary" href="${hashTorneo('societa')}">${icon('users')}Vai alle società</a><button class="btn" data-a="gironeVuoto" data-id="${c.id}">${icon('plus')}Girone vuoto</button>`,
    })}</section>`;
  }

  return `<section class="panel">
    <div class="panel-head"><h2>Crea i gironi</h2></div>
    <div class="panel-body stack-lg">
      <div>
        <span class="label">${plurale(tot, 'squadra iscritta', 'squadre iscritte')}</span>
        <div class="row-wrap" style="margin-top:8px">${conSquadre.map(s => `<span class="chip">${logoHtml(logoSoc(s.id), s.nome)}${esc(s.nome)}${intOr(s.squadre[c.id]) > 1 ? ` <b class="num">×${intOr(s.squadre[c.id])}</b>` : ''}</span>`).join('')}</div>
      </div>
      <div class="grid-2">
        <div class="field"><span>Campi disponibili</span>${stepper({ id: 'su-campi', valore: c.campi || 1, min: 1, max: 20, a: 'suStep', c: 'suCampo', dati: `data-id="${c.id}" data-k="campi"`, label: 'Campi disponibili' })}<span class="hint">Un girone per campo, così si gioca in parallelo.</span></div>
        <div class="field"><span>Numero di gironi</span>${stepper({ id: 'su-gironi', valore: nG, min: 1, max: Math.max(1, Math.floor(tot / 2)), a: 'suStep', c: 'suCampo', dati: `data-id="${c.id}" data-k="gironi"`, label: 'Numero di gironi' })}<span class="hint">${sug && sug.gironi === nG ? 'Consigliato in base ai campi.' : `Consigliati: ${sug?.gironi}.`}</span></div>
      </div>
      <div class="preview-gironi">${dim.map((n, i) => `<div><b>Girone ${String.fromCharCode(65 + i)}</b><span class="num">${n}</span><small>${plurale(n * (n - 1) / 2 * (st.ritorno ? 2 : 1), 'partita', 'partite')}</small></div>`).join('')}</div>
      <fieldset class="fs"><legend>Nomi delle squadre</legend>
        <div class="choices">
          <label class="choice"><input type="radio" name="su-nomi" value="fantasia" ${st.nomi === 'fantasia' ? 'checked' : ''} data-c="suNomi" data-id="${c.id}"><span class="box"><strong>Nomi di fantasia</strong><small>Leoni, Comete, Onde… Ideale per i più piccoli.</small></span></label>
          <label class="choice"><input type="radio" name="su-nomi" value="societa" ${st.nomi === 'societa' ? 'checked' : ''} data-c="suNomi" data-id="${c.id}"><span class="box"><strong>Nome della società</strong><small>Volley Riviera A, Volley Riviera B…</small></span></label>
        </div>
      </fieldset>
      <div class="row-wrap" style="gap:20px">
        <div class="field"><span>Set per partita</span><div class="segmented">${[1, 2, 3].map(n => `<button type="button" aria-selected="${nSet === n}" data-a="suSet" data-id="${c.id}" data-n="${n}">${n}</button>`).join('')}</div></div>
        <label class="switch"><input type="checkbox" ${st.ritorno ? 'checked' : ''} data-c="suRitorno" data-id="${c.id}"><span class="track"></span><span>Andata e ritorno</span></label>
      </div>
      <div class="note">${plurale(partite, 'partita', 'partite')} in totale. Le squadre della stessa società vengono messe in gironi diversi quando possibile.</div>
    </div>
    <div class="panel-foot">
      <button class="btn btn-ghost" data-a="gironeVuoto" data-id="${c.id}">${icon('plus')}Preferisco un girone vuoto</button>
      <span class="spacer"></span>
      <button class="btn btn-accent" data-a="creaGironi" data-id="${c.id}">${icon('grid')}Crea ${plurale(nG, 'girone', 'gironi')}</button>
    </div>
  </section>`;
}

// ── Elenco partite per fase ───────────────────────────────
function vistaPartite(c) {
  const t = S.torneo;
  let html = '';
  c.fasi.forEach(f => {
    const chiusa = S.aperti.has('chiusa:' + f.id);
    const info = f.tipo === 'elim' ? 'Eliminazione diretta' : plurale(f.gironi.length, 'girone', 'gironi');
    html += `<section class="fase${chiusa ? ' is-closed' : ''}">
      <header class="fase-head">
        <button class="fase-toggle" data-a="toggleFase" data-id="${f.id}" aria-expanded="${!chiusa}">${icon(chiusa ? 'right' : 'down')}<h2>${esc(f.nome)}</h2></button>
        <span class="chip">${info}</span>
        <span class="spacer"></span>
        <details class="menu"><summary class="btn btn-ghost btn-icon btn-sm" aria-label="Azioni fase">${icon('more')}</summary><div class="menu-list">
          <button data-a="rinominaFase" data-cat="${c.id}" data-id="${f.id}">${icon('edit')}Rinomina</button>
          ${f.tipo !== 'elim' ? `<button data-a="aggiungiGirone" data-cat="${c.id}" data-id="${f.id}">${icon('plus')}Aggiungi girone</button>` : ''}
          <button class="danger" data-a="eliminaFase" data-cat="${c.id}" data-id="${f.id}">${icon('trash')}Elimina fase</button>
        </div></details>
      </header>
      ${chiusa ? '' : f.tipo === 'elim' ? vistaTabellone(c, f) : `<div class="gironi">${f.gironi.map(g => vistaGirone(c, f, g)).join('')}</div>`}
    </section>`;
  });
  const ultima = c.fasi[c.fasi.length - 1];
  const { tot, giocate } = contaPartite(c, S.risultati);
  if (ultima && ultima.tipo !== 'elim') {
    html += `<section class="panel next-phase"><div class="panel-body row-wrap">
      <div style="flex:1;min-width:220px"><h3>${giocate === tot && tot ? 'Gironi conclusi' : 'Quando i gironi finiscono'}</h3><p class="muted small">Crea un tabellone a eliminazione o nuovi gironi partendo dalla classifica.</p></div>
      <button class="btn ${giocate === tot && tot ? 'btn-accent' : ''}" data-a="apriBuilder" data-id="${c.id}">${icon('bracket')}Crea la fase successiva</button>
    </div></section>`;
  }
  return html;
}

function vistaGirone(c, f, g) {
  const reg = regoleDi(S.torneo, c);
  const cl = classifica(g, S.risultati, reg.punti);
  const giocate = g.partite.filter(p => isFinita(S.risultati[p.id])).length;
  const andata = g.partite.filter(p => (p.leg || 1) === 1), ritorno = g.partite.filter(p => p.leg === 2);
  const card = (p, i) => cardPartita({
    mid: p.id, num: i + 1, h: squadraDi(g, p.h), a: squadraDi(g, p.a), nSet: g.set,
    meta: [p.leg === 2 ? 'Ritorno' : '', p.campo || ''].filter(Boolean), nota: p.nota, campoGirone: g.campo,
    ctx: `data-cat="${c.id}" data-fase="${f.id}" data-gir="${g.id}"`,
  });
  return `<section class="girone" style="--cat:${esc(c.colore)}">
    <header class="girone-head">
      <h3>Girone ${esc(g.nome)}</h3>
      ${g.campo ? `<span class="chip">${icon('pin')}${esc(g.campo)}</span>` : ''}
      <span class="chip">${plurale(g.set, 'set', 'set')}${g.ritorno ? ', andata e ritorno' : ''}</span>
      ${g.timer ? `<span class="chip">${icon('clock')}${g.timer} min</span>` : ''}
      <span class="spacer"></span>
      <span class="muted small num">${giocate}/${g.partite.length}</span>
      <button class="btn btn-sm" data-a="modificaGirone" data-cat="${c.id}" data-fase="${f.id}" data-gir="${g.id}">${icon('edit')}Modifica</button>
    </header>
    <div class="girone-body">
      <div class="girone-cl">
        <table class="tbl tbl-compact"><thead><tr><th class="pos">#</th><th class="l">Squadra</th><th title="Partite giocate">G</th><th title="Punti">Pt</th></tr></thead><tbody>
          ${cl.map(r => `<tr class="${r.pos <= 3 && r.g ? 'top' : ''}"><td class="pos">${r.g ? `<span class="pos-badge${r.pos <= 3 ? ' pos-' + r.pos : ''}">${r.pos}</span>` : r.pos}</td><td class="l team"><span class="team-cell">${logoHtml(logoSoc(r.socId), nomeSoc(r.socId) || r.nome)}<span>${esc(r.nome)}${r.socId ? `<span class="soc">${esc(nomeSoc(r.socId))}</span>` : ''}</span></span></td><td>${r.g}</td><td class="pt">${r.pt}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="match-list">
        ${andata.map(card).join('')}
        ${ritorno.length ? `<div class="list-sep">Ritorno</div>${ritorno.map((p, i) => card(p, andata.length + i)).join('')}` : ''}
      </div>
    </div>
  </section>`;
}

// Scheda partita stile tabellone segnapunti, con inserimento diretto dei set
function cardPartita({ mid, num, h, a, hLabel, aLabel, nSet, meta = [], nota = '', campoGirone = '', ctx = '', elim = false, pronta = true, obsoleto = false, titolo = '' }) {
  const r = S.risultati[mid];
  const bozza = S.bozze[mid];
  const salvati = setDa(r);
  const vals = Array.from({ length: nSet }, (_, i) => bozza?.[i] || salvati[i] || ['', '']);
  const e = esito(r);
  const live = isInCorso(r), fatta = isFinita(r);
  const vinceH = e?.vincitore === 'h', vinceA = e?.vincitore === 'a';
  const riga = (sq, label, lato, vince) => `
    <div class="sb-team${vince ? ' win' : ''}">
      ${sq ? `${logoHtml(logoSoc(sq.socId), nomeSoc(sq.socId) || sq.nome)}<span class="sb-name">${esc(sq.nome)}${sq.socId && nomeSoc(sq.socId) !== sq.nome ? `<small>${esc(nomeSoc(sq.socId))}</small>` : ''}</span>` : `<span class="sb-name muted">${esc(label)}</span>`}
    </div>
    ${vals.map((v, si) => `<input class="sc num" id="sc-${mid}-${si}-${lato}" type="number" inputmode="numeric" min="0" max="99" value="${esc(v[lato])}" aria-label="Set ${si + 1}, ${esc(sq?.nome || label)}" data-i="punteggio" data-mid="${mid}" data-s="${si}" data-l="${lato}" data-n="${nSet}" data-enter="salvaPunteggio" ${ctx} ${elim ? 'data-elim="1"' : ''} ${pronta ? '' : 'disabled'}>`).join('')}`;
  const stato = live ? '<span class="chip chip-live">In corso</span>' : fatta ? '<span class="chip chip-ok">Finita</span>' : '';
  return `<article class="match${live ? ' is-live' : ''}${fatta ? ' is-done' : ''}${bozza ? ' is-dirty' : ''}" data-card="${mid}">
    <div class="match-top">
      ${titolo ? `<strong class="small">${esc(titolo)}</strong>` : `<span class="muted small num">#${num}</span>`}
      ${meta.map(m => `<span class="muted small">${esc(m)}</span>`).join('')}
      ${nota ? `<span class="muted small" title="${esc(nota)}">${icon('info')}</span>` : ''}
      <span class="spacer"></span>${stato}
    </div>
    ${obsoleto ? '<p class="note note-warn small">Le squadre sono cambiate dopo un risultato precedente: reinserisci il punteggio.</p>' : ''}
    <div class="sb" style="--sets:${nSet}">
      <div class="sb-head"></div>${vals.map((_, i) => `<div class="sb-head num">${nSet > 1 ? `Set ${i + 1}` : 'Punti'}</div>`).join('')}
      ${riga(h, hLabel, 0, vinceH)}
      ${riga(a, aLabel, 1, vinceA)}
    </div>
    ${pronta ? `<div class="match-actions">
      <button class="btn btn-sm btn-primary if-dirty" data-a="salvaPunteggio" data-mid="${mid}" data-n="${nSet}" ${ctx} ${elim ? 'data-elim="1"' : ''}>${icon('check')}Salva</button>
      <button class="btn btn-sm btn-ghost if-dirty" data-a="annullaBozza" data-mid="${mid}">Annulla</button>
      <span class="spacer"></span>
      ${!fatta ? `<button class="btn btn-sm if-clean ${live ? 'btn-danger' : 'btn-ghost'}" data-a="inCorso" data-mid="${mid}" data-n="${nSet}" ${elim ? 'data-elim="1"' : ''} ${ctx} title="${live ? 'Togli dalla diretta' : 'Mostra come in corso nella pagina pubblica'}">${icon(live ? 'pause' : 'play')}${live ? 'Ferma' : 'In campo'}</button>` : ''}
      <button class="btn btn-sm btn-ghost btn-icon" data-a="linkSegnapunti" data-mid="${mid}" title="Link segnapunti" aria-label="Link segnapunti">${icon('whistle')}</button>
      <details class="menu"><summary class="btn btn-sm btn-ghost btn-icon" aria-label="Altre azioni">${icon('more')}</summary><div class="menu-list menu-right">
        ${!elim ? `<button data-a="dettagliPartita" data-mid="${mid}" ${ctx}>${icon('pin')}Campo e nota</button>` : `<button data-a="campoElim" data-mid="${mid}" ${ctx}>${icon('pin')}Campo</button>`}
        ${r ? `<button class="danger" data-a="cancellaRisultato" data-mid="${mid}">${icon('trash')}Cancella risultato</button>` : ''}
      </div></details>
    </div>` : `<p class="muted small match-wait">${icon('clock')}In attesa dei turni precedenti</p>`}
  </article>`;
}

// ── Tabellone ─────────────────────────────────────────────
function vistaTabellone(c, f) {
  const res = risolviTabellone(f, S.risultati);
  const sq = x => x ? { ...x, id: x.nome } : null;
  const podio = res.podio ? `<div class="podium">
      ${[[1, 'p2', '2°'], [0, 'p1', '1°'], [2, 'p3', '3°']].map(([i, cls, l]) => res.podio[i] ? `<div class="podium-step ${cls}"><span class="podium-pos num">${l}</span>${logoHtml(logoSoc(res.podio[i].socId), res.podio[i].nome, true)}<strong>${esc(res.podio[i].nome)}</strong></div>` : '').join('')}
    </div>` : '';
  const ctx = `data-cat="${c.id}" data-fase="${f.id}"`;
  return `${podio}
    <div class="bracket" style="--cat:${esc(c.colore)}">
      ${res.turni.map(tu => `<div class="bracket-col"><h3 class="bracket-title">${esc(tu.nome)}</h3>
        ${tu.partite.map(m => cardPartita({ mid: m.id, titolo: m.etichetta, h: sq(m.h), a: sq(m.a), hLabel: m.hLabel, aLabel: m.aLabel, nSet: f.tabellone.set, elim: true, pronta: m.pronta, obsoleto: m.obsoleto, meta: [f.campi?.[m.id] || ''].filter(Boolean), ctx })).join('')}
      </div>`).join('')}
      ${res.terzo ? `<div class="bracket-col"><h3 class="bracket-title">Finale 3° posto</h3>${cardPartita({ mid: res.terzo.id, titolo: 'Finale 3° posto', h: sq(res.terzo.h), a: sq(res.terzo.a), hLabel: res.terzo.hLabel, aLabel: res.terzo.aLabel, nSet: f.tabellone.set, elim: true, pronta: res.terzo.pronta, obsoleto: res.terzo.obsoleto, meta: [f.campi?.[res.terzo.id] || ''].filter(Boolean), ctx })}</div>` : ''}
    </div>`;
}

// ── Classifiche ───────────────────────────────────────────
export function tabellaClassifica(righe, { conPareggi = false } = {}) {
  return `<div class="tbl-scroll"><table class="tbl"><thead><tr>
      <th class="pos">#</th><th class="l">Squadra</th><th title="Partite giocate">G</th><th title="Vinte">V</th>${conPareggi ? '<th title="Pareggiate">N</th>' : ''}<th title="Perse">P</th>
      <th title="Set vinti">SV</th><th title="Set persi">SP</th><th title="Punti fatti">PF</th><th title="Punti subiti">PS</th><th title="Differenza punti">DP</th><th title="Punti in classifica">Pt</th>
    </tr></thead><tbody>
    ${righe.map(r => `<tr class="${r.pos <= 3 && r.g ? 'top' : ''}"><td class="pos">${r.g ? `<span class="pos-badge${r.pos <= 3 ? ' pos-' + r.pos : ''}">${r.pos}</span>` : r.pos}</td>
      <td class="l team"><span class="team-cell">${logoHtml(logoSoc(r.socId), nomeSoc(r.socId) || r.nome)}<span>${esc(r.nome)}${r.socId ? `<span class="soc">${esc(nomeSoc(r.socId))}</span>` : ''}${r.da ? `<span class="soc">${esc(r.da)}</span>` : ''}</span></span></td>
      <td>${r.g}</td><td>${r.v}</td>${conPareggi ? `<td>${r.n}</td>` : ''}<td>${r.p}</td><td>${r.sv}</td><td>${r.sp}</td><td>${r.pf}</td><td>${r.ps}</td>
      <td class="${r.dp > 0 ? 'pos-num' : r.dp < 0 ? 'neg-num' : ''}">${r.dp > 0 ? '+' : ''}${r.dp}</td><td class="pt">${r.pt}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function vistaClassifiche(c) {
  const reg = regoleDi(S.torneo, c);
  const conPareggi = reg.punti.pareggio > 0 || c.fasi.some(f => f.gironi?.some(g => g.set % 2 === 0));
  let html = '';
  for (const f of c.fasi) {
    if (f.tipo === 'elim') {
      const res = risolviTabellone(f, S.risultati);
      html += `<section class="panel"><div class="panel-head"><h2>${esc(f.nome)}</h2></div><div class="panel-body">${res.podio
        ? `<ol class="final-rank">${res.podio.map((x, i) => x ? `<li><span class="pos-badge pos-${i + 1}">${i + 1}</span>${logoHtml(logoSoc(x.socId), x.nome)}<strong>${esc(x.nome)}</strong></li>` : '').join('')}</ol>`
        : '<p class="muted">Il podio comparirà quando la finale sarà giocata.</p>'}</div></section>`;
      continue;
    }
    html += `<section class="panel"><div class="panel-head"><h2>${esc(f.nome)}</h2></div><div class="panel-body stack-lg">
      ${f.gironi.map(g => `<div><h3 style="margin-bottom:8px">Girone ${esc(g.nome)}</h3>${tabellaClassifica(classifica(g, S.risultati, reg.punti), { conPareggi })}</div>`).join('')}
      ${f.gironi.length > 1 ? `<div><h3>Classifica avulsa</h3><p class="muted small" style="margin:4px 0 8px">Confronta i gironi: prima la posizione, poi la media punti, set e punti fatti per partita.</p>${tabellaClassifica(classificaAvulsa(f, S.risultati, reg.punti).map((r, i) => ({ ...r, pos: i + 1 })), { conPareggi })}</div>` : ''}
    </div></section>`;
  }
  return html + `<p class="hint">Pt: ${esc(descriviPunti(reg.punti))}. A parità contano differenza set, differenza punti e punti fatti.</p>`;
}

function vistaRisultati(c) {
  const out = [];
  for (const f of c.fasi) {
    if (f.tipo === 'elim') {
      for (const m of risolviTabellone(f, S.risultati).tutte) if (m.esito) out.push({ f, et: m.etichetta, h: m.h, a: m.a, r: m.risultato, e: m.esito });
    } else for (const g of f.gironi) for (const p of g.partite) {
      const e = esito(S.risultati[p.id]);
      if (e) out.push({ f, et: `Girone ${g.nome}`, h: squadraDi(g, p.h), a: squadraDi(g, p.a), r: S.risultati[p.id], e });
    }
  }
  out.sort((x, y) => (y.r.ts || 0) - (x.r.ts || 0));
  if (!out.length) return `<section class="panel">${vuoto({ icona: 'clock', titolo: 'Ancora nessun risultato', testo: 'I punteggi salvati compariranno qui, dal più recente.' })}</section>`;
  return `<section class="panel"><ul class="results">${out.map(x => `<li>
      <span class="muted small res-when num">${formatOra(x.r.ts)}</span>
      <div class="res-teams"><span class="${x.e.vincitore === 'h' ? 'win' : ''}">${esc(x.h.nome)}</span><span class="${x.e.vincitore === 'a' ? 'win' : ''}">${esc(x.a.nome)}</span></div>
      <div class="res-sets num">${x.e.sets.map(([h, a]) => `<span>${h}–${a}</span>`).join('')}</div>
      <span class="muted small res-where">${esc(x.f.nome)}, ${esc(x.et)}</span>
    </li>`).join('')}</ul></section>`;
}

function vistaStatistiche(c) {
  const st = statisticheCategoria(S.torneo, c, S.risultati);
  if (!st.length) return `<section class="panel">${vuoto({ icona: 'chart', titolo: 'Statistiche in arrivo', testo: 'Servono i primi risultati dei gironi.' })}</section>`;
  const top = (lista, val, lab) => lista.slice(0, 3).map((r, i) => `<li><span class="pos-badge pos-${i + 1}">${i + 1}</span><span class="team-cell">${logoHtml(logoSoc(r.socId), r.nome)}<span>${esc(r.nome)}</span></span><b class="num">${val(r)}</b><span class="muted small">${lab}</span></li>`).join('');
  const conG = st.filter(r => r.g);
  return `<div class="leaders">
      <section class="panel"><div class="panel-head"><h3>Più vittorie</h3></div><ol class="leader-list">${top([...conG].sort((a, b) => b.v - a.v || b.pt - a.pt), r => r.v, 'vinte')}</ol></section>
      <section class="panel"><div class="panel-head"><h3>Miglior attacco</h3></div><ol class="leader-list">${top([...conG].sort((a, b) => b.pf / b.g - a.pf / a.g), r => (r.pf / r.g).toFixed(1), 'punti fatti a partita')}</ol></section>
      <section class="panel"><div class="panel-head"><h3>Miglior difesa</h3></div><ol class="leader-list">${top([...conG].sort((a, b) => a.ps / a.g - b.ps / b.g), r => (r.ps / r.g).toFixed(1), 'punti subiti a partita')}</ol></section>
    </div>
    <section class="panel"><div class="panel-head"><h2>Tutte le squadre</h2><span class="muted small">somma di tutte le fasi a gironi</span></div><div class="panel-body">${tabellaClassifica(st.map((r, i) => ({ ...r, pos: i + 1 })))}</div></section>`;
}

function vistaRegole(c) {
  const t = S.torneo, reg = regoleDi(t, c);
  return `<section class="panel"><div class="panel-head"><h2>Regole di punteggio</h2></div><div class="panel-body stack-lg">
    <label class="switch"><input type="checkbox" ${c.regole ? 'checked' : ''} data-c="regoleProprie" data-id="${c.id}"><span class="track"></span><span>Usa regole diverse da quelle del torneo per ${esc(c.nome)}</span></label>
    ${c.regole ? editorRegole('cat:' + c.id, reg) : `<div class="note">Questa categoria segue le regole del torneo: <strong>${esc(descriviPunti(t.regole.punti))}</strong>, ${plurale(t.regole.set, 'set', 'set')} per partita. <a href="${hashTorneo('impostazioni')}">Cambiale nelle impostazioni</a>.</div>`}
  </div></section>`;
}

// ── Builder fase successiva ───────────────────────────────
function sorgente(c) { return [...c.fasi].reverse().find(f => f.tipo !== 'elim' && f.gironi.length); }

function vistaBuilder(c, b) {
  const reg = regoleDi(S.torneo, c);
  const src = sorgente(c);
  const base = classificaAvulsa(src, S.risultati, reg.punti);
  const perNome = new Map(base.map(r => [r.nome, r]));
  const ordine = (b.ordine || base.map(r => r.nome)).filter(n => perNome.has(n));
  const lista = ordine.map(n => perNome.get(n));
  const n = lista.length;
  const dimOk = DIMENSIONI_TABELLONE.filter(d => d <= n);
  const dimT = b.modo === 'gironi' ? 0 : (dimOk.includes(b.dim) ? b.dim : dimOk[dimOk.length - 1] || 0);
  const resto = b.modo === 'elim' ? [] : b.modo === 'gironi' ? lista : lista.slice(dimT);
  const nG = clamp(b.gironi || Math.max(1, Math.round(resto.length / 4)), 1, Math.max(1, Math.floor(resto.length / 2)));
  const gruppi = resto.length >= 2 ? serpentina(resto, nG) : [];
  const destino = new Map();
  lista.slice(0, dimT).forEach(r => destino.set(r.nome, 'Tabellone'));
  gruppi.forEach((g, i) => g.forEach(r => destino.set(r.nome, `Girone ${String.fromCharCode(65 + i)}`)));
  const mancanti = src.gironi.reduce((s, g) => s + g.partite.filter(p => !isFinita(S.risultati[p.id])).length, 0);

  return `<section class="panel">
    <div class="panel-head"><h2>Fase successiva</h2><button class="btn btn-ghost btn-sm" data-a="chiudiBuilder" data-id="${c.id}">${icon('x')}Annulla</button></div>
    <div class="panel-body stack-lg">
      ${mancanti ? `<div class="note note-warn">${plurale(mancanti, 'partita', 'partite')} di “${esc(src.nome)}” ${mancanti === 1 ? 'non è ancora conclusa' : 'non sono ancora concluse'}: la classifica qui sotto potrebbe cambiare.</div>` : ''}
      <fieldset class="fs"><legend>Formula</legend><div class="choices">
        ${[['elim', 'Tabellone a eliminazione', 'Le migliori si sfidano fino alla finale.'], ['misto', 'Tabellone e gironi', 'Le migliori al tabellone, le altre in nuovi gironi.'], ['gironi', 'Nuovi gironi', 'Tutte le squadre in nuovi gironi, teste di serie distribuite.']].map(([k, l, d]) => `<label class="choice"><input type="radio" name="bd-modo" value="${k}" ${b.modo === k ? 'checked' : ''} data-c="bdModo" data-id="${c.id}"><span class="box"><strong>${l}</strong><small>${d}</small></span></label>`).join('')}
      </div></fieldset>
      <div class="grid-2">
        <label class="field"><span>Nome della fase</span><input class="input" id="bd-nome" value="${esc(b.nome)}" data-i="bdNome" data-id="${c.id}" maxlength="40"></label>
        ${b.modo !== 'gironi' ? `<label class="field"><span>Squadre nel tabellone</span><select class="input" id="bd-dim" data-c="bdDim" data-id="${c.id}">${dimOk.map(d => `<option value="${d}" ${d === dimT ? 'selected' : ''}>${d} squadre (${d === 2 ? 'finale' : d === 4 ? 'semifinali' : d === 8 ? 'quarti' : 'ottavi'})</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="row-wrap" style="gap:20px">
        <div class="field"><span>Set per partita</span><div class="segmented">${[1, 2, 3].map(k => `<button type="button" aria-selected="${b.set === k}" data-a="bdSet" data-id="${c.id}" data-n="${k}">${k}</button>`).join('')}</div></div>
        ${b.modo !== 'gironi' && dimT >= 4 ? `<label class="switch"><input type="checkbox" ${b.terzo ? 'checked' : ''} data-c="bdTerzo" data-id="${c.id}"><span class="track"></span><span>Finale 3° posto</span></label>` : ''}
        ${b.modo !== 'elim' && resto.length >= 2 ? `<div class="field"><span>Gironi${b.modo === 'misto' ? ' per le altre' : ''}</span>${stepper({ id: 'bd-gir', valore: nG, min: 1, max: Math.max(1, Math.floor(resto.length / 2)), a: 'bdStepGir', c: 'bdGir', dati: `data-id="${c.id}"`, label: 'Numero di gironi' })}</div>` : ''}
      </div>
      <div>
        <div class="row" style="margin-bottom:8px"><h3 style="flex:1">Ordine di partenza</h3><span class="hint">Usa le frecce per correggere a mano l'ordine.</span></div>
        <ol class="seed-list">${lista.map((r, i) => `<li><span class="num seed-n">${i + 1}</span><span class="team-cell">${logoHtml(logoSoc(r.socId), r.nome)}<span>${esc(r.nome)}<span class="soc">${esc(r.da)}, ${r.pt} pt</span></span></span>
          <span class="chip ${destino.get(r.nome) === 'Tabellone' ? 'chip-warn' : destino.get(r.nome) ? 'chip-blue' : ''}">${esc(destino.get(r.nome) || 'Esclusa')}</span>
          <button class="btn btn-ghost btn-icon btn-sm" data-a="bdSposta" data-id="${c.id}" data-i="${i}" data-d="-1" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-a="bdSposta" data-id="${c.id}" data-i="${i}" data-d="1" aria-label="Sposta giù" ${i === n - 1 ? 'disabled' : ''}>${icon('down')}</button></li>`).join('')}</ol>
      </div>
    </div>
    <div class="panel-foot"><span class="spacer"></span><button class="btn btn-accent" data-a="bdCrea" data-id="${c.id}" data-dim="${dimT}" data-gir="${nG}">${icon('check')}Crea la fase</button></div>
  </section>`;
}

// ── Azioni ────────────────────────────────────────────────
function girone(el) { return cat(el.dataset.cat)?.fasi.find(f => f.id === el.dataset.fase)?.gironi.find(g => g.id === el.dataset.gir); }
function fase(catId, fid) { return cat(catId)?.fasi.find(f => f.id === fid); }
function idsFase(f) {
  if (f.tipo === 'elim') return Object.keys(S.risultati).filter(k => k.startsWith(f.id + '_'));
  return f.gironi.flatMap(g => g.partite.map(p => p.id)).filter(id => S.risultati[id]);
}
function squadrePerElim(el, mid) {
  const f = fase(el.dataset.cat, el.dataset.fase);
  const m = f && risolviTabellone(f, S.risultati).tutte.find(x => x.id === mid);
  return m?.h && m?.a ? [m.h.nome, m.a.nome] : null;
}
function chiudiMenu(el) { el.closest('details')?.removeAttribute('open'); }

registra({
  catTab(el) { S.catTab[el.dataset.id] = el.dataset.tab; render(); },
  modificaCategoria(el) { finestraCategoria(cat(el.dataset.id)); },
  toggleFase(el) { const k = 'chiusa:' + el.dataset.id; S.aperti.has(k) ? S.aperti.delete(k) : S.aperti.add(k); render(); },

  // Setup
  suStep(el) {
    const c = cat(el.dataset.id), st = setupDi(c), k = el.dataset.k, d = +el.dataset.d;
    if (k === 'campi') { modifica(() => { c.campi = clamp((c.campi || 1) + d, 1, 20); st.gironi = null; }); return; }
    const tot = squadreTotali(S.torneo, c.id);
    st.gironi = clamp((st.gironi ?? suggerisciGironi(tot, c.campi || 1)?.gironi ?? 1) + d, 1, Math.max(1, Math.floor(tot / 2)));
    render();
  },
  suCampo(el) {
    const c = cat(el.dataset.id), st = setupDi(c);
    if (el.dataset.k === 'campi') modifica(() => { c.campi = clamp(intOr(el.value, 1), 1, 20); st.gironi = null; });
    else { st.gironi = Math.max(1, intOr(el.value, 1)); render(); }
  },
  suNomi(el) { setupDi(cat(el.dataset.id)).nomi = el.value; },
  suRitorno(el) { setupDi(cat(el.dataset.id)).ritorno = el.checked; render(); },
  suSet(el) { setupDi(cat(el.dataset.id)).set = +el.dataset.n; render(); },
  creaGironi(el) {
    const c = cat(el.dataset.id), st = setupDi(c), t = S.torneo, reg = regoleDi(t, c);
    const tot = squadreTotali(t, c.id);
    const nG = clamp(st.gironi ?? suggerisciGironi(tot, c.campi || 1)?.gironi ?? 1, 1, Math.max(1, Math.floor(tot / 2)));
    const usati = new Set(t.categorie.flatMap(k => [...nomiSquadreCategoria(k)]));
    const gironi = creaGironi(t.societa, c.id, { dimensioni: dimensioniUniformi(tot, nG), nomi: st.nomi, pool: t.categorie.indexOf(c), set: st.set ?? reg.set, ritorno: st.ritorno, timer: reg.timer, nomiUsati: usati });
    gironi.forEach((g, i) => { if (nG <= (c.campi || 1)) g.campo = `Campo ${i + 1}`; });
    delete S.builder['setup:' + c.id];
    modifica(() => { c.fasi = [{ id: uid(), nome: 'Prima fase', tipo: 'gironi', gironi }]; });
    toast(`${plurale(gironi.length, 'girone creato', 'gironi creati')}`);
  },
  gironeVuoto(el) {
    const c = cat(el.dataset.id), reg = regoleDi(S.torneo, c);
    const g = { id: uid(), nome: 'A', campo: '', set: reg.set, ritorno: false, timer: reg.timer, squadre: [1, 2, 3, 4].map(i => ({ id: uid(), nome: `Squadra ${i}`, socId: '' })), partite: [] };
    g.partite = generaPartite(g.squadre);
    modifica(() => { c.fasi = [{ id: uid(), nome: 'Prima fase', tipo: 'gironi', gironi: [g] }]; });
    finestraGirone(c, c.fasi[0], g);
  },
  aggiungiGirone(el) {
    chiudiMenu(el);
    const c = cat(el.dataset.cat), f = fase(el.dataset.cat, el.dataset.id), reg = regoleDi(S.torneo, c);
    const usate = new Set(f.gironi.map(g => g.nome));
    let k = 0; while (usate.has(String.fromCharCode(65 + k))) k++;
    const g = { id: uid(), nome: String.fromCharCode(65 + k), campo: '', set: reg.set, ritorno: false, timer: reg.timer, squadre: [1, 2, 3].map(i => ({ id: uid(), nome: `Squadra ${String.fromCharCode(65 + k)}${i}`, socId: '' })), partite: [] };
    g.partite = generaPartite(g.squadre);
    modifica(() => { f.gironi.push(g); });
    finestraGirone(c, f, g);
  },

  // Punteggi
  punteggio(el) {
    const mid = el.dataset.mid, n = +el.dataset.n;
    if (!S.bozze[mid]) {
      const salvati = setDa(S.risultati[mid]);
      S.bozze[mid] = Array.from({ length: n }, (_, i) => [...(salvati[i] || ['', ''])].map(v => v === '' || v == null ? '' : String(v)));
    }
    S.bozze[mid][+el.dataset.s][+el.dataset.l] = el.value.replace(/\D/g, '').slice(0, 2);
    el.closest('.match')?.classList.add('is-dirty');
  },
  annullaBozza(el) { delete S.bozze[el.dataset.mid]; render(); },
  async salvaPunteggio(el) {
    const mid = el.dataset.mid, n = +el.dataset.n;
    const bozza = S.bozze[mid];
    if (!bozza) return;
    const elim = el.dataset.elim === '1';
    const err = validaSet(bozza, { serveVincitore: elim });
    if (err) { toast(err, 'err'); return; }
    const prima = S.risultati[mid];
    const r = { stato: 'finita', set: setPerDb(bozza.slice(0, n).map(([h, a]) => [h === '' ? '' : +h, a === '' ? '' : +a])), ts: prima?.stato === 'finita' && prima.ts ? prima.ts : Date.now() };
    if (elim) { const sq = squadrePerElim(el, mid); if (sq) r.squadre = sq; }
    S.risultati = { ...S.risultati, [mid]: r };
    delete S.bozze[mid];
    render();
    try { await S.store.setRisultato(S.tid, mid, r); toast('Risultato salvato'); }
    catch (e) { console.error(e); S.risultati = { ...S.risultati, [mid]: prima }; S.bozze[mid] = bozza; render(); toast('Risultato non salvato. Riprova.', 'err'); }
  },
  async inCorso(el) {
    const mid = el.dataset.mid, prima = S.risultati[mid];
    let r;
    if (isInCorso(prima)) {
      const sets = setDa(prima).filter(([h, a]) => h !== '' && a !== '');
      if (sets.some(([h, a]) => +h || +a)) r = { ...prima, stato: 'sospesa' };
      else r = null;
    } else {
      r = { stato: 'in_corso', set: prima?.set || setPerDb(Array.from({ length: +el.dataset.n }, () => ['', ''])), ts: Date.now() };
      if (el.dataset.elim === '1') { const sq = squadrePerElim(el, mid); if (sq) r.squadre = sq; }
    }
    if (r) S.risultati = { ...S.risultati, [mid]: r }; else { const x = { ...S.risultati }; delete x[mid]; S.risultati = x; }
    render();
    if (r) await S.store.setRisultato(S.tid, mid, r); else await S.store.delRisultati(S.tid, [mid]);
  },
  async cancellaRisultato(el) {
    chiudiMenu(el);
    const mid = el.dataset.mid;
    if (!await conferma('Il punteggio di questa partita verrà cancellato e la classifica ricalcolata.', { titolo: 'Cancellare il risultato?', ok: 'Cancella', pericolo: true })) return;
    const x = { ...S.risultati }; delete x[mid]; S.risultati = x; delete S.bozze[mid];
    render();
    await S.store.delRisultati(S.tid, [mid]);
    toast('Risultato cancellato');
  },
  async linkSegnapunti(el) {
    const mid = el.dataset.mid;
    const card = el.closest('.match');
    const nomi = [...card.querySelectorAll('.sb-name')].map(x => x.firstChild?.textContent?.trim()).filter(Boolean);
    let token;
    try { token = await S.store.creaToken(S.tid, mid); }
    catch (e) { console.error(e); toast('Non riesco a creare il link. Controlla la connessione.', 'err'); return; }
    if (S.privato) S.privato.token = { ...(S.privato.token || {}), [mid]: token };
    const url = link('segna.html', { t: S.tid, m: mid, k: token });
    await condividiLink({
      titolo: 'Link segnapunti',
      descrizione: `${nomi.join(' contro ')}. Chi apre questo link può segnare il punteggio solo di questa partita, in diretta o a fine gara.`,
      url, messaggio: `Ecco il link per segnare la partita ${nomi.join(' - ')}:`,
    });
  },
  async dettagliPartita(el) {
    chiudiMenu(el);
    const g = girone(el), p = g?.partite.find(x => x.id === el.dataset.mid);
    if (!p) return;
    const v = await modal({
      title: 'Campo e nota',
      body: `<label class="field"><span>Campo</span><input class="input" id="dp-campo" value="${esc(p.campo || '')}" placeholder="${esc(g.campo || 'Es. Campo 2')}" maxlength="30"><span class="hint">${g.campo ? `Se vuoto vale quello del girone (${esc(g.campo)}).` : 'Facoltativo.'}</span></label>
        <label class="field"><span>Nota</span><input class="input" id="dp-nota" value="${esc(p.nota || '')}" placeholder="Es. ore 10:30, arbitra Volley Riviera" maxlength="120"></label>`,
      azioni: [{ label: 'Annulla', value: null }, { label: 'Salva', cls: 'btn-primary', value: b => ({ campo: b.querySelector('#dp-campo').value.trim(), nota: b.querySelector('#dp-nota').value.trim() }) }],
    });
    if (v) modifica(() => { p.campo = v.campo; p.nota = v.nota; });
  },
  async campoElim(el) {
    chiudiMenu(el);
    const f = fase(el.dataset.cat, el.dataset.fase);
    const v = await chiedi('Campo', { label: 'Campo della partita', valore: f.campi?.[el.dataset.mid] || '', placeholder: 'Es. Campo 1' });
    if (v != null) modifica(() => { f.campi = { ...(f.campi || {}), [el.dataset.mid]: v }; });
  },

  // Gironi e fasi
  modificaGirone(el) { const c = cat(el.dataset.cat); finestraGirone(c, fase(c.id, el.dataset.fase), girone(el)); },
  async rinominaFase(el) {
    chiudiMenu(el);
    const f = fase(el.dataset.cat, el.dataset.id);
    const v = await chiedi('Rinomina fase', { label: 'Nome', valore: f.nome });
    if (v) modifica(() => { f.nome = v; });
  },
  async eliminaFase(el) {
    chiudiMenu(el);
    const c = cat(el.dataset.cat), f = fase(c.id, el.dataset.id);
    const ids = idsFase(f);
    const dopo = c.fasi.slice(c.fasi.indexOf(f) + 1);
    const ok = await conferma(`“${esc(f.nome)}” verrà eliminata${ids.length ? ` con ${plurale(ids.length, 'risultato', 'risultati')}` : ''}.${dopo.length ? ` Le fasi successive (${dopo.map(x => esc(x.nome)).join(', ')}) restano, ma potrebbero non avere più senso.` : ''}`, { titolo: 'Eliminare la fase?', ok: 'Elimina', pericolo: true });
    if (!ok) return;
    modifica(() => { c.fasi = c.fasi.filter(x => x !== f); });
    if (ids.length) await S.store.delRisultati(S.tid, ids);
    toast('Fase eliminata');
  },

  // Builder
  apriBuilder(el) {
    const c = cat(el.dataset.id), reg = regoleDi(S.torneo, c);
    const src = sorgente(c);
    if (!src) return;
    const n = classificaAvulsa(src, S.risultati, reg.punti).length;
    const dim = [...DIMENSIONI_TABELLONE].reverse().find(d => d <= n) || 2;
    S.builder[c.id] = { aperto: true, modo: n > dim ? 'misto' : 'elim', dim, terzo: true, set: reg.set === 2 ? 1 : reg.set, gironi: null, ordine: null, nome: 'Fase finale' };
    render();
    window.scrollTo(0, 0);
  },
  chiudiBuilder(el) { delete S.builder[el.dataset.id]; render(); },
  bdModo(el) { const b = S.builder[el.dataset.id]; b.modo = el.value; b.nome = el.value === 'gironi' ? 'Seconda fase' : 'Fase finale'; render(); },
  bdNome(el) { S.builder[el.dataset.id].nome = el.value; },
  bdDim(el) { S.builder[el.dataset.id].dim = +el.value; S.builder[el.dataset.id].gironi = null; render(); },
  bdSet(el) { S.builder[el.dataset.id].set = +el.dataset.n; render(); },
  bdTerzo(el) { S.builder[el.dataset.id].terzo = el.checked; },
  bdGir(el) { S.builder[el.dataset.id].gironi = Math.max(1, intOr(el.value, 1)); render(); },
  bdStepGir(el) { const b = S.builder[el.dataset.id]; b.gironi = Math.max(1, (+document.getElementById('bd-gir').value || 1) + +el.dataset.d); render(); },
  bdSposta(el) {
    const c = cat(el.dataset.id), b = S.builder[c.id], reg = regoleDi(S.torneo, c);
    const ord = b.ordine || classificaAvulsa(sorgente(c), S.risultati, reg.punti).map(r => r.nome);
    const i = +el.dataset.i, j = i + +el.dataset.d;
    if (j < 0 || j >= ord.length) return;
    [ord[i], ord[j]] = [ord[j], ord[i]];
    b.ordine = ord;
    render();
  },
  bdCrea(el) {
    const c = cat(el.dataset.id), b = S.builder[c.id], reg = regoleDi(S.torneo, c);
    const base = classificaAvulsa(sorgente(c), S.risultati, reg.punti);
    const perNome = new Map(base.map(r => [r.nome, r]));
    const lista = (b.ordine || base.map(r => r.nome)).map(n => perNome.get(n)).filter(Boolean);
    const dim = b.modo === 'gironi' ? 0 : +el.dataset.dim;
    const nG = +el.dataset.gir;
    const nome = (b.nome || '').trim() || 'Fase finale';
    const nuove = [];
    if (dim) {
      nuove.push({ id: uid(), nome, tipo: 'elim', gironi: [], tabellone: creaTabellone(lista, dim, { set: b.set, terzoPosto: b.terzo }) });
    }
    const resto = b.modo === 'elim' ? [] : b.modo === 'gironi' ? lista : lista.slice(dim);
    if (resto.length >= 2) {
      const gruppi = serpentina(resto, clamp(nG, 1, Math.floor(resto.length / 2)));
      const gironi = gruppi.filter(g => g.length >= 2).map((g, i) => {
        const sq = g.map(r => ({ id: uid(), nome: r.nome, socId: r.socId }));
        return { id: uid(), nome: String.fromCharCode(65 + i), campo: '', set: b.set, ritorno: false, timer: reg.timer, squadre: sq, partite: generaPartite(sq) };
      });
      nuove.push({ id: uid(), nome: b.modo === 'gironi' ? nome : 'Gironi di consolazione', tipo: 'gironi', gironi });
    }
    if (!nuove.length) { toast('Non ci sono abbastanza squadre per questa formula.', 'err'); return; }
    delete S.builder[c.id];
    S.catTab[c.id] = 'partite';
    modifica(() => { c.fasi.forEach(f => S.aperti.add('chiusa:' + f.id)); c.fasi.push(...nuove); });
    toast('Fase creata');
  },

  regoleProprie(el) {
    const c = cat(el.dataset.id);
    modifica(t => { c.regole = el.checked ? { punti: normalizzaPunti(t.regole.punti), set: t.regole.set, timer: t.regole.timer } : null; });
  },
});

// ── Finestra modifica girone ──────────────────────────────
async function finestraGirone(c, f, g) {
  if (!g) return;
  await salvaOra();
  const altri = f.gironi.filter(x => x !== g);
  const opzSoc = sid => `<option value="">Nessuna società</option>${S.torneo.societa.map(s => `<option value="${esc(s.id)}" ${s.id === sid ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}`;
  const rigaSq = (s, i) => `<li data-sq="${esc(s.id)}">
      <span class="num muted">${i + 1}</span>
      <input class="input" value="${esc(s.nome)}" data-k="nome" aria-label="Nome squadra" maxlength="40">
      <select class="input" data-k="soc" aria-label="Società">${opzSoc(s.socId)}</select>
      ${altri.length ? `<select class="input" data-k="sposta" aria-label="Girone"><option value="">Girone ${esc(g.nome)}</option>${altri.map(x => `<option value="${x.id}">Sposta nel girone ${esc(x.nome)}</option>`).join('')}</select>` : ''}
      <button type="button" class="btn btn-ghost btn-icon btn-sm" data-del aria-label="Rimuovi squadra">${icon('trash')}</button>
    </li>`;
  const conRis = g.partite.filter(p => S.risultati[p.id]).length;
  const ris = await modal({
    title: `Girone ${g.nome}`, wide: true,
    body: `<div class="grid-3">
        <label class="field"><span>Nome</span><input class="input" id="mg-nome" value="${esc(g.nome)}" maxlength="12"></label>
        <label class="field"><span>Campo</span><input class="input" id="mg-campo" value="${esc(g.campo)}" placeholder="Es. Campo 1" maxlength="30"></label>
        <label class="field"><span>Set per partita</span><select class="input" id="mg-set">${[1, 2, 3, 4, 5].map(n => `<option ${n === g.set ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <div class="row-wrap" style="gap:20px">
        <label class="switch"><input type="checkbox" id="mg-rit" ${g.ritorno ? 'checked' : ''}><span class="track"></span><span>Andata e ritorno</span></label>
        <label class="row"><span class="small">Cronometro</span><input class="input" id="mg-timer" type="number" min="0" max="90" value="${g.timer || 0}" style="width:80px"><span class="muted small">minuti (0 = nessuno)</span></label>
      </div>
      <div><span class="label">Squadre</span><ul class="sq-edit" id="mg-sq">${g.squadre.map(rigaSq).join('')}</ul>
        <button type="button" class="btn btn-sm" id="mg-add">${icon('plus')}Aggiungi squadra</button></div>
      ${conRis ? `<p class="hint">Aggiungendo o togliendo squadre il calendario si aggiorna: le partite già giocate restano, quelle delle squadre tolte vengono cancellate.</p>` : ''}
      <div class="danger-zone"><div><strong>Elimina girone</strong><p class="muted small">Cancella anche le sue partite e i risultati.</p></div><button type="button" class="btn btn-danger btn-sm" id="mg-del">${icon('trash')}Elimina</button></div>`,
    azioni: [{ label: 'Annulla', value: null }, { label: 'Salva', cls: 'btn-primary', value: box => leggi(box) }],
    validate: box => {
      const d = leggi(box);
      if (d.squadre.filter(x => !x.sposta).length < 2) { toast('Nel girone devono restare almeno 2 squadre.', 'err'); return 'x'; }
      if (d.squadre.some(x => !x.nome)) { toast('Ogni squadra deve avere un nome.', 'err'); return 'x'; }
      const nomi = d.squadre.map(x => x.nome.toLowerCase());
      const altrove = new Set();
      for (const k of c.fasi) if (k === f) for (const x of k.gironi) if (x !== g) x.squadre.forEach(s => altrove.add(s.nome.toLowerCase()));
      if (new Set(nomi).size !== nomi.length || nomi.some(n => altrove.has(n))) { toast('Due squadre della fase hanno lo stesso nome.', 'err'); return 'x'; }
      return null;
    },
    onMount: (box, close) => {
      const ul = box.querySelector('#mg-sq');
      const rinumera = () => ul.querySelectorAll('li').forEach((li, i) => { li.querySelector('.num').textContent = i + 1; });
      ul.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { b.closest('li').remove(); rinumera(); } });
      box.querySelector('#mg-add').onclick = () => {
        const n = ul.children.length + 1;
        ul.insertAdjacentHTML('beforeend', rigaSq({ id: 'new-' + uid(), nome: `Squadra ${g.nome}${n}`, socId: '' }, n - 1));
        ul.lastElementChild.querySelector('input').select();
      };
      box.querySelector('#mg-del').onclick = () => close('elimina');
    },
  });
  if (!ris) return;
  if (ris === 'elimina') {
    const ids = g.partite.map(p => p.id).filter(id => S.risultati[id]);
    if (!await conferma(`Il girone ${esc(g.nome)} verrà eliminato${ids.length ? ` con ${plurale(ids.length, 'risultato', 'risultati')}` : ''}.`, { titolo: 'Eliminare il girone?', ok: 'Elimina', pericolo: true })) return;
    modifica(() => { f.gironi = f.gironi.filter(x => x !== g); if (!f.gironi.length) c.fasi = c.fasi.filter(x => x !== f); });
    if (ids.length) await S.store.delRisultati(S.tid, ids);
    toast('Girone eliminato');
    return;
  }

  function leggi(box) {
    return {
      nome: box.querySelector('#mg-nome').value.trim() || g.nome,
      campo: box.querySelector('#mg-campo').value.trim(),
      set: +box.querySelector('#mg-set').value,
      ritorno: box.querySelector('#mg-rit').checked,
      timer: clamp(intOr(box.querySelector('#mg-timer').value, 0), 0, 90),
      squadre: [...box.querySelectorAll('#mg-sq li')].map(li => ({ id: li.dataset.sq, nome: li.querySelector('[data-k=nome]').value.trim(), socId: li.querySelector('[data-k=soc]').value, sposta: li.querySelector('[data-k=sposta]')?.value || '' })),
    };
  }

  // Applica le modifiche: squadre rinominate, aggiunte, rimosse o spostate
  const prima = new Set(g.squadre.map(s => s.id));
  const restano = ris.squadre.filter(s => !s.sposta).map(s => ({ id: s.id.startsWith('new-') ? uid() : s.id, nome: s.nome, socId: s.socId }));
  const spostate = ris.squadre.filter(s => s.sposta);
  const nuoveIds = new Set(restano.map(s => s.id));
  const cambioRosa = restano.length !== prima.size || restano.some(s => !prima.has(s.id)) || ris.ritorno !== g.ritorno;
  const daCancellare = [];
  const ricalcola = gg => {
    const vecchie = new Set(gg.partite.map(p => p.id));
    gg.partite = rigeneraPartite(gg);
    const ora = new Set(gg.partite.map(p => p.id));
    vecchie.forEach(id => { if (!ora.has(id) && S.risultati[id]) daCancellare.push(id); });
  };
  const persi = g.partite.filter(p => (!nuoveIds.has(p.h) || !nuoveIds.has(p.a)) && S.risultati[p.id]).length;
  if (persi && !await conferma(`${plurale(persi, 'risultato', 'risultati')} di squadre tolte o spostate ${persi === 1 ? 'verrà cancellato' : 'verranno cancellati'}.`, { titolo: 'Confermi le modifiche?', ok: 'Conferma', pericolo: true })) return;

  modifica(() => {
    Object.assign(g, { nome: ris.nome, campo: ris.campo, set: ris.set, ritorno: ris.ritorno, timer: ris.timer, squadre: restano });
    if (cambioRosa) ricalcola(g);
    for (const s of spostate) {
      const dest = f.gironi.find(x => x.id === s.sposta);
      if (!dest) continue;
      dest.squadre.push({ id: s.id.startsWith('new-') ? uid() : s.id, nome: s.nome, socId: s.socId });
      ricalcola(dest);
    }
  });
  if (daCancellare.length) await S.store.delRisultati(S.tid, daCancellare);
  toast('Girone aggiornato');
}
