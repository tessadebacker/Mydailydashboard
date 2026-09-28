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

Je werkagenda zit in je **RetailSonar-account**. De agenda's **Tessa** en **Lorenzo** zitten in
je **persoonlijke** Google-account. Je maakt dus twee kleine scripts, één per account.
Het dashboard voegt ze samen.

Doe het volgende **per account** (log in met het juiste account):

1. Ga naar <https://script.google.com> en kies **Nieuw project**. Geef het de naam "My Daily".
2. Verwijder de voorbeeldcode en plak de inhoud van [`apps-script/Code.gs`](apps-script/Code.gs).
3. Pas bovenaan twee dingen aan:
   - `TOKEN`: een lange, willekeurige code (bv. 30 tekens). Mag in beide scripts dezelfde zijn.
   - `CALENDARS`:
     - **Werk-account**:
       ```js
       const CALENDARS = [
         { key: 'werk', label: 'Werk', id: 'primary' },
       ];
       ```
     - **Persoonlijk account**:
       ```js
       const CALENDARS = [
         { key: 'tessa', label: 'Tessa', name: 'Tessa' },
         { key: 'lorenzo', label: 'Lorenzo', name: 'Lorenzo' },
       ];
       ```
       `name` is de naam zoals de agenda in Google Agenda staat. Werkt dat niet, gebruik dan
       `id: '…@group.calendar.google.com'` (dat staat in Agenda-instellingen → *Agenda integreren*).
4. Kies de functie **testMe** en klik **Uitvoeren**. Google vraagt toestemming om je agenda te
   lezen: klik *Doorgaan* en *Toestaan*. In het logboek zie je nu je afspraken als JSON.
5. Kies **Implementeren → Nieuwe implementatie**. Klik op het tandwiel en kies **Web-app**.
   - *Uitvoeren als*: **Ik**
   - *Wie heeft toegang*: **Iedereen**
   - Klik **Implementeren** en kopieer de **Web-app URL** (eindigt op `/exec`).
6. Open het dashboard, ga naar **⚙ Instellingen → Agenda-koppelingen**, plak de URL en de token,
   en klik **Test koppelingen**. Klik daarna **Opslaan**.

> **Blokkeert je werk-account de optie "Iedereen"?** Sommige Google Workspace-beheerders zetten die
> uit. Dan heb je twee alternatieven:
> - Deel je werkagenda met je persoonlijke account (met "alle details van afspraken bekijken").
>   Voeg hem daarna in het persoonlijke script toe als
>   `{ key: 'werk', label: 'Werk', id: 'tessa.debacker@retailsonar.com' }`.
>   Dan heb je maar één koppeling nodig.
> - Of vraag het na bij IT.

**Code aangepast?** Kies *Implementeren → Implementaties beheren*, klik op het potlood en kies
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

- **Werk vandaag**: tijdlijn met een "nu"-lijn, de huidige of volgende meeting, het aantal
  meetings en het aantal uren. Afgewezen uitnodigingen worden niet getoond.
- **Tessa & Lorenzo**: vandaag, morgen en overmorgen naast elkaar, met het weer per dag.
- **Weer**: nu, per uur, minimum en maximum, regen, wind, UV en zonsondergang, plus een korte samenvatting.
- **Wat trek je aan?**: kledingtips voor jou (werkdag of vrije dag, en of er een grote meeting
  is) en voor de kinderen. Je vult hun naam en leeftijd in bij Instellingen. Vanaf 17u krijg je de tips
  voor **morgen**, zodat je de kleren al kan klaarleggen.
  Bij elke outfit staat een knop **Inspiratie op Pinterest**. Die zoekt op de voorgestelde
  outfit, met het seizoen en eventueel regen erbij. Op je iPhone opent de knop meteen de Pinterest-app.
