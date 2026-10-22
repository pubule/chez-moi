// "Da sapere" delle ricette del seed: sicurezza alimentare e ingredienti difficili da trovare.
// Una riga per paragrafo. Il seed le scrive solo dove la nota è ancora vuota.
const PESCE = 'Pesce crudo: solo abbattuto (−20 °C per 24 ore o −35 °C per 15 ore) contro l’anisakis, anche se lo compri fresco. Chiedilo già abbattuto al pescivendolo. Sconsigliato in gravidanza, ai bambini e a chi ha difese basse.';
const CARNE = 'Carne cruda: compra il pezzo intero da un macellaio di fiducia, battilo o affettalo tu al momento e tienilo in frigo fino all’ultimo. Sconsigliata in gravidanza, ai bambini e a chi ha difese basse.';
const UOVO = 'Uovo crudo: usa uova freschissime, tieni in frigo e consuma entro 2 giorni. Sconsigliato in gravidanza, ai bambini e a chi ha difese basse.';
const ALBUME = 'Albume crudo: usa uova freschissime oppure albume pastorizzato in brick, che monta uguale.';
const TUORLO_MORBIDO = 'Tuorlo poco cotto: sconsigliato in gravidanza e ai bambini piccoli.';
const EMULSIONE_CALDA = 'Tuorli cotti poco: servila subito, non conservarla e non riscaldarla.';

export default {
  // pesce crudo o appena scottato
  'Salmone, aneto e pepe rosa': `${PESCE}\nCon il salmone affumicato non serve abbatterlo.`,
  'Tartare di salmone su finocchio a bassa temperatura': PESCE,
  'Tartare di gambero su tartare di mango': PESCE,
  'Poke bowl di salmone': PESCE,
  'Salmone a 45 °C': `${PESCE}\nA 45 °C il salmone non è pastorizzato: per questo deve essere abbattuto.`,
  'Sgombro scottato al cannello': `${PESCE}\nLo sgombro è tra i pesci più a rischio: non saltare l’abbattimento.`,
  'Tonno scottato al sesamo': `${PESCE}\nIl cuore resta crudo.`,
  'Crudo di gamberi rossi': PESCE,
  'Carpaccio di ricciola agli agrumi': PESCE,
  'Tartare di tonno': PESCE,
  'Ostriche con mignonette': 'Ostriche vive: comprale con l’etichetta sanitaria, chiuse e pesanti. Tienile in frigo coperte da un panno umido e mangiale il giorno stesso; scarta quelle aperte che non si chiudono se le tocchi.\nAprile con un guanto da ostriche: la lama scivola facilmente.\nSconsigliate in gravidanza, ai bambini e a chi ha difese basse.',

  // carne cruda
  'Tartare con salsa di peperoni e cetriolo': CARNE,
  'Tartare senape, scalogno e cognac': CARNE,
  'Tartare al limone e pepe verde': CARNE,
  'Carpaccio di manzo, rucola, grana e datteri': CARNE,
  'Tartare di carne salà': 'La carne salà è salata ma non cotta: vale come carne cruda. Sconsigliata in gravidanza, ai bambini e a chi ha difese basse.',
  'Carne salà con salsa verde e crostino': 'La carne salà è salata ma non cotta: vale come carne cruda. Sconsigliata in gravidanza, ai bambini e a chi ha difese basse.',

  // uova crude o poco cotte
  'Maionese': UOVO,
  'Aioli': UOVO,
  'Salsa per fritto con maionese e capperi': `${UOVO}\nCon la maionese confezionata il problema non c’è.`,
  'Tiramisù': `${UOVO}\nPer pastorizzare i tuorli: scalda lo zucchero con 30 ml d’acqua fino a 121 °C e versalo a filo sui tuorli mentre li monti.`,
  'Whiskey Sour': ALBUME,
  'Aperol Sour': ALBUME,
  'Clover Club': ALBUME,
  'Salsa olandese': EMULSIONE_CALDA,
  'Salsa bernese': EMULSIONE_CALDA,
  'Uovo a 63 °C': TUORLO_MORBIDO,
  'Spuma di patate con uovo a 63 °C': TUORLO_MORBIDO,
  'Uovo pochè con crema di parmigiano': TUORLO_MORBIDO,
  'Uova alla Benedict': `${TUORLO_MORBIDO}\n${EMULSIONE_CALDA}`,
  'Avocado toast con uovo pochè': TUORLO_MORBIDO,

  // ingredienti da ordinare
  'Piccione rosa con salsa al vino': 'Il piccione da carne si trova quasi solo dal macellaio o dal pollivendolo, su ordinazione qualche giorno prima.\nSi mangia rosa, come l’anatra.',
  'Filetto alla Rossini': 'Il foie gras fresco si ordina in gastronomia o dal macellaio, qualche giorno prima. Tienilo in frigo fino all’ultimo: in padella si scioglie in pochi secondi.',
  'Tagliolini al tartufo': 'Il tartufo bianco c’è da ottobre a dicembre, il nero pregiato da dicembre a marzo, lo scorzone d’estate. Conservalo in frigo avvolto in carta assorbente, da cambiare ogni giorno, e usalo entro 5 giorni.',
};
