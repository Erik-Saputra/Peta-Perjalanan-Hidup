// Membuat peta-perjalanan-hidup.html (halaman untuk Artifact di claude.ai) dari index.html.
// Artifact menambahkan sendiri kerangka <html>, jadi halaman ini hanya berisi isi <head> dan <body>.
//   node tools/buat-artifact.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1];
const body = /<body>([\s\S]*?)<\/body>/.exec(html)[1].trim();
const keep = head.split('\n').filter(l => l.trim() && !/<meta (charset|name="viewport")/.test(l));
const title = keep.find(l => l.includes('<title>'));
const rest = keep.filter(l => l !== title);
const out = [title, '<meta name="claude:viewport-fit-sides" content="cover">', ...rest, '', body, ''].join('\n');
fs.writeFileSync(path.join(root, 'peta-perjalanan-hidup.html'), out, 'utf8');
console.log('peta-perjalanan-hidup.html', Buffer.byteLength(out), 'byte');
