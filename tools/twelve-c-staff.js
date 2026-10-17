/* Puts the C-only cell staffs through the twelve keys.
 * One exercise stays one exercise. Keys are the next example, not a new page.
 * node tools/twelve-c-staff.js --check
 * node tools/twelve-c-staff.js
 */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var rootDir = path.join(__dirname, "..");
var file = path.join(__dirname, "more-exercises.json");
var DOT = " \u00B7 ";
var LETTERS = "CDEFGAB";
var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
var checkOnly = process.argv.indexOf("--check") >= 0;

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

var DEGREE = {
  "1": { step: 0, semi: 0 },
  "b2": { step: 1, semi: 1 },
  "2": { step: 1, semi: 2 },
  "b3": { step: 2, semi: 3 },
  "3": { step: 2, semi: 4 },
  "4": { step: 3, semi: 5 },
  "#4": { step: 3, semi: 6 },
  "b5": { step: 4, semi: 6 },
  "5": { step: 4, semi: 7 },
  "b6": { step: 5, semi: 8 },
  "6": { step: 5, semi: 9 },
  "b7": { step: 6, semi: 10 },
  "7": { step: 6, semi: 11 }
};

var PENT = { 0: "1", 2: "2", 4: "3", 7: "5", 9: "6" };
var FROM_CHORD = {
  0: "1",
  1: "b2",
  2: "2",
  3: "b3",
  4: "3",
  5: "4",
  6: "b5",
  7: "5",
  8: "b6",
  9: "6",
  10: "b7",
  11: "7"
};

var SCALE_FAMILIES = [
  {
    mark: "+2",
    slug: "scale-patterns-staff",
    id: "more0086",
    nameEn: "Scale patterns +2 on the staff",
    nameEs: "Patrones de escala +2 en el pentagrama",
    oldEn: "Scale patterns on the staff",
    oldEs: "Patrones de escala en el pentagrama"
  },
  {
    mark: "+4",
    slug: "scale-patterns-plus4-staff",
    id: "more0190",
    nameEn: "Scale patterns +4 on the staff",
    nameEs: "Patrones de escala +4 en el pentagrama"
  },
  {
    mark: "+6",
    slug: "scale-patterns-plus6-staff",
    id: "more0191",
    nameEn: "Scale patterns +6 on the staff",
    nameEs: "Patrones de escala +6 en el pentagrama"
  },
  {
    mark: "+7",
    slug: "scale-patterns-plus7-staff",
    id: "more0192",
    nameEn: "Scale patterns +7 on the staff",
    nameEs: "Patrones de escala +7 en el pentagrama"
  }
];

var JOBS = [
  {
    slug: "one-two-three-five-staff",
    kind: "labeled",
    descEn: "All twenty-four orders, in all twelve keys. Bar 1 is the order. Bar 2 is that order backwards, so the next shape can begin near the last note.",
    descEs: "Los veinticuatro órdenes, en las doce tonalidades. El compás 1 es el orden. El compás 2 es ese orden al revés, para que la forma siguiente empiece cerca de la última nota.",
    oldEn: "All twenty-four orders written in C. Bar 1 is the order. Bar 2 is that order backwards, so the next shape can begin near the last note.",
    oldEs: "Los veinticuatro órdenes escritos en C. El compás 1 es el orden. El compás 2 es ese orden al revés, para que la forma siguiente empiece cerca de la última nota."
  },
  {
    slug: "alt-four-note-cells-staff",
    kind: "labeled",
    descEn: "Each cell, in all twelve keys. Bar 1 is the cell. Bar 2 is the cell backwards. The number under the note is the scale degree.",
    descEs: "Cada célula, en las doce tonalidades. El compás 1 es la célula. El compás 2 es la célula al revés. El número bajo la nota es el grado.",
    oldEn: "Each cell written in C. Bar 1 is the cell. Bar 2 is the cell backwards. The number under the note is the scale degree.",
    oldEs: "Cada célula escrita en C. El compás 1 es la célula. El compás 2 es la célula al revés. El número bajo la nota es el grado."
  },
  {
    slug: "dom-pentatonic-grid-staff",
    kind: "pent",
    descEn: "The major pentatonic from each degree of a dominant, in all twelve keys. One pass of the five notes, going up.",
    descEs: "La pentatónica mayor desde cada grado de un dominante, en las doce tonalidades. Una pasada de las cinco notas, hacia arriba.",
    oldEn: "The major pentatonic from each degree, written over C7. One pass of the five notes, going up.",
    oldEs: "La pentatónica mayor desde cada grado, escrita sobre C7. Una pasada de las cinco notas, hacia arriba."
  },
  {
    slug: "major-pentatonics-on-chords-staff",
    kind: "pent",
    descEn: "Every major pentatonic the text names, in all twelve keys. One pass of each pentatonic, going up. A row marked none has no pentatonic to write, so it stays in the text exercise.",
    descEs: "Cada pentatónica mayor que el texto nombra, en las doce tonalidades. Una pasada de cada pentatónica, hacia arriba. Una fila con none no tiene pentatónica que escribir, y se queda en el ejercicio de texto.",
    oldEn: "Every major pentatonic the text names, written on a C chord of that scale. One pass of each pentatonic, going up. A row marked none has no pentatonic to write, so it stays in the text exercise.",
    oldEs: "Cada pentatónica mayor que el texto nombra, escrita sobre un acorde de C de esa escala. Una pasada de cada pentatónica, hacia arriba. Una fila con none no tiene pentatónica que escribir, y se queda en el ejercicio de texto."
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
  if (delta === 0) return letter;
  if (delta === 1) return letter + "#";
  if (delta === 2) return letter + "##";
  if (delta === 11) return letter + "b";
  if (delta === 10) return letter + "bb";
  fail("cannot spell " + letter + " at " + targetPc);
}

function accidentalSemis(name) {
  if (name.indexOf("##") >= 0) return 2;
  if (name.indexOf("bb") >= 0) return -2;
  if (name.indexOf("#") >= 0) return 1;
  if (name.indexOf("b") >= 0) return -1;
  return 0;
}

function pitchMidi(token) {
  var m = token.match(/^([A-G])(##|bb|#|b)?(\d)$/);
  if (!m) fail("pitch " + token);
  return (parseInt(m[3], 10) + 1) * 12 + LETTER_PC[m[1]] + accidentalSemis(m[2] || "");
}

function octaveForSpell(midi, letter, name) {
  return Math.floor((midi - LETTER_PC[letter] - accidentalSemis(name)) / 12) - 1;
}

function tonicMidi(pc) {
  return (((pc >= 8 ? 3 : 4) + 1) * 12) + pc;
}

function spellDegree(tonic, degree, midi) {
  var info = DEGREE[degree];
  if (!info) fail("degree " + degree);
  var letter = LETTERS[(LETTERS.indexOf(tonic.name.charAt(0)) + info.step) % 7];
  var pc = norm(tonic.pc + info.semi);
  var name = spellLetterAtPc(letter, pc);
  var oct = octaveForSpell(midi, letter, name);
  var written = name + oct;
  if (pitchMidi(written) !== midi) {
    fail("octave drift " + written + " for midi " + midi + " degree " + degree);
  }
  return written;
}

function splitCaption(line) {
  var i = line.indexOf(DOT);
  if (i < 0) fail("no caption: " + line);
  return { music: line.slice(0, i), caption: line.slice(i) };
}

function parseMusic(music) {
  var chord = "";
  var events = [];
  music.trim().split(/\s+/).forEach(function (token) {
    var m;
    if (token === "|") {
      events.push({ type: "bar" });
      return;
    }
    if (token.charAt(0) === "^") {
      chord = token;
      return;
    }
    m = token.match(/^([A-G](?:##|bb|#|b)?\d)n(?:_((?:#|b)?\d+))?$/);
    if (!m) fail("token " + token + " in " + music);
    events.push({ type: "note", midi: pitchMidi(m[1]), degree: m[2] || "" });
  });
  return { chord: chord, events: events };
}

function chordSuffix(chord) {
  var m = chord.match(/^\^([A-G](?:#|b)?)(.*)$/);
  if (!m || m[1] !== "C") fail("chord " + chord);
  return m[2];
}

function transposeLabeled(line, tonic) {
  var parts = splitCaption(line);
  var parsed = parseMusic(parts.music);
  var origin = null;
  var i;
  for (i = 0; i < parsed.events.length; i++) {
    if (parsed.events[i].type === "note" && parsed.events[i].degree === "1") {
      origin = parsed.events[i];
      break;
    }
  }
  if (!origin) fail("no degree 1: " + line);
  var base = tonicMidi(tonic.pc);
  var out = ["@key=C"];
  if (parsed.chord) out.push("^" + tonic.name + chordSuffix(parsed.chord));
  parsed.events.forEach(function (ev) {
    if (ev.type === "bar") {
      out.push("|");
      return;
    }
    out.push(spellDegree(tonic, ev.degree, base + (ev.midi - origin.midi)) + "n_" + ev.degree);
  });
  return out.join(" ") + parts.caption;
}

function transposePent(line, tonic) {
  var parts = splitCaption(line);
  var parsed = parseMusic(parts.music);
  var notes = [];
  var shift = tonicMidi(tonic.pc) - 60;
  var out = ["@key=C", "^" + tonic.name + chordSuffix(parsed.chord)];
  parsed.events.forEach(function (ev) {
    if (ev.type !== "note") fail("pentatonic bar in " + line);
    notes.push(ev);
  });
  if (notes.length % 5) fail("pentatonic length " + line);
  var g;
  for (g = 0; g < notes.length; g += 5) {
    var group = notes.slice(g, g + 5);
    var rel = norm(group[0].midi - 60);
    var degOfGroup = FROM_CHORD[rel];
    var info = DEGREE[degOfGroup];
    var letter = LETTERS[(LETTERS.indexOf(tonic.name.charAt(0)) + info.step) % 7];
    var pc = norm(tonic.pc + info.semi);
    var spelledRoot = spellLetterAtPc(letter, pc);
    var r;
    if (spelledRoot.indexOf("bb") >= 0 || spelledRoot.indexOf("##") >= 0) {
      for (r = 0; r < ROOTS.length; r++) {
        if (ROOTS[r].pc === pc) {
          spelledRoot = ROOTS[r].name;
          break;
        }
      }
    }
    var groupRoot = { name: spelledRoot, pc: pc };
    var groupMidi = group[0].midi + shift;
    if (norm(groupMidi) !== pc) {
      fail("pentatonic root drift " + line + " " + tonic.name);
    }
    group.forEach(function (ev) {
      var off = norm(ev.midi - group[0].midi);
      var deg = PENT[off];
      if (!deg) fail("not a major pentatonic: " + line + " off " + off);
      out.push(spellDegree(groupRoot, deg, groupMidi + (ev.midi - group[0].midi)) + "n");
    });
  }
  return out.join(" ") + parts.caption;
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
  ["resources/js/staff.js", "resources/js/share.js"].forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(rootDir, rel), "utf8"), context, { filename: rel });
  });
  context.shareSnapshot = function (part) {
    return { shareId: part.id, name: part.name, bars: part.bars, lines: part.lines };
  };
  return context;
}

function urlLength(context, ex, lines) {
  var hash = context.shareHashFromPayload({
    v: 1,
    id: ex.id,
    name: ex.nameEn,
    bars: ex.bars,
    lines: lines
  });
  var url = hash ? "https://eization.com/" + hash : "";
  return { hash: hash, length: url.length };
}

function replaceLines(text, slug, lines) {
  var slugAt = text.indexOf('"slug":  "' + slug + '"');
  if (slugAt < 0) slugAt = text.indexOf('"slug": "' + slug + '"');
  if (slugAt < 0) fail("slug text " + slug);
  var linesAt = text.indexOf('"lines":', slugAt);
  var bracket = text.indexOf("[", linesAt);
  var depth = 0;
  var i = bracket;
  for (; i < text.length; i++) {
    if (text.charAt(i) === "[") depth++;
    else if (text.charAt(i) === "]") {
      depth--;
      if (depth === 0) break;
    }
  }
  var body = lines.map(function (line) {
    return "                      " + JSON.stringify(line);
  }).join(",\n");
  return text.slice(0, bracket) + "[\n" + body + "\n                  ]" + text.slice(i + 1);
}

function replaceNearby(text, slug, from, to) {
  var slugAt = text.indexOf('"' + slug + '"');
  if (slugAt < 0) fail("nearby " + slug);
  var start = Math.max(0, slugAt - 400);
  var end = Math.min(text.length, slugAt + 1600);
  var slice = text.slice(start, end);
  var at = slice.indexOf(from);
  if (at < 0) fail("missing text for " + slug + ": " + from);
  return text.slice(0, start) + slice.slice(0, at) + to + slice.slice(at + from.length) + text.slice(end);
}

var catalog = JSON.parse(fs.readFileSync(file, "utf8"));
var context = loadContext();
var bySlug = {};
catalog.forEach(function (ex) { bySlug[ex.slug] = ex; });

function scaleDesc(mark, lang) {
  if (lang === "es") {
    return "Las células " + mark + ", en las doce tonalidades. El número bajo la nota es el grado. Una tonalidad, luego la siguiente.";
  }
  return "The " + mark + " cells, in all twelve keys. The number under the note is the scale degree. One key, then the next key.";
}

function expandJob(slug, sourceLines, kind, id, name, bars) {
  var lines = [];
  var doubles = 0;
  sourceLines.forEach(function (line) {
    ROOTS.forEach(function (tonic) {
      var next = (kind === "pent" ? transposePent : transposeLabeled)(line, tonic);
      if (tonic.name === "C" && next !== "@key=C " + line) {
        fail(slug + " C line drifted\n" + line + "\n" + next);
      }
      var status = context.staffNotationStatus(next);
      if (!status.ok) fail(slug + " parse: " + next + " (" + status.error + ")");
      if (!context.staffShareCanonical(next)) fail(slug + " does not pack: " + next);
      if (next.indexOf("##") >= 0 || next.indexOf("bb") >= 0) doubles++;
      lines.push(next);
    });
  });
  if (lines.length > 500) fail(slug + " has " + lines.length + " lines");
  var url = urlLength(context, { id: id, nameEn: name, bars: bars }, lines);
  console.log(slug + " " + lines.length + " " + url.length + " " + (url.hash || "").slice(0, 4));
  if (!url.hash || url.length > 8000 || url.hash.indexOf("#s2=") !== 0) {
    fail("URL too long for " + slug + ": " + url.length);
  }
  if (doubles) console.log("  double accidentals " + doubles);
  return lines;
}

function mustFind(lines, slug, sample) {
  var i;
  for (i = 0; i < lines.length; i++) {
    if (lines[i] === sample) return;
  }
  fail(slug + " missing\n" + sample);
}

var scaleSource = bySlug["scale-patterns-staff"];
if (!scaleSource) fail("missing scale-patterns-staff");
if (scaleSource.lines[0].indexOf("@key=C") === 0) fail("scale patterns already expanded");
var scaleBlocks = SCALE_FAMILIES.map(function (family) {
  var source = scaleSource.lines.filter(function (line) {
    return splitCaption(line).caption === DOT + family.mark;
  });
  if (source.length !== 12) fail(family.mark + " has " + source.length);
  var lines = expandJob(family.slug, source, "labeled", family.id, family.nameEn, 1);
  family.lines = lines;
  family.descEn = scaleDesc(family.mark, "en");
  family.descEs = scaleDesc(family.mark, "es");
  return family;
});
mustFind(scaleBlocks[0].lines, "scale-patterns-staff", "@key=C G4n_1 A4n_2 B4n_3 D5n_5" + DOT + "+2");
mustFind(scaleBlocks[0].lines, "scale-patterns-staff", "@key=C Db4n_1 Eb4n_2 F4n_3 Ab4n_5" + DOT + "+2");
mustFind(scaleBlocks[0].lines, "scale-patterns-staff", "@key=C F#4n_1 G#4n_2 A#4n_3 C#5n_5" + DOT + "+2");
mustFind(scaleBlocks[0].lines, "scale-patterns-staff", "@key=C Bb3n_1 C4n_2 D4n_3 F4n_5" + DOT + "+2");

JOBS.forEach(function (job) {
  var ex = bySlug[job.slug];
  if (!ex) fail("missing " + job.slug);
  if (ex.lines[0].indexOf("@key=C") === 0) fail(job.slug + " is already in twelve keys");
  ex.lines = expandJob(job.slug, ex.lines, job.kind, ex.id, ex.nameEn, ex.bars);
  ex.descEn = job.descEn;
  ex.descEs = job.descEs;
});
mustFind(bySlug["alt-four-note-cells-staff"].lines, "alt-four-note-cells-staff", "@key=C Db4n_1 F4n_3 G4n_#4 Ab4n_5 | Ab4n_5 G4n_#4 F4n_3 Db4n_1" + DOT + "lydian");
mustFind(bySlug["dom-pentatonic-grid-staff"].lines, "dom-pentatonic-grid-staff", "@key=C ^F#7 F#4n G#4n A#4n C#5n D#5n" + DOT + "Maj pent on 1");

if (checkOnly) {
  console.log("check ok");
  process.exit(0);
}

var text = fs.readFileSync(file, "utf8");
text = replaceLines(text, "scale-patterns-staff", scaleBlocks[0].lines);
text = replaceNearby(text, "scale-patterns-staff", "Scale patterns on the staff", scaleBlocks[0].nameEn);
text = replaceNearby(text, "scale-patterns-staff", "Patrones de escala en el pentagrama", scaleBlocks[0].nameEs);
text = replaceNearby(text, "scale-patterns-staff", "All forty-eight cells written in C. The number under the note is the scale degree. One shape, one bar, then the next shape.", scaleBlocks[0].descEn);
text = replaceNearby(text, "scale-patterns-staff", "Las cuarenta y ocho células escritas en C. El número bajo la nota es el grado. Una forma, un compás, luego la siguiente.", scaleBlocks[0].descEs);

var extra = scaleBlocks.slice(1).map(function (family) {
  return JSON.stringify({
    id: family.id,
    slug: family.slug,
    group: "pitch",
    staff: true,
    bars: 1,
    nameEn: family.nameEn,
    nameEs: family.nameEs,
    descEn: family.descEn,
    descEs: family.descEs,
    books: scaleSource.books,
    lines: family.lines
  }, null, 4).split("\n").map(function (line) {
    return "    " + line;
  }).join("\n");
}).join(",\n");
var anchor = text.indexOf('"id":  "more0133"');
if (anchor < 0) fail("missing minor-scales anchor");
var insertAt = text.lastIndexOf("\n    {", anchor);
text = text.slice(0, insertAt + 1) + extra + "," + text.slice(insertAt);

JOBS.forEach(function (job) {
  var ex = bySlug[job.slug];
  text = replaceLines(text, job.slug, ex.lines);
  text = replaceNearby(text, job.slug, job.oldEn, job.descEn);
  text = replaceNearby(text, job.slug, job.oldEs, job.descEs);
});
JSON.parse(text);
fs.writeFileSync(file, text);
console.log("wrote twelve-key staff exercises");
