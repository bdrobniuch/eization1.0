var editorDraft = {
  label: "",
  id: "",
  name: "",
  text: "",
  bars: 1,
  staff: false,
  mode: "edit",
  storedLines: null
};

/* Last successful staff preview HTML; kept while the line is still notation-ish but broken. */
var editorLastGoodStaffHtml = "";
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
  { char: "[ ]", key: "sym.stack", caretBack: 2 }
];

var editorNote = {
  acc: "",
  dur: "",
  dot: false,
  oct: null
};

var editorNotePadStamp = "";
var editorIconCache = {};
var editorSymbolUndo = [];
var editorSymbolRedo = [];
var EDITOR_SYMBOL_HISTORY = 50;
/* Last keyboard/pad state that drew a valid staff; used for typing undo. */
var editorLastValidSnap = null;
/* Preview HTML of that valid draw — undo steps only when this changes, not for spaces-only edits. */
var editorLastValidRenderKey = null;
var editorStaffTypingDirty = false;
/* True only while handling a real field input/paste (not pad / selection refresh). */
var editorKeyboardStaffEdit = false;
/* While Symbols/Notes is open, keep caret here and avoid focusing the field (no soft keyboard). */
var editorPadCaret = null;
/* Erase hold-to-repeat (one undo step for the whole hold). */
var editorEraseRepeatDelay = null;
var editorEraseRepeatTimer = null;
var editorEraseHoldUndoPushed = false;
var editorEraseLastAt = 0;

var EDITOR_STAFF_SAMPLES = [
  "C4 E4 G4",
  "@key=Eb Eb4 F4 G4 Ab4 Bb4",
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

function stylePlainExample(text) {
  var note = text.match(/^([A-G])([#b\u266F\u266D])$/);
  var chord;
  if (note) {
    return escapeEditorHtml(note[1]) + "<sup><small>" + escapeEditorHtml(note[2]) + "</small></sup>";
  }
  chord = text.match(/^([A-G])((?:[#b\u266F\u266D])?(?:alt)?[\u2206\u00B0\u00F8+\-\u2212]?\d.*)$/);
  if (chord && /7/.test(chord[2])) {
    return escapeEditorHtml(chord[1]) + "<sup><small>" + escapeEditorHtml(chord[2]) + "</small></sup>";
  }
  return escapeEditorHtml(text);
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
  return withSimile(stylePlainExample(text));
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
  return text !== editorDraft.text || bars !== editorDraft.bars || editorStaffOn() !== !!editorDraft.staff || name !== draftName;
}

function editorStaffOn() {
  var button = document.getElementById("editKindStaff");
  return !!(button && button.getAttribute("aria-pressed") === "true");
}

function setEditorStaff(on) {
  var text = document.getElementById("editKindText");
  var staff = document.getElementById("editKindStaff");
  var pressed = !!on;
  if (text) {
    text.setAttribute("aria-pressed", pressed ? "false" : "true");
  }
  if (staff) {
    staff.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  editorSyncSymbolKind();
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
  var dirty;
  if (editorIsCreateMode()) {
    if (update) {
      update.textContent = t("edit.create");
      update.title = t("edit.createTitle");
      update.setAttribute("aria-label", t("edit.createAria"));
      update.hidden = false;
    }
    if (saveAs) {
      saveAs.hidden = true;
    }
    if (del) {
      del.hidden = true;
    }
    return;
  }
  dirty = editorIsDirty();
  if (update) {
    if (!update.classList.contains("is-armed")) {
      update.textContent = t("edit.update");
      update.title = t("edit.updateTitle");
      update.setAttribute("aria-label", t("edit.updateAria"));
    }
    update.hidden = !(dirty || update.classList.contains("is-armed"));
  }
  if (saveAs) {
    saveAs.hidden = !dirty;
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
  editorPadCaret = null;
  editorSetPadInputMode(false);
  editorDropNoteFlow();
  return true;
}

function editorCapturePadCaret() {
  var field = editorActiveField();
  var start;
  var end;
  var len;
  if (!field) {
    editorPadCaret = { start: 0, end: 0 };
    return;
  }
  len = String(field.value || "").length;
  start = typeof field.selectionStart === "number" ? field.selectionStart : len;
  end = typeof field.selectionEnd === "number" ? field.selectionEnd : start;
  if (start < 0) {
    start = 0;
  }
  if (end < 0) {
    end = 0;
  }
  if (start > len) {
    start = len;
  }
  if (end > len) {
    end = len;
  }
  editorPadCaret = { start: start, end: end };
}

function editorReadSelection(field) {
  var len;
  var start;
  var end;
  if (!field) {
    return { start: 0, end: 0 };
  }
  len = String(field.value || "").length;
  if (editorPadCaret && editorSymbolsIsOpen() && document.activeElement !== field) {
    start = editorPadCaret.start;
    end = editorPadCaret.end;
    if (start < 0) {
      start = 0;
    }
    if (end < 0) {
      end = 0;
    }
    if (start > len) {
      start = len;
    }
    if (end > len) {
      end = len;
    }
    return { start: start, end: end };
  }
  return {
    start: field.selectionStart || 0,
    end: field.selectionEnd || 0
  };
}

function editorPlaceCaret(field, start, end, silent) {
  var len;
  if (!field) {
    return;
  }
  len = String(field.value || "").length;
  if (typeof end !== "number") {
    end = start;
  }
  if (start < 0) {
    start = 0;
  }
  if (end < 0) {
    end = 0;
  }
  if (start > len) {
    start = len;
  }
  if (end > len) {
    end = len;
  }
  if (silent || (editorPadCaret && editorSymbolsIsOpen())) {
    editorPadCaret = { start: start, end: end };
    try {
      field.setSelectionRange(start, end);
    } catch (errSilentCaret) {}
    return;
  }
  field.focus();
  try {
    field.setSelectionRange(start, end);
  } catch (errFocusCaret) {}
}

function editorSetPadInputMode(off) {
  var focusField = document.getElementById("editFocusLine");
  var area = document.getElementById("allEdit");
  if (off) {
    if (focusField) {
      focusField.setAttribute("inputmode", "none");
    }
    if (area) {
      area.setAttribute("inputmode", "none");
    }
  } else {
    if (focusField) {
      focusField.removeAttribute("inputmode");
    }
    if (area) {
      area.removeAttribute("inputmode");
    }
  }
}

function editorBeginPadInput() {
  var field;
  if (!editorSymbolsIsOpen()) {
    return;
  }
  field = editorActiveField();
  if (!field) {
    return;
  }
  if (document.activeElement === field || !editorPadCaret) {
    editorCapturePadCaret();
  }
  editorSetPadInputMode(true);
  if (document.activeElement === field) {
    field.blur();
  }
}

function editorOpenSymbols() {
  var panel = document.getElementById("editSymbols");
  var button = document.getElementById("editSymbolsToggle");
  var field;
  if (!panel) {
    return;
  }
  panel.hidden = false;
  if (button) {
    button.setAttribute("aria-expanded", "true");
  }
  editorCapturePadCaret();
  editorSetPadInputMode(true);
  field = editorActiveField();
  if (field && document.activeElement === field) {
    field.blur();
  }
}

function editorToggleSymbols() {
  if (editorSymbolsIsOpen()) {
    editorCloseSymbols();
  } else {
    editorOpenSymbols();
  }
}

/* Portrait phones, and landscape phones (short height) such as iPhone rotated. */
var EDITOR_PHONE_MQ = "(max-width: 640px), (orientation: landscape) and (max-height: 520px)";

function editorPhoneChrome() {
  return window.matchMedia(EDITOR_PHONE_MQ).matches;
}

function setEditorAskHint(on) {
  var askHint = document.getElementById("editAskHint");
  if (!askHint) {
    return;
  }
  if (on) {
    askHint.textContent = t("edit.askHint");
  }
  askHint.hidden = !on;
}

function refreshEditorHint() {
  var hint = document.getElementById("editHint");
  if (!hint) {
    return;
  }
  var phone = editorPhoneChrome();
  var del = document.getElementById("editDelete");
  var update = document.getElementById("editUpdate");
  syncEditorCommitLabels();
  if ((del && del.classList.contains("is-armed")) || (update && update.classList.contains("is-armed"))) {
    hint.textContent = "";
    setEditorAskHint(false);
    return;
  }
  var askMenu = document.getElementById("editAskMenu");
  if (askMenu && !askMenu.hidden) {
    if (phone) {
      setEditorAskHint(true);
      if (typeof sharePreview !== "undefined" && sharePreview && sharePreview.mode === "changed") {
        hint.textContent = t("edit.hintShare");
      } else {
        hint.textContent = "";
      }
    } else {
      hint.textContent = t("edit.askHint");
      setEditorAskHint(false);
    }
    return;
  }
  setEditorAskHint(false);
  if (typeof sharePreview !== "undefined" && sharePreview) {
    if (sharePreview.mode === "changed") {
      hint.textContent = t("edit.hintShare");
    } else {
      hint.textContent = phone ? "" : t("edit.hintCreate");
    }
    return;
  }
  if (editorIsCreateMode()) {
    hint.textContent = phone ? "" : t("edit.hintCreate");
    return;
  }
  /* Dirty and clean edit: Update / Save as new labels are enough. */
  hint.textContent = "";
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
  var note = document.getElementById("editStaffNote");
  if (note) {
    note.hidden = true;
    note.textContent = "";
  }
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
  editorLastGoodStaffHtml = "";
  editorClearSymbolHistory();
  var sheet = document.getElementById("textdiv");
  sheet.classList.remove("is-open", "is-edit-focus", "is-edit-list");
  sheet.style.display = "";
  editorClearSheetPlacement();
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
  var top = 0;
  var height;
  var viewport;
  if (!sheet || !sheet.classList.contains("is-open")) {
    return;
  }
  viewport = window.visualViewport;
  if (viewport && viewport.height > 0) {
    /* Fit the sheet to the visible viewport so the soft keyboard does not cover controls. */
    top = viewport.offsetTop;
    if (top < 0) {
      top = 0;
    }
    height = viewport.height;
    sheet.style.top = top + "px";
    sheet.style.bottom = "auto";
    sheet.style.height = height + "px";
    sheet.style.maxHeight = height + "px";
  } else {
    sheet.style.top = "";
    sheet.style.bottom = "";
    sheet.style.height = "";
    sheet.style.maxHeight = "";
  }
}

function editorClearSheetPlacement() {
  var sheet = document.getElementById("textdiv");
  if (!sheet) {
    return;
  }
  sheet.style.top = "";
  sheet.style.bottom = "";
  sheet.style.height = "";
  sheet.style.maxHeight = "";
}

function editorEnsureFieldVisible(field) {
  if (!field || !editorIsOpen()) {
    return;
  }
  placeEditor();
  window.requestAnimationFrame(function () {
    placeEditor();
    if (typeof field.scrollIntoView === "function") {
      try {
        field.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (errScroll) {
        field.scrollIntoView(false);
      }
    }
  });
}

function editorDefaultViewMode() {
  return editorPhoneChrome() ? "focus" : "list";
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
  var pager = document.getElementById("editFocusPager");
  var prev = document.getElementById("editFocusPrev");
  var next = document.getElementById("editFocusNext");
  var remove = document.getElementById("editFocusRemove");
  var lines = editorRawLines();
  var removeIndex;
  var indexLabel;
  editorClampFocusIndex(lines.length);
  indexLabel = tr("edit.focusIndex", { n: editorFocusIndex + 1, total: lines.length });
  if (indexEl) {
    indexEl.textContent = indexLabel;
  }
  if (pager) {
    pager.setAttribute("aria-label", indexLabel);
  }
  if (prev) {
    prev.disabled = editorFocusIndex <= 0;
  }
  if (next) {
    next.disabled = editorFocusIndex >= lines.length - 1;
  }
  if (remove) {
    removeIndex = editorIsFocusMode() ? editorFocusIndex : editorCaretLineIndex();
    if (removeIndex < 0) {
      removeIndex = 0;
    }
    if (removeIndex >= lines.length) {
      removeIndex = lines.length - 1;
    }
    remove.disabled = lines.length <= 1 && !collapseEditorSpaces(lines[removeIndex] || "");
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
  var label;
  var text;
  var listIcon;
  var oneIcon;
  if (!button) {
    return;
  }
  var focus = editorEffectiveViewMode() === "focus";
  label = focus ? t("edit.allExamples") : t("edit.oneExample");
  text = button.querySelector(".btn-label");
  if (text) {
    text.textContent = label;
  } else {
    button.textContent = label;
  }
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", focus ? "true" : "false");
  listIcon = button.querySelector(".icon-list");
  oneIcon = button.querySelector(".icon-one");
  if (listIcon) {
    listIcon.classList.toggle("is-hidden", !focus);
  }
  if (oneIcon) {
    oneIcon.classList.toggle("is-hidden", focus);
  }
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

function editorLineStartOffset(lines, index) {
  var i;
  var offset = 0;
  for (i = 0; i < index && i < lines.length; i++) {
    offset += String(lines[i] || "").length + 1;
  }
  return offset;
}

function editorFocusAdd() {
  var lines;
  var area;
  var caret;
  var index;
  var field;
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
    lines = editorRawLines();
    if (lines.length >= 500) {
      editorNotice(t("edit.tooMany"));
      return;
    }
    editorClampFocusIndex(lines.length);
    editorPushSymbolUndo();
    lines.splice(editorFocusIndex + 1, 0, "");
    editorSetRawLines(lines);
    editorFocusIndex += 1;
    editorSyncFocusFromArea();
    clearEditorNotice();
    refreshEditor();
    field = document.getElementById("editFocusLine");
    if (field) {
      field.focus();
    }
    return;
  }
  area = document.getElementById("allEdit");
  if (!area) {
    return;
  }
  lines = editorRawLines();
  if (lines.length >= 500) {
    editorNotice(t("edit.tooMany"));
    return;
  }
  index = editorCaretLineIndex();
  if (index < 0) {
    index = 0;
  }
  if (index >= lines.length) {
    index = lines.length - 1;
  }
  editorPushSymbolUndo();
  lines.splice(index + 1, 0, "");
  editorSetRawLines(lines);
  caret = editorLineStartOffset(lines, index + 1);
  try {
    area.focus();
    area.setSelectionRange(caret, caret);
  } catch (errAdd) {}
  clearEditorNotice();
  refreshEditor();
}

function editorFocusRemove() {
  var lines;
  var area;
  var index;
  var caret;
  var field;
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
    lines = editorRawLines();
    editorClampFocusIndex(lines.length);
    if (lines.length <= 1 && !collapseEditorSpaces(lines[0] || "")) {
      return;
    }
    editorPushSymbolUndo();
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
    field = document.getElementById("editFocusLine");
    if (field) {
      field.focus();
    }
    return;
  }
  area = document.getElementById("allEdit");
  if (!area) {
    return;
  }
  lines = editorRawLines();
  index = editorCaretLineIndex();
  if (index < 0) {
    index = 0;
  }
  if (index >= lines.length) {
    index = lines.length - 1;
  }
  if (lines.length <= 1 && !collapseEditorSpaces(lines[index] || "")) {
    return;
  }
  editorPushSymbolUndo();
  if (lines.length <= 1) {
    editorSetRawLines([""]);
    caret = 0;
  } else {
    lines.splice(index, 1);
    editorSetRawLines(lines);
    if (index >= lines.length) {
      index = lines.length - 1;
    }
    caret = editorLineStartOffset(lines, index);
  }
  try {
    area.focus();
    area.setSelectionRange(caret, caret);
  } catch (errRemove) {}
  clearEditorNotice();
  refreshEditor();
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
  }
  editorUpdateFocusChrome();
  editorSyncSymbolKind();
  var total = visibleLineCount(area.value);
  if (count) {
    count.textContent = total === 1 ? t("edit.examplesOne") : tr("edit.examplesMany", { n: total });
  }
  editorRefreshViewToggle();
  if (!preview) {
    return;
  }
  var line = itemToLine(currentEditorLine());
  preview.classList.remove("is-staff", "is-staff-pending");
  preview.innerHTML = "";
  if (!line) {
    clearEditStaffNote();
    if (editorStaffOn() && typeof renderMusicStaff === "function") {
      preview.classList.remove("is-empty");
      editorPaintStaffPreview(preview, "", "");
    } else {
      preview.classList.add("is-empty");
      editorLastGoodStaffHtml = "";
    }
    editorSyncStaffHistoryAfterRefresh("", { ok: true });
    refreshEditorHint();
    return;
  }
  preview.classList.remove("is-empty");
  var status =
    typeof staffNotationStatus === "function"
      ? staffNotationStatus(line)
      : { ok: false, notationIsh: false, music: line, caption: "" };
  if (editorStaffOn() && status.ok && typeof renderMusicStaff === "function") {
    clearEditStaffNote();
    editorPaintStaffPreview(preview, status.music, status.caption);
  } else if (editorStaffOn()) {
    /* Staff mode: never flip to text preview — keep last good (or empty staff) + pending frame. */
    clearEditStaffNote();
    preview.classList.add("is-staff", "is-staff-pending");
    if (editorLastGoodStaffHtml) {
      preview.innerHTML = editorLastGoodStaffHtml;
    } else if (typeof renderMusicStaff === "function") {
      editorPaintStaffPreview(preview, "", "");
      preview.classList.add("is-staff-pending");
    }
  } else {
    editorLastGoodStaffHtml = "";
    preview.innerHTML = lineToItem(line);
    clearEditStaffNote();
  }
  editorSyncStaffHistoryAfterRefresh(line, status);
  refreshEditorHint();
}

function editorPaintStaffPreview(preview, music, caption) {
  var svg;
  var box;
  var w;
  var h;
  var wrap;
  var cap;
  if (!preview || typeof renderMusicStaff !== "function") {
    return;
  }
  preview.classList.add("is-staff");
  svg = renderMusicStaff(music || "", "current");
  if (svg) {
    box = (svg.getAttribute("viewBox") || "").split(/\s+/);
    w = parseFloat(box[2]);
    h = parseFloat(box[3]);
    if (w > 0 && h > 0) {
      svg.setAttribute("width", String(Math.round(w)));
      svg.setAttribute("height", String(Math.round(h)));
    }
    wrap = document.createElement("span");
    wrap.className = "prog-changes";
    wrap.appendChild(svg);
    preview.appendChild(wrap);
  }
  if (caption) {
    cap = document.createElement("span");
    cap.className = "prog-name";
    cap.textContent = caption;
    preview.appendChild(cap);
  }
  editorLastGoodStaffHtml = preview.innerHTML;
  editorScrollPreviewToEnd(preview);
}

function editorScrollPreviewToEnd(preview) {
  var field;
  var value;
  var caret;
  if (!preview) {
    return;
  }
  field = editorActiveField();
  if (field) {
    value = String(field.value || "");
    caret = field.selectionStart || 0;
    if (caret < value.length) {
      return;
    }
  }
  window.requestAnimationFrame(function () {
    preview.scrollLeft = preview.scrollWidth;
    preview.scrollTop = preview.scrollHeight;
  });
}

function insertEditorText(text, caretBack) {
  var silent = !!(editorPadCaret && editorSymbolsIsOpen());
  if (editorIsFocusMode()) {
    var field = document.getElementById("editFocusLine");
    if (!field) {
      return;
    }
    var sel = editorReadSelection(field);
    var start = sel.start;
    var end = sel.end;
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
      var caret = (inserted[inserted.length - 1] || "").length - tail.length;
      if (caret < 0) {
        caret = 0;
      }
      editorPlaceCaret(field, caret, caret, silent);
    } else {
      var value = field.value || "";
      field.value = value.slice(0, start) + single + value.slice(end);
      var back = caretBack > 0 ? caretBack : 0;
      var pos = start + single.length - back;
      if (pos < start) {
        pos = start;
      }
      editorPlaceCaret(field, pos, pos, silent);
    }
    clearEditorNotice();
    refreshEditor();
    return;
  }
  var area = document.getElementById("allEdit");
  var areaSel = editorReadSelection(area);
  var areaStart = areaSel.start;
  var areaEnd = areaSel.end;
  if (areaStart > area.value.length) {
    areaStart = area.value.length;
    areaEnd = areaStart;
  }
  var areaBack = caretBack > 0 ? caretBack : 0;
  if (typeof area.setRangeText === "function") {
    area.setRangeText(text, areaStart, areaEnd, "end");
  } else {
    area.value = area.value.slice(0, areaStart) + text + area.value.slice(areaEnd);
  }
  var areaCaret = areaStart + String(text || "").length - areaBack;
  if (areaCaret < areaStart) {
    areaCaret = areaStart;
  }
  editorPlaceCaret(area, areaCaret, areaCaret, silent);
  clearEditorNotice();
  refreshEditor();
}

function editorTextBeforeCaret() {
  var field = document.getElementById(editorIsFocusMode() ? "editFocusLine" : "allEdit");
  var sel;
  if (!field) {
    return "";
  }
  sel = editorReadSelection(field);
  return String(field.value || "").slice(0, sel.start);
}

/* A pitch, slash, rest, bar, beam, or chord glued to the previous word is one token and fails. */
function editorInsertSymbol(text, caretBack) {
  var body = String(text || "");
  var before = editorTextBeforeCaret();
  var first = body.charAt(0);
  var prev = before ? before.charAt(before.length - 1) : "";
  if (
    body &&
    !/^\s/.test(body) &&
    prev &&
    !/\s/.test(prev) &&
    first !== "'" &&
    first !== ">" &&
    first !== "-" &&
    first !== "~" &&
    first !== "^"
  ) {
    body = " " + body;
  }
  insertEditorText(body, caretBack);
}

function editorDurCode(dur) {
  if (dur === "w" || dur === "h" || dur === "e" || dur === "s") {
    return dur;
  }
  return "";
}

function editorPitchSuffix() {
  var code = editorDurCode(editorNote.dur);
  if (editorNote.dot) {
    return (code || "q") + ".";
  }
  return code;
}

function editorRhythmSuffix() {
  return (editorDurCode(editorNote.dur) || "q") + (editorNote.dot ? "." : "");
}

function editorSlashToken() {
  return "/" + editorRhythmSuffix();
}

function editorRestToken() {
  return "r" + editorRhythmSuffix();
}

function editorSyncSymbolKind() {
  var panel = document.getElementById("editSymbols");
  var button = document.getElementById("editSymbolsToggle");
  var mark;
  var label;
  var titleKey;
  var staff;
  if (!panel) {
    return;
  }
  staff = editorStaffOn();
  panel.classList.toggle("is-staff", staff);
  panel.classList.toggle("is-text", !staff);
  if (button) {
    mark = button.querySelector(".btn-mark");
    label = button.querySelector(".btn-label");
    titleKey = staff ? "edit.notesTitle" : "edit.symbolsTitle";
    button.classList.toggle("is-staff", staff);
    button.classList.toggle("is-text", !staff);
    button.setAttribute("title", t(titleKey));
    button.setAttribute("aria-label", t(titleKey));
    if (mark) {
      mark.textContent = "\u266F\u2206\u00F8";
    }
    if (label) {
      label.textContent = t(staff ? "edit.notes" : "edit.symbols");
    }
  }
  if (!staff) {
    editorNote.acc = "";
    editorNote.oct = null;
  }
  editorPaintNotePad();
}

function editorDropNoteFlow() {
  if (!editorNote.acc && editorNote.oct === null) {
    return;
  }
  editorNote.acc = "";
  editorNote.oct = null;
  editorPaintNotePad();
}

function editorLineDirectives(line) {
  var parts = String(line || "").trim().split(/\s+/);
  var out = [];
  var i;
  for (i = 0; i < parts.length; i++) {
    var token = parts[i];
    if (token === "@treble" || token === "@bass" || token.indexOf("@key=") === 0) {
      out.push(token);
    }
  }
  return out.join(" ");
}

function editorActiveField() {
  return document.getElementById(editorIsFocusMode() ? "editFocusLine" : "allEdit");
}

function editorClefName() {
  var lead = editorLineDirectives(currentEditorLine());
  return lead.indexOf("@bass") >= 0 ? "bass" : "treble";
}

function editorClampOctave(oct) {
  oct = parseInt(oct, 10);
  if (isNaN(oct) || oct < 0) {
    return 0;
  }
  if (oct > 9) {
    return 9;
  }
  return oct;
}

/* The octave on the pad. A chosen number wins. Otherwise the note at the caret, or 5 in treble and 3 in bass. */
function editorWorkingOctave() {
  var hit;
  if (editorNote.oct !== null && editorNote.oct !== undefined) {
    return editorClampOctave(editorNote.oct);
  }
  hit = editorPitchAtCaret() || editorEarlierPitch();
  if (hit) {
    return editorClampOctave(hit.oct);
  }
  return editorClefName() === "bass" ? 3 : 5;
}

function editorLineSpan() {
  var field = editorActiveField();
  var value;
  var caret;
  var lineStart;
  var lineEnd;
  var sel;
  if (!field) {
    return null;
  }
  value = String(field.value || "");
  sel = editorReadSelection(field);
  caret = sel.start;
  if (editorIsFocusMode()) {
    return { field: field, value: value, lineStart: 0, lineEnd: value.length, caret: caret };
  }
  lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  lineEnd = value.indexOf("\n", caret);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  return { field: field, value: value, lineStart: lineStart, lineEnd: lineEnd, caret: caret };
}

function editorSetClef(clef) {
  var span = editorLineSpan();
  var line;
  var found;
  var nextLine;
  var after;
  var removed;
  var rel;
  var caret;
  if (!span) {
    return;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  found = /@bass|@treble/.exec(line);
  if (clef === "bass") {
    if (found && found[0] === "@bass") {
      return;
    }
    editorPushSymbolUndo();
    if (found) {
      nextLine = line.slice(0, found.index) + "@bass" + line.slice(found.index + found[0].length);
    } else if (!line) {
      nextLine = "@bass ";
    } else if (line.charAt(0) === " ") {
      nextLine = "@bass" + line;
    } else {
      nextLine = "@bass " + line;
    }
  } else {
    if (!found) {
      return;
    }
    editorPushSymbolUndo();
    after = line.slice(found.index + found[0].length);
    if (after.charAt(0) === " ") {
      after = after.slice(1);
    }
    nextLine = line.slice(0, found.index) + after;
  }
  span.field.value = span.value.slice(0, span.lineStart) + nextLine + span.value.slice(span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  if (clef === "bass") {
    if (found) {
      if (rel >= found.index) {
        rel += 5 - found[0].length;
      }
    } else {
      rel += nextLine.length - line.length;
    }
  } else {
    removed = found[0].length + (line.charAt(found.index + found[0].length) === " " ? 1 : 0);
    if (rel > found.index) {
      rel -= Math.min(rel - found.index, removed);
    }
  }
  if (rel < 0) {
    rel = 0;
  }
  if (rel > nextLine.length) {
    rel = nextLine.length;
  }
  caret = span.lineStart + rel;
  editorPlaceCaret(span.field, caret, caret, !!(editorPadCaret && editorSymbolsIsOpen()));
  clearEditorNotice();
  refreshEditor();
}

function editorParsePitchToken(token) {
  var parsed = /^([A-G])(#|b|n)?(\d)((?:[whqesn]\.?)|\.)?$/.exec(token || "");
  if (!parsed) {
    return null;
  }
  return {
    token: token,
    letter: parsed[1],
    acc: parsed[2] || "",
    oct: parseInt(parsed[3], 10)
  };
}

function editorPitchTail(text) {
  var trimmed = String(text || "").replace(/\s+$/, "");
  var m = trimmed.match(/([A-G](?:#|b|n)?\d(?:[whqesn]\.?|\.)?)$/);
  var prev;
  if (!m) {
    return null;
  }
  if (m.index > 0) {
    prev = trimmed.charAt(m.index - 1);
    if (prev !== " " && prev !== "\n" && prev !== "\t" && prev !== "|" && prev !== "~" && prev !== "{") {
      return null;
    }
  }
  return editorParsePitchToken(m[1]);
}

function editorPitchAtCaret() {
  var field = editorActiveField();
  var value;
  var caret;
  var before;
  var hit;
  var sel;
  if (!field) {
    return null;
  }
  sel = editorReadSelection(field);
  if (sel.start !== sel.end) {
    return null;
  }
  value = String(field.value || "");
  caret = sel.start;
  before = value.slice(0, caret);
  hit = editorPitchTail(before);
  if (!hit) {
    return null;
  }
  hit.field = field;
  hit.start = before.replace(/\s+$/, "").length - hit.token.length;
  hit.end = hit.start + hit.token.length;
  hit.caret = caret;
  hit.kind = "pitch";
  return hit;
}

function editorParseRhythmToken(token) {
  var slash = /^\/([whqes]?)(\.?)$/.exec(token || "");
  var rest = /^r([whqes]?)(\.?)$/i.exec(token || "");
  if (slash) {
    return {
      token: token,
      kind: "slash",
      dur: slash[1] || "",
      dot: slash[2] === "."
    };
  }
  if (rest) {
    return {
      token: token,
      kind: "rest",
      dur: rest[1] || "",
      dot: rest[2] === "."
    };
  }
  return null;
}

function editorRhythmTail(text) {
  var trimmed = String(text || "").replace(/\s+$/, "");
  var m = trimmed.match(/(\/[whqes]?\.?|r[whqes]?\.?)$/i);
  var prev;
  if (!m) {
    return null;
  }
  if (m.index > 0) {
    prev = trimmed.charAt(m.index - 1);
    if (prev !== " " && prev !== "\n" && prev !== "\t" && prev !== "|" && prev !== "~" && prev !== "{") {
      return null;
    }
  }
  return editorParseRhythmToken(m[1]);
}

function editorRhythmAtCaret() {
  var field = editorActiveField();
  var value;
  var caret;
  var before;
  var hit;
  var sel;
  if (!field) {
    return null;
  }
  sel = editorReadSelection(field);
  if (sel.start !== sel.end) {
    return null;
  }
  value = String(field.value || "");
  caret = sel.start;
  before = value.slice(0, caret);
  hit = editorRhythmTail(before);
  if (!hit) {
    return null;
  }
  hit.field = field;
  hit.start = before.replace(/\s+$/, "").length - hit.token.length;
  hit.end = hit.start + hit.token.length;
  hit.caret = caret;
  return hit;
}

function editorReplaceCaretToken(hit, next) {
  var value;
  var caret;
  if (!hit || !hit.field) {
    return false;
  }
  next = String(next || "");
  if (next === hit.token) {
    return false;
  }
  editorPushSymbolUndo();
  value = String(hit.field.value || "");
  hit.field.value = value.slice(0, hit.start) + next + value.slice(hit.end);
  caret = hit.caret + (next.length - hit.token.length);
  if (caret < hit.start) {
    caret = hit.start;
  }
  editorPlaceCaret(hit.field, caret, caret, !!(editorPadCaret && editorSymbolsIsOpen()));
  clearEditorNotice();
  refreshEditor();
  return true;
}

function editorPitchTokenWith(hit, acc, dur, dot) {
  var suffix;
  var useDot = typeof dot === "boolean" ? dot : !!editorNote.dot;
  var useDur = dur === undefined ? editorNote.dur : dur;
  var code = editorDurCode(useDur);
  if (useDot) {
    suffix = (code || "q") + ".";
  } else {
    suffix = code;
  }
  return hit.letter + (acc === undefined ? hit.acc || "" : acc) + String(hit.oct) + suffix;
}

function editorRhythmTokenWith(hit, dur, dot) {
  var useDot = typeof dot === "boolean" ? dot : !!editorNote.dot;
  var useDur = dur === undefined ? editorNote.dur : dur;
  var suffix = (editorDurCode(useDur) || "q") + (useDot ? "." : "");
  return (hit.kind === "rest" ? "r" : "/") + suffix;
}

function editorEarlierPitch() {
  var field = editorActiveField();
  var before;
  var re;
  var last;
  var m;
  var prev;
  if (!field) {
    return null;
  }
  before = String(field.value || "").slice(0, editorReadSelection(field).start);
  re = /[A-G](?:#|b|n)?\d(?:[whqesn]\.?|\.)?/g;
  last = null;
  while ((m = re.exec(before))) {
    if (m.index > 0) {
      prev = before.charAt(m.index - 1);
      if (prev !== " " && prev !== "\n" && prev !== "\t" && prev !== "|" && prev !== "~" && prev !== "{") {
        continue;
      }
    }
    last = m[0];
  }
  return editorParsePitchToken(last);
}

function editorLetterToken(letter) {
  return String(letter || "C") + (editorNote.acc || "") + String(editorWorkingOctave()) + editorPitchSuffix();
}

function editorNotePadStampNow() {
  var field = editorActiveField();
  return [
    editorStaffOn() ? "staff" : "text",
    editorNote.acc || "",
    editorNote.oct === null || editorNote.oct === undefined ? "" : String(editorNote.oct),
    editorNote.dot ? "." : "",
    editorNote.dur || "",
    String(editorWorkingOctave()),
    editorClefName(),
    currentEditorLine(),
    field ? String(editorReadSelection(field).start) : "0",
    typeof eizationLang === "string" ? eizationLang : "",
    t("edit.noteHigher")
  ].join("~");
}

function editorSvgEl(name, attrs) {
  var el = document.createElementNS("http://www.w3.org/2000/svg", name);
  var key;
  for (key in attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, key)) {
      el.setAttribute(key, attrs[key]);
    }
  }
  return el;
}

function editorFitIcon(svg) {
  var box = null;
  svg.setAttribute("width", "64");
  svg.setAttribute("height", "64");
  svg.style.position = "absolute";
  svg.style.left = "-10000px";
  svg.style.top = "0";
  if (document.body) {
    document.body.appendChild(svg);
    try {
      box = svg.getBBox();
    } catch (err) {
      box = null;
    }
    if (svg.parentNode) {
      svg.parentNode.removeChild(svg);
    }
  }
  svg.style.position = "";
  svg.style.left = "";
  svg.style.top = "";
  if (!box || !(box.height > 0)) {
    svg.setAttribute("viewBox", "-100 -1000 800 1400");
  } else {
    var w = box.width > 1 ? box.width : Math.max(box.height * 0.16, 24);
    var x = box.width > 1 ? box.x : box.x - w / 2;
    var pad = Math.max(w, box.height) * 0.12;
    svg.setAttribute("viewBox", (x - pad) + " " + (box.y - pad) + " " + (w + pad * 2) + " " + (box.height + pad * 2));
  }
  svg.setAttribute("width", "32");
  svg.setAttribute("height", "32");
  svg.setAttribute("class", "edit-music-icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
}

function editorPlainIcon(node) {
  var svg = editorSvgEl("svg", {});
  svg.appendChild(node);
  return editorFitIcon(svg);
}

function editorDurParts(raw) {
  var text = String(raw || "");
  var dotted = text.charAt(text.length - 1) === ".";
  return {
    base: dotted ? text.slice(0, -1) : text,
    dotted: dotted
  };
}

function editorBuildIcon(kind) {
  var space = 250;
  var head = 1.18 * space;
  var stemX = head * 0.925;
  var stemLen = 3.5 * space;
  var svg = editorSvgEl("svg", {});
  if (kind === "acc-none") {
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, "noteheadBlack", 0, 0, space);
    }
    return editorFitIcon(svg);
  }
  if (kind === "acc-b" || kind === "acc-#" || kind === "acc-n") {
    var accName = kind === "acc-b" ? "accidentalFlat" : kind === "acc-#" ? "accidentalSharp" : "accidentalNatural";
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, accName, 0, 0, space);
    }
    return editorFitIcon(svg);
  }
  if (kind === "clef-treble" || kind === "clef-bass") {
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, kind === "clef-bass" ? "fClef" : "gClef", 0, 0, space);
    }
    return editorFitIcon(svg);
  }
  if (kind.indexOf("dur-") === 0) {
    var dur = editorDurParts(kind.slice(4));
    var headName = dur.base === "w" ? "noteheadWhole" : dur.base === "h" ? "noteheadHalf" : "noteheadBlack";
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, headName, 0, 0, space);
    }
    if (dur.base !== "w") {
      svg.appendChild(editorSvgEl("line", {
        x1: String(stemX),
        y1: "24",
        x2: String(stemX),
        y2: String(-stemLen),
        stroke: "currentColor",
        "stroke-width": "28"
      }));
    }
    if (dur.base === "e" && typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, "flag8thUp", stemX, -stemLen, space);
    }
    if (dur.base === "s" && typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, "flag16thUp", stemX, -stemLen, space);
    }
    if (dur.dotted && typeof staffPlaceGlyph === "function") {
      var noteDotX = head + 70;
      var noteDotY = -40;
      if (typeof staffGlyphAdvance === "function") {
        noteDotX = staffGlyphAdvance(headName, space) + 50;
      }
      if (dur.base === "e" || dur.base === "s") {
        noteDotX = stemX + (dur.base === "s" ? 390 : 330);
        noteDotY = 36;
      }
      staffPlaceGlyph(svg, "augmentationDot", noteDotX, noteDotY, space);
    }
    return editorFitIcon(svg);
  }
  if (kind.indexOf("slash-") === 0) {
    var slashDur = editorDurParts(kind.slice(6));
    var slashHead = slashDur.base === "w" ? "noteheadSlashWhiteWhole" : slashDur.base === "h" ? "noteheadSlashWhiteHalf" : "noteheadSlash";
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, slashHead, 0, 0, space);
    }
    if (slashDur.base !== "w") {
      svg.appendChild(editorSvgEl("line", {
        x1: "8",
        y1: String(space),
        x2: "8",
        y2: String(space + stemLen),
        stroke: "currentColor",
        "stroke-width": "28"
      }));
      if (slashDur.base === "e" && typeof staffPlaceGlyph === "function") {
        staffPlaceGlyph(svg, "flag8thDown", 8, space + stemLen, space);
      }
      if (slashDur.base === "s" && typeof staffPlaceGlyph === "function") {
        staffPlaceGlyph(svg, "flag16thDown", 8, space + stemLen, space);
      }
    }
    if (slashDur.dotted && typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, "augmentationDot", 2.12 * space + 40, 40, space);
    }
    return editorFitIcon(svg);
  }
  if (kind.indexOf("rest-") === 0) {
    var restDur = editorDurParts(kind.slice(5));
    var restName = restDur.base === "w" ? "restWhole" : restDur.base === "h" ? "restHalf" : restDur.base === "s" ? "rest16th" : restDur.base === "e" ? "rest8th" : "restQuarter";
    var restLine;
    if (restName === "restWhole" || restName === "restHalf") {
      for (restLine = -1; restLine <= 1; restLine++) {
        svg.appendChild(editorSvgEl("line", {
          x1: "-90",
          y1: String(restLine * 160),
          x2: "430",
          y2: String(restLine * 160),
          stroke: "currentColor",
          "stroke-width": "28"
        }));
      }
    }
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, restName, 20, 0, space);
    }
    if (restDur.dotted && typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, "augmentationDot", 340, restName === "restHalf" ? -50 : 50, space);
    }
    return editorFitIcon(svg);
  }
  if (kind === "bar") {
    return editorPlainIcon(editorSvgEl("rect", {
      x: "32",
      y: "8",
      width: "16",
      height: "184",
      fill: "currentColor"
    }));
  }
  if (kind === "tie") {
    return editorPlainIcon(editorSvgEl("path", {
      d: "M20 36 Q120 120 220 36",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "16",
      "stroke-linecap": "round"
    }));
  }
  if (kind === "beam") {
    var gap = head + 160;
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, "noteheadBlack", 0, 0, space);
      staffPlaceGlyph(svg, "noteheadBlack", gap, 0, space);
    }
    svg.appendChild(editorSvgEl("line", {
      x1: String(stemX),
      y1: "24",
      x2: String(stemX),
      y2: String(-stemLen),
      stroke: "currentColor",
      "stroke-width": "28"
    }));
    svg.appendChild(editorSvgEl("line", {
      x1: String(gap + stemX),
      y1: "24",
      x2: String(gap + stemX),
      y2: String(-stemLen),
      stroke: "currentColor",
      "stroke-width": "28"
    }));
    svg.appendChild(editorSvgEl("line", {
      x1: String(stemX),
      y1: String(-stemLen),
      x2: String(gap + stemX),
      y2: String(-stemLen),
      stroke: "currentColor",
      "stroke-width": String(space * 0.5),
      "stroke-linecap": "butt"
    }));
    return editorFitIcon(svg);
  }
  if (kind === "stack") {
    var stackYs = [220, 0, -220];
    var stackI;
    if (typeof staffPlaceGlyph === "function") {
      for (stackI = 0; stackI < stackYs.length; stackI++) {
        staffPlaceGlyph(svg, "noteheadBlack", 0, stackYs[stackI], space);
      }
    }
    svg.appendChild(editorSvgEl("line", {
      x1: String(stemX),
      y1: String(stackYs[0] + 24),
      x2: String(stemX),
      y2: String(stackYs[2] - stemLen * 0.45),
      stroke: "currentColor",
      "stroke-width": "28"
    }));
    return editorFitIcon(svg);
  }
  if (kind === "tuplet") {
    var tupGap = head + 100;
    var tupI;
    if (typeof staffPlaceGlyph === "function") {
      for (tupI = 0; tupI < 3; tupI++) {
        staffPlaceGlyph(svg, "noteheadBlack", tupI * tupGap, 0, space);
      }
    }
    for (tupI = 0; tupI < 3; tupI++) {
      svg.appendChild(editorSvgEl("line", {
        x1: String(tupI * tupGap + stemX),
        y1: "24",
        x2: String(tupI * tupGap + stemX),
        y2: String(-stemLen * 0.85),
        stroke: "currentColor",
        "stroke-width": "28"
      }));
    }
    svg.appendChild(editorSvgEl("path", {
      d:
        "M" +
        stemX +
        " " +
        String(-stemLen * 0.85) +
        " L" +
        String(2 * tupGap + stemX) +
        " " +
        String(-stemLen * 0.85),
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "22",
      "stroke-linecap": "round"
    }));
    var tupLabel = editorSvgEl("text", {
      x: String(tupGap + stemX),
      y: String(-stemLen * 0.85 - 40),
      fill: "currentColor",
      "font-size": "200",
      "font-family": "system-ui, sans-serif",
      "font-weight": "600",
      "text-anchor": "middle"
    });
    tupLabel.textContent = "3";
    svg.appendChild(tupLabel);
    return editorFitIcon(svg);
  }
  if (kind === "chord") {
    var staffY;
    for (staffY = -2; staffY <= 2; staffY++) {
      svg.appendChild(editorSvgEl("line", {
        x1: "-40",
        y1: String(staffY * space),
        x2: "520",
        y2: String(staffY * space),
        stroke: "currentColor",
        "stroke-width": "22",
        opacity: "0.55"
      }));
    }
    if (typeof staffPlaceGlyph === "function") {
      staffPlaceGlyph(svg, "noteheadBlack", 40, 0, space);
    }
    svg.appendChild(editorSvgEl("line", {
      x1: String(40 + stemX),
      y1: "24",
      x2: String(40 + stemX),
      y2: String(-stemLen * 0.7),
      stroke: "currentColor",
      "stroke-width": "28"
    }));
    var chordLabel = editorSvgEl("text", {
      x: "300",
      y: String(-stemLen * 0.72),
      fill: "currentColor",
      "font-size": "220",
      "font-family": "system-ui, sans-serif",
      "font-weight": "600"
    });
    chordLabel.textContent = "C\u22067";
    svg.appendChild(chordLabel);
    return editorFitIcon(svg);
  }
  return editorFitIcon(svg);
}

function editorMusicIcon(kind) {
  if (!editorIconCache[kind]) {
    editorIconCache[kind] = editorBuildIcon(kind);
  }
  return editorIconCache[kind].cloneNode(true);
}

function editorPadButton(row, attrs, face, label, pressed) {
  var button = document.createElement("button");
  var key;
  button.type = "button";
  for (key in attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, key)) {
      button.setAttribute(key, attrs[key]);
    }
  }
  if (face && face.nodeType) {
    button.appendChild(face);
  } else {
    button.textContent = face || "";
  }
  if (label) {
    button.setAttribute("aria-label", label);
    button.title = label;
  }
  if (pressed === true || pressed === false) {
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  row.appendChild(button);
  return button;
}

function editorPaintLetters(row) {
  var letters = ["C", "D", "E", "F", "G", "A", "B"];
  var i;
  for (i = 0; i < letters.length; i++) {
    editorPadButton(row, { "data-note": letters[i] }, letters[i], letters[i]);
  }
}

function editorPaintOctave(row) {
  var oct = String(editorWorkingOctave());
  var mark = document.createElement("span");
  var label = t("edit.noteOctave").replace("{n}", oct);
  mark.className = "edit-note-octave";
  mark.setAttribute("data-octave", oct);
  mark.textContent = oct;
  mark.setAttribute("aria-label", label);
  mark.title = label;
  row.appendChild(mark);
}

function editorHistoryIcon(kind) {
  var svg = editorSvgEl("svg", {
    viewBox: "0 0 24 24",
    class: "chrome-icon",
    "aria-hidden": "true",
    focusable: "false"
  });
  function strokePath(d) {
    return editorSvgEl("path", {
      d: d,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
  }
  if (kind === "redo") {
    svg.appendChild(strokePath("M21 9l-4-4-4 4"));
    svg.appendChild(strokePath("M17 5v7a5 5 0 0 1-9 3.5"));
  } else if (kind === "erase") {
    svg.appendChild(strokePath("M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"));
    svg.appendChild(strokePath("M18 9l-6 6"));
    svg.appendChild(strokePath("M12 9l6 6"));
  } else {
    svg.appendChild(strokePath("M3 9l4-4 4 4"));
    svg.appendChild(strokePath("M7 5v7a5 5 0 0 0 9 3.5"));
  }
  return svg;
}

/* Longest music-event prefix (pitch/rest/slash with affixes, or a mark). */
function editorLongestEventPrefix(text) {
  var s = String(text || "");
  var best = null;
  var i;
  var slice;
  var key;
  var ch;
  if (!s) {
    return null;
  }
  ch = s.charAt(0);
  if (ch === "|" || ch === "~" || ch === "{" || ch === "}" || ch === "[" || ch === "]" || ch === "\u00B7") {
    return ch;
  }
  if (s.indexOf("@key=") === 0) {
    key = /^@key=\S+/.exec(s);
    return key ? key[0] : null;
  }
  if (s.indexOf("@bass") === 0) {
    return "@bass";
  }
  if (s.indexOf("@treble") === 0) {
    return "@treble";
  }
  for (i = 1; i <= s.length; i++) {
    slice = s.slice(0, i);
    if (typeof staffParsePitchToken === "function" && staffParsePitchToken(slice)) {
      best = slice;
      continue;
    }
    if (typeof staffParseRestToken === "function" && staffParseRestToken(slice)) {
      best = slice;
      continue;
    }
    if (typeof staffParseSlashToken === "function" && staffParseSlashToken(slice, "treble")) {
      best = slice;
    }
  }
  if (best) {
    return best;
  }
  key = /^(?:\^[^\s|~{}[\]]+|_[^\s|~{}[\]]+)/.exec(s);
  return key ? key[0] : null;
}

/* Split a glued run into events: C4q~ → C4q, ~ ; B4e_6 → B4e_6. */
function editorMusicEventSpans(word) {
  var s = String(word || "");
  var spans = [];
  var i = 0;
  var prefix;
  while (i < s.length) {
    prefix = editorLongestEventPrefix(s.slice(i));
    if (!prefix) {
      spans.push({ start: i, end: i + 1, token: s.charAt(i) });
      i += 1;
      continue;
    }
    spans.push({ start: i, end: i + prefix.length, token: prefix });
    i += prefix.length;
  }
  return spans;
}

function editorPickEventSpan(spans, caretInWord) {
  var i;
  var span;
  if (!spans || !spans.length) {
    return null;
  }
  for (i = 0; i < spans.length; i++) {
    span = spans[i];
    if (span.start < caretInWord && caretInWord <= span.end) {
      return span;
    }
  }
  for (i = 0; i < spans.length; i++) {
    span = spans[i];
    if (span.start <= caretInWord && caretInWord < span.end) {
      return span;
    }
  }
  return spans[spans.length - 1];
}

function editorLineMusicOk(line) {
  var status;
  if (typeof staffNotationStatus !== "function") {
    return false;
  }
  status = staffNotationStatus(line);
  return !!(status && status.ok);
}

function editorEraseWordStop(ch) {
  return !ch || /\s/.test(ch) || ch === "}" || ch === "]" || ch === ")";
}

function editorIsMusicEraseToken(tok) {
  tok = String(tok || "");
  if (!tok || tok === "{" || tok === "}" || tok === "[" || tok === "]" || tok === "(" || tok === ")" || tok === "~" || tok === "|") {
    return false;
  }
  if (typeof staffParsePitchToken === "function" && staffParsePitchToken(tok)) {
    return true;
  }
  if (typeof staffParseRestToken === "function" && staffParseRestToken(tok)) {
    return true;
  }
  if (typeof staffParseSlashToken === "function" && staffParseSlashToken(tok, "treble")) {
    return true;
  }
  return false;
}

function editorStackAffixEnd(line, afterBracket) {
  var best = afterBracket;
  var k;
  var slice;
  if (typeof staffParseAffixes !== "function") {
    return afterBracket;
  }
  for (k = afterBracket + 1; k <= line.length; k++) {
    slice = line.slice(afterBracket, k);
    if (/\s/.test(slice)) {
      break;
    }
    if (staffParseAffixes(slice)) {
      best = k;
    } else if (best > afterBracket) {
      break;
    }
  }
  return best;
}

function editorMatchGroupClose(line, openAt, openCh, closeCh) {
  var depth = 1;
  var j;
  var ch;
  for (j = openAt + 1; j < line.length; j++) {
    ch = line.charAt(j);
    if (ch === openCh) {
      depth += 1;
    } else if (ch === closeCh) {
      depth -= 1;
      if (!depth) {
        return j;
      }
    }
  }
  return -1;
}

/* Balanced { }, [ ]^…, and (3 … ) / (5:4 … ) spans on one example line. */
function editorFindBalancedGroups(line) {
  var groups = [];
  var i;
  var ch;
  var close;
  var tuplet;
  var openEnd;
  line = String(line || "");
  for (i = 0; i < line.length; i++) {
    ch = line.charAt(i);
    if (ch === "{") {
      close = editorMatchGroupClose(line, i, "{", "}");
      if (close < 0) {
        continue;
      }
      groups.push({
        kind: "beam",
        open: i,
        openEnd: i + 1,
        innerStart: i + 1,
        innerEnd: close,
        closeStart: close,
        closeEnd: close + 1
      });
    } else if (ch === "[") {
      close = editorMatchGroupClose(line, i, "[", "]");
      if (close < 0) {
        continue;
      }
      groups.push({
        kind: "stack",
        open: i,
        openEnd: i + 1,
        innerStart: i + 1,
        innerEnd: close,
        closeStart: close,
        closeEnd: editorStackAffixEnd(line, close + 1)
      });
    } else if (ch === "(") {
      tuplet = /^\((\d{1,2})(?::(\d{1,2}))?/.exec(line.slice(i));
      if (!tuplet) {
        continue;
      }
      openEnd = i + tuplet[0].length;
      close = line.indexOf(")", openEnd);
      if (close < 0) {
        continue;
      }
      groups.push({
        kind: "tuplet",
        open: i,
        openEnd: openEnd,
        innerStart: openEnd,
        innerEnd: close,
        closeStart: close,
        closeEnd: close + 1
      });
    }
  }
  return groups;
}

function editorInnerMusicSpans(line, group) {
  var inner = line.slice(group.innerStart, group.innerEnd);
  var spans = [];
  var re = /\S+/g;
  var m;
  var first = true;
  var wordSpans;
  var w;
  var tok;
  while ((m = re.exec(inner))) {
    tok = m[0];
    if (group.kind === "tuplet" && first && /^\d{1,2}(:\d{1,2})?$/.test(tok)) {
      first = false;
      continue;
    }
    first = false;
    if (tok.charAt(tok.length - 1) === ")" && tok.length > 1 && group.kind === "tuplet") {
      tok = tok.slice(0, -1);
    }
    wordSpans = editorMusicEventSpans(tok);
    for (w = 0; w < wordSpans.length; w++) {
      if (!editorIsMusicEraseToken(wordSpans[w].token)) {
        continue;
      }
      spans.push({
        start: group.innerStart + m.index + wordSpans[w].start,
        end: group.innerStart + m.index + wordSpans[w].start + wordSpans[w].token.length,
        token: wordSpans[w].token
      });
    }
  }
  return spans;
}

function editorStaffGroupShellTarget(line, g) {
  var start = g.open;
  var end = g.closeEnd;
  if (start > 0 && /\s/.test(line.charAt(start - 1))) {
    start -= 1;
  }
  return { start: start, end: end, token: line.slice(g.open, g.closeEnd), kind: "token" };
}

/*
 * On a drawn staff, Erase after } ] ) peels the last inner event. The last
 * inner event (or a two-note tuplet, which cannot stand alone) takes the shell
 * with it so the line does not sit on empty braces. An empty pad shell
 * ({ } / [ ] / (3 )) still clears in one tap.
 */
function editorStaffGroupEraseTarget(line, rel) {
  var groups;
  var g;
  var i;
  var music;
  var last;
  var start;
  var end;
  var statusOk;
  var onCloser;
  var inside;
  var probe;
  var clearShell;
  line = String(line || "");
  groups = editorFindBalancedGroups(line);
  if (!groups.length) {
    return null;
  }
  statusOk = editorLineMusicOk(line);
  g = null;
  for (i = groups.length - 1; i >= 0; i--) {
    if (groups[i].open < rel && rel <= groups[i].closeEnd) {
      g = groups[i];
      break;
    }
  }
  if (!g) {
    probe = rel;
    while (probe > 0 && /\s/.test(line.charAt(probe - 1))) {
      probe -= 1;
    }
    for (i = groups.length - 1; i >= 0; i--) {
      if (probe >= groups[i].closeStart && probe <= groups[i].closeEnd) {
        g = groups[i];
        break;
      }
    }
  }
  if (!g) {
    return null;
  }
  music = editorInnerMusicSpans(line, g);
  /* Caret after the closer, or parked on it after a peel (rel === closeStart). */
  onCloser = rel >= g.closeStart && rel <= g.closeEnd;
  if (!onCloser) {
    probe = rel;
    while (probe > 0 && /\s/.test(line.charAt(probe - 1))) {
      probe -= 1;
    }
    onCloser = probe >= g.closeStart && probe <= g.closeEnd;
  }
  inside = rel > g.open && rel < g.closeStart;
  if (!music.length) {
    if (onCloser || inside || rel === g.closeEnd) {
      return editorStaffGroupShellTarget(line, g);
    }
    return null;
  }
  if (!statusOk) {
    return null;
  }
  if (!onCloser) {
    return null;
  }
  /* Last note (or a tuplet that would drop below two) removes the whole group. */
  clearShell = music.length <= 1 || (g.kind === "tuplet" && music.length <= 2);
  if (clearShell) {
    return editorStaffGroupShellTarget(line, g);
  }
  last = music[music.length - 1];
  start = last.start;
  end = last.end;
  if (start > g.innerStart && /\s/.test(line.charAt(start - 1))) {
    start -= 1;
  }
  return { start: start, end: end, token: last.token, kind: "token" };
}

/* Token or selection Erase would remove on a staff line (field coordinates). */
function editorStaffEraseTarget() {
  var field = editorActiveField();
  var value;
  var sel;
  var caret;
  var lineStart;
  var lineEnd;
  var line;
  var rel;
  var wordStart;
  var wordEnd;
  var spans;
  var span;
  var start;
  var end;
  var token;
  var groupTarget;
  if (!field) {
    return null;
  }
  value = String(field.value || "");
  sel = editorReadSelection(field);
  caret = sel.start;
  if (sel.start !== sel.end) {
    return {
      start: sel.start,
      end: sel.end,
      token: value.slice(sel.start, sel.end),
      kind: "selection"
    };
  }
  lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  lineEnd = value.indexOf("\n", caret);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  if (caret < lineStart || caret > lineEnd) {
    return null;
  }
  line = value.slice(lineStart, lineEnd);
  rel = caret - lineStart;
  groupTarget = editorStaffGroupEraseTarget(line, rel);
  if (groupTarget) {
    return {
      start: lineStart + groupTarget.start,
      end: lineStart + groupTarget.end,
      token: groupTarget.token,
      kind: groupTarget.kind
    };
  }
  if (rel > 0 && !String(line.slice(0, rel)).replace(/\s+$/, "")) {
    return {
      start: caret - 1,
      end: caret,
      token: " ",
      kind: "char"
    };
  }
  /* Word that contains the caret, or the previous word when the caret is in spaces.
   * Stop before a group closer so B4e_7} does not become one erasable run. */
  if (rel > 0 && !editorEraseWordStop(line.charAt(rel - 1))) {
    wordEnd = rel;
    while (wordEnd < line.length && !editorEraseWordStop(line.charAt(wordEnd))) {
      wordEnd += 1;
    }
    wordStart = rel;
    while (wordStart > 0 && !editorEraseWordStop(line.charAt(wordStart - 1))) {
      wordStart -= 1;
    }
  } else if (rel > 0 && (line.charAt(rel - 1) === "}" || line.charAt(rel - 1) === "]" || line.charAt(rel - 1) === ")")) {
    /* Alone on a closer with no group peel: delete just that mark. */
    return {
      start: caret - 1,
      end: caret,
      token: line.charAt(rel - 1),
      kind: "token"
    };
  } else if (rel < line.length && !editorEraseWordStop(line.charAt(rel))) {
    wordStart = rel;
    wordEnd = rel;
    while (wordEnd < line.length && !editorEraseWordStop(line.charAt(wordEnd))) {
      wordEnd += 1;
    }
  } else if (rel > 0) {
    wordEnd = rel;
    while (wordEnd > 0 && /\s/.test(line.charAt(wordEnd - 1))) {
      wordEnd -= 1;
    }
    if (wordEnd > 0 && (line.charAt(wordEnd - 1) === "}" || line.charAt(wordEnd - 1) === "]" || line.charAt(wordEnd - 1) === ")")) {
      return {
        start: lineStart + wordEnd - 1,
        end: lineStart + wordEnd,
        token: line.charAt(wordEnd - 1),
        kind: "token"
      };
    }
    wordStart = wordEnd;
    while (wordStart > 0 && !editorEraseWordStop(line.charAt(wordStart - 1))) {
      wordStart -= 1;
    }
  } else {
    return null;
  }
  if (wordEnd <= wordStart) {
    return {
      start: caret - 1,
      end: caret,
      token: " ",
      kind: "char"
    };
  }
  spans = editorMusicEventSpans(line.slice(wordStart, wordEnd));
  span = editorPickEventSpan(spans, rel - wordStart);
  if (!span) {
    return null;
  }
  start = lineStart + wordStart + span.start;
  end = lineStart + wordStart + span.end;
  token = span.token;
  if (start > lineStart && /\s/.test(value.charAt(start - 1))) {
    start -= 1;
  }
  return {
    start: start,
    end: end,
    token: token,
    kind: "token"
  };
}

function editorEraseLabel() {
  var target;
  if (!editorStaffOn()) {
    return t("edit.clearExample");
  }
  if (editorCanUndoStaffTyping()) {
    return t("edit.erase");
  }
  target = editorStaffEraseTarget();
  if (!target) {
    return t("edit.erase");
  }
  if (target.kind === "selection") {
    return t("edit.eraseSelection");
  }
  if (target.token && target.token !== " ") {
    return t("edit.eraseToken").replace("{token}", target.token);
  }
  return t("edit.erase");
}

function editorCanErase() {
  var line;
  if (!editorStaffOn()) {
    line = currentEditorLine();
    return !!collapseEditorSpaces(line);
  }
  if (editorCanUndoStaffTyping()) {
    return true;
  }
  return !!editorStaffEraseTarget();
}

function editorClearCurrentExample() {
  var span = editorLineSpan();
  var silent;
  if (!span) {
    return;
  }
  if (!span.value.slice(span.lineStart, span.lineEnd)) {
    return;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  span.field.value = span.value.slice(0, span.lineStart) + span.value.slice(span.lineEnd);
  editorPlaceCaret(span.field, span.lineStart, span.lineStart, silent);
  clearEditorNotice();
  refreshEditor();
}

function editorStripTrailingOrphans(line) {
  return String(line || "").replace(/(?:\s*[|~])+\s*$/g, "").replace(/\s+$/g, "");
}

function editorLineMusicTokenCount(line) {
  var words;
  var i;
  var spans;
  var n = 0;
  var w;
  words = String(line || "").match(/\S+/g) || [];
  for (i = 0; i < words.length; i++) {
    spans = editorMusicEventSpans(words[i]);
    for (w = 0; w < spans.length; w++) {
      if (editorIsMusicEraseToken(spans[w].token)) {
        n += 1;
      }
    }
  }
  return n;
}

/* After a peel, park the caret just before } ] ) so the next write stays inside. */
function editorSnapCaretBeforeGroupCloser(field, lineStart, preferred) {
  var value;
  var lineEnd;
  var line;
  var rel;
  var groups;
  var g;
  var i;
  var caret;
  var silent;
  if (!field) {
    return;
  }
  value = String(field.value || "");
  lineEnd = value.indexOf("\n", lineStart);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  line = value.slice(lineStart, lineEnd);
  rel = preferred - lineStart;
  if (rel < 0) {
    rel = 0;
  }
  if (rel > line.length) {
    rel = line.length;
  }
  groups = editorFindBalancedGroups(line);
  g = null;
  for (i = 0; i < groups.length; i++) {
    if (rel >= groups[i].open && rel <= groups[i].closeEnd) {
      g = groups[i];
    }
  }
  caret = preferred;
  if (g && rel <= g.closeStart) {
    caret = lineStart + g.closeStart;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(field, caret, caret, silent);
}

function editorStopEraseRepeat() {
  if (editorEraseRepeatDelay) {
    window.clearTimeout(editorEraseRepeatDelay);
    editorEraseRepeatDelay = null;
  }
  if (editorEraseRepeatTimer) {
    window.clearInterval(editorEraseRepeatTimer);
    editorEraseRepeatTimer = null;
  }
  editorEraseHoldUndoPushed = false;
}

/* opts.skipUndo: hold-repeat steps share one undo pushed by the first tap. */
function editorEraseStep(opts) {
  var field;
  var target;
  var value;
  var silent;
  var skipUndo = !!(opts && opts.skipUndo);
  var line;
  var lineStart;
  var lineEnd;
  var linePart;
  var edited;
  var relStart;
  var relEnd;
  var caret;
  var now;
  var doubleTap;
  var span;
  if (!editorCanErase()) {
    return false;
  }
  now = Date.now();
  doubleTap = now - editorEraseLastAt < 450;
  editorEraseLastAt = now;
  if (!editorStaffOn()) {
    if (!skipUndo) {
      editorPushSymbolUndo();
    }
    editorClearCurrentExample();
    return true;
  }
  line = currentEditorLine();
  if (
    doubleTap &&
    !skipUndo &&
    collapseEditorSpaces(line) &&
    editorLineMusicTokenCount(line) === 0
  ) {
    if (!skipUndo) {
      editorPushSymbolUndo();
    }
    editorClearCurrentExample();
    return true;
  }
  /* Broken staff: one Erase restores the last drawable line. */
  if (editorCanUndoStaffTyping() && editorLastValidSnap) {
    if (!skipUndo) {
      editorPushSymbolUndo();
    }
    editorApplySymbolSnapshot(editorCloneSymbolSnap(editorLastValidSnap));
    editorStaffTypingDirty = false;
    editorPaintUndoRedo();
    return true;
  }
  target = editorStaffEraseTarget();
  if (!target) {
    return false;
  }
  field = editorActiveField();
  if (!field) {
    return false;
  }
  if (!skipUndo) {
    editorPushSymbolUndo();
  }
  value = String(field.value || "");
  span = editorLineSpan();
  lineStart = span ? span.lineStart : 0;
  lineEnd = span ? span.lineEnd : value.length;
  linePart = value.slice(lineStart, lineEnd);
  relStart = target.start - lineStart;
  relEnd = target.end - lineStart;
  if (relStart < 0) {
    relStart = 0;
  }
  if (relEnd < relStart) {
    relEnd = relStart;
  }
  if (relEnd > linePart.length) {
    relEnd = linePart.length;
  }
  edited = editorStripTrailingOrphans(linePart.slice(0, relStart) + linePart.slice(relEnd));
  field.value = value.slice(0, lineStart) + edited + value.slice(lineEnd);
  caret = lineStart + Math.min(relStart, edited.length);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(field, caret, caret, silent);
  editorSnapCaretBeforeGroupCloser(field, lineStart, caret);
  clearEditorNotice();
  refreshEditor();
  return true;
}

function editorPaintClefToggle(row) {
  var next = editorClefName() === "bass" ? "treble" : "bass";
  var label = next === "bass" ? t("edit.clefBass") : t("edit.clefTreble");
  /* Icon is the clef you get next — one control, not two pressed states. */
  editorPadButton(row, { "data-clef": next }, editorMusicIcon("clef-" + next), label);
}

function editorPaintModifiers(row) {
  var hit = editorPitchAtCaret();
  var litAcc = hit ? hit.acc || "" : editorNote.acc || "";
  var octaveGroup = document.createElement("div");
  octaveGroup.className = "edit-note-octave-group";
  editorPadButton(row, { "data-acc": "b" }, editorMusicIcon("acc-b"), t("sym.flat"), litAcc === "b");
  editorPadButton(row, { "data-acc": "#" }, editorMusicIcon("acc-#"), t("sym.sharp"), litAcc === "#");
  editorPadButton(row, { "data-acc": "n" }, editorMusicIcon("acc-n"), t("sym.natural"), litAcc === "n");
  editorPadButton(octaveGroup, { "data-shift": "-1" }, "\u2193", t("edit.noteLower"));
  editorPaintOctave(octaveGroup);
  editorPadButton(octaveGroup, { "data-shift": "1" }, "\u2191", t("edit.noteHigher"));
  row.appendChild(octaveGroup);
}

function editorClearSymbolHistory() {
  editorSymbolUndo = [];
  editorSymbolRedo = [];
  editorLastValidSnap = null;
  editorLastValidRenderKey = null;
  editorStaffTypingDirty = false;
  editorPaintUndoRedo();
}

function editorSymbolSnapshot() {
  var field = editorActiveField();
  var area = document.getElementById("allEdit");
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
  }
  return {
    doc: area ? String(area.value || "") : "",
    value: field ? String(field.value || "") : "",
    caret: field ? editorReadSelection(field).start : 0,
    focusIndex: editorFocusIndex,
    note: {
      acc: editorNote.acc || "",
      dur: editorNote.dur || "",
      dot: !!editorNote.dot,
      oct: editorNote.oct === null || editorNote.oct === undefined ? null : editorNote.oct
    }
  };
}

function editorCloneSymbolSnap(snap) {
  if (!snap) {
    return null;
  }
  return {
    doc: typeof snap.doc === "string" ? snap.doc : undefined,
    value: snap.value || "",
    caret: snap.caret || 0,
    focusIndex: typeof snap.focusIndex === "number" ? snap.focusIndex : 0,
    note: {
      acc: snap.note && snap.note.acc ? snap.note.acc : "",
      dur: snap.note && snap.note.dur ? snap.note.dur : "",
      dot: !!(snap.note && snap.note.dot),
      oct: snap.note && (snap.note.oct === 0 || snap.note.oct) ? snap.note.oct : null
    }
  };
}

function editorLineStaffValid(line, status) {
  if (!editorStaffOn()) {
    return false;
  }
  if (!line) {
    return true;
  }
  return !!(status && status.ok);
}

function editorCanUndoStaffTyping() {
  var field;
  if (!editorStaffTypingDirty || !editorLastValidSnap) {
    return false;
  }
  field = editorActiveField();
  return String((field && field.value) || "") !== String(editorLastValidSnap.value || "");
}

function editorSyncStaffHistoryAfterRefresh(line, status) {
  var snap;
  var valid;
  var pushed;
  var wasDirty;
  var renderKey;
  if (!editorStaffOn()) {
    if (editorLastValidSnap || editorStaffTypingDirty || editorLastValidRenderKey !== null) {
      editorLastValidSnap = null;
      editorLastValidRenderKey = null;
      editorStaffTypingDirty = false;
      editorPaintUndoRedo();
    }
    return;
  }
  valid = editorLineStaffValid(line, status);
  snap = editorSymbolSnapshot();
  if (valid) {
    pushed = false;
    wasDirty = editorStaffTypingDirty;
    /* Prefer drawn SVG HTML so trailing spaces / no-op text do not create undo steps. */
    renderKey = editorLastGoodStaffHtml || "";
    if (
      editorKeyboardStaffEdit &&
      editorLastValidRenderKey !== null &&
      renderKey !== editorLastValidRenderKey
    ) {
      editorSymbolUndo.push(editorCloneSymbolSnap(editorLastValidSnap));
      if (editorSymbolUndo.length > EDITOR_SYMBOL_HISTORY) {
        editorSymbolUndo.shift();
      }
      editorSymbolRedo = [];
      pushed = true;
    }
    editorLastValidSnap = editorCloneSymbolSnap(snap);
    editorLastValidRenderKey = renderKey;
    editorStaffTypingDirty = false;
    if (pushed || wasDirty) {
      editorPaintUndoRedo();
    }
  } else if (!editorStaffTypingDirty) {
    editorStaffTypingDirty = true;
    editorPaintUndoRedo();
  }
}

function editorPushSymbolUndo() {
  editorSymbolUndo.push(editorSymbolSnapshot());
  if (editorSymbolUndo.length > EDITOR_SYMBOL_HISTORY) {
    editorSymbolUndo.shift();
  }
  editorSymbolRedo = [];
  editorPaintUndoRedo();
}

function editorApplySymbolSnapshot(snap) {
  var field;
  var area;
  var lines;
  var doc;
  if (!snap) {
    return;
  }
  area = document.getElementById("allEdit");
  doc = typeof snap.doc === "string" ? snap.doc : null;
  if (editorIsFocusMode()) {
    editorFocusIndex = typeof snap.focusIndex === "number" ? snap.focusIndex : editorFocusIndex;
    if (area && doc !== null) {
      area.value = doc;
    }
    lines = editorRawLines();
    editorClampFocusIndex(lines.length);
    field = document.getElementById("editFocusLine");
    if (field) {
      field.value = doc !== null ? (lines[editorFocusIndex] || "") : (snap.value || "");
      if (doc === null) {
        editorSyncFocusToArea();
      }
      editorPlaceCaret(field, snap.caret || 0, snap.caret || 0, !!(editorPadCaret && editorSymbolsIsOpen()));
    }
  } else {
    field = document.getElementById("allEdit");
    if (field) {
      field.value = doc !== null ? doc : (snap.value || "");
      editorPlaceCaret(field, snap.caret || 0, snap.caret || 0, !!(editorPadCaret && editorSymbolsIsOpen()));
    }
  }
  editorNote.acc = snap.note && snap.note.acc ? snap.note.acc : "";
  editorNote.dur = snap.note && snap.note.dur ? snap.note.dur : "";
  editorNote.dot = !!(snap.note && snap.note.dot);
  editorNote.oct = snap.note && (snap.note.oct === 0 || snap.note.oct) ? snap.note.oct : null;
  lines = editorRawLines();
  editorClampFocusIndex(lines.length);
  clearEditorNotice();
  refreshEditor();
  editorPaintUndoRedo();
}

function editorSymbolUndoStep() {
  var current;
  if (editorCanUndoStaffTyping()) {
    current = editorSymbolSnapshot();
    editorSymbolRedo.push(editorCloneSymbolSnap(current));
    editorApplySymbolSnapshot(editorCloneSymbolSnap(editorLastValidSnap));
    editorStaffTypingDirty = false;
    editorPaintUndoRedo();
    return;
  }
  if (!editorSymbolUndo.length) {
    return;
  }
  current = editorSymbolSnapshot();
  editorSymbolRedo.push(editorCloneSymbolSnap(current));
  editorApplySymbolSnapshot(editorSymbolUndo.pop());
}

function editorSymbolRedoStep() {
  var current;
  if (!editorSymbolRedo.length) {
    return;
  }
  current = editorSymbolSnapshot();
  editorSymbolUndo.push(editorCloneSymbolSnap(current));
  editorApplySymbolSnapshot(editorSymbolRedo.pop());
}

function editorPaintUndoRedo() {
  var host = document.getElementById("editNoteHistory");
  var undoBtn;
  var redoBtn;
  var eraseBtn;
  if (!host) {
    return;
  }
  host.innerHTML = "";
  undoBtn = editorPadButton(host, { "data-undo": "1" }, editorHistoryIcon("undo"), t("edit.undo"));
  redoBtn = editorPadButton(host, { "data-redo": "1" }, editorHistoryIcon("redo"), t("edit.redo"));
  eraseBtn = editorPadButton(host, { "data-erase": "1" }, editorHistoryIcon("erase"), editorEraseLabel());
  undoBtn.disabled = !editorSymbolUndo.length && !editorCanUndoStaffTyping();
  redoBtn.disabled = !editorSymbolRedo.length;
  eraseBtn.disabled = !editorCanErase();
}

function editorWithKeyboardStaffEdit(fn) {
  editorKeyboardStaffEdit = true;
  try {
    fn();
  } finally {
    editorKeyboardStaffEdit = false;
  }
}

function editorPaintDurations(row) {
  var lit = editorDurCode(editorNote.dur);
  var choices = [
    ["w", "dur-w", "edit.noteWhole"],
    ["h", "dur-h", "edit.noteHalf"],
    ["", "dur-", "edit.noteQuarter"],
    ["e", "dur-e", "edit.noteEighth"],
    ["s", "dur-s", "edit.noteSixteenth"]
  ];
  var i;
  for (i = 0; i < choices.length; i++) {
    editorPadButton(row, { "data-dur": choices[i][0] }, editorMusicIcon(choices[i][1]), t(choices[i][2]), lit === choices[i][0]);
  }
  editorPadButton(row, { "data-dot": "1" }, editorMusicIcon("dur-" + (lit || "q") + "."), t("edit.noteDotted"), !!editorNote.dot);
}

function editorPaintNoteEvents(row) {
  var rhythm = editorRhythmSuffix();
  editorPadButton(row, { "data-event": "slash" }, editorMusicIcon("slash-" + rhythm), t("edit.noteSlash") + " " + editorSlashToken());
  editorPadButton(row, { "data-event": "rest" }, editorMusicIcon("rest-" + rhythm), t("edit.noteRest") + " " + editorRestToken());
  editorPadButton(row, { "data-event": "bar" }, editorMusicIcon("bar"), t("edit.noteBar"));
  editorPaintClefToggle(row);
  editorPadButton(row, { "data-event": "tie" }, editorMusicIcon("tie"), t("edit.noteTie"));
  editorPadButton(row, { "data-event": "beam" }, editorMusicIcon("beam"), t("edit.noteBeam"));
  editorPadButton(row, { "data-event": "tuplet" }, editorMusicIcon("tuplet"), t("edit.noteTuplet"));
  editorPadButton(row, { "data-event": "chord" }, editorMusicIcon("chord"), t("edit.noteChord"));
  editorPadButton(row, { "data-event": "stack" }, editorMusicIcon("stack"), t("edit.noteStack"));
}

function editorPaintNotePad() {
  var stepHost = document.getElementById("editNoteStep");
  var chipsHost = document.getElementById("editNoteChips");
  var durHost = document.getElementById("editNoteDurations");
  var eventsHost = document.getElementById("editNoteEvents");
  var stamp;
  if (!stepHost || !chipsHost || !durHost || !eventsHost) {
    return;
  }
  stamp = editorNotePadStampNow();
  if (stamp === editorNotePadStamp) {
    return;
  }
  stepHost.innerHTML = "";
  chipsHost.innerHTML = "";
  durHost.innerHTML = "";
  eventsHost.innerHTML = "";
  editorPaintLetters(stepHost);
  editorPaintModifiers(chipsHost);
  editorPaintDurations(durHost);
  editorPaintNoteEvents(eventsHost);
  editorNotePadStamp = stamp;
  editorPaintUndoRedo();
}

function editorWriteLetter(letter) {
  var token = editorLetterToken(letter);
  editorPushSymbolUndo();
  editorNote.acc = "";
  editorNote.oct = null;
  editorInsertSymbol(token);
}

function editorArmAcc(acc) {
  var hit;
  var nextAcc;
  var suffix;
  var next;
  acc = acc === "b" || acc === "#" || acc === "n" ? acc : "";
  hit = editorPitchAtCaret();
  if (hit) {
    nextAcc = (hit.acc || "") === acc ? "" : acc;
    suffix = hit.token.slice((hit.letter + (hit.acc || "") + String(hit.oct)).length);
    next = hit.letter + nextAcc + String(hit.oct) + suffix;
    if (editorReplaceCaretToken(hit, next)) {
      editorNote.acc = "";
      return;
    }
  }
  /* No note at the caret: seed a C so the accidental is visible right away. */
  editorNote.acc = acc;
  editorPushSymbolUndo();
  editorInsertSymbol(editorLetterToken("C"));
  editorNote.acc = "";
  editorNote.oct = null;
  editorPaintNotePad();
}

function editorSetDuration(dur) {
  var next = editorDurCode(dur);
  var hit = editorPitchAtCaret() || editorRhythmAtCaret();
  editorNote.dur = next;
  if (hit && hit.kind === "pitch") {
    if (editorReplaceCaretToken(hit, editorPitchTokenWith(hit, hit.acc || "", next, editorNote.dot))) {
      return;
    }
  } else if (hit) {
    if (editorReplaceCaretToken(hit, editorRhythmTokenWith(hit, next, editorNote.dot))) {
      return;
    }
  }
  editorPaintNotePad();
}

function editorToggleDot() {
  var next = !editorNote.dot;
  var hit = editorPitchAtCaret() || editorRhythmAtCaret();
  editorNote.dot = next;
  if (hit && hit.kind === "pitch") {
    if (editorReplaceCaretToken(hit, editorPitchTokenWith(hit, hit.acc || "", editorNote.dur, next))) {
      return;
    }
  } else if (hit) {
    if (editorReplaceCaretToken(hit, editorRhythmTokenWith(hit, editorNote.dur, next))) {
      return;
    }
  }
  editorPaintNotePad();
}

function editorShiftOctave(dir) {
  var hit;
  var oct;
  var suffix;
  var next;
  dir = dir < 0 ? -1 : 1;
  hit = editorPitchAtCaret();
  if (!hit) {
    /* No note at the caret: seed a C at the aimed octave. */
    editorNote.oct = editorClampOctave(editorWorkingOctave() + dir);
    editorPushSymbolUndo();
    editorInsertSymbol(editorLetterToken("C"));
    editorNote.acc = "";
    editorNote.oct = null;
    editorPaintNotePad();
    return;
  }
  oct = editorClampOctave(hit.oct + dir);
  if (oct === hit.oct) {
    editorPaintNotePad();
    return;
  }
  suffix = hit.token.slice((hit.letter + (hit.acc || "") + String(hit.oct)).length);
  next = hit.letter + (hit.acc || "") + String(oct) + suffix;
  if (!editorReplaceCaretToken(hit, next)) {
    return;
  }
  editorNote.oct = null;
}

function editorActivateSymbol(button) {
  var eventName;
  if (!button) {
    return;
  }
  if (button.hasAttribute("data-undo")) {
    editorSymbolUndoStep();
    return;
  }
  if (button.hasAttribute("data-redo")) {
    editorSymbolRedoStep();
    return;
  }
  if (button.hasAttribute("data-erase")) {
    editorEraseStep();
    return;
  }
  if (button.hasAttribute("data-note")) {
    editorWriteLetter(button.getAttribute("data-note"));
    return;
  }
  if (button.hasAttribute("data-acc")) {
    editorArmAcc(button.getAttribute("data-acc") || "");
    return;
  }
  if (button.hasAttribute("data-shift")) {
    editorShiftOctave(parseInt(button.getAttribute("data-shift"), 10));
    return;
  }
  if (button.hasAttribute("data-clef")) {
    editorSetClef(button.getAttribute("data-clef") || "");
    return;
  }
  if (button.hasAttribute("data-dot")) {
    editorToggleDot();
    return;
  }
  if (button.hasAttribute("data-dur")) {
    editorSetDuration(button.getAttribute("data-dur") || "");
    return;
  }
  eventName = button.getAttribute("data-event");
  if (eventName) {
    if (eventName === "slash") {
      editorPushSymbolUndo();
      editorInsertSymbol(editorSlashToken());
      return;
    }
    if (eventName === "rest") {
      editorPushSymbolUndo();
      editorInsertSymbol(editorRestToken());
      return;
    }
    if (eventName === "bar") {
      editorPushSymbolUndo();
      editorInsertSymbol("| ");
      return;
    }
    if (eventName === "tie") {
      editorPushSymbolUndo();
      editorInsertSymbol("~");
      return;
    }
    if (eventName === "beam") {
      /* Braces only beam eighths and sixteenths. A longer value would stay text. */
      if (editorNote.dur !== "e" && editorNote.dur !== "s") {
        editorNote.dur = "e";
      }
      editorPushSymbolUndo();
      editorInsertSymbol("{ }", 2);
      return;
    }
    if (eventName === "tuplet") {
      /* Triplets are usually short notes; match the beam pad default. */
      if (editorNote.dur !== "e" && editorNote.dur !== "s") {
        editorNote.dur = "e";
      }
      editorPushSymbolUndo();
      editorInsertSymbol("(3 )", 1);
      return;
    }
    if (eventName === "chord") {
      editorPushSymbolUndo();
      editorInsertSymbol("^");
      return;
    }
    if (eventName === "stack") {
      editorPushSymbolUndo();
      editorInsertSymbol("[ ]", 2);
      return;
    }
  }
  if (button.hasAttribute("data-symbol")) {
    editorDropNoteFlow();
    editorPushSymbolUndo();
    insertEditorText(button.getAttribute("data-symbol") || "", parseInt(button.getAttribute("data-caret") || "0", 10) || 0);
  }
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
  editorClearSymbolHistory();
  var face = document.getElementById("exerciseFace");
  var shown = face ? face.querySelector(".combo-value") : null;
  var desk = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  editorDraft.mode = options.mode === "create" ? "create" : "edit";
  editorDraft.label = shown ? shown.textContent : (desk ? desk.name : "");
  editorDraft.id = typeof currentExerciseId === "string" ? currentExerciseId : "";
  if (editorIsCreateMode()) {
    editorDraft.name = t("edit.defaultName");
    editorDraft.bars = 1;
    editorDraft.staff = true;
    editorDraft.text = "";
  } else {
    editorDraft.name = desk ? exerciseDisplayName(desk) : editorDraft.label;
    editorDraft.bars = typeof exerciseBars === "number" && exerciseBars > 0 ? exerciseBars : 1;
    editorDraft.staff = !!(desk && desk.staff);
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
  setEditorStaff(editorDraft.staff);
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
    editorDraft.staff = spec.staff === true;
    editorDraft.text = "";
  } else {
    editorDraft.id = target.id;
    editorDraft.name = typeof exerciseDisplayName === "function" ? exerciseDisplayName(target) : target.name;
    editorDraft.bars = target.bars;
    editorDraft.staff = spec.staff === true;
    editorDraft.text = editorPlainLines(target.lines);
  }
  editorDraft.storedLines = editorDraft.mode === "create" || !target ? null : editorPlainLines(target.lines);
  editorViewOverride = null;
  editorFocusIndex = 0;
  editorClearSymbolHistory();
  var area = document.getElementById("allEdit");
  area.value = editorPlainLines(spec.lines);
  document.getElementById("editBars").value = String(spec.bars || 1);
  setEditorStaff(editorDraft.staff);
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

function editorFileText(lines, bars, name, staff) {
  var out = "# eization " + EDITOR_FILE_VERSION + "\n# bars " + clampEditorBars(bars) + "\n# staff " + (staff ? "1" : "0") + "\n";
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
  var staff = null;
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
      var staffMatch = line.match(/^\s*#\s*staff\s+([01])\s*$/i);
      if (staffMatch) {
        staff = staffMatch[1] === "1";
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
    staff: staff,
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
  var blob = new Blob([editorFileText(lines, bars, name, editorStaffOn())], { type: "text/plain;charset=utf-8" });
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
    if (parsed.staff === true || parsed.staff === false) {
      setEditorStaff(parsed.staff);
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

function applyEditorToReel(lines, bars, staff) {
  var on = staff === true || staff === false ? staff : editorStaffOn();
  var items = [];
  for (var i = 0; i < lines.length; i++) {
    items.push(typeof deskDisplayItem === "function" ? deskDisplayItem(lines[i], on) : lineToItem(lines[i]));
  }
  newExercise(items, bars, on);
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
}

function editorBrokenStaffReport() {
  var raw;
  var i;
  var line;
  var status;
  var exampleNo;
  var firstRaw;
  var firstExample;
  var total;
  if (!editorStaffOn() || typeof staffNotationStatus !== "function") {
    return null;
  }
  raw = editorRawLines();
  exampleNo = 0;
  firstRaw = -1;
  firstExample = 0;
  total = 0;
  for (i = 0; i < raw.length; i++) {
    line = itemToLine(raw[i]);
    if (!line) {
      continue;
    }
    exampleNo += 1;
    status = staffNotationStatus(line);
    if (!status || !status.ok) {
      total += 1;
      if (firstRaw < 0) {
        firstRaw = i;
        firstExample = exampleNo;
      }
    }
  }
  if (!total) {
    return null;
  }
  return { rawIndex: firstRaw, example: firstExample, more: total - 1, total: total };
}

function editorGoToRawLine(rawIndex) {
  var area;
  var lines;
  var start;
  var end;
  var i;
  var field;
  if (typeof rawIndex !== "number" || rawIndex < 0) {
    return;
  }
  if (editorIsFocusMode()) {
    editorFocusIndex = rawIndex;
    editorClampFocusIndex(editorRawLines().length);
    editorSyncFocusFromArea();
    refreshEditor();
    field = document.getElementById("editFocusLine");
    if (field) {
      field.focus();
      try {
        field.select();
      } catch (errFocus) {}
    }
    return;
  }
  area = document.getElementById("allEdit");
  lines = editorRawLines();
  editorFocusIndex = rawIndex;
  editorClampFocusIndex(lines.length);
  if (!area) {
    return;
  }
  start = 0;
  for (i = 0; i < editorFocusIndex; i++) {
    start += (lines[i] || "").length + 1;
  }
  end = start + (lines[editorFocusIndex] || "").length;
  area.focus();
  try {
    area.setSelectionRange(start, end);
  } catch (errList) {}
  refreshEditor();
}

function editorRejectBrokenStaff() {
  var report = editorBrokenStaffReport();
  var message;
  if (!report) {
    return false;
  }
  message =
    report.more > 0
      ? tr("edit.staffBrokenMore", { n: report.example, more: report.more })
      : tr("edit.staffBrokenOne", { n: report.example });
  editorNotice(message);
  editorGoToRawLine(report.rawIndex);
  return true;
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
  if (editorRejectBrokenStaff()) {
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
    ? updateDeskExercise(editorDraft.id, { name: name, bars: bars, staff: editorStaffOn(), lines: lines })
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
  applyEditorToReel(saved.lines, saved.bars, saved.staff);
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
  if (editorRejectBrokenStaff()) {
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
  var part = { name: name, bars: bars, staff: editorStaffOn(), lines: lines };
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
  applyEditorToReel(created.lines, created.bars, created.staff);
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

function buildEditorNotePad(host) {
  var pad = document.createElement("div");
  var flow = document.createElement("div");
  var main = document.createElement("div");
  var letters = document.createElement("div");
  var modifiers = document.createElement("div");
  var durations = document.createElement("div");
  var events = document.createElement("div");
  pad.id = "editNotePad";
  flow.id = "editNoteFlow";
  main.id = "editNoteMain";
  letters.id = "editNoteStep";
  letters.className = "edit-note-row";
  modifiers.id = "editNoteChips";
  modifiers.className = "edit-note-row";
  durations.id = "editNoteDurations";
  durations.className = "edit-note-row";
  events.id = "editNoteEvents";
  events.className = "edit-note-row";
  main.appendChild(letters);
  main.appendChild(modifiers);
  main.appendChild(durations);
  flow.appendChild(main);
  pad.appendChild(flow);
  pad.appendChild(events);
  host.appendChild(pad);
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
    button.className = "edit-text-symbol";
    button.textContent = spec.char;
    button.setAttribute("aria-label", t(spec.key));
    button.title = t(spec.key);
    var insert = spec.insert || spec.char;
    if (!spec.insert && spec.char === "\u00B7") {
      insert = " \u00B7 ";
    }
    button.setAttribute("data-symbol", insert);
    if (spec.caretBack) {
      button.setAttribute("data-caret", String(spec.caretBack));
    }
    row.appendChild(button);
  }
  editorSyncSymbolKind();
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
  if (editorIsOpen()) {
    return editorStaffOn();
  }
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
    return "Estas líneas van en el pentagrama. Una nota es una palabra: letra, alteración, octava, luego w h q e s n y un puntillo opcional. C4 es una negra. C4n es una negra sin plica, un tiempo. C#4, Db4, Cn4. n. no vale. @treble o @bass y @key=Eb van primero. ^Name va sobre la nota o el slash siguiente y puede cambiar: ^G / ^D /. ^texto pegado va encima de esa nota, slash, silencio o acorde. _texto va debajo. Los dos pueden ir juntos: [E3h G3h B3h D4h]^C∆7_3, /w^P, rw^R. _1 es el grado bajo la nota. ^bVII y _bVII se ven como ♭VII. _bbVII se ve como 𝄫VII. Un ^ solo es marcato. {C4e D4e} barrado. / es tocar cualquier cosa, sin plica. /q es un slash de ritmo, rq silencio, | barra, % simile, ~ ligadura de la misma altura. (3 C4e D4e E4e) grupo irregular. pp mf f, cresc, dim, y ' > - ^ : C4e'>. \" · \" es el texto. El mismo número de compases en cada línea. Responde con esta escritura.";
  }
  return "These lines are written on a staff. One note is one word: letter, accidental, octave, then w h q e s n and an optional dot. C4 is a quarter. C4n is a quarter notehead with no stem, one beat. C#4, Db4, Cn4. n. is rejected. @treble or @bass and @key=Eb come first. ^Name sits on the next note or slash and can change: ^G / ^D /. ^text glued on a note, slash, rest, or chord sits above it. _text sits under it. Both can be on one symbol: [E3h G3h B3h D4h]^C∆7_3, /w^P, rw^R. _1 is the degree under the note. ^bVII and _bVII both print as ♭VII. _bbVII prints as 𝄫VII. A bare ^ is marcato. {C4e D4e} beams. / is play anything, no stem. /q is a rhythm slash, rq a rest, | a bar, % a simile, ~ a tie of the same pitch. (3 C4e D4e E4e) is a tuplet. pp mf f, cresc, dim, and ' > - ^ : C4e'>. \" · \" is the caption. The same number of bars on every line. Answer in this spelling.";
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
    ? shareSnapshot({ id: shareId, name: editorNameValue(), bars: bars, staff: editorStaffOn(), lines: lines })
    : null;
  var catalogHref = "";
  if (
    saved &&
    snap &&
    saved.bars === snap.bars &&
    !!saved.staff === !!snap.staff &&
    saved.name === snap.name &&
    typeof shareLinesMatch === "function" &&
    shareLinesMatch(saved.lines, snap.lines) &&
    typeof shareCatalogHref === "function"
  ) {
    catalogHref = shareCatalogHref(saved);
  }
  var url = catalogHref || (snap ? shareExerciseUrl({ v: 1, id: snap.shareId, name: snap.name, bars: snap.bars, staff: snap.staff, lines: snap.lines }) : "");
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
  function editorBindPadPointer(host) {
    if (!host) {
      return;
    }
    host.addEventListener("pointerdown", function (event) {
      var button = event.target.closest("button");
      var swallowClick;
      if (!button || !host.contains(button)) {
        return;
      }
      /* Pad rebuild destroys the button mid-gesture; iOS then retargets click to Share under the finger. */
      event.preventDefault();
      event.stopPropagation();
      editorBeginPadInput();
      swallowClick = function (clickEvent) {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        document.removeEventListener("click", swallowClick, true);
      };
      document.addEventListener("click", swallowClick, true);
      window.setTimeout(function () {
        document.removeEventListener("click", swallowClick, true);
      }, 600);
      editorActivateSymbol(button);
    });
  }
  function editorBindHistoryPointer(host) {
    if (!host) {
      return;
    }
    function stopHold() {
      editorStopEraseRepeat();
    }
    host.addEventListener("pointerdown", function (event) {
      var button = event.target.closest("button");
      var swallowClick;
      if (!button || !host.contains(button) || button.disabled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      editorBeginPadInput();
      swallowClick = function (clickEvent) {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        document.removeEventListener("click", swallowClick, true);
      };
      document.addEventListener("click", swallowClick, true);
      window.setTimeout(function () {
        document.removeEventListener("click", swallowClick, true);
      }, 600);
      if (button.hasAttribute("data-erase")) {
        try {
          host.setPointerCapture(event.pointerId);
        } catch (errCap) {}
        editorStopEraseRepeat();
        editorEraseHoldUndoPushed = false;
        if (editorCanErase()) {
          editorPushSymbolUndo();
          editorEraseHoldUndoPushed = true;
          editorEraseStep({ skipUndo: true });
        }
        editorEraseRepeatDelay = window.setTimeout(function () {
          editorEraseRepeatDelay = null;
          editorEraseRepeatTimer = window.setInterval(function () {
            if (!editorCanErase()) {
              editorStopEraseRepeat();
              return;
            }
            if (!editorEraseHoldUndoPushed) {
              editorPushSymbolUndo();
              editorEraseHoldUndoPushed = true;
            }
            editorEraseStep({ skipUndo: true });
          }, 90);
        }, 400);
        return;
      }
      editorActivateSymbol(button);
    });
    host.addEventListener("pointerup", stopHold);
    host.addEventListener("pointercancel", stopHold);
    host.addEventListener("lostpointercapture", stopHold);
  }
  editorBindPadPointer(symbols);
  editorBindHistoryPointer(document.getElementById("editNoteHistory"));
  function editorOnFieldFocusForPad(event) {
    var target = event && event.target;
    if (!target) {
      return;
    }
    if (target.id === "editFocusLine" || target.id === "allEdit") {
      editorPadCaret = null;
      editorSetPadInputMode(false);
      editorEnsureFieldVisible(target);
    }
  }
  document.addEventListener("focusin", editorOnFieldFocusForPad);
  document.addEventListener("keydown", function (event) {
    var key;
    var undoKey;
    var redoKey;
    var eraseKey;
    var active;
    if (!editorIsOpen()) {
      return;
    }
    key = String(event.key || "").toLowerCase();
    undoKey = (event.ctrlKey || event.metaKey) && !event.altKey && key === "z" && !event.shiftKey;
    redoKey =
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      (key === "y" || (key === "z" && event.shiftKey));
    if (undoKey && (editorSymbolUndo.length || editorCanUndoStaffTyping())) {
      event.preventDefault();
      editorSymbolUndoStep();
      return;
    }
    if (redoKey && editorSymbolRedo.length) {
      event.preventDefault();
      editorSymbolRedoStep();
      return;
    }
    /* Notes/Symbols open with pad inputmode: hardware Backspace matches Erase. */
    eraseKey = (key === "backspace" || event.key === "Backspace") && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (eraseKey && editorSymbolsIsOpen() && editorCanErase()) {
      active = document.activeElement;
      if (
        active &&
        (active.id === "editFocusLine" || active.id === "allEdit") &&
        active.getAttribute("inputmode") !== "none"
      ) {
        return;
      }
      event.preventDefault();
      editorEraseStep();
    }
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
      editorWithKeyboardStaffEdit(function () {
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
      editorWithKeyboardStaffEdit(function () {
        insertEditorText(cleaned);
      });
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
    editorWithKeyboardStaffEdit(function () {
      convertEditorCodes();
      disarmEditorDelete();
      clearEditorNotice();
      refreshEditor();
    });
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
    editorWithKeyboardStaffEdit(function () {
      insertEditorText(cleaned);
    });
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
  ["editKindText", "editKindStaff"].forEach(function (id) {
    var button = document.getElementById(id);
    if (!button) {
      return;
    }
    button.addEventListener("click", function () {
      setEditorStaff(id === "editKindStaff");
      disarmEditorDelete();
      clearEditorNotice();
      refreshEditor();
    });
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
    if (!editorIsOpen()) {
      return;
    }
    if (editorViewOverride) {
      refreshEditorHint();
      return;
    }
    editorApplyViewMode();
    refreshEditor();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      placeEditor();
      if (document.activeElement && (document.activeElement.id === "editFocusLine" || document.activeElement.id === "allEdit")) {
        editorEnsureFieldVisible(document.activeElement);
      }
    });
    window.visualViewport.addEventListener("scroll", placeEditor);
  }
}

initEditor();
