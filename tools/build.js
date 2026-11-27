// One command before every deploy:  node tools/build.js
// 1) records changed voice texts, 2) writes the offline file list and a new cache version into sw.js.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
require('./voice.js');

const root = path.join(__dirname, '..');
const shell = ['./', 'index.html', 'styles.css', 'content.js', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];
const dirFiles = d => fs.readdirSync(path.join(root, d)).filter(f => !f.startsWith('.')).map(f => `${d}/${f}`);
const assets = [...shell, ...dirFiles('img'), ...dirFiles('media')];

const hash = crypto.createHash('sha1');
for (const f of assets.filter(f => f !== './')) hash.update(fs.readFileSync(path.join(root, f)));
const version = 'nebojimse-' + hash.digest('hex').slice(0, 10);

const sw = path.join(root, 'sw.js');
let src = fs.readFileSync(sw, 'utf8');
src = src.replace(/const VERSION = .*;/, `const VERSION = '${version}';`)
         .replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = ${JSON.stringify(assets)};`);
fs.writeFileSync(sw, src);
console.log(`sw.js: ${version}, ${assets.length} files precached (voice files are cached per language when the child starts)`);
