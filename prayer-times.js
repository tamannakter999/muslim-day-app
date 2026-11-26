// Accurate Astronomical Prayer Times Calculator
// Tuned for Bangladesh (Islamic Foundation Bangladesh / Karachi method: Fajr 18°, Isha 18°, Hanafi Asr = 2)

const BD_DISTRICTS = [
  { id: 'dhaka', nameBn: 'ঢাকা', nameEn: 'Dhaka', lat: 23.8103, lng: 90.4125 },
  { id: 'chattogram', nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram', lat: 22.3569, lng: 91.7832 },
  { id: 'sylhet', nameBn: 'সিলেট', nameEn: 'Sylhet', lat: 24.8949, lng: 91.8687 },
  { id: 'rajshahi', nameBn: 'রাজশাহী', nameEn: 'Rajshahi', lat: 24.3745, lng: 88.6042 },
  { id: 'khulna', nameBn: 'খুলনা', nameEn: 'Khulna', lat: 22.8456, lng: 89.5403 },
  { id: 'barishal', nameBn: 'বরিশাল', nameEn: 'Barishal', lat: 22.7010, lng: 90.3535 },
  { id: 'rangpur', nameBn: 'রংপুর', nameEn: 'Rangpur', lat: 25.7439, lng: 89.2752 },
  { id: 'mymensingh', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', lat: 24.7471, lng: 90.4203 },
  { id: 'cumilla', nameBn: 'কুমিল্লা', nameEn: 'Cumilla', lat: 23.4607, lng: 91.1809 },
  { id: 'bogura', nameBn: 'বগুড়া', nameEn: 'Bogura', lat: 24.8465, lng: 89.3773 }
];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function sin(d) { return Math.sin(d * D2R); }
function cos(d) { return Math.cos(d * D2R); }
function tan(d) { return Math.tan(d * D2R); }
function arcsin(x) { return R2D * Math.asin(x); }
function arccos(x) { return R2D * Math.acos(x); }
function arctan2(y, x) { return R2D * Math.atan2(y, x); }
function arccot(x) { return R2D * Math.atan(1 / x); }

function fixAngle(a) {
  a = a - 360 * Math.floor(a / 360);
  return a < 0 ? a + 360 : a;
}

function fixHour(a) {
  a = a - 24 * Math.floor(a / 24);
  return a < 0 ? a + 24 : a;
}

function julianDate(year, month, day) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = arcsin(sin(e) * sin(L));
  return { decl, eqt };
}

function computeMidDay(jd, t) {
  const { eqt } = sunPosition(jd + t);
  return fixHour(12 - eqt);
}

function computeTime(jd, angle, t, lat, isAfterMidday) {
  const { decl } = sunPosition(jd + t);
  const noon = computeMidDay(jd, t);
  const val = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
  const clamped = Math.max(-1, Math.min(1, val));
  const V = (1 / 15) * arccos(clamped);
  return noon + (isAfterMidday ? V : -V);
}

function computeAsr(jd, factor, t, lat) {
  const { decl } = sunPosition(jd + t);
  const angle = -arccot(factor + tan(Math.abs(lat - decl)));
  return computeTime(jd, angle, t, lat, true);
}

/**
 * Returns prayer times as Date objects for the given local date & coordinates
 * @param {Date} date
 * @param {number} lat
 * @param {number} lng
 * @param {'hanafi'|'standard'} asrMethod
 * @param {number} tzOffsetHours (default 6 for Bangladesh)
 */
function calculatePrayerTimes(date, lat, lng, asrMethod = 'hanafi', tzOffsetHours = 6) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = julianDate(year, month, day) - lng / (15 * 24);
  const asrFactor = asrMethod === 'hanafi' ? 2 : 1;

  // Iterative refinement
  let times = {
    fajr: 5 / 24,
    sunrise: 6 / 24,
    dhuhr: 12 / 24,
    asr: 15 / 24,
    sunset: 18 / 24,
    maghrib: 18 / 24,
    isha: 19.5 / 24
  };

  for (let i = 0; i < 2; i++) {
    times = {
      fajr: computeTime(jd, 18, times.fajr, lat, false) / 24,
      sunrise: computeTime(jd, 0.833, times.sunrise, lat, false) / 24,
      dhuhr: computeMidDay(jd, times.dhuhr) / 24,
      asr: computeAsr(jd, asrFactor, times.asr, lat) / 24,
      sunset: computeTime(jd, 0.833, times.sunset, lat, true) / 24,
      maghrib: computeTime(jd, 0.833, times.maghrib, lat, true) / 24,
      isha: computeTime(jd, 18, times.isha, lat, true) / 24
    };
  }

  const offset = tzOffsetHours - lng / 15;
  const toDate = (hoursFraction, extraMinutes = 0) => {
    const totalHours = fixHour(hoursFraction * 24 + offset) + extraMinutes / 60;
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    const s = Math.round(((totalHours - h) * 60 - m) * 60);
    const d = new Date(year, month - 1, day, h, m, s);
    return d;
  };

  const fajr = toDate(times.fajr, 0);
  // Sehri ends ~3 minutes before Fajr (precautionary Ihtiyat, standard in Bangladesh)
  const sehri = new Date(fajr.getTime() - 3 * 60 * 1000);
  const sunrise = toDate(times.sunrise, 0);
  const dhuhr = toDate(times.dhuhr, 2); // +2 min after zenith
  const asr = toDate(times.asr, 0);
  // Iftar = Maghrib (+2 min precautionary)
  const maghrib = toDate(times.maghrib, 2);
  const iftar = new Date(maghrib.getTime());
  const isha = toDate(times.isha, 0);

  return { sehri, fajr, sunrise, dhuhr, asr, maghrib, iftar, isha };
}

// Convert English digits to Bangla digits
function toBanglaDigits(str) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/\d/g, d => bn[d]);
}

function formatTime(date, lang = 'bn') {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampmEn = hours >= 12 ? 'PM' : 'AM';
  const ampmBn = hours >= 12 ? 'অপরাহ্ণ' : 'পূর্বাহ্ণ';
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${minutes}`;
  if (lang === 'bn') {
    return `${toBanglaDigits(timeStr)} ${ampmBn}`;
  }
  return `${timeStr} ${ampmEn}`;
}

function formatTimeShort(date, lang = 'bn') {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;
  return lang === 'bn' ? toBanglaDigits(`${hours}:${minutes}`) + ' ' + ampm : timeStr;
}

function getHijriDate(date, lang = 'bn') {
  try {
    const locale = lang === 'bn' ? 'bn-BD-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return '';
  }
}

function getGregorianDate(date, lang = 'bn') {
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

window.PrayerCalc = {
  BD_DISTRICTS,
  calculatePrayerTimes,
  toBanglaDigits,
  formatTime,
  formatTimeShort,
  getHijriDate,
  getGregorianDate
};
