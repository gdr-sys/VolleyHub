// Società partecipanti
import { esc, catIcona, uid, plurale, intOr, clamp, squadreTotali } from '../core.js';
import { icon, toast, conferma, modal, comprimiImmagine, scegliFile, logoHtml } from '../ui.js';
import { S, registra, modifica, societa, logoSoc, hashTorneo } from './stato.js';
import { vuoto } from './comp.js';

export function vistaSocieta() {
  const t = S.torneo;
  const cats = t.categorie;
  const contatti = S.privato?.contatti || {};
  const ordinate = [...t.societa].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const totAtleti = c => t.societa.reduce((s, x) => s + intOr(x.atleti?.[c.id]), 0);

  return `<div class="page-head"><h1>Società</h1>
      <div class="row-wrap"><a class="btn" href="${hashTorneo('iscrizioni')}">${icon('form')}Iscrizioni online</a><button class="btn btn-accent" data-a="nuovaSocieta">${icon('plus')}Aggiungi società</button></div></div>
    ${t.societa.length ? `<div class="totals">${cats.map(c => `<div style="--cat:${esc(c.colore)}"><span class="cat-tag small">${catIcona(c)}${esc(c.nome)}</span><b class="num">${squadreTotali(t, c.id)}</b><span class="muted small">squadre${totAtleti(c) ? `, ${totAtleti(c)} atleti` : ''}</span></div>`).join('')}</div>` : ''}
    ${!t.societa.length ? `<section class="panel">${vuoto({ icona: 'users', titolo: 'Nessuna società ancora', testo: 'Aggiungile a mano oppure apri le iscrizioni online: le società compilano il modulo e tu approvi con un clic.', azioni: `<button class="btn btn-accent" data-a="nuovaSocieta">${icon('plus')}Aggiungi società</button><a class="btn" href="${hashTorneo('iscrizioni')}">${icon('form')}Apri le iscrizioni</a>` })}</section>`
    : `<ul class="soc-list">${ordinate.map(s => {
      const ref = contatti[s.id] || [];
      return `<li class="panel">
        ${logoHtml(logoSoc(s.id), s.nome, true)}
        <div class="soc-main">
          <strong>${esc(s.nome)}</strong>
          <div class="row-wrap" style="gap:6px;margin-top:6px">${cats.map(c => intOr(s.squadre?.[c.id]) ? `<span class="chip">${catIcona(c)}<span>${esc(c.nome)}: <b class="num">${intOr(s.squadre[c.id])}</b> ${intOr(s.squadre[c.id]) === 1 ? 'squadra' : 'squadre'}${intOr(s.atleti?.[c.id]) ? `, ${intOr(s.atleti[c.id])} atleti` : ''}</span></span>` : '').join('') || '<span class="muted small">Nessuna squadra indicata</span>'}</div>
          ${ref.length ? `<div class="soc-ref">${ref.map(r => `<span>${icon('users')}${esc(r.nome || 'Referente')}${r.tel ? ` <a href="tel:${esc(r.tel.replace(/[^\d+]/g, ''))}">${esc(r.tel)}</a>` : ''}${r.email ? ` <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}</span>`).join('')}</div>` : ''}
        </div>
        <div class="row"><button class="btn btn-sm" data-a="modificaSocieta" data-id="${s.id}">${icon('edit')}Modifica</button></div>
      </li>`;
    }).join('')}</ul>`}
    <p class="hint" style="margin-top:12px">I contatti dei referenti sono visibili solo a te: non compaiono nella pagina pubblica.</p>`;
}

export async function finestraSocieta(s, precompila = null) {
  const t = S.torneo, nuova = !s;
  const base = s || precompila || { nome: '', squadre: {}, atleti: {} };
  let logo = s ? logoSoc(s.id) : precompila?.logoData || '';
  const ref = (s ? S.privato?.contatti?.[s.id] : precompila?.contatti) || [];
  const rigaRef = r => `<li><input class="input" data-k="nome" placeholder="Nome e cognome" value="${esc(r.nome || '')}" aria-label="Nome referente" maxlength="60">
      <input class="input" data-k="tel" type="tel" placeholder="Telefono" value="${esc(r.tel || '')}" aria-label="Telefono" maxlength="30">
      <input class="input" data-k="email" type="email" placeholder="Email" value="${esc(r.email || '')}" aria-label="Email" maxlength="80">
      <button type="button" class="btn btn-ghost btn-icon btn-sm" data-del aria-label="Rimuovi referente">${icon('trash')}</button></li>`;

  const ris = await modal({
    title: nuova ? 'Nuova società' : base.nome, wide: true,
    body: `<div class="soc-head-edit">
        <div id="ms-logo">${logoHtml(logo, base.nome, true)}</div>
        <label class="field" style="flex:1"><span>Nome della società</span><input class="input" id="ms-nome" value="${esc(base.nome)}" maxlength="60" autofocus></label>
      </div>
      <div class="row-wrap"><button type="button" class="btn btn-sm" id="ms-carica">${icon('image')}${logo ? 'Cambia logo' : 'Carica logo'}</button><button type="button" class="btn btn-sm btn-ghost" id="ms-togli" ${logo ? '' : 'hidden'}>Rimuovi logo</button><span class="hint">PNG o JPG, viene ridimensionato in automatico.</span></div>
      <div><span class="label">Squadre e atleti per categoria</span>
        <table class="tbl soc-cat-table"><thead><tr><th class="l">Categoria</th><th>Squadre</th><th>Atleti</th></tr></thead><tbody>
        ${t.categorie.map(c => `<tr><td class="l"><span class="cat-tag">${catIcona(c)}${esc(c.nome)}</span></td>
          <td><span class="stepper"><button type="button" data-step="-1" aria-label="Meno squadre">−</button><input type="number" min="0" max="50" data-sq="${c.id}" value="${intOr(base.squadre?.[c.id])}" aria-label="Squadre ${esc(c.nome)}"><button type="button" data-step="1" aria-label="Più squadre">+</button></span></td>
          <td><input class="input input-num" style="width:84px;margin-left:auto" type="number" min="0" max="999" data-at="${c.id}" value="${intOr(base.atleti?.[c.id]) || ''}" placeholder="0" aria-label="Atleti ${esc(c.nome)}"></td></tr>`).join('')}
        </tbody></table></div>
      <div><span class="label">Referenti</span><p class="hint">Visibili solo a te.</p>
        <ul class="ref-edit" id="ms-ref">${(ref.length ? ref : [{}]).map(rigaRef).join('')}</ul>
        <button type="button" class="btn btn-sm" id="ms-add-ref">${icon('plus')}Aggiungi referente</button></div>
      ${nuova ? '' : `<div class="danger-zone"><div><strong>Rimuovi società</strong><p class="muted small">Le sue squadre già nei gironi restano, senza società.</p></div><button type="button" class="btn btn-danger btn-sm" id="ms-del">${icon('trash')}Rimuovi</button></div>`}`,
    azioni: [{ label: 'Annulla', value: null }, { label: nuova ? 'Aggiungi' : 'Salva', cls: 'btn-primary', value: box => leggi(box) }],
    validate: box => {
      const nome = box.querySelector('#ms-nome').value.trim();
      if (!nome) { toast('Inserisci il nome della società.', 'err'); box.querySelector('#ms-nome').focus(); return 'x'; }
      if (t.societa.some(x => x !== s && x.nome.toLowerCase() === nome.toLowerCase())) { toast('Esiste già una società con questo nome.', 'err'); return 'x'; }
      const mailErr = [...box.querySelectorAll('#ms-ref [data-k=email]')].find(i => i.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim()));
      if (mailErr) { toast('Controlla l\'indirizzo email del referente.', 'err'); mailErr.focus(); return 'x'; }
      return null;
    },
    onMount: (box, close) => {
      const aggiornaLogo = () => {
        box.querySelector('#ms-logo').innerHTML = logoHtml(logo, box.querySelector('#ms-nome').value, true);
        box.querySelector('#ms-togli').hidden = !logo;
        box.querySelector('#ms-carica').lastChild.textContent = logo ? 'Cambia logo' : 'Carica logo';
      };
      box.querySelector('#ms-carica').onclick = async () => {
        const f = await scegliFile();
        if (!f) return;
        try { logo = await comprimiImmagine(f, 240); aggiornaLogo(); } catch (e) { toast(e.message, 'err'); }
      };
      box.querySelector('#ms-togli').onclick = () => { logo = ''; aggiornaLogo(); };
      box.addEventListener('click', e => {
        const st = e.target.closest('[data-step]');
        if (st) { const i = st.parentElement.querySelector('input'); i.value = clamp(intOr(i.value) + +st.dataset.step, 0, 50); }
        const d = e.target.closest('#ms-ref [data-del]');
        if (d) d.closest('li').remove();
      });
      box.querySelector('#ms-add-ref').onclick = () => { box.querySelector('#ms-ref').insertAdjacentHTML('beforeend', rigaRef({})); box.querySelector('#ms-ref li:last-child input').focus(); };
      box.querySelector('#ms-del')?.addEventListener('click', () => close('elimina'));
    },
  });
  function leggi(box) {
    const squadre = {}, atleti = {};
    box.querySelectorAll('[data-sq]').forEach(i => { squadre[i.dataset.sq] = clamp(intOr(i.value), 0, 50); });
    box.querySelectorAll('[data-at]').forEach(i => { atleti[i.dataset.at] = clamp(intOr(i.value), 0, 999); });
    const contatti = [...box.querySelectorAll('#ms-ref li')].map(li => ({ nome: li.querySelector('[data-k=nome]').value.trim(), tel: li.querySelector('[data-k=tel]').value.trim(), email: li.querySelector('[data-k=email]').value.trim() })).filter(r => r.nome || r.tel || r.email);
    return { nome: box.querySelector('#ms-nome').value.trim(), squadre, atleti, contatti };
  }
  if (!ris) return null;
  if (ris === 'elimina') { await eliminaSocieta(s); return null; }

  const id = s?.id || uid();
  modifica(tt => {
    if (nuova) tt.societa.push({ id, nome: ris.nome, squadre: ris.squadre, atleti: ris.atleti, logo: !!logo });
    else {
      const vecchio = s.nome;
      Object.assign(s, { nome: ris.nome, squadre: ris.squadre, atleti: ris.atleti, logo: !!logo });
      // Le squadre con nome uguale alla società (es. "Volley Riviera A") seguono il nuovo nome
      if (vecchio !== ris.nome) for (const c of tt.categorie) for (const f of c.fasi) for (const g of f.gironi || []) for (const q of g.squadre) {
        if (q.socId === id && q.nome.startsWith(vecchio)) q.nome = ris.nome + q.nome.slice(vecchio.length);
      }
    }
  });
  const attuale = S.media['soc_' + id] || '';
  if (logo !== attuale) {
    if (logo) await S.store.setMedia(S.tid, 'soc_' + id, logo); else await S.store.delMedia(S.tid, 'soc_' + id);
  }
  S.privato = { ...(S.privato || {}), contatti: { ...(S.privato?.contatti || {}), [id]: ris.contatti } };
  await S.store.patchPrivato(S.tid, { contatti: { [id]: ris.contatti } });
  toast(nuova ? 'Società aggiunta' : 'Società aggiornata');
  return id;
}

async function eliminaSocieta(s) {
  const inGioco = S.torneo.categorie.some(c => c.fasi.some(f => (f.gironi || []).some(g => g.squadre.some(q => q.socId === s.id))));
  const ok = await conferma(`“${esc(s.nome)}” verrà rimossa dal torneo.${inGioco ? ' Le sue squadre già inserite nei gironi restano, ma senza società.' : ''}`, { titolo: 'Rimuovere la società?', ok: 'Rimuovi', pericolo: true });
  if (!ok) return;
  modifica(t => {
    t.societa = t.societa.filter(x => x.id !== s.id);
    for (const c of t.categorie) for (const f of c.fasi) for (const g of f.gironi || []) for (const q of g.squadre) if (q.socId === s.id) q.socId = '';
  });
  if (S.media['soc_' + s.id]) await S.store.delMedia(S.tid, 'soc_' + s.id);
  await S.store.patchPrivato(S.tid, { contatti: { [s.id]: [] } });
  toast('Società rimossa');
}

registra({
  nuovaSocieta() { finestraSocieta(null); },
  modificaSocieta(el) { const s = societa(el.dataset.id); if (s) finestraSocieta(s); },
});
