var editorDraft = {
  label: "",
  id: "",
  name: "",
  text: "",
  bars: 1,
  mode: "edit",
  storedLines: null
};

var editStaffWarnTimer = null;
var editStaffWarnLine = "";
var editorStaffHelpSelection = { start: 0, end: 0 };
var editorFocusIndex = 0;
var editorViewOverride = null;

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
  { char: "~", key: "sym.tie" },
  { char: "\uD834\uDD0E", key: "sym.simile" },
  { char: "\u00B7", key: "sym.caption" },
  { char: "\u2612", key: "sym.played" },
  { char: "\u2610", key: "sym.open" },
  { char: "\uD834\uDD00", key: "sym.staff" }
];

var editorNote = {
  acc: "",
  oct: 4,
  dur: ""
};

var EDITOR_STAFF_SAMPLES = [
  "C4 E4 G4",
  "@treble @key=Eb Eb4 F4 G4 Ab4 Bb4",
  "[E3h G3h B3h D4h]^C\u22067_3",
  "/q /e rq",
  "C4q~ | C4q",
  "(3 C4e D4e E4e)",
  "^G / / / / | ^D / / ^A / /",
  "mf C4q cresc C4q f C4q"
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

function lineLooksLikeHtml(raw) {
  return /<[a-zA-Z/!]|&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/.test(raw);
}

function itemToLine(html) {
  var raw = decodeJsEscapes(String(html || ""));
  if (!raw) {
    return "";
  }
  if (lineLooksLikeHtml(raw)) {
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

function editorFlushFocus() {
  var sheet = document.getElementById("textdiv");
  if (sheet && sheet.classList.contains("is-edit-focus")) {
    editorSyncFocusToArea();
  }
}

function editorIsDirty() {
  if (!editorIsOpen()) {
    return false;
  }
  editorFlushFocus();
  var area = document.getElementById("allEdit");
  var bars = clampEditorBars(document.getElementById("editBars").value);
  var text = editorLinesFrom(area.value).join("\n");
  var name = editorNameValue().replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  var draftName = (editorDraft.name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  return text !== editorDraft.text || bars !== editorDraft.bars || name !== draftName;
}

function editorLeaveIfClean(message) {
  if (!editorIsOpen()) {
    return true;
  }
  if (editorIsDirty()) {
    editorNotice(message || t("edit.finish"));
    return false;
  }
  editorCancel();
  return true;
}

function editorDismissEscape() {
  if (editorCloseStaffHelp()) {
    return;
  }
  if (editorCloseSymbols()) {
    return;
  }
  if (editorCloseMore()) {
    return;
  }
  editorLeaveIfClean();
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
    if (typeof sharePreview !== "undefined" && sharePreview) {
      saveAs.hidden = false;
    } else {
      saveAs.hidden = !editorIsDirty();
    }
  }
  if (del) {
    del.hidden = typeof sharePreview !== "undefined" && !!sharePreview;
  }
}

function editorMoreIsOpen() {
  var menu = document.getElementById("editMoreMenu");
  return !!(menu && !menu.hidden);
}

function editorCloseMore() {
  var menu = document.getElementById("editMoreMenu");
  var button = document.getElementById("editMore");
  if (!menu || menu.hidden) {
    return false;
  }
  editorAskMenu(false);
  menu.hidden = true;
  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
  refreshEditorHint();
  return true;
}

function editorOpenMore() {
  var menu = document.getElementById("editMoreMenu");
  var button = document.getElementById("editMore");
  if (!menu) {
    return;
  }
  menu.hidden = false;
  if (button) {
    button.setAttribute("aria-expanded", "true");
  }
  refreshEditorHint();
}

function editorToggleMore() {
  if (editorMoreIsOpen()) {
    editorCloseMore();
  } else {
    editorOpenMore();
  }
}

function editorSymbolsIsOpen() {
  var panel = document.getElementById("editSymbols");
  return !!(panel && !panel.hidden);
}

function editorCloseSymbols() {
  var panel = document.getElementById("editSymbols");
  var button = document.getElementById("editSymbolsToggle");
  if (!panel || panel.hidden) {
    return false;
  }
  panel.hidden = true;
  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
  return true;
}

function editorOpenSymbols() {
  var panel = document.getElementById("editSymbols");
  var button = document.getElementById("editSymbolsToggle");
  if (!panel) {
    return;
  }
  panel.hidden = false;
  if (button) {
    button.setAttribute("aria-expanded", "true");
  }
}

function editorToggleSymbols() {
  if (editorSymbolsIsOpen()) {
    editorCloseSymbols();
  } else {
    editorOpenSymbols();
  }
}

function refreshEditorHint() {
  var hint = document.getElementById("editHint");
  if (!hint) {
    return;
  }
  var saveAs = document.getElementById("editSaveAs");
  if (saveAs && !editorIsCreateMode()) {
    if (typeof sharePreview !== "undefined" && sharePreview) {
      saveAs.hidden = false;
    } else {
      saveAs.hidden = !editorIsDirty();
    }
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
    if (choices[i].getAttribute("data-value") === id) {
      choices[i].setAttribute("aria-current", "true");
    } else {
      choices[i].removeAttribute("aria-current");
    }
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

function editorStaffHelpIsOpen() {
  var panel = document.getElementById("editStaffPanel");
  return !!(panel && !panel.hidden);
}

function editorCloseStaffHelp(options) {
  options = options || {};
  var panel = document.getElementById("editStaffPanel");
  var btn = document.getElementById("editStaffHelp");
  var sheet = document.getElementById("textdiv");
  if (!panel || panel.hidden) {
    return false;
  }
  panel.hidden = true;
  if (sheet) {
    sheet.classList.remove("is-staff-help");
  }
  if (btn) {
    btn.setAttribute("aria-expanded", "false");
  }
  if (options.focus !== false) {
    if (editorIsFocusMode()) {
      var field = document.getElementById("editFocusLine");
      if (field && window.matchMedia("(pointer: fine)").matches) {
        field.focus();
        try {
          field.setSelectionRange(editorStaffHelpSelection.start, editorStaffHelpSelection.end);
        } catch (errFocus) {}
      }
    } else {
      var area = document.getElementById("allEdit");
      if (area) {
        if (window.matchMedia("(pointer: fine)").matches) {
          area.focus();
        }
        try {
          area.setSelectionRange(editorStaffHelpSelection.start, editorStaffHelpSelection.end);
        } catch (err) {}
      }
    }
  }
  return true;
}

function editorOpenStaffHelp() {
  var panel = document.getElementById("editStaffPanel");
  var btn = document.getElementById("editStaffHelp");
  var sheet = document.getElementById("textdiv");
  var closeBtn = document.getElementById("editStaffHelpClose");
  var area = document.getElementById("allEdit");
  if (!panel || !editorIsOpen()) {
    return;
  }
  editorCloseMore();
  editorCloseSymbols();
  if (editorIsFocusMode()) {
    var field = document.getElementById("editFocusLine");
    if (field) {
      editorStaffHelpSelection.start = field.selectionStart || 0;
      editorStaffHelpSelection.end = field.selectionEnd || 0;
    }
  } else if (area) {
    editorStaffHelpSelection.start = area.selectionStart || 0;
    editorStaffHelpSelection.end = area.selectionEnd || 0;
  }
  panel.hidden = false;
  if (sheet) {
    sheet.classList.add("is-staff-help");
  }
  if (btn) {
    btn.setAttribute("aria-expanded", "true");
  }
  if (closeBtn) {
    closeBtn.focus();
  }
}

function editorToggleStaffHelp() {
  if (editorStaffHelpIsOpen()) {
    editorCloseStaffHelp();
  } else {
    editorOpenStaffHelp();
  }
}

function clearEditStaffNote() {
  if (editStaffWarnTimer) {
    clearTimeout(editStaffWarnTimer);
    editStaffWarnTimer = null;
  }
  editStaffWarnLine = "";
  var note = document.getElementById("editStaffNote");
  if (note) {
    note.hidden = true;
    note.textContent = "";
  }
}

function scheduleEditStaffWarn(line) {
  var note = document.getElementById("editStaffNote");
  if (!note) {
    return;
  }
  if (editStaffWarnTimer) {
    clearTimeout(editStaffWarnTimer);
  }
  editStaffWarnLine = line;
  note.hidden = true;
  note.textContent = "";
  editStaffWarnTimer = setTimeout(function () {
    editStaffWarnTimer = null;
    if (!editorIsOpen()) {
      return;
    }
    var current = itemToLine(currentEditorLine());
    if (current !== editStaffWarnLine) {
      return;
    }
    note.textContent = t("edit.staffWarn");
    note.hidden = false;
  }, 400);
}

function editorCloseQuiet() {
  if (!editorIsOpen()) {
    return;
  }
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
  }
  editorCloseStaffHelp({ focus: false });
  editorCloseMore();
  editorCloseSymbols();
  clearEditStaffNote();
  var sheet = document.getElementById("textdiv");
  sheet.classList.remove("is-open", "is-edit-focus", "is-edit-list");
  sheet.style.display = "";
  document.body.classList.remove("is-editing");
  editorDraft.mode = "edit";
  editorViewOverride = null;
  editorFocusIndex = 0;
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

function editorDefaultViewMode() {
  return window.matchMedia("(max-width: 840px)").matches ? "focus" : "list";
}

function editorEffectiveViewMode() {
  return editorViewOverride || editorDefaultViewMode();
}

function editorIsFocusMode() {
  return editorIsOpen() && editorEffectiveViewMode() === "focus";
}

function editorRawLines() {
  var area = document.getElementById("allEdit");
  var value = area ? String(area.value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n") : "";
  if (!value) {
    return [""];
  }
  return value.split("\n");
}

function editorSetRawLines(lines) {
  var area = document.getElementById("allEdit");
  if (!area) {
    return;
  }
  if (!lines || !lines.length) {
    lines = [""];
  }
  area.value = lines.join("\n");
}

function editorCaretLineIndex() {
  var area = document.getElementById("allEdit");
  if (!area) {
    return 0;
  }
  var start = area.selectionStart || 0;
  var before = String(area.value || "").slice(0, start).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return before.split("\n").length - 1;
}

function editorClampFocusIndex(total) {
  if (total < 1) {
    total = 1;
  }
  if (editorFocusIndex < 0) {
    editorFocusIndex = 0;
  }
  if (editorFocusIndex >= total) {
    editorFocusIndex = total - 1;
  }
}

function editorSyncFocusToArea() {
  if (!editorIsOpen()) {
    return;
  }
  var field = document.getElementById("editFocusLine");
  if (!field) {
    return;
  }
  var lines = editorRawLines();
  editorClampFocusIndex(lines.length);
  lines[editorFocusIndex] = field.value;
  editorSetRawLines(lines);
}

function editorUpdateFocusChrome() {
  var indexEl = document.getElementById("editFocusIndex");
  var prev = document.getElementById("editFocusPrev");
  var next = document.getElementById("editFocusNext");
  var remove = document.getElementById("editFocusRemove");
  var lines = editorRawLines();
  editorClampFocusIndex(lines.length);
  if (indexEl) {
    indexEl.textContent = tr("edit.focusIndex", { n: editorFocusIndex + 1, total: lines.length });
  }
  if (prev) {
    prev.disabled = editorFocusIndex <= 0;
  }
  if (next) {
    next.disabled = editorFocusIndex >= lines.length - 1;
  }
  if (remove) {
    remove.disabled = lines.length <= 1 && !collapseEditorSpaces(lines[0] || "");
  }
}

function editorSyncFocusFromArea() {
  var field = document.getElementById("editFocusLine");
  var lines = editorRawLines();
  editorClampFocusIndex(lines.length);
  if (field) {
    field.value = lines[editorFocusIndex] || "";
  }
  editorUpdateFocusChrome();
}

function editorRefreshViewToggle() {
  var button = document.getElementById("editViewToggle");
  if (!button) {
    return;
  }
  var focus = editorEffectiveViewMode() === "focus";
  button.textContent = focus ? t("edit.allExamples") : t("edit.oneExample");
  button.setAttribute("aria-pressed", focus ? "true" : "false");
}

function editorApplyViewMode() {
  var sheet = document.getElementById("textdiv");
  if (!sheet) {
    return;
  }
  var wasFocus = sheet.classList.contains("is-edit-focus");
  var focus = editorEffectiveViewMode() === "focus";
  if (wasFocus) {
    editorSyncFocusToArea();
  }
  sheet.classList.toggle("is-edit-focus", focus);
  sheet.classList.toggle("is-edit-list", !focus);
  editorRefreshViewToggle();
  if (focus) {
    editorSyncFocusFromArea();
  }
}

function editorSetViewMode(mode) {
  editorViewOverride = mode === "focus" || mode === "list" ? mode : null;
  if (mode === "focus") {
    editorFocusIndex = editorCaretLineIndex();
  } else if (mode === "list") {
    editorSyncFocusToArea();
    var area = document.getElementById("allEdit");
    var lines = editorRawLines();
    editorClampFocusIndex(lines.length);
    if (area) {
      var start = 0;
      var i;
      for (i = 0; i < editorFocusIndex; i++) {
        start += (lines[i] || "").length + 1;
      }
      var end = start + (lines[editorFocusIndex] || "").length;
      area.focus();
      try {
        area.setSelectionRange(start, end);
      } catch (err) {}
    }
  }
  editorApplyViewMode();
  refreshEditor();
  if (mode === "focus") {
    var field = document.getElementById("editFocusLine");
    if (field && window.matchMedia("(pointer: fine)").matches) {
      field.focus();
      field.select();
    }
  }
}

function editorToggleViewMode() {
  if (!editorIsOpen()) {
    return;
  }
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
    editorSetViewMode("list");
  } else {
    editorSetViewMode("focus");
  }
}

function editorFocusGo(delta) {
  if (!editorIsFocusMode()) {
    return;
  }
  editorSyncFocusToArea();
  var lines = editorRawLines();
  editorClampFocusIndex(lines.length);
  var next = editorFocusIndex + delta;
  if (next < 0 || next >= lines.length) {
    return;
  }
  editorFocusIndex = next;
  editorSyncFocusFromArea();
  clearEditorNotice();
  refreshEditor();
  var field = document.getElementById("editFocusLine");
  if (field) {
    field.focus();
  }
}

function editorFocusAdd() {
  if (!editorIsFocusMode()) {
    return;
  }
  editorSyncFocusToArea();
  var lines = editorRawLines();
  if (lines.length >= 500) {
    editorNotice(t("edit.tooMany"));
    return;
  }
  editorClampFocusIndex(lines.length);
  lines.splice(editorFocusIndex + 1, 0, "");
  editorSetRawLines(lines);
  editorFocusIndex += 1;
  editorSyncFocusFromArea();
  clearEditorNotice();
  refreshEditor();
  var field = document.getElementById("editFocusLine");
  if (field) {
    field.focus();
  }
}

function editorFocusRemove() {
  if (!editorIsFocusMode()) {
    return;
  }
  editorSyncFocusToArea();
  var lines = editorRawLines();
  editorClampFocusIndex(lines.length);
  if (lines.length <= 1) {
    editorSetRawLines([""]);
    editorFocusIndex = 0;
  } else {
    lines.splice(editorFocusIndex, 1);
    editorSetRawLines(lines);
    if (editorFocusIndex >= lines.length) {
      editorFocusIndex = lines.length - 1;
    }
  }
  editorSyncFocusFromArea();
  clearEditorNotice();
  refreshEditor();
  var field = document.getElementById("editFocusLine");
  if (field) {
    field.focus();
  }
}

function currentEditorLine() {
  if (editorIsFocusMode()) {
    var field = document.getElementById("editFocusLine");
    return field ? field.value : "";
  }
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
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
    editorUpdateFocusChrome();
  }
  var total = visibleLineCount(area.value);
  if (count) {
    count.textContent = total === 1 ? t("edit.examplesOne") : tr("edit.examplesMany", { n: total });
  }
  editorRefreshViewToggle();
  if (!preview) {
    return;
  }
  var line = itemToLine(currentEditorLine());
  preview.classList.toggle("is-empty", !line);
  preview.classList.remove("is-staff");
  preview.innerHTML = "";
  if (!line) {
    clearEditStaffNote();
    refreshEditorHint();
    return;
  }
  var status =
    typeof staffNotationStatus === "function"
      ? staffNotationStatus(line)
      : { ok: false, notationIsh: false, music: line, caption: "" };
  if (status.ok && typeof renderMusicStaff === "function") {
    clearEditStaffNote();
    preview.classList.add("is-staff");
    var svg = renderMusicStaff(status.music, "current");
    if (svg) {
      var box = (svg.getAttribute("viewBox") || "").split(/\s+/);
      var w = parseFloat(box[2]);
      var h = parseFloat(box[3]);
      if (w > 0 && h > 0) {
        svg.setAttribute("width", String(Math.round(w)));
        svg.setAttribute("height", String(Math.round(h)));
      }
      var wrap = document.createElement("span");
      wrap.className = "prog-changes";
      wrap.appendChild(svg);
      preview.appendChild(wrap);
    }
    if (status.caption) {
      var cap = document.createElement("span");
      cap.className = "prog-name";
      cap.textContent = status.caption;
      preview.appendChild(cap);
    }
  } else {
    preview.innerHTML = lineToItem(line);
    if (status.notationIsh) {
      scheduleEditStaffWarn(line);
    } else {
      clearEditStaffNote();
    }
  }
  refreshEditorHint();
}

function insertEditorText(text, caretBack) {
  if (editorIsFocusMode()) {
    var field = document.getElementById("editFocusLine");
    if (!field) {
      return;
    }
    var start = field.selectionStart || 0;
    var end = field.selectionEnd || 0;
    var single = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (single.indexOf("\n") >= 0) {
      editorSyncFocusToArea();
      var lines = editorRawLines();
      editorClampFocusIndex(lines.length);
      var parts = single.split("\n").map(function (part) {
        var decoded = itemToLine(part);
        return decoded || part.replace(/^\s+|\s+$/g, "");
      });
      var head = (field.value || "").slice(0, start) + parts[0];
      var tail = (field.value || "").slice(end);
      var inserted = [head].concat(parts.slice(1));
      inserted[inserted.length - 1] = inserted[inserted.length - 1] + tail;
      var before = lines.slice(0, editorFocusIndex);
      var after = lines.slice(editorFocusIndex + 1);
      var next = before.concat(inserted, after);
      if (next.length > 500) {
        editorNotice(t("edit.tooMany"));
        return;
      }
      editorSetRawLines(next);
      editorFocusIndex = before.length + inserted.length - 1;
      editorSyncFocusFromArea();
      field.focus();
      var caret = (inserted[inserted.length - 1] || "").length - tail.length;
      if (caret < 0) {
        caret = 0;
      }
      try {
        field.setSelectionRange(caret, caret);
      } catch (err) {}
    } else {
      var value = field.value || "";
      field.value = value.slice(0, start) + single + value.slice(end);
      var back = caretBack > 0 ? caretBack : 0;
      var pos = start + single.length - back;
      if (pos < start) {
        pos = start;
      }
      field.focus();
      try {
        field.setSelectionRange(pos, pos);
      } catch (err2) {}
    }
    clearEditorNotice();
    refreshEditor();
    return;
  }
  var area = document.getElementById("allEdit");
  var areaStart = area.selectionStart || 0;
  var areaEnd = area.selectionEnd || 0;
  if (areaStart > area.value.length) {
    areaStart = area.value.length;
    areaEnd = areaStart;
  }
  var back = caretBack > 0 ? caretBack : 0;
  area.focus();
  if (typeof area.setRangeText === "function") {
    area.setRangeText(text, areaStart, areaEnd, "end");
  } else {
    area.value = area.value.slice(0, areaStart) + text + area.value.slice(areaEnd);
  }
  var caret = areaStart + String(text || "").length - back;
  if (caret < areaStart) {
    caret = areaStart;
  }
  try {
    area.setSelectionRange(caret, caret);
  } catch (errCaret) {}
  clearEditorNotice();
  refreshEditor();
}

function editorNotePitch(letter) {
  return String(letter || "C") + (editorNote.acc || "") + String(editorNote.oct || 4) + (editorNote.dur || "");
}

function editorSlashToken() {
  return "/" + (editorNote.dur || "q");
}

function editorRestToken() {
  return "r" + (editorNote.dur || "q");
}

function editorPaintNotePad() {
  var pad = document.getElementById("editNotePad");
  var buttons;
  var i;
  if (!pad) {
    return;
  }
  buttons = pad.querySelectorAll("button");
  for (i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    var letter = button.getAttribute("data-note");
    var label = "";
    if (letter) {
      label = tr("edit.noteInsert", { token: editorNotePitch(letter) });
    } else if (button.hasAttribute("data-acc")) {
      button.setAttribute("aria-pressed", editorNote.acc === button.getAttribute("data-acc") ? "true" : "false");
      label = t(button.getAttribute("data-label") || "sym.sharp");
    } else if (button.hasAttribute("data-oct")) {
      button.setAttribute("aria-pressed", String(editorNote.oct) === button.getAttribute("data-oct") ? "true" : "false");
      label = tr("edit.noteOctave", { n: button.getAttribute("data-oct") });
    } else if (button.hasAttribute("data-dur")) {
      button.setAttribute("aria-pressed", (editorNote.dur || "") === (button.getAttribute("data-dur") || "") ? "true" : "false");
      label = t(button.getAttribute("data-label") || "edit.noteQuarter");
    } else if (button.getAttribute("data-event") === "slash" || button.getAttribute("data-event") === "rest") {
      var shown = button.getAttribute("data-event") === "slash" ? editorSlashToken() : editorRestToken();
      button.textContent = shown;
      label = t(button.getAttribute("data-event") === "slash" ? "edit.noteSlash" : "edit.noteRest") + " " + shown;
    } else if (button.getAttribute("data-event")) {
      label = t(button.getAttribute("data-label") || "edit.noteBar");
    } else if (button.getAttribute("data-label")) {
      label = t(button.getAttribute("data-label"));
    }
    if (label) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
  }
}

function editorActivateSymbol(button) {
  var acc;
  var oct;
  var dur;
  if (!button) {
    return;
  }
  if (button.hasAttribute("data-acc")) {
    acc = button.getAttribute("data-acc") || "";
    editorNote.acc = editorNote.acc === acc ? "" : acc;
    editorPaintNotePad();
    return;
  }
  if (button.hasAttribute("data-oct")) {
    oct = parseInt(button.getAttribute("data-oct"), 10);
    editorNote.oct = oct === 3 || oct === 5 ? oct : 4;
    editorPaintNotePad();
    return;
  }
  if (button.hasAttribute("data-dur")) {
    dur = button.getAttribute("data-dur") || "";
    editorNote.dur = dur === "e" || dur === "e." ? dur : "";
    editorPaintNotePad();
    return;
  }
  if (button.getAttribute("data-note")) {
    insertEditorText(editorNotePitch(button.getAttribute("data-note")) + " ");
    return;
  }
  if (button.getAttribute("data-event") === "slash") {
    insertEditorText(editorSlashToken() + " ");
    return;
  }
  if (button.getAttribute("data-event") === "rest") {
    insertEditorText(editorRestToken() + " ");
    return;
  }
  if (button.getAttribute("data-event") === "bar") {
    insertEditorText("| ");
    return;
  }
  if (button.getAttribute("data-event") === "tie") {
    insertEditorText("~");
    return;
  }
  if (button.getAttribute("data-event") === "beam") {
    /* Braces only beam eighths and sixteenths. A quarter would stay text. */
    if (!editorNote.dur) {
      editorNote.dur = "e";
      editorPaintNotePad();
    }
    insertEditorText("{ }", 2);
    return;
  }
  insertEditorText(button.getAttribute("data-symbol") || "");
}

function editorAreaCaret() {
  var area = document.getElementById("allEdit");
  var start;
  if (!area) {
    return 0;
  }
  start = editorStaffHelpIsOpen() ? editorStaffHelpSelection.start || 0 : area.selectionStart || 0;
  if (start < 0) {
    start = 0;
  }
  if (start > area.value.length) {
    start = area.value.length;
  }
  return start;
}

function editorPutSample(line) {
  var sample = String(line || "").replace(/^\s+|\s+$/g, "");
  var lines;
  var area;
  var value;
  var start;
  var lineStart;
  var lineEnd;
  var next;
  var caret;
  if (!sample || !editorIsOpen()) {
    return;
  }
  disarmEditorDelete();
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
    lines = editorRawLines();
    editorClampFocusIndex(lines.length);
    if (!collapseEditorSpaces(lines[editorFocusIndex] || "")) {
      lines[editorFocusIndex] = sample;
    } else if (lines.length >= 500) {
      editorNotice(t("edit.tooMany"));
      return;
    } else {
      lines.splice(editorFocusIndex + 1, 0, sample);
      editorFocusIndex += 1;
    }
    editorSetRawLines(lines);
    editorSyncFocusFromArea();
    editorStaffHelpSelection.start = sample.length;
    editorStaffHelpSelection.end = sample.length;
  } else {
    area = document.getElementById("allEdit");
    if (!area) {
      return;
    }
    value = String(area.value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    start = editorAreaCaret();
    lineStart = value.lastIndexOf("\n", start - 1) + 1;
    lineEnd = value.indexOf("\n", start);
    if (lineEnd < 0) {
      lineEnd = value.length;
    }
    if (!collapseEditorSpaces(value.slice(lineStart, lineEnd))) {
      next = value.slice(0, lineStart) + sample + value.slice(lineEnd);
      caret = lineStart + sample.length;
    } else if (value.split("\n").length >= 500) {
      editorNotice(t("edit.tooMany"));
      return;
    } else {
      next = value.slice(0, lineEnd) + "\n" + sample + value.slice(lineEnd);
      caret = lineEnd + 1 + sample.length;
    }
    area.value = next;
    editorStaffHelpSelection.start = caret;
    editorStaffHelpSelection.end = caret;
    try {
      area.setSelectionRange(caret, caret);
    } catch (errSample) {}
  }
  clearEditorNotice();
  refreshEditor();
  if (editorStaffHelpIsOpen()) {
    editorCloseStaffHelp();
  }
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

function clearEditorList() {
  if (!editorIsOpen()) {
    return;
  }
  var area = document.getElementById("allEdit");
  area.value = "";
  area.setSelectionRange(0, 0);
  editorFocusIndex = 0;
  if (editorIsFocusMode()) {
    editorSyncFocusFromArea();
  }
  clearEditorNotice();
  refreshEditor();
  if (window.matchMedia("(pointer: fine)").matches) {
    if (editorIsFocusMode()) {
      var field = document.getElementById("editFocusLine");
      if (field) {
        field.focus();
      }
    } else {
      area.focus();
    }
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
  editorViewOverride = null;
  editorFocusIndex = 0;
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
  editorApplyViewMode();
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
    } else if (editorIsFocusMode()) {
      var focusField = document.getElementById("editFocusLine");
      if (focusField) {
        focusField.focus();
        focusField.select();
      }
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
  if (!editorLeaveIfClean()) {
    return;
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
  editorViewOverride = null;
  editorFocusIndex = 0;
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
  editorApplyViewMode();
  refreshEditor();
  placeEditor();
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
  area.scrollTop = 0;
  area.setSelectionRange(0, 0);
  if (window.matchMedia("(pointer: fine)").matches) {
    if (editorIsFocusMode()) {
      var focusField = document.getElementById("editFocusLine");
      if (focusField) {
        focusField.focus();
        focusField.select();
      }
    } else {
      area.focus();
    }
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
  var started = false;
  var i;
  for (i = 0; i < parts.length; i++) {
    var line = parts[i];
    if (!started) {
      if (/^\s*$/.test(line)) {
        continue;
      }
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
      started = true;
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
  editorFlushFocus();
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
    editorFocusIndex = 0;
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
    if (editorIsFocusMode()) {
      editorSyncFocusFromArea();
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

function setButtonLabel(button, text) {
  var label = button ? button.querySelector(".btn-label") : null;
  if (label) {
    label.textContent = text;
    return;
  }
  if (button) {
    button.textContent = text;
  }
}

function disarmEditorDelete() {
  var del = document.getElementById("editDelete");
  if (del) {
    del.classList.remove("is-armed");
    setButtonLabel(del, t("edit.delete"));
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
    setButtonLabel(del, t("edit.deleteAsk"));
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
  var buttons = document.querySelectorAll("#editSymbols > button");
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
  editorPaintNotePad();
  editorPaintStaffSamples();
  if (del && del.classList.contains("is-armed")) {
    setButtonLabel(del, t("edit.deleteAsk"));
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
  editorFlushFocus();
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
  editorFlushFocus();
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
    editorNotice(t("desk.keepFail"));
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
  var bar;
  if (editorIsOpen()) {
    editorUpdate();
    return;
  }
  bar = document.getElementById("shareAsk");
  if (typeof shareLooking !== "undefined" && shareLooking && bar && !bar.hidden && typeof previewShareExercise === "function") {
    previewShareExercise();
    return;
  }
  editorOpen();
}

function editorAddNoteButton(row, text, attrs) {
  var button = document.createElement("button");
  var key;
  button.type = "button";
  button.textContent = text;
  for (key in attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, key)) {
      button.setAttribute(key, attrs[key]);
    }
  }
  row.appendChild(button);
}

function editorNoteRow(pad) {
  var row = document.createElement("div");
  row.className = "edit-note-row";
  pad.appendChild(row);
  return row;
}

function buildEditorNotePad(host) {
  var pad = document.createElement("div");
  var letters;
  var mods;
  var events;
  var alphabet = ["C", "D", "E", "F", "G", "A", "B"];
  var i;
  pad.id = "editNotePad";
  letters = editorNoteRow(pad);
  mods = editorNoteRow(pad);
  events = editorNoteRow(pad);
  for (i = 0; i < alphabet.length; i++) {
    editorAddNoteButton(letters, alphabet[i], { "data-note": alphabet[i] });
  }
  editorAddNoteButton(mods, "\u266D", { "data-acc": "b", "data-label": "sym.flat" });
  editorAddNoteButton(mods, "\u266F", { "data-acc": "#", "data-label": "sym.sharp" });
  editorAddNoteButton(mods, "\u266E", { "data-acc": "n", "data-label": "sym.natural" });
  editorAddNoteButton(mods, "3", { "data-oct": "3" });
  editorAddNoteButton(mods, "4", { "data-oct": "4" });
  editorAddNoteButton(mods, "5", { "data-oct": "5" });
  editorAddNoteButton(mods, "\u2669", { "data-dur": "", "data-label": "edit.noteQuarter" });
  editorAddNoteButton(mods, "\u266A", { "data-dur": "e", "data-label": "edit.noteEighth" });
  editorAddNoteButton(mods, "\u266A.", { "data-dur": "e.", "data-label": "edit.noteDotted" });
  editorAddNoteButton(events, "/", { "data-symbol": "/ ", "data-label": "edit.notePlay" });
  editorAddNoteButton(events, "/q", { "data-event": "slash" });
  editorAddNoteButton(events, "rq", { "data-event": "rest" });
  editorAddNoteButton(events, "|", { "data-event": "bar", "data-label": "edit.noteBar" });
  editorAddNoteButton(events, "~", { "data-event": "tie", "data-label": "edit.noteTie" });
  editorAddNoteButton(events, "{ }", { "data-event": "beam", "data-label": "edit.noteBeam" });
  var marks = editorNoteRow(pad);
  editorAddNoteButton(marks, "mf", { "data-symbol": "mf ", "data-label": "edit.noteDynamic" });
  editorAddNoteButton(marks, "cresc", { "data-symbol": "cresc ", "data-label": "edit.noteCresc" });
  editorAddNoteButton(marks, "dim", { "data-symbol": "dim ", "data-label": "edit.noteDim" });
  editorAddNoteButton(marks, "'", { "data-symbol": "'", "data-label": "edit.noteStaccato" });
  editorAddNoteButton(marks, ">", { "data-symbol": ">", "data-label": "edit.noteAccent" });
  editorAddNoteButton(marks, "-", { "data-symbol": "-", "data-label": "edit.noteTenuto" });
  editorAddNoteButton(marks, "^", { "data-symbol": "^", "data-label": "edit.noteChord" });
  editorAddNoteButton(marks, "%", { "data-symbol": "% ", "data-label": "edit.noteSimile" });
  host.appendChild(pad);
  editorPaintNotePad();
}

function editorPaintStaffSamples() {
  var buttons = document.querySelectorAll("#editStaffSamples button");
  var i;
  for (i = 0; i < buttons.length; i++) {
    var sample = buttons[i].getAttribute("data-sample") || "";
    buttons[i].setAttribute("aria-label", t("edit.staffSampleAdd") + ": " + sample);
    buttons[i].title = t("edit.staffSampleAdd");
  }
}

function buildEditorStaffSamples() {
  var host = document.getElementById("editStaffSamples");
  var i;
  if (!host || host.childNodes.length) {
    return;
  }
  for (i = 0; i < EDITOR_STAFF_SAMPLES.length; i++) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = EDITOR_STAFF_SAMPLES[i];
    button.setAttribute("data-sample", EDITOR_STAFF_SAMPLES[i]);
    host.appendChild(button);
  }
  editorPaintStaffSamples();
  host.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button || !host.contains(button)) {
      return;
    }
    editorPutSample(button.getAttribute("data-sample") || "");
  });
}

function buildEditorSymbols() {
  var row = document.getElementById("editSymbols");
  if (!row || row.childNodes.length) {
    return;
  }
  row.hidden = true;
  buildEditorNotePad(row);
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

var CHAT_URL_MAX = 2000;

var CHAT_TARGETS = {
  chatgpt: { bare: "https://chatgpt.com/", query: "https://chatgpt.com/?q=" },
  claude: { bare: "https://claude.ai/new", query: "https://claude.ai/new?q=" },
  gemini: { bare: "https://gemini.google.com/app", query: "https://gemini.google.com/app?q=" }
};

function editorLinesUseStaff(lines) {
  var i;
  if (typeof staffNotationStatus !== "function") {
    return false;
  }
  for (i = 0; i < lines.length; i++) {
    var status = staffNotationStatus(lines[i]);
    if (status && status.ok) {
      return true;
    }
  }
  return false;
}

function chatStaffSpelling(lang) {
  if (lang === "es") {
    return "Estas líneas van en el pentagrama. Una nota es una palabra: letra, alteración, octava, luego w h q e s y un puntillo opcional. C4 es una negra. C#4, Db4, Cn4. @treble o @bass y @key=Eb van primero. ^Name va sobre la nota o el slash siguiente y puede cambiar: ^G / ^D /. ^texto pegado va encima de esa nota, slash, silencio o acorde. _texto va debajo. Los dos pueden ir juntos: [E3h G3h B3h D4h]^C∆7_3, /w^P, rw^R. _1 es el grado bajo la nota. ^bVII y _bVII se ven como ♭VII. _bbVII se ve como 𝄫VII. Un ^ solo es marcato. {C4e D4e} barrado. / es tocar cualquier cosa, sin plica. /q es un slash de ritmo, rq silencio, | barra, % simile, ~ ligadura de la misma altura. (3 C4e D4e E4e) grupo irregular. pp mf f, cresc, dim, y ' > - ^ : C4e'>. \" · \" es el texto. El mismo número de compases en cada línea. Responde con esta escritura.";
  }
  return "These lines are written on a staff. One note is one word: letter, accidental, octave, then w h q e s and an optional dot. C4 is a quarter. C#4, Db4, Cn4. @treble or @bass and @key=Eb come first. ^Name sits on the next note or slash and can change: ^G / ^D /. ^text glued on a note, slash, rest, or chord sits above it. _text sits under it. Both can be on one symbol: [E3h G3h B3h D4h]^C∆7_3, /w^P, rw^R. _1 is the degree under the note. ^bVII and _bVII both print as ♭VII. _bbVII prints as 𝄫VII. A bare ^ is marcato. {C4e D4e} beams. / is play anything, no stem. /q is a rhythm slash, rq a rest, | a bar, % a simile, ~ a tie of the same pitch. (3 C4e D4e E4e) is a tuplet. pp mf f, cresc, dim, and ' > - ^ : C4e'>. \" · \" is the caption. The same number of bars on every line. Answer in this spelling.";
}

function chatPromptRules(lang, staff) {
  if (lang === "es") {
    return [
      "Ayúdame con un ejercicio de eization. Un ejemplo a la vez, con el metrónomo. Cada uno sale una vez y luego cambia el orden.",
      "Un ejemplo por línea. Sin título, sin # eization, sin #s= ni #s2=. Signos, no palabras ni HTML. \" · \" separa lo que se toca de un texto.",
      staff
        ? chatStaffSpelling("es")
        : "Añade notas: una línea por escritura. Naturales una vez (C D E F G A B). El resto en sostenido y bemol. Ejemplo: B♭ · ♭7 de C y A♯ · ♭7 de C. Cada grado del recuadro, sobre la fundamental. Si no hay, pregunta una vez y sugiere C.",
      "Si hay líneas, di qué ejercicio es, qué necesita una buena línea, ofrece un paso y pregunta. No reescribas hasta que lo pidan. Si el recuadro está vacío, ofrece tres comienzos (notas, escalas o acordes) y pregunta cuál.",
      "Al terminar, un bloque, un ejemplo por línea. Diles que lo copien, lo peguen en Editar y pulsen Actualizar. Guardar como nuevo conserva el anterior."
    ].join("\n\n");
  }
  return [
    "Help me write an eization exercise. One example shows at a time, with the metronome. Each comes up once, then the order changes.",
    "Write one example per line. No title, no # eization header, no #s= or #s2= link. Signs, not words or HTML. \" · \" splits play from a caption.",
    staff
      ? chatStaffSpelling("en")
      : "Add notes: one line per spelling. Naturals once (C D E F G A B). Other pitches sharp and flat. Example: B♭ · ♭7 of C and A♯ · ♭7 of C. Every degree in the box, on the named root. No root: ask once, suggest C.",
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
  body.push(chatPromptRules(lang, editorLinesUseStaff(lines)));
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
  editorFlushFocus();
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
  editorFlushFocus();
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
  var catalogHref = "";
  if (
    saved &&
    snap &&
    saved.bars === snap.bars &&
    saved.name === snap.name &&
    typeof shareLinesMatch === "function" &&
    shareLinesMatch(saved.lines, snap.lines) &&
    typeof shareCatalogHref === "function"
  ) {
    catalogHref = shareCatalogHref(saved);
  }
  var url = catalogHref || (snap ? shareExerciseUrl({ v: 1, id: snap.shareId, name: snap.name, bars: snap.bars, lines: snap.lines }) : "");
  if (!url) {
    editorNotice(t("edit.shareLong"));
    return;
  }
  if (typeof track === "function") {
    track("edit_share");
  }
  if (!catalogHref && saved && !saved.shareId && typeof updateDeskExercise === "function") {
    updateDeskExercise(saved.id, { shareId: shareId });
  }
  clearEditorNotice();
  var copyOk = false;
  var sheet = false;
  if (navigator.share) {
    sheet = true;
    navigator.share({
      title: (snap && snap.name) || "eization",
      text: t("share.text"),
      url: url
    }).catch(function (error) {
      if (error && error.name === "AbortError") {
        return;
      }
      if (!copyOk) {
        editorNotice(t("share.fail"));
      }
    });
  }
  if (typeof copySupportText === "function") {
    copySupportText(url).then(function () {
      copyOk = true;
      editorStatus(t("share.copied"));
    }, function () {
      if (!sheet) {
        editorNotice(t("share.fail"));
      }
    });
  } else if (!sheet) {
    editorNotice(t("share.fail"));
  }
}

function initEditor() {
  buildEditorSymbols();
  buildEditorStaffSamples();
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
  var staffHelp = document.getElementById("editStaffHelp");
  if (staffHelp) {
    staffHelp.addEventListener("click", editorToggleStaffHelp);
  }
  var staffHelpClose = document.getElementById("editStaffHelpClose");
  if (staffHelpClose) {
    staffHelpClose.addEventListener("click", function () {
      editorCloseStaffHelp();
    });
  }
  var more = document.getElementById("editMore");
  if (more) {
    more.addEventListener("click", editorToggleMore);
  }
  var symbolsToggle = document.getElementById("editSymbolsToggle");
  if (symbolsToggle) {
    symbolsToggle.addEventListener("click", editorToggleSymbols);
  }
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
  symbols.addEventListener("pointerdown", function (event) {
    var button = event.target.closest("button");
    if (!button || !symbols.contains(button)) {
      return;
    }
    event.preventDefault();
    editorActivateSymbol(button);
  });
  var viewToggle = document.getElementById("editViewToggle");
  if (viewToggle) {
    viewToggle.addEventListener("click", editorToggleViewMode);
  }
  var focusPrev = document.getElementById("editFocusPrev");
  if (focusPrev) {
    focusPrev.addEventListener("click", function () {
      editorFocusGo(-1);
    });
  }
  var focusNext = document.getElementById("editFocusNext");
  if (focusNext) {
    focusNext.addEventListener("click", function () {
      editorFocusGo(1);
    });
  }
  var focusAdd = document.getElementById("editFocusAdd");
  if (focusAdd) {
    focusAdd.addEventListener("click", editorFocusAdd);
  }
  var focusRemove = document.getElementById("editFocusRemove");
  if (focusRemove) {
    focusRemove.addEventListener("click", editorFocusRemove);
  }
  var focusField = document.getElementById("editFocusLine");
  if (focusField) {
    focusField.addEventListener("input", function () {
      editorSyncFocusToArea();
      convertEditorCodes();
      if (editorIsFocusMode()) {
        var caret = focusField.selectionStart || 0;
        editorSyncFocusFromArea();
        try {
          focusField.setSelectionRange(caret, caret);
        } catch (errConvert) {}
      }
      disarmEditorDelete();
      clearEditorNotice();
      refreshEditor();
    });
    focusField.addEventListener("keyup", refreshEditor);
    focusField.addEventListener("click", refreshEditor);
    focusField.addEventListener("paste", function (event) {
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
    focusField.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (editorCloseStaffHelp()) {
          return;
        }
        if (editorCloseSymbols()) {
          return;
        }
        if (editorCloseMore()) {
          return;
        }
        editorCancel();
        return;
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        editorUpdate();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        editorSyncFocusToArea();
        var lines = editorRawLines();
        editorClampFocusIndex(lines.length);
        if (editorFocusIndex >= lines.length - 1) {
          editorFocusAdd();
        } else {
          editorFocusGo(1);
        }
      }
    });
  }
  area.addEventListener("input", function () {
    convertEditorCodes();
    disarmEditorDelete();
    clearEditorNotice();
    refreshEditor();
  });
  area.addEventListener("keyup", refreshEditor);
  area.addEventListener("click", refreshEditor);
  document.addEventListener("selectionchange", function () {
    if (!editorIsOpen()) {
      return;
    }
    if (document.activeElement === area || document.activeElement === focusField) {
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
      editorDismissEscape();
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
    if (event.key !== "Escape" || !editorIsOpen()) {
      return;
    }
    if (event.target === area || event.target === focusField) {
      return;
    }
    event.preventDefault();
    editorDismissEscape();
  });
  window.addEventListener("resize", function () {
    if (!editorIsOpen() || editorViewOverride) {
      return;
    }
    editorApplyViewMode();
    refreshEditor();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", placeEditor);
    window.visualViewport.addEventListener("scroll", placeEditor);
  }
}

initEditor();
