/**
 * Apply content-edit comments from the filled allExcercises.csv.
 * Run after apply-all-exercises-csv.js.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const morePath = path.join(root, "tools", "more-exercises.json");
const more = JSON.parse(fs.readFileSync(morePath, "utf8"));
const byId = {};
more.forEach(function (ex, i) {
  byId[ex.id] = { ex: ex, i: i };
});

function toHeadOnly(line) {
  return line.replace(
    /([A-G](?:##|#|bb|b)?)([0-9])([whqes])(\.?)/g,
    function (_m, pitch, oct) {
      return pitch + oct + "n";
    }
  );
}

function stripRests(line) {
  var parts = line.split(" · ");
  var body = parts[0];
  var label = parts.length > 1 ? parts.slice(1).join(" · ") : "";
  body = body
    .replace(/\b[rR][whqes]\.?~?/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  body = body.replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ").trim();
  return label ? body + " · " + label : body;
}

function parsePitch(tok) {
  var m = /^([A-G])(##|#|bb|b)?([0-9])([whqesn])(\.?)(.*)$/.exec(tok);
  if (!m) {
    return null;
  }
  var letter = m[1];
  var acc = m[2] || "";
  var oct = parseInt(m[3], 10);
  var base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter];
  var adj = acc === "#" ? 1 : acc === "##" ? 2 : acc === "b" ? -1 : acc === "bb" ? -2 : 0;
  return {
    letter: letter,
    acc: acc,
    oct: oct,
    midi: (oct + 1) * 12 + base + adj,
    suffix: m[6] || "",
    text: letter + acc + oct
  };
}

function pitchAtOct(p, oct) {
  return p.letter + p.acc + oct;
}

function secondInvStack(tokens) {
  if (!tokens || tokens.length < 3) {
    return null;
  }
  var pitches = [];
  for (var i = 0; i < tokens.length; i++) {
    var p = parsePitch(tokens[i]);
    if (p) {
      pitches.push(p);
    }
  }
  if (pitches.length < 3) {
    return null;
  }
  var root = pitches[0];
  var third = pitches[1];
  var fifth = pitches[2];
  var bassOct = fifth.oct;
  if (fifth.midi >= root.midi) {
    bassOct = fifth.oct - 1;
  }
  return (
    "[" +
    pitchAtOct(fifth, bassOct) +
    "h " +
    root.text +
    "h " +
    third.text +
    "h]"
  );
}

function triadPairLine(line) {
  var parts = line.split(" · ");
  var body = parts[0].trim();
  var label = parts.length > 1 ? parts.slice(1).join(" · ") : "";
  var chord = "";
  var mChord = /^(\^[^\s]+)\s+(.*)$/.exec(body);
  if (mChord) {
    chord = mChord[1] + " ";
    body = mChord[2];
  }
  var halves = body.split("|").map(function (s) {
    return s.trim().split(/\s+/).filter(Boolean);
  });
  if (halves.length < 1) {
    return line;
  }
  var stacks = halves.map(secondInvStack).filter(Boolean);
  if (!stacks.length) {
    return line;
  }
  var out = chord + stacks.join(" ");
  if (label) {
    out += " · " + label;
  }
  return out;
}

function guideToneAllKeys() {
  // 7 of iim7, 3 of V7 | 7 and 3 of Imaj7 — circle of fifths from C
  var rows = [
    { key: "C", ii7: "C4", v3: "B4", i7: "B4", i3: "E4" },
    { key: "F", ii7: "F4", v3: "E4", i7: "E4", i3: "A4" },
    { key: "Bb", ii7: "Bb4", v3: "A4", i7: "A4", i3: "D5" },
    { key: "Eb", ii7: "Eb4", v3: "D4", i7: "D4", i3: "G4" },
    { key: "Ab", ii7: "Ab4", v3: "G4", i7: "G4", i3: "C5" },
    { key: "Db", ii7: "Db4", v3: "C4", i7: "C4", i3: "F4" },
    { key: "Gb", ii7: "Gb4", v3: "F4", i7: "F4", i3: "Bb4" },
    { key: "B", ii7: "B3", v3: "A#4", i7: "A#4", i3: "D#5" },
    { key: "E", ii7: "E4", v3: "D#4", i7: "D#4", i3: "G#4" },
    { key: "A", ii7: "A3", v3: "G#4", i7: "G#4", i3: "C#5" },
    { key: "D", ii7: "D4", v3: "C#4", i7: "C#4", i3: "F#4" },
    { key: "G", ii7: "G4", v3: "F#4", i7: "F#4", i3: "B4" }
  ];
  return rows.map(function (r) {
    return (
      "^II- " +
      r.ii7 +
      "h ^V7 " +
      r.v3 +
      "h~ | ^I∆ " +
      r.i7 +
      "h " +
      r.i3 +
      "h · " +
      r.key
    );
  });
}

function setLines(id, lines, extras) {
  var row = byId[id];
  if (!row) {
    console.warn("missing", id);
    return;
  }
  row.ex.lines = lines;
  if (extras) {
    Object.keys(extras).forEach(function (k) {
      row.ex[k] = extras[k];
    });
  }
}

var headOnlyIds = [
  "more0071",
  "more0074",
  "more0075",
  "more0076",
  "more0077",
  "more0078",
  "more0083",
  "more0084",
  "more0085"
];
headOnlyIds.forEach(function (id) {
  var row = byId[id];
  if (!row) {
    return;
  }
  row.ex.lines = row.ex.lines.map(toHeadOnly);
  row.ex.staff = true;
});

// more0019: one bar only
setLines(
  "more0019",
  byId.more0019.ex.lines.map(function (line) {
    var label = "";
    var body = line;
    var i = line.indexOf(" · ");
    if (i >= 0) {
      body = line.slice(0, i);
      label = line.slice(i);
    }
    var first = body.split("|")[0].trim();
    return first + label;
  }),
  { bars: 1 }
);

// more0098: drop rests
setLines(
  "more0098",
  byId.more0098.ex.lines.map(stripRests),
  { bars: 1, meter: undefined }
);
if (byId.more0098) {
  delete byId.more0098.ex.meter;
}

// more0101: more quartal examples
(function () {
  var extra = [
    "C4q F4q Bb4q Eb5q | Bb4q Eb5q Ab5q Db6q · Parallel 4ths up a 4th",
    "E4q A4q D5q G5q | C5q F5q Bb5q Eb6q · Parallel 4ths from 3",
    "C4q F4q Bb4q | Eb5q Ab5q Db6q · Three-note quartal cells",
    "^G7 D4q G4q C5q F5q | Bb5q Eb6q Ab6q Db7q · 4ths on Dom7 from 5",
    "C4e F4e Bb4e Eb5e Ab5e Db6e Gb6e Cb7e | Cb7e Gb6e Db6e Ab5e Eb5e Bb4e F4e C4e · Eighth-note 4ths up/down",
    "C4q F4q Bb4q Eb5q | rq G4q C5q F5q · Quartal then land on 5",
    "^Dm7 D4q G4q C5q F5q | Bb5q Eb6q Ab6q Db7q · 4ths on Min7 from 1",
    "C4q F4q Bb4q Eb5q | E4q A4q D5q G5q · Quartal then tertian"
  ];
  setLines("more0101", byId.more0101.ex.lines.concat(extra));
})();

// more0102: more interval patterns
(function () {
  var extra = [
    "C4e E4e G4e B4e | D5e F5e A5e C6e · Broken 3rds ascending",
    "C6e A5e F5e D5e | B4e G4e E4e C4e · Broken 3rds descending",
    "C4e F4e A4e D5e | G5e C6e E6e A6e · Up 4th / up 3rd mix",
    "C4e G4e D5e A5e | E6e B5e F#5e C#5e · Up 5ths then down",
    "C4e D4e E4e F4e | G4e A4e B4e C5e · Stepwise contrast",
    "C4e Bb3e Ab3e Gb3e | Fb3e D3e C3e Bb2e · Down 2nds chain",
    "C4e E4e C4e E4e | F4e A4e F4e A4e · Pendulum 3rds",
    "C4e F4e C4e F4e | G4e C5e G4e C5e · Pendulum 4ths"
  ];
  setLines("more0102", byId.more0102.ex.lines.concat(extra));
})();

// more0106: rhythm slash notation + more examples
setLines("more0106", [
  "/w | /w | /w | /w · Whole notes",
  "/h /h | /h /h | /h /h | /h /h · Half notes",
  "/q /q /q /q | /q /q /q /q | /q /q /q /q | /q /q /q /q · Quarter notes",
  "/e /e /e /e /e /e /e /e | /e /e /e /e /e /e /e /e | /e /e /e /e /e /e /e /e | /e /e /e /e /e /e /e /e · Eighth notes",
  "(3 /e /e /e) (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) | (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) | (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) | (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) · Triplets",
  "/s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s · Sixteenth notes",
  "/q. /q. rq | /q. /q. rq | /q. /q. rq | /q. /q. rq · Dotted quarters",
  "/q /q /q /q | /q /q /q /q | /e /e /e /e /e /e /e /e | /e /e /e /e /e /e /e /e · Quarters then eighths",
  "/e /e /e /e /e /e /e /e | /e /e /e /e /e /e /e /e | (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) | (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) (3 /e /e /e) · Eighths then triplets",
  "/e /h /q. | /h /h | /h /h | /h /h · Half notes with one pickup",
  "/h /h | /h /h | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s · One value per phrase",
  "/q /q /q /q | /q /q /q /q | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s · Change value at bar 3",
  "/q. /e /q /q | /q. /e /q /q | /q. /e /q /q | /q. /e /q /q · Charleston cells",
  "rq /q rq /q | /q rq /q rq · Backbeat vs downbeats",
  "{/e /e} /q {/e /e} /q | /q {/e /e} /q {/e /e} · Beamed pairs",
  "/q /e /e /q /e /e | /e /e /q /e /e /q · Swing skeleton"
]);

// triad pairs → second-inversion stacked half notes, one bar
["more0109", "more0110", "more0111", "more0112"].forEach(function (id) {
  var row = byId[id];
  if (!row) {
    return;
  }
  row.ex.lines = row.ex.lines.map(triadPairLine);
  row.ex.bars = 1;
});

// more0062: all keys
setLines("more0062", guideToneAllKeys(), { bars: 2 });

// more0116: more examples; rhythm-only where pitch is irrelevant
(function () {
  var base = byId.more0116.ex.lines.slice();
  var extra = [
    "rq /q> rq /q> | rq /q> rq /q> · Accent on the and (rhythm)",
    "/q> /q /q> /q> | /q> /q /q /q> · Accent the peaks (rhythm)",
    "mf /q pp /q mf /q pp /q | mf /q pp /q mf /q pp /q · Ghost notes (rhythm)",
    "/e /e /e /e rq rq | /e /e /e /e rq rq · Roll (rhythm)",
    "/q> rq /q> rq | /e> /e rq /e> /e · Mixed accents",
    "pp /q mf /q> pp /q mf /q> | pp /q mf /q> pp /q mf /q> · Soft then hit",
    "/s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s | /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s /s · Fast quiet noise"
  ];
  setLines("more0116", base.concat(extra));
})();

fs.writeFileSync(
  morePath,
  JSON.stringify(more, null, 4).replace(/\n/g, "\r\n") + "\r\n",
  "utf8"
);
console.log("content edits applied");
