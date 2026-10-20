// Guida introduttiva: parte da sola la prima volta che si apre una sezione, si rivede dal menu account
const CHIAVE = 'vh_tour_';

const GUIDE = {
  home: [
    { titolo: 'Benvenuto in VolleyHub', testo: 'In un minuto ti mostro dove trovi le cose. Puoi saltare la guida e rivederla quando vuoi dal menu in alto a destra.' },
    { sel: '.page-head a[href="#/nuovo"], .welcome a[href="#/nuovo"]', titolo: 'Crea un torneo', testo: 'Tre passaggi: nome e data, categorie (White, Green e Red sono già pronte) e come si assegnano i punti in classifica.' },
    { sel: '[data-a="importa"]', titolo: 'Porta i tornei della vecchia app', testo: 'Esporta i tornei dalla vecchia app e importali qui: società, gironi e risultati vengono convertiti.' },
    { sel: '.t-list > li', titolo: 'I tuoi tornei', testo: 'Apri un torneo per gestirlo. Dal menu ⋯ puoi usarlo come modello per l\'anno dopo, scaricarne il backup o archiviarlo.' },
    { sel: '.account summary', titolo: 'Rivedi la guida', testo: 'Da qui riapri questa guida in qualsiasi momento.' },
  ],
  torneo: [
    { sel: '.sidenav', titolo: 'Il menu del torneo', testo: 'Ogni categoria ha i suoi gironi e la sua classifica. Il numero accanto indica quante partite sono già state giocate.' },
    { sel: '.sidenav a[href$="/societa"]', titolo: 'Società e squadre', testo: 'Inserisci le società con logo, squadre e numero di bambini per categoria. Da qui nascono i gironi.' },
    { sel: '.sidenav a[href$="/presenze"]', titolo: "Presenze all'arrivo", testo: 'Il giorno del torneo segna le squadre che arrivano: i gironi si creano solo con quelle presenti. Se manca qualcuno a gironi fatti, la togli in un clic.' },
    { sel: '.sidenav a[href$="/iscrizioni"]', titolo: 'Iscrizioni online', testo: 'Apri il modulo e manda il link ai referenti: compilano dal telefono e tu approvi le richieste qui.' },
    { sel: '.sidenav a[href$="/pubblica"]', titolo: 'Pagina per i genitori', testo: 'Classifiche e risultati in diretta, informazioni, menu del bar e sponsor. Si apre dal QR e si può proiettare su uno schermo in palestra.' },
    { sel: '.sidenav a[href$="/impostazioni"]', titolo: 'Impostazioni', testo: 'Punti in classifica, set per partita, logo dell\'organizzatore, stampa del programma di sala e backup.' },
    { sel: '#sync', titolo: 'Salvataggio automatico', testo: 'Ogni modifica si salva da sola. Se in palestra cade la rete continui a lavorare: i dati partono appena torna la connessione.' },
  ],
  categoria: [
    { sel: '.tabs-bar', titolo: 'Le sezioni della categoria', testo: 'Partite da segnare, classifiche, storico dei risultati, statistiche e regole di punteggio della categoria.' },
    { sel: '.girone-opz', titolo: 'Impostazioni del girone', testo: 'Andata e ritorno, numero di set e partite a tempo, girone per girone. Con «Tempo» attivo il segnapunti vede il cronometro.' },
    { sel: '.match:not(.is-done) .sb, .match .sb', titolo: 'Segna il risultato', testo: 'Scrivi i punti di ogni set direttamente nella scheda e premi Salva. La classifica si aggiorna subito.' },
    { sel: '.match:not(.is-done) [data-a="inCorso"]', titolo: 'In campo', testo: 'Segnala che la partita si sta giocando: i genitori la vedono in «In campo ora» sulla pagina pubblica.' },
    { sel: '.match [data-a="linkSegnapunti"]', titolo: 'Segnapunti dal telefono', testo: 'Manda un link (anche con WhatsApp o QR) a chi segna a bordo campo: aggiorna il punteggio punto per punto, senza account.' },
    { sel: '.fase-head .menu summary', titolo: 'Azioni della fase', testo: 'Stampa la fase, aggiungi un girone, azzera i risultati o rinominala.' },
    { sel: '[data-a="apriBuilder"]', titolo: 'Fase successiva', testo: 'Finiti i gironi, crea il tabellone a eliminazione o nuovi gironi partendo dalla classifica.' },
  ],
};

let attiva = null; // { nome, passi, i }
let el = null;

function fatta(nome) { try { return localStorage.getItem(CHIAVE + nome) === '1'; } catch { return true; } }
function segnaFatta(nome) { try { localStorage.setItem(CHIAVE + nome, '1'); } catch { /* storage non disponibile */ } }

export function tourAttivo() { return !!attiva; }

// Da chiamare dopo ogni disegno della pagina
// paginaAttuale() dice quale guida vale ora: se nel frattempo si è cambiata pagina non parte
export function tourSeServe(nome, paginaAttuale) {
  if (attiva) { posiziona(); return; }
  if (!nome || fatta(nome)) return;
  setTimeout(() => {
    if (attiva || fatta(nome) || paginaAttuale() !== nome || document.querySelector('.modal-backdrop')) return;
    avviaTour(nome);
  }, 600);
}

// Cambiando pagina la guida in corso si chiude
export function chiudiTour() { if (attiva) chiudi(); }

export function riavviaGuide() {
  try { Object.keys(GUIDE).forEach(n => localStorage.removeItem(CHIAVE + n)); } catch { /* storage non disponibile */ }
}

export function avviaTour(nome) {
  const passi = (GUIDE[nome] || []).filter(p => !p.sel || trova(p.sel));
  if (!passi.length) return;
  attiva = { nome, passi, i: 0 };
  el = document.createElement('div');
  el.className = 'tour';
  el.innerHTML = `<div class="tour-catch"></div><div class="tour-spot" aria-hidden="true"></div>
    <div class="tour-pop" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-d">
      <div class="tour-prog"></div><h2 id="tour-t"></h2><p id="tour-d"></p>
      <div class="tour-act"><button type="button" class="btn btn-sm btn-ghost" data-t="salta">Salta la guida</button><span class="spacer"></span>
        <button type="button" class="btn btn-sm" data-t="indietro">Indietro</button><button type="button" class="btn btn-sm btn-primary" data-t="avanti">Avanti</button></div>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-t]');
    if (b) azione(b.dataset.t);
  });
  document.addEventListener('keydown', tasti, true);
  window.addEventListener('resize', posiziona);
  window.addEventListener('scroll', posiziona, true);
  mostra(true);
}

function trova(sel) {
  for (const n of document.querySelectorAll(sel)) { const r = n.getBoundingClientRect(); if (r.width && r.height) return n; }
  return null;
}

function tasti(e) {
  if (!attiva) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); chiudi(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); azione('avanti'); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); azione('indietro'); }
}

function azione(t) {
  if (t === 'salta') return chiudi();
  if (t === 'indietro' && attiva.i > 0) { attiva.i--; mostra(true); }
  if (t === 'avanti') { if (attiva.i >= attiva.passi.length - 1) return chiudi(); attiva.i++; mostra(true); }
}

function mostra(scorri) {
  const { passi, i } = attiva;
  const p = passi[i];
  el.querySelector('.tour-prog').textContent = passi.length > 1 ? `${i + 1} di ${passi.length}` : '';
  el.querySelector('#tour-t').textContent = p.titolo;
  el.querySelector('#tour-d').textContent = p.testo;
  el.querySelector('[data-t="indietro"]').hidden = i === 0;
  el.querySelector('[data-t="avanti"]').textContent = i === passi.length - 1 ? 'Ho capito' : 'Avanti';
  const target = p.sel && trova(p.sel);
  if (target && scorri) {
    const r = target.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 220) target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  posiziona();
  el.querySelector('[data-t="avanti"]').focus({ preventScroll: true });
}

function posiziona() {
  if (!attiva || !el) return;
  const p = attiva.passi[attiva.i];
  const target = p.sel && trova(p.sel);
  const spot = el.querySelector('.tour-spot'), pop = el.querySelector('.tour-pop');
  el.classList.toggle('centrata', !target);
  if (!target) { spot.style.cssText = ''; pop.style.cssText = ''; return; }
  const r = target.getBoundingClientRect(), m = 6;
  spot.style.cssText = `top:${r.top - m}px;left:${r.left - m}px;width:${r.width + m * 2}px;height:${r.height + m * 2}px`;
  if (innerWidth < 640) { pop.style.cssText = ''; el.classList.toggle('in-alto', r.top + r.height / 2 > innerHeight / 2); return; }
  el.classList.remove('in-alto');
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let top = r.bottom + 14;
  if (top + ph > innerHeight - 12) top = r.top - ph - 14;
  if (top < 12) top = Math.min(innerHeight - ph - 12, Math.max(12, r.top + 12));
  let left = r.left + r.width / 2 - pw / 2;
  left = Math.max(12, Math.min(left, innerWidth - pw - 12));
  // Elementi alti e stretti (menu laterale): fumetto a destra
  if (r.height > innerHeight * 0.4 && r.right + pw + 24 < innerWidth) { left = r.right + 16; top = Math.max(12, Math.min(r.top + 12, innerHeight - ph - 12)); }
  pop.style.cssText = `top:${top}px;left:${left}px`;
}

function chiudi() {
  if (!attiva) return;
  segnaFatta(attiva.nome);
  attiva = null;
  document.removeEventListener('keydown', tasti, true);
  window.removeEventListener('resize', posiziona);
  window.removeEventListener('scroll', posiziona, true);
  el?.remove();
  el = null;
}
