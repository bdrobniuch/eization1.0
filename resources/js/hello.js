var HELLO_KEY = "eization-hello";
var helloTimers = [];
var helloAim = null;
var helloTouched = false;
var helloReset = false;
var helloPhraseRaf = 0;
var HELLO_STEPS = 4;
var HELLO_STEP_MS = 700;

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

function placeHello(id, side) {
  var el = document.getElementById(id);
  var arrow = document.getElementById("helloArrow");
  if (!el || !arrow) {
    return;
  }
  helloAim = { id: id, side: side };
  var box = el.getBoundingClientRect();
  arrow.className = side === "up" ? "points-up" : "points-down";
  arrow.hidden = false;
  arrow.style.left = (box.left + box.width / 2) + "px";
  arrow.style.top = (side === "up" ? box.bottom + 10 : box.top - 10) + "px";
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
    var t = (now - start) / HELLO_STEP_MS;
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
  if (typeof resetExercise === "function") {
    resetExercise();
  }
}

function endHello() {
  if (!document.body.classList.contains("is-hello")) {
    return;
  }
  helloStopPhrase();
  helloBackToStart();
  document.body.classList.remove("is-hello");
  var arrow = document.getElementById("helloArrow");
  if (arrow) {
    arrow.hidden = true;
  }
  var i;
  for (i = 0; i < helloTimers.length; i++) {
    clearTimeout(helloTimers[i]);
  }
  helloTimers = [];
  helloAim = null;
  markHello();
  document.removeEventListener("pointerdown", endHello, true);
  window.removeEventListener("resize", onHelloResize);
}

function settleHello() {
  if (!document.body.classList.contains("is-hello")) {
    return;
  }
  helloBackToStart();
  helloTimers.push(setTimeout(endHello, 900));
}

function onHelloResize() {
  if (!helloAim) {
    return;
  }
  placeHello(helloAim.id, helloAim.side);
}

function maybeHello() {
  if (helloSeen()) {
    return;
  }
  if (helloTouched) {
    markHello();
    return;
  }
  if (document.body.classList.contains("is-editing") || document.body.classList.contains("is-about")) {
    return;
  }
  var panel = document.getElementById("groovePanel");
  if (panel && !panel.hidden) {
    return;
  }
  helloReset = false;
  document.body.classList.add("is-hello");
  placeHello("tempoToggle", "down");
  document.addEventListener("pointerdown", endHello, true);
  window.addEventListener("resize", onHelloResize);
  var step = 0;
  function hop() {
    if (!document.body.classList.contains("is-hello")) {
      return;
    }
    helloPlayPhrase(function () {
      if (!document.body.classList.contains("is-hello")) {
        return;
      }
      step++;
      helloTimers.push(setTimeout(function () {
        if (!document.body.classList.contains("is-hello")) {
          return;
        }
        if (step >= HELLO_STEPS) {
          settleHello();
          return;
        }
        if (typeof advanceNote === "function") {
          advanceNote();
        }
        hop();
      }, 180));
    });
  }
  helloTimers.push(setTimeout(hop, 400));
}
