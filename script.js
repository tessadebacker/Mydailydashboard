// My Daily — dagelijks dashboard
// Statische app: agenda via eigen Google Apps Script-koppeling(en), weer via Open-Meteo.
// Alle persoonlijke instellingen (koppelingen, tokens) blijven in localStorage op het toestel.

import { STYLE_FORMULAS, STYLE_BOARD, STYLE_SUMMARY } from './style-profile.js?v=2026.09.28.3';

const APP_VERSION = '2026.09.28.3';

const LS_SETTINGS = 'mydaily.settings.v1';
const LS_CACHE = 'mydaily.cache.v1';
const FAMILY_DAYS = 3;

const DEFAULT_SETTINGS = {
  name: 'Tessa',
  useGeo: true,
  city: { name: 'Gent', lat: 51.0543, lon: 3.7174 },
  kids: [{ name: 'Remi', gender: 'jongen', age: '' }, { name: 'Cilou', gender: 'meisje', age: '' }],
  sources: [], // [{ url, token }]
};

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAY_FMT = new Intl.DateTimeFormat('nl-BE', { weekday: 'long' });
const DATE_FMT = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short' });
const LONG_FMT = new Intl.DateTimeFormat('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode e.d. */ }
}

// Base64 dat ook met accenten/emoji werkt
const b64encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
const b64decode = (str) => JSON.parse(decodeURIComponent(escape(atob(str))));

let settings = { ...DEFAULT_SETTINGS, ...lsGet(LS_SETTINGS, {}) };

// Eén geheime code per toestel/gezin, aangemaakt in de browser. Die komt in je Apps Script
// en wordt meegestuurd bij elke agenda-aanvraag. Staat nooit in de publieke repo.
function newToken() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => a[b % a.length]).join('');
}
if (!settings.token) {
  settings.token = (settings.sources || []).find((s) => s.token)?.token || newToken();
  lsSet(LS_SETTINGS, settings);
}
let state = { weather: null, place: null, calendars: null, demo: false, errors: [] };

// Setup-link (#setup=...) importeren: zo zet je de instellingen in één tik over naar je telefoon.
(function importSetupFromUrl() {
  const m = location.hash.match(/setup=([^&]+)/);
  if (!m) return;
  try {
    const imported = b64decode(decodeURIComponent(m[1]));
    settings = { ...DEFAULT_SETTINGS, ...imported };
    lsSet(LS_SETTINGS, settings);
    history.replaceState(null, '', location.pathname + location.search);
    showBanner('Instellingen geïmporteerd ✔ Zet deze pagina nu op je beginscherm.');
  } catch {
    showBanner('Die setup-link kon niet gelezen worden.');
  }
})();

function showBanner(html) {
  const b = $('#banner');
  b.innerHTML = html;
  b.hidden = false;
}

// ---------- klok & groet ----------
function tickClock() {
  const now = new Date();
  $('#clock').textContent = hhmm(now);
  const h = now.getHours();
  $('#greeting').textContent = h < 6 ? 'Nachtuil' : h < 12 ? 'Goeiemorgen' : h < 18 ? 'Hey' : 'Goeienavond';
  $('#today-label').textContent = LONG_FMT.format(now);
  $('#name').textContent = settings.name || 'jij';
  $('#avatar').textContent = (settings.name || 'T').trim().charAt(0).toUpperCase();
}

// ---------- WEER ----------
const WMO = {
  0: ['☀️', 'Zonnig'], 1: ['🌤️', 'Overwegend zonnig'], 2: ['⛅', 'Half bewolkt'], 3: ['☁️', 'Bewolkt'],
  45: ['🌫️', 'Mist'], 48: ['🌫️', 'Rijpmist'],
  51: ['🌦️', 'Lichte motregen'], 53: ['🌦️', 'Motregen'], 55: ['🌧️', 'Dichte motregen'],
  56: ['🌧️', 'IJzel'], 57: ['🌧️', 'IJzel'],
  61: ['🌦️', 'Lichte regen'], 63: ['🌧️', 'Regen'], 65: ['🌧️', 'Hevige regen'],
  66: ['🌧️', 'IJzelregen'], 67: ['🌧️', 'IJzelregen'],
  71: ['🌨️', 'Lichte sneeuw'], 73: ['🌨️', 'Sneeuw'], 75: ['❄️', 'Veel sneeuw'], 77: ['🌨️', 'Korrelsneeuw'],
  80: ['🌦️', 'Buien'], 81: ['🌧️', 'Stevige buien'], 82: ['⛈️', 'Zware buien'],
  85: ['🌨️', 'Sneeuwbuien'], 86: ['🌨️', 'Sneeuwbuien'],
  95: ['⛈️', 'Onweer'], 96: ['⛈️', 'Onweer met hagel'], 99: ['⛈️', 'Onweer met hagel'],
};
const wmo = (code) => WMO[code] || ['🌡️', 'Onbekend'];

function getPosition() {
  return new Promise((resolve) => {
    if (!settings.useGeo || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, name: 'Jouw locatie' }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

async function loadWeather() {
  const pos = (await getPosition()) || settings.city || DEFAULT_SETTINGS.city;
  const params = new URLSearchParams({
    latitude: pos.lat, longitude: pos.lon, timezone: 'auto', forecast_days: String(FAMILY_DAYS),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,is_day',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max,sunrise,sunset',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weer: HTTP ${res.status}`);
  state.weather = await res.json();
  state.place = pos.name;
}

// Samenvatting van de dag (tussen 7u en 20u) — de basis voor weertekst én kledingadvies.
function daySummary(w, dayIndex = 0) {
  const date = w.daily.time[dayIndex];
  const idx = w.hourly.time.map((t, i) => [t, i]).filter(([t]) => t.startsWith(date)).map(([, i]) => i);
  const at = (h) => idx.find((i) => Number(w.hourly.time[i].slice(11, 13)) === h);
  const daytime = idx.filter((i) => { const h = Number(w.hourly.time[i].slice(11, 13)); return h >= 7 && h <= 20; });
  const vals = (key) => daytime.map((i) => w.hourly[key][i]).filter((v) => v != null);
  const morning = at(8), afternoon = at(15);
  return {
    date,
    code: w.daily.weather_code[dayIndex],
    min: w.daily.temperature_2m_min[dayIndex],
    max: w.daily.temperature_2m_max[dayIndex],
    rainMax: w.daily.precipitation_probability_max[dayIndex] ?? 0,
    rainSum: w.daily.precipitation_sum[dayIndex] ?? 0,
    uv: w.daily.uv_index_max[dayIndex] ?? 0,
    windMax: w.daily.wind_speed_10m_max[dayIndex] ?? 0,
    feelMorning: morning != null ? w.hourly.apparent_temperature[morning] : w.daily.temperature_2m_min[dayIndex],
    feelAfternoon: afternoon != null ? w.hourly.apparent_temperature[afternoon] : w.daily.temperature_2m_max[dayIndex],
    feelMin: Math.min(...vals('apparent_temperature')),
    feelMax: Math.max(...vals('apparent_temperature')),
    rainHours: daytime.filter((i) => (w.hourly.precipitation_probability[i] ?? 0) >= 50).map((i) => Number(w.hourly.time[i].slice(11, 13))),
    sunset: w.daily.sunset[dayIndex]?.slice(11, 16),
  };
}

function rainWindow(hours) {
  if (!hours.length) return '';
  // Groepeer opeenvolgende uren tot blokken, bv. 9–11u en 16–18u
  const blocks = [];
  for (const h of hours) {
    const last = blocks[blocks.length - 1];
    if (last && h === last[1] + 1) last[1] = h; else blocks.push([h, h]);
  }
  return blocks.map(([a, b]) => (a === b ? `rond ${a}u` : `${a}–${b + 1}u`)).join(' en ');
}

function weatherText(s) {
  const parts = [];
  const spread = s.feelMax - s.feelMin;
  if (s.feelMorning <= 5) parts.push('Frisse start');
  else if (s.feelMorning <= 12) parts.push('Koele ochtend');
  else parts.push('Zachte ochtend');
  if (spread >= 7) parts.push(`die opwarmt tot ${Math.round(s.max)}°`);
  else parts.push(`en de hele dag rond ${Math.round((s.min + s.max) / 2)}°`);
  let txt = parts.join(' ') + '.';
  if (s.rainHours.length) txt += ` Regen verwacht ${rainWindow(s.rainHours)}.`;
  else if (s.rainMax >= 30) txt += ` Kleine kans op een bui (${s.rainMax}%).`;
  else txt += ' Droog. ';
  if (s.windMax >= 40) txt += ' Stevige wind!';
  if (s.uv >= 6) txt += ' Hoge UV — zonnecrème.';
  return txt.trim();
}

function renderWeather() {
  const w = state.weather;
  if (!w) return;
  const [icon, desc] = wmo(w.current.weather_code);
  const s = daySummary(w, 0);
  const nowHour = new Date().getHours();
  const today = w.daily.time[0];
  const hours = w.hourly.time
    .map((t, i) => ({ t, i, h: Number(t.slice(11, 13)) }))
    .filter(({ t, h }) => t.startsWith(today) && h >= Math.max(6, nowHour) && h <= 23);

  $('#weather-place').textContent = state.place || 'Hier';
  $('#weather').innerHTML = `
    <div class="weather__now">
      <div class="weather__icon">${w.current.is_day ? icon : (w.current.weather_code <= 1 ? '🌙' : icon)}</div>
      <div>
        <div class="weather__temp">${Math.round(w.current.temperature_2m)}<sup>°</sup></div>
      </div>
      <div>
        <div class="weather__desc">${esc(desc)}</div>
        <div class="weather__sub">voelt als ${Math.round(w.current.apparent_temperature)}°</div>
      </div>
    </div>
    <div class="chips">
      <span class="chip">↓ <b>${Math.round(s.min)}°</b> ↑ <b>${Math.round(s.max)}°</b></span>
      <span class="chip">☔ <b>${s.rainMax}%</b>${s.rainSum >= 0.5 ? ` · ${s.rainSum.toFixed(1)} mm` : ''}</span>
      <span class="chip">💨 <b>${Math.round(w.current.wind_speed_10m)}</b> km/u</span>
      <span class="chip">UV <b>${Math.round(s.uv)}</b></span>
      ${s.sunset ? `<span class="chip">🌇 <b>${s.sunset}</b></span>` : ''}
    </div>
    <div class="hours">
      ${hours.map(({ i, h }) => {
        const p = w.hourly.precipitation_probability[i] ?? 0;
        return `<div class="hour ${h === nowHour ? 'hour--now' : ''}">
          <div class="hour__t">${h}u</div>
          <div class="hour__i">${wmo(w.hourly.weather_code[i])[0]}</div>
          <div class="hour__v">${Math.round(w.hourly.temperature_2m[i])}°</div>
          <div class="hour__r">${p >= 20 ? `${p}%` : ''}</div>
        </div>`;
      }).join('')}
    </div>
    <p class="weather__summary">${esc(weatherText(s))}</p>`;
}

// ---------- OUTFIT ----------
function isWorkday(date, events) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  if (!events) return true;
  // Een hele-dag-afwezigheid ("verlof", "vakantie", "OOO") => geen werkdag
  return !events.some((e) => e.allDay && /verlof|vakantie|holiday|ooo|out of office|afwezig/i.test(e.title));
}

// Kiest een outfit-formule uit het stijlprofiel (style-profile.js) die past bij het weer en het soort dag.
// Elke dag een andere (op basis van de datum); "Andere combi" schuift door naar de volgende.
let outfitShift = 0;
function pickFormula(s, workday, day) {
  const t = (s.feelMorning + s.feelAfternoon) / 2;
  const fits = (f) => (workday ? f.when !== 'free' : f.when !== 'work');
  let pool = STYLE_FORMULAS.filter((f) => fits(f) && t >= f.t[0] && t <= f.t[1]);
  if (!pool.length) {
    // Niets past exact: neem de formules die het dichtst bij de temperatuur liggen.
    const dist = (f) => (t < f.t[0] ? f.t[0] - t : t > f.t[1] ? t - f.t[1] : 0);
    const cands = STYLE_FORMULAS.filter(fits);
    const best = Math.min(...cands.map(dist));
    pool = cands.filter((f) => dist(f) <= best + 2);
  }
  const dayNr = Math.floor(startOfDay(day).getTime() / 86400000);
  return { formula: pool[(dayNr + outfitShift) % pool.length], count: pool.length };
}

// Een meeting waarvoor je er "sharp" uit wil zien: klant, pitch, presentatie of een grote groep (geen routine-overleg).
const BIG_MEETING = /klant|client|customer|pitch|presentat|demo|board|directie|interview|sales|workshop|conferen|event/i;
const ROUTINE_MEETING = /stand-?up|daily|weekly|sync|lunch|1:1|one.on.one|focus|check-?in|halen/i;
function isBigMeeting(e) {
  if (ROUTINE_MEETING.test(e.title)) return false;
  return BIG_MEETING.test(e.title) || e.guests >= 6;
}

function outfitForMe(s, workday, bigMeeting, day) {
  const { formula, count } = pickFormula(s, workday, day);
  const items = [...formula.items];
  const f = s.feelMorning;
  const wet = s.rainHours.length > 0 || s.rainMax >= 60;
  const notes = [];

  // Het weer bepaalt de jas en de laagjes.
  if (f <= 3) items.push('lange wollen jas', 'dikke sjaal', 'handschoenen');
  else if (f <= 8) items.push(wet ? 'waterdichte parka' : 'lange wollen jas (camel of zwart)', 'sjaal');
  else if (f <= 13) items.push(wet ? 'regenjas in een felle kleur' : 'trenchcoat of oversized blazer');
  else if (wet) items.push('lichte regenjas');
  if (bigMeeting) items.push('oversized blazer erover');
  if (s.uv >= 5 && !items.some((i) => /zonnebril/.test(i))) items.push('zonnebril', 'SPF');

  if (wet && formula.suede) notes.push('Regen: suède houdt daar niet van — kies leren sneakers of boots.');
  else if (wet && /loafers|ballerina|sandal/i.test(formula.items.join(' '))) notes.push('Regen: kies boots in plaats van open schoenen.');
  if (s.feelMax - s.feelMin >= 7) notes.push(`Laagjes: ${Math.round(s.feelMin)}° 's ochtends, ${Math.round(s.feelMax)}° op z'n warmst.`);
  if (wet) notes.push(`Paraplu of kap mee — regen ${rainWindow(s.rainHours) || 'mogelijk'}.`);
  if (bigMeeting) notes.push(`Op de agenda: "${bigMeeting}".`);

  const pin = `${formula.pin}${wet ? ' rainy day' : ''}${f <= 8 ? ' coat' : ''}`;
  return { items: [...new Set(items)], notes, pin, formula, count };
}

function season(d = new Date()) {
  return ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'][d.getMonth()];
}

function pinterestUrl(q) {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`;
}

function outfitForKid(s, kid) {
  const items = [];
  const f = s.feelMorning;
  const wet = s.rainHours.length > 0 || s.rainMax >= 60;
  const girl = kid.gender === 'meisje';
  const age = Number(kid.age) || 0;
  const little = age > 0 && age <= 4;

  if (f <= 3) items.push('thermo-ondershirt', girl ? 'dikke trui of gebreide jurk + maillot' : 'dikke trui', 'gevoerde broek', 'winterjas', 'muts + sjaal + wanten');
  else if (f <= 8) items.push('longsleeve', girl ? 'trui of fleece' : 'hoodie of fleece', girl ? 'jeans of dikke legging' : 'jeans of jogging', 'warme jas', 'muts');
  else if (f <= 13) items.push('longsleeve', girl ? 'vestje of sweater' : 'hoodie', girl ? 'broek, of jurk met maillot' : 'lange broek of jogging', 'tussenjas');
  else if (f <= 18) items.push('t-shirt', 'sweater (uit te doen)', girl ? 'legging of rokje met maillot' : 'lange broek', 'licht jasje');
  else if (f <= 23) items.push('t-shirt', girl ? 'short, rokje of luchtig jurkje' : 'short of luchtige broek', 'dun vestje voor de ochtend');
  else items.push('luchtig t-shirt', girl ? 'jurkje of short' : 'short', 'petje');

  if (wet) items.push('regenjas met kap', f <= 13 ? 'regenlaarzen' : 'waterdichte schoenen');
  else items.push(f <= 8 ? 'gesloten warme schoenen' : 'sneakers');
  if (s.uv >= 4 || s.feelMax >= 22) items.push('zonnecrème', 'pet of hoedje');

  const notes = [];
  if (s.feelMax - s.feelMin >= 7) notes.push('Laagjes: ’s ochtends fris, ’s middags gaat de trui uit.');
  if (wet) notes.push(`Regen ${rainWindow(s.rainHours) || 'mogelijk'} — speeltijd wordt nat.`);
  if (little) notes.push('Reserveset kleren in de rugzak.');

  const layer = f <= 8 ? 'warm winter layers' : f <= 18 ? 'layered' : 'summer';
  const who = girl ? (little ? 'toddler girl' : 'girls') : (little ? 'toddler boy' : 'boys');
  const pin = `${season()} ${who} outfit ${layer}${wet ? ' raincoat rain boots' : ''}`;
  return { items: [...new Set(items)], notes, pin };
}

function vibe(s) {
  const f = (s.feelMorning + s.feelAfternoon) / 2;
  if (s.rainHours.length >= 4) return 'Rain-proof';
  if (f <= 5) return 'Cozy armor';
  if (f <= 12) return 'Layer up';
  if (f <= 18) return 'Transitional';
  if (f <= 24) return 'Light & easy';
  return 'Summer mode';
}

// Vanaf 17u plannen we voor morgen: kleren klaarleggen, boekentas klaarzetten.
function planDay() {
  const w = state.weather;
  const tomorrow = new Date().getHours() >= 17 && (!w || w.daily.time.length > 1);
  return { tomorrow, index: tomorrow ? 1 : 0, day: addDays(startOfDay(new Date()), tomorrow ? 1 : 0) };
}

const outfitBlock = (label, cls, o) => `
  <div class="outfit__who">
    <div class="outfit__name ${cls}">${esc(label)}</div>
    <ul class="outfit__items">${o.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    ${o.notes.map((n) => `<p class="outfit__note">${esc(n)}</p>`).join('')}
    <a class="pin-btn" href="${pinterestUrl(o.pin)}" target="_blank" rel="noopener">Inspiratie op Pinterest <span aria-hidden="true">↗</span></a>
  </div>`;

function renderOutfit() {
  const w = state.weather;
  if (!w) return;
  const { tomorrow, index, day } = planDay();
  const s = daySummary(w, index);
  const work = state.calendars?.werk ? eventsOn(state.calendars.werk, day) : null;
  const workday = isWorkday(day, work);
  const big = (work || []).find((e) => !e.allDay && new Date(e.end) > new Date() && isBigMeeting(e))?.title;
  const me = outfitForMe(s, workday, big, day);
  $('#outfit-card .card__title').innerHTML = tomorrow ? 'Klaarleggen <em>voor morgen</em>' : 'Wat trek je <em>vandaag</em> aan?';
  $('#outfit-vibe').textContent = vibe(s);
  $('#outfit').innerHTML = `
    <div class="outfit__who">
      <div class="outfit__name">${esc(settings.name || 'Jij')} · ${tomorrow ? 'morgen · ' : ''}${workday ? 'werkdag' : 'vrije dag'}</div>
      <div class="look">
        <span class="look__swatches">${me.formula.colors.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
        <span class="look__name">${esc(me.formula.name)}</span>
      </div>
      <ul class="outfit__items">${me.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      ${me.notes.map((n) => `<p class="outfit__note">${esc(n)}</p>`).join('')}
      <div class="outfit__actions">
        ${me.count > 1 ? `<button type="button" class="btn-pill" id="outfit-next">↻ Andere combi</button>` : ''}
        <a class="pin-btn" href="${pinterestUrl(me.pin)}" target="_blank" rel="noopener">Meer zoals dit <span aria-hidden="true">↗</span></a>
        <a class="btn-pill" href="${STYLE_BOARD}" target="_blank" rel="noopener">Mijn bord</a>
      </div>
      <p class="outfit__style">${esc(STYLE_SUMMARY)}</p>
    </div>`;
  $('#outfit-next')?.addEventListener('click', () => { outfitShift++; renderOutfit(); });
}

function renderKids() {
  const w = state.weather;
  const kids = (settings.kids || []).filter((k) => k.name);
  const card = $('#kids-card');
  card.hidden = !kids.length;
  if (!kids.length || !w) return;
  const { tomorrow, index } = planDay();
  const s = daySummary(w, index);
  $('#kids-title').innerHTML = kids.map((k) => esc(k.name)).join(' <em>&amp;</em> ');
  $('#kids-when').textContent = tomorrow ? 'klaarleggen voor morgen' : 'vandaag';
  $('#kids').innerHTML = kids.map((k) => {
    const cls = k.gender === 'meisje' ? 'outfit__name--girl' : 'outfit__name--boy';
    return outfitBlock(`${k.name}${k.age ? ` · ${k.age} jaar` : ''}`, cls, outfitForKid(s, k));
  }).join('');
}

// ---------- MEE TE GEVEN ----------
// Zoekt in alle agenda's naar afspraken over de kinderen en naar dingen om mee te nemen.
const BRING_RULES = [
  [/zwem/i, ['zwemgerief', 'handdoek', 'badmuts']],
  [/\bturn|\bgym\b|sportdag|\bsport\b|\blo-les|\bL\.O\./i, ['turnzak / sportkledij']],
  [/uitstap|schoolreis|excursie|bosdag|boerderij/i, ['lunchpakket', 'drinkbus', 'rugzak']],
  [/picknick/i, ['picknick']],
  [/verjaardag|feestje|\bparty\b/i, ['cadeautje']],
  [/traktatie|trakteren/i, ['traktatie']],
  [/verkleed|carnaval|halloween|themadag/i, ['verkleedkleren']],
  [/\bbib\b|bibliotheek|bibboek/i, ['bibboeken']],
  [/dokter|\barts\b|specialist|tandarts|ziekenhuis|kine|logo(pedie)?\b|orthodont/i, ['Kids-ID', 'eventueel verwijsbrief']],
  [/\bgeld\b|€|\beuro\b/i, ['gepast geld']],
  [/formulier|briefje|toelating|handtekening|strookje/i, ['ingevuld briefje']],
  [/\bfruit/i, ['fruit']],
  [/knutsel|kosteloos materiaal/i, ['knutselmateriaal']],
  [/logeren|slaapfeestje|overnachten/i, ['pyjama', 'tandenborstel', 'knuffel']],
];
const BRING_EXPLICIT = /(?:(?:meenemen|meebrengen|meegeven|mee\s*nemen)\s*:|niet vergeten\s*:?|vergeet niet\s*:?|\bmee\s*:)\s*([^\n.]*)/i;
const KID_CONTEXT = /\bkids?\b|kinderen|\bschool\b|opvang|\bklas\b|\bjuf\b|meester|crèche|kinderdagverblijf/i;
const PICKUP = /\b(op)?halen\b|brengen|afzetten/i;

function kidNames() {
  return (settings.kids || []).map((k) => (k.name || '').trim()).filter(Boolean);
}

// "Niet vergeten: laarzen, reservekleren" (na het woord) of "Zwemzak meenemen" (ervoor)
const BRING_BEFORE = /([^\n.:;,]{2,40}?)\s+(?:meenemen|meebrengen|meegeven|mee\s*nemen)\b/i;
function explicitItems(text) {
  const split = (str) => str.split(/,|;|\s\+\s|\ben\b/).map((x) => x.trim()).filter((x) => x && x.length <= 40);
  const after = text.match(BRING_EXPLICIT);
  if (after && after[1].trim()) return split(after[1]);
  const before = text.match(BRING_BEFORE);
  return before ? split(before[1]) : [];
}

function bringFor(day) {
  const names = kidNames();
  const nameRe = names.length ? new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i') : null;
  const seen = new Set();
  const rows = [];
  for (const [key, cal] of Object.entries(state.calendars || {})) {
    for (const e of eventsOn(cal, day)) {
      const text = `${e.title}\n${e.description || ''}`;
      const kidsMentioned = nameRe ? [...new Set((text.match(new RegExp(nameRe, 'gi')) || []).map((n) => names.find((x) => x.toLowerCase() === n.toLowerCase())))] : [];
      const explicit = explicitItems(text);
      const relevant = kidsMentioned.length || explicit.length || KID_CONTEXT.test(text);
      if (!relevant) continue;
      const id = `${e.title}|${e.start || e.startDate}`;
      if (seen.has(id)) continue;
      seen.add(id);
      // Wat expliciet in de agenda staat, wint; anders vullen we aan op basis van de activiteit.
      const items = [...explicit];
      if (!items.length) for (const [re, add] of BRING_RULES) if (re.test(text)) items.push(...add);
      rows.push({
        id, e, kids: kidsMentioned, cal: cal.label || key,
        pickup: PICKUP.test(e.title) && !items.length,
        items: [...new Set(items.map((i) => i.charAt(0).toLowerCase() + i.slice(1)))],
      });
    }
  }
  return rows.sort((a, b) => (b.e.allDay - a.e.allDay) || (new Date(a.e.start) - new Date(b.e.start)));
}

function weatherBring(s) {
  const items = [];
  if (s.rainHours.length || s.rainMax >= 60) items.push('regenjas', 'reservekousen');
  if (s.uv >= 5 || s.feelMax >= 24) items.push('zonnecrème', 'petje');
  if (s.feelMax >= 22) items.push('extra drinkbus');
  if (s.feelMorning <= 3) items.push('muts & wanten');
  return items;
}

const bringKey = (day) => `mydaily.bring.${ymd(day)}`;

function renderBring() {
  const box = $('#bring');
  if (!state.calendars && !state.weather) return;
  const { tomorrow, index, day } = planDay();
  const rows = state.calendars ? bringFor(day) : [];
  const wx = state.weather ? weatherBring(daySummary(state.weather, index)) : [];
  const done = new Set(lsGet(bringKey(day), []));
  const names = kidNames();
  $('#bring-title').innerHTML = tomorrow ? 'Klaarzetten <em>voor morgen</em>' : 'Mee voor <em>de kids</em>';

  const chip = (id, label) => `<button type="button" class="check ${done.has(id) ? 'is-done' : ''}" data-id="${esc(id)}" aria-pressed="${done.has(id)}"><span class="check__box" aria-hidden="true"></span>${esc(label)}</button>`;
  let total = 0, open = 0;
  const count = (id) => { total++; if (!done.has(id)) open++; };

  const html = rows.map((r) => {
    const when = r.e.allDay ? 'hele dag' : hhmm(new Date(r.e.start));
    const who = r.kids.length ? r.kids.join(' & ') : (names.join(' & ') || 'kids');
    r.items.forEach((i) => count(`${r.id}|${i}`));
    return `<div class="bring__row ${r.pickup ? 'bring__row--pickup' : ''}">
      <div class="bring__when">${when}</div>
      <div class="bring__body">
        <div class="bring__what">${esc(r.e.title)}</div>
        <div class="bring__meta">${esc(who)} · ${esc(r.cal)}${r.e.location ? ' · ' + esc(r.e.location) : ''}</div>
        ${r.items.length ? `<div class="bring__items">${r.items.map((i) => chip(`${r.id}|${i}`, i)).join('')}</div>` : ''}
      </div>
    </div>`;
  });
  if (wx.length) {
    wx.forEach((i) => count(`wx|${i}`));
    html.push(`<div class="bring__row bring__row--wx">
      <div class="bring__when">☂︎</div>
      <div class="bring__body"><div class="bring__what">Door het weer</div>
      <div class="bring__items">${wx.map((i) => chip(`wx|${i}`, i)).join('')}</div></div></div>`);
  }
  box.innerHTML = html.length ? html.join('') : `<p class="bring__none">Niets speciaals in de agenda voor ${esc(names.join(' & ') || 'de kids')} ${tomorrow ? 'morgen' : 'vandaag'} ✓</p>`;
  $('#bring-count').textContent = total ? (open ? `nog ${open} van ${total}` : 'alles mee ✓') : `${rows.length} in agenda`;

  box.querySelectorAll('.check').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.id;
    const set = new Set(lsGet(bringKey(day), []));
    set.has(id) ? set.delete(id) : set.add(id);
    lsSet(bringKey(day), [...set]);
    renderBring();
  }));
}

// ---------- AGENDA ----------
// Elke koppeling (Apps Script web-app) geeft { calendars: [{ key, label, events: [...] }] }.
// Keys: "werk", "tessa", "lorenzo".
async function loadCalendars() {
  const sources = (settings.sources || []).filter((s) => s.url);
  state.errors = [];
  if (!sources.length) {
    state.calendars = demoCalendars();
    state.demo = true;
    return;
  }
  const from = startOfDay(new Date());
  const to = addDays(from, FAMILY_DAYS);
  const results = await Promise.allSettled(sources.map((s) => fetchSource(s, from, to)));
  const merged = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      for (const cal of r.value) {
        if (cal.error) { state.errors.push(`${cal.label || cal.key}: ${cal.error}`); continue; }
        merged[cal.key] = { ...cal, events: [...(merged[cal.key]?.events || []), ...cal.events] };
      }
    } else {
      state.errors.push(`Koppeling ${i + 1}: ${r.reason?.message || r.reason}`);
    }
  });
  state.calendars = merged;
  state.demo = false;
  lsSet(LS_CACHE, { at: Date.now(), calendars: merged });
}

async function fetchSource(source, from, to) {
  const url = new URL(source.url);
  url.searchParams.set('token', source.token || settings.token || '');
  url.searchParams.set('from', from.toISOString());
  url.searchParams.set('to', to.toISOString());
  // Gewone GET zonder extra headers => geen CORS-preflight; Apps Script stuurt Access-Control-Allow-Origin: *
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json().catch(() => { throw new Error('Geen geldig antwoord (staat de web-app op "Iedereen"?)'); });
  if (data.error) throw new Error(data.error);
  return data.calendars || [];
}

// Event-normalisatie: all-day events krijgen lokale datums (yyyy-mm-dd, einde exclusief)
function eventsOn(cal, day) {
  if (!cal) return [];
  const d0 = startOfDay(day), d1 = addDays(d0, 1), key = ymd(d0);
  return cal.events
    .filter((e) => (e.allDay ? e.startDate <= key && e.endDate > key : new Date(e.start) < d1 && new Date(e.end) > d0))
    .sort((a, b) => (b.allDay - a.allDay) || (new Date(a.start) - new Date(b.start)));
}

function workEventsToday() {
  const cal = state.calendars?.werk;
  return cal ? eventsOn(cal, new Date()) : null;
}

function timeRange(e, day) {
  if (e.allDay) return 'hele dag';
  const s = new Date(e.start), en = new Date(e.end);
  const d0 = startOfDay(day), d1 = addDays(d0, 1);
  const a = s < d0 ? '…' : hhmm(s);
  const b = en > d1 ? '…' : hhmm(en);
  return `${a}–${b}`;
}

function relTime(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'nu';
  if (m < 60) return `over ${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return `over ${h}u${r ? pad(r) : ''}`;
}

function renderWork() {
  const list = $('#work-list');
  const events = workEventsToday();
  if (!events) {
    $('#work-stats').textContent = 'geen koppeling';
    $('#work-next').innerHTML = '';
    list.innerHTML = `<li class="empty">Nog geen werkagenda gekoppeld. Open ⚙ Instellingen.</li>`;
    return;
  }
  const now = new Date();
  const timed = events.filter((e) => !e.allDay);
  const minutes = timed.reduce((sum, e) => {
    const s = Math.max(new Date(e.start), startOfDay(now)), en = Math.min(new Date(e.end), addDays(startOfDay(now), 1));
    return sum + Math.max(0, (en - s) / 60000);
  }, 0);
  const left = timed.filter((e) => new Date(e.end) > now).length;
  $('#work-stats').textContent = timed.length
    ? `${timed.length} meetings · ${(minutes / 60).toFixed(1).replace('.0', '').replace('.', ',')}u · nog ${left}`
    : 'geen meetings 🎉';

  const next = timed.find((e) => new Date(e.start) > now);
  const current = timed.find((e) => new Date(e.start) <= now && new Date(e.end) > now);
  const focus = current || next;
  $('#work-next').innerHTML = focus ? `
    <div class="next">
      <div class="next__label">${current ? 'Nu bezig · tot ' + hhmm(new Date(current.end)) : 'Straks · ' + relTime(new Date(next.start) - now)}</div>
      <div class="next__title">${esc(focus.title)}</div>
      <div class="next__meta">${hhmm(new Date(focus.start))}–${hhmm(new Date(focus.end))}${focus.location ? ' · ' + esc(focus.location) : ''}${current && next ? ` · daarna: ${esc(next.title)} (${hhmm(new Date(next.start))})` : ''}</div>
    </div>` : '';

  if (!events.length) {
    list.innerHTML = `<li class="empty">Lege werkagenda vandaag. Focus-dag!</li>`;
    return;
  }
  let nowPlaced = false;
  const html = [];
  for (const e of events) {
    const s = new Date(e.start), en = new Date(e.end);
    if (!e.allDay && !nowPlaced && s > now) {
      html.push(`<li class="nowline">NU ${hhmm(now)}</li>`);
      nowPlaced = true;
    }
    const cls = e.allDay ? 'ev--allday' : en <= now ? 'ev--past' : s <= now ? 'ev--now' : '';
    if (cls === 'ev--now') nowPlaced = true;
    const meta = [e.location, e.guests > 1 ? `${e.guests} deelnemers` : ''].filter(Boolean).join(' · ');
    html.push(`<li class="ev ${cls}">
      <div class="ev__time">${e.allDay ? 'hele dag' : hhmm(s)}${e.allDay ? '' : `<span class="ev__end">${hhmm(en)}</span>`}</div>
      <div><div class="ev__title">${esc(e.title)}</div>${meta ? `<div class="ev__meta">${esc(meta)}</div>` : ''}</div>
    </li>`);
  }
  list.innerHTML = html.join('');
}

function renderFamily() {
  const wrap = $('#family-days');
  const tessa = state.calendars?.tessa, lorenzo = state.calendars?.lorenzo;
  if (tessa?.label) $('#legend-tessa').textContent = tessa.label;
  if (lorenzo?.label) $('#legend-lorenzo').textContent = lorenzo.label;
  const today = startOfDay(new Date());
  const html = [];
  for (let i = 0; i < FAMILY_DAYS; i++) {
    const day = addDays(today, i);
    const evs = [
      ...eventsOn(tessa, day).map((e) => ({ ...e, who: 'tessa', whoLabel: tessa?.label || 'Tessa' })),
      ...eventsOn(lorenzo, day).map((e) => ({ ...e, who: 'lorenzo', whoLabel: lorenzo?.label || 'Lorenzo' })),
    ].sort((a, b) => (b.allDay - a.allDay) || (new Date(a.start) - new Date(b.start)));
    const label = i === 0 ? 'Vandaag' : i === 1 ? 'Morgen' : DAY_FMT.format(day);
    let wx = '';
    if (state.weather?.daily?.time[i]) {
      const s = daySummary(state.weather, i);
      wx = `${wmo(s.code)[0]} ${Math.round(s.min)}°/${Math.round(s.max)}°`;
    }
    html.push(`<div class="day">
      <div class="day__head">
        <div><span class="day__name">${esc(label)}</span> <span class="day__date">${DATE_FMT.format(day)}</span></div>
        <span class="day__weather">${wx}</span>
      </div>
      ${evs.length ? evs.map((e) => `
        <div class="fev fev--${e.who}">
          <div class="fev__bar"></div>
          <div>
            <div class="fev__time">${timeRange(e, day)} · <span class="fev__who">${esc(e.whoLabel)}</span></div>
            <div class="fev__title">${esc(e.title)}</div>
            ${e.location ? `<div class="ev__meta">${esc(e.location)}</div>` : ''}
          </div>
        </div>`).join('') : `<div class="empty">Niks gepland</div>`}
    </div>`);
  }
  if (!tessa && !lorenzo && !state.demo) {
    html.unshift(`<div class="empty" style="grid-column:1/-1">Agenda's "Tessa" en "Lorenzo" nog niet gevonden in je koppelingen.</div>`);
  }
  wrap.innerHTML = html.join('');
}

// ---------- DEMO-data (enkel zolang er geen koppeling is) ----------
function demoCalendars() {
  const t = startOfDay(new Date());
  const at = (d, h, m = 0) => { const x = addDays(t, d); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const ev = (title, d, h1, m1, h2, m2, extra = {}) => ({ title, start: at(d, h1, m1), end: at(d, h2, m2), allDay: false, guests: 1, location: '', ...extra });
  return {
    werk: { key: 'werk', label: 'Werk', events: [
      ev('Remi/Cilou halen', 0, 16, 15, 17, 0),
      ev('Remi/Cilou halen', 1, 16, 15, 17, 0),
      ev('Team stand-up', 0, 9, 0, 9, 15, { guests: 6, location: 'Google Meet' }),
      ev('Klantgesprek Q4-plan', 0, 10, 30, 11, 30, { guests: 5 }),
      ev('Lunch', 0, 12, 30, 13, 0),
      ev('1:1 coaching', 0, 14, 0, 14, 30, { guests: 2 }),
      ev('Focus: rapport afwerken', 0, 15, 0, 17, 0),
    ] },
    tessa: { key: 'tessa', label: 'Tessa', events: [
      ev('Remi zwemmen met de klas', 0, 10, 0, 11, 30, { description: 'Zwemzak meenemen' }),
      ev('Uitstap Cilou naar de boerderij', 1, 9, 0, 15, 0, { description: 'Niet vergeten: laarzen, reservekleren' }),
      ev('Yoga', 0, 19, 30, 20, 30),
      ev('Kapper', 1, 17, 30, 18, 30),
      { title: 'Verjaardag oma', allDay: true, startDate: ymd(addDays(t, 2)), endDate: ymd(addDays(t, 3)) },
    ] },
    lorenzo: { key: 'lorenzo', label: 'Lorenzo', events: [
      ev('Kinderen ophalen', 0, 16, 0, 16, 30),
      ev('Voetbal', 1, 20, 0, 22, 0),
      ev('Tandarts', 2, 8, 30, 9, 0),
    ] },
  };
}

// ---------- render & laden ----------
function renderAll() {
  tickClock();
  renderWeather();
  renderBring();
  renderOutfit();
  renderKids();
  renderWork();
  renderFamily();
  const notes = [];
  if (state.demo) notes.push('DEMO-agenda — koppel je echte agenda’s via <button class="linkish" id="banner-settings">⚙ Instellingen</button>.');
  if (state.errors.length) notes.push(`⚠ ${state.errors.map(esc).join(' · ')}`);
  if (notes.length) {
    showBanner(notes.join('<br>'));
    $('#banner-settings')?.addEventListener('click', openSettings);
  } else if (!location.hash.includes('setup')) {
    $('#banner').hidden = true;
  }
}

let lastLoad = 0;
async function loadAll() {
  lastLoad = Date.now();
  const btn = $('#refresh-btn');
  btn.classList.add('spin');
  // Eerst cache tonen (snel + offline), daarna vers ophalen
  const cache = lsGet(LS_CACHE, null);
  if (cache && !state.calendars && (settings.sources || []).length) { state.calendars = cache.calendars; renderAll(); }

  const [w, c] = await Promise.allSettled([loadWeather(), loadCalendars()]);
  if (w.status === 'rejected') {
    $('#weather').innerHTML = `<div class="empty">Weer niet beschikbaar (${esc(w.reason?.message)})</div>`;
    $('#outfit').innerHTML = `<div class="empty">Geen weer = geen outfit-advies. Probeer ↻</div>`;
  }
  if (c.status === 'rejected') state.errors.push(String(c.reason?.message || c.reason));
  renderAll();
  $('#updated').textContent = `Bijgewerkt om ${hhmm(new Date())}${state.demo ? ' · demo-agenda' : ''} · versie ${APP_VERSION}`;
  btn.classList.remove('spin');
}

// ---------- instellingen ----------
function kidRow(k = {}) {
  const div = document.createElement('div');
  div.className = 'subcard row';
  div.innerHTML = `<input placeholder="Naam" data-f="name" value="${esc(k.name || '')}">
    <select data-f="gender" aria-label="Jongen of meisje" style="max-width:110px">
      <option value="jongen" ${k.gender !== 'meisje' ? 'selected' : ''}>jongen</option>
      <option value="meisje" ${k.gender === 'meisje' ? 'selected' : ''}>meisje</option>
    </select>
    <input placeholder="Leeftijd" data-f="age" type="number" min="0" max="18" style="max-width:80px" value="${esc(k.age ?? '')}">
    <button type="button" class="btn btn--x" aria-label="Verwijder">✕</button>`;
  div.querySelector('button').onclick = () => div.remove();
  return div;
}
function sourceRow(s = {}) {
  const div = document.createElement('div');
  div.className = 'subcard';
  div.innerHTML = `<label>Web-app URL <input data-f="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(s.url || '')}"></label>
    <div class="row"><input data-f="token" placeholder="Token" value="${esc(s.token || settings.token || '')}">
    <button type="button" class="btn btn--x" aria-label="Verwijder">✕</button></div>`;
  div.querySelector('button').onclick = () => div.remove();
  return div;
}

let pendingCity = null;
function openSettings() {
  const f = $('#settings-form');
  f.name.value = settings.name || '';
  f.useGeo.checked = !!settings.useGeo;
  f.city.value = settings.city?.name || '';
  pendingCity = settings.city;
  $('#city-result').textContent = '';
  $('#source-result').textContent = '';
  $('#copy-result').textContent = '';
  $('#kids-list').replaceChildren(...(settings.kids || []).map(kidRow));
  $('#sources-list').replaceChildren(...((settings.sources || []).length ? settings.sources : [{}]).map(sourceRow));
  prefetchScript();
  $('#settings').showModal();
}

function readForm() {
  const f = $('#settings-form');
  const rows = (sel) => [...document.querySelectorAll(`${sel} .subcard`)].map((el) =>
    Object.fromEntries([...el.querySelectorAll('[data-f]')].map((i) => [i.dataset.f, i.value.trim()])));
  return {
    ...settings,
    name: f.name.value.trim() || 'Tessa',
    useGeo: f.useGeo.checked,
    city: pendingCity || settings.city,
    kids: rows('#kids-list').filter((k) => k.name || k.age),
    sources: rows('#sources-list').filter((s) => s.url),
  };
}

async function searchCity() {
  const q = $('#settings-form').city.value.trim();
  if (!q) return;
  const out = $('#city-result');
  out.textContent = 'Zoeken…';
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=nl`);
    const r = (await res.json()).results?.[0];
    if (!r) { out.innerHTML = '<span class="err">Niet gevonden.</span>'; return; }
    pendingCity = { name: r.name, lat: r.latitude, lon: r.longitude };
    out.innerHTML = `<span class="ok">✔ ${esc(r.name)}${r.admin1 ? ', ' + esc(r.admin1) : ''} (${esc(r.country_code)})</span>`;
  } catch (e) {
    out.innerHTML = `<span class="err">Fout: ${esc(e.message)}</span>`;
  }
}

async function testSources() {
  const out = $('#source-result');
  const { sources } = readForm();
  if (!sources.length) { out.innerHTML = '<span class="err">Nog geen URL ingevuld.</span>'; return; }
  out.textContent = 'Testen…';
  const from = startOfDay(new Date()), to = addDays(from, FAMILY_DAYS);
  const lines = await Promise.all(sources.map(async (s, i) => {
    try {
      const cals = await fetchSource(s, from, to);
      return `<span class="ok">✔ Koppeling ${i + 1}: ${cals.map((c) => c.error ? `<span class="err">${esc(c.label)} ✕ ${esc(c.error)}</span>` : `${esc(c.label)} (${c.events.length})`).join(', ')}</span>`;
    } catch (e) {
      return `<span class="err">✕ Koppeling ${i + 1}: ${esc(e.message)}</span>`;
    }
  }));
  out.innerHTML = lines.join('<br>');
}

async function copySetup() {
  const link = `${location.origin}${location.pathname}#setup=${encodeURIComponent(b64encode(readForm()))}`;
  const out = $('#copy-result');
  try {
    await navigator.clipboard.writeText(link);
    out.innerHTML = '<span class="ok">✔ Gekopieerd! Plak hem in een bericht aan jezelf en open hem op je telefoon.</span>';
  } catch {
    out.innerHTML = `Kopieer deze link:<br><input readonly value="${esc(link)}" onclick="this.select()">`;
  }
}

// Apps Script-code klaarzetten met je token en de juiste agenda's, zodat je enkel moet plakken.
// We halen de code vooraf op: iOS laat kopiëren naar het klembord enkel toe meteen na een tik.
let scriptTemplate = null;
function prefetchScript() {
  if (scriptTemplate) return;
  fetch(`apps-script/Code.gs?v=${APP_VERSION}`).then((r) => (r.ok ? r.text() : null)).then((t) => { scriptTemplate = t; }).catch(() => {});
}
const SCRIPT_CALENDARS = {
  werk: "const CALENDARS = [\n  { key: 'werk', label: 'Werk', id: 'primary' },\n];",
  home: "const CALENDARS = [\n  { key: 'tessa', label: 'Tessa', name: 'Tessa', fallback: 'primary' },\n  { key: 'lorenzo', label: 'Lorenzo', name: 'Lorenzo' },\n];",
};
function buildScript(kind) {
  if (!scriptTemplate) return null;
  return scriptTemplate
    .replace(/const TOKEN = '[^']*';/, `const TOKEN = '${settings.token}';`)
    .replace(/const CALENDARS = \[[\s\S]*?\n\];/, SCRIPT_CALENDARS[kind]);
}
async function copyScript(kind) {
  const out = $('#copy-script-result');
  const code = buildScript(kind);
  if (!code) { out.innerHTML = '<span class="err">Script nog niet geladen — probeer zo meteen opnieuw.</span>'; prefetchScript(); return; }
  try {
    await navigator.clipboard.writeText(code);
    out.innerHTML = `<span class="ok">✔ Script (${kind === 'werk' ? 'werk-account' : 'persoonlijk account'}) gekopieerd. Plak het nu op script.google.com.</span>`;
  } catch {
    out.innerHTML = 'Kopiëren lukte niet automatisch. Houd het vak ingedrukt → Selecteer alles → Kopieer:<textarea readonly rows="6" style="width:100%;margin-top:6px">' + esc(code) + '</textarea>';
  }
}
$('#copy-script-werk').addEventListener('click', () => copyScript('werk'));
$('#copy-script-home').addEventListener('click', () => copyScript('home'));

$('#settings-btn').addEventListener('click', openSettings);
$('#refresh-btn').addEventListener('click', loadAll);
$('#kid-add').addEventListener('click', () => $('#kids-list').append(kidRow()));
$('#source-add').addEventListener('click', () => $('#sources-list').append(sourceRow()));
$('#city-search').addEventListener('click', searchCity);
$('#source-test').addEventListener('click', testSources);
$('#copy-setup').addEventListener('click', copySetup);
$('#settings').addEventListener('close', () => {
  if ($('#settings').returnValue !== 'save') return;
  settings = readForm();
  lsSet(LS_SETTINGS, settings);
  state.calendars = null;
  loadAll();
});

// ---------- start ----------
tickClock();
setInterval(tickClock, 15 * 1000);
setInterval(() => { renderWork(); }, 60 * 1000); // "nu"-lijn en "straks" actueel houden
setInterval(loadAll, 15 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  // Bij het openen van de app op je telefoon: meteen verversen als het al even geleden is
  if (document.visibilityState === 'visible' && Date.now() - lastLoad > 5 * 60 * 1000) loadAll();
});
loadAll();
