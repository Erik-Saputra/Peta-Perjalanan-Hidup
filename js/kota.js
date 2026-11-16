// Data kota: daftar bawaan, kota dunia dari GeoNames, dan pencarian.
var NEGARA = { IDN: 'Indonesia', SGP: 'Singapura', MYS: 'Malaysia', BRN: 'Brunei', THA: 'Thailand', VNM: 'Vietnam', PHL: 'Filipina', KHM: 'Kamboja', LAO: 'Laos', MMR: 'Myanmar', TLS: 'Timor Leste', JPN: 'Jepang', KOR: 'Korea Selatan', CHN: 'Tiongkok', HKG: 'Hong Kong', TWN: 'Taiwan', IND: 'India', BGD: 'Bangladesh', LKA: 'Sri Lanka', NPL: 'Nepal', PAK: 'Pakistan', ARE: 'Uni Emirat Arab', QAT: 'Qatar', SAU: 'Arab Saudi', KWT: 'Kuwait', OMN: 'Oman', BHR: 'Bahrain', IRN: 'Iran', TUR: 'Turki', JOR: 'Yordania', EGY: 'Mesir', TUN: 'Tunisia', MAR: 'Maroko', SDN: 'Sudan', NGA: 'Nigeria', GHA: 'Ghana', KEN: 'Kenya', ETH: 'Etiopia', TZA: 'Tanzania', ZAF: 'Afrika Selatan', GBR: 'Inggris Raya', IRL: 'Irlandia', FRA: 'Prancis', NLD: 'Belanda', BEL: 'Belgia', DEU: 'Jerman', AUT: 'Austria', CHE: 'Swiss', ITA: 'Italia', ESP: 'Spanyol', PRT: 'Portugal', DNK: 'Denmark', SWE: 'Swedia', NOR: 'Norwegia', FIN: 'Finlandia', POL: 'Polandia', CZE: 'Ceko', HUN: 'Hungaria', GRC: 'Yunani', RUS: 'Rusia', UKR: 'Ukraina', AUS: 'Australia', NZL: 'Selandia Baru', USA: 'Amerika Serikat', CAN: 'Kanada', MEX: 'Meksiko', BRA: 'Brasil', ARG: 'Argentina', CHL: 'Cile', PER: 'Peru', COL: 'Kolombia', SUR: 'Suriname' };
var CITY_RAW = [
  'IDN:Banda Aceh,5.55,95.32;Sabang,5.89,95.32;Lhokseumawe,5.18,97.15;Langsa,4.47,97.97;Medan,3.59,98.67;Binjai,3.60,98.49;Pematangsiantar,2.96,99.06;Tebing Tinggi,3.33,99.16;Sibolga,1.74,98.78;Padangsidimpuan,1.38,99.27;Gunungsitoli,1.29,97.61;Padang,-0.95,100.35;Bukittinggi,-0.31,100.37;Payakumbuh,-0.22,100.63;Solok,-0.80,100.66;Pekanbaru,0.51,101.45;Dumai,1.67,101.45;Batam,1.13,104.05;Tanjungpinang,0.92,104.45;Jambi,-1.61,103.61;Palembang,-2.99,104.76;Lubuklinggau,-3.30,102.86;Prabumulih,-3.43,104.24;Pangkalpinang,-2.13,106.11;Tanjungpandan,-2.74,107.63;Bengkulu,-3.80,102.27;Bandar Lampung,-5.43,105.26;Metro,-5.11,105.31',
  'IDN:Jakarta,-6.21,106.85;Bogor,-6.60,106.80;Depok,-6.40,106.82;Tangerang,-6.18,106.63;Tangerang Selatan,-6.29,106.71;Bekasi,-6.24,106.99;Serang,-6.12,106.15;Cilegon,-6.02,106.05;Bandung,-6.91,107.61;Cimahi,-6.87,107.54;Sukabumi,-6.92,106.93;Cianjur,-6.82,107.14;Garut,-7.22,107.90;Tasikmalaya,-7.33,108.22;Cirebon,-6.73,108.55;Karawang,-6.31,107.30;Purwakarta,-6.56,107.44;Subang,-6.57,107.76;Indramayu,-6.33,108.32',
  'IDN:Semarang,-6.99,110.42;Surakarta (Solo),-7.57,110.83;Yogyakarta,-7.80,110.36;Magelang,-7.47,110.22;Salatiga,-7.33,110.50;Purwokerto,-7.43,109.24;Cilacap,-7.73,109.01;Tegal,-6.87,109.14;Pekalongan,-6.89,109.68;Kudus,-6.80,110.84;Jepara,-6.59,110.67;Pati,-6.75,111.04;Klaten,-7.71,110.60',
  'IDN:Surabaya,-7.26,112.75;Sidoarjo,-7.45,112.72;Gresik,-7.16,112.65;Malang,-7.98,112.63;Batu,-7.87,112.53;Kediri,-7.82,112.01;Blitar,-8.10,112.17;Madiun,-7.63,111.52;Mojokerto,-7.47,112.43;Pasuruan,-7.65,112.91;Probolinggo,-7.75,113.22;Jember,-8.17,113.70;Banyuwangi,-8.22,114.37;Tulungagung,-8.07,111.90;Ponorogo,-7.87,111.46;Bojonegoro,-7.15,111.88;Lamongan,-7.12,112.42;Tuban,-6.90,112.05;Pamekasan,-7.16,113.48;Sumenep,-7.01,113.86',
  'IDN:Denpasar,-8.65,115.22;Singaraja,-8.11,115.09;Ubud,-8.51,115.26;Mataram,-8.58,116.12;Sumbawa Besar,-8.49,117.42;Bima,-8.46,118.73;Labuan Bajo,-8.50,119.89;Ende,-8.85,121.66;Maumere,-8.62,122.21;Waingapu,-9.66,120.26;Kupang,-10.18,123.61',
  'IDN:Pontianak,-0.03,109.34;Singkawang,0.91,108.98;Ketapang,-1.85,109.97;Sintang,0.07,111.50;Palangka Raya,-2.21,113.92;Sampit,-2.53,112.95;Pangkalan Bun,-2.68,111.63;Banjarmasin,-3.32,114.59;Banjarbaru,-3.44,114.83;Balikpapan,-1.27,116.83;Samarinda,-0.50,117.15;Bontang,0.13,117.50;Nusantara (IKN),-0.97,116.71;Tarakan,3.30,117.63;Tanjung Selor,2.84,117.37',
  'IDN:Makassar,-5.15,119.43;Parepare,-4.01,119.62;Palopo,-3.00,120.20;Watampone,-4.54,120.33;Kendari,-3.99,122.51;Baubau,-5.47,122.60;Palu,-0.90,119.87;Luwuk,-0.95,122.79;Poso,-1.39,120.75;Mamuju,-2.68,118.89;Gorontalo,0.54,123.06;Manado,1.47,124.84;Bitung,1.44,125.19;Tomohon,1.33,124.84',
  'IDN:Ternate,0.79,127.38;Tidore,0.68,127.40;Sofifi,0.74,127.56;Ambon,-3.70,128.18;Tual,-5.63,132.75;Sorong,-0.88,131.26;Manokwari,-0.86,134.06;Fakfak,-2.92,132.30;Biak,-1.18,136.08;Nabire,-3.37,135.50;Timika,-4.55,136.89;Jayapura,-2.53,140.72;Wamena,-4.10,138.95;Merauke,-8.49,140.40',
  'SGP:Singapura,1.35,103.82', 'MYS:Kuala Lumpur,3.14,101.69;Johor Bahru,1.49,103.74;Penang,5.41,100.33;Kuching,1.55,110.34;Kota Kinabalu,5.98,116.07',
  'BRN:Bandar Seri Begawan,4.90,114.94', 'THA:Bangkok,13.76,100.50;Chiang Mai,18.79,98.98', 'VNM:Hanoi,21.03,105.85;Ho Chi Minh City,10.82,106.63',
  'PHL:Manila,14.60,120.98;Cebu,10.32,123.89', 'KHM:Phnom Penh,11.56,104.92', 'LAO:Vientiane,17.97,102.63', 'MMR:Yangon,16.84,96.17', 'TLS:Dili,-8.56,125.57',
  'JPN:Tokyo,35.68,139.69;Osaka,34.69,135.50;Kyoto,35.01,135.77;Nagoya,35.18,136.91;Fukuoka,33.59,130.40;Sapporo,43.06,141.35',
  'KOR:Seoul,37.57,126.98;Busan,35.18,129.08',
  'CHN:Beijing,39.90,116.41;Shanghai,31.23,121.47;Guangzhou,23.13,113.26;Shenzhen,22.54,114.06;Wuhan,30.59,114.31;Chengdu,30.57,104.07;Hangzhou,30.27,120.16;Nanjing,32.06,118.80',
  'HKG:Hong Kong,22.32,114.17', 'TWN:Taipei,25.03,121.57',
  'IND:New Delhi,28.61,77.21;Mumbai,19.08,72.88;Bengaluru,12.97,77.59;Chennai,13.08,80.27;Hyderabad,17.39,78.49;Kolkata,22.57,88.36',
  'BGD:Dhaka,23.81,90.41', 'LKA:Colombo,6.93,79.86', 'NPL:Kathmandu,27.72,85.32', 'PAK:Karachi,24.86,67.01;Islamabad,33.68,73.05;Lahore,31.55,74.34',
  'ARE:Dubai,25.20,55.27;Abu Dhabi,24.45,54.38', 'QAT:Doha,25.29,51.53', 'SAU:Riyadh,24.71,46.68;Jeddah,21.49,39.19;Makkah,21.39,39.86;Madinah,24.47,39.61',
  'KWT:Kuwait City,29.38,47.98', 'OMN:Muscat,23.59,58.41', 'BHR:Manama,26.23,50.59', 'IRN:Teheran,35.69,51.39', 'TUR:Istanbul,41.01,28.98;Ankara,39.93,32.86', 'JOR:Amman,31.95,35.93',
  'EGY:Kairo,30.04,31.24', 'TUN:Tunis,36.81,10.18', 'MAR:Rabat,34.02,-6.84;Casablanca,33.57,-7.59', 'SDN:Khartoum,15.50,32.56', 'NGA:Lagos,6.52,3.38', 'GHA:Accra,5.60,-0.19',
  'KEN:Nairobi,-1.29,36.82', 'ETH:Addis Ababa,9.03,38.74', 'TZA:Dar es Salaam,-6.79,39.21', 'ZAF:Johannesburg,-26.20,28.05;Cape Town,-33.92,18.42',
  'GBR:London,51.51,-0.13;Manchester,53.48,-2.24;Birmingham,52.49,-1.89;Edinburgh,55.95,-3.19;Leeds,53.80,-1.55', 'IRL:Dublin,53.35,-6.26', 'FRA:Paris,48.86,2.35;Lyon,45.76,4.84',
  'NLD:Amsterdam,52.37,4.90;Rotterdam,51.92,4.48;Den Haag,52.08,4.31;Leiden,52.16,4.49;Delft,52.01,4.36;Groningen,53.22,6.57;Wageningen,51.97,5.67;Utrecht,52.09,5.12;Eindhoven,51.44,5.48',
  'BEL:Brussel,50.85,4.35', 'DEU:Berlin,52.52,13.40;Muenchen,48.14,11.58;Hamburg,53.55,9.99;Frankfurt,50.11,8.68;Koeln,50.94,6.96;Stuttgart,48.78,9.18;Aachen,50.78,6.08',
  'AUT:Wina,48.21,16.37', 'CHE:Zurich,47.38,8.54;Jenewa,46.20,6.14', 'ITA:Roma,41.90,12.50;Milan,45.46,9.19', 'ESP:Madrid,40.42,-3.70;Barcelona,41.39,2.17', 'PRT:Lisbon,38.72,-9.14',
  'DNK:Kopenhagen,55.68,12.57', 'SWE:Stockholm,59.33,18.07', 'NOR:Oslo,59.91,10.75', 'FIN:Helsinki,60.17,24.94', 'POL:Warsawa,52.23,21.01', 'CZE:Praha,50.08,14.44', 'HUN:Budapest,47.50,19.04', 'GRC:Athena,37.98,23.73',
  'RUS:Moskow,55.76,37.62;Saint Petersburg,59.93,30.34', 'UKR:Kyiv,50.45,30.52',
  'AUS:Sydney,-33.87,151.21;Melbourne,-37.81,144.96;Brisbane,-27.47,153.03;Perth,-31.95,115.86;Adelaide,-34.93,138.60;Canberra,-35.28,149.13;Darwin,-12.46,130.84', 'NZL:Auckland,-36.85,174.76;Wellington,-41.29,174.78',
  'USA:New York,40.71,-74.01;Los Angeles,34.05,-118.24;San Francisco,37.77,-122.42;Seattle,47.61,-122.33;Chicago,41.88,-87.63;Boston,42.36,-71.06;Washington DC,38.91,-77.04;Houston,29.76,-95.37;Dallas,32.78,-96.80;Atlanta,33.75,-84.39;Miami,25.76,-80.19;Honolulu,21.31,-157.86',
  'CAN:Toronto,43.65,-79.38;Vancouver,49.28,-123.12;Montreal,45.50,-73.57', 'MEX:Mexico City,19.43,-99.13', 'BRA:Sao Paulo,-23.55,-46.63;Rio de Janeiro,-22.91,-43.17',
  'ARG:Buenos Aires,-34.60,-58.38', 'CHL:Santiago,-33.45,-70.67', 'PER:Lima,-12.05,-77.04', 'COL:Bogota,4.71,-74.07', 'SUR:Paramaribo,5.85,-55.20'
];
var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); };
var CITIES = [];
CITY_RAW.forEach(function (block) {
  var iso = block.slice(0, 3);
  block.slice(4).split(';').forEach(function (c) {
    var a = c.split(',');
    CITIES.push({ name: a[0], lat: +a[1], lon: +a[2], iso: iso, key: norm(a[0]) });
  });
});
/* Kota dunia dari GeoNames, dimuat dari berkas pendamping. Urutannya dari penduduk terbanyak. */
var WORLD = [];
var A3 = {};
'AF:AFG,AL:ALB,DZ:DZA,AS:ASM,AD:AND,AO:AGO,AI:AIA,AG:ATG,AR:ARG,AM:ARM,AW:ABW,AU:AUS,AT:AUT,AZ:AZE,BS:BHS,BH:BHR,BD:BGD,BB:BRB,BY:BLR,BE:BEL,BZ:BLZ,BJ:BEN,BM:BMU,BT:BTN,BO:BOL,BA:BIH,BW:BWA,BR:BRA,BN:BRN,BG:BGR,BF:BFA,BI:BDI,KH:KHM,CM:CMR,CA:CAN,CV:CPV,KY:CYM,CF:CAF,TD:TCD,CL:CHL,CN:CHN,CO:COL,KM:COM,CG:COG,CD:COD,CR:CRI,CI:CIV,HR:HRV,CU:CUB,CY:CYP,CZ:CZE,DK:DNK,DJ:DJI,DM:DMA,DO:DOM,EC:ECU,EG:EGY,SV:SLV,GQ:GNQ,ER:ERI,EE:EST,ET:ETH,FJ:FJI,FI:FIN,FR:FRA,GA:GAB,GM:GMB,GE:GEO,DE:DEU,GH:GHA,GR:GRC,GL:GRL,GD:GRD,GT:GTM,GN:GIN,GW:GNB,GY:GUY,HT:HTI,HN:HND,HK:HKG,HU:HUN,IS:ISL,IN:IND,ID:IDN,IR:IRN,IQ:IRQ,IE:IRL,IL:ISR,IT:ITA,JM:JAM,JP:JPN,JO:JOR,KZ:KAZ,KE:KEN,KI:KIR,KP:PRK,KR:KOR,KW:KWT,KG:KGZ,LA:LAO,LV:LVA,LB:LBN,LS:LSO,LR:LBR,LY:LBY,LI:LIE,LT:LTU,LU:LUX,MO:MAC,MK:MKD,MG:MDG,MW:MWI,MY:MYS,MV:MDV,ML:MLI,MT:MLT,MH:MHL,MR:MRT,MU:MUS,MX:MEX,FM:FSM,MD:MDA,MC:MCO,MN:MNG,ME:MNE,MA:MAR,MZ:MOZ,MM:MMR,NA:NAM,NR:NRU,NP:NPL,NL:NLD,NC:NCL,NZ:NZL,NI:NIC,NE:NER,NG:NGA,NO:NOR,OM:OMN,PK:PAK,PW:PLW,PS:PSE,PA:PAN,PG:PNG,PY:PRY,PE:PER,PH:PHL,PL:POL,PT:PRT,PR:PRI,QA:QAT,RO:ROU,RU:RUS,RW:RWA,KN:KNA,LC:LCA,VC:VCT,WS:WSM,SM:SMR,ST:STP,SA:SAU,SN:SEN,RS:SRB,SC:SYC,SL:SLE,SG:SGP,SK:SVK,SI:SVN,SB:SLB,SO:SOM,ZA:ZAF,SS:SSD,ES:ESP,LK:LKA,SD:SDN,SR:SUR,SZ:SWZ,SE:SWE,CH:CHE,SY:SYR,TW:TWN,TJ:TJK,TZ:TZA,TH:THA,TL:TLS,TG:TGO,TO:TON,TT:TTO,TN:TUN,TR:TUR,TM:TKM,TV:TUV,UG:UGA,UA:UKR,AE:ARE,GB:GBR,US:USA,UY:URY,UZ:UZB,VU:VUT,VE:VEN,VN:VNM,YE:YEM,ZM:ZMB,ZW:ZWE,EH:ESH,FK:FLK,PF:PYF,GU:GUM'
  .split(',').forEach(function (s) { A3[s.slice(0, 2)] = s.slice(3); });
var ID_PROV = { '01': 'Aceh', '02': 'Bali', '03': 'Bengkulu', '04': 'DKI Jakarta', '05': 'Jambi', '07': 'Jawa Tengah', '08': 'Jawa Timur', '10': 'DI Yogyakarta', '11': 'Kalimantan Barat', '12': 'Kalimantan Selatan', '13': 'Kalimantan Tengah', '14': 'Kalimantan Timur', '15': 'Lampung', '17': 'Nusa Tenggara Barat', '18': 'Nusa Tenggara Timur', '21': 'Sulawesi Tengah', '22': 'Sulawesi Tenggara', '24': 'Sumatera Barat', '26': 'Sumatera Utara', '28': 'Maluku', '29': 'Maluku Utara', '30': 'Jawa Barat', '31': 'Sulawesi Utara', '32': 'Sumatera Selatan', '33': 'Banten', '34': 'Gorontalo', '35': 'Bangka Belitung', '36': 'Papua', '37': 'Riau', '38': 'Sulawesi Selatan', '39': 'Papua Barat', '40': 'Kepulauan Riau', '41': 'Sulawesi Barat', '42': 'Kalimantan Utara', 'PD': 'Papua Barat Daya', 'PE': 'Papua Pegunungan', 'PS': 'Papua Selatan', 'PT': 'Papua Tengah' };
var regionNames = null;
try { regionNames = new Intl.DisplayNames(['id'], { type: 'region' }); } catch (e) {}
var placeLabel = function (c) {
  if (!c.cc) return NEGARA[c.iso] || c.iso || '';
  var country = c.cc;
  try { if (regionNames) country = regionNames.of(c.cc) || c.cc; } catch (e) {}
  var prov = c.cc === 'ID' ? ID_PROV[c.a1] : (c.cc === 'US' && c.a1 ? c.a1 : null);
  return (prov ? prov + ', ' : '') + country;
};
var builtIn = {};
CITIES.forEach(function (c) { (builtIn[c.key] = builtIn[c.key] || []).push(c); });
var loadWorld = function (onDone) {
  if (!window.fetch) return onDone(false);
  fetch('data/kota-dunia.txt').then(function (r) { if (!r.ok) throw new Error('gagal'); return r.text(); }).then(function (txt) {
    var lines = txt.split('\n'), out = [], tzLat = [], tzLon = [], tzIdx = [];
    for (var i = 0; i < lines.length; i++) {
      var a = lines[i].split('|');
      if (a[0] === '#tz') { TZ_NAMES = a.slice(1); continue; }
      if (a.length < 5) continue;
      var c = { name: a[0], cc: a[1], a1: a[2], lat: +a[3], lon: +a[4], key: norm(a[0]) };
      if (!c.key || !isFinite(c.lat) || !isFinite(c.lon)) continue;
      if (a[5]) { tzLat.push(c.lat); tzLon.push(c.lon); tzIdx.push(+a[5]); }
      var same = builtIn[c.key];
      if (same && same.some(function (b) { return Math.abs(b.lat - c.lat) < 0.4 && Math.abs(b.lon - c.lon) < 0.4; })) continue;
      out.push(c);
    }
    TZ_PTS = { lat: tzLat, lon: tzLon, idx: tzIdx };
    WORLD = out; onDone(out.length > 0);
  }).catch(function () { onDone(false); });
};
var cityByName = function (n) {
  var k = norm(n);
  return CITIES.find(function (c) { return c.key === k; }) || WORLD.find(function (c) { return c.key === k; });
};
var searchCities = function (q, limit) {
  var pre = [], inc = [], i, c, lists = [CITIES, WORLD];
  for (var l = 0; l < 2 && pre.length < limit; l++) {
    for (i = 0; i < lists[l].length && pre.length < limit; i++) {
      c = lists[l][i];
      var at = c.key.indexOf(q);
      if (at === 0) pre.push(c); else if (at > 0 && inc.length < limit) inc.push(c);
    }
  }
  return pre.concat(inc).slice(0, limit);
};

function worldCount() { return WORLD.length; }

// Zona waktu sebuah titik = zona waktu kota terdekat di data GeoNames. Mengembalikan null sebelum data termuat.
var TZ_NAMES = [], TZ_PTS = null, tzCache = {};
function tzNear(lat, lon) {
  if (!TZ_PTS || !TZ_NAMES.length) return null;
  var k = lat.toFixed(2) + ',' + lon.toFixed(2);
  if (k in tzCache) return tzCache[k];
  var best = -1, bd = Infinity, cl = Math.cos(lat * Math.PI / 180), la = TZ_PTS.lat, lo = TZ_PTS.lon;
  for (var i = 0; i < la.length; i++) {
    var dy = la[i] - lat, dx = lo[i] - lon;
    if (dx > 180) dx -= 360; else if (dx < -180) dx += 360;
    dx *= cl;
    var d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  }
  return (tzCache[k] = best >= 0 ? (TZ_NAMES[TZ_PTS.idx[best]] || null) : null);
}

export { CITIES, NEGARA, A3, norm, placeLabel, loadWorld, cityByName, searchCities, worldCount, tzNear };
