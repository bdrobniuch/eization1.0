# eization

A practice desk for jazz piano. One static page, no build step, no backend. It runs from `file://` and from GitHub Pages.

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
| `resources/js/registry.js` | `registerExercise` and `menuOrder` (the visible list) |
| `resources/js/exercises/` | One exercise per file |
| `resources/js/picker.js` | The current value, the reel, and the face size |
| `resources/js/metronome.js` | Lookahead click. The clock is eighth notes. BPM is the speed of the bottom number |
| `resources/js/editor.js` | The custom list. This is the editor that loads. `edit.js` does not |
| `resources/js/about.js` | About sheet. Payment and profile strings are sealed in this file |
| `resources/js/desk.js` | `localStorage` key `eization-desk` |
| `resources/js/hello.js` | First-run tour. Separate key `eization-hello` |
| `resources/js/main.js` | Wiring and `init` |
| `resources/css/style.css` | All layout |

## Adding an exercise

Add a script tag after `registry.js` and before `picker.js`. Call `registerExercise` with a new `id`. Put that id in `menuOrder` only when it should appear in the menu. An exercise with `inMenu: false` stays in the code and stays out of the menu. Do not delete those files to tidy the list.

The rhythms exercise id is `limbs`. Its menu label is Rhythms.

A custom list is not an exercise file. The editor stores one list in `eization-desk`, and only when the user presses Done.

## Saved on this device

`eization-desk` keeps tempo, meter, clicks, bars, repeat, swing, count-in, nearby notes, the last exercise, and one custom list. It does not store whether the metronome is running.

`eization-hello` is `"1"` after the intro has played. Restore defaults deletes both keys. The intro plays on the next launch, not on that click.

Constraints for later sessions are in `.cursor/rules/eization.mdc`.
