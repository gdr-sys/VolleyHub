// Configurazione della pagina pubblica: info, menu, sponsor
import { esc, uid, normalizzaPrezzo, safeImg } from '../core.js';
import { link } from '../config.js';
import { icon, toast, conferma, comprimiImmagine, scegliFile } from '../ui.js';
import { S, registra, modifica, render } from './stato.js';

export function vistaPubblica() {
  const L = S.torneo.live;
  const url = link('live.html', { t: S.tid });
  const sezione = (k, ic, titolo, desc, attivo, corpo) => `<section class="panel">
    <div class="panel-head"><span class="sec-ic">${icon(ic)}</span><div style="flex:1"><h2>${titolo}</h2><p class="muted small">${desc}</p></div>
      <label class="switch"><input type="checkbox" ${attivo ? 'checked' : ''} data-c="liveOn" data-k="${k}"><span class="track"></span><span class="sr-only">Mostra ${titolo}</span></label></div>
    ${attivo ? `<div class="panel-body stack">${corpo}</div>` : ''}
  </section>`;

  const info = L.info.blocchi.map((b, i) => `<div class="edit-block">
      <div class="row"><input class="input" id="ib-t-${b.id}" value="${esc(b.titolo)}" placeholder="Titolo, es. Orari" data-c="infoCampo" data-id="${b.id}" data-k="titolo" maxlength="60" style="font-weight:700">
        ${frecce('info', i, L.info.blocchi.length, b.id)}</div>
      <textarea class="input" id="ib-x-${b.id}" placeholder="Testo" data-c="infoCampo" data-id="${b.id}" data-k="testo" maxlength="2000">${esc(b.testo)}</textarea>
    </div>`).join('') + `<button class="btn btn-sm" data-a="aggInfo" style="justify-self:start">${icon('plus')}Aggiungi blocco</button>`;

  const menu = L.menu.sezioni.map((s, i) => `<div class="edit-block">
      <div class="row"><input class="input" id="ms-n-${s.id}" value="${esc(s.nome)}" placeholder="Sezione, es. Bevande" data-c="menuSez" data-id="${s.id}" maxlength="40" style="font-weight:700">${frecce('menu', i, L.menu.sezioni.length, s.id)}</div>
      <ul class="menu-voci">${s.voci.map(v => `<li>
        <input class="input" id="mv-n-${v.id}" value="${esc(v.nome)}" placeholder="Voce" data-c="menuVoce" data-sez="${s.id}" data-id="${v.id}" data-k="nome" maxlength="60" aria-label="Nome voce">
        <input class="input" id="mv-d-${v.id}" value="${esc(v.desc)}" placeholder="Descrizione (facoltativa)" data-c="menuVoce" data-sez="${s.id}" data-id="${v.id}" data-k="desc" maxlength="80" aria-label="Descrizione">
        <input class="input input-price" id="mv-p-${v.id}" value="${esc(v.prezzo)}" placeholder="€ 0,00" data-c="menuVoce" data-sez="${s.id}" data-id="${v.id}" data-k="prezzo" maxlength="12" aria-label="Prezzo">
        <button class="btn btn-ghost btn-icon btn-sm" data-a="togliVoce" data-sez="${s.id}" data-id="${v.id}" aria-label="Rimuovi voce">${icon('x')}</button>
      </li>`).join('')}</ul>
      <button class="btn btn-sm btn-ghost" data-a="aggVoce" data-id="${s.id}" style="justify-self:start">${icon('plus')}Aggiungi voce</button>
    </div>`).join('') + `<button class="btn btn-sm" data-a="aggSezMenu" style="justify-self:start">${icon('plus')}Aggiungi sezione</button>
    <label class="field"><span>Nota</span><input class="input" id="menu-note" value="${esc(L.menu.note)}" placeholder="Es. Si paga alla cassa vicino all'ingresso" data-c="menuNota" maxlength="160"></label>`;

  const sponsor = L.sponsor.gruppi.map((g, i) => `<div class="edit-block">
      <div class="row"><input class="input" id="sg-n-${g.id}" value="${esc(g.nome)}" placeholder="Gruppo, es. Main sponsor" data-c="spGruppo" data-id="${g.id}" maxlength="40" style="font-weight:700">${frecce('sponsor', i, L.sponsor.gruppi.length, g.id)}</div>
      <ul class="sp-items">${g.items.map(it => {
        const src = it.img === 'media' ? S.media['sp_' + it.id] : safeImg(it.img);
        return `<li>
          <button class="sp-thumb" data-a="spImg" data-g="${g.id}" data-id="${it.id}" aria-label="${src ? 'Cambia' : 'Carica'} immagine">${src ? `<img src="${esc(src)}" alt="">` : icon('image')}</button>
          <div class="stack" style="gap:6px;flex:1;min-width:0">
            <input class="input" id="sp-n-${it.id}" value="${esc(it.nome)}" placeholder="Nome sponsor" data-c="spItem" data-g="${g.id}" data-id="${it.id}" data-k="nome" maxlength="60">
            <input class="input" id="sp-f-${it.id}" value="${esc(it.frase)}" placeholder="Frase o sito (facoltativa)" data-c="spItem" data-g="${g.id}" data-id="${it.id}" data-k="frase" maxlength="100">
          </div>
          <select class="input" style="width:auto" data-c="spItem" data-g="${g.id}" data-id="${it.id}" data-k="size" aria-label="Dimensione">${[['grande', 'Grande'], ['medio', 'Medio'], ['piccolo', 'Piccolo']].map(([v, l]) => `<option value="${v}" ${it.size === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button class="btn btn-ghost btn-icon btn-sm" data-a="togliSp" data-g="${g.id}" data-id="${it.id}" aria-label="Rimuovi sponsor">${icon('x')}</button>
        </li>`;
      }).join('')}</ul>
      <button class="btn btn-sm btn-ghost" data-a="aggSp" data-id="${g.id}" style="justify-self:start">${icon('plus')}Aggiungi sponsor</button>
    </div>`).join('') + `<button class="btn btn-sm" data-a="aggGruppoSp" style="justify-self:start">${icon('plus')}Aggiungi gruppo</button>`;

  return `<div class="page-head"><div><h1>Pagina pubblica</h1><p class="muted" style="margin-top:6px">Classifiche, partite e tabelloni si aggiornano da soli. Qui scegli cosa aggiungere.</p></div>
      <div class="row-wrap"><button class="btn" data-a="condividiLive">${icon('share')}Condividi</button><a class="btn btn-primary" href="${esc(url)}" target="_blank" rel="noopener">${icon('external')}Apri</a></div></div>
    <section class="panel"><div class="panel-body row-wrap">
      <span class="sec-ic">${icon('tv')}</span><div style="flex:1;min-width:200px"><strong>Schermo del palazzetto</strong><p class="muted small">Su un televisore o un proiettore le classifiche scorrono da sole, a tutto schermo.</p></div>
      <a class="btn" href="${esc(link('live.html', { t: S.tid, schermo: 1 }))}" target="_blank" rel="noopener">${icon('tv')}Avvia presentazione</a>
    </div></section>
    ${sezione('info', 'info', 'Informazioni', 'Orari, indirizzo, parcheggio, regolamento.', L.info.attivo, info)}
    ${sezione('menu', 'utensils', 'Menu del bar', 'Cosa si mangia e quanto costa.', L.menu.attivo, menu)}
    ${sezione('sponsor', 'handshake', 'Sponsor', 'Loghi e ringraziamenti, raggruppati come preferisci.', L.sponsor.attivo, sponsor)}`;
}

function frecce(tipo, i, n, id) {
  return `<button class="btn btn-ghost btn-icon btn-sm" data-a="sposta" data-tipo="${tipo}" data-id="${id}" data-d="-1" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
    <button class="btn btn-ghost btn-icon btn-sm" data-a="sposta" data-tipo="${tipo}" data-id="${id}" data-d="1" aria-label="Sposta giù" ${i === n - 1 ? 'disabled' : ''}>${icon('down')}</button>
    <button class="btn btn-ghost btn-icon btn-sm" data-a="togli" data-tipo="${tipo}" data-id="${id}" aria-label="Elimina">${icon('trash')}</button>`;
}

const lista = (L, tipo) => tipo === 'info' ? L.info.blocchi : tipo === 'menu' ? L.menu.sezioni : L.sponsor.gruppi;
const sez = id => S.torneo.live.menu.sezioni.find(s => s.id === id);
const gruppo = id => S.torneo.live.sponsor.gruppi.find(g => g.id === id);
const focus = id => requestAnimationFrame(() => document.getElementById(id)?.focus());

registra({
  liveOn(el) { modifica(t => { t.live[el.dataset.k].attivo = el.checked; }); },
  sposta(el) {
    modifica(t => {
      const arr = lista(t.live, el.dataset.tipo), i = arr.findIndex(x => x.id === el.dataset.id), j = i + +el.dataset.d;
      if (i >= 0 && j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]];
    });
  },
  async togli(el) {
    const arr = lista(S.torneo.live, el.dataset.tipo), x = arr.find(k => k.id === el.dataset.id);
    const pieno = el.dataset.tipo === 'info' ? x.titolo || x.testo : el.dataset.tipo === 'menu' ? x.voci.length : x.items.length;
    if (pieno && !await conferma('Il contenuto di questo blocco verrà eliminato.', { titolo: 'Eliminare?', ok: 'Elimina', pericolo: true })) return;
    if (el.dataset.tipo === 'sponsor') for (const it of x.items) if (it.img === 'media') S.store.delMedia(S.tid, 'sp_' + it.id);
    modifica(t => { const a = lista(t.live, el.dataset.tipo); a.splice(a.findIndex(k => k.id === el.dataset.id), 1); });
  },
  aggInfo() { const id = uid(); modifica(t => { t.live.info.blocchi.push({ id, titolo: '', testo: '' }); }); focus('ib-t-' + id); },
  infoCampo(el) { modifica(t => { const b = t.live.info.blocchi.find(x => x.id === el.dataset.id); if (b) b[el.dataset.k] = el.value.trim(); }, { ridisegna: false }); },
  aggSezMenu() { const id = uid(); modifica(t => { t.live.menu.sezioni.push({ id, nome: '', voci: [] }); }); focus('ms-n-' + id); },
  menuSez(el) { modifica(() => { const s = sez(el.dataset.id); if (s) s.nome = el.value.trim(); }, { ridisegna: false }); },
  aggVoce(el) { const id = uid(); modifica(() => { sez(el.dataset.id).voci.push({ id, nome: '', desc: '', prezzo: '' }); }); focus('mv-n-' + id); },
  togliVoce(el) { modifica(() => { const s = sez(el.dataset.sez); s.voci = s.voci.filter(v => v.id !== el.dataset.id); }); },
  menuVoce(el) {
    let v = el.value.trim();
    if (el.dataset.k === 'prezzo') { v = normalizzaPrezzo(v); el.value = v; }
    modifica(() => { const x = sez(el.dataset.sez)?.voci.find(k => k.id === el.dataset.id); if (x) x[el.dataset.k] = v; }, { ridisegna: false });
  },
  menuNota(el) { modifica(t => { t.live.menu.note = el.value.trim(); }, { ridisegna: false }); },
  aggGruppoSp() { const id = uid(); modifica(t => { t.live.sponsor.gruppi.push({ id, nome: '', items: [] }); }); focus('sg-n-' + id); },
  spGruppo(el) { modifica(() => { const g = gruppo(el.dataset.id); if (g) g.nome = el.value.trim(); }, { ridisegna: false }); },
  aggSp(el) { const id = uid(); modifica(() => { gruppo(el.dataset.id).items.push({ id, nome: '', frase: '', img: '', size: 'medio' }); }); focus('sp-n-' + id); },
  async togliSp(el) {
    const it = gruppo(el.dataset.g)?.items.find(x => x.id === el.dataset.id);
    if (!it) return;
    if (it.img === 'media') await S.store.delMedia(S.tid, 'sp_' + it.id);
    modifica(() => { const g = gruppo(el.dataset.g); g.items = g.items.filter(x => x.id !== el.dataset.id); });
  },
  spItem(el) { modifica(() => { const x = gruppo(el.dataset.g)?.items.find(k => k.id === el.dataset.id); if (x) x[el.dataset.k] = el.value.trim(); }, { ridisegna: el.dataset.k === 'size' }); },
  async spImg(el) {
    const f = await scegliFile();
    if (!f) return;
    let data;
    try { data = await comprimiImmagine(f, 480, 0.8); } catch (e) { toast(e.message, 'err'); return; }
    await S.store.setMedia(S.tid, 'sp_' + el.dataset.id, data);
    S.media = { ...S.media, ['sp_' + el.dataset.id]: data };
    modifica(() => { const x = gruppo(el.dataset.g)?.items.find(k => k.id === el.dataset.id); if (x) x.img = 'media'; });
  },
});

