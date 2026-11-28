# Nebojím se výkonu: Hack jak Brno 2026, FN Brno challenge

A guide that walks a child through the exam truthfully, before they arrive. Built to the official brief (`project_information/Nebojim_se_vykonu_zadani_vyzvy.docx`) and presentation.

**Core rule from the brief: truth and trust.** The app shows only what really happens, in order, with how long it takes. Nothing is added, promised or played down. All texts come from the brief's step table (section 5) and the "sensitive moments" slide, and a doctor approves them before use.

## What it does

| Requirement in the brief | Where |
|---|---|
| Two exams, from arrival to leaving | Blood test (8 steps) and heart exam (7 steps) in `content.js` |
| Real places | 27 FN Brno photos in `img/`, the echo sound and screen video in `media/` |
| Preschool version | Goes straight from the guide choice to step 1 (no overview list). Big photo, one short sentence with the duration, icons, voice on the Listen button, guide character |
| Autism (PAS) version | An overview of all steps with durations before and after the walkthrough (a visual schedule). Literal text, fixed order with a step track, duration on every step, "what you will feel or hear" and "what happens / what you do" lists, identical on every run |
| Sensitive photos choice | The parent chooses at the start and can change it any time (⚙). When hidden, the step stays and a neutral picture is shown |
| Czech + Ukrainian, text and voice | cs, uk, plus sk and en. Slovak texts live in `content-sk.js`, keyed by the Czech original. Voice is pre-recorded in `audio/` at build time: Czech and English with ElevenLabs (voice Sarah), Slovak and Ukrainian with the macOS voices Laura and Lesya. It plays only when the child taps Listen and works offline on every phone. The ElevenLabs key stays in `.env` on the build machine |
| Original guide | The child picks the hospital's own clown (from the ambulance wall) or Pip the hedgehog. The PAS version can also pick "no guide" |
| Parent version | "Informace pro rodiče": the same steps in full, how to talk with the child, the sensitive moments |
| Doctor approves texts | `/lekar/` → "Kontrola textů": every text in every version and language with its voice recording to play, photos, open questions, approval per language (text and voice together), print for sign-off |
| Extras | QR codes from `/lekar/` (exam + version + language), offline PWA, no personal data |

Special steps: **Vpich** (the needle) has a count-to-20 practice with voice. **Echo** plays the real, loud heartbeat recording in advance (the brief says hearing it first helps).

## Run

```bash
python3 -m http.server 5174
```

After changing texts or media, run this once:

```bash
node tools/build.js
```

It re-records only the changed voice texts and refreshes the offline file list and cache version in `sw.js`. `node tools/check.js` confirms every text exists in all four languages, every voice file is there, and flags clips whose speaking speed is unusual (a hint of skipped or repeated words; a person still has to listen).

## Doctor's answers (28 Nov 2026) and what is still open

Answered by MUDr. Turan and built in:
- Reward: not always, and not always the same, so it is never promised to the child (no reward step; a note for parents).
- Holding the legs: common up to 7–8 years, done by nurses in blue shirts, so the child stays completely still.
- Heart exam: there may be a wait between the ECG and the echo, depending on how busy the day is (its own step).

Still open (also shown on /lekar/):
- Blood test, waiting room: is the waiting room in the photo the one used for blood tests?
- Heart exam: is the wait right after the ECG or just before the echo, and where?
- Heart exam, route photos: is the order hall → corridor → cardiology entrance → waiting room right?
- Heart exam, blood pressure: the cuff photos come from the "Odběr krve" folder. Is it the same device?
- Sensations not in the materials (cold gel, beeping monitor, dim echo room), "balónky a kolíčky" for the PAS version, how the nurse counts to 20, what happens at the end.

## Not in git

`project_information/` (the brief, presentation and original photos) is git-ignored. The resized photos in `img/` are real hospital photos. Ask FN Brno before publishing them on a public host.
