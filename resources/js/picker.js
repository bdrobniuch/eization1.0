var chromaticScale = [];
var notePool = [];
var countexercise = 0;
var countnotes = 0;
var exerciseBars = 1;
var exerciseFontPx = 48;
var lookAhead = true;
var nextCycle = null;
var previousNote = "";
var currentNoteSource = "";
var cycleGap = false;
var STAFF_FACE_VH = 0.28;
var STAFF_REEL_VH = 0.12;
var reelColumnHalf = 0;
var reelMaxWidth = 0;
var reelMaxHeight = 0;
var reelMaxHtml = "";
var reelTurning = false;
var reelTurnToken = 0;
var REEL_TILT = 62 * Math.PI / 180;
var scoreSheet = false;
var sheetReady = false;
var sheetMoving = false;
var sheetToken = 0;
var sheetFontPx = 48;
var sheetRowPx = 0;

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

function pickANote() {
  if (!chromaticScale || chromaticScale.length === 0) {
    return "";
  }
  if (notePool.length === 0) {
    if (nextCycle && nextCycle.length) {
      notePool = nextCycle;
      nextCycle = null;
    } else {
      notePool = chromaticScale.slice();
      shuffleArray(notePool);
    }
    countexercise++;
  }
  return notePool.pop();
}

function peekNextItem() {
  if (notePool.length) {
    return notePool[notePool.length - 1];
  }
  if (cycleGap && nextCycle && nextCycle.length) {
    return nextCycle[nextCycle.length - 1];
  }
  return "";
}

function prepareNextCycle() {
  if (nextCycle && nextCycle.length) {
    return;
  }
  if (!chromaticScale || !chromaticScale.length) {
    nextCycle = [];
    return;
  }
  nextCycle = chromaticScale.slice();
  shuffleArray(nextCycle);
}

function reelOuterReach(sizePx) {
  return sizePx * 1.05 * Math.cos(REEL_TILT) + sizePx * 0.2;
}

function staffFaceHeight(role) {
  var vh = role === "reel" ? STAFF_REEL_VH : STAFF_FACE_VH;
  return Math.max(48, Math.round(window.innerHeight * vh));
}

function fillExampleFace(el, source, role) {
  if (!el) {
    return;
  }
  el.innerHTML = "";
  el.style.fontSize = "";
  if (!source) {
    el.classList.remove("is-staff");
    return;
  }
  var parts =
    typeof staffExampleParts === "function"
      ? staffExampleParts(source)
      : { music: source, caption: "" };
  var music = parts.music || source;
  if (typeof isMusicNotation === "function" && isMusicNotation(source)) {
    el.classList.add("is-staff");
    var staffRole = "current";
    if (role === "reel" || (role === "sheet" && lookAhead)) {
      staffRole = "reel";
    }
    var svg =
      typeof renderMusicStaff === "function"
        ? renderMusicStaff(music, staffRole)
        : null;
    if (svg) {
      var wrap = document.createElement("span");
      wrap.className = "prog-changes";
      wrap.appendChild(svg);
      el.appendChild(wrap);
    }
    if (parts.caption) {
      var capEl = document.createElement("span");
      capEl.className = "prog-name";
      capEl.textContent = parts.caption;
      el.appendChild(capEl);
    }
    return;
  }
  el.classList.remove("is-staff");
  el.innerHTML = source;
  var size = exerciseFontPx;
  if (role === "sheet") {
    size = sheetFontPx || exerciseFontPx;
  } else if (role === "reel") {
    var cap = Math.round(window.innerHeight * STAFF_REEL_VH);
    if (size > cap) {
      size = cap;
    }
    if (size < 14) {
      size = 14;
    }
  }
  el.style.fontSize = size + "px";
}

function refreshStaffFaces() {
  var note = document.getElementById("note");
  if (note && note.classList.contains("is-staff") && currentNoteSource) {
    fillExampleFace(note, currentNoteSource, "current");
  }
  if (typeof renderPreview === "function") {
    renderPreview();
  }
}

function motionReduced() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function sheetApplies() {
  if (!scoreSheet) {
    return false;
  }
  var textDiv = document.getElementById("textdiv");
  if (textDiv && textDiv.classList.contains("is-open")) {
    return false;
  }
  return true;
}

function sheetGap() {
  var box = noteBox();
  var header = document.getElementById("linediv");
  var top = header ? Math.round(header.getBoundingClientRect().bottom + 10) : 10;
  return {
    top: top,
    height: Math.max(72, Math.floor(box.height))
  };
}

function sheetFontSize(rowH) {
  var pageW = Math.min(window.innerWidth * 0.92, 736) - 36;
  if (pageW < 80) {
    pageW = 80;
  }
  var size = exerciseFontPx || 48;
  var heightCap = Math.floor((rowH || 48) * 0.42);
  if (heightCap < 16) {
    heightCap = 16;
  }
  if (size > heightCap) {
    size = heightCap;
  }
  if (size < 16) {
    size = 16;
  }
  var measure = document.getElementById("noteMeasure");
  if (!measure) {
    return size;
  }
  var samples = [];
  if (currentNoteSource && !(typeof isMusicNotation === "function" && isMusicNotation(currentNoteSource))) {
    samples.push(currentNoteSource);
  }
  if (lookAhead) {
    var upcoming = peekNextItem();
    if (upcoming && !(typeof isMusicNotation === "function" && isMusicNotation(upcoming))) {
      samples.push(upcoming);
    }
    if (previousNote && !(typeof isMusicNotation === "function" && isMusicNotation(previousNote))) {
      samples.push(previousNote);
    }
  }
  var guard = 0;
  while (guard < 20 && size > 16 && samples.length) {
    measure.style.fontSize = size + "px";
    var fits = true;
    var s;
    for (s = 0; s < samples.length; s++) {
      measure.innerHTML = samples[s];
      if (measure.scrollWidth > pageW) {
        fits = false;
        break;
      }
    }
    if (fits) {
      break;
    }
    size = Math.max(16, Math.floor(size * 0.9));
    guard++;
  }
  return size;
}

function parkReelFace(el) {
  var stack = document.getElementById("noteStack");
  if (!el || !stack) {
    return;
  }
  if (el.parentNode !== stack) {
    stack.appendChild(el);
  }
  el.hidden = true;
  el.setAttribute("aria-hidden", "true");
  el.classList.remove("score-row", "is-staff");
  el.style.height = "";
  el.style.fontSize = "";
  el.innerHTML = "";
}

function dropStraySheetRows() {
  var sheet = document.getElementById("scoreSheet");
  var note = document.getElementById("note");
  var nextEl = document.getElementById("noteNext");
  var prevEl = document.getElementById("notePrev");
  if (!sheet) {
    return;
  }
  var kids = sheet.children;
  var i;
  for (i = kids.length - 1; i >= 0; i--) {
    var kid = kids[i];
    if (kid !== note && kid !== nextEl && kid !== prevEl) {
      kid.remove();
    }
  }
}

function unmountSheet() {
  var stack = document.getElementById("noteStack");
  var windowEl = document.getElementById("scoreWindow");
  var sheet = document.getElementById("scoreSheet");
  var note = document.getElementById("note");
  var nextEl = document.getElementById("noteNext");
  var prevEl = document.getElementById("notePrev");
  if (!stack || !note) {
    return;
  }
  var was = stack.classList.contains("sheet-on");
  var noteInSheet = !!(sheet && note.parentNode === sheet);
  if (!was && !noteInSheet) {
    return;
  }
  dropStraySheetRows();
  if (nextEl) {
    nextEl.classList.remove("score-row");
    nextEl.style.height = "";
    stack.appendChild(nextEl);
  }
  note.classList.remove("score-row");
  note.style.height = "";
  stack.appendChild(note);
  if (prevEl) {
    prevEl.classList.remove("score-row");
    prevEl.style.height = "";
    stack.appendChild(prevEl);
  }
  if (sheet) {
    sheet.style.transition = "none";
    sheet.style.transform = "none";
  }
  if (windowEl) {
    windowEl.hidden = true;
    windowEl.style.height = "";
  }
  stack.classList.remove("sheet-on");
  stack.style.top = "";
  if (was && !note.classList.contains("is-staff")) {
    note.style.fontSize = exerciseFontPx ? exerciseFontPx + "px" : "";
  }
}

function mountSheet() {
  var stack = document.getElementById("noteStack");
  var windowEl = document.getElementById("scoreWindow");
  var sheet = document.getElementById("scoreSheet");
  var note = document.getElementById("note");
  var nextEl = document.getElementById("noteNext");
  var prevEl = document.getElementById("notePrev");
  if (!stack || !windowEl || !sheet || !note || !nextEl || !prevEl) {
    return;
  }
  dropStraySheetRows();
  stack.classList.add("sheet-on");
  stack.classList.remove("reel-on", "is-turning");
  windowEl.hidden = false;
  var mark = document.getElementById("reelMark");
  if (mark) {
    mark.hidden = true;
  }
  sheet.style.transition = "none";
  sheet.style.transform = "none";
  var gap = sheetGap();
  var rowCount = lookAhead ? 3 : 1;
  var rowH = Math.max(36, Math.floor(gap.height / rowCount));
  var paperH = rowH * rowCount;
  if (paperH > gap.height) {
    rowH = Math.floor(gap.height / rowCount);
    paperH = rowH * rowCount;
  }
  sheetFontPx = sheetFontSize(rowH);
  sheetRowPx = rowH;
  var rows;
  if (lookAhead) {
    sheet.appendChild(nextEl);
    sheet.appendChild(note);
    sheet.appendChild(prevEl);
    nextEl.hidden = false;
    prevEl.hidden = false;
    nextEl.setAttribute("aria-hidden", "true");
    prevEl.setAttribute("aria-hidden", "true");
    nextEl.classList.add("score-row");
    prevEl.classList.add("score-row");
    note.classList.add("score-row");
    fillExampleFace(nextEl, peekNextItem() || "", "sheet");
    fillExampleFace(note, currentNoteSource || "", "sheet");
    fillExampleFace(prevEl, previousNote || "", "sheet");
    rows = [nextEl, note, prevEl];
  } else {
    sheet.appendChild(note);
    note.classList.add("score-row");
    fillExampleFace(note, currentNoteSource || "", "sheet");
    parkReelFace(nextEl);
    parkReelFace(prevEl);
    rows = [note];
  }
  var r;
  for (r = 0; r < rows.length; r++) {
    rows[r].style.fontSize = rows[r].classList.contains("is-staff") ? "" : sheetFontPx + "px";
    rows[r].style.height = rowH + "px";
  }
  var top = gap.top + Math.max(0, Math.round((gap.height - paperH) / 2));
  stack.style.top = top + "px";
  windowEl.style.height = paperH + "px";
}

function cancelSheetSlide() {
  sheetToken++;
  sheetMoving = false;
  var sheet = document.getElementById("scoreSheet");
  if (!sheet) {
    return;
  }
  sheet.style.transition = "none";
  sheet.style.transform = "none";
}

function beginSheetSlide() {
  var sheet = document.getElementById("scoreSheet");
  var note = document.getElementById("note");
  if (!sheet || !note || note.parentNode !== sheet) {
    fillExampleFace(note, currentNoteSource, "current");
    renderPreview();
    return;
  }
  var rowH = sheetRowPx || note.offsetHeight || Math.round((sheetFontPx || 48) * 1.35);
  if (rowH < 1) {
    fillExampleFace(note, currentNoteSource, "current");
    renderPreview();
    return;
  }
  var incoming = document.createElement("p");
  incoming.className = "score-row";
  incoming.setAttribute("aria-hidden", "true");
  var incomingSource = lookAhead ? (peekNextItem() || "") : (currentNoteSource || "");
  fillExampleFace(incoming, incomingSource, "sheet");
  incoming.style.fontSize = incoming.classList.contains("is-staff") ? "" : sheetFontPx + "px";
  incoming.style.height = rowH + "px";
  sheet.insertBefore(incoming, sheet.firstChild);
  sheet.style.transition = "none";
  sheet.style.transform = "translateY(" + (-rowH) + "px)";
  void sheet.offsetWidth;
  var token = ++sheetToken;
  sheetMoving = true;
  var finished = false;
  function finish(event) {
    if (finished || token !== sheetToken) {
      return;
    }
    if (event && event.target !== sheet) {
      return;
    }
    if (event && event.propertyName && event.propertyName !== "transform") {
      return;
    }
    finished = true;
    sheet.removeEventListener("transitionend", finish);
    clearTimeout(timer);
    if (incoming.parentNode) {
      incoming.remove();
    }
    sheetMoving = false;
    var live = document.getElementById("note");
    if (live) {
      fillExampleFace(live, currentNoteSource, "current");
    }
    renderPreview();
  }
  sheet.addEventListener("transitionend", finish);
  var timer = setTimeout(function () {
    finish();
  }, 450);
  sheet.style.transition = "transform 0.32s ease-out";
  sheet.style.transform = "translateY(0px)";
}

function renderPreview() {
  if (sheetMoving) {
    var editingNow = document.getElementById("textdiv");
    if (!(editingNow && editingNow.classList.contains("is-open"))) {
      return;
    }
    cancelSheetSlide();
  }
  if (sheetApplies()) {
    mountSheet();
    sheetReady = true;
    return;
  }
  unmountSheet();
  sheetReady = false;
  var nextEl = document.getElementById("noteNext");
  var prevEl = document.getElementById("notePrev");
  var stack = document.getElementById("noteStack");
  if (!nextEl || !prevEl) {
    return;
  }
  var textDiv = document.getElementById("textdiv");
  var editing = textDiv && textDiv.classList.contains("is-open");
  var showReel = lookAhead && !editing;
  if (stack) {
    stack.classList.toggle("reel-on", showReel);
  }
  var mark = document.getElementById("reelMark");
  if (!showReel) {
    nextEl.hidden = true;
    prevEl.hidden = true;
    nextEl.innerHTML = "";
    prevEl.innerHTML = "";
    nextEl.classList.remove("is-staff");
    prevEl.classList.remove("is-staff");
    if (mark) {
      mark.hidden = true;
    }
    return;
  }
  var nextText = peekNextItem();
  nextEl.hidden = !nextText;
  fillExampleFace(nextEl, nextText || "", "reel");
  prevEl.hidden = !previousNote;
  fillExampleFace(prevEl, previousNote || "", "reel");
  var size = exerciseFontPx;
  var cap = Math.round(window.innerHeight * STAFF_REEL_VH);
  if (size > cap) {
    size = cap;
  }
  if (size < 14) {
    size = 14;
  }
  if (!nextEl.classList.contains("is-staff")) {
    nextEl.style.fontSize = size + "px";
  }
  if (!prevEl.classList.contains("is-staff")) {
    prevEl.style.fontSize = size + "px";
  }
  var resumeTurn = false;
  if (stack && reelTurning && stack.classList.contains("is-turning")) {
    stack.classList.remove("is-turning");
    void stack.offsetWidth;
    resumeTurn = true;
  }
  var headerBottom = document.getElementById("linediv").getBoundingClientRect().bottom + 6;
  var exercisePanel = document.getElementById("exercisePanel");
  if (exercisePanel && !exercisePanel.hidden) {
    headerBottom = Math.max(headerBottom, exercisePanel.getBoundingClientRect().bottom + 6);
  }
  var footer = document.querySelector("footer");
  var footerTop = footer ? footer.getBoundingClientRect().top - 6 : window.innerHeight - 6;
  var note = document.getElementById("note");
  var staffReach = staffFaceHeight("reel");
  var guard = 0;
  while (guard < 6 && size > 14 && note) {
    var nr = note.getBoundingClientRect();
    var mid = nr.top + nr.height / 2;
    var textReach = reelOuterReach(size) + exerciseFontPx * 0.65;
    var reach = Math.max(textReach, reelOuterReach(staffReach));
    if (mid - reach >= headerBottom && mid + reach <= footerTop) {
      break;
    }
    size = Math.max(14, Math.floor(size * 0.9));
    if (!nextEl.classList.contains("is-staff")) {
      nextEl.style.fontSize = size + "px";
    }
    if (!prevEl.classList.contains("is-staff")) {
      prevEl.style.fontSize = size + "px";
    }
    guard++;
  }
  placeReelMark();
  if (resumeTurn && stack) {
    void stack.offsetWidth;
    stack.classList.add("is-turning");
  }
}

function placeReelMark() {
  var mark = document.getElementById("reelMark");
  var stack = document.getElementById("noteStack");
  var note = document.getElementById("note");
  if (!mark || !stack || !note) {
    return;
  }
  if (stack.classList.contains("is-turning")) {
    stack.classList.remove("is-turning");
    void stack.offsetWidth;
  }
  var probe = reelMaxHtml || note.innerHTML || "\u00a0";
  var maxW = reelMaxWidth || note.offsetWidth;
  var maxH = reelMaxHeight || note.offsetHeight;
  var savedMinH = note.style.minHeight;
  var savedMinW = note.style.minWidth;
  note.style.minHeight = maxH + "px";
  note.style.minWidth = maxW + "px";
  var faces = [document.getElementById("noteNext"), document.getElementById("notePrev")];
  var saved = [];
  var i;
  for (i = 0; i < faces.length; i++) {
    var face = faces[i];
    if (!face) {
      saved.push(null);
      continue;
    }
    saved.push({ html: face.innerHTML, hidden: face.hidden });
    face.hidden = false;
    face.innerHTML = probe;
  }
  var noteBox = note.getBoundingClientRect();
  var top = noteBox.top;
  var bottom = noteBox.bottom;
  var leftEdge = noteBox.left;
  for (i = 0; i < faces.length; i++) {
    face = faces[i];
    if (!face) {
      continue;
    }
    var faceBox = face.getBoundingClientRect();
    if (faceBox.top < top) {
      top = faceBox.top;
    }
    if (faceBox.bottom > bottom) {
      bottom = faceBox.bottom;
    }
    if (faceBox.left < leftEdge) {
      leftEdge = faceBox.left;
    }
  }
  for (i = 0; i < faces.length; i++) {
    face = faces[i];
    if (!face || !saved[i]) {
      continue;
    }
    face.innerHTML = saved[i].html;
    face.hidden = saved[i].hidden;
  }
  note.style.minHeight = savedMinH;
  note.style.minWidth = savedMinW;
  var stackBox = stack.getBoundingClientRect();
  var width = 22;
  var gap = 14;
  var left = leftEdge - gap - width;
  if (left < 4 && 4 + width <= leftEdge - 6) {
    left = 4;
  }
  mark.hidden = false;
  mark.style.top = Math.round(top - stackBox.top) + "px";
  mark.style.height = Math.max(width, Math.round(bottom - top)) + "px";
  mark.style.left = Math.round(left - stackBox.left) + "px";
}

function setLookAhead(on) {
  lookAhead = !!on;
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
  var btn = document.getElementById("lookAhead");
  if (btn) {
    btn.setAttribute("aria-pressed", lookAhead ? "true" : "false");
  }
  if (sheetMoving) {
    cancelSheetSlide();
  }
  renderPreview();
}

function setScoreSheet(on) {
  scoreSheet = !!on;
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
  var btn = document.getElementById("sheetToggle");
  if (btn) {
    btn.setAttribute("aria-pressed", scoreSheet ? "true" : "false");
  }
  if (sheetMoving) {
    cancelSheetSlide();
  }
  renderPreview();
}

function updateRemaining() {
  var el = document.getElementById("counter");
  if (!el) {
    return;
  }
  var total = chromaticScale ? chromaticScale.length : 0;
  var left = cycleGap ? total : notePool.length;
  el.textContent = tr(left === 1 ? "count.one" : "count.many", { n: left });
}

function showCurrentNote(text) {
  var note = document.getElementById("note");
  if (!note) {
    return;
  }
  var interrupted = sheetMoving;
  if (interrupted) {
    cancelSheetSlide();
  }
  currentNoteSource = text || "";
  updateRemaining();
  var animate = !interrupted && sheetReady && !motionReduced() && sheetApplies();
  if (animate) {
    beginSheetSlide();
    return;
  }
  fillExampleFace(note, currentNoteSource, "current");
  renderPreview();
  if (!sheetApplies()) {
    turnReel();
  }
}

function turnReel() {
  var stack = document.getElementById("noteStack");
  if (!stack) {
    return;
  }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  stack.classList.remove("is-turning");
  void stack.offsetWidth;
  stack.classList.add("is-turning");
  reelTurning = true;
  var turn = ++reelTurnToken;
  setTimeout(function () {
    if (turn !== reelTurnToken) {
      return;
    }
    reelTurning = false;
  }, 320);
}

function advanceNote() {
  if (cycleGap) {
    cycleGap = false;
    previousNote = "";
    var first = pickANote();
    countnotes++;
    showCurrentNote(first);
    return;
  }
  var openingCycle = notePool.length === 0;
  if (openingCycle && countnotes > 0) {
    previousNote = currentNoteSource || "";
    prepareNextCycle();
    cycleGap = true;
    showCurrentNote("");
    return;
  }
  if (countnotes > 0) {
    previousNote = currentNoteSource || "";
  } else {
    previousNote = "";
  }
  var text = pickANote();
  countnotes++;
  showCurrentNote(text);
}

function noteBox() {
  var header = document.getElementById("linediv");
  var footer = document.querySelector("footer");
  var topEl = header;
  var minTop = topEl ? topEl.getBoundingClientRect().bottom + 12 : 12;
  var exercisePanel = document.getElementById("exercisePanel");
  if (exercisePanel && !exercisePanel.hidden) {
    minTop = Math.max(minTop, exercisePanel.getBoundingClientRect().bottom + 12);
  }
  var maxBottom = footer ? footer.getBoundingClientRect().top - 12 : window.innerHeight - 12;
  var width = window.innerWidth * 0.9;
  var side = 40;
  if ((window.innerWidth - width) / 2 < side) {
    width = window.innerWidth - side * 2;
  }
  return {
    width: Math.max(80, width),
    height: Math.max(48, maxBottom - minTop)
  };
}

function chooseExerciseFont() {
  var measure = document.getElementById("noteMeasure");
  var note = document.getElementById("note");
  var items = chromaticScale || [];
  if (!measure || !note || !items.length) {
    return;
  }
  var ranked = [];
  var textItems = [];
  for (var i = 0; i < items.length; i++) {
    if (typeof isMusicNotation === "function" && isMusicNotation(items[i])) {
      continue;
    }
    textItems.push(items[i]);
    var plain = items[i].replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, "x");
    ranked.push({ html: items[i], n: plain.length });
  }
  ranked.sort(function (a, b) { return b.n - a.n; });
  var sample = ranked.slice(0, 16);
  var box = noteBox();
  if (!sample.length) {
    exerciseFontPx = Math.min(48, Math.floor(box.height * 0.2));
    note.style.fontSize = "";
    reelMaxWidth = Math.round(window.innerWidth * 0.7);
    reelMaxHeight = staffFaceHeight("current");
    reelMaxHtml = "";
    reelColumnHalf = reelMaxWidth / 2;
    renderPreview();
    return;
  }
  var probe = 100;
  measure.style.fontSize = probe + "px";
  var maxW = 1;
  var maxH = 1;
  for (var j = 0; j < sample.length; j++) {
    measure.innerHTML = sample[j].html;
    if (measure.scrollWidth > maxW) {
      maxW = measure.scrollWidth;
    }
    if (measure.offsetHeight > maxH) {
      maxH = measure.offsetHeight;
    }
  }
  var cap = Math.min(window.innerWidth * 0.34, box.height * 0.48);
  var size = probe * Math.min(box.width / maxW, box.height / maxH);
  if (size > cap) {
    size = cap;
  }
  var guard = 0;
  while (guard < 24) {
    measure.style.fontSize = Math.floor(size) + "px";
    var fits = true;
    for (var k = 0; k < sample.length; k++) {
      measure.innerHTML = sample[k].html;
      if (measure.scrollWidth > box.width || measure.offsetHeight > box.height) {
        fits = false;
        break;
      }
    }
    if (fits || size <= 11) {
      break;
    }
    size *= 0.9;
    guard++;
  }
  exerciseFontPx = Math.floor(size);
  if (!note.classList.contains("is-staff")) {
    note.style.fontSize = exerciseFontPx + "px";
  }
  measure.style.fontSize = exerciseFontPx + "px";
  reelMaxWidth = 0;
  reelMaxHeight = 0;
  reelMaxHtml = textItems[0] || "";
  measure.style.minHeight = "1.25em";
  for (var w = 0; w < textItems.length; w++) {
    measure.innerHTML = textItems[w];
    if (measure.scrollWidth > reelMaxWidth) {
      reelMaxWidth = measure.scrollWidth;
    }
    if (measure.offsetHeight > reelMaxHeight) {
      reelMaxHeight = measure.offsetHeight;
      reelMaxHtml = textItems[w];
    }
  }
  var staffH = staffFaceHeight("current");
  if (staffH > reelMaxHeight) {
    reelMaxHeight = staffH;
  }
  var staffW = Math.round(window.innerWidth * 0.72);
  if (staffW > reelMaxWidth) {
    reelMaxWidth = staffW;
  }
  measure.style.minHeight = "";
  reelColumnHalf = reelMaxWidth / 2;
  renderPreview();
}

function newExercise(items, bars) {
  chromaticScale = items || [];
  countexercise = 0;
  countnotes = 0;
  notePool = [];
  nextCycle = null;
  previousNote = "";
  currentNoteSource = "";
  cycleGap = false;
  if (bars) {
    exerciseBars = parseInt(bars, 10) || 1;
  }
  if (typeof editorCloseQuiet === "function") {
    editorCloseQuiet();
  }
  chooseExerciseFont();
  sheetReady = false;
  advanceNote();
  if (typeof metronomeAlignToDownbeat === "function") {
    metronomeAlignToDownbeat();
  }
}

function resetExercise() {
  if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
    return;
  }
  newExercise(chromaticScale.slice(), exerciseBars);
}
