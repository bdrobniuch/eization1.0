var editorDraft = {
  label: "",
  id: "",
  text: "",
  bars: 1
};

var EDITOR_SYMBOLS = [
  { char: "\u266F", label: "Sharp" },
  { char: "\u266D", label: "Flat" },
  { char: "\u266E", label: "Natural" },
  { char: "\u2206", label: "Major seventh" },
  { char: "\u00B0", label: "Diminished" },
  { char: "\u00F8", label: "Half-diminished" },
  { char: "+", label: "Augmented" },
  { char: "\u2193", label: "Down" },
  { char: "\u2191", label: "Up" },
  { char: "\u2192", label: "Arrow" },
  { char: "|", label: "Bar line" },
  { char: "%", label: "Repeat the chord" },
  { char: "\u00B7", label: "Caption" },
  { char: "\u2612", label: "Played" },
  { char: "\u2610", label: "Open" },
  { char: "\uD834\uDD00", label: "Staff barline" }
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
      return '<span class="prog-changes">' + escapeEditorHtml(left) + '</span><span class="prog-name">' + escapeEditorHtml(right) + '</span>';
    }
  }
  return escapeEditorHtml(text);
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

function editorIsDirty() {
  if (!editorIsOpen()) {
    return false;
  }
  var area = document.getElementById("allEdit");
  var bars = clampEditorBars(document.getElementById("editBars").value);
  var text = editorLinesFrom(area.value).join("\n");
  return text !== editorDraft.text || bars !== editorDraft.bars;
}

function editorNotice(message) {
  var error = document.getElementById("editError");
  if (!error) {
    return;
  }
  error.hidden = false;
  error.textContent = message;
}

function clearEditorNotice() {
  var error = document.getElementById("editError");
  if (!error) {
    return;
  }
  error.hidden = true;
  error.textContent = "";
}

function setEditButton(open) {
  var button = document.getElementById("edit");
  if (!button) {
    return;
  }
  var icon = button.querySelector("i");
  button.setAttribute("aria-pressed", open ? "true" : "false");
  button.title = open ? "Done" : "Edit exercise";
  button.setAttribute("aria-label", open ? "Done" : "Edit exercise");
  if (icon) {
    icon.className = open ? "fa-solid fa-check" : "fa-solid fa-pen-to-square";
  }
}

function clearExerciseChips() {
  var menu = document.getElementById("exerciseMenu");
  if (!menu) {
    return;
  }
  var choices = menu.querySelectorAll("[data-value]");
  for (var i = 0; i < choices.length; i++) {
    choices[i].setAttribute("aria-selected", "false");
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
    setComboLabel(face, "Custom");
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
  setEditButton(false);
  clearEditorNotice();
  if (typeof renderPreview === "function") {
    renderPreview();
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
    count.textContent = total === 1 ? "1 value" : total + " values";
  }
  if (!preview) {
    return;
  }
  var line = itemToLine(currentEditorLine());
  preview.classList.toggle("is-empty", !line);
  preview.innerHTML = line ? lineToItem(line) : "";
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

function editorOpen() {
  if (typeof closeExercisePanel === "function") {
    closeExercisePanel();
  }
  if (typeof closeGroovePanel === "function") {
    closeGroovePanel();
  }
  var face = document.getElementById("exerciseFace");
  var shown = face ? face.querySelector(".combo-value") : null;
  editorDraft.label = shown ? shown.textContent : "";
  editorDraft.id = typeof currentExerciseId === "string" ? currentExerciseId : "";
  editorDraft.bars = typeof exerciseBars === "number" && exerciseBars > 0 ? exerciseBars : 1;
  var source = typeof chromaticScale !== "undefined" && chromaticScale ? chromaticScale : [];
  var lines = [];
  for (var i = 0; i < source.length; i++) {
    var line = itemToLine(source[i]);
    if (line) {
      lines.push(line);
    }
  }
  var area = document.getElementById("allEdit");
  area.value = lines.join("\n");
  editorDraft.text = lines.join("\n");
  document.getElementById("editBars").value = String(editorDraft.bars);
  clearEditorNotice();
  document.getElementById("textdiv").classList.add("is-open");
  document.body.classList.add("is-editing");
  setEditButton(true);
  if (face && typeof setComboLabel === "function") {
    setComboLabel(face, "Custom");
  }
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

function editorDone() {
  if (!editorIsOpen()) {
    return;
  }
  var lines = editorLinesFrom(document.getElementById("allEdit").value);
  if (!lines.length) {
    editorNotice("Add at least one line.");
    return;
  }
  if (lines.length > 500) {
    editorNotice("Keep it to 500 lines.");
    return;
  }
  var bars = clampEditorBars(document.getElementById("editBars").value);
  document.getElementById("editBars").value = String(bars);
  var text = lines.join("\n");
  if (text === editorDraft.text && bars === editorDraft.bars) {
    editorCancel();
    return;
  }
  var items = [];
  if (text === editorDraft.text) {
    var source = typeof chromaticScale !== "undefined" && chromaticScale ? chromaticScale : [];
    items = source.slice();
  } else {
    for (var i = 0; i < lines.length; i++) {
      items.push(lineToItem(lines[i]));
    }
  }
  var face = document.getElementById("exerciseFace");
  if (face && typeof setComboLabel === "function") {
    setComboLabel(face, "Custom");
  }
  currentExerciseId = "";
  clearExerciseChips();
  newExercise(items, bars);
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
}

function ToggleEdit() {
  if (editorIsOpen()) {
    editorDone();
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
    button.setAttribute("aria-label", spec.label);
    button.title = spec.label;
    button.setAttribute("data-symbol", spec.char === "\u00B7" ? " \u00B7 " : spec.char);
    row.appendChild(button);
  }
}

function initEditor() {
  buildEditorSymbols();
  var edit = document.getElementById("edit");
  var area = document.getElementById("allEdit");
  var symbols = document.getElementById("editSymbols");
  edit.addEventListener("click", ToggleEdit);
  document.getElementById("editCancel").addEventListener("click", editorCancel);
  document.getElementById("editDone").addEventListener("click", editorDone);
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
      editorDone();
    }
  });
  document.getElementById("editBars").addEventListener("input", clearEditorNotice);
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
