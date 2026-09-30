var chromaticScale = [];
var notePool = [];
var countexercise = 0;
var countnotes = 0;
var exerciseBars = 1;
var exerciseFontPx = 48;

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
    notePool = chromaticScale.slice();
    shuffleArray(notePool);
    countexercise++;
  }
  return notePool.pop();
}

function updateRemaining() {
  var el = document.getElementById("counter");
  if (!el) {
    return;
  }
  el.textContent = notePool.length + " left";
}

function advanceNote() {
  var text = pickANote();
  countnotes++;
  var note = document.getElementById("note");
  note.innerHTML = text;
  note.style.fontSize = exerciseFontPx + "px";
  updateRemaining();
}

function noteBox() {
  var header = document.getElementById("linediv");
  var footer = document.querySelector("footer");
  var textDiv = document.getElementById("textdiv");
  var topEl = textDiv && textDiv.style.display === "block" ? textDiv : header;
  var minTop = topEl ? topEl.getBoundingClientRect().bottom + 12 : 12;
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
}

function newExercise(items, bars) {
  chromaticScale = items || [];
  countexercise = 0;
  countnotes = 0;
  notePool = [];
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
