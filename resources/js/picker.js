var chromaticScale = [];
var notePool = [];
var countexercise = 0;
var countnotes = 0;
var currentFontSize = 55;
var exerciseBars = 1;

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
  document.getElementById("note").innerHTML = text;
  updateRemaining();
}

function newExercise(items, fontSize, bars) {
  chromaticScale = items || [];
  countexercise = 0;
  countnotes = 0;
  notePool = [];
  if (fontSize) {
    currentFontSize = fontSize;
  }
  if (bars) {
    exerciseBars = parseInt(bars, 10) || 1;
  }
  document.getElementById("note").style.fontSize = currentFontSize + "vmin";
  document.getElementById("textdiv").style.display = "none";
  advanceNote();
  if (typeof metronomeAlignToDownbeat === "function") {
    metronomeAlignToDownbeat();
  }
}
