// Sfide settimanali. attrezzi: [] = basta una cucina normale.
// Temperature sottovuoto: valori classici di riferimento, controllali comunque prima di cucinare.

export const ATTREZZI = {
  roner: 'Roner (sottovuoto)',
  biberon: 'Biberon da impiattamento',
  sifone: 'Sifone (ISI)',
  cannello: 'Cannello',
  mandolina: 'Mandolina',
  termometro: 'Termometro a sonda',
};

export const SFIDE = [
  { titolo: 'Uovo a 63°', attrezzi: ['roner'], testo: 'Uovo intero nel guscio a 63 °C per 45–60 minuti. Servilo su una crema di patate o di topinambur, con qualcosa di croccante sopra.', cerca: 'uovo 63 gradi sous vide' },
  { titolo: 'Tagliata perfetta', attrezzi: ['roner'], testo: 'Controfiletto a 55 °C per 1–2 ore, poi rosolatura fortissima in padella rovente, 40 secondi per lato. Rosa uniforme da bordo a bordo.', cerca: 'controfiletto sous vide rosolatura' },
  { titolo: 'Salmone traslucido', attrezzi: ['roner'], testo: 'Trancio a 48 °C per 30–40 minuti: carne quasi cremosa. Pesce già abbattuto (non sale a temperature di pastorizzazione).', cerca: 'salmone sous vide 48 gradi' },
  { titolo: 'Polpo tenerissimo', attrezzi: ['roner'], testo: 'Polpo a 77 °C per 5 ore, poi una scottata sulla griglia o sulla piastra. Abbinalo a una crema di patate affumicata.', cerca: 'polpo sous vide' },
  { titolo: 'Guancia da 24 ore', attrezzi: ['roner'], testo: 'Guancia di manzo a 68 °C per 24 ore, poi lucidata con il suo fondo ridotto. Dura da organizzare, ma ne vale la pena.', cerca: 'guancia di manzo sous vide' },
  { titolo: 'Verdure laccate', attrezzi: ['roner'], testo: 'Carote baby a 85 °C per 45–60 minuti con burro e un pizzico di zucchero, poi laccate in padella con il liquido della busta.', cerca: 'carote sous vide glassate' },
  { titolo: 'Filetto di maiale rosa', attrezzi: ['roner'], testo: 'Filetto a 60 °C per 1 ora e mezza, poi rosolato. Accompagnalo con una salsa alla senape e mela.', cerca: 'filetto di maiale sous vide' },
  { titolo: 'Puntinismo', attrezzi: ['biberon'], testo: 'Due salse di colori diversi, punti di tre misure. Impiatta tre volte lo stesso piatto e fotografa la versione migliore.', cerca: 'impiattamento punti salsa biberon' },
  { titolo: 'Gel fluido con agar', attrezzi: ['biberon'], testo: 'Succo o riduzione con l’1% di agar: bolli 2 minuti, lascia rapprendere, poi frulla fino a renderlo lucido. Mettilo nel biberon e decora.', cerca: 'gel fluido agar agar' },
  { titolo: 'Swoosh', attrezzi: ['biberon'], testo: 'Un punto di purè liscio trascinato con il dorso di un cucchiaio. Provalo dieci volte su un piatto di prova prima di quello vero.', cerca: 'swoosh impiattamento cucchiaio' },
  { titolo: 'Espuma di parmigiano', attrezzi: ['sifone'], testo: 'Panna e parmigiano scaldati, filtrati, poi nel sifone con 1–2 cariche. Servila tiepida su un risotto o su asparagi.', cerca: 'espuma parmigiano sifone' },
  { titolo: 'Spuma fredda di frutta', attrezzi: ['sifone'], testo: 'Purea di frutta con un po’ di panna o di gelatina. Sifone in frigo per qualche ora. Dessert in bicchiere a tre strati.', cerca: 'spuma sifone frutta' },
  { titolo: 'Crème brûlée', attrezzi: ['cannello'], testo: 'Crema classica, crosta di zucchero sottile e uniforme fatta con il cannello. Bonus: aromatizzala alla lavanda o alla fava tonka.', cerca: 'creme brulee cannello' },
  { titolo: 'Sgombro scottato', attrezzi: ['cannello'], testo: 'Filetto di sgombro marinato, pelle fiammata con il cannello. Accompagna con qualcosa di acido: cetriolo, mela verde, rafano.', cerca: 'sgombro marinato cannello' },
  { titolo: 'Carpaccio vegetale', attrezzi: ['mandolina'], testo: 'Barbabietole di colori diversi, ravanelli e finocchio tagliati sottilissimi. Disponili a rosone, con una vinaigrette agli agrumi.', cerca: 'carpaccio barbabietole mandolina' },
  { titolo: 'Chips al forno', attrezzi: ['mandolina'], testo: 'Patate o topinambur a fette da 1 mm, in forno a 150 °C fino a che sono croccanti. Usale per dare struttura a un piatto morbido.', cerca: 'chips al forno mandolina' },
  { titolo: 'Crema inglese al grado', attrezzi: ['termometro'], testo: 'Porta la crema a 82–84 °C, non oltre: vellutata, senza grumi. Diventa la base di un gelato o di una salsa per un dolce.', cerca: 'crema inglese temperatura' },
  { titolo: 'Temperaggio del cioccolato', attrezzi: ['termometro'], testo: 'Fondente: 45–50 °C, poi giù a 27–28 °C, poi su a 31–32 °C. Fai delle decorazioni lucide e che si spezzano con uno schiocco.', cerca: 'temperaggio cioccolato fondente' },
  { titolo: 'Beurre blanc', attrezzi: [], testo: 'Riduzione di vino e scalogno, poi burro freddo a cubetti, montato fuori dal fuoco. La salsa da pesce che non tradisce.', cerca: 'beurre blanc' },
  { titolo: 'Un ingrediente, tre consistenze', attrezzi: [], testo: 'Scegli un ingrediente (zucca, piselli, mela…) e servilo in tre modi: crema, croccante, crudo. Un piatto solo.', cerca: 'ingrediente tre consistenze' },
  { titolo: 'Fondo bruno', attrezzi: [], testo: 'Ossa arrostite, verdure, lunga riduzione. Congelalo nei cubetti del ghiaccio: è la base di tutte le salse dei prossimi mesi.', cerca: 'fondo bruno' },
  { titolo: 'Tuile croccante', attrezzi: [], testo: 'Una tuile (al corallo, al parmigiano o al sesamo) che dia altezza al piatto. Il piatto si guarda anche di lato.', cerca: 'tuile corallo' },
  { titolo: 'Pasta fresca ripiena', attrezzi: [], testo: 'Ravioli o tortelli con un ripieno insolito, serviti con un brodo chiaro o un burro nocciola.', cerca: 'ravioli pasta fresca ripieno' },
  { titolo: 'Risotto mantecato all’onda', attrezzi: [], testo: 'Brodo fatto in casa, tostatura, mantecatura fuori dal fuoco. Deve muoversi a onda nel piatto.', cerca: 'risotto all onda mantecatura' },
];
