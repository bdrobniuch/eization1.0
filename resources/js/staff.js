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

function staffDurationGlyph(dur) {
  if (dur === "w") {
    return "noteheadWhole";
  }
  if (dur === "h") {
    return "noteheadHalf";
  }
  return "noteheadBlack";
}

function staffRestGlyph(dur) {
  if (dur === "w") {
    return "restWhole";
  }
  if (dur === "h") {
    return "restHalf";
  }
  if (dur === "e") {
    return "rest8th";
  }
  if (dur === "s") {
    return "rest16th";
  }
  return "restQuarter";
}

/* Duration in quarter-note units. */
function staffDurationQuarters(dur) {
  if (dur === "w") {
    return 4;
  }
  if (dur === "h") {
    return 2;
  }
  if (dur === "e") {
    return 0.5;
  }
  if (dur === "s") {
    return 0.25;
  }
  return 1;
}

function staffIsShortDuration(dur) {
  return dur === "e" || dur === "s";
}

function staffFlagGlyph(dur, stemUp) {
  if (dur === "s") {
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
    /^([A-Ga-g])(##|bb|x|X|#|b|n|\u266F|\u266D|\u266E)?(\d)([whqes]?)(!?)(?:_(.+))?$/.exec(
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
  var dur = m[4] || "q";
  var force = m[5] === "!";
  return {
    letter: letter,
    accidental: acc,
    octave: octave,
    duration: dur,
    force: force,
    label: m[6] || "",
    step: STAFF_LETTER_STEPS[letter] + octave * 7
  };
}

function staffParseRestToken(token) {
  var m = /^r([whqes]?)$/i.exec(token);
  if (!m) {
    return null;
  }
  return { type: "rest", duration: m[1] || "q" };
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
      /^r([whqes]?)$/i.test(t) ||
      /* Pitch-like (letter + octave), not prose like "Major". */
      /^[A-Ga-g](##|bb|x|X|#|b|n|\u266F|\u266D|\u266E)?\d/.test(t)
    ) {
      return true;
    }
  }
  return false;
}

/*
 * Horizontal offsets for seconds in a stack. Stem-up: first displacement goes left
 * (away from the stem on the right); stem-down: first goes right.
 */
function staffStackSecondOffsets(pitches, stemUp, secondShift) {
  var offsets = [];
  var prevStep = null;
  var side = stemUp ? -1 : 1;
  var i;
  for (i = 0; i < pitches.length; i++) {
    var st = pitches[i].step;
    if (prevStep !== null && st - prevStep <= 1) {
      offsets[i] = side * secondShift;
      side = -side;
    } else {
      offsets[i] = 0;
      side = stemUp ? -1 : 1;
    }
    prevStep = st;
  }
  return offsets;
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

function staffParseBeamInner(inner) {
  var parts = inner.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return null;
  }
  var notes = [];
  for (var i = 0; i < parts.length; i++) {
    var p = staffParsePitchToken(parts[i]);
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
      duration: p.duration || "q"
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
      var beamNotes = staffParseBeamInner(beamInner);
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
    var pitch = staffParsePitchToken(tok);
    if (!pitch) {
      return fail("bad token", tok);
    }
    sawMusic = true;
    events.push({
      type: "note",
      pitch: pitch,
      label: pitch.label || "",
      duration: pitch.duration || "q"
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

function isMusicNotation(source) {
  return !!parseMusicNotation(source);
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
  /* Seconds in a stack: keep displaced heads snug against neighbors (not stem). */
  var secondShift = noteHeadRx * 1.15;
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
  var chordBand = ast.chordSymbol || hasStackChordLabels ? chordSize + 14 : 0;
  var labelBand = hasBelowLabels ? labelSize + 16 : 10;
  /* Clefs overhang the staff (~1.5–2 spaces each side for treble). */
  var clefOverhang = lineGap * 2.2;
  padTop = Math.max(padTop, clefOverhang, riseAbove + chordBand + 8);
  padBottom = Math.max(padBottom, clefOverhang, dropBelow + labelBand + 8);

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
    var need = 0;
    var pi;
    for (pi = 0; pi < ev.pitches.length; pi++) {
      if (!cols[pi].acc) {
        continue;
      }
      var aAdv = staffGlyphAdvance(
        staffAccidentalGlyphName(staffAccKind(cols[pi].acc)) || "accidentalSharp",
        lineGap
      );
      var colPitch = aAdv + lineGap * 0.2;
      var leftOfCx =
        -offs[pi] + noteHeadRx + accGap + aAdv + cols[pi].col * colPitch;
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
   * Chord symbols (^… and stack _Dm9) always above the staff / high ledgers.
   * Degree labels on single notes (Bb3_1) stay below.
   */
  var highestNoteY = staffPitchY(maxStep, ast.clef, staffTop, lineGap);
  var lowestNoteY = staffPitchY(minStep, ast.clef, staffTop, lineGap);
  var chordClearY = Math.min(staffTop, highestNoteY - noteHeadRy);
  var chordY = chordClearY - 10;
  var labelClearY = Math.max(staffTop + staffHeight, lowestNoteY + noteHeadRy);
  var labelY = labelClearY + 14 + labelSize * 0.35;

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

  var noteIndex = 0;
  var noteCursorX = notesStartX;

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

  function drawStemTo(x, ny, tipY, up) {
    var sx = up ? x + hxStem : x - hxStem;
    svg.appendChild(
      staffSvgEl("line", {
        x1: String(sx),
        y1: String(ny),
        x2: String(sx),
        y2: String(tipY),
        stroke: "currentColor",
        "stroke-width": "1.4"
      })
    );
    return { x: sx, y: tipY, up: up };
  }

  function drawNotehead(x, step, dur, displayAcc, accCol) {
    drawLedger(x, step);
    var ny = staffPitchY(step, ast.clef, staffTop, lineGap);
    if (displayAcc) {
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
    var headName = staffDurationGlyph(dur || "q");
    var headAdv = staffGlyphAdvance(headName, lineGap);
    staffPlaceGlyph(svg, headName, x - headAdv / 2, ny, lineGap);
    return ny;
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

  /* Per-column layout positions and stem stubs filled while drawing. */
  var colX = [];
  var colNy = [];
  var colStem = [];

  for (e = 0; e < columns.length; e++) {
    ev = columns[e];
    if (ev.type === "barline") {
      var bx = noteCursorX;
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

    noteCursorX += accInsets[noteIndex] || 0;
    var cx = noteCursorX + slot / 2;
    colX[e] = cx;

    if (ev.type === "rest") {
      var restName = staffRestGlyph(ev.duration || "q");
      var restAdv = staffGlyphAdvance(restName, lineGap);
      var restY = staffMidY;
      if (ev.duration === "w") {
        restY = staffTop + lineGap;
      } else if (ev.duration === "h") {
        restY = staffTop + 2 * lineGap;
      }
      staffPlaceGlyph(svg, restName, cx - restAdv / 2, restY, lineGap);
    } else if (ev.type === "note") {
      var disp = staffWrittenAccidental(ev.pitch, ast.keyAlts);
      var ny = drawNotehead(cx, ev.pitch.step, ev.duration || "q", disp, 0);
      colNy[e] = ny;
      var g = colGroup[e];
      var beamed =
        g >= 0 && beamGroups[g] && beamGroups[g].indices.length >= 2;
      if (ev.duration === "w") {
        /* whole: no stem */
      } else if (beamed) {
        /* stems + beams drawn after all heads */
      } else {
        var up = ny >= staffMidY;
        var tip = up ? ny - stemLen : ny + stemLen;
        var stem = drawStemTo(cx, ny, tip, up);
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
      var stemUpGuess = staffEventStemUpGuess(ev);
      var offsets = staffStackSecondOffsets(ev.pitches, stemUpGuess, secondShift);
      var accCols = staffAssignAccidentalColumns(ev.pitches, ast.keyAlts);
      var stemYs = [];
      for (p = 0; p < ev.pitches.length; p++) {
        var nyP = drawNotehead(
          cx + offsets[p],
          ev.pitches[p].step,
          ev.pitches[p].duration || stackDur,
          accCols[p].acc,
          accCols[p].col
        );
        stemYs.push(nyP);
      }
      if (stackDur !== "w" && stemYs.length) {
        var hiY = Math.min.apply(null, stemYs);
        var loY = Math.max.apply(null, stemYs);
        var stemUp = (hiY + loY) / 2 >= staffMidY;
        /* Stem through the main column; cover all head centers vertically. */
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
    noteCursorX += slot;
    noteIndex++;
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
    for (gi = 0; gi < grp.indices.length; gi++) {
      sumY += colNy[grp.indices[gi]];
    }
    var groupUp = sumY / grp.indices.length >= staffMidY;
    var tips = [];
    for (gi = 0; gi < grp.indices.length; gi++) {
      var ci = grp.indices[gi];
      var tipY = groupUp ? colNy[ci] - stemLen : colNy[ci] + stemLen;
      tips.push(drawStemTo(colX[ci], colNy[ci], tipY, groupUp));
    }
    var t0 = tips[0];
    var t1 = tips[tips.length - 1];
    drawBeamSegment(t0.x, t0.y, t1.x, t1.y);
    /* Secondary beam for sixteenths (partial where runs of s meet). */
    var hasSixteenth = false;
    for (gi = 0; gi < grp.indices.length; gi++) {
      if (columns[grp.indices[gi]].duration === "s") {
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
        if (columns[grp.indices[gi]].duration === "s") {
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

  return svg;
}

clearMusicStaffCache();
