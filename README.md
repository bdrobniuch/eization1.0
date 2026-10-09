# eization

Practice for any instrument. One example at a time, with the metronome. The practice screen is one static page. Guide pages sit beside it. No build step, no backend. It runs from `file://` and from GitHub Pages.

## Run

Open `index.html`, or serve this folder as the site root. Asset paths are relative (`./resources/...`).

## Publish

GitHub Pages, branch of your choice, folder `/` (the repo root). Keep `.nojekyll` so Pages does not drop files that start with `_`.

The public address used for search and link previews is `https://eization.com/`. `CNAME` keeps that host on GitHub Pages. If that address changes, update these together:

- the canonical link, Open Graph URL, and image URLs in `index.html`, `practice.html`, the book pages, the teacher pages under `for-teachers/`, and each exercise page
- `robots.txt`
- `sitemap.xml`
- `CNAME`

After a publish, submit `sitemap.xml` in Google Search Console for that host.

## Where things live

Scripts in `index.html` load in order. `registry.js` must come before the exercise files. `main.js` is last and calls `init`.

| File | Role |
| --- | --- |
| `resources/js/i18n.js` | English and Spanish. `localStorage` key `eization-lang` after a choice. First visit follows the browser. `es/` is the Spanish HTML search engines and link previews read | 
| `resources/js/registry.js` | `registerExercise` and `menuOrder` (the seed catalog) |
| `resources/js/exercises/` | One seed exercise per file |
| `resources/js/picker.js` | The current example, the reel, and the face size |
| `resources/js/staff-glyphs.js` | Bravura/SMuFL SVG path outlines (clefs, accidentals, noteheads, rests, time); SIL OFL |
| `resources/js/staff.js` | Optional SVG staff for examples that parse as notation (clef, key, pitches, durations, rests, labels). Time signature follows Setup meter |

| `resources/js/metronome.js` | Lookahead click. The clock is eighth notes. BPM is the speed of the bottom number |
| `resources/js/editor.js` | Edit exercises. `edit.js` does not load |
| `resources/js/about.js` | Menu sheet. Payment and profile strings are sealed in this file |
| `resources/js/desk.js` | `localStorage` key `eization-desk` (setup + live exercise list) |
| `resources/js/hello.js` | First-run tour (exercise → example → Next → Setup → Play → Edit). Show me also points at how many examples are left, Reset, and BPM. Separate key `eization-hello` |
| `resources/js/awake.js` | Keeps the practice display on while that page is in front. Screen wake lock, then a muted looping clip with a silent audio track if the device refuses the lock |
| `resources/js/main.js` | Wiring, `init`, and a few Analytics events from practice clicks |
| `resources/css/style.css` | Practice screen layout |
| `practice.html` | How to practice one example at a time. Links to each stock exercise |
| `for-teachers.html` | Hub for teacher articles. Pieces live under `for-teachers/` and `es/for-teachers/` |
| `more.html` | Extra exercises as share links. Open one to Add or Preview in eization. Not in the default menu. Rebuild with `tools/build-more.ps1` from `tools/more-exercises.json` |
| `books.html` | Jazz books you already own, grouped by the kind of line you type. The pages do not reprint those books |
| `melodic-lines.html`, `scales-and-sets.html`, `changes.html`, `time.html`, `free-play.html` | How to practice that kind of line with the metronome |
| `resources/css/guide.css` | Layout for `practice.html`, exercise pages, and teacher articles |

## Staff notation (optional)

An example line that parses as music notation renders as an SVG staff instead of HTML text. Detection rejects anything with `<` or `&`, so the existing catalog stays text. Notation-ish lines that fail to parse fall back to HTML text and log a `console.warn`.

- Clef / key: leading `@treble` or `@bass` and `@key=NAME` in any order (default treble, key C). Unknown `@…` tokens are rejected
- Key names: major (`@key=G`, `@key=Eb`, `@key=F#`) or minor aliases that map to the relative major for the signature only:

  | Alias | Signature | Alias | Signature |
  | --- | --- | --- | --- |
  | Am | C | Dm | F |
  | Em | G | Gm | Bb |
  | Bm | D | Cm | Eb |
  | F#m | A | Fm | Ab |
  | C#m | E | Bbm | Db |
  | G#m | B | Ebm | Gb |
  | D#m | F# | Abm | Cb |
  | A#m | C# | | |

- Chord symbol above: optional `^…` before the first note (`^Bb7 …`), or `_Name` on a stack (`[F3 A3 C4 E4]_Dm9`)
- Pitches: `C4`, `C#4`, `Db4`, `Cn4`, doubles `C##4` / `Cx4` / `Ebb4` (letter, optional accidental, octave). Optional duration after the octave: `w` whole, `h` half, `q` quarter (default `q`) — e.g. `C4`, `C4h`, `C4w`. Optional `!` forces the accidental even when the key already implies it (`F#4!`). Degree labels under a note use `_` (`Bb3_1`, `Ab4_b7`)
- Rests: `r` / `rq` quarter (default), `rh` half, `rw` whole — each advances one note slot
- Stacked chord: `[C4 E4 G4]` or `[F3 A3 C4 E4]_Dm9`. Prefer the same duration on every pitch in a stack (the column uses the first pitch’s duration). Space-separated events left to right; `|` draws a barline
- Time signature is not in the string — it follows Setup meter (`beatsPerBar` / `beatUnit`). **4/4** → common-time **C**; **2/2** → cut-time **₵**; other meters use digits
- Staff ink (clefs, accidentals, noteheads, rests, time digits / C / ₵) uses Bravura/SMuFL SVG paths in `staff-glyphs.js` (SIL OFL), not a music font. Quarters and halves get a stem; wholes are the whole-notehead glyph only. Chord labels stay text (`--face-font` / Noto Music for ♯ etc.)

`staff-glyphs.js` then `staff.js` load after the exercise scripts and before `picker.js`. Temporary seed: `staffDemo` (Restore defaults to pick it up on an existing desk).

## Adding an exercise

Add a script tag after `registry.js` and before `picker.js`. Call `registerExercise` with a new `id`. Put that id in `menuOrder` only when it should seed into the exercise menu. An exercise with `inMenu: false` stays in the code and stays out of the seed list. Do not delete those files to tidy the list.

The rhythms exercise id is `limbs`. Its menu label is Rhythms. Its page is `rhythms.html`.

When the new id is in `menuOrder`, add a page at the site root, link it from `practice.html`, and add the URL to `sitemap.xml`. Add the Spanish page under `es/`, link it from `es/practice.html`, and list that URL too. `hreflang` on each page points at the other language. That page should link to `./?exercise=` plus the id. On open, the practice screen selects that exercise when it is still in the menu, then drops the query from the address bar. An id that is not in `menuOrder` is ignored.

Share in Edit copies a link to the open exercise. The link is a `#s=` hash on that page (`https://eization.com/` or `https://eization.com/es/`). Opening it can add that exercise on this device. An exact match opens the stored exercise and says nothing. A link whose examples match a factory exercise already on this device opens that exercise the same way, even when the title is in the other language. A different exercise can replace the stored one or be added beside it. On a first visit the intro waits while that question or Preview is open, then plays once the exercise is on screen. An exercise that does not fit in the link stays on this device, and Download still writes the `.eiz` file.

`more.html` (and `es/more.html`) is a catalog of extra exercises that use those share links. They are not seeded into the menu. Each Open in eization link lands on the practice screen with Add / Preview (or Update when the same share id is already on the device).

Ask AI opens the open exercise in ChatGPT, Claude, or Gemini. The chat coaches the exercise. When it is ready, the reply is a block of examples to paste into the box. The site does not call a model.

On first visit the catalog is copied into `eization-desk.exercises`. The menu reads that list. Edit can Update, Save as new, or Delete. Download and Upload copy the open exercise to an `.eiz` file and back. The file begins with `# eization 1` and `# bars N`, optional `# name …`, then one example per line. A file without a version still opens. A higher version does not. Menu → This device can Download backup / Upload backup every exercise as JSON. About the author can open a mail draft for feedback, or download that backup and open a draft that asks you to attach it.

## Saved on this device

`eization-desk` keeps tempo, meter, clicks, bars, repeat, swing, count-in, nearby notes, mute, the last exercise, the exercise list, and `deletedSeeds`. A shared exercise also stores `shareId` on its row. Two rows may share one `shareId`. It does not store whether the metronome is running.

The practice screen keeps the display on while that page is in front, so a phone or tablet can sit on the stand while you play. It asks for a screen wake lock as soon as the page is open, again after the first tap, Play, or Next, and again when you come back to it. If the device refuses the lock (older iOS, some Home Screen installs, Low Power Mode), a muted looping video with a silent audio track plays instead. That clip is not the metronome, and the hello tour still must not start the metronome. Switching apps lets the device sleep. Low Power Mode can still turn the screen off.

`eization-hello` is `"1"` after the intro has played or been skipped. Restore defaults (in Menu) clears both keys, then re-seeds the stock exercises. The intro plays on the next launch, not on that click.

## Analytics

The practice screen already loads the Google tag. A few clicks also send an event: tempo start and stop, the exercise you choose, one Next per exercise each visit, edit, share, the intro, language, and Menu. A parameter is a seed id (`custom` when the exercise was made on this device), `model`, `lang`, `link`, or `topic`. The example on screen, a custom title, the email, and payment details stay out. `?smoke=1` sends no events. In the Google Analytics property, register `exercise_id`, `model`, `lang`, `link`, and `topic` as event-scoped custom dimensions.

Another open tab keeps its own screen. Update asks before it replaces an exercise whose lines changed in that other tab. A second Update replaces them. If the other tab removes the exercise on screen, this tab switches to the one now stored. Tempo and meter from the other tab stay there until this tab is reloaded.

Constraints for later sessions are in `.cursor/rules/eization.mdc`.

## Tests

Serve this folder and open `tests/smoke.html`. The page title is PASS or FAIL, and the list of checks is on the page. The suite uses the real app in a frame. It does not start the metronome.
