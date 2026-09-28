// Stijlprofiel van Tessa, afgeleid van het Pinterest-bord "outfits cl" (pinterest.com/taldback/outfits-cl).
// Kern: kleurrijk-eclectisch. Leopard als neutrale basis, wijde broeken, kleurclash,
// oversized strepen en knits, retro sneakers in kleur, gouden hoops en een sjaaltje.
//
// Elke formule is een outfit-recept. Het dashboard kiest elke dag een formule die past bij
// de gevoelstemperatuur (t = gemiddelde van ochtend en namiddag) en bij werk- of vrije dag.
//   t:      [min, max] in °C
//   when:   'work' (vooral voor werkdagen), 'free' (vrije dag) of 'both'
//   colors: kleurstalen om te tonen
//   pin:    zoektermen voor Pinterest (Engels geeft de beste resultaten)
//   suede:  schoenen in suède/stof — bij regen stelt het dashboard iets anders voor

export const STYLE_BOARD = 'https://www.pinterest.com/taldback/outfits-cl/';

export const STYLE_SUMMARY = 'Kleurrijk & eclectisch: leopard als basis, wijde broeken, kleurclash, retro sneakers.';

export const STYLE_FORMULAS = [
  {
    id: 'leo-groen', name: 'Leopard × grasgroen', t: [4, 16], when: 'both',
    colors: ['#b58a5f', '#2e8b4a', '#f4f1ea'],
    items: ['leopard wide-leg jeans', 'grasgroene sweater', 'gestreept hemd eronder (kraag en manchet eruit)', 'witte dad sneakers', 'groene tas'],
    pin: 'leopard wide leg jeans green sweater striped shirt layered outfit',
  },
  {
    id: 'leo-rood', name: 'Leopard × rood', t: [4, 15], when: 'free',
    colors: ['#b58a5f', '#d8262e', '#f4f1ea'],
    items: ['leopard wide-leg jeans', 'rode trui', 'graphic tee eronder', 'rode retro sneakers', 'zwarte schoudertas', 'gouden hoops'],
    pin: 'leopard jeans red sweater graphic tee red sambas outfit', suede: true,
  },
  {
    id: 'leo-olijf', name: 'Leopard × olijf', t: [13, 22], when: 'both',
    colors: ['#b58a5f', '#7a8c2a', '#ffffff'],
    items: ['leopard wide-leg jeans', 'olijfgroene gebreide spencer', 'wit t-shirt eronder', 'olijfgroene retro sneakers', 'gouden hoops en ringen'],
    pin: 'leopard jeans green knit vest white tee spezial outfit', suede: true,
  },
  {
    id: 'leo-rock', name: 'Leopard × rock', t: [14, 24], when: 'free',
    colors: ['#b58a5f', '#4a4a4a', '#f2a1c7'],
    items: ['vintage band-tee', 'leopard barrel jeans', 'roze loafers', 'roze haarklem', 'gekleurde zonnebril'],
    pin: 'leopard barrel jeans band tee pink loafers outfit',
  },
  {
    id: 'leo-denim', name: 'Leopard × denim', t: [19, 32], when: 'free',
    colors: ['#b58a5f', '#6d8fb8', '#161514'],
    items: ['denim gilet', 'leopard wide-leg jeans', 'chunky zwarte sandalen', 'zwarte hobo-tas', 'gouden kettinkjes', 'zonnebril'],
    pin: 'denim vest leopard jeans summer outfit',
  },
  {
    id: 'streep', name: 'Oversized streep', t: [12, 22], when: 'both',
    colors: ['#1f6b3a', '#8fb0d8', '#f4f1ea'],
    items: ['oversized gestreept hemd (groen of bruin)', 'wide-leg of barrel jeans', 'groene retro sneakers', 'canvas tote', 'gouden hoops'],
    pin: 'oversized striped shirt wide leg jeans green sambas tote outfit', suede: true,
  },
  {
    id: 'roze-olijf', name: 'Kleurclash roze × olijf', t: [14, 26], when: 'both',
    colors: ['#e0428f', '#8a8f2a', '#a8703c'],
    items: ['fuchsia hemd', 'olijfgroene wijde broek', 'bandana in het haar of rond de nek', 'loafers of ballerina’s', 'rieten tas', 'kralenketting'],
    pin: 'pink shirt olive trousers head scarf loafers outfit',
  },
  {
    id: 'lila-chartreuse', name: 'Lila × chartreuse', t: [14, 24], when: 'work',
    colors: ['#b39ddb', '#b5b82a', '#7b3fa0'],
    items: ['lila oversized hemd', 'chartreuse barrel broek', 'paarse riem', 'paarse mini-tas', 'sandaaltjes met hakje'],
    pin: 'lilac shirt chartreuse barrel pants purple bag outfit',
  },
  {
    id: 'grijs-limoen', name: 'Grijze pantalon × limoen', t: [5, 16], when: 'work',
    colors: ['#7d7d7d', '#b8c93a', '#7a1f2b'],
    items: ['grijze wijde pantalon', 'limoengroene knit met rits', 'wit t-shirt', 'bordeaux retro sneakers', 'bordeaux schoudertas', 'gouden horloge'],
    pin: 'grey wide leg trousers lime zip knit burgundy sneakers outfit', suede: true,
  },
  {
    id: 'gingham', name: 'Gingham & grove knit', t: [9, 18], when: 'both',
    colors: ['#c93a3a', '#f4f1ea', '#9a9a92'],
    items: ['rood-witte gingham broek', 'grijze grove knit', 'witte tanktop eronder', 'suède clogs', 'net- of haaktas', 'kralenarmband'],
    pin: 'red gingham pants grey knit sweater boston clogs outfit', suede: true,
  },
  {
    id: 'chartreuse-rok', name: 'Chartreuse rok', t: [14, 22], when: 'work',
    colors: ['#b5b82a', '#2b2b2b', '#e9b8c8'],
    items: ['chartreuse gebreide midirok', 'streep-cardigan met korte mouw', 'crème tanktop', 'roze platform-sneakers', 'cognac ronde tas', 'tortoise zonnebril'],
    pin: 'chartreuse knit midi skirt striped cardigan gazelle outfit', suede: true,
  },
  {
    id: 'kobalt', name: 'Kobalt & ruit', t: [10, 20], when: 'free',
    colors: ['#2448c8', '#8fb0e8', '#f2d23c'],
    items: ['kobaltblauwe blouse of tee', 'geruite of gestreepte wijde broek', 'dad sneakers', 'gele statement-tas', 'kobalt sokken'],
    pin: 'cobalt blue top gingham wide pants dad sneakers colorful outfit',
  },
  {
    id: 'varsity', name: 'Varsity statement', t: [3, 13], when: 'free',
    colors: ['#6e1f2e', '#f4f1ea', '#c9ccd2'],
    items: ['bordeaux varsity jacket', 'tweed- of patroonrok', 'zilveren cowboylaarzen', 'gele tas', 'sjaaltje rond de nek'],
    pin: 'burgundy varsity jacket tweed skirt silver cowboy boots outfit',
  },
];
