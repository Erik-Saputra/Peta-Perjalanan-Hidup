// Kode perjalanan (untuk dikirim ke teman) dan perbandingan dua perjalanan.
import { km } from './geo.js';

var CATS = ['lahir', 'sekolah', 'kuliah', 'kerja', 'tinggal', 'liburan', 'impian'];
var SAME_CITY_KM = 30;

// Perjalanan -> teks pendek yang aman ditempel di chat atau di alamat web. Catatan pribadi tidak ikut.
export function encodeJourney(owner, places) {
  var o = { v: 1, n: (owner || '').slice(0, 28), p: places.map(function (p) {
    return [p.name, +p.lat.toFixed(2), +p.lon.toFixed(2), CATS.indexOf(p.cat), p.year || 0, p.iso || ''];
  }) };
  var bytes = new TextEncoder().encode(JSON.stringify(o)), bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Menerima kode atau link yang berisi kode. Mengembalikan { owner, places } atau null.
export function decodeJourney(text) {
  try {
    var code = String(text || '').trim();
    if (code.indexOf('#') >= 0) code = code.slice(code.lastIndexOf('#') + 1);
    code = code.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (code.length < 16) return null;
    var bin = atob(code), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var o = JSON.parse(new TextDecoder().decode(bytes));
    if (!o || !Array.isArray(o.p)) return null;
    var places = [];
    o.p.slice(0, 80).forEach(function (a, i) {
      if (!Array.isArray(a)) return;
      var cat = CATS[a[3]], lat = +a[1], lon = +a[2], year = +a[4];
      if (!cat || !isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
      if (cat !== 'impian' && (!isFinite(year) || year < 1900 || year > 2200)) return;
      places.push({ id: i + 1, name: String(a[0] || 'Tanpa nama').slice(0, 60), lat: lat, lon: lon, cat: cat, year: cat === 'impian' ? null : year, iso: /^[A-Za-z:]{2,6}$/.test(a[5] || '') ? a[5] : null, note: '' });
    });
    return places.length ? { owner: String(o.n || '').slice(0, 28), places: places } : null;
  } catch (e) { return null; }
}

function spans(S, now) {
  return S.map(function (p, i) { return { p: p, from: p.year, to: i < S.length - 1 ? S[i + 1].year : Math.max(now, p.year) }; });
}
function at(S, y) { var r = null; S.forEach(function (p) { if (p.year <= y) r = p; }); return r; }

// A dan F: tempat tinggal dua orang, masing-masing berurutan tahun.
export function compare(A, F, now) {
  var res = { together: [], shared: [], nowKm: null, closest: null };
  if (!A.length || !F.length) return res;
  var seen = {};
  spans(A, now).forEach(function (a) {
    spans(F, now).forEach(function (f) {
      if (km(a.p, f.p) > SAME_CITY_KM) return;
      var from = Math.max(a.from, f.from), to = Math.min(a.to, f.to);
      if (to > from) res.together.push({ place: a.p, name: a.p.name, from: from, to: to, years: to - from });
      else if (!seen[a.p.name]) { seen[a.p.name] = 1; res.shared.push({ place: a.p, name: a.p.name }); }
    });
  });
  res.together.sort(function (x, y) { return x.from - y.from; });
  var tog = {}; res.together.forEach(function (x) { tog[x.name] = 1; });
  res.shared = res.shared.filter(function (x) { return !tog[x.name]; });
  res.nowKm = km(A[A.length - 1], F[F.length - 1]);
  for (var y = Math.max(A[0].year, F[0].year); y <= now; y++) {
    var pa = at(A, y), pf = at(F, y);
    if (!pa || !pf) continue;
    var d = km(pa, pf);
    if (!res.closest || d < res.closest.km) res.closest = { year: y, km: d, a: pa, f: pf };
  }
  return res;
}
