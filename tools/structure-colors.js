/* Builds the tritonic / 7sus4 / pentatonic / add2 / add4 / madd4 catalog.
 * node tools/structure-colors.js          rewrites tools/more-exercises.json
 * node tools/structure-colors.js --check  validates and prints counts, no write
 */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var DELTA = "\u2206";
var OSLASH = "\u00F8";
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

var ROMANS = {
  I: { semi: 0, step: 0 },
  bII: { semi: 1, step: 1 },
  II: { semi: 2, step: 1 },
  "#II": { semi: 3, step: 1 },
  bIII: { semi: 3, step: 2 },
  III: { semi: 4, step: 2 },
  IV: { semi: 5, step: 3 },
  bV: { semi: 6, step: 4 },
  V: { semi: 7, step: 4 },
  "#V": { semi: 8, step: 4 },
  bVI: { semi: 8, step: 5 },
  VI: { semi: 9, step: 5 },
  bVII: { semi: 10, step: 6 },
  VII: { semi: 11, step: 6 }
};

/* semi from the chord root -> degree printed under the note */
var DEGREES = {
  maj: ["1", "b9", "9", "#9", "3", "11", "#11", "5", "b13", "13", "b7", "7"],
  min: ["1", "b9", "9", "b3", "3", "11", "#11", "5", "b13", "13", "b7", "7"],
  dom: ["1", "b9", "9", "#9", "3", "11", "#11", "5", "b13", "13", "b7", "7"],
  hdim: ["1", "b9", "9", "b3", "3", "11", "b5", "5", "b13", "13", "b7", "7"],
  alt: ["1", "b9", "9", "#9", "3", "11", "b5", "5", "#5", "13", "b7", "7"]
};

var SHAPES = {
  tritonic: [[0, 0], [5, 3], [7, 4], [12, 7]],
  sus: [[0, 0], [5, 3], [7, 4], [10, 6]],
  pent: [[0, 0], [3, 2], [5, 3], [7, 4], [10, 6]],
  add2: [[0, 0], [2, 1], [4, 2], [7, 4]],
  add4: [[0, 0], [4, 2], [5, 3], [7, 4]],
  madd4: [[0, 0], [3, 2], [5, 3], [7, 4]]
};

var QUALITY = {
  maj: { id: "delta7", mark: DELTA + "7" },
  min: { id: "min7", mark: "-7" },
  dom: { id: "dom7", mark: "7" },
  hdim: { id: "halfdim", mark: OSLASH + "7" },
  alt: { id: "alt7", mark: "alt7" }
};

var QUALITY_ORDER = ["maj", "min", "dom", "hdim", "alt"];

var STRUCTURES = [
  {
    slug: "tritonic-sus4",
    shape: "tritonic",
    nameEn: "Tritonic sus4",
    nameEs: "Tritónico sus4",
    playEn: "tritonic sus4",
    playEs: "el sus4 tritónico",
    cells: {
      maj: [["I", "11"], ["II", "9, 13"], ["III", "13"], ["V", "9"], ["VI", "9, 13"], ["VII", "#11"]],
      min: [["I", "11"], ["II", "9, 13"], ["IV", "11"], ["V", "9"], ["VI", "9, 13"]],
      dom: [["I", "11"], ["II", "9, 13"], ["IV", "11"], ["V", "9"], ["VI", "9, 13"]],
      hdim: [["bII", "b9, b13"], ["bIII", "b13"], ["IV", "11"], ["bVI", "b9"], ["VII", "11"]],
      alt: [["bII", "b9, b5, #5"], ["#II", "#9, #5"], ["#V", "b9, #9, #5"]]
    }
  },
  {
    slug: "7sus4",
    shape: "sus",
    nameEn: "7sus4",
    nameEs: "7sus4",
    playEn: "7sus4",
    playEs: "el 7sus4",
    cells: {
      maj: [["II", "9, 13"], ["III", "13"], ["V", "9"], ["VI", "9, 13"], ["VII", "#11, 13"]],
      min: [["I", "11"], ["II", "9, 13"], ["V", "9, 11"], ["VI", "9, 13"]],
      dom: [["I", "11"], ["II", "9, 13"], ["V", "9, 11"], ["VI", "9, 13"]],
      hdim: [["bIII", "b9, b13"], ["IV", "11"], ["bVI", "b9"], ["VII", "11, b13"]],
      alt: [["#II", "b9, #9, #5"], ["#V", "b9, #9, b5, #5"]]
    }
  },
  {
    slug: "pentatonic-color",
    shape: "pent",
    nameEn: "Pentatonic",
    nameEs: "Pentatónica",
    playEn: "minor pentatonic",
    playEs: "la pentatónica menor",
    cells: {
      maj: [["II", "9, 11, 13"], ["III", "9, 13"], ["VI", "9, 13"], ["VII", "9, #11, 13"]],
      min: [["II", "9, 11, 13"], ["V", "9, 11"], ["VI", "9, 13"]],
      dom: [["II", "9, 11, 13"], ["V", "9, 11"], ["VI", "9, 13"]],
      hdim: [["bIII", "b9, b13"], ["IV", "11, b13"], ["VII", "b9, 11, b13"]],
      alt: [["#II", "b9, #9, b5, #5"], ["#V", "b9, #9, b5, #5"]]
    }
  },
  {
    slug: "add2",
    shape: "add2",
    nameEn: "add2",
    nameEs: "add2",
    playEn: "add2 voicing",
    playEs: "el voicing add2",
    cells: {
      maj: [["I", "9"], ["IV", "11, 13"], ["V", "9, 13"], ["II", "9, #11, 13"]],
      min: [["bIII", "11"], ["IV", "11, 13"], ["bVII", "9, 11"]],
      dom: [["I", "9"], ["IV", "11, 13"], ["bVII", "9, 11"]],
      hdim: [["bII", "b9, 11, b13"], ["bV", "b13"], ["bVI", "b13"]],
      alt: [["bV", "b9, b5, #5"], ["#V", "#9, #5"]]
    }
  },
  {
    slug: "add4",
    shape: "add4",
    nameEn: "add4",
    nameEs: "add4",
    playEn: "add4 voicing",
    playEs: "el voicing add4",
    cells: {
      maj: [["I", "11"], ["V", "9"], ["II", "9, #11, 13"]],
      min: [["IV", "11, 13"], ["bVII", "9, 11"]],
      dom: [["I", "11"], ["IV", "11, 13"]],
      hdim: [["bII", "b9, 11, b13"], ["bVI", "b9, b13"]],
      alt: [["#V", "b9, #9, #5"]]
    }
  },
  {
    slug: "madd4",
    shape: "madd4",
    nameEn: "madd4",
    nameEs: "madd4",
    playEn: "madd4 voicing",
    playEs: "el voicing madd4",
    cells: {
      maj: [["II", "9, 11, 13"], ["III", "13"], ["VI", "9, 13"], ["VII", "9, #11"]],
      min: [["I", "11"], ["II", "9, 11, 13"], ["V", "9"]],
      dom: [["II", "9, 11, 13"], ["V", "9"], ["VI", "9, 13"]],
      hdim: [["bIII", "b13"], ["IV", "11, b13"], ["VII", "b9, 11"]],
      alt: [["bII", "b9, b5, #5"], ["#II", "#9, b5, #5"]]
    }
  }
];

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
  fail("cannot spell " + letter + " at " + targetPc);
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

function romanFor(qual, name) {
  var src = ROMANS[name];
  if (!src) {
    fail("roman " + name);
  }
  if (qual === "hdim" && name === "VII") {
    return { name: "VII", semi: 10, step: 6 };
  }
  return { name: name, semi: src.semi, step: src.step };
}

function staffLine(qual, shape, romanName, extensions, chordRoot) {
  var roman = romanFor(qual, romanName);
  var chordLetter = chordRoot.name.charAt(0);
  var chordIdx = LETTERS.indexOf(chordLetter);
  var structLetter = LETTERS[(chordIdx + roman.step) % 7];
  var structPc = norm(chordRoot.pc + roman.semi);
  var structOct = structPc >= 8 ? 3 : 4;
  var structMidi = (structOct + 1) * 12 + structPc;
  var notes = [];
  var i;
  var semi;
  var step;
  var letter;
  var pc;
  var spell;
  var oct;
  var degSemi;
  var label;
  for (i = 0; i < shape.length; i++) {
    semi = shape[i][0];
    step = shape[i][1];
    letter = LETTERS[(LETTERS.indexOf(structLetter) + step) % 7];
    pc = norm(structPc + semi);
    spell = spellLetterAtPc(letter, pc);
    oct = octaveForSpell(structMidi + semi, letter, spell);
    degSemi = norm(pc - chordRoot.pc);
    label = DEGREES[qual][degSemi];
    if (!label) {
      fail("no degree " + degSemi + " for " + qual);
    }
    notes.push(spell + oct + "n_" + label);
  }
  var symbol = chordRoot.name + QUALITY[qual].mark;
  return "@key=C ^" + symbol + " " + notes.join(" ") + DOT + roman.name + DOT + extensions;
}

function textLine(qual, romanName, extensions) {
  return romanName + DOT + QUALITY[qual].mark + DASH + extensions;
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
  var idNum = 138;
  STRUCTURES.forEach(function (structure) {
    var textLines = [];
    var shape = SHAPES[structure.shape];
    QUALITY_ORDER.forEach(function (qual) {
      structure.cells[qual].forEach(function (cell) {
        textLines.push(textLine(qual, cell[0], cell[1]));
      });
    });
    var textSlug = structure.slug;
    exercises.push({
      id: "more" + String(idNum).padStart(4, "0"),
      slug: textSlug,
      group: "pitch",
      bars: 1,
      nameEn: structure.nameEn,
      nameEs: structure.nameEs,
      descEn: "One example per turn. Pick a root and play the " + structure.playEn + " from the named degree of that chord. The example lists the extensions you hear.",
      descEs: "Un ejemplo por turno. Elige una fundamental y toca " + structure.playEs + " desde el grado nombrado de ese acorde. El ejemplo lista las extensiones que se oyen.",
      books: [
        book("./more.html#" + textSlug + "-delta7", structure.nameEn + " on " + DELTA + "7", structure.nameEs + " sobre " + DELTA + "7"),
        book("./chords.html", "All Chords", "Todos los acordes"),
        book("./scales.html", "Scales", "Escalas"),
        book("./notation.html", "How to write on the staff", "Cómo escribir en el pentagrama")
      ],
      lines: textLines
    });
    idNum += 1;
    QUALITY_ORDER.forEach(function (qual) {
      var mark = QUALITY[qual].mark;
      var lines = [];
      var r;
      structure.cells[qual].forEach(function (cell) {
        for (r = 0; r < ROOTS.length; r++) {
          lines.push(staffLine(qual, shape, cell[0], cell[1], ROOTS[r]));
        }
      });
      lines.forEach(function (line) {
        var status = context.staffNotationStatus(line);
        var canon;
        if (!status.ok) {
          fail(textSlug + " " + qual + " does not parse: " + line + " (" + status.error + ")");
        }
        canon = context.staffShareCanonical(line);
        if (!canon) {
          fail(textSlug + " " + qual + " does not pack or is over 240: " + line);
        }
      });
      var staffSlug = textSlug + "-" + QUALITY[qual].id;
      var staff = {
        id: "more" + String(idNum).padStart(4, "0"),
        slug: staffSlug,
        group: "pitch",
        staff: true,
        bars: 1,
        nameEn: structure.nameEn + " on " + mark,
        nameEs: structure.nameEs + " sobre " + mark,
        descEn: structure.nameEn + " on " + mark + ", in all twelve keys. One bar, going up. The chord name sits on the first note. The number under each note is that note's degree in the chord.",
        descEs: structure.nameEs + " sobre " + mark + ", en las doce tonalidades. Un compás, hacia arriba. El nombre del acorde va en la primera nota. El número bajo cada nota es su grado en el acorde.",
        books: [
          book("./more.html#" + textSlug, structure.nameEn, structure.nameEs),
          book("./chords.html", "All Chords", "Todos los acordes"),
          book("./scales.html", "Scales", "Escalas"),
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
        fail("URL too long for " + staffSlug + ": " + url.length);
      }
      console.error(staffSlug + " " + lines.length + " " + url.length);
      exercises.push(staff);
      idNum += 1;
    });
  });
  return exercises;
}

function formatExercise(ex) {
  return JSON.stringify(ex, null, 4).split("\n").map(function (line) {
    return "    " + line;
  }).join("\n");
}

function verifyKeyOnly(exercises) {
  var catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "more-exercises.json"), "utf8"));
  var bySlug = {};
  var i;
  var j;
  var old;
  var expected;
  for (i = 0; i < catalog.length; i++) {
    bySlug[catalog[i].slug] = catalog[i];
  }
  for (i = 0; i < exercises.length; i++) {
    old = bySlug[exercises[i].slug];
    if (!old || !old.lines || old.lines.length !== exercises[i].lines.length) {
      fail("line count changed for " + exercises[i].slug);
    }
    for (j = 0; j < old.lines.length; j++) {
      expected = exercises[i].staff ? old.lines[j].replace(/^@key=\S+/, "@key=C") : old.lines[j];
      if (exercises[i].lines[j] !== expected) {
        fail(exercises[i].slug + " line " + j + " changed more than the key\n" + old.lines[j] + "\n" + exercises[i].lines[j]);
      }
    }
  }
}

function spliceCatalog(exercises) {
  var file = path.join(__dirname, "more-exercises.json");
  var text = fs.readFileSync(file, "utf8");
  var next = text.indexOf('"slug":  "one-two-three-five-perms"');
  if (next < 0) {
    fail("missing one-two-three-five-perms anchor");
  }
  var nextBrace = text.lastIndexOf("\n    {", next);
  var start = text.indexOf('"slug": "tritonic-sus4"');
  if (start < 0) {
    start = text.indexOf('"slug":  "tritonic-sus4"');
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
verifyKeyOnly(exercises);
console.error(exercises.length + " exercises, ids " + exercises[0].id + ".." + exercises[exercises.length - 1].id);
if (process.argv.indexOf("--check") >= 0) {
  console.error(exercises[5].lines[0]);
  process.exit(0);
}
spliceCatalog(exercises);
console.error("wrote tools/more-exercises.json");
