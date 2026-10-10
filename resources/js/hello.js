var HELLO_KEY = "eization-hello";
var helloTimers = [];
var helloAim = null;
var helloTouched = false;
var helloReset = false;
var helloPhraseRaf = 0;
var HELLO_PHRASE_MS = 2000;
var HELLO_GAP_MS = 600;
var HELLO_MARGIN = 12;
var helloStepIndex = 0;
var helloSliceEnd = 0;
var helloMoved = false;
var helloLaunch = false;

var HELLO_TOUR = [
  {
    id: "exerciseFace",
    side: "up",
    key: "hello.exercise",
    hold: 2400,
    selectSeed: "allNotes"
  },
  {
    id: "exerciseFace",
    side: "up",
    key: "hello.staffScale",
    hold: 2800,
    selectSeed: "scales"
  },
  {
    id: "exerciseFace",
    side: "up",
    key: "hello.staffChord",
    hold: 2800,
    selectSeed: "leftHandRootless"
  },
  {
    id: "note",
    side: "up",
    key: "hello.example",
    hold: 3400
  },
  {
    id: "next",
    side: "down",
    key: "hello.next",
    hold: 3200,
    advanceOnShow: true
  },
  {
    id: "grooveButton",
    side: "down",
    key: "hello.setup",
    hold: 3200
  },
  {
    id: "tempoToggle",
    side: "down",
    key: "hello.play",
    phrase: true,
    advanceAfter: true
  },
  {
    id: "edit",
    side: "up",
    key: "hello.edit",
    hold: 3200
  }
];

var HELLO_LAUNCH_END = HELLO_TOUR.length;

HELLO_TOUR.push(
  {
    id: "exerciseFace",
    side: "up",
    key: "hello.exercise",
    hold: 3200
  },
  {
    id: "note",
    side: "up",
    key: "hello.example",
    hold: 3400
  },
  {
    id: "next",
    side: "down",
    key: "hello.next",
    hold: 3200,
    advanceOnShow: true
  },
  {
    id: "counter",
    side: "up",
    key: "hello.left",
    hold: 3200
  },
  {
    id: "resetExercise",
    side: "up",
    key: "hello.reset",
    hold: 3200
  },
  {
    id: "bpm",
    side: "down",
    key: "hello.bpm",
    hold: 3200
  },
  {
    id: "tempoToggle",
    side: "down",
    key: "hello.play",
    phrase: true,
    advanceAfter: true
  },
  {
    id: "grooveButton",
    side: "down",
    key: "hello.setup",
    hold: 3200
  }
);

document.addEventListener("pointerdown", function () {
  helloTouched = true;
}, true);

function helloSeen() {
  try {
    return localStorage.getItem(HELLO_KEY) === "1";
  } catch (err) {
    return true;
  }
}

function markHello() {
  try {
    localStorage.setItem(HELLO_KEY, "1");
  } catch (err) {}
}

function forgetHello() {
  try {
    localStorage.removeItem(HELLO_KEY);
  } catch (err) {}
}

function clampHello(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function placeHello(id, side) {
  var el = document.getElementById(id);
  var arrow = document.getElementById("helloArrow");
  if (!el || !arrow) {
    return;
  }
  helloAim = { id: id, side: side };
  document.body.setAttribute("data-hello", id);
  var box = el.getBoundingClientRect();
  arrow.className = side === "up" ? "points-up" : "points-down";
  arrow.hidden = false;
  arrow.style.left = (box.left + box.width / 2) + "px";
  arrow.style.top = (side === "up" ? box.bottom + 10 : box.top - 10) + "px";
  placeHelloCaption();
}

function placeHelloCaption() {
  var caption = document.getElementById("helloCaption");
  var skip = document.getElementById("helloSkip");
  var arrow = document.getElementById("helloArrow");
  var step = HELLO_TOUR[helloStepIndex];
  if (!caption || !document.body.classList.contains("is-hello") || !step) {
    return;
  }
  caption.textContent = t(step.key);
  caption.hidden = false;
  if (skip) {
    skip.hidden = false;
    skip.style.left = "50%";
    skip.style.top = "auto";
    skip.style.bottom = "18px";
  }
  if (!arrow || arrow.hidden) {
    return;
  }
  var arrowTop = parseFloat(arrow.style.top) || 0;
  var arrowLeft = parseFloat(arrow.style.left) || window.innerWidth / 2;
  var preferBelow = helloAim && helloAim.side === "up";
  caption.style.left = "0px";
  caption.style.top = "0px";
  caption.style.transform = "none";
  var width = caption.offsetWidth;
  var height = caption.offsetHeight;
  var skipTop = skip && !skip.hidden ? skip.getBoundingClientRect().top : window.innerHeight;
  var maxLeft = Math.max(HELLO_MARGIN, window.innerWidth - width - HELLO_MARGIN);
  var left = clampHello(arrowLeft - width / 2, HELLO_MARGIN, maxLeft);
  var top;
  if (preferBelow) {
    top = arrowTop + 22;
  } else {
    top = arrowTop - height - 14;
  }
  var maxTop = Math.max(HELLO_MARGIN, skipTop - height - HELLO_MARGIN);
  top = clampHello(top, HELLO_MARGIN, maxTop);
  if (!preferBelow && top + height > arrowTop - 4) {
    top = clampHello(arrowTop + 22, HELLO_MARGIN, maxTop);
  }
  caption.style.left = left + "px";
  caption.style.top = top + "px";
}

function helloStopPhrase() {
  if (helloPhraseRaf) {
    cancelAnimationFrame(helloPhraseRaf);
    helloPhraseRaf = 0;
  }
}

function helloSetPhrase(pct) {
  var track = document.getElementById("phraseTrack");
  if (!track) {
    return;
  }
  if (!track.children.length && typeof renderPhrase === "function") {
    renderPhrase(0, false);
  }
  var bars = track.children.length;
  var scaled = pct * bars;
  var i;
  for (i = 0; i < bars; i++) {
    var local = scaled - i;
    var w = 0;
    if (local >= 1) {
      w = 100;
    } else if (local > 0) {
      w = local * 100;
    }
    var fill = track.children[i].firstChild;
    if (fill) {
      fill.style.width = w + "%";
    }
  }
}

function helloPlayPhrase(done) {
  helloStopPhrase();
  helloSetPhrase(0);
  var start = 0;
  function frame(now) {
    if (!document.body.classList.contains("is-hello")) {
      return;
    }
    if (!start) {
      start = now;
    }
    var t = (now - start) / HELLO_PHRASE_MS;
    if (t >= 1) {
      helloSetPhrase(1);
      helloPhraseRaf = 0;
      done();
      return;
    }
    helloSetPhrase(t);
    helloPhraseRaf = requestAnimationFrame(frame);
  }
  helloPhraseRaf = requestAnimationFrame(frame);
}

function helloBackToStart() {
  if (helloReset) {
    return;
  }
  helloReset = true;
  if (!helloMoved) {
    return;
  }
  if (typeof resetExercise === "function") {
    resetExercise();
  }
}

function helloAdvance() {
  helloMoved = true;
  if (typeof advanceNote === "function") {
    advanceNote();
  }
}

function hideHelloChrome() {
  var arrow = document.getElementById("helloArrow");
  var caption = document.getElementById("helloCaption");
  var skip = document.getElementById("helloSkip");
  if (arrow) {
    arrow.hidden = true;
  }
  if (caption) {
    caption.hidden = true;
    caption.textContent = "";
    caption.style.left = "";
    caption.style.top = "";
    caption.style.transform = "";
  }
  if (skip) {
    skip.hidden = true;
  }
  document.body.removeAttribute("data-hello");
}

function endHello(reason) {
  var launched = helloLaunch;
  if (!document.body.classList.contains("is-hello")) {
    return;
  }
  helloLaunch = false;
  helloStopPhrase();
  helloBackToStart();
  document.body.classList.remove("is-hello");
  hideHelloChrome();
  var i;
  for (i = 0; i < helloTimers.length; i++) {
    clearTimeout(helloTimers[i]);
  }
  helloTimers = [];
  helloAim = null;
  helloStepIndex = 0;
  markHello();
  window.removeEventListener("resize", onHelloResize);
  if (!launched || typeof track !== "function") {
    return;
  }
  if (reason === "skip") {
    track("hello_skip");
  } else if (reason === "done") {
    track("hello_done");
  }
}

function settleHello() {
  if (!document.body.classList.contains("is-hello")) {
    return;
  }
  helloBackToStart();
  helloTimers.push(setTimeout(function () {
    endHello("done");
  }, 700));
}

function onHelloResize() {
  if (!helloAim) {
    return;
  }
  placeHello(helloAim.id, helloAim.side);
}

function helloAfterStep(step) {
  if (!document.body.classList.contains("is-hello")) {
    return;
  }
  if (step.advanceAfter) {
    helloAdvance();
  }
  helloTimers.push(setTimeout(function () {
    if (!document.body.classList.contains("is-hello")) {
      return;
    }
    helloStepIndex++;
    if (helloStepIndex >= helloSliceEnd || helloStepIndex >= HELLO_TOUR.length) {
      settleHello();
      return;
    }
    runHelloStep();
  }, HELLO_GAP_MS));
}

function helloSelectSeed(seedId) {
  if (typeof listDeskExercises !== "function" || typeof SelectExercise !== "function") {
    return false;
  }
  var list = listDeskExercises();
  var i;
  var id = "";
  for (i = 0; i < list.length; i++) {
    if (list[i].seedId === seedId) {
      id = list[i].id;
      break;
    }
  }
  if (!id) {
    return false;
  }
  currentExerciseId = id;
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  SelectExercise();
  return currentExerciseId === id;
}

function runHelloStep() {
  if (!document.body.classList.contains("is-hello")) {
    return;
  }
  var step = HELLO_TOUR[helloStepIndex];
  if (!step || helloStepIndex >= helloSliceEnd) {
    settleHello();
    return;
  }
  if (step.selectSeed && !helloSelectSeed(step.selectSeed)) {
    helloStepIndex++;
    if (helloStepIndex >= helloSliceEnd || helloStepIndex >= HELLO_TOUR.length) {
      settleHello();
      return;
    }
    runHelloStep();
    return;
  }
  placeHello(step.id, step.side);
  if (step.selectSeed) {
    helloTimers.push(setTimeout(function () {
      if (!document.body.classList.contains("is-hello")) {
        return;
      }
      if (HELLO_TOUR[helloStepIndex] !== step) {
        return;
      }
      placeHello(step.id, step.side);
    }, 40));
  }
  if (step.advanceOnShow) {
    helloTimers.push(setTimeout(function () {
      if (!document.body.classList.contains("is-hello")) {
        return;
      }
      helloAdvance();
    }, 450));
  }
  if (step.phrase) {
    helloPlayPhrase(function () {
      helloAfterStep(step);
    });
    return;
  }
  helloTimers.push(setTimeout(function () {
    helloAfterStep(step);
  }, step.hold || 2200));
}

function bindHelloSkip() {
  var skip = document.getElementById("helloSkip");
  if (skip && !skip._helloBound) {
    skip._helloBound = true;
    skip.addEventListener("click", function (event) {
      event.preventDefault();
      endHello("skip");
    });
  }
}

function beginHello(from, to) {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    return;
  }
  if (document.body.classList.contains("is-hello")) {
    endHello();
  }
  helloLaunch = from === 0 && to === HELLO_LAUNCH_END;
  if (typeof closeAbout === "function") {
    closeAbout();
  }
  if (typeof closeExercisePanel === "function") {
    closeExercisePanel();
  }
  if (typeof closeGroovePanel === "function") {
    closeGroovePanel();
  }
  helloReset = false;
  helloMoved = false;
  helloStepIndex = from;
  helloSliceEnd = to;
  document.body.classList.add("is-hello");
  window.addEventListener("resize", onHelloResize);
  bindHelloSkip();
  helloTimers.push(setTimeout(runHelloStep, 350));
}

function showHelloPart(part) {
  var showExercise = HELLO_LAUNCH_END;
  var showMetronome = showExercise + 5;
  var slices = {
    exercise: [showExercise, showExercise + 5],
    metronome: [showMetronome, showMetronome + 3],
    edit: [HELLO_LAUNCH_END - 1, HELLO_LAUNCH_END]
  };
  var slice = slices[part];
  if (!slice) {
    return;
  }
  beginHello(slice[0], slice[1]);
}

function maybeHello() {
  if (typeof shareBlocksHello === "function" && shareBlocksHello()) {
    return;
  }
  if (helloSeen()) {
    return;
  }
  if (helloTouched) {
    return;
  }
  if (
    document.body.classList.contains("is-editing") ||
    document.body.classList.contains("is-about") ||
    document.body.classList.contains("is-picking") ||
    document.body.classList.contains("is-setup")
  ) {
    return;
  }
  var panel = document.getElementById("groovePanel");
  if (panel && !panel.hidden) {
    return;
  }
  beginHello(0, HELLO_LAUNCH_END);
}
