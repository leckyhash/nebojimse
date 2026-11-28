// Checks that every text exists in every language and every voice file exists.
//   node tools/check.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(['content-sk.js', 'content.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n')
  + ';this.C={LANGS,UI,EXAMS,PHOTOS,SENSES,DOING,TALK,SK};', ctx);
const { LANGS, UI, EXAMS, PHOTOS, SENSES, DOING, TALK, SK } = ctx.C;

const problems = [];
const text = (o, where) => {
  if (!o) return;
  for (const l of LANGS) if (!o[l]) problems.push(`missing ${l}: ${where}`);
  if (!SK[o.cs]) problems.push(`no Slovak translation: ${where} ("${o.cs}")`);
};
for (const k in UI) text(UI[k], `UI.${k}`);
for (const k in PHOTOS) text(PHOTOS[k], `PHOTOS.${k}`);
for (const k in SENSES) text(SENSES[k].t, `SENSES.${k}`);
for (const k in DOING) text(DOING[k].t, `DOING.${k}`);
TALK.forEach((x, i) => text(x, `TALK[${i}]`));
for (const [id, e] of Object.entries(EXAMS)) {
  text(e.name, id); text(e.total, `${id}.total`);
  e.moments.forEach((m, i) => { text(m.t, `${id}.moments[${i}]`); text(m.d, `${id}.moments[${i}]`); });
  for (const s of e.steps) {
    for (const f of ['title', 'dur', 'pre', 'pas', 'parent']) text(s[f], `${id}.${s.id}.${f}`);
    for (const p of s.photos) if (!fs.existsSync(path.join(root, 'img', `${p}.jpg`))) problems.push(`missing photo img/${p}.jpg`);
    for (const l of LANGS) for (const v of ['pre', 'pas'])
      if (!fs.existsSync(path.join(root, 'audio', l, `${id}-${s.id}-${v}.m4a`))) problems.push(`missing voice audio/${l}/${id}-${s.id}-${v}.m4a`);
  }
}
// Voice clips whose speaking speed is far from the others in the same language usually mean
// skipped, repeated or garbled words. They still need a human to listen; this only points at suspects.
const { execFileSync } = require('child_process');
const rates = {};
for (const [id, e] of Object.entries(EXAMS)) for (const s of e.steps) for (const l of LANGS) for (const v of ['pre', 'pas']) {
  const f = path.join(root, 'audio', l, `${id}-${s.id}-${v}.m4a`);
  if (!fs.existsSync(f)) continue;
  const sec = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();
  (rates[l] = rates[l] || []).push({ file: `audio/${l}/${id}-${s.id}-${v}.m4a`, cps: s[v][l].length / sec });
}
for (const [l, list] of Object.entries(rates)) {
  const sorted = list.map(x => x.cps).sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
  for (const x of list) if (x.cps < median * 0.65 || x.cps > median * 1.5)
    problems.push(`listen to ${x.file}: ${x.cps.toFixed(1)} characters/s, the ${l} clips usually run at ${median.toFixed(1)}`);
}

console.log(problems.length ? problems.join('\n') : `check: all texts in ${LANGS.join(', ')}, all photos and voice files present, no voice clip with an unusual speed`);
process.exitCode = problems.length ? 1 : 0;
