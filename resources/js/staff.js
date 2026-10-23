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

/* Base letter from a duration token ("q", "e.", …). */
function staffDurationBase(dur) {
  if (!dur) {
    return "q";
  }
  var s = String(dur);
  if (s.charAt(s.length - 1) === ".") {
    return s.slice(0, -1) || "q";
  }
  return s;
}

function staffDurationDotted(dur) {
  return typeof dur === "string" && dur.length > 1 && dur.charAt(dur.length - 1) === ".";
}

/* Combine base letter + optional trailing ".". A dotted stemless note does not parse. */
function staffMakeDuration(base, dotted) {
  var b = base || "q";
  if (dotted) {
    if (b === "n") {
      return null;
    }
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

/* Duration in quarter-note units (dotted × 1.5). */
function staffDurationQuarters(dur) {
  var base = staffDurationBase(dur);
  var q;
  if (base === "w") {
    q = 4;
  } else if (base === "h") {
    q = 2;
  } else if (base === "e") {
    q = 0.5;
  } else   if (base === "s") {
    q = 0.25;
  } else if (base === "n") {
    q = 1;
  } else {
    q = 1;
  }
  if (staffDurationDotted(dur)) {
    return q * 1.5;
  }
  return q;
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
  group.appendChild(staffSvgEl("path", { d: g.d }));
  svg.appendChild(group);
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
    var acc = staffWrittenAccidental(pitches[i], keyAlts);
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
    /^([A-Ga-g])(##|bb|x|X|#|b|n|\u266F|\u266D|\u266E)?(\d)([whqesn]?)(\.?)(!?)(.*)$/.exec(
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
  var dur = staffMakeDuration(m[4] || "q", m[5] === ".");
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
  var m = /^r([whqes]?)(\.?)(.*)$/i.exec(token);
  var aff;
  if (!m) {
    return null;
  }
  var dur = staffMakeDuration(m[1] || "q", m[2] === ".");
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
  var m = /^\/([whqes]?)(\.?)(.*)$/.exec(token);
  var aff;
  if (!m) {
    return null;
  }
  var rhythmic = !!(m[1] || m[2]);
  var dur = staffMakeDuration(rhythmic ? m[1] || "q" : "q", m[2] === ".");
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
      /^r([whqes]?)(\.?)/i.test(t) ||
      /^\/([whqes]?)(\.?)(?:['>\-^]|_|$)/.test(t) ||
      /* Pitch-like (letter + octave), not prose like "Major". */
      /^[A-Ga-g](##|bb|x|X|#|b|n|\u266F|\u266D|\u266E)?\d/.test(t)
    ) {
      return true;
    }
  }
  return false;
}

/*
 * Seconds/unisons in a stack (Gould): lower of each pair on the opposite side of
 * the stem, upper on the normal side; zig-zag through a run. Stem-up: opposite is
 * right; stem-down: opposite is left.
 */
function staffStackSecondOffsets(pitches, stemUp, secondShift) {
  var offsets = [];
  var opposite = stemUp ? 1 : -1;
  var i = 0;
  var j;
  var k;
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
        offsets[k] = (k - i) % 2 === 0 ? opposite * secondShift : 0;
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
  /* Vertical reach: accidental ink vs a neighboring head (~±2 staff steps). */
  var nearSteps = 3;
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
        if (Math.abs(pitches[i].step - pitches[j].step) > nearSteps) {
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
        if (Math.abs(pitches[i].step - pitches[j].step) > nearSteps) {
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
    return ev.notes.length ? [staffTieKey(ev.notes[0].pitch)] : keys;
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
    return ev.notes.length ? [staffTieKey(ev.notes[ev.notes.length - 1].pitch)] : keys;
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
        return { error: "tie needs a note after it", tok: "~" };
      }
      continue;
    }
    if (open) {
      matched = staffMatchTie(open, ev);
      if (matched.error) {
        return matched;
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
    if (openAt < 0 || !staffOnlyBarlinesAfter(events, openAt + 1)) {
      return { error: "tie needs a note after it", tok: "~" };
    }
    hangKeys = staffOutgoingKeys(open);
    if (!hangKeys.length) {
      return { error: "tie needs a note after it", tok: "~" };
    }
    open.tieOutKeys = hangKeys;
    open.tieHang = true;
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

function staffParseBeamInner(inner, clef) {
  var parts = inner.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return null;
  }
  var notes = [];
  var hangTie = false;
  var i;
  for (i = 0; i < parts.length; i++) {
    if (parts[i] === "~") {
      if (!notes.length || hangTie) {
        return { error: "tie needs a note before it", tok: "~" };
      }
      hangTie = true;
      continue;
    }
    var p = staffParsePitchToken(parts[i]) || staffParseSlashToken(parts[i], clef || "treble");
    if (!p) {
      return null;
    }
    if (!staffIsShortDuration(p.duration || "q")) {
      return null;
    }
    if (hangTie) {
      var prev = notes[notes.length - 1];
      if (staffTieKey(prev.pitch) !== staffTieKey(p)) {
        return { error: "tie needs the same pitch", tok: "~" };
      }
      prev.tieToNext = true;
      prev.tieOutKey = staffTieKey(p);
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
  }
  /* A trailing ~ leaves the group and ties into whatever follows the brace. */
  return { notes: notes, tieToNext: hangTie };
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

/*
 * One note, slash, rest, {beam} or [stack] starting at tokens[i].
 * Returns { event, next } or { error, tok }.
 */
function staffParseEventAt(tokens, i, clef) {
  var tok = tokens[i];
  var rest = staffParseRestToken(tok);
  if (rest) {
    return { event: rest, next: i + 1 };
  }
  if (tok.charAt(0) === "{") {
    if (tok.indexOf("{", 1) >= 0) {
      return { error: "nested beam braces", tok: tok };
    }
    var beamBuf = tok;
    while (beamBuf.indexOf("}") < 0 && i + 1 < tokens.length) {
      i++;
      if (tokens[i].indexOf("{") >= 0) {
        return { error: "nested beam braces", tok: tokens[i] };
      }
      beamBuf += " " + tokens[i];
    }
    var beamClose = beamBuf.indexOf("}");
    if (beamClose < 0) {
      return { error: "unclosed beam", tok: tok };
    }
    if (beamBuf.slice(beamClose + 1)) {
      return { error: "junk after beam", tok: beamBuf.slice(beamClose + 1) };
    }
    var beamInner = beamBuf.slice(1, beamClose);
    var beamParsed = staffParseBeamInner(beamInner, clef);
    if (!beamParsed || beamParsed.error || !beamParsed.notes || beamParsed.notes.length < 1) {
      return {
        error: beamParsed && beamParsed.error ? beamParsed.error : "bad beam pitches (need e/s notes)",
        tok: beamParsed && beamParsed.tok ? beamParsed.tok : beamInner
      };
    }
    var beamEv = { type: "beam", notes: beamParsed.notes };
    if (beamParsed.tieToNext) {
      beamEv.tieToNext = true;
    }
    return { event: beamEv, next: i + 1 };
  }
  if (tok.charAt(0) === "[") {
    if (tok.indexOf("[", 1) >= 0) {
      return { error: "nested stack brackets", tok: tok };
    }
    var buf = tok;
    while (buf.indexOf("]") < 0 && i + 1 < tokens.length) {
      i++;
      if (tokens[i].indexOf("[") >= 0) {
        return { error: "nested stack brackets", tok: tokens[i] };
      }
      buf += " " + tokens[i];
    }
    var close = buf.indexOf("]");
    if (close < 0) {
      return { error: "unclosed stack", tok: tok };
    }
    var after = buf.slice(close + 1);
    var stackAff = staffParseAffixes(after);
    if (!stackAff || stackAff.articulations.length) {
      return { error: "stack label must use _ or ^", tok: after || tok };
    }
    var inner = buf.slice(1, close);
    var pitches = staffParseStackInner(inner);
    if (!pitches) {
      return { error: "bad stack pitches", tok: inner };
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
    return { error: "bad token", tok: tok };
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
function staffParseTupletAt(tokens, i, clef) {
  var open = /^\((\d{1,2})(?::(\d{1,2}))?$/.exec(tokens[i]);
  if (!open) {
    return { error: "bad tuplet (write (3 … ) or (5:4 … ))", tok: tokens[i] };
  }
  var n = parseInt(open[1], 10);
  var m = open[2] ? parseInt(open[2], 10) : staffTupletDefaultM(n);
  if (n < 2 || n > 16 || m < 1 || m > 16) {
    return { error: "bad tuplet ratio", tok: tokens[i] };
  }
  var inner = [];
  var j;
  var closed = false;
  for (j = i + 1; j < tokens.length; j++) {
    var t = tokens[j];
    if (t.charAt(0) === "(") {
      return { error: "nested tuplet", tok: t };
    }
    if (t === "|") {
      return { error: "barline inside tuplet", tok: t };
    }
    if (staffTokenClosesTuplet(t)) {
      if (t.length > 1) {
        inner.push(t.slice(0, -1));
      }
      closed = true;
      break;
    }
    inner.push(t);
  }
  if (!closed) {
    return { error: "unclosed tuplet", tok: tokens[i] };
  }
  var seq = staffParseSequence(inner, clef, { allowBarline: false, allowTuplet: false });
  if (seq.error) {
    return { error: seq.error, tok: seq.tok };
  }
  var events = seq.events;
  var count = 0;
  var k;
  for (k = 0; k < events.length; k++) {
    count += events[k].type === "beam" ? events[k].notes.length : 1;
  }
  if (count < 1) {
    return { error: "empty tuplet", tok: tokens[i] };
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
  if (marks.dynamic) {
    return { error: "dangling dynamic", tok: marks.dynamic };
  }
  if (marks.chord) {
    hasHost = false;
    for (i = 0; i < events.length; i++) {
      if (events[i].type !== "barline") {
        hasHost = true;
        break;
      }
    }
    /* No timed event: park as a line chord (empty staff / directives only). */
    if (!hasHost) {
      return { chordSymbol: marks.chord };
    }
    return { error: "dangling chord symbol", tok: "^" + marks.chord };
  }
  if (marks.hairpin && !marks.hairpin.start) {
    return { error: "hairpin needs a note", tok: marks.hairpin.kind };
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
      return { error: "hairpin needs a note", tok: marks.hairpin.kind };
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

function staffParseSequence(tokens, clef, opts) {
  var events = [];
  var sawMusic = false;
  var i = 0;
  var marks = { chord: "", dynamic: "", hairpin: null, hairpins: [] };
  opts = opts || {};
  while (i < tokens.length) {
    var tok = tokens[i];
    if (tok.charAt(0) === "^") {
      if (tok.length < 2) {
        return { error: "empty chord symbol", tok: tok };
      }
      if (marks.chord) {
        return { error: "dangling chord symbol", tok: marks.chord };
      }
      marks.chord = tok.slice(1);
      i++;
      continue;
    }
    if (staffIsDynamic(tok)) {
      if (marks.dynamic) {
        return { error: "dangling dynamic", tok: marks.dynamic };
      }
      marks.dynamic = tok;
      i++;
      continue;
    }
    if (staffIsHairpin(tok)) {
      if (marks.hairpin && !marks.hairpin.start) {
        return { error: "hairpin needs a note", tok: marks.hairpin.kind };
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
          return { error: "hairpin needs a note", tok: marks.hairpin.kind };
        }
        marks.hairpin.end = prevTimed;
        marks.hairpin.closedByDynamic = false;
        marks.hairpins.push(marks.hairpin);
      }
      marks.hairpin = { kind: tok, start: null, end: null, closedByDynamic: false };
      i++;
      continue;
    }
    if (tok === "%") {
      if (!opts.allowBarline) {
        return { error: "simile inside tuplet", tok: tok };
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
        return { error: "tie needs a note before it", tok: tok };
      }
      prev.tieToNext = true;
      i++;
      continue;
    }
    if (tok === "|") {
      if (!opts.allowBarline) {
        return { error: "barline inside tuplet", tok: tok };
      }
      events.push({ type: "barline" });
      i++;
      continue;
    }
    var one;
    if (tok.charAt(0) === "(") {
      if (!opts.allowTuplet) {
        return { error: "nested tuplet", tok: tok };
      }
      one = staffParseTupletAt(tokens, i, clef);
    } else {
      one = staffParseEventAt(tokens, i, clef);
    }
    if (one.error) {
      return { error: one.error, tok: one.tok };
    }
    staffAttachMarks(one.event, marks);
    sawMusic = true;
    events.push(one.event);
    i = one.next;
  }
  var markDone = staffFinishMarks(marks, events);
  if (markDone && markDone.error) {
    return markDone;
  }
  return {
    events: events,
    sawMusic: sawMusic,
    chordSymbol: (markDone && markDone.chordSymbol) || ""
  };
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
  var notationIsh = staffLooksNotationIsh(tokens);
  function fail(reason, tok) {
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
        return fail("bad @key", dir);
      }
      keyName = parsedKey;
      i++;
      continue;
    }
    if (dir.charAt(0) === "@") {
      return fail("unknown directive", dir);
    }
    break;
  }

  var seq = staffParseSequence(tokens.slice(i), clef, {
    allowBarline: true,
    allowTuplet: true
  });
  if (seq.error) {
    return fail(seq.error, seq.tok);
  }
  var events = seq.events;
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
    return fail(tied.error, tied.tok);
  }

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
    return { ok: false, notationIsh: false, music: "", caption: parts.caption || "" };
  }
  if (/[<&]/.test(music)) {
    return { ok: false, notationIsh: false, music: music, caption: parts.caption || "" };
  }
  var tokens = staffTokenize(music);
  var notationIsh = staffLooksNotationIsh(tokens);
  var ast = parseMusicNotation(music);
  return {
    ok: !!ast,
    notationIsh: notationIsh,
    music: music,
    caption: parts.caption || ""
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
 * Tips for one beam group. Slope follows the first and last note.
 * The line then shifts outward until every stem is at least minStem,
 * so a note that sits off that slope still meets the beam.
 * stemUp is in SVG coordinates (up is a smaller y).
 */
function staffBeamTipYs(xs, ys, stemUp, minStem) {
  var n = xs.length;
  var x0 = xs[0];
  var span = xs[n - 1] - x0;
  var dir = stemUp ? -1 : 1;
  var yStart = ys[0] + dir * minStem;
  var slope = span ? (ys[n - 1] - ys[0]) / span : 0;
  var shift = stemUp ? Infinity : -Infinity;
  var i;
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
    /* Empty line: default treble, key C, meter from Setup (or opts.meter) — clef + time + staff only. */
    ast = {
      source: "",
      clef: "treble",
      keyName: "C",
      keyAlts: staffKeyAlterations("C"),
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
  /* One full head width: opposite-side head clears the main column. */
  var secondShift = 2 * noteHeadRx;
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
  var topStep = bottomStep + 8;
  var minStep = bottomStep;
  var maxStep = topStep;
  /* ^text sits above (chord name). _text sits under (degree, sticking). */
  var hasStackChordLabels = false;
  var hasEventChords = false;
  var hasDynamics = false;
  var hasHairpin = false;
  var hasBelowLabels = false;
  var hasAboveLabels = false;
  var e;
  function staffTouchStep(step) {
    if (step < minStep) {
      minStep = step;
    }
    if (step > maxStep) {
      maxStep = step;
    }
  }
  var spread = [];
  for (e = 0; e < ast.events.length; e++) {
    if (ast.events[e].type === "tuplet") {
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
      staffTouchStep(ev.pitch.step);
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
        staffTouchStep(ev.notes[bn].pitch.step);
        if (ev.notes[bn].label) {
          hasBelowLabels = true;
        }
        if (ev.notes[bn].above) {
          hasAboveLabels = true;
        }
      }
    } else if (ev.type === "stack") {
      for (var p = 0; p < ev.pitches.length; p++) {
        staffTouchStep(ev.pitches[p].step);
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
  var riseAbove = Math.max(0, maxStep - topStep) * half + noteHeadRy;
  var dropBelow = Math.max(0, bottomStep - minStep) * half + noteHeadRy;
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
  var midStep = bottomStep + 4;
  var stemLenEst = lineGap * 3.5;
  var upStemExtra = 0;
  var downStemExtra = 0;
  function staffTipExtra(step, stemUp) {
    if (stemUp) {
      var tipAbove = stemLenEst - (topStep - step) * half;
      if (tipAbove > upStemExtra) {
        upStemExtra = tipAbove;
      }
    } else {
      var tipBelow = stemLenEst - (step - bottomStep) * half;
      if (tipBelow > downStemExtra) {
        downStemExtra = tipBelow;
      }
    }
  }
  for (e = 0; e < spread.length; e++) {
    ev = spread[e];
    if (ev.type === "beam" && ev.notes.length) {
      var beamSum = 0;
      for (bn = 0; bn < ev.notes.length; bn++) {
        beamSum += ev.notes[bn].pitch.step;
      }
      var beamUp = beamSum / ev.notes.length <= midStep;
      for (bn = 0; bn < ev.notes.length; bn++) {
        staffTipExtra(ev.notes[bn].pitch.step, beamUp);
      }
    } else if (ev.type === "note" && staffHasStem(ev.duration)) {
      staffTipExtra(ev.pitch.step, ev.pitch.step <= midStep);
    } else if (ev.type === "stack" && ev.pitches.length && staffHasStem(ev.duration)) {
      var stSum = 0;
      for (p = 0; p < ev.pitches.length; p++) {
        stSum += ev.pitches[p].step;
      }
      staffTipExtra(stSum / ev.pitches.length, stSum / ev.pitches.length <= midStep);
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
      drawTies.push({ from: src.index, to: barCol, step: src.step, hang: true });
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
            drawTies.push({ from: src.index, to: hit.index, step: src.step });
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
      columns.push({ type: "barline" });
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
        slots: Math.max(1, Math.round(remain))
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
        duration: ev.duration || "q"
      };
    } else if (ev.type === "beam") {
      var bid = nextBeamId++;
      var bi;
      var beamFirst = columns.length;
      var prevTie = -1;
      tupRunId = 0;
      for (bi = 0; bi < ev.notes.length; bi++) {
        var noteCol = columns.length;
        columns.push({
          type: "note",
          pitch: ev.notes[bi].pitch,
          label: ev.notes[bi].label || "",
          above: ev.notes[bi].above || "",
          duration: ev.notes[bi].duration || "q",
          head: ev.notes[bi].head || (ev.notes[bi].pitch && ev.notes[bi].pitch.head) || "",
          beamId: bid,
          explicit: true,
          scale: tup ? tup.scale : 1,
          articulations: ev.notes[bi].articulations || []
        });
        if (prevTie >= 0) {
          drawTies.push({
            from: prevTie,
            to: noteCol,
            step: ev.notes[bi - 1].pitch.step
          });
        }
        prevTie = ev.notes[bi].tieToNext ? noteCol : -1;
      }
      staffRememberTies(ev, beamFirst, columns.length - 1);
      staffMarkHeadTail(ev, beamFirst, columns.length - 1);
      staffAdvanceSimile(staffEventQuarters(ev) * scale);
      return;
    } else if (ev.type === "tuplet") {
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
  var noteEvents = [];
  var noteEventCols = [];
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type !== "barline") {
      noteEvents.push(columns[e]);
      noteEventCols.push(e);
    }
  }
  var slot = role === "reel" ? 28 : 34;
  if (noteEvents.length >= 6) {
    slot = role === "reel" ? 24 : 30;
  }
  /* Stacks + chord names need more horizontal room so symbols don't collide. */
  if (hasStackChordLabels && stackCount >= 2) {
    slot = Math.max(slot, role === "reel" ? 44 : 56);
  } else if (stackCount >= 2) {
    slot = Math.max(slot, role === "reel" ? 36 : 46);
  } else if (hasStackChordLabels) {
    slot = Math.max(slot, role === "reel" ? 36 : 44);
  }
  /*
   * Slash heads are wider than oval noteheads; keep the same edge-to-edge
   * padding as regular notes by growing the column by the advance difference.
   */
  var slashHeadMax = 0;
  var dottedNoteCount = 0;
  for (e = 0; e < noteEvents.length; e++) {
    if (noteEvents[e].head === "slash") {
      slashHeadMax = Math.max(
        slashHeadMax,
        staffGlyphAdvance(staffSlashHeadGlyph(noteEvents[e].duration), lineGap)
      );
    }
    if (staffDurationDotted(noteEvents[e].duration)) {
      dottedNoteCount++;
    }
  }
  if (slashHeadMax > 0) {
    slot += slashHeadMax - staffGlyphAdvance("noteheadBlack", lineGap);
  }
  if (dottedNoteCount > 0) {
    slot += lineGap * 0.3;
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

  /*
   * Left overhang of accidentals from the note column center (0 if none).
   * Only the excess beyond the normal slot gap is inserted — not the full width —
   * so spacing tracks the ink actually used.
   */
  function staffEventStemUpGuess(ev) {
    if (ev.type === "note") {
      return staffPitchY(ev.pitch.step, ast.clef, staffTop, lineGap) >= staffTop + 2 * lineGap;
    }
    if (ev.type !== "stack" || !ev.pitches.length) {
      return true;
    }
    var sum = 0;
    var pi;
    for (pi = 0; pi < ev.pitches.length; pi++) {
      sum += ev.pitches[pi].step;
    }
    return (
      staffPitchY(sum / ev.pitches.length, ast.clef, staffTop, lineGap) >=
      staffTop + 2 * lineGap
    );
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
      var one = staffWrittenAccidental(ev.pitch, ast.keyAlts);
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

  function staffEventAccInset(ev, isFirst) {
    var overhang = staffEventAccOverhang(ev);
    if (!overhang) {
      return 0;
    }
    /*
     * First column can use part of the post-meter pad; later columns only the
     * gap left by the previous note's slot.
     */
    var freeLeft = isFirst ? slot / 2 + lineGap * 1.2 : slot - noteHeadRx;
    var clear = lineGap * 0.35;
    return Math.max(0, overhang + clear - freeLeft);
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
    accInsets[e] = staffEventAccInset(noteEvents[e], e === 0);
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
  var highestNoteY = staffPitchY(maxStep, ast.clef, staffTop, lineGap);
  var lowestNoteY = staffPitchY(minStep, ast.clef, staffTop, lineGap);
  var chordY = Math.min(staffTop, highestNoteY - noteHeadRy) - 10;
  var labelY =
    Math.max(staffTop + staffHeight, lowestNoteY + noteHeadRy) +
    10 +
    labelSize * 0.35;

  function drawLedger(x, step) {
    var bottomStep = staffBottomLineStep(ast.clef);
    var topStep = bottomStep + 8;
    var s;
    if (step < bottomStep) {
      for (s = bottomStep - 2; s >= step; s -= 2) {
        var ly = staffPitchY(s, ast.clef, staffTop, lineGap);
        svg.appendChild(staffSvgEl("line", {
          x1: String(x - noteHeadRx - 3),
          y1: String(ly),
          x2: String(x + noteHeadRx + 3),
          y2: String(ly),
          stroke: "currentColor",
          "stroke-width": "1.2"
        }));
      }
    }
    if (step > topStep) {
      for (s = topStep + 2; s <= step; s += 2) {
        ly = staffPitchY(s, ast.clef, staffTop, lineGap);
        svg.appendChild(staffSvgEl("line", {
          x1: String(x - noteHeadRx - 3),
          y1: String(ly),
          x2: String(x + noteHeadRx + 3),
          y2: String(ly),
          stroke: "currentColor",
          "stroke-width": "1.2"
        }));
      }
    }
  }

  var staffMidY = staffTop + 2 * lineGap;
  var stemLen = lineGap * 3.5;
  /*
   * Slash: stem from the bottom-left tip of the glyph, down ~1.5 spaces
   * past the bottom staff line (same tip depth as a normal stem).
   */
  var slashStemLen = stemLen;
  var slashStemFrom = lineGap;
  var hxStem = noteHeadRx * 0.85;
  var beamThick = lineGap * 0.5;
  var beamGap = lineGap * 0.35;

  /* Resolve explicit + auto beam groups over columns. */
  var beamGroups = [];
  var colGroup = [];
  for (e = 0; e < columns.length; e++) {
    colGroup[e] = -1;
  }
  var explicitMap = {};
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type === "note" && columns[e].beamId) {
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

  /* Column centers, shared by label clearance and note drawing. */
  var colX = [];
  var layoutX = notesStartX;
  var layoutIndex = 0;
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type === "barline") {
      colX[e] = layoutX;
      continue;
    }
    var span = columns[e].slots || 1;
    layoutX += accInsets[layoutIndex] || 0;
    colX[e] = layoutX + (span * slot) / 2;
    layoutX += span * slot;
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
      predNy[e] = staffPitchY(columns[e].pitch.step, ast.clef, staffTop, lineGap);
    } else if (columns[e].type === "stack" && columns[e].pitches.length) {
      var ps = 0;
      for (p = 0; p < columns[e].pitches.length; p++) {
        ps += columns[e].pitches[p].step;
      }
      predNy[e] = staffPitchY(
        ps / columns[e].pitches.length,
        ast.clef,
        staffTop,
        lineGap
      );
    }
  }
  /* Stem tip y and direction per stemmed column, as drawn below. */
  var predTip = [];
  var predUp = [];
  var predBeamed = [];
  var inkGi;
  var inkGIdx;
  for (inkGIdx = 0; inkGIdx < beamGroups.length; inkGIdx++) {
    var inkGrp = beamGroups[inkGIdx];
    if (inkGrp.indices.length < 2) {
      continue;
    }
    var inkSum = 0;
    var inkSlash = false;
    for (inkGi = 0; inkGi < inkGrp.indices.length; inkGi++) {
      inkSum += predNy[inkGrp.indices[inkGi]];
      if (columns[inkGrp.indices[inkGi]].head === "slash") {
        inkSlash = true;
      }
    }
    var inkUp = inkSlash ? false : inkSum / inkGrp.indices.length >= staffMidY;
    var inkStemLen = inkSlash ? slashStemLen : stemLen;
    var inkXs = [];
    var inkYs = [];
    for (inkGi = 0; inkGi < inkGrp.indices.length; inkGi++) {
      var inkCol = inkGrp.indices[inkGi];
      inkXs.push(staffStemX(colX[inkCol], inkUp, columns[inkCol].head === "slash"));
      inkYs.push(predNy[inkCol]);
    }
    var inkTips = staffBeamTipYs(inkXs, inkYs, inkUp, inkStemLen);
    for (inkGi = 0; inkGi < inkTips.length; inkGi++) {
      var inkTip = inkTips[inkGi];
      predTip[inkGrp.indices[inkGi]] = inkTip;
      predUp[inkGrp.indices[inkGi]] = inkUp;
      predBeamed[inkGrp.indices[inkGi]] = true;
      if (inkUp) {
        if (inkTip - beamThick < inkTop) {
          inkTop = inkTip - beamThick;
        }
      } else if (inkTip + beamThick > inkBot) {
        inkBot = inkTip + beamThick;
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
    var inkStemUp = columns[e].head === "slash" ? false : inkNy >= staffMidY;
    var soloLen = columns[e].head === "slash" ? slashStemLen : stemLen;
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
      stackYs.push(staffPitchY(inkStack.pitches[p].step, ast.clef, staffTop, lineGap));
    }
    var stackUp = staffEventStemUpGuess(inkStack);
    var stackTip = stackUp
      ? Math.min.apply(null, stackYs) - stemLen
      : Math.max.apply(null, stackYs) + stemLen;
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
      var quarterRx = staffGlyphAdvance("noteheadSlash", lineGap) / 2;
      return toRight
        ? staffGlyphAdvance(staffSlashHeadGlyph(col.duration), lineGap) - quarterRx
        : quarterRx;
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
      var py = staffPitchY(pitches[pi].step, ast.clef, staffTop, lineGap);
      hi = Math.min(hi, py);
      lo = Math.max(lo, py);
      if (col.head !== "slash" && staffWrittenAccidental(pitches[pi], ast.keyAlts)) {
        hasAcc = true;
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
      var xa = staffStemX(colX[tFirst], tAbove, columns[tFirst].head === "slash");
      var xb = staffStemX(colX[tLast], tAbove, columns[tLast].head === "slash");
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
    sym.textContent = staffFormatChordText(String(ast.chordSymbol).replace(/_/g, " "));
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

  /* Slash stems attach at the glyph’s bottom-left tip. */
  function drawStemTo(x, ny, tipY, up, slash) {
    var sx = staffStemX(x, up, slash);
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

  function drawAugmentationDot(xRight, ny, step) {
    /* Dot sits in the space above a staff line (or on the note’s space). */
    var onLine = (step - bottomStep) % 2 === 0;
    var dotY = onLine ? ny - lineGap / 2 : ny;
    staffPlaceGlyph(svg, "augmentationDot", xRight, dotY, lineGap);
  }

  function drawNotehead(x, step, dur, displayAcc, accCol, headStyle) {
    var slash = headStyle === "slash" || headStyle === "beat";
    if (!slash) {
      drawLedger(x, step);
    }
    var ny = staffPitchY(step, ast.clef, staffTop, lineGap);
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
        ast.clef,
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
    /* A rhythm slash shares the quarter slash's bottom-left tip, where the stem sits. */
    var headLeft = headStyle === "slash" ? x - staffGlyphAdvance("noteheadSlash", lineGap) / 2 : x - headRx;
    staffPlaceGlyph(svg, headName, headLeft, ny, lineGap);
    var dotRight = null;
    if (staffDurationDotted(dur)) {
      var dotX = headLeft + headAdv + lineGap * 0.12;
      drawAugmentationDot(dotX, ny, step);
      dotRight = dotX + staffGlyphAdvance("augmentationDot", lineGap);
    }
    return {
      ny: ny,
      headRx: headRx,
      left: headLeft,
      right: headLeft + headAdv,
      accLeft: accLeft,
      dotRight: dotRight
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
  var colStem = [];
  /* Notehead edges per column, keyed by staff step, so a tie can find its pitch. */
  var headInk = [];

  function staffStoreHead(colIndex, step, drawn, dur, slash) {
    if (!drawn) {
      return;
    }
    if (!headInk[colIndex]) {
      headInk[colIndex] = {};
    }
    headInk[colIndex][step] = {
      left: drawn.left,
      right: drawn.right,
      y: drawn.ny,
      dotted: staffDurationDotted(dur),
      slash: !!slash,
      accLeft: typeof drawn.accLeft === "number" ? drawn.accLeft : null,
      dotRight: typeof drawn.dotRight === "number" ? drawn.dotRight : null,
      onLine: (step - bottomStep) % 2 === 0
    };
  }

  function staffDrawBelowText(x, text) {
    var node = staffSvgEl("text", {
      x: String(x),
      y: String(labelY),
      "font-size": String(labelSize),
      fill: "currentColor",
      "text-anchor": "middle"
    });
    node.textContent = staffFormatDegreeLabel(text);
    svg.appendChild(node);
  }

  function staffDrawAboveText(x, text) {
    var node = staffSvgEl("text", {
      x: String(x),
      y: String(chordY),
      "font-size": String(chordSize),
      fill: "currentColor",
      "text-anchor": "middle"
    });
    node.textContent = staffFormatChordText(text);
    svg.appendChild(node);
  }

  for (e = 0; e < columns.length; e++) {
    ev = columns[e];
    if (ev.type === "barline") {
      var bx = colX[e];
      svg.appendChild(staffSvgEl("line", {
        x1: String(bx),
        y1: String(staffTop),
        x2: String(bx),
        y2: String(staffTop + staffHeight),
        stroke: "currentColor",
        "stroke-width": "1.6"
      }));
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
      if (staffDurationDotted(ev.duration)) {
        /* Rest dots sit in the third space (or beside the rest). */
        drawAugmentationDot(cx + restAdv / 2 + lineGap * 0.12, restY, bottomStep + 5);
      }
      if (ev.label) {
        staffDrawBelowText(cx, ev.label);
      }
      if (ev.above) {
        staffDrawAboveText(cx, ev.above);
      }
    } else if (ev.type === "note") {
      var isSlash = ev.head === "slash";
      var isBeat = ev.head === "beat";
      var disp = isSlash || isBeat ? null : staffWrittenAccidental(ev.pitch, ast.keyAlts);
      var drawn = drawNotehead(cx, ev.pitch.step, ev.duration || "q", disp, 0, ev.head || "");
      staffStoreHead(e, ev.pitch.step, drawn, ev.duration || "q", isSlash || isBeat);
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
        var up = isSlash ? false : ny >= staffMidY;
        var noteStemLen = isSlash ? slashStemLen : stemLen;
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
      if (ev.label) {
        staffDrawBelowText(cx, ev.label);
      }
      if (ev.above) {
        staffDrawAboveText(cx, ev.above);
      }
    } else if (ev.type === "stack") {
      var stackDur = ev.duration || (ev.pitches[0] && ev.pitches[0].duration) || "q";
      var stemUp = staffEventStemUpGuess(ev);
      var offsets = staffStackSecondOffsets(ev.pitches, stemUp, secondShift);
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
      for (p = 0; p < ev.pitches.length; p++) {
        var drawnP = drawNotehead(
          cx + offsets[p],
          ev.pitches[p].step,
          ev.pitches[p].duration || stackDur,
          null,
          0,
          ""
        );
        staffStoreHead(
          e,
          ev.pitches[p].step,
          drawnP,
          ev.pitches[p].duration || stackDur,
          false
        );
        stemYs.push(drawnP.ny);
      }
      for (p = 0; p < ev.pitches.length; p++) {
        if (accCenters[p] === null) {
          continue;
        }
        var stackAccName = staffAccidentalGlyphName(staffAccKind(accCols[p].acc));
        var stackAccAdv = staffGlyphAdvance(stackAccName || "accidentalSharp", lineGap);
        if (headInk[e] && headInk[e][ev.pitches[p].step]) {
          headInk[e][ev.pitches[p].step].accLeft = accCenters[p] - stackAccAdv / 2;
        }
        staffDrawAccidental(
          svg,
          accCenters[p],
          ev.pitches[p].step,
          ast.clef,
          staffTop,
          lineGap,
          accCols[p].acc
        );
      }
      if (staffHasStem(stackDur) && stemYs.length) {
        var hiY = Math.min.apply(null, stemYs);
        var loY = Math.max.apply(null, stemYs);
        /* Stem on the main column; cover all head centers vertically. */
        if (stemUp) {
          svg.appendChild(
            staffSvgEl("line", {
              x1: String(cx + hxStem),
              y1: String(loY),
              x2: String(cx + hxStem),
              y2: String(hiY - stemLen),
              stroke: "currentColor",
              "stroke-width": "1.4"
            })
          );
        } else {
          svg.appendChild(
            staffSvgEl("line", {
              x1: String(cx - hxStem),
              y1: String(hiY),
              x2: String(cx - hxStem),
              y2: String(loY + stemLen),
              stroke: "currentColor",
              "stroke-width": "1.4"
            })
          );
        }
        if (staffIsShortDuration(stackDur)) {
          staffPlaceGlyph(
            svg,
            staffFlagGlyph(stackDur, stemUp),
            stemUp ? cx + hxStem : cx - hxStem,
            stemUp ? hiY - stemLen : loY + stemLen,
            lineGap
          );
        }
      }
      if (ev.above) {
        staffDrawAboveText(cx, ev.above);
      }
      if (ev.label) {
        staffDrawBelowText(cx, ev.label);
      }
      for (p = 0; p < ev.pitches.length; p++) {
        if (ev.pitches[p].above) {
          staffDrawAboveText(cx + offsets[p], ev.pitches[p].above);
        }
        if (ev.pitches[p].label) {
          staffDrawBelowText(cx + offsets[p], ev.pitches[p].label);
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
    var sumY = 0;
    var gi;
    var slashBeam = false;
    for (gi = 0; gi < grp.indices.length; gi++) {
      sumY += colNy[grp.indices[gi]];
      if (columns[grp.indices[gi]].head === "slash") {
        slashBeam = true;
      }
    }
    var groupUp = slashBeam ? false : sumY / grp.indices.length >= staffMidY;
    var beamStemLen = slashBeam ? slashStemLen : stemLen;
    var beamXs = [];
    var beamYs = [];
    for (gi = 0; gi < grp.indices.length; gi++) {
      var beamCol = grp.indices[gi];
      beamXs.push(staffStemX(colX[beamCol], groupUp, columns[beamCol].head === "slash"));
      beamYs.push(colNy[beamCol]);
    }
    var tipYs = staffBeamTipYs(beamXs, beamYs, groupUp, beamStemLen);
    var tips = [];
    for (gi = 0; gi < grp.indices.length; gi++) {
      var ci = grp.indices[gi];
      tips.push(
        drawStemTo(
          colX[ci],
          colNy[ci],
          tipYs[gi],
          groupUp,
          columns[ci].head === "slash"
        )
      );
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
          var stub = slot * 0.35;
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
      return colNy[colIndex] >= staffMidY;
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
      var fromBox = headInk[fromCol] && headInk[fromCol][step];
      var toBox = headInk[toCol] && headInk[toCol][step];
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
    var fromHeads = headInk[tie.from];
    var toHeads = headInk[tie.to];
    var fromBox;
    var toBox;
    var above;
    var slashTie;
    var x1;
    var x2;
    if (tie.hang) {
      if (!fromHeads || !fromHeads[tie.step]) {
        continue;
      }
      fromBox = fromHeads[tie.step];
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
      if (!fromHeads || !toHeads || !fromHeads[tie.step] || !toHeads[tie.step]) {
        continue;
      }
      fromBox = fromHeads[tie.step];
      toBox = toHeads[tie.step];
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
          ((x1 + x2) / 2).toFixed(2) +
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
    var sym = staffSvgEl("text", {
      x: String(x),
      y: String(chordY),
      "font-size": String(chordSize),
      fill: "currentColor",
      "text-anchor": "start",
      "class": "staff-chord"
    });
    sym.textContent = staffFormatChordText(String(raw || "").replace(/_/g, " "));
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

  function staffDrawArticulation(x, y, kind) {
    var g;
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
    svg.appendChild(staffSvgEl("line", {
      x1: String(x - lineGap * 0.32),
      y1: String(y + lineGap * 0.18),
      x2: String(x),
      y2: String(y - lineGap * 0.2),
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "class": "staff-artic"
    }));
    svg.appendChild(staffSvgEl("line", {
      x1: String(x + lineGap * 0.32),
      y1: String(y + lineGap * 0.18),
      x2: String(x),
      y2: String(y - lineGap * 0.2),
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "class": "staff-artic"
    }));
  }

  var openHairpin = null;
  for (e = 0; e < columns.length; e++) {
    ev = columns[e];
    if (ev.type === "barline") {
      continue;
    }
    if (ev.chord) {
      staffDrawChordAt(colX[e] - noteHeadRx, ev.chord);
    }
    if (ev.dynamic) {
      staffDrawDynamicAt(colX[e] - noteHeadRx, ev.dynamic);
    }
    if (ev.hairpin) {
      var hx0 = colX[e];
      if (ev.dynamic) {
        hx0 += Math.max(lineGap, ev.dynamic.length * chordSize * 0.5);
      }
      openHairpin = { kind: ev.hairpin, x: hx0 };
    }
    if (ev.hairpinEnd && openHairpin) {
      var hx1 = colX[e];
      if (ev.dynamic) {
        hx1 += Math.max(lineGap, ev.dynamic.length * chordSize * 0.45);
      }
      staffDrawHairpin(openHairpin.x, hx1, openHairpin.kind);
      openHairpin = null;
    }
    if (ev.articulations && ev.articulations.length && typeof colNy[e] === "number") {
      var artUp = staffStemUpAt(e);
      var artDir = artUp ? 1 : -1;
      var artY = colNy[e] + artDir * (noteHeadRy + lineGap * 0.85);
      var artI;
      var artTup;
      if (ev.head === "slash" || ev.head === "beat") {
        artY = colNy[e] - lineGap * 1.7;
        artDir = -1;
      }
      for (artTup = 0; artTup < tuplets.length; artTup++) {
        if (e >= tuplets[artTup].first && e <= tuplets[artTup].last) {
          artY += artDir * lineGap * 0.7;
          break;
        }
      }
      for (artI = 0; artI < ev.articulations.length; artI++) {
        staffDrawArticulation(colX[e], artY, ev.articulations[artI]);
        artY += artDir * lineGap * 0.65;
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

  return svg;
}

clearMusicStaffCache();
