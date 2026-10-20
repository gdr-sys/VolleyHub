// Componenti riutilizzati da più viste dell'app di gestione
import { esc, COLORI, PRESET_PUNTI, presetDi, normalizzaPunti, puntiPartita, clamp, intOr, plurale } from '../core.js';
import { icon } from '../ui.js';
import { S, registra, modifica, render, cat } from './stato.js';

export function stepper({ id, valore, min = 0, max = 99, a, c, dati = '', label }) {
  return `<span class="stepper" role="group" aria-label="${esc(label)}">
    <button type="button" data-a="${a}" data-d="-1" ${dati} aria-label="Diminuisci">−</button>
    <input id="${esc(id)}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${esc(valore)}" data-c="${c}" ${dati} aria-label="${esc(label)}">
    <button type="button" data-a="${a}" data-d="1" ${dati} aria-label="Aumenta">+</button>
  </span>`;
}

export function swatches(attuale, attr) {
  return `<div class="swatches" role="group" aria-label="Colore">${COLORI.map(c =>
    `<button type="button" class="swatch" style="background:${c.hex}" title="${c.nome}" aria-label="${c.nome}" aria-pressed="${c.hex.toLowerCase() === String(attuale).toLowerCase()}" data-colore="${c.hex}" ${attr}></button>`).join('')}</div>`;
}

// Frase d'esempio che spiega le regole in concreto
export function esempioPunti(punti, nSet) {
  const p = normalizzaPunti(punti);
  const casi = [];
  const vittoriaNetta = [nSet, 0];
  casi.push({ s: vittoriaNetta, testo: `Vittoria ${nSet}–0` });
  if (nSet === 2) casi.push({ s: [1, 1], testo: 'Set pari 1–1' });
  if (nSet >= 3) casi.push({ s: [Math.ceil(nSet / 2), Math.floor(nSet / 2)], testo: `Vittoria ${Math.ceil(nSet / 2)}–${Math.floor(nSet / 2)}` });
  return `<div class="esempio"><span class="label">Con queste regole</span><ul>${casi.map(k => {
    const [h, a] = puntiPartita({ sh: k.s[0], sa: k.s[1] }, p);
    return `<li><span>${k.testo}</span><b class="num">${h}</b><span class="muted">a</span><b class="num">${a}</b></li>`;
  }).join('')}</ul></div>`;
}

// Editor delle regole di punteggio. scope: 'nuovo' | 'torneo' | 'cat:<id>'
export function editorRegole(scope, regole, { mostraSet = true, mostraTimer = true } = {}) {
  const punti = normalizzaPunti(regole.punti);
  const preset = presetDi(punti);
  const custom = preset === 'custom' || S.aperti.has('custom:' + scope);
  const d = `data-scope="${esc(scope)}"`;
  const key = scope.replace(/[^a-z0-9]/gi, '');
  return `<div class="stack-lg">
    <fieldset class="fs">
      <legend>Punti in classifica</legend>
      <div class="choices">
        ${PRESET_PUNTI.map(p => `<label class="choice"><input type="radio" name="pr-${key}" value="${p.id}" ${!custom && preset === p.id ? 'checked' : ''} data-c="presetPunti" ${d}><span class="box"><strong>${esc(p.nome)}</strong>${p.id === 'set' ? '<small>Impostazione predefinita</small>' : ''}</span></label>`).join('')}
        <label class="choice"><input type="radio" name="pr-${key}" value="custom" ${custom ? 'checked' : ''} data-c="presetPunti" ${d}><span class="box"><strong>Personalizzato</strong><small>Scegli tu ogni valore</small></span></label>
      </div>
      ${custom ? `<div class="punti-custom">
        ${[['perSet', 'Per ogni set vinto'], ['vittoria', 'Bonus vittoria'], ['pareggio', 'Pareggio'], ['sconfitta', 'Sconfitta']].map(([k, l]) => `
          <div class="field"><span>${l}</span>${stepper({ id: `pt-${key}-${k}`, valore: punti[k], a: 'stepRegola', c: 'regola', dati: `${d} data-k="punti.${k}"`, label: l })}</div>`).join('')}
        <p class="hint" style="grid-column:1/-1">Il pareggio vale quando le squadre vincono lo stesso numero di set (per esempio 1–1 con due set).</p>
      </div>` : ''}
    </fieldset>
    ${mostraSet ? `<fieldset class="fs">
      <legend>Set per partita</legend>
      <div class="segmented" role="tablist">${[1, 2, 3].map(n => `<button type="button" role="tab" aria-selected="${regole.set === n}" data-a="setRegola" data-n="${n}" ${d}>${plurale(n, 'set', 'set')}</button>`).join('')}</div>
      <p class="hint">Si giocano tutti i set indicati. Puoi cambiarlo anche per singolo girone.</p>
    </fieldset>` : ''}
    ${esempioPunti(punti, regole.set)}
    ${mostraTimer ? `<fieldset class="fs">
      <legend>Partite a tempo</legend>
      <div class="row-wrap">
        <label class="switch"><input type="checkbox" ${regole.timer ? 'checked' : ''} data-c="timerOn" ${d}><span class="track"></span><span>Mostra un cronometro al segnapunti</span></label>
        ${regole.timer ? `<span class="row">${stepper({ id: `tm-${key}`, valore: regole.timer, min: 1, max: 90, a: 'stepRegola', c: 'regola', dati: `${d} data-k="timer"`, label: 'Minuti per partita' })}<span class="muted small">minuti</span></span>` : ''}
      </div>
    </fieldset>` : ''}
  </div>`;
}

// Applica una modifica alle regole del contesto indicato
function suRegole(scope, fn) {
  if (scope === 'nuovo') { fn(S.nuovo); render(); return; }
  if (scope === 'torneo') { modifica(t => fn(t.regole)); return; }
  if (scope.startsWith('cat:')) {
    const c = cat(scope.slice(4));
    if (!c) return;
    modifica(t => { if (!c.regole) c.regole = { punti: { ...t.regole.punti }, set: t.regole.set, timer: t.regole.timer }; fn(c.regole); });
  }
}
function leggiRegole(scope) {
  if (scope === 'nuovo') return S.nuovo;
  if (scope === 'torneo') return S.torneo.regole;
  const c = cat(scope.slice(4));
  return c?.regole || S.torneo.regole;
}
function imposta(obj, k, v) {
  if (k.startsWith('punti.')) { obj.punti = { ...normalizzaPunti(obj.punti), [k.slice(6)]: clamp(v, 0, 99) }; }
  else if (k === 'timer') obj.timer = clamp(v, 1, 90);
}

registra({
  presetPunti(el) {
    const scope = el.dataset.scope;
    if (el.value === 'custom') { S.aperti.add('custom:' + scope); render(); return; }
    S.aperti.delete('custom:' + scope);
    const p = PRESET_PUNTI.find(x => x.id === el.value);
    suRegole(scope, r => { r.punti = { ...p.punti }; });
  },
  regola(el) {
    const v = intOr(el.value, 0);
    suRegole(el.dataset.scope, r => imposta(r, el.dataset.k, v));
  },
  stepRegola(el) {
    const scope = el.dataset.scope, k = el.dataset.k;
    const r = leggiRegole(scope);
    const att = k.startsWith('punti.') ? normalizzaPunti(r.punti)[k.slice(6)] : r.timer;
    S.aperti.add('custom:' + scope);
    suRegole(scope, x => imposta(x, k, att + +el.dataset.d));
  },
  setRegola(el) { suRegole(el.dataset.scope, r => { r.set = +el.dataset.n; }); },
  timerOn(el) { suRegole(el.dataset.scope, r => { r.timer = el.checked ? (r.timer || 12) : 0; }); },
});

export function vuoto({ icona = 'info', titolo, testo = '', azioni = '' }) {
  return `<div class="empty">${icon(icona, 'big')}<h3>${esc(titolo)}</h3>${testo ? `<p>${testo}</p>` : ''}${azioni ? `<div class="row-wrap" style="justify-content:center">${azioni}</div>` : ''}</div>`;
}
