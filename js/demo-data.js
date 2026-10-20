// Torneo di esempio per la modalità demo
import { uid, nuovoTorneo, creaGironi, suggerisciGironi, squadreTotali, setPerDb } from './core.js';

const SOCIETA = ['Volley Riviera', 'Pallavolo Colle Alto', 'ASD Sporting Mare', 'Polisportiva Ponte Vecchio', 'Volley Valle Verde', 'Libertas Borgo', 'Smash Academy', 'GS Torre Azzurra'];

function punteggio() {
  const vince = 25, perde = 12 + Math.floor(Math.random() * 12);
  return Math.random() < 0.5 ? [vince, perde] : [perde, vince];
}

export function creaTorneoDemo(owner) {
  const oggi = new Date().toISOString().slice(0, 10);
  const t = nuovoTorneo({
    nome: 'Torneo di Primavera', data: oggi, luogo: 'Palazzetto dello Sport', owner,
    categorie: [
      { nome: 'White', colore: '#1E40AF', emoji: '⬜', campi: 3 },
      { nome: 'Green', colore: '#166534', emoji: '🟩', campi: 2 },
      { nome: 'Red', colore: '#991B1B', emoji: '🟥', campi: 2 },
    ],
    regole: { set: 2 },
  });
  const [u10, u12, u14] = t.categorie;
  t.societa = SOCIETA.map((nome, i) => ({
    id: uid(), nome, logo: false,
    squadre: { [u10.id]: i < 6 ? 2 : 1, [u12.id]: i % 3 === 0 ? 2 : 1, [u14.id]: i < 6 ? 1 : 0 },
    atleti: { [u10.id]: (i < 6 ? 2 : 1) * 5, [u12.id]: (i % 3 === 0 ? 2 : 1) * 6, [u14.id]: i < 6 ? 7 : 0 },
  }));
  const risultati = {};
  t.categorie.forEach((cat, ci) => {
    const sug = suggerisciGironi(squadreTotali(t, cat.id), cat.campi);
    const gironi = creaGironi(t.societa, cat.id, { dimensioni: sug.dimensioni, nomi: 'fantasia', pool: ci, set: 2 });
    gironi.forEach((g, gi) => { g.campo = `Campo ${gi + 1}`; });
    cat.fasi = [{ id: uid(), nome: 'Prima fase', tipo: 'gironi', gironi }];
    // Una parte delle partite già giocata, una in corso per girone
    const quota = ci === 0 ? 0.7 : ci === 1 ? 0.4 : 0;
    for (const g of gironi) {
      const fatte = Math.floor(g.partite.length * quota);
      g.partite.forEach((p, i) => {
        if (i < fatte) risultati[p.id] = { stato: 'finita', set: setPerDb([punteggio(), punteggio()]), ts: Date.now() - (fatte - i) * 600000 };
        else if (i === fatte && quota) risultati[p.id] = { stato: 'in_corso', set: setPerDb([[18, 15], ['', '']]), ts: Date.now() };
      });
    }
  });
  t.live.info = { attivo: true, blocchi: [
    { id: uid(), titolo: 'Orari', testo: 'Ritrovo squadre alle 8:30.\nInizio partite alle 9:00.\nPremiazioni previste alle 17:30.' },
    { id: uid(), titolo: 'Come arrivare', testo: 'Parcheggio gratuito dietro al palazzetto. Ingresso pubblico dalla tribuna est.' },
  ] };
  t.live.menu = { attivo: true, note: 'Si paga alla cassa vicino all\'ingresso.', sezioni: [
    { id: uid(), nome: 'Panini e piadine', voci: [
      { id: uid(), nome: 'Piadina prosciutto e formaggio', desc: '', prezzo: '€ 5,00' },
      { id: uid(), nome: 'Panino con salsiccia', desc: 'Con cipolla caramellata', prezzo: '€ 5,50' },
    ] },
    { id: uid(), nome: 'Bevande', voci: [
      { id: uid(), nome: 'Acqua naturale o frizzante', desc: '50 cl', prezzo: '€ 1,00' },
      { id: uid(), nome: 'Succo di frutta', desc: '', prezzo: '€ 1,50' },
    ] },
  ] };
  t.iscrizioni.aperte = true;
  return { id: 'demo-primavera', torneo: t, risultati };
}
