// Lightweight, Accurate Astronomical Prayer Times & Hijri Calendar Engine
// Tuned for Bangladesh (Islamic Foundation Bangladesh: Fajr 18°, Isha 18°, Hanafi Asr = 2)

const BD_DIVISIONS = {
  dhaka: { bn: 'ঢাকা বিভাগ', en: 'Dhaka Division' },
  chattogram: { bn: 'চট্টগ্রাম বিভাগ', en: 'Chattogram Division' },
  sylhet: { bn: 'সিলেট বিভাগ', en: 'Sylhet Division' },
  rajshahi: { bn: 'রাজশাহী বিভাগ', en: 'Rajshahi Division' },
  khulna: { bn: 'খুলনা বিভাগ', en: 'Khulna Division' },
  barishal: { bn: 'বরিশাল বিভাগ', en: 'Barishal Division' },
  rangpur: { bn: 'রংপুর বিভাগ', en: 'Rangpur Division' },
  mymensingh: { bn: 'ময়মনসিংহ বিভাগ', en: 'Mymensingh Division' }
};

// Compact 64-district dataset: [id, division, nameBn, nameEn, lat, lng]
const BD_DISTRICTS_RAW = [
  ['dhaka','dhaka','ঢাকা','Dhaka',23.8103,90.4125],
  ['gazipur','dhaka','গাজীপুর','Gazipur',24.0023,90.4264],
  ['narayanganj','dhaka','নারায়ণগঞ্জ','Narayanganj',23.6238,90.5000],
  ['tangail','dhaka','টাঙ্গাইল','Tangail',24.2513,89.9167],
  ['narsingdi','dhaka','নরসিংদী','Narsingdi',23.9322,90.7154],
  ['manikganj','dhaka','মানিকগঞ্জ','Manikganj',23.8617,90.0003],
  ['munshiganj','dhaka','মুন্সীগঞ্জ','Munshiganj',23.5422,90.5305],
  ['faridpur','dhaka','ফরিদপুর','Faridpur',23.6071,89.8429],
  ['madaripur','dhaka','মাদারীপুর','Madaripur',23.1641,90.1897],
  ['gopalganj','dhaka','গোপালগঞ্জ','Gopalganj',23.0051,89.8266],
  ['rajbari','dhaka','রাজবাড়ী','Rajbari',23.7574,89.6445],
  ['shariatpur','dhaka','শরীয়তপুর','Shariatpur',23.2423,90.4348],
  ['kishoreganj','dhaka','কিশোরগঞ্জ','Kishoreganj',24.4449,90.7766],

  ['chattogram','chattogram','চট্টগ্রাম','Chattogram',22.3569,91.7832],
  ['coxsbazar','chattogram','কক্সবাজার','Cox\'s Bazar',21.4272,92.0058],
  ['cumilla','chattogram','কুমিল্লা','Cumilla',23.4607,91.1809],
  ['brahmanbaria','chattogram','ব্রাহ্মণবাড়িয়া','Brahmanbaria',23.9571,91.1119],
  ['chandpur','chattogram','চাঁদপুর','Chandpur',23.2333,90.6713],
  ['noakhali','chattogram','নোয়াখালী','Noakhali',22.8696,91.0994],
  ['feni','chattogram','ফেনী','Feni',23.0159,91.3976],
  ['lakshmipur','chattogram','লক্ষ্মীপুর','Lakshmipur',22.9425,90.8412],
  ['rangamati','chattogram','রাঙ্গামাটি','Rangamati',22.7324,92.2985],
  ['bandarban','chattogram','বান্দরবান','Bandarban',22.1953,92.2184],
  ['khagrachari','chattogram','খাগড়াছড়ি','Khagrachari',23.1193,91.9847],

  ['sylhet','sylhet','সিলেট','Sylhet',24.8949,91.8687],
  ['moulvibazar','sylhet','মৌলভীবাজার','Moulvibazar',24.4829,91.7774],
  ['habiganj','sylhet','হবিগঞ্জ','Habiganj',24.3749,91.4155],
  ['sunamganj','sylhet','সুনামগঞ্জ','Sunamganj',25.0658,91.3950],

  ['rajshahi','rajshahi','রাজশাহী','Rajshahi',24.3745,88.6042],
  ['bogura','rajshahi','বগুড়া','Bogura',24.8465,89.3773],
  ['pabna','rajshahi','পাবনা','Pabna',24.0064,89.2372],
  ['sirajganj','rajshahi','সিরাজগঞ্জ','Sirajganj',24.4534,89.7007],
  ['natore','rajshahi','নাটোর','Natore',24.4206,89.0003],
  ['naogaon','rajshahi','নওগাঁ','Naogaon',24.7936,88.9318],
  ['chapainawabganj','rajshahi','চাঁপাইনবাবগঞ্জ','Chapainawabganj',24.5965,88.2775],
  ['joypurhat','rajshahi','জয়পুরহাট','Joypurhat',25.0968,89.0227],

  ['khulna','khulna','খুলনা','Khulna',22.8456,89.5403],
  ['jashore','khulna','যশোর','Jashore',23.1664,89.2081],
  ['satkhira','khulna','সাতক্ষীরা','Satkhira',22.7185,89.0705],
  ['bagerhat','khulna','বাগেরহাট','Bagerhat',22.6516,89.7859],
  ['kushtia','khulna','কুষ্টিয়া','Kushtia',23.9013,89.1205],
  ['jhenaidah','khulna','ঝিনাইদহ','Jhenaidah',23.5448,89.1539],
  ['magura','khulna','মাগুরা','Magura',23.4873,89.4199],
  ['narail','khulna','নড়াইল','Narail',23.1725,89.5127],
  ['chuadanga','khulna','চুয়াডাঙ্গা','Chuadanga',23.6402,88.8418],
  ['meherpur','khulna','মেহেরপুর','Meherpur',23.7622,88.6318],

  ['barishal','barishal','বরিশাল','Barishal',22.7010,90.3535],
  ['patuakhali','barishal','পটুয়াখালী','Patuakhali',22.3596,90.3299],
  ['bhola','barishal','ভোলা','Bhola',22.6859,90.6482],
  ['pirojpur','barishal','পিরোজপুর','Pirojpur',22.5841,89.9720],
  ['jhalokati','barishal','ঝালকাঠি','Jhalokati',22.6406,90.1987],
  ['barguna','barishal','বরগুনা','Barguna',22.1592,90.1256],

  ['rangpur','rangpur','রংপুর','Rangpur',25.7439,89.2752],
  ['dinajpur','rangpur','দিনাজপুর','Dinajpur',25.6279,88.6332],
  ['kurigram','rangpur','কুড়িগ্রাম','Kurigram',25.8054,89.6362],
  ['gaibandha','rangpur','গাইবান্ধা','Gaibandha',25.3288,89.5281],
  ['nilphamari','rangpur','নীলফামারী','Nilphamari',25.9318,88.8561],
  ['lalmonirhat','rangpur','লালমনিরহাট','Lalmonirhat',25.9165,89.4532],
  ['thakurgaon','rangpur','ঠাকুরগাঁও','Thakurgaon',26.0337,88.4617],
  ['panchagarh','rangpur','পঞ্চগড়','Panchagarh',26.3411,88.5542],

  ['mymensingh','mymensingh','ময়মনসিংহ','Mymensingh',24.7471,90.4203],
  ['jamalpur','mymensingh','জামালপুর','Jamalpur',24.9375,89.9378],
  ['netrokona','mymensingh','নেত্রকোণা','Netrokona',24.8709,90.7279],
  ['sherpur','mymensingh','শেরপুর','Sherpur',25.0205,90.0153]
];

const BD_DISTRICTS = BD_DISTRICTS_RAW.map(([id, div, nameBn, nameEn, lat, lng]) => ({
  id, div, nameBn, nameEn, lat, lng
}));

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const sin = d => Math.sin(d * D2R);
const cos = d => Math.cos(d * D2R);
const tan = d => Math.tan(d * D2R);
const arcsin = x => R2D * Math.asin(x);
const arccos = x => R2D * Math.acos(x);
const arctan2 = (y, x) => R2D * Math.atan2(y, x);
const arccot = x => R2D * Math.atan(1 / x);
const fixAngle = a => { a -= 360 * Math.floor(a / 360); return a < 0 ? a + 360 : a; };
const fixHour = a => { a -= 24 * Math.floor(a / 24); return a < 0 ? a + 24 : a; };

function julianDate(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
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
  return { decl: arcsin(sin(e) * sin(L)), eqt: q / 15 - fixHour(RA) };
}

function computeMidDay(jd, t) {
  return fixHour(12 - sunPosition(jd + t).eqt);
}

function computeTime(jd, angle, t, lat, after) {
  const { decl } = sunPosition(jd + t);
  const noon = computeMidDay(jd, t);
  const val = Math.max(-1, Math.min(1, (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))));
  const V = (1 / 15) * arccos(val);
  return noon + (after ? V : -V);
}

function computeAsr(jd, factor, t, lat) {
  const { decl } = sunPosition(jd + t);
  return computeTime(jd, -arccot(factor + tan(Math.abs(lat - decl))), t, lat, true);
}

function calculatePrayerTimes(date, lat, lng, asrMethod = 'hanafi', tzOffsetHours = 6) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const jd = julianDate(year, month, day) - lng / (15 * 24);
  const asrFactor = asrMethod === 'hanafi' ? 2 : 1;

  let t = { fajr: 5/24, sunrise: 6/24, dhuhr: 12/24, asr: 15/24, sunset: 18/24, isha: 19.5/24 };
  for (let i = 0; i < 2; i++) {
    t = {
      fajr: computeTime(jd, 18, t.fajr, lat, false) / 24,
      sunrise: computeTime(jd, 0.833, t.sunrise, lat, false) / 24,
      dhuhr: computeMidDay(jd, t.dhuhr) / 24,
      asr: computeAsr(jd, asrFactor, t.asr, lat) / 24,
      sunset: computeTime(jd, 0.833, t.sunset, lat, true) / 24,
      isha: computeTime(jd, 18, t.isha, lat, true) / 24
    };
  }

  const offset = tzOffsetHours - lng / 15;
  const toDate = (frac, extraMin = 0) => {
    const totalH = fixHour(frac * 24 + offset) + extraMin / 60;
    const h = Math.floor(totalH);
    const m = Math.floor((totalH - h) * 60);
    const s = Math.round(((totalH - h) * 60 - m) * 60);
    return new Date(year, month - 1, day, h, m, s);
  };

  const fajr = toDate(t.fajr, 0);
  const sehri = new Date(fajr.getTime() - 3 * 60000);
  const sunrise = toDate(t.sunrise, 0);
  const dhuhr = toDate(t.dhuhr, 2);
  const asr = toDate(t.asr, 0);
  const sunset = toDate(t.sunset, 0);
  const maghrib = toDate(t.sunset, 2);
  const iftar = new Date(maghrib.getTime());
  const isha = toDate(t.isha, 0);

  // Forbidden Times (সালাতের নিষিদ্ধ সময়)
  const forbidden = {
    sunriseStart: sunrise,
    sunriseEnd: new Date(sunrise.getTime() + 15 * 60000),
    zawalStart: new Date(dhuhr.getTime() - 10 * 60000),
    zawalEnd: dhuhr,
    sunsetStart: new Date(sunset.getTime() - 15 * 60000),
    sunsetEnd: sunset
  };

  // Nafal Prayer Times (ইশরাক ও চাশত)
  const nafal = {
    ishraqStart: new Date(sunrise.getTime() + 15 * 60000),
    ishraqEnd: new Date(sunrise.getTime() + 45 * 60000),
    chashtStart: new Date(sunrise.getTime() + 45 * 60000),
    chashtEnd: new Date(dhuhr.getTime() - 15 * 60000)
  };

  return { sehri, fajr, sunrise, dhuhr, asr, sunset, maghrib, iftar, isha, forbidden, nafal };
}

// Accurate Hijri Calendar Converter (Kuwaiti Algorithm + Adjustable Moon-Sighting Offset)
const HIJRI_MONTHS_BN = [
  'মহররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি',
  'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান',
  'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ'
];
const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
  'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah'
];

function gregorianToHijri(date, adjustDays = -1) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + adjustDays);
  let day = d.getDate();
  let month = d.getMonth() + 1;
  let year = d.getFullYear();

  if (month < 3) { year -= 1; month += 12; }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524;

  const iyear = 10631 / 30;
  const epochastro = 1948084;
  const shift1 = 8.01 / 60;

  let z = jd - epochastro;
  const cyc = Math.floor(z / 10631);
  z -= 10631 * cyc;
  const j = Math.floor((z - shift1) / iyear);
  const iy = 30 * cyc + j;
  z -= Math.floor(j * iyear + shift1);
  let im = Math.floor((z + 28.5001) / 29.5);
  if (im === 13) im = 12;
  const id = Math.floor(z - Math.floor(29.5001 * im - 29));

  return { day: id, month: im, year: iy };
}

function toBanglaDigits(str) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/\d/g, d => bn[d]);
}

function getHijriDateString(date, lang = 'bn', adjustDays = -1) {
  const h = gregorianToHijri(date, adjustDays);
  if (lang === 'bn') {
    return `${toBanglaDigits(h.day)} ${HIJRI_MONTHS_BN[h.month - 1]}, ${toBanglaDigits(h.year)} হিজরি`;
  }
  return `${h.day} ${HIJRI_MONTHS_EN[h.month - 1]}, ${h.year} AH`;
}

function getGregorianDate(date, lang = 'bn') {
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
}

function formatTimeShort(date, lang = 'bn') {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;
  return lang === 'bn' ? toBanglaDigits(`${hours}:${minutes}`) + ' ' + ampm : timeStr;
}

window.PrayerCalc = {
  BD_DIVISIONS,
  BD_DISTRICTS,
  calculatePrayerTimes,
  gregorianToHijri,
  getHijriDateString,
  getGregorianDate,
  toBanglaDigits,
  formatTimeShort
};
