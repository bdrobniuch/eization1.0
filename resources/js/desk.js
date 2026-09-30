var DESK_KEY = "eization-desk";
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

function firstBuiltInId() {
  if (typeof menuOrder === "undefined" || typeof exercises === "undefined") {
    return "";
  }
  for (var i = 0; i < menuOrder.length; i++) {
    var ex = exercises[menuOrder[i]];
    if (ex && ex.inMenu) {
      return ex.id;
    }
  }
  return "";
}

function customRecord() {
  var data = readDesk();
  var custom = data && data.custom;
  if (!custom || !custom.lines || !custom.lines.length) {
    return null;
  }
  var lines = [];
  var limit = custom.lines.length > 500 ? 500 : custom.lines.length;
  for (var i = 0; i < limit; i++) {
    var line = typeof itemToLine === "function" ? itemToLine(custom.lines[i]) : String(custom.lines[i] || "");
    if (line) {
      lines.push(line.length > 240 ? line.slice(0, 240) : line);
    }
  }
  if (!lines.length) {
    return null;
  }
  var bars = clampDeskInt(custom.bars, 1, 16, 1);
  return { lines: lines, bars: bars };
}

function customItems() {
  var record = customRecord();
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
  return { items: items, bars: record.bars };
}

function saveCustomExercise(lines, bars) {
  var clean = [];
  for (var i = 0; i < lines.length && clean.length < 500; i++) {
    var line = typeof itemToLine === "function" ? itemToLine(lines[i]) : String(lines[i] || "");
    if (!line) {
      continue;
    }
    clean.push(line.length > 240 ? line.slice(0, 240) : line);
  }
  if (!clean.length) {
    return false;
  }
  patchDesk({
    custom: {
      bars: clampDeskInt(bars, 1, 16, 1),
      lines: clean
    },
    exercise: "custom"
  });
  return true;
}

function noteCustomKept() {
  var data = deskState();
  if (data.customNoted) {
    return;
  }
  patchDesk({ customNoted: true });
  var note = document.getElementById("deskNote");
  if (!note) {
    return;
  }
  note.hidden = false;
  if (deskNoteTimer) {
    clearTimeout(deskNoteTimer);
  }
  deskNoteTimer = setTimeout(function () {
    note.hidden = true;
  }, 3200);
}

function clearCustomExercise() {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    if (typeof editorIsDirty === "function" && editorIsDirty()) {
      if (typeof editorNotice === "function") {
        editorNotice("Finish or cancel editing first.");
      }
      return;
    }
    if (typeof editorCloseQuiet === "function") {
      editorCloseQuiet();
    }
  }
  var data = deskState();
  delete data.custom;
  writeDesk(data);
  var wasCustom = currentExerciseId === "custom";
  if (wasCustom) {
    currentExerciseId = firstBuiltInId();
  }
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (wasCustom && typeof SelectExercise === "function") {
    SelectExercise();
  }
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
  data.swing = swingOn && swingTriplet ? "triplet" : (swingOn ? "feel" : "off");
  data.swingAuto = !!swingAuto;
  data.swingRatio = typeof swingRatio === "number" ? swingRatio : 1;
  data.swingLit = !!swingLitOffbeats;
  if (typeof activePlayPattern === "function") {
    data.clicks = activePlayPattern().slice();
    data.restClicks = activeRestPattern().slice();
  }
  data.exercise = currentExerciseId || "";
  writeDesk(data);
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
  if (data.swing === "triplet" || data.swing === "feel" || data.swing === "off") {
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
  if (data.exercise === "custom" && customItems()) {
    currentExerciseId = "custom";
  } else if (data.exercise && typeof exercises !== "undefined" && exercises[data.exercise] && exercises[data.exercise].inMenu) {
    currentExerciseId = data.exercise;
  }
}
