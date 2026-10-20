// Presenze all'arrivo: prima dei gironi si conta chi è arrivato, dopo si tolgono gli assenti dai gironi
import { esc, catIcona, plurale, intOr, clamp, isFinita, rigeneraPartite } from '../core.js';
import { icon, toast, conferma, logoHtml } from '../ui.js';
import { S, registra, modifica, cat, logoSoc, hashTorneo } from './stato.js';
import { vuoto } from './comp.js';

const iscritte = (s, c) => clamp(intOr(s.squadre?.[c.id]), 0, 50);
const faseGironi = c => c.fasi.find(f => f.tipo !== 'elim');
const haGiocato = (g, id) => g.partite.some(p => (p.h === id || p.a === id) && isFinita(S.risultati[p.id]));

export function vistaPresenze() {
  const t = S.torneo;
  if (!t.societa.length && !t.categorie.some(c => c.fasi.length)) {
    return `<div class="page-head"><h1>Presenze</h1></div><section class="panel">${vuoto({ icona: 'users', titolo: 'Nessuna squadra da segnare', testo: 'Quando avrai aggiunto le società, qui segni le squadre man mano che arrivano in palestra.', azioni: `<a class="btn btn-primary" href="${hashTorneo('societa')}">${icon('users')}Vai alle società</a>` })}</section>`;
  }
  return `<div class="page-head"><div><h1>Presenze</h1><p class="muted">Segna le squadre man mano che arrivano. I gironi si creano solo con le squadre presenti.</p></div></div>
    <div class="pres-list">${t.categorie.map(c => faseGironi(c) ? presenzeGironi(c) : presenzeSocieta(c)).join('')}</div>`;
}

// Prima dei gironi: quante squadre di ogni società sono arrivate
function presenzeSocieta(c) {
  const t = S.torneo;
  const pr = t.presenze[c.id] || {};
  const soc = t.societa.filter(s => iscritte(s, c) > 0).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  if (!soc.length) return '';
  const tot = soc.reduce((n, s) => n + iscritte(s, c), 0);
  const presenti = soc.reduce((n, s) => n + (s.id in pr ? Math.min(intOr(pr[s.id]), iscritte(s, c)) : 0), 0);
  const daSegnare = soc.filter(s => !(s.id in pr)).length;
  const riga = s => {
    const n = iscritte(s, c), segnata = s.id in pr, v = Math.min(intOr(pr[s.id]), n);
    let ctrl;
    if (!segnata) ctrl = `<button class="btn btn-sm btn-ghost" data-a="prSoc" data-cat="${c.id}" data-id="${s.id}" data-n="0">Assente</button>
      <button class="btn btn-sm btn-primary" data-a="prSoc" data-cat="${c.id}" data-id="${s.id}" data-n="${n}">${icon('check')}${n > 1 ? `Arrivate (${n})` : 'Arrivata'}</button>`;
    else if (n > 1) ctrl = `<span class="pres-count"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-a="prSoc" data-cat="${c.id}" data-id="${s.id}" data-n="${v - 1}" aria-label="Una squadra in meno" ${v === 0 ? 'disabled' : ''}>−</button>
        <span class="num"><b>${v}</b> di ${n}</span>
        <button type="button" class="btn btn-sm btn-ghost btn-icon" data-a="prSoc" data-cat="${c.id}" data-id="${s.id}" data-n="${v + 1}" aria-label="Una squadra in più" ${v === n ? 'disabled' : ''}>+</button></span>`;
    else ctrl = v ? '<span class="chip chip-ok">Presente</span>' : '<span class="chip">Assente</span>';
    return `<li class="${segnata ? (v ? 'is-ok' : 'is-no') : ''}">
      ${logoHtml(logoSoc(s.id), s.nome)}
      <div class="pres-main"><strong>${esc(s.nome)}</strong><span class="muted small">${plurale(n, 'squadra iscritta', 'squadre iscritte')}</span></div>
      <div class="pres-ctrl">${ctrl}${segnata ? `<button class="btn btn-sm btn-ghost btn-icon" data-a="prSoc" data-cat="${c.id}" data-id="${s.id}" data-n="" aria-label="Annulla: da segnare" title="Torna da segnare">${icon('reset')}</button>` : ''}</div>
    </li>`;
  };
  return `<section class="panel pres">
    <div class="panel-head">${catIcona(c, 'lg')}<h2>${esc(c.nome)}</h2><span class="spacer"></span><span class="chip ${presenti === tot ? 'chip-ok' : ''}"><b class="num">${presenti}</b>&nbsp;di ${tot} presenti</span></div>
    <ul class="pres-rows">${soc.map(riga).join('')}</ul>
    <div class="panel-foot">
      ${daSegnare ? `<span class="muted small">${plurale(daSegnare, 'società da segnare', 'società da segnare')}</span>` : `<span class="muted small">${icon('check')} Tutte segnate</span>`}
      <span class="spacer"></span>
      ${daSegnare ? `<button class="btn btn-sm" data-a="prTutte" data-cat="${c.id}">Segna tutte arrivate</button>` : ''}
      <a class="btn btn-sm ${daSegnare ? 'btn-ghost' : 'btn-accent'}" href="${hashTorneo('c/' + c.id)}">${icon('grid')}Crea i gironi</a>
    </div>
  </section>`;
}

// Gironi già creati: si segnano gli assenti e si tolgono in un clic
function presenzeGironi(c) {
  const t = S.torneo, f = faseGironi(c);
  const squadre = f.gironi.flatMap(g => g.squadre.map(s => ({ g, s })));
  const assenti = squadre.filter(x => t.assenti[x.s.id]);
  const togliibili = assenti.filter(x => !haGiocato(x.g, x.s.id)), giocato = assenti.filter(x => haGiocato(x.g, x.s.id));
  return `<section class="panel pres">
    <div class="panel-head">${catIcona(c, 'lg')}<h2>${esc(c.nome)}</h2><span class="spacer"></span><span class="chip ${assenti.length ? 'chip-warn' : 'chip-ok'}"><b class="num">${squadre.length - assenti.length}</b>&nbsp;di ${squadre.length} presenti</span></div>
    <div class="pres-gironi">${f.gironi.map(g => `<div><h3>Girone ${esc(g.nome)}</h3><ul class="pres-rows">${g.squadre.map(s => {
      const ass = !!t.assenti[s.id];
      return `<li class="${ass ? 'is-no' : ''}">${logoHtml(logoSoc(s.socId), S.torneo.societa.find(x => x.id === s.socId)?.nome || s.nome)}
        <div class="pres-main"><strong>${esc(s.nome)}</strong>${s.socId ? `<span class="muted small">${esc(S.torneo.societa.find(x => x.id === s.socId)?.nome || '')}</span>` : ''}</div>
        <label class="switch"><input type="checkbox" ${ass ? '' : 'checked'} data-c="prSquadra" data-id="${s.id}"><span class="track"></span><span class="sr-only">Presente</span></label></li>`;
    }).join('')}</ul></div>`).join('')}</div>
    ${togliibili.length ? `<div class="panel-foot pres-alert">${icon('info')}<span>${plurale(togliibili.length, 'squadra assente', 'squadre assenti')}: ${togliibili.map(x => esc(x.s.nome)).join(', ')}. Toglile dai gironi per aggiornare il calendario.</span>
      <button class="btn btn-sm btn-primary" data-a="prTogli" data-cat="${c.id}">Togli dai gironi</button></div>` : ''}
    ${giocato.length ? `<div class="panel-foot pres-alert pres-info">${icon('info')}<span>${giocato.map(x => esc(x.s.nome)).join(', ')} ${giocato.length === 1 ? 'ha' : 'hanno'} già giocato: ${giocato.length === 1 ? 'resta' : 'restano'} nel girone con i risultati fatti. Se non torna, puoi toglierla da «Modifica girone» nella categoria (i suoi risultati verranno cancellati).</span></div>` : ''}
  </section>`;
}

registra({
  prSoc(el) {
    const c = cat(el.dataset.cat);
    modifica(t => {
      const pr = t.presenze[c.id] ||= {};
      if (el.dataset.n === '') delete pr[el.dataset.id]; else pr[el.dataset.id] = Math.max(0, intOr(el.dataset.n));
      if (!Object.keys(pr).length) delete t.presenze[c.id];
    });
  },
  prTutte(el) {
    const c = cat(el.dataset.cat);
    modifica(t => {
      const pr = t.presenze[c.id] ||= {};
      for (const s of t.societa) if (iscritte(s, c) > 0 && !(s.id in pr)) pr[s.id] = iscritte(s, c);
    });
    toast('Tutte le squadre segnate come arrivate');
  },
  prSquadra(el) { modifica(t => { if (el.checked) delete t.assenti[el.dataset.id]; else t.assenti[el.dataset.id] = true; }); },
  async prTogli(el) {
    const c = cat(el.dataset.cat), f = faseGironi(c), t = S.torneo;
    const via = [], bloccate = [];
    for (const g of f.gironi) for (const s of g.squadre) if (t.assenti[s.id]) (haGiocato(g, s.id) ? bloccate : via).push({ g, s });
    if (!via.length) { toast('Le squadre assenti hanno già giocato: modificale dal girone.', 'err'); return; }
    const corto = f.gironi.find(g => g.squadre.length - via.filter(x => x.g === g).length < 2);
    if (corto) { toast(`Nel girone ${corto.nome} resterebbe meno di 2 squadre: sposta qualcuno con «Modifica girone».`, 'err'); return; }
    if (!await conferma(`${via.map(x => `${esc(x.s.nome)} (girone ${esc(x.g.nome)})`).join(', ')} ${via.length === 1 ? 'verrà tolta' : 'verranno tolte'} e il calendario si aggiornerà. Le partite già giocate restano.${bloccate.length ? ` ${bloccate.map(x => esc(x.s.nome)).join(', ')} ${bloccate.length === 1 ? 'ha' : 'hanno'} già giocato e resta nel girone.` : ''}`, { titolo: `Togliere ${plurale(via.length, 'squadra', 'squadre')}?`, ok: 'Togli dai gironi' })) return;
    const daCancellare = [];
    modifica(tt => {
      for (const g of new Set(via.map(x => x.g))) {
        const ids = new Set(via.filter(x => x.g === g).map(x => x.s.id));
        const prima = g.partite;
        g.squadre = g.squadre.filter(s => !ids.has(s.id));
        g.partite = rigeneraPartite(g);
        const ora = new Set(g.partite.map(p => p.id));
        prima.forEach(p => { if (!ora.has(p.id) && S.risultati[p.id]) daCancellare.push(p.id); });
      }
      via.forEach(x => delete tt.assenti[x.s.id]);
    });
    if (daCancellare.length) await S.store.delRisultati(S.tid, daCancellare);
    toast(`${plurale(via.length, 'squadra tolta', 'squadre tolte')} dai gironi`);
  },
});
