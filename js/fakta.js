// Fakta tambahan dan julukan perjalanan.
// S = tempat tinggal berurutan tahun, trips = liburan, features = poligon negara (GeoJSON).
import { km } from './geo.js';
import { tzNear } from './kota.js';

const d3 = window.d3;

// Pulau atau daratan tempat sebuah titik berada: indeks poligon di dalam negaranya.
var islandCache = {};
export function islandOf(p, features) {
  if (!p.iso || !features || !features.length) return null;
  var key = p.iso + ':' + p.lat.toFixed(2) + ',' + p.lon.toFixed(2);
  if (key in islandCache) return islandCache[key];
  var f = features.find(function (x) { return x.id === p.iso; }), res = null;
  if (f && f.geometry) {
    var polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : []);
    var offs = [[0, 0], [0.12, 0], [-0.12, 0], [0, 0.12], [0, -0.12], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]];
    search:
    for (var o = 0; o < offs.length; o++) {
      var ll = [p.lon + offs[o][0], p.lat + offs[o][1]];
      for (var i = 0; i < polys.length; i++) {
        if (d3.geoContains({ type: 'Polygon', coordinates: polys[i] }, ll)) { res = p.iso + ':' + i; break search; }
      }
    }
  }
  return (islandCache[key] = res);
}

// Selisih dari UTC (jam) untuk sebuah zona waktu, pada hari ini.
var offCache = {};
export function utcOffset(tz) {
  if (!tz) return null;
  if (tz in offCache) return offCache[tz];
  var res = null;
  try {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    var name = (parts.find(function (x) { return x.type === 'timeZoneName'; }) || {}).value || '';
    var m = /GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/.exec(name);
    if (m) res = m[1] ? (m[1] === '-' ? -1 : 1) * (+m[2] + (m[3] ? +m[3] / 60 : 0)) : 0;
  } catch (e) { res = null; }
  return (offCache[tz] = res);
}

// homeOf(trip) mengembalikan tempat tinggal saat liburan itu terjadi.
export function facts(S, trips, features, homeOf) {
  var all = S.concat(trips), out = { equator: 0, islands: 0, zones: null, farthest: null };
  if (!S.length) return out;
  for (var i = 1; i < S.length; i++) { if (S[i - 1].lat * S[i].lat < 0) out.equator += 1; }
  trips.forEach(function (t) { var hm = homeOf(t); if (hm && hm.lat * t.lat < 0) out.equator += 2; });

  var isl = new Set();
  all.forEach(function (p) { var k = islandOf(p, features); if (k) isl.add(k); });
  out.islands = isl.size;

  var offs = [];
  all.forEach(function (p) { var o = utcOffset(tzNear(p.lat, p.lon)); if (o != null) offs.push(o); });
  if (offs.length) out.zones = { count: new Set(offs).size, spread: d3.max(offs) - d3.min(offs) };

  var fi = d3.maxIndex(all, function (p) { return km(S[0], p); });
  out.farthest = { place: all[fi], km: km(S[0], all[fi]), trip: fi >= S.length };
  return out;
}

// Julukan dari pola perpindahan. t = hasil totals().
export function nickname(S, trips, t, features) {
  var n = S.length;
  if (!n) return null;
  var first = S[0], last = S[n - 1], moves = n - 1;
  var lifeIslands = new Set(S.map(function (p) { return islandOf(p, features); }).filter(Boolean)).size;
  var maxFromFirst = d3.max(S, function (p) { return km(first, p); }) || 0;
  var home = n > 2 && km(first, last) < 30;
  if (t.countries >= 4) return { title: 'Warga Dunia', why: 'Pernah tinggal di ' + t.countries + ' negara.' };
  if (maxFromFirst > 7000) return { title: 'Penjelajah Benua', why: 'Pernah tinggal ' + Math.round(maxFromFirst).toLocaleString('id-ID') + ' km dari ' + first.name + '.' };
  if (t.countries >= 2) return { title: 'Perantau Lintas Negara', why: 'Pernah tinggal di ' + t.countries + ' negara.' };
  if (trips.length >= 4 && trips.length > moves) return { title: 'Si Tukang Jalan-Jalan', why: trips.length + ' liburan tercatat, lebih banyak dari jumlah pindahmu.' };
  if (t.cities <= 1) return { title: 'Setia Satu Kota', why: 'Dari dulu sampai sekarang tetap di ' + first.name + '.' };
  if (home) return { title: 'Si Pulang Kampung', why: 'Merantau ke ' + (t.cities - 1) + ' kota, lalu kembali ke ' + first.name + '.' };
  if (lifeIslands >= 2) return { title: 'Perantau Lintas Pulau', why: 'Pernah tinggal di ' + lifeIslands + ' pulau.' };
  if (t.cities >= 4) return { title: 'Pengembara Antarkota', why: t.cities + ' kota sudah pernah jadi rumah.' };
  return { title: 'Perantau Dekat Rumah', why: 'Pindah, tapi tidak jauh dari ' + first.name + '.' };
}
