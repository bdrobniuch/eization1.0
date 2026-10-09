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
  if (kind === "n" || kind === "natural") {
    return "n";
  }
  return kind;
}

function staffAccidentalGlyphName(acc) {
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
  s = s.replace(/#/g, "\u266F");
  s = s.replace(/b(?=[0-9A-Za-z\u2206\u00B0\u00F8+\-]|$)/g, "\u266D");
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
  var m = /^([A-Ga-g])([#bn\u266F\u266D\u266E]?)(\d)(?:_(.+))?$/.exec(token);
  if (!m) {
    return null;
  }
  var letter = m[1].toUpperCase();
  var acc = staffNormAccidental(m[2]);
  var octave = parseInt(m[3], 10);
  if (isNaN(octave) || octave < 0 || octave > 9) {
    return null;
  }
  return {
    letter: letter,
    accidental: acc,
    octave: octave,
    label: m[4] || "",
    step: STAFF_LETTER_STEPS[letter] + octave * 7
  };
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
  var m = /^([A-Ga-g])([#b]?)$/.exec(s);
  if (!m) {
    return null;
  }
  var name = m[1].toUpperCase() + (m[2] || "");
  if (!STAFF_MAJOR_KEYS[name]) {
    return null;
  }
  return name;
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
  var pitchAlt = 0;
  if (written === "#") {
    pitchAlt = 1;
  } else if (written === "b") {
    pitchAlt = -1;
  } else {
    pitchAlt = 0;
  }
  if (written === "n") {
    return "n";
  }
  if (pitchAlt === keyAlt) {
    return "";
  }
  if (pitchAlt === 0) {
    return "n";
  }
  if (pitchAlt === 1) {
    return "#";
  }
  if (pitchAlt === -1) {
    return "b";
  }
  return "";
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
  var i = 0;
  var clef = "treble";
  var keyName = "C";
  var chordSymbol = "";

  if (tokens[i] === "@treble" || tokens[i] === "@bass") {
    clef = tokens[i] === "@bass" ? "bass" : "treble";
    i++;
  }
  if (i < tokens.length && tokens[i].indexOf("@key=") === 0) {
    var keyRaw = tokens[i].slice(5);
    var parsedKey = staffParseKeyName(keyRaw);
    if (!parsedKey) {
      return null;
    }
    keyName = parsedKey;
    i++;
  }
  if (i < tokens.length && tokens[i].charAt(0) === "^") {
    chordSymbol = tokens[i].slice(1);
    if (!chordSymbol) {
      return null;
    }
    i++;
  }

  var events = [];
  var sawPitch = false;
  while (i < tokens.length) {
    var tok = tokens[i];
    if (tok === "|") {
      events.push({ type: "barline" });
      i++;
      continue;
    }
    if (tok.charAt(0) === "[") {
      var buf = tok;
      while (buf.indexOf("]") < 0 && i + 1 < tokens.length) {
        i++;
        buf += " " + tokens[i];
      }
      var close = buf.indexOf("]");
      if (close < 0) {
        return null;
      }
      var after = buf.slice(close + 1);
      var label = "";
      if (after) {
        if (after.charAt(0) !== "_") {
          return null;
        }
        label = after.slice(1);
      }
      var inner = buf.slice(1, close);
      var pitches = staffParseStackInner(inner);
      if (!pitches) {
        return null;
      }
      sawPitch = true;
      events.push({ type: "stack", pitches: pitches, label: label });
      i++;
      continue;
    }
    var pitch = staffParsePitchToken(tok);
    if (!pitch) {
      return null;
    }
    sawPitch = true;
    events.push({
      type: "note",
      pitch: pitch,
      label: pitch.label || ""
    });
    pitch.label = "";
    i++;
  }

  if (!sawPitch || !events.length) {
    return null;
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
  var noteHeadRx = 6.2;
  var noteHeadRy = 4.4;
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
  for (e = 0; e < ast.events.length; e++) {
    var ev = ast.events[e];
    if (ev.type === "note") {
      if (ev.pitch.step < minStep) {
        minStep = ev.pitch.step;
      }
      if (ev.pitch.step > maxStep) {
        maxStep = ev.pitch.step;
      }
      if (ev.label) {
        hasBelowLabels = true;
      }
    } else if (ev.type === "stack") {
      for (var p = 0; p < ev.pitches.length; p++) {
        if (ev.pitches[p].step < minStep) {
          minStep = ev.pitches[p].step;
        }
        if (ev.pitches[p].step > maxStep) {
          maxStep = ev.pitches[p].step;
        }
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

  var noteEvents = [];
  var stackCount = 0;
  for (e = 0; e < ast.events.length; e++) {
    if (ast.events[e].type === "note" || ast.events[e].type === "stack") {
      noteEvents.push(ast.events[e]);
      if (ast.events[e].type === "stack") {
        stackCount++;
      }
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
  var timeTopNames = staffTimeDigitNames(meter.top);
  var timeBotNames = staffTimeDigitNames(meter.bottom);
  var timeSpaceProbe = lineGap;
  var timeW = timeCommon
    ? staffGlyphAdvance("timeSigCommon", timeSpaceProbe)
    : Math.max(
        staffTimeRowWidth(timeTopNames, timeSpaceProbe),
        staffTimeRowWidth(timeBotNames, timeSpaceProbe)
      );
  var timeX = cursorX + timeW / 2;
  /* Extra room after meter so note accidentals / chord symbols clear the signature. */
  cursorX += timeW + lineGap * 2.4;
  var notesStartX = cursorX;
  var notesWidth = Math.max(1, noteEvents.length) * slot;
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

  /* SMuFL: digits 2 spaces tall per band; common-time C centered on the middle line. */
  var timeSpace = lineGap * 0.9;
  if (timeCommon) {
    var cAdv = staffGlyphAdvance("timeSigCommon", timeSpace);
    staffPlaceGlyph(
      svg,
      "timeSigCommon",
      timeX - cAdv / 2,
      staffTop + 2 * lineGap,
      timeSpace
    );
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

  function drawNotehead(x, step, hollow, displayAcc, accCol) {
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
    var head = staffSvgEl("ellipse", {
      cx: String(x),
      cy: String(ny),
      rx: String(noteHeadRx),
      ry: String(noteHeadRy),
      transform: "rotate(-20 " + x + " " + ny + ")",
      fill: hollow ? "none" : "currentColor",
      stroke: "currentColor",
      "stroke-width": hollow ? "1.6" : "1"
    });
    svg.appendChild(head);
  }

  for (e = 0; e < ast.events.length; e++) {
    ev = ast.events[e];
    if (ev.type === "barline") {
      var bx = notesStartX + noteIndex * slot;
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

    var cx = notesStartX + noteIndex * slot + slot / 2;
    if (ev.type === "note") {
      var disp = staffWrittenAccidental(ev.pitch, ast.keyAlts);
      drawNotehead(cx, ev.pitch.step, false, disp, 0);
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
      var offsets = [];
      var prevStep = null;
      var side = 1;
      for (p = 0; p < ev.pitches.length; p++) {
        var st = ev.pitches[p].step;
        if (prevStep !== null && st - prevStep <= 1) {
          offsets[p] = side * (noteHeadRx * 1.55);
          side = -side;
        } else {
          offsets[p] = 0;
          side = 1;
        }
        prevStep = st;
      }
      var accCols = staffAssignAccidentalColumns(ev.pitches, ast.keyAlts);
      for (p = 0; p < ev.pitches.length; p++) {
        drawNotehead(
          cx + offsets[p],
          ev.pitches[p].step,
          false,
          accCols[p].acc,
          accCols[p].col
        );
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
    noteIndex++;
  }

  return svg;
}
