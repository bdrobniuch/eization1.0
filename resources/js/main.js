var currentExerciseId = "";

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
  layoutFrame();
}

function bindExercisePanel() {
  var face = document.getElementById("exerciseFace");
  var panel = document.getElementById("exercisePanel");
  var menu = document.getElementById("exerciseMenu");
  face.addEventListener("click", function (event) {
    event.stopPropagation();
    var willOpen = panel.hidden;
    panel.hidden = !willOpen;
    face.setAttribute("aria-expanded", willOpen ? "true" : "false");
    layoutFrame();
  });
  menu.addEventListener("click", function (event) {
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
    SelectExercise();
    layoutFrame();
  });
}

function addComboItem(menu, value, label, selected) {
  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "option");
  button.setAttribute("data-value", value);
  button.setAttribute("aria-selected", selected ? "true" : "false");
  button.textContent = label;
  menu.appendChild(button);
}

function buildExerciseMenu() {
  var menu = document.getElementById("exerciseMenu");
  var face = document.getElementById("exerciseFace");
  menu.innerHTML = "";
  var first = null;
  for (var i = 0; i < menuOrder.length; i++) {
    var ex = exercises[menuOrder[i]];
    if (!ex || !ex.inMenu) {
      continue;
    }
    if (!first) {
      first = ex;
    }
    addComboItem(menu, ex.id, ex.label, ex.id === (currentExerciseId || (first && first.id)));
  }
  if (!currentExerciseId && first) {
    currentExerciseId = first.id;
  }
  var current = exercises[currentExerciseId];
  setComboLabel(face, current ? current.label : "");
}

function SelectExercise() {
  var ex = exercises[currentExerciseId];
  if (!ex) {
    return;
  }
  newExercise(ex.items, ex.bars || 1);
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
  button.title = "Setup";
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
  panel.style.top = bar.getBoundingClientRect().bottom + "px";
}

function layoutFrame() {
  fitToolbar(document.getElementById("linediv"), "left");
  fitToolbar(document.getElementById("divfooter"), "right");
  placeExercisePanel();
  if (typeof chooseExerciseFont === "function" && chromaticScale.length) {
    chooseExerciseFont();
  }
}

function closeGroovePanel() {
  var panel = document.getElementById("groovePanel");
  if (panel && !panel.hidden) {
    panel.hidden = true;
    document.getElementById("grooveButton").setAttribute("aria-expanded", "false");
    layoutFrame();
  }
}

function init() {
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
  });
  document.getElementById("bpm").addEventListener("input", updateInterval);
  document.getElementById("grooveButton").addEventListener("click", function () {
    var panel = document.getElementById("groovePanel");
    panel.hidden = !panel.hidden;
    this.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    if (!panel.hidden) {
      renderGroove();
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
  document.getElementById("countInToggle").addEventListener("click", function () {
    setCountIn(this.getAttribute("aria-pressed") !== "true");
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
  window.addEventListener("resize", layoutFrame);
  document.addEventListener("pointerdown", unlockAudio);
  renderGroove();
  SelectExercise();
  startMetronome();
  layoutFrame();
}

init();
