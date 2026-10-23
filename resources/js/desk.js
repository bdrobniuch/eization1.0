var DESK_KEY = "eization-desk";
/* schema 1 (2026-10-15): stock rows record seedRev and touched.
   schema 2 (2026-10-15): one launch drops saved exercises, re-seeds the stock list, and clears the intro.
   schema 3 (2026-10-17): ]_ after a stack becomes ]^, so a saved chord name stays above the staff. */
var DESK_SCHEMA = 3;
var DESK_EXERCISE_CAP = 40;
var deskReady = false;
var deskTimer = null;
var deskNoteTimer = null;
var deskSeenStamp = "";
var deskForeignPending = false;
var deskWatching = false;
var deskUnreadableRaw = "";

function readDesk() {
  var raw = "";
  try {
    raw = localStorage.getItem(DESK_KEY);
    if (!raw) {
      return null;
    }
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      deskUnreadableRaw = raw;
      return null;
    }
    deskUnreadableRaw = "";
    return data;
  } catch (err) {
    deskUnreadableRaw = raw || "\u0000";
    return null;
  }
}

function rememberUnreadableDesk() {
  var raw = deskUnreadableRaw;
  if (!raw) {
    return;
  }
  deskUnreadableRaw = "";
  if (raw !== "\u0000") {
    try {
      localStorage.setItem(DESK_KEY + "-bak", raw);
    } catch (err) {}
  }
  if (typeof showDeskNote === "function" && typeof t === "function") {
    showDeskNote(t("desk.unreadable"));
  }
}

function deskExerciseStamp(data) {
  var list = data && data.exercises ? data.exercises : [];
  var parts = [];
  var i;
  var row;
  var lines;
  var deleted;
  for (i = 0; i < list.length; i++) {
    row = list[i];
    if (!row || !row.id) {
      continue;
    }
    lines = row.lines && row.lines.length ? row.lines.join("\n") : "";
    parts.push(
      row.id +
        "\n" +
        (row.name || "") +
        "\n" +
        (row.bars || "") +
        "\n" +
        (row.staff ? "1" : "0") +
        "\n" +
        (row.clef || "") +
        "\n" +
        (row.key || "") +
        "\n" +
        (row.meter ? row.meter.beats + "/" + row.meter.unit : "") +
        "\n" +
        (row.seedId || "") +
        "\n" +
        (row.seedRev || "") +
        "\n" +
        (row.touched ? "1" : "0") +
        "\n" +
        (row.shareId || "") +
        "\n" +
        lines
    );
  }
  deleted = data && data.deletedSeeds && data.deletedSeeds.length ? data.deletedSeeds.join("\n") : "";
  return parts.join("\n\n") + "\n---\n" + deleted;
}

function writeDesk(data) {
  try {
    localStorage.setItem(DESK_KEY, JSON.stringify(data));
    deskSeenStamp = deskExerciseStamp(data);
    return true;
  } catch (err) {
    if (typeof showDeskNote === "function" && typeof t === "function") {
      showDeskNote(t("desk.keepFail"));
    }
    return false;
  }
}

function applyForeignDeskList(reloadOpenExercise) {
  var previousId = typeof currentExerciseId === "string" ? currentExerciseId : "";
  var row = previousId && typeof getDeskExercise === "function" ? getDeskExercise(previousId) : null;
  var gone = !!(previousId && !row);
  var reload = false;
  var data;
  var nextId;
  deskForeignPending = false;
  if (reloadOpenExercise && row && typeof editorDraft !== "undefined" && editorDraft.storedLines != null && typeof editorPlainLines === "function") {
    reload = editorPlainLines(row.lines) !== editorDraft.storedLines;
  }
  if (gone) {
    data = readDesk();
    nextId = "";
    if (data && data.exercise && typeof getDeskExercise === "function" && getDeskExercise(data.exercise)) {
      nextId = data.exercise;
    } else if (typeof firstDeskExerciseId === "function") {
      nextId = firstDeskExerciseId();
    }
    currentExerciseId = nextId;
  }
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if ((gone || reload) && typeof SelectExercise === "function") {
    SelectExercise();
  }
  if (gone && typeof showDeskNote === "function" && typeof t === "function") {
    showDeskNote(t("desk.otherWindow"));
  }
}

function onForeignDesk(event) {
  var data;
  var stamp;
  if (!event || event.key !== DESK_KEY || event.newValue == null) {
    return;
  }
  data = readDesk();
  stamp = deskExerciseStamp(data);
  if (stamp === deskSeenStamp) {
    return;
  }
  deskSeenStamp = stamp;
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    deskForeignPending = true;
    return;
  }
  applyForeignDeskList(false);
}

function watchForeignDesk() {
  if (deskWatching) {
    return;
  }
  deskWatching = true;
  window.addEventListener("storage", onForeignDesk);
}

function deskState() {
  return readDesk() || {};
}

function patchDesk(part) {
  var data = deskState();
  for (var key in part) {
    if (Object.prototype.hasOwnProperty.call(part, key)) {
      data[key] = part[key];
    }
  }
  writeDesk(data);
  return data;
}

function clampDeskInt(value, min, max, fallback) {
  var n = parseInt(value, 10);
  if (isNaN(n)) {
    return fallback;
  }
  if (n < min) {
    return min;
  }
  if (n > max) {
    return max;
  }
  return n;
}

function cleanClickList(list) {
  if (!list || !list.length) {
    return null;
  }
  var out = [];
  var n = list.length > 64 ? 64 : list.length;
  for (var i = 0; i < n; i++) {
    var level = list[i] === true ? 1 : parseInt(list[i], 10);
    out.push(level === 1 || level === 2 ? level : 0);
  }
  return out;
}

function cleanDeskLines(lines) {
  var clean = [];
  if (!lines || !lines.length) {
    return clean;
  }
  for (var i = 0; i < lines.length && clean.length < 500; i++) {
    var line = typeof itemToLine === "function" ? itemToLine(lines[i]) : String(lines[i] || "");
    if (!line) {
      continue;
    }
    clean.push(line.length > 240 ? line.slice(0, 240) : line);
  }
  return clean;
}

function cleanDeskClef(value) {
  return value === "bass" ? "bass" : "";
}

function cleanDeskKey(value) {
  var text = String(value || "").trim();
  var m;
  if (!text || text === "C") {
    return "";
  }
  text = text.replace(/\u266F/g, "#").replace(/\u266D/g, "b");
  m = /^([A-Ga-g])([#b]?)(m)?$/i.exec(text);
  if (!m) {
    return "";
  }
  text = m[1].toUpperCase() + (m[2] || "") + (m[3] ? "m" : "");
  if (typeof staffParseKeyName !== "function" || !staffParseKeyName(text)) {
    return "";
  }
  return text;
}

function cleanDeskMeter(raw) {
  var beats;
  var unit;
  if (!raw) {
    return null;
  }
  if (typeof raw === "string") {
    var parts = raw.split("/");
    if (parts.length !== 2) {
      return null;
    }
    beats = parseInt(parts[0], 10);
    unit = parseInt(parts[1], 10);
  } else if (typeof raw === "object") {
    beats = parseInt(raw.beats != null ? raw.beats : raw.top, 10);
    unit = parseInt(raw.unit != null ? raw.unit : raw.bottom, 10);
  } else {
    return null;
  }
  if (!beats || beats < 1 || beats > 32) {
    return null;
  }
  if (unit !== 1 && unit !== 2 && unit !== 4 && unit !== 8 && unit !== 16) {
    return null;
  }
  return { beats: beats, unit: unit };
}

function assignDeskDefaults(record, src) {
  var clef;
  var key;
  var meter;
  if (!record) {
    return record;
  }
  clef = cleanDeskClef(src && src.clef);
  key = cleanDeskKey(src && src.key);
  meter = cleanDeskMeter(src && src.meter);
  if (clef) {
    record.clef = clef;
  } else {
    delete record.clef;
  }
  if (key) {
    record.key = key;
  } else {
    delete record.key;
  }
  if (meter) {
    record.meter = meter;
  } else {
    delete record.meter;
  }
  return record;
}

function deskStaffOpts(record) {
  return {
    clef: record && record.clef === "bass" ? "bass" : "treble",
    key: record && record.key ? record.key : "C"
  };
}

function deskDefaultsEqual(a, b) {
  var ac = (a && a.clef) || "";
  var bc = (b && b.clef) || "";
  var ak = (a && a.key) || "";
  var bk = (b && b.key) || "";
  var am = a && a.meter;
  var bm = b && b.meter;
  if (ac !== bc || ak !== bk) {
    return false;
  }
  if (!am && !bm) {
    return true;
  }
  if (!am || !bm) {
    return false;
  }
  return am.beats === bm.beats && am.unit === bm.unit;
}

function formatDeskMeter(meter) {
  if (!meter) {
    return "";
  }
  return meter.beats + "/" + meter.unit;
}

function applyPracticeStaffDefaults(record) {
  if (typeof staffSetActiveDefaults === "function") {
    staffSetActiveDefaults(deskStaffOpts(record));
  }
}

function cleanDeskName(name, fallback) {
  var text = String(name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  if (!text) {
    text = fallback || t("edit.defaultName");
  }
  if (text.length > 60) {
    text = text.slice(0, 60);
  }
  return text;
}

function deskIdForSeed(seedId) {
  return "ex:" + seedId;
}

function exerciseUsesStaff(ex) {
  if (!ex) {
    return false;
  }
  if (ex.staff === true) {
    return true;
  }
  if (ex.staff === false) {
    return false;
  }
  return linesLookLikeStaff(catalogPlainLines(ex));
}

function catalogPlainLines(ex) {
  var lines = [];
  var i;
  var line;
  if (!ex || !ex.items) {
    return lines;
  }
  for (i = 0; i < ex.items.length; i++) {
    line = typeof itemToLine === "function" ? itemToLine(ex.items[i]) : String(ex.items[i] || "");
    if (line) {
      lines.push(line.length > 240 ? line.slice(0, 240) : line);
    }
  }
  return lines;
}

function linesLookLikeStaff(lines) {
  var i;
  var line;
  var parts;
  if (!lines || !lines.length || typeof parseMusicNotation !== "function") {
    return false;
  }
  for (i = 0; i < lines.length; i++) {
    line = typeof itemToLine === "function" ? itemToLine(lines[i]) : String(lines[i] || "");
    if (!line) {
      return false;
    }
    parts = typeof staffExampleParts === "function" ? staffExampleParts(line) : { music: line };
    if (!parseMusicNotation(parts.music || line)) {
      return false;
    }
  }
  return true;
}

function catalogLines(ex) {
  return catalogPlainLines(ex);
}

function deskDisplayItem(line, staff) {
  var raw = String(line || "");
  if (staff) {
    return typeof itemToLine === "function" ? itemToLine(raw) : raw;
  }
  return typeof lineToItem === "function" ? lineToItem(raw) : raw;
}

function rewriteStackChordLine(line) {
  return String(line || "").replace(/\]_/g, "]^");
}

function normalizeDeskExercise(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  var lines = cleanDeskLines(raw.lines);
  if (!lines.length) {
    return null;
  }
  var id = typeof raw.id === "string" && raw.id ? raw.id : "";
  if (!id) {
    return null;
  }
  var record = {
    id: id,
    name: cleanDeskName(raw.name, t("menu.kicker")),
    bars: clampDeskInt(raw.bars, 1, 16, 1),
    staff: deskStaffValue(raw, lines),
    lines: lines
  };
  assignDeskDefaults(record, raw);
  if (typeof raw.seedId === "string" && raw.seedId) {
    record.seedId = raw.seedId;
    if (raw.touched === true) {
      record.touched = true;
    } else if (raw.touched === false) {
      record.touched = false;
    }
    var seedRev = parseInt(raw.seedRev, 10);
    if (seedRev > 0) {
      record.seedRev = seedRev;
    }
  }
  var shareId = cleanShareId(raw.shareId);
  if (shareId) {
    record.shareId = shareId;
  }
  return record;
}

function deskStaffValue(raw, lines) {
  if (raw && raw.staff === true) {
    return true;
  }
  if (raw && raw.staff === false) {
    return false;
  }
  if (raw && typeof raw.seedId === "string" && raw.seedId && typeof exercises !== "undefined" && exercises[raw.seedId]) {
    return exerciseUsesStaff(exercises[raw.seedId]);
  }
  return linesLookLikeStaff(lines);
}

function cleanShareId(value) {
  var text = String(value || "");
  if (!/^[a-z0-9]{8}$/.test(text)) {
    return "";
  }
  return text;
}

function shareLinesMatch(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  var i;
  for (i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function shareLineCanonical(line, opts) {
  if (typeof staffShareCanonical !== "function") {
    return "";
  }
  if (typeof staffRunWithDefaults === "function") {
    return staffRunWithDefaults(opts || null, function () {
      return staffShareCanonical(line);
    });
  }
  return staffShareCanonical(line);
}

function shareLinesSame(a, b, aOpts, bOpts) {
  var i;
  var left;
  var right;
  if (shareLinesMatch(a, b)) {
    return true;
  }
  if (!a || !b || a.length !== b.length || typeof staffShareCanonical !== "function") {
    return false;
  }
  for (i = 0; i < a.length; i++) {
    if (a[i] === b[i]) {
      continue;
    }
    left = shareLineCanonical(a[i], aOpts);
    right = shareLineCanonical(b[i], bOpts);
    if (!left || left !== right) {
      return false;
    }
  }
  return true;
}

function shareSnapshot(part) {
  if (!part) {
    return null;
  }
  var shareId = cleanShareId(part.id || part.shareId);
  var lines = cleanDeskLines(part.lines);
  if (!shareId || !lines.length) {
    return null;
  }
  var snap = {
    shareId: shareId,
    name: cleanDeskName(part.name, t("edit.defaultName")),
    bars: clampDeskInt(part.bars, 1, 16, 1),
    staff: part.staff === true || part.staff === false ? part.staff : linesLookLikeStaff(lines),
    lines: lines
  };
  assignDeskDefaults(snap, part);
  return snap;
}

function findDeskShare(part) {
  var snap = shareSnapshot(part);
  var out = { exact: null, related: null, snapshot: snap };
  if (!snap) {
    return out;
  }
  var list = ensureDeskExercises();
  var i;
  var row;
  for (i = 0; i < list.length; i++) {
    row = list[i];
    if (cleanShareId(row.shareId) !== snap.shareId) {
      continue;
    }
    if (!out.related) {
      out.related = row;
    }
    if (
      row.bars === snap.bars &&
      !!row.staff === !!snap.staff &&
      shareLinesSame(row.lines, snap.lines, deskStaffOpts(row), deskStaffOpts(snap)) &&
      (row.name === snap.name || row.seedId)
    ) {
      out.exact = row;
      break;
    }
  }
  if (out.exact || out.related) {
    return out;
  }
  for (i = 0; i < list.length; i++) {
    row = list[i];
    if (!row.seedId) {
      continue;
    }
    if (
      row.bars === snap.bars &&
      !!row.staff === !!snap.staff &&
      shareLinesSame(row.lines, snap.lines, deskStaffOpts(row), deskStaffOpts(snap))
    ) {
      out.exact = row;
      break;
    }
  }
  return out;
}

function deskShareOffer(part) {
  var found = findDeskShare(part);
  if (!found.snapshot) {
    return { kind: "bad", full: false, exact: null, related: null };
  }
  if (found.exact) {
    return { kind: "exact", full: false, exact: found.exact, related: found.related };
  }
  var full = ensureDeskExercises().length >= DESK_EXERCISE_CAP;
  return {
    kind: found.related ? "changed" : "new",
    full: full,
    exact: null,
    related: found.related
  };
}

function catalogExerciseRecord(seedId) {
  if (typeof exercises === "undefined") {
    return null;
  }
  var ex = exercises[seedId];
  if (!ex) {
    return null;
  }
  var lines = catalogLines(ex);
  if (!lines.length) {
    return null;
  }
  var record = {
    id: deskIdForSeed(seedId),
    seedId: seedId,
    seedRev: exerciseRev(seedId),
    touched: false,
    name: cleanDeskName(ex.label, seedId),
    bars: clampDeskInt(ex.bars, 1, 16, 1),
    staff: exerciseUsesStaff(ex),
    lines: lines
  };
  assignDeskDefaults(record, ex);
  return record;
}

function exerciseRev(seedId) {
  var ex = typeof exercises !== "undefined" && exercises[seedId];
  var rev = ex && parseInt(ex.rev, 10);
  if (!rev || rev < 1) {
    return 1;
  }
  return rev;
}

function shareCatalogHref(saved) {
  var fresh;
  if (!saved || saved.touched !== false || !saved.seedId || typeof sharePageBase !== "function") {
    return "";
  }
  fresh = catalogExerciseRecord(saved.seedId);
  if (
    !fresh ||
    fresh.bars !== saved.bars ||
    !!fresh.staff !== !!saved.staff ||
    !deskDefaultsEqual(saved, fresh) ||
    !shareLinesMatch(saved.lines, fresh.lines)
  ) {
    return "";
  }
  if (typeof stockNameIsCatalog === "function" && !stockNameIsCatalog(saved.seedId, saved.name)) {
    return "";
  }
  return sharePageBase() + "?exercise=" + saved.seedId;
}

function seedFromCatalog(seedId) {
  if (typeof exercises === "undefined" || !exercises[seedId] || !exercises[seedId].inMenu) {
    return null;
  }
  return catalogExerciseRecord(seedId);
}

function addCatalogExercise(seedId) {
  var list = ensureDeskExercises();
  var i;
  var row;
  var data;
  var deleted;
  var gone;
  for (i = 0; i < list.length; i++) {
    if (list[i].seedId === seedId) {
      return list[i];
    }
  }
  if (list.length >= DESK_EXERCISE_CAP) {
    return null;
  }
  row = catalogExerciseRecord(seedId);
  if (!row) {
    return null;
  }
  list.push(row);
  data = deskState();
  data.exercises = list;
  data.exercise = row.id;
  deleted = listDeletedSeeds(data);
  gone = deleted.indexOf(seedId);
  if (gone >= 0) {
    deleted.splice(gone, 1);
    data.deletedSeeds = deleted;
  }
  if (!writeDesk(data)) {
    return null;
  }
  return row;
}

function listDeletedSeeds(data) {
  var out = [];
  var raw = data && data.deletedSeeds;
  if (!raw || !raw.length) {
    return out;
  }
  for (var i = 0; i < raw.length; i++) {
    if (typeof raw[i] === "string" && raw[i] && out.indexOf(raw[i]) < 0) {
      out.push(raw[i]);
    }
  }
  return out;
}

function legacyCustomRecord(data) {
  var custom = data && data.custom;
  if (!custom || !custom.lines || !custom.lines.length) {
    return null;
  }
  var lines = cleanDeskLines(custom.lines);
  if (!lines.length) {
    return null;
  }
  return {
    id: "ex:legacy-custom",
    name: t("edit.defaultName"),
    bars: clampDeskInt(custom.bars, 1, 16, 1),
    staff: linesLookLikeStaff(lines),
    lines: lines
  };
}

function buildSeededList(deleted) {
  var list = [];
  if (typeof menuOrder === "undefined" || typeof exercises === "undefined") {
    return list;
  }
  for (var i = 0; i < menuOrder.length; i++) {
    var seedId = menuOrder[i];
    if (deleted.indexOf(seedId) >= 0) {
      continue;
    }
    var row = seedFromCatalog(seedId);
    if (row) {
      list.push(row);
    }
  }
  return list;
}

function mergeMissingSeeds(list, deleted) {
  var have = {};
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].seedId) {
      have[list[i].seedId] = true;
    }
  }
  if (typeof menuOrder === "undefined") {
    return list;
  }
  for (i = 0; i < menuOrder.length; i++) {
    if (list.length >= DESK_EXERCISE_CAP) {
      break;
    }
    var seedId = menuOrder[i];
    if (have[seedId] || deleted.indexOf(seedId) >= 0) {
      continue;
    }
    var row = seedFromCatalog(seedId);
    if (row) {
      list.push(row);
    }
  }
  return list;
}

function dedupeDeskIds(list) {
  var seenId = {};
  var seenSeed = {};
  var i;
  for (i = 0; i < list.length; i++) {
    var row = list[i];
    if (seenId[row.id]) {
      var nextId = newDeskExerciseId();
      var guard = 0;
      while (seenId[nextId] && guard < 8) {
        nextId = newDeskExerciseId();
        guard++;
      }
      row.id = nextId;
    }
    seenId[row.id] = true;
    if (row.seedId && seenSeed[row.seedId]) {
      delete row.seedId;
      delete row.seedRev;
      delete row.touched;
    } else if (row.seedId) {
      seenSeed[row.seedId] = true;
    }
  }
  return list;
}

function ensureDeskExercises() {
  var data = deskState();
  rememberUnreadableDesk();
  var schema = parseInt(data.schema, 10);
  if (isNaN(schema) || schema < 0) {
    schema = 0;
  }
  var ahead = schema > DESK_SCHEMA;
  var resetHello = false;
  if (!ahead && schema < 2 && readDesk()) {
    delete data.exercises;
    delete data.deletedSeeds;
    delete data.custom;
    delete data.exercise;
    schema = 2;
    resetHello = true;
  }
  var deleted = listDeletedSeeds(data);
  var list = [];
  var i;
  if (data.exercises && data.exercises.length) {
    for (i = 0; i < data.exercises.length; i++) {
      var row = normalizeDeskExercise(data.exercises[i]);
      if (row) {
        list.push(row);
      }
    }
  }
  var legacy = legacyCustomRecord(data);
  if (legacy) {
    var hasLegacy = false;
    for (i = 0; i < list.length; i++) {
      if (list[i].id === legacy.id) {
        hasLegacy = true;
        break;
      }
    }
    if (!hasLegacy) {
      list.unshift(legacy);
    }
  }
  if (list.length) {
    list = dedupeDeskIds(list);
  }
  if (!list.length) {
    list = buildSeededList(deleted);
  } else {
    list = mergeMissingSeeds(list, deleted);
  }
  if (!list.length) {
    list = buildSeededList([]);
    deleted = [];
  }
  if (!ahead && schema < 1) {
    classifySchema0(list);
  }
  if (!ahead && schema < 3) {
    var si;
    var sj;
    for (si = 0; si < list.length; si++) {
      var stackLines = [];
      var stackChanged = false;
      for (sj = 0; sj < list[si].lines.length; sj++) {
        var stackLine = rewriteStackChordLine(list[si].lines[sj]);
        if (stackLine !== list[si].lines[sj]) {
          stackChanged = true;
        }
        stackLines.push(stackLine);
      }
      if (stackChanged) {
        list[si].lines = stackLines;
      }
    }
  }
  data.exercises = list;
  data.deletedSeeds = deleted;
  delete data.custom;
  if (data.exercise === "custom") {
    data.exercise = legacy ? legacy.id : (list[0] && list[0].id) || "";
  } else if (data.exercise && typeof exercises !== "undefined" && exercises[data.exercise]) {
    data.exercise = deskIdForSeed(data.exercise);
  }
  var mirroredId = "";
  if (!ahead) {
    mirroredId = mirrorUntouchedSeeds(list, data.exercise || "");
    data.schema = DESK_SCHEMA;
  }
  if (writeDesk(data)) {
    deskUnreadableRaw = "";
    if (resetHello && typeof forgetHello === "function") {
      forgetHello();
    }
  }
  if (mirroredId) {
    noteMirroredExercise(list, mirroredId);
  }
  return list;
}

function olderScaleLine(line) {
  return String(line)
    .replace(/^@treble\s+/, "")
    .replace(/\^([A-G](?:\u266F|\u266D|#|b)?)_/, "^");
}

function linesMatchOlderScales(stored, fresh) {
  if (!stored || !fresh || stored.length !== fresh.length) {
    return false;
  }
  var j;
  for (j = 0; j < stored.length; j++) {
    if (olderScaleLine(stored[j]) !== olderScaleLine(fresh[j])) {
      return false;
    }
  }
  return true;
}

function linesMatchOlderProgressions(stored, fresh) {
  if (!stored || !fresh || stored.length !== fresh.length) {
    return false;
  }
  var j;
  for (j = 0; j < stored.length; j++) {
    if (String(stored[j]).replace(/\/q/g, "/") !== String(fresh[j])) {
      return false;
    }
  }
  return true;
}

function stockNameIsCatalog(seedId, name) {
  if (!seedId || typeof exercises === "undefined" || !exercises[seedId]) {
    return false;
  }
  if (typeof canonicalExerciseName === "function") {
    return canonicalExerciseName(seedId, name) === exercises[seedId].label;
  }
  return name === exercises[seedId].label;
}

/* Schema 0 had no touched flag. A stock row still matches the catalog, an older Scales
   spelling, or the older Essential Progressions slashes, and it still uses the catalog name. */
function stockRowIsPristine(row) {
  var fresh;
  if (!row || !row.seedId) {
    return false;
  }
  fresh = catalogExerciseRecord(row.seedId);
  if (
    !fresh ||
    !stockNameIsCatalog(row.seedId, row.name) ||
    row.bars !== fresh.bars ||
    !!row.staff !== !!fresh.staff ||
    !deskDefaultsEqual(row, fresh)
  ) {
    return false;
  }
  if (shareLinesMatch(row.lines, fresh.lines)) {
    return true;
  }
  if (row.seedId === "scales" && linesMatchOlderScales(row.lines, fresh.lines)) {
    return true;
  }
  if (row.seedId === "essentialProgressions" && linesMatchOlderProgressions(row.lines, fresh.lines)) {
    return true;
  }
  return false;
}

function classifySchema0(list) {
  var i;
  var row;
  for (i = 0; i < list.length; i++) {
    row = list[i];
    if (!row || !row.seedId) {
      continue;
    }
    if (row.touched === true || row.touched === false) {
      continue;
    }
    row.touched = !stockRowIsPristine(row);
  }
}

function mirrorUntouchedSeeds(list, openId) {
  var noted = "";
  var i;
  var row;
  var fresh;
  var changed;
  for (i = 0; i < list.length; i++) {
    row = list[i];
    if (!row || !row.seedId) {
      continue;
    }
    if (row.touched !== true && row.touched !== false) {
      row.touched = !stockRowIsPristine(row);
    }
    if (row.touched !== false) {
      continue;
    }
    fresh = catalogExerciseRecord(row.seedId);
    if (!fresh) {
      continue;
    }
    changed =
      !shareLinesMatch(row.lines, fresh.lines) ||
      row.bars !== fresh.bars ||
      row.name !== fresh.name ||
      !!row.staff !== !!fresh.staff ||
      !deskDefaultsEqual(row, fresh);
    row.lines = fresh.lines.slice();
    row.bars = fresh.bars;
    row.staff = fresh.staff;
    row.name = fresh.name;
    assignDeskDefaults(row, fresh);
    row.seedRev = fresh.seedRev;
    row.touched = false;
    if (changed && row.id === openId) {
      noted = row.id;
    }
  }
  return noted;
}

function noteMirroredExercise(list, id) {
  var i;
  var row = null;
  if (!id || typeof showDeskNote !== "function" || typeof tr !== "function") {
    return;
  }
  for (i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      row = list[i];
      break;
    }
  }
  if (!row) {
    return;
  }
  showDeskNote(tr("desk.updated", {
    name: typeof exerciseDisplayName === "function" ? exerciseDisplayName(row) : row.name
  }));
}

function listDeskExercises() {
  return ensureDeskExercises().slice();
}

function getDeskExercise(id) {
  var list = ensureDeskExercises();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return list[i];
    }
  }
  return null;
}

function firstDeskExerciseId() {
  var list = ensureDeskExercises();
  return list.length ? list[0].id : "";
}

function deskExerciseItems(id) {
  var record = getDeskExercise(id);
  if (!record || typeof lineToItem !== "function") {
    return null;
  }
  var items = [];
  for (var i = 0; i < record.lines.length && items.length < 500; i++) {
    var item = deskDisplayItem(record.lines[i], record.staff);
    if (item) {
      items.push(item);
    }
  }
  if (!items.length) {
    return null;
  }
  return {
    items: items,
    bars: record.bars,
    name: record.name,
    staff: !!record.staff,
    clef: record.clef || "",
    key: record.key || "",
    meter: record.meter || null
  };
}

function newDeskExerciseId() {
  return "ex:" + Date.now().toString(36) + Math.floor(Math.random() * 36).toString(36);
}

function updateDeskExercise(id, part) {
  var data = deskState();
  ensureDeskExercises();
  data = deskState();
  var list = data.exercises || [];
  var found = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) {
      continue;
    }
    var next = {
      id: id,
      name: cleanDeskName(part.name != null ? part.name : list[i].name, list[i].name),
      bars: clampDeskInt(part.bars != null ? part.bars : list[i].bars, 1, 16, 1),
      staff: part.staff === true || part.staff === false ? part.staff : !!list[i].staff,
      lines: part.lines != null ? cleanDeskLines(part.lines) : list[i].lines.slice()
    };
    if (!next.lines.length) {
      return null;
    }
    assignDeskDefaults(next, {
      clef: part.clef !== undefined ? part.clef : list[i].clef,
      key: part.key !== undefined ? part.key : list[i].key,
      meter: part.meter !== undefined ? part.meter : list[i].meter
    });
    if (list[i].seedId) {
      next.seedId = list[i].seedId;
    }
    var shareId = cleanShareId(list[i].shareId);
    if (part.shareId != null) {
      var nextShare = cleanShareId(part.shareId);
      if (nextShare) {
        shareId = nextShare;
      }
    }
    if (shareId) {
      next.shareId = shareId;
    }
    if (next.seedId) {
      var freshSeed = catalogExerciseRecord(next.seedId);
      if (
        freshSeed &&
        next.bars === freshSeed.bars &&
        !!next.staff === !!freshSeed.staff &&
        deskDefaultsEqual(next, freshSeed) &&
        shareLinesMatch(next.lines, freshSeed.lines) &&
        stockNameIsCatalog(next.seedId, next.name)
      ) {
        next.touched = false;
        next.seedRev = freshSeed.seedRev;
        next.name = freshSeed.name;
        assignDeskDefaults(next, freshSeed);
      } else {
        next.touched = true;
        if (list[i].seedRev) {
          next.seedRev = list[i].seedRev;
        }
      }
    }
    list[i] = next;
    found = next;
    break;
  }
  if (!found) {
    return null;
  }
  data.exercises = list;
  data.exercise = id;
  if (!writeDesk(data)) {
    return null;
  }
  return found;
}

function createDeskExercise(part) {
  ensureDeskExercises();
  var data = deskState();
  var list = data.exercises || [];
  if (list.length >= DESK_EXERCISE_CAP) {
    return null;
  }
  var lines = cleanDeskLines(part.lines);
  if (!lines.length) {
    return null;
  }
  var row = {
    id: newDeskExerciseId(),
    name: cleanDeskName(part.name, t("edit.defaultName")),
    bars: clampDeskInt(part.bars, 1, 16, 1),
    staff: part.staff === true || part.staff === false ? part.staff : linesLookLikeStaff(lines),
    lines: lines
  };
  assignDeskDefaults(row, part);
  var shareId = cleanShareId(part.shareId);
  if (shareId) {
    row.shareId = shareId;
  }
  list.push(row);
  data.exercises = list;
  data.exercise = row.id;
  if (!writeDesk(data)) {
    return null;
  }
  return row;
}

var DESK_BACKUP_VERSION = 1;

function packDeskExercises() {
  var list = ensureDeskExercises();
  var exercises = [];
  for (var i = 0; i < list.length; i++) {
    var row = {
      name: list[i].name,
      bars: list[i].bars,
      staff: !!list[i].staff,
      lines: list[i].lines.slice()
    };
    assignDeskDefaults(row, list[i]);
    if (list[i].seedId) {
      row.seedId = list[i].seedId;
      if (list[i].touched === true) {
        row.touched = true;
      } else if (list[i].touched === false) {
        row.touched = false;
      }
      if (list[i].seedRev) {
        row.seedRev = list[i].seedRev;
      }
    }
    if (list[i].shareId) {
      row.shareId = list[i].shareId;
    }
    exercises.push(row);
  }
  return {
    eization: DESK_BACKUP_VERSION,
    kind: "exercises",
    exercises: exercises
  };
}

function downloadAllDeskExercises() {
  var payload = packDeskExercises();
  if (!payload.exercises.length) {
    return false;
  }
  var blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "eization-exercises.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1500);
  return true;
}

function parseDeskExercisesBackup(text) {
  var data;
  try {
    data = JSON.parse(String(text || ""));
  } catch (err) {
    return { error: t("desk.badJson") };
  }
  if (!data || typeof data !== "object" || !data.exercises || !data.exercises.length) {
    return { error: t("desk.noExercises") };
  }
  if (data.eization && data.eization > DESK_BACKUP_VERSION) {
    return { error: t("desk.newer") };
  }
  var list = [];
  var seenSeed = {};
  var skipped = 0;
  for (var i = 0; i < data.exercises.length && list.length < DESK_EXERCISE_CAP; i++) {
    var raw = data.exercises[i];
    if (!raw || typeof raw !== "object") {
      skipped++;
      continue;
    }
    var lines = cleanDeskLines(raw.lines);
    if (!lines.length) {
      skipped++;
      continue;
    }
    var row = {
      id: newDeskExerciseId() + String(i),
      name: cleanDeskName(raw.name, t("menu.kicker")),
      bars: clampDeskInt(raw.bars, 1, 16, 1),
      lines: lines
    };
    row.staff = deskStaffValue(raw, lines);
    assignDeskDefaults(row, raw);
    if (typeof raw.seedId === "string" && raw.seedId && !seenSeed[raw.seedId]) {
      row.seedId = raw.seedId;
      row.id = deskIdForSeed(raw.seedId);
      seenSeed[raw.seedId] = true;
      var backupRev = parseInt(raw.seedRev, 10);
      if (backupRev > 0) {
        row.seedRev = backupRev;
      }
      if (raw.touched === true) {
        row.touched = true;
      } else if (raw.touched === false) {
        row.touched = false;
      } else {
        row.touched = !stockRowIsPristine(row);
      }
    }
    var shareId = cleanShareId(raw.shareId);
    if (shareId) {
      row.shareId = shareId;
    }
    list.push(row);
  }
  if (!list.length) {
    return { error: t("desk.noExercises") };
  }
  return {
    exercises: list,
    skipped: skipped,
    truncated: data.exercises.length > list.length + skipped
  };
}

function replaceDeskExercises(list) {
  if (!list || !list.length) {
    return false;
  }
  var haveSeed = {};
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].seedId) {
      haveSeed[list[i].seedId] = true;
    }
  }
  var deleted = [];
  if (typeof menuOrder !== "undefined") {
    for (i = 0; i < menuOrder.length; i++) {
      if (!haveSeed[menuOrder[i]]) {
        deleted.push(menuOrder[i]);
      }
    }
  }
  var data = deskState();
  data.exercises = list;
  data.deletedSeeds = deleted;
  data.exercise = list[0].id;
  if (!writeDesk(data)) {
    return false;
  }
  currentExerciseId = list[0].id;
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (typeof SelectExercise === "function") {
    SelectExercise();
  }
  return true;
}

function deleteDeskExercise(id) {
  ensureDeskExercises();
  var data = deskState();
  var list = data.exercises || [];
  if (list.length <= 1) {
    return false;
  }
  var next = [];
  var removed = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      removed = list[i];
      continue;
    }
    next.push(list[i]);
  }
  if (!removed) {
    return false;
  }
  data.exercises = next;
  var deleted = listDeletedSeeds(data);
  if (removed.seedId && deleted.indexOf(removed.seedId) < 0) {
    deleted.push(removed.seedId);
  }
  data.deletedSeeds = deleted;
  if (data.exercise === id) {
    data.exercise = next[0].id;
  }
  if (!writeDesk(data)) {
    return false;
  }
  return true;
}

function showDeskNote(message) {
  var note = document.getElementById("deskNote");
  if (!note) {
    return;
  }
  note.textContent = message;
  note.hidden = false;
  note.removeAttribute("data-pass-share");
  if (deskNoteTimer) {
    clearTimeout(deskNoteTimer);
  }
  deskNoteTimer = setTimeout(function () {
    note.hidden = true;
  }, 3200);
}

function writeSetupNow() {
  var data = deskState();
  var bpmEl = document.getElementById("bpm");
  var shown = bpmEl ? parseInt(bpmEl.value, 10) : NaN;
  var bpm = shown > 0 ? shown : (typeof tempoHeld === "number" && tempoHeld > 0 ? tempoHeld : 100);
  data.bpm = clampDeskInt(bpm, 1, 500, 100);
  data.beats = clampDeskInt(beatsPerBar, 1, 32, 4);
  data.unit = beatUnit === 1 || beatUnit === 2 || beatUnit === 8 || beatUnit === 16 ? beatUnit : 4;
  data.play = clampDeskInt(playBars, 0, 16, 1);
  data.rest = clampDeskInt(restBars, 0, 16, 0);
  if (data.play === 0 && data.rest === 0) {
    data.play = 1;
  }
  data.repeat = clampDeskInt(repeatCount, 1, 16, 1);
  data.look = !!lookAhead;
  data.sheet = !!scoreSheet;
  data.countIn = !!countInOn;
  data.swing = swingNeo ? "neo" : (swingOn && swingTriplet ? "triplet" : (swingOn ? "feel" : "off"));
  data.swingAuto = !!swingAuto;
  data.swingRatio = typeof swingRatio === "number" ? swingRatio : 1;
  data.swingLit = !!swingLitOffbeats;
  if (typeof activePlayPattern === "function") {
    data.clicks = activePlayPattern().slice();
    data.restClicks = activeRestPattern().slice();
  }
  data.exercise = currentExerciseId || "";
  data.sound = typeof soundOn === "boolean" ? !!soundOn : true;
  if (!data.exercises || !data.exercises.length) {
    ensureDeskExercises();
    data = deskState();
    data.bpm = clampDeskInt(bpm, 1, 500, 100);
    data.exercise = currentExerciseId || "";
    data.sound = typeof soundOn === "boolean" ? !!soundOn : true;
  }
  writeDesk(data);
}

var restoreTimer = null;

function disarmRestoreDefaults() {
  var button = document.getElementById("restoreDefaults");
  if (restoreTimer) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
  }
  if (!button) {
    return;
  }
  button.classList.remove("is-armed");
  button.textContent = t("device.restore");
  button.setAttribute("aria-label", t("device.restore"));
}

function replayIntro() {
  if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
    return;
  }
  if (typeof forgetHello === "function") {
    forgetHello();
  }
  if (typeof showDeskNote === "function" && typeof t === "function") {
    showDeskNote(t("device.introQueued"));
  }
}

function restoreDefaults() {
  if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
    return;
  }
  if (typeof track === "function") {
    track("restore_defaults");
  }
  nextExampleSeen = {};
  var keepReady = deskReady;
  deskReady = false;
  if (deskTimer) {
    clearTimeout(deskTimer);
    deskTimer = null;
  }
  try {
    localStorage.removeItem(DESK_KEY);
  } catch (err) {}
  if (typeof forgetHello === "function") {
    forgetHello();
  }
  if (typeof forgetInstall === "function") {
    forgetInstall();
  }
  clickPattern = [];
  restClickPattern = [];
  swingLitOffbeats = false;
  beatsPerBar = 4;
  beatUnit = 4;
  var meterTop = document.getElementById("meterTop");
  if (meterTop) {
    meterTop.value = "4";
  }
  if (typeof activePlayPattern === "function") {
    activePlayPattern();
    activeRestPattern();
  }
  if (typeof metronomeAlignToDownbeat === "function") {
    metronomeAlignToDownbeat();
  }
  var playEl = document.getElementById("playBars");
  var restEl = document.getElementById("restBars");
  if (playEl) {
    playEl.value = "1";
  }
  if (restEl) {
    restEl.value = "0";
  }
  if (typeof setCycle === "function") {
    setCycle(1, 0);
  }
  var repeatEl = document.getElementById("repeatCount");
  if (repeatEl) {
    repeatEl.value = "1";
  }
  if (typeof setRepeat === "function") {
    setRepeat(1);
  }
  var bpmEl = document.getElementById("bpm");
  if (bpmEl) {
    bpmEl.value = "100";
  }
  currentBpm = 100;
  tempoHeld = 100;
  if (typeof paused !== "undefined" && !paused && typeof applyBpm === "function") {
    applyBpm(100);
  } else if (typeof renderSwing === "function") {
    renderSwing();
  }
  if (typeof setLookAhead === "function") {
    setLookAhead(true);
  }
  if (typeof setScoreSheet === "function") {
    setScoreSheet(false);
  }
  if (typeof setCountIn === "function") {
    setCountIn(false);
  }
  if (typeof setSwingMode === "function") {
    setSwingMode("off");
  }
  if (typeof setSwingAuto === "function") {
    setSwingAuto(true);
  }
  var volume = document.getElementById("volumeCheckbox");
  if (volume) {
    volume.checked = true;
    volume.dispatchEvent(new Event("change"));
  } else if (typeof setSoundOn === "function") {
    setSoundOn(true);
  }
  ensureDeskExercises();
  currentExerciseId = firstDeskExerciseId();
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (typeof SelectExercise === "function") {
    SelectExercise();
  }
  if (typeof renderMeterSignature === "function") {
    renderMeterSignature();
  }
  if (typeof renderGroove === "function") {
    renderGroove();
  }
  deskReady = keepReady;
  showDeskNote(t("device.restored"));
}

function rememberSetup() {
  if (!deskReady) {
    return;
  }
  if (deskTimer) {
    clearTimeout(deskTimer);
  }
  deskTimer = setTimeout(function () {
    deskTimer = null;
    writeSetupNow();
  }, 150);
}

function applyDesk() {
  ensureDeskExercises();
  var data = readDesk();
  if (!data) {
    return;
  }
  var beats = clampDeskInt(data.beats, 1, 32, 0);
  if (beats) {
    beatsPerBar = beats;
    var top = document.getElementById("meterTop");
    if (top) {
      top.value = String(beats);
    }
  }
  if (data.unit === 1 || data.unit === 2 || data.unit === 4 || data.unit === 8 || data.unit === 16) {
    beatUnit = data.unit;
  }
  var play = clampDeskInt(data.play, 0, 16, -1);
  var rest = clampDeskInt(data.rest, 0, 16, -1);
  if (play >= 0 && rest >= 0 && (play > 0 || rest > 0)) {
    playBars = play;
    restBars = rest;
    var playEl = document.getElementById("playBars");
    var restEl = document.getElementById("restBars");
    if (playEl) {
      playEl.value = String(play);
    }
    if (restEl) {
      restEl.value = String(rest);
    }
  }
  var repeat = clampDeskInt(data.repeat, 1, 16, 0);
  if (repeat) {
    var repeatEl = document.getElementById("repeatCount");
    if (repeatEl) {
      repeatEl.value = String(repeat);
    }
  }
  var bpm = clampDeskInt(data.bpm, 1, 500, 0);
  if (bpm) {
    var bpmEl = document.getElementById("bpm");
    if (bpmEl) {
      bpmEl.value = String(bpm);
    }
    currentBpm = bpm;
    tempoHeld = bpm;
  }
  if (typeof data.look === "boolean" && typeof setLookAhead === "function") {
    setLookAhead(data.look);
  }
  if (typeof data.sheet === "boolean" && typeof setScoreSheet === "function") {
    setScoreSheet(data.sheet);
  }
  if (typeof data.countIn === "boolean" && typeof setCountIn === "function") {
    setCountIn(data.countIn);
  }
  var playClicks = cleanClickList(data.clicks);
  var restClicks = cleanClickList(data.restClicks);
  if (playClicks) {
    clickPattern = playClicks;
  }
  if (restClicks) {
    restClickPattern = restClicks;
  }
  if (data.swing === "triplet" || data.swing === "feel" || data.swing === "neo" || data.swing === "off") {
    if (typeof setSwingMode === "function") {
      setSwingMode(data.swing);
    }
  }
  if (data.swing === "feel") {
    if (data.swingAuto === false && typeof setSwingRatio === "function") {
      setSwingRatio(data.swingRatio);
    } else if (typeof setSwingAuto === "function") {
      setSwingAuto(true);
    }
  }
  if (playClicks) {
    clickPattern = playClicks.slice();
  }
  if (restClicks) {
    restClickPattern = restClicks.slice();
  }
  if (typeof activePlayPattern === "function") {
    activePlayPattern();
    activeRestPattern();
  }
  swingLitOffbeats = data.swingLit === true;
  if (typeof data.sound === "boolean") {
    var volume = document.getElementById("volumeCheckbox");
    if (volume) {
      volume.checked = data.sound;
      var volOn = volume.parentNode.querySelector(".volume-on");
      var volOff = volume.parentNode.querySelector(".volume-off");
      if (volOn) {
        volOn.classList.toggle("is-hidden", !data.sound);
      }
      if (volOff) {
        volOff.classList.toggle("is-hidden", data.sound);
      }
    }
    if (typeof setSoundOn === "function") {
      setSoundOn(data.sound);
    }
  }
  if (data.exercise && getDeskExercise(data.exercise)) {
    currentExerciseId = data.exercise;
  } else {
    currentExerciseId = firstDeskExerciseId();
  }
}
