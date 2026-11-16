// Kartu ringkasan: menggambar perjalanan ke gambar 1080x1350.
import { nf, nf1 } from './geo.js';
const d3 = window.d3;
var CARD_COL = { lahir: '#F2BE3A', sekolah: '#62A8F2', kuliah: '#A98BEB', kerja: '#4DCB96', tinggal: '#F28B55' };

export function drawCard(o) {
  var state = { owner: o.owner }, S = o.S, legs = o.legs, projection = o.projection, features = o.features;
  var W = o.W, H = o.H, SM_KM = o.smKm, NOW = o.now, cardImg = o.img, totals = function () { return o.totals; };
  var CW = 1080, CH = 1350, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  var ctx = cv.getContext('2d'), t = totals();
  var disp = '"Bricolage Grotesque", "Trebuchet MS", sans-serif', body = '"Instrument Sans", "Segoe UI", sans-serif', mono = '"JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#0D171A'; ctx.fillRect(0, 0, CW, CH);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#93A7AD'; ctx.font = '500 26px ' + mono; ctx.fillText('PETA PERJALANAN HIDUP', 60, 96);
  ctx.fillStyle = '#E8F0F1'; ctx.font = '700 68px ' + disp;
  ctx.fillText(state.owner ? state.owner : 'Perjalanan hidupku', 60, 176, CW - 120);

  var px = 60, py = 220, pw = 960, ph = 560;
  var pts = []; S.forEach(function (p) { pts.push(projection([p.lon, p.lat])); }); legs.forEach(function (l) { l.pts.forEach(function (q) { pts.push(q); }); });
  var x0 = d3.min(pts, function (q) { return q[0]; }), x1 = d3.max(pts, function (q) { return q[0]; }), y0 = d3.min(pts, function (q) { return q[1]; }), y1 = d3.max(pts, function (q) { return q[1]; });
  var kMin = Math.max(pw / W, ph / H), k = Math.max(kMin, Math.min(45, 0.7 / Math.max((x1 - x0) / pw, (y1 - y0) / ph, 0.0001)));
  var tx = pw / 2 - k * (x0 + x1) / 2, ty = ph / 2 - k * (y0 + y1) / 2;
  tx = Math.min(0, Math.max(pw - W * k, tx)); ty = Math.min(0, Math.max(ph - H * k, ty));
  var isos = new Set(S.map(function (p) { return p.iso; }));
  ctx.save();
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 22); else ctx.rect(px, py, pw, ph); ctx.clip();
  ctx.fillStyle = '#0F1E22'; ctx.fillRect(px, py, pw, ph);
  ctx.translate(px + tx, py + ty); ctx.scale(k, k);
  var cpath = d3.geoPath(projection, ctx);
  ctx.lineWidth = 0.8 / k; ctx.strokeStyle = '#35494F';
  features.forEach(function (f) { ctx.beginPath(); cpath(f); ctx.fillStyle = isos.has(f.id) ? '#4A4424' : '#1E3035'; ctx.fill(); ctx.stroke(); });
  ctx.strokeStyle = '#FF5C8A'; ctx.lineWidth = 5 / k; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  legs.forEach(function (l) {
    ctx.beginPath();
    l.pts.forEach(function (q, j) { if (j === 0 || Math.abs(q[0] - l.pts[j - 1][0]) > W / 2) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
    ctx.stroke();
  });
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  S.forEach(function (p, i) {
    var q = projection([p.lon, p.lat]), x = px + tx + q[0] * k, y = py + ty + q[1] * k;
    ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fillStyle = CARD_COL[p.cat]; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#0D171A'; ctx.stroke();
    ctx.fillStyle = '#0D171A'; ctx.font = '700 20px ' + mono; ctx.fillText(String(i + 1), x, y + 1);
  });
  ctx.restore();

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  var kmTxt = nf.format(Math.round(t.total));
  ctx.fillStyle = '#FF5C8A'; ctx.font = '700 150px ' + mono; ctx.fillText(kmTxt, 56, 950);
  var wKm = ctx.measureText(kmTxt).width;
  ctx.fillStyle = '#93A7AD'; ctx.font = '500 44px ' + mono; ctx.fillText('km', 56 + wKm + 18, 950);
  ctx.fillStyle = '#E8F0F1'; ctx.font = '500 30px ' + body;
  ctx.fillText(nf1.format(t.total / SM_KM) + '× Sabang–Merauke  ·  ' + nf1.format(t.total / 40075 * 100) + '% keliling bumi', 60, 1006, CW - 120);

  ctx.strokeStyle = '#27393E'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, 1044); ctx.lineTo(CW - 60, 1044); ctx.stroke();
  var cols = [[String(t.cities), 'kota'], [String(t.countries || 1), 'negara'], [String(t.span), 'tahun']];
  cols.forEach(function (c, i) {
    var x = 60 + i * 320;
    ctx.fillStyle = '#E8F0F1'; ctx.font = '700 64px ' + mono; ctx.fillText(c[0], x, 1124);
    ctx.fillStyle = '#93A7AD'; ctx.font = '500 28px ' + body; ctx.fillText(c[1], x + ctx.measureText('').width, 1164);
  });
  ctx.fillStyle = '#93A7AD'; ctx.font = '500 27px ' + body;
  var words = S.map(function (p, i) { return (i ? '→ ' : '') + p.name; }), lines = [''], maxW = CW - 120;
  words.forEach(function (w) {
    var cur = lines[lines.length - 1], next = cur ? cur + ' ' + w : w;
    if (ctx.measureText(next).width > maxW && cur) lines.push(w); else lines[lines.length - 1] = next;
  });
  if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] = lines[1] + ' …'; }
  lines.forEach(function (l, i) { ctx.fillText(l, 60, 1232 + i * 40, maxW); });
  ctx.fillStyle = '#586C73'; ctx.font = '500 22px ' + mono; ctx.fillText(S[0].year + '–' + Math.max(NOW, S[S.length - 1].year), 60, 1312);
  try { cardImg.src = cv.toDataURL('image/png'); } catch (e) {}
}
