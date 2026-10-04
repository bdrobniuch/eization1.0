var DESK_KEY = "eization-desk";
var DESK_EXERCISE_CAP = 40;
var deskReady = false;
var deskTimer = null;
var deskNoteTimer = null;

function readDesk() {
  try {
    var raw = localStorage.getItem(DESK_KEY);
    if (!raw) {
      return null;
    }
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

function writeDesk(data) {
  try {
    localStorage.setItem(DESK_KEY, JSON.stringify(data));
  } catch (err) {}
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

function catalogLines(ex) {
  var lines = [];
  if (!ex || !ex.items) {
    return lines;
  }
  for (var i = 0; i < ex.items.length; i++) {
    var line = typeof itemToLine === "function" ? itemToLine(ex.items[i]) : String(ex.items[i] || "");
    if (line) {
      lines.push(line.length > 240 ? line.slice(0, 240) : line);
    }
  }
  return lines;
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
    lines: lines
  };
  if (typeof raw.seedId === "string" && raw.seedId) {
    record.seedId = raw.seedId;
  }
  return record;
}

function seedFromCatalog(seedId) {
  if (typeof exercises === "undefined") {
    return null;
  }
  var ex = exercises[seedId];
  if (!ex || !ex.inMenu) {
    return null;
  }
  var lines = catalogLines(ex);
  if (!lines.length) {
    return null;
  }
  return {
    id: deskIdForSeed(seedId),
    seedId: seedId,
    name: cleanDeskName(ex.label, seedId),
    bars: clampDeskInt(ex.bars, 1, 16, 1),
    lines: lines
  };
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

function ensureDeskExercises() {
  var data = deskState();
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
  if (!list.length) {
    list = buildSeededList(deleted);
  } else {
    list = mergeMissingSeeds(list, deleted);
  }
  if (!list.length) {
    list = buildSeededList([]);
    deleted = [];
  }
  data.exercises = list;
  data.deletedSeeds = deleted;
  delete data.custom;
  if (data.exercise === "custom") {
    data.exercise = legacy ? legacy.id : (list[0] && list[0].id) || "";
  } else if (data.exercise && typeof exercises !== "undefined" && exercises[data.exercise]) {
    data.exercise = deskIdForSeed(data.exercise);
  }
  writeDesk(data);
  return list;
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
  for (var i = 0; i < record.lines.length; i++) {
    var item = lineToItem(record.lines[i]);
    if (item) {
      items.push(item);
    }
  }
  if (!items.length) {
    return null;
  }
  return { items: items, bars: record.bars, name: record.name };
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
      lines: part.lines != null ? cleanDeskLines(part.lines) : list[i].lines.slice()
    };
    if (!next.lines.length) {
      return null;
    }
    if (list[i].seedId) {
      next.seedId = list[i].seedId;
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
  writeDesk(data);
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
    lines: lines
  };
  list.push(row);
  data.exercises = list;
  data.exercise = row.id;
  writeDesk(data);
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
      lines: list[i].lines.slice()
    };
    if (list[i].seedId) {
      row.seedId = list[i].seedId;
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
  for (var i = 0; i < data.exercises.length && list.length < DESK_EXERCISE_CAP; i++) {
    var raw = data.exercises[i];
    if (!raw || typeof raw !== "object") {
      continue;
    }
    var lines = cleanDeskLines(raw.lines);
    if (!lines.length) {
      continue;
    }
    var row = {
      id: newDeskExerciseId() + String(i),
      name: cleanDeskName(raw.name, t("menu.kicker")),
      bars: clampDeskInt(raw.bars, 1, 16, 1),
      lines: lines
    };
    if (typeof raw.seedId === "string" && raw.seedId && !seenSeed[raw.seedId]) {
      row.seedId = raw.seedId;
      row.id = deskIdForSeed(raw.seedId);
      seenSeed[raw.seedId] = true;
    }
    list.push(row);
  }
  if (!list.length) {
    return { error: t("desk.noExercises") };
  }
  return { exercises: list };
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
  writeDesk(data);
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
  writeDesk(data);
  return true;
}

function showDeskNote(message) {
  var note = document.getElementById("deskNote");
  if (!note) {
    return;
  }
  note.textContent = message;
  note.hidden = false;
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

function restoreDefaults() {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    if (typeof editorIsDirty === "function" && editorIsDirty()) {
      if (typeof editorNotice === "function") {
        editorNotice(t("edit.finish"));
      }
      return;
    }
    if (typeof editorCloseQuiet === "function") {
      editorCloseQuiet();
    }
  }
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
