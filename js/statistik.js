// Hitungan angka perjalanan. Semua fungsi murni: menerima daftar tempat (S) dan ruas rute (legs).
import { km } from './geo.js';
import { CITIES } from './kota.js';

const d3 = window.d3;

// Lama tinggal di tempat ke-i, dalam tahun. Tempat terakhir dihitung sampai tahun ini.
export function stayYears(S, i, now) {
  var end = i < S.length - 1 ? S[i + 1].year : Math.max(now, S[i].year);
  return end - S[i].year;
}

// Titik tengah semua tempat di permukaan bumi, ditimbang lama tinggal.
export function lifeCenter(S, now) {
  if (S.length < 2) return null;
  var x = 0, y = 0, z = 0, rad = Math.PI / 180;
  S.forEach(function (p, i) {
    var w = Math.max(0.5, stayYears(S, i, now)), la = p.lat * rad, lo = p.lon * rad;
    x += w * Math.cos(la) * Math.cos(lo); y += w * Math.cos(la) * Math.sin(lo); z += w * Math.sin(la);
  });
  if (Math.hypot(x, y, z) < 1e-9) return null;
  var c = { lat: Math.atan2(z, Math.hypot(x, y)) / rad, lon: Math.atan2(y, x) / rad };
  var best = null, bd = Infinity;
  CITIES.forEach(function (ct) { var dd = km(c, ct); if (dd < bd) { bd = dd; best = ct; } });
  c.near = best; c.nearKm = bd;
  return c;
}

// Tempat tinggal pada tahun tertentu (tempat pertama kalau tahunnya lebih awal dari semuanya).
export function homeAt(S, year) {
  var r = S.length ? S[0] : null;
  S.forEach(function (p) { if (p.year <= year) r = p; });
  return r;
}

export function totals(S, legs, now) {
  var total = d3.sum(legs, function (l) { return l.km; });
  var cities = new Set(S.map(function (p) { return p.lat.toFixed(2) + ',' + p.lon.toFixed(2); })).size;
  var countries = new Set(S.map(function (p) { return p.iso; }).filter(Boolean)).size;
  return { total: total, cities: cities, countries: countries, span: S.length ? Math.max(now, S[S.length - 1].year) - S[0].year : 0 };
}
