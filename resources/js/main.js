var currentExerciseId = "";
var exerciseFaceFocus = null;
var grooveFocus = null;

function setComboLabel(face, text) {
  var value = face.querySelector(".combo-value");
  if (value) {
    value.textContent = text;
    face.setAttribute("aria-label", "Exercise: " + text);
  } else if (face.firstChild) {
    face.firstChild.nodeValue = text;
  }
}

function closeExercisePanel() {
  var panel = document.getElementById("exercisePanel");
  var face = document.getElementById("exerciseFace");
  if (!panel || panel.hidden) {
    return;
  }
  panel.hidden = true;
  if (face) {
    face.setAttribute("aria-expanded", "false");
  }
  if (exerciseFaceFocus && typeof exerciseFaceFocus.focus === "function") {
    exerciseFaceFocus.focus();
  }
  exerciseFaceFocus = null;
  layoutFrame();
}

function bindExercisePanel() {
  var face = document.getElementById("exerciseFace");
  var panel = document.getElementById("exercisePanel");
  var menu = document.getElementById("exerciseMenu");
  face.addEventListener("click", function (event) {
    event.stopPropagation();
    if (typeof editorIsOpen === "function" && editorIsOpen()) {
      if (typeof editorNotice === "function") {
        editorNotice("Finish or cancel editing first.");
      }
      return;
    }
    var willOpen = panel.hidden;
    if (willOpen) {
      if (typeof closeGroovePanel === "function") {
        closeGroovePanel();
      }
      if (typeof closeAbout === "function") {
        closeAbout();
      }
      exerciseFaceFocus = face;
    }
    panel.hidden = !willOpen;
    face.setAttribute("aria-expanded", willOpen ? "true" : "false");
    layoutFrame();
    if (willOpen) {
      var first = menu.querySelector("button.menu-new, button[data-value]");
      if (first) {
        first.focus();
      }
    }
  });
  menu.addEventListener("click", function (event) {
    if (event.target.closest("[data-new-exercise]")) {
      panel.hidden = true;
      face.setAttribute("aria-expanded", "false");
      exerciseFaceFocus = null;
      if (typeof editorOpenNew === "function") {
        editorOpenNew();
      }
      layoutFrame();
      return;
    }
    var item = event.target.closest("[data-value]");
    if (!item) {
      return;
    }
    var choices = menu.querySelectorAll("[data-value]");
    for (var i = 0; i < choices.length; i++) {
      choices[i].setAttribute("aria-selected", choices[i] === item ? "true" : "false");
    }
    setComboLabel(face, item.textContent);
    currentExerciseId = item.getAttribute("data-value");
    panel.hidden = true;
    face.setAttribute("aria-expanded", "false");
    exerciseFaceFocus = null;
    SelectExercise();
    face.focus();
    layoutFrame();
  });
}

function addComboItem(menu, value, label, selected, userMade) {
  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-value", value);
  button.setAttribute("aria-selected", selected ? "true" : "false");
  button.textContent = label;
  button.title = label;
  if (userMade) {
    button.className = "menu-user";
    button.title = label + " — On this device";
  }
  menu.appendChild(button);
}

function buildExerciseMenu() {
  var menu = document.getElementById("exerciseMenu");
  var face = document.getElementById("exerciseFace");
  menu.innerHTML = "";
  var list = typeof listDeskExercises === "function" ? listDeskExercises() : [];
  if (!list.length && typeof ensureDeskExercises === "function") {
    list = ensureDeskExercises();
  }
  if (currentExerciseId && !getDeskExercise(currentExerciseId)) {
    currentExerciseId = "";
  }
  if (!currentExerciseId && list.length) {
    currentExerciseId = list[0].id;
  }
  var fresh = document.createElement("button");
  fresh.type = "button";
  fresh.className = "menu-new";
  fresh.setAttribute("data-new-exercise", "true");
  fresh.textContent = "New exercise";
  fresh.title = "Start a blank list on this device";
  menu.appendChild(fresh);
  var i;
  for (i = 0; i < list.length; i++) {
    var row = list[i];
    addComboItem(menu, row.id, row.name, row.id === currentExerciseId, !row.seedId);
  }
  var current = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  setComboLabel(face, current ? current.name : "");
}

function SelectExercise() {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    if (typeof editorIsDirty === "function" && editorIsDirty()) {
      if (typeof editorNotice === "function") {
        editorNotice("Cancel editing before choosing another exercise.");
      }
      if (typeof editorRestoreFace === "function") {
        editorRestoreFace();
      }
      return;
    }
    if (typeof editorCloseQuiet === "function") {
      editorCloseQuiet();
    }
  }
  var loaded = typeof deskExerciseItems === "function" ? deskExerciseItems(currentExerciseId) : null;
  if (!loaded) {
    currentExerciseId = typeof firstDeskExerciseId === "function" ? firstDeskExerciseId() : "";
    loaded = typeof deskExerciseItems === "function" ? deskExerciseItems(currentExerciseId) : null;
    if (typeof buildExerciseMenu === "function") {
      buildExerciseMenu();
    }
  }
  if (!loaded) {
    return;
  }
  newExercise(loaded.items, loaded.bars);
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function renderMeterSignature() {
  var names = {
    1: "whole note",
    2: "half note",
    4: "quarter note",
    8: "eighth note",
    16: "sixteenth note"
  };
  var bottom = document.getElementById("meterBottom");
  var hint = document.getElementById("meterHint");
  if (bottom) {
    bottom.textContent = String(beatUnit);
  }
  if (hint) {
    hint.textContent = names[beatUnit] || "";
  }
  var presets = document.querySelectorAll("#meterPresets button");
  for (var i = 0; i < presets.length; i++) {
    var top = parseInt(presets[i].getAttribute("data-top"), 10);
    var unit = parseInt(presets[i].getAttribute("data-unit"), 10);
    presets[i].setAttribute("aria-pressed", top === beatsPerBar && unit === beatUnit ? "true" : "false");
  }
}

function stepBeatUnit(direction) {
  var units = [1, 2, 4, 8, 16];
  var index = units.indexOf(beatUnit);
  if (index < 0) {
    index = 2;
  }
  index += direction;
  if (index < 0) {
    index = 0;
  }
  if (index >= units.length) {
    index = units.length - 1;
  }
  setBeatUnit(units[index]);
  renderMeterSignature();
}

function renderGrooveLabel() {
  var button = document.getElementById("grooveButton");
  if (!button) {
    return;
  }
  button.title = "Meter, clicks, bars, swing, and count-in";
  button.setAttribute("aria-label", "Setup");
}

function fillClickGrid(grid, pattern) {
  grid.innerHTML = "";
  for (var i = 0; i < pattern.length; i += 2) {
    var pair = document.createElement("span");
    pair.className = "click-pair";
    for (var k = 0; k < 2 && i + k < pattern.length; k++) {
      var step = i + k;
      var level = pattern[step] || 0;
      var pad = document.createElement("button");
      pad.type = "button";
      pad.className = "click-pad" + (level === 1 ? " on" : level === 2 ? " accent" : "");
      pad.setAttribute("data-step", String(step));
      pad.textContent = k === 0 ? String(step / 2 + 1) : "&";
      pad.setAttribute("aria-pressed", level ? "true" : "false");
      pad.title = level === 2 ? "Accent. Tap to turn it off." : (level === 1 ? "Click. Tap for an accent." : "Off. Tap for a click.");
      pair.appendChild(pad);
    }
    grid.appendChild(pair);
  }
}

function renderGroove() {
  var playGrid = document.getElementById("clickGrid");
  var restGrid = document.getElementById("restClickGrid");
  if (!playGrid || !restGrid) {
    return;
  }
  fillClickGrid(playGrid, activePlayPattern());
  fillClickGrid(restGrid, activeRestPattern());
  renderGrooveLabel();
}

function fitToolbar(inner, align) {
  if (!inner) {
    return;
  }
  inner.style.zoom = "";
  inner.style.transform = "none";
  inner.style.width = "max-content";
  inner.style.marginLeft = "0";
  var available = inner.parentNode.clientWidth;
  var needed = inner.offsetWidth;
  if (needed > available - 4 && needed > 0) {
    var scale = (available - 8) / needed;
    var minBtn = inner.querySelector(".icon-btn, #tempoToggle, #next, #grooveButton");
    var natural = minBtn ? minBtn.offsetHeight : 44;
    if (natural > 0) {
      var floor = 44 / natural;
      if (scale < floor) {
        scale = floor;
      }
    }
    if (scale > 1) {
      scale = 1;
    }
    inner.style.transform = "scale(" + scale + ")";
    inner.style.transformOrigin = align === "right" ? "right bottom" : "left top";
    inner.style.justifyContent = "flex-start";
  } else {
    inner.style.width = "100%";
    inner.style.justifyContent = align === "right" ? "flex-end" : "space-between";
  }
}

function placeExercisePanel() {
  var panel = document.getElementById("exercisePanel");
  var bar = document.getElementById("topBar");
  if (!panel || panel.hidden || !bar) {
    return;
  }
  var top = bar.getBoundingClientRect().bottom;
  panel.style.top = top + "px";
  panel.style.maxHeight = Math.max(120, window.innerHeight - top - 8) + "px";
}

function placeCountIn() {
  var el = document.getElementById("countIn");
  var bar = document.getElementById("topBar");
  if (!el || !bar) {
    return;
  }
  var top = bar.getBoundingClientRect().bottom + 8;
  el.style.top = Math.max(8, top) + "px";
}

function placeFooter() {
  var footer = document.querySelector("footer");
  var bar = document.getElementById("topBar");
  if (!footer || !bar) {
    return;
  }
  var top = bar.getBoundingClientRect().bottom;
  footer.style.maxHeight = Math.max(160, window.innerHeight - top) + "px";
}

function syncFaceCover() {
  var exercise = document.getElementById("exercisePanel");
  var groove = document.getElementById("groovePanel");
  document.body.classList.toggle("is-picking", !!(exercise && !exercise.hidden));
  document.body.classList.toggle("is-setup", !!(groove && !groove.hidden));
}

function layoutFrame() {
  syncFaceCover();
  fitToolbar(document.getElementById("linediv"), "left");
  fitToolbar(document.getElementById("divfooter"), "right");
  placeFooter();
  placeExercisePanel();
  placeCountIn();
  if (typeof placeEditor === "function") {
    placeEditor();
  }
  if (typeof placeAbout === "function") {
    placeAbout();
  }
  if (typeof placeHelloCaption === "function") {
    placeHelloCaption();
  }
  if (typeof chooseExerciseFont === "function" && chromaticScale.length) {
    chooseExerciseFont();
  }
}

function closeGroovePanel() {
  var panel = document.getElementById("groovePanel");
  var button = document.getElementById("grooveButton");
  if (panel && !panel.hidden) {
    panel.hidden = true;
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
    if (grooveFocus && typeof grooveFocus.focus === "function") {
      grooveFocus.focus();
    }
    grooveFocus = null;
    layoutFrame();
  }
}

function init() {
  if (typeof applyDesk === "function") {
    applyDesk();
  }
  buildExerciseMenu();
  bindExercisePanel();
  document.getElementById("meterTop").addEventListener("input", function () {
    setBeatsPerBar(parseInt(this.value, 10));
    renderMeterSignature();
  });
  document.getElementById("meterPresets").addEventListener("click", function (event) {
    var btn = event.target.closest("button");
    if (!btn) {
      return;
    }
    var top = parseInt(btn.getAttribute("data-top"), 10);
    var unit = parseInt(btn.getAttribute("data-unit"), 10);
    document.getElementById("meterTop").value = String(top);
    setBeatsPerBar(top);
    setBeatUnit(unit);
    renderMeterSignature();
  });
  document.getElementById("unitDown").addEventListener("click", function () {
    stepBeatUnit(-1);
  });
  document.getElementById("unitUp").addEventListener("click", function () {
    stepBeatUnit(1);
  });
  renderMeterSignature();
  document.getElementById("volumeCheckbox").addEventListener("change", function () {
    setSoundOn(this.checked);
    if (typeof rememberSetup === "function") {
      rememberSetup();
    }
  });
  document.getElementById("bpm").addEventListener("input", updateInterval);
  document.getElementById("grooveButton").addEventListener("click", function () {
    if (typeof editorIsOpen === "function" && editorIsOpen()) {
      if (typeof editorNotice === "function") {
        editorNotice("Finish or cancel editing first.");
      }
      return;
    }
    var panel = document.getElementById("groovePanel");
    var willOpen = panel.hidden;
    if (willOpen) {
      if (typeof aboutIsOpen === "function" && aboutIsOpen()) {
        closeAbout();
      }
      closeExercisePanel();
      grooveFocus = this;
    }
    panel.hidden = !willOpen;
    this.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    if (!panel.hidden) {
      renderGroove();
      var first = panel.querySelector("button, input");
      if (first) {
        first.focus();
      }
    } else {
      grooveFocus = null;
    }
    layoutFrame();
  });
  document.getElementById("groovePanel").addEventListener("click", function (event) {
    var pad = event.target.closest(".click-pad");
    if (!pad) {
      return;
    }
    toggleClickStep(parseInt(pad.getAttribute("data-step"), 10), !!pad.closest("#restClickGrid"));
    renderGroove();
  });
  function onCycleInput() {
    setCycle(document.getElementById("playBars").value, document.getElementById("restBars").value);
    renderGrooveLabel();
  }
  document.getElementById("playBars").addEventListener("input", onCycleInput);
  document.getElementById("restBars").addEventListener("input", onCycleInput);
  document.getElementById("repeatCount").addEventListener("input", function () {
    setRepeat(this.value);
  });
  document.addEventListener("click", function (event) {
    if (!event.target.closest("#exercisePanel") && !event.target.closest("#exerciseFace")) {
      closeExercisePanel();
    }
    var btn = event.target.closest(".step-down, .step-up");
    if (!btn) {
      return;
    }
    var input = btn.parentNode.querySelector("input");
    if (!input) {
      return;
    }
    var min = input.min === "" ? -Infinity : parseInt(input.min, 10);
    var max = input.max === "" ? Infinity : parseInt(input.max, 10);
    var value = parseInt(input.value, 10);
    if (isNaN(value)) {
      value = isFinite(min) ? min : 0;
    }
    value += btn.classList.contains("step-up") ? 1 : -1;
    if (value < min) {
      value = min;
    }
    if (value > max) {
      value = max;
    }
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  document.getElementById("lookAhead").addEventListener("click", function () {
    setLookAhead(this.getAttribute("aria-pressed") !== "true");
  });
  document.getElementById("restoreDefaults").addEventListener("click", function () {
    if (!this.classList.contains("is-armed")) {
      if (typeof editorIsOpen === "function" && editorIsOpen() && typeof editorIsDirty === "function" && editorIsDirty()) {
        if (typeof editorNotice === "function") {
          editorNotice("Finish or cancel editing first.");
        }
        return;
      }
      this.classList.add("is-armed");
      this.textContent = "Clear saved setup?";
      this.setAttribute("aria-label", "Clear saved setup?");
      if (restoreTimer) {
        clearTimeout(restoreTimer);
      }
      restoreTimer = setTimeout(function () {
        disarmRestoreDefaults();
      }, 4000);
      return;
    }
    disarmRestoreDefaults();
    restoreDefaults();
  });
  document.getElementById("countInToggle").addEventListener("click", function () {
    setCountIn(this.getAttribute("aria-pressed") !== "true");
  });
  document.getElementById("swingModeOff").addEventListener("click", function () {
    setSwingMode("off");
  });
  document.getElementById("swingModeTriplet").addEventListener("click", function () {
    setSwingMode("triplet");
  });
  document.getElementById("swingModeFeel").addEventListener("click", function () {
    setSwingMode("feel");
  });
  document.getElementById("swingModeNeo").addEventListener("click", function () {
    setSwingMode("neo");
  });
  document.getElementById("tempoToggle").addEventListener("click", toggleTempo);
  document.getElementById("resetExercise").addEventListener("click", resetExercise);
  document.getElementById("divnote").addEventListener("pointerdown", function () {
    closeGroovePanel();
    closeExercisePanel();
  });
  document.getElementById("next").addEventListener("click", function () {
    closeGroovePanel();
    closeExercisePanel();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      return;
    }
    if (typeof editorIsOpen === "function" && editorIsOpen()) {
      return;
    }
    if (typeof aboutIsOpen === "function" && aboutIsOpen()) {
      return;
    }
    var exercise = document.getElementById("exercisePanel");
    if (exercise && !exercise.hidden) {
      event.preventDefault();
      closeExercisePanel();
      return;
    }
    var groove = document.getElementById("groovePanel");
    if (groove && !groove.hidden) {
      event.preventDefault();
      closeGroovePanel();
    }
  });
  window.addEventListener("resize", layoutFrame);
  document.addEventListener("pointerdown", unlockAudio);
  renderGroove();
  SelectExercise();
  startMetronome();
  layoutFrame();
  deskReady = true;
  if (typeof maybeHello === "function") {
    setTimeout(maybeHello, 400);
  }
}

init();
