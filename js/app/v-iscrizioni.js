// Iscrizioni online: configurazione del modulo e richieste ricevute
import { esc, catIcona, catNome, intOr, clamp, safeImg } from '../core.js';
import { link } from '../config.js';
import { icon, toast, conferma, condividiLink, logoHtml, copia } from '../ui.js';
import { S, registra, modifica } from './stato.js';
import { finestraSocieta } from './v-societa.js';
import { vuoto } from './comp.js';

const pulisci = (s, n = 120) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);

export function vistaIscrizioni() {
  const t = S.torneo, isc = t.iscrizioni;
  const url = link('iscrizione.html', { t: S.tid });
  const attesa = S.iscrizioni.filter(i => i.stato === 'attesa').sort((a, b) => (a.inviatoAt || 0) - (b.inviatoAt || 0));
  const storico = S.iscrizioni.filter(i => i.stato !== 'attesa').sort((a, b) => (b.inviatoAt || 0) - (a.inviatoAt || 0));

  const richiesta = i => `<li class="panel req">
      <div class="req-head">${logoHtml(safeImg(i.logo), i.nomeSoc, true)}<div style="flex:1;min-width:0"><strong>${esc(i.nomeSoc)}</strong>
        <div class="muted small">Inviata ${i.inviatoAt ? new Date(i.inviatoAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</div></div>
        ${i.stato === 'approvata' ? '<span class="chip chip-ok">Approvata</span>' : i.stato === 'rifiutata' ? '<span class="chip">Rifiutata</span>' : '<span class="chip chip-warn">Da valutare</span>'}</div>
      <div class="req-body">
        <div class="row-wrap small">${icon('users')}<span>${esc(i.referente)}</span>${i.tel ? `<a href="tel:${esc(String(i.tel).replace(/[^\d+]/g, ''))}">${icon('phone')}${esc(i.tel)}</a>` : ''}${i.email ? `<a href="mailto:${esc(i.email)}">${icon('mail')}${esc(i.email)}</a>` : ''}</div>
        <div class="row-wrap" style="gap:6px">${t.categorie.map(c => intOr(i.squadre?.[c.id]) ? `<span class="chip">${catIcona(c)}<span>${esc(catNome(c))}: <b class="num">${intOr(i.squadre[c.id])}</b> ${intOr(i.squadre[c.id]) === 1 ? 'squadra' : 'squadre'}${intOr(i.atleti?.[c.id]) ? `, ${intOr(i.atleti[c.id])} atleti` : ''}</span></span>` : '').join('')}</div>
        ${i.note ? `<p class="small note">${esc(i.note)}</p>` : ''}
      </div>
      ${i.stato === 'attesa' ? `<div class="req-actions"><button class="btn btn-sm btn-ghost" data-a="rifiutaIsc" data-id="${esc(i.id)}">Rifiuta</button><button class="btn btn-sm btn-primary" data-a="approvaIsc" data-id="${esc(i.id)}">${icon('check')}Controlla e approva</button></div>`
        : `<div class="req-actions"><button class="btn btn-sm btn-ghost" data-a="eliminaIsc" data-id="${esc(i.id)}">${icon('trash')}Elimina</button></div>`}
    </li>`;

  return `<div class="page-head"><h1>Iscrizioni online</h1></div>
    <section class="panel">
      <div class="panel-body row-wrap" style="gap:16px">
        <label class="switch"><input type="checkbox" ${isc.aperte ? 'checked' : ''} ${t.archiviato ? 'disabled' : ''} data-c="iscAperte"><span class="track"></span><strong>${isc.aperte ? 'Modulo aperto' : 'Modulo chiuso'}</strong></label>
        <span class="muted small" style="flex:1;min-width:200px">${isc.aperte ? 'Le società possono iscriversi dal link qui sotto. Ogni richiesta arriva qui da approvare.' : 'Aprilo per ricevere le iscrizioni delle società tramite un link.'}</span>
      </div>
      ${isc.aperte ? `<div class="panel-body" style="padding-top:0"><div class="link-box"><code>${esc(url)}</code><button class="btn btn-sm" data-a="copiaIsc">${icon('copy')}Copia</button><button class="btn btn-sm btn-primary" data-a="condividiIsc">${icon('share')}Condividi</button></div></div>` : ''}
    </section>

    <section class="panel"><div class="panel-head"><h2>Richieste da valutare</h2>${attesa.length ? `<span class="chip chip-warn">${attesa.length}</span>` : ''}</div>
      ${attesa.length ? `<ul class="req-list">${attesa.map(richiesta).join('')}</ul>` : vuoto({ icona: 'form', titolo: 'Nessuna richiesta in attesa', testo: isc.aperte ? 'Appena una società invia il modulo la trovi qui.' : 'Apri il modulo e condividi il link con le società.' })}
    </section>

    <details class="panel collapsible"><summary class="panel-head"><h2>Personalizza il modulo</h2>${icon('down')}</summary>
      <div class="panel-body stack-lg">
        <label class="field"><span>Scadenza iscrizioni</span><input class="input" id="isc-scad" value="${esc(isc.scadenza)}" placeholder="Es. entro domenica 10 maggio" data-c="iscCampo" data-k="scadenza" maxlength="80"></label>
        <div><span class="label">Informazioni per categoria</span>
          <div class="tbl-scroll"><table class="tbl cat-info-table"><thead><tr><th class="l">Categoria</th><th class="l">Formula</th><th class="l">Anni di nascita</th><th>Min. atleti per squadra</th></tr></thead><tbody>
          ${t.categorie.map(c => { const ci = isc.catInfo[c.id] || {}; return `<tr><td class="l"><span class="cat-tag">${catIcona(c)}${esc(catNome(c))}</span></td>
            <td class="l"><input class="input" id="ci-f-${c.id}" value="${esc(ci.formato || '')}" placeholder="Es. 3 contro 3" data-c="iscCat" data-id="${c.id}" data-k="formato" maxlength="40"></td>
            <td class="l"><input class="input" id="ci-a-${c.id}" value="${esc(ci.anni || '')}" placeholder="Es. 2016 e 2017" data-c="iscCat" data-id="${c.id}" data-k="anni" maxlength="40"></td>
            <td><input class="input input-num" id="ci-m-${c.id}" type="number" min="0" max="20" value="${ci.minAtleti || ''}" placeholder="—" data-c="iscCat" data-id="${c.id}" data-k="minAtleti" style="width:80px;margin-left:auto"></td></tr>`; }).join('')}
          </tbody></table></div></div>
        <label class="field"><span>Indicazioni sulle squadre</span><textarea class="input" id="isc-sq" data-c="iscCampo" data-k="testoSquadre" placeholder="Es. Ogni squadra deve avere almeno 3 atleti. Portate un pallone per squadra." maxlength="1500">${esc(isc.testoSquadre)}</textarea></label>
        <label class="field"><span>Testo da accettare</span><textarea class="input" id="isc-reg" data-c="iscCampo" data-k="testoRegolamento" maxlength="1500">${esc(isc.testoRegolamento)}</textarea><span class="hint">La società deve spuntarlo per inviare il modulo.</span></label>
        <label class="field"><span>Avvertenze</span><textarea class="input" id="isc-disc" data-c="iscCampo" data-k="disclaimer" placeholder="Es. responsabilità, assicurazione, liberatoria foto" maxlength="3000">${esc(isc.disclaimer)}</textarea></label>
      </div>
    </details>

    ${storico.length ? `<details class="panel collapsible"><summary class="panel-head"><h2>Già valutate</h2><span class="muted small">${storico.length}</span>${icon('down')}</summary><ul class="req-list">${storico.map(richiesta).join('')}</ul></details>` : ''}`;
}

function iscrizione(id) { return S.iscrizioni.find(i => i.id === id); }

registra({
  iscAperte(el) { modifica(t => { t.iscrizioni.aperte = el.checked; }); toast(el.checked ? 'Iscrizioni aperte' : 'Iscrizioni chiuse'); },
  iscCampo(el) { modifica(t => { t.iscrizioni[el.dataset.k] = el.value.trim(); }, { ridisegna: false }); },
  iscCat(el) {
    modifica(t => {
      const ci = t.iscrizioni.catInfo[el.dataset.id] ||= {};
      ci[el.dataset.k] = el.dataset.k === 'minAtleti' ? clamp(intOr(el.value), 0, 20) : el.value.trim();
    }, { ridisegna: false });
  },
  copiaIsc() { copia(link('iscrizione.html', { t: S.tid })); },
  condividiIsc() {
    condividiLink({ titolo: 'Link per le iscrizioni', descrizione: 'Invialo ai referenti delle società: compilano il modulo dal telefono e tu approvi qui.', url: link('iscrizione.html', { t: S.tid }), messaggio: `Iscrizioni aperte per ${S.torneo.nome}. Compila il modulo qui:` });
  },
  async approvaIsc(el) {
    const i = iscrizione(el.dataset.id);
    if (!i) return;
    const squadre = {}, atleti = {};
    for (const c of S.torneo.categorie) { squadre[c.id] = clamp(intOr(i.squadre?.[c.id]), 0, 50); atleti[c.id] = clamp(intOr(i.atleti?.[c.id]), 0, 999); }
    const id = await finestraSocieta(null, {
      nome: pulisci(i.nomeSoc, 60), squadre, atleti, logoData: safeImg(i.logo),
      contatti: [{ nome: pulisci(i.referente, 60), tel: pulisci(i.tel, 30), email: pulisci(i.email, 80) }],
    });
    if (!id) return;
    await S.store.aggiornaIscrizione(S.tid, i.id, { stato: 'approvata', socId: id });
  },
  async rifiutaIsc(el) {
    const i = iscrizione(el.dataset.id);
    if (!i || !await conferma(`La richiesta di “${esc(i.nomeSoc)}” verrà segnata come rifiutata. Ricordati di avvisare il referente.`, { titolo: 'Rifiutare l\'iscrizione?', ok: 'Rifiuta', pericolo: true })) return;
    await S.store.aggiornaIscrizione(S.tid, i.id, { stato: 'rifiutata' });
    toast('Iscrizione rifiutata');
  },
  async eliminaIsc(el) {
    const i = iscrizione(el.dataset.id);
    if (!i || !await conferma(`La richiesta di “${esc(i.nomeSoc)}” verrà cancellata. La società, se approvata, resta nel torneo.`, { titolo: 'Eliminare la richiesta?', ok: 'Elimina', pericolo: true })) return;
    await S.store.eliminaIscrizione(S.tid, i.id);
  },
});

