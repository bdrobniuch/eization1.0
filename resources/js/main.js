var currentExerciseId = "";
var openedExerciseFromAddress = false;
var exerciseFaceFocus = null;
var grooveFocus = null;

function setComboLabel(face, text) {
  var value = face.querySelector(".combo-value");
  if (value) {
    value.textContent = text;
    face.setAttribute("aria-label", tr("menu.exerciseAria", { name: text }));
    face.setAttribute("title", text);
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
        editorNotice(t("edit.finish"));
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

function addComboItem(menu, value, label, selected) {
  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-value", value);
  button.setAttribute("aria-selected", selected ? "true" : "false");
  button.textContent = label;
  button.title = label;
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
  fresh.textContent = t("menu.new");
  fresh.title = t("menu.newTitle");
  menu.appendChild(fresh);
  var i;
  for (i = 0; i < list.length; i++) {
    var row = list[i];
    addComboItem(menu, row.id, exerciseDisplayName(row), row.id === currentExerciseId);
  }
  var current = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  setComboLabel(face, current ? exerciseDisplayName(current) : "");
}

function SelectExercise() {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    if (typeof editorIsDirty === "function" && editorIsDirty()) {
      if (typeof editorNotice === "function") {
        editorNotice(t("edit.cancelFirst"));
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
    1: t("note.whole"),
    2: t("note.half"),
    4: t("note.quarter"),
    8: t("note.eighth"),
    16: t("note.sixteenth")
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
  button.title = t("groove.setupTitle");
  button.setAttribute("aria-label", t("groove.setupAria"));
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
      pad.title = level === 2 ? t("click.accent") : (level === 1 ? t("click.on") : t("click.off"));
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

function fitTopBar() {
  var line = document.getElementById("linediv");
  var combo = document.getElementById("exerciseCombo");
  var face = document.getElementById("exerciseFace");
  var tools = document.getElementById("editTools");
  var status = document.getElementById("status");
  if (!line || !combo || !face || !tools || !status) {
    return;
  }
  line.style.zoom = "";
  line.style.transform = "none";
  line.style.width = "100%";
  line.style.marginLeft = "0";
  line.style.justifyContent = "space-between";
  combo.style.maxWidth = "";
  face.style.maxWidth = "";
  var cs = window.getComputedStyle(line);
  var pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  var lineGap = parseFloat(cs.columnGap);
  if (isNaN(lineGap)) {
    lineGap = parseFloat(cs.gap) || 0;
  }
  var toolCs = window.getComputedStyle(tools);
  var toolGap = parseFloat(toolCs.columnGap);
  if (isNaN(toolGap)) {
    toolGap = parseFloat(toolCs.gap) || 0;
  }
  var fixed = status.offsetWidth;
  var others = 0;
  var i;
  for (i = 0; i < tools.children.length; i++) {
    if (tools.children[i] === combo) {
      continue;
    }
    fixed += tools.children[i].offsetWidth;
    others++;
  }
  var room = line.clientWidth - pad - lineGap - toolGap * others - fixed;
  if (room < 64) {
    room = 64;
  }
  var cap = Math.floor(room);
  combo.style.maxWidth = cap + "px";
  face.style.maxWidth = cap + "px";
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
  var face = document.getElementById("exerciseFace");
  if (!panel || panel.hidden || !face) {
    return;
  }
  var box = face.getBoundingClientRect();
  var top = box.bottom;
  panel.style.top = top + "px";
  panel.style.left = "0px";
  panel.style.right = "0px";
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
  fitTopBar();
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

function exerciseSeedFromQuery(search) {
  try {
    return new URLSearchParams(search || "").get("exercise") || "";
  } catch (err) {
    return "";
  }
}

function exerciseIdFromQuery(search) {
  var seed = exerciseSeedFromQuery(search);
  if (!seed || typeof menuOrder === "undefined" || menuOrder.indexOf(seed) < 0) {
    return "";
  }
  var wanted = typeof deskIdForSeed === "function" ? deskIdForSeed(seed) : "";
  var list = typeof listDeskExercises === "function" ? listDeskExercises() : [];
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].id === wanted || list[i].seedId === seed) {
      return list[i].id;
    }
  }
  return "";
}

function clearExerciseQuery() {
  if (!window.history || typeof window.history.replaceState !== "function") {
    return;
  }
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  } catch (err) {}
}

var shareOffer = null;
var sharePreview = null;
var shareAddedThisVisit = false;

function shareBlocksHello() {
  if (shareAddedThisVisit) {
    return true;
  }
  var bar = document.getElementById("shareAsk");
  return !!(bar && !bar.hidden);
}

function clearShareHash() {
  if (!window.history || typeof window.history.replaceState !== "function") {
    return;
  }
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch (err) {}
}

function hideShareAsk() {
  var bar = document.getElementById("shareAsk");
  if (bar) {
    bar.hidden = true;
  }
}

function showShareAsk(kind, full, snap) {
  shareOffer = snap;
  var bar = document.getElementById("shareAsk");
  if (!bar) {
    return;
  }
  var name = document.getElementById("shareAskName");
  if (name) {
    name.textContent = snap.name;
  }
  var lead = document.getElementById("shareAskLead");
  if (lead) {
    lead.textContent = kind === "changed" ? t("share.differ") : t("share.text");
  }
  var add = document.getElementById("shareAdd");
  var update = document.getElementById("shareUpdate");
  var addNew = document.getElementById("shareAddNew");
  var preview = document.getElementById("sharePreview");
  if (add) {
    add.hidden = kind !== "new";
  }
  if (update) {
    update.hidden = kind !== "changed";
  }
  if (addNew) {
    addNew.hidden = kind !== "changed";
  }
  if (preview) {
    preview.hidden = false;
  }
  var note = document.getElementById("shareAskNote");
  if (note) {
    note.hidden = !full;
    note.textContent = full ? t("edit.removeFirst") : "";
  }
  bar.hidden = false;
}

function finishShareSelect(id, message) {
  clearShareHash();
  hideShareAsk();
  shareOffer = null;
  if (typeof closeAbout === "function" && typeof aboutIsOpen === "function" && aboutIsOpen()) {
    closeAbout();
  }
  currentExerciseId = id;
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (typeof SelectExercise === "function") {
    SelectExercise();
  }
  if (message && typeof showDeskNote === "function") {
    showDeskNote(message);
  }
}

function confirmShareAdd() {
  if (!shareOffer || typeof createDeskExercise !== "function" || typeof findDeskShare !== "function") {
    return false;
  }
  var found = findDeskShare(shareOffer);
  if (found.exact) {
    finishShareSelect(found.exact.id, "");
    return true;
  }
  if (typeof listDeskExercises === "function" && listDeskExercises().length >= DESK_EXERCISE_CAP) {
    var note = document.getElementById("shareAskNote");
    if (note) {
      note.hidden = false;
      note.textContent = t("edit.removeFirst");
    }
    return false;
  }
  var created = createDeskExercise({
    name: shareOffer.name,
    bars: shareOffer.bars,
    lines: shareOffer.lines,
    shareId: shareOffer.shareId
  });
  if (!created) {
    var failed = document.getElementById("shareAskNote");
    if (failed) {
      failed.hidden = false;
      failed.textContent = t("edit.removeFirst");
    }
    return false;
  }
  shareAddedThisVisit = true;
  finishShareSelect(created.id, t("edit.added"));
  return true;
}

function confirmShareUpdate() {
  if (!shareOffer || typeof findDeskShare !== "function" || typeof updateDeskExercise !== "function") {
    return;
  }
  var found = findDeskShare(shareOffer);
  if (found.exact) {
    finishShareSelect(found.exact.id, "");
    return;
  }
  if (!found.related) {
    confirmShareAdd();
    return;
  }
  var saved = updateDeskExercise(found.related.id, {
    name: shareOffer.name,
    bars: shareOffer.bars,
    lines: shareOffer.lines
  });
  if (!saved) {
    return;
  }
  finishShareSelect(saved.id, t("share.updated"));
}

function finishShareEdit(added) {
  sharePreview = null;
  clearShareHash();
  hideShareAsk();
  shareOffer = null;
  if (added) {
    shareAddedThisVisit = true;
  }
}

function restoreShareAsk() {
  if (!shareOffer || typeof deskShareOffer !== "function") {
    return;
  }
  var offer = deskShareOffer(shareOffer);
  if (offer.kind === "exact" && offer.exact) {
    finishShareSelect(offer.exact.id, "");
    return;
  }
  if (offer.kind === "bad") {
    dismissShareAsk();
    return;
  }
  showShareAsk(offer.kind, offer.full, shareOffer);
}

function cancelSharePreview() {
  var label = sharePreview && sharePreview.label ? sharePreview.label : "";
  var face = document.getElementById("exerciseFace");
  sharePreview = null;
  if (face && label && typeof setComboLabel === "function") {
    setComboLabel(face, label);
  }
  if (typeof editorCloseQuiet === "function") {
    editorCloseQuiet();
  }
  if (typeof chooseExerciseFont === "function") {
    chooseExerciseFont();
  }
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
  restoreShareAsk();
}

function previewShareExercise() {
  if (!shareOffer || typeof findDeskShare !== "function" || typeof editorOpenSharePreview !== "function") {
    return;
  }
  var found = findDeskShare(shareOffer);
  if (found.exact) {
    finishShareSelect(found.exact.id, "");
    return;
  }
  sharePreview = { mode: found.related ? "changed" : "new", label: "" };
  hideShareAsk();
  editorOpenSharePreview({
    mode: found.related ? "edit" : "create",
    target: found.related,
    name: shareOffer.name,
    bars: shareOffer.bars,
    lines: shareOffer.lines
  });
}

function dismissShareAsk() {
  clearShareHash();
  hideShareAsk();
  shareOffer = null;
  if (typeof helloTouched !== "undefined") {
    helloTouched = false;
  }
  if (typeof maybeHello === "function") {
    maybeHello();
  }
}

function offerSharedExercise() {
  var hash = window.location.hash || "";
  if (hash.indexOf("#s=") !== 0) {
    return;
  }
  var snap = typeof readShareHash === "function" ? readShareHash(hash) : null;
  if (!snap || typeof deskShareOffer !== "function") {
    clearShareHash();
    return;
  }
  var offer = deskShareOffer(snap);
  if (offer.kind === "bad") {
    clearShareHash();
    return;
  }
  if (offer.kind === "exact" && offer.exact) {
    finishShareSelect(offer.exact.id, "");
    return;
  }
  showShareAsk(offer.kind, offer.full, snap);
}

function openExerciseFromAddress() {
  var seed = exerciseSeedFromQuery(window.location.search);
  if (!seed || typeof menuOrder === "undefined" || menuOrder.indexOf(seed) < 0) {
    return;
  }
  var id = exerciseIdFromQuery(window.location.search);
  clearExerciseQuery();
  if (id) {
    currentExerciseId = id;
    openedExerciseFromAddress = true;
    return;
  }
  if (typeof showDeskNote === "function") {
    showDeskNote(t("desk.notHere"));
  }
}

function restoreApplyLanguage() {
  var button = document.getElementById("restoreDefaults");
  if (!button || !button.classList.contains("is-armed")) {
    return;
  }
  button.textContent = t("device.clearAsk");
  button.setAttribute("aria-label", t("device.clearAsk"));
}

function init() {
  if (typeof applyDesk === "function") {
    applyDesk();
  }
  openExerciseFromAddress();
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
        editorNotice(t("edit.finish"));
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
          editorNotice(t("edit.finish"));
        }
        return;
      }
      this.classList.add("is-armed");
      this.textContent = t("device.clearAsk");
      this.setAttribute("aria-label", t("device.clearAsk"));
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
  var shareAdd = document.getElementById("shareAdd");
  var shareUpdate = document.getElementById("shareUpdate");
  var shareAddNew = document.getElementById("shareAddNew");
  var sharePreviewButton = document.getElementById("sharePreview");
  var shareNotNow = document.getElementById("shareNotNow");
  if (shareAdd) {
    shareAdd.addEventListener("click", confirmShareAdd);
  }
  if (shareUpdate) {
    shareUpdate.addEventListener("click", confirmShareUpdate);
  }
  if (shareAddNew) {
    shareAddNew.addEventListener("click", confirmShareAdd);
  }
  if (sharePreviewButton) {
    sharePreviewButton.addEventListener("click", previewShareExercise);
  }
  if (shareNotNow) {
    shareNotNow.addEventListener("click", dismissShareAsk);
  }
  offerSharedExercise();
  startMetronome();
  layoutFrame();
  deskReady = true;
  if (openedExerciseFromAddress && typeof rememberSetup === "function") {
    rememberSetup();
  }
  if (typeof maybeHello === "function") {
    setTimeout(maybeHello, 400);
  }
}

init();
