# eization

Practice for any instrument. One example at a time, with the metronome. The practice screen is one static page. Guide pages sit beside it. No build step, no backend. It runs from `file://` and from GitHub Pages.

## Run

Open `index.html`, or serve this folder as the site root. Asset paths are relative (`./resources/...`).

## Publish

GitHub Pages, branch of your choice, folder `/` (the repo root). Keep `.nojekyll` so Pages does not drop files that start with `_`.

The public address used for search and link previews is `https://eization.com/`. `CNAME` keeps that host on GitHub Pages. If that address changes, update these together:

- the canonical link, Open Graph URL, and image URLs in `index.html`, `practice.html`, the book pages, and each exercise page
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
| `resources/js/metronome.js` | Lookahead click. The clock is eighth notes. BPM is the speed of the bottom number |
| `resources/js/editor.js` | Edit exercises. `edit.js` does not load |
| `resources/js/about.js` | About sheet. Payment and profile strings are sealed in this file |
| `resources/js/desk.js` | `localStorage` key `eization-desk` (setup + live exercise list) |
| `resources/js/hello.js` | First-run tour (exercise → example → Next → Setup → Play → Edit). Show me also points at how many examples are left, Reset, and BPM. Separate key `eization-hello` |
| `resources/js/main.js` | Wiring and `init` |
| `resources/css/style.css` | Practice screen layout |
| `practice.html` | How to practice one example at a time. Links to each stock exercise |
| `books.html` | Jazz books you already own, grouped by the kind of line you type. The pages do not reprint those books |
| `melodic-lines.html`, `scales-and-sets.html`, `changes.html`, `time.html`, `free-play.html` | How to practice that kind of line with the metronome |
| `resources/css/guide.css` | Layout for `practice.html` and the exercise pages |

## Adding an exercise

Add a script tag after `registry.js` and before `picker.js`. Call `registerExercise` with a new `id`. Put that id in `menuOrder` only when it should seed into the exercise menu. An exercise with `inMenu: false` stays in the code and stays out of the seed list. Do not delete those files to tidy the list.

The rhythms exercise id is `limbs`. Its menu label is Rhythms. Its page is `rhythms.html`.

When the new id is in `menuOrder`, add a page at the site root, link it from `practice.html`, and add the URL to `sitemap.xml`. Add the Spanish page under `es/`, link it from `es/practice.html`, and list that URL too. `hreflang` on each page points at the other language. That page should link to `./?exercise=` plus the id. On open, the practice screen selects that exercise when it is still in the menu, then drops the query from the address bar. An id that is not in `menuOrder` is ignored.

Share in Edit copies a link to the open exercise. The link is a `#s=` hash on that page (`https://eization.com/` or `https://eization.com/es/`). Opening it can add that exercise on this device. An exact match selects the stored copy. A changed list can be added beside it. Nothing is replaced. A list that does not fit in the link stays on this device, and Download this list still writes the `.eiz` file.

Ask a chat opens the open exercise in an outside chat. The reply is pasted into the box. The site does not call a model.

On first visit the catalog is copied into `eization-desk.exercises`. The menu reads that list. Edit can Update, Save as new, or Delete. Download this list and Upload copy the open list to an `.eiz` file and back. The file begins with `# eization 1` and `# bars N`, optional `# name …`, then one example per line. A file without a version still opens. A higher version does not. About → This device can Download backup / Upload backup every exercise as JSON. About the author can open a mail draft for feedback, or download that backup and open a draft that asks you to attach it.

## Saved on this device

`eization-desk` keeps tempo, meter, clicks, bars, repeat, swing, count-in, nearby notes, mute, the last exercise, the exercise list, and `deletedSeeds`. A shared exercise also stores `shareId` on its row. Two rows may share one `shareId`. It does not store whether the metronome is running.

`eization-hello` is `"1"` after the intro has played or been skipped. Restore defaults (in About) clears both keys, then re-seeds the stock exercises. The intro plays on the next launch, not on that click.

Constraints for later sessions are in `.cursor/rules/eization.mdc`.

## Tests

Serve this folder and open `tests/smoke.html`. The page title is PASS or FAIL, and the list of checks is on the page. The suite uses the real app in a frame. It does not start the metronome.
