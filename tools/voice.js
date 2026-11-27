// Pre-records every spoken text with macOS voices, so voice works offline and
// on phones without Czech/Ukrainian voices. Re-run after texts change:
//   node tools/voice.js
// Only changed texts are re-recorded (hash manifest in audio/manifest.json).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8') + ';this.C={LANGS,UI,EXAMS};', ctx);
const { LANGS, UI, EXAMS } = ctx.C;

const VOICE = { cs: 'Zuzana', uk: 'Lesya', en: 'Daniel' };
const outDir = path.join(root, 'audio');
const manifestPath = path.join(outDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const tmp = path.join(require('os').tmpdir(), 'nebojimse-voice.aiff');

const jobs = [];
for (const lang of LANGS) {
  for (const [exam, e] of Object.entries(EXAMS)) {
    for (const s of e.steps) {
      jobs.push({ file: `${lang}/${exam}-${s.id}-pre.m4a`, text: s.pre[lang], rate: 150, lang });
      jobs.push({ file: `${lang}/${exam}-${s.id}-pas.m4a`, text: s.pas[lang], rate: 170, lang });
    }
  }
  for (const k of ['pickGuide', 'planIntro', 'doneText', 'echoWarn', 'count20']) jobs.push({ file: `${lang}/ui-${k}.m4a`, text: UI[k][lang], rate: 155, lang });
  for (let n = 1; n <= 20; n++) jobs.push({ file: `${lang}/n${n}.m4a`, text: String(n), rate: 170, lang });
}

let made = 0;
for (const j of jobs) {
  const key = crypto.createHash('sha1').update(`${VOICE[j.lang]}|${j.rate}|${j.text}`).digest('hex').slice(0, 12);
  const out = path.join(outDir, j.file);
  if (manifest[j.file] === key && fs.existsSync(out)) continue;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('say', ['-v', VOICE[j.lang], '-r', String(j.rate), '-o', tmp, j.text]);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '40000', tmp, out]);
  manifest[j.file] = key; made++;
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`voice: ${made} recorded, ${jobs.length - made} unchanged, ${jobs.length} total`);
