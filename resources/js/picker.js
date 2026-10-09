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
  if (typeof isMusicNotation === "function" && isMusicNotation(source)) {
    el.classList.add("is-staff");
    var svg = typeof renderMusicStaff === "function" ? renderMusicStaff(source, role === "reel" ? "reel" : "current") : null;
    if (svg) {
      el.appendChild(svg);
    }
    return;
  }
  el.classList.remove("is-staff");
  el.innerHTML = source;
  var size = exerciseFontPx;
  if (role === "reel") {
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

function renderPreview() {
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
  currentNoteSource = text || "";
  fillExampleFace(note, currentNoteSource, "current");
  updateRemaining();
  renderPreview();
  turnReel();
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
  advanceNote();
  if (typeof metronomeAlignToDownbeat === "function") {
    metronomeAlignToDownbeat();
  }
}

function resetExercise() {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    if (typeof editorNotice === "function") {
      editorNotice(t("edit.finish"));
    }
    return;
  }
  newExercise(chromaticScale.slice(), exerciseBars);
}
