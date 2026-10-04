var failed = 0;
var lines = [];

function check(name, ok) {
  lines.push((ok ? "ok   " : "FAIL ") + name);
  if (!ok) {
    failed++;
  }
}

function near(a, b) {
  return Math.abs(a - b) < 0.004;
}

function finish() {
  try {
    if (savedDesk === null) {
      localStorage.removeItem("eization-desk");
    } else {
      localStorage.setItem("eization-desk", savedDesk);
    }
  } catch (err) {}
  lines.push(failed ? failed + " failed" : "all passed");
  document.getElementById("out").textContent = lines.join("\n");
  document.title = failed ? "FAIL" : "PASS";
}

var savedDesk = null;
try {
  savedDesk = localStorage.getItem("eization-desk");
  localStorage.removeItem("eization-desk");
  localStorage.setItem("eization-hello", "1");
} catch (err) {}

var frame = document.createElement("iframe");
frame.setAttribute("title", "app");
frame.style.cssText = "position:absolute;left:-2000px;width:800px;height:700px;border:0";
frame.src = "../index.html?smoke=1";
document.body.appendChild(frame);

frame.addEventListener("load", function () {
  window.setTimeout(run, 80);
});

function run() {
  var w;
  try {
    w = frame.contentWindow;
    if (!w.deskReady || !w.exercises || !w.menuOrder) {
      window.setTimeout(run, 50);
      return;
    }
  } catch (err) {
    check("app frame", false);
    finish();
    return;
  }
  try {
    exerciseMenu(w);
    clock(w);
    swing(w);
    neo(w);
    editorLines(w);
    editorFile(w);
    deskRoundTrip(w);
    check("metronome stays paused", w.paused === true);
  } catch (err) {
    check("threw " + (err && err.message ? err.message : err), false);
  }
  finish();
}

function exerciseMenu(w) {
  var i;
  var seen = {};
  check("menu has 13 exercises", w.menuOrder.length === 13);
  for (i = 0; i < w.menuOrder.length; i++) {
    var id = w.menuOrder[i];
    var ex = w.exercises[id];
    seen[id] = true;
    check("listed " + id, !!(ex && ex.inMenu));
  }
  check("rhythms id stays limbs", w.exercises.limbs && w.exercises.limbs.label === "Rhythms");
  var hidden = 0;
  for (id in w.exercises) {
    if (!w.exercises[id].inMenu) {
      hidden++;
      check("hidden stays out of the menu: " + id, !seen[id]);
    }
  }
  check("hidden exercises still registered", hidden === 9);
  var deskList = w.listDeskExercises();
  check("desk seeds the visible catalog", deskList.length === w.menuOrder.length);
  var buttons = w.document.querySelectorAll("#exerciseMenu [data-value]");
  check("menu buttons match the desk list", buttons.length === deskList.length);
  check("address opens scales", w.exerciseIdFromQuery("?exercise=scales") === "ex:scales");
  check("address opens rhythms", w.exerciseIdFromQuery("?exercise=limbs") === "ex:limbs");
  check("address ignores a hidden exercise", w.exerciseIdFromQuery("?exercise=licks") === "");
  check("address ignores other queries", w.exerciseIdFromQuery("?smoke=1") === "");
  check("practice page is linked from About", !!w.document.querySelector("#aboutNav a[href='./practice.html']"));
  check("books page is linked from About", !!w.document.querySelector("#aboutNav a[href='./books.html']"));
  check("restore defaults lives in About", !!w.document.querySelector("#about #restoreDefaults"));
  check("download all lives in About", !!w.document.querySelector("#about #downloadAllExercises"));
  var packed = w.packDeskExercises();
  check("desk backup packs exercises", !!(packed && packed.kind === "exercises" && packed.exercises.length === w.menuOrder.length));
  var round = w.parseDeskExercisesBackup(JSON.stringify(packed));
  check("desk backup parses back", !!(round && round.exercises && round.exercises.length === packed.exercises.length));
}

function clock(w) {
  check("4/4 is eight clicks", w.beatsPerBar === 4 && w.stepsPerBar() === 8);
  w.currentBpm = 100;
  check("eighth at 100 BPM is 0.3s", near(w.eighthDuration(), 0.3));
}

function swing(w) {
  var bpmBox = w.document.getElementById("bpm");
  var previous = bpmBox ? bpmBox.value : "100";
  w.currentBpm = 400;
  if (bpmBox) {
    bpmBox.value = "400";
  }
  w.setSwingMode("triplet");
  check("triplet ratio is 2", w.activeSwingRatio() === 2);
  var triplet = w.swingGaps();
  check("triplet does not lengthen the short note", triplet.shortNote < 0.055);
  w.setSwingMode("feel");
  w.setSwingAuto(false);
  w.setSwingRatio(2);
  var feel = w.swingGaps();
  check("feel keeps the short note playable", feel.shortNote >= 0.054 && feel.shortNote < 0.07);
  w.setSwingMode("off");
  w.currentBpm = 100;
  if (bpmBox) {
    bpmBox.value = previous;
  }
  check("swing off is straight", w.activeSwingRatio() === 1 && w.swingOn === false);
}

function neo(w) {
  var beats = w.beatsPerBar;
  var unit = w.beatUnit;
  w.currentBpm = 100;
  w.beatsPerBar = 4;
  w.beatUnit = 4;
  w.setSwingMode("neo");
  var amount = w.document.getElementById("swingAmount");
  check("neo hides the swing amount", !!(amount && amount.hidden));
  check("neo leaves beat 1 on the grid", w.neoStepDelay(0) === 0);
  check("neo delays beat 2 by 40 ms", near(w.neoStepDelay(2), 0.04));
  check("neo leaves the & straight", w.neoStepDelay(1) === 0 && w.neoStepDelay(3) === 0);
  check("neo leaves beat 3 on the grid", w.neoStepDelay(4) === 0);
  check("neo delays beat 4 by 40 ms", near(w.neoStepDelay(6), 0.04));
  check("neo gives the time back inside the bar", near(w.neoClickTime(2), 0.64) && near(w.neoClickTime(4), 1.2) && near(w.neoClickTime(8), 2.4));
  w.beatsPerBar = 6;
  w.beatUnit = 8;
  check("neo in 6/8 delays only the second group", w.neoStepDelay(0) === 0 && w.neoStepDelay(2) === 0 && near(w.neoStepDelay(6), 0.04) && near(w.neoClickTime(12), 3.6));
  w.beatsPerBar = 3;
  w.beatUnit = 4;
  check("neo in 3/4 delays only beat 2", w.neoStepDelay(0) === 0 && near(w.neoStepDelay(2), 0.04) && w.neoStepDelay(4) === 0);
  w.beatsPerBar = beats;
  w.beatUnit = unit;
  w.setSwingMode("off");
  check("off still has no swing", w.activeSwingRatio() === 1 && w.swingNeo === false);
}

function editorFile(w) {
  var text = w.editorFileText(["C \u00B7 File", "D"], 4, "Cadence");
  var parsed = w.readEditorFile(text);
  check("exercise file is version 1", text.indexOf("# eization 1\n") === 0 && parsed.version === 1);
  check("exercise file keeps the lines", parsed.lines.length === 2 && parsed.lines[0] === "C \u00B7 File");
  check("exercise file keeps the bars", parsed.bars === 4);
  check("exercise file keeps the name", parsed.name === "Cadence");
  var older = w.readEditorFile("# eization\n# bars 2\nG\n");
  check("an unversioned file still opens", older.version === 1 && older.lines[0] === "G" && older.bars === 2);
  var plain = w.readEditorFile("E\nF\n");
  check("a plain list opens without a header", plain.lines.length === 2 && plain.bars === null && plain.version === null);
  var newer = w.readEditorFile("# eization 2\nA\n");
  check("a newer file is recognized", newer.version === 2 && newer.version > w.EDITOR_FILE_VERSION);
}

function editorLines(w) {
  var split = w.lineToItem("C \u00B7 Desk");
  check("caption splits into two lines", split.indexOf("prog-changes") > 0 && split.indexOf("prog-name") > 0);
  var mark = w.lineToItem("A \uD834\uDD0E");
  check("repeat sign stays in its span", mark.indexOf("simile") > 0 && mark.indexOf("\uD834\uDD0E") > 0);
  check("blank line is dropped", w.lineToItem("   ") === "");
  var longLine = new Array(300).join("a");
  check("a line stops at 240 characters", w.lineToItem(longLine).length === 240);
}

function deskRoundTrip(w) {
  var beforeHello = "1";
  try {
    beforeHello = localStorage.getItem("eization-hello");
  } catch (err) {}
  w.deskReady = true;
  var created = w.createDeskExercise({ name: "Desk", bars: 2, lines: ["C \u00B7 Desk", "D"] });
  check("custom exercise saves", !!(created && created.id));
  var record = w.getDeskExercise(created.id);
  check("custom exercise reads back", !!(record && record.bars === 2 && record.lines.length === 2 && record.name === "Desk"));
  var seedId = w.listDeskExercises()[0].id;
  w.updateDeskExercise(seedId, { name: "Renamed", bars: 3, lines: ["A", "B"] });
  check("seeded exercise updates in place", w.getDeskExercise(seedId).name === "Renamed" && w.getDeskExercise(seedId).seedId);
  w.setSoundOn(false);
  w.playBars = 0;
  w.restBars = 0;
  w.writeSetupNow();
  var stored = JSON.parse(localStorage.getItem("eization-desk"));
  check("play and rest are not both zero", stored.play === 1 && stored.rest === 0);
  check("mute is stored on the desk", stored.sound === false);
  check("hello flag is not inside the desk", !stored.hello);
  var beforeDelete = w.listDeskExercises().length;
  var deletedSeed = w.getDeskExercise(seedId).seedId;
  check("delete removes one exercise", w.deleteDeskExercise(seedId) === true && w.listDeskExercises().length === beforeDelete - 1);
  stored = JSON.parse(localStorage.getItem("eization-desk"));
  check("deleted seed is remembered", !!(stored && stored.deletedSeeds && stored.deletedSeeds.indexOf(deletedSeed) >= 0));
  check("address skips a removed exercise", w.exerciseIdFromQuery("?exercise=" + deletedSeed) === "");
  check("address still opens a kept exercise", w.exerciseIdFromQuery("?exercise=scales") === "ex:scales");
  w.restoreDefaults();
  var after = JSON.parse(localStorage.getItem("eization-desk") || "null");
  var helloGone = localStorage.getItem("eization-hello") === null;
  check("restore re-seeds the desk", !!(after && after.exercises && after.exercises.length === w.menuOrder.length));
  check("restore clears deleted seeds", !!(after && (!after.deletedSeeds || !after.deletedSeeds.length)));
  check("restore clears the intro flag", helloGone);
  check("restore leaves the metronome paused", w.paused === true);
  if (beforeHello) {
    try {
      localStorage.setItem("eization-hello", beforeHello);
    } catch (err) {}
  }
}
