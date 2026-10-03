# eization

A practice desk for any instrument. One static page, no build step, no backend. It runs from `file://` and from GitHub Pages.

## Run

Open `index.html`, or serve this folder as the site root. Asset paths are relative (`./resources/...`).

## Publish

GitHub Pages, branch of your choice, folder `/` (the repo root). Keep `.nojekyll` so Pages does not drop files that start with `_`.

The public address used for search and link previews is `https://bdrobniuch.github.io/eization1.0/`. If that address changes, update these together:

- the canonical link, Open Graph URL, and image URLs in `index.html`
- `robots.txt`
- `sitemap.xml`

## Where things live

Scripts in `index.html` load in order. `registry.js` must come before the exercise files. `main.js` is last and calls `init`.

| File | Role |
| --- | --- |
| `resources/js/registry.js` | `registerExercise` and `menuOrder` (the seed catalog) |
| `resources/js/exercises/` | One seed exercise per file |
| `resources/js/picker.js` | The current value, the reel, and the face size |
| `resources/js/metronome.js` | Lookahead click. The clock is eighth notes. BPM is the speed of the bottom number |
| `resources/js/editor.js` | Edit desk exercises. `edit.js` does not load |
| `resources/js/about.js` | About sheet. Payment and profile strings are sealed in this file |
| `resources/js/desk.js` | `localStorage` key `eization-desk` (setup + live exercise list) |
| `resources/js/hello.js` | First-run tour (exercise → idea → Next → Setup → Play → Edit). Show me also points at the ideas-left count, Reset, and BPM. Separate key `eization-hello` |
| `resources/js/main.js` | Wiring and `init` |
| `resources/css/style.css` | All layout |

## Adding an exercise

Add a script tag after `registry.js` and before `picker.js`. Call `registerExercise` with a new `id`. Put that id in `menuOrder` only when it should seed into the desk menu. An exercise with `inMenu: false` stays in the code and stays out of the seed list. Do not delete those files to tidy the list.

The rhythms exercise id is `limbs`. Its menu label is Rhythms.

On first visit the catalog is copied into `eization-desk.exercises`. The menu reads that list. Edit can Update, Save as new, or Delete. Download this list and Upload copy the open list to an `.eiz` file and back. The file begins with `# eization 1` and `# bars N`, optional `# name …`, then one value per line. A file without a version still opens. A higher version does not. About → This device can Download backup / Upload backup every exercise as JSON.

## Saved on this device

`eization-desk` keeps tempo, meter, clicks, bars, repeat, swing, count-in, nearby notes, mute, the last exercise, the desk exercise list, and `deletedSeeds`. It does not store whether the metronome is running.

`eization-hello` is `"1"` after the intro has played or been skipped. Restore defaults (in About) clears both keys, then re-seeds the stock exercises. The intro plays on the next launch, not on that click.

Constraints for later sessions are in `.cursor/rules/eization.mdc`.

## Tests

Serve this folder and open `tests/smoke.html`. The page title is PASS or FAIL, and the list of checks is on the page. The suite uses the real app in a frame. It does not start the metronome.
