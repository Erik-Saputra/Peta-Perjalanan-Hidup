// Membuat data/kota-dunia.txt dari berkas GeoNames cities1000.txt.
// Unduh https://download.geonames.org/export/dump/cities1000.zip, ekstrak, lalu:
//   node tools/buat-data-kota.js path/ke/cities1000.txt data/kota-dunia.txt
//
// Format keluaran:
//   baris pertama : #tz|<zona waktu 0>|<zona waktu 1>|...
//   baris lain    : nama|kode negara|kode provinsi|lintang|bujur|indeks zona waktu
// Kode provinsi hanya diisi untuk Indonesia dan Amerika Serikat. Urutan: penduduk terbanyak dulu.
const fs = require('fs');
const [, , src, out] = process.argv;
if (!src || !out) { console.error('Pakai: node tools/buat-data-kota.js <cities1000.txt> <keluaran.txt>'); process.exit(1); }

const rows = [];
const tzIndex = new Map();
for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
  if (!line) continue;
  const f = line.split('\t');
  const name = f[1].replace(/[\t\n|#]/g, ' ').trim();
  const lat = parseFloat(f[4]), lon = parseFloat(f[5]), cc = f[8], a1 = f[10], pop = parseInt(f[14], 10) || 0, tz = (f[17] || '').trim();
  if (!name || !isFinite(lat) || !isFinite(lon) || !/^[A-Z]{2}$/.test(cc)) continue;
  if (tz && !tzIndex.has(tz)) tzIndex.set(tz, tzIndex.size);
  const keepA1 = cc === 'ID' || (cc === 'US' && /^[A-Z]{2}$/.test(a1));
  rows.push({ name, lat, lon, cc, a1: keepA1 ? a1 : '', pop, tz: tz ? tzIndex.get(tz) : '' });
}
rows.sort((a, b) => b.pop - a.pop);
const head = '#tz|' + [...tzIndex.keys()].join('|');
const body = rows.map(r => [r.name, r.cc, r.a1, r.lat.toFixed(2), r.lon.toFixed(2), r.tz].join('|')).join('\n');
fs.writeFileSync(out, head + '\n' + body, 'utf8');
console.log('tempat:', rows.length, '| zona waktu:', tzIndex.size, '| ukuran:', Buffer.byteLength(head + body), 'byte');
