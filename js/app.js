// Aplikasi utama: data perjalanan, peta, bola dunia, linimasa, dan formulir.
import { R_EARTH, nf, nf1, km, fmtCoord, h } from './geo.js';
import { CITIES, NEGARA, A3, norm, placeLabel, loadWorld, cityByName, searchCities, worldCount } from './kota.js';
import * as stat from './statistik.js';
import * as fakta from './fakta.js';
import { encodeJourney, decodeJourney, compare } from './bandingkan.js';
import { drawCard as renderCard } from './kartu.js';
const d3 = window.d3, topojson = window.topojson;

(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!window.d3) {
    $('mapMsg').hidden = false;
    $('mapMsg').textContent = 'Pustaka peta gagal dimuat. Muat ulang halaman ini.';
    return;
  }

  var NOW = new Date().getFullYear();
  var STORE_KEY = 'peta-perjalanan-hidup-v1';
  // Lima kategori pertama membentuk rute hidup. Liburan dan impian digambar terpisah dan tidak masuk total jarak pindah.
  var CAT = { lahir: 'Lahir', sekolah: 'Sekolah', kuliah: 'Kuliah', kerja: 'Kerja', tinggal: 'Tinggal', liburan: 'Liburan', impian: 'Impian' };
  var isLife = function (p) { return p.cat !== 'liburan' && p.cat !== 'impian'; };

  /* ---------- State ---------- */
  var seq = 1;
  var mk = function (name, cat, year, note) { var c = cityByName(name); return { id: seq++, name: c.name, lat: c.lat, lon: c.lon, iso: c.iso, cat: cat, year: year, note: note || '' }; };
  var exampleJourney = function () {
    return [
      mk('Makassar', 'lahir', 1995, 'Rumah nenek dekat Pantai Losari'),
      mk('Balikpapan', 'sekolah', 2007, 'Ikut ayah pindah tugas'),
      mk('Yogyakarta', 'kuliah', 2013, 'Kos di Pogung, angkringan tiap malam'),
      mk('Jakarta', 'kerja', 2018, 'Pekerjaan pertama'),
      mk('Singapura', 'kerja', 2022, ''),
      mk('Bandung', 'tinggal', 2025, 'Pulang, kerja jarak jauh'),
      mk('Denpasar', 'liburan', 2016, 'Liburan akhir semester'),
      mk('Labuan Bajo', 'liburan', 2023, ''),
      mk('Tokyo', 'impian', null, 'Lihat sakura')
    ];
  };
  var state = { places: [], example: true, owner: '', friend: '' };
  var load = function () {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.places)) return false;
      state.places = s.places.filter(function (p) { return p && isFinite(p.lat) && isFinite(p.lon) && CAT[p.cat] && (p.cat === 'impian' || (p.year != null && isFinite(p.year))); });
      state.example = !!s.example;
      state.owner = typeof s.owner === 'string' ? s.owner : '';
      state.friend = typeof s.friend === 'string' ? s.friend : '';
      state.mode = s.mode === 'flat' ? 'flat' : 'globe';
      state.places.forEach(function (p) { if (p.id >= seq) seq = p.id + 1; });
      return true;
    } catch (e) { return false; }
  };
  var save = function () { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} };
  // Contoh perjalanan bukan data pengguna, jadi selalu dibuat ulang supaya ikut versi terbaru.
  if (!load() || state.example) { state.places = exampleJourney(); state.example = true; }
  var byYear = function (a, b) { return a.year - b.year || a.id - b.id; };
  var sorted = function () { return state.places.filter(isLife).sort(byYear); };
  // Link berisi kode perjalanan teman (#<kode>) langsung dipakai sebagai pembanding.
  try { if (location.hash.length > 20 && decodeJourney(location.hash)) state.friend = location.hash.slice(1); } catch (e) {}

  /* ---------- Map ---------- */
  var mapbox = $('mapbox');
  var narrow = (mapbox.clientWidth || 800) < 560;
  var W = narrow ? 720 : 960, H = narrow ? 560 : 540;
  var svg = d3.select('#map').attr('viewBox', '0 0 ' + W + ' ' + H);
  var gBase = d3.select('#gBase'), gOver = d3.select('#gOver');
  var projection = d3.geoNaturalEarth1().rotate([-150, 0]).fitExtent([[0, 0], [W, H]], { type: 'Sphere' });
  var path = d3.geoPath(projection);
  var features = [];
  try {
    var topo = window.Datamap && window.Datamap.prototype.worldTopo;
    if (topo && topo.objects && window.topojson) features = topojson.feature(topo, topo.objects.world).features;
  } catch (e) { features = []; }
  gBase.append('path').attr('class', 'sphere').attr('d', path({ type: 'Sphere' }));
  gBase.append('path').attr('class', 'grat').attr('d', path(d3.geoGraticule().step([30, 30])()));
  var countrySel = gBase.selectAll('path.country').data(features).join('path').attr('class', 'country').attr('d', path);
  if (!features.length) $('mapMsg').hidden = false;

  var T = d3.zoomIdentity;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var zoom = d3.zoom().scaleExtent([1, 80]).translateExtent([[0, 0], [W, H]])
    .filter(function (e) {
      if (mode === 'globe') return false;
      if (e.type === 'wheel') return e.ctrlKey || e.metaKey;
      if (e.type.indexOf('touch') === 0) return e.touches && e.touches.length > 1;
      return !e.button;
    })
    .on('zoom', function (e) { T = e.transform; gBase.attr('transform', T); drawOverlay(); });
  svg.call(zoom).on('dblclick.zoom', null);
  var unit = function () { var w = svg.node().getBoundingClientRect().width; return w > 0 ? W / w : 1; };

  /* ---------- Bola dunia ---------- */
  var canvas = $('globe'), gctx = canvas.getContext('2d');
  var R0 = Math.min(W, H) / 2 - 16;
  var gproj = d3.geoOrthographic().translate([W / 2, H / 2]).clipAngle(90).precision(0.3);
  var gpath = d3.geoPath(gproj), gpathC = d3.geoPath(gproj, gctx);
  var graticule = d3.geoGraticule().step([20, 20])();
  var cam = { rot: [-118, 4], k: 1 };
  var mode = state.mode === 'flat' ? 'flat' : 'globe';
  var featuresLow = features;
  try {
    if (features.length && topojson.presimplify) {
      var pre = topojson.presimplify(window.Datamap.prototype.worldTopo);
      var lo = topojson.simplify(pre, topojson.quantile(pre, 0.92));
      featuresLow = topojson.feature(lo, lo.objects.world).features;
    }
  } catch (e) { featuresLow = features; }
  var visitedIso = new Set(), tok = {}, hiresTimer = 0, camAnim = 0;
  var TOK_DEF = { '--sea-hi': '#17343C', '--sea-lo': '#0A171B', '--halo': 'rgba(79,195,204,0.3)', '--halo-0': 'rgba(79,195,204,0)', '--limb': 'rgba(0,0,0,0.4)', '--land': '#2A4047', '--land-visited': '#6B5F26', '--geo-line': '#48626A' };
  function readTokens() {
    var cs = getComputedStyle(document.documentElement);
    Object.keys(TOK_DEF).forEach(function (n) { tok[n] = cs.getPropertyValue(n).trim() || TOK_DEF[n]; });
  }
  function sizeCanvas() {
    var w = mapbox.clientWidth || W, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(w * H / W * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }
  function renderGlobe(fast) {
    if (mode !== 'globe') return;
    sizeCanvas();
    if (!fast || !tok['--land']) readTokens();
    var c = gctx, s = canvas.width / W, u = unit(), R = gproj.scale(), cx = W / 2, cy = H / 2, TAU = Math.PI * 2;
    c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, W, H);
    try {
      var g = c.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.14);
      g.addColorStop(0, tok['--halo']); g.addColorStop(1, tok['--halo-0']);
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 1.14, 0, TAU); c.fill();
      var sg = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R * 1.05);
      sg.addColorStop(0, tok['--sea-hi']); sg.addColorStop(1, tok['--sea-lo']);
      c.fillStyle = sg;
    } catch (e) { c.fillStyle = TOK_DEF['--sea-lo']; }
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
    c.beginPath(); gpathC(graticule); c.strokeStyle = tok['--geo-line']; c.globalAlpha = 0.3; c.lineWidth = 0.6 * u; c.stroke(); c.globalAlpha = 1;
    var fs = fast ? featuresLow : features;
    c.lineWidth = 0.6 * u; c.lineJoin = 'round'; c.strokeStyle = tok['--geo-line'];
    c.beginPath(); fs.forEach(function (f) { if (!visitedIso.has(f.id)) gpathC(f); }); c.fillStyle = tok['--land']; c.fill(); c.stroke();
    c.beginPath(); fs.forEach(function (f) { if (visitedIso.has(f.id)) gpathC(f); }); c.fillStyle = tok['--land-visited']; c.fill(); c.stroke();
    try {
      var sh = c.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, tok['--limb']);
      c.fillStyle = sh; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
    } catch (e) {}
  }
  function applyCam(fast) {
    cam.rot[0] = ((cam.rot[0] + 180) % 360 + 360) % 360 - 180;
    cam.rot[1] = Math.max(-85, Math.min(85, cam.rot[1]));
    cam.k = Math.max(1, Math.min(60, cam.k));
    gproj.rotate([cam.rot[0], cam.rot[1]]).scale(R0 * cam.k);
    renderGlobe(fast); drawOverlay();
    clearTimeout(hiresTimer);
    if (fast) hiresTimer = setTimeout(function () { renderGlobe(false); }, 160);
  }
  function animateCam(rot, k, dur) {
    cancelAnimationFrame(camAnim);
    if (reduced || !dur) { cam.rot = rot.slice(); cam.k = k; applyCam(false); return; }
    var r0 = cam.rot.slice(), k0 = cam.k, dl = ((rot[0] - r0[0] + 900) % 360) - 180, t0 = performance.now();
    (function step(now) {
      var f = Math.min(1, Math.max(0, (now - t0) / dur)), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      cam.rot = [r0[0] + dl * e, r0[1] + (rot[1] - r0[1]) * e];
      cam.k = Math.exp(Math.log(k0) + (Math.log(Math.max(1, k)) - Math.log(k0)) * e);
      applyCam(f < 1);
      if (f < 1) camAnim = requestAnimationFrame(step);
    })(t0);
  }
  function legK(leg) { return Math.max(1, Math.min(40, 0.62 / Math.sin(Math.min(Math.max(leg.rad, 0.004), Math.PI / 2)))); }
  function applyModeUI() {
    mapbox.classList.toggle('globe', mode === 'globe');
    gBase.attr('display', mode === 'globe' ? 'none' : null);
    canvas.hidden = mode !== 'globe';
    $('mGlobe').setAttribute('aria-pressed', String(mode === 'globe'));
    $('mFlat').setAttribute('aria-pressed', String(mode === 'flat'));
  }
  function setMode(m) {
    if (m === mode) return;
    stopPlay(false); cancelAnimationFrame(camAnim);
    mode = m; state.mode = m; save(); applyModeUI();
    viewP = Math.max(0, S.length - 1);
    if (S.length) { slider.value = slider.max; viewYear = +slider.max; setCaption(+slider.max, S.length - 1); }
    fitRoute(false); drawOverlay();
  }
  $('mGlobe').addEventListener('click', function () { setMode('globe'); });
  $('mFlat').addEventListener('click', function () { setMode('flat'); });

  var mapEl = svg.node(), drag = null, dragMoved = false;
  mapEl.addEventListener('pointerdown', function (e) {
    dragMoved = false;
    if (mode !== 'globe' || e.button || playing) return;
    cancelAnimationFrame(camAnim);
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 };
    try { mapEl.setPointerCapture(e.pointerId); } catch (err) {}
  });
  mapEl.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 5) dragMoved = true;
    var sens = unit() * 180 / Math.PI / (R0 * cam.k);
    cam.rot[0] += dx * sens; cam.rot[1] -= dy * sens;
    applyCam(true);
  });
  var endDrag = function (e) { if (drag && e.pointerId === drag.id) drag = null; };
  mapEl.addEventListener('pointerup', endDrag);
  mapEl.addEventListener('pointercancel', endDrag);
  mapEl.addEventListener('wheel', function (e) {
    if (mode !== 'globe' || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); cancelAnimationFrame(camAnim);
    cam.k *= Math.exp(-e.deltaY * 0.003); applyCam(true);
  }, { passive: false });

  var S = [], legs = [], viewP = 0, playing = false, rafId = 0;
  var pickMode = false, picked = null, center = null;
  // TR = liburan, DR = tempat impian, F = perjalanan teman, CMP = hasil perbandingan, viewYear = tahun yang sedang ditampilkan.
  var TR = [], DR = [], F = null, CMP = null, viewYear = NOW;
  var arcCoords = function (a, b) {
    var A = [a.lon, a.lat], B = [b.lon, b.lat], rad = d3.geoDistance(A, B), n = Math.max(2, Math.ceil(rad * 70) + 1), it = d3.geoInterpolate(A, B), cs = [];
    for (var j = 0; j < n; j++) cs.push(it(j / (n - 1)));
    return cs;
  };
  var homeOf = function (trip) { return stat.homeAt(S, trip.year); };

  var rebuild = function () {
    S = sorted();
    TR = state.places.filter(function (p) { return p.cat === 'liburan'; }).sort(byYear).map(function (p) {
      var hm = stat.homeAt(S, p.year);
      return { p: p, home: hm, km: hm ? km(hm, p) : 0, coords: hm ? arcCoords(hm, p) : null };
    });
    DR = state.places.filter(function (p) { return p.cat === 'impian'; }).map(function (p) {
      var cur = S.length ? S[S.length - 1] : null;
      return { p: p, km: cur ? km(cur, p) : 0, coords: cur ? arcCoords(cur, p) : null };
    });
    F = null; CMP = null;
    var fj = state.friend ? decodeJourney(state.friend) : null;
    if (fj) {
      var FS = fj.places.filter(isLife).sort(byYear);
      if (FS.length) {
        F = { owner: fj.owner || 'Teman', S: FS, legs: FS.slice(1).map(function (b, i) { return { coords: arcCoords(FS[i], b) }; }) };
        CMP = compare(S, FS, NOW);
      }
    }
    legs = S.slice(1).map(function (b, i) {
      var a = S[i], A = [a.lon, a.lat], B = [b.lon, b.lat];
      var rad = d3.geoDistance(A, B), n = Math.max(2, Math.ceil(rad * 70) + 1), it = d3.geoInterpolate(A, B), pts = [];
      var coords = [];
      for (var j = 0; j < n; j++) { var ll = it(j / (n - 1)); coords.push(ll); pts.push(projection(ll)); }
      return { a: a, b: b, km: rad * R_EARTH, pts: pts, coords: coords, it: it, rad: rad };
    });
    center = lifeCenter();
    var isos = new Set(S.concat(TR.map(function (t) { return t.p; })).map(function (p) { return p.iso; }).filter(Boolean));
    visitedIso = isos;
    countrySel.classed('visited', function (d) { return isos.has(d.id); });
  };

  var legPoints = function (leg, frac) {
    var last = (leg.pts.length - 1) * frac, full = Math.floor(last + 1e-9), out = leg.pts.slice(0, full + 1);
    if (last - full > 1e-6 && full + 1 < leg.pts.length) {
      var p0 = leg.pts[full], p1 = leg.pts[full + 1], f = last - full;
      if (Math.abs(p1[0] - p0[0]) < W / 2) out.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]);
    }
    return out;
  };
  var toD = function (pts) {
    var d = '';
    pts.forEach(function (q, j) {
      var brk = j === 0 || Math.abs(q[0] - pts[j - 1][0]) > W / 2, s = T.apply(q);
      d += (brk ? 'M' : 'L') + s[0].toFixed(1) + ',' + s[1].toFixed(1);
    });
    return d;
  };

  function drawOverlay() {
    var u = unit(), n = S.length, p = Math.max(0, Math.min(viewP, n - 1)), fl = Math.floor(p + 1e-9);
    gOver.selectAll('*').remove();
    var globe = mode === 'globe', eye = [-cam.rot[0], -cam.rot[1]];
    var scr = function (lon, lat) {
      if (!globe) return T.apply(projection([lon, lat]));
      return d3.geoDistance([lon, lat], eye) < 1.55 ? gproj([lon, lat]) : null;
    };
    var d = '', head = null;
    legs.forEach(function (leg, i) {
      var frac = i < fl ? 1 : (i === fl && p - i > 1e-6 ? p - i : 0);
      if (!frac) return;
      if (globe) {
        var full = Math.floor((leg.coords.length - 1) * frac + 1e-9), cs = leg.coords.slice(0, full + 1);
        if (frac < 1) { var hl = leg.it(frac); cs.push(hl); head = scr(hl[0], hl[1]); }
        if (cs.length > 1) d += gpath({ type: 'LineString', coordinates: cs }) || '';
      } else {
        var pts = legPoints(leg, frac); d += toD(pts);
        if (frac < 1) head = T.apply(pts[pts.length - 1]);
      }
    });
    if (d) {
      gOver.append('path').attr('class', 'route').attr('d', d).attr('stroke-width', 2.6 * u);
      if (!playing && !reduced) gOver.append('path').attr('class', 'flow').attr('d', d).attr('stroke-width', 1.5 * u)
        .attr('stroke-dasharray', (1 * u) + ' ' + (15 * u)).style('--dash', (16 * u) + 'px');
    }

    var arc = function (cs) { return globe ? (gpath({ type: 'LineString', coordinates: cs }) || '') : toD(cs.map(projection)); };
    var atRest = !playing && fl === n - 1, extras = [];
    if (F) {
      var fd = '';
      F.legs.forEach(function (l) { fd += arc(l.coords); });
      if (fd) gOver.append('path').attr('class', 'froute').attr('d', fd).attr('stroke-width', 2 * u).attr('stroke-dasharray', (6 * u) + ' ' + (4 * u));
      F.S.forEach(function (fp, i) {
        var s = scr(fp.lon, fp.lat);
        if (!s) return;
        gOver.append('circle').attr('class', 'fdot').attr('cx', s[0]).attr('cy', s[1]).attr('r', 4.5 * u).attr('stroke-width', 1.5 * u)
          .append('title').text(F.owner + ': ' + fp.name + ' · ' + fp.year);
        if (i === F.S.length - 1) extras.push({ x: s[0], y: s[1], name: F.owner, R: 5 * u, fs: 10.5 * u, cls: 'mlabel flabel' });
      });
      if (CMP && atRest) CMP.together.forEach(function (m) {
        var s = scr(m.place.lon, m.place.lat);
        if (s) gOver.append('circle').attr('class', 'meet').attr('cx', s[0]).attr('cy', s[1]).attr('r', 16 * u).attr('stroke-width', 2 * u);
      });
    }
    TR.forEach(function (t) {
      if (!atRest && t.p.year > viewYear) return;
      if (t.coords) { var td = arc(t.coords); if (td) gOver.append('path').attr('class', 'trip').attr('d', td).attr('stroke-width', 1.6 * u).attr('stroke-dasharray', (4 * u) + ' ' + (3 * u)); }
      var s = scr(t.p.lon, t.p.lat);
      if (!s) return;
      gOver.append('circle').attr('class', 'tripdot').attr('cx', s[0]).attr('cy', s[1]).attr('r', 5.5 * u).attr('stroke-width', 1.5 * u)
        .append('title').text(t.p.name + ' · liburan ' + t.p.year);
      extras.push({ x: s[0], y: s[1], name: t.p.name, R: 6 * u, fs: 10.5 * u, cls: 'mlabel tlabel' });
    });
    if (atRest) DR.forEach(function (dr) {
      if (dr.coords) { var dd = arc(dr.coords); if (dd) gOver.append('path').attr('class', 'dream').attr('d', dd).attr('stroke-width', 1.4 * u).attr('stroke-dasharray', (1.5 * u) + ' ' + (5 * u)); }
      var s = scr(dr.p.lon, dr.p.lat);
      if (!s) return;
      gOver.append('circle').attr('class', 'dreamdot').attr('cx', s[0]).attr('cy', s[1]).attr('r', 5.5 * u).attr('stroke-width', 1.6 * u).attr('stroke-dasharray', (2.5 * u) + ' ' + (2 * u))
        .append('title').text(dr.p.name + ' · impian');
      extras.push({ x: s[0], y: s[1], name: dr.p.name, R: 6 * u, fs: 10.5 * u, cls: 'mlabel dlabel' });
    });

    var cmark = center ? scr(center.lon, center.lat) : null;
    if (cmark && n > 1 && !playing && fl === n - 1) {
      var c = cmark, r = 7 * u;
      gOver.append('path').attr('class', 'center-mark').attr('stroke-width', 1.4 * u)
        .attr('d', 'M' + (c[0] - r) + ',' + c[1] + 'L' + c[0] + ',' + (c[1] - r) + 'L' + (c[0] + r) + ',' + c[1] + 'L' + c[0] + ',' + (c[1] + r) + 'Z');
      gOver.append('text').attr('class', 'center-label').attr('x', c[0]).attr('y', c[1] + r + 11 * u).attr('text-anchor', 'middle')
        .attr('font-size', 9.5 * u).attr('stroke-width', 3 * u).text('pusat hidup');
    }

    var vis = S.filter(function (_, i) { return i <= fl; }).map(function (pl, i) {
      var s = scr(pl.lon, pl.lat);
      return s ? { pl: pl, i: i, x: s[0], y: s[1] } : null;
    }).filter(Boolean);
    var R = 10 * u, boxes = vis.map(function (m) { return [m.x - R, m.y - R, m.x + R, m.y + R]; });
    extras.forEach(function (m) { boxes.push([m.x - m.R, m.y - m.R, m.x + m.R, m.y + m.R]); });
    var hit = function (b) { return boxes.some(function (o) { return b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]; }); };
    vis.forEach(function (m) {
      var g = gOver.append('g').attr('class', 'marker').attr('transform', 'translate(' + m.x.toFixed(1) + ',' + m.y.toFixed(1) + ')');
      g.append('title').text(m.pl.name + ' · ' + CAT[m.pl.cat] + ' · ' + m.pl.year);
      if (m.i === fl && !playing && !reduced) g.append('circle').attr('class', 'pulse').attr('r', R).attr('stroke-width', 2 * u);
      g.append('circle').attr('r', R).attr('class', 'cat-' + m.pl.cat).attr('stroke-width', 2 * u);
      g.append('text').attr('class', 'num').attr('font-size', 10.5 * u).text(m.i + 1);
    });
    var labels = vis.map(function (m) { return { x: m.x, y: m.y, name: m.pl.name, R: R, fs: 12 * u, cls: 'mlabel' }; }).concat(extras);
    labels.forEach(function (m) {
      var fs = m.fs, w = m.name.length * fs * 0.56 + 6 * u, hh = fs * 1.3, gap = m.R + 4 * u;
      var cands = [
        { b: [m.x + gap, m.y - hh / 2, m.x + gap + w, m.y + hh / 2], a: 'start', x: m.x + gap, y: m.y },
        { b: [m.x - gap - w, m.y - hh / 2, m.x - gap, m.y + hh / 2], a: 'end', x: m.x - gap, y: m.y },
        { b: [m.x - w / 2, m.y - gap - hh, m.x + w / 2, m.y - gap], a: 'middle', x: m.x, y: m.y - gap - hh / 2 },
        { b: [m.x - w / 2, m.y + gap, m.x + w / 2, m.y + gap + hh], a: 'middle', x: m.x, y: m.y + gap + hh / 2 }
      ];
      for (var k = 0; k < cands.length; k++) {
        var c = cands[k];
        if (c.b[0] < 0 || c.b[2] > W || c.b[1] < 0 || c.b[3] > H || hit(c.b)) continue;
        boxes.push(c.b);
        gOver.append('text').attr('class', m.cls).attr('x', c.x).attr('y', c.y).attr('text-anchor', c.a).attr('dominant-baseline', 'central')
          .attr('font-size', fs).attr('stroke-width', 3.5 * u).text(m.name);
        break;
      }
    });
    if (head) { var hs = head; gOver.append('circle').attr('class', 'head').attr('cx', hs[0]).attr('cy', hs[1]).attr('r', 5 * u).attr('stroke-width', 1.5 * u); }
    if (picked && picked.fromMap) {
      var ps = scr(picked.lon, picked.lat);
      if (ps) gOver.append('circle').attr('class', 'pickpin').attr('cx', ps[0]).attr('cy', ps[1]).attr('r', 9 * u).attr('stroke-width', 2.4 * u).attr('stroke-dasharray', (3 * u) + ' ' + (3 * u));
    }
  }

  function fitRoute(animate) {
    if (mode === 'globe') {
      var all = [], rot = [-118, 4], gk = 1;
      S.forEach(function (p) { all.push([p.lon, p.lat]); });
      legs.forEach(function (l) { l.coords.forEach(function (q) { all.push(q); }); });
      TR.forEach(function (t) { all.push([t.p.lon, t.p.lat]); });
      if (F) F.S.forEach(function (p) { all.push([p.lon, p.lat]); });
      if (all.length) {
        var gc = d3.geoCentroid({ type: 'MultiPoint', coordinates: all });
        if (!isFinite(gc[0]) || !isFinite(gc[1])) gc = all[0];
        var th = d3.max(all, function (q) { return d3.geoDistance(gc, q); });
        gk = all.length === 1 || th < 1e-4 ? 6 : (th > 1.15 ? 1 : Math.max(1, Math.min(45, 0.74 / Math.sin(th))));
        rot = [-gc[0], -gc[1]];
      }
      animateCam(rot, gk, animate ? 700 : 0);
      return;
    }
    var pts = [];
    S.forEach(function (p) { pts.push(projection([p.lon, p.lat])); });
    legs.forEach(function (l) { l.pts.forEach(function (q) { pts.push(q); }); });
    TR.forEach(function (tr) { pts.push(projection([tr.p.lon, tr.p.lat])); });
    if (F) F.S.forEach(function (p) { pts.push(projection([p.lon, p.lat])); });
    var t = d3.zoomIdentity;
    if (pts.length) {
      var x0 = d3.min(pts, function (q) { return q[0]; }), x1 = d3.max(pts, function (q) { return q[0]; });
      var y0 = d3.min(pts, function (q) { return q[1]; }), y1 = d3.max(pts, function (q) { return q[1]; });
      var k = pts.length === 1 ? 7 : Math.min(45, 0.72 / Math.max((x1 - x0) / W, (y1 - y0) / H, 0.0001));
      k = Math.max(1, k);
      t = d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    }
    if (animate && !reduced) svg.transition().duration(650).call(zoom.transform, t); else svg.call(zoom.transform, t);
  }

  /* ---------- Angka ---------- */
  function stayYears(i) { return stat.stayYears(S, i, NOW); }
  function lifeCenter() { return stat.lifeCenter(S, NOW); }
  function totals() { return stat.totals(S, legs, NOW); }
  var SM_KM = km(cityByName('Sabang'), cityByName('Merauke'));

  function renderStats() {
    var t = totals(), n = S.length;
    $('totalKm').textContent = nf.format(Math.round(t.total));
    var cmp = $('cmp'); cmp.textContent = '';
    var addCmp = function (big, txt) { cmp.appendChild(h('li', null, h('b', { text: big }), h('span', { text: txt }))); };
    addCmp(nf1.format(t.total / SM_KM) + '×', 'jarak garis lurus Sabang–Merauke (' + nf.format(Math.round(SM_KM)) + ' km)');
    addCmp(nf1.format(t.total / 40075 * 100) + '%', 'dari keliling bumi di khatulistiwa (40.075 km)');
    addCmp(nf.format(Math.ceil(t.total / 40)) + ' hari', 'kalau ditempuh jalan kaki 8 jam sehari');

    var trips = TR.map(function (x) { return x.p; });
    var fx = fakta.facts(S, trips, features, homeOf);
    nick = fakta.nickname(S, trips, t, features);
    $('nickBox').hidden = !nick;
    if (nick) { $('nick').textContent = nick.title; $('nickWhy').textContent = nick.why; }
    renderCompare();

    var facts = $('facts'); facts.textContent = '';
    var add = function (dt, dd, small) { facts.appendChild(h('div', null, h('dt', { text: dt }), h('dd', null, dd, small ? h('small', { text: small }) : null))); };
    if (!n) { add('Belum ada data', 'Tambahkan tempat pertamamu', 'Angka-angka di sini terisi otomatis.'); return; }
    add('Tempat dan kota', n + ' tempat di ' + t.cities + ' kota', t.countries ? t.countries + ' negara' : null);
    add('Rentang waktu', S[0].year + '–' + Math.max(NOW, S[n - 1].year), t.span + ' tahun perjalanan');
    var li = d3.maxIndex(S, function (_, i) { return stayYears(i); });
    add('Paling lama ditinggali', S[li].name, stayYears(li) + ' tahun' + (li === n - 1 ? ', dan masih berjalan' : ''));
    if (legs.length) {
      var far = legs[d3.maxIndex(legs, function (l) { return l.km; })];
      add('Perpindahan terjauh', far.a.name + ' → ' + far.b.name, nf.format(Math.round(far.km)) + ' km pada ' + far.b.year);
      add('Rata-rata pindah', 'tiap ' + nf1.format(t.span / legs.length) + ' tahun', legs.length + ' kali pindah');
    }
    if (fx.farthest && fx.farthest.km > 1) add('Titik terjauh dari ' + S[0].name, fx.farthest.place.name, nf.format(Math.round(fx.farthest.km)) + ' km' + (fx.farthest.trip ? ', saat liburan' : ''));
    if (center && center.near) add('Pusat hidup', 'dekat ' + center.near.name, 'Titik tengah semua tempat, ditimbang lama tinggal. ' + fmtCoord(center.lat, center.lon));
    add('Melintasi khatulistiwa', fx.equator ? fx.equator + ' kali' : 'Belum pernah', fx.equator ? 'Dihitung dari pindah dan liburan pulang-pergi.' : 'Semua tempatmu ada di belahan bumi yang sama.');
    if (fx.islands) add('Pulau dan daratan', fx.islands + (fx.islands > 1 ? ' berbeda' : ''), 'Tempat tinggal dan liburan.');
    if (fx.zones) add('Zona waktu', fx.zones.count + ' zona', fx.zones.count > 1 ? 'Selisih terjauh ' + nf1.format(fx.zones.spread) + ' jam.' : 'Semua tempatmu memakai jam yang sama.');
    if (TR.length) {
      var tkm = d3.sum(TR, function (x) { return x.km * 2; }), tf = TR[d3.maxIndex(TR, function (x) { return x.km; })];
      add('Liburan', TR.length + ' kali, ' + nf.format(Math.round(tkm)) + ' km pulang-pergi', 'Terjauh: ' + tf.p.name + (tf.home ? ', ' + nf.format(Math.round(tf.km)) + ' km dari ' + tf.home.name : ''));
    }
    if (DR.length) {
      var dn = DR.slice().sort(function (a, b) { return a.km - b.km; })[0];
      add('Tempat impian', DR.length + ' tujuan', S.length ? 'Terdekat: ' + dn.p.name + ', ' + nf.format(Math.round(dn.km)) + ' km dari ' + S[n - 1].name : null);
    }
  }

  var nick = null;
  function renderCompare() {
    var box = $('cmpBox'), list = $('cmpList');
    box.hidden = !(F && CMP && S.length);
    $('friendOn').hidden = !F;
    if (F) $('friendName').textContent = F.owner;
    if (box.hidden) return;
    $('cmpTitle').textContent = 'Kamu dan ' + F.owner;
    list.textContent = '';
    var add = function (big, txt) { list.appendChild(h('li', null, h('b', { text: big }), h('span', { text: txt }))); };
    CMP.together.forEach(function (m) { add(m.name, 'Sekota selama ' + m.years + ' tahun, ' + m.from + '–' + (m.to >= NOW ? 'sekarang' : m.to)); });
    if (CMP.shared.length) add(CMP.shared.map(function (x) { return x.name; }).join(', '), 'Sama-sama pernah tinggal di sini, di waktu yang berbeda');
    if (!CMP.together.length && CMP.closest) add(nf.format(Math.round(CMP.closest.km)) + ' km', 'Jarak terdekat kalian, pada ' + CMP.closest.year + ' (' + CMP.closest.a.name + ' dan ' + CMP.closest.f.name + ')');
    if (CMP.nowKm != null) add(CMP.nowKm < 30 ? 'Sekota' : nf.format(Math.round(CMP.nowKm)) + ' km', 'Jarak kalian sekarang (' + S[S.length - 1].name + ' dan ' + F.S[F.S.length - 1].name + ')');
  }

  /* ---------- Daftar ---------- */
  function renderList() {
    var ol = $('itin'); ol.textContent = '';
    $('emptyMsg').hidden = state.places.length > 0;
    $('btnReset').hidden = state.places.length === 0;
    var extraRow = function (p, meta) {
      var nameBtn = h('button', { class: 'namebtn', type: 'button', title: 'Lihat di peta', text: p.name });
      nameBtn.addEventListener('click', function () { focusPlace(p); });
      var del = h('button', { class: 'del', type: 'button', 'aria-label': 'Hapus ' + p.name, title: 'Hapus' }, '×');
      del.addEventListener('click', function () { state.places = state.places.filter(function (q) { return q.id !== p.id; }); changed(true); });
      return h('li', { class: 'stop' }, h('span', { class: 'chip chip-sm bg-' + p.cat }),
        h('div', null, h('div', { class: 'name' }, nameBtn), h('div', { class: 'meta', text: meta }), p.note ? h('div', { class: 'note', text: p.note }) : null), del);
    };
    S.forEach(function (p, i) {
      var end = i < S.length - 1 ? S[i + 1].year : null, yrs = stayYears(i);
      var meta = CAT[p.cat] + ' · ' + p.year + '–' + (end == null ? 'sekarang' : end) + (yrs > 0 ? ' · ' + yrs + ' tahun' : '');
      var nameBtn = h('button', { class: 'namebtn', type: 'button', title: 'Lihat di peta', text: p.name });
      nameBtn.addEventListener('click', function () { focusPlace(p); });
      var del = h('button', { class: 'del', type: 'button', 'aria-label': 'Hapus ' + p.name, title: 'Hapus' }, '×');
      del.addEventListener('click', function () { state.places = state.places.filter(function (q) { return q.id !== p.id; }); changed(true); });
      ol.appendChild(h('li', { class: 'stop' },
        h('span', { class: 'chip bg-' + p.cat, text: String(i + 1) }),
        h('div', null, h('div', { class: 'name' }, nameBtn), h('div', { class: 'meta', text: meta }), p.note ? h('div', { class: 'note', text: p.note }) : null),
        del));
      if (i < S.length - 1) ol.appendChild(h('li', { class: 'leg', text: '↓ ' + nf.format(Math.round(legs[i].km)) + ' km' }));
    });
    if (TR.length) {
      ol.appendChild(h('li', { class: 'subhead', text: 'Liburan' }));
      TR.forEach(function (t) { ol.appendChild(extraRow(t.p, t.p.year + (t.home ? ' · ' + nf.format(Math.round(t.km)) + ' km dari ' + t.home.name : ''))); });
    }
    if (DR.length) {
      ol.appendChild(h('li', { class: 'subhead', text: 'Tempat impian' }));
      DR.forEach(function (dr) { ol.appendChild(extraRow(dr.p, S.length ? nf.format(Math.round(dr.km)) + ' km dari ' + S[S.length - 1].name : 'Belum tercapai')); });
    }
  }

  function focusPlace(p) {
    stopPlay(false);
    viewP = Math.max(0, S.length - 1);
    if (S.length) { slider.value = slider.max; viewYear = +slider.max; setCaption(+slider.max, S.length - 1); }
    if (mode === 'globe') animateCam([-p.lon, -p.lat], Math.max(cam.k, 8), 650);
    else {
      var q = projection([p.lon, p.lat]), t = d3.zoomIdentity.translate(W / 2, H / 2).scale(Math.max(T.k, 10)).translate(-q[0], -q[1]);
      if (reduced) svg.call(zoom.transform, t); else svg.transition().duration(650).call(zoom.transform, t);
    }
    mapbox.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }

  /* ---------- Linimasa ---------- */
  var slider = $('yearSlider'), caption = $('caption'), badge = $('yearBadge');
  function idxForYear(y) { var idx = 0; S.forEach(function (p, i) { if (p.year <= y) idx = i; }); return idx; }
  function setCaption(y, idx) {
    caption.textContent = '';
    if (!S.length) { caption.textContent = 'Tambahkan tempat untuk melihat linimasa.'; badge.hidden = true; return; }
    var p = S[idx], maxY = +slider.max;
    caption.appendChild(h('b', { text: (y >= maxY && !playing ? 'Sekarang' : String(y)) }));
    var txt = ' · di ' + p.name + ' (' + CAT[p.cat].toLowerCase() + ')';
    if (S[0].cat === 'lahir' && y >= S[0].year) txt += ' · umur ' + (y - S[0].year);
    caption.appendChild(document.createTextNode(txt));
    badge.hidden = false; badge.textContent = String(y);
  }
  function syncSlider() {
    if (!S.length) { slider.disabled = true; setCaption(NOW, 0); return; }
    slider.disabled = S.length < 2;
    slider.min = S[0].year; slider.max = Math.max(NOW, S[S.length - 1].year); slider.value = slider.max;
    viewP = S.length - 1; viewYear = +slider.max; setCaption(+slider.max, S.length - 1);
  }
  slider.addEventListener('input', function () {
    stopPlay(false);
    var y = +slider.value, idx = idxForYear(y);
    viewP = idx; viewYear = y; setCaption(y, idx); drawOverlay();
  });

  var btnPlay = $('btnPlay');
  function stopPlay(finish) {
    if (!playing) return;
    playing = false; cancelAnimationFrame(rafId);
    btnPlay.innerHTML = '&#9654; Putar perjalanan';
    if (finish) { viewP = S.length - 1; viewYear = +slider.max; slider.value = slider.max; setCaption(+slider.max, S.length - 1); drawOverlay(); if (mode === 'globe') fitRoute(true); }
  }
  function play() {
    if (playing) { stopPlay(true); return; }
    if (S.length < 2) return;
    cancelAnimationFrame(camAnim);
    var follow = mode === 'globe' && !reduced;
    if (follow) { cam.rot = [-S[0].lon, -S[0].lat]; cam.k = legK(legs[0]); viewP = 0; applyCam(true); } else fitRoute(false);
    playing = true; btnPlay.innerHTML = '&#9632; Berhenti';
    var per = reduced ? 1 : 1300, hold = reduced ? 800 : 450, t0 = performance.now(), n = S.length;
    var ease = function (f) { return f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2; };
    (function frame(now) {
      if (!playing) return;
      var el = Math.max(0, now - t0), i = Math.floor(el / (per + hold));
      if (i >= n - 1) { stopPlay(true); return; }
      var f = Math.min(1, (el - i * (per + hold)) / per), e = ease(f);
      viewP = i + e;
      var y = Math.round(S[i].year + (S[i + 1].year - S[i].year) * e);
      slider.value = y; viewYear = y; setCaption(y, f >= 1 ? i + 1 : i);
      if (follow) {
        var hl = legs[i].it(e), tk = legK(legs[i]);
        var dl = ((-hl[0] - cam.rot[0] + 900) % 360) - 180;
        cam.rot[0] += dl * 0.14; cam.rot[1] += (-hl[1] - cam.rot[1]) * 0.14;
        cam.k = Math.exp(Math.log(cam.k) + (Math.log(tk) - Math.log(cam.k)) * 0.06);
        applyCam(true);
      } else drawOverlay();
      rafId = requestAnimationFrame(frame);
    })(t0);
  }
  btnPlay.addEventListener('click', play);

  /* ---------- Form ---------- */
  var cityInput = $('cityInput'), suggest = $('suggest'), formErr = $('formErr'), pickedInfo = $('pickedInfo');
  var sugItems = [], sugIdx = -1;
  function closeSuggest() { suggest.hidden = true; cityInput.setAttribute('aria-expanded', 'false'); sugItems = []; sugIdx = -1; }
  function isoAt(lon, lat) {
    var offs = [[0, 0], [0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15], [0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]];
    for (var o = 0; o < offs.length; o++) {
      var ll = [lon + offs[o][0], lat + offs[o][1]];
      for (var i = 0; i < features.length; i++) { if (d3.geoContains(features[i], ll)) return /^[A-Z]{3}$/.test(features[i].id) ? features[i].id : null; }
    }
    return null;
  }
  function isoOf(c) { return c.iso || A3[c.cc] || isoAt(c.lon, c.lat) || c.cc || null; }
  function choose(c) {
    picked = { name: c.name, lat: c.lat, lon: c.lon, iso: isoOf(c), fromMap: false };
    cityInput.value = c.name; closeSuggest();
    pickedInfo.hidden = false; pickedInfo.textContent = fmtCoord(c.lat, c.lon) + ' · ' + placeLabel(c);
    drawOverlay();
  }
  function showSuggest() {
    var q = norm(cityInput.value);
    if (!q) { closeSuggest(); return; }
    sugItems = searchCities(q, 8); sugIdx = -1;
    suggest.textContent = '';
    if (!sugItems.length) {
      suggest.appendChild(h('li', { text: 'Tidak ditemukan. Tandai titiknya di peta.' }));
    } else sugItems.forEach(function (c, i) {
      var lab = placeLabel(c);
      var twin = sugItems.some(function (o) { return o !== c && o.key === c.key && placeLabel(o) === lab; });
      if (twin) lab += ' · ' + fmtCoord(c.lat, c.lon);
      var li = h('li', { role: 'option', id: 'sug' + i }, h('span', { text: c.name }), h('small', { text: lab }));
      li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(c); });
      suggest.appendChild(li);
    });
    suggest.hidden = false; cityInput.setAttribute('aria-expanded', 'true');
  }
  cityInput.addEventListener('input', function () {
    if (picked && !picked.fromMap) { picked = null; pickedInfo.hidden = true; }
    if (picked && picked.fromMap) picked.name = cityInput.value.trim();
    showSuggest();
  });
  cityInput.addEventListener('keydown', function (e) {
    if (suggest.hidden || !sugItems.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length) % sugItems.length;
      Array.prototype.forEach.call(suggest.children, function (li, i) { li.classList.toggle('on', i === sugIdx); });
    } else if (e.key === 'Enter') { e.preventDefault(); choose(sugItems[Math.max(0, sugIdx)]); }
    else if (e.key === 'Escape') closeSuggest();
  });
  cityInput.addEventListener('blur', function () { setTimeout(closeSuggest, 120); });

  function setPick(on) {
    pickMode = on;
    svg.classed('picking', on); mapbox.classList.toggle('picking', on); $('pickHint').hidden = !on;
    $('btnPick').textContent = on ? 'Batal menandai di peta' : 'Tidak ada di daftar? Tandai titiknya di peta';
  }
  $('btnPick').addEventListener('click', function () {
    setPick(!pickMode);
    if (pickMode) mapbox.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  });
  svg.on('click', function (e) {
    if (!pickMode) return;
    if (dragMoved) { dragMoved = false; return; }
    var pt = d3.pointer(e, gOver.node()), ll = mode === 'globe' ? gproj.invert(pt) : projection.invert(T.invert(pt));
    if (!ll || !isFinite(ll[0]) || !isFinite(ll[1]) || Math.abs(ll[1]) > 89) return;
    picked = { name: cityInput.value.trim(), lat: ll[1], lon: ll[0], iso: isoAt(ll[0], ll[1]), fromMap: true };
    pickedInfo.hidden = false; pickedInfo.textContent = 'Titik dipilih: ' + fmtCoord(ll[1], ll[0]) + (picked.iso && NEGARA[picked.iso] ? ' · ' + NEGARA[picked.iso] : '');
    setPick(false); closeSuggest(); drawOverlay();
    if (!picked.name) cityInput.focus();
  });

  var showErr = function (m) { formErr.hidden = !m; formErr.textContent = m || ''; };
  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = cityInput.value.trim(), year = parseInt($('yearInput').value, 10), cat = $('catInput').value, note = $('noteInput').value.trim();
    var loc = picked;
    if (!loc) { var c = cityByName(name); if (c) loc = { name: c.name, lat: c.lat, lon: c.lon, iso: isoOf(c) }; }
    if (!name) return showErr('Isi nama kota atau tempatnya.');
    if (!loc) return showErr('Kota ini tidak ada di daftar. Pilih dari saran, atau tandai titiknya di peta.');
    if (cat === 'impian') year = null;
    else if (!isFinite(year) || year < 1900 || year > NOW) return showErr('Isi tahun antara 1900 dan ' + NOW + '.');
    if (cat === 'lahir' && !state.example && state.places.some(function (p) { return p.cat === 'lahir'; })) return showErr('Tempat lahir sudah ada. Hapus dulu yang lama kalau ingin menggantinya.');
    showErr(''); closeSuggest();
    if (state.example) { state.places = []; state.example = false; }
    state.places.push({ id: seq++, name: loc.fromMap ? name : loc.name, lat: loc.lat, lon: loc.lon, iso: loc.iso || null, cat: cat, year: year, note: note });
    picked = null; pickedInfo.hidden = true; cityInput.value = ''; $('noteInput').value = ''; $('yearInput').value = '';
    $('catInput').value = cat === 'lahir' ? 'sekolah' : cat;
    changed(true);
    cityInput.focus();
  });
  var syncCat = function () {
    var cat = $('catInput').value, yi = $('yearInput');
    yi.disabled = cat === 'impian';
    yi.placeholder = cat === 'impian' ? 'belum' : '2015';
    $('yearLabel').textContent = cat === 'liburan' ? 'Tahun' : (cat === 'impian' ? 'Tahun (tidak perlu)' : 'Sejak tahun');
    if (cat === 'impian') yi.value = '';
  };
  $('catInput').addEventListener('change', syncCat);

  /* ---------- Bandingkan ---------- */
  var nameInput = $('nameInput'), codeMsg = $('codeMsg'), codeBox = $('codeBox');
  nameInput.value = state.owner;
  nameInput.addEventListener('input', function () { state.owner = nameInput.value.trim(); save(); });
  var copyText = function (txt, done) {
    var fallback = function () { codeBox.hidden = false; codeBox.value = txt; codeBox.focus(); codeBox.select(); codeMsg.textContent = 'Teks dipilih. Tekan Ctrl + C untuk menyalin.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { codeBox.hidden = true; codeMsg.textContent = done; }, fallback); else fallback();
  };
  var hosted = /^https?:$/.test(location.protocol) && !/claude|anthropic/i.test(location.hostname);
  $('btnCopyLink').hidden = !hosted;
  $('btnCopyCode').addEventListener('click', function () {
    if (!state.places.length || state.example) { codeMsg.textContent = 'Isi dulu perjalananmu sendiri.'; return; }
    copyText(encodeJourney(state.owner, state.places), 'Kode tersalin. Kirim ke temanmu.');
  });
  $('btnCopyLink').addEventListener('click', function () {
    if (!state.places.length || state.example) { codeMsg.textContent = 'Isi dulu perjalananmu sendiri.'; return; }
    copyText(location.href.split('#')[0] + '#' + encodeJourney(state.owner, state.places), 'Link tersalin. Kirim ke temanmu.');
  });
  $('btnCompare').addEventListener('click', function () {
    var txt = $('friendInput').value, fj = decodeJourney(txt);
    if (!fj || !fj.places.some(isLife)) { codeMsg.textContent = 'Kode tidak dikenali. Tempel kode atau link utuh dari temanmu.'; return; }
    var code = txt.trim(); if (code.indexOf('#') >= 0) code = code.slice(code.lastIndexOf('#') + 1);
    state.friend = code.replace(/\s+/g, ''); $('friendInput').value = ''; codeMsg.textContent = '';
    changed(true);
  });
  $('btnUncompare').addEventListener('click', function () {
    state.friend = ''; codeMsg.textContent = '';
    try { if (location.hash.length > 20) history.replaceState(null, '', location.href.split('#')[0]); } catch (e) {}
    changed(true);
  });

  var resetArmed = 0;
  $('btnReset').addEventListener('click', function () {
    var b = $('btnReset');
    if (!resetArmed) { b.textContent = 'Yakin hapus semua?'; resetArmed = setTimeout(function () { resetArmed = 0; b.textContent = 'Hapus semua'; }, 3500); return; }
    clearTimeout(resetArmed); resetArmed = 0; b.textContent = 'Hapus semua';
    state.places = []; state.example = false; changed(true);
  });
  $('btnClearExample').addEventListener('click', function () { state.places = []; state.example = false; changed(true); cityInput.focus(); });

  $('zIn').addEventListener('click', function () { if (mode === 'globe') animateCam(cam.rot.slice(), Math.min(60, cam.k * 1.7), 250); else svg.transition().duration(reduced ? 0 : 250).call(zoom.scaleBy, 1.7); });
  $('zOut').addEventListener('click', function () { if (mode === 'globe') animateCam(cam.rot.slice(), Math.max(1, cam.k / 1.7), 250); else svg.transition().duration(reduced ? 0 : 250).call(zoom.scaleBy, 1 / 1.7); });
  $('zFit').addEventListener('click', function () { fitRoute(true); });

  function changed(animate) {
    stopPlay(false);
    rebuild(); save();
    $('banner').hidden = !state.example || !state.places.length;
    $('btnCard').disabled = S.length < 2;
    syncSlider(); renderList(); renderStats(); fitRoute(animate);
    drawOverlay();
  }

  /* ---------- Kartu ringkasan ---------- */
  var dlg = $('cardDlg'), ownerInput = $('ownerInput'), cardImg = $('cardImg');
  function summaryText() {
    var t = totals();
    return (state.owner ? 'Perjalanan hidup ' + state.owner : 'Perjalanan hidupku') + ': ' + S.map(function (p) { return p.name + ' (' + p.year + ')'; }).join(' → ') +
      '. Total ' + nf.format(Math.round(t.total)) + ' km, ' + t.cities + ' kota, ' + (t.countries || 1) + ' negara, ' + t.span + ' tahun.';
  }
  function drawCard() {
    renderCard({ owner: state.owner, nick: nick ? nick.title : '', S: S, legs: legs, projection: projection, features: features, W: W, H: H, totals: totals(), smKm: SM_KM, now: NOW, img: cardImg });
  }
  var cardTimer = 0;
  function openCard() {
    if (S.length < 2) return;
    ownerInput.value = state.owner; $('copyMsg').textContent = ''; $('copyBox').hidden = true;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    drawCard();
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('700 68px "Bricolage Grotesque"'), document.fonts.load('700 64px "JetBrains Mono"'), document.fonts.load('500 30px "Instrument Sans"')]).then(drawCard, function () {});
    }
  }
  $('btnCard').addEventListener('click', openCard);
  $('btnCloseCard').addEventListener('click', function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg && dlg.close) dlg.close(); });
  ownerInput.addEventListener('input', function () {
    state.owner = ownerInput.value.trim(); save(); nameInput.value = state.owner;
    clearTimeout(cardTimer); cardTimer = setTimeout(drawCard, 250);
  });
  $('btnCopy').addEventListener('click', function () {
    var txt = summaryText(), box = $('copyBox'), msg = $('copyMsg');
    var fallback = function () { box.hidden = false; box.value = txt; box.focus(); box.select(); msg.textContent = 'Teks dipilih. Tekan Ctrl + C untuk menyalin.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { msg.textContent = 'Tersalin.'; }, fallback); else fallback();
  });

  if (window.ResizeObserver) new ResizeObserver(function () { renderGlobe(false); drawOverlay(); }).observe(mapbox);
  var rethemed = function () { renderGlobe(false); };
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rethemed); } catch (e) {}
  if (window.MutationObserver) new MutationObserver(rethemed).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  $('yearInput').max = NOW;
  syncCat();
  applyModeUI();
  changed(false);
  loadWorld(function (ok) {
    var st = $('cityStatus');
    st.textContent = ok ? nf.format(CITIES.length + worldCount()) + ' kota dan kecamatan di seluruh dunia siap dicari.' : 'Daftar kota dunia gagal dimuat. Hanya ' + CITIES.length + ' kota utama yang bisa dicari; tempat lain bisa ditandai di peta.';
    if (ok && document.activeElement === cityInput && cityInput.value) showSuggest();
    if (ok) renderStats();
  });
})();
