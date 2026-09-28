# My Daily

Mijn dagelijks dashboard: werkagenda van vandaag, de agenda's van Tessa en Lorenzo voor 3 dagen,
het weer en kledingtips voor mij en de kinderen.

Statische PWA voor GitHub Pages. Installeren en koppelen: zie **[SETUP.md](SETUP.md)**.

| Bestand | Wat |
| --- | --- |
| `index.html`, `style.css`, `script.js` | de app |
| `manifest.json`, `icons/` | installeerbaar op je beginscherm |
| `apps-script/Code.gs` | agenda-koppeling om in Google Apps Script te plakken |

**Na een wijziging:** voer `./bump-version.sh` uit voor je commit. Zo halen telefoons meteen de
nieuwe versie op in plaats van een oude kopie uit hun cache. Welke versie je ziet, staat onderaan in de app.
