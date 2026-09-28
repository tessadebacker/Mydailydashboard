# My Daily — setup

Een statische website (`index.html` + `style.css` + `script.js`) op GitHub Pages, die je als
app op je beginscherm zet. Zonder build-tools en zonder server.

- **Weer**: [Open-Meteo](https://open-meteo.com) (gratis, geen API-key nodig).
- **Agenda's**: een klein **Google Apps Script** dat jij zelf in je Google-account zet. Het
  geeft je agenda's door aan het dashboard, beveiligd met een geheime token.
- **Privacy**: je koppelingen en je token worden **enkel op je toestel** bewaard
  (localStorage) en nooit in deze publieke repo. Zolang je niets koppelt, toont het
  dashboard demo-afspraken.

---

## 1. GitHub Pages aanzetten (eenmalig)

1. De repo moet op **Public** staan (voor gratis Pages).
2. Ga naar **Settings → Pages → Build and deployment**.
   Source: **Deploy from a branch**. Branch: **main** (of de branch met deze code), map **/ (root)**. Klik **Save**.
3. Na ongeveer een minuut staat de app op `https://tessadebacker.github.io/Mydailydashboard/`.

`.nojekyll` staat al in de repo.

## 2. Agenda-koppeling maken (Google Apps Script)

Je werkagenda zit in je **RetailSonar-account**, de agenda's **Tessa** en **Lorenzo** in je
**persoonlijke** Google-account. Je maakt dus twee kleine scripts, één per account. Het dashboard
voegt ze samen. Het kan volledig op je iPhone, in Safari.

### Stap A: het script kopiëren
1. Open het dashboard en tik op **⚙** (onderaan).
2. Scroll naar **Agenda-koppelingen** en tik op **Kopieer script · werk**.
   Het script staat nu op je klembord, met je geheime code (token) er al in.

### Stap B: het script in Google zetten (werk-account)
3. Open in Safari **script.google.com** en log in met je **RetailSonar-account**.
4. Werkt de pagina niet goed op je telefoon? Tik op **aA** in de adresbalk en kies
   **Vraag desktopwebsite aan**.
5. Tik op **Nieuw project**. Tik in de code, kies **Selecteer alles** en daarna **Plak**,
   zodat je voorbeeldcode vervangt.
6. Tik op het **diskette-icoon** (Opslaan).
7. Kies bovenaan de functie **testMe** en tik op **Uitvoeren**.
   - Google vraagt toestemming: tik **Toestemming controleren** en kies je account.
   - Zie je "Google heeft deze app niet geverifieerd"? Dat is normaal: het is je eigen script.
     Tik **Geavanceerd**, dan **Ga naar Naamloos project (onveilig)** en **Toestaan**.
   - Onderaan verschijnt het logboek met je afspraken.
8. Tik rechtsboven op **Implementeren → Nieuwe implementatie**. Tik op het **tandwiel** en kies **Web-app**.
   - *Uitvoeren als*: **Ik**
   - *Wie heeft toegang*: **Iedereen**
   - Tik **Implementeren** en daarna **Kopiëren** bij de **Web-app URL** (eindigt op `/exec`).

### Stap C: de koppeling invullen
9. Ga terug naar het dashboard, **⚙ → Agenda-koppelingen**, en plak de URL in het veld
   **Web-app URL**. De token staat er al.
10. Tik op **Test koppelingen**. Je ziet "✔ Koppeling 1: Werk (…)". Tik daarna op **Opslaan**.

### Stap D: hetzelfde voor je persoonlijke account
11. Tik in het dashboard op **Kopieer script · persoonlijk**.
12. Open een **privévenster** in Safari (tabbladen-knop → **Privé**), ga naar **script.google.com** en log
    in met je **persoonlijke** Google-account. Zo haal je je twee accounts niet door elkaar.
13. Herhaal stap 5 tot 8.
14. Tik in het dashboard op **+ Koppeling toevoegen**, plak de tweede URL, tik op **Test koppelingen**
    en daarna op **Opslaan**.

### Lukt het niet?
- **"Agenda niet gevonden"** bij Lorenzo (of Tessa): kies in het script de functie **toonAgendas** en tik
  **Uitvoeren**. Het logboek toont alle agenda's met hun exacte naam. Pas de `name` in het script daaraan aan,
  sla op en publiceer een nieuwe versie (zie hieronder).
- **Geen optie "Iedereen" in je werk-account**: RetailSonar laat dat misschien niet toe. Deel dan je
  werkagenda met je persoonlijke account: op calendar.google.com (in desktopweergave) ga je naar
  Instellingen van je agenda → Delen met specifieke personen → je persoonlijke adres, met
  "Alle afspraakdetails bekijken". Voeg in het persoonlijke script deze regel toe bij `CALENDARS`:
  `{ key: 'werk', label: 'Werk', id: 'tessa.debacker@retailsonar.com' },`. Dan volstaat één koppeling.
- **"Ongeldige token"**: het script en het dashboard hebben een andere code. Kopieer het script opnieuw
  vanuit het dashboard en plak het opnieuw.

**Code aangepast?** (bv. een nieuwe versie van het script) Kopieer het script opnieuw vanuit het dashboard
en plak het over de oude code. Kies daarna *Implementeren → Implementaties beheren*, tik op het potlood en kies
bij Versie **Nieuwe versie**. Zo blijft de URL dezelfde.

## 3. Op je telefoon zetten

1. Stel alles eerst in op je laptop: naam, stad of locatie, kinderen en koppelingen.
2. Klik in Instellingen op **Kopieer setup-link** en stuur die link naar jezelf.
   Deel de link met niemand anders: hij bevat je token.
3. Open de link op je telefoon. Alle instellingen staan dan meteen goed.
4. Zet de app op je beginscherm:
   - **iPhone (Safari)**: Deel-icoon → **Zet op beginscherm**.
   - **Android (Chrome)**: menu ⋮ → **Toevoegen aan startscherm**.

De app opent schermvullend met een eigen icoontje. Ze ververst automatisch als je haar opent
en daarna elke 15 minuten. De laatst geladen agenda blijft zichtbaar als je offline bent.

## Wat het dashboard toont

- **Mee voor de kids** (helemaal bovenaan): de app doorzoekt je werkagenda, "Tessa" en "Lorenzo"
  naar afspraken over Remi en Cilou en naar dingen die mee moeten. Je kan alles afvinken, en dat
  wordt per dag onthouden. Vanaf 17u zie je wat je voor **morgen** moet klaarzetten.
  Zo herkent de app het het best (in de titel of de beschrijving van een afspraak):
  - `Zwemzak meenemen`, `Koekjes meebrengen voor de klas`
  - `Niet vergeten: laarzen, reservekleren` of `Meebrengen: 2 euro, briefje`
  - Activiteiten vult de app zelf aan: zwemmen → zwemgerief, turnen → turnzak,
    uitstap → lunchpakket + drinkbus, feestje → cadeautje, dokter/specialist → Kids-ID, …
  - Ophaalmomenten zoals "Remi/Cilou halen" worden ook getoond, met het uur.
  - Regent het of wordt het warm, dan komen regenjas of zonnecrème er vanzelf bij.
- **Remi & Cilou**: kledingtips per kind (jongen of meisje, en eventueel leeftijd bij
  Instellingen), elk met een eigen Pinterest-knop.
- **Wat trek je aan?**: een outfit in jouw stijl. De "formules" in `style-profile.js` komen uit je
  Pinterest-bord [outfits cl](https://www.pinterest.com/taldback/outfits-cl/): leopard als basis,
  wijde broeken, kleurclash en retro sneakers. De app kiest elke dag een formule die past bij het weer
  en bij werk- of vrije dag, en vult zelf de juiste jas en laagjes aan. Bij een klantgesprek of
  presentatie stelt ze een blazer voor. Met **Andere combi** klik je door naar een andere formule.
  Nieuwe pins op je bord? Vraag Claude om `style-profile.js` bij te werken.
  Vanaf 17u krijg je de tips voor **morgen**, zodat je de kleren al kan klaarleggen.
  Bij elke outfit staat een knop **Inspiratie op Pinterest**. Die zoekt op de voorgestelde
  outfit, met het seizoen en eventueel regen erbij. Op je iPhone opent de knop meteen de Pinterest-app.
- **Werk vandaag**: tijdlijn met een "nu"-lijn, de huidige of volgende meeting, het aantal
  meetings en het aantal uren. Afgewezen uitnodigingen worden niet getoond.
- **Tessa & Lorenzo**: vandaag, morgen en overmorgen naast elkaar, met het weer per dag.
- **Weer**: nu, per uur, minimum en maximum, regen, wind, UV en zonsondergang, plus een korte samenvatting.
