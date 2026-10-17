/* Builds the chord-family triad exercises.
 * node tools/lst-ust.js          rewrites the by-family block in tools/more-exercises.json
 * node tools/lst-ust.js --check  validates and prints counts, no write
 */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var DELTA = "\u2206";
var OSLASH = "\u00F8";
var DEG = "\u00B0";
var DOT = " \u00B7 ";
var DASH = " \u2014 ";
var LETTERS = "CDEFGAB";
var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

var ROOTS = [
  { name: "C", pc: 0 },
  { name: "G", pc: 7 },
  { name: "D", pc: 2 },
  { name: "A", pc: 9 },
  { name: "E", pc: 4 },
  { name: "B", pc: 11 },
  { name: "F#", pc: 6 },
  { name: "Db", pc: 1 },
  { name: "Ab", pc: 8 },
  { name: "Eb", pc: 3 },
  { name: "Bb", pc: 10 },
  { name: "F", pc: 5 }
];

var ROMAN = {
  I: { semi: 0, step: 0 },
  bII: { semi: 1, step: 1 },
  II: { semi: 2, step: 1 },
  bIII: { semi: 3, step: 2 },
  III: { semi: 4, step: 2 },
  IV: { semi: 5, step: 3 },
  "#IV": { semi: 6, step: 3 },
  bV: { semi: 6, step: 4 },
  V: { semi: 7, step: 4 },
  bVI: { semi: 8, step: 5 },
  VI: { semi: 9, step: 5 },
  bbVII: { semi: 9, step: 5 },
  bVII: { semi: 10, step: 6 },
  VII: { semi: 11, step: 6 }
};

var SHAPE = {
  maj: [[0, 0], [4, 2], [7, 4]],
  min: [[0, 0], [3, 2], [7, 4]],
  dim: [[0, 0], [3, 2], [6, 4]],
  aug: [[0, 0], [4, 2], [8, 4]],
  sus: [[0, 0], [5, 3], [7, 4]]
};

/* name, root roman, triad type, three degrees. steps overrides letter steps from the chord root. */
function cell(name, roman, qual, degrees, steps) {
  return { name: name, roman: roman, qual: qual, degrees: degrees, steps: steps || null };
}

var FAMILIES = [
  {
    slug: "triads-delta7",
    mark: DELTA + "7",
    cells: [
      cell("I", "I", "maj", ["1", "3", "5"]),
      cell("II", "II", "maj", ["9", "#11", "13"]),
      cell("III-", "III", "min", ["3", "5", "7"]),
      cell("#IV" + DEG, "#IV", "dim", ["#11", "13", "1"]),
      cell("V", "V", "maj", ["5", "7", "9"]),
      cell("VI-", "VI", "min", ["13", "1", "3"]),
      cell("VII-", "VII", "min", ["7", "9", "#11"])
    ]
  },
  {
    slug: "triads-dom7",
    mark: "7",
    cells: [
      cell("I", "I", "maj", ["1", "3", "5"]),
      cell("III" + DEG, "III", "dim", ["3", "5", "b7"]),
      cell("V-", "V", "min", ["5", "b7", "9"]),
      cell("VI-", "VI", "min", ["13", "1", "3"])
    ]
  },
  {
    slug: "triads-7sus4",
    mark: "7sus4",
    cells: [
      cell("Isus4", "I", "sus", ["1", "11", "5"]),
      cell("II-", "II", "min", ["9", "11", "13"]),
      cell("IV", "IV", "maj", ["11", "13", "1"]),
      cell("bVII", "bVII", "maj", ["b7", "9", "11"])
    ]
  },
  {
    slug: "triads-min7",
    mark: "-7",
    cells: [
      cell("I-", "I", "min", ["1", "b3", "5"]),
      cell("II-", "II", "min", ["9", "11", "13"]),
      cell("bIII", "bIII", "maj", ["b3", "5", "b7"]),
      cell("IV", "IV", "maj", ["11", "13", "1"]),
      cell("V-", "V", "min", ["5", "b7", "9"]),
      cell("VI" + DEG, "VI", "dim", ["13", "1", "b3"]),
      cell("bVII", "bVII", "maj", ["b7", "9", "11"])
    ]
  },
  {
    slug: "triads-halfdim",
    mark: OSLASH + "7",
    cells: [
      cell("I" + DEG, "I", "dim", ["1", "b3", "b5"]),
      cell("II" + DEG, "II", "dim", ["9", "11", "b13"]),
      cell("bVI", "bVI", "maj", ["b13", "1", "b3"]),
      cell("bIII-", "bIII", "min", ["b3", "b5", "b7"]),
      cell("II+", "II", "aug", ["9", "b5", "b7"]),
      cell("bVII", "bVII", "maj", ["b7", "9", "11"]),
      cell("IV-", "IV", "min", ["11", "b13", "1"]),
      cell("bVII+", "bVII", "aug", ["b7", "9", "b5"]),
      cell("bV+", "bV", "aug", ["b5", "b7", "9"])
    ]
  },
  {
    slug: "triads-dim7",
    mark: DEG + "7",
    cells: [
      cell("I" + DEG, "I", "dim", ["1", "b3", "b5"]),
      cell("II", "II", "maj", ["9", "b5", "13"]),
      cell("IV-", "IV", "min", ["11", "b13", "1"]),
      cell("bVI" + DEG, "bVI", "dim", ["b13", "7", "9"]),
      cell("bIII" + DEG, "bIII", "dim", ["b3", "b5", "13"], [2, 4, 5]),
      cell("II-", "II", "min", ["9", "11", "13"]),
      cell("IV" + DEG, "IV", "dim", ["11", "b13", "7"]),
      cell("VII", "VII", "maj", ["7", "#9", "b5"]),
      cell("bV" + DEG, "bV", "dim", ["b5", "13", "1"], [4, 5, 7]),
      cell("II" + DEG, "II", "dim", ["9", "11", "b13"]),
      cell("bVI", "bVI", "maj", ["b13", "1", "b3"]),
      cell("VII-", "VII", "min", ["7", "9", "b5"]),
      cell("bbVII" + DEG, "bbVII", "dim", ["13", "1", "b3"]),
      cell("IV", "IV", "maj", ["11", "13", "1"]),
      cell("bVI-", "bVI", "min", ["b13", "7", "b3"]),
      cell("VII" + DEG, "VII", "dim", ["7", "9", "11"])
    ]
  },
  {
    slug: "triads-alt7",
    mark: "alt7",
    cells: [
      cell("I+", "I", "aug", ["1", "3", "#5"]),
      cell("bV", "bV", "maj", ["b5", "b7", "b9"]),
      cell("I" + DEG, "I", "dim", ["1", "#9", "b5"]),
      cell("bVI", "bVI", "maj", ["#5", "1", "#9"]),
      cell("bII-", "bII", "min", ["b9", "3", "#5"]),
      cell("bVI+", "bVI", "aug", ["#5", "1", "3"]),
      cell("bIII-", "bIII", "min", ["#9", "b5", "b7"]),
      cell("bVII" + DEG, "bVII", "dim", ["b7", "b9", "3"])
    ]
  },
  {
    slug: "triads-dom7b913",
    mark: "7(b9,13)",
    cells: [
      cell("I", "I", "maj", ["1", "3", "5"]),
      cell("I-", "I", "min", ["1", "#9", "5"]),
      cell("III" + DEG, "III", "dim", ["3", "5", "b7"]),
      cell("I" + DEG, "I", "dim", ["1", "#9", "#11"]),
      cell("bII" + DEG, "bII", "dim", ["b9", "3", "5"]),
      cell("bIII", "bIII", "maj", ["#9", "5", "b7"]),
      cell("bIII-", "bIII", "min", ["#9", "#11", "b7"]),
      cell("bIII" + DEG, "bIII", "dim", ["#9", "#11", "13"], [2, 4, 5]),
      cell("#IV", "#IV", "maj", ["#11", "b7", "b9"]),
      cell("#IV-", "#IV", "min", ["#11", "13", "b9"]),
      cell("#IV" + DEG, "#IV", "dim", ["#11", "13", "1"]),
      cell("V" + DEG, "V", "dim", ["5", "b7", "b9"]),
      cell("VI", "VI", "maj", ["13", "b9", "3"]),
      cell("VI-", "VI", "min", ["13", "1", "3"]),
      cell("VI" + DEG, "VI", "dim", ["13", "1", "#9"]),
      cell("bVII" + DEG, "bVII", "dim", ["b7", "b9", "3"])
    ]
  }
];

var EXPECT_C = {
  "triads-delta7": ["C E G", "D F# A", "E G B", "F# A C", "G B D", "A C E", "B D F#"],
  "triads-dom7": ["C E G", "E G Bb", "G Bb D", "A C E"],
  "triads-7sus4": ["C F G", "D F A", "F A C", "Bb D F"],
  "triads-min7": ["C Eb G", "D F A", "Eb G Bb", "F A C", "G Bb D", "A C Eb", "Bb D F"],
  "triads-halfdim": ["C Eb Gb", "D F Ab", "Ab C Eb", "Eb Gb Bb", "D F# A#", "Bb D F", "F Ab C", "Bb D F#", "Gb Bb D"],
  "triads-dim7": ["C Eb Gb", "D F# A", "F Ab C", "Ab Cb Ebb", "Eb Gb A", "D F A", "F Ab Cb", "B D# F#", "Gb A C", "D F Ab", "Ab C Eb", "B D F#", "A C Eb", "F A C", "Ab Cb Eb", "B D F"],
  "triads-alt7": ["C E G#", "Gb Bb Db", "C Eb Gb", "Ab C Eb", "Db Fb Ab", "Ab C E", "Eb Gb Bb", "Bb Db Fb"],
  "triads-dom7b913": ["C E G", "C Eb G", "E G Bb", "C Eb Gb", "Db Fb Abb", "Eb G Bb", "Eb Gb Bb", "Eb Gb A", "F# A# C#", "F# A C#", "F# A C", "G Bb Db", "A C# E", "A C E", "A C Eb", "Bb Db Fb"]
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function norm(n) {
  return ((n % 12) + 12) % 12;
}

function spellLetterAtPc(letter, targetPc) {
  var delta = norm(targetPc - LETTER_PC[letter]);
  if (delta === 0) {
    return letter;
  }
  if (delta === 1) {
    return letter + "#";
  }
  if (delta === 2) {
    return letter + "##";
  }
  if (delta === 11) {
    return letter + "b";
  }
  if (delta === 10) {
    return letter + "bb";
  }
  return "";
}

/* A stacked third can ask for a triple flat. Use the nearest letter that stays within a double accidental. */
function spellNear(preferred, targetPc) {
  var direct = spellLetterAtPc(preferred, targetPc);
  var best;
  var bestAbs;
  var bestDist;
  var i;
  var letter;
  var spelled;
  var abs;
  var dist;
  var pref = LETTERS.indexOf(preferred);
  if (direct) {
    return direct;
  }
  best = "";
  bestAbs = 9;
  bestDist = 9;
  for (i = 0; i < LETTERS.length; i++) {
    letter = LETTERS.charAt(i);
    spelled = spellLetterAtPc(letter, targetPc);
    if (!spelled) {
      continue;
    }
    abs = Math.abs(accidentalSemis(spelled));
    dist = Math.min((i - pref + 7) % 7, (pref - i + 7) % 7);
    if (abs < bestAbs || (abs === bestAbs && dist < bestDist)) {
      best = spelled;
      bestAbs = abs;
      bestDist = dist;
    }
  }
  if (!best) {
    fail("cannot spell " + preferred + " at " + targetPc);
  }
  return best;
}

function accidentalSemis(name) {
  if (name.indexOf("##") >= 0) {
    return 2;
  }
  if (name.indexOf("bb") >= 0) {
    return -2;
  }
  if (name.indexOf("#") >= 0) {
    return 1;
  }
  if (name.indexOf("b") >= 0) {
    return -1;
  }
  return 0;
}

function octaveForSpell(midi, letter, name) {
  return Math.floor((midi - LETTER_PC[letter] - accidentalSemis(name)) / 12) - 1;
}

function noteSpecs(item) {
  var roman = ROMAN[item.roman];
  var shape = SHAPE[item.qual];
  var notes = [];
  var i;
  if (!roman || !shape || item.degrees.length !== 3) {
    fail("bad cell " + item.name);
  }
  for (i = 0; i < 3; i++) {
    notes.push({
      semi: roman.semi + shape[i][0],
      step: item.steps ? item.steps[i] : roman.step + shape[i][1],
      degree: item.degrees[i]
    });
  }
  return notes;
}

function staffLine(mark, item, chordRoot) {
  var notes = noteSpecs(item);
  var first = notes[0];
  var firstPc = norm(chordRoot.pc + first.semi);
  var firstOct = firstPc >= 8 ? 3 : 4;
  var firstMidi = (firstOct + 1) * 12 + firstPc;
  var chordIdx = LETTERS.indexOf(chordRoot.name.charAt(0));
  var words = [];
  var i;
  var spec;
  var letter;
  var pc;
  var spell;
  var midi;
  var oct;
  for (i = 0; i < notes.length; i++) {
    spec = notes[i];
    letter = LETTERS[(chordIdx + spec.step) % 7];
    pc = norm(chordRoot.pc + spec.semi);
    spell = spellNear(letter, pc);
    midi = firstMidi + (spec.semi - first.semi);
    oct = octaveForSpell(midi, letter, spell);
    words.push(spell + oct + "n_" + spec.degree);
  }
  return "@key=C ^" + chordRoot.name + mark + " " + words.join(" ") + DOT + item.name + DOT + item.degrees.join(", ");
}

function textLine(mark, item) {
  return item.name + DOT + mark + DASH + item.degrees.join(", ");
}

function pitchNames(line) {
  return line.split(DOT)[0].split(" ").filter(function (word) {
    return /^[A-G]/.test(word);
  }).map(function (word) {
    return word.replace(/\d+n_.*$/, "");
  }).join(" ");
}

function book(href, en, es) {
  return { href: href, en: en, es: es };
}

function loadContext() {
  var context = vm.createContext({
    console: console,
    Map: Map,
    Uint8Array: Uint8Array,
    parseInt: parseInt,
    isNaN: isNaN,
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,
    unescape: unescape,
    escape: escape,
    btoa: function (s) { return Buffer.from(s, "binary").toString("base64"); },
    atob: function (s) { return Buffer.from(s, "base64").toString("binary"); },
    String: String,
    Math: Math,
    Array: Array,
    Object: Object,
    Error: Error,
    JSON: JSON,
    RegExp: RegExp
  });
  ["resources/js/staff.js", "resources/js/share.js"].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  });
  context.shareSnapshot = function (part) {
    return {
      shareId: part.id,
      name: part.name,
      bars: part.bars,
      lines: part.lines
    };
  };
  return context;
}

function buildExercises(context) {
  var exercises = [];
  var idNum = 174;
  var cRoot = ROOTS[0];
  FAMILIES.forEach(function (family) {
    var textLines = [];
    var expect = EXPECT_C[family.slug];
    var titleEn = "Triads on " + family.mark;
    var titleEs = "Tríadas sobre " + family.mark;
    family.cells.forEach(function (item, index) {
      var sample = staffLine(family.mark, item, cRoot);
      var names = pitchNames(sample);
      textLines.push(textLine(family.mark, item));
      if (!expect || names !== expect[index]) {
        fail(family.slug + " C spelling " + item.name + ": " + names + " wanted " + (expect && expect[index]));
      }
    });
    exercises.push({
      id: "more" + String(idNum).padStart(4, "0"),
      slug: family.slug,
      group: "pitch",
      bars: 1,
      nameEn: titleEn,
      nameEs: titleEs,
      descEn: "One example per turn. Pick a root and play the named triad on " + family.mark + ". The example lists each note's degree in the chord.",
      descEs: "Un ejemplo por turno. Elige una fundamental y toca la tríada nombrada sobre " + family.mark + ". El ejemplo lista el grado de cada nota en el acorde.",
      books: [
        book("./more.html#" + family.slug + "-staff", titleEn, titleEs),
        book("./more.html#upper-structure-triads", "Upper structure triads", "Tríades de estructura superior"),
        book("./more.html#lower-structure-triads", "Lower structure triads", "Tríades de estructura inferior"),
        book("./chords.html", "All Chords", "Todos los acordes"),
        book("./notation.html", "How to write on the staff", "Cómo escribir en el pentagrama")
      ],
      lines: textLines
    });
    idNum += 1;
    var lines = [];
    var r;
    family.cells.forEach(function (item) {
      for (r = 0; r < ROOTS.length; r++) {
        lines.push(staffLine(family.mark, item, ROOTS[r]));
      }
    });
    lines.forEach(function (line) {
      var status = context.staffNotationStatus(line);
      if (!status.ok) {
        fail(family.slug + " does not parse: " + line + " (" + status.error + ")");
      }
      if (!context.staffShareCanonical(line)) {
        fail(family.slug + " does not pack or is over 240: " + line);
      }
    });
    var sharpFour = lines.filter(function (line) {
      return line.indexOf(DOT + "#IV" + DEG + DOT) >= 0;
    })[0];
    if (family.slug === "triads-delta7" && sharpFour !== "@key=C ^C" + DELTA + "7 F#4n_#11 A4n_13 C5n_1" + DOT + "#IV" + DEG + DOT + "#11, 13, 1") {
      fail("delta7 #IV° line: " + sharpFour);
    }
    var staff = {
      id: "more" + String(idNum).padStart(4, "0"),
      slug: family.slug + "-staff",
      group: "pitch",
      staff: true,
      bars: 1,
      nameEn: titleEn,
      nameEs: titleEs,
      descEn: titleEn + ", in all twelve keys. One bar, going up. The chord name sits on the first note. The number under each note is that note's degree in the chord.",
      descEs: titleEs + ", en las doce tonalidades. Un compás, hacia arriba. El nombre del acorde va en la primera nota. El número bajo cada nota es su grado en el acorde.",
      books: [
        book("./more.html#" + family.slug, titleEn, titleEs),
        book("./more.html#upper-structure-triads", "Upper structure triads", "Tríades de estructura superior"),
        book("./more.html#lower-structure-triads", "Lower structure triads", "Tríades de estructura inferior"),
        book("./chords.html", "All Chords", "Todos los acordes"),
        book("./notation.html", "How to write on the staff", "Cómo escribir en el pentagrama")
      ],
      lines: lines
    };
    var hash = context.shareHashFromPayload({
      v: 1,
      id: staff.id,
      name: staff.nameEn,
      bars: 1,
      lines: lines
    });
    var url = "https://eization.com/" + hash;
    if (!hash || url.length > 8000) {
      fail("URL too long for " + staff.slug + ": " + url.length);
    }
    console.error(staff.slug + " " + lines.length + " " + url.length);
    exercises.push(staff);
    idNum += 1;
  });
  return exercises;
}

function formatExercise(ex) {
  return JSON.stringify(ex, null, 4).split("\n").map(function (line) {
    return "    " + line;
  }).join("\n");
}

function spliceCatalog(exercises) {
  var file = path.join(__dirname, "more-exercises.json");
  var text = fs.readFileSync(file, "utf8");
  var next = text.indexOf('"slug":  "whole-play-rest"');
  if (next < 0) {
    fail("missing whole-play-rest anchor");
  }
  var nextBrace = text.lastIndexOf("\n    {", next);
  var start = text.indexOf('"slug":  "ust-chord-families"');
  if (start < 0) {
    start = text.indexOf('"slug": "triads-delta7"');
  }
  if (start < 0) {
    fail("missing insert point");
  }
  var startBrace = text.lastIndexOf("\n    {", start);
  var block = exercises.map(formatExercise).join(",\n");
  var updated = text.slice(0, startBrace) + "\n" + block + ",\n" + text.slice(nextBrace);
  JSON.parse(updated);
  fs.writeFileSync(file, updated);
}

var context = loadContext();
var exercises = buildExercises(context);
console.error(exercises.length + " exercises, ids " + exercises[0].id + ".." + exercises[exercises.length - 1].id);
if (process.argv.indexOf("--check") >= 0) {
  process.exit(0);
}
spliceCatalog(exercises);
console.error("wrote tools/more-exercises.json");
