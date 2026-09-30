function buildExerciseMenu() {
  var select = document.getElementById("exerciseSelect");
  select.innerHTML = "";
  for (var i = 0; i < menuOrder.length; i++) {
    var ex = exercises[menuOrder[i]];
    if (!ex || !ex.inMenu) {
      continue;
    }
    var opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = ex.label;
    select.appendChild(opt);
  }
}

function SelectExercise() {
  var id = document.getElementById("exerciseSelect").value;
  var ex = exercises[id];
  if (!ex) {
    return;
  }
  newExercise(ex.items, ex.fontSize, ex.bars || 1);
}

function onBeatsSelect() {
  var sel = document.getElementById("beatsSelect");
  var custom = document.getElementById("beatsCustom");
  var customStepper = document.getElementById("beatsCustomStepper");
  if (sel.value === "custom") {
    customStepper.hidden = false;
    custom.value = String(beatsPerBar);
    custom.focus();
  } else {
    customStepper.hidden = true;
    setBeatsPerBar(parseInt(sel.value, 10));
  }
}

function renderGrooveLabel() {
  var button = document.getElementById("grooveButton");
  if (!button) {
    return;
  }
  button.textContent = grooveLabel();
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

function closeGroovePanel() {
  var panel = document.getElementById("groovePanel");
  if (panel) {
    panel.hidden = true;
    document.getElementById("grooveButton").setAttribute("aria-expanded", "false");
  }
}

function init() {
  buildExerciseMenu();
  document.getElementById("beatsSelect").addEventListener("change", onBeatsSelect);
  document.getElementById("beatsCustom").addEventListener("input", function () {
    if (document.getElementById("beatsSelect").value === "custom") {
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
  document.getElementById("divnote").addEventListener("pointerdown", closeGroovePanel);
  document.getElementById("next").addEventListener("click", closeGroovePanel);
  document.addEventListener("pointerdown", unlockAudio);
  renderGroove();
  SelectExercise();
  startMetronome();
}

init();
