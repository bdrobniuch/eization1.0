/*
 * Drum kit notation. A drum exercise parses here. Pitched lines stay in staff.js.
 * Duration is grid time. The metronome is still the click.
 */
var DRUM_KIT = {
  bd: { id: "bd", step: 1, head: "oval", voice: "feet" },
  ft: { id: "ft", step: 3, head: "oval", voice: "hands" },
  sd: { id: "sd", step: 5, head: "oval", voice: "hands" },
  mt: { id: "mt", step: 6, head: "oval", voice: "hands" },
  ht: { id: "ht", step: 7, head: "oval", voice: "hands" },
  hh: { id: "hh", step: 8, head: "x", voice: "hands" },
  rd: { id: "rd", step: 9, head: "x", voice: "hands" },
  rb: { id: "rb", step: 9, head: "diamond", voice: "hands" },
  cr: { id: "cr", step: 10, head: "x", voice: "hands" },
  hf: { id: "hf", step: -1, head: "x", voice: "feet" }
};

var DRUM_SEATS = [
  { step: -1, id: "hf" },
  { step: 1, id: "bd" },
  { step: 3, id: "ft" },
  { step: 5, id: "sd" },
  { step: 6, id: "mt" },
  { step: 7, id: "ht" },
  { step: 8, id: "hh" },
  { step: 9, id: "rd" },
  { step: 10, id: "cr" }
];

var DRUM_HOTKEYS = {
  b: "bd",
  f: "ft",
  s: "sd",
  m: "mt",
  t: "ht",
  h: "hh",
  r: "rd",
  c: "cr",
  p: "hf"
};

var drumAstCache = new Map();
var drumBeamSerial = 1;
var drumTupletSerial = 1;

function drumFail(reason, tok, span, open) {
  staffLastParseError = String(reason || "");
  if (tok) {
    staffLastParseError += staffLastParseError ? " · " + tok : String(tok);
  }
  staffLastParseSpan = null;
  if (span && typeof span.start === "number" && span.end > span.start) {
    staffLastParseSpan = { start: span.start, end: span.end, open: !!open };
  }
  return null;
}

function drumIdOrder(token) {
  var lower = String(token || "").toLowerCase();
  if (lower.indexOf("hho") === 0) {
    return "hho";
  }
  var ids = ["bd", "ft", "sd", "mt", "ht", "hh", "rd", "rb", "cr", "hf"];
  var i;
  for (i = 0; i < ids.length; i++) {
    if (lower.indexOf(ids[i]) === 0) {
      return ids[i];
    }
  }
  return "";
}

/* instrument + duration + dots + !u/!d + the same affixes a pitched note uses. */
function drumParseHitToken(token) {
  var raw = String(token || "");
  var idRaw = drumIdOrder(raw);
  var rest;
  var openHat = false;
  var spec;
  var durM;
  var dur;
  var force = "";
  var aff;
  var voice;
  var stem;
  var head;
  if (!idRaw) {
    return null;
  }
  rest = raw.slice(idRaw.length);
  if (idRaw === "hho") {
    idRaw = "hh";
    openHat = true;
  }
  spec = DRUM_KIT[idRaw];
  if (!spec) {
    return null;
  }
  durM = /^([whqes]?)(\.{0,2})(![ud])?/i.exec(rest);
  if (!durM) {
    return null;
  }
  if ((durM[1] || "").toLowerCase() === "n") {
    return null;
  }
  dur = staffMakeDuration((durM[1] || "q").toLowerCase(), durM[2] || "");
  if (!dur) {
    return null;
  }
  if (durM[3]) {
    force = durM[3].toLowerCase();
  }
  aff = staffParseAffixes(rest.slice(durM[0].length));
  if (!aff) {
    return null;
  }
  voice = spec.voice;
  stem = voice === "feet" ? "down" : "up";
  if (force === "!u") {
    voice = "hands";
    stem = "up";
  } else if (force === "!d") {
    voice = "feet";
    stem = "down";
  }
  head = openHat ? "circleX" : spec.head;
  return {
    id: spec.id,
    step: spec.step,
    head: head,
    voice: voice,
    stem: stem,
    open: openHat,
    duration: dur,
    force: force,
    label: aff.label,
    above: aff.above,
    articulations: aff.articulations,
    grace: "",
    rim: false
  };
}

function drumWithDuration(token, dur, dot) {
  var raw = String(token || "");
  var idRaw = drumIdOrder(raw);
  var rest;
  var durM;
  var base;
  var dots;
  if (!idRaw) {
    return null;
  }
  rest = raw.slice(idRaw.length);
  durM = /^([whqes]?)(\.{0,2})(![ud])?/i.exec(rest);
  if (!durM) {
    return null;
  }
  base = dur || "q";
  if (base !== "w" && base !== "h" && base !== "q" && base !== "e" && base !== "s") {
    base = "q";
  }
  dots = dot === 2 || dot === ".." ? ".." : dot ? "." : "";
  if (!staffMakeDuration(base, dots)) {
    return null;
  }
  return raw.slice(0, idRaw.length) + base + dots + (durM[3] || "") + rest.slice(durM[0].length);
}

function drumTieKey(hit) {
  return hit && hit.id ? "kit:" + hit.id : "";
}

function drumEventKeys(ev) {
  var keys = [];
  var i;
  if (!ev || ev.type === "rest" || ev.type === "barline" || ev.type === "simile") {
    return keys;
  }
  if (ev.type === "hit") {
    return [drumTieKey(ev)];
  }
  if (ev.type === "stack") {
    for (i = 0; i < ev.hits.length; i++) {
      keys.push(drumTieKey(ev.hits[i]));
    }
    return keys;
  }
  if (ev.type === "beam") {
    return ev.notes.length ? drumEventKeys(ev.notes[ev.notes.length - 1]) : keys;
  }
  if (ev.type === "tuplet") {
    return drumEventKeys(staffLastEvent(ev.events));
  }
  return keys;
}

function drumEventInKeys(ev) {
  var keys = [];
  if (!ev || ev.type === "rest" || ev.type === "barline" || ev.type === "simile") {
    return keys;
  }
  if (ev.type === "hit") {
    return [drumTieKey(ev)];
  }
  if (ev.type === "stack") {
    return drumEventKeys(ev);
  }
  if (ev.type === "beam") {
    return ev.notes.length ? drumEventInKeys(ev.notes[0]) : keys;
  }
  if (ev.type === "tuplet") {
    return drumEventInKeys(staffFirstEvent(ev.events));
  }
  return keys;
}

function drumMatchTie(fromEv, toEv) {
  var outKeys = drumEventKeys(fromEv);
  var inKeys = drumEventInKeys(toEv);
  var shared = [];
  var i;
  var j;
  if (!outKeys.length || !inKeys.length) {
    return { error: "tie needs the same piece" };
  }
  if (fromEv.type === "stack" || toEv.type === "stack") {
    for (i = 0; i < outKeys.length; i++) {
      for (j = 0; j < inKeys.length; j++) {
        if (outKeys[i] === inKeys[j] && shared.indexOf(outKeys[i]) < 0) {
          shared.push(outKeys[i]);
        }
      }
    }
    if (!shared.length) {
      return { error: "tie needs the same piece" };
    }
    return { keys: shared };
  }
  if (outKeys[0] !== inKeys[0]) {
    return { error: "tie needs the same piece" };
  }
  return { keys: [outKeys[0]] };
}

function drumBindTies(events) {
  var i;
  var open = null;
  var openAt = -1;
  var matched;
  var ev;
  for (i = 0; i < events.length; i++) {
    if (events[i].type === "tuplet") {
      matched = drumBindTies(events[i].events);
      if (matched && matched.error) {
        return matched;
      }
    }
    if (events[i].type === "beam") {
      matched = drumBindTies(events[i].notes);
      if (matched && matched.error) {
        return matched;
      }
    }
  }
  for (i = 0; i < events.length; i++) {
    ev = events[i];
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
      matched = drumMatchTie(open, ev);
      if (matched.error) {
        return staffFailSpan(matched.error, "~", open.tieSpan);
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
    if (openAt >= 0 && (staffOnlyBarlinesAfter(events, openAt + 1) || openAt === events.length - 1)) {
      open.tieOutKeys = drumEventKeys(open);
      open.tieHang = true;
    } else {
      return staffFailSpan("tie needs a note after it", "~", open.tieSpan);
    }
  }
  return { ok: true };
}

function drumApplyOrnament(hit, pending) {
  if (!hit || !pending) {
    return null;
  }
  if (pending.grace) {
    hit.grace = pending.grace;
  }
  if (pending.rim) {
    hit.rim = true;
  }
  if (pending.xstick) {
    if (hit.id !== "sd") {
      return "cross-stick is a snare";
    }
    hit.head = "x";
    hit.xstick = true;
  }
  pending.grace = "";
  pending.rim = false;
  pending.xstick = false;
  return "";
}

function drumOrnamentWord(tok) {
  return tok === "flam" || tok === "drag" || tok === "rim" || tok === "xstick";
}

function drumTakeStack(tokens, i, ranges) {
  var from = i;
  var buf = tokens[i];
  var close;
  var after;
  var inner;
  var parts;
  var hits = [];
  var p;
  var tail;
  var dur;
  var aff;
  var n;
  if (buf.indexOf("[", 1) >= 0) {
    return staffFailSpan("nested stack brackets", buf, staffSpan(ranges, from));
  }
  while (buf.indexOf("]") < 0 && i + 1 < tokens.length) {
    i++;
    if (tokens[i].indexOf("[") >= 0) {
      return staffFailSpan("nested stack brackets", tokens[i], staffSpan(ranges, i));
    }
    buf += " " + tokens[i];
  }
  close = buf.indexOf("]");
  if (close < 0) {
    return staffFailSpan("unclosed stack", tokens[from], staffSpan(ranges, from, i), true);
  }
  after = buf.slice(close + 1);
  tail = staffParseStackDuration(after);
  if (!tail) {
    return staffFailSpan("bad stack duration", after, staffSpan(ranges, from, i));
  }
  aff = staffParseAffixes(tail.rest || "");
  if (!aff) {
    return staffFailSpan("bad stack", after, staffSpan(ranges, from, i));
  }
  inner = buf.slice(1, close).trim();
  parts = inner ? inner.split(/\s+/) : [];
  if (!parts.length) {
    return staffFailSpan("bad stack", inner, staffSpan(ranges, from, i));
  }
  for (n = 0; n < parts.length; n++) {
    p = drumParseHitToken(parts[n]);
    if (!p) {
      return staffFailSpan("unknown kit piece", parts[n], staffSpan(ranges, from, i));
    }
    hits.push(p);
  }
  dur = tail.duration || "q";
  if (staffDurationBase(dur) === "n") {
    return staffFailSpan("bad stack duration", after, staffSpan(ranges, from, i));
  }
  for (n = 0; n < hits.length; n++) {
    hits[n].duration = dur;
    if (aff.articulations && aff.articulations.length && !hits[n].articulations.length) {
      hits[n].articulations = aff.articulations.slice();
    }
  }
  return {
    event: {
      type: "stack",
      hits: hits,
      duration: dur,
      label: aff.label || "",
      above: aff.above || "",
      articulations: aff.articulations || [],
      span: staffRangeSpan(staffSpan(ranges, from, i))
    },
    next: i + 1
  };
}

function drumParseBeam(tokens, i, ranges) {
  var from = i;
  var buf = tokens[i];
  var close;
  var inner;
  var parts;
  var partRanges;
  var notes = [];
  var pending = { grace: "", rim: false, xstick: false };
  var hangTie = false;
  var tieSpan = null;
  var k;
  var piece;
  var hit;
  var why;
  var beamId;
  while (buf.indexOf("}") < 0 && i + 1 < tokens.length) {
    i++;
    if (tokens[i].indexOf("{") >= 0) {
      return staffFailSpan("nested beam braces", tokens[i], staffSpan(ranges, i));
    }
    buf += " " + tokens[i];
  }
  close = buf.indexOf("}");
  if (close < 0) {
    return staffFailSpan("unclosed beam", tokens[from], staffSpan(ranges, from, i), true);
  }
  if (buf.slice(close + 1).replace(/\s+/g, "")) {
    return staffFailSpan("junk after beam", buf.slice(close + 1), staffSpan(ranges, from, i));
  }
  inner = buf.slice(1, close).trim();
  if (!inner) {
    return { event: { type: "beam", notes: [] }, next: i + 1 };
  }
  parts = inner.split(/\s+/);
  partRanges = staffBracePartRanges(tokens, ranges, from, i, "{", "}", parts);
  beamId = "b" + drumBeamSerial++;
  for (k = 0; k < parts.length; ) {
    if (parts[k] === "~") {
      if (!notes.length || hangTie) {
        return staffFailSpan("tie needs a note before it", "~", staffSpan(partRanges, k));
      }
      tieSpan = staffSpan(partRanges, k);
      hangTie = true;
      k++;
      continue;
    }
    if (drumOrnamentWord(parts[k]) || staffIsDynamic(parts[k]) || staffIsHairpin(parts[k]) || parts[k].charAt(0) === "^") {
      if (parts[k] === "flam" || parts[k] === "drag") {
        pending.grace = parts[k];
      } else if (parts[k] === "rim") {
        pending.rim = true;
      } else if (parts[k] === "xstick") {
        pending.xstick = true;
      } else if (staffIsDynamic(parts[k])) {
        pending.dynamic = parts[k];
      }
      k++;
      continue;
    }
    if (parts[k].charAt(0) === "[") {
      piece = drumTakeStack(parts, k, partRanges);
      if (!piece || piece.error) {
        return piece || staffFailSpan("bad stack", parts[k], staffSpan(partRanges, k));
      }
      if (!staffIsShortDuration(piece.event.duration)) {
        return staffFailSpan("bad beam pitches (need e/s notes)", parts[k], staffSpan(partRanges, k));
      }
      why = drumApplyOrnament(piece.event.hits[0], pending);
      if (why) {
        return staffFailSpan(why, parts[k], staffSpan(partRanges, k));
      }
      if (pending.dynamic) {
        piece.event.dynamic = pending.dynamic;
        pending.dynamic = "";
      }
      piece.event.beamId = beamId;
      if (hangTie) {
        notes[notes.length - 1].tieToNext = true;
        notes[notes.length - 1].tieSpan = tieSpan;
        hangTie = false;
      }
      notes.push(piece.event);
      k = piece.next;
      continue;
    }
    hit = drumParseHitToken(parts[k]);
    if (!hit || !staffIsShortDuration(hit.duration)) {
      if (staffParseRestToken(parts[k])) {
        return staffFailSpan("bad beam pitches (need e/s notes)", parts[k], staffSpan(partRanges, k));
      }
      return staffFailSpan("bad beam pitches (need e/s notes)", parts[k], staffSpan(partRanges, k));
    }
    why = drumApplyOrnament(hit, pending);
    if (why) {
      return staffFailSpan(why, parts[k], staffSpan(partRanges, k));
    }
    if (pending.dynamic) {
      hit.dynamic = pending.dynamic;
      pending.dynamic = "";
    }
    if (hangTie) {
      if (drumTieKey(notes[notes.length - 1]) !== drumTieKey(hit) && notes[notes.length - 1].type !== "stack") {
        var prevKey = drumEventKeys(notes[notes.length - 1])[0];
        if (prevKey !== drumTieKey(hit)) {
          return staffFailSpan("tie needs the same piece", "~", tieSpan);
        }
      }
      notes[notes.length - 1].tieToNext = true;
      notes[notes.length - 1].tieSpan = tieSpan;
      hangTie = false;
    }
    notes.push({
      type: "hit",
      id: hit.id,
      step: hit.step,
      head: hit.head,
      voice: hit.voice,
      stem: hit.stem,
      open: hit.open,
      duration: hit.duration,
      label: hit.label,
      above: hit.above,
      articulations: hit.articulations,
      grace: hit.grace,
      rim: hit.rim,
      dynamic: hit.dynamic || "",
      xstick: !!hit.xstick,
      beamId: beamId,
      span: staffRangeSpan(partRanges && partRanges[k])
    });
    k++;
  }
  if (pending.grace || pending.rim || pending.xstick) {
    return staffFailSpan("ornament needs a note", "", staffSpan(ranges, from, i));
  }
  if (!notes.length) {
    return staffFailSpan("bad beam pitches (need e/s notes)", inner, staffSpan(ranges, from, i));
  }
  return {
    event: {
      type: "beam",
      notes: notes,
      beamId: beamId,
      tieToNext: hangTie,
      tieSpan: hangTie ? tieSpan : null,
      span: staffRangeSpan(staffSpan(ranges, from, i))
    },
    next: i + 1
  };
}

function drumParseSequence(tokens, opts, ranges) {
  var events = [];
  var sawMusic = false;
  var i = 0;
  var marks = { chord: "", dynamic: "", hairpin: null, hairpins: [] };
  var pending = { grace: "", rim: false, xstick: false };
  var tok;
  var one;
  var why;
  opts = opts || {};
  while (i < tokens.length) {
    tok = tokens[i];
    if (tok === "feet") {
      return staffFailSpan("feet is the voice split", tok, staffSpan(ranges, i));
    }
    if (tok.charAt(0) === "@") {
      if (tok.indexOf("@key=") === 0) {
        return staffFailSpan("drums have no key", tok, staffSpan(ranges, i));
      }
      if (tok === "@treble" || tok === "@bass") {
        return staffFailSpan("drums use the percussion clef", tok, staffSpan(ranges, i));
      }
      return staffFailSpan("unknown directive", tok, staffSpan(ranges, i));
    }
    if (tok.charAt(0) === "^") {
      if (tok.length < 2) {
        if (!sawMusic && !events.length) {
          return staffFailSpan("empty chord symbol", tok, staffSpan(ranges, i));
        }
        i++;
        continue;
      }
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
        marks.hairpin.end = events[events.length - 1];
        marks.hairpin.closedByDynamic = false;
        marks.hairpins.push(marks.hairpin);
      }
      marks.hairpin = { kind: tok, start: null, end: null, closedByDynamic: false, span: staffSpan(ranges, i) };
      i++;
      continue;
    }
    if (drumOrnamentWord(tok)) {
      if (tok === "flam" || tok === "drag") {
        pending.grace = tok;
      } else if (tok === "rim") {
        pending.rim = true;
      } else {
        pending.xstick = true;
      }
      i++;
      continue;
    }
    if (tok === "%") {
      if (!opts.allowBarline) {
        return staffFailSpan("simile inside tuplet", tok, staffSpan(ranges, i));
      }
      one = { type: "simile", span: staffRangeSpan(staffSpan(ranges, i)) };
      staffAttachMarks(one, marks);
      sawMusic = true;
      events.push(one);
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
      events.push({ type: "barline", span: staffRangeSpan(staffSpan(ranges, i)) });
      i++;
      continue;
    }
    if (tok.charAt(0) === "(") {
      if (!opts.allowTuplet) {
        return staffFailSpan("nested tuplet", tok, staffSpan(ranges, i));
      }
      one = drumParseTuplet(tokens, i, ranges);
    } else if (tok.charAt(0) === "{") {
      one = drumParseBeam(tokens, i, ranges);
    } else if (tok.charAt(0) === "[") {
      one = drumTakeStack(tokens, i, ranges);
    } else if (staffParseRestToken(tok)) {
      one = {
        event: staffParseRestToken(tok),
        next: i + 1
      };
      one.event.span = staffRangeSpan(staffSpan(ranges, i));
    } else {
      var hit = drumParseHitToken(tok);
      if (!hit) {
        if (/^[A-Ga-g]/.test(tok)) {
          return staffFailSpan("unknown kit piece", tok, staffSpan(ranges, i));
        }
        return staffFailSpan("unknown kit piece", tok, staffSpan(ranges, i));
      }
      why = drumApplyOrnament(hit, pending);
      if (why) {
        return staffFailSpan(why, tok, staffSpan(ranges, i));
      }
      one = {
        event: {
          type: "hit",
          id: hit.id,
          step: hit.step,
          head: hit.head,
          voice: hit.voice,
          stem: hit.stem,
          open: hit.open,
          duration: hit.duration,
          label: hit.label,
          above: hit.above,
          articulations: hit.articulations,
          grace: hit.grace,
          rim: hit.rim,
          xstick: !!hit.xstick,
          span: staffRangeSpan(staffSpan(ranges, i))
        },
        next: i + 1
      };
    }
    if (!one || one.error) {
      return one || staffFailSpan("bad token", tok, staffSpan(ranges, i));
    }
    if (one.event && one.event.type === "stack") {
      why = drumApplyOrnament(one.event.hits[0], pending);
      if (why) {
        return staffFailSpan(why, tok, staffSpan(ranges, i));
      }
    }
    if (one.event && (one.event.type === "beam" || one.event.type === "tuplet") && (pending.grace || pending.rim || pending.xstick)) {
      var host = one.event.type === "beam" ? one.event.notes[0] : staffFirstEvent(one.event.events);
      var hostHit = host && host.type === "stack" ? host.hits[0] : host;
      why = drumApplyOrnament(hostHit, pending);
      if (why) {
        return staffFailSpan(why, tok, staffSpan(ranges, i));
      }
    }
    staffAttachMarks(one.event, marks);
    sawMusic = true;
    events.push(one.event);
    i = one.next;
  }
  if (pending.grace || pending.rim || pending.xstick) {
    return staffFailSpan("ornament needs a note", "", null);
  }
  one = staffFinishMarks(marks, events);
  if (one && one.error) {
    return one;
  }
  return { events: events, sawMusic: sawMusic, chordSymbol: (one && one.chordSymbol) || "" };
}

function drumParseTuplet(tokens, i, ranges) {
  var open = /^\((\d{1,2})(?::(\d{1,2}))?$/.exec(tokens[i]);
  var n;
  var m;
  var inner = [];
  var innerRanges = [];
  var j;
  var closed = false;
  var seq;
  var count;
  if (!open) {
    return staffFailSpan("bad tuplet (write (3 … ) or (5:4 … ))", tokens[i], staffSpan(ranges, i));
  }
  n = parseInt(open[1], 10);
  m = open[2] ? parseInt(open[2], 10) : staffTupletDefaultM(n);
  if (n < 2 || n > 16 || m < 1 || m > 16) {
    return staffFailSpan("bad tuplet ratio", tokens[i], staffSpan(ranges, i));
  }
  for (j = i + 1; j < tokens.length; j++) {
    if (tokens[j].charAt(0) === "(") {
      return staffFailSpan("nested tuplet", tokens[j], staffSpan(ranges, j));
    }
    if (tokens[j] === "|") {
      return staffFailSpan("barline inside tuplet", tokens[j], staffSpan(ranges, j));
    }
    if (staffTokenClosesTuplet(tokens[j])) {
      if (tokens[j].length > 1) {
        inner.push(tokens[j].slice(0, -1));
        if (ranges && ranges[j]) {
          innerRanges.push({ start: ranges[j].start, end: ranges[j].end - 1 });
        }
      }
      closed = true;
      break;
    }
    inner.push(tokens[j]);
    if (ranges) {
      innerRanges.push(ranges[j]);
    }
  }
  if (!closed) {
    return staffFailSpan("unclosed tuplet", tokens[i], staffSpan(ranges, i, tokens.length - 1), true);
  }
  if (!inner.length) {
    return {
      event: { type: "tuplet", n: n, m: m, showRatio: !!open[2], events: [] },
      next: j + 1
    };
  }
  seq = drumParseSequence(inner, { allowBarline: false, allowTuplet: false }, innerRanges);
  if (seq.error) {
    return seq;
  }
  count = 0;
  (function countTimed(list) {
    var c;
    for (c = 0; c < list.length; c++) {
      if (list[c].type !== "barline") {
        count++;
      }
    }
  })(seq.events);
  if (count < 2) {
    return { event: seq.events[0] || { type: "tuplet", n: n, m: m, events: [] }, next: j + 1 };
  }
  return {
    event: {
      type: "tuplet",
      n: n,
      m: m,
      showRatio: !!open[2],
      events: seq.events,
      tupletId: "t" + drumTupletSerial++,
      span: staffRangeSpan(staffSpan(ranges, i, j))
    },
    next: j + 1
  };
}

function drumSplitFeet(tokens, ranges) {
  var at = -1;
  var i;
  for (i = 0; i < tokens.length; i++) {
    if (tokens[i] === "feet") {
      if (at >= 0) {
        return staffFailSpan("one feet split", tokens[i], staffSpan(ranges, i));
      }
      at = i;
    }
  }
  if (at < 0) {
    return { handsTokens: tokens, handsRanges: ranges, feetTokens: null, feetRanges: null };
  }
  if (at === 0 || at === tokens.length - 1) {
    return staffFailSpan("feet needs both rhythms", "feet", staffSpan(ranges, at));
  }
  return {
    handsTokens: tokens.slice(0, at),
    handsRanges: ranges.slice(0, at),
    feetTokens: tokens.slice(at + 1),
    feetRanges: ranges.slice(at + 1)
  };
}

function drumBarSums(events) {
  var bars = [0];
  var i;
  var ev;
  for (i = 0; i < events.length; i++) {
    ev = events[i];
    if (ev.type === "barline") {
      bars.push(0);
      continue;
    }
    bars[bars.length - 1] += staffEventQuarters(ev);
  }
  return bars;
}

function drumSumsMatch(a, b) {
  var i;
  if (a.length !== b.length) {
    return false;
  }
  for (i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 0.02) {
      return false;
    }
  }
  return true;
}

function parseDrumNotation(source) {
  var parts;
  var raw;
  var tokens;
  var ranges;
  var split;
  var hands;
  var feet;
  var tied;
  var ast;
  staffLastParseSpan = null;
  staffLastParseError = "";
  if (typeof source !== "string") {
    return null;
  }
  parts = typeof staffExampleParts === "function" ? staffExampleParts(source) : { music: source.trim(), caption: "" };
  raw = String(parts.music || "").trim();
  if (!raw || /[<&]/.test(raw)) {
    return null;
  }
  if (drumAstCache.has(raw)) {
    return drumAstCache.get(raw);
  }
  tokens = staffTokenize(raw);
  if (!tokens.length) {
    return null;
  }
  ranges = staffTokenRanges(raw);
  split = drumSplitFeet(tokens, ranges);
  if (split.error) {
    return drumFail(split.error, split.tok, split.start != null ? { start: split.start, end: split.end } : null, split.open);
  }
  hands = drumParseSequence(split.handsTokens, { allowBarline: true, allowTuplet: true }, split.handsRanges);
  if (hands.error) {
    return drumFail(hands.error, hands.tok, hands.start != null ? { start: hands.start, end: hands.end } : null, hands.open);
  }
  feet = null;
  if (split.feetTokens) {
    feet = drumParseSequence(split.feetTokens, { allowBarline: true, allowTuplet: true }, split.feetRanges);
    if (feet.error) {
      return drumFail(feet.error, feet.tok, feet.start != null ? { start: feet.start, end: feet.end } : null, feet.open);
    }
    if (!drumSumsMatch(drumBarSums(hands.events), drumBarSums(feet.events))) {
      return drumFail("feet must fill the same bars", "feet", null);
    }
  }
  tied = drumBindTies(hands.events);
  if (tied && tied.error) {
    return drumFail(tied.error, tied.tok, tied.start != null ? { start: tied.start, end: tied.end } : null, tied.open);
  }
  if (feet) {
    tied = drumBindTies(feet.events);
    if (tied && tied.error) {
      return drumFail(tied.error, tied.tok, tied.start != null ? { start: tied.start, end: tied.end } : null, tied.open);
    }
  }
  if (!hands.sawMusic && !(feet && feet.sawMusic)) {
    return drumFail("no notes or rests", null, null);
  }
  ast = {
    source: raw,
    notation: "drum",
    clef: "percussion",
    hands: hands.events,
    feet: feet ? feet.events : null,
    chordSymbol: hands.chordSymbol || ""
  };
  drumAstCache.set(raw, ast);
  return ast;
}

/* A plain line of hits, rests, stacks, and feet can be rewritten. Anything else stays put. */
function drumWritePlainToken(token) {
  var rest;
  var hit;
  if (!token || token === "|" || token === "feet") {
    return true;
  }
  if (
    token === "~" ||
    token === "%" ||
    token === "flam" ||
    token === "drag" ||
    token === "rim" ||
    token === "xstick" ||
    token.charAt(0) === "^" ||
    token.charAt(0) === "(" ||
    token.charAt(0) === "{" ||
    token.charAt(0) === "@" ||
    token.charAt(0) === ")" ||
    token.indexOf("~") >= 0 ||
    token.indexOf("^") >= 0 ||
    token.indexOf("{") >= 0 ||
    token.indexOf("}") >= 0
  ) {
    return false;
  }
  if (typeof staffIsDynamic === "function" && staffIsDynamic(token)) {
    return false;
  }
  if (typeof staffIsHairpin === "function" && staffIsHairpin(token)) {
    return false;
  }
  if (token.charAt(0) === "[") {
    return true;
  }
  rest = typeof staffParseRestToken === "function" ? staffParseRestToken(token) : null;
  if (rest) {
    return !rest.label && !rest.above && !(rest.articulations && rest.articulations.length);
  }
  hit = drumParseHitToken(token);
  if (!hit) {
    return false;
  }
  return !hit.grace && !hit.rim && !hit.xstick && !hit.label && !hit.above && !(hit.articulations && hit.articulations.length);
}

function drumWriteNear(a, b) {
  return Math.abs(a - b) <= 0.02;
}

function drumWriteSort(cells) {
  return cells.slice().sort(function (a, b) {
    if (!drumWriteNear(a.onset, b.onset)) {
      return a.onset - b.onset;
    }
    if (a.kind === "bar" && b.kind !== "bar") {
      return -1;
    }
    if (b.kind === "bar" && a.kind !== "bar") {
      return 1;
    }
    return 0;
  });
}

function drumWriteSideEnd(cells) {
  var end = 0;
  var i;
  var cell;
  for (i = 0; i < cells.length; i++) {
    cell = cells[i];
    if (!cell || cell.kind === "bar") {
      continue;
    }
    if (cell.onset + cell.q > end) {
      end = cell.onset + cell.q;
    }
  }
  return drumRoundOnset(end);
}

function drumWriteHasHit(cells) {
  var i;
  for (i = 0; i < cells.length; i++) {
    if (cells[i] && (cells[i].kind === "hit" || cells[i].kind === "stack")) {
      return true;
    }
  }
  return false;
}

function drumWriteRestFit(onset, left, aligned) {
  var ladder = [
    ["w", 4],
    ["h.", 3],
    ["h", 2],
    ["q.", 1.5],
    ["q", 1],
    ["e.", 0.75],
    ["e", 0.5],
    ["s.", 0.375],
    ["s", 0.25]
  ];
  var i;
  var dur;
  var q;
  var boundary;
  for (i = 0; i < ladder.length; i++) {
    dur = ladder[i][0];
    q = ladder[i][1];
    if (q > left + 0.02) {
      continue;
    }
    if (aligned) {
      boundary = q >= 1 ? q : q >= 0.5 ? 0.5 : 0.25;
      if (Math.abs(onset / boundary - Math.round(onset / boundary)) > 0.02) {
        continue;
      }
    }
    return { dur: dur, q: q };
  }
  return null;
}

function drumWritePushRests(out, onset, gapQ, hintDur) {
  var hintQ;
  var left;
  var at;
  var n;
  var k;
  var piece;
  var guard;
  left = drumRoundOnset(gapQ);
  at = drumRoundOnset(onset);
  if (!(left > 0.02)) {
    return;
  }
  hintQ = staffDurationQuarters(hintDur || "q");
  if (hintQ > 0.02 && Math.abs(left / hintQ - Math.round(left / hintQ)) < 0.02) {
    n = Math.round(left / hintQ);
    for (k = 0; k < n; k++) {
      out.push({ kind: "rest", onset: drumRoundOnset(at), dur: hintDur || "q", q: hintQ, hits: [] });
      at += hintQ;
    }
    return;
  }
  guard = 0;
  while (left > 0.02 && guard < 64) {
    piece = drumWriteRestFit(at, left, true) || drumWriteRestFit(at, left, false);
    if (!piece || piece.q > left + 0.02) {
      break;
    }
    out.push({ kind: "rest", onset: drumRoundOnset(at), dur: piece.dur, q: piece.q, hits: [] });
    at += piece.q;
    left = drumRoundOnset(left - piece.q);
    guard++;
  }
}

function drumWriteReadStack(tokens, i) {
  var buf = tokens[i];
  var close;
  var after;
  var tail;
  var aff;
  var inner;
  var parts;
  var hits;
  var n;
  var parsed;
  var dur;
  while (buf.indexOf("]") < 0 && i + 1 < tokens.length) {
    i++;
    if (tokens[i].indexOf("[") >= 0 || tokens[i] === "~" || tokens[i].charAt(0) === "^" || tokens[i].charAt(0) === "{" || tokens[i].charAt(0) === "(") {
      return null;
    }
    buf += " " + tokens[i];
  }
  close = buf.indexOf("]");
  if (close < 0) {
    return null;
  }
  after = buf.slice(close + 1);
  if (after.indexOf("^") >= 0 || after.indexOf("_") >= 0 || after.indexOf("~") >= 0) {
    return null;
  }
  tail = staffParseStackDuration(after);
  if (!tail) {
    return null;
  }
  aff = staffParseAffixes(tail.rest || "");
  if (!aff || aff.label || aff.above || (aff.articulations && aff.articulations.length)) {
    return null;
  }
  inner = buf.slice(1, close).trim();
  parts = inner ? inner.split(/\s+/) : [];
  if (!parts.length) {
    return null;
  }
  hits = [];
  for (n = 0; n < parts.length; n++) {
    if (!drumWritePlainToken(parts[n])) {
      return null;
    }
    parsed = drumParseHitToken(parts[n]);
    if (!parsed || parsed.grace || parsed.rim || parsed.xstick || parsed.label || parsed.above || (parsed.articulations && parsed.articulations.length)) {
      return null;
    }
    hits.push({ id: parsed.id, open: !!parsed.open, force: parsed.force || "" });
  }
  dur = tail.duration || "q";
  if (staffDurationBase(dur) === "n") {
    return null;
  }
  return {
    cell: { kind: hits.length > 1 ? "stack" : "hit", onset: 0, dur: dur, q: staffDurationQuarters(dur), hits: hits },
    next: i + 1
  };
}

function drumWriteReadSide(tokens) {
  var cells = [];
  var onset = 0;
  var i = 0;
  var tok;
  var stack;
  var rest;
  var hit;
  var q;
  tokens = tokens || [];
  while (i < tokens.length) {
    tok = tokens[i];
    if (tok === "|") {
      cells.push({ kind: "bar", onset: drumRoundOnset(onset) });
      i++;
      continue;
    }
    if (tok.charAt(0) === "[") {
      stack = drumWriteReadStack(tokens, i);
      if (!stack) {
        return null;
      }
      stack.cell.onset = drumRoundOnset(onset);
      cells.push(stack.cell);
      onset += stack.cell.q;
      i = stack.next;
      continue;
    }
    if (!drumWritePlainToken(tok)) {
      return null;
    }
    rest = staffParseRestToken(tok);
    if (rest) {
      q = staffDurationQuarters(rest.duration);
      cells.push({ kind: "rest", onset: drumRoundOnset(onset), dur: rest.duration, q: q, hits: [] });
      onset += q;
      i++;
      continue;
    }
    hit = drumParseHitToken(tok);
    if (!hit) {
      return null;
    }
    q = staffDurationQuarters(hit.duration);
    cells.push({
      kind: "hit",
      onset: drumRoundOnset(onset),
      dur: hit.duration,
      q: q,
      hits: [{ id: hit.id, open: !!hit.open, force: hit.force || "" }]
    });
    onset += q;
    i++;
  }
  return cells;
}

function drumWriteRead(music) {
  var tokens;
  var ranges;
  var split;
  var hands;
  var feet;
  tokens = staffTokenize(music || "");
  ranges = staffTokenRanges(music || "");
  split = drumSplitFeet(tokens, ranges);
  if (!split || split.error) {
    return null;
  }
  hands = drumWriteReadSide(split.handsTokens);
  if (!hands) {
    return null;
  }
  feet = [];
  if (split.feetTokens) {
    feet = drumWriteReadSide(split.feetTokens);
    if (!feet) {
      return null;
    }
  }
  return { hands: hands, feet: feet };
}

function drumWriteKit(id) {
  var open = false;
  var bare = String(id || "");
  if (bare === "hho") {
    bare = "hh";
    open = true;
  }
  if (!DRUM_KIT[bare]) {
    return null;
  }
  return { id: bare, open: open, voice: bare === "bd" || bare === "hf" ? "feet" : "hands" };
}

function drumWriteDur(dur) {
  var m = /^([whqes])(\.{0,2})$/.exec(String(dur || "q"));
  if (!m) {
    return "";
  }
  return staffMakeDuration(m[1], m[2] || "") || "";
}

function drumWritePlace(cells, onset, q, dur, hit) {
  var end = drumRoundOnset(onset + q);
  var next = [];
  var i;
  var cell;
  var cellEnd;
  for (i = 0; i < cells.length; i++) {
    cell = cells[i];
    if (cell.kind === "bar") {
      if (cell.onset > onset + 0.02 && cell.onset < end - 0.02) {
        return null;
      }
      next.push(cell);
      continue;
    }
    cellEnd = drumRoundOnset(cell.onset + cell.q);
    if (cellEnd <= onset + 0.02 || cell.onset >= end - 0.02) {
      next.push(cell);
      continue;
    }
    if (cell.onset < onset - 0.02) {
      drumWritePushRests(next, cell.onset, drumRoundOnset(onset - cell.onset), dur);
    }
    if (cellEnd > end + 0.02) {
      drumWritePushRests(next, end, drumRoundOnset(cellEnd - end), dur);
    }
  }
  next.push({
    kind: "hit",
    onset: onset,
    dur: dur,
    q: q,
    hits: [hit]
  });
  return drumWriteSort(next);
}

function drumWriteJoin(cells, onset, q, dur, hit) {
  var i;
  var n;
  var cell;
  var found;
  for (i = 0; i < cells.length; i++) {
    cell = cells[i];
    if (cell.kind !== "hit" && cell.kind !== "stack") {
      continue;
    }
    if (!drumWriteNear(cell.onset, onset)) {
      continue;
    }
    if (!drumWriteNear(cell.q, q)) {
      return drumWritePlace(cells, onset, q, dur, hit);
    }
    found = false;
    for (n = 0; n < cell.hits.length; n++) {
      if (cell.hits[n].id === hit.id && !!cell.hits[n].open === !!hit.open) {
        found = true;
      }
    }
    if (!found) {
      cell.hits.push(hit);
    }
    cell.kind = cell.hits.length > 1 ? "stack" : "hit";
    return cells;
  }
  return drumWritePlace(cells, onset, q, dur, hit);
}

function drumWriteRemove(cells, onset, bare) {
  var i;
  var n;
  var cell;
  var nextHits;
  var found;
  for (i = 0; i < cells.length; i++) {
    cell = cells[i];
    if (cell.kind !== "hit" && cell.kind !== "stack") {
      continue;
    }
    if (!drumWriteNear(cell.onset, onset)) {
      continue;
    }
    nextHits = [];
    found = false;
    for (n = 0; n < cell.hits.length; n++) {
      if (cell.hits[n].id === bare) {
        found = true;
        continue;
      }
      nextHits.push(cell.hits[n]);
    }
    if (!found) {
      continue;
    }
    if (!nextHits.length) {
      cell.kind = "rest";
      cell.hits = [];
    } else {
      cell.kind = nextHits.length > 1 ? "stack" : "hit";
      cell.hits = nextHits;
    }
    return true;
  }
  return false;
}

function drumWriteAddBar(cells, onset) {
  var i;
  for (i = 0; i < cells.length; i++) {
    if (cells[i].kind === "bar" && drumWriteNear(cells[i].onset, onset)) {
      return;
    }
  }
  cells.push({ kind: "bar", onset: onset });
}

function drumWriteBarOnsets(cells) {
  var out = [];
  var i;
  for (i = 0; i < cells.length; i++) {
    if (cells[i].kind === "bar") {
      out.push(cells[i].onset);
    }
  }
  return out;
}

function drumWriteFill(cells, hintDur) {
  var timed = drumWriteSort(cells);
  var out = [];
  var cursor = 0;
  var i;
  var cell;
  for (i = 0; i < timed.length; i++) {
    cell = timed[i];
    if (cell.kind === "bar") {
      if (cell.onset > cursor + 0.02) {
        drumWritePushRests(out, cursor, drumRoundOnset(cell.onset - cursor), hintDur);
      }
      cursor = cell.onset;
      out.push(cell);
      continue;
    }
    if (cell.onset > cursor + 0.02) {
      drumWritePushRests(out, cursor, drumRoundOnset(cell.onset - cursor), hintDur);
    }
    out.push(cell);
    cursor = drumRoundOnset(Math.max(cursor, cell.onset + cell.q));
  }
  return out;
}

function drumWriteRegionSum(cells, start, stop) {
  var sum = 0;
  var i;
  var cell;
  for (i = 0; i < cells.length; i++) {
    cell = cells[i];
    if (!cell || cell.kind === "bar") {
      continue;
    }
    if (cell.onset >= start - 0.02 && cell.onset < stop - 0.02) {
      sum += cell.q;
    }
  }
  return drumRoundOnset(sum);
}

function drumWriteAlign(hands, feet, hintDur) {
  var bars = [];
  var seen = {};
  var lists;
  var i;
  var onset;
  var key;
  var maxEnd;
  var regions = [];
  var start;
  var stop;
  var handsSum;
  var feetSum;
  function take(list) {
    var n;
    var at;
    for (n = 0; n < list.length; n++) {
      at = list[n];
      key = String(drumRoundOnset(at));
      if (seen[key]) {
        continue;
      }
      seen[key] = true;
      bars.push(at);
    }
  }
  take(drumWriteBarOnsets(hands));
  take(drumWriteBarOnsets(feet));
  bars.sort(function (a, b) {
    return a - b;
  });
  for (i = 0; i < bars.length; i++) {
    drumWriteAddBar(hands, bars[i]);
    drumWriteAddBar(feet, bars[i]);
  }
  hands = drumWriteFill(hands, hintDur);
  feet = drumWriteFill(feet, hintDur);
  maxEnd = Math.max(drumWriteSideEnd(hands), drumWriteSideEnd(feet));
  lists = [0].concat(bars);
  for (i = 0; i < lists.length; i++) {
    start = lists[i];
    stop = i + 1 < lists.length ? lists[i + 1] : maxEnd;
    if (stop < start + 0.02) {
      continue;
    }
    regions.push([start, stop]);
  }
  for (i = 0; i < regions.length; i++) {
    start = regions[i][0];
    stop = regions[i][1];
    handsSum = drumWriteRegionSum(hands, start, stop);
    feetSum = drumWriteRegionSum(feet, start, stop);
    if (handsSum + 0.02 < feetSum) {
      drumWritePushRests(hands, drumRoundOnset(start + handsSum), drumRoundOnset(feetSum - handsSum), hintDur);
    }
    if (feetSum + 0.02 < handsSum) {
      drumWritePushRests(feet, drumRoundOnset(start + feetSum), drumRoundOnset(handsSum - feetSum), hintDur);
    }
  }
  return { hands: drumWriteSort(hands), feet: drumWriteSort(feet) };
}

function drumWriteSpell(cells) {
  var parts = [];
  var i;
  var j;
  var cell;
  var hit;
  var inner;
  for (i = 0; i < cells.length; i++) {
    cell = cells[i];
    if (cell.kind === "bar") {
      parts.push("|");
      continue;
    }
    if (cell.kind === "rest" || !cell.hits || !cell.hits.length) {
      parts.push("r" + cell.dur);
      continue;
    }
    if (cell.hits.length === 1) {
      hit = cell.hits[0];
      parts.push((hit.open ? "hho" : hit.id) + cell.dur + (hit.force || ""));
      continue;
    }
    inner = [];
    for (j = 0; j < cell.hits.length; j++) {
      hit = cell.hits[j];
      inner.push((hit.open ? "hho" : hit.id) + (hit.force || ""));
    }
    parts.push("[" + inner.join(" ") + "]" + cell.dur);
  }
  return parts.join(" ");
}

function drumWriteSerialize(model) {
  var hands = drumWriteSpell(model.hands);
  var feet = drumWriteSpell(model.feet);
  if (!hands && !feet) {
    return "";
  }
  if (!feet) {
    return hands;
  }
  if (!hands) {
    return feet;
  }
  return hands + " feet " + feet;
}

/* End of one voice, in quarter-lengths. An empty voice starts at 0. */
function drumVoiceEnd(source, voice) {
  var parts;
  var model;
  if (typeof source !== "string" || !source.trim()) {
    return 0;
  }
  parts = typeof staffExampleParts === "function" ? staffExampleParts(source) : { music: source.trim() };
  model = drumWriteRead(parts.music || "");
  if (!model) {
    return 0;
  }
  return drumWriteSideEnd(voice === "feet" ? model.feet : model.hands);
}

/*
 * Rewrite one drum on a plain line. onset is quarter-lengths.
 * dur is the armed length. op is place, remove, or join.
 * A tuplet, tie, beam, simile, dynamic, hairpin, flam, drag, or ^ stays null.
 */
function drumWriteHit(source, onset, id, dur, op) {
  var parts;
  var music;
  var model;
  var spec;
  var made;
  var q;
  var side;
  var edited;
  var text;
  var caption;
  if (typeof source !== "string" || typeof onset !== "number" || isNaN(onset) || onset < -0.02) {
    return null;
  }
  if (op !== "place" && op !== "remove" && op !== "join") {
    return null;
  }
  spec = drumWriteKit(id);
  made = drumWriteDur(dur);
  if (!spec || !made) {
    return null;
  }
  parts = typeof staffExampleParts === "function" ? staffExampleParts(source) : { music: source.trim(), caption: "" };
  music = parts.music || "";
  caption = parts.caption || "";
  if (!music) {
    model = { hands: [], feet: [] };
  } else {
    model = drumWriteRead(music);
    if (!model) {
      return null;
    }
  }
  onset = drumRoundOnset(onset);
  q = staffDurationQuarters(made);
  if (op === "remove") {
    if (!drumWriteRemove(model.hands, onset, spec.id)) {
      drumWriteRemove(model.feet, onset, spec.id);
    }
    if (!drumWriteHasHit(model.hands)) {
      model.hands = [];
    }
    if (!drumWriteHasHit(model.feet)) {
      model.feet = [];
    }
  } else {
    side = spec.voice === "feet" ? model.feet : model.hands;
    if (op === "join") {
      edited = drumWriteJoin(side, onset, q, made, { id: spec.id, open: spec.open, force: "" });
    } else {
      edited = drumWritePlace(side, onset, q, made, { id: spec.id, open: spec.open, force: "" });
    }
    if (!edited) {
      return null;
    }
    if (spec.voice === "feet") {
      model.feet = edited;
    } else {
      model.hands = edited;
    }
    if (drumWriteHasHit(model.feet)) {
      edited = drumWriteAlign(model.hands, model.feet, made);
      model.hands = edited.hands;
      model.feet = edited.feet;
    } else {
      model.hands = drumWriteFill(model.hands, made);
      model.feet = [];
    }
  }
  text = drumWriteSerialize(model);
  if (text && !parseDrumNotation(text)) {
    return null;
  }
  if (caption) {
    return text ? text + " \u00B7 " + caption : caption;
  }
  return text;
}

function drumLooksNotationIsh(tokens) {
  var i;
  var t;
  for (i = 0; i < tokens.length; i++) {
    t = tokens[i];
    if (
      t === "feet" ||
      t === "flam" ||
      t === "drag" ||
      t === "rim" ||
      t === "xstick" ||
      t === "|" ||
      t === "%" ||
      t.charAt(0) === "{" ||
      t.charAt(0) === "[" ||
      t.charAt(0) === "^" ||
      /^\(\d/.test(t) ||
      staffIsDynamic(t) ||
      staffIsHairpin(t) ||
      staffParseRestToken(t) ||
      drumParseHitToken(t)
    ) {
      return true;
    }
  }
  return false;
}

function drumNotationStatus(source) {
  var parts = staffExampleParts(source);
  var music = parts.music || "";
  var tokens;
  var ast;
  var span;
  if (!music) {
    return { ok: false, notationIsh: false, music: "", caption: parts.caption || "", error: "", start: -1, end: -1, open: false };
  }
  if (/[<&]/.test(music)) {
    return { ok: false, notationIsh: false, music: music, caption: parts.caption || "", error: "", start: -1, end: -1, open: false };
  }
  tokens = staffTokenize(music);
  staffLastParseError = "";
  staffLastParseSpan = null;
  ast = parseDrumNotation(music);
  span = !ast && staffLastParseSpan && staffLastParseSpan.end > staffLastParseSpan.start ? staffLastParseSpan : null;
  return {
    ok: !!ast,
    notationIsh: drumLooksNotationIsh(tokens),
    music: music,
    caption: parts.caption || "",
    error: ast ? "" : staffLastParseError,
    start: span ? span.start : -1,
    end: span ? span.end : -1,
    open: !!(span && span.open)
  };
}

function drumBarQuarters(meter) {
  var beats = meter && meter.beats ? meter.beats : typeof beatsPerBar === "number" ? beatsPerBar : 4;
  var unit = meter && meter.unit ? meter.unit : typeof beatUnit === "number" ? beatUnit : 4;
  if (!unit) {
    unit = 4;
  }
  return beats * (4 / unit);
}

function drumBeatQuarters(meter) {
  var beats = meter && meter.beats ? meter.beats : typeof beatsPerBar === "number" ? beatsPerBar : 4;
  var unit = meter && meter.unit ? meter.unit : typeof beatUnit === "number" ? beatUnit : 4;
  if ((beats === 6 || beats === 9 || beats === 12) && unit === 8) {
    return 1.5;
  }
  if (unit === 8) {
    return 0.5;
  }
  if (unit === 2) {
    return 2;
  }
  if (unit === 16) {
    return 0.25;
  }
  return 1;
}

function drumFlatten(events, ctx, out) {
  var i;
  var ev;
  var written;
  var adv;
  var scale;
  var note;
  ctx = ctx || { onset: 0, scale: 1, beam: "", tuplet: null };
  for (i = 0; i < events.length; i++) {
    ev = events[i];
    if (!ev) {
      continue;
    }
    if (ev.type === "barline") {
      out.push({ kind: "barline", onset: ctx.onset, span: ev.span || null });
      continue;
    }
    if (ev.type === "simile") {
      written = drumBarQuarters(ctx.meter);
      out.push({
        kind: "simile",
        onset: ctx.onset,
        adv: written,
        span: ev.span || null,
        chord: ev.chord || "",
        dynamic: ev.dynamic || ""
      });
      ctx.onset += written;
      continue;
    }
    if (ev.type === "beam") {
      var beamStart = out.length;
      for (note = 0; note < ev.notes.length; note++) {
        drumFlatten([ev.notes[note]], { onset: ctx.onset, scale: ctx.scale, beam: ev.beamId || ev.notes[note].beamId || "", tuplet: ctx.tuplet, meter: ctx.meter }, out);
        if (out.length) {
          ctx.onset = out[out.length - 1].onset + (out[out.length - 1].adv || 0);
        }
      }
      if (beamStart < out.length) {
        if (ev.chord && !out[beamStart].chord) {
          out[beamStart].chord = ev.chord;
        }
        if (ev.dynamic && !out[beamStart].dynamic) {
          out[beamStart].dynamic = ev.dynamic;
        }
        if (ev.hairpin) {
          out[beamStart].hairpin = ev.hairpin;
        }
        if (ev.label && !out[beamStart].label) {
          out[beamStart].label = ev.label;
        }
        if (ev.above && !out[beamStart].above) {
          out[beamStart].above = ev.above;
        }
      }
      if (ev.tieToNext && out.length) {
        out[out.length - 1].tieToNext = true;
      }
      continue;
    }
    if (ev.type === "tuplet") {
      scale = ctx.scale * (ev.m / ev.n);
      drumFlatten(ev.events, {
        onset: ctx.onset,
        scale: scale,
        beam: ctx.beam,
        tuplet: { id: ev.tupletId, n: ev.n, m: ev.m, showRatio: ev.showRatio },
        meter: ctx.meter
      }, out);
      ctx.onset = out.length ? out[out.length - 1].onset + (out[out.length - 1].adv || 0) : ctx.onset;
      continue;
    }
    written = staffDurationQuarters(ev.duration || "q");
    adv = written * (ctx.scale || 1);
    out.push({
      kind: ev.type === "rest" ? "rest" : "attack",
      onset: ctx.onset,
      adv: adv,
      written: written,
      duration: ev.duration || "q",
      ev: ev,
      beam: ctx.beam || ev.beamId || "",
      tuplet: ctx.tuplet || null,
      tieToNext: !!ev.tieToNext,
      span: ev.span || null,
      chord: ev.chord || "",
      dynamic: ev.dynamic || "",
      hairpin: ev.hairpin || "",
      hairpinEnd: !!ev.hairpinEnd,
      label: ev.label || "",
      above: ev.above || ""
    });
    ctx.onset += adv;
  }
  return out;
}

function drumRoundOnset(n) {
  return Math.round(n * 1000) / 1000;
}

function drumMergeVoices(hands, feet) {
  var map = {};
  var order = [];
  function put(atom, voice) {
    var key = atom.kind === "barline" ? "bar:" + drumRoundOnset(atom.onset) : String(drumRoundOnset(atom.onset));
    var col = map[key];
    if (!col) {
      col = {
        onset: atom.onset,
        kind: atom.kind === "barline" ? "barline" : atom.kind === "simile" ? "simile" : "note",
        hands: null,
        feet: null,
        span: null
      };
      map[key] = col;
      order.push(key);
    }
    if (voice === "feet") {
      col.feet = atom;
    } else {
      col.hands = atom;
    }
    if (!col.span && atom.span) {
      col.span = atom.span;
    }
    if (atom.kind === "simile") {
      col.kind = "simile";
    }
  }
  var i;
  for (i = 0; i < hands.length; i++) {
    put(hands[i], "hands");
  }
  if (feet) {
    for (i = 0; i < feet.length; i++) {
      put(feet[i], "feet");
    }
  }
  order.sort(function (a, b) {
    var aa = map[a].onset;
    var bb = map[b].onset;
    if (a.indexOf("bar:") === 0 && b.indexOf("bar:") !== 0 && drumRoundOnset(aa) === drumRoundOnset(bb)) {
      return -1;
    }
    if (b.indexOf("bar:") === 0 && a.indexOf("bar:") !== 0 && drumRoundOnset(aa) === drumRoundOnset(bb)) {
      return 1;
    }
    return aa - bb;
  });
  return order.map(function (key) {
    return map[key];
  });
}

function drumLayoutColumns(ast, meter) {
  var hands = [];
  var feet = null;
  var ctx = { onset: 0, scale: 1, beam: "", tuplet: null, meter: meter };
  drumFlatten(ast.hands || [], ctx, hands);
  if (ast.feet) {
    feet = [];
    drumFlatten(ast.feet, { onset: 0, scale: 1, beam: "", tuplet: null, meter: meter }, feet);
  }
  return drumMergeVoices(hands, feet);
}

function drumAutoBeam(columns) {
  var voices = ["hands", "feet"];
  var v;
  var i;
  var atom;
  var prev;
  var beat;
  var group;
  var serial = 1;
  beat = drumBeatQuarters(null);
  for (v = 0; v < voices.length; v++) {
    prev = null;
    group = "";
    for (i = 0; i < columns.length; i++) {
      atom = columns[i][voices[v]];
      if (!atom || atom.kind !== "attack") {
        prev = null;
        group = "";
        continue;
      }
      if (atom.beam) {
        prev = atom;
        group = "";
        continue;
      }
      if (!staffIsShortDuration(atom.duration)) {
        prev = null;
        group = "";
        continue;
      }
      if (
        !prev ||
        !staffIsShortDuration(prev.duration) ||
        Math.abs(prev.onset + prev.adv - atom.onset) > 0.02 ||
        Math.floor(prev.onset / beat + 1e-6) !== Math.floor(atom.onset / beat + 1e-6)
      ) {
        group = "auto" + serial++;
      }
      atom.beam = group;
      prev = atom;
    }
  }
}

function drumY(step, staffTop, lineGap) {
  return staffTop + 4 * lineGap - step * (lineGap / 2);
}

function drumSeatFromY(y, staffTop, lineGap, coarse) {
  var best = null;
  var bestD = Infinity;
  var i;
  var seat;
  var sy;
  var d;
  var limit = coarse ? Infinity : lineGap / 2;
  for (i = 0; i < DRUM_SEATS.length; i++) {
    seat = DRUM_SEATS[i];
    sy = drumY(seat.step, staffTop, lineGap);
    d = Math.abs(y - sy);
    if (d < bestD) {
      bestD = d;
      best = seat;
    }
  }
  if (!best || bestD > limit) {
    return null;
  }
  return best;
}

function drumHeadName(hit) {
  if (!hit) {
    return "noteheadBlack";
  }
  if (hit.head === "circleX") {
    return "noteheadCircleX";
  }
  if (hit.head === "diamond") {
    return "noteheadDiamondBlack";
  }
  if (hit.head === "x") {
    return "noteheadXBlack";
  }
  return staffDurationGlyph(hit.duration || "q");
}

function drumHitsOf(atom) {
  if (!atom || !atom.ev) {
    return [];
  }
  if (atom.ev.type === "stack") {
    return atom.ev.hits || [];
  }
  if (atom.ev.type === "hit") {
    return [atom.ev];
  }
  return [];
}

function renderDrumStaff(source, role, opts) {
  var parts;
  var music;
  var ast;
  var meter;
  var showMeter;
  var columns;
  var lineGap = 12;
  var staffTop = 78;
  var staffHeight = lineGap * 4;
  var quarterW = role === "reel" ? 46 : 58;
  var padL = 8;
  var padR = 18;
  var cursor;
  var i;
  var col;
  var width;
  var svg;
  var li;
  var y;
  var barQ;
  var heads = [];
  if (typeof source !== "string") {
    source = "";
  }
  parts = staffExampleParts(source);
  music = parts.music || "";
  showMeter = !(opts && opts.showMeter === false);
  meter = opts && opts.meter ? opts.meter : null;
  if (meter) {
    beatsPerBar = meter.beats;
    beatUnit = meter.unit;
  }
  ast = music ? parseDrumNotation(music) : { hands: [], feet: null, source: "" };
  if (music && !ast) {
    return null;
  }
  columns = drumLayoutColumns(ast, meter);
  drumAutoBeam(columns);
  barQ = drumBarQuarters(meter);
  cursor = padL + lineGap * 3.2;
  if (showMeter) {
    cursor += lineGap * 3.2;
  }
  var notesStart = cursor;
  var maxOnset = 0;
  for (i = 0; i < columns.length; i++) {
    col = columns[i];
    col.x = notesStart + col.onset * quarterW;
    if (col.onset > maxOnset) {
      maxOnset = col.onset;
    }
    var adv = 0;
    if (col.hands && col.hands.adv) {
      adv = col.hands.adv;
    }
    if (col.feet && col.feet.adv && col.feet.adv > adv) {
      adv = col.feet.adv;
    }
    if (col.onset + adv > maxOnset) {
      maxOnset = col.onset + adv;
    }
  }
  if (!columns.length) {
    maxOnset = barQ;
  }
  width = notesStart + maxOnset * quarterW + padR + lineGap;
  svg = staffSvgEl("svg", {
    viewBox: "0 0 " + width + " " + (staffTop + staffHeight + 86),
    preserveAspectRatio: "xMidYMid meet",
    class: "music-staff",
    role: "img",
    "aria-label": music || "Drums"
  });
  svg.style.color = "currentColor";
  for (li = 0; li < 5; li++) {
    y = staffTop + li * lineGap;
    svg.appendChild(staffSvgEl("line", {
      x1: "0",
      y1: String(y),
      x2: String(width),
      y2: String(y),
      stroke: "currentColor",
      "stroke-width": "1.15",
      class: "staff-line"
    }));
  }
  drumDrawClef(svg, padL, staffTop, lineGap);
  if (showMeter) {
    drumDrawMeter(svg, padL + lineGap * 2.1, staffTop, lineGap, meter);
  }
  drumDrawColumns(svg, columns, staffTop, lineGap, heads, quarterW, barQ);
  svg._staffCaretLayout = {
    staffTop: staffTop,
    staffBot: staffTop + staffHeight,
    notesStartX: notesStart,
    endX: width - padR,
    half: lineGap * 0.7,
    lineGap: lineGap,
    heads: heads,
    music: music,
    quarterW: quarterW,
    cols: columns.filter(function (c) {
      return c.kind !== "barline";
    }).map(function (c) {
      return { type: c.kind, x: c.x, onset: c.onset };
    })
  };
  return svg;
}

function drumDrawClef(svg, x, staffTop, lineGap) {
  var h = lineGap * 4;
  var w = Math.max(2.4, lineGap * 0.22);
  var gap = lineGap * 0.42;
  svg.appendChild(staffSvgEl("rect", {
    x: String(x),
    y: String(staffTop),
    width: String(w),
    height: String(h),
    fill: "currentColor",
    class: "staff-clef"
  }));
  svg.appendChild(staffSvgEl("rect", {
    x: String(x + gap),
    y: String(staffTop),
    width: String(w),
    height: String(h),
    fill: "currentColor",
    class: "staff-clef"
  }));
}

function drumDrawMeter(svg, x, staffTop, lineGap, meter) {
  var beats = meter && meter.beats ? meter.beats : typeof beatsPerBar === "number" ? beatsPerBar : 4;
  var unit = meter && meter.unit ? meter.unit : typeof beatUnit === "number" ? beatUnit : 4;
  var name;
  if (beats === 4 && unit === 4) {
    staffPlaceGlyph(svg, "timeSigCommon", x, staffTop + lineGap * 2, lineGap * 0.62);
    return;
  }
  if (beats === 2 && unit === 2) {
    staffPlaceGlyph(svg, "timeSigCutCommon", x, staffTop + lineGap * 2, lineGap * 0.62);
    return;
  }
  drumDrawMeterDigits(svg, x, staffTop + lineGap * 0.15, lineGap, String(beats));
  drumDrawMeterDigits(svg, x, staffTop + lineGap * 2.15, lineGap, String(unit));
}

function drumDrawMeterDigits(svg, x, y, lineGap, text) {
  var i;
  var cursor = x;
  var ch;
  var name;
  for (i = 0; i < text.length; i++) {
    ch = text.charAt(i);
    name = "timeSig" + ch;
    if (typeof STAFF_GLYPHS !== "undefined" && STAFF_GLYPHS[name]) {
      cursor += staffPlaceGlyph(svg, name, cursor, y + lineGap, lineGap * 0.55);
    }
  }
}

function drumDrawColumns(svg, columns, staffTop, lineGap, heads, quarterW, barQ) {
  var i;
  var col;
  var full = 0;
  for (i = 0; i < columns.length; i++) {
    col = columns[i];
    if (col.kind === "barline") {
      drumBarline(svg, col.x, staffTop, lineGap);
      full = 0;
      continue;
    }
    if (col.kind === "simile") {
      staffPlaceGlyph(svg, "repeat1Bar", col.x, staffTop + lineGap * 2, lineGap);
      continue;
    }
    drumDrawAtom(svg, col, col.hands, "hands", staffTop, lineGap, heads);
    drumDrawAtom(svg, col, col.feet, "feet", staffTop, lineGap, heads);
    full += col.hands && col.hands.adv ? col.hands.adv : col.feet && col.feet.adv ? col.feet.adv : 0;
  }
  if (columns.length && full + 0.02 >= barQ) {
    var last = columns[columns.length - 1];
    var endX = last.x + quarterW * 0.85;
    drumBarline(svg, endX, staffTop, lineGap);
  }
  drumDrawBeams(svg, columns, staffTop, lineGap);
  drumDrawTuplets(svg, columns, staffTop, lineGap);
  drumDrawTies(svg, columns, staffTop, lineGap);
  drumDrawWords(svg, columns, staffTop, lineGap);
}

function drumBarline(svg, x, staffTop, lineGap) {
  svg.appendChild(staffSvgEl("line", {
    x1: String(x),
    y1: String(staffTop),
    x2: String(x),
    y2: String(staffTop + lineGap * 4),
    stroke: "currentColor",
    "stroke-width": "1.4",
    class: "staff-bar"
  }));
}

function drumVoiceHits(atom) {
  var hits = drumHitsOf(atom);
  var up = [];
  var down = [];
  var i;
  for (i = 0; i < hits.length; i++) {
    if (hits[i].stem === "down" || hits[i].voice === "feet") {
      down.push(hits[i]);
    } else {
      up.push(hits[i]);
    }
  }
  return { up: up, down: down };
}

function drumDrawAtom(svg, col, atom, lane, staffTop, lineGap, heads) {
  var groups;
  if (!atom) {
    return;
  }
  if (atom.kind === "rest") {
    drumDrawRest(svg, col.x, atom, lane, staffTop, lineGap);
    return;
  }
  if (atom.kind !== "attack") {
    return;
  }
  groups = drumVoiceHits(atom);
  if (lane === "feet" && !col.hands) {
    if (groups.down.length) {
      drumDrawHitGroup(svg, col, atom, groups.down, false, staffTop, lineGap, heads);
    }
    if (groups.up.length) {
      drumDrawHitGroup(svg, col, atom, groups.up, true, staffTop, lineGap, heads);
    }
    return;
  }
  if (lane === "hands" && !col.feet) {
    if (groups.up.length) {
      drumDrawHitGroup(svg, col, atom, groups.up, true, staffTop, lineGap, heads);
    }
    if (groups.down.length) {
      drumDrawHitGroup(svg, col, atom, groups.down, false, staffTop, lineGap, heads);
    }
    return;
  }
  if (lane === "hands" && groups.up.length) {
    drumDrawHitGroup(svg, col, atom, groups.up, true, staffTop, lineGap, heads);
  }
  if (lane === "feet" && groups.down.length) {
    drumDrawHitGroup(svg, col, atom, groups.down, false, staffTop, lineGap, heads);
  }
}

function drumDrawHitGroup(svg, col, atom, hits, stemUp, staffTop, lineGap, heads) {
  var i;
  var hit;
  var ny;
  var name;
  var adv;
  var left;
  var shift;
  var xs = [];
  var ys = [];
  var stemX;
  var tip;
  var reach = lineGap * 3.2;
  hits = hits.slice().sort(function (a, b) {
    return a.step - b.step;
  });
  for (i = 0; i < hits.length; i++) {
    hit = hits[i];
    shift = 0;
    if (i > 0 && hit.step - hits[i - 1].step === 1) {
      shift = stemUp ? lineGap * 0.85 : -lineGap * 0.85;
    }
    ny = drumY(hit.step, staffTop, lineGap);
    name = drumHeadName(hit);
    adv = staffGlyphAdvance(name, lineGap);
    left = col.x - adv / 2 + shift;
    if (hit.grace) {
      drumDrawGrace(svg, left - lineGap * 1.15, ny, hit, lineGap);
    }
    staffPlaceGlyph(svg, name, left, ny, lineGap, "staff-notehead");
    if (svg._staffLastGlyph && svg._staffLastGlyph.setAttribute) {
      svg._staffLastGlyph.setAttribute("data-pitch-col", String(heads.length));
      svg._staffLastGlyph.setAttribute("data-pitch-step", String(hit.step));
    }
    if (hit.open) {
      drumText(svg, col.x + shift, ny - lineGap * 1.15, "o", 11);
    }
    xs.push(col.x + shift);
    ys.push(ny);
    heads.push({
      x: col.x + shift,
      y: ny,
      rx: Math.max(adv / 2, 8),
      ry: lineGap * 0.55,
      col: heads.length,
      step: hit.step,
      id: hit.id,
      key: hit.id,
      start: atom.span ? atom.span.contentStart : 0,
      end: atom.span ? atom.span.contentEnd : 0
    });
    drumDrawDots(svg, left + adv + lineGap * 0.15, ny, atom.duration, lineGap);
    drumDrawArticulations(svg, col.x + shift, ny, hit, stemUp, lineGap);
    if (hit.rim) {
      svg.appendChild(staffSvgEl("line", {
        x1: String(col.x + shift - 6),
        y1: String(ny - 8),
        x2: String(col.x + shift + 8),
        y2: String(ny + 7),
        stroke: "currentColor",
        "stroke-width": "1.4"
      }));
    }
    if (atom.label || hit.label) {
      drumText(svg, col.x + shift, drumY(-2, staffTop, lineGap) + lineGap * 1.6, atom.label || hit.label, 12);
    }
    if (atom.above || hit.above) {
      drumText(svg, col.x + shift, ny - lineGap * 1.8, atom.above || hit.above, 12);
    }
  }
  if (!staffHasStem(atom.duration) || (atom.beam && staffIsShortDuration(atom.duration))) {
    if (!atom._stems) {
      atom._stems = [];
    }
    atom._stems.push({
      stemUp: stemUp,
      stemX: stemUp ? Math.max.apply(null, xs) + lineGap * 0.42 : Math.min.apply(null, xs) - lineGap * 0.42,
      tip: stemUp ? Math.min.apply(null, ys) - lineGap * 3.2 : Math.max.apply(null, ys) + lineGap * 3.2,
      ys: ys,
      duration: atom.duration
    });
    return;
  }
  stemX = stemUp ? Math.max.apply(null, xs) + lineGap * 0.42 : Math.min.apply(null, xs) - lineGap * 0.42;
  tip = stemUp ? Math.min.apply(null, ys) - reach : Math.max.apply(null, ys) + reach;
  svg.appendChild(staffSvgEl("line", {
    x1: String(stemX),
    y1: String(stemUp ? Math.min.apply(null, ys) : Math.max.apply(null, ys)),
    x2: String(stemX),
    y2: String(tip),
    stroke: "currentColor",
    "stroke-width": "1.35",
    class: "staff-stem"
  }));
  atom._stemUp = stemUp;
  atom._stemX = stemX;
  atom._tip = tip;
  atom._ys = ys;
  if (staffIsShortDuration(atom.duration) && !atom.beam) {
    staffPlaceGlyph(svg, staffFlagGlyph(atom.duration, stemUp), stemX, tip, lineGap);
  }
}

function drumDrawRest(svg, x, atom, voice, staffTop, lineGap) {
  var name = staffRestGlyph(atom.duration || "q");
  var adv = staffGlyphAdvance(name, lineGap);
  var y = staffTop + lineGap * 2;
  if (voice === "hands") {
    y = staffTop + lineGap * 1.15;
  } else if (voice === "feet") {
    y = staffTop + lineGap * 2.85;
  }
  staffPlaceGlyph(svg, name, x - adv / 2, y, lineGap);
  if (atom.dynamic) {
    drumText(svg, x, staffTop + lineGap * 4 + 22, atom.dynamic, 13);
  }
}

function drumDrawDots(svg, x, y, dur, lineGap) {
  var n = staffDurationDotCount(dur || "q");
  var i;
  for (i = 0; i < n; i++) {
    svg.appendChild(staffSvgEl("circle", {
      cx: String(x + i * lineGap * 0.55),
      cy: String(y - lineGap * 0.35),
      r: "2.1",
      fill: "currentColor"
    }));
  }
}

function drumDrawGrace(svg, x, y, hit, lineGap) {
  var count = hit.grace === "drag" ? 2 : 1;
  var i;
  var name = drumHeadName(hit);
  for (i = 0; i < count; i++) {
    staffPlaceGlyph(svg, name, x - i * lineGap * 0.7, y, lineGap * 0.62);
    svg.appendChild(staffSvgEl("line", {
      x1: String(x - i * lineGap * 0.7 + 4),
      y1: String(y + 4),
      x2: String(x - i * lineGap * 0.7 + 12),
      y2: String(y - 10),
      stroke: "currentColor",
      "stroke-width": "1.2"
    }));
  }
}

function drumDrawArticulations(svg, x, y, hit, stemUp, lineGap) {
  var arts = hit.articulations || [];
  var dir = stemUp ? -1 : 1;
  var ay = y + dir * lineGap * 1.35;
  var i;
  for (i = 0; i < arts.length; i++) {
    if (arts[i] === "staccato") {
      svg.appendChild(staffSvgEl("circle", {
        cx: String(x),
        cy: String(ay),
        r: "2.2",
        fill: "currentColor"
      }));
    } else if (arts[i] === "tenuto") {
      svg.appendChild(staffSvgEl("line", {
        x1: String(x - 6),
        y1: String(ay),
        x2: String(x + 6),
        y2: String(ay),
        stroke: "currentColor",
        "stroke-width": "1.4"
      }));
    } else if (arts[i] === "accent") {
      drumText(svg, x, ay, ">", 14);
    } else if (arts[i] === "marcato") {
      drumText(svg, x, ay, "^", 14);
    }
    ay += dir * lineGap * 0.7;
  }
}

function drumText(svg, x, y, text, size) {
  var node;
  if (!text) {
    return;
  }
  node = staffSvgEl("text", {
    x: String(x),
    y: String(y),
    "text-anchor": "middle",
    "font-size": String(size || 13),
    fill: "currentColor"
  });
  node.textContent = String(text).replace(/_/g, " ");
  svg.appendChild(node);
}

function drumDrawBeams(svg, columns, staffTop, lineGap) {
  var groups = {};
  var key;
  var list;
  var i;
  var atom;
  var voice;
  var voices = ["hands", "feet"];
  var v;
  var col;
  var s;
  var stem;
  for (i = 0; i < columns.length; i++) {
    col = columns[i];
    for (v = 0; v < voices.length; v++) {
      voice = voices[v];
      atom = col[voice];
      if (!atom || !atom.beam || !atom._stems) {
        continue;
      }
      for (s = 0; s < atom._stems.length; s++) {
        stem = atom._stems[s];
        key = atom.beam + ":" + (stem.stemUp ? "u" : "d");
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(stem);
      }
    }
  }
  for (key in groups) {
    if (!Object.prototype.hasOwnProperty.call(groups, key)) {
      continue;
    }
    list = groups[key];
    if (list.length < 2) {
      if (list.length === 1) {
        staffPlaceGlyph(
          svg,
          staffFlagGlyph(list[0].duration || "e", list[0].stemUp),
          list[0].stemX,
          list[0].tip,
          lineGap
        );
      }
      continue;
    }
    drumBeamLine(svg, list, lineGap);
  }
}

function drumBeamLine(svg, list, lineGap) {
  var up = !!list[0].stemUp;
  var tip = up ? Infinity : -Infinity;
  var i;
  var thick = staffDurationBase(list[0].duration || "e") === "s" ? 2 : 1;
  for (i = 0; i < list.length; i++) {
    tip = up ? Math.min(tip, list[i].tip) : Math.max(tip, list[i].tip);
  }
  for (i = 0; i < list.length; i++) {
    svg.appendChild(staffSvgEl("line", {
      x1: String(list[i].stemX),
      y1: String(up ? Math.min.apply(null, list[i].ys) : Math.max.apply(null, list[i].ys)),
      x2: String(list[i].stemX),
      y2: String(tip),
      stroke: "currentColor",
      "stroke-width": "1.35",
      class: "staff-stem"
    }));
  }
  svg.appendChild(staffSvgEl("line", {
    x1: String(list[0].stemX),
    y1: String(tip),
    x2: String(list[list.length - 1].stemX),
    y2: String(tip),
    stroke: "currentColor",
    "stroke-width": "4.2",
    "stroke-linecap": "butt",
    class: "staff-beam"
  }));
  if (thick === 2) {
    var inner = up ? tip + lineGap * 0.45 : tip - lineGap * 0.45;
    svg.appendChild(staffSvgEl("line", {
      x1: String(list[0].stemX),
      y1: String(inner),
      x2: String(list[list.length - 1].stemX),
      y2: String(inner),
      stroke: "currentColor",
      "stroke-width": "3.2",
      class: "staff-beam"
    }));
  }
}

function drumDrawTuplets(svg, columns, staffTop, lineGap) {
  var groups = {};
  var i;
  var v;
  var atom;
  var key;
  var list;
  var voices = ["hands", "feet"];
  for (i = 0; i < columns.length; i++) {
    for (v = 0; v < voices.length; v++) {
      atom = columns[i][voices[v]];
      if (!atom || !atom.tuplet) {
        continue;
      }
      key = voices[v] + ":" + atom.tuplet.id;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({ x: columns[i].x, atom: atom, voice: voices[v] });
    }
  }
  for (key in groups) {
    if (!Object.prototype.hasOwnProperty.call(groups, key)) {
      continue;
    }
    list = groups[key];
    if (list.length < 2) {
      continue;
    }
    drumTupletBracket(svg, list, staffTop, lineGap);
  }
}

function drumTupletBracket(svg, list, staffTop, lineGap) {
  var up = list[0].voice === "hands";
  var y = up ? staffTop - lineGap * 1.35 : staffTop + lineGap * 5.1;
  var x1 = list[0].x;
  var x2 = list[list.length - 1].x;
  var mid = (x1 + x2) / 2;
  var label = String(list[0].atom.tuplet.n);
  svg.appendChild(staffSvgEl("line", {
    x1: String(x1),
    y1: String(y),
    x2: String(x2),
    y2: String(y),
    stroke: "currentColor",
    "stroke-width": "1.1",
    class: "staff-tuplet"
  }));
  drumText(svg, mid, up ? y - 3 : y + 12, label, 13);
}

function drumDrawTies(svg, columns, staffTop, lineGap) {
  var voices = ["hands", "feet"];
  var v;
  var i;
  var j;
  var atom;
  var next;
  for (v = 0; v < voices.length; v++) {
    for (i = 0; i < columns.length; i++) {
      atom = columns[i][voices[v]];
      if (!atom || !atom.tieToNext) {
        continue;
      }
      next = null;
      for (j = i + 1; j < columns.length; j++) {
        if (columns[j][voices[v]] && columns[j][voices[v]].kind === "attack") {
          next = columns[j];
          break;
        }
      }
      if (!next) {
        drumTieCurve(svg, columns[i].x + 8, columns[i].x + lineGap * 1.6, drumTieY(atom, staffTop, lineGap), voices[v] === "hands");
        continue;
      }
      drumTieCurve(svg, columns[i].x + 8, next.x - 8, drumTieY(atom, staffTop, lineGap), voices[v] === "hands");
    }
  }
}

function drumTieY(atom, staffTop, lineGap) {
  var hits = drumHitsOf(atom);
  var step = hits.length ? hits[0].step : 5;
  return drumY(step, staffTop, lineGap);
}

function drumTieCurve(svg, x1, x2, y, above) {
  var mid = (x1 + x2) / 2;
  var dy = above ? -lineGapSafe(10) : 10;
  var path = "M" + x1 + " " + (y + (above ? -8 : 8)) + " Q " + mid + " " + (y + dy) + " " + x2 + " " + (y + (above ? -8 : 8));
  svg.appendChild(staffSvgEl("path", {
    d: path,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.3",
    class: "staff-tie"
  }));
}

function lineGapSafe(n) {
  return n;
}

function drumDrawWords(svg, columns, staffTop, lineGap) {
  var i;
  var col;
  var atom;
  var yTop = staffTop - lineGap * 2.4;
  var yDyn = staffTop + lineGap * 4 + 28;
  for (i = 0; i < columns.length; i++) {
    col = columns[i];
    atom = col.hands || col.feet;
    if (!atom) {
      continue;
    }
    if (atom.chord) {
      drumText(svg, col.x, yTop, atom.chord.replace(/_/g, " "), 15);
    }
    if (atom.dynamic) {
      drumText(svg, col.x, yDyn, atom.dynamic, 13);
    }
    if (atom.hairpin) {
      drumHairpin(svg, columns, i, atom.hairpin, staffTop, lineGap);
    }
  }
}

function drumHairpin(svg, columns, from, kind, staffTop, lineGap) {
  var y = staffTop + lineGap * 4 + 16;
  var x1 = columns[from].x;
  var x2 = x1 + 36;
  var i;
  var atom;
  for (i = from + 1; i < columns.length; i++) {
    atom = columns[i].hands || columns[i].feet;
    if (atom && atom.hairpinEnd) {
      x2 = columns[i].x;
      break;
    }
    if (columns[i].kind !== "barline") {
      x2 = columns[i].x;
    }
  }
  var open = kind === "cresc" ? 1 : 8;
  var close = kind === "cresc" ? 8 : 1;
  svg.appendChild(staffSvgEl("path", {
    d: "M" + x1 + " " + (y - open) + " L" + x2 + " " + (y - close) + " M" + x1 + " " + (y + open) + " L" + x2 + " " + (y + close),
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.2",
    class: "staff-hairpin"
  }));
}

function drumInputEvents(music) {
  var ast = parseDrumNotation(music);
  var columns;
  var out = [];
  var i;
  if (!ast) {
    return null;
  }
  columns = drumLayoutColumns(ast, null);
  for (i = 0; i < columns.length; i++) {
    if (columns[i].kind === "barline" || !columns[i].span) {
      continue;
    }
    out.push({
      kind: columns[i].kind,
      open: columns[i].span.open,
      contentStart: columns[i].span.contentStart,
      contentEnd: columns[i].span.contentEnd,
      close: columns[i].span.close
    });
  }
  return out;
}

function renderExample(line, notation, role, opts) {
  if (notation === "drum") {
    return renderDrumStaff(line, role, opts);
  }
  return renderMusicStaff(line, role, opts);
}

function clearDrumStaffCache() {
  drumAstCache = new Map();
}
