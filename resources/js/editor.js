var editorDraft = {
  label: "",
  id: "",
  name: "",
  text: "",
  bars: 1,
  mode: "edit",
  storedLines: null
};

var EDITOR_SYMBOLS = [
  { char: "\u266F", key: "sym.sharp" },
  { char: "\u266D", key: "sym.flat" },
  { char: "\u266E", key: "sym.natural" },
  { char: "\u2206", key: "sym.maj7" },
  { char: "\u00B0", key: "sym.dim" },
  { char: "\u00F8", key: "sym.half" },
  { char: "+", key: "sym.aug" },
  { char: "\u2193", key: "sym.down" },
  { char: "\u2191", key: "sym.up" },
  { char: "\u2192", key: "sym.arrow" },
  { char: "|", key: "sym.bar" },
  { char: "\uD834\uDD0E", key: "sym.simile" },
  { char: "\u00B7", key: "sym.caption" },
  { char: "\u2612", key: "sym.played" },
  { char: "\u2610", key: "sym.open" },
  { char: "\uD834\uDD00", key: "sym.staff" }
];

function editorIsOpen() {
  var sheet = document.getElementById("textdiv");
  return !!(sheet && sheet.classList.contains("is-open"));
}

function decodeJsEscapes(text) {
  return text.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (all, hex) {
    var code = parseInt(hex, 16);
    if (!code || code > 0x10FFFF) {
      return all;
    }
    return String.fromCodePoint(code);
  }).replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

function collapseEditorSpaces(text) {
  return (text || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/^\s+|\s+$/g, "");
}

function htmlToEditorLine(html) {
  var box = document.createElement("div");
  box.innerHTML = html;
  var changes = box.querySelector(".prog-changes");
  var name = box.querySelector(".prog-name");
  if (changes && name) {
    var left = collapseEditorSpaces(changes.textContent);
    var right = collapseEditorSpaces(name.textContent);
    if (left && right) {
      return left + " \u00B7 " + right;
    }
  }
  return collapseEditorSpaces(box.textContent);
}

function itemToLine(html) {
  var raw = decodeJsEscapes(String(html || ""));
  if (!raw) {
    return "";
  }
  if (/[&<>]|\\u/.test(raw)) {
    return htmlToEditorLine(raw);
  }
  return collapseEditorSpaces(raw);
}

function escapeEditorHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function withSimile(html) {
  return html.replace(/\uD834\uDD0E/g, '<span class="simile">\uD834\uDD0E</span>');
}

function lineToItem(line) {
  var text = itemToLine(line);
  if (!text) {
    return "";
  }
  if (text.length > 240) {
    text = text.slice(0, 240);
  }
  var dot = " \u00B7 ";
  var at = text.indexOf(dot);
  if (at > 0) {
    var left = text.slice(0, at).replace(/\s+$/g, "");
    var right = text.slice(at + dot.length).replace(/^\s+/g, "");
    if (left && right) {
      return withSimile('<span class="prog-changes">' + escapeEditorHtml(left) + '</span><span class="prog-name">' + escapeEditorHtml(right) + '</span>');
    }
  }
  return withSimile(escapeEditorHtml(text));
}

function editorLinesFrom(value) {
  var parts = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var lines = [];
  for (var i = 0; i < parts.length; i++) {
    var line = itemToLine(parts[i]);
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}

function clampEditorBars(value) {
  var bars = parseInt(value, 10);
  if (isNaN(bars) || bars < 1) {
    return 1;
  }
  if (bars > 16) {
    return 16;
  }
  return bars;
}

function editorNameValue() {
  var field = document.getElementById("editName");
  return field ? field.value : "";
}

function editorIsDirty() {
  if (!editorIsOpen()) {
    return false;
  }
  var area = document.getElementById("allEdit");
  var bars = clampEditorBars(document.getElementById("editBars").value);
  var text = editorLinesFrom(area.value).join("\n");
  var name = editorNameValue().replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  var draftName = (editorDraft.name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  return text !== editorDraft.text || bars !== editorDraft.bars || name !== draftName;
}

function editorNotice(message) {
  editorMessage(message, false);
}

function editorStatus(message) {
  editorMessage(message, true);
}

function editorMessage(message, note) {
  var error = document.getElementById("editError");
  if (!error) {
    return;
  }
  error.hidden = false;
  error.classList.toggle("is-note", !!note);
  error.textContent = message;
}

function clearEditorNotice() {
  var error = document.getElementById("editError");
  if (!error) {
    return;
  }
  error.hidden = true;
  error.classList.remove("is-note");
  error.textContent = "";
}

function setEditButton(open) {
  var button = document.getElementById("edit");
  if (!button) {
    return;
  }
  button.setAttribute("aria-pressed", open ? "true" : "false");
  var openLabel = editorIsCreateMode() ? t("edit.openCreate") : t("edit.openUpdate");
  button.title = open ? openLabel : t("edit.open");
  button.setAttribute("aria-label", open ? openLabel : t("edit.open"));
  var check = button.querySelector(".icon-check");
  var pen = button.querySelector(".icon-pen");
  if (check && pen) {
    check.classList.toggle("is-hidden", !open);
    pen.classList.toggle("is-hidden", !!open);
  }
}

function setEditorCommitsEnabled(on) {
  var update = document.getElementById("editUpdate");
  var saveAs = document.getElementById("editSaveAs");
  if (update) {
    update.disabled = !on;
  }
  if (saveAs) {
    saveAs.disabled = !on;
  }
}

function editorIsCreateMode() {
  return editorDraft.mode === "create";
}

function syncEditorCommitLabels() {
  var update = document.getElementById("editUpdate");
  var saveAs = document.getElementById("editSaveAs");
  var del = document.getElementById("editDelete");
  if (editorIsCreateMode()) {
    if (update) {
      update.textContent = t("edit.create");
      update.title = t("edit.createTitle");
      update.setAttribute("aria-label", t("edit.createAria"));
    }
    if (saveAs) {
      saveAs.hidden = true;
    }
    if (del) {
      del.hidden = true;
    }
    return;
  }
  if (update) {
    update.textContent = t("edit.update");
    update.title = t("edit.updateTitle");
    update.setAttribute("aria-label", t("edit.updateAria"));
  }
  if (saveAs) {
    saveAs.hidden = false;
  }
  if (del) {
    del.hidden = typeof sharePreview !== "undefined" && !!sharePreview;
  }
}

function refreshEditorHint() {
  var hint = document.getElementById("editHint");
  if (!hint) {
    return;
  }
  var del = document.getElementById("editDelete");
  var update = document.getElementById("editUpdate");
  if ((del && del.classList.contains("is-armed")) || (update && update.classList.contains("is-armed"))) {
    hint.textContent = "";
    return;
  }
  var askMenu = document.getElementById("editAskMenu");
  if (askMenu && !askMenu.hidden) {
    hint.textContent = t("edit.askHint");
    return;
  }
  if (typeof sharePreview !== "undefined" && sharePreview) {
    hint.textContent = sharePreview.mode === "changed" ? t("edit.hintShare") : t("edit.hintCreate");
    return;
  }
  if (editorIsCreateMode()) {
    hint.textContent = t("edit.hintCreate");
    return;
  }
  if (editorIsDirty()) {
    hint.textContent = t("edit.hintDirty");
  } else {
    hint.textContent = t("edit.hintUpdate");
  }
}

function selectExerciseChip(id) {
  var menu = document.getElementById("exerciseMenu");
  if (!menu) {
    return;
  }
  var choices = menu.querySelectorAll("[data-value]");
  for (var i = 0; i < choices.length; i++) {
    choices[i].setAttribute("aria-selected", choices[i].getAttribute("data-value") === id ? "true" : "false");
  }
}

function editorRestoreFace() {
  var face = document.getElementById("exerciseFace");
  if (face && typeof setComboLabel === "function") {
    setComboLabel(face, editorDraft.label || "");
  }
  currentExerciseId = editorDraft.id;
  selectExerciseChip(editorDraft.id);
}

function editorCloseQuiet() {
  if (!editorIsOpen()) {
    return;
  }
  var sheet = document.getElementById("textdiv");
  sheet.classList.remove("is-open");
  sheet.style.display = "";
  document.body.classList.remove("is-editing");
  editorDraft.mode = "edit";
  setEditButton(false);
  clearEditorNotice();
  disarmEditorDelete();
  disarmEditorOpen();
  editorAskMenu(false);
  setEditorCommitsEnabled(true);
  syncEditorCommitLabels();
  if (typeof renderPreview === "function") {
    renderPreview();
  }
  if (typeof deskForeignPending !== "undefined" && deskForeignPending && typeof applyForeignDeskList === "function") {
    applyForeignDeskList(true);
  }
}

function placeEditor() {
  var sheet = document.getElementById("textdiv");
  if (!sheet || !sheet.classList.contains("is-open")) {
    return;
  }
  var bar = document.getElementById("topBar");
  var footer = document.querySelector("footer");
  var top = bar ? bar.getBoundingClientRect().bottom : 0;
  var limit = footer ? footer.getBoundingClientRect().top : window.innerHeight;
  var viewport = window.visualViewport;
  if (viewport) {
    var visibleBottom = viewport.offsetTop + viewport.height;
    if (visibleBottom < limit) {
      limit = visibleBottom;
    }
  }
  sheet.style.top = Math.max(0, top) + "px";
  sheet.style.bottom = Math.max(0, window.innerHeight - limit) + "px";
}

function currentEditorLine() {
  var area = document.getElementById("allEdit");
  var value = area.value;
  var start = area.selectionStart || 0;
  var lineStart = value.lastIndexOf("\n", start - 1) + 1;
  var lineEnd = value.indexOf("\n", start);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  return value.slice(lineStart, lineEnd);
}

function visibleLineCount(value) {
  var parts = String(value || "").split("\n");
  var total = 0;
  for (var i = 0; i < parts.length; i++) {
    if (collapseEditorSpaces(parts[i])) {
      total++;
    }
  }
  return total;
}

function refreshEditor() {
  var area = document.getElementById("allEdit");
  var count = document.getElementById("editCount");
  var preview = document.getElementById("editPreview");
  var total = visibleLineCount(area.value);
  if (count) {
    count.textContent = total === 1 ? t("edit.examplesOne") : tr("edit.examplesMany", { n: total });
  }
  if (!preview) {
    return;
  }
  var line = itemToLine(currentEditorLine());
  preview.classList.toggle("is-empty", !line);
  preview.innerHTML = line ? lineToItem(line) : "";
  refreshEditorHint();
}

function insertEditorText(text) {
  var area = document.getElementById("allEdit");
  var start = area.selectionStart || 0;
  var end = area.selectionEnd || 0;
  if (start > area.value.length) {
    start = area.value.length;
    end = start;
  }
  area.focus();
  if (typeof area.setRangeText === "function") {
    area.setRangeText(text, start, end, "end");
  } else {
    area.value = area.value.slice(0, start) + text + area.value.slice(end);
    var caret = start + text.length;
    area.setSelectionRange(caret, caret);
  }
  clearEditorNotice();
  refreshEditor();
}

function convertEditorCodes() {
  var area = document.getElementById("allEdit");
  var raw = area.value;
  if (!/&#\d+;|&#x[0-9a-fA-F]+;|&[a-zA-Z]+;|\\u\{[0-9a-fA-F]+\}|\\u[0-9a-fA-F]{4}|<\/?[a-zA-Z]/.test(raw)) {
    return;
  }
  var caret = area.selectionStart || 0;
  var next = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(function (line) {
    if (!/[&<>]|\\u/.test(line)) {
      return line;
    }
    var decoded = itemToLine(line);
    return decoded || line;
  }).join("\n");
  if (next === raw) {
    return;
  }
  var prefix = raw.slice(0, caret).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(function (line, index, all) {
    if (index < all.length - 1) {
      return itemToLine(line);
    }
    if (!/[&<>]|\\u/.test(line)) {
      return line;
    }
    var decoded = itemToLine(line);
    return decoded || line;
  }).join("\n");
  area.value = next;
  var pos = prefix.length;
  area.setSelectionRange(pos, pos);
}

function duplicateEditorLine() {
  var area = document.getElementById("allEdit");
  var value = area.value;
  var start = area.selectionStart || 0;
  var lineStart = value.lastIndexOf("\n", start - 1) + 1;
  var lineEnd = value.indexOf("\n", start);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  var line = value.slice(lineStart, lineEnd);
  var insertAt = lineEnd;
  var insert = "\n" + line;
  area.focus();
  if (typeof area.setRangeText === "function") {
    area.setRangeText(insert, insertAt, insertAt, "end");
  } else {
    area.value = value.slice(0, insertAt) + insert + value.slice(insertAt);
  }
  var caret = insertAt + insert.length;
  area.setSelectionRange(caret, caret);
  clearEditorNotice();
  refreshEditor();
}

function clearEditorList() {
  if (!editorIsOpen()) {
    return;
  }
  var area = document.getElementById("allEdit");
  area.value = "";
  area.setSelectionRange(0, 0);
  clearEditorNotice();
  refreshEditor();
  if (window.matchMedia("(pointer: fine)").matches) {
    area.focus();
  }
}

function syncEditorFaceName() {
  if (!editorIsOpen()) {
    return;
  }
  var face = document.getElementById("exerciseFace");
  var name = editorNameValue().replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "") || t("edit.defaultName");
  if (face && typeof setComboLabel === "function") {
    setComboLabel(face, name);
  }
}

function editorOpenSheet(options) {
  options = options || {};
  if (typeof closeAbout === "function") {
    closeAbout();
  }
  if (typeof closeExercisePanel === "function") {
    closeExercisePanel();
  }
  if (typeof closeGroovePanel === "function") {
    closeGroovePanel();
  }
  var face = document.getElementById("exerciseFace");
  var shown = face ? face.querySelector(".combo-value") : null;
  var desk = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  editorDraft.mode = options.mode === "create" ? "create" : "edit";
  editorDraft.label = shown ? shown.textContent : (desk ? desk.name : "");
  editorDraft.id = typeof currentExerciseId === "string" ? currentExerciseId : "";
  if (editorIsCreateMode()) {
    editorDraft.name = t("edit.defaultName");
    editorDraft.bars = 1;
    editorDraft.text = "";
  } else {
    editorDraft.name = desk ? exerciseDisplayName(desk) : editorDraft.label;
    editorDraft.bars = typeof exerciseBars === "number" && exerciseBars > 0 ? exerciseBars : 1;
    var source = typeof chromaticScale !== "undefined" && chromaticScale ? chromaticScale : [];
    var lines = [];
    for (var i = 0; i < source.length; i++) {
      var line = itemToLine(source[i]);
      if (line) {
        lines.push(line);
      }
    }
    editorDraft.text = lines.join("\n");
  }
  editorDraft.storedLines = editorIsCreateMode() ? null : editorStoredLinesNow(editorDraft.id);
  var area = document.getElementById("allEdit");
  area.value = editorDraft.text;
  document.getElementById("editBars").value = String(editorDraft.bars);
  var nameField = document.getElementById("editName");
  if (nameField) {
    nameField.value = editorDraft.name || "";
  }
  disarmEditorDelete();
  disarmEditorOpen();
  setEditorCommitsEnabled(true);
  syncEditorCommitLabels();
  clearEditorNotice();
  editorAskMenu(false);
  document.getElementById("textdiv").classList.add("is-open");
  document.body.classList.add("is-editing");
  setEditButton(true);
  if (editorIsCreateMode()) {
    syncEditorFaceName();
  }
  refreshEditor();
  placeEditor();
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
  area.scrollTop = 0;
  area.setSelectionRange(0, 0);
  if (window.matchMedia("(pointer: fine)").matches) {
    if (editorIsCreateMode() && nameField) {
      nameField.focus();
      nameField.select();
    } else {
      area.focus();
    }
  }
  refreshEditor();
  if (typeof track === "function") {
    track("edit_open", {
      exercise_id: editorIsCreateMode() ? "custom" : (typeof analyticsExerciseId === "function" ? analyticsExerciseId() : "custom")
    });
  }
}

function editorOpen() {
  editorOpenSheet({ mode: "edit" });
}

function editorOpenNew() {
  if (typeof editorIsOpen === "function" && editorIsOpen()) {
    if (typeof editorIsDirty === "function" && editorIsDirty()) {
      editorNotice(t("edit.finish"));
      return;
    }
    editorCloseQuiet();
  }
  var list = typeof listDeskExercises === "function" ? listDeskExercises() : [];
  if (typeof DESK_EXERCISE_CAP === "number" && list.length >= DESK_EXERCISE_CAP) {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("edit.removeFirst"));
    }
    return;
  }
  editorOpenSheet({ mode: "create" });
}

function editorPlainLines(lines) {
  var out = [];
  var i;
  var line;
  if (!lines) {
    return "";
  }
  for (i = 0; i < lines.length; i++) {
    line = itemToLine(lines[i]);
    if (line) {
      out.push(line);
    }
  }
  return out.join("\n");
}

function editorOpenSharePreview(spec) {
  spec = spec || {};
  if (typeof closeAbout === "function") {
    closeAbout();
  }
  if (typeof closeExercisePanel === "function") {
    closeExercisePanel();
  }
  if (typeof closeGroovePanel === "function") {
    closeGroovePanel();
  }
  var target = spec.target;
  var face = document.getElementById("exerciseFace");
  var shown = face ? face.querySelector(".combo-value") : null;
  editorDraft.mode = spec.mode === "create" ? "create" : "edit";
  editorDraft.label = shown ? shown.textContent : "";
  if (typeof sharePreview !== "undefined" && sharePreview) {
    sharePreview.label = editorDraft.label;
  }
  if (editorIsCreateMode() || !target) {
    editorDraft.mode = "create";
    editorDraft.id = typeof currentExerciseId === "string" ? currentExerciseId : "";
    editorDraft.name = t("edit.defaultName");
    editorDraft.bars = 1;
    editorDraft.text = "";
  } else {
    editorDraft.id = target.id;
    editorDraft.name = typeof exerciseDisplayName === "function" ? exerciseDisplayName(target) : target.name;
    editorDraft.bars = target.bars;
    editorDraft.text = editorPlainLines(target.lines);
  }
  editorDraft.storedLines = editorDraft.mode === "create" || !target ? null : editorPlainLines(target.lines);
  var area = document.getElementById("allEdit");
  area.value = editorPlainLines(spec.lines);
  document.getElementById("editBars").value = String(spec.bars || 1);
  var nameField = document.getElementById("editName");
  if (nameField) {
    nameField.value = spec.name || "";
  }
  disarmEditorDelete();
  disarmEditorOpen();
  setEditorCommitsEnabled(true);
  syncEditorCommitLabels();
  clearEditorNotice();
  editorAskMenu(false);
  document.getElementById("textdiv").classList.add("is-open");
  document.body.classList.add("is-editing");
  setEditButton(true);
  syncEditorFaceName();
  refreshEditor();
  placeEditor();
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
  area.scrollTop = 0;
  area.setSelectionRange(0, 0);
  if (window.matchMedia("(pointer: fine)").matches) {
    area.focus();
  }
  refreshEditor();
}

function editorCancel() {
  if (!editorIsOpen()) {
    return;
  }
  if (typeof sharePreview !== "undefined" && sharePreview && typeof cancelSharePreview === "function") {
    cancelSharePreview();
    return;
  }
  var face = document.getElementById("exerciseFace");
  if (face && typeof setComboLabel === "function") {
    setComboLabel(face, editorDraft.label);
  }
  currentExerciseId = editorDraft.id;
  selectExerciseChip(editorDraft.id);
  editorCloseQuiet();
  if (typeof chooseExerciseFont === "function") {
    chooseExerciseFont();
  }
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
}

var EDITOR_FILE_VERSION = 1;

function editorFileText(lines, bars, name) {
  var out = "# eization " + EDITOR_FILE_VERSION + "\n# bars " + clampEditorBars(bars) + "\n";
  var clean = String(name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  if (clean) {
    out += "# name " + clean.slice(0, 60) + "\n";
  }
  return out + lines.join("\n") + "\n";
}

function readEditorFile(text) {
  var raw = String(text || "").replace(/^\uFEFF/, "");
  var parts = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var bars = null;
  var version = null;
  var name = null;
  var body = [];
  var i;
  for (i = 0; i < parts.length; i++) {
    var line = parts[i];
    var barsMatch = line.match(/^\s*#\s*bars\s+(\d+)\s*$/i);
    if (barsMatch) {
      bars = clampEditorBars(barsMatch[1]);
      continue;
    }
    var nameMatch = line.match(/^\s*#\s*name\s+(.+?)\s*$/i);
    if (nameMatch) {
      name = nameMatch[1].slice(0, 60);
      continue;
    }
    var header = line.match(/^\s*#\s*eization(?:\s+(\d+))?\s*$/i);
    if (header) {
      version = header[1] ? parseInt(header[1], 10) : 1;
      continue;
    }
    if (/^\s*#/.test(line)) {
      continue;
    }
    body.push(line);
  }
  return {
    lines: editorLinesFrom(body.join("\n")),
    bars: bars,
    name: name,
    version: version
  };
}

function editorSaveFile() {
  if (!editorIsOpen()) {
    return;
  }
  var lines = editorLinesFrom(document.getElementById("allEdit").value);
  if (!lines.length) {
    editorNotice(t("edit.oneLine"));
    return;
  }
  if (lines.length > 500) {
    editorNotice(t("edit.tooMany"));
    return;
  }
  var bars = clampEditorBars(document.getElementById("editBars").value);
  document.getElementById("editBars").value = String(bars);
  var name = editorNameValue();
  var blob = new Blob([editorFileText(lines, bars, name)], { type: "text/plain;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "eization.eiz";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1500);
  editorStatus(t("edit.downloaded"));
  if (typeof track === "function") {
    track("edit_download");
  }
}

function editorOpenFile(file) {
  if (!editorIsOpen() || !file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var parsed = readEditorFile(String(reader.result || ""));
    if (parsed.version && parsed.version > EDITOR_FILE_VERSION) {
      editorNotice(t("desk.newer"));
      return;
    }
    if (!parsed.lines.length) {
      editorNotice(t("edit.noLines"));
      return;
    }
    if (parsed.lines.length > 500) {
      editorNotice(t("edit.tooMany"));
      return;
    }
    var area = document.getElementById("allEdit");
    area.value = parsed.lines.join("\n");
    if (parsed.bars) {
      document.getElementById("editBars").value = String(parsed.bars);
    }
    if (parsed.name) {
      var nameField = document.getElementById("editName");
      if (nameField) {
        nameField.value = parsed.name;
      }
      syncEditorFaceName();
    }
    editorNotice(t("edit.uploadReplaced"));
    refreshEditor();
    if (typeof track === "function") {
      track("edit_upload");
    }
    area.focus();
  };
  reader.onerror = function () {
    editorNotice(t("edit.badFile"));
  };
  reader.readAsText(file);
}

var editorDeleteTimer = null;
var editorOpenTimer = null;
var editorStaleTimer = null;

function editorStoredLinesNow(id) {
  var row = typeof getDeskExercise === "function" ? getDeskExercise(id) : null;
  if (!row) {
    return null;
  }
  return editorPlainLines(row.lines);
}

function editorLinesChangedUnderfoot() {
  var now;
  if (editorIsCreateMode() || editorDraft.storedLines == null) {
    return false;
  }
  now = editorStoredLinesNow(editorDraft.id);
  if (now == null) {
    return false;
  }
  return now !== editorDraft.storedLines;
}

function disarmEditorStale() {
  var update = document.getElementById("editUpdate");
  var armed = !!(update && update.classList.contains("is-armed"));
  if (update) {
    update.classList.remove("is-armed");
  }
  if (editorStaleTimer) {
    clearTimeout(editorStaleTimer);
    editorStaleTimer = null;
  }
  if (armed) {
    var error = document.getElementById("editError");
    if (error && error.textContent === t("edit.staleAsk")) {
      clearEditorNotice();
    }
    syncEditorCommitLabels();
    refreshEditorHint();
  }
}

function armEditorStale() {
  var update = document.getElementById("editUpdate");
  disarmEditorDelete();
  if (update) {
    update.classList.add("is-armed");
    update.textContent = t("edit.staleAsk");
    update.setAttribute("aria-label", t("edit.staleAsk"));
  }
  editorNotice(t("edit.staleAsk"));
  refreshEditorHint();
  if (editorStaleTimer) {
    clearTimeout(editorStaleTimer);
  }
  editorStaleTimer = setTimeout(disarmEditorStale, 4000);
}

function disarmEditorDelete() {
  var del = document.getElementById("editDelete");
  if (del) {
    del.classList.remove("is-armed");
    del.textContent = t("edit.delete");
  }
  if (editorDeleteTimer) {
    clearTimeout(editorDeleteTimer);
    editorDeleteTimer = null;
  }
  disarmEditorStale();
  if (editorIsOpen()) {
    setEditorCommitsEnabled(true);
    refreshEditorHint();
  }
}

function armEditorDelete() {
  disarmEditorStale();
  var del = document.getElementById("editDelete");
  if (del) {
    del.classList.add("is-armed");
    del.textContent = t("edit.deleteAsk");
  }
  setEditorCommitsEnabled(false);
  editorNotice(t("edit.deleteAsk"));
  refreshEditorHint();
  if (editorDeleteTimer) {
    clearTimeout(editorDeleteTimer);
  }
  editorDeleteTimer = setTimeout(disarmEditorDelete, 4000);
}

function disarmEditorOpen() {
  var open = document.getElementById("editOpen");
  if (open) {
    open.classList.remove("is-armed");
  }
  if (editorOpenTimer) {
    clearTimeout(editorOpenTimer);
    editorOpenTimer = null;
  }
}

function armEditorOpen() {
  var open = document.getElementById("editOpen");
  if (open) {
    open.classList.add("is-armed");
  }
  editorNotice(t("edit.uploadWill"));
  if (editorOpenTimer) {
    clearTimeout(editorOpenTimer);
  }
  editorOpenTimer = setTimeout(disarmEditorOpen, 4000);
}

function editorAskOpen() {
  if (!editorIsOpen()) {
    return;
  }
  var open = document.getElementById("editOpen");
  if (editorIsDirty() && open && !open.classList.contains("is-armed")) {
    armEditorOpen();
    return;
  }
  disarmEditorOpen();
  document.getElementById("editFile").click();
}

function resolveEditorName(raw) {
  var name = String(raw || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  if (!name) {
    name = t("edit.defaultName");
    editorStatus(t("edit.namedDefault"));
    var field = document.getElementById("editName");
    if (field) {
      field.value = name;
    }
  }
  if (!editorIsCreateMode() && typeof canonicalExerciseName === "function") {
    var desk = typeof getDeskExercise === "function" ? getDeskExercise(editorDraft.id) : null;
    name = canonicalExerciseName(desk && desk.seedId, name);
  }
  if (name.length > 60) {
    name = name.slice(0, 60);
  }
  return name;
}

function editorApplyLanguage() {
  var buttons = document.querySelectorAll("#editSymbols button");
  var i;
  var del = document.getElementById("editDelete");
  var field = document.getElementById("editName");
  var desk;
  var trimmed;
  setEditButton(editorIsOpen());
  syncEditorCommitLabels();
  var update = document.getElementById("editUpdate");
  if (update && update.classList.contains("is-armed")) {
    update.textContent = t("edit.staleAsk");
    update.setAttribute("aria-label", t("edit.staleAsk"));
  }
  refreshEditorHint();
  for (i = 0; i < buttons.length && i < EDITOR_SYMBOLS.length; i++) {
    buttons[i].setAttribute("aria-label", t(EDITOR_SYMBOLS[i].key));
    buttons[i].title = t(EDITOR_SYMBOLS[i].key);
  }
  if (del && del.classList.contains("is-armed")) {
    del.textContent = t("edit.deleteAsk");
  }
  if (!editorIsOpen() || !field) {
    refreshEditor();
    return;
  }
  trimmed = field.value.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  if (editorIsCreateMode() && typeof isStockCustomName === "function" && isStockCustomName(trimmed)) {
    field.value = t("edit.defaultName");
    editorDraft.name = field.value;
  } else if (!editorIsCreateMode()) {
    desk = typeof getDeskExercise === "function" ? getDeskExercise(editorDraft.id) : null;
    if (desk && desk.seedId && typeof exercises !== "undefined" && exercises[desk.seedId] && typeof canonicalExerciseName === "function" && canonicalExerciseName(desk.seedId, trimmed) === exercises[desk.seedId].label) {
      field.value = exerciseDisplayName(desk);
      editorDraft.name = field.value;
    }
  }
  syncEditorFaceName();
  refreshEditor();
}

function applyEditorToReel(lines, bars) {
  var items = [];
  for (var i = 0; i < lines.length; i++) {
    items.push(lineToItem(lines[i]));
  }
  newExercise(items, bars);
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
}

function editorUpdate() {
  if (!editorIsOpen()) {
    return;
  }
  if (editorIsCreateMode()) {
    editorSaveAsNew();
    return;
  }
  if (!editorIsDirty()) {
    editorCancel();
    return;
  }
  var lines = editorLinesFrom(document.getElementById("allEdit").value);
  if (!lines.length) {
    editorNotice(t("edit.oneLine"));
    return;
  }
  if (lines.length > 500) {
    editorNotice(t("edit.tooMany"));
    return;
  }
  var bars = clampEditorBars(document.getElementById("editBars").value);
  document.getElementById("editBars").value = String(bars);
  var name = resolveEditorName(editorNameValue());
  var updateButton = document.getElementById("editUpdate");
  if (editorLinesChangedUnderfoot() && (!updateButton || !updateButton.classList.contains("is-armed"))) {
    armEditorStale();
    return;
  }
  disarmEditorStale();
  var saved = typeof updateDeskExercise === "function"
    ? updateDeskExercise(editorDraft.id, { name: name, bars: bars, lines: lines })
    : null;
  if (!saved) {
    editorNotice(t("edit.noUpdate"));
    return;
  }
  var fromShare = typeof sharePreview !== "undefined" && !!sharePreview;
  currentExerciseId = saved.id;
  editorCloseQuiet();
  if (fromShare && typeof finishShareEdit === "function") {
    finishShareEdit();
  }
  applyEditorToReel(saved.lines, saved.bars);
  if (fromShare && typeof showDeskNote === "function") {
    showDeskNote(t("share.updated"));
  }
  if (fromShare && typeof offerHelloAfterShare === "function") {
    offerHelloAfterShare();
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
  if (typeof track === "function") {
    track("edit_update", { exercise_id: typeof analyticsExerciseId === "function" ? analyticsExerciseId() : "custom" });
  }
}

function editorSaveAsNew() {
  if (!editorIsOpen()) {
    return;
  }
  var lines = editorLinesFrom(document.getElementById("allEdit").value);
  if (!lines.length) {
    editorNotice(t("edit.oneLine"));
    return;
  }
  if (lines.length > 500) {
    editorNotice(t("edit.tooMany"));
    return;
  }
  var list = typeof listDeskExercises === "function" ? listDeskExercises() : [];
  if (typeof DESK_EXERCISE_CAP === "number" && list.length >= DESK_EXERCISE_CAP) {
    editorNotice(t("edit.removeFirst"));
    return;
  }
  var bars = clampEditorBars(document.getElementById("editBars").value);
  document.getElementById("editBars").value = String(bars);
  var name = resolveEditorName(editorNameValue());
  var fromShare = typeof sharePreview !== "undefined" && !!sharePreview;
  var part = { name: name, bars: bars, lines: lines };
  if (fromShare && typeof shareOffer !== "undefined" && shareOffer && shareOffer.shareId) {
    part.shareId = shareOffer.shareId;
  }
  var created = typeof createDeskExercise === "function"
    ? createDeskExercise(part)
    : null;
  if (!created) {
    return;
  }
  currentExerciseId = created.id;
  editorCloseQuiet();
  if (fromShare && typeof finishShareEdit === "function") {
    finishShareEdit();
  }
  applyEditorToReel(created.lines, created.bars);
  if (fromShare && typeof offerHelloAfterShare === "function") {
    offerHelloAfterShare();
  }
  if (typeof showDeskNote === "function") {
    showDeskNote(t("edit.added"));
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
  }
  if (typeof track === "function") {
    track("edit_save_as", { exercise_id: "custom" });
  }
}

function editorDelete() {
  if (!editorIsOpen()) {
    return;
  }
  if (editorIsCreateMode()) {
    editorNotice(t("edit.nothingDelete"));
    return;
  }
  var list = typeof listDeskExercises === "function" ? listDeskExercises() : [];
  if (list.length <= 1) {
    editorNotice(t("edit.keepOne"));
    return;
  }
  var del = document.getElementById("editDelete");
  if (del && !del.classList.contains("is-armed")) {
    armEditorDelete();
    return;
  }
  var id = editorDraft.id;
  var removedId = typeof analyticsExerciseId === "function" ? analyticsExerciseId() : "custom";
  disarmEditorDelete();
  if (typeof deleteDeskExercise !== "function" || !deleteDeskExercise(id)) {
    return;
  }
  if (typeof track === "function") {
    track("edit_delete", { exercise_id: removedId });
  }
  currentExerciseId = typeof firstDeskExerciseId === "function" ? firstDeskExerciseId() : "";
  editorCloseQuiet();
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (typeof SelectExercise === "function") {
    SelectExercise();
  }
  if (typeof showDeskNote === "function") {
    showDeskNote(t("edit.removed"));
  }
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
}

function ToggleEdit() {
  if (editorIsOpen()) {
    editorUpdate();
  } else {
    editorOpen();
  }
}

function buildEditorSymbols() {
  var row = document.getElementById("editSymbols");
  if (!row || row.childNodes.length) {
    return;
  }
  for (var i = 0; i < EDITOR_SYMBOLS.length; i++) {
    var spec = EDITOR_SYMBOLS[i];
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = spec.char;
    button.setAttribute("aria-label", t(spec.key));
    button.title = t(spec.key);
    var insert = spec.insert || spec.char;
    if (!spec.insert && spec.char === "\u00B7") {
      insert = " \u00B7 ";
    }
    button.setAttribute("data-symbol", insert);
    row.appendChild(button);
  }
}

var SHARE_URL_MAX = 8000;

function newShareId() {
  var alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  var out = "";
  var i;
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    var bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    for (i = 0; i < 8; i++) {
      out += alphabet[bytes[i] % 36];
    }
    return out;
  }
  for (i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * 36)];
  }
  return out;
}

function shareEncode(text) {
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function shareDecode(text) {
  var pad = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  while (pad.length % 4) {
    pad += "=";
  }
  return decodeURIComponent(escape(atob(pad)));
}

function shareHashFromPayload(payload) {
  if (!payload || payload.v !== 1 || typeof shareSnapshot !== "function") {
    return "";
  }
  var snap = shareSnapshot({
    id: payload.id,
    name: payload.name,
    bars: payload.bars,
    lines: payload.lines
  });
  if (!snap) {
    return "";
  }
  return "#s=" + shareEncode(JSON.stringify({
    v: 1,
    id: snap.shareId,
    name: snap.name,
    bars: snap.bars,
    lines: snap.lines
  }));
}

function sharePageBase() {
  var link = document.querySelector("link[rel='canonical']");
  var url = link && link.href ? link.href : window.location.href;
  return String(url).split("#")[0].split("?")[0];
}

function shareExerciseUrl(payload, base) {
  var hash = shareHashFromPayload(payload);
  if (!hash) {
    return "";
  }
  var root = base == null ? sharePageBase() : String(base);
  var url = root + hash;
  if (url.length > SHARE_URL_MAX) {
    return "";
  }
  return url;
}

function readShareHash(hash) {
  var text = String(hash || "");
  if (text.charAt(0) === "#") {
    text = text.slice(1);
  }
  if (text.indexOf("s=") !== 0) {
    return null;
  }
  var json;
  try {
    json = JSON.parse(shareDecode(text.slice(2)));
  } catch (err) {
    return null;
  }
  if (!json || json.v !== 1 || typeof shareSnapshot !== "function") {
    return null;
  }
  return shareSnapshot({
    id: json.id,
    name: json.name,
    bars: json.bars,
    lines: json.lines
  });
}

var CHAT_URL_MAX = 2000;

var CHAT_TARGETS = {
  chatgpt: { bare: "https://chatgpt.com/", query: "https://chatgpt.com/?q=" },
  claude: { bare: "https://claude.ai/new", query: "https://claude.ai/new?q=" },
  gemini: { bare: "https://gemini.google.com/app", query: "https://gemini.google.com/app?q=" }
};

function chatPromptRules(lang) {
  if (lang === "es") {
    return [
      "Ayúdame con un ejercicio de eization. Un ejemplo a la vez, con el metrónomo. Cada uno sale una vez y luego cambia el orden.",
      "Un ejemplo por línea. Sin título, sin # eization, sin #s=. Signos, no palabras ni HTML. \" · \" separa lo que se toca de un texto.",
      "Añade notas: una línea por escritura. Naturales una vez (C D E F G A B). El resto en sostenido y bemol. Ejemplo: B♭ · ♭7 de C y A♯ · ♭7 de C. Cada grado del recuadro, sobre la fundamental. Si no hay, pregunta una vez y sugiere C.",
      "Si hay líneas, di qué ejercicio es, qué necesita una buena línea, ofrece un paso y pregunta. No reescribas hasta que lo pidan. Si el recuadro está vacío, ofrece tres comienzos (notas, escalas o acordes) y pregunta cuál.",
      "Al terminar, un bloque, un ejemplo por línea. Diles que lo copien, lo peguen en Editar y pulsen Actualizar. Guardar como nuevo conserva el anterior."
    ].join("\n\n");
  }
  return [
    "Help me write an eization exercise. One example shows at a time, with the metronome. Each comes up once, then the order changes.",
    "Write one example per line. No title, no # eization header, no #s= link. Signs, not words or HTML. \" · \" splits play from a caption.",
    "Add notes: one line per spelling. Naturals once (C D E F G A B). Other pitches sharp and flat. Example: B♭ · ♭7 of C and A♯ · ♭7 of C. Every degree in the box, on the named root. No root: ask once, suggest C.",
    "If there are lines, say what the exercise is, name what a good line needs, offer a next step, and ask. Do not rewrite until they ask. If the box is empty, offer three starters (notes, scales, or changes with a caption) and ask which to write.",
    "When they finish, one block, one per line. Tell them to copy it, paste it into the eization Edit box, and press Update. Save as new keeps the old exercise."
  ].join("\n\n");
}

function buildChatPrompt(spec) {
  var lang = spec && spec.lang === "es" ? "es" : "en";
  var name = spec && spec.name ? String(spec.name) : "";
  var bars = spec && spec.bars ? spec.bars : 1;
  var lines = spec && spec.lines ? spec.lines : [];
  var body = [];
  var i;
  body.push(chatPromptRules(lang));
  body.push("");
  if (lang === "es") {
    body.push("Nombre: " + name);
    body.push("Compases: " + bars);
  } else {
    body.push("Name: " + name);
    body.push("Bars: " + bars);
  }
  body.push("");
  if (lines.length) {
    body.push(lang === "es" ? "Ejemplos actuales:" : "Current examples:");
    for (i = 0; i < lines.length; i++) {
      body.push(String(lines[i]));
    }
  } else {
    body.push(lang === "es" ? "El recuadro está vacío." : "The box is empty.");
  }
  return body.join("\n");
}

function chatAskUrl(prompt, target) {
  var spec = CHAT_TARGETS[target] || CHAT_TARGETS.chatgpt;
  var href = spec.query + encodeURIComponent(prompt || "");
  if (href.length > CHAT_URL_MAX) {
    return { href: spec.bare, copy: true };
  }
  return { href: href, copy: false };
}

function editorAskMenu(open) {
  var menu = document.getElementById("editAskMenu");
  var button = document.getElementById("editAsk");
  if (!menu || !button) {
    return;
  }
  menu.hidden = !open;
  button.setAttribute("aria-expanded", open ? "true" : "false");
  refreshEditorHint();
}

function editorOpenChat(target) {
  var lines;
  var bars;
  var prompt;
  var ask;
  if (!editorIsOpen()) {
    return;
  }
  lines = editorLinesFrom(document.getElementById("allEdit").value);
  if (lines.length > 500) {
    editorNotice(t("edit.tooMany"));
    return;
  }
  bars = clampEditorBars(document.getElementById("editBars").value);
  document.getElementById("editBars").value = String(bars);
  prompt = buildChatPrompt({
    name: editorNameValue(),
    bars: bars,
    lines: lines,
    lang: typeof eizationLang === "string" ? eizationLang : "en"
  });
  ask = chatAskUrl(prompt, target);
  editorAskMenu(false);
  if ((target === "chatgpt" || target === "claude" || target === "gemini") && typeof track === "function") {
    track("edit_ask", { model: target });
  }
  window.open(ask.href, "_blank", "noopener");
  if (!ask.copy || typeof copySupportText !== "function") {
    return;
  }
  copySupportText(prompt).then(function () {
    editorNotice(t("edit.askCopied"));
  }, function () {
    editorNotice(t("edit.askCopyFail"));
  });
}

function editorShare() {
  if (!editorIsOpen()) {
    return;
  }
  var lines = editorLinesFrom(document.getElementById("allEdit").value);
  if (!lines.length) {
    editorNotice(t("edit.oneLine"));
    return;
  }
  if (lines.length > 500) {
    editorNotice(t("edit.tooMany"));
    return;
  }
  var bars = clampEditorBars(document.getElementById("editBars").value);
  document.getElementById("editBars").value = String(bars);
  var shareId = "";
  var saved = null;
  if (!editorIsCreateMode() && editorDraft.id && typeof getDeskExercise === "function") {
    saved = getDeskExercise(editorDraft.id);
  }
  if (saved && saved.shareId) {
    shareId = saved.shareId;
  } else {
    shareId = newShareId();
  }
  var snap = typeof shareSnapshot === "function"
    ? shareSnapshot({ id: shareId, name: editorNameValue(), bars: bars, lines: lines })
    : null;
  var url = snap ? shareExerciseUrl({ v: 1, id: snap.shareId, name: snap.name, bars: snap.bars, lines: snap.lines }) : "";
  if (!url) {
    editorNotice(t("edit.shareLong"));
    return;
  }
  if (typeof track === "function") {
    track("edit_share");
  }
  if (saved && !saved.shareId && typeof updateDeskExercise === "function") {
    updateDeskExercise(saved.id, { shareId: shareId });
  }
  var copyOk = false;
  var sheet = false;
  if (navigator.share) {
    sheet = true;
    navigator.share({
      title: snap.name || "eization",
      text: t("share.text"),
      url: url
    }).catch(function (error) {
      if (error && error.name === "AbortError") {
        return;
      }
      if (!copyOk && typeof showDeskNote === "function") {
        showDeskNote(t("share.fail"));
      }
    });
  }
  if (typeof copySupportText === "function") {
    copySupportText(url).then(function () {
      copyOk = true;
      if (typeof showDeskNote === "function") {
        showDeskNote(t("share.copied"));
      }
    }, function () {
      if (!sheet && typeof showDeskNote === "function") {
        showDeskNote(t("share.fail"));
      }
    });
  } else if (!sheet && typeof showDeskNote === "function") {
    showDeskNote(t("share.fail"));
  }
}

function initEditor() {
  buildEditorSymbols();
  var edit = document.getElementById("edit");
  var area = document.getElementById("allEdit");
  var symbols = document.getElementById("editSymbols");
  edit.addEventListener("click", ToggleEdit);
  document.getElementById("editCancel").addEventListener("click", editorCancel);
  document.getElementById("editUpdate").addEventListener("click", editorUpdate);
  document.getElementById("editSaveAs").addEventListener("click", editorSaveAsNew);
  document.getElementById("editDelete").addEventListener("click", editorDelete);
  document.getElementById("editClearList").addEventListener("click", clearEditorList);
  document.getElementById("editSave").addEventListener("click", editorSaveFile);
  document.getElementById("editShare").addEventListener("click", editorShare);
  document.getElementById("editAsk").addEventListener("click", function () {
    var menu = document.getElementById("editAskMenu");
    editorAskMenu(!!(menu && menu.hidden));
  });
  document.getElementById("editAskChatgpt").addEventListener("click", function () {
    editorOpenChat("chatgpt");
  });
  document.getElementById("editAskClaude").addEventListener("click", function () {
    editorOpenChat("claude");
  });
  document.getElementById("editAskGemini").addEventListener("click", function () {
    editorOpenChat("gemini");
  });
  document.getElementById("editOpen").addEventListener("click", editorAskOpen);
  refreshEditorHint();
  document.getElementById("editFile").addEventListener("change", function () {
    var input = this;
    var file = input.files && input.files[0];
    input.value = "";
    if (file) {
      editorOpenFile(file);
    }
  });
  var nameField = document.getElementById("editName");
  if (nameField) {
    nameField.addEventListener("input", function () {
      disarmEditorDelete();
      clearEditorNotice();
      syncEditorFaceName();
      refreshEditorHint();
    });
  }
  var duplicate = document.getElementById("editDuplicate");
  duplicate.addEventListener("pointerdown", function (event) {
    event.preventDefault();
  });
  duplicate.addEventListener("click", duplicateEditorLine);
  symbols.addEventListener("pointerdown", function (event) {
    var button = event.target.closest("button");
    if (!button) {
      return;
    }
    event.preventDefault();
    insertEditorText(button.getAttribute("data-symbol") || "");
  });
  area.addEventListener("input", function () {
    convertEditorCodes();
    disarmEditorDelete();
    clearEditorNotice();
    refreshEditor();
  });
  area.addEventListener("keyup", refreshEditor);
  area.addEventListener("click", refreshEditor);
  document.addEventListener("selectionchange", function () {
    if (editorIsOpen() && document.activeElement === area) {
      refreshEditor();
    }
  });
  area.addEventListener("paste", function (event) {
    var data = event.clipboardData;
    if (!data) {
      return;
    }
    var text = data.getData("text/plain");
    if (!text) {
      text = data.getData("text/html");
    }
    if (!text) {
      return;
    }
    event.preventDefault();
    var cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(function (line) {
      var decoded = itemToLine(line);
      return decoded || line.replace(/^\s+|\s+$/g, "");
    }).join("\n");
    insertEditorText(cleaned);
  });
  area.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      editorCancel();
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      editorUpdate();
    }
  });
  document.getElementById("editBars").addEventListener("input", function () {
    disarmEditorDelete();
    clearEditorNotice();
    refreshEditorHint();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && editorIsOpen() && event.target !== area) {
      editorCancel();
    }
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", placeEditor);
    window.visualViewport.addEventListener("scroll", placeEditor);
  }
}

initEditor();
