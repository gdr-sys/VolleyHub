// Procedura guidata "Nuovo torneo"
import { esc, uid, COLORI, PUNTI_DEFAULT, nuovoTorneo } from '../core.js';
import { icon, toast } from '../ui.js';
import { S, registra, render, vai } from './stato.js';
import { editorRegole, swatches } from './comp.js';

const MODELLI = {
  minivolley: [['White', '#2A5BD7'], ['Green', '#12805C'], ['Red', '#C8283C']],
  under: [['Under 12', '#7A3FD1'], ['Under 13', '#D9730D'], ['Under 14', '#0E8A9E']],
};

export function initNuovo() {
  S.nuovo = {
    passo: 1, nome: '', data: '', luogo: '',
    categorie: MODELLI.minivolley.map(([nome, colore]) => ({ id: uid(), nome, colore })),
    punti: { ...PUNTI_DEFAULT }, set: 2, timer: 0,
  };
}

const PASSI = ['Dati del torneo', 'Categorie', 'Regole di gioco'];

export function vistaNuovo() {
  const n = S.nuovo;
  let corpo = '';
  if (n.passo === 1) {
    corpo = `<div class="stack">
      <label class="field"><span>Nome del torneo</span>
        <input class="input input-lg" id="nv-nome" value="${esc(n.nome)}" placeholder="Es. Torneo di Primavera 2026" data-i="nvCampo" data-k="nome" data-enter="nvAvanti" autofocus maxlength="80"></label>
      <div class="grid-2">
        <label class="field"><span>Data</span><input class="input" id="nv-data" type="date" value="${esc(n.data)}" data-c="nvCampo" data-k="data"></label>
        <label class="field"><span>Luogo</span><input class="input" id="nv-luogo" value="${esc(n.luogo)}" placeholder="Es. Palazzetto dello Sport" data-i="nvCampo" data-k="luogo" data-enter="nvAvanti" maxlength="80"></label>
      </div>
      <p class="hint">Data e luogo compaiono nella pagina pubblica e nel modulo d'iscrizione. Puoi cambiarli quando vuoi.</p>
    </div>`;
  } else if (n.passo === 2) {
    corpo = `<div class="stack">
      <p class="muted">Ogni categoria ha i suoi gironi e la sua classifica. Il colore la rende riconoscibile ovunque, anche nella pagina pubblica.</p>
      <div class="row-wrap"><span class="small muted">Parti da un modello:</span>
        <button class="btn btn-sm" data-a="nvModello" data-m="minivolley">White, Green, Red</button>
        <button class="btn btn-sm" data-a="nvModello" data-m="under">Under 12, 13, 14</button>
      </div>
      <ul class="cat-edit">${n.categorie.map((c, i) => `
        <li>
          <i class="dot dot-lg" style="background:${esc(c.colore)}"></i>
          <div class="stack" style="gap:8px;flex:1;min-width:0">
            <input class="input" id="nv-cat-${c.id}" value="${esc(c.nome)}" placeholder="Nome categoria" aria-label="Nome categoria ${i + 1}" data-i="nvCat" data-id="${c.id}" maxlength="40">
            ${swatches(c.colore, `data-a="nvColore" data-id="${c.id}"`)}
          </div>
          <button class="btn btn-ghost btn-icon" data-a="nvTogliCat" data-id="${c.id}" aria-label="Rimuovi ${esc(c.nome || 'categoria')}" ${n.categorie.length < 2 ? 'disabled' : ''}>${icon('trash')}</button>
        </li>`).join('')}
      </ul>
      <button class="btn" data-a="nvAggiungiCat" style="justify-self:start">${icon('plus')}Aggiungi categoria</button>
    </div>`;
  } else {
    corpo = `<p class="muted" style="margin-bottom:16px">Decidi come si assegnano i punti in classifica. Valgono per tutte le categorie, ma potrai cambiarli per una singola categoria.</p>
      ${editorRegole('nuovo', n)}`;
  }

  return `<div class="page page-narrow">
    <div class="page-head"><h1>Nuovo torneo</h1></div>
    <ol class="steps" aria-label="Passaggi">${PASSI.map((p, i) => `<li class="${i + 1 < n.passo ? 'done' : i + 1 === n.passo ? 'current' : ''}" ${i + 1 === n.passo ? 'aria-current="step"' : ''}><span class="num">${i + 1 < n.passo ? icon('check') : i + 1}</span>${p}</li>`).join('')}</ol>
    <div class="panel"><div class="panel-body">${corpo}</div>
      <div class="panel-foot">
        ${n.passo > 1 ? `<button class="btn" data-a="nvIndietro">${icon('left')}Indietro</button>` : '<a class="btn btn-ghost" href="#/" data-a="nvAnnulla">Annulla</a>'}
        <span class="spacer"></span>
        ${n.passo < 3 ? `<button class="btn btn-primary" data-a="nvAvanti">Continua${icon('right')}</button>` : `<button class="btn btn-accent" data-a="nvCrea" id="nv-crea">${icon('check')}Crea torneo</button>`}
      </div>
    </div>
  </div>`;
}

function valida(passo) {
  const n = S.nuovo;
  if (passo === 1 && !n.nome.trim()) { toast('Dai un nome al torneo.', 'err'); document.getElementById('nv-nome')?.focus(); return false; }
  if (passo === 2) {
    if (!n.categorie.length) { toast('Serve almeno una categoria.', 'err'); return false; }
    const vuota = n.categorie.find(c => !c.nome.trim());
    if (vuota) { toast('Dai un nome a ogni categoria.', 'err'); document.getElementById('nv-cat-' + vuota.id)?.focus(); return false; }
    const nomi = n.categorie.map(c => c.nome.trim().toLowerCase());
    if (new Set(nomi).size !== nomi.length) { toast('Due categorie hanno lo stesso nome.', 'err'); return false; }
  }
  return true;
}

registra({
  nvCampo(el) { S.nuovo[el.dataset.k] = el.value; },
  nvCat(el) { const c = S.nuovo.categorie.find(x => x.id === el.dataset.id); if (c) c.nome = el.value; },
  nvColore(el) { const c = S.nuovo.categorie.find(x => x.id === el.dataset.id); if (c) { c.colore = el.dataset.colore; render(); } },
  nvTogliCat(el) { S.nuovo.categorie = S.nuovo.categorie.filter(x => x.id !== el.dataset.id); render(); },
  nvAggiungiCat() {
    const usati = new Set(S.nuovo.categorie.map(c => c.colore));
    const colore = (COLORI.find(c => !usati.has(c.hex)) || COLORI[0]).hex;
    const id = uid();
    S.nuovo.categorie.push({ id, nome: '', colore });
    render();
    document.getElementById('nv-cat-' + id)?.focus();
  },
  nvModello(el) {
    S.nuovo.categorie = MODELLI[el.dataset.m].map(([nome, colore]) => ({ id: uid(), nome, colore }));
    render();
  },
  nvAvanti() { if (valida(S.nuovo.passo)) { S.nuovo.passo++; render(); window.scrollTo(0, 0); } },
  nvIndietro() { S.nuovo.passo--; render(); },
  nvAnnulla() { S.nuovo = null; vai('#/'); },
  async nvCrea(el) {
    if (!valida(1) || !valida(2)) return;
    el.disabled = true;
    const n = S.nuovo;
    const t = nuovoTorneo({
      nome: n.nome.trim(), data: n.data, luogo: n.luogo.trim(), owner: S.user.uid,
      categorie: n.categorie.map(c => ({ id: c.id, nome: c.nome.trim(), colore: c.colore })),
      regole: { punti: n.punti, set: n.set, timer: n.timer },
    });
    try {
      const id = await S.store.createTorneo(t);
      S.nuovo = null;
      toast('Torneo creato');
      vai(`#/t/${id}`);
    } catch (e) {
      el.disabled = false;
      throw new Error(e.code === 'permission-denied' ? 'Il tuo account non può creare tornei. Controlla che sia attivo e che le regole Firestore siano aggiornate.' : 'Creazione non riuscita. Riprova.');
    }
  },
});
