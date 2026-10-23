var currentExerciseId = "";
var openedExerciseFromAddress = false;
var exerciseFaceFocus = null;
var grooveFocus = null;
var analyticsOff = false;
var nextExampleSeen = {};
var embedded = false;
var passShareSeen = {};
var tempoSessionStarted = 0;

try {
  analyticsOff = String(window.location.search || "").indexOf("smoke=1") !== -1;
} catch (err) {
  analyticsOff = true;
}

function analyticsExerciseId() {
  var row = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  if (row && row.seedId) {
    return row.seedId;
  }
  return "custom";
}

function track(name, params) {
  if (analyticsOff || typeof gtag !== "function") {
    return;
  }
  gtag("event", name, params || {});
}

function trackNextExample() {
  var id = analyticsExerciseId();
  if (nextExampleSeen[id]) {
    return;
  }
  nextExampleSeen[id] = true;
  track("next_example", { exercise_id: id });
}

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
    if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
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
      var first = menu.querySelector("button.menu-special, button[data-value]");
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
      closeShareQuestion(true);
      if (typeof editorOpenNew === "function") {
        editorOpenNew();
      }
      layoutFrame();
      return;
    }
    if (event.target.closest("[data-today]")) {
      panel.hidden = true;
      face.setAttribute("aria-expanded", "false");
      exerciseFaceFocus = null;
      openTodayExercise();
      layoutFrame();
      return;
    }
    if (event.target.closest("[data-more-exercises]")) {
      panel.hidden = true;
      face.setAttribute("aria-expanded", "false");
      exerciseFaceFocus = null;
      closeShareQuestion(false);
      window.location.href = "./more.html";
      return;
    }
    var item = event.target.closest("[data-value]");
    if (!item) {
      return;
    }
    closeShareQuestion(false);
    var choices = menu.querySelectorAll("[data-value]");
    for (var i = 0; i < choices.length; i++) {
      if (choices[i] === item) {
        choices[i].setAttribute("aria-current", "true");
      } else {
        choices[i].removeAttribute("aria-current");
      }
    }
    setComboLabel(face, item.textContent);
    currentExerciseId = item.getAttribute("data-value");
    panel.hidden = true;
    face.setAttribute("aria-expanded", "false");
    exerciseFaceFocus = null;
    SelectExercise();
    if (typeof editorIsOpen !== "function" || !editorIsOpen()) {
      track("select_exercise", { exercise_id: analyticsExerciseId() });
    }
    face.focus();
    layoutFrame();
  });
}

function addComboItem(menu, value, label, selected) {
  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-value", value);
  if (selected) {
    button.setAttribute("aria-current", "true");
  }
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
  fresh.className = "menu-special";
  fresh.setAttribute("data-new-exercise", "true");
  fresh.textContent = t("menu.new");
  fresh.title = t("menu.newTitle");
  menu.appendChild(fresh);
  var i;
  for (i = 0; i < list.length; i++) {
    var row = list[i];
    addComboItem(menu, row.id, exerciseDisplayName(row), row.id === currentExerciseId);
  }
  var more = document.createElement("button");
  more.type = "button";
  more.className = "menu-special";
  more.setAttribute("data-more-exercises", "true");
  more.textContent = t("menu.more");
  more.title = t("menu.moreTitle");
  menu.appendChild(more);
  var current = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  if (shareLookHolds()) {
    setComboLabel(face, shareOffer.name || "");
  } else {
    setComboLabel(face, current ? exerciseDisplayName(current) : "");
  }
}

function SelectExercise() {
  if (shareLookHolds()) {
    return;
  }
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
    if (typeof editorCancel === "function") {
      editorCancel();
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
  if (typeof applyPracticeStaffDefaults === "function") {
    applyPracticeStaffDefaults(loaded);
  }
  newExercise(loaded.items, loaded.bars, !!loaded.staff);
  maybeOfferRecommendedMeter(loaded);
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
}

function maybeOfferRecommendedMeter(record) {
  var meter;
  if (typeof shareLookHolds === "function" && shareLookHolds()) {
    return;
  }
  meter = record && record.meter ? cleanDeskMeter(record.meter) : null;
  if (!meter) {
    return;
  }
  if (beatsPerBar === meter.beats && beatUnit === meter.unit) {
    return;
  }
  if (typeof setBeatsPerBar === "function") {
    setBeatsPerBar(meter.beats);
  }
  if (typeof setBeatUnit === "function") {
    setBeatUnit(meter.unit);
  }
  if (typeof renderMeterSignature === "function") {
    renderMeterSignature();
  }
  if (typeof embedded === "undefined" || !embedded) {
    if (typeof rememberSetup === "function") {
      rememberSetup();
    }
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

function queryFlag(search, key) {
  try {
    return new URLSearchParams(search || "").get(key) || "";
  } catch (err) {
    return "";
  }
}

function todayExerciseName() {
  var seed = typeof exerciseOfDay === "function" ? exerciseOfDay() : "";
  var list;
  var i;
  if (!seed) {
    return "";
  }
  list = typeof listDeskExercises === "function" ? listDeskExercises() : [];
  for (i = 0; i < list.length; i++) {
    if (list[i].seedId === seed) {
      return exerciseDisplayName(list[i]);
    }
  }
  return t("seed." + seed);
}

function deskIdForToday(seed) {
  var list;
  var i;
  list = typeof listDeskExercises === "function" ? listDeskExercises() : [];
  for (i = 0; i < list.length; i++) {
    if (list[i].seedId === seed) {
      return list[i].id;
    }
  }
  return "";
}

function catalogShareSnapshot(seedId) {
  var row;
  var snap;
  var id;
  if (typeof catalogExerciseRecord !== "function" || typeof shareSnapshot !== "function") {
    return null;
  }
  row = catalogExerciseRecord(seedId);
  if (!row) {
    return null;
  }
  id = typeof newShareId === "function" ? newShareId() : "";
  if (!id) {
    return null;
  }
  snap = shareSnapshot({
    id: id,
    name: row.name,
    bars: row.bars,
    staff: row.staff,
    lines: row.lines
  });
  if (!snap) {
    return null;
  }
  snap.seedId = seedId;
  return snap;
}

function offerCatalogExercise(seed, fromToday) {
  var snap = catalogShareSnapshot(seed);
  if (!snap) {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("share.bad"));
    }
    return;
  }
  if (fromToday) {
    track("today_exercise", { exercise_id: seed });
  }
  offerShareSnapshot(snap);
}

function offerShareSnapshot(snap) {
  var offer;
  if (!snap || typeof deskShareOffer !== "function") {
    if (typeof clearShareHash === "function") {
      clearShareHash();
    }
    if (typeof showDeskNote === "function") {
      showDeskNote(t("share.bad"));
    }
    return;
  }
  offer = deskShareOffer(snap);
  if (offer.kind === "bad") {
    if (typeof clearShareHash === "function") {
      clearShareHash();
    }
    if (typeof showDeskNote === "function") {
      showDeskNote(t("share.bad"));
    }
    return;
  }
  if (offer.kind === "exact" && offer.exact) {
    finishShareSelect(offer.exact.id, "");
    return;
  }
  if (embedded) {
    shareOffer = snap;
    if (offer.kind === "changed") {
      confirmShareUpdate();
    } else {
      confirmShareAdd();
    }
    return;
  }
  showShareAsk(offer.kind, offer.full, snap);
}

function openTodayShare(seed) {
  if (typeof moreDaySnapshot !== "function") {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("share.bad"));
    }
    return;
  }
  moreDaySnapshot(seed, function (snap) {
    if (!snap) {
      if (typeof showDeskNote === "function") {
        showDeskNote(t("share.bad"));
      }
      return;
    }
    track("today_exercise", { exercise_id: seed });
    offerShareSnapshot(snap);
  });
}

function openTodayExercise() {
  var seed;
  var id;
  if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
    return;
  }
  seed = typeof exerciseOfDay === "function" ? exerciseOfDay() : "";
  if (!seed) {
    return;
  }
  if (typeof closeAbout === "function") {
    closeAbout();
  }
  closeExercisePanel();
  closeShareQuestion(false);
  if (typeof exercises !== "undefined" && exercises[seed]) {
    id = deskIdForToday(seed);
    if (id) {
      currentExerciseId = id;
      buildExerciseMenu();
      SelectExercise();
      track("today_exercise", { exercise_id: seed });
      return;
    }
    offerCatalogExercise(seed, true);
    return;
  }
  openTodayShare(seed);
}

function shareBlocksPlay() {
  return false;
}

function exerciseIdFromQuery(search) {
  var seed = exerciseSeedFromQuery(search);
  if (!seed || typeof exercises === "undefined" || !exercises[seed]) {
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
  var next;
  var flags = [];
  if (!window.history || typeof window.history.replaceState !== "function") {
    return;
  }
  next = window.location.pathname;
  if (embedded) {
    flags.push("embed=1");
  }
  if (queryFlag(window.location.search, "look") === "1" || document.documentElement.classList.contains("is-look")) {
    flags.push("look=1");
  }
  if (flags.length) {
    next += "?" + flags.join("&");
  }
  next += window.location.hash;
  try {
    window.history.replaceState(null, "", next);
  } catch (err) {}
}

var shareOffer = null;
var sharePreview = null;
var shareLooking = false;
var shareReturnId = "";

function shareBlocksHello() {
  var bar = document.getElementById("shareAsk");
  return !!(bar && !bar.hidden);
}

var helloStartTimer = null;

function scheduleHello() {
  if (embedded) {
    return;
  }
  if (helloStartTimer) {
    clearTimeout(helloStartTimer);
  }
  helloStartTimer = setTimeout(function () {
    helloStartTimer = null;
    if (typeof maybeHello === "function") {
      maybeHello();
    }
  }, 400);
}

function offerHelloAfterShare() {
  if (embedded) {
    return;
  }
  if (helloStartTimer) {
    clearTimeout(helloStartTimer);
    helloStartTimer = null;
  }
  if (typeof helloTouched !== "undefined") {
    helloTouched = false;
  }
  if (typeof maybeHello === "function") {
    maybeHello();
  }
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

function shareLookHolds() {
  var bar = document.getElementById("shareAsk");
  return !!(shareLooking && shareOffer && bar && !bar.hidden);
}

function holdShareTempo() {
  if (typeof paused !== "undefined" && !paused && currentBpm > 0) {
    if (typeof stopScheduler === "function") {
      stopScheduler();
    }
    paused = true;
    if (typeof setAudioSession === "function") {
      setAudioSession("auto");
    }
    if (typeof renderTempoToggle === "function") {
      renderTempoToggle();
    }
  }
}

function releaseShareTempo() {
  var btn = document.getElementById("tempoToggle");
  if (btn) {
    btn.disabled = false;
  }
}

function beginShareLook() {
  if (shareLooking) {
    return;
  }
  shareReturnId = typeof currentExerciseId === "string" ? currentExerciseId : "";
  shareLooking = true;
  holdShareTempo();
}

function endShareLook() {
  shareLooking = false;
  shareReturnId = "";
  releaseShareTempo();
}

function shareOfferItems(lines) {
  var items = [];
  var i;
  var item;
  var staff = !!(typeof shareOffer !== "undefined" && shareOffer && shareOffer.staff);
  if (!lines) {
    return items;
  }
  for (i = 0; i < lines.length && items.length < 500; i++) {
    item = typeof deskDisplayItem === "function" ? deskDisplayItem(lines[i], staff) : (typeof lineToItem === "function" ? lineToItem(lines[i]) : "");
    if (item) {
      items.push(item);
    }
  }
  return items;
}

function sameExerciseItems(a, b) {
  var i;
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  for (i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function shareOfferOnScreen() {
  var items;
  var bars;
  if (!shareOffer || typeof chromaticScale === "undefined" || typeof exerciseBars !== "number") {
    return false;
  }
  items = shareOfferItems(shareOffer.lines);
  bars = parseInt(shareOffer.bars, 10) || 1;
  return items.length > 0 && sameExerciseItems(chromaticScale, items) && exerciseBars === bars;
}

function paintShareOffer() {
  var items;
  var face;
  var bars;
  if (!shareOffer || typeof newExercise !== "function") {
    return;
  }
  items = shareOfferItems(shareOffer.lines);
  if (!items.length) {
    return;
  }
  face = document.getElementById("exerciseFace");
  if (face && typeof setComboLabel === "function") {
    setComboLabel(face, shareOffer.name || "");
  }
  if (shareOfferOnScreen()) {
    return;
  }
  bars = parseInt(shareOffer.bars, 10) || 1;
  if (typeof applyPracticeStaffDefaults === "function") {
    applyPracticeStaffDefaults(shareOffer);
  }
  newExercise(items, bars, !!shareOffer.staff);
  maybeOfferRecommendedMeter(shareOffer);
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
}

function closeShareQuestion(restore) {
  var back = shareReturnId;
  var was = shareLooking;
  if (!was && !shareOffer) {
    return;
  }
  endShareLook();
  clearShareHash();
  hideShareAsk();
  shareOffer = null;
  if (restore && was) {
    currentExerciseId = back;
    if (typeof buildExerciseMenu === "function") {
      buildExerciseMenu();
    }
    if (typeof SelectExercise === "function") {
      SelectExercise();
    }
  }
}

function showShareAsk(kind, full, snap) {
  beginShareLook();
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
  paintShareOffer();
}

function finishShareSelect(id, message) {
  var keep = shareLooking && shareOfferOnScreen();
  endShareLook();
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
  if (keep) {
    if (typeof rememberSetup === "function") {
      rememberSetup();
    }
  } else if (typeof SelectExercise === "function") {
    SelectExercise();
  }
  if (message && typeof showDeskNote === "function") {
    showDeskNote(message);
  }
}

function confirmShareAdd() {
  if (!shareOffer || typeof findDeskShare !== "function") {
    return false;
  }
  var found = findDeskShare(shareOffer);
  if (found.exact) {
    finishShareSelect(found.exact.id, "");
    offerHelloAfterShare();
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
  var created;
  if (shareOffer.seedId && typeof addCatalogExercise === "function") {
    created = addCatalogExercise(shareOffer.seedId);
  } else if (typeof createDeskExercise === "function") {
    created = createDeskExercise({
      name: shareOffer.name,
      bars: shareOffer.bars,
      staff: !!shareOffer.staff,
      lines: shareOffer.lines,
      shareId: shareOffer.shareId
    });
  } else {
    created = null;
  }
  if (!created) {
    var failed = document.getElementById("shareAskNote");
    if (failed) {
      failed.hidden = false;
      failed.textContent = t("edit.removeFirst");
    }
    return false;
  }
  finishShareSelect(created.id, t("edit.added"));
  offerHelloAfterShare();
  return true;
}

function confirmShareUpdate() {
  if (!shareOffer || typeof findDeskShare !== "function" || typeof updateDeskExercise !== "function") {
    return false;
  }
  var found = findDeskShare(shareOffer);
  if (found.exact) {
    finishShareSelect(found.exact.id, "");
    offerHelloAfterShare();
    return true;
  }
  if (!found.related) {
    return confirmShareAdd();
  }
  var saved = updateDeskExercise(found.related.id, {
    name: shareOffer.name,
    bars: shareOffer.bars,
    staff: !!shareOffer.staff,
    lines: shareOffer.lines
  });
  if (!saved) {
    return false;
  }
  finishShareSelect(saved.id, t("share.updated"));
  offerHelloAfterShare();
  return true;
}

function finishShareEdit() {
  sharePreview = null;
  endShareLook();
  clearShareHash();
  hideShareAsk();
  shareOffer = null;
}

function restoreShareAsk() {
  if (!shareOffer || typeof deskShareOffer !== "function") {
    return;
  }
  var offer = deskShareOffer(shareOffer);
  if (offer.kind === "exact" && offer.exact) {
    finishShareSelect(offer.exact.id, "");
    offerHelloAfterShare();
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
    return false;
  }
  var found = findDeskShare(shareOffer);
  if (found.exact) {
    finishShareSelect(found.exact.id, "");
    offerHelloAfterShare();
    return false;
  }
  sharePreview = { mode: found.related ? "changed" : "new", label: "" };
  hideShareAsk();
  editorOpenSharePreview({
    mode: found.related ? "edit" : "create",
    target: found.related,
    name: shareOffer.name,
    bars: shareOffer.bars,
    staff: !!shareOffer.staff,
    lines: shareOffer.lines
  });
  return true;
}

function dismissShareAsk() {
  if (typeof paused !== "undefined" && !paused && currentBpm > 0 && typeof toggleTempo === "function") {
    toggleTempo();
  }
  closeShareQuestion(true);
  offerHelloAfterShare();
}

function offerSharedExercise() {
  var hash = window.location.hash || "";
  var snap;
  if (typeof isShareHash !== "function" || !isShareHash(hash)) {
    return;
  }
  snap = typeof readShareHash === "function" ? readShareHash(hash) : null;
  if (!snap) {
    clearShareHash();
    if (typeof showDeskNote === "function") {
      showDeskNote(t("share.bad"));
    }
    return;
  }
  offerShareSnapshot(snap);
}

function openExerciseFromAddress() {
  var seed = exerciseSeedFromQuery(window.location.search);
  var fromToday = false;
  var id;
  if (queryFlag(window.location.search, "embed") === "1") {
    embedded = true;
  }
  if (!seed && queryFlag(window.location.search, "today") === "1") {
    seed = typeof exerciseOfDay === "function" ? exerciseOfDay() : "";
    fromToday = true;
  }
  if (!seed) {
    return;
  }
  if (typeof exercises !== "undefined" && exercises[seed]) {
    id = deskIdForToday(seed);
    if (!id) {
      id = exerciseIdFromQuery(window.location.search);
    }
    clearExerciseQuery();
    if (id) {
      currentExerciseId = id;
      openedExerciseFromAddress = true;
      if (fromToday) {
        track("today_exercise", { exercise_id: seed });
      }
      return;
    }
    offerCatalogExercise(seed, fromToday);
    return;
  }
  clearExerciseQuery();
  if (fromToday) {
    openTodayShare(seed);
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

function offerPassShare() {
  var skip = document.getElementById("helloSkip");
  var note;
  var row;
  if (skip && !skip.hidden) {
    return;
  }
  if (typeof shareLooking !== "undefined" && shareLooking) {
    return;
  }
  if (!currentExerciseId || passShareSeen[currentExerciseId]) {
    return;
  }
  row = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  note = document.getElementById("deskNote");
  if (!row || !note) {
    return;
  }
  passShareSeen[currentExerciseId] = true;
  track("pass_complete", { exercise_id: row.seedId || "custom" });
  if (typeof deskNoteTimer !== "undefined" && deskNoteTimer) {
    clearTimeout(deskNoteTimer);
    deskNoteTimer = null;
  }
  note.textContent = t("pass.share");
  note.hidden = false;
  note.setAttribute("data-pass-share", "1");
  deskNoteTimer = setTimeout(function () {
    note.hidden = true;
    note.removeAttribute("data-pass-share");
    deskNoteTimer = null;
  }, 8000);
}

function sendOpenExercise() {
  var row = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  var url;
  var name;
  if (!row) {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("contribute.none"));
    }
    return;
  }
  url = typeof exerciseShareUrl === "function" ? exerciseShareUrl(row) : "";
  name = typeof exerciseDisplayName === "function" ? exerciseDisplayName(row) : row.name;
  track("pass_share", { exercise_id: row.seedId || "custom" });
  if (url && navigator.share) {
    navigator.share({
      title: name || "eization",
      text: t("share.text"),
      url: url
    }).catch(function (error) {
      if (error && error.name === "AbortError") {
        return;
      }
    });
  }
  if (url && typeof copySupportText === "function") {
    copySupportText(url).then(function () {
      showDeskNote(t("share.copied"));
    }, function () {
      showDeskNote(t("share.fail"));
    });
    return;
  }
  if (typeof downloadExerciseFile === "function") {
    var file = downloadExerciseFile(row);
    if (file) {
      showDeskNote(tr("mail.exerciseSaved", { file: file }));
    }
  }
}

function openContributeFromAddress(wanted) {
  if (!wanted || embedded) {
    return;
  }
  if (typeof isShareHash === "function" && isShareHash(window.location.hash || "")) {
    return;
  }
  clearExerciseQuery();
  if (typeof openAbout === "function") {
    openAbout();
  }
  if (typeof openAboutPage === "function") {
    openAboutPage("contribute");
  }
}

function openCoffeeFromAddress(wanted) {
  var button;
  if (!wanted || embedded) {
    return;
  }
  if (typeof isShareHash === "function" && isShareHash(window.location.hash || "")) {
    return;
  }
  clearExerciseQuery();
  if (typeof openAbout !== "function" || typeof openAboutPage !== "function") {
    return;
  }
  openAbout();
  openAboutPage("author");
  button = document.getElementById("supportReveal");
  if (button) {
    button.scrollIntoView({ block: "center" });
    button.focus();
  }
}

function openOfferFromAddress(wanted) {
  var button;
  if (!wanted || embedded) {
    return;
  }
  if (typeof isShareHash === "function" && isShareHash(window.location.hash || "")) {
    return;
  }
  if (typeof openAbout !== "function" || typeof openAboutPage !== "function" || typeof armStudioOffer !== "function") {
    return;
  }
  openAbout();
  openAboutPage("author");
  armStudioOffer();
  button = document.getElementById("shareFeedback");
  if (button) {
    button.scrollIntoView({ block: "center" });
    button.focus();
  }
}

function applyLook() {
  var mark;
  var word;
  var lockup;
  if (queryFlag(window.location.search, "look") !== "1") {
    return;
  }
  document.documentElement.classList.add("is-look");
  document.body.classList.add("is-look");
  mark = '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3"/><text x="32" y="41" text-anchor="middle" font-size="26" font-weight="600" fill="currentColor">W</text>';
  var brand = document.querySelector("#brand .brand-mark");
  if (brand) {
    brand.innerHTML = mark;
  }
  var about = document.querySelector("#aboutLockup .about-mark");
  if (about) {
    about.innerHTML = mark;
  }
  word = document.querySelector("#brand .brand-word");
  if (word) {
    word.textContent = "Wednesday Room";
  }
  lockup = document.querySelector("#aboutLockup span");
  if (lockup) {
    lockup.textContent = "Wednesday Room";
  }
}

function init() {
  var wantContribute = queryFlag(window.location.search, "contribute") === "1";
  var wantOffer = queryFlag(window.location.search, "offer") === "1";
  var wantCoffee = queryFlag(window.location.search, "coffee") === "1";
  applyLook();
  if (queryFlag(window.location.search, "embed") === "1") {
    embedded = true;
  }
  if (typeof applyDesk === "function") {
    applyDesk();
  }
  if (typeof isShareHash === "function" && isShareHash(window.location.hash || "")) {
    clearExerciseQuery();
  } else {
    openExerciseFromAddress();
  }
  openContributeFromAddress(wantContribute);
  openOfferFromAddress(wantOffer);
  openCoffeeFromAddress(wantCoffee);
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
    if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
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
  document.getElementById("sheetToggle").addEventListener("click", function () {
    setScoreSheet(this.getAttribute("aria-pressed") !== "true");
  });
  document.getElementById("replayIntro").addEventListener("click", function () {
    replayIntro();
  });
  document.getElementById("restoreDefaults").addEventListener("click", function () {
    if (!this.classList.contains("is-armed")) {
      if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
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
  document.getElementById("tempoToggle").addEventListener("click", function () {
    var starting;
    var params;
    var secs;
    if (typeof editorIsOpen === "function" && editorIsOpen()) {
      return;
    }
    starting = paused || !(currentBpm > 0);
    toggleTempo();
    params = { exercise_id: analyticsExerciseId() };
    if (starting) {
      tempoSessionStarted = Date.now();
      params.bpm = typeof currentBpm === "number" ? currentBpm : 0;
      track("tempo_start", params);
      return;
    }
    secs = tempoSessionStarted ? Math.round((Date.now() - tempoSessionStarted) / 1000) : 0;
    tempoSessionStarted = 0;
    params.duration_s = secs;
    params.bpm = typeof tempoHeld === "number" ? tempoHeld : (typeof currentBpm === "number" ? currentBpm : 0);
    track("tempo_stop", params);
    track("tempo_session", params);
  });
  var deskNote = document.getElementById("deskNote");
  if (deskNote) {
    deskNote.addEventListener("click", function () {
      if (!deskNote.getAttribute("data-pass-share")) {
        return;
      }
      deskNote.removeAttribute("data-pass-share");
      sendOpenExercise();
    });
  }
  document.getElementById("resetExercise").addEventListener("click", function () {
    resetExercise();
    track("reset_exercise", { exercise_id: analyticsExerciseId() });
  });
  document.getElementById("divnote").addEventListener("pointerdown", function () {
    closeGroovePanel();
    closeExercisePanel();
  });
  document.getElementById("next").addEventListener("click", function () {
    closeGroovePanel();
    closeExercisePanel();
    trackNextExample();
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
    if (shareBlocksHello()) {
      event.preventDefault();
      dismissShareAsk();
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
    shareAdd.addEventListener("click", function () {
      if (confirmShareAdd()) {
        track("share_add");
      }
    });
  }
  if (shareUpdate) {
    shareUpdate.addEventListener("click", function () {
      if (confirmShareUpdate()) {
        track("share_update");
      }
    });
  }
  if (shareAddNew) {
    shareAddNew.addEventListener("click", function () {
      if (confirmShareAdd()) {
        track("share_add_new");
      }
    });
  }
  if (sharePreviewButton) {
    sharePreviewButton.addEventListener("click", function () {
      if (previewShareExercise()) {
        track("share_preview");
      }
    });
  }
  if (shareNotNow) {
    shareNotNow.addEventListener("click", function () {
      dismissShareAsk();
      track("share_dismiss");
    });
  }
  offerSharedExercise();
  window.addEventListener("hashchange", offerSharedExercise);
  startMetronome();
  layoutFrame();
  deskReady = true;
  if (typeof watchForeignDesk === "function") {
    watchForeignDesk();
  }
  if (openedExerciseFromAddress && typeof rememberSetup === "function") {
    rememberSetup();
  }
  if (typeof maybeHello === "function") {
    scheduleHello();
  }
}

init();
