# Chez moi

App personale di cucina gourmet per iPhone: una web app installabile sulla schermata home (PWA), senza App Store.

- **Sfida**: una tecnica da provare ogni settimana, scelta tra quelle adatte agli attrezzi che hai (roner, biberon, sifone…).
- **Diario**: foto dei piatti, voto e note su cosa migliorare.
- **Ricette**: il tuo ricettario, con video YouTube incorporati.
- **Chef**: ricette proposte da Claude a partire da cosa hai in frigo. Serve una chiave API Anthropic, che resta sul telefono.

I dati restano sul telefono (IndexedDB): da **Opzioni** puoi esportare un backup.

## Installarla su iPhone

1. Apri l'indirizzo dell'app in Safari.
2. Tocca Condividi → **Aggiungi alla schermata Home**.

## Sviluppo

Niente build e niente dipendenze: sono file statici.

```sh
python3 -m http.server   # poi apri http://localhost:8000
node --test test.mjs     # test della logica
```

Il service worker (`sw.js`) mostra la versione in cache e la aggiorna in background: dopo una modifica, l'app aggiornata compare alla seconda apertura.
