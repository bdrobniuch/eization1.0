var STAFF_LETTER_STEPS = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
var STAFF_SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
var STAFF_FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];
var STAFF_MAJOR_KEYS = {
  C: { kind: "sharp", count: 0 },
  G: { kind: "sharp", count: 1 },
  D: { kind: "sharp", count: 2 },
  A: { kind: "sharp", count: 3 },
  E: { kind: "sharp", count: 4 },
  B: { kind: "sharp", count: 5 },
  "F#": { kind: "sharp", count: 6 },
  "C#": { kind: "sharp", count: 7 },
  F: { kind: "flat", count: 1 },
  Bb: { kind: "flat", count: 2 },
  Eb: { kind: "flat", count: 3 },
  Ab: { kind: "flat", count: 4 },
  Db: { kind: "flat", count: 5 },
  Gb: { kind: "flat", count: 6 },
  Cb: { kind: "flat", count: 7 }
};

/* Minor (and similar) names → relative major for the key signature only. */
var STAFF_KEY_ALIASES = {
  Am: "C",
  Em: "G",
  Bm: "D",
  "F#m": "A",
  "C#m": "E",
  "G#m": "B",
  "D#m": "F#",
  "A#m": "C#",
  Dm: "F",
  Gm: "Bb",
  Cm: "Eb",
  Fm: "Ab",
  Bbm: "Db",
  Ebm: "Gb",
  Abm: "Cb"
};

/* Treble: sharp/flat staff degrees (letter+octave) for key signature glyphs */
var STAFF_KEY_POS_TREBLE = {
  sharp: ["F5", "C5", "G5", "D5", "A4", "E5", "B4"],
  flat: ["B4", "E5", "A4", "D5", "G4", "C5", "F4"]
};
var STAFF_KEY_POS_BASS = {
  sharp: ["F3", "C3", "G3", "D3", "A2", "E3", "B2"],
  flat: ["B2", "E3", "A2", "D3", "G2", "C3", "F2"]
};

var staffAstCache = new Map();
/* Last parseMusicNotation fail reason (for Edit pending cue). Cleared on each parse. */
var staffLastParseError = "";
/* Character range of that failure in the trimmed music string. Null when there is no single span. */
var staffLastParseSpan = null;
/* Whole-exercise defaults applied before line @treble / @bass / @key=. */
var staffActiveDefaults = { clef: "treble", keyName: "C" };

function clearMusicStaffCache() {
  staffAstCache.clear();
}

function staffNormalizeDefaults(opts) {
  var clef = opts && opts.clef === "bass" ? "bass" : "treble";
  var keyName = "C";
  var rawKey = opts && (opts.key || opts.keyName);
  var parsed;
  if (rawKey) {
    parsed = staffParseKeyName(String(rawKey));
    if (parsed) {
      keyName = parsed;
    }
  }
  return { clef: clef, keyName: keyName };
}

function staffDefaultsEqual(a, b) {
  return a && b && a.clef === b.clef && a.keyName === b.keyName;
}

function staffSetActiveDefaults(opts) {
  var next = staffNormalizeDefaults(opts);
  if (staffDefaultsEqual(staffActiveDefaults, next)) {
    return;
  }
  staffActiveDefaults = next;
  staffAstCache.clear();
}

function staffRunWithDefaults(opts, fn) {
  var prev = staffActiveDefaults;
  staffActiveDefaults = staffNormalizeDefaults(opts);
  try {
    return fn();
  } finally {
    staffActiveDefaults = prev;
  }
}

function staffCacheKey(raw) {
  return staffActiveDefaults.clef + "\0" + staffActiveDefaults.keyName + "\0" + raw;
}

function staffAccKind(kind) {
  if (kind === "flat" || kind === "b") {
    return "b";
  }
  if (kind === "sharp" || kind === "#") {
    return "#";
  }
  if (kind === "bb" || kind === "doubleflat") {
    return "bb";
  }
  if (kind === "##" || kind === "x" || kind === "doublesharp") {
    return "##";
  }
  if (kind === "n" || kind === "natural") {
    return "n";
  }
  return kind;
}

function staffAccidentalGlyphName(acc) {
  if (acc === "##") {
    return "accidentalDoubleSharp";
  }
  if (acc === "bb") {
    return "accidentalDoubleFlat";
  }
  if (acc === "#") {
    return "accidentalSharp";
  }
  if (acc === "b") {
    return "accidentalFlat";
  }
  if (acc === "n") {
    return "accidentalNatural";
  }
  return "";
}

function staffPitchAlteration(written) {
  if (written === "##") {
    return 2;
  }
  if (written === "bb") {
    return -2;
  }
  if (written === "#") {
    return 1;
  }
  if (written === "b") {
    return -1;
  }
  return 0;
}

/* How many trailing dots a duration token carries (0, 1, or 2). */
function staffDurationDotCount(dur) {
  var s = String(dur || "");
  var n = 0;
  while (n < 2 && s.charAt(s.length - 1) === ".") {
    n++;
    s = s.slice(0, -1);
  }
  return n;
}

/* Base letter from a duration token ("q", "e.", "q..", …). */
function staffDurationBase(dur) {
  if (!dur) {
    return "q";
  }
  var s = String(dur);
  while (s.charAt(s.length - 1) === ".") {
    s = s.slice(0, -1);
  }
  return s || "q";
}

function staffDurationDotted(dur) {
  return staffDurationDotCount(dur) > 0;
}

/*
 * Combine base letter + optional dots ("", ".", "..", or a count).
 * A dotted stemless note does not parse.
 */
function staffMakeDuration(base, dotted) {
  var b = base || "q";
  var n = 0;
  if (dotted === true || dotted === ".") {
    n = 1;
  } else if (dotted === "..") {
    n = 2;
  } else if (typeof dotted === "number" && dotted > 0) {
    n = dotted > 2 ? 2 : dotted;
  } else if (typeof dotted === "string") {
    n = staffDurationDotCount(dotted);
  }
  if (n && b === "n") {
    return null;
  }
  if (n === 2) {
    return b + "..";
  }
  if (n === 1) {
    return b + ".";
  }
  return b;
}

/* Whole notes and stemless quarters (n) draw a head only. n lasts one beat. */
function staffHasStem(dur) {
  var base = staffDurationBase(dur);
  return base !== "w" && base !== "n";
}

function staffDurationGlyph(dur) {
  var base = staffDurationBase(dur);
  if (base === "w") {
    return "noteheadWhole";
  }
  if (base === "h") {
    return "noteheadHalf";
  }
  return "noteheadBlack";
}

/* Half and whole slashes are hollow; shorter values use the filled slash. */
function staffSlashHeadGlyph(dur) {
  var base = staffDurationBase(dur);
  if (base === "w") {
    return "noteheadSlashWhiteWhole";
  }
  if (base === "h") {
    return "noteheadSlashWhiteHalf";
  }
  return "noteheadSlash";
}

function staffRestGlyph(dur) {
  var base = staffDurationBase(dur);
  if (base === "w") {
    return "restWhole";
  }
  if (base === "h") {
    return "restHalf";
  }
  if (base === "e") {
    return "rest8th";
  }
  if (base === "s") {
    return "rest16th";
  }
  return "restQuarter";
}

/* Duration in quarter-note units. One dot × 1.5, two dots × 1.75. */
function staffDurationQuarters(dur) {
  var base = staffDurationBase(dur);
  var q;
  var dots;
  if (base === "w") {
    q = 4;
  } else if (base === "h") {
    q = 2;
  } else if (base === "e") {
    q = 0.5;
  } else if (base === "s") {
    q = 0.25;
  } else if (base === "n") {
    q = 1;
  } else {
    q = 1;
  }
  dots = staffDurationDotCount(dur);
  if (dots === 2) {
    return q * 1.75;
  }
  if (dots === 1) {
    return q * 1.5;
  }
  return q;
}

/*
 * Column weight in quarter-slots. Short enough that a reel of sixteenths
 * stays readable; long enough that a whole note is wider than a quarter.
 * A dotted value sits halfway toward the next longer note.
 */
function staffDurationSlots(dur) {
  var base = staffDurationBase(dur);
  var w = 1.35;
  var next = 1.9;
  var dots;
  if (base === "s") {
    w = 0.9;
    next = 1;
  } else if (base === "e") {
    w = 1;
    next = 1.35;
  } else if (base === "h") {
    w = 1.9;
    next = 2.4;
  } else if (base === "w") {
    w = 2.4;
    next = 3.1;
  }
  dots = staffDurationDotCount(dur);
  if (dots === 1) {
    return (w + next) / 2;
  }
  if (dots === 2) {
    return (w + 3 * next) / 4;
  }
  return w;
}

/* Extra unbeamed stem length, in staff spaces, for each flag after the eighth. */
function staffFlagExtraSpaces(dur) {
  return staffDurationBase(dur) === "s" ? 1 : 0;
}

function staffIsShortDuration(dur) {
  var base = staffDurationBase(dur);
  return base === "e" || base === "s";
}

function staffFlagGlyph(dur, stemUp) {
  if (staffDurationBase(dur) === "s") {
    return stemUp ? "flag16thUp" : "flag16thDown";
  }
  return stemUp ? "flag8thUp" : "flag8thDown";
}

/* Place a SMuFL path glyph; (x,y) is the SMuFL origin. Returns advance width in px. */
function staffPlaceGlyph(svg, name, x, y, space, className) {
  var glyphs = typeof STAFF_GLYPHS !== "undefined" ? STAFF_GLYPHS : null;
  var g = glyphs && glyphs[name];
  if (!g) {
    return 0;
  }
  var unit = typeof STAFF_GLYPH_UNIT === "number" ? STAFF_GLYPH_UNIT : 250;
  var scale = space / unit;
  var group = staffSvgEl("g", {
    transform: "translate(" + x + "," + y + ") scale(" + scale + ")",
    fill: "currentColor"
  });
  if (className) {
    group.setAttribute("class", className);
  }
  group.setAttribute("data-glyph", name);
  group.appendChild(staffSvgEl("path", { d: g.d }));
  svg.appendChild(group);
  svg._staffLastGlyph = group;
  return g.advance * space;
}

function staffGlyphAdvance(name, space) {
  var glyphs = typeof STAFF_GLYPHS !== "undefined" ? STAFF_GLYPHS : null;
  var g = glyphs && glyphs[name];
  return g ? g.advance * space : space;
}

function staffDrawAccidental(svg, x, step, clef, staffTop, lineGap, kind) {
  var acc = staffAccKind(kind);
  var name = staffAccidentalGlyphName(acc);
  var ny = staffPitchY(step, clef, staffTop, lineGap);
  var adv = staffGlyphAdvance(name, lineGap);
  /* Center the glyph on column x; SMuFL origin is the left of the outline. */
  staffPlaceGlyph(svg, name, x - adv / 2, ny, lineGap);
  return ny;
}

/*
 * Gould / Dorico zig-zag: highest accidental closest to the chord, then lowest,
 * then next-highest, etc. Pack into an earlier column when a 7th+ apart.
 */
function staffAssignAccidentalColumns(pitches, keyAlts) {
  var out = [];
  var need = [];
  var i;
  for (i = 0; i < pitches.length; i++) {
    var acc =
      typeof pitches[i].displayAcc === "string"
        ? pitches[i].displayAcc
        : staffWrittenAccidental(pitches[i], keyAlts);
    out[i] = { acc: acc, col: 0 };
    if (acc) {
      need.push({ index: i, step: pitches[i].step });
    }
  }
  if (need.length <= 1) {
    return out;
  }
  need.sort(function (a, b) {
    return a.step - b.step;
  });
  /* Seventh or more (6 letter-steps) may share a column. */
  var minSep = 6;
  var lo = 0;
  var hi = need.length - 1;
  var takeHigh = true;
  var placed = [];
  while (lo <= hi) {
    var pick = takeHigh ? need[hi--] : need[lo++];
    takeHigh = !takeHigh;
    var col = 0;
    for (;;) {
      var ok = true;
      for (var j = 0; j < placed.length; j++) {
        if (placed[j].col === col && Math.abs(placed[j].step - pick.step) < minSep) {
          ok = false;
          break;
        }
      }
      if (ok) {
        break;
      }
      col++;
    }
    out[pick.index].col = col;
    placed.push({ col: col, step: pick.step });
  }
  return out;
}

function staffNormAccidental(raw) {
  if (!raw) {
    return "";
  }
  if (raw === "##" || raw === "x" || raw === "X" || raw === "\uD834\uDD2A") {
    return "##";
  }
  if (raw === "bb" || raw === "\uD834\uDD2B") {
    return "bb";
  }
  if (raw === "#" || raw === "\u266F") {
    return "#";
  }
  if (raw === "b" || raw === "\u266D") {
    return "b";
  }
  if (raw === "n" || raw === "\u266E") {
    return "n";
  }
  return "";
}

/* ^t=100 is a tempo for this example. 1–500, no leading zero. Anything else stays a chord name. */
function staffTempoLabel(raw) {
  var m = /^t=([1-9]\d{0,2})$/.exec(String(raw || ""));
  var n;
  if (!m) {
    return "";
  }
  n = parseInt(m[1], 10);
  if (n < 1 || n > 500) {
    return "";
  }
  return String(n);
}

function staffFormatChordText(raw) {
  if (!raw) {
    return "";
  }
  var s = String(raw);
  var lead = "";
  /* A numeral can start with the accidental: bVII, #IV, bbVII, ##IV. */
  if (s.indexOf("bb") === 0 || s.indexOf("\u266D\u266D") === 0) {
    lead = "\uD834\uDD2B";
    s = s.replace(/^(bb|\u266D\u266D)/, "");
  } else if (s.indexOf("##") === 0 || s.indexOf("\u266F\u266F") === 0) {
    lead = "\uD834\uDD2A";
    s = s.replace(/^(##|\u266F\u266F)/, "");
  } else if (/^[b#\u266D\u266F]/.test(s)) {
    var first = s.charAt(0);
    s = s.slice(1);
    if (first === "b" || first === "\u266D") {
      lead = "\u266D";
    } else if (first === "#" || first === "\u266F") {
      lead = "\u266F";
    }
  }
  s = s.replace(/maj7/gi, "\u22067");
  s = s.replace(/\u25B37/g, "\u22067");
  s = s.replace(/dim7/gi, "\u00B07");
  s = s.replace(/ø7/gi, "\u00F87");
  s = s.replace(/##/g, "\uD834\uDD2A");
  s = s.replace(/#/g, "\u266F");
  /* ♭ / 𝄫 only as pitch accidentals after A–G (Bb, Ebb, Eb7), not inside words. */
  s = s.replace(
    /([A-Ga-g])bb(?=[0-9A-Za-z\u2206\u00B0\u00F8+\-\u266F]|$)/g,
    "$1\uD834\uDD2B"
  );
  s = s.replace(
    /([A-Ga-g])b(?=[0-9A-Za-z\u2206\u00B0\u00F8+\-\u266F]|$)/g,
    "$1\u266D"
  );
  return lead + s;
}

/* Above and under use the same spelling, so ^bVII and _bVII both print ♭VII. */
function staffFormatDegreeLabel(raw) {
  return staffFormatChordText(raw);
}

/*
 * Tail after a pitch, slash, rest, or ]. ' > - are articulations.
 * _text is under the staff. ^text is above it. Either order.
 * A ^ with no text, or a ^ before _ or another articulation, is marcato.
 */
function staffParseAffixes(tail) {
  var artic = "";
  var label = "";
  var above = "";
  var mode = "";
  var i = 0;
  var ch;
  function staffAffixBoundary(idx) {
    var next;
    if (idx >= tail.length) {
      return true;
    }
    next = tail.charAt(idx);
    return next === "_" || next === "^" || next === "'" || next === ">" || next === "-";
  }
  while (i < tail.length) {
    ch = tail.charAt(i);
    if (mode === "_" || mode === "^") {
      if (ch === "_" || ch === "^") {
        if (mode === "_" && !label) {
          return null;
        }
        if (mode === "^" && !above) {
          return null;
        }
        if (ch === "^" && staffAffixBoundary(i + 1)) {
          artic += "^";
          mode = "";
          i++;
          continue;
        }
        if (ch === mode) {
          return null;
        }
        mode = ch === "_" ? "_" : "^";
        i++;
        continue;
      }
      if (mode === "_") {
        label += ch;
      } else {
        above += ch;
      }
      i++;
      continue;
    }
    if (ch === "'" || ch === ">" || ch === "-") {
      artic += ch;
      i++;
      continue;
    }
    if (ch === "^") {
      if (staffAffixBoundary(i + 1)) {
        artic += "^";
        i++;
        continue;
      }
      mode = "^";
      i++;
      continue;
    }
    if (ch === "_") {
      mode = "_";
      i++;
      continue;
    }
    return null;
  }
  if ((mode === "_" && !label) || (mode === "^" && !above)) {
    return null;
  }
  return {
    articulations: staffArticulationList(artic),
    label: label,
    above: above
  };
}

function staffParsePitchToken(token) {
  var m =
    /^([A-Ga-g])(##|bb|\uD834\uDD2A|\uD834\uDD2B|x|X|#|b|n|\u266F|\u266D|\u266E)?(\d)([whqesn]?)(\.{0,2})(!?)(.*)$/.exec(
      token
    );
  var aff;
  if (!m) {
    return null;
  }
  var letter = m[1].toUpperCase();
  var acc = staffNormAccidental(m[2] || "");
  var octave = parseInt(m[3], 10);
  if (isNaN(octave) || octave < 0 || octave > 9) {
    return null;
  }
  var dur = staffMakeDuration(m[4] || "q", m[5] || "");
  if (!dur) {
    return null;
  }
  aff = staffParseAffixes(m[7] || "");
  if (!aff) {
    return null;
  }
  var force = m[6] === "!";
  return {
    letter: letter,
    accidental: acc,
    octave: octave,
    duration: dur,
    force: force,
    label: aff.label,
    above: aff.above,
    articulations: aff.articulations,
    step: STAFF_LETTER_STEPS[letter] + octave * 7
  };
}

/* ' staccato, > accent, - tenuto, ^ marcato. Order is the order they were written. */
function staffArticulationList(raw) {
  var list = [];
  var i;
  var kind;
  var map = { "'": "staccato", ">": "accent", "-": "tenuto", "^": "marcato" };
  for (i = 0; i < raw.length; i++) {
    kind = map[raw.charAt(i)];
    if (kind && list.indexOf(kind) < 0) {
      list.push(kind);
    }
  }
  return list;
}

function staffIsDynamic(tok) {
  return tok === "pp" || tok === "p" || tok === "mp" || tok === "mf" || tok === "f" || tok === "ff" || tok === "sfz";
}

function staffIsHairpin(tok) {
  return tok === "cresc" || tok === "dim";
}

function staffParseRestToken(token) {
  var m = /^r([whqes]?)(\.{0,2})(.*)$/i.exec(token);
  var aff;
  if (!m) {
    return null;
  }
  var dur = staffMakeDuration(m[1] || "q", m[2] || "");
  if (!dur) {
    return null;
  }
  aff = staffParseAffixes(m[3] || "");
  if (!aff) {
    return null;
  }
  return {
    type: "rest",
    duration: dur,
    label: aff.label,
    above: aff.above,
    articulations: aff.articulations
  };
}

/* Pitchless rhythmic slash on the middle staff line. */
function staffParseSlashToken(token, clef) {
  var m = /^\/([whqes]?)(\.{0,2})(.*)$/.exec(token);
  var aff;
  if (!m) {
    return null;
  }
  var rhythmic = !!(m[1] || m[2]);
  var dur = staffMakeDuration(rhythmic ? m[1] || "q" : "q", m[2] || "");
  if (!dur) {
    return null;
  }
  aff = staffParseAffixes(m[3] || "");
  if (!aff) {
    return null;
  }
  var step = staffBottomLineStep(clef) + 4;
  var letter = clef === "bass" ? "D" : "B";
  var octave = clef === "bass" ? 3 : 4;
  return {
    letter: letter,
    accidental: "",
    octave: octave,
    duration: dur,
    force: false,
    label: aff.label,
    above: aff.above,
    articulations: aff.articulations,
    step: step,
    /* Bare / is play-anything: the slash, no stem. /q and the rest stay rhythm. */
    head: rhythmic ? "slash" : "beat"
  };
}

function staffLooksNotationIsh(tokens) {
  var i;
  for (i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (
      t.charAt(0) === "@" ||
      t.charAt(0) === "^" ||
      t.charAt(0) === "[" ||
      t.charAt(0) === "{" ||
      /^\(\d/.test(t) ||
      t === "|" ||
      t === "%" ||
      staffIsDynamic(t) ||
      staffIsHairpin(t) ||
      /^r([whqes]?)(\.{0,2})/i.test(t) ||
      /^\/([whqes]?)(\.{0,2})(?:['>\-^]|_|$)/.test(t) ||
      /* Pitch-like (letter + octave), not prose like "Major". */
      /^[A-Ga-g](##|bb|\uD834\uDD2A|\uD834\uDD2B|x|X|#|b|n|\u266F|\u266D|\u266E)?\d/.test(t)
    ) {
      return true;
    }
  }
  return false;
}

/*
 * Seconds and unisons: the note on the stem side stays in the column.
 * The next one steps to the right, then back, through the run.
 * Stem up counts from the bottom (lower note on the left).
 * Stem down counts from the top (upper note on the left).
 */
function staffStackSecondOffsets(pitches, stemUp, secondShift) {
  var offsets = [];
  var i = 0;
  var j;
  var k;
  var fromEnd;
  for (i = 0; i < pitches.length; i++) {
    offsets[i] = 0;
  }
  i = 0;
  while (i < pitches.length) {
    j = i + 1;
    while (
      j < pitches.length &&
      pitches[j].step - pitches[j - 1].step <= 1
    ) {
      j++;
    }
    if (j - i >= 2) {
      for (k = i; k < j; k++) {
        fromEnd = stemUp ? k - i : j - 1 - k;
        offsets[k] = fromEnd % 2 === 0 ? 0 : secondShift;
      }
    }
    i = Math.max(j, i + 1);
  }
  return offsets;
}

/*
 * Accidental centers for a stack: start left of each notehead (incl. second
 * offsets), then push left until clear of foreign noteheads and other accidentals.
 * Returns an array parallel to pitches; null where there is no written accidental.
 */
function staffStackAccidentalCenters(
  pitches,
  offsets,
  cols,
  cx,
  noteHeadRx,
  lineGap,
  accGap
) {
  var centers = [];
  var advs = [];
  var i;
  var j;
  var pass;
  for (i = 0; i < pitches.length; i++) {
    centers[i] = null;
    advs[i] = 0;
    if (!cols[i].acc) {
      continue;
    }
    var name = staffAccidentalGlyphName(staffAccKind(cols[i].acc));
    var adv = staffGlyphAdvance(name || "accidentalSharp", lineGap);
    var colPitch = adv + lineGap * 0.2;
    var headX = cx + offsets[i];
    advs[i] = adv;
    centers[i] =
      headX - noteHeadRx - accGap - adv / 2 - (cols[i].col || 0) * colPitch;
  }
  for (pass = 0; pass < pitches.length + 2; pass++) {
    var moved = false;
    for (i = 0; i < pitches.length; i++) {
      if (centers[i] === null) {
        continue;
      }
      var accLeft = centers[i] - advs[i] / 2;
      var accRight = centers[i] + advs[i] / 2;
      for (j = 0; j < pitches.length; j++) {
        if (j === i) {
          continue;
        }
        if (!staffAccReachesStep(cols[i].acc, pitches[i].step, pitches[j].step)) {
          continue;
        }
        var headLeft = cx + offsets[j] - noteHeadRx;
        if (accRight > headLeft - accGap && accLeft < cx + offsets[j] + noteHeadRx) {
          var newCenter = headLeft - accGap - advs[i] / 2;
          if (newCenter < centers[i] - 0.01) {
            centers[i] = newCenter;
            moved = true;
          }
        }
      }
      /* Keep accidentals from overlapping each other when vertically near. */
      for (j = 0; j < pitches.length; j++) {
        if (j === i || centers[j] === null) {
          continue;
        }
        if (
          !staffAccReachesStep(cols[i].acc, pitches[i].step, pitches[j].step) &&
          !staffAccReachesStep(cols[j].acc, pitches[j].step, pitches[i].step)
        ) {
          continue;
        }
        var otherLeft = centers[j] - advs[j] / 2;
        var otherRight = centers[j] + advs[j] / 2;
        accLeft = centers[i] - advs[i] / 2;
        accRight = centers[i] + advs[i] / 2;
        if (accRight > otherLeft - accGap && accLeft < otherRight + accGap) {
          /* Prefer leaving the rightmost (higher col / closer to chord) and push i left. */
          if (centers[i] <= centers[j]) {
            newCenter = otherLeft - accGap - advs[i] / 2;
            if (newCenter < centers[i] - 0.01) {
              centers[i] = newCenter;
              moved = true;
            }
          }
        }
      }
    }
    if (!moved) {
      break;
    }
  }
  return centers;
}

/* Auto-beam group length in quarter-note units (compound 6/8, 9/8, 12/8 → dotted quarter). */
function staffBeamGroupQuarters(meter) {
  var unitQ = 4 / meter.bottom;
  if (!unitQ || unitQ <= 0) {
    return 1;
  }
  if (meter.bottom === 8 && meter.top % 3 === 0) {
    return 3 * unitQ;
  }
  return unitQ;
}

/* Split a tie mark out so `/q~/q` and `/q ~ /q` are the same tokens. */
function staffTokenize(raw) {
  return String(raw || "")
    .replace(/~/g, " ~ ")
    .replace(/\|/g, " | ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/* Ranges into `raw` for each staffTokenize token. `~` and `|` are their own tokens. */
function staffTokenRanges(raw) {
  var s = String(raw || "");
  var tokens = staffTokenize(s);
  var out = [];
  var pos = 0;
  var i;
  var idx;
  for (i = 0; i < tokens.length; i++) {
    idx = s.indexOf(tokens[i], pos);
    if (idx < 0) {
      idx = pos;
    }
    out.push({ start: idx, end: idx + tokens[i].length });
    pos = idx + tokens[i].length;
  }
  return out;
}

function staffSpan(ranges, index, endIndex) {
  var end;
  var a;
  var b;
  if (!ranges || index == null || index < 0 || index >= ranges.length) {
    return null;
  }
  end = endIndex == null ? index : endIndex;
  if (end < index) {
    end = index;
  }
  if (end >= ranges.length) {
    end = ranges.length - 1;
  }
  a = ranges[index];
  b = ranges[end];
  if (!a || !b || !(b.end > a.start)) {
    return null;
  }
  return { start: a.start, end: b.end };
}

function staffFailSpan(reason, tok, span, open) {
  var err = { error: reason, tok: tok || "" };
  if (span && typeof span.start === "number" && span.end > span.start) {
    err.start = span.start;
    err.end = span.end;
  }
  if (open) {
    err.open = true;
  }
  return err;
}

function staffForwardError(child, fallbackSpan) {
  var span = null;
  if (!child) {
    return staffFailSpan("", "");
  }
  if (typeof child.start === "number" && child.end > child.start) {
    span = { start: child.start, end: child.end };
  } else {
    span = fallbackSpan || null;
  }
  return staffFailSpan(child.error, child.tok, span, child.open);
}

/* Drop locate-only fields so a drawn line matches the previous AST shape. */
function staffClearTieSpans(events) {
  var i;
  var n;
  if (!events) {
    return;
  }
  for (i = 0; i < events.length; i++) {
    if (events[i] && events[i].tieSpan) {
      delete events[i].tieSpan;
    }
    if (events[i] && events[i].type === "beam" && events[i].notes) {
      for (n = 0; n < events[i].notes.length; n++) {
        if (events[i].notes[n] && events[i].notes[n].tieSpan) {
          delete events[i].notes[n].tieSpan;
        }
      }
    }
    if (events[i] && events[i].type === "tuplet") {
      staffClearTieSpans(events[i].events);
    }
  }
}

/* Same written pitch, or any slash with any slash. Natural matches a bare letter. */
function staffTieKey(pitch) {
  if (!pitch) {
    return "";
  }
  if (pitch.head === "slash" || pitch.head === "beat") {
    return "slash";
  }
  var acc = pitch.accidental || "";
  if (acc === "n") {
    acc = "";
  }
  return pitch.letter + acc + String(pitch.octave);
}

function staffFirstEvent(events) {
  var i;
  for (i = 0; i < events.length; i++) {
    if (events[i].type !== "barline") {
      return events[i];
    }
  }
  return null;
}

function staffLastEvent(events) {
  var i;
  for (i = events.length - 1; i >= 0; i--) {
    if (events[i].type !== "barline") {
      return events[i];
    }
  }
  return null;
}

/* Pitches a tie can arrive at: one note, every chord tone, or the first note of a beam. */
function staffIncomingKeys(ev) {
  var keys = [];
  var i;
  if (!ev || ev.type === "rest" || ev.type === "barline") {
    return keys;
  }
  if (ev.type === "note") {
    return [staffTieKey(ev.pitch)];
  }
  if (ev.type === "stack") {
    for (i = 0; i < ev.pitches.length; i++) {
      keys.push(staffTieKey(ev.pitches[i]));
    }
    return keys;
  }
  if (ev.type === "beam") {
    return ev.notes.length ? staffIncomingKeys(ev.notes[0]) : keys;
  }
  if (ev.type === "tuplet") {
    return staffIncomingKeys(staffFirstEvent(ev.events));
  }
  return keys;
}

/* Pitches a tie can leave: one note, every chord tone, or the last note of a beam. */
function staffOutgoingKeys(ev) {
  var keys = [];
  var i;
  if (!ev || ev.type === "rest" || ev.type === "barline") {
    return keys;
  }
  if (ev.type === "note") {
    return [staffTieKey(ev.pitch)];
  }
  if (ev.type === "stack") {
    for (i = 0; i < ev.pitches.length; i++) {
      keys.push(staffTieKey(ev.pitches[i]));
    }
    return keys;
  }
  if (ev.type === "beam") {
    return ev.notes.length ? staffOutgoingKeys(ev.notes[ev.notes.length - 1]) : keys;
  }
  if (ev.type === "tuplet") {
    return staffOutgoingKeys(staffLastEvent(ev.events));
  }
  return keys;
}

function staffTieEdgeIsStack(ev, dir) {
  var edge;
  if (!ev) {
    return false;
  }
  if (ev.type === "stack") {
    return true;
  }
  if (ev.type === "beam" && ev.notes && ev.notes.length) {
    edge = dir === "in" ? ev.notes[0] : ev.notes[ev.notes.length - 1];
    return !!(edge && edge.type === "stack");
  }
  if (ev.type === "tuplet") {
    edge = dir === "in" ? staffFirstEvent(ev.events) : staffLastEvent(ev.events);
    return staffTieEdgeIsStack(edge, dir);
  }
  return false;
}

/* Shared pitches. A chord may tie only some of its notes. A single note must match. */
function staffMatchTie(fromEv, toEv) {
  var outKeys = staffOutgoingKeys(fromEv);
  var inKeys = staffIncomingKeys(toEv);
  var shared = [];
  var i;
  var j;
  if (!outKeys.length || !inKeys.length) {
    return { error: "tie needs the same pitch", tok: "~" };
  }
  if (staffTieEdgeIsStack(fromEv, "out") || staffTieEdgeIsStack(toEv, "in")) {
    for (i = 0; i < outKeys.length; i++) {
      for (j = 0; j < inKeys.length; j++) {
        if (outKeys[i] === inKeys[j] && shared.indexOf(outKeys[i]) < 0) {
          shared.push(outKeys[i]);
        }
      }
    }
    if (!shared.length) {
      return { error: "tie needs the same pitch", tok: "~" };
    }
    return { keys: shared };
  }
  if (outKeys[0] !== inKeys[0]) {
    return { error: "tie needs the same pitch", tok: "~" };
  }
  return { keys: [outKeys[0]] };
}

/* True when only barlines remain after index (tie may hang over a final barline). */
function staffOnlyBarlinesAfter(events, from) {
  var j;
  var sawBar = false;
  for (j = from; j < events.length; j++) {
    if (events[j].type === "barline") {
      sawBar = true;
      continue;
    }
    return false;
  }
  return sawBar;
}

/* Resolve each ~ onto the following attack. A barline may sit in between.
 * A tie with only a barline after it (e.g. /e~|) hangs over that barline. */
function staffBindTies(events) {
  var i;
  var open = null;
  var openAt = -1;
  var matched;
  var hangKeys;
  for (i = 0; i < events.length; i++) {
    if (events[i].type === "tuplet") {
      matched = staffBindTies(events[i].events);
      if (matched.error) {
        return matched;
      }
    }
  }
  for (i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.type === "barline") {
      continue;
    }
    if (ev.type === "rest" || ev.type === "simile") {
      if (open) {
        return staffFailSpan("tie needs a note after it", "~", open.tieSpan);
      }
      continue;
    }
    if (open) {
      matched = staffMatchTie(open, ev);
      if (matched.error) {
        return staffFailSpan(matched.error, matched.tok || "~", open.tieSpan);
      }
      open.tieOutKeys = matched.keys;
      open = null;
      openAt = -1;
    }
    if (ev.tieToNext) {
      open = ev;
      openAt = i;
    }
  }
  if (open) {
    /*
     * No following attack: hang the tie (over a trailing barline, or as a stub
     * at the end of the line so Write notes can show the mark while editing).
     */
    if (openAt >= 0 && (staffOnlyBarlinesAfter(events, openAt + 1) || openAt === events.length - 1)) {
      hangKeys = staffOutgoingKeys(open);
      if (!hangKeys.length) {
        return staffFailSpan("tie needs a note after it", "~", open.tieSpan);
      }
      open.tieOutKeys = hangKeys;
      open.tieHang = true;
    } else {
      return staffFailSpan("tie needs a note after it", "~", open.tieSpan);
    }
  }
  return { ok: true };
}

function staffEventsHaveTie(events) {
  var i;
  var n;
  if (!events) {
    return false;
  }
  for (i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.tieToNext || (ev.tieOutKeys && ev.tieOutKeys.length)) {
      return true;
    }
    if (ev.type === "beam") {
      for (n = 0; n < ev.notes.length; n++) {
        if (ev.notes[n].tieToNext) {
          return true;
        }
      }
    }
    if (ev.type === "tuplet" && staffEventsHaveTie(ev.events)) {
      return true;
    }
  }
  return false;
}

/* Reassemble [stack] tokens that were space-split inside a beam. */
function staffTakeBeamStackParts(parts, start, partRanges) {
  var buf = parts[start];
  var i = start;
  var close;
  var after;
  var aff;
  var pitches;
  if (!buf || buf.charAt(0) !== "[") {
    return null;
  }
  if (buf.indexOf("[", 1) >= 0) {
    return staffFailSpan("nested stack brackets", buf, staffSpan(partRanges, start));
  }
  while (buf.indexOf("]") < 0 && i + 1 < parts.length) {
    i++;
    if (parts[i].indexOf("[") >= 0) {
      return staffFailSpan("nested stack brackets", parts[i], staffSpan(partRanges, i));
    }
    buf += " " + parts[i];
  }
  close = buf.indexOf("]");
  if (close < 0) {
    return staffFailSpan("unclosed stack", parts[start], staffSpan(partRanges, start, i), true);
  }
  after = buf.slice(close + 1);
  /* Soft-draw a bare ]^ while the name is still being typed. */
  if (after === "^") {
    aff = { label: "", above: "", articulations: [] };
  } else {
    aff = staffParseAffixes(after);
    if (!aff || aff.articulations.length) {
      return staffFailSpan("stack label must use _ or ^", after || buf, staffSpan(partRanges, start, i));
    }
  }
  pitches = staffParseStackInner(buf.slice(1, close));
  if (!pitches) {
    return staffFailSpan("bad stack pitches", buf.slice(1, close), staffSpan(partRanges, start, i));
  }
  if (!pitches.length) {
    return staffFailSpan("bad stack pitches", buf.slice(1, close), staffSpan(partRanges, start, i));
  }
  if (!staffIsShortDuration(pitches[0].duration || "q")) {
    return staffFailSpan("bad beam pitches (need e/s notes)", buf, staffSpan(partRanges, start, i));
  }
  return {
    next: i + 1,
    note: {
      type: "stack",
      pitches: pitches,
      label: aff.label,
      above: aff.above,
      duration: pitches[0].duration || "q"
    }
  };
}

function staffParseBeamInner(inner, clef, partRanges) {
  var parts = inner.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return null;
  }
  var notes = [];
  var hangTie = false;
  var tieSpan = null;
  var i;
  var stackTaken;
  var p;
  var prev;
  var prevKey;
  var nextKey;
  for (i = 0; i < parts.length; ) {
    if (parts[i] === "~") {
      if (!notes.length || hangTie) {
        return staffFailSpan("tie needs a note before it", "~", staffSpan(partRanges, i));
      }
      tieSpan = staffSpan(partRanges, i);
      hangTie = true;
      i++;
      continue;
    }
    if (parts[i].charAt(0) === "[") {
      stackTaken = staffTakeBeamStackParts(parts, i, partRanges);
      if (!stackTaken || stackTaken.error) {
        return stackTaken && stackTaken.error ? staffForwardError(stackTaken) : null;
      }
      if (hangTie) {
        prev = notes[notes.length - 1];
        prevKey = staffOutgoingKeys(prev)[0];
        nextKey = staffIncomingKeys(stackTaken.note)[0];
        if (!prevKey || prevKey !== nextKey) {
          return staffFailSpan("tie needs the same pitch", "~", tieSpan);
        }
        prev.tieToNext = true;
        prev.tieOutKey = nextKey;
        prev.tieSpan = tieSpan;
        hangTie = false;
      }
      notes.push(stackTaken.note);
      i = stackTaken.next;
      continue;
    }
    p = staffParsePitchToken(parts[i]) || staffParseSlashToken(parts[i], clef || "treble");
    if (!p || !staffIsShortDuration(p.duration || "q")) {
      return staffFailSpan("bad beam pitches (need e/s notes)", parts[i], staffSpan(partRanges, i));
    }
    if (hangTie) {
      prev = notes[notes.length - 1];
      prevKey = staffOutgoingKeys(prev)[0];
      nextKey = staffTieKey(p);
      if (!prevKey || prevKey !== nextKey) {
        return staffFailSpan("tie needs the same pitch", "~", tieSpan);
      }
      prev.tieToNext = true;
      prev.tieOutKey = nextKey;
      prev.tieSpan = tieSpan;
      hangTie = false;
    }
    notes.push({
      type: "note",
      pitch: p,
      label: p.label || "",
      above: p.above || "",
      duration: p.duration || "q",
      head: p.head || "",
      articulations: p.articulations || []
    });
    p.label = "";
    p.above = "";
    i++;
  }
  /* A trailing ~ leaves the group and ties into whatever follows the brace. */
  return { notes: notes, tieToNext: hangTie, tieSpan: hangTie ? tieSpan : null };
}

function staffParseStackInner(inner) {
  var parts = inner.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return [];
  }
  var pitches = [];
  for (var i = 0; i < parts.length; i++) {
    var p = staffParsePitchToken(parts[i]);
    if (!p) {
      return null;
    }
    pitches.push(p);
  }
  pitches.sort(function (a, b) {
    return a.step - b.step;
  });
  return pitches;
}

function staffParseKeyName(raw) {
  if (!raw) {
    return null;
  }
  var s = String(raw).trim();
  s = s.replace(/\u266F/g, "#").replace(/\u266D/g, "b");
  var m = /^([A-Ga-g])([#b]?)(m)?$/i.exec(s);
  if (!m) {
    return null;
  }
  var name = m[1].toUpperCase() + (m[2] || "") + (m[3] ? "m" : "");
  if (STAFF_KEY_ALIASES[name]) {
    return STAFF_KEY_ALIASES[name];
  }
  var major = m[1].toUpperCase() + (m[2] || "");
  if (!STAFF_MAJOR_KEYS[major]) {
    return null;
  }
  return major;
}

function staffKeyAlterations(keyName) {
  var map = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  var key = STAFF_MAJOR_KEYS[keyName] || STAFF_MAJOR_KEYS.C;
  var i;
  if (key.kind === "sharp") {
    for (i = 0; i < key.count; i++) {
      map[STAFF_SHARP_ORDER[i]] = 1;
    }
  } else {
    for (i = 0; i < key.count; i++) {
      map[STAFF_FLAT_ORDER[i]] = -1;
    }
  }
  return map;
}

function staffWrittenAccidental(pitch, keyAlts) {
  var keyAlt = keyAlts[pitch.letter] || 0;
  var written = pitch.accidental;
  var pitchAlt = staffPitchAlteration(written);
  var show;
  if (written === "n") {
    show = "n";
  } else if (pitchAlt === keyAlt) {
    show = "";
  } else if (pitchAlt === 0) {
    show = "n";
  } else if (pitchAlt === 2) {
    show = "##";
  } else if (pitchAlt === -2) {
    show = "bb";
  } else if (pitchAlt === 1) {
    show = "#";
  } else if (pitchAlt === -1) {
    show = "b";
  } else {
    show = "";
  }
  if (pitch.force) {
    if (written === "n" || (written === "" && pitchAlt === 0)) {
      return "n";
    }
    if (written) {
      return written;
    }
    if (show) {
      return show;
    }
    return "n";
  }
  return show;
}

/* Sign to print for a sounding alteration. 0 is a natural. */
function staffAlterationSign(alteration) {
  if (alteration === 2) {
    return "##";
  }
  if (alteration === -2) {
    return "bb";
  }
  if (alteration === 1) {
    return "#";
  }
  if (alteration === -1) {
    return "b";
  }
  return "n";
}

function staffPitchMemoryId(pitch) {
  return pitch.letter + ":" + pitch.octave;
}

/*
 * How far an accidental's ink reaches from its note, in staff spaces.
 * A flat's stem climbs; a sharp is roughly balanced.
 */
function staffAccidentalReach(acc) {
  var kind = staffAccKind(acc);
  if (kind === "b" || kind === "bb") {
    return { up: 3, down: 0.9 };
  }
  if (kind === "##") {
    return { up: 1, down: 1 };
  }
  return { up: 1.4, down: 1.4 };
}

/* True when accidental ink at accStep meets a notehead at headStep. */
function staffAccReachesStep(acc, accStep, headStep) {
  var reach = staffAccidentalReach(acc);
  var accTop = accStep + reach.up * 2;
  var accBot = accStep - reach.down * 2;
  return accTop >= headStep - 1 && accBot <= headStep + 1;
}

/*
 * Sign for this pitch given the bar so far. Does not write memory.
 * `!` still forces one. An explicit natural (Cn4) still prints.
 * A note tied in from the previous attack does not repeat the sign.
 */
function staffShowAccidental(pitch, keyAlts, mem, tiedIn) {
  var id = staffPitchMemoryId(pitch);
  var written = staffPitchAlteration(pitch.accidental);
  var current = Object.prototype.hasOwnProperty.call(mem, id)
    ? mem[id]
    : keyAlts[pitch.letter] || 0;
  if (pitch.force) {
    return staffWrittenAccidental(pitch, keyAlts);
  }
  if (tiedIn) {
    return "";
  }
  if (pitch.accidental === "n") {
    return "n";
  }
  if (written !== current) {
    return staffAlterationSign(written);
  }
  return "";
}

function staffWriteAccidentalMemory(pitch, mem) {
  mem[staffPitchMemoryId(pitch)] = staffPitchAlteration(pitch.accidental);
}

/* Walk columns left to right. Notes in one chord share the memory from before it. */
function staffApplyAccidentalMemory(columns, drawTies, keyAlts) {
  var mem = {};
  var e;
  var p;
  var col;
  function tied(colIndex, pitch) {
    var key = staffTieKey(pitch);
    var n;
    for (n = 0; n < drawTies.length; n++) {
      if (drawTies[n].to === colIndex && drawTies[n].key === key && !drawTies[n].hang) {
        return true;
      }
    }
    return false;
  }
  for (e = 0; e < columns.length; e++) {
    col = columns[e];
    if (col.type === "barline") {
      mem = {};
      continue;
    }
    if (col.type === "note" && col.pitch && col.head !== "slash" && col.head !== "beat") {
      col.pitch.displayAcc = staffShowAccidental(col.pitch, keyAlts, mem, tied(e, col.pitch));
      staffWriteAccidentalMemory(col.pitch, mem);
      continue;
    }
    if (col.type === "stack" && col.pitches) {
      for (p = 0; p < col.pitches.length; p++) {
        col.pitches[p].displayAcc = staffShowAccidental(
          col.pitches[p],
          keyAlts,
          mem,
          tied(e, col.pitches[p])
        );
      }
      for (p = 0; p < col.pitches.length; p++) {
        staffWriteAccidentalMemory(col.pitches[p], mem);
      }
    }
  }
}

/* Staccato closest to the note, then tenuto, accent, marcato. */
function staffSortArticulations(list) {
  var order = { staccato: 0, tenuto: 1, accent: 2, marcato: 3 };
  var out = (list || []).slice();
  out.sort(function (a, b) {
    return (order[a] === undefined ? 9 : order[a]) - (order[b] === undefined ? 9 : order[b]);
  });
  return out;
}

function staffStackArticulations(pitches) {
  var list = [];
  var i;
  var j;
  var marks;
  for (i = 0; i < pitches.length; i++) {
    marks = pitches[i].articulations || [];
    for (j = 0; j < marks.length; j++) {
      if (list.indexOf(marks[j]) < 0) {
        list.push(marks[j]);
      }
    }
  }
  return staffSortArticulations(list);
}

/* Canvas measure, with a character fallback when the font is not ready. */
function staffMeasureText(text, fontSize) {
  var value = String(text || "");
  var canvas;
  var ctx;
  var family;
  var width;
  if (!value) {
    return 0;
  }
  if (!staffMeasureText._canvas && typeof document !== "undefined") {
    staffMeasureText._canvas = document.createElement("canvas");
  }
  canvas = staffMeasureText._canvas;
  if (canvas && canvas.getContext) {
    ctx = canvas.getContext("2d");
    family = "sans-serif";
    try {
      family = getComputedStyle(document.documentElement).getPropertyValue("--face-font") || family;
    } catch (err) {}
    ctx.font = fontSize + "px " + family;
    width = ctx.measureText(value).width;
    if (width > 0) {
      return width;
    }
  }
  return value.length * fontSize * 0.56;
}

/*
 * Parts inside the first open/close pair, aligned with a whitespace split of that inside.
 * Returns null when the split does not match, so the caller can fall back to the whole group.
 */
function staffBracePartRanges(tokens, ranges, from, to, openCh, closeCh, parts) {
  var located = [];
  var locatedRanges = [];
  var k;
  var text;
  var span;
  var opened = false;
  var cut;
  var piece;
  if (!parts || !ranges) {
    return null;
  }
  for (k = from; k <= to && k < tokens.length; k++) {
    text = tokens[k];
    span = ranges[k] ? { start: ranges[k].start, end: ranges[k].end } : null;
    if (!opened) {
      if (!text || text.charAt(0) !== openCh) {
        continue;
      }
      opened = true;
      text = text.slice(1);
      if (span) {
        span = { start: span.start + 1, end: span.end };
      }
    }
    if (!text) {
      continue;
    }
    cut = text.indexOf(closeCh);
    if (cut >= 0) {
      piece = text.slice(0, cut);
      if (piece) {
        located.push(piece);
        if (span) {
          locatedRanges.push({ start: span.start, end: span.start + piece.length });
        }
      }
      break;
    }
    located.push(text);
    if (span) {
      locatedRanges.push(span);
    }
  }
  if (located.length !== parts.length || locatedRanges.length !== parts.length) {
    return null;
  }
  for (k = 0; k < parts.length; k++) {
    if (located[k] !== parts[k]) {
      return null;
    }
  }
  return locatedRanges;
}

/*
 * One note, slash, rest, {beam} or [stack] starting at tokens[i].
 * Returns { event, next } or { error, tok }.
 */
function staffParseEventAt(tokens, i, clef, ranges) {
  var from = i;
  var tok = tokens[i];
  var rest = staffParseRestToken(tok);
  if (rest) {
    return { event: rest, next: i + 1 };
  }
  if (tok.charAt(0) === "{") {
    if (tok.indexOf("{", 1) >= 0) {
      return staffFailSpan("nested beam braces", tok, staffSpan(ranges, from));
    }
    var beamBuf = tok;
    while (beamBuf.indexOf("}") < 0 && i + 1 < tokens.length) {
      i++;
      if (tokens[i].indexOf("{") >= 0) {
        return staffFailSpan("nested beam braces", tokens[i], staffSpan(ranges, i));
      }
      beamBuf += " " + tokens[i];
    }
    var beamClose = beamBuf.indexOf("}");
    var groupSpan = staffSpan(ranges, from, i);
    if (beamClose < 0) {
      return staffFailSpan("unclosed beam", tok, groupSpan, true);
    }
    if (beamBuf.slice(beamClose + 1)) {
      var braceInTok = tokens[i].indexOf("}");
      var junkSpan = null;
      if (ranges && ranges[i] && braceInTok >= 0 && braceInTok < tokens[i].length - 1) {
        junkSpan = { start: ranges[i].start + braceInTok + 1, end: ranges[i].end };
      }
      return staffFailSpan("junk after beam", beamBuf.slice(beamClose + 1), junkSpan || groupSpan);
    }
    var beamInner = beamBuf.slice(1, beamClose);
    /* Soft-draw an empty {} while notes are still being typed. */
    if (!String(beamInner || "").replace(/\s+/g, "")) {
      return { event: { type: "beam", notes: [] }, next: i + 1 };
    }
    var beamParts = String(beamInner || "").trim().split(/\s+/).filter(Boolean);
    var beamParsed = staffParseBeamInner(
      beamInner,
      clef,
      staffBracePartRanges(tokens, ranges, from, i, "{", "}", beamParts)
    );
    if (!beamParsed || beamParsed.error || !beamParsed.notes || beamParsed.notes.length < 1) {
      if (beamParsed && beamParsed.error) {
        return staffForwardError(beamParsed, groupSpan);
      }
      return staffFailSpan("bad beam pitches (need e/s notes)", beamInner, groupSpan);
    }
    var beamEv = { type: "beam", notes: beamParsed.notes };
    if (beamParsed.tieToNext) {
      beamEv.tieToNext = true;
      if (beamParsed.tieSpan) {
        beamEv.tieSpan = beamParsed.tieSpan;
      }
    }
    return { event: beamEv, next: i + 1 };
  }
  if (tok.charAt(0) === "[") {
    if (tok.indexOf("[", 1) >= 0) {
      return staffFailSpan("nested stack brackets", tok, staffSpan(ranges, from));
    }
    var buf = tok;
    while (buf.indexOf("]") < 0 && i + 1 < tokens.length) {
      i++;
      if (tokens[i].indexOf("[") >= 0) {
        return staffFailSpan("nested stack brackets", tokens[i], staffSpan(ranges, i));
      }
      buf += " " + tokens[i];
    }
    var close = buf.indexOf("]");
    var stackSpan = staffSpan(ranges, from, i);
    if (close < 0) {
      return staffFailSpan("unclosed stack", tok, stackSpan, true);
    }
    var after = buf.slice(close + 1);
    var stackAff;
    /* Soft-draw a bare ]^ while the name is still being typed. */
    if (after === "^") {
      stackAff = { label: "", above: "", articulations: [] };
    } else {
      stackAff = staffParseAffixes(after);
      if (!stackAff || stackAff.articulations.length) {
        return staffFailSpan("stack label must use _ or ^", after || tok, stackSpan);
      }
    }
    var inner = buf.slice(1, close);
    var pitches = staffParseStackInner(inner);
    if (!pitches) {
      return staffFailSpan("bad stack pitches", inner, stackSpan);
    }
    return {
      event: {
        type: "stack",
        pitches: pitches,
        label: stackAff.label,
        above: stackAff.above,
        duration: pitches.length ? pitches[0].duration || "q" : "q"
      },
      next: i + 1
    };
  }
  var pitch = staffParsePitchToken(tok) || staffParseSlashToken(tok, clef);
  if (!pitch) {
    return staffFailSpan("bad token", tok, staffSpan(ranges, from));
  }
  var ev = {
    type: "note",
    pitch: pitch,
    label: pitch.label || "",
    above: pitch.above || "",
    duration: pitch.duration || "q",
    head: pitch.head || "",
    articulations: pitch.articulations || []
  };
  pitch.label = "";
  pitch.above = "";
  return { event: ev, next: i + 1 };
}

/* N in the time of M when only N is written: 3:2, 5:4, 6:4, 7:4, 9:8; 2:3 and 4:3. */
function staffTupletDefaultM(n) {
  if (n === 2 || n === 4) {
    return 3;
  }
  var m = 1;
  while (m * 2 < n) {
    m *= 2;
  }
  return m;
}

/* A trailing ")" closes the tuplet unless it balances a "(" in the token (`_C7(b9)`). */
function staffTokenClosesTuplet(tok) {
  if (tok.charAt(tok.length - 1) !== ")") {
    return false;
  }
  var opens = tok.split("(").length - 1;
  var closes = tok.split(")").length - 1;
  return closes > opens;
}

/* `(3 … )` or `(5:4 … )`. Returns { event, next } or { error, tok }. */
function staffParseTupletAt(tokens, i, clef, ranges) {
  var open = /^\((\d{1,2})(?::(\d{1,2}))?$/.exec(tokens[i]);
  if (!open) {
    return staffFailSpan("bad tuplet (write (3 … ) or (5:4 … ))", tokens[i], staffSpan(ranges, i));
  }
  var n = parseInt(open[1], 10);
  var m = open[2] ? parseInt(open[2], 10) : staffTupletDefaultM(n);
  if (n < 2 || n > 16 || m < 1 || m > 16) {
    return staffFailSpan("bad tuplet ratio", tokens[i], staffSpan(ranges, i));
  }
  var inner = [];
  var innerRanges = [];
  var j;
  var closed = false;
  for (j = i + 1; j < tokens.length; j++) {
    var t = tokens[j];
    if (t.charAt(0) === "(") {
      return staffFailSpan("nested tuplet", t, staffSpan(ranges, j));
    }
    if (t === "|") {
      return staffFailSpan("barline inside tuplet", t, staffSpan(ranges, j));
    }
    if (staffTokenClosesTuplet(t)) {
      if (t.length > 1) {
        inner.push(t.slice(0, -1));
        if (ranges) {
          innerRanges.push(
            ranges[j]
              ? { start: ranges[j].start, end: ranges[j].end - 1 }
              : null
          );
        }
      }
      closed = true;
      break;
    }
    inner.push(t);
    if (ranges) {
      innerRanges.push(ranges[j] || null);
    }
  }
  if (!closed) {
    return staffFailSpan("unclosed tuplet", tokens[i], staffSpan(ranges, i, tokens.length - 1), true);
  }
  var seq = staffParseSequence(inner, clef, { allowBarline: false, allowTuplet: false }, innerRanges);
  if (seq.error) {
    return staffForwardError(seq);
  }
  var events = seq.events;
  var count = 0;
  var k;
  for (k = 0; k < events.length; k++) {
    count += events[k].type === "beam" ? events[k].notes.length : 1;
  }
  /* Soft-draw an empty (N ) while notes are still being typed. */
  if (count < 1) {
    return {
      event: { type: "tuplet", n: n, m: m, showRatio: !!open[2], events: [] },
      next: j + 1
    };
  }
  /*
   * One timed unit (note, rest, slash, stack, or single-note beam): keep the
   * `(N …)` shell in the text so Erase can peel, but draw and time it as if
   * the wrapper were not there (pad builds `(3 C4e)` then adds more).
   */
  if (count < 2) {
    return { event: events[0], next: j + 1 };
  }
  /* A ~ on the last note of the group continues into the note after the tuplet. */
  var hang = staffLastEvent(events);
  var tieOn = false;
  if (hang && hang.tieToNext) {
    hang.tieToNext = false;
    tieOn = true;
  }
  var tupletEv = { type: "tuplet", n: n, m: m, showRatio: !!open[2], events: events };
  if (tieOn) {
    tupletEv.tieToNext = true;
    if (hang.tieSpan) {
      tupletEv.tieSpan = hang.tieSpan;
    }
  }
  return { event: tupletEv, next: j + 1 };
}

/*
 * Notes, rests, beams, chords, tuplets, barlines, and ~ from tokens[0].
 * opts.allowBarline / opts.allowTuplet gate those marks (off inside a tuplet).
 */
/* Chord, dynamic, and hairpin marks hang on the next note, slash, rest, or stack. */
function staffAttachMarks(ev, marks) {
  if (marks.chord) {
    ev.chord = marks.chord;
    marks.chord = "";
  }
  if (marks.dynamic) {
    ev.dynamic = marks.dynamic;
    marks.dynamic = "";
    if (marks.hairpin && marks.hairpin.start && marks.hairpin.start !== ev) {
      marks.hairpin.end = ev;
      marks.hairpin.closedByDynamic = true;
      marks.hairpins.push(marks.hairpin);
      marks.hairpin = null;
    }
  }
  if (marks.hairpin && !marks.hairpin.start) {
    marks.hairpin.start = ev;
  }
}

function staffFinishMarks(marks, events) {
  var last;
  var i;
  var hasHost;
  hasHost = false;
  for (i = 0; i < events.length; i++) {
    if (events[i].type !== "barline") {
      hasHost = true;
      break;
    }
  }
  if (marks.dynamic) {
    if (!hasHost) {
      return staffFailSpan("dangling dynamic", marks.dynamic, marks.dynamicSpan);
    }
    /* Soft-draw: drop an unfinished dynamic after notes while editing. */
    marks.dynamic = "";
  }
  if (marks.chord) {
    /* No timed event: park as a line chord (empty staff / directives only). */
    if (!hasHost) {
      return { chordSymbol: marks.chord };
    }
    /* Soft-draw: drop a trailing ^… that never found its next host. */
    marks.chord = "";
  }
  if (marks.hairpin && !marks.hairpin.start) {
    return staffFailSpan("hairpin needs a note", marks.hairpin.kind, marks.hairpin.span);
  }
  if (marks.hairpin && marks.hairpin.start) {
    last = null;
    for (i = events.length - 1; i >= 0; i--) {
      if (events[i].type !== "barline") {
        last = events[i];
        break;
      }
    }
    if (!last) {
      return staffFailSpan("hairpin needs a note", marks.hairpin.kind, marks.hairpin.span);
    }
    marks.hairpin.end = last;
    marks.hairpin.closedByDynamic = false;
    marks.hairpins.push(marks.hairpin);
    marks.hairpin = null;
  }
  for (i = 0; i < marks.hairpins.length; i++) {
    marks.hairpins[i].start.hairpin = marks.hairpins[i].kind;
    marks.hairpins[i].end.hairpinEnd = true;
    if (marks.hairpins[i].closedByDynamic) {
      marks.hairpins[i].end.hairpinEndAtHead = true;
    }
  }
  return null;
}

function staffParseSequence(tokens, clef, opts, ranges) {
  var events = [];
  var sawMusic = false;
  var i = 0;
  var marks = { chord: "", dynamic: "", hairpin: null, hairpins: [] };
  opts = opts || {};
  while (i < tokens.length) {
    var tok = tokens[i];
    /* @treble / @bass after a bar switches the clef. Anywhere else is rejected. */
    if (tok === "@treble" || tok === "@bass") {
      var nextClef = tok === "@bass" ? "bass" : "treble";
      var barEv = events.length ? events[events.length - 1] : null;
      if (!opts.allowBarline || !barEv || barEv.type !== "barline") {
        return staffFailSpan("clef change needs a bar", tok, staffSpan(ranges, i));
      }
      if (nextClef === barEv.atClef) {
        delete barEv.clefChange;
      } else {
        barEv.clefChange = nextClef;
      }
      clef = nextClef;
      i++;
      continue;
    }
    if (tok.charAt(0) === "^") {
      if (tok.length < 2) {
        /* Soft-draw a bare ^ after music; alone it stays illegal. */
        if (!sawMusic && !events.length) {
          return staffFailSpan("empty chord symbol", tok, staffSpan(ranges, i));
        }
        i++;
        continue;
      }
      /* Replace an unused prior ^ while editing. */
      marks.chord = tok.slice(1);
      i++;
      continue;
    }
    if (staffIsDynamic(tok)) {
      marks.dynamic = tok;
      marks.dynamicSpan = staffSpan(ranges, i);
      i++;
      continue;
    }
    if (staffIsHairpin(tok)) {
      if (marks.hairpin && !marks.hairpin.start) {
        return staffFailSpan("hairpin needs a note", marks.hairpin.kind, marks.hairpin.span);
      }
      if (marks.hairpin && marks.hairpin.start) {
        var prevTimed = null;
        var hi;
        for (hi = events.length - 1; hi >= 0; hi--) {
          if (events[hi].type !== "barline") {
            prevTimed = events[hi];
            break;
          }
        }
        if (!prevTimed) {
          return staffFailSpan("hairpin needs a note", marks.hairpin.kind, marks.hairpin.span);
        }
        marks.hairpin.end = prevTimed;
        marks.hairpin.closedByDynamic = false;
        marks.hairpins.push(marks.hairpin);
      }
      marks.hairpin = { kind: tok, start: null, end: null, closedByDynamic: false, span: staffSpan(ranges, i) };
      i++;
      continue;
    }
    if (tok === "%") {
      if (!opts.allowBarline) {
        return staffFailSpan("simile inside tuplet", tok, staffSpan(ranges, i));
      }
      var simile = { type: "simile" };
      staffAttachMarks(simile, marks);
      sawMusic = true;
      events.push(simile);
      i++;
      continue;
    }
    if (tok === "~") {
      var prev = null;
      var bi;
      for (bi = events.length - 1; bi >= 0; bi--) {
        if (events[bi].type !== "barline") {
          prev = events[bi];
          break;
        }
      }
      if (!prev || prev.type === "rest") {
        return staffFailSpan("tie needs a note before it", tok, staffSpan(ranges, i));
      }
      prev.tieToNext = true;
      prev.tieSpan = staffSpan(ranges, i);
      i++;
      continue;
    }
    if (tok === "|") {
      if (!opts.allowBarline) {
        return staffFailSpan("barline inside tuplet", tok, staffSpan(ranges, i));
      }
      events.push({ type: "barline", atClef: clef });
      i++;
      continue;
    }
    var one;
    if (tok.charAt(0) === "(") {
      if (!opts.allowTuplet) {
        return staffFailSpan("nested tuplet", tok, staffSpan(ranges, i));
      }
      one = staffParseTupletAt(tokens, i, clef, ranges);
    } else {
      one = staffParseEventAt(tokens, i, clef, ranges);
    }
    if (one.error) {
      return staffForwardError(one, staffSpan(ranges, i));
    }
    staffAttachMarks(one.event, marks);
    sawMusic = true;
    events.push(one.event);
    i = one.next;
  }
  var markDone = staffFinishMarks(marks, events);
  if (markDone && markDone.error) {
    return staffForwardError(markDone);
  }
  return {
    events: events,
    sawMusic: sawMusic,
    chordSymbol: (markDone && markDone.chordSymbol) || ""
  };
}

/* Each event remembers the clef in force. A barline may carry clefChange. */
function staffStampClefs(events, clef) {
  var i;
  var n;
  var ev;
  for (i = 0; i < events.length; i++) {
    ev = events[i];
    if (!ev) {
      continue;
    }
    if (ev.type === "barline") {
      if (ev.clefChange && ev.clefChange !== clef) {
        clef = ev.clefChange;
      } else {
        ev.clefChange = "";
      }
      continue;
    }
    ev.clef = clef;
    if (ev.type === "beam" && ev.notes) {
      for (n = 0; n < ev.notes.length; n++) {
        if (ev.notes[n]) {
          ev.notes[n].clef = clef;
        }
      }
    }
    if (ev.type === "tuplet" && ev.events) {
      staffStampClefs(ev.events, clef);
    }
  }
}

/* Duration of one parsed event in quarter-note units; a tuplet is scaled by m/n. */
function staffEventQuarters(ev) {
  var q = 0;
  var k;
  if (!ev || ev.type === "barline") {
    return 0;
  }
  if (ev.type === "beam") {
    for (k = 0; k < ev.notes.length; k++) {
      q += staffDurationQuarters(ev.notes[k].duration);
    }
    return q;
  }
  if (ev.type === "tuplet") {
    for (k = 0; k < ev.events.length; k++) {
      q += staffEventQuarters(ev.events[k]);
    }
    return (q * ev.m) / ev.n;
  }
  return staffDurationQuarters(ev.duration);
}

function parseMusicNotation(source) {
  staffLastParseSpan = null;
  if (typeof source !== "string") {
    return null;
  }
  var raw = source.trim();
  if (!raw || /[<&]/.test(raw)) {
    return null;
  }
  var cacheKey = staffCacheKey(raw);
  if (staffAstCache.has(cacheKey)) {
    return staffAstCache.get(cacheKey);
  }
  var tokens = staffTokenize(raw);
  if (!tokens.length) {
    return null;
  }
  var ranges = staffTokenRanges(raw);
  var notationIsh = staffLooksNotationIsh(tokens);
  staffLastParseError = "";
  function fail(reason, tok, span, open) {
    staffLastParseError = String(reason || "");
    if (tok) {
      staffLastParseError += staffLastParseError ? " · " + tok : String(tok);
    }
    staffLastParseSpan = null;
    if (span && typeof span.start === "number" && span.end > span.start) {
      staffLastParseSpan = { start: span.start, end: span.end, open: !!open };
    }
    if (notationIsh && typeof console !== "undefined" && console.warn) {
      console.warn(
        "[staff] parse failed:",
        reason,
        tok ? "(" + tok + ")" : "",
        "—",
        raw
      );
    }
    return null;
  }

  var i = 0;
  var clef = staffActiveDefaults.clef;
  var keyName = staffActiveDefaults.keyName;
  var chordSymbol = "";

  while (i < tokens.length) {
    var dir = tokens[i];
    if (dir === "@treble" || dir === "@bass") {
      clef = dir === "@bass" ? "bass" : "treble";
      i++;
      continue;
    }
    if (dir.indexOf("@key=") === 0) {
      var parsedKey = staffParseKeyName(dir.slice(5));
      if (!parsedKey) {
        return fail("bad @key", dir, staffSpan(ranges, i));
      }
      keyName = parsedKey;
      i++;
      continue;
    }
    if (dir.charAt(0) === "@") {
      return fail("unknown directive", dir, staffSpan(ranges, i));
    }
    break;
  }

  var seq = staffParseSequence(tokens.slice(i), clef, {
    allowBarline: true,
    allowTuplet: true
  }, ranges.slice(i));
  if (seq.error) {
    return fail(
      seq.error,
      seq.tok,
      seq.end > seq.start ? { start: seq.start, end: seq.end } : null,
      seq.open
    );
  }
  var events = seq.events;
  staffStampClefs(events, clef);
  chordSymbol = seq.chordSymbol || "";
  /*
   * Timed music still requires notes/rests/simile. Directives alone, or a line
   * chord with no attack (`@bass @key=D`, `^G_Major`), draw an empty staff.
   */
  if (!seq.sawMusic) {
    if (events.length) {
      return fail("no notes or rests", null);
    }
  } else if (!events.length) {
    return fail("no notes or rests", null);
  }
  var tied = staffBindTies(events);
  if (tied.error) {
    return fail(
      tied.error,
      tied.tok,
      tied.end > tied.start ? { start: tied.start, end: tied.end } : null,
      tied.open
    );
  }

  staffClearTieSpans(events);

  var ast = {
    source: raw,
    clef: clef,
    keyName: keyName,
    keyAlts: staffKeyAlterations(keyName),
    chordSymbol: chordSymbol,
    events: events
  };
  staffAstCache.set(cacheKey, ast);
  return ast;
}

/*
 * Split an example into music + optional caption.
 * Supports plain "notes · Name" and HTML prog-changes / prog-name wrappers.
 */
function staffExampleParts(source) {
  if (typeof source !== "string") {
    return { music: "", caption: "" };
  }
  var raw = source.trim();
  if (!raw) {
    return { music: "", caption: "" };
  }
  if (/prog-changes/i.test(raw) || /prog-name/i.test(raw)) {
    if (typeof document !== "undefined") {
      var box = document.createElement("div");
      box.innerHTML = raw;
      var changes = box.querySelector(".prog-changes");
      var name = box.querySelector(".prog-name");
      if (changes) {
        return {
          music: (changes.textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, ""),
          caption: name
            ? (name.textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "")
            : ""
        };
      }
    }
    var htmlMusic = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    return { music: htmlMusic, caption: "" };
  }
  var dot = " \u00B7 ";
  var at = raw.indexOf(dot);
  if (at < 0) {
    return { music: raw, caption: "" };
  }
  return {
    music: raw.slice(0, at).replace(/^\s+|\s+$/g, ""),
    caption: raw.slice(at + dot.length).replace(/^\s+|\s+$/g, "")
  };
}

/* Live examples are HTML. An accent slash is stored as /e&gt;, which the parser rejects. */
function notationSource(source) {
  var raw = String(source || "");
  if (!raw || typeof itemToLine !== "function" || typeof document === "undefined") {
    return raw;
  }
  var line = itemToLine(raw);
  return line || raw;
}

function isMusicNotation(source) {
  var parts = staffExampleParts(notationSource(source));
  return !!parseMusicNotation(parts.music);
}

/*
 * Status for the edit preview: whether the line draws as a staff, and whether
 * a failed line still looks like notation (keep last good staff with a pending frame).
 */
function staffNotationStatus(source) {
  var parts = staffExampleParts(source);
  var music = parts.music || "";
  if (!music) {
    return { ok: false, notationIsh: false, music: "", caption: parts.caption || "", error: "", start: -1, end: -1, open: false };
  }
  if (/[<&]/.test(music)) {
    return { ok: false, notationIsh: false, music: music, caption: parts.caption || "", error: "", start: -1, end: -1, open: false };
  }
  var tokens = staffTokenize(music);
  var notationIsh = staffLooksNotationIsh(tokens);
  staffLastParseError = "";
  staffLastParseSpan = null;
  var ast = parseMusicNotation(music);
  var span = !ast && staffLastParseSpan && staffLastParseSpan.end > staffLastParseSpan.start ? staffLastParseSpan : null;
  return {
    ok: !!ast,
    notationIsh: notationIsh,
    music: music,
    caption: parts.caption || "",
    error: ast ? "" : staffLastParseError,
    start: span ? span.start : -1,
    end: span ? span.end : -1,
    open: !!(span && span.open)
  };
}

function staffBottomLineStep(clef) {
  return clef === "bass" ? STAFF_LETTER_STEPS.G + 2 * 7 : STAFF_LETTER_STEPS.E + 4 * 7;
}

function staffPitchY(step, clef, staffTop, lineGap) {
  var bottomStep = staffBottomLineStep(clef);
  var half = lineGap / 2;
  return staffTop + 4 * lineGap - (step - bottomStep) * half;
}

function staffSvgEl(name, attrs) {
  var el = document.createElementNS("http://www.w3.org/2000/svg", name);
  if (attrs) {
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        el.setAttribute(k, attrs[k]);
      }
    }
  }
  return el;
}

/*
 * Octave stem, from the notehead on the tip side.
 * Past an octave from the middle line, the stem lengthens to meet that line.
 * stemUp is in SVG coordinates (up is a smaller y).
 */
function staffStemReach(headY, midY, stemUp, standard) {
  var toward = stemUp ? headY - midY : midY - headY;
  if (toward > standard) {
    return toward;
  }
  return standard;
}

/* Below the middle line the stem goes up. On the line, and above it, it goes down. */
function staffStemUpFromY(headY, midY) {
  return headY > midY;
}

/*
 * The note farther from the middle line sets the stem. An even split goes down.
 * steps are diatonic; a larger step sits higher on the staff.
 */
function staffStackStemUpFromSteps(steps, midStep) {
  var above = 0;
  var below = 0;
  var i;
  for (i = 0; i < steps.length; i++) {
    var d = steps[i] - midStep;
    if (d > above) {
      above = d;
    }
    if (-d > below) {
      below = -d;
    }
  }
  return below > above;
}

/*
 * Tips for one beam group. The slope leans with the outer notes and
 * travels at most half a space. A nearly level group on the second ledger
 * line or beyond is flat. The line then shifts outward until every stem
 * is at least minStem. A beam that still sits clear of the staff moves in
 * until its inner edge meets the outer staff line.
 * space is one staff space. When it is omitted, minStem is treated as an octave.
 * staffTop is the top staff line; omit it to skip the staff pull.
 * stemUp is in SVG coordinates (up is a smaller y).
 */
function staffBeamTipYs(xs, ys, stemUp, minStem, staffTop, space) {
  var n = xs.length;
  var x0 = xs[0];
  var span = n ? xs[n - 1] - x0 : 0;
  var dir = stemUp ? -1 : 1;
  if (!(space > 0)) {
    space = minStem / 3.5;
  }
  var halfSpace = space * 0.5;
  var dy = n ? ys[n - 1] - ys[0] : 0;
  var travel = dy;
  var i;
  if (travel > halfSpace) {
    travel = halfSpace;
  }
  if (travel < -halfSpace) {
    travel = -halfSpace;
  }
  if (typeof staffTop === "number" && space > 0 && n) {
    var midY = staffTop + 2 * space;
    var outside = 4 * space;
    var allAbove = true;
    var allBelow = true;
    for (i = 0; i < n; i++) {
      if (!(ys[i] <= midY - outside + 0.01)) {
        allAbove = false;
      }
      if (!(ys[i] >= midY + outside - 0.01)) {
        allBelow = false;
      }
    }
    /* A third or less: level. A wider leap keeps the capped slope. */
    if ((allAbove || allBelow) && Math.abs(dy) <= space + 0.01) {
      travel = 0;
    }
  }
  var slope = span ? travel / span : 0;
  var yStart = (n ? ys[0] : 0) + dir * minStem;
  var shift = stemUp ? Infinity : -Infinity;
  for (i = 0; i < n; i++) {
    var room = ys[i] + dir * minStem - (yStart + slope * (xs[i] - x0));
    if (stemUp) {
      if (room < shift) {
        shift = room;
      }
    } else if (room > shift) {
      shift = room;
    }
  }
  if (shift === Infinity || shift === -Infinity) {
    shift = 0;
  }
  var tips = [];
  for (i = 0; i < n; i++) {
    tips.push(yStart + slope * (xs[i] - x0) + shift);
  }
  if (typeof staffTop === "number" && space > 0 && n) {
    /* Half a space thick: the inner edge lands on the outer staff line. */
    var edge = space * 0.25;
    var staffBottom = staffTop + 4 * space;
    var nearest = tips[0];
    var pull;
    if (stemUp) {
      for (i = 1; i < n; i++) {
        if (tips[i] < nearest) {
          nearest = tips[i];
        }
      }
      if (nearest > staffBottom + edge) {
        pull = nearest - (staffBottom + edge);
        for (i = 0; i < n; i++) {
          tips[i] -= pull;
        }
      }
    } else {
      for (i = 1; i < n; i++) {
        if (tips[i] > nearest) {
          nearest = tips[i];
        }
      }
      if (nearest < staffTop - edge) {
        pull = staffTop - edge - nearest;
        for (i = 0; i < n; i++) {
          tips[i] += pull;
        }
      }
    }
  }
  return tips;
}

function staffReadMeter(override) {
  var top;
  var bottom;
  if (override) {
    top = parseInt(override.top != null ? override.top : override.beats, 10);
    bottom = parseInt(override.bottom != null ? override.bottom : override.unit, 10);
  }
  if (!top || top < 1) {
    top = typeof beatsPerBar === "number" ? beatsPerBar : 4;
  }
  if (!top || top < 1) {
    top = 4;
  }
  if (bottom !== 1 && bottom !== 2 && bottom !== 4 && bottom !== 8 && bottom !== 16) {
    bottom = typeof beatUnit === "number" ? beatUnit : 4;
  }
  if (bottom !== 1 && bottom !== 2 && bottom !== 4 && bottom !== 8 && bottom !== 16) {
    bottom = 4;
  }
  return { top: top, bottom: bottom };
}

function renderMusicStaff(source, role, opts) {
  var raw = typeof source === "string" ? source.trim() : "";
  var ast;
  var showMeter = !(opts && opts.showMeter === false);
  if (!raw) {
    /* Empty line: exercise defaults (clef + key), meter from Setup (or opts.meter) — clef + time + staff only. */
    ast = {
      source: "",
      clef: staffActiveDefaults.clef,
      keyName: staffActiveDefaults.keyName,
      keyAlts: staffKeyAlterations(staffActiveDefaults.keyName),
      chordSymbol: "",
      events: []
    };
  } else {
    ast = parseMusicNotation(source);
    if (!ast) {
      return null;
    }
  }
  role = role || "current";

  var lineGap = 12;
  var noteHeadRx = staffGlyphAdvance("noteheadBlack", lineGap) / 2;
  /*
   * A second steps sideways by less than a full head, so the two ovals
   * overlap on the stem. The bite matches a single notehead (hxStem).
   */
  var secondShift = noteHeadRx * 1.7;
  var noteHeadRy = lineGap * 0.45;
  var staffLeft = 10;
  var padR = 14;
  var padTop = 36;
  var padBottom = 40;

  var meter = staffReadMeter(opts && opts.meter);
  var key = STAFF_MAJOR_KEYS[ast.keyName] || STAFF_MAJOR_KEYS.C;
  var keyPositions = ast.clef === "bass" ? STAFF_KEY_POS_BASS : STAFF_KEY_POS_TREBLE;
  var keyList = key.kind === "sharp" ? keyPositions.sharp : keyPositions.flat;

  var bottomStep = staffBottomLineStep(ast.clef);
  /* ^text sits above (chord name). _text sits under (degree, sticking). */
  var hasStackChordLabels = false;
  var hasEventChords = false;
  var hasDynamics = false;
  var hasHairpin = false;
  var hasBelowLabels = false;
  var hasAboveLabels = false;
  var e;
  var riseSteps = 0;
  var dropSteps = 0;
  function staffTouchStep(step, clefName) {
    var touchBottom = staffBottomLineStep(clefName || ast.clef);
    var touchTop = touchBottom + 8;
    var above = step - touchTop;
    var below = touchBottom - step;
    if (above > riseSteps) {
      riseSteps = above;
    }
    if (below > dropSteps) {
      dropSteps = below;
    }
  }
  var spread = [];
  for (e = 0; e < ast.events.length; e++) {
    if (ast.events[e].type === "tuplet") {
      /* ^Name before a tuplet hangs on the group, which this loop unwraps. */
      if (ast.events[e].chord) {
        hasEventChords = true;
      }
      if (ast.events[e].above) {
        hasAboveLabels = true;
      }
      if (ast.events[e].label) {
        hasBelowLabels = true;
      }
      if (ast.events[e].dynamic) {
        hasDynamics = true;
      }
      if (ast.events[e].hairpin || ast.events[e].hairpinEnd) {
        hasHairpin = true;
      }
      spread = spread.concat(ast.events[e].events);
    } else {
      spread.push(ast.events[e]);
    }
  }
  for (e = 0; e < spread.length; e++) {
    var ev = spread[e];
    if (ev.chord) {
      hasEventChords = true;
    }
    if (ev.dynamic) {
      hasDynamics = true;
    }
    if (ev.hairpin || ev.hairpinEnd) {
      hasHairpin = true;
    }
    if (ev.type === "note") {
      staffTouchStep(ev.pitch.step, ev.clef);
      if (ev.label) {
        hasBelowLabels = true;
      }
      if (ev.above) {
        hasAboveLabels = true;
      }
    } else if (ev.type === "rest") {
      if (ev.label) {
        hasBelowLabels = true;
      }
      if (ev.above) {
        hasAboveLabels = true;
      }
    } else if (ev.type === "beam") {
      for (var bn = 0; bn < ev.notes.length; bn++) {
        if (ev.notes[bn].type === "stack" && ev.notes[bn].pitches) {
          for (var bnp = 0; bnp < ev.notes[bn].pitches.length; bnp++) {
            staffTouchStep(ev.notes[bn].pitches[bnp].step, ev.clef);
            if (ev.notes[bn].pitches[bnp].label) {
              hasBelowLabels = true;
            }
            if (ev.notes[bn].pitches[bnp].above) {
              hasAboveLabels = true;
            }
          }
          if (ev.notes[bn].above) {
            hasStackChordLabels = true;
          }
          if (ev.notes[bn].label) {
            hasBelowLabels = true;
          }
        } else if (ev.notes[bn].pitch) {
          staffTouchStep(ev.notes[bn].pitch.step, ev.clef);
          if (ev.notes[bn].label) {
            hasBelowLabels = true;
          }
          if (ev.notes[bn].above) {
            hasAboveLabels = true;
          }
        }
      }
    } else if (ev.type === "stack") {
      for (var p = 0; p < ev.pitches.length; p++) {
        staffTouchStep(ev.pitches[p].step, ev.clef);
        if (ev.pitches[p].label) {
          hasBelowLabels = true;
        }
        if (ev.pitches[p].above) {
          hasAboveLabels = true;
        }
      }
      if (ev.above) {
        hasStackChordLabels = true;
      }
      if (ev.label) {
        hasBelowLabels = true;
      }
    }
  }

  var half = lineGap / 2;
  var riseAbove = riseSteps * half + noteHeadRy;
  var dropBelow = dropSteps * half + noteHeadRy;
  var chordSize = role === "reel" ? 14 : 18;
  var labelSize = role === "reel" ? 11 : 13;
  var hasChordText = !!(ast.chordSymbol || hasStackChordLabels || hasEventChords || hasAboveLabels);
  var chordBand = hasChordText ? chordSize + 14 : 0;
  var labelBand = hasBelowLabels ? labelSize + 14 : 10;
  var dynBand = hasDynamics || hasHairpin ? chordSize + 12 : 0;
  /*
   * Estimate how far up-/down-stems stick past the staff so pad can grow only
   * when beams would collide with ^names or degree labels.
   */
  var stemLenEst = lineGap * 3.5;
  var upStemExtra = 0;
  var downStemExtra = 0;
  function staffTipExtra(step, stemUp, clefName) {
    var tipBottom = staffBottomLineStep(clefName || ast.clef);
    var tipTop = tipBottom + 8;
    if (stemUp) {
      var tipAbove = stemLenEst - (tipTop - step) * half;
      if (tipAbove > upStemExtra) {
        upStemExtra = tipAbove;
      }
    } else {
      var tipBelow = stemLenEst - (step - tipBottom) * half;
      if (tipBelow > downStemExtra) {
        downStemExtra = tipBelow;
      }
    }
  }
  for (e = 0; e < spread.length; e++) {
    ev = spread[e];
    if (ev.type === "beam" && ev.notes.length) {
      var beamSum = 0;
      var beamCount = 0;
      var beamSteps;
      var bsi;
      for (bn = 0; bn < ev.notes.length; bn++) {
        if (ev.notes[bn].type === "stack" && ev.notes[bn].pitches) {
          for (bsi = 0; bsi < ev.notes[bn].pitches.length; bsi++) {
            beamSum += ev.notes[bn].pitches[bsi].step;
            beamCount++;
          }
        } else if (ev.notes[bn].pitch) {
          beamSum += ev.notes[bn].pitch.step;
          beamCount++;
        }
      }
      var beamMid = staffBottomLineStep(ev.clef || ast.clef) + 4;
      var beamUp = beamCount ? beamSum / beamCount < beamMid : true;
      for (bn = 0; bn < ev.notes.length; bn++) {
        if (ev.notes[bn].type === "stack" && ev.notes[bn].pitches) {
          beamSteps = ev.notes[bn].pitches;
          for (bsi = 0; bsi < beamSteps.length; bsi++) {
            staffTipExtra(beamSteps[bsi].step, beamUp, ev.clef);
          }
        } else if (ev.notes[bn].pitch) {
          staffTipExtra(ev.notes[bn].pitch.step, beamUp, ev.clef);
        }
      }
    } else if (ev.type === "note" && staffHasStem(ev.duration)) {
      staffTipExtra(ev.pitch.step, ev.pitch.step < staffBottomLineStep(ev.clef || ast.clef) + 4, ev.clef);
    } else if (ev.type === "stack" && ev.pitches.length && staffHasStem(ev.duration)) {
      var stSteps = [];
      for (p = 0; p < ev.pitches.length; p++) {
        stSteps.push(ev.pitches[p].step);
      }
      var stMid = staffBottomLineStep(ev.clef || ast.clef) + 4;
      var stUp = staffStackStemUpFromSteps(stSteps, stMid);
      var stOuter = stSteps[0];
      for (p = 1; p < stSteps.length; p++) {
        if (stUp) {
          if (stSteps[p] > stOuter) {
            stOuter = stSteps[p];
          }
        } else if (stSteps[p] < stOuter) {
          stOuter = stSteps[p];
        }
      }
      staffTipExtra(stOuter, stUp, ev.clef);
    }
  }
  if (upStemExtra < 0) {
    upStemExtra = 0;
  }
  if (downStemExtra < 0) {
    downStemExtra = 0;
  }
  /* Clefs overhang the staff (~1.5–2 spaces each side for treble). */
  var clefOverhang = lineGap * 2.2;
  padTop = Math.max(
    padTop,
    clefOverhang,
    riseAbove + chordBand + 8,
    upStemExtra + (hasChordText ? chordBand : 0) + 8
  );
  padBottom = Math.max(
    padBottom,
    clefOverhang,
    dropBelow + labelBand + dynBand + 8,
    (hasBelowLabels ? downStemExtra : 0) + labelBand + dynBand + 8
  );
  if (staffEventsHaveTie(ast.events)) {
    padTop += lineGap;
    padBottom += lineGap;
  }

  var staffTop = padTop;
  var staffHeight = 4 * lineGap;
  var contentH = staffTop + staffHeight + padBottom;

  /* Flatten beams into per-note columns for spacing; keep barlines for drawing. */
  var columns = [];
  var regionClef = ast.clef;
  var stackCount = 0;
  var nextBeamId = 1;
  /* Tuplet spans over columns: { n, m, showRatio, first, last }. */
  var tuplets = [];
  /*
   * Inside a tuplet (tup set) every short note is beamed only with tuplet
   * neighbors: runs of e/s share one id, or with braces only the braces beam.
   */
  var tupRunId = 0;
  /* Curves to draw once noteheads have x and y: { from, to, step }. */
  var drawTies = [];
  var openTie = null;

  function staffEdgeColumns(ev, first, last, dir) {
    var edges = [];
    var pi;
    var note;
    var idx;
    if (!ev || first > last) {
      return edges;
    }
    if (ev.type === "note") {
      return [{ index: first, step: ev.pitch.step, key: staffTieKey(ev.pitch) }];
    }
    if (ev.type === "stack") {
      for (pi = 0; pi < ev.pitches.length; pi++) {
        edges.push({
          index: first,
          step: ev.pitches[pi].step,
          key: staffTieKey(ev.pitches[pi])
        });
      }
      return edges;
    }
    if (ev.type === "beam" && ev.notes.length) {
      note = dir === "in" ? ev.notes[0] : ev.notes[ev.notes.length - 1];
      idx = dir === "in" ? first : last;
      if (note.type === "stack") {
        for (pi = 0; pi < note.pitches.length; pi++) {
          edges.push({
            index: idx,
            step: note.pitches[pi].step,
            key: staffTieKey(note.pitches[pi])
          });
        }
        return edges;
      }
      return [{ index: idx, step: note.pitch.step, key: staffTieKey(note.pitch) }];
    }
    return edges;
  }

  function staffArmOutgoing(ev, first, last, keys, hang) {
    var edges = staffEdgeColumns(ev, first, last, "out");
    var sources = [];
    var i;
    for (i = 0; i < edges.length; i++) {
      if (keys.indexOf(edges[i].key) >= 0) {
        sources.push(edges[i]);
      }
    }
    if (sources.length) {
      openTie = { sources: sources, hang: !!hang };
    }
  }

  function staffCloseHangTie(barCol) {
    var i;
    var src;
    if (!openTie || !openTie.hang) {
      return;
    }
    for (i = 0; i < openTie.sources.length; i++) {
      src = openTie.sources[i];
      drawTies.push({ from: src.index, to: barCol, step: src.step, key: src.key, hang: true });
    }
    openTie = null;
  }

  function staffRememberTies(ev, first, last) {
    var incoming;
    var i;
    var j;
    var src;
    var hit;
    if (openTie) {
      if (openTie.hang) {
        /* A note after a hanging open tie should not happen after bind. */
        openTie = null;
      } else {
        incoming = staffEdgeColumns(ev, first, last, "in");
        for (i = 0; i < openTie.sources.length; i++) {
          src = openTie.sources[i];
          hit = null;
          for (j = 0; j < incoming.length; j++) {
            if (incoming[j].key === src.key) {
              hit = incoming[j];
              break;
            }
          }
          if (hit) {
            drawTies.push({ from: src.index, to: hit.index, step: src.step, key: src.key });
          }
        }
        openTie = null;
      }
    }
    if (ev.tieOutKeys && ev.tieOutKeys.length) {
      staffArmOutgoing(ev, first, last, ev.tieOutKeys, ev.tieHang);
    }
  }

  var similePosQ = 0;
  var barQuarters = meter.top * (4 / meter.bottom);

  function staffAdvanceSimile(q) {
    similePosQ += q;
  }

  function staffMarkHeadTail(ev, first, last) {
    var head = columns[first];
    var tail = columns[last];
    var endCol;
    if (!head) {
      return;
    }
    if (ev.chord) {
      head.chord = ev.chord;
    }
    if (ev.dynamic) {
      head.dynamic = ev.dynamic;
    }
    if (ev.hairpin) {
      head.hairpin = ev.hairpin;
    }
    if (ev.articulations && ev.articulations.length && first === last) {
      head.articulations = ev.articulations;
    }
    if (ev.hairpinEnd) {
      endCol = ev.hairpin || !ev.hairpinEndAtHead ? tail : head;
      endCol.hairpinEnd = true;
    }
  }

  function pushColumnEvent(ev, tup) {
    var col = null;
    var scale = tup ? tup.scale : 1;
    if (ev.type === "barline") {
      staffCloseHangTie(columns.length);
      var clefChange = ev.clefChange && ev.clefChange !== regionClef ? ev.clefChange : "";
      columns.push({ type: "barline", clef: regionClef, clefChange: clefChange });
      if (clefChange) {
        regionClef = clefChange;
      }
      similePosQ = 0;
      return;
    }
    if (ev.type === "simile") {
      var mod = similePosQ % barQuarters;
      var remain;
      if (mod < 0.001) {
        mod = 0;
      }
      remain = barQuarters - mod;
      if (remain < 0.05) {
        remain = barQuarters;
      }
      col = {
        type: "simile",
        duration: "q",
        quarters: remain,
        slots: Math.max(staffDurationSlots("q"), remain * staffDurationSlots("q"))
      };
      staffAdvanceSimile(remain);
      tupRunId = 0;
    } else if (ev.type === "rest") {
      col = {
        type: "rest",
        duration: ev.duration || "q",
        label: ev.label || "",
        above: ev.above || "",
        articulations: ev.articulations || []
      };
      tupRunId = 0;
    } else if (ev.type === "note") {
      var bidNote = 0;
      if (tup && staffIsShortDuration(ev.duration || "q")) {
        if (tup.braced) {
          bidNote = nextBeamId++;
        } else {
          if (!tupRunId) {
            tupRunId = nextBeamId++;
          }
          bidNote = tupRunId;
        }
      } else {
        tupRunId = 0;
      }
      col = {
        type: "note",
        pitch: ev.pitch,
        label: ev.label || "",
        above: ev.above || "",
        duration: ev.duration || "q",
        head: ev.head || ev.pitch.head || "",
        beamId: bidNote,
        explicit: !!bidNote
      };
    } else if (ev.type === "stack") {
      if (!ev.pitches.length) {
        tupRunId = 0;
        return;
      }
      stackCount++;
      tupRunId = 0;
      col = {
        type: "stack",
        pitches: ev.pitches,
        label: ev.label || "",
        above: ev.above || "",
        duration: ev.duration || "q",
        articulations: staffStackArticulations(ev.pitches)
      };
    } else if (ev.type === "beam") {
      if (!ev.notes || !ev.notes.length) {
        return;
      }
      var bid = nextBeamId++;
      var bi;
      var beamFirst = columns.length;
      var prevTie = -1;
      var beamNote;
      var noteCol;
      var prevStep;
      tupRunId = 0;
      for (bi = 0; bi < ev.notes.length; bi++) {
        beamNote = ev.notes[bi];
        noteCol = columns.length;
        if (beamNote.type === "stack") {
          stackCount++;
          columns.push({
            type: "stack",
            pitches: beamNote.pitches,
            label: beamNote.label || "",
            above: beamNote.above || "",
            duration: beamNote.duration || "q",
            beamId: bid,
            explicit: true,
            scale: tup ? tup.scale : 1,
            articulations: staffStackArticulations(beamNote.pitches),
            clef: regionClef
          });
        } else {
          columns.push({
            type: "note",
            pitch: beamNote.pitch,
            label: beamNote.label || "",
            above: beamNote.above || "",
            duration: beamNote.duration || "q",
            head: beamNote.head || (beamNote.pitch && beamNote.pitch.head) || "",
            beamId: bid,
            explicit: true,
            scale: tup ? tup.scale : 1,
            articulations: beamNote.articulations || [],
            clef: regionClef
          });
        }
        if (prevTie >= 0) {
          var prevNote = ev.notes[bi - 1];
          var prevKey = "";
          prevStep = null;
          if (prevNote.type === "stack" && prevNote.pitches && prevNote.pitches.length) {
            prevStep = prevNote.pitches[0].step;
            prevKey = staffTieKey(prevNote.pitches[0]);
          } else if (prevNote.pitch) {
            prevStep = prevNote.pitch.step;
            prevKey = staffTieKey(prevNote.pitch);
          }
          if (typeof prevStep === "number") {
            drawTies.push({
              from: prevTie,
              to: noteCol,
              step: prevStep,
              key: prevKey
            });
          }
        }
        prevTie = beamNote.tieToNext ? noteCol : -1;
      }
      staffRememberTies(ev, beamFirst, columns.length - 1);
      staffMarkHeadTail(ev, beamFirst, columns.length - 1);
      staffAdvanceSimile(staffEventQuarters(ev) * scale);
      return;
    } else if (ev.type === "tuplet") {
      if (!ev.events || !ev.events.length) {
        return;
      }
      var braced = false;
      var ti;
      for (ti = 0; ti < ev.events.length; ti++) {
        if (ev.events[ti].type === "beam") {
          braced = true;
        }
      }
      var span = {
        n: ev.n,
        m: ev.m,
        showRatio: ev.showRatio,
        first: columns.length,
        last: -1
      };
      var ctx = { scale: ev.m / ev.n, braced: braced };
      tupRunId = 0;
      for (ti = 0; ti < ev.events.length; ti++) {
        pushColumnEvent(ev.events[ti], ctx);
      }
      tupRunId = 0;
      span.last = columns.length - 1;
      tuplets.push(span);
      if (span.first <= span.last) {
        staffMarkHeadTail(ev, span.first, span.last);
      }
      if (ev.tieOutKeys && ev.tieOutKeys.length) {
        var lastEv = staffLastEvent(ev.events);
        var lastCol = columns.length - 1;
        var edgeFirst = lastCol;
        if (lastEv && lastEv.type === "beam") {
          edgeFirst = lastCol - lastEv.notes.length + 1;
        }
        if (lastEv && lastEv.type !== "rest") {
          staffArmOutgoing(lastEv, edgeFirst, lastCol, ev.tieOutKeys);
        }
      }
      return;
    }
    if (col) {
      col.scale = scale;
      col.clef = regionClef;
      var at = columns.length;
      columns.push(col);
      staffMarkHeadTail(ev, at, at);
      if (ev.type !== "rest" && ev.type !== "simile") {
        staffRememberTies(ev, at, at);
      }
      if (ev.type !== "simile") {
        staffAdvanceSimile(staffDurationQuarters(ev.duration || "q") * scale);
      }
    }
  }
  for (e = 0; e < ast.events.length; e++) {
    pushColumnEvent(ast.events[e], null);
  }
  /* A finished bar gets a thin barline. A partial bar stays open. */
  if (columns.length && columns[columns.length - 1].type !== "barline" && similePosQ > 0.05) {
    var endMod = similePosQ % barQuarters;
    if (endMod < 0) {
      endMod += barQuarters;
    }
    if (endMod < 0.05 || barQuarters - endMod < 0.05) {
      columns.push({ type: "barline", closing: true });
      if (openTie && openTie.hang) {
        staffCloseHangTie(columns.length - 1);
      }
    }
  }
  /* Dangling ~ at end of line: hang stub past the last column. */
  if (openTie && openTie.hang) {
    columns.push({ type: "hangTarget" });
    staffCloseHangTie(columns.length - 1);
  }
  for (e = 0; e < columns.length; e++) {
    if (
      (columns[e].type === "note" || columns[e].type === "rest" || columns[e].type === "stack") &&
      !(columns[e].slots > 0)
    ) {
      columns[e].slots = staffDurationSlots(columns[e].duration || "q");
    }
  }
  staffApplyAccidentalMemory(columns, drawTies, ast.keyAlts);
  var noteEvents = [];
  var noteEventCols = [];
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type !== "barline" && columns[e].type !== "hangTarget") {
      noteEvents.push(columns[e]);
      noteEventCols.push(e);
    }
  }
  var slot = role === "reel" ? 28 : 34;
  if (noteEvents.length >= 6) {
    slot = role === "reel" ? 24 : 30;
  }

  var clefName = ast.clef === "bass" ? "fClef" : "gClef";
  var clefX = staffLeft + 4;
  /* SMuFL: gClef origin on G line; fClef origin on F line. */
  var clefOriginY = ast.clef === "bass" ? staffTop + lineGap : staffTop + 3 * lineGap;
  var clefAdvance = staffGlyphAdvance(clefName, lineGap);
  var clefRight = clefX + clefAdvance + lineGap * 0.5;
  var provisionalWidth = 900;

  var svg = staffSvgEl("svg", {
    viewBox: "0 0 " + provisionalWidth + " " + contentH,
    preserveAspectRatio: "xMidYMid meet",
    class: "music-staff",
    role: "img",
    "aria-label": source
  });
  svg.style.fontFamily = "var(--face-font)";
  svg.style.color = "currentColor";

  var gStaff = staffSvgEl("g", { class: "staff-lines", stroke: "currentColor", "stroke-width": "1.2" });
  var staffLines = [];
  var li;
  for (li = 0; li < 5; li++) {
    var y = staffTop + li * lineGap;
    var lineEl = staffSvgEl("line", {
      x1: String(staffLeft),
      y1: String(y),
      x2: String(provisionalWidth - padR),
      y2: String(y)
    });
    gStaff.appendChild(lineEl);
    staffLines.push(lineEl);
  }
  svg.appendChild(gStaff);

  staffPlaceGlyph(svg, clefName, clefX, clefOriginY, lineGap);

  var cursorX = clefRight + lineGap * 1.2;
  var keyStep = Math.round(lineGap * 1.35);
  var keyX = cursorX;
  if (key.count > 0) {
    cursorX = keyX + key.count * keyStep + lineGap * 0.5;
  }

  /* Bravura gClefChange / fClefChange are the smaller drawings. Same staff size as the opening clef. */
  function staffClefChangeMetrics(clefName) {
    var space = lineGap;
    var glyph = clefName === "bass" ? "fClefChange" : "gClefChange";
    var adv = staffGlyphAdvance(glyph, space);
    var positions = clefName === "bass" ? STAFF_KEY_POS_BASS : STAFF_KEY_POS_TREBLE;
    var list = key.kind === "sharp" ? positions.sharp : positions.flat;
    var sig = key.count > 0 ? lineGap * 0.45 + key.count * keyStep : 0;
    return {
      glyph: glyph,
      space: space,
      adv: adv,
      list: list,
      gapBefore: lineGap * 0.7,
      width: lineGap * 0.7 + adv + sig + lineGap * 0.45
    };
  }
  function staffDrawClefChange(x, clefName) {
    var metrics = staffClefChangeMetrics(clefName);
    var gx = x + metrics.gapBefore;
    var originY = clefName === "bass" ? staffTop + lineGap : staffTop + 3 * lineGap;
    var si;
    var sk;
    var sx;
    staffPlaceGlyph(svg, metrics.glyph, gx, originY, metrics.space, "staff-clef-change");
    if (!key.count) {
      return;
    }
    sx = gx + metrics.adv + lineGap * 0.45;
    for (si = 0; si < key.count; si++) {
      sk = staffParsePitchToken(metrics.list[si]);
      if (!sk) {
        continue;
      }
      staffDrawAccidental(
        svg,
        sx + si * keyStep,
        sk.step,
        clefName,
        staffTop,
        lineGap,
        key.kind === "flat" ? "b" : "#"
      );
    }
  }

  function staffTimeDigitNames(n) {
    return String(n)
      .split("")
      .map(function (ch) {
        return "timeSig" + ch;
      });
  }
  function staffTimeRowWidth(names, space) {
    var w = 0;
    var di;
    for (di = 0; di < names.length; di++) {
      w += staffGlyphAdvance(names[di], space);
    }
    return w;
  }
  var timeCommon = meter.top === 4 && meter.bottom === 4;
  var timeCut = meter.top === 2 && meter.bottom === 2;
  var timeTopNames = staffTimeDigitNames(meter.top);
  var timeBotNames = staffTimeDigitNames(meter.bottom);
  var timeSpaceProbe = lineGap;
  var timeW = 0;
  var timeX = cursorX;
  if (showMeter) {
    timeW = timeCommon
      ? staffGlyphAdvance("timeSigCommon", timeSpaceProbe)
      : timeCut
        ? staffGlyphAdvance("timeSigCutCommon", timeSpaceProbe)
        : Math.max(
            staffTimeRowWidth(timeTopNames, timeSpaceProbe),
            staffTimeRowWidth(timeBotNames, timeSpaceProbe)
          );
    timeX = cursorX + timeW / 2;
    /* Extra room after meter so note accidentals / chord symbols clear the signature. */
    cursorX += timeW + lineGap * 2.4;
  } else {
    cursorX += lineGap * 0.8;
  }
  var notesStartX = cursorX;

  function staffInkClef(col) {
    return (col && col.clef) || ast.clef;
  }

  /*
   * Left overhang of accidentals from the note column center (0 if none).
   * Only the excess beyond the normal slot gap is inserted — not the full width —
   * so spacing tracks the ink actually used.
   */
  function staffEventStemUpGuess(ev) {
    var midY = staffTop + 2 * lineGap;
    var guessClef = staffInkClef(ev);
    if (ev.type === "note") {
      return staffStemUpFromY(staffPitchY(ev.pitch.step, guessClef, staffTop, lineGap), midY);
    }
    if (ev.type !== "stack" || !ev.pitches.length) {
      return true;
    }
    var steps = [];
    var pi;
    for (pi = 0; pi < ev.pitches.length; pi++) {
      steps.push(ev.pitches[pi].step);
    }
    return staffStackStemUpFromSteps(steps, staffBottomLineStep(guessClef) + 4);
  }

  function staffEventAccOverhang(ev) {
    var accGap = lineGap * 0.35;
    if (ev.type === "note") {
      if (
        ev.head === "slash" ||
        ev.head === "beat" ||
        (ev.pitch && (ev.pitch.head === "slash" || ev.pitch.head === "beat"))
      ) {
        return 0;
      }
      var one =
        typeof ev.pitch.displayAcc === "string"
          ? ev.pitch.displayAcc
          : staffWrittenAccidental(ev.pitch, ast.keyAlts);
      if (!one) {
        return 0;
      }
      var oneAdv = staffGlyphAdvance(
        staffAccidentalGlyphName(staffAccKind(one)) || "accidentalSharp",
        lineGap
      );
      return noteHeadRx + accGap + oneAdv;
    }
    if (ev.type !== "stack") {
      return 0;
    }
    var cols = staffAssignAccidentalColumns(ev.pitches, ast.keyAlts);
    var offs = staffStackSecondOffsets(
      ev.pitches,
      staffEventStemUpGuess(ev),
      secondShift
    );
    var accXs = staffStackAccidentalCenters(
      ev.pitches,
      offs,
      cols,
      0,
      noteHeadRx,
      lineGap,
      accGap
    );
    var need = 0;
    var pi;
    for (pi = 0; pi < accXs.length; pi++) {
      if (accXs[pi] === null) {
        continue;
      }
      var aAdv = staffGlyphAdvance(
        staffAccidentalGlyphName(staffAccKind(cols[pi].acc)) || "accidentalSharp",
        lineGap
      );
      var leftOfCx = -(accXs[pi] - aAdv / 2);
      if (leftOfCx > need) {
        need = leftOfCx;
      }
    }
    return need;
  }

  function staffEventAccInset(ev, isFirst, afterBar) {
    var overhang = staffEventAccOverhang(ev);
    var span;
    var halfSpan;
    var freeLeft;
    var clear;
    if (!overhang) {
      return 0;
    }
    /*
     * First column can use part of the post-meter pad. A note after a barline
     * only has the left half of its own slot before the bar. Other notes use
     * the gap left by the previous note.
     */
    span = ev.slots || 1;
    halfSpan = (span * slot) / 2;
    clear = lineGap * 0.35;
    if (afterBar) {
      freeLeft = halfSpan;
      clear += 1.2;
    } else if (isFirst) {
      freeLeft = slot / 2 + lineGap * 1.2;
    } else {
      freeLeft = slot - noteHeadRx;
    }
    return Math.max(0, overhang + clear - freeLeft);
  }

  /* How far this column's ink reaches left of its center. */
  function staffLeftOfCenter(ev) {
    if (!ev || ev.type === "simile") {
      return 0;
    }
    if (ev.head === "beat") {
      return staffGlyphAdvance("noteheadSlash", lineGap) / 2;
    }
    if (ev.head === "slash") {
      if (!staffHasStem(ev.duration || "q")) {
        return staffGlyphAdvance(staffSlashHeadGlyph(ev.duration || "q"), lineGap) / 2;
      }
      return staffGlyphAdvance("noteheadSlash", lineGap) / 2;
    }
    if (ev.type === "rest") {
      return staffGlyphAdvance(staffRestGlyph(ev.duration || "q"), lineGap) / 2;
    }
    if (staffDurationBase(ev.duration || "q") === "w") {
      return staffGlyphAdvance("noteheadWhole", lineGap) / 2;
    }
    return noteHeadRx;
  }

  function staffTieMeetsAccidental(colIndex) {
    var col = columns[colIndex];
    var t;
    var p;
    if (!col) {
      return false;
    }
    for (t = 0; t < drawTies.length; t++) {
      if (drawTies[t].to !== colIndex) {
        continue;
      }
      if (col.type === "note" && col.head !== "slash" && col.pitch && col.pitch.step === drawTies[t].step) {
        return !!staffWrittenAccidental(col.pitch, ast.keyAlts);
      }
      if (col.type === "stack" && col.pitches) {
        for (p = 0; p < col.pitches.length; p++) {
          if (col.pitches[p].step === drawTies[t].step && staffWrittenAccidental(col.pitches[p], ast.keyAlts)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  var accInsets = [];
  var accInsetTotal = 0;
  for (e = 0; e < noteEvents.length; e++) {
    var prevCol = noteEventCols[e] > 0 ? columns[noteEventCols[e] - 1] : null;
    var afterBar = !!(prevCol && prevCol.type === "barline");
    var leftReach;
    var halfBeforeBar;
    var barClear;
    accInsets[e] = staffEventAccInset(noteEvents[e], e === 0, afterBar);
    /* A rhythm slash stem hangs left of the column and would meet the bar. */
    if (afterBar) {
      leftReach = staffLeftOfCenter(noteEvents[e]);
      halfBeforeBar = ((noteEvents[e].slots || 1) * slot) / 2;
      barClear = lineGap * 0.35 + 1.2;
      accInsets[e] = Math.max(accInsets[e], Math.max(0, leftReach + barClear - halfBeforeBar));
    }
    /* Room for the curve to stop before a sharp, flat, or natural. */
    if (staffTieMeetsAccidental(noteEventCols[e])) {
      accInsets[e] += lineGap * 1.15;
    }
    accInsetTotal += accInsets[e];
  }
  var slotUnits = 0;
  for (e = 0; e < noteEvents.length; e++) {
    slotUnits += noteEvents[e].slots || 1;
  }
  var notesWidth = Math.max(1, slotUnits) * slot + accInsetTotal;
  var width = notesStartX + notesWidth + padR;

  svg.setAttribute("viewBox", "0 0 " + width + " " + contentH);
  for (li = 0; li < staffLines.length; li++) {
    staffLines[li].setAttribute("x2", String(width - padR + 4));
  }

  for (li = 0; li < key.count; li++) {
    var kp = staffParsePitchToken(keyList[li]);
    if (!kp) {
      continue;
    }
    staffDrawAccidental(
      svg,
      keyX + li * keyStep,
      kp.step,
      ast.clef,
      staffTop,
      lineGap,
      key.kind === "flat" ? "b" : "#"
    );
  }

  /* SMuFL: digits 2 spaces tall per band; C / ₵ centered on the middle line. */
  if (showMeter) {
    var timeSpace = lineGap * 0.9;
    if (timeCommon || timeCut) {
      var cName = timeCut ? "timeSigCutCommon" : "timeSigCommon";
      var cAdv = staffGlyphAdvance(cName, timeSpace);
      staffPlaceGlyph(svg, cName, timeX - cAdv / 2, staffTop + 2 * lineGap, timeSpace);
    } else {
      function staffDrawTimeRow(names, bandMidY) {
        var rowW = staffTimeRowWidth(names, timeSpace);
        var x = timeX - rowW / 2;
        var di;
        for (di = 0; di < names.length; di++) {
          x += staffPlaceGlyph(svg, names[di], x, bandMidY, timeSpace);
        }
      }
      staffDrawTimeRow(timeTopNames, staffTop + lineGap);
      staffDrawTimeRow(timeBotNames, staffTop + 3 * lineGap);
    }
  }

  /*
   * Chord symbols (^…) and glued ^text share the band above the staff.
   * Glued _text sits under it.
   * Final Y is set after beam groups so text only moves when stems/beams collide.
   */
  var highestNoteY = staffTop;
  var lowestNoteY = staffTop + staffHeight;
  for (e = 0; e < columns.length; e++) {
    var extentClef = (columns[e] && columns[e].clef) || ast.clef;
    var extentPitches = null;
    var extentY;
    var extentPi;
    if (columns[e].type === "note" && columns[e].pitch) {
      extentPitches = [columns[e].pitch];
    } else if (columns[e].type === "stack" && columns[e].pitches) {
      extentPitches = columns[e].pitches;
    }
    if (!extentPitches) {
      continue;
    }
    for (extentPi = 0; extentPi < extentPitches.length; extentPi++) {
      extentY = staffPitchY(extentPitches[extentPi].step, extentClef, staffTop, lineGap);
      if (extentY < highestNoteY) {
        highestNoteY = extentY;
      }
      if (extentY > lowestNoteY) {
        lowestNoteY = extentY;
      }
    }
  }
  var chordY = Math.min(staffTop, highestNoteY - noteHeadRy) - 10;
  var labelY =
    Math.max(staffTop + staffHeight, lowestNoteY + noteHeadRy) +
    10 +
    labelSize * 0.35;

  var paintClef = ast.clef;
  function drawLedgerSpan(items) {
    var bottomLine = staffBottomLineStep(paintClef);
    var topLine = bottomLine + 8;
    var ext = lineGap * 0.4;
    var bands = {};
    var i;
    var s;
    var item;
    var left;
    var right;
    var key;
    function add(step, x0, x1) {
      key = String(step);
      if (!bands[key]) {
        bands[key] = { step: step, left: x0, right: x1 };
        return;
      }
      if (x0 < bands[key].left) {
        bands[key].left = x0;
      }
      if (x1 > bands[key].right) {
        bands[key].right = x1;
      }
    }
    for (i = 0; i < items.length; i++) {
      item = items[i];
      left = item.x - item.halfW - ext;
      right = item.x + item.halfW + ext;
      if (item.step < bottomLine) {
        for (s = bottomLine - 2; s >= item.step; s -= 2) {
          add(s, left, right);
        }
      }
      if (item.step > topLine) {
        for (s = topLine + 2; s <= item.step; s += 2) {
          add(s, left, right);
        }
      }
    }
    for (key in bands) {
      if (!Object.prototype.hasOwnProperty.call(bands, key)) {
        continue;
      }
      var band = bands[key];
      var ly = staffPitchY(band.step, paintClef, staffTop, lineGap);
      svg.appendChild(staffSvgEl("line", {
        x1: String(band.left),
        y1: String(ly),
        x2: String(band.right),
        y2: String(ly),
        stroke: "currentColor",
        "stroke-width": "1.2",
        "class": "staff-ledger"
      }));
    }
  }

  var staffMidY = staffTop + 2 * lineGap;
  var stemLen = lineGap * 3.5;
  /* A beam is already ink, so its shortest stem is a little under an octave. */
  var beamMin = lineGap * 3;
  /*
   * Slash: stem from the bottom-left tip of the glyph, down ~1.5 spaces
   * past the bottom staff line (same tip depth as a normal unbeamed stem).
   */
  var slashStemLen = stemLen;
  var slashStemFrom = lineGap;
  var hxStem = noteHeadRx * 0.85;
  var beamThick = lineGap * 0.5;
  /* SMuFL beamSpacing: white gap between beam edges. */
  var beamGap = lineGap * 0.25;

  /* Resolve explicit + auto beam groups over columns. */
  var beamGroups = [];
  var colGroup = [];
  for (e = 0; e < columns.length; e++) {
    colGroup[e] = -1;
  }
  var explicitMap = {};
  for (e = 0; e < columns.length; e++) {
    if (
      (columns[e].type === "note" || columns[e].type === "stack") &&
      columns[e].beamId
    ) {
      if (!explicitMap[columns[e].beamId]) {
        explicitMap[columns[e].beamId] = [];
      }
      explicitMap[columns[e].beamId].push(e);
    }
  }
  for (var eb in explicitMap) {
    if (Object.prototype.hasOwnProperty.call(explicitMap, eb)) {
      var gIdx = beamGroups.length;
      beamGroups.push({ indices: explicitMap[eb].slice(), explicit: true });
      for (var ebi = 0; ebi < explicitMap[eb].length; ebi++) {
        colGroup[explicitMap[eb][ebi]] = gIdx;
      }
    }
  }
  var beatQ = staffBeamGroupQuarters(meter);
  var posQ = 0;
  var run = [];
  var runBeat = -1;
  function flushAutoRun() {
    if (run.length) {
      var ag = beamGroups.length;
      beamGroups.push({ indices: run.slice(), explicit: false });
      for (var ri = 0; ri < run.length; ri++) {
        colGroup[run[ri]] = ag;
      }
    }
    run = [];
    runBeat = -1;
  }
  for (e = 0; e < columns.length; e++) {
    var col = columns[e];
    if (col.type === "barline") {
      flushAutoRun();
      posQ = 0;
      continue;
    }
    var colDur =
      typeof col.quarters === "number"
        ? col.quarters
        : staffDurationQuarters(col.duration || "q") * (col.scale || 1);
    if (col.type === "stack") {
      if (col.beamId) {
        flushAutoRun();
        posQ += colDur;
        continue;
      }
      flushAutoRun();
      posQ += colDur;
      continue;
    }
    if (col.type === "rest" || col.type === "simile") {
      flushAutoRun();
      posQ += colDur;
      continue;
    }
    if (col.type === "note" && col.beamId) {
      flushAutoRun();
      posQ += colDur;
      continue;
    }
    if (col.type === "note" && staffIsShortDuration(col.duration || "q")) {
      var beat = Math.floor(posQ / beatQ + 1e-9);
      if (run.length && beat !== runBeat) {
        flushAutoRun();
      }
      if (!run.length) {
        runBeat = beat;
      }
      run.push(e);
      posQ += colDur;
      continue;
    }
    flushAutoRun();
    posQ += colDur;
  }
  flushAutoRun();

  /* Column centers. Duration weight, then local pads for dots, flags, and names. */
  var colX = [];
  var layoutX = notesStartX;
  var layoutIndex = 0;
  function staffColumnBeamed(index) {
    var g = colGroup[index];
    return g >= 0 && beamGroups[g] && beamGroups[g].indices.length >= 2;
  }
  /*
   * Text above or under a column. Chord names start at the notehead.
   * Other words are centered on the head, including a second's offset.
   * Null when that band is empty, so a name may hang over later notes.
   */
  function staffColumnBandBox(col, x, band) {
    var left = Infinity;
    var right = -Infinity;
    var has = false;
    var pi;
    var off;
    var offs = null;
    function add(edge, width) {
      if (!(width > 0)) {
        return;
      }
      has = true;
      if (edge < left) {
        left = edge;
      }
      if (edge + width > right) {
        right = edge + width;
      }
    }
    function addCenter(text, size, shift) {
      var width;
      if (!text) {
        return;
      }
      width = staffMeasureText(text, size);
      add(x + shift - width / 2, width);
    }
    if (band === "above" && col.chord) {
      var formatted = staffTempoLabel(col.chord) || staffFormatChordText(String(col.chord).replace(/_/g, " "));
      add(x - noteHeadRx, staffMeasureText(formatted, chordSize));
    }
    if (band === "above") {
      addCenter(col.above ? staffFormatChordText(col.above) : "", chordSize, 0);
    } else if (col.label) {
      addCenter(staffFormatDegreeLabel(col.label), labelSize, 0);
    }
    if (col.type === "note" && col.pitch) {
      if (band === "above" && col.pitch.above) {
        addCenter(staffFormatChordText(col.pitch.above), chordSize, 0);
      }
      if (band === "below" && col.pitch.label) {
        addCenter(staffFormatDegreeLabel(col.pitch.label), labelSize, 0);
      }
    }
    if (col.type === "stack" && col.pitches && col.pitches.length) {
      var stemUp = staffEventStemUpGuess(col);
      var g = colGroup[columns.indexOf(col)];
      if (g >= 0 && beamGroups[g] && beamGroups[g].indices.length >= 2) {
        stemUp = staffGroupStemUp(beamGroups[g].indices);
      }
      offs = staffStackSecondOffsets(col.pitches, stemUp, secondShift);
      for (pi = 0; pi < col.pitches.length; pi++) {
        off = offs[pi] || 0;
        if (band === "above" && col.pitches[pi].above) {
          addCenter(staffFormatChordText(col.pitches[pi].above), chordSize, off);
        }
        if (band === "below" && col.pitches[pi].label) {
          addCenter(staffFormatDegreeLabel(col.pitches[pi].label), labelSize, off);
        }
      }
    }
    if (!has) {
      return null;
    }
    return { left: left, right: right };
  }
  /* Slide later columns only when two words in one band would touch. */
  function staffSeparateBand(band) {
    var shift = 0;
    var prevRight = null;
    var gap = lineGap * 0.4;
    var i;
    var box;
    var bump;
    for (i = 0; i < columns.length; i++) {
      colX[i] += shift;
      if (columns[i].type === "barline" || columns[i].type === "hangTarget") {
        continue;
      }
      box = staffColumnBandBox(columns[i], colX[i], band);
      if (!box) {
        continue;
      }
      if (prevRight !== null && box.left < prevRight + gap) {
        bump = prevRight + gap - box.left;
        colX[i] += bump;
        shift += bump;
        box.right += bump;
      }
      if (prevRight === null || box.right > prevRight) {
        prevRight = box.right;
      }
    }
    return shift;
  }
  function staffRightInk(col, index) {
    var right = noteHeadRx;
    var dots = 0;
    var pi;
    var dotW;
    var stemRel;
    var flagRight;
    if (col.type === "rest") {
      right = staffGlyphAdvance(staffRestGlyph(col.duration || "q"), lineGap) / 2;
      dots = staffDurationDotCount(col.duration || "q");
    } else if (col.head === "beat") {
      right = staffGlyphAdvance("noteheadSlash", lineGap) / 2;
    } else if (col.head === "slash") {
      var slashAdv = staffGlyphAdvance(staffSlashHeadGlyph(col.duration || "q"), lineGap);
      if (staffHasStem(col.duration || "q")) {
        right = slashAdv - staffGlyphAdvance("noteheadSlash", lineGap) / 2;
      } else {
        right = slashAdv / 2;
      }
      dots = staffDurationDotCount(col.duration || "q");
    } else if (col.type === "stack" && col.pitches) {
      var offs = staffStackSecondOffsets(col.pitches, staffEventStemUpGuess(col), secondShift);
      for (pi = 0; pi < col.pitches.length; pi++) {
        var half = staffDurationBase(col.pitches[pi].duration || col.duration) === "w"
          ? staffGlyphAdvance("noteheadWhole", lineGap) / 2
          : noteHeadRx;
        right = Math.max(right, (offs[pi] || 0) + half);
        dots = Math.max(dots, staffDurationDotCount(col.pitches[pi].duration || col.duration || "q"));
      }
    } else if (staffDurationBase(col.duration || "q") === "w") {
      right = staffGlyphAdvance("noteheadWhole", lineGap) / 2;
      dots = staffDurationDotCount(col.duration || "q");
    } else {
      dots = staffDurationDotCount(col.duration || "q");
    }
    if (dots) {
      dotW = staffGlyphAdvance("augmentationDot", lineGap);
      right = Math.max(right, right + lineGap * 0.12 + (dots - 1) * lineGap + dotW);
    }
    if (
      (col.type === "note" || col.type === "stack") &&
      col.head !== "beat" &&
      staffHasStem(col.duration || "q") &&
      staffIsShortDuration(col.duration || "q") &&
      !staffColumnBeamed(index)
    ) {
      if (col.head === "slash") {
        stemRel = -staffGlyphAdvance("noteheadSlash", lineGap) / 2;
      } else {
        stemRel = staffEventStemUpGuess(col) ? hxStem : -hxStem;
      }
      flagRight = stemRel + staffGlyphAdvance(staffFlagGlyph(col.duration || "q", stemRel >= 0), lineGap);
      if (flagRight > right) {
        right = flagRight;
      }
    }
    return right;
  }
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type === "barline" || columns[e].type === "hangTarget") {
      /* Hang stubs sit a little past the last note so the curve is visible. */
      if (columns[e].type === "hangTarget") {
        layoutX += slot * 0.55;
      }
      colX[e] = layoutX;
      if (columns[e].clefChange) {
        layoutX += staffClefChangeMetrics(columns[e].clefChange).width;
      }
      continue;
    }
    var span = columns[e].slots || 1;
    var halfSpan = (span * slot) / 2;
    var clearPad = lineGap * 0.25;
    var rightPad = Math.max(0, staffRightInk(columns[e], e) + clearPad - halfSpan);
    layoutX += accInsets[layoutIndex] || 0;
    colX[e] = layoutX + halfSpan;
    layoutX += span * slot + rightPad;
    layoutIndex++;
  }

  /*
   * Place ^names / degree labels snug to the staff, then push only past real
   * stem/beam ink (up-beams raise the name; down-beams lower the degrees).
   */
  var inkTop = Math.min(staffTop, highestNoteY - noteHeadRy);
  var inkBot = Math.max(staffTop + staffHeight, lowestNoteY + noteHeadRy);
  var predNy = [];
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type === "note") {
      predNy[e] = staffPitchY(columns[e].pitch.step, staffInkClef(columns[e]), staffTop, lineGap);
    } else if (columns[e].type === "stack" && columns[e].pitches.length) {
      var ps = 0;
      for (p = 0; p < columns[e].pitches.length; p++) {
        ps += columns[e].pitches[p].step;
      }
      predNy[e] = staffPitchY(
        ps / columns[e].pitches.length,
        staffInkClef(columns[e]),
        staffTop,
        lineGap
      );
    }
  }
  /* A name hangs over later notes. Open a gap only when the next word in that band would touch it. */
  var textShift = staffSeparateBand("above") + staffSeparateBand("below");
  width = layoutX + textShift + padR;
  svg.setAttribute("viewBox", "0 0 " + width + " " + contentH);
  for (li = 0; li < staffLines.length; li++) {
    staffLines[li].setAttribute("x2", String(width - padR + 4));
  }
  /* Stem tip y and direction per stemmed column, as drawn below. */
  var predTip = [];
  var predUp = [];
  var predBeamed = [];
  /* Same y the drawn stem uses: a chord counts as the midpoint of its outer notes. */
  function staffColumnBeamY(colIndex) {
    var col = columns[colIndex];
    var hi = Infinity;
    var lo = -Infinity;
    var pi;
    var y;
    if (col && col.type === "stack" && col.pitches && col.pitches.length) {
      for (pi = 0; pi < col.pitches.length; pi++) {
        y = staffPitchY(col.pitches[pi].step, staffInkClef(col), staffTop, lineGap);
        if (y < hi) {
          hi = y;
        }
        if (y > lo) {
          lo = y;
        }
      }
      return (hi + lo) / 2;
    }
    if (typeof predNy[colIndex] === "number") {
      return predNy[colIndex];
    }
    return staffMidY;
  }
  function staffGroupStemUp(indices) {
    var sum = 0;
    var slash = false;
    var i;
    var col;
    if (!indices || !indices.length) {
      return true;
    }
    for (i = 0; i < indices.length; i++) {
      col = columns[indices[i]];
      sum += staffColumnBeamY(indices[i]);
      if (col && col.head === "slash") {
        slash = true;
      }
    }
    return slash ? false : sum / indices.length > staffMidY;
  }
  /*
   * A second's stem stands in the overlap, so both heads meet it.
   * Null means the usual left or right edge of a single column.
   */
  var colJoinX = [];
  for (e = 0; e < columns.length; e++) {
    colJoinX[e] = null;
    var joinCol = columns[e];
    var joinUp;
    var joinG;
    var joinOffs;
    var joinMin;
    var joinMax;
    var joinPi;
    if (!joinCol || joinCol.type !== "stack" || !joinCol.pitches || !joinCol.pitches.length) {
      continue;
    }
    joinUp = staffEventStemUpGuess(joinCol);
    joinG = colGroup[e];
    if (joinG >= 0 && beamGroups[joinG] && beamGroups[joinG].indices.length >= 2) {
      joinUp = staffGroupStemUp(beamGroups[joinG].indices);
    }
    joinOffs = staffStackSecondOffsets(joinCol.pitches, joinUp, secondShift);
    joinMin = 0;
    joinMax = 0;
    for (joinPi = 0; joinPi < joinOffs.length; joinPi++) {
      if (joinOffs[joinPi] < joinMin) {
        joinMin = joinOffs[joinPi];
      }
      if (joinOffs[joinPi] > joinMax) {
        joinMax = joinOffs[joinPi];
      }
    }
    if (joinMax - joinMin > 0.5) {
      colJoinX[e] = colX[e] + (joinMin + joinMax) / 2;
    }
  }
  function staffInkAnchorY(colIndex, stemUp) {
    var col = columns[colIndex];
    var best;
    var pi;
    var y;
    if (col && col.type === "stack" && col.pitches && col.pitches.length) {
      best = stemUp ? Infinity : -Infinity;
      for (pi = 0; pi < col.pitches.length; pi++) {
        y = staffPitchY(col.pitches[pi].step, staffInkClef(col), staffTop, lineGap);
        if (stemUp) {
          if (y < best) {
            best = y;
          }
        } else if (y > best) {
          best = y;
        }
      }
      return best;
    }
    return predNy[colIndex];
  }
  var inkGi;
  var inkGIdx;
  for (inkGIdx = 0; inkGIdx < beamGroups.length; inkGIdx++) {
    var inkGrp = beamGroups[inkGIdx];
    if (inkGrp.indices.length < 2) {
      continue;
    }
    var inkUp = staffGroupStemUp(inkGrp.indices);
    var inkStemLen = beamMin;
    var inkXs = [];
    var inkYs = [];
    for (inkGi = 0; inkGi < inkGrp.indices.length; inkGi++) {
      var inkCol = inkGrp.indices[inkGi];
      inkXs.push(staffNoteStemX(inkCol, inkUp));
      inkYs.push(staffInkAnchorY(inkCol, inkUp));
    }
    var inkTips = staffBeamTipYs(inkXs, inkYs, inkUp, inkStemLen, staffTop, lineGap);
    var outerClear = beamThick / 2;
    for (inkGi = 0; inkGi < inkTips.length; inkGi++) {
      var inkTip = inkTips[inkGi];
      predTip[inkGrp.indices[inkGi]] = inkTip;
      predUp[inkGrp.indices[inkGi]] = inkUp;
      predBeamed[inkGrp.indices[inkGi]] = true;
      if (inkUp) {
        if (inkTip - outerClear < inkTop) {
          inkTop = inkTip - outerClear;
        }
      } else if (inkTip + outerClear > inkBot) {
        inkBot = inkTip + outerClear;
      }
    }
  }
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type !== "note" || !staffHasStem(columns[e].duration)) {
      continue;
    }
    var inkG = colGroup[e];
    var inkBeamed =
      inkG >= 0 && beamGroups[inkG] && beamGroups[inkG].indices.length >= 2;
    if (inkBeamed) {
      continue;
    }
    var inkNy = predNy[e];
    var inkStemUp = columns[e].head === "slash" ? false : staffStemUpFromY(inkNy, staffMidY);
    var soloStandard = columns[e].head === "slash"
      ? slashStemLen
      : lineGap * (3.5 + staffFlagExtraSpaces(columns[e].duration));
    var soloLen = staffStemReach(inkNy, staffMidY, inkStemUp, soloStandard);
    var soloTip = inkStemUp ? inkNy - soloLen : inkNy + soloLen;
    predTip[e] = soloTip;
    predUp[e] = inkStemUp;
    if (inkStemUp) {
      if (soloTip < inkTop) {
        inkTop = soloTip;
      }
    } else if (soloTip > inkBot) {
      inkBot = soloTip;
    }
  }
  for (e = 0; e < columns.length; e++) {
    var inkStack = columns[e];
    if (
      inkStack.type !== "stack" ||
      !inkStack.pitches.length ||
      !staffHasStem(inkStack.duration)
    ) {
      continue;
    }
    var stackYs = [];
    for (p = 0; p < inkStack.pitches.length; p++) {
      stackYs.push(staffPitchY(inkStack.pitches[p].step, staffInkClef(inkStack), staffTop, lineGap));
    }
    var stackBeamedInk =
      colGroup[e] >= 0 && beamGroups[colGroup[e]] && beamGroups[colGroup[e]].indices.length >= 2;
    if (stackBeamedInk) {
      continue;
    }
    var stackUp = staffEventStemUpGuess(inkStack);
    var stackOuterY = stackUp ? Math.min.apply(null, stackYs) : Math.max.apply(null, stackYs);
    var stackStandard = lineGap * (3.5 + staffFlagExtraSpaces(inkStack.duration));
    var stackReach = staffStemReach(stackOuterY, staffMidY, stackUp, stackStandard);
    var stackTip = stackUp ? stackOuterY - stackReach : stackOuterY + stackReach;
    predTip[e] = stackTip;
    predUp[e] = stackUp;
    if (stackUp) {
      if (stackTip < inkTop) {
        inkTop = stackTip;
      }
    } else if (stackTip > inkBot) {
      inkBot = stackTip;
    }
  }

  /*
   * Tuplets. A group that is exactly one unbroken beam gets the number only, on
   * the beam side. Anything else (unbeamed values, rests, split beams, stacks)
   * gets a bracket: below when every stem points down, otherwise above.
   */
  var tupletSpace = lineGap * 0.9;
  var tupletDigitH = 1.5 * tupletSpace;
  var tupletClear = lineGap * 0.75;
  var tupletPad = lineGap * 0.35;
  var tupletHook = lineGap * 0.6;
  var tupletLayouts = [];
  function staffTupletGlyphNames(t) {
    var s = String(t.n) + (t.showRatio ? ":" + t.m : "");
    return s.split("").map(function (ch) {
      return ch === ":" ? "tupletColon" : "tuplet" + ch;
    });
  }
  /* Ink reach of a column from its center, to the left or to the right. */
  function staffColumnHalfInk(c, toRight) {
    var col = columns[c];
    if (col.type === "rest") {
      return staffGlyphAdvance(staffRestGlyph(col.duration), lineGap) / 2;
    }
    if (col.head === "slash" || col.head === "beat") {
      var slashAdv = staffGlyphAdvance(
        col.head === "beat" ? "noteheadSlash" : staffSlashHeadGlyph(col.duration),
        lineGap
      );
      if (col.head === "beat" || !staffHasStem(col.duration)) {
        return slashAdv / 2;
      }
      var quarterRx = staffGlyphAdvance("noteheadSlash", lineGap) / 2;
      return toRight ? slashAdv - quarterRx : quarterRx;
    }
    if (staffDurationBase(col.duration) === "w") {
      return staffGlyphAdvance("noteheadWhole", lineGap) / 2;
    }
    return noteHeadRx;
  }
  /* Outermost ink of one column on the tuplet side (smaller y is up). */
  function staffColumnOuterY(c, above) {
    var col = columns[c];
    if (col.type === "rest") {
      return above ? staffMidY - 1.5 * lineGap : staffMidY + 1.5 * lineGap;
    }
    var pitches = col.type === "stack" ? col.pitches : [col.pitch];
    var hi = Infinity;
    var lo = -Infinity;
    var hasAcc = false;
    var pi;
    for (pi = 0; pi < pitches.length; pi++) {
      var py = staffPitchY(pitches[pi].step, staffInkClef(col), staffTop, lineGap);
      hi = Math.min(hi, py);
      lo = Math.max(lo, py);
      if (col.head !== "slash" && pitches[pi]) {
        var shown =
          typeof pitches[pi].displayAcc === "string"
            ? pitches[pi].displayAcc
            : staffWrittenAccidental(pitches[pi], ast.keyAlts);
        if (shown) {
          hasAcc = true;
        }
      }
    }
    var reachUp = col.head === "slash" ? lineGap : hasAcc ? lineGap * 1.8 : noteHeadRy;
    var reachDown = col.head === "slash" ? lineGap : hasAcc ? lineGap * 1.4 : noteHeadRy;
    var out = above ? hi - reachUp : lo + reachDown;
    if (typeof predTip[c] === "number" && predUp[c] === above) {
      var tipInk = predTip[c];
      if (predBeamed[c]) {
        tipInk += above ? -beamThick / 2 : beamThick / 2;
      }
      out = above ? Math.min(out, tipInk) : Math.max(out, tipInk);
    }
    if (col.articulations && col.articulations.length && col.head !== "slash" && col.head !== "beat") {
      var artsAbove = typeof predUp[c] === "boolean" ? !predUp[c] : !staffEventStemUpGuess(col);
      if (artsAbove === above) {
        var artReach = col.articulations.length * lineGap;
        out = above ? out - artReach : out + artReach;
      }
    }
    return out;
  }
  var tl;
  for (tl = 0; tl < tuplets.length; tl++) {
    var tup = tuplets[tl];
    var tIdx = [];
    for (e = tup.first; e <= tup.last; e++) {
      if (columns[e].type !== "barline") {
        tIdx.push(e);
      }
    }
    if (!tIdx.length) {
      continue;
    }
    var tFirst = tIdx[0];
    var tLast = tIdx[tIdx.length - 1];
    var tG = colGroup[tFirst];
    var numberOnly =
      tG >= 0 &&
      beamGroups[tG] &&
      beamGroups[tG].indices.length >= 2 &&
      beamGroups[tG].indices.length === tIdx.length;
    for (e = 0; numberOnly && e < tIdx.length; e++) {
      if (columns[tIdx[e]].type !== "note" || colGroup[tIdx[e]] !== tG) {
        numberOnly = false;
      }
    }
    var tAbove;
    if (numberOnly) {
      tAbove = !!predUp[tFirst];
    } else {
      var stemmed = 0;
      var anyUp = false;
      for (e = 0; e < tIdx.length; e++) {
        if (typeof predTip[tIdx[e]] === "number") {
          stemmed++;
          if (predUp[tIdx[e]]) {
            anyUp = true;
          }
        }
      }
      tAbove = !(stemmed > 0 && !anyUp);
    }
    var tNames = staffTupletGlyphNames(tup);
    var tNumW = 0;
    for (e = 0; e < tNames.length; e++) {
      tNumW += staffGlyphAdvance(tNames[e], tupletSpace);
    }
    var staffEdge = tAbove
      ? staffTop - tupletClear
      : staffTop + staffHeight + tupletClear;
    var tLayout = {
      above: tAbove,
      bracket: !numberOnly,
      names: tNames,
      numW: tNumW
    };
    if (numberOnly) {
      var xa = staffNoteStemX(tFirst, tAbove);
      var xb = staffNoteStemX(tLast, tAbove);
      var tMid = (xa + xb) / 2;
      var beamMidY =
        predTip[tFirst] + (predTip[tLast] - predTip[tFirst]) * ((tMid - xa) / (xb - xa || 1));
      var numGap = lineGap * 0.5;
      var cy = tAbove
        ? beamMidY - beamThick / 2 - numGap - tupletDigitH / 2
        : beamMidY + beamThick / 2 + numGap + tupletDigitH / 2;
      if (tAbove) {
        cy = Math.min(cy, staffTop - numGap - tupletDigitH / 2);
      } else {
        cy = Math.max(cy, staffTop + staffHeight + numGap + tupletDigitH / 2);
      }
      tLayout.cx = tMid;
      tLayout.cy = cy;
    } else {
      var tXs = [];
      var tTargets = [];
      var tDir = tAbove ? -1 : 1;
      for (e = 0; e < tIdx.length; e++) {
        tXs.push(colX[tIdx[e]]);
        tTargets.push(staffColumnOuterY(tIdx[e], tAbove) + tDir * tupletClear);
      }
      var tSpan = tXs[tXs.length - 1] - tXs[0];
      var restEnd = columns[tFirst].type === "rest" || columns[tLast].type === "rest";
      var tSlope =
        tSpan && !restEnd ? (tTargets[tTargets.length - 1] - tTargets[0]) / tSpan : 0;
      var tMaxSlope = tSpan ? lineGap / tSpan : 0;
      if (tSlope > tMaxSlope) {
        tSlope = tMaxSlope;
      } else if (tSlope < -tMaxSlope) {
        tSlope = -tMaxSlope;
      }
      var tB = tAbove ? Infinity : -Infinity;
      for (e = 0; e < tXs.length; e++) {
        var need = tTargets[e] - tSlope * (tXs[e] - tXs[0]);
        tB = tAbove ? Math.min(tB, need) : Math.max(tB, need);
      }
      var bx0 = colX[tFirst] - staffColumnHalfInk(tFirst, false);
      var bx1 = colX[tLast] + staffColumnHalfInk(tLast, true);
      var minW = tNumW + 2 * tupletPad + 2 * tupletHook;
      if (bx1 - bx0 < minW) {
        var grow = (minW - (bx1 - bx0)) / 2;
        bx0 -= grow;
        bx1 += grow;
      }
      var by0 = tB + tSlope * (bx0 - tXs[0]);
      var by1 = tB + tSlope * (bx1 - tXs[0]);
      var shiftOut = tAbove
        ? Math.max(by0, by1) - staffEdge
        : staffEdge - Math.min(by0, by1);
      if (shiftOut > 0) {
        by0 += tDir * shiftOut;
        by1 += tDir * shiftOut;
      }
      tLayout.x0 = bx0;
      tLayout.y0 = by0;
      tLayout.x1 = bx1;
      tLayout.y1 = by1;
      tLayout.cx = (bx0 + bx1) / 2;
      tLayout.cy = (by0 + by1) / 2;
    }
    var tInkTop = tLayout.cy - tupletDigitH / 2;
    var tInkBot = tLayout.cy + tupletDigitH / 2;
    if (tLayout.bracket) {
      tInkTop = Math.min(tInkTop, tLayout.y0, tLayout.y1);
      tInkBot = Math.max(tInkBot, tLayout.y0, tLayout.y1);
    }
    if (tInkTop < inkTop) {
      inkTop = tInkTop;
    }
    if (tInkBot > inkBot) {
      inkBot = tInkBot;
    }
    tupletLayouts.push(tLayout);
  }
  if (hasChordText) {
    chordY = inkTop - 8;
  }
  if (hasBelowLabels) {
    labelY = inkBot + 10 + labelSize * 0.35;
  }
  if (ast.chordSymbol) {
    var sym = staffSvgEl("text", {
      x: String(notesStartX + 4),
      y: String(chordY),
      "font-size": String(chordSize),
      fill: "currentColor",
      "text-anchor": "start"
    });
    sym.textContent = staffTempoLabel(ast.chordSymbol) || staffFormatChordText(String(ast.chordSymbol).replace(/_/g, " "));
    if (staffTempoLabel(ast.chordSymbol)) {
      sym.setAttribute("class", "staff-tempo");
    }
    svg.appendChild(sym);
  }

  /* Stem x at the notehead. Same point the beam line is fitted through. */
  function staffStemX(x, up, slash) {
    if (slash) {
      var slashRx = staffGlyphAdvance("noteheadSlash", lineGap) / 2;
      /* Flush with the left tip; nudge by half the stem stroke. */
      return x - slashRx + 1;
    }
    return up ? x + hxStem : x - hxStem;
  }

  function staffNoteStemX(index, up) {
    var col = columns[index];
    if (typeof colJoinX[index] === "number") {
      return colJoinX[index];
    }
    return staffStemX(colX[index], up, !!(col && col.head === "slash"));
  }

  /* Slash stems attach at the glyph’s bottom-left tip. */
  function drawStemTo(x, ny, tipY, up, slash, fixedX) {
    var sx = typeof fixedX === "number" ? fixedX : staffStemX(x, up, slash);
    var y0 = ny;
    if (slash) {
      y0 = up ? ny - slashStemFrom : ny + slashStemFrom;
    }
    svg.appendChild(
      staffSvgEl("line", {
        x1: String(sx),
        y1: String(y0),
        x2: String(sx),
        y2: String(tipY),
        stroke: "currentColor",
        "stroke-width": slash ? "2" : "1.4"
      })
    );
    return { x: sx, y: tipY, up: up };
  }

  function drawAugmentationDotAt(x, y) {
    staffPlaceGlyph(svg, "augmentationDot", x, y, lineGap);
  }

  function staffNoteDotY(ny, step) {
    var onLine = (step - bottomStep) % 2 === 0;
    return onLine ? ny - lineGap / 2 : ny;
  }

  /* Push dots right until they clear neighboring heads and each other. */
  function staffPlaceDots(entries) {
    var placed = [];
    var dotW = staffGlyphAdvance("augmentationDot", lineGap);
    var gap = lineGap * 0.12;
    var i;
    var j;
    var d;
    var guard;
    var hit;
    var x;
    var y;
    var dx;
    for (i = 0; i < entries.length; i++) {
      if (!entries[i].dots) {
        continue;
      }
      y = staffNoteDotY(entries[i].ny, entries[i].step);
      x = entries[i].right + gap;
      guard = 0;
      while (guard++ < 8) {
        hit = false;
        for (j = 0; j < entries.length; j++) {
          if (j === i) {
            continue;
          }
          if (Math.abs(entries[j].ny - y) > noteHeadRy + lineGap * 0.25) {
            continue;
          }
          if (x < entries[j].right + gap && x + dotW > entries[j].left) {
            x = entries[j].right + gap;
            hit = true;
          }
        }
        for (j = 0; j < placed.length; j++) {
          if (Math.abs(placed[j].y - y) > lineGap * 0.45) {
            continue;
          }
          if (x < placed[j].right + lineGap * 0.15) {
            x = placed[j].right + lineGap * 0.2;
            hit = true;
          }
        }
        if (!hit) {
          break;
        }
      }
      dx = x;
      for (d = 0; d < entries[i].dots; d++) {
        drawAugmentationDotAt(dx, y);
        if (d + 1 < entries[i].dots) {
          dx += lineGap;
        }
      }
      entries[i].dotRight = dx + dotW;
      placed.push({ y: y, right: entries[i].dotRight });
    }
  }

  function drawNotehead(x, step, dur, displayAcc, accCol, headStyle) {
    var slash = headStyle === "slash" || headStyle === "beat";
    var ny = staffPitchY(step, paintClef, staffTop, lineGap);
    var accLeft = null;
    if (displayAcc && !slash) {
      var accName = staffAccidentalGlyphName(staffAccKind(displayAcc));
      var accAdv = staffGlyphAdvance(accName || "accidentalSharp", lineGap);
      var accGap = lineGap * 0.35;
      var colPitch = accAdv + lineGap * 0.2;
      var accCenter = x - noteHeadRx - accGap - accAdv / 2 - (accCol || 0) * colPitch;
      staffDrawAccidental(
        svg,
        accCenter,
        step,
        paintClef,
        staffTop,
        lineGap,
        displayAcc
      );
      accLeft = accCenter - accAdv / 2;
    }
    var headName = headStyle === "beat"
      ? "noteheadSlash"
      : slash
        ? staffSlashHeadGlyph(dur || "q")
        : staffDurationGlyph(dur || "q");
    var headAdv = staffGlyphAdvance(headName, lineGap);
    var headRx = headAdv / 2;
    /*
     * Stemmed rhythm slashes share the quarter slash's bottom-left tip.
     * A whole slash has no stem, so it sits on the column center.
     */
    var headLeft = headStyle === "slash" && staffHasStem(dur || "q")
      ? x - staffGlyphAdvance("noteheadSlash", lineGap) / 2
      : x - headRx;
    staffPlaceGlyph(svg, headName, headLeft, ny, lineGap);
    return {
      ny: ny,
      headRx: headRx,
      halfW: slash ? headRx : headRx,
      left: headLeft,
      right: headLeft + headAdv,
      accLeft: accLeft,
      dotRight: null,
      step: step,
      glyph: svg._staffLastGlyph || null
    };
  }

  function drawBeamSegment(x1, y1, x2, y2) {
    svg.appendChild(
      staffSvgEl("line", {
        x1: String(x1),
        y1: String(y1),
        x2: String(x2),
        y2: String(y2),
        stroke: "currentColor",
        "stroke-width": String(beamThick),
        "stroke-linecap": "butt"
      })
    );
  }

  /* Per-column stem stubs filled while drawing. colX is already set. */
  var colNy = [];
  var colStackExtent = [];
  var colStem = [];
  /* Notehead edges per column, keyed by staff step, so a tie can find its pitch. */
  var headInk = [];
  /* Pitched heads a mouse or pen can drag. Slashes and rests are not heads. */
  var pitchHeads = [];

  function staffRememberPitchHead(colIndex, drawn, pitch) {
    var rx;
    if (!drawn || !pitch || pitch.head === "slash" || pitch.head === "beat") {
      return;
    }
    rx = drawn.headRx > 0 ? drawn.headRx : noteHeadRx;
    pitchHeads.push({
      col: colIndex,
      step: pitch.step,
      x: (drawn.left + drawn.right) / 2,
      y: drawn.ny,
      rx: rx,
      ry: noteHeadRy,
      key: staffTieKey(pitch)
    });
    if (drawn.glyph && drawn.glyph.setAttribute) {
      drawn.glyph.setAttribute("data-pitch-col", String(colIndex));
      drawn.glyph.setAttribute("data-pitch-step", String(pitch.step));
    }
  }

  function staffStoreHead(colIndex, step, drawn, dur, slash, key) {
    var box;
    if (!drawn) {
      return null;
    }
    if (!headInk[colIndex]) {
      headInk[colIndex] = {};
    }
    if (!headInk[colIndex][step]) {
      headInk[colIndex][step] = [];
    }
    box = {
      left: drawn.left,
      right: drawn.right,
      y: drawn.ny,
      dotted: staffDurationDotted(dur),
      slash: !!slash,
      accLeft: typeof drawn.accLeft === "number" ? drawn.accLeft : null,
      dotRight: typeof drawn.dotRight === "number" ? drawn.dotRight : null,
      onLine: (step - bottomStep) % 2 === 0,
      key: key || ""
    };
    headInk[colIndex][step].push(box);
    return box;
  }

  function staffHeadBox(colIndex, step, key) {
    var list = headInk[colIndex] && headInk[colIndex][step];
    var i;
    if (!list || !list.length) {
      return null;
    }
    if (key) {
      for (i = 0; i < list.length; i++) {
        if (list[i].key === key) {
          return list[i];
        }
      }
    }
    return list[0];
  }

  var placedAbove = [];
  var placedBelow = [];
  function staffAvoidText(list, x, y, width, anchor, dy) {
    var left = anchor === "start" ? x : x - width / 2;
    var right = left + width;
    var guard = 0;
    var i;
    var hit;
    while (guard++ < 6) {
      hit = false;
      for (i = 0; i < list.length; i++) {
        if (
          Math.abs(list[i].y - y) < Math.abs(dy) * 0.85 &&
          left < list[i].right + 3 &&
          right > list[i].left - 3
        ) {
          y += dy;
          hit = true;
          break;
        }
      }
      if (!hit) {
        break;
      }
    }
    list.push({ y: y, left: left, right: right });
    return y;
  }

  function staffDrawBelowText(x, text) {
    var label = staffFormatDegreeLabel(text);
    var width = staffMeasureText(label, labelSize);
    var y = staffAvoidText(placedBelow, x, labelY, width, "middle", labelSize + 2);
    var node = staffSvgEl("text", {
      x: String(x),
      y: String(y),
      "font-size": String(labelSize),
      fill: "currentColor",
      "text-anchor": "middle"
    });
    node.textContent = label;
    svg.appendChild(node);
  }

  function staffDrawAboveText(x, text) {
    var label = staffFormatChordText(text);
    var width = staffMeasureText(label, chordSize);
    var y = staffAvoidText(placedAbove, x, chordY, width, "middle", -(chordSize + 2));
    var node = staffSvgEl("text", {
      x: String(x),
      y: String(y),
      "font-size": String(chordSize),
      fill: "currentColor",
      "text-anchor": "middle"
    });
    node.textContent = label;
    svg.appendChild(node);
  }

  for (e = 0; e < columns.length; e++) {
    ev = columns[e];
    paintClef = staffInkClef(ev);
    if (ev.type === "hangTarget") {
      continue;
    }
    if (ev.type === "barline") {
      var bx = colX[e];
      svg.appendChild(staffSvgEl("line", {
        x1: String(bx),
        y1: String(staffTop),
        x2: String(bx),
        y2: String(staffTop + staffHeight),
        stroke: "currentColor",
        "stroke-width": "1.6",
        "class": "staff-bar"
      }));
      if (ev.clefChange) {
        staffDrawClefChange(bx, ev.clefChange);
      }
      continue;
    }

    var cx = colX[e];

    if (ev.type === "simile") {
      /* Measure repeat. Origin on the middle line, between the three middle lines. */
      var simAdv = staffGlyphAdvance("repeat1Bar", lineGap);
      staffPlaceGlyph(svg, "repeat1Bar", cx - simAdv / 2, staffMidY, lineGap, "staff-simile");
    } else if (ev.type === "rest") {
      var restName = staffRestGlyph(ev.duration || "q");
      var restAdv = staffGlyphAdvance(restName, lineGap);
      var restBase = staffDurationBase(ev.duration || "q");
      var restY = staffMidY;
      if (restBase === "w") {
        restY = staffTop + lineGap;
      } else if (restBase === "h") {
        restY = staffTop + 2 * lineGap;
      }
      staffPlaceGlyph(svg, restName, cx - restAdv / 2, restY, lineGap);
      var restDots = staffDurationDotCount(ev.duration || "q");
      if (restDots) {
        /* Every rest dot sits in the third space, beside the rest. */
        var thirdY = staffPitchY(bottomStep + 5, ast.clef, staffTop, lineGap);
        var restDotX = cx + restAdv / 2 + lineGap * 0.12;
        var restDotI;
        for (restDotI = 0; restDotI < restDots; restDotI++) {
          drawAugmentationDotAt(restDotX, thirdY);
          if (restDotI + 1 < restDots) {
            restDotX += lineGap;
          }
        }
      }
    } else if (ev.type === "note") {
      var isSlash = ev.head === "slash";
      var isBeat = ev.head === "beat";
      var disp = null;
      if (!isSlash && !isBeat) {
        disp = typeof ev.pitch.displayAcc === "string"
          ? ev.pitch.displayAcc
          : staffWrittenAccidental(ev.pitch, ast.keyAlts);
      }
      var drawn = drawNotehead(cx, ev.pitch.step, ev.duration || "q", disp, 0, ev.head || "");
      if (!isSlash && !isBeat) {
        drawLedgerSpan([{ x: cx, step: ev.pitch.step, halfW: drawn.headRx }]);
      }
      var noteDots = [{
        step: ev.pitch.step,
        ny: drawn.ny,
        left: drawn.left,
        right: drawn.right,
        dots: isSlash || isBeat ? staffDurationDotCount(ev.duration || "q") : staffDurationDotCount(ev.duration || "q")
      }];
      staffPlaceDots(noteDots);
      if (typeof noteDots[0].dotRight === "number") {
        drawn.dotRight = noteDots[0].dotRight;
      }
      staffStoreHead(e, ev.pitch.step, drawn, ev.duration || "q", isSlash || isBeat, staffTieKey(ev.pitch));
      if (!isSlash && !isBeat) {
        staffRememberPitchHead(e, drawn, ev.pitch);
      }
      var ny = drawn.ny;
      colNy[e] = ny;
      var g = colGroup[e];
      var beamed =
        g >= 0 && beamGroups[g] && beamGroups[g].indices.length >= 2;
      if (isBeat || !staffHasStem(ev.duration || "q")) {
        /* play-anything, whole notes, and stemless quarters have no stem */
      } else if (beamed) {
        /* stems + beams drawn after all heads */
      } else {
        /* Rhythmic slash notation conventionally stems down from the left. */
        var up = isSlash ? false : staffStemUpFromY(ny, staffMidY);
        var noteStemLen = isSlash
          ? slashStemLen
          : staffStemReach(ny, staffMidY, up, lineGap * (3.5 + staffFlagExtraSpaces(ev.duration || "q")));
        var tip = up ? ny - noteStemLen : ny + noteStemLen;
        var stem = drawStemTo(cx, ny, tip, up, isSlash);
        colStem[e] = stem;
        if (staffIsShortDuration(ev.duration || "q")) {
          staffPlaceGlyph(
            svg,
            staffFlagGlyph(ev.duration || "q", up),
            stem.x,
            tip,
            lineGap
          );
        }
      }
    } else if (ev.type === "stack") {
      var stackDur = ev.duration || (ev.pitches[0] && ev.pitches[0].duration) || "q";
      var stemUp = staffEventStemUpGuess(ev);
      var stackG = colGroup[e];
      var stackBeamed =
        stackG >= 0 && beamGroups[stackG] && beamGroups[stackG].indices.length >= 2;
      /* Inside a beam the seconds clear the group's stem, not the chord's own. */
      var offsetUp = stackBeamed ? staffGroupStemUp(beamGroups[stackG].indices) : stemUp;
      var offsets = staffStackSecondOffsets(ev.pitches, offsetUp, secondShift);
      var accCols = staffAssignAccidentalColumns(ev.pitches, ast.keyAlts);
      var stackAccGap = lineGap * 0.35;
      var accCenters = staffStackAccidentalCenters(
        ev.pitches,
        offsets,
        accCols,
        cx,
        noteHeadRx,
        lineGap,
        stackAccGap
      );
      var stemYs = [];
      var stackHeads = [];
      var stackDots = [];
      var stackLedger = [];
      for (p = 0; p < ev.pitches.length; p++) {
        var pitchDur = ev.pitches[p].duration || stackDur;
        var drawnP = drawNotehead(
          cx + offsets[p],
          ev.pitches[p].step,
          pitchDur,
          null,
          0,
          ""
        );
        var stored = staffStoreHead(
          e,
          ev.pitches[p].step,
          drawnP,
          pitchDur,
          false,
          staffTieKey(ev.pitches[p])
        );
        staffRememberPitchHead(e, drawnP, ev.pitches[p]);
        stackHeads.push(stored);
        stackLedger.push({
          x: cx + offsets[p],
          step: ev.pitches[p].step,
          halfW: drawnP.headRx
        });
        stackDots.push({
          step: ev.pitches[p].step,
          ny: drawnP.ny,
          left: drawnP.left,
          right: drawnP.right,
          dots: staffDurationDotCount(pitchDur)
        });
        stemYs.push(drawnP.ny);
      }
      drawLedgerSpan(stackLedger);
      staffPlaceDots(stackDots);
      for (p = 0; p < stackDots.length; p++) {
        if (stackHeads[p] && typeof stackDots[p].dotRight === "number") {
          stackHeads[p].dotRight = stackDots[p].dotRight;
        }
      }
      for (p = 0; p < ev.pitches.length; p++) {
        if (accCenters[p] === null) {
          continue;
        }
        var stackAccName = staffAccidentalGlyphName(staffAccKind(accCols[p].acc));
        var stackAccAdv = staffGlyphAdvance(stackAccName || "accidentalSharp", lineGap);
        var stackBox = staffHeadBox(e, ev.pitches[p].step, staffTieKey(ev.pitches[p]));
        if (stackBox) {
          stackBox.accLeft = accCenters[p] - stackAccAdv / 2;
        }
        staffDrawAccidental(
          svg,
          accCenters[p],
          ev.pitches[p].step,
          paintClef,
          staffTop,
          lineGap,
          accCols[p].acc
        );
      }
      if (stemYs.length) {
        var hiY = Math.min.apply(null, stemYs);
        var loY = Math.max.apply(null, stemYs);
        /* Beam tip helper uses the mid of the stack; stem still covers all heads. */
        colNy[e] = (hiY + loY) / 2;
        colStackExtent[e] = { hi: hiY, lo: loY };
        if (staffHasStem(stackDur) && !stackBeamed) {
          /* Stem on the main column; cover all head centers vertically. */
          var stackOuter = stemUp ? hiY : loY;
          var stackStemStandard = lineGap * (3.5 + staffFlagExtraSpaces(stackDur));
          var stackReach = staffStemReach(stackOuter, staffMidY, stemUp, stackStemStandard);
          var stackTipY = stemUp ? hiY - stackReach : loY + stackReach;
          var stackStemX = staffNoteStemX(e, stemUp);
          if (stemUp) {
            svg.appendChild(
              staffSvgEl("line", {
                x1: String(stackStemX),
                y1: String(loY),
                x2: String(stackStemX),
                y2: String(stackTipY),
                stroke: "currentColor",
                "stroke-width": "1.4"
              })
            );
          } else {
            svg.appendChild(
              staffSvgEl("line", {
                x1: String(stackStemX),
                y1: String(hiY),
                x2: String(stackStemX),
                y2: String(stackTipY),
                stroke: "currentColor",
                "stroke-width": "1.4"
              })
            );
          }
          if (staffIsShortDuration(stackDur)) {
            staffPlaceGlyph(
              svg,
              staffFlagGlyph(stackDur, stemUp),
              stackStemX,
              stackTipY,
              lineGap
            );
          }
        }
      }
    }
  }

  /* Draw multi-note beams and their stems. */
  var gIdx;
  for (gIdx = 0; gIdx < beamGroups.length; gIdx++) {
    var grp = beamGroups[gIdx];
    if (grp.indices.length < 2) {
      continue;
    }
    var gi;
    var groupUp = staffGroupStemUp(grp.indices);
    var beamStemLen = beamMin;
    var beamXs = [];
    var beamYs = [];
    var stemFromY;
    for (gi = 0; gi < grp.indices.length; gi++) {
      var beamCol = grp.indices[gi];
      beamXs.push(staffNoteStemX(beamCol, groupUp));
      if (colStackExtent[beamCol]) {
        /* Stack: beam meets the outer head on the beam side. */
        beamYs.push(groupUp ? colStackExtent[beamCol].hi : colStackExtent[beamCol].lo);
      } else {
        beamYs.push(colNy[beamCol]);
      }
    }
    var tipYs = staffBeamTipYs(beamXs, beamYs, groupUp, beamStemLen, staffTop, lineGap);
    var tips = [];
    for (gi = 0; gi < grp.indices.length; gi++) {
      var ci = grp.indices[gi];
      var centerY = tipYs[gi];
      /* The primary beam is the outer one. Its far edge is half a beam past the center. */
      var outerExtra = beamThick / 2;
      var outerY = groupUp ? centerY - outerExtra : centerY + outerExtra;
      var stemEnd;
      if (colStackExtent[ci]) {
        stemFromY = groupUp ? colStackExtent[ci].lo : colStackExtent[ci].hi;
        stemEnd = drawStemTo(colX[ci], stemFromY, outerY, groupUp, false, staffNoteStemX(ci, groupUp));
      } else {
        stemEnd = drawStemTo(
          colX[ci],
          colNy[ci],
          outerY,
          groupUp,
          columns[ci].head === "slash",
          staffNoteStemX(ci, groupUp)
        );
      }
      tips.push({ x: stemEnd.x, y: centerY, up: groupUp });
    }
    var t0 = tips[0];
    var t1 = tips[tips.length - 1];
    drawBeamSegment(t0.x, t0.y, t1.x, t1.y);
    /* Secondary beam for sixteenths (partial where runs of s meet). */
    var hasSixteenth = false;
    for (gi = 0; gi < grp.indices.length; gi++) {
      if (staffDurationBase(columns[grp.indices[gi]].duration) === "s") {
        hasSixteenth = true;
        break;
      }
    }
    if (hasSixteenth) {
      var secOff = groupUp ? beamThick + beamGap : -(beamThick + beamGap);
      var segStart = -1;
      function flushSec(from, to) {
        if (from < 0 || to < from) {
          return;
        }
        var a = tips[from];
        var b = tips[to];
        var spanX = t1.x - t0.x || 1;
        var ya = t0.y + (t1.y - t0.y) * ((a.x - t0.x) / spanX) + secOff;
        var yb = t0.y + (t1.y - t0.y) * ((b.x - t0.x) / spanX) + secOff;
        if (from === to) {
          /* Hook: short stub toward next/prev neighbor. */
          var stub = lineGap;
          var afterDotted =
            from > 0 && staffDurationDotted(columns[grp.indices[from - 1]].duration);
          if (afterDotted) {
            drawBeamSegment(a.x - stub, ya, a.x, ya);
          } else if (to + 1 < tips.length) {
            drawBeamSegment(a.x, ya, a.x + stub, ya);
          } else if (from > 0) {
            drawBeamSegment(a.x - stub, ya, a.x, ya);
          } else {
            drawBeamSegment(a.x, ya, a.x + stub, ya);
          }
        } else {
          drawBeamSegment(a.x, ya, b.x, yb);
        }
      }
      for (gi = 0; gi < grp.indices.length; gi++) {
        if (staffDurationBase(columns[grp.indices[gi]].duration) === "s") {
          if (segStart < 0) {
            segStart = gi;
          }
        } else {
          flushSec(segStart, gi - 1);
          segStart = -1;
        }
      }
      flushSec(segStart, grp.indices.length - 1);
    }
  }

  for (tl = 0; tl < tupletLayouts.length; tl++) {
    var lay = tupletLayouts[tl];
    var gTup = staffSvgEl("g", {
      class: lay.bracket ? "staff-tuplet has-bracket" : "staff-tuplet"
    });
    if (lay.bracket) {
      var hookDir = lay.above ? 1 : -1;
      var gapL = lay.cx - lay.numW / 2 - tupletPad;
      var gapR = lay.cx + lay.numW / 2 + tupletPad;
      var bSlope = (lay.y1 - lay.y0) / (lay.x1 - lay.x0 || 1);
      var gapLY = lay.y0 + bSlope * (gapL - lay.x0);
      var gapRY = lay.y0 + bSlope * (gapR - lay.x0);
      var pt = function (x, y) {
        return Math.round(x * 100) / 100 + " " + Math.round(y * 100) / 100;
      };
      gTup.appendChild(
        staffSvgEl("path", {
          class: "tuplet-bracket",
          d:
            "M" + pt(lay.x0, lay.y0 + hookDir * tupletHook) +
            "L" + pt(lay.x0, lay.y0) +
            "L" + pt(gapL, gapLY) +
            "M" + pt(gapR, gapRY) +
            "L" + pt(lay.x1, lay.y1) +
            "L" + pt(lay.x1, lay.y1 + hookDir * tupletHook),
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "1.2",
          "stroke-linejoin": "miter"
        })
      );
    }
    var numX = lay.cx - lay.numW / 2;
    var numBase = lay.cy + tupletDigitH / 2;
    for (e = 0; e < lay.names.length; e++) {
      numX += staffPlaceGlyph(gTup, lay.names[e], numX, numBase, tupletSpace);
    }
    svg.appendChild(gTup);
  }

  /*
   * One voice on this staff. A tie curves opposite that voice's stem.
   * Stems up: the curve goes down. Stems down: the curve goes up.
   * Mixed stems curve up, unless both notes sit on the second ledger
   * above the staff or higher, where the curve goes down.
   * A chord's top note curves up, its bottom note curves down, and the
   * notes between alternate. Slash stems go down, so those ties sit above.
   */
  function staffStemUpAt(colIndex) {
    if (typeof predUp[colIndex] === "boolean") {
      return predUp[colIndex];
    }
    var col = columns[colIndex];
    if (!col || col.head === "slash") {
      return false;
    }
    if (col.type === "stack") {
      return staffEventStemUpGuess(col);
    }
    if (typeof colNy[colIndex] === "number") {
      return staffStemUpFromY(colNy[colIndex], staffMidY);
    }
    return false;
  }
  var tieGroups = {};
  for (tieN = 0; tieN < drawTies.length; tieN++) {
    var groupKey = drawTies[tieN].from + ":" + drawTies[tieN].to;
    if (!tieGroups[groupKey]) {
      tieGroups[groupKey] = [];
    }
    tieGroups[groupKey].push(drawTies[tieN]);
  }
  function staffTieRank(group, step) {
    var order = [];
    var ri;
    var placed;
    for (ri = 0; ri < group.length; ri++) {
      placed = false;
      var rj;
      for (rj = 0; rj < order.length; rj++) {
        if (group[ri].step > order[rj]) {
          order.splice(rj, 0, group[ri].step);
          placed = true;
          break;
        }
      }
      if (!placed) {
        order.push(group[ri].step);
      }
    }
    return { n: order.length, fromTop: order.indexOf(step) };
  }
  function staffTieAbove(fromCol, toCol, step) {
    var group = tieGroups[fromCol + ":" + toCol];
    if (group && group.length > 1) {
      var rank = staffTieRank(group, step);
      if (rank.fromTop === 0) {
        return true;
      }
      if (rank.fromTop === rank.n - 1) {
        return false;
      }
      /* Under the top tie, then up, then down. */
      return rank.fromTop % 2 === 0;
    }
    var upA = staffStemUpAt(fromCol);
    var upB = staffStemUpAt(toCol);
    if (upA !== upB) {
      var fromBox = staffHeadBox(fromCol, step);
      var toBox = staffHeadBox(toCol, step);
      var secondLedger = staffTop - 2 * lineGap;
      if (fromBox && toBox && fromBox.y <= secondLedger && toBox.y <= secondLedger) {
        return false;
      }
      return true;
    }
    return !upA;
  }
  function staffTieNeighborSteps(group, step, above) {
    var best = 99;
    if (!group) {
      return best;
    }
    var ni;
    for (ni = 0; ni < group.length; ni++) {
      var delta = above ? group[ni].step - step : step - group[ni].step;
      if (delta > 0 && delta < best) {
        best = delta;
      }
    }
    return best;
  }
  var tieN;
  for (tieN = 0; tieN < drawTies.length; tieN++) {
    var tie = drawTies[tieN];
    var fromBox = staffHeadBox(tie.from, tie.step, tie.key);
    var toBox;
    var above;
    var slashTie;
    var x1;
    var x2;
    var barX = null;
    var barAt;
    if (tie.hang) {
      if (!fromBox) {
        continue;
      }
      toBox = {
        left: colX[tie.to],
        right: colX[tie.to],
        y: fromBox.y,
        slash: fromBox.slash,
        onLine: fromBox.onLine
      };
      above = staffTieAbove(tie.from, tie.from, tie.step);
      slashTie = !!fromBox.slash;
      if (slashTie) {
        x1 = fromBox.left + (fromBox.right - fromBox.left) * 0.62;
        x2 = colX[tie.to] + lineGap * 0.55;
      } else {
        x1 = fromBox.right + lineGap * 0.16;
        x2 = colX[tie.to] + lineGap * 0.45;
      }
    } else {
      toBox = staffHeadBox(tie.to, tie.step, tie.key);
      if (!fromBox || !toBox) {
        continue;
      }
      above = staffTieAbove(tie.from, tie.to, tie.step);
      slashTie = fromBox.slash || toBox.slash;
      if (slashTie) {
        /* Slash glyphs are wide diagonals. A tie from the outer tips is a nub. Span the heads. */
        x1 = fromBox.left + (fromBox.right - fromBox.left) * 0.62;
        x2 = toBox.left + (toBox.right - toBox.left) * 0.28;
      } else {
        x1 = fromBox.right + lineGap * 0.16;
        x2 = toBox.left - lineGap * 0.12;
      }
    }
    /*
     * A dot in a space sits beside the note. On a line it sits above, so a
     * downward tie can pass under it. Never start inside the notehead.
     */
    if (typeof fromBox.dotRight === "number" && (above || !fromBox.onLine)) {
      x1 = Math.max(x1, fromBox.dotRight + lineGap * 0.22);
    }
    var x1Floor = x1;
    /* Stop before a sharp, flat, or natural on the second note. */
    if (!slashTie && typeof toBox.accLeft === "number") {
      x2 = Math.min(x2, toBox.accLeft - lineGap * 0.32);
    }
    if (x2 < x1Floor + lineGap * 0.45) {
      var accStop = !slashTie && typeof toBox.accLeft === "number" ? toBox.accLeft - lineGap * 0.32 : null;
      if (accStop !== null && accStop < x1Floor + lineGap * 0.45) {
        x2 = accStop;
        if (x2 < x1Floor) {
          x1 = Math.max(fromBox.right + lineGap * 0.08, x2 - lineGap * 0.45);
          x1Floor = x1;
        }
      } else {
        x2 = x1Floor + lineGap * 0.45;
      }
    }
    var lineNudge = lineGap * 0.28;
    var y1 = slashTie
      ? above
        ? fromBox.y - lineGap * 1.35
        : fromBox.y + lineGap * 1.35
      : fromBox.onLine
        ? above
          ? fromBox.y - lineNudge
          : fromBox.y + lineNudge
        : fromBox.y;
    var y2 = slashTie
      ? above
        ? toBox.y - lineGap * 1.35
        : toBox.y + lineGap * 1.35
      : toBox.onLine
        ? above
          ? toBox.y - lineNudge
          : toBox.y + lineNudge
        : toBox.y;
    var spanTie = x2 - x1;
    var toward = staffTieNeighborSteps(
      tieGroups[tie.from + ":" + tie.to],
      tie.step,
      above
    );
    /*
     * Outer ties can bow. Notes a second or a third apart share a small gap,
     * so those curves stay shallow and do not meet.
     */
    var arch =
      toward <= 1
        ? lineGap * 0.1
        : toward <= 2
          ? lineGap * 0.14
          : Math.max(lineGap * 0.42, Math.min(lineGap * 0.7, spanTie * 0.28));
    for (barAt = tie.from + 1; barAt < tie.to; barAt++) {
      if (columns[barAt] && columns[barAt].type === "barline") {
        barX = colX[barAt];
      }
    }
    if (barX !== null) {
      arch = Math.max(arch, lineGap);
    }
    var controlX = barX !== null ? barX : (x1 + x2) / 2;
    var midY = above ? (y1 + y2) / 2 - arch : (y1 + y2) / 2 + arch;
    var tieTop = Math.min(y1, y2, midY);
    var tieBot = Math.max(y1, y2, midY);
    if (tieTop < inkTop) {
      inkTop = tieTop;
    }
    if (tieBot > inkBot) {
      inkBot = tieBot;
    }
    svg.appendChild(
      staffSvgEl("path", {
        class: "staff-tie",
        d:
          "M" +
          x1.toFixed(2) +
          " " +
          y1.toFixed(2) +
          " Q" +
          controlX.toFixed(2) +
          " " +
          midY.toFixed(2) +
          " " +
          x2.toFixed(2) +
          " " +
          y2.toFixed(2),
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.35",
        "stroke-linecap": "round"
      })
    );
  }

  /*
   * A shifted beam can sit past the first pad guess. Grow the viewBox
   * so the beam and its labels stay inside the svg.
   */
  var dynY = hasBelowLabels ? labelY + labelSize + 4 : inkBot + chordSize * 0.85;

  function staffDrawChordAt(x, raw) {
    var tempo = staffTempoLabel(raw);
    var label = tempo || staffFormatChordText(String(raw || "").replace(/_/g, " "));
    var width = staffMeasureText(label, chordSize);
    var y = staffAvoidText(placedAbove, x, chordY, width, "start", -(chordSize + 2));
    var sym = staffSvgEl("text", {
      x: String(x),
      y: String(y),
      "font-size": String(chordSize),
      fill: "currentColor",
      "text-anchor": "start",
      "class": tempo ? "staff-tempo" : "staff-chord"
    });
    sym.textContent = label;
    svg.appendChild(sym);
  }

  function staffDrawDynamicAt(x, word) {
    var dyn = staffSvgEl("text", {
      x: String(x),
      y: String(dynY),
      "font-size": String(chordSize),
      fill: "currentColor",
      "text-anchor": "start",
      "font-style": "italic",
      "class": "staff-dynamic"
    });
    dyn.textContent = word;
    svg.appendChild(dyn);
  }

  function staffDrawHairpin(x0, x1, kind) {
    var left;
    var right;
    var h = lineGap * 0.42;
    var y = dynY - chordSize * 0.28;
    if (x1 < x0) {
      var swap = x0;
      x0 = x1;
      x1 = swap;
    }
    if (x1 - x0 < lineGap) {
      x0 -= lineGap * 0.35;
      x1 += lineGap * 0.35;
    }
    left = kind === "dim" ? h : 0.8;
    right = kind === "cresc" ? h : 0.8;
    svg.appendChild(staffSvgEl("line", {
      x1: String(x0),
      y1: String(y - left),
      x2: String(x1),
      y2: String(y - right),
      stroke: "currentColor",
      "stroke-width": "1.2",
      "stroke-linecap": "round",
      "class": "staff-hairpin"
    }));
    svg.appendChild(staffSvgEl("line", {
      x1: String(x0),
      y1: String(y + left),
      x2: String(x1),
      y2: String(y + right),
      stroke: "currentColor",
      "stroke-width": "1.2",
      "stroke-linecap": "round",
      "class": "staff-hairpin"
    }));
  }

  function staffDrawArticulation(x, y, kind, below) {
    var g;
    var point;
    var base;
    if (kind === "staccato") {
      g = staffSvgEl("circle", {
        cx: String(x),
        cy: String(y),
        r: String(lineGap * 0.16),
        fill: "currentColor",
        "class": "staff-artic"
      });
      svg.appendChild(g);
      return;
    }
    if (kind === "tenuto") {
      svg.appendChild(staffSvgEl("line", {
        x1: String(x - lineGap * 0.38),
        y1: String(y),
        x2: String(x + lineGap * 0.38),
        y2: String(y),
        stroke: "currentColor",
        "stroke-width": "1.5",
        "stroke-linecap": "round",
        "class": "staff-artic"
      }));
      return;
    }
    if (kind === "accent") {
      svg.appendChild(staffSvgEl("line", {
        x1: String(x - lineGap * 0.42),
        y1: String(y - lineGap * 0.16),
        x2: String(x + lineGap * 0.42),
        y2: String(y),
        stroke: "currentColor",
        "stroke-width": "1.4",
        "stroke-linecap": "round",
        "class": "staff-artic"
      }));
      svg.appendChild(staffSvgEl("line", {
        x1: String(x - lineGap * 0.42),
        y1: String(y + lineGap * 0.16),
        x2: String(x + lineGap * 0.42),
        y2: String(y),
        stroke: "currentColor",
        "stroke-width": "1.4",
        "stroke-linecap": "round",
        "class": "staff-artic"
      }));
      return;
    }
    /* Marcato points away from the note. */
    point = below ? lineGap * 0.2 : -lineGap * 0.2;
    base = below ? -lineGap * 0.18 : lineGap * 0.18;
    svg.appendChild(staffSvgEl("line", {
      x1: String(x - lineGap * 0.32),
      y1: String(y + base),
      x2: String(x),
      y2: String(y + point),
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "class": "staff-artic"
    }));
    svg.appendChild(staffSvgEl("line", {
      x1: String(x + lineGap * 0.32),
      y1: String(y + base),
      x2: String(x),
      y2: String(y + point),
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "class": "staff-artic"
    }));
  }

  function staffNextSpaceY(fromY, dir) {
    var half = lineGap / 2;
    var rel = (staffTop + 4 * lineGap - fromY) / half;
    var step = dir > 0 ? Math.floor(rel - 0.05) : Math.ceil(rel + 0.05);
    if (Math.abs(step % 2) === 0) {
      step += dir > 0 ? -1 : 1;
    }
    return staffTop + 4 * lineGap - step * half;
  }

  /* Next staff space outward. The first mark must clear the notehead by a space. */
  function staffClearSpaceY(anchor, fromY, dir, first) {
    var y = fromY;
    var guard = 0;
    var placed = y;
    var moved;
    var dist;
    while (guard++ < 6) {
      placed = staffNextSpaceY(y + dir * lineGap * 0.25, dir);
      moved = dir > 0 ? placed - y : y - placed;
      if (moved < lineGap * 0.4) {
        y = placed + dir * lineGap * 0.5;
        continue;
      }
      dist = dir > 0 ? placed - anchor : anchor - placed;
      if (!first || dist + 0.5 >= lineGap) {
        return placed;
      }
      y = placed;
    }
    return placed;
  }

  function staffArticulationYs(colIndex) {
    var col = columns[colIndex];
    var marks;
    var artUp;
    var dir;
    var anchor;
    var y;
    var i;
    var ys = [];
    if (!col || !col.articulations || !col.articulations.length || typeof colNy[colIndex] !== "number") {
      return ys;
    }
    marks = staffSortArticulations(col.articulations);
    /*
     * A rhythm slash is a diagonal about a space tall, centered on the middle
     * line. The staff space above that line is inside the slash, so the mark
     * sits clear of the glyph instead of snapping into that space.
     */
    if (col.head === "slash" || col.head === "beat") {
      y = colNy[colIndex] - lineGap * 1.7;
      for (i = 0; i < marks.length; i++) {
        ys.push({ y: y, kind: marks[i], below: false });
        y -= lineGap * 0.65;
      }
      return ys;
    }
    artUp = staffStemUpAt(colIndex);
    dir = artUp ? 1 : -1;
    anchor = colNy[colIndex];
    if (colStackExtent[colIndex]) {
      anchor = dir > 0 ? colStackExtent[colIndex].lo : colStackExtent[colIndex].hi;
    }
    y = anchor;
    for (i = 0; i < marks.length; i++) {
      y = staffClearSpaceY(anchor, y, dir, i === 0);
      ys.push({ y: y, kind: marks[i], below: dir > 0 });
    }
    return ys;
  }

  var artMarks = [];
  var artLow = inkBot;
  for (e = 0; e < columns.length; e++) {
    artMarks[e] = staffArticulationYs(e);
    var artIpre;
    for (artIpre = 0; artIpre < artMarks[e].length; artIpre++) {
      if (artMarks[e][artIpre].below && artMarks[e][artIpre].y + lineGap * 0.3 > artLow) {
        artLow = artMarks[e][artIpre].y + lineGap * 0.3;
      }
    }
  }
  if (artLow > inkBot) {
    if (hasBelowLabels) {
      labelY = Math.max(labelY, artLow + labelSize);
    }
    dynY = Math.max(dynY, artLow + chordSize * 0.85);
  }

  var openHairpin = null;
  for (e = 0; e < columns.length; e++) {
    ev = columns[e];
    if (ev.type === "barline" || ev.type === "hangTarget") {
      continue;
    }
    if (ev.chord) {
      staffDrawChordAt(colX[e] - noteHeadRx, ev.chord);
    }
    if (ev.above) {
      staffDrawAboveText(colX[e], ev.above);
    }
    if (ev.label) {
      staffDrawBelowText(colX[e], ev.label);
    }
    if (ev.type === "note" && ev.pitch) {
      if (ev.pitch.above) {
        staffDrawAboveText(colX[e], ev.pitch.above);
      }
      if (ev.pitch.label) {
        staffDrawBelowText(colX[e], ev.pitch.label);
      }
    }
    if (ev.type === "stack" && ev.pitches) {
      var labOff = staffStackSecondOffsets(
        ev.pitches,
        colGroup[e] >= 0 && beamGroups[colGroup[e]] && beamGroups[colGroup[e]].indices.length >= 2
          ? staffGroupStemUp(beamGroups[colGroup[e]].indices)
          : staffEventStemUpGuess(ev),
        secondShift
      );
      var labP;
      for (labP = 0; labP < ev.pitches.length; labP++) {
        if (ev.pitches[labP].above) {
          staffDrawAboveText(colX[e] + (labOff[labP] || 0), ev.pitches[labP].above);
        }
        if (ev.pitches[labP].label) {
          staffDrawBelowText(colX[e] + (labOff[labP] || 0), ev.pitches[labP].label);
        }
      }
    }
    if (ev.dynamic) {
      staffDrawDynamicAt(colX[e] - noteHeadRx, ev.dynamic);
    }
    if (ev.hairpin) {
      var hx0 = colX[e] - noteHeadRx;
      if (ev.dynamic) {
        hx0 += staffMeasureText(ev.dynamic, chordSize) + lineGap * 0.35;
      }
      openHairpin = { kind: ev.hairpin, x: hx0 };
    }
    if (ev.hairpinEnd && openHairpin) {
      var hx1 = colX[e] + noteHeadRx;
      if (ev.dynamic) {
        hx1 = colX[e] - noteHeadRx - lineGap * 0.35;
      }
      staffDrawHairpin(openHairpin.x, hx1, openHairpin.kind);
      openHairpin = null;
    }
    if (artMarks[e] && artMarks[e].length) {
      var artI;
      for (artI = 0; artI < artMarks[e].length; artI++) {
        staffDrawArticulation(colX[e], artMarks[e][artI].y, artMarks[e][artI].kind, artMarks[e][artI].below);
      }
    }
  }

  var viewY = 0;
  var viewH = contentH;
  var needTop = inkTop;
  if (hasChordText) {
    needTop = Math.min(needTop, chordY - chordSize);
  }
  var needBot = inkBot;
  if (hasBelowLabels) {
    needBot = Math.max(needBot, labelY + labelSize * 0.35);
  }
  if (hasDynamics || hasHairpin) {
    needBot = Math.max(needBot, dynY + 6);
  }
  if (needTop < 0) {
    viewY = needTop - 4;
  }
  if (needBot > contentH) {
    viewH = needBot + 4 - viewY;
  } else if (viewY < 0) {
    viewH = contentH - viewY;
  }
  if (viewY < 0 || viewH > contentH) {
    svg.setAttribute("viewBox", "0 " + viewY + " " + width + " " + viewH);
  }

  /* Edit preview caret: column centers + staff band (JS property; not in innerHTML). */
  var pitchHeadSeen = {};
  var pitchHeadI;
  var pitchHeadKey;
  for (pitchHeadI = 0; pitchHeadI < pitchHeads.length; pitchHeadI++) {
    pitchHeadKey = pitchHeads[pitchHeadI].col + "\0" + pitchHeads[pitchHeadI].key;
    if (!pitchHeadSeen[pitchHeadKey]) {
      pitchHeadSeen[pitchHeadKey] = 0;
    }
    pitchHeads[pitchHeadI].keyIndex = pitchHeadSeen[pitchHeadKey];
    pitchHeadSeen[pitchHeadKey] += 1;
  }
  svg._staffCaretLayout = {
    staffTop: staffTop,
    staffBot: staffTop + staffHeight,
    notesStartX: notesStartX,
    endX: width - padR,
    half: noteHeadRx,
    lineGap: lineGap,
    heads: pitchHeads,
    cols: columns.map(function (col, ci) {
      return { type: col.type, x: colX[ci], clef: (col && col.clef) || ast.clef };
    })
  };

  return svg;
}

clearMusicStaffCache();
