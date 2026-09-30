var currentExerciseId = "";
var beatsChoice = "4";

function setComboLabel(face, text) {
  var value = face.querySelector(".combo-value");
  if (value) {
    value.textContent = text;
    face.setAttribute("aria-label", "Exercise: " + text);
  } else if (face.firstChild) {
    face.firstChild.nodeValue = text;
  }
}

function placeComboMenu(menu) {
  var face = menu._comboFace;
  var rect = face.getBoundingClientRect();
  var gap = 6;
  var space = menu.classList.contains("combo-up")
    ? rect.top - gap - 8
    : window.innerHeight - rect.bottom - gap - 8;
  menu.style.position = "fixed";
  menu.style.zIndex = "80";
  menu.style.margin = "0";
  menu.style.right = "auto";
  menu.style.minWidth = Math.ceil(rect.width) + "px";
  menu.style.maxWidth = Math.max(120, window.innerWidth - 16) + "px";
  menu.style.maxHeight = Math.max(120, space) + "px";
  var width = menu.offsetWidth;
  var left = rect.right - width;
  if (left < 8) {
    left = 8;
  }
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - 8 - width);
  }
  menu.style.left = left + "px";
  if (menu.classList.contains("combo-up")) {
    menu.style.top = "auto";
    menu.style.bottom = (window.innerHeight - rect.top + gap) + "px";
  } else {
    menu.style.bottom = "auto";
    menu.style.top = (rect.bottom + gap) + "px";
  }
}

function openCombo(menu) {
  document.body.appendChild(menu);
  menu.hidden = false;
  placeComboMenu(menu);
  menu._comboFace.setAttribute("aria-expanded", "true");
}

function closeCombos() {
  var menus = document.querySelectorAll(".combo-menu");
  for (var i = 0; i < menus.length; i++) {
    var menu = menus[i];
    menu.hidden = true;
    menu.style.position = "";
    menu.style.top = "";
    menu.style.bottom = "";
    menu.style.left = "";
    menu.style.right = "";
    menu.style.zIndex = "";
    menu.style.maxWidth = "";
    menu.style.margin = "";
    if (menu._comboHome && menu.parentNode !== menu._comboHome) {
      menu._comboHome.appendChild(menu);
    }
    if (menu._comboFace) {
      menu._comboFace.setAttribute("aria-expanded", "false");
    }
  }
}

function bindCombo(root, onPick) {
  var face = root.querySelector(".combo-face");
  var menu = root.querySelector(".combo-menu");
  menu._comboFace = face;
  menu._comboHome = root;
  if (root.classList.contains("combo-up")) {
    menu.classList.add("combo-up");
  }
  face.addEventListener("click", function (event) {
    event.stopPropagation();
    var willOpen = menu.hidden;
    closeCombos();
    if (willOpen) {
      openCombo(menu);
    }
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
    closeCombos();
    onPick(item.getAttribute("data-value"));
    layoutFrame();
  });
}

function addComboItem(menu, value, label, selected) {
  var item = document.createElement("li");
  item.setAttribute("role", "none");
  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "option");
  button.setAttribute("data-value", value);
  button.setAttribute("aria-selected", selected ? "true" : "false");
  button.textContent = label;
  item.appendChild(button);
  menu.appendChild(item);
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

function chooseBeats(value) {
  beatsChoice = value;
  var custom = document.getElementById("beatsCustom");
  var customStepper = document.getElementById("beatsCustomStepper");
  if (value === "custom") {
    customStepper.hidden = false;
    custom.value = String(beatsPerBar);
    custom.focus();
    layoutFrame();
    return;
  }
  customStepper.hidden = true;
  setBeatsPerBar(parseInt(value, 10));
  layoutFrame();
}

function buildBeatsMenu() {
  var menu = document.getElementById("beatsMenu");
  var choices = ["3", "4", "5", "7", "11", "custom"];
  var labels = { custom: "…" };
  menu.innerHTML = "";
  for (var i = 0; i < choices.length; i++) {
    var value = choices[i];
    addComboItem(menu, value, labels[value] || value, value === beatsChoice);
  }
}

function renderGrooveLabel() {
  var button = document.getElementById("grooveButton");
  if (!button) {
    return;
  }
  button.title = "Click";
  button.setAttribute("aria-label", "Click");
}

function renderGroove() {
  var grid = document.getElementById("clickGrid");
  if (!grid) {
    return;
  }
  var pattern = activePattern();
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

function layoutFrame() {
  fitToolbar(document.getElementById("linediv"), "left");
  fitToolbar(document.getElementById("divfooter"), "right");
  var openMenus = document.querySelectorAll(".combo-menu");
  for (var i = 0; i < openMenus.length; i++) {
    if (!openMenus[i].hidden) {
      placeComboMenu(openMenus[i]);
    }
  }
  if (typeof chooseExerciseFont === "function" && chromaticScale.length) {
    chooseExerciseFont();
  }
}

function closeGroovePanel() {
  var panel = document.getElementById("groovePanel");
  if (panel) {
    panel.hidden = true;
    document.getElementById("grooveButton").setAttribute("aria-expanded", "false");
  }
}

function init() {
  buildExerciseMenu();
  buildBeatsMenu();
  bindCombo(document.getElementById("exerciseCombo"), function (id) {
    currentExerciseId = id;
    SelectExercise();
  });
  bindCombo(document.getElementById("beatsCombo"), chooseBeats);
  document.getElementById("beatsCustom").addEventListener("input", function () {
    if (beatsChoice === "custom") {
      setBeatsPerBar(parseInt(this.value, 10));
    }
  });
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
  document.getElementById("clickGrid").addEventListener("click", function (event) {
    var pad = event.target.closest(".click-pad");
    if (!pad) {
      return;
    }
    toggleClickStep(parseInt(pad.getAttribute("data-step"), 10));
    renderGroove();
  });
  function onCycleInput() {
    setCycle(document.getElementById("playBars").value, document.getElementById("restBars").value);
    renderGrooveLabel();
  }
  document.getElementById("playBars").addEventListener("input", onCycleInput);
  document.getElementById("restBars").addEventListener("input", onCycleInput);
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".combo") && !event.target.closest(".combo-menu")) {
      closeCombos();
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
  document.getElementById("tempoToggle").addEventListener("click", toggleTempo);
  document.getElementById("resetExercise").addEventListener("click", resetExercise);
  document.getElementById("divnote").addEventListener("pointerdown", function () {
    closeGroovePanel();
    closeCombos();
  });
  document.getElementById("next").addEventListener("click", closeGroovePanel);
  window.addEventListener("resize", layoutFrame);
  document.addEventListener("pointerdown", unlockAudio);
  renderGroove();
  SelectExercise();
  startMetronome();
  layoutFrame();
}

init();
