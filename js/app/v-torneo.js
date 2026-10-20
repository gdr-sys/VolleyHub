// Contenitore del torneo: navigazione laterale, panoramica, impostazioni
import { esc, catNome, plurale, formatData, contaPartite, squadreTotali, regoleDi, descriviPunti, elencoPartite, isInCorso, uid, COLORI } from '../core.js';
import { link } from '../config.js';
import { icon, toast, conferma, modal, condividiLink, scaricaFile, slug, comprimiImmagine, scegliFile } from '../ui.js';
import { S, registra, modifica, render, vai, hashTorneo, cat, salvaOra } from './stato.js';
import { editorRegole, swatches, sceltaEmoji, vuoto } from './comp.js';
import { vistaCategoria } from './v-categoria.js';
import { vistaSocieta } from './v-societa.js';
import { vistaIscrizioni } from './v-iscrizioni.js';
import { vistaPubblica } from './v-pubblica.js';
import { esportaTorneo } from './importa.js';

export function vistaTorneo() {
  if (S.accessoNegato) return `<div class="page page-narrow">${vuoto({ icona: 'info', titolo: 'Questo torneo appartiene a un altro organizzatore', testo: 'Puoi seguirlo dalla pagina pubblica.', azioni: `<a class="btn btn-primary" href="${esc(link('live.html', { t: S.tid }))}">${icon('live')}Apri pagina pubblica</a><a class="btn" href="#/">Torna ai tornei</a>` })}</div>`;
  if (S.torneoMancante) return `<div class="page page-narrow">${vuoto({ icona: 'info', titolo: 'Torneo non trovato', testo: 'Potrebbe essere stato eliminato.', azioni: '<a class="btn btn-primary" href="#/">Torna ai tornei</a>' })}</div>`;
  if (!S.torneo) return `<div class="loading-screen"><div class="spinner"></div></div>`;
  const t = S.torneo, r = S.route;
  const attesa = S.iscrizioni.filter(i => i.stato === 'attesa').length;

  const voce = (href, ic, testo, attivo, extra = '') => `<a href="${href}" class="nav-item${attivo ? ' active' : ''}" ${attivo ? 'aria-current="page"' : ''}>${ic}<span>${testo}</span>${extra}</a>`;
  const nav = `
    ${voce(hashTorneo(), icon('home'), 'Panoramica', r.sez === 'panoramica')}
    <div class="nav-label">Categorie</div>
    ${t.categorie.map(c => {
      const { tot, giocate } = contaPartite(c, S.risultati);
      return voce(hashTorneo('c/' + c.id), `<i class="dot" style="background:${esc(c.colore)}"></i>`, esc(catNome(c)), r.sez === 'cat' && r.catId === c.id, tot ? `<small class="num">${giocate}/${tot}</small>` : '');
    }).join('')}
    <div class="nav-label">Organizzazione</div>
    ${voce(hashTorneo('societa'), icon('users'), 'Società', r.sez === 'societa', `<small class="num">${t.societa.length}</small>`)}
    ${voce(hashTorneo('iscrizioni'), icon('form'), 'Iscrizioni', r.sez === 'iscrizioni', attesa ? `<b class="badge">${attesa}</b>` : '')}
    ${voce(hashTorneo('pubblica'), icon('live'), 'Pagina pubblica', r.sez === 'pubblica')}
    ${voce(hashTorneo('impostazioni'), icon('settings'), 'Impostazioni', r.sez === 'impostazioni')}`;

  let contenuto;
  if (r.sez === 'cat') contenuto = cat(r.catId) ? vistaCategoria(cat(r.catId)) : vuoto({ titolo: 'Categoria non trovata', azioni: `<a class="btn" href="${hashTorneo()}">Panoramica</a>` });
  else if (r.sez === 'societa') contenuto = vistaSocieta();
  else if (r.sez === 'iscrizioni') contenuto = vistaIscrizioni();
  else if (r.sez === 'pubblica') contenuto = vistaPubblica();
  else if (r.sez === 'impostazioni') contenuto = vistaImpostazioni();
  else contenuto = vistaPanoramica();

  return `<div class="shell">
    <nav class="sidenav" aria-label="Sezioni del torneo">${nav}</nav>
    <div class="content">
      ${t.archiviato ? `<div class="note note-warn row-wrap" style="margin-bottom:16px">${icon('archive')}<span>Torneo archiviato: la pagina pubblica resta visibile, le iscrizioni sono chiuse.</span><span class="spacer"></span><button class="btn btn-sm" data-a="toggleArchivio">Riporta tra gli attivi</button></div>` : ''}
      ${contenuto}
    </div>
  </div>`;
}

// ── Panoramica ────────────────────────────────────────────
function vistaPanoramica() {
  const t = S.torneo;
  const totSq = t.categorie.reduce((s, c) => s + squadreTotali(t, c.id), 0);
  const conGironi = t.categorie.filter(c => c.fasi.length).length;
  const partite = elencoPartite(t, S.risultati);
  const inCorso = partite.filter(p => isInCorso(p.risultato));
  const giocate = partite.filter(p => p.risultato?.stato === 'finita').length;
  const liveUrl = link('live.html', { t: S.tid });

  // Prossimi passi: una sequenza reale, quindi numerata
  const passi = [
    { fatto: t.societa.length > 0, titolo: 'Aggiungi le società', testo: 'Inseriscile a mano o apri le iscrizioni online e approva le richieste.', azione: `<a class="btn btn-sm" href="${hashTorneo('societa')}">Società</a><a class="btn btn-sm btn-ghost" href="${hashTorneo('iscrizioni')}">Iscrizioni online</a>` },
    { fatto: conGironi === t.categorie.length && t.categorie.length > 0, titolo: 'Crea i gironi', testo: conGironi ? `Fatto per ${conGironi} categorie su ${t.categorie.length}.` : 'VolleyHub distribuisce le squadre separando quelle della stessa società.', azione: t.categorie.filter(c => !c.fasi.length).slice(0, 3).map(c => `<a class="btn btn-sm" href="${hashTorneo('c/' + c.id)}"><i class="dot" style="background:${esc(c.colore)}"></i>${esc(catNome(c))}</a>`).join('') },
    { fatto: !!t.live.info.blocchi.length || t.live.sponsor.gruppi.length > 0 || t.live.menu.sezioni.length > 0, titolo: 'Prepara la pagina pubblica', testo: 'Classifiche e risultati compaiono da soli. Aggiungi orari, menu e sponsor se ti servono.', azione: `<a class="btn btn-sm" href="${hashTorneo('pubblica')}">Pagina pubblica</a>` },
  ];
  const daFare = passi.some(p => !p.fatto);

  return `<div class="page-head">
      <div><h1>${esc(t.nome)}</h1>
        <p class="t-meta" style="margin-top:6px">${t.data ? `<span>${icon('calendar')}${esc(formatData(t.data))}</span>` : '<span class="muted">Data da definire</span>'}${t.luogo ? `<span>${icon('pin')}${esc(t.luogo)}</span>` : ''}</p></div>
      <div class="row-wrap">
        <button class="btn" data-a="condividiLive">${icon('share')}Condividi</button>
        <a class="btn btn-primary" href="${esc(liveUrl)}" target="_blank" rel="noopener">${icon('live')}Pagina pubblica</a>
      </div>
    </div>

    <div class="stats">
      <div><b class="num">${t.societa.length}</b><span>società</span></div>
      <div><b class="num">${totSq}</b><span>squadre</span></div>
      <div><b class="num">${giocate}<small>/${partite.length}</small></b><span>partite giocate</span></div>
      <div><b class="num">${inCorso.length}</b><span>in campo ora</span></div>
    </div>

    ${daFare ? `<section class="panel"><div class="panel-head"><h2>Prossimi passi</h2></div>
      <ol class="todo">${passi.map((p, i) => `<li class="${p.fatto ? 'done' : ''}"><span class="todo-n num">${p.fatto ? icon('check') : i + 1}</span><div><strong>${p.titolo}</strong><p class="muted small">${p.testo}</p>${!p.fatto && p.azione ? `<div class="row-wrap" style="margin-top:8px">${p.azione}</div>` : ''}</div></li>`).join('')}</ol>
    </section>` : ''}

    ${inCorso.length ? `<section class="panel"><div class="panel-head"><h2>In campo ora</h2><span class="chip chip-live">${inCorso.length} in corso</span></div>
      <ul class="now-list">${inCorso.map(p => {
        const sets = (p.risultato.set || []).map(s => Array.isArray(s) ? s : [s.h, s.a]).filter(([h, a]) => h !== '' || a !== '');
        return `<li><i class="dot" style="background:${esc(p.cat.colore)}"></i><div class="now-teams"><strong>${esc(p.h?.nome || p.hLabel)}</strong><span class="muted small">contro</span><strong>${esc(p.a?.nome || p.aLabel)}</strong></div>
          <span class="muted small">${esc(catNome(p.cat))}, ${esc(p.etichetta)}${p.campo ? `, ${esc(p.campo)}` : ''}</span>
          <span class="num now-score">${sets.map(([h, a]) => `${h || 0}–${a || 0}`).join('  ') || '0–0'}</span></li>`;
      }).join('')}</ul></section>` : ''}

    <section class="panel"><div class="panel-head"><h2>Categorie</h2><a class="btn btn-sm btn-ghost" href="${hashTorneo('impostazioni')}">${icon('edit')}Gestisci</a></div>
      <ul class="cat-overview">${t.categorie.map(c => {
        const { tot, giocate: g } = contaPartite(c, S.risultati);
        const reg = regoleDi(t, c);
        return `<li><a href="${hashTorneo('c/' + c.id)}">
          <i class="dot dot-lg" style="background:${esc(c.colore)}"></i>
          <div class="co-main"><strong>${esc(catNome(c))}</strong><span class="muted small">${plurale(squadreTotali(t, c.id), 'squadra', 'squadre')}, ${c.fasi.length ? plurale(c.fasi.length, 'fase', 'fasi') : 'gironi da creare'}${reg.personalizzate ? ', regole proprie' : ''}</span></div>
          <div class="co-prog">${tot ? `<span class="num small">${g}/${tot}</span><div class="progress"><i style="width:${Math.round(g / tot * 100)}%;background:${esc(c.colore)}"></i></div>` : ''}</div>
          ${icon('right')}</a></li>`;
      }).join('')}</ul>
    </section>`;
}

// ── Impostazioni ──────────────────────────────────────────
function vistaImpostazioni() {
  const t = S.torneo;
  return `<div class="page-head"><h1>Impostazioni</h1></div>
    <section class="panel"><div class="panel-head"><h2>Dati del torneo</h2></div><div class="panel-body stack">
      <label class="field"><span>Nome</span><input class="input" id="im-nome" value="${esc(t.nome)}" data-c="campoTorneo" data-k="nome" maxlength="80"></label>
      <div class="grid-2">
        <label class="field"><span>Data</span><input class="input" id="im-data" type="date" value="${esc(t.data)}" data-c="campoTorneo" data-k="data"></label>
        <label class="field"><span>Luogo</span><input class="input" id="im-luogo" value="${esc(t.luogo)}" data-c="campoTorneo" data-k="luogo" maxlength="80"></label>
      </div>
      <div class="field"><span>Logo dell'organizzatore</span>
        <div class="org-logo">
          ${S.media.org ? `<img src="${esc(S.media.org)}" alt="Logo dell'organizzatore">` : `<span class="org-logo-ph">${icon('image')}</span>`}
          <div class="stack" style="gap:8px">
            <div class="row-wrap"><button class="btn btn-sm" data-a="caricaLogoOrg">${icon('upload')}${S.media.org ? 'Cambia logo' : 'Carica logo'}</button>
            ${S.media.org ? `<button class="btn btn-sm btn-ghost" data-a="togliLogoOrg">${icon('trash')}Rimuovi</button>` : ''}</div>
            <span class="hint">Compare nel modulo di iscrizione, nella pagina pubblica e nelle stampe.</span>
          </div>
        </div>
      </div>
    </div></section>

    <section class="panel"><div class="panel-head"><h2>Regole di punteggio</h2></div><div class="panel-body">
      <p class="muted" style="margin-bottom:16px">Valgono per tutte le categorie che non hanno regole proprie. La classifica si aggiorna subito, anche per le partite già giocate.</p>
      ${editorRegole('torneo', t.regole)}
      <p class="hint" style="margin-top:14px">A parità di punti contano, nell'ordine: differenza set, differenza punti, punti fatti.</p>
    </div></section>

    <section class="panel"><div class="panel-head"><h2>Categorie</h2><button class="btn btn-sm" data-a="aggiungiCategoria">${icon('plus')}Aggiungi</button></div>
      <ul class="cat-edit cat-edit-list">${t.categorie.map((c, i) => {
        const reg = regoleDi(t, c);
        return `<li><i class="dot dot-lg" style="background:${esc(c.colore)}"></i>
          <div style="flex:1;min-width:0"><strong>${esc(catNome(c))}</strong><div class="muted small">${reg.personalizzate ? `Regole proprie: ${esc(descriviPunti(reg.punti))}, ${plurale(reg.set, 'set', 'set')}` : 'Regole del torneo'}</div></div>
          <button class="btn btn-ghost btn-icon btn-sm" data-a="spostaCat" data-id="${c.id}" data-d="-1" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-a="spostaCat" data-id="${c.id}" data-d="1" aria-label="Sposta giù" ${i === t.categorie.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
          <button class="btn btn-sm" data-a="modificaCategoria" data-id="${c.id}">${icon('edit')}Modifica</button>
        </li>`;
      }).join('')}</ul>
    </section>

    <section class="panel"><div class="panel-head"><h2>Backup e archivio</h2></div><div class="panel-body stack">
      <div class="row-wrap">
        <button class="btn" data-a="esportaQuesto">${icon('download')}Esporta backup</button>
        <a class="btn" href="${esc(link('stampa.html', { t: S.tid }))}" target="_blank" rel="noopener">${icon('print')}Stampa tutte le classifiche</a>
        <a class="btn" href="${esc(link('stampa.html', { t: S.tid, tipo: 'programma' }))}" target="_blank" rel="noopener">${icon('print')}Stampa il programma di sala</a>
        <button class="btn" data-a="toggleArchivio">${icon('archive')}${t.archiviato ? 'Riporta tra gli attivi' : 'Archivia torneo'}</button>
      </div>
      <div class="danger-zone">
        <div><strong>Elimina torneo</strong><p class="muted small">Cancella gironi, risultati, iscrizioni e immagini. Non si può annullare.</p></div>
        <button class="btn btn-danger" data-a="eliminaQuesto">${icon('trash')}Elimina</button>
      </div>
    </div></section>`;
}

// Finestra di modifica categoria (nome, colore, campi, regole proprie)
async function finestraCategoria(c) {
  const nuova = !c;
  const bozza = c ? { nome: c.nome, colore: c.colore, emoji: c.emoji || '' } : { nome: '', emoji: '', colore: (COLORI.find(x => !S.torneo.categorie.some(k => k.colore === x.hex)) || COLORI[0]).hex };
  const proprie = !!c?.regole;
  const ris = await modal({
    title: nuova ? 'Nuova categoria' : `Modifica ${catNome(c)}`,
    body: `<div class="field"><span>Nome</span><div class="row" style="gap:8px">${sceltaEmoji(bozza.emoji, 'id="mc-emoji"')}<input class="input" id="mc-nome" value="${esc(bozza.nome)}" maxlength="40" aria-label="Nome" autofocus></div></div>
      <div class="field"><span>Colore</span>${swatches(bozza.colore, 'data-pick')}</div>
      ${nuova ? '' : `<label class="switch"><input type="checkbox" id="mc-regole" ${proprie ? 'checked' : ''}><span class="track"></span><span>Usa regole di punteggio diverse da quelle del torneo</span></label>
      <p class="hint">Le regole proprie si modificano dalla pagina della categoria.</p>`}
      ${nuova ? '' : `<div class="danger-zone"><div><strong>Elimina categoria</strong><p class="muted small">Cancella anche i suoi gironi e risultati.</p></div><button type="button" class="btn btn-danger btn-sm" id="mc-del">${icon('trash')}Elimina</button></div>`}`,
    azioni: [{ label: 'Annulla', value: null }, { label: nuova ? 'Aggiungi' : 'Salva', cls: 'btn-primary', value: box => ({ nome: box.querySelector('#mc-nome').value.trim(), emoji: box.querySelector('#mc-emoji').value, colore: box.dataset.colore || bozza.colore, regole: box.querySelector('#mc-regole')?.checked }) }],
    validate: box => {
      const v = box.querySelector('#mc-nome').value.trim();
      if (!v) { toast('Inserisci un nome.', 'err'); return 'x'; }
      if (S.torneo.categorie.some(k => k !== c && k.nome.toLowerCase() === v.toLowerCase())) { toast('Esiste già una categoria con questo nome.', 'err'); return 'x'; }
      return null;
    },
    onMount: (box, close) => {
      box.dataset.colore = bozza.colore;
      box.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
        box.dataset.colore = b.dataset.colore;
        box.querySelectorAll('[data-pick]').forEach(x => x.setAttribute('aria-pressed', x === b));
      }));
      box.querySelector('#mc-del')?.addEventListener('click', () => close('elimina'));
    },
  });
  if (!ris) return;
  if (ris === 'elimina') { eliminaCategoria(c); return; }
  modifica(t => {
    if (nuova) t.categorie.push({ id: uid(), nome: ris.nome, colore: ris.colore, emoji: ris.emoji, campi: 0, regole: null, fasi: [] });
    else {
      c.nome = ris.nome; c.colore = ris.colore; c.emoji = ris.emoji;
      if (ris.regole && !c.regole) c.regole = { punti: { ...t.regole.punti }, set: t.regole.set, timer: t.regole.timer };
      if (!ris.regole) c.regole = null;
    }
  });
  toast(nuova ? 'Categoria aggiunta' : 'Categoria aggiornata');
}

async function eliminaCategoria(c) {
  const { tot, giocate } = contaPartite(c, S.risultati);
  const ok = await conferma(`La categoria “${esc(catNome(c))}” verrà eliminata${tot ? ` con ${plurale(tot, 'partita', 'partite')}${giocate ? `, di cui ${giocate} già giocate` : ''}` : ''}.`, { titolo: 'Eliminare la categoria?', ok: 'Elimina', pericolo: true });
  if (!ok) return;
  const ids = [];
  for (const f of c.fasi) {
    if (f.tipo === 'elim') ids.push(...Object.keys(S.risultati).filter(k => k.startsWith(f.id + '_')));
    else for (const g of f.gironi) ids.push(...g.partite.map(p => p.id).filter(id => S.risultati[id]));
  }
  modifica(t => {
    t.categorie = t.categorie.filter(x => x.id !== c.id);
    for (const s of t.societa) { delete s.squadre[c.id]; delete s.atleti[c.id]; }
  });
  if (ids.length) await S.store.delRisultati(S.tid, ids);
  if (S.route.sez === 'cat') vai(hashTorneo('impostazioni'));
  toast('Categoria eliminata');
}

registra({
  async caricaLogoOrg() {
    const f = await scegliFile();
    if (!f) return;
    let data;
    try { data = await comprimiImmagine(f, 360, 0.85); } catch (e) { toast(e.message, 'err'); return; }
    await S.store.setMedia(S.tid, 'org', data);
    toast('Logo caricato');
  },
  async togliLogoOrg() {
    if (!await conferma('Il logo non comparirà più nel modulo, nella pagina pubblica e nelle stampe.', { titolo: 'Rimuovere il logo?', ok: 'Rimuovi', pericolo: true })) return;
    await S.store.delMedia(S.tid, 'org');
    toast('Logo rimosso');
  },
  async condividiLive() {
    const url = link('live.html', { t: S.tid });
    await condividiLink({
      titolo: 'Condividi la pagina pubblica',
      descrizione: 'Genitori e pubblico seguono classifiche e risultati in tempo reale dal telefono. Non serve nessuna app.',
      url, messaggio: `Segui ${S.torneo.nome} in diretta: classifiche e risultati in tempo reale.`,
      extra: `<a class="btn btn-block" href="${esc(link('stampa.html', { t: S.tid, tipo: 'volantino' }))}" target="_blank" rel="noopener">${icon('print')}Stampa il volantino con il QR</a>`,
    });
  },
  campoTorneo(el) {
    const k = el.dataset.k, v = el.value.trim();
    if (k === 'nome' && !v) { el.value = S.torneo.nome; toast('Il nome non può essere vuoto.', 'err'); return; }
    modifica(t => { t[k] = v; }, { ridisegna: k === 'nome' });
  },
  aggiungiCategoria() { finestraCategoria(null); },
  modificaCategoria(el) { finestraCategoria(cat(el.dataset.id)); },
  spostaCat(el) {
    modifica(t => {
      const i = t.categorie.findIndex(c => c.id === el.dataset.id), j = i + +el.dataset.d;
      if (i < 0 || j < 0 || j >= t.categorie.length) return;
      [t.categorie[i], t.categorie[j]] = [t.categorie[j], t.categorie[i]];
    });
  },
  toggleArchivio() {
    const arch = !S.torneo.archiviato;
    modifica(t => { t.archiviato = arch; if (arch) t.iscrizioni.aperte = false; });
    toast(arch ? 'Torneo archiviato' : 'Torneo riportato tra gli attivi');
  },
  async esportaQuesto() {
    await salvaOra();
    const { owner, ...dati } = S.torneo;
    const json = await esportaTorneo(S.store, S.tid, dati);
    scaricaFile(`${slug(S.torneo.nome)}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(json, null, 2));
    toast('Backup scaricato');
  },
  async eliminaQuesto() {
    const ok = await conferma(`“${esc(S.torneo.nome)}” verrà eliminato con tutti i dati. Non si può annullare.`, { titolo: 'Eliminare il torneo?', ok: 'Elimina definitivamente', pericolo: true });
    if (!ok) return;
    const tid = S.tid;
    vai('#/');
    await S.store.deleteTorneo(tid);
    toast('Torneo eliminato');
  },
});

export { finestraCategoria };
