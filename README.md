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
| `resources/js/registry.js` | `registerExercise`, `menuOrder` (the seed catalog), and `dayExercises` (the pinned day list) |
| `resources/js/exercises/` | One seed exercise per file |
| `resources/js/picker.js` | The current example, the reel, and the face size |
| `resources/js/staff-glyphs.js` | Bravura/SMuFL SVG path outlines (clefs, accidentals, noteheads, flags, rests, time, tuplet digits); SIL OFL |
| `resources/js/staff.js` | Optional SVG staff for examples that parse as notation (clef, key, pitches, durations, rests, tuplets, labels). Time signature follows Setup meter |

| `resources/js/metronome.js` | Lookahead click. The clock is eighth notes. BPM is the speed of the bottom number |
| `resources/js/editor.js` | Edit exercises, staff preview of the line at the caret, Staff help beside Bars (tap an example to add it), Symbols behind a toggle (a pitch, slash, rest, bar, tie, or beam, then the music characters), Share on the Exercise row (More holds occasional actions on a phone). `edit.js` does not load |
| `resources/js/about.js` | Menu sheet. Payment and profile strings are sealed in this file |
| `resources/js/desk.js` | `localStorage` key `eization-desk` (setup + live exercise list) |
| `resources/js/hello.js` | First-run tour (exercise → Scales on a staff → Left Hand Rootless Voicings → example → Next → Setup → Play → Edit). Show me also points at how many examples are left, Reset, and BPM. Separate key `eization-hello` |
| `resources/js/awake.js` | Keeps the practice display on while that page is in front. Screen wake lock, then a muted looping clip with a silent audio track if the device refuses the lock |
| `resources/js/main.js` | Wiring, `init`, and a few Analytics events from practice clicks |
| `resources/js/guide-share.js` | Share and Embed on More and the exercise pages |
| `resources/css/style.css` | Practice screen layout |
| `notation.html` | How to write an example as staff notation. Each sample is the line, then the staff that line parses into. Try a line edits live and samples load into that box |
| `practice.html` | How to practice one example at a time. Links to each stock exercise |
| `for-teachers.html` | Hub for teacher articles. Menu links here. Pieces live under `for-teachers/` and `es/for-teachers/` |
| `more.html` | Extra exercises as share links. Each article shows the first example: a staff for a staff exercise, the line itself for a text exercise. Open one to Add or Edit in eization. Not in the default menu. Rebuild with `tools/build-more.ps1` from `tools/more-exercises.json` |
| `books.html` | Jazz books you already own, grouped by the kind of line you type. The pages do not reprint those books |
| `melodic-lines.html`, `scales-and-sets.html`, `changes.html`, `time.html`, `free-play.html` | How to practice that kind of line with the metronome |
| `resources/css/guide.css` | Layout for `practice.html`, exercise pages, and teacher articles |

## Staff notation (optional)

An example line that parses as music notation renders as an SVG staff instead of HTML text. A trailing ` · ` caption (or HTML `prog-changes` / `prog-name`) is stripped before parse and shown under the staff. The music side still rejects `<` or `&`. Notation-ish lines that fail to parse fall back to HTML text and log a `console.warn`.

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

- Chord symbol above: `^…` before the note, slash, rest, or stack it belongs to (`^Bb7 C4q`, `^G / / / / | ^D / / ^A / /`). A second `^` starts a new symbol at that event. `_` inside that word is a space (`^Any_dom_7`). An empty `^`, or a `^` with nothing after it, is rejected
- Text above a symbol: `^text` glued after the duration, or after `]` (`/w^P`, `rw^R`, `[E3h G3h B3h D4h]^C∆7`). Text under a symbol: `_text` (`C4_1`, `/e_R`, `]_3`). Both can sit on one symbol (`]^C∆7_3`, `/q^P_R`). A leading `b`, `#`, `bb`, or `##` prints ♭, ♯, 𝄫, or 𝄪 in either band (`^bVII`, `_bVII`, `_#IV`, `_bbVII`)
- Dynamics under the next note, slash, rest, or stack: `pp` `p` `mp` `mf` `f` `ff` `sfz`. They do not take time. Two in a row, or one with no note after it, is rejected
- Hairpins: `cresc` and `dim` open a wedge from the next note through the note that carries the next dynamic, or through the last note. A hairpin with no note after it is rejected
- Articulations, after the duration dot and before a label: `'` staccato, `>` accent, `-` tenuto, `^` marcato (`C4e'>_1`, `/q>`). A `^` at the end of a note, or a `^` before `_`, is marcato. A `^` followed by text is the above label. A `^` that starts a token is a chord symbol
- Simile: `%` fills the beats left in the bar (a whole bar, if it starts the bar) with the repeat sign and no slashes. It may follow a chord (`^I∆ / / %`)
- Pitches: `C4`, `C#4`, `Db4`, `Cn4`, doubles `C##4` / `Cx4` / `Ebb4` (letter, optional accidental, octave). Optional duration after the octave: `w` whole, `h` half, `q` quarter (default), `e` eighth, `s` sixteenth, `n` stemless quarter — e.g. `C4`, `C4h`, `C4e`, `C4s`, `C4n`. `n` is a filled notehead with no stem and lasts one beat, the same time as a quarter. Optional trailing `.` dots the duration (`C4q.`, `C4e.`; not `w.` or `n.`). Optional `!` forces the accidental even when the key already implies it (`F#4!`). Degree labels under a note use `_` (`Bb3_1`, `Ab4_b7`)
- Play anything: `/` is a stemless slash on the middle line, one beat, no pitch. Chord charts use it (`^G / / / / | ^D / / ^A / /`)
- Rhythmic slash (pitchless): `/q`, `/e`, `/h`, `/e.`, `/e_R`, `/w^P` — slash notehead on the middle line with stem/beam/dot like a normal note. A whole slash has no stem. `_text` is under it. `^text` is above it
- Rests: `r` / `rq` quarter (default), `rh` half, `rw` whole, `re` eighth, `rs` sixteenth; optional `.` (`re.`, `rq.`). The same `_text` and `^text` (`rw^R`, `rw_R`)
- Ties: `~` between two attacks of the same written pitch (`C4q~ C4q`, `/q~/q`, `{/e /e}~{/e /e}`, inside a beam or tuplet). Glued or spaced. The curve joins them; play the first and hold through the second. A tie may cross `|` (`C4q~ | C4q`). A chord ties each pitch it shares. A rest, a different pitch (`C4q~ D4q`, and `C#4` does not match `Db4`), or a dangling `~` is rejected. Every slash matches every slash
- Beams: consecutive `e`/`s` (including dotted `e.`) notes auto-beam within each Setup beat group; a lone short note gets a flag. In **6/8**, **9/8**, and **12/8** the group is a dotted quarter (three eighths), matching the metronome pulse. `{C4e D4e E4e F4e}` or `{/e /e}` forces one beam group (e/s only; not re-split by meter). Stacks `[…]` stay chords, not beams
- Tuplets: `(3 C4e D4e E4e)`, `(5 /s /s /s /s /s)`, `(3 /q /e)`, `(5:4 …)`. `(N` opens and `)` closes (on the last token or alone). Without `:M`, 3 is in the time of 2; 5–8 of 4; 9–16 of 8; 2 and 4 of 3. The colon form prints the ratio. Inside: notes, slashes, rests, stacks, `{…}` beams; no nested `(`, no `|`, at least two notes. Short notes inside beam only with each other (with braces inside, only the braces beam). The tuplet spans its scaled duration, so auto-beaming after it stays on the beat. A group that is exactly one unbroken beam shows the number only, on the beam side; anything else (quarters and longer, rests, split beams, flags, stacks) gets a bracket, below when every stem points down, otherwise above. Brackets and numbers stay at least ¾ space outside the staff and push chord names and labels out. Digits are SMuFL `tuplet0`–`tuplet9` / `tupletColon`
- Stacked chord: `[C4 E4 G4]` or `[F3 A3 C4 E4]^Dm9`. `^` after `]` is the name above the stack. `_` after `]` is text under it. A pitch inside the stack can carry the same pair (`[E3_3 G3_5 B3_7]^C∆7`). Prefer the same duration on every pitch in a stack (the column uses the first pitch’s duration for the stem). Nested `[` is rejected. Space-separated events left to right; `|` draws a barline
- Time signature is not in the string — it follows Setup meter (`beatsPerBar` / `beatUnit`). **4/4** → common-time **C**; **2/2** → cut-time **₵**; other meters use digits. Beat / compound group size also drives auto-beaming
- Staff ink (clefs, accidentals, noteheads, slash heads, augmentation dots, flags, rests, time digits / C / ₵) uses Bravura/SMuFL SVG paths in `staff-glyphs.js` (SIL OFL), not a music font. Quarters/halves/eighths/sixteenths get stems; wholes are the whole-notehead glyph only; `n` is the filled quarter head with no stem; beams are SVG lines. Chord labels stay text (`--face-font` / Noto Music for ♯ etc.)

`staff-glyphs.js` then `staff.js` load after the exercise scripts and before `picker.js`. `notation.html` (and `es/notation.html`) shows the same parser: the line, then the staff. In Edit, the line at the caret previews as a staff when it parses; a notation-ish line that fails stays text with an amber note. An empty preview coaches one example per line. Staff (beside Bars) opens a short writing guide without closing the draft. Tap an example there to add that line, then the guide closes and the preview draws it. Symbols stays closed until opened. Opened, the pitch row writes a note at the caret (`Eb4`, `C4e`, `C4e.`) from the letter, accidental, octave (3–5), and duration (quarter, eighth, dotted eighth). Slash and rest follow that duration. Bar, tie, and a beam brace (`{ }`, caret inside; a quarter switches to an eighth) insert the same way.

## Adding an exercise

Add a script tag after `registry.js` and before `picker.js`. Call `registerExercise` with a new `id`. Put that id in `menuOrder` only when it should seed into the exercise menu. An exercise with `inMenu: false` stays in the code and stays out of the seed list. Do not delete those files to tidy the list. A menu exercise carries `rev`, starting at 1. Bump `rev` when its examples, bars, or label change, and note the date beside that bump. Untouched copies on a device pick up the new text. An edited copy stays.

The rhythms exercise id is `limbs`. Its menu label is Rhythms. Its page is `rhythms.html`. After Restore defaults the menu is All Notes, Scales, All Chords, Chord Tones, Left Hand Rootless Voicings, Essential Progressions, Play/Rest, Rhythmic Devices, Motivic Development, Rhythms, and Free Play. Play/Rest (`playRest`, `play-rest.html`) is two bars of 4/4: a stemless `/` is play anything, and `rq` is a quarter rest. More lists the four-bar whole-note catalog at `more.html#whole-play-rest`: each bar is `/w^P` or `rw^R`, every combination once. The Scales menu exercise is the seven major modes. Harmonic and melodic minor, the melodic-minor modes, pentatonic and blues, and symmetric and bebop stay registered and live in More exercises. Tuplets, Consecutive Eight Notes, Consecutive Triplet-Eight Notes, the two-bar Held rhythm seed (`ties`), Dynamics, Sonic Nuances, All Intervals, Approach Notes, and Finger Patterns stay registered and live in More exercises. More already lists the one-bar Held rhythm catalog at `more.html#held-rhythm`.

When the new id is in `menuOrder`, add a page at the site root, link it from `practice.html`, and add the URL to `sitemap.xml`. Add the Spanish page under `es/`, link it from `es/practice.html`, and list that URL too. `hreflang` on each page points at the other language. That page should link to `./?exercise=` plus the id. On open, the practice screen selects that exercise when it is already on this device, then drops the query from the address bar. A registered exercise that is not on this device is added, then selected. An id that is not registered is ignored. Restore defaults still seeds only `menuOrder`.

Share sits on the Exercise row in Edit (always visible). It copies a link to the open exercise and shows Link copied in Edit when the clipboard is ready. On a phone, Download, Upload, Ask AI, Clear, and Delete sit under More; on a wider screen those actions sit beside Share. The link is a hash on that page (`https://eization.com/` or `https://eization.com/es/`). A short exercise stays `#s=` plus the examples. A longer one is `#s2=`: the same examples, with each staff line stored as the marks the parser uses and the rest kept as text, then compressed. An untouched stock exercise is `?exercise=` plus its id. Old `#s=` links still open. Opening a hash can add that exercise on this device. While that question is open, the practice screen shows the incoming exercise, and Next still steps through it. Play starts when they press it. Not now stops the click if they had started it, then returns to the exercise that was already open. An exact match opens the stored exercise and says nothing. A link whose examples match a factory exercise already on this device opens that exercise the same way, even when the title is in the other language. Staff lines match when they parse as the same music, so spacing and a written-out quarter (`C4` and `C4q`) count as the same line. A different exercise can replace the stored one or be added beside it. On a first visit the intro waits while that question or Edit is open, then plays once the exercise is on screen. An early Add or Not now does not start it a second time. An exercise that does not fit in the link stays on this device, and Download still writes the `.eiz` file.

`more.html` (and `es/more.html`) is a catalog of extra exercises that use those share links. They are not seeded into the menu. Each article shows the first example under the description: staff exercises draw that line, text exercises show the line as text. Each Open in eization link lands on the practice screen with Add / Edit (or Update when the same share id is already on the device). Share and Embed sit in that same row, and on each stock exercise page beside Open this exercise. Share hands over the absolute practice URL. Embed copies an iframe whose address adds `embed=1`. That view skips the intro and the add question, and it does not start the click.

`dayExercises` is a pinned copy of the stock menu, beside `menuOrder`. Append a new id there. Do not rebuild the list from `menuOrder`, or the exercise everyone sees that day moves. The day index is UTC midnight minus 17 Oct 2026, so the day changes at 00:00 UTC. One seeded shuffle of that list picks today's id. `?today=1` opens it. A normal visit still restores the last exercise. `?exercise=` wins when both are present. A share hash wins over the query. The reel uses that seeded order only when the open row is today's stock exercise and `touched` is false. An edited copy and a custom exercise stay random. Reset on that untouched row starts again at the first example of the same order. A reload that restores that row deals the same order again.

More exercises links to today's exercise and to Send an exercise or a correction. The menu does not. `?today=1` still opens the day. `?contribute=1` opens the send page for the open exercise, or a correction. Menu can Buy me a coffee; that opens the payment tab. Guide pages link `?coffee=1`, which opens About the author on Support. The mail address stays sealed in `about.js`. If the link does not fit, that one exercise downloads as `.eiz` and the draft asks them to attach it. Send my exercises and Share feedback stay for the full backup and an open note. The first time a pass ends for an exercise in a visit, the note says Send this exercise and stays long enough to tap. The hello tour does not call it, and it does not start the click.

`for-teachers/studio-link.html` offers a studio link: a mark, two colors, and a custom list. The picture is the practice screen at `?embed=1&look=1` (Wednesday Room, wine and copper). The page asks them to write; it does not name a fee. English only. The article top bar links it as eization studio, in the wine and copper of that page, and the teacher hub links it too. `?offer=1` opens About the author on Send the studio list. `for-teachers/exercise-of-the-day.html` and `for-teachers/lesson-on-the-page.html` are the teacher stories, with Spanish twins. The lesson page also shows the Wednesday Room frame and links the studio offer. The band-room, homework, and queue pieces mention it too. `for-teachers/band-room.html` is the stand copy for a band room. `for-parents.html` is the hub for the person in the other room, with two stories. `today.html` is the studio door: the address `https://eization.com/?today=1` and a static QR of that address. The Spanish door uses `https://eization.com/es/?today=1`.

Ask AI opens the open exercise in ChatGPT, Claude, or Gemini. The chat coaches the exercise. When the open lines are staff notation, the question includes that spelling. When it is ready, the reply is a block of examples to paste into the box. The site does not call a model.

On first visit the catalog is copied into `eization-desk.exercises`. The menu reads that list. Edit can Update, Save as new, or Delete. Download and Upload copy the open exercise to an `.eiz` file and back. The file begins with `# eization 1` and `# bars N`, optional `# name …`, then one example per line. A file without a version still opens. A higher version does not. Menu → This device can Download backup / Upload backup every exercise as JSON. About the author can open a mail draft for feedback, or download that backup and open a draft that asks you to attach it.

## Saved on this device

`eization-desk` keeps tempo, meter, clicks, bars, repeat, swing, count-in, nearby notes, mute, the last exercise, the exercise list, `deletedSeeds`, and `schema`. A shared exercise also stores `shareId` on its row. Two rows may share one `shareId`. It does not store whether the metronome is running.

`schema` is the shape of that object. A missing schema is 0. Schema 1 records `seedRev` and `touched` on each stock row (`seedId` set). `seedRev` is the catalog `rev` last copied onto that row. `touched` means the person edited it. A row with no `seedId` was written here or saved as new.

Schema 2 is a one-time reset of the exercise list. The next launch on a device that has not stored schema 2 drops every saved exercise, brings back the stock list, and clears `eization-hello` so the full intro plays. Tempo and meter stay. Schema 2 is stored on that launch, so a later visit does not drop exercises again.

Schema 3 rewrites stored example lines, including edited and custom ones. `]_` right after a stack becomes `]^`, so a chord name that was saved above the stack stays above. `C4_1` and `/e_R` stay. This step does not drop exercises.

After that, stock rows with `touched` false are copied from the current catalog. List order, `shareId`, and `deletedSeeds` stay. A new id in `menuOrder` is appended unless that id was deleted. A grammar change is the next schema step, and it rewrites example lines on every row, including custom ones. That step still does not drop a row that has lines.

The practice screen keeps the display on while that page is in front, so a phone or tablet can sit on the stand while you play. It asks for a screen wake lock as soon as the page is open, again after the first tap, Play, or Next, and again when you come back to it. If the device refuses the lock (older iOS, some Home Screen installs, Low Power Mode), a muted looping video with a silent audio track plays instead. That clip is not the metronome, and the hello tour still must not start the metronome. Switching apps lets the device sleep. Low Power Mode can still turn the screen off.

`eization-hello` is the intro generation, a string. `"1"` means generation 1 has played or been skipped. A missing key plays the full intro. The schema 2 launch clears this key, so the full intro plays on that open. When the tour grows later, bump `HELLO_GEN` in `hello.js` and set `HELLO_RETURN` to the new step range. People already on the previous generation see only that slice, once, on the next launch. Skip stores the new generation. Play the intro again (in Menu → This device) clears only `eization-hello`. Tempo, meter, and exercises stay. The intro plays on the next launch, not on that click.

Restore defaults (in Menu) still clears both keys, then re-seeds the stock exercises. The intro plays on the next launch, not on that click.

## Analytics

The practice screen already loads the Google tag. A few clicks also send an event: tempo start and stop, the exercise you choose, one Next per exercise each visit, edit, share, the intro, language, and Menu. Today, the contribute buttons, and the note at the end of a pass can send `today_exercise`, `contribute_send`, `contribute_correction`, and `pass_share`. Share and Embed on the guide pages can send `guide_share` and `guide_embed`. Those events carry a seed id when the link is `?exercise=`. Otherwise they send no exercise body and no hash. A parameter is a seed id (`custom` when the exercise was made on this device), `model`, `lang`, `link`, or `topic`. The example on screen, a custom title, the email, and payment details stay out. `?smoke=1` sends no events. In the Google Analytics property, register `exercise_id`, `model`, `lang`, `link`, and `topic` as event-scoped custom dimensions.

Another open tab keeps its own screen. Update asks before it replaces an exercise whose lines changed in that other tab. A second Update replaces them. If the other tab removes the exercise on screen, this tab switches to the one now stored. Tempo and meter from the other tab stay there until this tab is reloaded.

Constraints for later sessions are in `.cursor/rules/eization.mdc`.

## Tests

Serve this folder and open `tests/smoke.html`. The page title is PASS or FAIL, and the list of checks is on the page. The suite uses the real app in a frame. It does not start the metronome.
