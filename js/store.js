// Accesso ai dati. Stessa interfaccia per Firebase (produzione) e per la demo locale.
import { FIREBASE_CONFIG, FIREBASE_SDK, COLL, DEMO } from './config.js';
import { uid } from './core.js';

let storePromise = null;
export function getStore() {
  if (!storePromise) storePromise = DEMO ? import('./store-demo.js').then(m => m.creaStoreDemo()) : creaStoreFirebase();
  return storePromise;
}

async function creaStoreFirebase() {
  const [appMod, authMod, fs] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-auth.js`),
    import(`${FIREBASE_SDK}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  const auth = authMod.getAuth(app);
  let db;
  try {
    // Cache persistente: l'app continua a funzionare (e salva) anche con il Wi-Fi della palestra che va e viene
    db = fs.initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    });
  } catch {
    db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
  const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, where, writeBatch } = fs;
  const tDoc = tid => doc(db, COLL, tid);
  const sub = (tid, nome) => collection(db, COLL, tid, nome);
  const mappa = snap => { const m = {}; snap.forEach(d => { m[d.id] = d.data(); }); return m; };

  return {
    demo: false,

    // ── Account ──
    onUser(cb) {
      return authMod.onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email || '', anon: u.isAnonymous } : null));
    },
    async login(email, password) { await authMod.signInWithEmailAndPassword(auth, email, password); },
    async logout() { await authMod.signOut(auth); },
    async resetPassword(email) { await authMod.sendPasswordResetEmail(auth, email); },
    async isActive(userId) {
      const s = await getDoc(doc(db, 'utenti', userId));
      return s.exists() && s.data().attivo === true;
    },
    async ensureAnon() {
      if (auth.currentUser) return auth.currentUser.uid;
      const c = await authMod.signInAnonymously(auth);
      return c.user.uid;
    },

    // ── Tornei ──
    watchMieiTornei(owner, cb, onErr) {
      return onSnapshot(query(collection(db, COLL), where('owner', '==', owner)),
        s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), onErr);
    },
    watchTorneo(tid, cb, onErr) {
      return onSnapshot(tDoc(tid), { includeMetadataChanges: false }, s => cb(s.exists() ? s.data() : null, { locale: s.metadata.hasPendingWrites }), onErr);
    },
    async getTorneo(tid) { const s = await getDoc(tDoc(tid)); return s.exists() ? s.data() : null; },
    async createTorneo(data) { const id = uid(14); await setDoc(tDoc(id), { ...data, updatedAt: Date.now() }); return id; },
    async saveTorneo(tid, data) { await setDoc(tDoc(tid), { ...data, updatedAt: Date.now() }); },
    async deleteTorneo(tid) {
      // Il client deve cancellare a mano le sottocollezioni
      for (const nome of ['risultati', 'media', 'privato', 'iscrizioni', 'segnapunti', 'arbitri']) {
        const snap = await getDocs(sub(tid, nome));
        for (let i = 0; i < snap.docs.length; i += 400) {
          const b = writeBatch(db);
          snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
          await b.commit();
        }
      }
      await deleteDoc(tDoc(tid));
    },

    // ── Risultati ──
    watchRisultati(tid, cb, onErr) { return onSnapshot(sub(tid, 'risultati'), s => cb(mappa(s)), onErr); },
    async getRisultati(tid) { return mappa(await getDocs(sub(tid, 'risultati'))); },
    async setRisultato(tid, mid, r) { await setDoc(doc(db, COLL, tid, 'risultati', mid), r); },
    async delRisultati(tid, mids) {
      for (let i = 0; i < mids.length; i += 400) {
        const b = writeBatch(db);
        mids.slice(i, i + 400).forEach(m => b.delete(doc(db, COLL, tid, 'risultati', m)));
        await b.commit();
      }
    },
    async copiaRisultati(daTid, aTid) {
      const m = mappa(await getDocs(sub(daTid, 'risultati')));
      const ids = Object.keys(m);
      for (let i = 0; i < ids.length; i += 400) {
        const b = writeBatch(db);
        ids.slice(i, i + 400).forEach(k => b.set(doc(db, COLL, aTid, 'risultati', k), m[k]));
        await b.commit();
      }
    },

    // ── Immagini (loghi e sponsor), un documento ciascuna ──
    watchMedia(tid, cb, onErr) { return onSnapshot(sub(tid, 'media'), s => { const m = {}; s.forEach(d => { m[d.id] = d.data().data; }); cb(m); }, onErr); },
    async getMedia(tid) { const m = {}; (await getDocs(sub(tid, 'media'))).forEach(d => { m[d.id] = d.data().data; }); return m; },
    async setMedia(tid, id, data) { await setDoc(doc(db, COLL, tid, 'media', id), { data }); },
    async delMedia(tid, id) { await deleteDoc(doc(db, COLL, tid, 'media', id)); },

    // ── Dati privati (contatti referenti, token segnapunti) ──
    async getPrivato(tid) { const s = await getDoc(doc(db, COLL, tid, 'privato', 'dati')); return s.exists() ? s.data() : {}; },
    async patchPrivato(tid, patch) { await setDoc(doc(db, COLL, tid, 'privato', 'dati'), patch, { merge: true }); },

    // ── Iscrizioni online ──
    watchIscrizioni(tid, cb, onErr) { return onSnapshot(sub(tid, 'iscrizioni'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), onErr); },
    async inviaIscrizione(tid, data) { await addDoc(sub(tid, 'iscrizioni'), data); },
    async aggiornaIscrizione(tid, iid, patch) { await updateDoc(doc(db, COLL, tid, 'iscrizioni', iid), patch); },
    async eliminaIscrizione(tid, iid) { await deleteDoc(doc(db, COLL, tid, 'iscrizioni', iid)); },

    // ── Segnapunti ──
    async creaToken(tid, mid) {
      const priv = await this.getPrivato(tid);
      const esistente = priv.token?.[mid];
      if (esistente) return esistente;
      const token = uid(24);
      await setDoc(doc(db, COLL, tid, 'segnapunti', token), { matchId: mid, ts: Date.now() });
      await this.patchPrivato(tid, { token: { [mid]: token } });
      return token;
    },
    // Il segnapunti entra con un account anonimo e "presenta" il token: le regole verificano che corrisponda alla partita
    async claimArbitro(tid, mid, token) {
      const me = await this.ensureAnon();
      await setDoc(doc(db, COLL, tid, 'arbitri', me), { token, matchId: mid, ts: Date.now() });
      return me;
    },
  };
}
