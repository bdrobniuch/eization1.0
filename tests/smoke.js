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
    moreCatalog(w);
    shareCase(w);
    chatCase(w);
    foreignDesk(w);
    check("practice screen can stay awake", typeof w.keepPracticeAwake === "function" && typeof w.practiceScreenAwake === "function");
    w.keepPracticeAwake();
    check("staying awake leaves play stopped", w.paused === true);
    check("metronome stays paused", w.paused === true);
  } catch (err) {
    check("threw " + (err && err.message ? err.message : err), false);
  }
  finish();
}

function exerciseMenu(w) {
  var i;
  var seen = {};
  check("menu has 14 exercises", w.menuOrder.length === 14);
  check("free play is last", w.menuOrder[w.menuOrder.length - 1] === "freePlay");
  check("free play captions use the middle dot", w.itemToLine(w.exercises.freePlay.items[0]).indexOf(" \u00B7 ") > 0);
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
  check("more page is linked from About", !!w.document.querySelector("#aboutNav a[href='./more.html']"));
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

function shareRows(w, shareId) {
  var list = w.listDeskExercises();
  var rows = [];
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].shareId === shareId) {
      rows.push(list[i]);
    }
  }
  return rows;
}

function moreCatalog(w) {
  var req = new XMLHttpRequest();
  req.open("GET", "../more.html", false);
  req.send(null);
  check("more catalog loads", req.status === 0 || (req.status >= 200 && req.status < 300));
  var html = req.responseText || "";
  var hashes = html.match(/#s=[A-Za-z0-9_-]+/g) || [];
  var uniq = {};
  var i;
  for (i = 0; i < hashes.length; i++) {
    uniq[hashes[i]] = true;
  }
  var keys = Object.keys(uniq);
  check("more catalog has 49 share links", keys.length === 49);
  check("more catalog points at practice", html.indexOf('href="./#s=') >= 0);
  check("more catalog links books", html.indexOf("books.html") >= 0 || html.indexOf("changes.html") >= 0);
  if (!keys.length) {
    return;
  }
  var before = w.listDeskExercises().length;
  w.location.hash = keys[0];
  w.offerSharedExercise();
  check("more link opens share ask", w.document.getElementById("shareAsk").hidden === false);
  check("more link offers add", w.document.getElementById("shareAdd").hidden === false);
  check("more link offers preview", w.document.getElementById("sharePreview").hidden === false);
  w.previewShareExercise();
  check("more preview opens edit", w.document.body.classList.contains("is-editing"));
  w.editorCancel();
  var added = w.confirmShareAdd();
  check("more add keeps the exercise", added === true && w.listDeskExercises().length === before + 1);
  check("more add drops the hash", w.location.hash.indexOf("#s=") < 0);
  var esReq = new XMLHttpRequest();
  esReq.open("GET", "../es/more.html", false);
  esReq.send(null);
  var esHtml = esReq.responseText || "";
  var esHashes = esHtml.match(/#s=[A-Za-z0-9_-]+/g) || [];
  check("spanish more catalog has 49 share links", esHashes.length === 49);
  check("spanish more uses the same hashes", esHashes.length === keys.length && esHashes.indexOf(keys[0]) >= 0);
}

function shareCase(w) {
  var base = "https://eization.com/";
  var week = { v: 1, id: "teach001", name: "Week", bars: 4, lines: ["Dm7 G7", "Cmaj7"] };
  var url = w.shareExerciseUrl(week, base);
  var read = url ? w.readShareHash(url.slice(url.indexOf("#"))) : null;
  check("share link round trip", !!(read && read.shareId === "teach001" && read.name === "Week" && read.bars === 4 && read.lines.length === 2 && read.lines[0] === "Dm7 G7"));
  check("share lives in edit", !!w.document.getElementById("editShare"));
  check("share prompt is in the page", !!w.document.getElementById("shareAsk"));
  check("intro edit line stays", w.I18N.en["hello.edit"] === "Edit builds your own exercise." && w.I18N.es["hello.edit"] === "Editar arma tu propio ejercicio.");
  var scales = w.getDeskExercise("ex:scales");
  var factoryCount = w.listDeskExercises().length;
  var factoryLines = scales.lines.slice();
  var factoryUrl = w.shareExerciseUrl({ v: 1, id: "fact0001", name: "Escalas", bars: scales.bars, lines: factoryLines }, base);
  w.location.hash = factoryUrl.slice(factoryUrl.indexOf("#"));
  w.offerSharedExercise();
  check("factory exercise opens quietly", w.currentExerciseId === "ex:scales" && w.listDeskExercises().length === factoryCount && w.document.getElementById("shareAsk").hidden === true && w.location.hash.indexOf("#s=") < 0 && !w.getDeskExercise("ex:scales").shareId);
  var editedLines = factoryLines.slice();
  editedLines[0] = editedLines[0] + " x";
  w.updateDeskExercise("ex:scales", { lines: editedLines });
  var editedUrl = w.shareExerciseUrl({ v: 1, id: "fact0002", name: "Scales", bars: scales.bars, lines: factoryLines }, base);
  w.location.hash = editedUrl.slice(editedUrl.indexOf("#"));
  w.offerSharedExercise();
  check("edited factory exercise stays a new link", w.document.getElementById("shareAsk").hidden === false && w.document.getElementById("shareAdd").hidden === false && w.listDeskExercises().length === factoryCount);
  w.dismissShareAsk();
  w.updateDeskExercise("ex:scales", { lines: factoryLines });
  var before = w.listDeskExercises().length;
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  check("share prompt is up", w.document.getElementById("shareAsk").hidden === false);
  check("share add is the action", w.document.getElementById("shareAdd").hidden === false && w.document.getElementById("sharePreview").hidden === false && w.document.getElementById("shareUpdate").hidden === true);
  localStorage.removeItem("eization-hello");
  w.helloTouched = true;
  var added = w.confirmShareAdd();
  var rows = shareRows(w, "teach001");
  check("add keeps the other exercises", added === true && w.listDeskExercises().length === before + 1 && rows.length === 1);
  check("add drops the hash", w.location.hash.indexOf("#s=") < 0);
  check("add leaves the prompt", w.document.getElementById("shareAsk").hidden === true);
  check("add offers the intro", w.shareBlocksHello() === false && w.document.body.classList.contains("is-hello"));
  w.endHello();
  localStorage.setItem("eization-hello", "1");
  var count = w.listDeskExercises().length;
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  check("exact match does not add", w.listDeskExercises().length === count && w.document.getElementById("shareAsk").hidden === true);
  check("exact match drops the hash", w.location.hash.indexOf("#s=") < 0);
  var changed = { v: 1, id: "teach001", name: "Week", bars: 4, lines: ["Dm7 G7", "C6"] };
  var url2 = w.shareExerciseUrl(changed, base);
  w.location.hash = url2.slice(url2.indexOf("#"));
  w.offerSharedExercise();
  check("changed exercise offers update", w.document.getElementById("shareUpdate").hidden === false && w.document.getElementById("shareAddNew").hidden === false && w.document.getElementById("sharePreview").hidden === false && w.document.getElementById("shareAdd").hidden === true && w.document.getElementById("shareAskLead").textContent === w.t("share.differ"));
  w.previewShareExercise();
  check("changed preview hides delete", w.document.getElementById("editDelete").hidden === true && w.document.getElementById("editHint").textContent === w.t("edit.hintShare") && w.document.getElementById("allEdit").value.indexOf("C6") >= 0 && w.document.getElementById("editSaveAs").hidden === false && !w.document.body.classList.contains("is-hello"));
  w.editorCancel();
  check("preview cancel keeps the intro waiting", w.document.getElementById("shareAsk").hidden === false && !w.document.body.classList.contains("is-hello"));
  w.confirmShareUpdate();
  rows = shareRows(w, "teach001");
  check("update replaces the exercise", rows.length === 1 && rows[0].lines[1] === "C6" && rows[0].shareId === "teach001");
  check("update drops the hash", w.location.hash.indexOf("#s=") < 0);
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  w.confirmShareAdd();
  rows = shareRows(w, "teach001");
  var kept = rows[0].lines[1] === "C6" ? rows[0] : rows[1];
  var addedRow = kept === rows[0] ? rows[1] : rows[0];
  check("add as new keeps both", rows.length === 2 && kept.lines[1] === "C6" && addedRow.lines[1] === "Cmaj7" && kept.shareId === "teach001" && addedRow.shareId === "teach001");
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  check("old link selects the old row", w.currentExerciseId === addedRow.id);
  w.location.hash = url2.slice(url2.indexOf("#"));
  w.offerSharedExercise();
  check("new link selects the new row", w.currentExerciseId === kept.id);
  var previewUrl = w.shareExerciseUrl({ v: 1, id: "prev0001", name: "Preview", bars: 2, lines: ["Fmaj7"] }, base);
  w.location.hash = previewUrl.slice(previewUrl.indexOf("#"));
  w.offerSharedExercise();
  w.previewShareExercise();
  check("preview fills edit", w.document.body.classList.contains("is-editing") && w.document.getElementById("allEdit").value.indexOf("Fmaj7") >= 0 && w.document.getElementById("shareAsk").hidden === true && w.location.hash.indexOf("#s=") === 0 && w.document.getElementById("editDelete").hidden === true && !w.document.body.classList.contains("is-hello"));
  w.editorCancel();
  check("preview cancel restores the question", !w.document.body.classList.contains("is-editing") && w.document.getElementById("shareAsk").hidden === false && w.location.hash.indexOf("#s=") === 0 && !w.document.body.classList.contains("is-hello"));
  w.dismissShareAsk();
  check("update keeps shareId", w.getDeskExercise(kept.id).shareId === "teach001");
  var parsed = w.parseDeskExercisesBackup(JSON.stringify(w.packDeskExercises()));
  var kept = 0;
  var i;
  for (i = 0; i < parsed.exercises.length; i++) {
    if (parsed.exercises[i].shareId === "teach001") {
      kept++;
    }
  }
  check("backup keeps both versions", kept === 2);
  var many = [];
  for (i = 0; i < 200; i++) {
    many.push("Cmaj7 Dm7 G7 Cmaj7 line " + i + " extra words to grow the link");
  }
  check("a long list is not a link", w.shareExerciseUrl({ v: 1, id: "teach001", name: "Scales", bars: 1, lines: many }, base) === "");
  var guard = 0;
  while (w.listDeskExercises().length < w.DESK_EXERCISE_CAP && guard < 50) {
    if (!w.createDeskExercise({ name: "Pad", bars: 1, lines: ["G"] })) {
      break;
    }
    guard++;
  }
  var fullUrl = w.shareExerciseUrl({ v: 1, id: "full0001", name: "Extra", bars: 1, lines: ["A"] }, base);
  w.location.hash = fullUrl.slice(fullUrl.indexOf("#"));
  w.offerSharedExercise();
  var hashBefore = w.location.hash;
  check("a full menu refuses", w.confirmShareAdd() === false);
  check("a full menu keeps the hash", w.location.hash === hashBefore && w.location.hash.indexOf("#s=") === 0);
  check("a full menu keeps the prompt", w.document.getElementById("shareAsk").hidden === false && w.document.getElementById("shareAskNote").hidden === false);
  w.dismissShareAsk();
  check("not now drops the hash", w.location.hash.indexOf("#s=") < 0);
  var revise = w.shareExerciseUrl({ v: 1, id: "teach001", name: "Week", bars: 4, lines: ["Dm7 G7", "C9"] }, base);
  var fullCount = w.listDeskExercises().length;
  w.location.hash = revise.slice(revise.indexOf("#"));
  w.offerSharedExercise();
  w.confirmShareUpdate();
  rows = shareRows(w, "teach001");
  check("a full menu still updates", w.listDeskExercises().length === fullCount && rows.length === 2 && (rows[0].lines[1] === "C9" || rows[1].lines[1] === "C9") && w.location.hash.indexOf("#s=") < 0);
  w.location.hash = "#s=not-valid";
  w.offerSharedExercise();
  check("a bad hash is dropped", w.location.hash.indexOf("#s=") < 0);
  check("address still opens scales", w.exerciseIdFromQuery("?exercise=scales") === "ex:scales");
}

function chatCase(w) {
  var upload = w.document.getElementById("editOpen");
  var share = w.document.getElementById("editShare");
  var send = w.document.getElementById("editSend");
  var between = false;
  var node = upload ? upload.nextSibling : null;
  var prompt;
  var shortGpt;
  var shortClaude;
  var shortGemini;
  var longText;
  var longGpt;
  var longClaude;
  var longGemini;
  var empty;
  var desk;
  var label;
  var menu;
  while (node && node !== share) {
    if (node.nodeType === 1 && (node.id === "editHintLine" || node.id === "editShareHint")) {
      between = true;
    }
    node = node.nextSibling;
  }
  check("ask lives in edit", !!w.document.getElementById("editAsk"));
  check("share still lives in edit", !!share);
  check("share sentence stays off the exercise row", !w.document.getElementById("editHintLine"));
  check("hint is not between share and upload", !between);
  label = w.document.getElementById("editExerciseLabel");
  check("exercise label sits on the action row", !!(label && send && label.parentNode === send && label.classList.contains("combo-kicker")));
  var exerciseRow = w.document.getElementById("editExercise");
  var nameRow = w.document.getElementById("editNameRow");
  var deleteButton = w.document.getElementById("editDelete");
  check("exercise actions sit above the name", !!(exerciseRow && nameRow && (exerciseRow.compareDocumentPosition(nameRow) & 4)));
  check("delete sits with the exercise actions", !!(deleteButton && deleteButton.parentNode && deleteButton.parentNode.id === "editSend"));
  check("download and clear drop the extra word", w.document.querySelector("#editSave .btn-label").textContent === w.t("edit.download") && w.document.getElementById("editClearList").textContent === w.t("edit.clear") && w.I18N.en["edit.download"] === "Download" && w.I18N.en["edit.clear"] === "Clear" && w.I18N.en["edit.delete"] === "Delete" && w.I18N.es["edit.download"] === "Descargar" && w.I18N.es["edit.clear"] === "Vaciar" && w.I18N.es["edit.delete"] === "Borrar" && w.I18N.es["share.differ"] === "Este ejercicio es distinto del que hay en este dispositivo." && w.I18N.es["share.preview"] === "Vista previa");
  check("exercise actions keep a mark", ["editSave", "editOpen", "editShare", "editAsk", "editDelete"].every(function (id) {
    var button = w.document.getElementById(id);
    return !!(button && button.querySelector("svg.chrome-icon") && button.querySelector(".btn-label"));
  }));
  prompt = w.buildChatPrompt({ name: "Week", bars: 4, lines: ["Dm7 G7", "Cmaj7"], lang: "en" });
  check("prompt carries the lines", prompt.indexOf("Dm7 G7") >= 0 && prompt.indexOf("Cmaj7") >= 0 && prompt.indexOf("one example per line") >= 0);
  check("prompt coaches then hands back a block", prompt.indexOf("Do not rewrite until they ask") >= 0 && prompt.indexOf("paste it into the eization Edit box") >= 0 && prompt.indexOf("B\u266D \u00B7 \u266D7 of C") >= 0 && prompt.indexOf("A\u266F \u00B7 \u266D7 of C") >= 0);
  shortGpt = w.chatAskUrl(prompt, "chatgpt");
  shortClaude = w.chatAskUrl(prompt, "claude");
  shortGemini = w.chatAskUrl(prompt, "gemini");
  check("short chatgpt address fits", !!(shortGpt && shortGpt.copy === false && shortGpt.href.indexOf("https://chatgpt.com/?q=") === 0 && shortGpt.href.length <= 2000));
  check("short claude address fits", !!(shortClaude && shortClaude.copy === false && shortClaude.href.indexOf("https://claude.ai/new?q=") === 0 && shortClaude.href.length <= 2000));
  check("short gemini address fits", !!(shortGemini && shortGemini.copy === false && shortGemini.href.indexOf("https://gemini.google.com/app?q=") === 0 && shortGemini.href.length <= 2000));
  longText = new Array(800).join("line ");
  longGpt = w.chatAskUrl(longText, "chatgpt");
  longClaude = w.chatAskUrl(longText, "claude");
  longGemini = w.chatAskUrl(longText, "gemini");
  check("long question is copied", !!(longGpt && longGpt.copy === true && longGpt.href === "https://chatgpt.com/"));
  check("long claude question is copied", !!(longClaude && longClaude.copy === true && longClaude.href === "https://claude.ai/new"));
  check("long gemini question is copied", !!(longGemini && longGemini.copy === true && longGemini.href === "https://gemini.google.com/app"));
  empty = w.buildChatPrompt({ name: "New", bars: 1, lines: [], lang: "en" });
  check("empty list still asks", empty.indexOf("one example per line") >= 0 && empty.indexOf("The box is empty.") >= 0 && empty.indexOf("three starters") >= 0);
  var emptyEs = w.buildChatPrompt({ name: "Nuevo", bars: 1, lines: [], lang: "es" });
  check("spanish prompt coaches", emptyEs.indexOf("Un ejemplo por l\u00EDnea") >= 0 && emptyEs.indexOf("El recuadro est\u00E1 vac\u00EDo.") >= 0 && emptyEs.indexOf("pulsen Actualizar") >= 0);
  var toneLines = ["1", "\u266D3", "3", "\u266D5", "5", "\u266F5", "\u266D\u266D7", "\u266D7", "7", "\u266D9", "9", "\u266F9", "11", "\u266F11", "\u266D13", "13"];
  check("chord tones prompt fits", w.chatAskUrl(w.buildChatPrompt({ name: "Chord Tones", bars: 1, lines: toneLines, lang: "en" }), "gemini").copy === false);
  check("spanish chord tones prompt fits", w.chatAskUrl(w.buildChatPrompt({ name: "Notas del acorde", bars: 1, lines: toneLines, lang: "es" }), "gemini").copy === false);
  var noteLines = w.exercises.allNotes.items.map(w.itemToLine);
  var scaleLines = w.exercises.scales.items.map(w.itemToLine);
  check("all notes gemini fits", w.chatAskUrl(w.buildChatPrompt({ name: "All Notes", bars: 1, lines: noteLines, lang: "en" }), "gemini").copy === false && w.chatAskUrl(w.buildChatPrompt({ name: "Todas las notas", bars: 1, lines: noteLines, lang: "es" }), "gemini").copy === false);
  check("scales gemini fits", w.chatAskUrl(w.buildChatPrompt({ name: "Scales", bars: 1, lines: scaleLines, lang: "en" }), "gemini").copy === false && w.chatAskUrl(w.buildChatPrompt({ name: "Escalas", bars: 1, lines: scaleLines, lang: "es" }), "gemini").copy === false);
  desk = JSON.stringify(w.listDeskExercises());
  w.document.getElementById("editAsk").click();
  check("opening the menu does not write the desk", JSON.stringify(w.listDeskExercises()) === desk);
  menu = w.document.getElementById("editAskMenu");
  check("chat menu opens", menu.hidden === false);
  check("three chats sit in one row", !!(w.document.getElementById("editAskGemini") && w.getComputedStyle(menu).flexDirection === "row" && w.I18N.en["edit.ask"] === "Ask AI" && w.I18N.es["edit.ask"] === "Preguntar a la IA" && w.I18N.en["edit.askGemini"] === "Gemini"));
  check("hint asks to paste", w.document.getElementById("editHint").textContent === w.t("edit.askHint"));
  w.document.getElementById("editAsk").click();
  check("chat menu closes", menu.hidden === true);
  check("paste line leaves with the chats", w.document.getElementById("editHint").textContent !== w.t("edit.askHint"));
  check("intro edit line stays after chat", w.I18N.en["hello.edit"] === "Edit builds your own exercise." && w.I18N.es["hello.edit"] === "Editar arma tu propio ejercicio.");
}

function foreignDesk(w) {
  w.restoreDefaults();
  localStorage.setItem("eization-hello", "1");
  var created = w.createDeskExercise({ name: "Other", bars: 1, lines: ["One", "Two"] });
  var id = created && created.id;
  var area;
  var update;
  var data;
  var i;
  var next;
  var face;
  var during;
  var openId;
  check("other-window strings", w.I18N.en["edit.staleAsk"] === "This exercise changed in another window." && w.I18N.es["edit.staleAsk"] === "Este ejercicio cambi\u00F3 en otra ventana." && w.I18N.en["desk.otherWindow"] === "That exercise was removed in another window." && w.I18N.es["desk.otherWindow"] === "Ese ejercicio se quit\u00F3 en otra ventana.");
  if (!id) {
    check("other-window exercise saves", false);
    return;
  }
  w.currentExerciseId = id;
  w.SelectExercise();
  w.editorOpen();
  area = w.document.getElementById("allEdit");
  area.value = area.value + "\nZed";
  area.dispatchEvent(new w.Event("input"));
  data = JSON.parse(localStorage.getItem("eization-desk"));
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].id === id) {
      data.exercises[i].lines = ["From the other window"];
    }
  }
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.document.getElementById("editUpdate").click();
  update = w.document.getElementById("editUpdate");
  check("stale update waits", !!(update && update.classList.contains("is-armed") && update.textContent === w.t("edit.staleAsk") && w.editorIsOpen() && w.getDeskExercise(id).lines.length === 1 && w.getDeskExercise(id).lines[0] === "From the other window"));
  update.click();
  check("second update replaces", !!(w.getDeskExercise(id) && w.getDeskExercise(id).lines[w.getDeskExercise(id).lines.length - 1] === "Zed" && !w.editorIsOpen()));
  data = JSON.parse(localStorage.getItem("eization-desk"));
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].id === id) {
      data.exercises[i].name = "Renamed elsewhere";
    }
  }
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.document.getElementById("deskNote").hidden = true;
  w.dispatchEvent(new w.StorageEvent("storage", { key: "eization-desk", newValue: localStorage.getItem("eization-desk") }));
  face = w.document.getElementById("exerciseFace").querySelector(".combo-value");
  check("another window renames the menu", w.currentExerciseId === id && face.textContent === "Renamed elsewhere" && w.document.getElementById("deskNote").hidden === true);
  data = JSON.parse(localStorage.getItem("eization-desk"));
  data.bpm = 123;
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.dispatchEvent(new w.StorageEvent("storage", { key: "eization-desk", newValue: localStorage.getItem("eization-desk") }));
  check("setup from another window stays put", w.currentExerciseId === id && w.document.getElementById("bpm").value !== "123");
  w.editorOpen();
  during = w.document.getElementById("allEdit").value;
  openId = w.currentExerciseId;
  data = JSON.parse(localStorage.getItem("eization-desk"));
  next = [];
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].id !== openId) {
      next.push(data.exercises[i]);
    }
  }
  data.exercises = next;
  data.exercise = next[0].id;
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.dispatchEvent(new w.StorageEvent("storage", { key: "eization-desk", newValue: localStorage.getItem("eization-desk") }));
  check("edit stays open across another window", w.editorIsOpen() && w.document.getElementById("allEdit").value === during && w.currentExerciseId === openId);
  w.editorCancel();
  check("closing edit follows a removal", !w.editorIsOpen() && w.currentExerciseId !== openId && w.document.getElementById("deskNote").textContent === w.t("desk.otherWindow") && w.document.getElementById("deskNote").hidden === false);
  w.restoreDefaults();
  localStorage.setItem("eization-hello", "1");
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
