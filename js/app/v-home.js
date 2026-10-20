// Elenco dei tornei
import { esc, catIcona, catNome, plurale, squadreTotali, normalizzaTorneo } from '../core.js';
import { link } from '../config.js';
import { icon, toast, conferma, scaricaFile, scegliFile, slug, modal } from '../ui.js';
import { S, registra, vai, render } from './stato.js';
import { esportaTorneo, leggiFileImport, importaInStore } from './importa.js';

let cerca = '';

function dataTile(iso) {
  if (!iso) return `<span class="t-date t-date-empty" aria-hidden="true">${icon('calendar')}</span>`;
  const d = new Date(iso + 'T12:00:00');
  return `<span class="t-date" aria-hidden="true"><b class="num">${d.getDate()}</b><small>${d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}</small></span>`;
}

function rigaTorneo(t) {
  const tot = t.categorie?.reduce((s, c) => s + squadreTotali(t, c.id), 0) || 0;
  const data = t.data ? new Date(t.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Data da definire';
  return `<li class="t-row${t.archiviato ? ' is-archived' : ''}">
    <a class="t-main" href="#/t/${esc(t.id)}">
      ${dataTile(t.data)}
      <span class="t-info">
        <strong>${esc(t.nome)}</strong>
        <span class="t-meta"><span>${esc(data)}</span>${t.luogo ? `<span>${icon('pin')}${esc(t.luogo)}</span>` : ''}</span>
        <span class="t-cats">${(t.categorie || []).map(c => `<span class="cat-tag small">${catIcona(c)}${esc(catNome(c))}</span>`).join('')}
          <span class="muted small">${plurale(t.societa?.length || 0, 'società', 'società')}, ${plurale(tot, 'squadra', 'squadre')}</span></span>
      </span>
    </a>
    <div class="t-side">
      ${t.iscrizioni?.aperte && !t.archiviato ? '<span class="chip chip-blue">Iscrizioni aperte</span>' : ''}
      ${t.archiviato ? '<span class="chip">Archiviato</span>' : ''}
      <details class="menu">
        <summary class="btn btn-ghost btn-icon btn-sm" aria-label="Altre azioni per ${esc(t.nome)}">${icon('more')}</summary>
        <div class="menu-list">
          <a href="${esc(link('live.html', { t: t.id }))}" target="_blank" rel="noopener">${icon('live')}Apri pagina pubblica</a>
          <button data-a="duplica" data-id="${esc(t.id)}">${icon('copy')}Usa come modello</button>
          <button data-a="esporta" data-id="${esc(t.id)}">${icon('download')}Esporta backup</button>
          <button data-a="archivia" data-id="${esc(t.id)}">${icon('archive')}${t.archiviato ? 'Riporta tra gli attivi' : 'Archivia'}</button>
          <button data-a="elimina" data-id="${esc(t.id)}" class="danger">${icon('trash')}Elimina</button>
        </div>
      </details>
    </div>
  </li>`;
}

export function vistaHome() {
  if (!S.torneiPronti) return `<div class="loading-screen"><div class="spinner"></div></div>`;
  const tutti = [...S.tornei].sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.createdAt || 0) - (a.createdAt || 0));
  const q = cerca.trim().toLowerCase();
  const filtra = t => !q || t.nome.toLowerCase().includes(q) || (t.luogo || '').toLowerCase().includes(q);
  const attivi = tutti.filter(t => !t.archiviato && filtra(t));
  const archiviati = tutti.filter(t => t.archiviato && filtra(t));

  const azioniTesta = `<div class="row-wrap">
      <button class="btn btn-ghost" data-a="esportaTutti" title="Scarica un unico file con tutti i tornei">${icon('download')}Backup di tutti</button>
      <button class="btn" data-a="importa">${icon('upload')}Importa</button>
      <a class="btn btn-accent" href="#/nuovo">${icon('plus')}Nuovo torneo</a>
    </div>`;

  if (!tutti.length) {
    return `<div class="page page-narrow">
      <div class="welcome panel">
        <img src="assets/logo-mark.svg" alt="" width="72" height="72">
        <h1>Benvenuto in VolleyHub</h1>
        <p class="muted">Crea il primo torneo: in pochi passaggi imposti categorie e regole, poi aggiungi le società e generi i gironi.</p>
        <div class="row-wrap" style="justify-content:center">
          <a class="btn btn-accent btn-lg" href="#/nuovo">${icon('plus')}Crea il primo torneo</a>
          <button class="btn btn-lg" data-a="importa">${icon('upload')}Importa un backup</button>
        </div>
        <p class="hint">Hai usato la vecchia app? Esporta i tornei da lì e importali qui: squadre, gironi e risultati vengono convertiti.</p>
      </div>
    </div>`;
  }

  return `<div class="page">
    <div class="page-head"><h1>I tuoi tornei</h1>${azioniTesta}</div>
    ${tutti.length > 4 ? `<label class="search"><span class="sr-only">Cerca torneo</span>${icon('search')}<input class="input" id="cerca-tornei" type="search" placeholder="Cerca per nome o luogo" value="${esc(cerca)}" data-i="cercaTornei"></label>` : ''}
    ${attivi.length ? `<ul class="t-list">${attivi.map(rigaTorneo).join('')}</ul>`
      : `<div class="panel empty"><p>${q ? `Nessun torneo attivo corrisponde a “${esc(cerca)}”.` : 'Nessun torneo attivo.'}</p></div>`}
    ${archiviati.length ? `<details class="archived" ${q ? 'open' : ''}><summary>${icon('archive')}Archiviati (${archiviati.length})</summary><ul class="t-list">${archiviati.map(rigaTorneo).join('')}</ul></details>` : ''}
  </div>`;
}

function chiudiMenu(el) { el.closest('details')?.removeAttribute('open'); }
function torneo(id) { return S.tornei.find(t => t.id === id); }

registra({
  cercaTornei(el) { cerca = el.value; render(); },

  async importa() {
    const file = await scegliFile('.json,application/json');
    if (!file) return;
    let voci;
    try { voci = leggiFileImport(JSON.parse(await file.text())); }
    catch (e) { toast(e instanceof SyntaxError ? 'Il file non è un backup valido (JSON non leggibile).' : e.message, 'err'); return; }
    const ok = await modal({
      title: voci.length > 1 ? `Importare ${voci.length} tornei?` : 'Importare il torneo?',
      body: `<ul class="plain-list">${voci.map(v => `<li><strong>${esc(v.torneo.nome)}</strong> <span class="muted small">${plurale(v.torneo.categorie.length, 'categoria', 'categorie')}, ${plurale(v.torneo.societa.length, 'società', 'società')}, ${plurale(Object.keys(v.risultati).length, 'risultato', 'risultati')}</span></li>`).join('')}</ul>`,
      azioni: [{ label: 'Annulla', value: false }, { label: 'Importa', value: true, cls: 'btn-primary' }],
    });
    if (!ok) return;
    let ultimo;
    for (const v of voci) ultimo = await importaInStore(S.store, S.user.uid, v);
    toast(voci.length > 1 ? `${voci.length} tornei importati` : 'Torneo importato');
    if (voci.length === 1) vai(`#/t/${ultimo}`);
  },

  async duplica(el) {
    chiudiMenu(el);
    const t = torneo(el.dataset.id);
    if (!t) return;
    const ok = await conferma(`Verrà creato un nuovo torneo con le stesse categorie, regole, società e pagina pubblica di “${esc(t.nome)}”. Gironi, risultati e iscrizioni ricevute non vengono copiati.`, { titolo: 'Usare come modello?', ok: 'Crea copia' });
    if (!ok) return;
    const { id, ...dati } = t;
    const nuovo = normalizzaTorneo({ ...dati, nome: `${t.nome} (copia)`, createdAt: Date.now(), archiviato: false, data: '' });
    nuovo.categorie = nuovo.categorie.map(c => ({ ...c, fasi: [] }));
    nuovo.iscrizioni.aperte = false;
    nuovo.presenze = {}; nuovo.assenti = {};
    const tid = await S.store.createTorneo(nuovo);
    const media = await S.store.getMedia(id);
    for (const [k, v] of Object.entries(media)) await S.store.setMedia(tid, k, v);
    const priv = await S.store.getPrivato(id);
    if (priv.contatti) await S.store.patchPrivato(tid, { contatti: priv.contatti });
    toast('Copia creata');
    vai(`#/t/${tid}/impostazioni`);
  },

  async esporta(el) {
    chiudiMenu(el);
    const t = torneo(el.dataset.id);
    if (!t) return;
    const { id, ...dati } = t;
    const json = await esportaTorneo(S.store, id, dati);
    scaricaFile(`${slug(t.nome)}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(json, null, 2));
    toast('Backup scaricato');
  },

  async esportaTutti() {
    if (!S.tornei.length) return;
    toast('Preparo il backup…');
    const tornei = [];
    for (const t of S.tornei) { const { id, ...dati } = t; tornei.push(await esportaTorneo(S.store, id, dati)); }
    scaricaFile(`volleyhub-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ formato: 'volleyhub', versione: 1, esportatoIl: new Date().toISOString(), tornei }, null, 2));
    toast(`Backup di ${plurale(tornei.length, 'torneo', 'tornei')} scaricato`);
  },

  async archivia(el) {
    chiudiMenu(el);
    const t = torneo(el.dataset.id);
    if (!t) return;
    const { id, ...dati } = t;
    await S.store.saveTorneo(id, { ...dati, archiviato: !t.archiviato, iscrizioni: { ...dati.iscrizioni, aperte: t.archiviato ? dati.iscrizioni?.aperte : false } });
    toast(t.archiviato ? 'Torneo riportato tra gli attivi' : 'Torneo archiviato');
  },

  async elimina(el) {
    chiudiMenu(el);
    const t = torneo(el.dataset.id);
    if (!t) return;
    const ok = await conferma(`“${esc(t.nome)}” verrà eliminato con tutti i gironi, i risultati e le iscrizioni. Non si può annullare: se vuoi conservarlo, esporta prima un backup.`, { titolo: 'Eliminare il torneo?', ok: 'Elimina definitivamente', pericolo: true });
    if (!ok) return;
    await S.store.deleteTorneo(t.id);
    toast('Torneo eliminato');
  },
});

// Chiude i menu a tendina cliccando altrove
document.addEventListener('click', e => {
  document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); });
});
