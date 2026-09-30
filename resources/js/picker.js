var chromaticScale = [];
var notePool = [];
var countexercise = 0;
var countnotes = 0;
var exerciseBars = 1;
var exerciseFontPx = 48;
var lookAhead = true;
var nextCycle = null;
var previousNote = "";
var cycleGap = false;
var reelColumnHalf = 0;
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

function renderPreview() {
  var nextEl = document.getElementById("noteNext");
  var prevEl = document.getElementById("notePrev");
  var stack = document.getElementById("noteStack");
  if (!nextEl || !prevEl) {
    return;
  }
  var editing = document.getElementById("textdiv").style.display === "block";
  var showReel = lookAhead && !editing;
  if (stack) {
    stack.classList.toggle("reel-on", showReel);
  }
  var mark = document.getElementById("reelMark");
  if (!showReel) {
    nextEl.hidden = true;
    prevEl.hidden = true;
    if (mark) {
      mark.hidden = true;
    }
    return;
  }
  var nextText = peekNextItem();
  nextEl.hidden = !nextText;
  nextEl.innerHTML = nextText || "";
  prevEl.hidden = !previousNote;
  prevEl.innerHTML = previousNote || "";
  var size = exerciseFontPx;
  var cap = Math.round(window.innerHeight * 0.12);
  if (size > cap) {
    size = cap;
  }
  if (size < 14) {
    size = 14;
  }
  nextEl.style.fontSize = size + "px";
  prevEl.style.fontSize = size + "px";
  var headerBottom = document.getElementById("linediv").getBoundingClientRect().bottom + 6;
  var exercisePanel = document.getElementById("exercisePanel");
  if (exercisePanel && !exercisePanel.hidden) {
    headerBottom = Math.max(headerBottom, exercisePanel.getBoundingClientRect().bottom + 6);
  }
  var footer = document.querySelector("footer");
  var footerTop = footer ? footer.getBoundingClientRect().top - 6 : window.innerHeight - 6;
  var note = document.getElementById("note");
  var guard = 0;
  while (guard < 6 && size > 14 && note) {
    var nr = note.getBoundingClientRect();
    var mid = nr.top + nr.height / 2;
    var reach = reelOuterReach(size) + exerciseFontPx * 0.65;
    if (mid - reach >= headerBottom && mid + reach <= footerTop) {
      break;
    }
    size = Math.max(14, Math.floor(size * 0.9));
    nextEl.style.fontSize = size + "px";
    prevEl.style.fontSize = size + "px";
    guard++;
  }
  placeReelMark();
}

function placeReelMark() {
  var mark = document.getElementById("reelMark");
  var stack = document.getElementById("noteStack");
  var note = document.getElementById("note");
  var nextEl = document.getElementById("noteNext");
  if (!mark || !stack || !note || !nextEl) {
    return;
  }
  var facePx = parseFloat(nextEl.style.fontSize);
  if (!facePx) {
    facePx = 14;
  }
  var nr = note.getBoundingClientRect();
  var sr = stack.getBoundingClientRect();
  var mid = nr.top + nr.height / 2;
  var reach = reelOuterReach(facePx) + exerciseFontPx * 0.65;
  var pad = 12;
  var top = mid - reach - pad;
  var height = reach * 2 + pad * 2;
  var half = reelColumnHalf > 0 ? reelColumnHalf : nr.width / 2;
  var left = Math.max(8, window.innerWidth / 2 - half - 36);
  mark.hidden = false;
  mark.style.top = (top - sr.top) + "px";
  mark.style.height = height + "px";
  mark.style.left = (left - sr.left) + "px";
}

function setLookAhead(on) {
  lookAhead = !!on;
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
  el.textContent = left + " left";
}

function showCurrentNote(text) {
  var note = document.getElementById("note");
  if (!note) {
    return;
  }
  note.innerHTML = text;
  note.style.fontSize = exerciseFontPx + "px";
  updateRemaining();
  renderPreview();
}

function advanceNote() {
  var note = document.getElementById("note");
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
    if (note) {
      previousNote = note.innerHTML;
    }
    prepareNextCycle();
    cycleGap = true;
    showCurrentNote("");
    return;
  }
  if (countnotes > 0 && note) {
    previousNote = note.innerHTML;
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
  var textDiv = document.getElementById("textdiv");
  var topEl = textDiv && textDiv.style.display === "block" ? textDiv : header;
  var minTop = topEl ? topEl.getBoundingClientRect().bottom + 12 : 12;
  var exercisePanel = document.getElementById("exercisePanel");
  if (exercisePanel && !exercisePanel.hidden) {
    minTop = Math.max(minTop, exercisePanel.getBoundingClientRect().bottom + 12);
  }
  var maxBottom = footer ? footer.getBoundingClientRect().top - 12 : window.innerHeight - 12;
  return {
    width: Math.max(80, window.innerWidth * 0.9),
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
  for (var i = 0; i < items.length; i++) {
    var plain = items[i].replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, "x");
    ranked.push({ html: items[i], n: plain.length });
  }
  ranked.sort(function (a, b) { return b.n - a.n; });
  var sample = ranked.slice(0, 16);
  var box = noteBox();
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
  while (guard < 8) {
    measure.style.fontSize = Math.floor(size) + "px";
    var fits = true;
    for (var k = 0; k < sample.length; k++) {
      measure.innerHTML = sample[k].html;
      if (measure.scrollWidth > box.width || measure.offsetHeight > box.height) {
        fits = false;
        break;
      }
    }
    if (fits) {
      break;
    }
    size *= 0.92;
    guard++;
  }
  if (size < 16) {
    size = 16;
  }
  exerciseFontPx = Math.floor(size);
  note.style.fontSize = exerciseFontPx + "px";
  measure.style.fontSize = exerciseFontPx + "px";
  reelColumnHalf = 0;
  for (var w = 0; w < sample.length; w++) {
    measure.innerHTML = sample[w].html;
    if (measure.scrollWidth > reelColumnHalf) {
      reelColumnHalf = measure.scrollWidth;
    }
  }
  reelColumnHalf = reelColumnHalf / 2;
  renderPreview();
}

function newExercise(items, bars) {
  chromaticScale = items || [];
  countexercise = 0;
  countnotes = 0;
  notePool = [];
  nextCycle = null;
  previousNote = "";
  cycleGap = false;
  if (bars) {
    exerciseBars = parseInt(bars, 10) || 1;
  }
  document.getElementById("textdiv").style.display = "none";
  chooseExerciseFont();
  advanceNote();
  if (typeof metronomeAlignToDownbeat === "function") {
    metronomeAlignToDownbeat();
  }
}

function resetExercise() {
  newExercise(chromaticScale.slice(), exerciseBars);
}
