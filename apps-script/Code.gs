/**
 * My Daily — agenda-koppeling
 *
 * Plak dit in een nieuw project op https://script.google.com (in het Google-account
 * waar de agenda's in zitten), pas TOKEN en CALENDARS aan, en publiceer als web-app.
 * Volledige uitleg: SETUP.md in de repo.
 *
 * De dashboard-app vraagt: <web-app-url>?token=...&from=ISO&to=ISO
 * en krijgt: { calendars: [{ key, label, events: [...] }] }
 */

// 1) Kies een lange, willekeurige code. Dezelfde code vul je in bij het dashboard.
const TOKEN = 'VERVANG-MIJ-door-een-lange-geheime-code';

// 2) Welke agenda's dit account doorgeeft.
//    key   = 'werk', 'tessa' of 'lorenzo' (zo weet het dashboard waar het hoort)
//    id    = 'primary' (je hoofdagenda) of het agenda-ID (Agenda-instellingen → "Agenda integreren")
//    name  = in plaats van id: de naam zoals hij in Google Agenda staat, bv. 'Tessa'
//
// Voorbeeld werk-account:
//    { key: 'werk', label: 'Werk', id: 'primary' },
// Voorbeeld persoonlijk account:
//    { key: 'tessa', label: 'Tessa', name: 'Tessa' },
//    { key: 'lorenzo', label: 'Lorenzo', name: 'Lorenzo' },
const CALENDARS = [
  { key: 'tessa', label: 'Tessa', name: 'Tessa' },
  { key: 'lorenzo', label: 'Lorenzo', name: 'Lorenzo' },
];

const MAX_DAYS = 14;

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.token || p.token !== TOKEN) return json_({ error: 'Ongeldige token' });

  let from = p.from ? new Date(p.from) : startOfToday_();
  let to = p.to ? new Date(p.to) : new Date(from.getTime() + 3 * 86400000);
  if (isNaN(from) || isNaN(to) || to <= from) return json_({ error: 'Ongeldige periode' });
  if (to - from > MAX_DAYS * 86400000) to = new Date(from.getTime() + MAX_DAYS * 86400000);

  const calendars = CALENDARS.map(function (c) {
    try {
      const cal = findCalendar_(c);
      if (!cal) return { key: c.key, label: c.label, error: 'Agenda niet gevonden' };
      const tz = cal.getTimeZone() || Session.getScriptTimeZone();
      const events = cal.getEvents(from, to)
        .filter(function (ev) {
          // Afgewezen uitnodigingen niet tonen
          try { return ev.getMyStatus() !== CalendarApp.GuestStatus.NO; } catch (err) { return true; }
        })
        .map(function (ev) { return toJson_(ev, tz); });
      return { key: c.key, label: c.label, events: events };
    } catch (err) {
      return { key: c.key, label: c.label, error: String(err.message || err) };
    }
  });

  return json_({ calendars: calendars, generated: new Date().toISOString() });
}

function findCalendar_(c) {
  if (c.id === 'primary') return CalendarApp.getDefaultCalendar();
  if (c.id) return CalendarApp.getCalendarById(c.id);
  if (c.name) {
    const found = CalendarApp.getCalendarsByName(c.name);
    return found && found.length ? found[0] : null;
  }
  return null;
}

function toJson_(ev, tz) {
  const out = {
    title: ev.getTitle() || '(geen titel)',
    location: ev.getLocation() || '',
    allDay: ev.isAllDayEvent(),
    guests: ev.getGuestList(true).length,
    // Korte beschrijving: daar staat vaak wat je moet meenemen ("zwemgerief meenemen")
    description: cleanText_(ev.getDescription()).slice(0, 400),
  };
  if (out.allDay) {
    out.startDate = Utilities.formatDate(ev.getAllDayStartDate(), tz, 'yyyy-MM-dd');
    out.endDate = Utilities.formatDate(ev.getAllDayEndDate(), tz, 'yyyy-MM-dd'); // exclusief
  } else {
    out.start = ev.getStartTime().toISOString();
    out.end = ev.getEndTime().toISOString();
  }
  return out;
}

function cleanText_(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').trim();
}

function startOfToday_() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Handig om te testen in de editor: Uitvoeren → testMe, en bekijk het logboek. */
function testMe() {
  const res = doGet({ parameter: { token: TOKEN } });
  Logger.log(res.getContent());
}
