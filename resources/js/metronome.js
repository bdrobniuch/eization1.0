// Eighth-note clock. Beat 1 is step 0. "&" is the offbeat after that beat.
// Clicks are placed on the audio clock. The picture waits for output latency
// so the flash lines up with the sound you actually hear.

var audioContext = null;
var clockMode = "perf";
var currentBpm = 100;
var tempoHeld = 100;
var beatsPerBar = 4;
var beatUnit = 4;
var soundOn = false;
var paused = false;
var nextNoteTime = 0;
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
var repeatCount = 1;
var clickPattern = [];
var restClickPattern = [];
var phraseBar = 0;
var LOOKAHEAD = 0.15;
var SCHEDULER_MS = 25;
var countInOn = false;
var awaitingCountIn = false;
var countingIn = false;
var armAdvance = false;
var phraseBarsDone = 0;
var currentBarInfo = { countIn: false, advance: false, phraseIndex: 0 };
var EIGHTHS = 2;
var swingOn = false;
var swingAuto = true;
var swingTriplet = false;
var swingNeo = false;
var swingRatio = 1;
var swingLitOffbeats = false;
var swingAnchorTime = 0;
var swingAnchorValid = false;
// Real swing: the upbeat settles near 100 ms, so ratio = (beat / 100 ms) - 1 = 600 / BPM - 1.
// That is already 3.5:1 at 133 BPM, and the slider stops there. Faster than about 300 BPM it is straight.
// Triplet is a separate choice: exactly 2:1, the & on the last third of the beat.
var SWING_MIN = 1;
var SWING_MAX = 3.5;
var SWING_SHORT_SEC = 0.1;
var SWING_TRIPLET = 2;
var SWING_MIN_SHORT_SEC = 0.055;
var SWING_AUTO_SNAP = 0.08;

function eighthDuration() {
  return (60 / currentBpm) / EIGHTHS;
}

function beatDuration() {
  return 60 / currentBpm;
}

function swingBpm() {
  if (currentBpm > 0) {
    return currentBpm;
  }
  if (tempoHeld > 0) {
    return tempoHeld;
  }
  return 100;
}

function clampSwingRatio(ratio) {
  if (isNaN(ratio) || ratio < SWING_MIN) {
    return SWING_MIN;
  }
  if (ratio > SWING_MAX) {
    return SWING_MAX;
  }
  return ratio;
}

function recommendedSwingRatio(bpm) {
  if (!(bpm > 0)) {
    return SWING_MIN;
  }
  return clampSwingRatio((60 / bpm) / SWING_SHORT_SEC - 1);
}

function activeSwingRatio() {
  if (!swingOn || swingNeo) {
    return SWING_MIN;
  }
  if (swingTriplet) {
    return SWING_TRIPLET;
  }
  if (swingAuto) {
    return recommendedSwingRatio(swingBpm());
  }
  return clampSwingRatio(swingRatio);
}

function heardSwingRatio(bpm, ratio) {
  ratio = clampSwingRatio(ratio);
  if (!(bpm > 0) || !(ratio > 1)) {
    return SWING_MIN;
  }
  var beat = 60 / bpm;
  var maxRatio = beat / SWING_MIN_SHORT_SEC - 1;
  if (maxRatio < SWING_MIN) {
    return SWING_MIN;
  }
  if (ratio > maxRatio) {
    return maxRatio;
  }
  return ratio;
}

function swingGaps() {
  var beat = beatDuration();
  var ratio = swingTriplet ? activeSwingRatio() : heardSwingRatio(currentBpm, activeSwingRatio());
  if (!(ratio > 1)) {
    return { longNote: beat / 2, shortNote: beat / 2, beat: beat };
  }
  var longNote = beat * ratio / (ratio + 1);
  return { longNote: longNote, shortNote: beat - longNote, beat: beat };
}

// Neo sits behind the felt pulse. In 4/4 that is beats 2 and 4.
// In 6/8, 9/8, and 12/8 the pulse is a group of three, so only the even group is late.
// The "&" stays on the grid, and the late time is given back before the next on-grid beat.
var NEO_POCKET_SEC = 0.04;

function neoGroupSize() {
  if (beatUnit === 8 && beatsPerBar % 3 === 0) {
    return 3;
  }
  return 1;
}

function neoPocketSec() {
  var room = eighthDuration() - SWING_MIN_SHORT_SEC;
  if (room < NEO_POCKET_SEC) {
    return room > 0 ? room : 0;
  }
  return NEO_POCKET_SEC;
}

function neoStepDelay(step) {
  if (!swingNeo || step % EIGHTHS !== 0) {
    return 0;
  }
  var beatIndex = step / EIGHTHS;
  var group = neoGroupSize();
  if (beatIndex % group !== 0) {
    return 0;
  }
  if ((beatIndex / group) % 2 === 0) {
    return 0;
  }
  return neoPocketSec();
}

function neoClickTime(step) {
  var steps = stepsPerBar();
  var bar = 0;
  if (steps > 0 && step >= steps) {
    bar = Math.floor(step / steps);
    step = step - bar * steps;
  }
  return bar * beatDuration() * beatsPerBar + step * eighthDuration() + neoStepDelay(step);
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
    swingAnchorValid = false;
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

// iOS treats web audio as ambient, so the Ring/Silent switch mutes the click.
// "playback" plays through that switch. It is set only while a click is running,
// and put back on pause so other audio is not held.
// Safari before 16.4 has no audioSession. The click follows the silent switch there.
function setAudioSession(type) {
  var session = navigator.audioSession;
  if (!session || !("type" in session)) {
    return;
  }
  try {
    session.type = type;
  } catch (e) {}
}

function clickSessionOn() {
  return !paused && currentBpm > 0 && soundOn;
}

function unlockAudio() {
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }
  if (clickSessionOn()) {
    setAudioSession("playback");
  }
  if (!audioContext) {
    audioContext = new AudioCtx();
    audioContext.onstatechange = function () {
      syncClock();
    };
  }
  if (audioContext.state === "running") {
    syncClock();
    return;
  }
  var pending = audioContext.resume();
  if (pending && typeof pending.then === "function") {
    pending.then(function () {
      syncClock();
    }).catch(function () {
      syncClock();
    });
  }
  syncClock();
}

function fitPattern(pattern, fillNew) {
  var n = stepsPerBar();
  if (pattern.length === n) {
    return pattern;
  }
  var next = [];
  for (var i = 0; i < n; i++) {
    if (i < pattern.length) {
      var prev = pattern[i];
      if (prev === true) {
        prev = 1;
      } else if (!prev) {
        prev = 0;
      }
      next.push(prev);
    } else {
      next.push(fillNew(i));
    }
  }
  return next;
}

function activePlayPattern() {
  clickPattern = fitPattern(clickPattern, function (i) {
    return i % 2 === 0 ? 1 : 0;
  });
  return clickPattern;
}

function activeRestPattern() {
  restClickPattern = fitPattern(restClickPattern, function () {
    return 0;
  });
  return restClickPattern;
}

function toggleClickStep(index, rest) {
  var pattern = rest ? activeRestPattern() : activePlayPattern();
  if (index < 0 || index >= pattern.length) {
    return;
  }
  var level = pattern[index] || 0;
  pattern[index] = (level + 1) % 3;
  if (!rest && index % 2 === 1) {
    swingLitOffbeats = false;
  }
  cancelFutureClicks();
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
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
  var playEl = document.getElementById("playBars");
  var restEl = document.getElementById("restBars");
  if (playEl && String(playEl.value) !== String(play)) {
    playEl.value = String(play);
  }
  if (restEl && String(restEl.value) !== String(rest)) {
    restEl.value = String(rest);
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
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

function flash(strong, sounding, accent, countIn) {
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
  document.body.classList.toggle("is-count-in", !!countIn);
  if (countIn) {
    document.body.classList.remove("bar-rest");
    document.body.classList.remove("bar-play");
  } else {
    document.body.classList.toggle("bar-rest", !sounding);
    document.body.classList.toggle("bar-play", !!sounding);
  }
}

function flashClickPad(step, rest) {
  var grids = ["clickGrid", "restClickGrid"];
  var activeId = rest ? "restClickGrid" : "clickGrid";
  for (var g = 0; g < grids.length; g++) {
    var pads = document.querySelectorAll("#" + grids[g] + " .click-pad");
    for (var i = 0; i < pads.length; i++) {
      pads[i].classList.remove("beat");
      if (grids[g] === activeId && pads[i].getAttribute("data-step") === String(step)) {
        void pads[i].offsetWidth;
        pads[i].classList.add("beat");
      }
    }
  }
}

function clearClickPads() {
  var pads = document.querySelectorAll("#clickGrid .click-pad.beat, #restClickGrid .click-pad.beat");
  for (var i = 0; i < pads.length; i++) {
    pads[i].classList.remove("beat");
  }
}

function showCountIn(n) {
  var el = document.getElementById("countIn");
  if (!el) {
    return;
  }
  el.hidden = false;
  el.setAttribute("aria-hidden", "false");
  el.textContent = String(n);
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

function hideCountIn() {
  var el = document.getElementById("countIn");
  if (!el || el.hidden) {
    return;
  }
  el.hidden = true;
  el.setAttribute("aria-hidden", "true");
  el.textContent = "";
  el.classList.remove("flash");
}

function phraseLength() {
  return exerciseBars > 0 ? exerciseBars : 1;
}

function valueLength() {
  var times = repeatCount > 0 ? repeatCount : 1;
  return phraseLength() * times;
}

function setRepeat(n) {
  n = parseInt(n, 10);
  if (isNaN(n) || n < 1) {
    n = 1;
  }
  if (n > 16) {
    n = 16;
  }
  repeatCount = n;
  var input = document.getElementById("repeatCount");
  if (input && String(input.value) !== String(n)) {
    input.value = String(n);
  }
  if (phraseBarsDone >= valueLength()) {
    armAdvance = true;
    if (countInOn) {
      awaitingCountIn = true;
    }
  }
  var shown = phraseBarsDone > 0 ? Math.floor((phraseBarsDone - 1) / phraseLength()) : 0;
  renderRepeatMark(shown);
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function renderRepeatMark(iteration) {
  var el = document.getElementById("repeatMark");
  if (!el) {
    return;
  }
  if (repeatCount <= 1) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  var n = (iteration || 0) + 1;
  if (n < 1) {
    n = 1;
  }
  if (n > repeatCount) {
    n = repeatCount;
  }
  el.hidden = false;
  el.textContent = n + " of " + repeatCount;
}

function setCountIn(on) {
  countInOn = !!on;
  var btn = document.getElementById("countInToggle");
  if (btn) {
    btn.setAttribute("aria-pressed", countInOn ? "true" : "false");
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
  if (!countInOn) {
    awaitingCountIn = false;
    hideCountIn();
    return;
  }
  if (!countingIn && phraseBarsDone === 0 && !armAdvance) {
    awaitingCountIn = true;
  }
}

function beginScheduledBar() {
  var info = { countIn: false, advance: false, phraseIndex: 0, iteration: 0 };
  var pass = phraseLength();
  if (countInOn && awaitingCountIn) {
    info.countIn = true;
    info.advance = armAdvance;
    if (armAdvance) {
      armAdvance = false;
      phraseBarsDone = 0;
    }
    awaitingCountIn = false;
    countingIn = true;
    return info;
  }
  countingIn = false;
  if (armAdvance) {
    info.advance = true;
    armAdvance = false;
    phraseBarsDone = 0;
  }
  info.phraseIndex = phraseBarsDone % pass;
  info.iteration = Math.floor(phraseBarsDone / pass);
  phraseBarsDone++;
  if (phraseBarsDone >= valueLength()) {
    armAdvance = true;
    if (countInOn) {
      awaitingCountIn = true;
    }
  }
  return info;
}

function onVisualStep(item) {
  flashClickPad(item.step, !item.countIn && !item.sounding);
  if (item.countIn) {
    document.body.classList.add("is-count-in");
    document.body.classList.remove("bar-rest");
    document.body.classList.remove("bar-play");
  }
  if (item.step % 2 !== 0) {
    return;
  }
  var beat = item.step / 2;
  if (item.countIn) {
    if (item.advance) {
      item.advance = false;
      advanceNote();
    }
    phraseBar = 0;
    showCountIn(item.count);
    renderPhrase(0, false);
    renderRepeatMark(0);
  } else {
    hideCountIn();
    if (item.advance) {
      item.advance = false;
      advanceNote();
    }
    if (beat === 0) {
      phraseBar = item.phraseIndex;
    }
    renderPhrase(beat, true);
    renderRepeatMark(item.iteration);
  }
  flash(beat === 0, item.sounding, item.accent, item.countIn);
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

function scheduleStep(step, time, gen, barInfo) {
  var countIn = !!(barInfo && barInfo.countIn);
  var downbeat = step % 2 === 0;
  var sounding = countIn ? false : isSoundingBar(barInCycle);
  var pattern = sounding ? activePlayPattern() : activeRestPattern();
  var level = countIn ? (downbeat ? 1 : 0) : (pattern[step] || 0);
  if (soundOn && level) {
    playClick(time, !countIn && level === 2);
  }
  var beat = downbeat ? step / 2 : -1;
  pendingVisuals.push({
    time: time,
    step: step,
    gen: gen,
    sounding: sounding,
    accent: !countIn && level === 2,
    countIn: countIn,
    advance: !!(barInfo && barInfo.advance && step === 0),
    phraseIndex: barInfo ? barInfo.phraseIndex : 0,
    iteration: barInfo ? barInfo.iteration : 0,
    count: beat >= 0 ? beatsPerBar - beat : 0
  });
}

function scheduler() {
  if (paused || currentBpm <= 0) {
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
    swingAnchorValid = false;
  }
  var horizon = now + LOOKAHEAD;
  var guard = 0;
  while (nextNoteTime < horizon && guard < 32) {
    if (stepIndex === 0) {
      currentBarInfo = beginScheduledBar();
    }
    scheduleStep(stepIndex, nextNoteTime, generation, currentBarInfo);
    // Numbered beats stay on the grid. The "&" is the late upbeat.
    // After an upbeat, the next downbeat is one whole beat after its downbeat, not "short note after whenever the & happened to be scheduled".
    // Neo keeps that same bar length: a late backbeat borrows time and gives it back before the next beat that sits on the grid.
    if (swingNeo) {
      if (stepIndex === 0) {
        swingAnchorTime = nextNoteTime;
        swingAnchorValid = true;
      }
      var upcoming = stepIndex + 1;
      if (!swingAnchorValid) {
        nextNoteTime += eighthDuration();
      } else {
        nextNoteTime = swingAnchorTime + neoClickTime(upcoming);
      }
    } else {
      var gaps = swingGaps();
      if (stepIndex % 2 === 0) {
        swingAnchorTime = nextNoteTime;
        swingAnchorValid = true;
        nextNoteTime = swingAnchorTime + gaps.longNote;
      } else if (swingAnchorValid) {
        nextNoteTime = swingAnchorTime + gaps.beat;
      } else {
        nextNoteTime += gaps.shortNote;
      }
    }
    stepIndex++;
    if (stepIndex >= stepsPerBar()) {
      stepIndex = 0;
      if (!currentBarInfo.countIn) {
        barInCycle++;
      }
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
  for (var i = 0; i < pendingVisuals.length; i++) {
    if (pendingVisuals[i].gen === generation && pendingVisuals[i].advance) {
      pendingVisuals[i].advance = false;
      advanceNote();
      break;
    }
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
  phraseBarsDone = 0;
  countingIn = false;
  awaitingCountIn = countInOn;
  armAdvance = false;
  currentBarInfo = { countIn: false, advance: false, phraseIndex: 0, iteration: 0 };
  nextNoteTime = currentTimeSec() + 0.04;
  swingAnchorValid = false;
  hideCountIn();
  renderPhrase(0, false);
  renderRepeatMark(0);
}

function readBeatsFromDom() {
  var el = document.getElementById("meterTop");
  if (!el) {
    return beatsPerBar;
  }
  var n = parseInt(el.value, 10);
  return n > 0 ? n : beatsPerBar;
}

function readBeatUnitFromDom() {
  var el = document.getElementById("meterBottom");
  if (!el) {
    return beatUnit;
  }
  var n = parseInt(el.textContent, 10);
  if (n === 1 || n === 2 || n === 4 || n === 8 || n === 16) {
    return n;
  }
  return beatUnit;
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
  beatUnit = readBeatUnitFromDom();
  readCycleFromDom();
  var repeatEl = document.getElementById("repeatCount");
  if (repeatEl) {
    setRepeat(repeatEl.value);
  }
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
  tempoHeld = currentBpm > 0 ? currentBpm : 100;
  paused = true;
  renderTempoToggle();
  bindSwingSlider();
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
    setAudioSession("auto");
    renderTempoToggle();
    renderSwing();
    if (typeof rememberSetup === "function") {
      rememberSetup();
    }
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
    if (typeof rememberSetup === "function") {
      rememberSetup();
    }
    return;
  }
  var now = currentTimeSec();
  var eighth = eighthDuration();
  if (nextNoteTime > now + eighth + 0.2 || nextNoteTime < now - 0.05) {
    generation++;
    cancelFutureClicks();
    pendingVisuals = [];
    nextNoteTime = now + 0.04;
    swingAnchorValid = false;
  }
  renderSwing();
  scheduler();
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function renderTempoToggle() {
  var btn = document.getElementById("tempoToggle");
  var box = document.getElementById("bpmStepper");
  if (!btn) {
    return;
  }
  var off = paused || currentBpm === 0;
  btn.setAttribute("aria-pressed", off ? "false" : "true");
  btn.setAttribute("aria-label", off ? "Start tempo" : "Pause tempo");
  btn.title = off ? "Start tempo" : "Pause tempo";
  var play = btn.querySelector(".icon-play");
  var pause = btn.querySelector(".icon-pause");
  if (play) {
    play.classList.toggle("is-hidden", !off);
  }
  if (pause) {
    pause.classList.toggle("is-hidden", off);
  }
  if (box) {
    box.classList.toggle("is-paused", off);
  }
  document.body.classList.toggle("is-stopped", off);
  if (off) {
    document.body.classList.remove("is-count-in");
    hideCountIn();
  }
}

function toggleTempo() {
  var input = document.getElementById("bpm");
  if (!paused && currentBpm > 0) {
    tempoHeld = currentBpm;
    stopScheduler();
    paused = true;
    setAudioSession("auto");
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
        renderSwing();
        if (typeof rememberSetup === "function") {
          rememberSetup();
        }
      } else {
        applyBpm(0);
      }
      return;
    }
    applyBpm(bpm);
  }, 280);
}

function playOffbeatsAreSilent() {
  var pattern = activePlayPattern();
  for (var i = 1; i < pattern.length; i += 2) {
    if (pattern[i]) {
      return false;
    }
  }
  return true;
}

function lightPlayOffbeats() {
  var pattern = activePlayPattern();
  for (var i = 1; i < pattern.length; i += 2) {
    pattern[i] = 1;
  }
  swingLitOffbeats = true;
  cancelFutureClicks();
  if (typeof renderGroove === "function") {
    renderGroove();
  }
}

function releaseOwnedOffbeats() {
  if (!swingLitOffbeats) {
    return;
  }
  swingLitOffbeats = false;
  var pattern = activePlayPattern();
  for (var i = 1; i < pattern.length; i += 2) {
    if (pattern[i] === 2) {
      return;
    }
  }
  for (var j = 1; j < pattern.length; j += 2) {
    if (pattern[j] === 1) {
      pattern[j] = 0;
    }
  }
  cancelFutureClicks();
  if (typeof renderGroove === "function") {
    renderGroove();
  }
}

function placeSwingThumb(el, ratio) {
  if (!el) {
    return;
  }
  var span = SWING_MAX - SWING_MIN;
  var pct = (ratio - SWING_MIN) / span;
  if (pct < 0) {
    pct = 0;
  }
  if (pct > 1) {
    pct = 1;
  }
  el.style.left = (pct * 100) + "%";
}

function renderSwing() {
  var recommended = recommendedSwingRatio(swingBpm());
  var requested = swingOn && !swingAuto ? clampSwingRatio(swingRatio) : recommended;
  var shown = swingTriplet ? SWING_TRIPLET : heardSwingRatio(swingBpm(), requested);
  placeSwingThumb(document.getElementById("swingRecommended"), recommended);
  placeSwingThumb(document.getElementById("swingHandle"), shown);
  var handle = document.getElementById("swingHandle");
  if (handle) {
    handle.setAttribute("aria-valuenow", String(Math.round(shown * 100) / 100));
    handle.setAttribute("aria-valuetext", swingAuto ? "Auto" : "Set");
  }
  var readout = document.getElementById("swingReadout");
  if (readout) {
    readout.textContent = swingAuto ? "Auto" : "Set";
  }
  var ghost = document.getElementById("swingRecommended");
  if (ghost) {
    ghost.setAttribute("aria-pressed", swingAuto ? "true" : "false");
  }
  var amount = document.getElementById("swingAmount");
  if (amount) {
    amount.hidden = !swingOn || swingTriplet || swingNeo;
  }
  var off = document.getElementById("swingModeOff");
  var triplet = document.getElementById("swingModeTriplet");
  var feel = document.getElementById("swingModeFeel");
  var neo = document.getElementById("swingModeNeo");
  if (off) {
    off.setAttribute("aria-checked", !swingOn ? "true" : "false");
  }
  if (triplet) {
    triplet.setAttribute("aria-checked", swingOn && swingTriplet ? "true" : "false");
  }
  if (feel) {
    feel.setAttribute("aria-checked", swingOn && !swingTriplet && !swingNeo ? "true" : "false");
  }
  if (neo) {
    neo.setAttribute("aria-checked", swingOn && swingNeo ? "true" : "false");
  }
}

function setSwingMode(mode) {
  if (mode !== "triplet" && mode !== "feel" && mode !== "neo") {
    mode = "off";
  }
  var nextOn = mode !== "off";
  if (swingOn && !nextOn) {
    releaseOwnedOffbeats();
  }
  var wasOn = swingOn;
  if (swingNeo || mode === "neo") {
    swingAnchorValid = false;
  }
  swingOn = nextOn;
  swingTriplet = mode === "triplet";
  swingNeo = mode === "neo";
  renderSwing();
  if (swingOn && !wasOn && playOffbeatsAreSilent()) {
    lightPlayOffbeats();
  }
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function setSwingAuto(on) {
  swingAuto = !!on;
  if (swingAuto) {
    swingRatio = recommendedSwingRatio(swingBpm());
  }
  renderSwing();
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function setSwingRatio(ratio) {
  if (isNaN(ratio)) {
    return;
  }
  if (ratio < SWING_MIN) {
    ratio = SWING_MIN;
  }
  if (ratio > SWING_MAX) {
    ratio = SWING_MAX;
  }
  swingAuto = false;
  swingRatio = ratio;
  renderSwing();
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function swingRatioFromClientX(clientX) {
  var slider = document.getElementById("swingSlider");
  var rect = slider.getBoundingClientRect();
  var pct = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  if (pct < 0) {
    pct = 0;
  }
  if (pct > 1) {
    pct = 1;
  }
  return SWING_MIN + pct * (SWING_MAX - SWING_MIN);
}

function bindSwingSlider() {
  var slider = document.getElementById("swingSlider");
  var ghost = document.getElementById("swingRecommended");
  var handle = document.getElementById("swingHandle");
  if (!slider || !handle) {
    return;
  }
  var dragging = false;
  var fromGhost = false;
  var startX = 0;

  slider.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }
    startX = event.clientX;
    fromGhost = event.target === ghost;
    dragging = !fromGhost;
    if (dragging) {
      setSwingRatio(swingRatioFromClientX(event.clientX));
    }
    slider.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  slider.addEventListener("pointermove", function (event) {
    if (!slider.hasPointerCapture(event.pointerId)) {
      return;
    }
    if (fromGhost && !dragging && Math.abs(event.clientX - startX) >= 6) {
      dragging = true;
    }
    if (dragging) {
      setSwingRatio(swingRatioFromClientX(event.clientX));
    }
  });
  function finishDrag(event) {
    if (!slider.hasPointerCapture(event.pointerId) && !dragging && !fromGhost) {
      return;
    }
    if (fromGhost && !dragging) {
      setSwingAuto(true);
    } else if (dragging) {
      var used = swingRatio;
      var recommended = recommendedSwingRatio(swingBpm());
      if (Math.abs(used - recommended) <= SWING_AUTO_SNAP) {
        setSwingAuto(true);
      }
    }
    dragging = false;
    fromGhost = false;
  }
  slider.addEventListener("pointerup", finishDrag);
  slider.addEventListener("pointercancel", function () {
    dragging = false;
    fromGhost = false;
  });
  handle.addEventListener("keydown", function (event) {
    var current = activeSwingRatio();
    var step = event.shiftKey ? 0.5 : 0.1;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setSwingRatio(current + step);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setSwingRatio(current - step);
    } else if (event.key === "Home") {
      event.preventDefault();
      setSwingRatio(SWING_MIN);
    } else if (event.key === "End") {
      event.preventDefault();
      setSwingRatio(SWING_MAX);
    }
  });
  renderSwing();
}

function setBeatUnit(n) {
  n = parseInt(n, 10);
  if (n !== 1 && n !== 2 && n !== 4 && n !== 8 && n !== 16) {
    return;
  }
  if (n === beatUnit) {
    return;
  }
  beatUnit = n;
  metronomeAlignToDownbeat();
  renderSwing();
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
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
  activePlayPattern();
  activeRestPattern();
  if (swingOn && swingLitOffbeats) {
    lightPlayOffbeats();
  }
  if (stepIndex >= stepsPerBar()) {
    stepIndex = 0;
  }
  metronomeAlignToDownbeat();
  if (typeof renderGroove === "function") {
    renderGroove();
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function setSoundOn(on) {
  soundOn = !!on;
  if (soundOn) {
    unlockAudio();
  } else {
    cancelFutureClicks();
    setAudioSession("auto");
  }
}

function next() {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    if (typeof editorNotice === "function") {
      editorNotice("Finish or cancel editing first.");
    }
    return;
  }
  unlockAudio();
  advanceNote();
  metronomeAlignToDownbeat();
}
