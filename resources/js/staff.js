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

function clearMusicStaffCache() {
  staffAstCache.clear();
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

/* Combine base letter + optional trailing ".". Rejects dotted whole. */
function staffMakeDuration(base, dotted) {
  var b = base || "q";
  if (dotted) {
    if (b === "w") {
      return null;
    }
    return b + ".";
  }
  return b;
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
  } else if (base === "s") {
    q = 0.25;
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
function staffPlaceGlyph(svg, name, x, y, space) {
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
  return s;
}

function staffFormatDegreeLabel(raw) {
  if (!raw) {
    return "";
  }
  var s = String(raw);
  if (s.indexOf("bb") === 0 || s.indexOf("\u266D\u266D") === 0) {
    return "\u266D\u266D" + s.replace(/^(bb|\u266D\u266D)/, "");
  }
  if (s.indexOf("##") === 0 || s.indexOf("\u266F\u266F") === 0) {
    return "\u266F\u266F" + s.replace(/^(##|\u266F\u266F)/, "");
  }
  if (/^[b#\u266D\u266F]/.test(s)) {
    var first = s.charAt(0);
    var rest = s.slice(1);
    if (first === "b" || first === "\u266D") {
      return "\u266D" + rest;
    }
    if (first === "#" || first === "\u266F") {
      return "\u266F" + rest;
    }
  }
  return staffFormatChordText(s);
}

function staffParsePitchToken(token) {
  var m =
    /^([A-Ga-g])(##|bb|x|X|#|b|n|\u266F|\u266D|\u266E)?(\d)([whqes]?)(\.?)(!?)(?:_(.+))?$/.exec(
      token
    );
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
  var force = m[6] === "!";
  return {
    letter: letter,
    accidental: acc,
    octave: octave,
    duration: dur,
    force: force,
    label: m[7] || "",
    step: STAFF_LETTER_STEPS[letter] + octave * 7
  };
}

function staffParseRestToken(token) {
  var m = /^r([whqes]?)(\.?)$/i.exec(token);
  if (!m) {
    return null;
  }
  var dur = staffMakeDuration(m[1] || "q", m[2] === ".");
  if (!dur) {
    return null;
  }
  return { type: "rest", duration: dur };
}

/* Pitchless rhythmic slash on the middle staff line. */
function staffParseSlashToken(token, clef) {
  var m = /^\/([whqes]?)(\.?)(?:_(.+))?$/.exec(token);
  if (!m) {
    return null;
  }
  var dur = staffMakeDuration(m[1] || "q", m[2] === ".");
  if (!dur) {
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
    label: m[3] || "",
    step: step,
    head: "slash"
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
      t === "|" ||
      /^r([whqes]?)(\.?)$/i.test(t) ||
      /^\/([whqes]?)(\.?)(?:_|$)/.test(t) ||
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

function staffParseBeamInner(inner, clef) {
  var parts = inner.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return null;
  }
  var notes = [];
  for (var i = 0; i < parts.length; i++) {
    var p = staffParsePitchToken(parts[i]) || staffParseSlashToken(parts[i], clef || "treble");
    if (!p) {
      return null;
    }
    if (!staffIsShortDuration(p.duration || "q")) {
      return null;
    }
    notes.push({
      type: "note",
      pitch: p,
      label: p.label || "",
      duration: p.duration || "q",
      head: p.head || ""
    });
    p.label = "";
  }
  return notes;
}

function staffParseStackInner(inner) {
  var parts = inner.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return null;
  }
  var pitches = [];
  for (var i = 0; i < parts.length; i++) {
    var p = staffParsePitchToken(parts[i]);
    if (!p || p.label) {
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

function parseMusicNotation(source) {
  if (typeof source !== "string") {
    return null;
  }
  var raw = source.trim();
  if (!raw || /[<&]/.test(raw)) {
    return null;
  }
  if (staffAstCache.has(raw)) {
    return staffAstCache.get(raw);
  }
  var tokens = raw.split(/\s+/).filter(Boolean);
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
  var clef = "treble";
  var keyName = "C";
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
  if (i < tokens.length && tokens[i].charAt(0) === "^") {
    chordSymbol = tokens[i].slice(1);
    if (!chordSymbol) {
      return fail("empty chord symbol", tokens[i]);
    }
    i++;
  }

  var events = [];
  var sawMusic = false;
  while (i < tokens.length) {
    var tok = tokens[i];
    if (tok === "|") {
      events.push({ type: "barline" });
      i++;
      continue;
    }
    var rest = staffParseRestToken(tok);
    if (rest) {
      sawMusic = true;
      events.push(rest);
      i++;
      continue;
    }
    if (tok.charAt(0) === "{") {
      if (tok.indexOf("{", 1) >= 0) {
        return fail("nested beam braces", tok);
      }
      var beamBuf = tok;
      while (beamBuf.indexOf("}") < 0 && i + 1 < tokens.length) {
        i++;
        if (tokens[i].indexOf("{") >= 0) {
          return fail("nested beam braces", tokens[i]);
        }
        beamBuf += " " + tokens[i];
      }
      var beamClose = beamBuf.indexOf("}");
      if (beamClose < 0) {
        return fail("unclosed beam", tok);
      }
      if (beamBuf.slice(beamClose + 1)) {
        return fail("junk after beam", beamBuf.slice(beamClose + 1));
      }
      var beamInner = beamBuf.slice(1, beamClose);
      var beamNotes = staffParseBeamInner(beamInner, clef);
      if (!beamNotes || beamNotes.length < 1) {
        return fail("bad beam pitches (need e/s notes)", beamInner);
      }
      sawMusic = true;
      events.push({ type: "beam", notes: beamNotes });
      i++;
      continue;
    }
    if (tok.charAt(0) === "[") {
      if (tok.indexOf("[", 1) >= 0) {
        return fail("nested stack brackets", tok);
      }
      var buf = tok;
      while (buf.indexOf("]") < 0 && i + 1 < tokens.length) {
        i++;
        if (tokens[i].indexOf("[") >= 0) {
          return fail("nested stack brackets", tokens[i]);
        }
        buf += " " + tokens[i];
      }
      var close = buf.indexOf("]");
      if (close < 0) {
        return fail("unclosed stack", tok);
      }
      var after = buf.slice(close + 1);
      var label = "";
      if (after) {
        if (after.charAt(0) !== "_") {
          return fail("stack label must use _", after);
        }
        label = after.slice(1);
      }
      var inner = buf.slice(1, close);
      var pitches = staffParseStackInner(inner);
      if (!pitches) {
        return fail("bad stack pitches", inner);
      }
      sawMusic = true;
      events.push({
        type: "stack",
        pitches: pitches,
        label: label,
        duration: pitches[0].duration || "q"
      });
      i++;
      continue;
    }
    var pitch = staffParsePitchToken(tok) || staffParseSlashToken(tok, clef);
    if (!pitch) {
      return fail("bad token", tok);
    }
    sawMusic = true;
    events.push({
      type: "note",
      pitch: pitch,
      label: pitch.label || "",
      duration: pitch.duration || "q",
      head: pitch.head || ""
    });
    pitch.label = "";
    i++;
  }

  if (!sawMusic || !events.length) {
    return fail("no notes or rests", null);
  }

  var ast = {
    source: raw,
    clef: clef,
    keyName: keyName,
    keyAlts: staffKeyAlterations(keyName),
    chordSymbol: chordSymbol,
    events: events
  };
  staffAstCache.set(raw, ast);
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

function isMusicNotation(source) {
  var parts = staffExampleParts(source);
  return !!parseMusicNotation(parts.music);
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

function staffReadMeter() {
  var top = typeof beatsPerBar === "number" ? beatsPerBar : 4;
  var bottom = typeof beatUnit === "number" ? beatUnit : 4;
  if (!top || top < 1) {
    top = 4;
  }
  if (bottom !== 1 && bottom !== 2 && bottom !== 4 && bottom !== 8 && bottom !== 16) {
    bottom = 4;
  }
  return { top: top, bottom: bottom };
}

function renderMusicStaff(source, role) {
  var ast = parseMusicNotation(source);
  if (!ast) {
    return null;
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

  var meter = staffReadMeter();
  var key = STAFF_MAJOR_KEYS[ast.keyName] || STAFF_MAJOR_KEYS.C;
  var keyPositions = ast.clef === "bass" ? STAFF_KEY_POS_BASS : STAFF_KEY_POS_TREBLE;
  var keyList = key.kind === "sharp" ? keyPositions.sharp : keyPositions.flat;

  var bottomStep = staffBottomLineStep(ast.clef);
  var topStep = bottomStep + 8;
  var minStep = bottomStep;
  var maxStep = topStep;
  /* Stack `_Dm9` labels are chord symbols (above). Note `_1` labels stay below. */
  var hasStackChordLabels = false;
  var hasBelowLabels = false;
  var e;
  function staffTouchStep(step) {
    if (step < minStep) {
      minStep = step;
    }
    if (step > maxStep) {
      maxStep = step;
    }
  }
  for (e = 0; e < ast.events.length; e++) {
    var ev = ast.events[e];
    if (ev.type === "note") {
      staffTouchStep(ev.pitch.step);
      if (ev.label) {
        hasBelowLabels = true;
      }
    } else if (ev.type === "beam") {
      for (var bn = 0; bn < ev.notes.length; bn++) {
        staffTouchStep(ev.notes[bn].pitch.step);
        if (ev.notes[bn].label) {
          hasBelowLabels = true;
        }
      }
    } else if (ev.type === "stack") {
      for (var p = 0; p < ev.pitches.length; p++) {
        staffTouchStep(ev.pitches[p].step);
      }
      if (ev.label) {
        hasStackChordLabels = true;
      }
    }
  }

  var half = lineGap / 2;
  var riseAbove = Math.max(0, maxStep - topStep) * half + noteHeadRy;
  var dropBelow = Math.max(0, bottomStep - minStep) * half + noteHeadRy;
  var chordSize = role === "reel" ? 14 : 18;
  var labelSize = role === "reel" ? 11 : 13;
  var hasChordText = !!(ast.chordSymbol || hasStackChordLabels);
  var chordBand = hasChordText ? chordSize + 14 : 0;
  var labelBand = hasBelowLabels ? labelSize + 14 : 10;
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
  for (e = 0; e < ast.events.length; e++) {
    ev = ast.events[e];
    if (ev.type === "beam" && ev.notes.length) {
      var beamSum = 0;
      for (bn = 0; bn < ev.notes.length; bn++) {
        beamSum += ev.notes[bn].pitch.step;
      }
      var beamUp = beamSum / ev.notes.length <= midStep;
      for (bn = 0; bn < ev.notes.length; bn++) {
        staffTipExtra(ev.notes[bn].pitch.step, beamUp);
      }
    } else if (ev.type === "note" && staffDurationBase(ev.duration) !== "w") {
      staffTipExtra(ev.pitch.step, ev.pitch.step <= midStep);
    } else if (ev.type === "stack" && ev.pitches.length && staffDurationBase(ev.duration) !== "w") {
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
    dropBelow + labelBand + 8,
    (hasBelowLabels ? downStemExtra : 0) + labelBand + 8
  );

  var staffTop = padTop;
  var staffHeight = 4 * lineGap;
  var contentH = staffTop + staffHeight + padBottom;

  /* Flatten beams into per-note columns for spacing; keep barlines for drawing. */
  var columns = [];
  var stackCount = 0;
  var nextBeamId = 1;
  for (e = 0; e < ast.events.length; e++) {
    ev = ast.events[e];
    if (ev.type === "barline") {
      columns.push({ type: "barline" });
    } else if (ev.type === "rest") {
      columns.push({ type: "rest", duration: ev.duration || "q" });
    } else if (ev.type === "note") {
      columns.push({
        type: "note",
        pitch: ev.pitch,
        label: ev.label || "",
        duration: ev.duration || "q",
        head: ev.head || ev.pitch.head || "",
        beamId: 0,
        explicit: false
      });
    } else if (ev.type === "stack") {
      stackCount++;
      columns.push({
        type: "stack",
        pitches: ev.pitches,
        label: ev.label || "",
        duration: ev.duration || "q"
      });
    } else if (ev.type === "beam") {
      var bid = nextBeamId++;
      var bi;
      for (bi = 0; bi < ev.notes.length; bi++) {
        columns.push({
          type: "note",
          pitch: ev.notes[bi].pitch,
          label: ev.notes[bi].label || "",
          duration: ev.notes[bi].duration || "q",
          head: ev.notes[bi].head || (ev.notes[bi].pitch && ev.notes[bi].pitch.head) || "",
          beamId: bid,
          explicit: true
        });
      }
    }
  }
  var noteEvents = [];
  for (e = 0; e < columns.length; e++) {
    if (columns[e].type !== "barline") {
      noteEvents.push(columns[e]);
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
  var slashNoteCount = 0;
  var dottedNoteCount = 0;
  for (e = 0; e < noteEvents.length; e++) {
    if (noteEvents[e].head === "slash") {
      slashNoteCount++;
    }
    if (staffDurationDotted(noteEvents[e].duration)) {
      dottedNoteCount++;
    }
  }
  if (slashNoteCount > 0) {
    slot +=
      staffGlyphAdvance("noteheadSlash", lineGap) -
      staffGlyphAdvance("noteheadBlack", lineGap);
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
  var timeW = timeCommon
    ? staffGlyphAdvance("timeSigCommon", timeSpaceProbe)
    : timeCut
      ? staffGlyphAdvance("timeSigCutCommon", timeSpaceProbe)
      : Math.max(
          staffTimeRowWidth(timeTopNames, timeSpaceProbe),
          staffTimeRowWidth(timeBotNames, timeSpaceProbe)
        );
  var timeX = cursorX + timeW / 2;
  /* Extra room after meter so note accidentals / chord symbols clear the signature. */
  cursorX += timeW + lineGap * 2.4;
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
      if (ev.head === "slash" || (ev.pitch && ev.pitch.head === "slash")) {
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

  var accInsets = [];
  var accInsetTotal = 0;
  for (e = 0; e < noteEvents.length; e++) {
    accInsets[e] = staffEventAccInset(noteEvents[e], e === 0);
    accInsetTotal += accInsets[e];
  }
  var notesWidth = Math.max(1, noteEvents.length) * slot + accInsetTotal;
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

  /*
   * Chord symbols (^… and stack _Dm9) above; degree labels below.
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
    var colDur = staffDurationQuarters(col.duration || "q");
    if (col.type === "stack") {
      flushAutoRun();
      posQ += colDur;
      continue;
    }
    if (col.type === "rest") {
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
    layoutX += accInsets[layoutIndex] || 0;
    colX[e] = layoutX + slot / 2;
    layoutX += slot;
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
    if (columns[e].type !== "note" || staffDurationBase(columns[e].duration) === "w") {
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
    if (inkStemUp) {
      if (soloTip < inkTop) {
        inkTop = soloTip;
      }
    } else if (soloTip > inkBot) {
      inkBot = soloTip;
    }
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
    sym.textContent = staffFormatChordText(ast.chordSymbol);
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
    var slash = headStyle === "slash";
    if (!slash) {
      drawLedger(x, step);
    }
    var ny = staffPitchY(step, ast.clef, staffTop, lineGap);
    if (displayAcc && !slash) {
      var accName = staffAccidentalGlyphName(staffAccKind(displayAcc));
      var accAdv = staffGlyphAdvance(accName || "accidentalSharp", lineGap);
      var accGap = lineGap * 0.35;
      var colPitch = accAdv + lineGap * 0.2;
      staffDrawAccidental(
        svg,
        x - noteHeadRx - accGap - accAdv / 2 - (accCol || 0) * colPitch,
        step,
        ast.clef,
        staffTop,
        lineGap,
        displayAcc
      );
    }
    var headName = slash ? "noteheadSlash" : staffDurationGlyph(dur || "q");
    var headAdv = staffGlyphAdvance(headName, lineGap);
    var headRx = headAdv / 2;
    staffPlaceGlyph(svg, headName, x - headRx, ny, lineGap);
    if (staffDurationDotted(dur)) {
      drawAugmentationDot(x + headRx + lineGap * 0.12, ny, step);
    }
    return { ny: ny, headRx: headRx };
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

    if (ev.type === "rest") {
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
    } else if (ev.type === "note") {
      var isSlash = ev.head === "slash";
      var disp = isSlash ? null : staffWrittenAccidental(ev.pitch, ast.keyAlts);
      var drawn = drawNotehead(cx, ev.pitch.step, ev.duration || "q", disp, 0, ev.head || "");
      var ny = drawn.ny;
      colNy[e] = ny;
      var g = colGroup[e];
      var beamed =
        g >= 0 && beamGroups[g] && beamGroups[g].indices.length >= 2;
      if (staffDurationBase(ev.duration || "q") === "w") {
        /* whole: no stem */
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
        var lt = staffSvgEl("text", {
          x: String(cx),
          y: String(labelY),
          "font-size": String(labelSize),
          fill: "currentColor",
          "text-anchor": "middle"
        });
        lt.textContent = staffFormatDegreeLabel(ev.label);
        svg.appendChild(lt);
      }
    } else if (ev.type === "stack") {
      var stackDur = ev.duration || ev.pitches[0].duration || "q";
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
        var nyP = drawNotehead(
          cx + offsets[p],
          ev.pitches[p].step,
          ev.pitches[p].duration || stackDur,
          null,
          0,
          ""
        ).ny;
        stemYs.push(nyP);
      }
      for (p = 0; p < ev.pitches.length; p++) {
        if (accCenters[p] === null) {
          continue;
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
      if (staffDurationBase(stackDur) !== "w" && stemYs.length) {
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
      }
      if (ev.label) {
        var sl = staffSvgEl("text", {
          x: String(cx),
          y: String(chordY),
          "font-size": String(chordSize),
          fill: "currentColor",
          "text-anchor": "middle"
        });
        sl.textContent = staffFormatChordText(ev.label);
        svg.appendChild(sl);
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
          if (to + 1 < tips.length) {
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

  /*
   * A shifted beam can sit past the first pad guess. Grow the viewBox
   * so the beam and its labels stay inside the svg.
   */
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
