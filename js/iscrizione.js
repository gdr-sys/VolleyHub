// Modulo pubblico di iscrizione delle società
import { getStore } from './store.js';
import { esc, catNome, normalizzaTorneo, formatData, intOr, clamp } from './core.js';
import { icon, applicaTema, comprimiImmagine, scegliFile, logoHtml, toast } from './ui.js';

applicaTema();
const TID = new URLSearchParams(location.search).get('t');
const app = document.getElementById('app');
let store, T = null, logo = '', inviata = false;

function messaggio(titolo, testo) {
  app.innerHTML = `<div class="live-error loading-screen" style="text-align:center;padding:24px"><img src="assets/logo-mark.svg" alt="" width="56" height="56"><h1>${esc(titolo)}</h1><p class="muted" style="max-width:44ch">${esc(testo)}</p></div>`;
}

async function avvio() {
  if (!TID) { messaggio('Link incompleto', 'Chiedi all\'organizzatore il link corretto per l\'iscrizione.'); return; }
  try { store = await getStore(); } catch { messaggio('Connessione assente', 'Controlla la connessione e ricarica la pagina.'); return; }
  store.watchTorneo(TID, d => {
    if (inviata) return;
    if (!d) { messaggio('Torneo non trovato', 'Il link potrebbe essere sbagliato o il torneo è stato eliminato.'); return; }
    const primo = !T;
    T = normalizzaTorneo(d);
    document.title = `Iscrizione: ${T.nome}`;
    if (!T.iscrizioni.aperte || T.archiviato) { messaggio('Iscrizioni chiuse', `Al momento non si accettano iscrizioni per ${T.nome}. Per informazioni contatta l'organizzazione.`); return; }
    if (primo || !document.getElementById('f-nome')) disegna();
  }, () => messaggio('Torneo non disponibile', 'Riprova più tardi.'));
  store.getMedia(TID).then(m => { LOGO = m.org || ''; const box = document.getElementById('is-org'); if (box && LOGO) box.innerHTML = `<img src="${esc(LOGO)}" alt="">`; }).catch(() => {});
}

let LOGO = '';
function disegna() {
  const isc = T.iscrizioni;
  app.innerHTML = `
  <header class="is-head"><div><div class="is-org" id="is-org">${LOGO ? `<img src="${esc(LOGO)}" alt="">` : ''}</div>
    <span class="brand-mini"><img src="assets/logo-mark.svg" alt="" width="20" height="20">Iscrizione al torneo</span>
    <h1>${esc(T.nome)}</h1>
    <p>${T.data ? `<span>${esc(formatData(T.data))}</span>` : ''}${T.luogo ? `<span>${esc(T.luogo)}</span>` : ''}</p>
    ${isc.scadenza ? `<p class="deadline">Iscrizioni ${esc(isc.scadenza)}</p>` : ''}
  </div></header>
  <form class="is-main" id="form" novalidate>
    <section class="panel"><div class="panel-head"><h2>Società</h2></div><div class="panel-body">
      <label class="field"><span>Nome della società</span><input class="input" id="f-nome" autocomplete="organization" maxlength="60" required></label>
      <div class="field"><span>Logo <span class="hint">(facoltativo)</span></span>
        <div class="logo-row"><span id="f-logo-prev">${logoHtml('', '?', true)}</span><button type="button" class="btn btn-sm" id="f-logo">${icon('image')}Carica il logo</button></div></div>
    </div></section>
    <section class="panel"><div class="panel-head"><h2>Referente</h2></div><div class="panel-body">
      <label class="field"><span>Nome e cognome</span><input class="input" id="f-ref" autocomplete="name" maxlength="60" required></label>
      <div class="grid-2">
        <label class="field"><span>Telefono</span><input class="input" id="f-tel" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" required></label>
        <label class="field"><span>Email</span><input class="input" id="f-mail" type="email" autocomplete="email" maxlength="80" required></label>
      </div>
      <p class="hint">I contatti li vede solo l'organizzazione.</p>
    </div></section>
    <section class="panel"><div class="panel-head"><h2>Squadre</h2></div><div class="panel-body">
      ${isc.testoSquadre ? `<p class="note pre">${esc(isc.testoSquadre)}</p>` : ''}
      <div>${T.categorie.map(c => {
        const ci = isc.catInfo[c.id] || {};
        const det = [ci.formato, ci.anni ? `nati nel ${ci.anni}` : '', ci.minAtleti ? `almeno ${ci.minAtleti} atleti per squadra` : ''].filter(Boolean).join(', ');
        return `<div class="is-cat">
          <div><span class="cat-tag"><i class="dot" style="background:${esc(c.colore)}"></i>${esc(catNome(c))}</span></div>
          ${det ? `<small>${esc(det)}</small>` : ''}
          <div class="cell c-sq"><span class="lbl">Squadre</span><span class="stepper"><button type="button" data-step="-1" data-for="sq-${c.id}" aria-label="Meno squadre ${esc(catNome(c))}">−</button><input id="sq-${c.id}" type="number" min="0" max="20" value="0" aria-label="Squadre ${esc(catNome(c))}"><button type="button" data-step="1" data-for="sq-${c.id}" aria-label="Più squadre ${esc(catNome(c))}">+</button></span></div>
          <div class="cell c-at"><span class="lbl">Atleti</span><input class="input input-num" id="at-${c.id}" type="number" min="0" max="999" placeholder="0" aria-label="Atleti ${esc(catNome(c))}"></div>
        </div>`;
      }).join('')}</div>
      <label class="field"><span>Note per l'organizzazione <span class="hint">(facoltative)</span></span><textarea class="input" id="f-note" maxlength="500" placeholder="Es. arriviamo alle 9:30, una squadra mista"></textarea></label>
    </div></section>
    <section class="panel"><div class="panel-body">
      ${isc.disclaimer ? `<p class="small muted pre">${esc(isc.disclaimer)}</p>` : ''}
      <label class="check"><input type="checkbox" id="f-ok" required><span>${esc(isc.testoRegolamento)}</span></label>
      <p class="err-text" id="f-err" role="alert" hidden></p>
      <button class="btn btn-accent btn-lg btn-block" type="submit" id="f-invia">${icon('check')}Invia l'iscrizione</button>
    </div></section>
  </form>
  <footer class="footer">Moduli e risultati con VolleyHub</footer>`;

  const f = document.getElementById('form');
  f.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const i = document.getElementById(b.dataset.for);
    i.value = clamp(intOr(i.value) + +b.dataset.step, 0, 20);
  });
  document.getElementById('f-logo').onclick = async () => {
    const file = await scegliFile();
    if (!file) return;
    try {
      logo = await comprimiImmagine(file, 200, 0.82);
      document.getElementById('f-logo-prev').innerHTML = logoHtml(logo, '', true);
      document.getElementById('f-logo').lastChild.textContent = 'Cambia logo';
    } catch (e) { toast(e.message, 'err'); }
  };
  f.addEventListener('submit', invia);
}

function errore(msg, campo) {
  const el = document.getElementById('f-err');
  el.textContent = msg;
  el.hidden = false;
  document.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
  if (campo) { const c = document.getElementById(campo); c.setAttribute('aria-invalid', 'true'); c.focus(); }
  else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function invia(e) {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  if (!v('f-nome')) return errore('Inserisci il nome della società.', 'f-nome');
  if (!v('f-ref')) return errore('Inserisci il nome del referente.', 'f-ref');
  if (v('f-tel').replace(/\D/g, '').length < 6) return errore('Inserisci un numero di telefono valido.', 'f-tel');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('f-mail'))) return errore('Inserisci un indirizzo email valido.', 'f-mail');
  const squadre = {}, atleti = {};
  let tot = 0;
  for (const c of T.categorie) {
    squadre[c.id] = clamp(intOr(v('sq-' + c.id)), 0, 20);
    atleti[c.id] = clamp(intOr(v('at-' + c.id)), 0, 999);
    tot += squadre[c.id];
    const min = intOr(T.iscrizioni.catInfo[c.id]?.minAtleti);
    if (min && squadre[c.id] && atleti[c.id] < squadre[c.id] * min) return errore(`${catNome(c)}: per ${squadre[c.id]} squadre servono almeno ${squadre[c.id] * min} atleti.`, 'at-' + c.id);
  }
  if (!tot) return errore('Indica almeno una squadra in una categoria.');
  if (!document.getElementById('f-ok').checked) return errore('Per inviare il modulo devi accettare il regolamento.', 'f-ok');

  const btn = document.getElementById('f-invia');
  btn.disabled = true;
  btn.lastChild.textContent = 'Invio in corso…';
  try {
    await store.inviaIscrizione(TID, {
      nomeSoc: v('f-nome'), referente: v('f-ref'), tel: v('f-tel'), email: v('f-mail'), note: v('f-note'),
      logo, squadre, atleti, accetta: true, stato: 'attesa', inviatoAt: Date.now(),
    });
    inviata = true;
    app.innerHTML = `<div class="ok-box"><div class="ic">${icon('check')}</div><h1>Iscrizione inviata</h1>
      <p class="muted" style="max-width:44ch"><strong>${esc(v('f-nome'))}</strong> è in attesa di conferma. L'organizzazione ti contatterà a ${esc(v('f-mail'))}.</p></div>`;
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.lastChild.textContent = 'Invia l\'iscrizione';
    errore(err.code === 'permission-denied' ? 'Le iscrizioni sono state chiuse o il modulo non è valido. Ricarica la pagina.' : 'Invio non riuscito. Controlla la connessione e riprova.');
  }
}

avvio();
