// Helper umum: format angka, jarak, koordinat, dan pembuat elemen.
const d3 = window.d3;
var R_EARTH = 6371;
var nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
var nf1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
var km = function (a, b) { return d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * R_EARTH; };
var fmtCoord = function (lat, lon) {
  var part = function (v) { var d = Math.floor(Math.abs(v)); var m = Math.round((Math.abs(v) - d) * 60); if (m === 60) { d += 1; m = 0; } return d + '°' + (m < 10 ? '0' : '') + m + '′'; };
  return part(lat) + ' ' + (lat < 0 ? 'LS' : 'LU') + ', ' + part(lon) + ' ' + (lon < 0 ? 'BB' : 'BT');
};
var h = function (tag, attrs) {
  var el = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'text') el.textContent = attrs[k]; else if (k === 'class') el.className = attrs[k]; else el.setAttribute(k, attrs[k]); });
  for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
  return el;
};

export { R_EARTH, nf, nf1, km, fmtCoord, h };
