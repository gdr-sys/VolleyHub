// Componenti di interfaccia condivisi: icone, notifiche, finestre, QR, tema, immagini.
import { esc, safeImg } from './core.js';

// ── Icone (tratto 2px, 24×24) ──────────────────────────────
const P = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h7v-4M17 21v.01"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6v4H9z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  home: '<path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  up: '<path d="M18 15l-6-6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  print: '<path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4L12 18.4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  whistle: '<path d="M11 9h10v4a6 6 0 1 1-12 0"/><circle cx="9" cy="14" r="2"/><path d="M14 9V5h-3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bracket: '<path d="M3 5h5v6h5M3 17h5v-6M13 11h4v0M17 7v8M17 11h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  play: '<path d="M7 5v14l11-7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7M4 4v4.7h4.7"/>',
  form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  utensils: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M7 3v5M11 3v5M16 21V3c2 1 3 3.5 3 7v3h-3"/>',
  handshake: '<path d="M2 12l4-4 4 2 3-2 4 1 5 4M6 8v6l5 5 2-1 2 1 2-2 3-2M10 10l3 3"/>',
  sort: '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>',
  shuffle: '<path d="M16 4h4v4M4 20L20 4M20 16v4h-4M15 15l5 5M4 4l5 5"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

// ── Notifiche ──────────────────────────────────────────────
let toastWrap;
export function toast(msg, tipo = 'ok', azione = null) {
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.className = 'toasts';
    toastWrap.setAttribute('role', 'status');
    toastWrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastWrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `${icon(tipo === 'err' ? 'info' : 'check')}<span>${esc(msg)}</span>${azione ? `<button type="button">${esc(azione.label)}</button>` : ''}`;
  if (azione) el.querySelector('button').onclick = () => { azione.fn(); el.remove(); };
  toastWrap.appendChild(el);
  // Al massimo due notifiche visibili: le più vecchie lasciano il posto
  while (toastWrap.children.length > 2) toastWrap.firstElementChild.remove();
  setTimeout(() => el.remove(), azione ? 6000 : tipo === 'err' ? 5000 : 2600);
}

// ── Finestre modali ────────────────────────────────────────
// body: HTML. azioni: [{label, value, cls}] — il primo con cls primaria è l'azione di default (Invio).
// onMount(el, close) consente di collegare comportamenti interni.
export function modal({ title, body, azioni = [{ label: 'Chiudi', value: null }], wide = false, onMount, validate }) {
  return new Promise(resolve => {
    const prevFocus = document.activeElement;
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mdl-t">
      <header><h2 id="mdl-t">${esc(title)}</h2><button type="button" class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Chiudi">${icon('x')}</button></header>
      <div class="modal-body">${body}</div>
      ${azioni.length ? `<footer>${azioni.map((a, i) => `<button type="button" class="btn ${a.cls || ''}" data-i="${i}">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</button>`).join('')}</footer>` : ''}
    </div>`;
    document.body.appendChild(bd);
    document.body.style.overflow = 'hidden';
    const box = bd.querySelector('.modal');
    const close = val => {
      bd.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey, true);
      prevFocus?.focus?.();
      resolve(val);
    };
    const scegli = i => {
      const a = azioni[i];
      if (a.value !== null && a.value !== false && validate) {
        const err = validate(box, a.value);
        if (err) return;
      }
      close(typeof a.value === 'function' ? a.value(box) : a.value);
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
      if (e.key === 'Tab') {
        const f = [...box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
        const def = azioni.findIndex(a => /btn-(primary|accent|danger-solid)/.test(a.cls || ''));
        if (def >= 0) { e.preventDefault(); scegli(def); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    bd.addEventListener('mousedown', e => { if (e.target === bd) close(null); });
    bd.querySelector('[data-close]').onclick = () => close(null);
    bd.querySelectorAll('footer [data-i]').forEach(b => { b.onclick = () => scegli(+b.dataset.i); });
    onMount?.(box, close);
    (box.querySelector('[autofocus]') || box.querySelector('input, select, textarea') || box.querySelector('footer .btn:last-child'))?.focus();
  });
}

export function conferma(msg, { titolo = 'Sei sicuro?', ok = 'Conferma', pericolo = false } = {}) {
  return modal({
    title: titolo,
    body: `<p>${msg}</p>`,
    azioni: [{ label: 'Annulla', value: false }, { label: ok, value: true, cls: pericolo ? 'btn-danger' : 'btn-primary' }],
  }).then(v => v === true);
}

export function chiedi(titolo, { label = '', valore = '', placeholder = '', ok = 'Salva', hint = '' } = {}) {
  return modal({
    title: titolo,
    body: `<label class="field"><span>${esc(label)}</span><input class="input" id="mdl-in" value="${esc(valore)}" placeholder="${esc(placeholder)}" autofocus>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label>`,
    azioni: [{ label: 'Annulla', value: null }, { label: ok, value: box => box.querySelector('#mdl-in').value.trim(), cls: 'btn-primary' }],
    validate: box => { const v = box.querySelector('#mdl-in').value.trim(); if (!v) { box.querySelector('#mdl-in').focus(); return 'vuoto'; } return null; },
    onMount: box => { const i = box.querySelector('#mdl-in'); i.select(); },
  });
}

// ── Appunti e condivisione ─────────────────────────────────
export async function copia(testo, msg = 'Link copiato') {
  try {
    await navigator.clipboard.writeText(testo);
    toast(msg);
  } catch {
    await modal({ title: 'Copia il link', body: `<input class="input" value="${esc(testo)}" readonly onfocus="this.select()" autofocus>` });
  }
}
export function linkWhatsApp(testo) { return 'https://wa.me/?text=' + encodeURIComponent(testo); }

// ── QR code (libreria caricata solo quando serve) ──────────
const scriptCaricati = {};
export function caricaScript(src) {
  return scriptCaricati[src] ||= new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => { delete scriptCaricati[src]; ko(new Error('Impossibile caricare ' + src)); };
    document.head.appendChild(s);
  });
}
export async function qrSvg(testo) {
  await caricaScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js');
  const qr = window.qrcode(0, 'M');
  qr.addData(testo);
  qr.make();
  const n = qr.getModuleCount(), m = 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="Codice QR"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#13213F"/></svg>`;
}

// Finestra "condividi link" con QR, copia e WhatsApp
export async function condividiLink({ titolo, descrizione, url, messaggio, extra = '' }) {
  const body = `
    ${descrizione ? `<p class="muted">${esc(descrizione)}</p>` : ''}
    <div class="qr-box" id="qr-slot"><div class="spinner"></div></div>
    <div class="link-box"><code>${esc(url)}</code><button type="button" class="btn btn-sm" data-copy>${icon('copy')}Copia</button></div>
    <div class="grid-2">
      <a class="btn btn-whatsapp" href="${esc(linkWhatsApp((messaggio ? messaggio + '\n' : '') + url))}" target="_blank" rel="noopener">${icon('share')}WhatsApp</a>
      <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">${icon('external')}Apri</a>
    </div>${extra}`;
  return modal({
    title: titolo, body, azioni: [],
    onMount: async box => {
      box.querySelector('[data-copy]').onclick = () => copia(url);
      try { box.querySelector('#qr-slot').innerHTML = await qrSvg(url); }
      catch { box.querySelector('#qr-slot').innerHTML = '<p class="muted small">QR non disponibile offline. Usa il link.</p>'; }
    },
  });
}

// ── Tema chiaro/scuro ──────────────────────────────────────
const THEME_KEY = 'vh_theme';
export function applicaTema() {
  let t = null;
  try { t = localStorage.getItem(THEME_KEY); } catch { /* storage non disponibile */ }
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
export function temaScuro() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
export function cambiaTema() {
  const nuovo = temaScuro() ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuovo;
  try { localStorage.setItem(THEME_KEY, nuovo); } catch { /* ignora */ }
  return nuovo;
}

// ── Immagini ───────────────────────────────────────────────
// Ridimensiona e comprime in WebP (mantiene la trasparenza dei loghi)
export function comprimiImmagine(file, max = 240, qualita = 0.82) {
  return new Promise((ok, ko) => {
    if (!file.type.startsWith('image/')) return ko(new Error('Il file scelto non è un\'immagine.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/webp', qualita);
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
      ok(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Immagine non leggibile.')); };
    img.src = url;
  });
}

export function scegliFile(accept = 'image/*') {
  return new Promise(ok => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept;
    i.onchange = () => ok(i.files[0] || null);
    i.click();
  });
}

export function iniziali(nome) {
  return String(nome || '?').split(/\s+/).filter(w => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}
export function logoHtml(src, nome, grande = false) {
  const s = safeImg(src);
  const cls = grande ? ' logo-lg' : '';
  return s ? `<img class="logo${cls}" src="${esc(s)}" alt="" loading="lazy">` : `<span class="logo-ph${cls}" aria-hidden="true">${esc(iniziali(nome))}</span>`;
}

export function scaricaFile(nome, contenuto, tipo = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function slug(s) { return String(s || 'torneo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'torneo'; }
