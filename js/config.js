// Configurazione Firebase (chiavi client pubbliche: la protezione dei dati è nelle regole Firestore)
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB-vk1m84YC8ZBMHHvILdgpAfZyp4C_0ZM',
  authDomain: 'torneo-pallavolo-manager.firebaseapp.com',
  projectId: 'torneo-pallavolo-manager',
  storageBucket: 'torneo-pallavolo-manager.firebasestorage.app',
  messagingSenderId: '423674754433',
  appId: '1:423674754433:web:35dfeb868d726f6272a480',
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.0';

// Collezione radice dei tornei VolleyHub (separata dai dati della vecchia app)
export const COLL = 'vh_tornei';

// Modalità demo: tutto resta nel browser, nessun account necessario
export const DEMO = new URLSearchParams(location.search).has('demo');

// Costruisce un link a un'altra pagina mantenendo la modalità demo
export function link(pagina, params = {}) {
  const u = new URL(pagina, location.href);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, v);
  if (DEMO) u.searchParams.set('demo', '1');
  return u.href;
}
