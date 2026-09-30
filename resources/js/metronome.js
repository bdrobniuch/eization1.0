// Eighth-note clock. Beat 1 is step 0. "&" is the offbeat after that beat.
// Clicks are placed on the audio clock. The picture waits for output latency
// so the flash lines up with the sound you actually hear.

var audioContext = null;
var clockMode = "perf";
var currentBpm = 100;
var tempoHeld = 100;
var beatsPerBar = 4;
var soundOn = false;
var paused = false;
var nextNoteTime = 0;
var skipNextDownbeatAdvance = true;
var generation = 0;
var schedulerTimer = null;
var scheduledClicks = [];
var pendingVisuals = [];
var visualLoopOn = false;
var bpmTimer = null;
var stepIndex = 0;
var barInCycle = 0;
var playBars = 1;
var restBars = 0;
var clickPattern = [];
var phraseBar = 0;
var LOOKAHEAD = 0.15;
var SCHEDULER_MS = 25;
var EIGHTHS = 2;

function eighthDuration() {
  return (60 / currentBpm) / EIGHTHS;
}

function stepsPerBar() {
  return beatsPerBar * EIGHTHS;
}

function perfNow() {
  return performance.now() / 1000;
}

function audioRunning() {
  return !!(audioContext && audioContext.state === "running");
}

function currentTimeSec() {
  if (clockMode === "audio" && audioRunning()) {
    return audioContext.currentTime;
  }
  return perfNow();
}

function visualLatency() {
  if (!audioRunning()) {
    return 0;
  }
  var lat = audioContext.outputLatency;
  if (typeof lat !== "number" || !isFinite(lat)) {
    lat = audioContext.baseLatency || 0;
  }
  if (lat < 0) {
    lat = 0;
  }
  if (lat > 0.25) {
    lat = 0.25;
  }
  return lat;
}

function shiftFutureTimes(fromNow, toNow) {
  var delta = toNow - fromNow;
  nextNoteTime += delta;
  for (var i = 0; i < pendingVisuals.length; i++) {
    pendingVisuals[i].time += delta;
  }
}

function clampSchedule() {
  var now = currentTimeSec();
  var eighth = currentBpm > 0 ? eighthDuration() : 0.5;
  var limit = Math.max(1.2, eighth * 2 + 0.2);
  if (nextNoteTime > now + limit || nextNoteTime < now - 0.08) {
    generation++;
    pendingVisuals = [];
    cancelFutureClicks();
    nextNoteTime = now + 0.04;
  }
}

function adoptAudioClock() {
  if (clockMode === "audio" || !audioRunning()) {
    return;
  }
  shiftFutureTimes(perfNow(), audioContext.currentTime);
  clockMode = "audio";
  clampSchedule();
}

function dropAudioClock() {
  if (clockMode !== "audio") {
    return;
  }
  var audioT = audioContext ? audioContext.currentTime : 0;
  shiftFutureTimes(audioT, perfNow());
  clockMode = "perf";
  cancelFutureClicks();
  clampSchedule();
}

function syncClock() {
  if (audioRunning()) {
    adoptAudioClock();
  } else {
    dropAudioClock();
  }
}

function unlockAudio() {
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }
  if (!audioContext) {
    audioContext = new AudioCtx();
    audioContext.onstatechange = function () {
      syncClock();
    };
  }
  if (audioContext.state !== "running") {
    audioContext.resume();
  }
  syncClock();
}

function activePattern() {
  var n = stepsPerBar();
  if (clickPattern.length === n) {
    return clickPattern;
  }
  var next = [];
  for (var i = 0; i < n; i++) {
    if (i < clickPattern.length) {
      var prev = clickPattern[i];
      if (prev === true) {
        prev = 1;
      } else if (!prev) {
        prev = 0;
      }
      next.push(prev);
    } else {
      next.push(i % 2 === 0 ? 1 : 0);
    }
  }
  clickPattern = next;
  return clickPattern;
}

function toggleClickStep(index) {
  var pattern = activePattern();
  if (index < 0 || index >= pattern.length) {
    return;
  }
  var level = pattern[index] || 0;
  pattern[index] = (level + 1) % 3;
  cancelFutureClicks();
}

function setCycle(play, rest) {
  play = parseInt(play, 10);
  rest = parseInt(rest, 10);
  if (isNaN(play) || play < 0) {
    play = playBars;
  }
  if (isNaN(rest) || rest < 0) {
    rest = restBars;
  }
  if (play > 16) {
    play = 16;
  }
  if (rest > 16) {
    rest = 16;
  }
  if (play === 0 && rest === 0) {
    play = 1;
  }
  playBars = play;
  restBars = rest;
}

function isSoundingBar(index) {
  if (restBars <= 0) {
    return true;
  }
  if (playBars <= 0) {
    return false;
  }
  return (index % (playBars + restBars)) < playBars;
}

function grooveLabel() {
  if (restBars > 0) {
    return playBars + "/" + restBars;
  }
  return "Click";
}

function renderPhrase(beat, started) {
  var track = document.getElementById("phraseTrack");
  if (!track) {
    return;
  }
  if (track.children.length !== exerciseBars) {
    track.innerHTML = "";
    for (var i = 0; i < exerciseBars; i++) {
      var seg = document.createElement("span");
      seg.className = "phrase-seg";
      var fill = document.createElement("span");
      fill.className = "phrase-fill";
      seg.appendChild(fill);
      track.appendChild(seg);
    }
  }
  for (var b = 0; b < exerciseBars; b++) {
    var pct = 0;
    if (b < phraseBar) {
      pct = 100;
    } else if (b === phraseBar && started) {
      pct = ((beat + 1) / beatsPerBar) * 100;
    }
    track.children[b].firstChild.style.width = pct + "%";
  }
}

function playClick(time, accent) {
  if (!audioRunning() || clockMode !== "audio") {
    return;
  }
  var now = audioContext.currentTime;
  if (time > now + 2 || time < now - 0.05) {
    return;
  }
  var when = Math.max(time, now);
  try {
    var osc = audioContext.createOscillator();
    var gain = audioContext.createGain();
    osc.frequency.setValueAtTime(accent ? 1640 : 880, when);
    gain.gain.setValueAtTime(accent ? 0.85 : 0.28, when);
    gain.gain.linearRampToValueAtTime(0.001, when + (accent ? 0.05 : 0.03));
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(when);
    osc.stop(when + (accent ? 0.055 : 0.035));
    osc.onended = function () {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
    };
    scheduledClicks.push(osc);
  } catch (e) {}
}

function cancelFutureClicks() {
  var now = audioContext ? audioContext.currentTime : 0;
  for (var i = 0; i < scheduledClicks.length; i++) {
    try {
      scheduledClicks[i].stop(now);
    } catch (e) {}
  }
  scheduledClicks = [];
}

function flash(strong, sounding, accent) {
  var el = document.getElementById("beatFlash");
  if (!el) {
    return;
  }
  el.classList.remove("strong", "weak", "accent", "accent-strong");
  void el.offsetWidth;
  if (accent) {
    el.classList.add(strong ? "accent-strong" : "accent");
  } else {
    el.classList.add(strong ? "strong" : "weak");
  }
  document.body.classList.toggle("bar-rest", !sounding);
  document.body.classList.toggle("bar-play", !!sounding);
}

function flashClickPad(step) {
  var pads = document.querySelectorAll("#clickGrid .click-pad");
  var pad = null;
  for (var i = 0; i < pads.length; i++) {
    pads[i].classList.remove("beat");
    if (pads[i].getAttribute("data-step") === String(step)) {
      pad = pads[i];
    }
  }
  if (!pad) {
    return;
  }
  void pad.offsetWidth;
  pad.classList.add("beat");
}

function clearClickPads() {
  var pads = document.querySelectorAll("#clickGrid .click-pad.beat");
  for (var i = 0; i < pads.length; i++) {
    pads[i].classList.remove("beat");
  }
}

function onVisualStep(item) {
  if (item.sounding) {
    flashClickPad(item.step);
  } else {
    clearClickPads();
  }
  if (item.step % 2 !== 0) {
    return;
  }
  var beat = item.step / 2;
  if (beat === 0) {
    if (skipNextDownbeatAdvance) {
      skipNextDownbeatAdvance = false;
      phraseBar = 0;
    } else {
      phraseBar++;
      if (phraseBar >= exerciseBars) {
        phraseBar = 0;
        advanceNote();
      }
    }
  }
  flash(beat === 0, item.sounding, item.accent);
  renderPhrase(beat, true);
}

function paintVisuals() {
  var now = currentTimeSec();
  var heardAt = now - visualLatency();
  var keep = [];
  for (var i = 0; i < pendingVisuals.length; i++) {
    var item = pendingVisuals[i];
    if (item.gen !== generation) {
      continue;
    }
    if (item.time <= heardAt) {
      onVisualStep(item);
    } else {
      keep.push(item);
    }
  }
  pendingVisuals = keep;
  requestAnimationFrame(paintVisuals);
}

function startVisualLoop() {
  if (visualLoopOn) {
    return;
  }
  visualLoopOn = true;
  requestAnimationFrame(paintVisuals);
}

function scheduleStep(step, time, gen) {
  var sounding = isSoundingBar(barInCycle);
  var pattern = activePattern();
  var level = pattern[step] || 0;
  if (sounding && soundOn && level) {
    playClick(time, level === 2);
  }
  pendingVisuals.push({
    time: time,
    step: step,
    gen: gen,
    sounding: sounding,
    accent: level === 2
  });
}

function scheduler() {
  if (currentBpm <= 0) {
    return;
  }
  syncClock();
  var now = currentTimeSec();
  var eighth = eighthDuration();
  var far = now + Math.max(1.2, eighth * 2 + 0.2);
  if (nextNoteTime > far || nextNoteTime < now - 0.2) {
    pendingVisuals = [];
    cancelFutureClicks();
    nextNoteTime = now + 0.04;
  }
  var horizon = now + LOOKAHEAD;
  var guard = 0;
  while (nextNoteTime < horizon && guard < 32) {
    scheduleStep(stepIndex, nextNoteTime, generation);
    nextNoteTime += eighth;
    stepIndex++;
    if (stepIndex >= stepsPerBar()) {
      stepIndex = 0;
      barInCycle++;
    }
    guard++;
  }
}

function ensureScheduler() {
  if (schedulerTimer) {
    return;
  }
  scheduler();
  schedulerTimer = setInterval(scheduler, SCHEDULER_MS);
}

function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  generation++;
  pendingVisuals = [];
  cancelFutureClicks();
}

function metronomeAlignToDownbeat() {
  generation++;
  cancelFutureClicks();
  pendingVisuals = [];
  stepIndex = 0;
  barInCycle = 0;
  phraseBar = 0;
  nextNoteTime = currentTimeSec() + 0.04;
  skipNextDownbeatAdvance = true;
  renderPhrase(0, false);
}

function readBeatsFromDom() {
  if (typeof beatsChoice === "undefined") {
    return beatsPerBar;
  }
  if (beatsChoice === "custom") {
    var custom = parseInt(document.getElementById("beatsCustom").value, 10);
    return custom > 0 ? custom : beatsPerBar;
  }
  var preset = parseInt(beatsChoice, 10);
  return preset > 0 ? preset : beatsPerBar;
}

function readCycleFromDom() {
  var playEl = document.getElementById("playBars");
  var restEl = document.getElementById("restBars");
  if (!playEl || !restEl) {
    return;
  }
  setCycle(playEl.value, restEl.value);
}

function startMetronome() {
  beatsPerBar = readBeatsFromDom();
  readCycleFromDom();
  renderPhrase(0, false);
  var bpmInput = parseInt(document.getElementById("bpm").value, 10);
  currentBpm = isNaN(bpmInput) ? 100 : bpmInput;
  if (currentBpm < 0) {
    currentBpm = 0;
  }
  if (currentBpm > 500) {
    currentBpm = 500;
  }
  soundOn = document.getElementById("volumeCheckbox").checked;
  startVisualLoop();
  if (currentBpm === 0) {
    paused = true;
    renderTempoToggle();
    return;
  }
  tempoHeld = currentBpm;
  paused = false;
  renderTempoToggle();
  if (!(nextNoteTime > currentTimeSec())) {
    nextNoteTime = currentTimeSec() + 0.04;
  }
  ensureScheduler();
}

function applyBpm(bpm) {
  if (bpm < 0) {
    bpm = 0;
  }
  if (bpm > 500) {
    bpm = 500;
  }
  if (bpm === 0) {
    if (currentBpm > 0) {
      tempoHeld = currentBpm;
    }
    currentBpm = 0;
    stopScheduler();
    paused = true;
    renderTempoToggle();
    return;
  }
  var wasPaused = paused || !schedulerTimer;
  currentBpm = bpm;
  tempoHeld = bpm;
  paused = false;
  renderTempoToggle();
  unlockAudio();
  if (wasPaused) {
    nextNoteTime = currentTimeSec() + 0.04;
    ensureScheduler();
    return;
  }
  var now = currentTimeSec();
  var eighth = eighthDuration();
  if (nextNoteTime > now + eighth + 0.2 || nextNoteTime < now - 0.05) {
    generation++;
    cancelFutureClicks();
    pendingVisuals = [];
    nextNoteTime = now + 0.04;
  }
  scheduler();
}

function renderTempoToggle() {
  var btn = document.getElementById("tempoToggle");
  var box = document.getElementById("bpmStepper");
  if (!btn) {
    return;
  }
  var off = paused || currentBpm === 0;
  btn.setAttribute("aria-pressed", off ? "true" : "false");
  btn.setAttribute("aria-label", off ? "Start tempo" : "Pause tempo");
  btn.title = off ? "Start tempo" : "Pause tempo";
  var icon = btn.querySelector("i");
  if (icon) {
    icon.className = off ? "fa-solid fa-play" : "fa-solid fa-pause";
  }
  if (box) {
    box.classList.toggle("is-paused", off);
  }
}

function toggleTempo() {
  var input = document.getElementById("bpm");
  if (!paused && currentBpm > 0) {
    tempoHeld = currentBpm;
    stopScheduler();
    paused = true;
    renderTempoToggle();
    return;
  }
  var resume = tempoHeld > 0 ? tempoHeld : 100;
  var shown = parseInt(input.value, 10);
  if (!shown) {
    shown = resume;
    input.value = String(shown);
  }
  applyBpm(shown);
}

function updateInterval() {
  if (bpmTimer) {
    clearTimeout(bpmTimer);
  }
  bpmTimer = setTimeout(function () {
    var bpm = parseInt(document.getElementById("bpm").value, 10);
    if (isNaN(bpm)) {
      return;
    }
    if (paused && currentBpm > 0) {
      if (bpm > 0) {
        currentBpm = bpm;
        tempoHeld = bpm;
      } else {
        applyBpm(0);
      }
      return;
    }
    applyBpm(bpm);
  }, 280);
}

function setBeatsPerBar(n) {
  n = parseInt(n, 10);
  if (!n || n < 1) {
    return;
  }
  if (n > 32) {
    n = 32;
  }
  if (n === beatsPerBar) {
    return;
  }
  beatsPerBar = n;
  activePattern();
  if (stepIndex >= stepsPerBar()) {
    stepIndex = 0;
  }
  metronomeAlignToDownbeat();
  if (typeof renderGroove === "function") {
    renderGroove();
  }
}

function setSoundOn(on) {
  soundOn = !!on;
  if (soundOn) {
    unlockAudio();
  } else {
    cancelFutureClicks();
  }
}

function next() {
  unlockAudio();
  advanceNote();
  metronomeAlignToDownbeat();
}
