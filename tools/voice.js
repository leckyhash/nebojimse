// Records every spoken text into audio/<lang>/*.m4a, so voice works offline on every phone.
//   node tools/voice.js          record what changed
//   node tools/voice.js --dry    only show what would be recorded, and how many ElevenLabs characters it costs
// Languages in ELEVEN.langs use ElevenLabs (needs ELEVENLABS_API_KEY in .env), the rest use macOS `say`.
// The API key is only used here, at build time. It never reaches the app or the browser.
// Only changed texts are re-recorded (hash manifest in audio/manifest.json).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), os = require('os');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
try { process.loadEnvFile(path.join(root, '.env')); } catch { /* no .env: macOS voices only */ }

const ELEVEN = {
  langs: ['cs', 'en'],                 // Czech for families, English for the pitch; sk and uk use macOS voices (Laura, Lesya) to fit the free 10k/month quota
  voiceId: 'EXAVITQu4vr4xnSDxMaL',     // "Sarah" (pre-made, warm and reassuring), from this account's voice list
  model: 'eleven_v4',
  settings: { pre: { stability: 0.5, similarityBoost: 0.75 },   // preschool: a little warmer
              pas: { stability: 0.75, similarityBoost: 0.75 },  // exact version: steady, the same every time
              ui: { stability: 0.6, similarityBoost: 0.75 } },
};
const SAY = { voice: { cs: 'Zuzana', sk: 'Laura', uk: 'Lesya', en: 'Daniel' }, rate: { pre: 150, pas: 170, ui: 155 } };

const ctx = {};
vm.createContext(ctx);
vm.runInContext(['content-sk.js', 'content.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') + ';this.C={LANGS,UI,EXAMS};', ctx);
const { LANGS, UI, EXAMS } = ctx.C;

function jobs() {
  const list = [];
  for (const lang of LANGS) {
    for (const [exam, e] of Object.entries(EXAMS)) for (const s of e.steps) {
      list.push({ file: `${lang}/${exam}-${s.id}-pre.m4a`, text: s.pre[lang], kind: 'pre', lang });
      list.push({ file: `${lang}/${exam}-${s.id}-pas.m4a`, text: s.pas[lang], kind: 'pas', lang });
    }
    for (const k of ['pickGuide', 'planIntro', 'doneText', 'echoWarn', 'count20']) list.push({ file: `${lang}/ui-${k}.m4a`, text: UI[k][lang], kind: 'ui', lang });
    for (let n = 1; n <= 20; n++) list.push({ file: `${lang}/n${n}.m4a`, text: String(n), kind: 'pas', lang });
  }
  return list;
}

const useEleven = lang => !!process.env.ELEVENLABS_API_KEY && ELEVEN.langs.includes(lang);
const keyOf = j => crypto.createHash('sha1').update(useEleven(j.lang)
  ? `eleven|${ELEVEN.voiceId}|${ELEVEN.model}|${JSON.stringify(ELEVEN.settings[j.kind])}|${j.text}`
  : `${SAY.voice[j.lang]}|${SAY.rate[j.kind]}|${j.text}`).digest('hex').slice(0, 12);

async function eleven(client, j, out) {
  const { Readable } = require('stream');
  const audio = await client.textToSpeech.convert(ELEVEN.voiceId, {
    text: j.text, modelId: ELEVEN.model, languageCode: j.lang, applyTextNormalization: 'on',
    voiceSettings: ELEVEN.settings[j.kind], outputFormat: 'mp3_44100_64',
  });
  const chunks = [];
  for await (const c of Readable.fromWeb(audio)) chunks.push(c);
  const mp3 = path.join(os.tmpdir(), 'nebojimse-voice.mp3');
  fs.writeFileSync(mp3, Buffer.concat(chunks));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', mp3, '-c:a', 'aac', '-b:a', '64k', out]);
}
function macSay(j, out) {
  const aiff = path.join(os.tmpdir(), 'nebojimse-voice.aiff');
  execFileSync('say', ['-v', SAY.voice[j.lang], '-r', String(SAY.rate[j.kind]), '-o', aiff, j.text]);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '40000', aiff, out]);
}

async function run({ dry = process.argv.includes('--dry') } = {}) {
  const outDir = path.join(root, 'audio');
  const manifestPath = path.join(outDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  const todo = jobs().filter(j => manifest[j.file] !== keyOf(j) || !fs.existsSync(path.join(outDir, j.file)));
  const chars = todo.filter(j => useEleven(j.lang)).reduce((n, j) => n + j.text.length, 0);
  if (dry) {
    const by = {};
    for (const j of todo) { const k = `${j.lang} (${useEleven(j.lang) ? 'ElevenLabs' : 'macOS'})`; by[k] = (by[k] || 0) + 1; }
    console.log('voice --dry:', JSON.stringify(by), `ElevenLabs characters: ${chars}`);
    return;
  }
  let client = null, made = 0;
  if (todo.some(j => useEleven(j.lang))) {
    const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
    client = new ElevenLabsClient();
  }
  for (const j of todo) {
    const out = path.join(outDir, j.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    try {
      useEleven(j.lang) ? await eleven(client, j, out) : macSay(j, out);
    } catch (e) {
      // keep the previous recording and stop, e.g. when the quota is used up (401/402/429)
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
      throw new Error(`voice: stopped at ${j.file} (${e.statusCode || ''} ${String(e.message).slice(0, 160)}). ${made} files recorded before that.`);
    }
    manifest[j.file] = keyOf(j); made++;
    if (made % 10 === 0) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  console.log(`voice: ${made} recorded (${chars} ElevenLabs characters), ${jobs().length - made} unchanged`);
}

module.exports = { run };
if (require.main === module) run().catch(e => { console.error(e.message); process.exit(1); });
