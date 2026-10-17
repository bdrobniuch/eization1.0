/* Share links.
 * #s= is the original JSON form and still opens.
 * #s2= is raw deflate of a packed exercise. A staff line that parses becomes
 * parser events; any other line stays the original text. The page keeps
 * whichever hash is shorter.
 */

var SHARE_URL_MAX = 8000;

var SHARE_KEYS = [
  "C", "G", "D", "A", "E", "B", "F#", "C#",
  "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb",
  "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m",
  "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm", "Abm"
];

var SHARE_DURS = ["w", "h", "q", "e", "s", "h.", "q.", "e.", "s.", "n"];
var SHARE_ACCS = ["", "#", "b", "n", "##", "bb"];
var SHARE_DYN = ["pp", "p", "mp", "mf", "f", "ff", "sfz"];
var SHARE_ART_NAME = ["staccato", "accent", "tenuto", "marcato"];
var SHARE_ART_CHAR = ["'", ">", "-", "^"];

var SHARE_LEN_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10,
  11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115,
  131, 163, 195, 227, 258
];
var SHARE_LEN_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 2, 2, 2, 2,
  3, 3, 3, 3, 4, 4, 4, 4,
  5, 5, 5, 5, 0
];
var SHARE_DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577
];
var SHARE_DIST_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
  7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13
];

var shareLitTable = null;
var shareDistTable = null;

function shareUtf8Encode(text) {
  var out = [];
  var i;
  var c;
  var c2;
  text = String(text || "");
  for (i = 0; i < text.length; i++) {
    c = text.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < text.length) {
      c2 = text.charCodeAt(i + 1);
      if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
        c = ((c - 0xD800) << 10) + (c2 - 0xDC00) + 0x10000;
        i++;
      }
    }
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    } else if (c < 0x10000) {
      out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    } else {
      out.push(
        0xF0 | (c >> 18),
        0x80 | ((c >> 12) & 63),
        0x80 | ((c >> 6) & 63),
        0x80 | (c & 63)
      );
    }
  }
  return out;
}

function shareUtf8Decode(bytes) {
  var out = "";
  var i = 0;
  var c;
  var c2;
  var c3;
  var c4;
  var cp;
  if (!bytes) {
    return "";
  }
  while (i < bytes.length) {
    c = bytes[i];
    if (c < 0x80) {
      out += String.fromCharCode(c);
      i++;
      continue;
    }
    if ((c & 0xE0) === 0xC0 && i + 1 < bytes.length) {
      c2 = bytes[i + 1];
      if ((c2 & 0xC0) !== 0x80 || c < 0xC2) {
        return null;
      }
      cp = ((c & 31) << 6) | (c2 & 63);
      out += String.fromCharCode(cp);
      i += 2;
      continue;
    }
    if ((c & 0xF0) === 0xE0 && i + 2 < bytes.length) {
      c2 = bytes[i + 1];
      c3 = bytes[i + 2];
      if ((c2 & 0xC0) !== 0x80 || (c3 & 0xC0) !== 0x80) {
        return null;
      }
      cp = ((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63);
      if (cp < 0x800 || (cp >= 0xD800 && cp <= 0xDFFF)) {
        return null;
      }
      out += String.fromCharCode(cp);
      i += 3;
      continue;
    }
    if ((c & 0xF8) === 0xF0 && i + 3 < bytes.length) {
      c2 = bytes[i + 1];
      c3 = bytes[i + 2];
      c4 = bytes[i + 3];
      if ((c2 & 0xC0) !== 0x80 || (c3 & 0xC0) !== 0x80 || (c4 & 0xC0) !== 0x80 || c > 0xF4) {
        return null;
      }
      cp = ((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63);
      if (cp < 0x10000 || cp > 0x10FFFF) {
        return null;
      }
      cp -= 0x10000;
      out += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 1023));
      i += 4;
      continue;
    }
    return null;
  }
  return out;
}

function ShareCur(bytes) {
  this.b = bytes || [];
  this.i = 0;
}

ShareCur.prototype.u8 = function () {
  if (this.i >= this.b.length) {
    return -1;
  }
  return this.b[this.i++] & 255;
};

ShareCur.prototype.u16 = function () {
  var hi = this.u8();
  var lo = this.u8();
  if (hi < 0 || lo < 0) {
    return -1;
  }
  return (hi << 8) | lo;
};

ShareCur.prototype.take = function (n) {
  var out = [];
  var i;
  if (n < 0 || this.i + n > this.b.length) {
    return null;
  }
  for (i = 0; i < n; i++) {
    out.push(this.b[this.i++] & 255);
  }
  return out;
};

function sharePush(out, bytes) {
  var i;
  for (i = 0; i < bytes.length; i++) {
    out.push(bytes[i] & 255);
  }
}

function sharePushU16(out, value) {
  out.push((value >> 8) & 255, value & 255);
}

function shareWriteU8Str(out, text) {
  var bytes = shareUtf8Encode(text);
  if (!bytes.length || bytes.length > 255) {
    return false;
  }
  out.push(bytes.length);
  sharePush(out, bytes);
  return true;
}

function shareWriteU16Str(out, text) {
  var bytes = shareUtf8Encode(text || "");
  if (bytes.length > 65535) {
    return false;
  }
  sharePushU16(out, bytes.length);
  sharePush(out, bytes);
  return true;
}

function shareReadU8Str(cur) {
  var n = cur.u8();
  var bytes;
  if (n <= 0) {
    return null;
  }
  bytes = cur.take(n);
  if (!bytes) {
    return null;
  }
  return shareUtf8Decode(bytes);
}

function shareReadU16Str(cur) {
  var n = cur.u16();
  var bytes;
  if (n < 0) {
    return null;
  }
  if (!n) {
    return "";
  }
  bytes = cur.take(n);
  if (!bytes) {
    return null;
  }
  return shareUtf8Decode(bytes);
}

function shareKeyIndex(raw) {
  var s = String(raw || "").replace(/\u266F/g, "#").replace(/\u266D/g, "b").replace(/^\s+|\s+$/g, "");
  var m = /^([A-Ga-g])([#b]?)(m)?$/.exec(s);
  var name;
  var i;
  if (!m) {
    return -1;
  }
  name = m[1].toUpperCase() + (m[2] || "") + (m[3] ? "m" : "");
  for (i = 0; i < SHARE_KEYS.length; i++) {
    if (SHARE_KEYS[i] === name) {
      return i;
    }
  }
  return -1;
}

function shareHeaderFromMusic(music) {
  var tokens;
  var bass = false;
  var keyIndex = 0;
  var i = 0;
  var dir;
  var idx;
  if (typeof staffTokenize !== "function") {
    return null;
  }
  tokens = staffTokenize(music);
  while (i < tokens.length) {
    dir = tokens[i];
    if (dir === "@treble") {
      bass = false;
      i++;
      continue;
    }
    if (dir === "@bass") {
      bass = true;
      i++;
      continue;
    }
    if (dir.indexOf("@key=") === 0) {
      idx = shareKeyIndex(dir.slice(5));
      if (idx < 0) {
        return null;
      }
      keyIndex = idx;
      i++;
      continue;
    }
    if (dir.charAt(0) === "@") {
      return null;
    }
    break;
  }
  return { bass: bass, keyIndex: keyIndex };
}

function shareArtByte(list) {
  var b = 0;
  var i;
  var k;
  if (!list || !list.length) {
    return 0;
  }
  if (list.length > 4) {
    return -1;
  }
  for (i = 0; i < list.length; i++) {
    k = SHARE_ART_NAME.indexOf(list[i]);
    if (k < 0) {
      return -1;
    }
    b |= k << (i * 2);
  }
  return b;
}

function shareArtsFromByte(count, b) {
  var list = [];
  var i;
  if (count < 0 || count > 4) {
    return null;
  }
  for (i = 0; i < count; i++) {
    list.push(SHARE_ART_NAME[(b >> (i * 2)) & 3]);
  }
  return list;
}

function shareArtString(list) {
  var s = "";
  var i;
  var k;
  if (!list) {
    return "";
  }
  for (i = 0; i < list.length; i++) {
    k = SHARE_ART_NAME.indexOf(list[i]);
    if (k < 0) {
      return null;
    }
    s += SHARE_ART_CHAR[k];
  }
  return s;
}

function shareFlagByte(ev, articCount, tie, withLabel) {
  var f = 0;
  if (ev.chord) {
    f |= 1;
  }
  if (ev.dynamic) {
    f |= 2;
  }
  if (ev.hairpin) {
    f |= 4;
  }
  if (withLabel && (ev.label || ev.above)) {
    f |= 8;
  }
  f |= (articCount & 7) << 4;
  if (tie) {
    f |= 128;
  }
  return f;
}

/* Below then above, in one stored string. No separator means the old single label. */
function sharePackLabels(below, above) {
  if (above) {
    return (below || "") + "\u0001" + above;
  }
  return below || "";
}

function shareUnpackLabels(packed) {
  var s = packed || "";
  var at = s.indexOf("\u0001");
  if (at < 0) {
    return { below: s, above: "" };
  }
  return { below: s.slice(0, at), above: s.slice(at + 1) };
}

function sharePitchWord(pitch) {
  var letter;
  var acc;
  var oct;
  var dur;
  var word;
  if (!pitch) {
    return -1;
  }
  letter = "CDEFGAB".indexOf(pitch.letter);
  acc = SHARE_ACCS.indexOf(pitch.accidental || "");
  oct = pitch.octave;
  dur = SHARE_DURS.indexOf(pitch.duration || "q");
  if (letter < 0 || acc < 0 || oct < 0 || oct > 9 || dur < 0) {
    return -1;
  }
  word = letter | (acc << 3) | (oct << 6) | (dur << 10);
  if (pitch.force) {
    word |= 0x4000;
  }
  return word;
}

function sharePitchFromWord(word) {
  var letter;
  var acc;
  var oct;
  var dur;
  if (word < 0 || word > 0xFFFF || (word & 0x8000)) {
    return null;
  }
  letter = word & 7;
  acc = (word >> 3) & 7;
  oct = (word >> 6) & 15;
  dur = (word >> 10) & 15;
  if (letter > 6 || acc > 5 || oct > 9 || dur < 0 || dur >= SHARE_DURS.length) {
    return null;
  }
  return {
    letter: "CDEFGAB".charAt(letter),
    accidental: SHARE_ACCS[acc],
    octave: oct,
    duration: SHARE_DURS[dur],
    force: (word & 0x4000) !== 0
  };
}

function shareIsBeamDur(dur) {
  return dur === "e" || dur === "s" || dur === "e." || dur === "s.";
}

function shareWriteMarks(out, ev, flags) {
  var count = (flags >> 4) & 7;
  var art;
  var dyn;
  if (count) {
    art = shareArtByte(ev.articulations);
    if (art < 0) {
      return false;
    }
    out.push(art);
  }
  if (flags & 1) {
    if (!ev.chord || !shareWriteU8Str(out, ev.chord)) {
      return false;
    }
  }
  if (flags & 2) {
    dyn = SHARE_DYN.indexOf(ev.dynamic);
    if (dyn < 0) {
      return false;
    }
    out.push(dyn);
  }
  if (flags & 4) {
    if (ev.hairpin !== "cresc" && ev.hairpin !== "dim") {
      return false;
    }
    out.push(ev.hairpin === "dim" ? 1 : 0);
  }
  if (flags & 8) {
    var packedLabel = sharePackLabels(ev.label, ev.above);
    if (!packedLabel || !shareWriteU8Str(out, packedLabel)) {
      return false;
    }
  }
  return true;
}

function shareReadMarks(cur, flags) {
  var count = (flags >> 4) & 7;
  var marks = { articulations: [], chord: "", dynamic: "", hairpin: "", label: "" };
  var art;
  var text;
  var dyn;
  var hair;
  if (count > 4) {
    return null;
  }
  if (count) {
    art = cur.u8();
    if (art < 0) {
      return null;
    }
    marks.articulations = shareArtsFromByte(count, art);
    if (!marks.articulations) {
      return null;
    }
  }
  if (flags & 1) {
    text = shareReadU8Str(cur);
    if (text == null) {
      return null;
    }
    marks.chord = text;
  }
  if (flags & 2) {
    dyn = cur.u8();
    if (dyn < 0 || dyn >= SHARE_DYN.length) {
      return null;
    }
    marks.dynamic = SHARE_DYN[dyn];
  }
  if (flags & 4) {
    hair = cur.u8();
    if (hair !== 0 && hair !== 1) {
      return null;
    }
    marks.hairpin = hair ? "dim" : "cresc";
  }
  if (flags & 8) {
    text = shareReadU8Str(cur);
    if (text == null) {
      return null;
    }
    marks.label = text;
  }
  return marks;
}

function shareApplyMarks(ev, marks) {
  if (marks.chord) {
    ev.chord = marks.chord;
  }
  if (marks.dynamic) {
    ev.dynamic = marks.dynamic;
  }
  if (marks.hairpin) {
    ev.hairpin = marks.hairpin;
  }
  if (marks.label) {
    var unpacked = shareUnpackLabels(marks.label);
    if (unpacked.below) {
      ev.label = unpacked.below;
    }
    if (unpacked.above) {
      ev.above = unpacked.above;
    }
  }
  if (marks.articulations && marks.articulations.length) {
    ev.articulations = marks.articulations;
  }
}

function shareWriteEvent(out, ev, inTuplet) {
  var flags;
  var word;
  var dur;
  var count;
  var i;
  var note;
  var inner;
  var nflags;
  var pitch;
  if (!ev) {
    return false;
  }
  if (ev.type === "barline") {
    if (inTuplet) {
      return false;
    }
    out.push(5);
    return true;
  }
  if (ev.type === "simile") {
    if (inTuplet) {
      return false;
    }
    flags = shareFlagByte(ev, 0, false, false);
    out.push(6, flags);
    return shareWriteMarks(out, ev, flags);
  }
  if (ev.type === "rest") {
    dur = SHARE_DURS.indexOf(ev.duration || "q");
    if (dur < 0) {
      return false;
    }
    flags = shareFlagByte(ev, (ev.articulations || []).length, false, true);
    out.push(2, flags, dur);
    return shareWriteMarks(out, ev, flags);
  }
  if (ev.type === "note") {
    if (ev.head === "beat") {
      if ((ev.pitch && ev.pitch.duration) && ev.pitch.duration !== "q") {
        return false;
      }
      flags = shareFlagByte(ev, (ev.articulations || []).length, !!ev.tieToNext, true);
      out.push(4, flags);
      return shareWriteMarks(out, ev, flags);
    }
    if (ev.head === "slash") {
      dur = SHARE_DURS.indexOf((ev.pitch && ev.pitch.duration) || ev.duration || "q");
      if (dur < 0) {
        return false;
      }
      flags = shareFlagByte(ev, (ev.articulations || []).length, !!ev.tieToNext, true);
      out.push(3, flags, dur);
      return shareWriteMarks(out, ev, flags);
    }
    word = sharePitchWord(ev.pitch);
    if (word < 0) {
      return false;
    }
    flags = shareFlagByte(ev, (ev.articulations || []).length, !!ev.tieToNext, true);
    out.push(1, flags);
    sharePushU16(out, word);
    return shareWriteMarks(out, ev, flags);
  }
  if (ev.type === "beam") {
    if (!ev.notes || !ev.notes.length || ev.notes.length > 255) {
      return false;
    }
    flags = shareFlagByte(ev, 0, !!ev.tieToNext, false);
    out.push(7, flags);
    if (!shareWriteMarks(out, ev, flags)) {
      return false;
    }
    out.push(ev.notes.length);
    for (i = 0; i < ev.notes.length; i++) {
      note = ev.notes[i];
      count = (note.articulations || []).length;
      nflags = 0;
      if (note.head === "slash") {
        nflags |= 1;
      } else if (note.head) {
        return false;
      }
      if (note.tieToNext) {
        nflags |= 2;
      }
      nflags |= (count & 7) << 2;
      if (note.label || note.above) {
        nflags |= 32;
      }
      out.push(nflags);
      if (note.head === "slash") {
        dur = SHARE_DURS.indexOf((note.pitch && note.pitch.duration) || note.duration || "q");
        if (dur < 0 || !shareIsBeamDur(SHARE_DURS[dur])) {
          return false;
        }
        out.push(dur);
      } else {
        pitch = note.pitch || note;
        if (!shareIsBeamDur(pitch.duration || note.duration || "q")) {
          return false;
        }
        word = sharePitchWord(pitch);
        if (word < 0) {
          return false;
        }
        sharePushU16(out, word);
      }
      if (count) {
        inner = shareArtByte(note.articulations);
        if (inner < 0) {
          return false;
        }
        out.push(inner);
      }
      if ((note.label || note.above) && !shareWriteU8Str(out, sharePackLabels(note.label, note.above))) {
        return false;
      }
    }
    return true;
  }
  if (ev.type === "stack") {
    if (!ev.pitches || !ev.pitches.length || ev.pitches.length > 255) {
      return false;
    }
    var pitchMarks = false;
    flags = shareFlagByte(ev, 0, !!ev.tieToNext, true);
    for (i = 0; i < ev.pitches.length; i++) {
      if (ev.pitches[i].label || ev.pitches[i].above) {
        pitchMarks = true;
        break;
      }
    }
    if (pitchMarks) {
      flags |= 16;
    }
    out.push(8, flags);
    if (!shareWriteMarks(out, ev, flags & ~8 & ~16)) {
      return false;
    }
    out.push(ev.pitches.length);
    for (i = 0; i < ev.pitches.length; i++) {
      word = sharePitchWord(ev.pitches[i]);
      if (word < 0) {
        return false;
      }
      sharePushU16(out, word);
    }
    if (pitchMarks) {
      for (i = 0; i < ev.pitches.length; i++) {
        pitch = ev.pitches[i];
        word = sharePackLabels(pitch.label, pitch.above);
        if (word) {
          out.push(1);
          if (!shareWriteU8Str(out, word)) {
            return false;
          }
        } else {
          out.push(0);
        }
      }
    }
    if (flags & 8) {
      /* First slot is the chord name. Old links stored only that name. */
      word = sharePackLabels(ev.above, ev.label);
      if (!word || !shareWriteU8Str(out, word)) {
        return false;
      }
    }
    return true;
  }
  if (ev.type === "tuplet") {
    if (inTuplet || !ev.events || ev.n < 2 || ev.n > 16 || ev.m < 1 || ev.m > 16) {
      return false;
    }
    flags = 0;
    if (ev.showRatio) {
      flags |= 1;
    }
    if (ev.tieToNext) {
      flags |= 2;
    }
    if (ev.chord) {
      flags |= 4;
    }
    if (ev.dynamic) {
      flags |= 8;
    }
    if (ev.hairpin) {
      flags |= 16;
    }
    out.push(9, ev.n, ev.m, flags);
    if ((flags & 4) && !shareWriteU8Str(out, ev.chord)) {
      return false;
    }
    if (flags & 8) {
      dur = SHARE_DYN.indexOf(ev.dynamic);
      if (dur < 0) {
        return false;
      }
      out.push(dur);
    }
    if (flags & 16) {
      if (ev.hairpin !== "cresc" && ev.hairpin !== "dim") {
        return false;
      }
      out.push(ev.hairpin === "dim" ? 1 : 0);
    }
    if (!shareWriteEvents(out, ev.events, true)) {
      return false;
    }
    out.push(15);
    return true;
  }
  return false;
}

function shareWriteEvents(out, events, inTuplet) {
  var i;
  for (i = 0; i < events.length; i++) {
    if (!shareWriteEvent(out, events[i], inTuplet)) {
      return false;
    }
  }
  return true;
}

function shareReadEvent(cur, tag, inTuplet) {
  var flags;
  var marks;
  var ev;
  var word;
  var dur;
  var count;
  var i;
  var note;
  var nflags;
  var pitch;
  var arts;
  var text;
  var n;
  var m;
  if (tag === 5) {
    if (inTuplet) {
      return null;
    }
    return { type: "barline" };
  }
  if (tag === 6) {
    if (inTuplet) {
      return null;
    }
    flags = cur.u8();
    if (flags < 0 || (flags & (8 | 112 | 128))) {
      return null;
    }
    marks = shareReadMarks(cur, flags);
    if (!marks) {
      return null;
    }
    ev = { type: "simile" };
    shareApplyMarks(ev, marks);
    return ev;
  }
  if (tag === 2) {
    flags = cur.u8();
    dur = cur.u8();
    if (flags < 0 || dur < 0 || dur > 8 || (flags & 128)) {
      return null;
    }
    marks = shareReadMarks(cur, flags);
    if (!marks) {
      return null;
    }
    ev = { type: "rest", duration: SHARE_DURS[dur] };
    shareApplyMarks(ev, marks);
    return ev;
  }
  if (tag === 4 || tag === 3 || tag === 1) {
    flags = cur.u8();
    if (flags < 0) {
      return null;
    }
    ev = {
      type: "note",
      articulations: [],
      label: "",
      tieToNext: (flags & 128) !== 0
    };
    if (tag === 1) {
      word = cur.u16();
      pitch = sharePitchFromWord(word);
      if (!pitch) {
        return null;
      }
      ev.pitch = pitch;
      ev.duration = pitch.duration;
    } else if (tag === 3) {
      dur = cur.u8();
      if (dur < 0 || dur > 8) {
        return null;
      }
      ev.head = "slash";
      ev.duration = SHARE_DURS[dur];
      ev.pitch = { duration: ev.duration };
    } else {
      ev.head = "beat";
      ev.duration = "q";
      ev.pitch = { duration: "q" };
    }
    marks = shareReadMarks(cur, flags);
    if (!marks) {
      return null;
    }
    shareApplyMarks(ev, marks);
    return ev;
  }
  if (tag === 7) {
    flags = cur.u8();
    if (flags < 0 || ((flags >> 4) & 7) || (flags & 8)) {
      return null;
    }
    marks = shareReadMarks(cur, flags);
    count = cur.u8();
    if (!marks || count <= 0) {
      return null;
    }
    ev = { type: "beam", notes: [], tieToNext: (flags & 128) !== 0 };
    shareApplyMarks(ev, marks);
    for (i = 0; i < count; i++) {
      nflags = cur.u8();
      if (nflags < 0) {
        return null;
      }
      note = {
        type: "note",
        articulations: [],
        label: "",
        tieToNext: (nflags & 2) !== 0
      };
      if (nflags & 1) {
        dur = cur.u8();
        if (dur < 0 || dur > 8 || !shareIsBeamDur(SHARE_DURS[dur])) {
          return null;
        }
        note.head = "slash";
        note.duration = SHARE_DURS[dur];
        note.pitch = { duration: note.duration };
      } else {
        word = cur.u16();
        pitch = sharePitchFromWord(word);
        if (!pitch || !shareIsBeamDur(pitch.duration)) {
          return null;
        }
        note.pitch = pitch;
        note.duration = pitch.duration;
      }
      arts = (nflags >> 2) & 7;
      if (arts > 4) {
        return null;
      }
      if (arts) {
        word = cur.u8();
        if (word < 0) {
          return null;
        }
        note.articulations = shareArtsFromByte(arts, word);
      }
      if (nflags & 32) {
        text = shareReadU8Str(cur);
        if (text == null) {
          return null;
        }
        var noteLabels = shareUnpackLabels(text);
        note.label = noteLabels.below;
        if (noteLabels.above) {
          note.above = noteLabels.above;
        }
      }
      ev.notes.push(note);
    }
    return ev;
  }
  if (tag === 8) {
    flags = cur.u8();
    if (flags < 0 || (flags & (32 | 64))) {
      return null;
    }
    marks = shareReadMarks(cur, flags & ~8 & ~16);
    count = cur.u8();
    if (!marks || count <= 0) {
      return null;
    }
    ev = { type: "stack", pitches: [], tieToNext: (flags & 128) !== 0, label: "", above: "" };
    shareApplyMarks(ev, marks);
    for (i = 0; i < count; i++) {
      word = cur.u16();
      pitch = sharePitchFromWord(word);
      if (!pitch) {
        return null;
      }
      ev.pitches.push(pitch);
    }
    if (flags & 16) {
      for (i = 0; i < count; i++) {
        dur = cur.u8();
        if (dur === 0) {
          continue;
        }
        if (dur !== 1) {
          return null;
        }
        text = shareReadU8Str(cur);
        if (text == null) {
          return null;
        }
        var toneLabels = shareUnpackLabels(text);
        if (toneLabels.below) {
          ev.pitches[i].label = toneLabels.below;
        }
        if (toneLabels.above) {
          ev.pitches[i].above = toneLabels.above;
        }
      }
    }
    if (flags & 8) {
      text = shareReadU8Str(cur);
      if (text == null) {
        return null;
      }
      /* Old links stored the chord name alone, so the first slot stays above. */
      var stackLabels = shareUnpackLabels(text);
      if (stackLabels.below) {
        ev.above = stackLabels.below;
      }
      if (stackLabels.above) {
        ev.label = stackLabels.above;
      }
    }
    ev.duration = ev.pitches[0].duration;
    return ev;
  }
  if (tag === 9) {
    if (inTuplet) {
      return null;
    }
    n = cur.u8();
    m = cur.u8();
    flags = cur.u8();
    if (n < 2 || n > 16 || m < 1 || m > 16 || flags < 0) {
      return null;
    }
    ev = {
      type: "tuplet",
      n: n,
      m: m,
      showRatio: (flags & 1) !== 0,
      tieToNext: (flags & 2) !== 0,
      events: []
    };
    if (flags & 4) {
      text = shareReadU8Str(cur);
      if (text == null) {
        return null;
      }
      ev.chord = text;
    }
    if (flags & 8) {
      dur = cur.u8();
      if (dur < 0 || dur >= SHARE_DYN.length) {
        return null;
      }
      ev.dynamic = SHARE_DYN[dur];
    }
    if (flags & 16) {
      dur = cur.u8();
      if (dur !== 0 && dur !== 1) {
        return null;
      }
      ev.hairpin = dur ? "dim" : "cresc";
    }
    ev.events = shareReadEvents(cur, true, 1);
    if (!ev.events) {
      return null;
    }
    return ev;
  }
  return null;
}

function shareReadEvents(cur, nested, depth) {
  var events = [];
  var tag;
  var ev;
  if (depth > 3) {
    return null;
  }
  while (true) {
    tag = cur.u8();
    if (tag < 0) {
      return null;
    }
    if (tag === 0) {
      if (nested) {
        return null;
      }
      return events;
    }
    if (tag === 15) {
      if (!nested) {
        return null;
      }
      return events;
    }
    ev = shareReadEvent(cur, tag, nested);
    if (!ev) {
      return null;
    }
    events.push(ev);
  }
}

function sharePrintPitch(p, artic, label, tie, above) {
  var arts = shareArtString(artic);
  var s;
  if (!p || arts == null) {
    return null;
  }
  s = p.letter + (p.accidental || "") + String(p.octave) + (p.duration || "q");
  if (p.force) {
    s += "!";
  }
  s += arts;
  if (label) {
    s += "_" + label;
  }
  if (above) {
    s += "^" + above;
  }
  if (tie) {
    s += "~";
  }
  return s;
}

function sharePrintSlash(beat, dur, artic, label, tie, above) {
  var arts = shareArtString(artic);
  var s = "/";
  if (arts == null) {
    return null;
  }
  if (!beat) {
    s += dur || "q";
  }
  s += arts;
  if (label) {
    s += "_" + label;
  }
  if (above) {
    s += "^" + above;
  }
  if (tie) {
    s += "~";
  }
  return s;
}

function sharePrintNote(ev) {
  if (ev.head === "beat") {
    return sharePrintSlash(true, "q", ev.articulations, ev.label, ev.tieToNext, ev.above);
  }
  if (ev.head === "slash") {
    return sharePrintSlash(false, (ev.pitch && ev.pitch.duration) || ev.duration, ev.articulations, ev.label, ev.tieToNext, ev.above);
  }
  return sharePrintPitch(ev.pitch, ev.articulations, ev.label, ev.tieToNext, ev.above);
}

function sharePrintEvents(events) {
  var parts = [];
  var i;
  var j;
  var toks;
  var core;
  if (!events || !events.length) {
    return null;
  }
  for (i = 0; i < events.length; i++) {
    toks = [];
    if (events[i].type !== "barline") {
      if (events[i].hairpin === "cresc" || events[i].hairpin === "dim") {
        toks.push(events[i].hairpin);
      }
      if (events[i].chord) {
        toks.push("^" + events[i].chord);
      }
      if (events[i].dynamic) {
        toks.push(events[i].dynamic);
      }
    }
    if (events[i].type === "barline") {
      core = "|";
    } else if (events[i].type === "simile") {
      core = "%";
    } else if (events[i].type === "rest") {
      var restArts = shareArtString(events[i].articulations);
      if (restArts == null) {
        return null;
      }
      core = "r" + (events[i].duration || "q") + restArts;
      if (events[i].label) {
        core += "_" + events[i].label;
      }
      if (events[i].above) {
        core += "^" + events[i].above;
      }
    } else if (events[i].type === "note") {
      core = sharePrintNote(events[i]);
    } else if (events[i].type === "beam") {
      core = sharePrintBeam(events[i]);
    } else if (events[i].type === "stack") {
      core = sharePrintStack(events[i]);
    } else if (events[i].type === "tuplet") {
      core = sharePrintTuplet(events[i]);
    } else {
      return null;
    }
    if (core == null) {
      return null;
    }
    toks.push(core);
    for (j = 0; j < toks.length; j++) {
      parts.push(toks[j]);
    }
  }
  return parts.join(" ");
}

function sharePrintBeam(ev) {
  var inner = [];
  var i;
  var tok;
  for (i = 0; i < ev.notes.length; i++) {
    tok = sharePrintNote(ev.notes[i]);
    if (!tok) {
      return null;
    }
    inner.push(tok);
  }
  return "{" + inner.join(" ") + "}" + (ev.tieToNext ? "~" : "");
}

function sharePrintStack(ev) {
  var inner = [];
  var i;
  var tok;
  for (i = 0; i < ev.pitches.length; i++) {
    tok = sharePrintPitch(ev.pitches[i], [], ev.pitches[i].label, false, ev.pitches[i].above);
    if (!tok) {
      return null;
    }
    inner.push(tok);
  }
  var tail = "";
  if (ev.above) {
    tail += "^" + ev.above;
  }
  if (ev.label) {
    tail += "_" + ev.label;
  }
  return "[" + inner.join(" ") + "]" + tail + (ev.tieToNext ? "~" : "");
}

function sharePrintTuplet(ev) {
  var inner = sharePrintEvents(ev.events);
  if (inner == null) {
    return null;
  }
  return "(" + ev.n + (ev.showRatio ? ":" + ev.m : "") + " " + inner + ")" + (ev.tieToNext ? "~" : "");
}

function shareEncodeStaffLine(line) {
  var parts;
  var header;
  var ast;
  var out;
  if (typeof staffExampleParts !== "function" || typeof parseMusicNotation !== "function") {
    return null;
  }
  parts = staffExampleParts(line);
  header = shareHeaderFromMusic(parts.music);
  ast = parseMusicNotation(parts.music);
  if (!header || !ast || !ast.events || !ast.events.length) {
    return null;
  }
  out = [(header.bass ? 128 : 0) | header.keyIndex];
  if (!shareWriteEvents(out, ast.events, false)) {
    return null;
  }
  out.push(0);
  if (!shareWriteU16Str(out, parts.caption || "")) {
    return null;
  }
  return out;
}

function shareUnpackStaffBytes(cur) {
  var header;
  var events;
  var body;
  var caption;
  var parts;
  header = cur.u8();
  if (header < 0 || (header & 96) || (header & 31) > 30) {
    return null;
  }
  events = shareReadEvents(cur, false, 0);
  if (!events || !events.length) {
    return null;
  }
  caption = shareReadU16Str(cur);
  if (caption == null) {
    return null;
  }
  body = sharePrintEvents(events);
  if (body == null) {
    return null;
  }
  parts = [];
  if (header & 128) {
    parts.push("@bass");
  }
  if (header & 31) {
    parts.push("@key=" + SHARE_KEYS[header & 31]);
  }
  parts.push(body);
  if (caption) {
    return parts.join(" ") + " \u00B7 " + caption;
  }
  return parts.join(" ");
}

function shareSigStr(value) {
  return encodeURIComponent(String(value || ""));
}

function shareSigPitch(p) {
  if (!p) {
    return "";
  }
  return shareSigStr(p.letter) + shareSigStr(p.accidental) + shareSigStr(p.octave) + shareSigStr(p.duration || "q") + (p.force ? "!" : "");
}

function shareSigMark(ev) {
  return shareSigStr(ev.chord) + "/" + shareSigStr(ev.dynamic) + "/" + shareSigStr(ev.hairpin) + (ev.hairpinEnd ? (ev.hairpinEndAtHead ? ">" : "]") : "") + (ev.tieToNext ? "~" : "");
}

function shareSigArts(list) {
  var s = "";
  var i;
  if (!list) {
    return "";
  }
  for (i = 0; i < list.length; i++) {
    s += shareSigStr(list[i]) + ",";
  }
  return s;
}

function shareSigEvent(ev) {
  var s;
  var i;
  if (!ev || !ev.type) {
    return null;
  }
  if (ev.type === "barline") {
    return "|";
  }
  if (ev.type === "rest") {
    return "r" + shareSigMark(ev) + shareSigStr(ev.duration) + shareSigArts(ev.articulations) + shareSigStr(ev.label) + shareSigStr(ev.above);
  }
  if (ev.type === "simile") {
    return "%" + shareSigMark(ev);
  }
  if (ev.type === "note") {
    return "n" + shareSigMark(ev) + shareSigStr(ev.head) + shareSigPitch(ev.pitch) + shareSigArts(ev.articulations) + shareSigStr(ev.label) + shareSigStr(ev.above);
  }
  if (ev.type === "beam") {
    s = "B" + shareSigMark(ev);
    for (i = 0; i < ev.notes.length; i++) {
      s += "{" + shareSigEvent(ev.notes[i]);
    }
    return s;
  }
  if (ev.type === "stack") {
    s = "S" + shareSigMark(ev) + shareSigStr(ev.above) + shareSigStr(ev.label);
    for (i = 0; i < ev.pitches.length; i++) {
      s += "[" + shareSigPitch(ev.pitches[i]) + shareSigStr(ev.pitches[i].label) + shareSigStr(ev.pitches[i].above);
    }
    return s;
  }
  if (ev.type === "tuplet") {
    s = "T" + ev.n + ":" + ev.m + (ev.showRatio ? "r" : "") + shareSigMark(ev);
    for (i = 0; i < ev.events.length; i++) {
      s += "<" + shareSigEvent(ev.events[i]);
    }
    return s;
  }
  return null;
}

function shareStaffSig(line) {
  var parts;
  var header;
  var ast;
  var body = "";
  var i;
  var one;
  if (typeof staffExampleParts !== "function" || typeof parseMusicNotation !== "function") {
    return "";
  }
  parts = staffExampleParts(line);
  header = shareHeaderFromMusic(parts.music);
  ast = parseMusicNotation(parts.music);
  if (!header || !ast || !ast.events) {
    return "";
  }
  for (i = 0; i < ast.events.length; i++) {
    one = shareSigEvent(ast.events[i]);
    if (one == null) {
      return "";
    }
    body += "\n" + one;
  }
  return (header.bass ? "b" : "t") + String(header.keyIndex) + body + "\n" + shareSigStr(parts.caption);
}

function staffShareCanonical(line) {
  var bytes;
  var cur;
  var canon;
  var again;
  var cur2;
  var canon2;
  var sig;
  if (typeof staffNotationStatus !== "function") {
    return "";
  }
  if (!staffNotationStatus(line).ok) {
    return "";
  }
  bytes = shareEncodeStaffLine(line);
  if (!bytes) {
    return "";
  }
  cur = new ShareCur(bytes);
  canon = shareUnpackStaffBytes(cur);
  if (!canon || cur.i !== bytes.length || canon.length > 240) {
    return "";
  }
  sig = shareStaffSig(line);
  if (!sig || sig !== shareStaffSig(canon)) {
    return "";
  }
  again = shareEncodeStaffLine(canon);
  if (!again) {
    return "";
  }
  cur2 = new ShareCur(again);
  canon2 = shareUnpackStaffBytes(cur2);
  if (canon2 !== canon || cur2.i !== again.length) {
    return "";
  }
  return canon;
}

function ShareBits() {
  this.bytes = [];
  this.acc = 0;
  this.n = 0;
}

ShareBits.prototype.raw = function (value, len) {
  var i;
  for (i = 0; i < len; i++) {
    if ((value >> i) & 1) {
      this.acc |= 1 << this.n;
    }
    this.n++;
    if (this.n === 8) {
      this.bytes.push(this.acc);
      this.acc = 0;
      this.n = 0;
    }
  }
};

ShareBits.prototype.huff = function (code, len) {
  var i;
  for (i = len - 1; i >= 0; i--) {
    this.raw((code >> i) & 1, 1);
  }
};

ShareBits.prototype.finish = function () {
  if (this.n) {
    this.bytes.push(this.acc);
    this.acc = 0;
    this.n = 0;
  }
  return this.bytes;
};

function ShareRead(bytes) {
  this.bytes = bytes || [];
  this.i = 0;
  this.acc = 0;
  this.n = 0;
}

ShareRead.prototype.raw = function (len) {
  var v = 0;
  var i;
  var bit;
  for (i = 0; i < len; i++) {
    if (!this.n) {
      if (this.i >= this.bytes.length) {
        return -1;
      }
      this.acc = this.bytes[this.i++] & 255;
      this.n = 8;
    }
    bit = this.acc & 1;
    this.acc >>= 1;
    this.n--;
    v |= bit << i;
  }
  return v;
};

ShareRead.prototype.align = function () {
  this.n = 0;
  this.acc = 0;
};

function shareHuffTable(lens) {
  var max = 0;
  var blCount = [];
  var next = [];
  var codes = [];
  var rev = [];
  var i;
  var bits;
  var code;
  var sym;
  var len;
  for (i = 0; i <= 15; i++) {
    blCount[i] = 0;
  }
  for (i = 0; i < lens.length; i++) {
    len = lens[i] || 0;
    if (len > max) {
      max = len;
    }
    blCount[len]++;
  }
  code = 0;
  blCount[0] = 0;
  for (bits = 1; bits <= max; bits++) {
    code = (code + blCount[bits - 1]) << 1;
    next[bits] = code;
  }
  for (sym = 0; sym < lens.length; sym++) {
    len = lens[sym] || 0;
    if (!len) {
      continue;
    }
    codes[sym] = next[len];
    if (!rev[len]) {
      rev[len] = [];
    }
    rev[len][next[len]] = sym;
    next[len]++;
  }
  return { codes: codes, lens: lens, rev: rev, max: max };
}

function shareLitHuff() {
  var lens = [];
  var i;
  if (shareLitTable) {
    return shareLitTable;
  }
  for (i = 0; i <= 143; i++) {
    lens[i] = 8;
  }
  for (i = 144; i <= 255; i++) {
    lens[i] = 9;
  }
  for (i = 256; i <= 279; i++) {
    lens[i] = 7;
  }
  for (i = 280; i <= 287; i++) {
    lens[i] = 8;
  }
  shareLitTable = shareHuffTable(lens);
  return shareLitTable;
}

function shareDistHuff() {
  var lens = [];
  var i;
  if (shareDistTable) {
    return shareDistTable;
  }
  for (i = 0; i < 32; i++) {
    lens[i] = 5;
  }
  shareDistTable = shareHuffTable(lens);
  return shareDistTable;
}

function shareReadSym(reader, table) {
  var code = 0;
  var len;
  var bit;
  for (len = 1; len <= table.max; len++) {
    bit = reader.raw(1);
    if (bit < 0) {
      return -1;
    }
    code = (code << 1) | bit;
    if (table.rev[len] && table.rev[len][code] != null) {
      return table.rev[len][code];
    }
  }
  return -1;
}

function shareCopyLen(reader, sym) {
  var idx = sym - 257;
  var extra;
  var add;
  if (idx < 0 || idx >= SHARE_LEN_BASE.length) {
    return -1;
  }
  extra = SHARE_LEN_EXTRA[idx];
  add = extra ? reader.raw(extra) : 0;
  if (add < 0) {
    return -1;
  }
  return SHARE_LEN_BASE[idx] + add;
}

function shareCopyDist(reader, sym) {
  var extra;
  var add;
  if (sym < 0 || sym >= SHARE_DIST_BASE.length) {
    return -1;
  }
  extra = SHARE_DIST_EXTRA[sym];
  add = extra ? reader.raw(extra) : 0;
  if (add < 0) {
    return -1;
  }
  return SHARE_DIST_BASE[sym] + add;
}

function shareLenCode(len) {
  var i;
  var extra;
  var add;
  var bits;
  for (i = SHARE_LEN_BASE.length - 1; i >= 0; i--) {
    if (len < SHARE_LEN_BASE[i]) {
      continue;
    }
    bits = SHARE_LEN_EXTRA[i];
    add = len - SHARE_LEN_BASE[i];
    extra = bits ? (1 << bits) : 1;
    if (add < extra) {
      return { sym: 257 + i, extra: add, bits: bits };
    }
  }
  return null;
}

function shareDistCode(dist) {
  var i;
  var bits;
  var add;
  var extra;
  for (i = SHARE_DIST_BASE.length - 1; i >= 0; i--) {
    if (dist < SHARE_DIST_BASE[i]) {
      continue;
    }
    bits = SHARE_DIST_EXTRA[i];
    add = dist - SHARE_DIST_BASE[i];
    extra = bits ? (1 << bits) : 1;
    if (add < extra) {
      return { sym: i, extra: add, bits: bits };
    }
  }
  return null;
}

function shareInflateStored(reader, out) {
  var len;
  var nlen;
  var k;
  reader.align();
  if (reader.i + 4 > reader.bytes.length) {
    return false;
  }
  len = reader.bytes[reader.i] | (reader.bytes[reader.i + 1] << 8);
  nlen = reader.bytes[reader.i + 2] | (reader.bytes[reader.i + 3] << 8);
  reader.i += 4;
  if (((len ^ 0xFFFF) & 0xFFFF) !== nlen) {
    return false;
  }
  if (reader.i + len > reader.bytes.length) {
    return false;
  }
  for (k = 0; k < len; k++) {
    out.push(reader.bytes[reader.i++] & 255);
  }
  return true;
}

function shareInflateFixed(reader, out) {
  var lit = shareLitHuff();
  var distTable = shareDistHuff();
  var sym;
  var len;
  var distSym;
  var dist;
  var k;
  while (true) {
    sym = shareReadSym(reader, lit);
    if (sym < 0) {
      return false;
    }
    if (sym < 256) {
      out.push(sym);
      continue;
    }
    if (sym === 256) {
      return true;
    }
    len = shareCopyLen(reader, sym);
    distSym = shareReadSym(reader, distTable);
    dist = shareCopyDist(reader, distSym);
    if (len < 3 || dist < 1 || dist > out.length) {
      return false;
    }
    for (k = 0; k < len; k++) {
      out.push(out[out.length - dist]);
    }
  }
}

function shareInflate(bytes) {
  var reader;
  var out;
  var bfinal;
  var btype;
  if (!bytes) {
    return null;
  }
  reader = new ShareRead(bytes);
  out = [];
  do {
    bfinal = reader.raw(1);
    btype = reader.raw(2);
    if (bfinal < 0 || btype < 0) {
      return null;
    }
    if (btype === 0) {
      if (!shareInflateStored(reader, out)) {
        return null;
      }
    } else if (btype === 1) {
      if (!shareInflateFixed(reader, out)) {
        return null;
      }
    } else {
      return null;
    }
  } while (!bfinal);
  return out;
}

function shareDeflateStored(src) {
  var bits = new ShareBits();
  var bytes;
  var nlen;
  var i;
  bits.raw(1, 1);
  bits.raw(0, 2);
  bytes = bits.finish();
  nlen = (src.length ^ 0xFFFF) & 0xFFFF;
  bytes.push(src.length & 255, (src.length >> 8) & 255, nlen & 255, (nlen >> 8) & 255);
  for (i = 0; i < src.length; i++) {
    bytes.push(src[i] & 255);
  }
  return bytes;
}

function shareEmitLit(bits, table, sym) {
  if (!table.lens[sym]) {
    return false;
  }
  bits.huff(table.codes[sym], table.lens[sym]);
  return true;
}

function shareDeflateFixed(src) {
  var bits = new ShareBits();
  var lit = shareLitHuff();
  var distTable = shareDistHuff();
  var head = [];
  var prev = [];
  var i;
  var h;
  var pos;
  var steps;
  var len;
  var bestLen;
  var bestDist;
  var maxLen;
  var windowStart;
  var code;
  var dcode;
  for (i = 0; i < 32768; i++) {
    head[i] = -1;
  }
  for (i = 0; i < src.length; i++) {
    prev[i] = -1;
  }
  bits.raw(1, 1);
  bits.raw(1, 2);
  i = 0;
  while (i < src.length) {
    bestLen = 0;
    bestDist = 0;
    if (i + 2 < src.length) {
      h = ((src[i] << 10) ^ (src[i + 1] << 5) ^ src[i + 2]) & 32767;
      pos = head[h];
      steps = 0;
      windowStart = i - 32768;
      if (windowStart < 0) {
        windowStart = 0;
      }
      maxLen = src.length - i;
      if (maxLen > 258) {
        maxLen = 258;
      }
      while (pos >= windowStart && steps < 128) {
        len = 0;
        while (len < maxLen && src[pos + len] === src[i + len]) {
          len++;
        }
        if (len > bestLen) {
          bestLen = len;
          bestDist = i - pos;
        }
        steps++;
        pos = prev[pos];
      }
      prev[i] = head[h];
      head[h] = i;
    }
    if (bestLen >= 3) {
      code = shareLenCode(bestLen);
      dcode = shareDistCode(bestDist);
      if (!code || !dcode || !shareEmitLit(bits, lit, code.sym)) {
        return null;
      }
      if (code.bits) {
        bits.raw(code.extra, code.bits);
      }
      if (!shareEmitLit(bits, distTable, dcode.sym)) {
        return null;
      }
      if (dcode.bits) {
        bits.raw(dcode.extra, dcode.bits);
      }
      len = i + bestLen;
      i++;
      while (i < len) {
        if (i + 2 < src.length) {
          h = ((src[i] << 10) ^ (src[i + 1] << 5) ^ src[i + 2]) & 32767;
          prev[i] = head[h];
          head[h] = i;
        }
        i++;
      }
    } else {
      if (!shareEmitLit(bits, lit, src[i] & 255)) {
        return null;
      }
      i++;
    }
  }
  if (!shareEmitLit(bits, lit, 256)) {
    return null;
  }
  return bits.finish();
}

function shareBytesEqual(a, b) {
  var i;
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  for (i = 0; i < a.length; i++) {
    if ((a[i] & 255) !== (b[i] & 255)) {
      return false;
    }
  }
  return true;
}

function shareDeflate(src) {
  var fixed = shareDeflateFixed(src);
  var stored = shareDeflateStored(src);
  if (!fixed || stored.length < fixed.length) {
    return stored;
  }
  return fixed;
}

function shareCodecOk() {
  var samples = [[], [0], [255, 0, 255, 65]];
  var src = [];
  var i;
  var back;
  for (i = 0; i < 80; i++) {
    src.push(7);
  }
  samples.push(src);
  src = [];
  for (i = 0; i < 40; i++) {
    src.push(65 + (i % 5));
  }
  for (i = 0; i < 8; i++) {
    src = src.concat(src.slice(0, 40));
  }
  samples.push(src);
  src = [];
  for (i = 0; i < 400; i++) {
    src.push((i * 17) & 255);
  }
  samples.push(src);
  for (i = 0; i < samples.length; i++) {
    back = shareInflate(shareDeflate(samples[i]));
    if (!shareBytesEqual(samples[i], back)) {
      return false;
    }
  }
  return true;
}

function sharePackExercise(snap) {
  var raw = [];
  var stored = [];
  var i;
  var j;
  var nameBytes;
  var canon;
  var staffBytes;
  var textBytes;
  var deflated;
  var back;
  var unpacked;
  if (!snap || !snap.shareId || !snap.lines || !snap.lines.length) {
    return null;
  }
  for (i = 0; i < 8; i++) {
    raw.push(snap.shareId.charCodeAt(i) & 255);
  }
  nameBytes = shareUtf8Encode(snap.name || "");
  if (nameBytes.length > 65535) {
    return null;
  }
  sharePushU16(raw, nameBytes.length);
  sharePush(raw, nameBytes);
  raw.push(snap.bars & 255);
  sharePushU16(raw, snap.lines.length);
  for (i = 0; i < snap.lines.length; i++) {
    canon = staffShareCanonical(snap.lines[i]);
    staffBytes = canon ? shareEncodeStaffLine(canon) : null;
    if (staffBytes) {
      raw.push(1);
      sharePush(raw, staffBytes);
      stored.push(canon);
      continue;
    }
    textBytes = shareUtf8Encode(snap.lines[i]);
    if (textBytes.length > 65535) {
      return null;
    }
    raw.push(0);
    sharePushU16(raw, textBytes.length);
    sharePush(raw, textBytes);
    stored.push(snap.lines[i]);
  }
  deflated = shareDeflate(raw);
  back = shareInflate(deflated);
  if (!shareBytesEqual(raw, back)) {
    return null;
  }
  unpacked = shareUnpackExercise(back);
  if (!unpacked || unpacked.id !== snap.shareId || unpacked.name !== snap.name || unpacked.bars !== snap.bars) {
    return null;
  }
  if (unpacked.lines.length !== stored.length) {
    return null;
  }
  for (j = 0; j < stored.length; j++) {
    if (unpacked.lines[j] !== stored[j]) {
      return null;
    }
  }
  return deflated;
}

function shareUnpackExercise(bytes) {
  var cur = new ShareCur(bytes);
  var idBytes;
  var id = "";
  var name;
  var bars;
  var count;
  var lines = [];
  var i;
  var kind;
  var textBytes;
  var text;
  var line;
  var start;
  idBytes = cur.take(8);
  if (!idBytes) {
    return null;
  }
  for (i = 0; i < 8; i++) {
    id += String.fromCharCode(idBytes[i]);
  }
  if (!/^[a-z0-9]{8}$/.test(id)) {
    return null;
  }
  name = shareReadU16Str(cur);
  bars = cur.u8();
  count = cur.u16();
  if (name == null || bars < 1 || bars > 16 || count < 1 || count > 500) {
    return null;
  }
  for (i = 0; i < count; i++) {
    kind = cur.u8();
    if (kind === 1) {
      start = cur.i;
      line = shareUnpackStaffBytes(cur);
      if (!line || cur.i === start) {
        return null;
      }
      lines.push(line);
    } else if (kind === 0) {
      textBytes = cur.take(cur.u16());
      if (!textBytes) {
        return null;
      }
      text = shareUtf8Decode(textBytes);
      if (text == null) {
        return null;
      }
      lines.push(text);
    } else {
      return null;
    }
  }
  if (cur.i !== bytes.length || !lines.length) {
    return null;
  }
  return { id: id, name: name, bars: bars, lines: lines };
}

function shareEncode(text) {
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function shareDecode(text) {
  var pad = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  while (pad.length % 4) {
    pad += "=";
  }
  return decodeURIComponent(escape(atob(pad)));
}

function shareEncodeBytes(bytes) {
  var s = "";
  var i;
  for (i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i] & 255);
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function shareDecodeBytes(text) {
  var pad = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  var bin;
  var out = [];
  var i;
  while (pad.length % 4) {
    pad += "=";
  }
  try {
    bin = atob(pad);
  } catch (err) {
    return null;
  }
  for (i = 0; i < bin.length; i++) {
    out.push(bin.charCodeAt(i) & 255);
  }
  return out;
}

function isShareHash(hash) {
  var text = String(hash || "");
  return text.indexOf("#s=") === 0 || text.indexOf("#s2=") === 0;
}

function sharePageBase() {
  var link = document.querySelector("link[rel='canonical']");
  var url = link && link.href ? link.href : window.location.href;
  return String(url).split("#")[0].split("?")[0];
}

function shareJsonHash(snap) {
  return "#s=" + shareEncode(JSON.stringify({
    v: 1,
    id: snap.shareId,
    name: snap.name,
    bars: snap.bars,
    lines: snap.lines
  }));
}

function shareHashFromPayload(payload) {
  var snap;
  var v1;
  var packed;
  var v2;
  if (!payload || payload.v !== 1 || typeof shareSnapshot !== "function") {
    return "";
  }
  snap = shareSnapshot({
    id: payload.id,
    name: payload.name,
    bars: payload.bars,
    lines: payload.lines
  });
  if (!snap) {
    return "";
  }
  if (typeof cleanDeskLines === "function") {
    // A 240-character cut can end on a space. One more clean drops it, so the link matches the desk.
    snap.lines = cleanDeskLines(snap.lines);
    if (!snap.lines.length) {
      return "";
    }
  }
  v1 = shareJsonHash(snap);
  packed = sharePackExercise(snap);
  if (!packed) {
    return v1;
  }
  v2 = "#s2=" + shareEncodeBytes(packed);
  if (v2.length < v1.length) {
    return v2;
  }
  return v1;
}

function shareExerciseUrl(payload, base) {
  var hash = shareHashFromPayload(payload);
  var root;
  var url;
  if (!hash) {
    return "";
  }
  root = base == null ? sharePageBase() : String(base);
  url = root + hash;
  if (url.length > SHARE_URL_MAX) {
    return "";
  }
  return url;
}

function shareReadV2(payload) {
  var raw = shareDecodeBytes(payload);
  var bytes;
  var snap;
  if (!raw) {
    return null;
  }
  bytes = shareInflate(raw);
  if (!bytes) {
    return null;
  }
  snap = shareUnpackExercise(bytes);
  if (!snap || typeof shareSnapshot !== "function") {
    return null;
  }
  return shareSnapshot({
    id: snap.id,
    name: snap.name,
    bars: snap.bars,
    lines: snap.lines
  });
}

function readShareHash(hash) {
  var text = String(hash || "");
  var json;
  if (text.charAt(0) === "#") {
    text = text.slice(1);
  }
  if (text.indexOf("s2=") === 0) {
    return shareReadV2(text.slice(3));
  }
  if (text.indexOf("s=") !== 0) {
    return null;
  }
  try {
    json = JSON.parse(shareDecode(text.slice(2)));
  } catch (err) {
    return null;
  }
  if (!json || json.v !== 1 || typeof shareSnapshot !== "function") {
    return null;
  }
  return shareSnapshot({
    id: json.id,
    name: json.name,
    bars: json.bars,
    lines: json.lines
  });
}
