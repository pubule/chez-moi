import { SFIDE, ATTREZZI } from './sfide.js';
import { settimana, sfidaDellaSettimana, youtubeId, ingredienti, passaggi, minuti, perCategoria, sfideAnno, CATEGORIE, ETICHETTE, etichetteDi, macroDi } from './logic.js';

// ---------- dati (API del Worker, dietro Cloudflare Access) ----------

async function api(metodo, percorso, corpo) {
  let r;
  try {
    r = await fetch(`/api/${percorso}`, {
      method: metodo,
      headers: corpo instanceof Blob ? { 'content-type': corpo.type } : corpo ? { 'content-type': 'application/json' } : {},
      body: corpo instanceof Blob ? corpo : corpo && JSON.stringify(corpo),
    });
  } catch {
    // offline, oppure la sessione di Access è scaduta (il login non passa da fetch)
    throw new Error('non riesco a raggiungere il server. Controlla la connessione, poi chiudi e riapri l’app.');
  }
  const dati = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dati.error || `errore ${r.status}`);
  return dati;
}
// elenchi già scaricati: cambiare scheda non aspetta la rete. Si svuota dopo ogni modifica e a ogni ritorno nell'app.
const memoria = new Map();
const tutti = s => {
  if (!memoria.has(s)) memoria.set(s, api('GET', s).catch(e => { memoria.delete(s); throw e; }));
  return memoria.get(s);
};
const uno = async (s, id) => (await tutti(s)).find(x => x.id === id);
const scrivi = async (s, metodo, id, v) => { const r = await api(metodo, `${s}/${id}`, v); memoria.delete(s); return r; };
const salva = (s, v) => scrivi(s, 'PUT', v.id, v);
const elimina = (s, id) => scrivi(s, 'DELETE', id);

function leggiImpostazioni() {
  try { return { attrezzi: ['roner', 'biberon'], salti: {}, ...JSON.parse(localStorage.getItem('chez-moi') || '{}') }; }
  catch { return { attrezzi: ['roner', 'biberon'], salti: {} }; }
}
let imp = leggiImpostazioni();
function salvaImpostazioni() {
  try { localStorage.setItem('chez-moi', JSON.stringify(imp)); } catch { alert('Impossibile salvare le impostazioni su questo dispositivo.'); }
}

// ---------- utilità ----------

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oggi = () => new Date().toISOString().slice(0, 10);
const nuovoId = () => crypto.randomUUID();
const stelle = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const nomeMese = ym => new Date(ym + '-15').toLocaleDateString('it-IT', { month: 'long', year: ym.slice(0, 4) === oggi().slice(0, 4) ? undefined : 'numeric' });
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// mini: la miniatura da ~640 px per griglie e muro
const fotoUrl = (chiave, mini) => `/api/${chiave}${mini ? '?mini' : ''}`;

const ICONE = {
  indietro: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  piu: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  avviso: '<path d="M12 3.5 2.5 20h19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.2" fill="currentColor"/>',
};
// i tre macro: chiave, nome corto, classe del colore
const MACRO = [['p', 'proteine'], ['c', 'carbo'], ['g', 'grassi']];
const barraMacro = m => `<span class="barra" aria-hidden="true">${MACRO.map(([k], i) => `<i class="${k}" style="flex: ${m.quote[i]}"></i>`).join('')}</span>`;

const icona = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONE[n]}</svg>`;

// firma della direzione D: un quadrante come quello del roner
const quadrante = (t, etichetta) => `
  <div class="quadrante" role="img" aria-label="${t} gradi, ${esc(etichetta)}">
    <svg viewBox="0 0 92 92" aria-hidden="true"><circle class="traccia" cx="46" cy="46" r="38"/><circle class="arco" cx="46" cy="46" r="38" pathLength="100" stroke-dasharray="${t} 100"/></svg>
    <b>${t}°</b><span>${esc(etichetta)}</span>
  </div>`;

// riduce le foto del telefono (5–10 MB) a ~150 KB, la miniatura a ~40 KB
async function riduci(file, lato = 1200) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, lato / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
}

// foto generata con Workers AI sul server (tetto giornaliero lì); la descrizione è titolo + ingredienti principali
const CREDITO_AI = 'immagine creata con l’AI';
const generaFoto = (titolo, ingr) =>
  api('POST', 'foto/genera', { descrizione: `${titolo}. ${ingredienti(ingr).slice(0, 8).map(x => x.nome).join(', ')}`.slice(0, 600) }).then(r => r.foto);

// scelta della foto con anteprima, al posto del pulsante grezzo del browser
const campoFoto = foto => `
  <label class="scegli-foto">${foto ? `<img src="${fotoUrl(foto)}" alt="">` : ''}<span>${foto ? 'Cambia foto' : 'Aggiungi foto'}</span>
    <input name="foto" type="file" accept="image/*" class="nascosto"></label>`;

async function fotoDaForm(form, vecchia) {
  const f = form.foto.files[0];
  if (!f) return vecchia ?? null;
  const { foto } = await api('POST', 'foto', await riduci(f));
  await api('POST', `${foto}/mini`, await riduci(f, 640)).catch(() => {}); // senza miniatura si vede la foto intera
  return foto;
}

// ---------- navigazione ----------

let vista = 'sfida';
let ricettaAperta = null;
let filtro = ''; // categoria scelta nel ricettario, '' = tutte
const etichetteScelte = new Set(); // fit, vegetariana: si sommano alla categoria
let cucina = null; // { id, passo } in modalità cucina; { sfida: true, passo } per la sfida della settimana
// spunte della mise en place: valgono finché l'app resta aperta
const spunte = new Set();

document.querySelector('nav').addEventListener('click', e => {
  const b = e.target.closest('[data-vista]');
  if (!b) return;
  vista = b.dataset.vista;
  ricettaAperta = null;
  disegna();
});

let giro = 0;
async function disegna() {
  const mio = ++giro;
  document.querySelectorAll('nav [data-vista]').forEach(b => b.setAttribute('aria-current', b.dataset.vista === (vista === 'cucina' ? (cucina.sfida ? 'sfida' : 'ricette') : vista)));
  document.body.classList.toggle('in-cucina', vista === 'cucina');
  let html;
  try { html = await VISTE[vista](); }
  catch (err) { html = `<p class="errore" role="alert">Errore: ${esc(err.message)}</p><button class="secondario" data-az="riprova">Riprova</button>`; }
  if (mio !== giro) return; // nel frattempo è stata aperta un'altra schermata
  $('#vista').innerHTML = html;
  $('#vista').removeAttribute('aria-busy');
  if ($('#cerca')) applicaFiltri();
  // la foto della sfida è uno sfondo, senza evento di errore: se non arriva torna il riquadro basso
  const hero = $('.hero.con-foto');
  if (hero) { const prova = new Image(); prova.onerror = () => { hero.classList.remove('con-foto'); hero.style.backgroundImage = ''; }; prova.src = hero.dataset.foto; }
  window.scrollTo(0, 0);
}

// ---------- viste ----------

function sfidaCorrente() {
  const w = settimana();
  return sfidaDellaSettimana(SFIDE, imp.attrezzi, w, imp.salti[w] || 0);
}

const attrezziDi = s => (s.attrezzi.length ? s.attrezzi.map(a => ATTREZZI[a]) : ['cucina di base']).join(', ');

const VISTE = {
  async sfida() {
    const s = sfidaCorrente();
    const w = settimana();
    const diario = await tutti('diario');
    const fatte = diario.filter(d => d.sfida).length;
    const giaFatta = diario.some(d => d.sfida === s.titolo && d.settimana === w);
    // la tua foto della sfida, altrimenti quella di esempio
    const foto = diario.find(d => d.sfida === s.titolo && d.foto)?.foto ?? s.foto;
    const ricettaSfida = (await tutti('ricette')).find(r => r.titolo === s.titolo);
    return `
      <section class="hero${foto ? ' con-foto' : ''}"${foto ? ` data-foto="${fotoUrl(foto)}" style="background-image: linear-gradient(rgb(18 18 18 / .05), rgb(18 18 18 / .9)), url('${fotoUrl(foto)}')"` : ''}>
        <div>
          <p class="occhiello">Sfida della settimana</p>
          <h1>${esc(s.titolo)}</h1>
          <p class="meta">${esc(s.tempo)} · ${esc(attrezziDi(s))}</p>
        </div>
        ${s.temp ? quadrante(s.temp, s.attrezzi.includes('roner') ? 'roner' : 'al cuore') : ''}
      </section>
      <p>${esc(s.testo)}</p>
      <fieldset class="gruppo"><legend>Mise en place</legend>
        ${s.mise.map((m, i) => `<label><input type="checkbox" data-spunta="${w}:${i}" ${spunte.has(`${w}:${i}`) ? 'checked' : ''}><span>${esc(m)}</span></label>`).join('')}
      </fieldset>
      <p><a class="link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(s.cerca)}" target="_blank" rel="noopener">${icona('play')} Guarda come si fa</a></p>
      <button class="primario" data-az="cucina-sfida">${icona('play')} Modalità cucina</button>
      ${giaFatta ? '<p class="fatta">✓ Fatta questa settimana</p>' : '<button class="secondario" data-az="sfida-fatta">L’ho fatta: aggiungi al diario</button>'}
      ${ricettaSfida ? `<button class="secondario" data-az="ricetta-apri" data-id="${ricettaSfida.id}">Apri la ricetta</button>` : '<button class="secondario" data-az="sfida-ricetta">Aggiungi alle mie ricette</button>'}
      <p class="nota" id="sfida-stato" role="status"></p>
      <button class="secondario" data-az="sfida-cambia">Cambia sfida</button>
      <p class="nota">Sfide completate in tutto: <strong>${fatte}</strong></p>`;
  },

  async diario() {
    const voci = await tutti('diario'); // già in ordine dal server
    const chiave = settimana();
    const anno = sfideAnno(voci, chiave);
    const mese = oggi().slice(0, 7);
    const migliore = voci.filter(d => d.data.startsWith(mese)).sort((a, b) => b.voto - a.voto || !!b.foto - !!a.foto)[0];
    const mesi = new Map();
    for (const d of voci) {
      const k = d.data.slice(0, 7);
      if (!mesi.has(k)) mesi.set(k, []);
      mesi.get(k).push(d);
    }
    return `
      <div class="titolo-riga"><h1>Diario</h1><button class="tondo" data-az="diario-nuovo" aria-label="Aggiungi un piatto">${icona('piu')}</button></div>
      <section class="riquadro">
        <div class="titolo-riga"><b>Sfide del ${chiave.split('-')[0]}</b><span class="meta">${anno.filter(Boolean).length} fatte su ${anno.length}</span></div>
        <div class="anno" aria-hidden="true">${anno.map(f => `<span${f ? ' class="fatta"' : ''}></span>`).join('')}</div>
      </section>
      ${voci.length ? '' : '<p class="nota">Qui finiscono i piatti che cucini: foto, voto e cosa migliorare la prossima volta.</p>'}
      ${migliore ? `
        <button class="riquadro migliore" data-az="diario-modifica" data-id="${migliore.id}">
          ${migliore.foto ? `<img src="${fotoUrl(migliore.foto)}" alt="" loading="lazy">` : ''}
          <span class="occhiello">Il migliore di ${esc(nomeMese(mese))}</span>
          <b>${esc(migliore.piatto)}</b>
          <span class="meta"><span class="stelle" aria-label="${migliore.voto} su 5">${stelle(migliore.voto)}</span>${migliore.note ? ` · ${esc(migliore.note)}` : ''}</span>
        </button>` : ''}
      ${[...mesi].map(([ym, xs]) => `
        <h2 class="sezione">${esc(nomeMese(ym))}</h2>
        <div class="muro">${xs.map(d => `
          <button class="tessera" data-az="diario-modifica" data-id="${d.id}" aria-label="${esc(d.piatto)}, ${d.voto} su 5">
            ${d.foto ? `<img src="${fotoUrl(d.foto, true)}" alt="" loading="lazy">` : `<i aria-hidden="true">${esc(d.piatto.trim()[0]?.toUpperCase() ?? '')}</i>`}
            <span>${esc(d.piatto)}</span>
          </button>`).join('')}</div>`).join('')}`;
  },

  async ricette() {
    if (ricettaAperta) return dettaglioRicetta(await uno('ricette', ricettaAperta));
    const gruppi = perCategoria(await tutti('ricette'));
    if (!gruppi.some(([c]) => c === filtro)) filtro = '';
    return `
      <div class="titolo-riga"><h1>Ricette</h1><button class="tondo" data-az="ricetta-nuova" aria-label="Nuova ricetta">${icona('piu')}</button></div>
      ${gruppi.length ? `
        <input type="search" id="cerca" placeholder="Cerca…" aria-label="Cerca ricetta">
        <div class="filtri">${Object.entries(ETICHETTE).map(([k, nome]) => `<button class="chip" data-az="ricette-etichetta" data-id="${k}" aria-pressed="${etichetteScelte.has(k)}">${nome}</button>`).join('')}</div>
        <div class="filtri">${[['', 'Tutte'], ...gruppi.map(([c]) => [c, c])].map(([c, nome]) => `<button class="chip" data-az="ricette-filtro" data-id="${esc(c)}" aria-pressed="${c === filtro}">${esc(nome)}</button>`).join('')}</div>
        <p class="nota">Kcal e macro per porzione, stimati.</p>`
      : '<p class="nota">Nessuna ricetta. Scrivine una o fattela proporre dallo Chef.</p>'}
      ${gruppi.map(([c, xs]) => `
        <section class="categoria" data-categoria="${esc(c)}">
          <h2 class="sezione">${esc(c)}</h2>
          <div class="griglia">${xs.map(x => {
            const n = passaggi(x.procedimento).length;
            return `<button class="scheda" data-az="ricetta-apri" data-id="${x.id}" data-etichette="${etichetteDi(x).join(',')}">
              ${x.foto ? `<img src="${fotoUrl(x.foto, true)}" alt="" loading="lazy">` : '<span class="senza-foto" aria-hidden="true"></span>'}
              <b>${esc(x.titolo)}</b>${schedaMacro(x, n)}
            </button>`;
          }).join('')}</div>
        </section>`).join('')}`;
  },

  async cucina() {
    const r = cucina.sfida ? { titolo: sfidaCorrente().titolo, procedimento: sfidaCorrente().passi.join('\n') } : await uno('ricette', cucina.id);
    const pas = passaggi(r?.procedimento);
    if (!pas.length) { vista = cucina.sfida ? 'sfida' : 'ricette'; return VISTE[vista](); }
    const i = Math.min(cucina.passo, pas.length - 1);
    const min = minuti(pas[i]);
    return `
      <div class="cucina">
        <div class="titolo-riga"><button class="pillola" data-az="cucina-fine">Fine</button><span class="meta">${esc(r.titolo)}</span></div>
        <div class="titolo-riga"><span class="accento">Passaggio ${i + 1} di ${pas.length}</span><span class="meta" id="schermo">${wakeLock ? 'Schermo acceso' : ''}</span></div>
        <div class="progresso" role="progressbar" aria-label="Avanzamento" aria-valuemin="1" aria-valuemax="${pas.length}" aria-valuenow="${i + 1}">${pas.map((_, k) => `<span${k <= i ? ' class="fatto"' : ''}></span>`).join('')}</div>
        <p class="passo">${esc(pas[i])}</p>
        ${min ? `
          <div class="riquadro timer">
            <div class="quadrante">
              <svg viewBox="0 0 92 92" aria-hidden="true"><circle class="traccia" cx="46" cy="46" r="38"/><circle class="arco" id="arco" cx="46" cy="46" r="38" pathLength="100" stroke-dasharray="100 100"/></svg>
              <b id="timer" role="timer">${mmss(min * 60)}</b>
            </div>
            <button class="secondario" data-az="timer" data-id="${min}">Avvia timer</button>
          </div>` : ''}
        <div class="piede">
          <button class="secondario" data-az="cucina-passo" data-id="-1" ${i === 0 ? 'disabled' : ''}>Indietro</button>
          ${i < pas.length - 1 ? '<button class="primario" data-az="cucina-passo" data-id="1">Avanti</button>' : '<button class="primario" data-az="cucina-finito">Fatto</button>'}
        </div>
      </div>`;
  },

  async chef() {
    return `
      <h1>Chef</h1>
      <p class="nota">Le ricette le propone un’AI (Claude): controlla dosi, tempi e temperature prima di cucinare.</p>
      <form id="chef-form" class="riquadro">
        <label>Cosa hai a disposizione?<textarea name="ingredienti" rows="3" placeholder="es. petto d’anatra, arance, sedano rapa…"></textarea></label>
        <label>Cosa ti va?<input name="richiesta" placeholder="es. secondo per 2, max 2 ore"></label>
        <p class="nota">Attrezzi che userà: ${imp.attrezzi.map(a => esc(ATTREZZI[a])).join(', ') || 'solo cucina di base'}</p>
        <button class="primario">Proponimi una ricetta</button>
      </form>
      <div id="chef-esito"></div>`;
  },

  async impostazioni() {
    return `
      <h1>Opzioni</h1>
      <form id="imp-form">
        <fieldset class="gruppo interruttori"><legend>Attrezzi</legend>
          ${Object.entries(ATTREZZI).map(([k, v]) => `<label><span>${esc(v)}</span><input type="checkbox" switch name="attrezzi" value="${k}" ${imp.attrezzi.includes(k) ? 'checked' : ''}></label>`).join('')}
        </fieldset>
        <p class="nota">Lo Chef e la sfida della settimana usano solo gli attrezzi attivi.</p>
      </form>`;
  },
};

// scheda della griglia: kcal, i tre macro in cifre e la barra; senza valori, passaggi ed etichette
function schedaMacro(x, n) {
  const eti = etichetteDi(x).map(e => ETICHETTE[e]);
  const m = macroDi(x);
  if (!m) return `<span class="meta">${[n && `${n} passaggi`, ...eti].filter(Boolean).join(' · ')}</span>`;
  return `<span class="meta">${[`${m.kcal} kcal`, ...eti].join(' · ')}</span>
    <span class="cifre">${MACRO.map(([k, nome]) => `<span class="${k}">${m[k]} g<small>${nome}</small></span>`).join('')}</span>
    ${barraMacro(m)}`;
}

// riquadro della ricetta: kcal grandi, grammi e quota sulle calorie di ogni macro
function riquadroMacro(r) {
  const m = macroDi(r);
  if (!m) return '';
  return `
    <section class="riquadro valori" aria-label="Valori per porzione">
      <div class="titolo-riga"><b>Per porzione${m.porzioni ? ` <span class="meta">· 1 di ${m.porzioni}</span>` : ''}</b><span class="kcal">${m.kcal} <small>kcal</small></span></div>
      <div class="colonne">${MACRO.map(([k, nome], i) => `
        <div><b class="${k}">${m[k]}<small> g</small></b><span class="traccia"><i class="${k}" style="width: ${m.quote[i]}%"></i></span><span class="meta">${nome[0].toUpperCase() + nome.slice(1)} · ${m.quote[i]}%</span></div>`).join('')}
      </div>
      <p class="nota">Stima dagli ingredienti; la percentuale è sulle calorie.</p>
    </section>`;
}

function dettaglioRicetta(r) {
  if (!r) { ricettaAperta = null; return VISTE.ricette(); }
  const yt = youtubeId(r.video);
  const ing = ingredienti(r.ingredienti);
  const pas = passaggi(r.procedimento);
  const pronti = ing.filter((_, i) => spunte.has(`${r.id}:${i}`)).length;
  return `
    <button class="testuale indietro" data-az="ricetta-indietro">${icona('indietro')} Ricette</button>
    ${r.foto ? `<img class="foto-testa" src="${fotoUrl(r.foto)}" alt="">` : ''}
    ${r.foto_credito ? `<p class="credito">Foto: ${esc(r.foto_credito)}</p>` : ''}
    <h1>${esc(r.titolo)}</h1>
    <p class="meta">${[r.categoria, ...etichetteDi(r).map(e => ETICHETTE[e]), ing.length && `${ing.length} ingredienti`, pas.length && `${pas.length} passaggi`].filter(Boolean).map(esc).join(' · ')}</p>
    ${riquadroMacro(r)}
    ${r.note ? `<section class="riquadro da-sapere" aria-labelledby="da-sapere"><h2 id="da-sapere">${icona('avviso')} Da sapere</h2>${passaggi(r.note).map(p => `<p>${esc(p)}</p>`).join('')}</section>` : ''}
    ${yt ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="Video" allowfullscreen loading="lazy"></iframe></div>` : ''}
    ${ing.length ? `
      <div class="titolo-riga"><h2>Mise en place</h2><span class="meta" id="pronti" role="status">${pronti} su ${ing.length} pronti</span></div>
      <div class="mise">${ing.map((x, i) => `
        <button class="ingrediente" data-az="ingrediente" data-id="${r.id}:${i}" aria-pressed="${spunte.has(`${r.id}:${i}`)}">${x.dose ? `<b>${esc(x.dose)}</b>` : ''}<span>${esc(x.nome)}</span></button>`).join('')}
      </div>` : ''}
    ${pas.length ? `
      <button class="primario" data-az="cucina-apri" data-id="${r.id}">${icona('play')} Modalità cucina</button>
      <h2>Procedimento</h2>
      <ol class="passaggi">${pas.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
    <button class="secondario" data-az="ricetta-cucinata" data-id="${r.id}">L’ho cucinata: aggiungi al diario</button>
    <div class="azioni-riga">
      <button class="testuale" data-az="ricetta-modifica" data-id="${r.id}">Modifica</button>
      <button class="testuale" data-az="ricetta-foto-ai" data-id="${r.id}">${r.foto ? 'Nuova foto AI' : 'Genera foto AI'}</button>
    </div>
    <p class="nota" id="foto-ai-stato" role="status"></p>
    <button class="testuale pericolo elimina" data-az="ricetta-elimina" data-id="${r.id}">Elimina ricetta</button>`;
}

// ---------- modalità cucina: timer e schermo acceso ----------

let wakeLock = null;
async function tieniAcceso() {
  try { wakeLock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { wakeLock = null; }
  const e = $('#schermo');
  if (e) e.textContent = wakeLock ? 'Schermo acceso' : '';
}
function rilascia() { wakeLock?.release().catch(() => {}); wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && vista === 'cucina') tieniAcceso(); });

// shortcut: a schermo bloccato iOS sospende la pagina, il suono arriva solo al ritorno; per un avviso vero servirebbe una notifica push
let timer = null; // { fine, tot, intervallo }
let audio = null;
function fermaTimer() { if (timer) clearInterval(timer.intervallo); timer = null; }
function suona() {
  navigator.vibrate?.([200, 100, 200]);
  if (!audio) return;
  for (let k = 0; k < 3; k++) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.2;
    o.connect(g).connect(audio.destination);
    const t = audio.currentTime + k * 0.4;
    o.start(t);
    o.stop(t + 0.2);
  }
}
function avviaTimer(min, bottone) {
  if (timer) { fermaTimer(); bottone.textContent = 'Avvia timer'; $('#timer').textContent = mmss(min * 60); $('#arco').style.strokeDashoffset = 0; return; }
  // l'audio di iOS si sblocca solo dentro un tocco
  audio ??= new AudioContext();
  audio.resume();
  bottone.textContent = 'Ferma';
  const tot = min * 60000;
  timer = { fine: Date.now() + tot, tot };
  const giro = () => {
    const t = $('#timer');
    if (!t) return fermaTimer();
    const resto = Math.max(0, timer.fine - Date.now());
    t.textContent = resto ? mmss(Math.ceil(resto / 1000)) : 'Tempo!';
    $('#arco').style.strokeDashoffset = 100 * (1 - resto / tot);
    if (!resto) { fermaTimer(); bottone.textContent = 'Avvia timer'; suona(); }
  };
  timer.intervallo = setInterval(giro, 250);
}

function esciDaCucina() {
  fermaTimer();
  rilascia();
  if (cucina.sfida) { vista = 'sfida'; return; }
  vista = 'ricette';
  ricettaAperta = cucina.id;
}

// ---------- moduli (dialog) ----------

// il foglio si chiude anche trascinandolo giù dalla testata, come su iOS
{
  const dlg = $('#modulo');
  let inizio = null;
  dlg.addEventListener('touchstart', e => { inizio = e.target.closest('.testata') ? e.touches[0].clientY : null; }, { passive: true });
  dlg.addEventListener('touchmove', e => { if (inizio != null) dlg.style.transform = `translateY(${Math.max(0, e.touches[0].clientY - inizio)}px)`; }, { passive: true });
  dlg.addEventListener('touchend', e => {
    if (inizio == null) return;
    const giu = e.changedTouches[0].clientY - inizio;
    inizio = null;
    dlg.style.transform = '';
    if (giu > 100) dlg.close();
  });
}

function apriModulo(titolo, campi, alSalvataggio) {
  const dlg = $('#modulo');
  dlg.innerHTML = `<form method="dialog">
    <div class="testata"><button value="annulla" formnovalidate>Annulla</button><h2 tabindex="-1" autofocus>${esc(titolo)}</h2><button value="ok">Salva</button></div>
    ${campi}</form>`;
  const form = dlg.querySelector('form');
  form.onsubmit = async e => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    e.submitter.disabled = true;
    try {
      await alSalvataggio(form);
      dlg.close();
      disegna();
    } catch (err) {
      e.submitter.disabled = false;
      alert('Errore nel salvataggio: ' + err.message);
    }
  };
  dlg.showModal();
}

function moduloDiario(d = {}) {
  apriModulo(d.id ? 'Modifica piatto' : 'Nuovo piatto', `
    <label>Piatto<input name="piatto" required value="${esc(d.piatto)}"></label>
    <label>Data<input name="data" type="date" required value="${esc(d.data || oggi())}"></label>
    ${campoFoto(d.foto)}
    <label>Voto<select name="voto">${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${n === (d.voto || 3) ? 'selected' : ''}>${stelle(n)}</option>`).join('')}</select></label>
    <label>Note (cosa è venuto bene, cosa migliorare)<textarea name="note" rows="4">${esc(d.note)}</textarea></label>
    ${d.id ? `<button type="button" class="testuale pericolo" data-az="diario-elimina" data-id="${d.id}">Elimina piatto</button>` : ''}`,
  async f => salva('diario', {
    ...d,
    id: d.id || nuovoId(),
    piatto: f.piatto.value.trim(),
    data: f.data.value,
    voto: +f.voto.value,
    note: f.note.value.trim(),
    foto: await fotoDaForm(f, d.foto),
  }));
}

function moduloRicetta(r = {}) {
  apriModulo(r.id ? 'Modifica ricetta' : 'Nuova ricetta', `
    <label>Titolo<input name="titolo" required value="${esc(r.titolo)}"></label>
    <label>Categoria<input name="categoria" list="categorie" value="${esc(r.categoria)}"><datalist id="categorie">${CATEGORIE.map(c => `<option value="${c}">`).join('')}</datalist></label>
    <fieldset class="gruppo interruttori"><legend>Etichette</legend>
      ${Object.entries(ETICHETTE).map(([k, nome]) => `<label><span>${nome}</span><input type="checkbox" switch name="etichette" value="${k}" ${etichetteDi(r).includes(k) ? 'checked' : ''}></label>`).join('')}
    </fieldset>
    <fieldset class="numeri"><legend>Per porzione (stima)</legend>
      ${[['porzioni', 'Porzioni'], ['kcal', 'Kcal'], ['proteine', 'Proteine g'], ['carboidrati', 'Carbo g'], ['grassi', 'Grassi g']].map(([k, nome]) => `<label>${nome}<input name="${k}" type="number" inputmode="numeric" min="${k === 'porzioni' ? 1 : 0}" step="1" value="${r[k] ?? ''}"></label>`).join('')}
    </fieldset>
    <label>Ingredienti (uno per riga, es. «320 g riso Carnaroli»)<textarea name="ingredienti" rows="6">${esc(r.ingredienti)}</textarea></label>
    <label>Procedimento (un passaggio per riga: «18 minuti» diventa un timer)<textarea name="procedimento" rows="8">${esc(r.procedimento)}</textarea></label>
    <label>Da sapere (sicurezza, dove trovare gli ingredienti)<textarea name="note" rows="3">${esc(r.note)}</textarea></label>
    <label>Link video YouTube<input name="video" type="url" value="${esc(r.video)}" placeholder="https://youtu.be/…"></label>
    ${campoFoto(r.foto)}`,
  async f => {
    const id = r.id || nuovoId();
    await salva('ricette', {
      ...r,
      id,
      titolo: f.titolo.value.trim(),
      categoria: f.categoria.value.trim(),
      etichette: [...f.querySelectorAll('[name=etichette]:checked')].map(c => c.value).join(','),
      ...Object.fromEntries(['porzioni', 'kcal', 'proteine', 'carboidrati', 'grassi'].map(k => [k, f[k].value === '' ? null : +f[k].value])),
      ingredienti: f.ingredienti.value.trim(),
      procedimento: f.procedimento.value.trim(),
      note: f.note.value.trim(),
      video: f.video.value.trim(),
      foto: await fotoDaForm(f, r.foto),
      foto_credito: f.foto.files[0] ? '' : r.foto_credito, // una foto propria non ha bisogno di credito
    });
    ricettaAperta = id;
  });
}

// ---------- azioni ----------

const AZIONI = {
  'sfida-fatta': () => moduloDiario({ piatto: sfidaCorrente().titolo, sfida: sfidaCorrente().titolo, settimana: settimana() }),
  'sfida-cambia': () => {
    const w = settimana();
    imp.salti = { [w]: (imp.salti[w] || 0) + 1 }; // tiene solo la settimana corrente
    salvaImpostazioni();
    disegna();
  },
  'diario-nuovo': () => moduloDiario(),
  'diario-modifica': async id => moduloDiario(await uno('diario', id)),
  'diario-elimina': async id => { if (confirm('Eliminare questo piatto dal diario?')) { await elimina('diario', id); $('#modulo').close(); disegna(); } },
  'ricetta-nuova': () => moduloRicetta(),
  'ricetta-apri': id => { vista = 'ricette'; ricettaAperta = id; disegna(); },
  'ricetta-indietro': () => { ricettaAperta = null; disegna(); },
  'ricetta-modifica': async id => moduloRicetta(await uno('ricette', id)),
  'ricetta-elimina': async id => { if (confirm('Eliminare questa ricetta?')) { await elimina('ricette', id); ricettaAperta = null; disegna(); } },
  'ricetta-cucinata': async id => moduloDiario({ piatto: (await uno('ricette', id)).titolo }),
  ingrediente: (k, b) => {
    spunte.has(k) ? spunte.delete(k) : spunte.add(k);
    b.setAttribute('aria-pressed', spunte.has(k));
    const tutti = [...document.querySelectorAll('.ingrediente')];
    $('#pronti').textContent = `${tutti.filter(x => x.getAttribute('aria-pressed') === 'true').length} su ${tutti.length} pronti`;
  },
  'cucina-apri': async id => { cucina = { id, passo: 0 }; vista = 'cucina'; await disegna(); tieniAcceso(); },
  'cucina-passo': d => { fermaTimer(); cucina.passo = Math.max(0, cucina.passo + +d); disegna(); },
  'cucina-fine': () => { esciDaCucina(); disegna(); },
  'cucina-finito': async () => { esciDaCucina(); await disegna(); cucina.sfida ? AZIONI['sfida-fatta']() : AZIONI['ricetta-cucinata'](cucina.id); },
  'cucina-sfida': async () => { cucina = { sfida: true, passo: 0 }; vista = 'cucina'; await disegna(); tieniAcceso(); },
  timer: (min, b) => avviaTimer(+min, b),
  riprova: () => disegna(),
  'chef-salva': async (_, b) => {
    b.disabled = true;
    b.textContent = 'Salvo e genero la foto…';
    await salvaProposta(ultimaProposta, ultimaProposta.titolo, 'Dallo Chef').catch(err => { b.textContent = `Errore: ${err.message}`; b.disabled = false; });
  },
  'sfida-ricetta': async (_, b) => {
    const s = sfidaCorrente();
    b.disabled = true;
    $('#sfida-stato').textContent = 'Lo chef scrive la ricetta della sfida, poi genero la foto: meno di un minuto.';
    try {
      const p = await api('POST', 'chef', { ingredienti: s.mise.join(', '), richiesta: `Ricetta completa per la sfida "${s.titolo}": ${s.testo}`.slice(0, 500), attrezzi: s.attrezzi.map(a => ATTREZZI[a]) });
      await salvaProposta(p, s.titolo, 'Sfide');
    } catch (err) {
      $('#sfida-stato').textContent = `Errore: ${err.message}`;
      b.disabled = false;
    }
  },
  'ricetta-foto-ai': async (id, b) => {
    const r = await uno('ricette', id);
    if (r.foto && r.foto_credito !== CREDITO_AI && !confirm('Sostituire la foto attuale con una generata?')) return;
    b.disabled = true;
    $('#foto-ai-stato').textContent = 'Genero la foto: circa 10 secondi.';
    try {
      await salva('ricette', { ...r, foto: await generaFoto(r.titolo, r.ingredienti), foto_credito: CREDITO_AI });
      disegna();
    } catch (err) {
      $('#foto-ai-stato').textContent = `Errore: ${err.message}`;
      b.disabled = false;
    }
  },
  'chef-altra': () => $('#chef-form').requestSubmit(),
  'ricette-filtro': c => {
    filtro = c;
    $('#cerca').value = '';
    document.querySelectorAll('[data-az=ricette-filtro]').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === c));
    applicaFiltri();
  },
  'ricette-etichetta': (k, b) => {
    etichetteScelte.has(k) ? etichetteScelte.delete(k) : etichetteScelte.add(k);
    b.setAttribute('aria-pressed', etichetteScelte.has(k));
    applicaFiltri();
  },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-az]');
  if (b) AZIONI[b.dataset.az](b.dataset.id, b);
});

document.addEventListener('change', e => {
  const k = e.target.dataset.spunta;
  if (k) e.target.checked ? spunte.add(k) : spunte.delete(k);
  // gli interruttori delle opzioni valgono subito, come su iOS
  if (e.target.name === 'attrezzi') {
    imp.attrezzi = [...document.querySelectorAll('[name=attrezzi]:checked')].map(c => c.value);
    salvaImpostazioni();
  }
  // anteprima della foto scelta nei moduli
  if (e.target.name === 'foto' && e.target.files[0]) {
    const campo = e.target.closest('.scegli-foto');
    const img = campo.querySelector('img') ?? campo.insertAdjacentElement('afterbegin', Object.assign(document.createElement('img'), { alt: '' }));
    img.src = URL.createObjectURL(e.target.files[0]);
    campo.querySelector('span').textContent = 'Cambia foto';
  }
});

// la ricerca guarda in tutte le categorie (il filtro torna quando il campo si svuota); le etichette valgono sempre
function applicaFiltri() {
  const q = $('#cerca')?.value.toLowerCase() ?? '';
  document.querySelectorAll('.categoria').forEach(s => {
    const schede = [...s.querySelectorAll('.scheda')];
    schede.forEach(x => {
      const sue = x.dataset.etichette.split(',');
      x.hidden = !x.querySelector('b').textContent.toLowerCase().includes(q) || [...etichetteScelte].some(e => !sue.includes(e));
    });
    s.hidden = schede.every(x => x.hidden) || (!q && filtro && s.dataset.categoria !== filtro);
  });
}

document.addEventListener('input', e => { if (e.target.id === 'cerca') applicaFiltri(); });

// foto arrivata: si ferma il riflesso del segnaposto (load non risale: serve la cattura)
document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('arrivata'); }, true);

document.addEventListener('submit', async e => {
  if (e.target.id === 'chef-form') {
    e.preventDefault();
    chiediAlloChef(e.target);
  }
});

// ---------- Chef AI ----------

let ultimaProposta = null;

// salva una proposta dello Chef nel ricettario con una foto AI; senza foto se la generazione fallisce (es. quota finita)
async function salvaProposta(p, titolo, categoria) {
  const ingr = p.ingredienti.join('\n');
  const foto = await generaFoto(titolo, ingr).catch(() => null);
  const id = nuovoId();
  await salva('ricette', {
    id,
    titolo,
    categoria,
    ingredienti: ingr,
    procedimento: [...p.passaggi, `Impiattamento: ${p.impiattamento}`].join('\n'),
    video: '',
    foto,
    foto_credito: foto ? CREDITO_AI : '',
    porzioni: p.porzioni ?? null,
    kcal: p.kcal ?? null,
    proteine: p.proteine ?? null,
    carboidrati: p.carboidrati ?? null,
    grassi: p.grassi ?? null,
  });
  vista = 'ricette';
  ricettaAperta = id;
  disegna();
}

async function chiediAlloChef(form) {
  const esito = $('#chef-esito');
  const bottone = form.querySelector('button');
  bottone.disabled = true;
  esito.innerHTML = '<p class="nota" role="status">Lo chef sta scegliendo la tecnica e scrivendo la ricetta. Di solito ci vuole meno di un minuto.</p>';
  try {
    ultimaProposta = await api('POST', 'chef', {
      ingredienti: form.ingredienti.value.trim(),
      richiesta: form.richiesta.value.trim(),
      attrezzi: imp.attrezzi.map(a => ATTREZZI[a]),
    });
    const p = ultimaProposta;
    esito.innerHTML = `
      <article class="riquadro">
        <h2>${esc(p.titolo)}</h2>
        <p>${esc(p.descrizione)}</p>
        <p class="meta">${[p.tempo, p.kcal && `${p.kcal} kcal a porzione`].filter(Boolean).map(esc).join(' · ')}</p>
        <h3>Ingredienti</h3><ul>${p.ingredienti.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <h3>Procedimento</h3><ol>${p.passaggi.map(i => `<li>${esc(i)}</li>`).join('')}</ol>
        <h3>Impiattamento</h3><p>${esc(p.impiattamento)}</p>
        <button class="primario" data-az="chef-salva">Salva nel ricettario</button>
        <button class="secondario" data-az="chef-altra">Proponine un’altra</button>
      </article>`;
  } catch (err) {
    esito.innerHTML = `<p class="errore">Errore: ${esc(err.message)}</p>`;
  } finally {
    bottone.disabled = false;
  }
}

// ---------- avvio ----------

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') memoria.clear(); });

if ('serviceWorker' in navigator) {
  // iOS tiene viva la pagina tra un cambio d'app e l'altro: a ogni ritorno cerca un deploy nuovo (come radar-eventi)
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  // sw.js nuovo attivato (skipWaiting + claim): ricarica una volta per usare il codice nuovo; non alla prima installazione
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
disegna();
