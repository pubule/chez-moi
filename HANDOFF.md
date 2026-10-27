# Handoff — Chez moi

Ultimo aggiornamento: 2026-10-27

## Cos'è

PWA per iPhone, per uso personale di Fabio, per ritrovare la passione per la cucina gourmet. Quattro schede:
Sfida (una tecnica a settimana scelta tra 24 in `public/sfide.js`, filtrate per gli attrezzi spuntati in
Opzioni), Diario (foto, voto, note), Ricette (con video YouTube incorporato), Chef (ricetta proposta da Claude).

Stesso schema di radar-eventi e calice: Worker + Hono + D1 + R2, frontend vanilla in `public/`, Cloudflare
Access, deploy a comando da Actions.

## Stato

| Cosa | Stato |
|---|---|
| Frontend, design HIG, test logica | fatto; dal 2026-10-21 direzione D dei mockup, solo tema scuro |
| Ricette di Fabio (61) con foto Openverse | caricate in produzione il 2026-10-21 (`worker/seed/`) |
| Worker (diario, ricette, foto, chef) e test Vitest | fatto, provato in locale con `wrangler dev` |
| Risorse Cloudflare, Access, primo deploy | fatto il 2026-10-21 (deploy da locale con wrangler) |
| Secret `ANTHROPIC_API_KEY` | **da fare con Fabio** (checklist sotto) |
| Prova su iPhone | da fare |

## Scelte

- Attrezzi e "cambia sfida" restano nel `localStorage` del telefono: sono preferenze, non dati.
- Lo Chef usa `claude-opus-5-5` con output JSON strutturato e il ripiego automatico (`fallbacks: "default"`) in caso di rifiuto; tetto di 20 richieste al giorno.
- Niente export/import: i dati sono su D1 (che ha Time Travel) e R2.
- Le temperature del sottovuoto in `sfide.js` sono valori classici, non verificati su una fonte.
- Design D (mockup "Chez moi — mockup cucina" su claude.ai): solo scuro, accento rame `#d08a5a`, quadrante del roner nella Sfida, mise en place da spuntare, modalità cucina un passaggio alla volta con timer e schermo acceso (Wake Lock).
- Le ricette restano testo libero: un ingrediente per riga ("320 g riso") e un passaggio per riga; `public/logic.js` ricava dosi e minuti del timer. Nessuna colonna strutturata.
- Spunte della mise en place solo in memoria: si azzerano chiudendo l'app.
- Seed ricette: `worker/seed/ricette.mjs` (dosi per 4, completate dall'autore con fonti web dove servivano), `genera-sql.mjs` con id ricavato dal titolo (rilanciabile senza doppioni). Per propagare modifiche a ricette già caricate: `aggiorna-sql.mjs` (aggiorna solo quelle che Fabio non ha toccato nell'app). Ogni passaggio di preparazione in ordine di esecuzione (prima ciò che va fatto in anticipo), guarnizione sempre come ultimo passaggio. Foto: `foto-query.json` → scelte a mano su Openverse (licenze CC senza ND) → `foto.json` con autore, licenza e pagina d'origine, mostrati sotto la foto (`foto_credito`). I JPEG (ritagliati 4:3, max 1200 px) stanno solo in R2, non nel repo. Dal 2026-10-22 tutte le foto del seed sono generate con Workers AI (`@cf/black-forest-labs/flux-1-schnell`, 4 passi: la quota gratuita di 10.000 neuroni al giorno ne copre circa 100; l'account è sul piano Free, quindi oltre la quota Cloudflare rifiuta con l'errore 4006 e non addebita nulla; la quota si azzera a mezzanotte UTC), perché le foto di stock non mostravano il piatto vero. In `foto.json` c'è il prompt di ogni foto. Per le ricette nuove: prompt in `worker/seed/foto-prompt.json`, poi Actions → Foto AI → Run workflow (`worker/seed/genera-foto.mjs`, con lo stile comune: fondo scuro ardesia e noce, luce laterale), che carica in R2 foto e miniatura, collega in D1 le ricette senza foto e fa il commit di `foto.json`. Il token di questo ambiente cloud non ha Workers AI né R2: si passa da Actions. Al 2026-10-27 mancano ancora 12 foto (da Pici all’aglione in poi) per la quota esaurita. Una foto cambiata prende una chiave nuova: le vecchie restano in cache sui telefoni per un anno.
- Ogni sfida ha una foto di esempio generata con AI (`foto` in `public/sfide.js`, chiave `foto/<sha1('sfida:'+titolo)>`), mostrata finché nel diario non c'è la tua.
- Foto AI dall'app: `POST /api/foto/genera` (Workers AI, tetto 25 al giorno in `ai_usage` con chiave `foto:<data>`). Pulsante "Genera foto AI" nella ricetta; le ricette salvate dallo Chef e quelle della sfida ("Aggiungi alle mie ricette", categoria `Sfide`, testo scritto dallo Chef con Claude) prendono la foto da sole. Se la quota è finita la ricetta si salva senza foto.
- Etichette `fit` e `vegetariana` (colonna `etichette`, separate da virgola, valori ammessi in `ETICHETTE` di `raccolte.ts` e `logic.js`): filtri a interruttore nel ricettario, che si sommano alla categoria; nel seed il campo `e`.
- Kcal e macro per porzione (colonne `porzioni`, `kcal`, `proteine`, `carboidrati`, `grassi`; mockup F3 e F4): stime dell'autore per il seed in `worker/seed/macro.mjs`, dallo Chef con la ricetta, correggibili nel modulo. Colori dei macro terracotta, grano, olio (contrasti in `style.css`). La barra divide le calorie dei tre macro; nei cocktail le kcal includono l'alcol.
- Cocktail con dosi IBA (iba-world.com); categoria `Sottovuoto` per le ricette col roner.
- Categoria `Salse` (liquide e secche: chimichurri, fondo bruno, bisque, maionese, dukkah, furikake…); la "Salsa per fritto" è passata da Antipasti a Salse.
- Audit gourmet (ottobre 2026): 66 ricette in più, categorie `Contorni` e `Basi`, ricette per sifone, cannello, biberon e mandolina, pasta fresca, cocktail classici, colazioni.
- Colonna `note` ("Da sapere") sulle ricette: sicurezza alimentare (pesce abbattuto, carne e uova crude) e ingredienti da ordinare; testi del seed in `worker/seed/note.mjs`, scritti solo dove la nota è vuota.
- Sfide: ogni sfida ha `passi` in `public/sfide.js` per la modalità cucina (`cucina = { sfida: true, passo }`); alla fine apre il diario come «L’ho fatta».
- Ricettario a griglia (direzione E2 dei mockup) con filtri per categoria. Ogni foto ha una miniatura da 640 px in R2 sotto `mini/<uuid>` (stesso uuid), servita con `?mini` per griglia e muro del Diario; senza miniatura si vede la foto intera. Il client la genera al caricamento. Foto in D1 no: R2 è gratis fino a 10 GB e con calice siamo sotto i 60 MB.
- Icone della Home ancora verdi della prima palette: da rifare in rame se serve.

## Checklist primo deploy

- [x] D1: `npx wrangler@4 d1 create chez-moi-db`, id in `wrangler.jsonc`.
- [x] R2: `npx wrangler@4 r2 bucket create chez-moi-foto`.
- [x] Access: applicazione self-hosted su `chezmoi.smartcores.org` con la policy riutilizzabile "Solo Fabio"; AUD in `wrangler.jsonc` (`ACCESS_AUD`).
- [x] Primo deploy, fatto da locale con wrangler; i successivi da Actions → Deploy → Run workflow.
- [x] Secret del Worker `ALLOWED_EMAIL`.
- [x] Secret di repository `CLOUDFLARE_API_TOKEN` (token "chez-moi"); workflow Deploy provato il 2026-10-21.
- [ ] Secret del Worker `ANTHROPIC_API_KEY`.
- [ ] iPhone: aggiungi a Home, sfida fatta con foto, ricetta con video, Chef, testo grande.
