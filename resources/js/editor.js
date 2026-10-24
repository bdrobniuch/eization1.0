var editorDraft = {
  label: "",
  id: "",
  name: "",
  text: "",
  bars: 1,
  staff: false,
  clef: "",
  key: "",
  meter: null,
  mode: "edit",
  storedLines: null
};

/* Last successful staff preview HTML; kept while the line is still notation-ish but broken. */
var editorLastGoodStaffHtml = "";
/* Example text last shown as pending — pulse the red frame only when it changes. */
var editorStaffPendingLine = null;
/* One-shot Undo hint for the current pending episode (not every keystroke). */
var editorStaffPendingUndoHinted = false;
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
  { char: "^", key: "sym.sup" },
  { char: "_", key: "sym.sub" },
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
/* Pad/Erase hold-to-repeat (one undo step for the whole hold). */
var editorHoldRepeatDelay = null;
var editorHoldRepeatTimer = null;
var editorHoldUndoPushed = false;
var editorHoldRepeatAction = null;
var editorEraseLastAt = 0;
/* One Analytics bag per Edit open; flushed in editorCloseQuiet. */
var editorAnalytics = null;

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

/* Walk display HTML back to the Edit spelling. <sup> / <sub> become ^ / _. */
function htmlNodeToEditorText(node) {
  var out = "";
  var i;
  var tag;
  if (!node) {
    return "";
  }
  if (node.nodeType === 3) {
    return node.nodeValue || "";
  }
  if (node.nodeType !== 1) {
    return "";
  }
  tag = String(node.tagName || "").toLowerCase();
  if (tag === "sup" || tag === "sub") {
    return (tag === "sup" ? "^" : "_") + (node.textContent || "");
  }
  for (i = 0; i < node.childNodes.length; i++) {
    out += htmlNodeToEditorText(node.childNodes[i]);
  }
  return out;
}

function htmlToEditorLine(html) {
  var box = document.createElement("div");
  box.innerHTML = html;
  var changes = box.querySelector(".prog-changes");
  var name = box.querySelector(".prog-name");
  if (changes && name) {
    var left = collapseEditorSpaces(htmlNodeToEditorText(changes));
    var right = collapseEditorSpaces(name.textContent);
    if (left && right) {
      return left + " \u00B7 " + right;
    }
  }
  return collapseEditorSpaces(htmlNodeToEditorText(box));
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

/*
 * TEXT exercises: ^text is superscript, _text is subscript.
 * A run ends at the next ^ or _, at whitespace, or at the end of the line.
 * Staff lines use the same marks for above/under the staff; this path is display only.
 */
function formatTextAffixes(text) {
  var s = String(text || "");
  var out = "";
  var i = 0;
  var ch;
  var mode = "";
  var buf = "";
  function flushPlain() {
    if (buf) {
      out += escapeEditorHtml(buf);
      buf = "";
    }
  }
  function flushAffix() {
    if (!mode) {
      return;
    }
    var tag = mode === "^" ? "sup" : "sub";
    out += "<" + tag + "><small>" + escapeEditorHtml(buf) + "</small></" + tag + ">";
    buf = "";
    mode = "";
  }
  while (i < s.length) {
    ch = s.charAt(i);
    if (ch === "^" || ch === "_") {
      if (mode) {
        flushAffix();
      } else {
        flushPlain();
      }
      mode = ch;
      i += 1;
      continue;
    }
    if (mode && /\s/.test(ch)) {
      flushAffix();
      buf += ch;
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  if (mode) {
    flushAffix();
  } else {
    flushPlain();
  }
  return out;
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
      return withSimile('<span class="prog-changes">' + formatTextAffixes(left) + '</span><span class="prog-name">' + escapeEditorHtml(right) + '</span>');
    }
  }
  return withSimile(formatTextAffixes(text));
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
  if (bars > 32) {
    return 32;
  }
  return bars;
}

function editorReadBars() {
  var el = document.getElementById("editBars");
  if (!el) {
    return 1;
  }
  return clampEditorBars(el.getAttribute("data-bars") || el.textContent);
}

function editorWriteBars(value) {
  var el = document.getElementById("editBars");
  var bars = clampEditorBars(value);
  var label;
  if (!el) {
    return bars;
  }
  el.setAttribute("data-bars", String(bars));
  el.textContent = String(bars);
  label = t("edit.barsAria");
  el.setAttribute("aria-label", label);
  el.title = t("edit.barsTitle");
  return bars;
}

function editorNudgeBars(delta) {
  editorWriteBars(editorReadBars() + (delta || 0));
  disarmEditorDelete();
  clearEditorNotice();
  refreshEditorHint();
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
  var bars = editorReadBars();
  var text = editorLinesFrom(area.value).join("\n");
  var name = editorNameValue().replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  var draftName = (editorDraft.name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  var defaults = editorReadDefaults();
  return (
    text !== editorDraft.text ||
    bars !== editorDraft.bars ||
    editorStaffOn() !== !!editorDraft.staff ||
    name !== draftName ||
    defaults.clef !== (editorDraft.clef || "") ||
    defaults.key !== (editorDraft.key || "") ||
    !editorMeterEqual(defaults.meter, editorDraft.meter)
  );
}

function editorMeterEqual(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.beats === b.beats && a.unit === b.unit;
}

function editorStaffOn() {
  var button = document.getElementById("editKindStaff");
  return !!(button && button.getAttribute("aria-pressed") === "true");
}

function setEditorStaff(on) {
  var text = document.getElementById("editKindText");
  var staff = document.getElementById("editKindStaff");
  var write = document.getElementById("editWrite");
  var pressed = !!on;
  if (text) {
    text.setAttribute("aria-pressed", pressed ? "false" : "true");
  }
  if (staff) {
    staff.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  if (write) {
    write.classList.toggle("is-text-kind", !pressed);
  }
  if (!pressed) {
    editorCloseStaffHelp({ focus: false });
  }
  editorPlaceExerciseExtras();
  editorSyncSymbolKind();
}

function editorReadDefaults() {
  var write = document.getElementById("editWrite");
  var keyField = document.getElementById("editKey");
  var meterField = document.getElementById("editMeter");
  var clef = write && write.getAttribute("data-clef") === "bass" ? "bass" : "";
  var key = keyField ? String(keyField.value || "") : "";
  var meterRaw = meterField ? String(meterField.value || "") : "";
  var meter = null;
  if (typeof cleanDeskKey === "function") {
    key = cleanDeskKey(key);
  } else if (key === "C") {
    key = "";
  }
  if (meterRaw && typeof cleanDeskMeter === "function") {
    meter = cleanDeskMeter(meterRaw);
  }
  return { clef: clef, key: key, meter: meter };
}

function editorApplyDefaultsUi(spec) {
  var clef = spec && spec.clef === "bass" ? "bass" : "";
  var key = spec && spec.key ? String(spec.key) : "";
  var meter = spec && spec.meter ? spec.meter : null;
  var write = document.getElementById("editWrite");
  var keyField = document.getElementById("editKey");
  var meterField = document.getElementById("editMeter");
  var meterText = meter ? meter.beats + "/" + meter.unit : "";
  if (write) {
    if (clef === "bass") {
      write.setAttribute("data-clef", "bass");
    } else {
      write.removeAttribute("data-clef");
    }
  }
  if (keyField) {
    if (key && !Array.prototype.some.call(keyField.options, function (opt) {
      return opt.value === key;
    })) {
      keyField.value = "";
    } else {
      keyField.value = key;
    }
  }
  if (meterField) {
    if (meterText && !Array.prototype.some.call(meterField.options, function (opt) {
      return opt.value === meterText;
    })) {
      meterField.value = "";
    } else {
      meterField.value = meterText;
    }
  }
}

/*
 * Meter stays beside Bars (text and staff). Clef + key sit on Write notes for
 * staff; key is parked hidden when the exercise is text.
 */
function editorPlaceExerciseExtras() {
  var keyHost = document.getElementById("editKeyHost");
  var setup = document.getElementById("editSetup");
  var noteDefaults = document.getElementById("editNoteDefaults");
  var staff = editorStaffOn();
  if (!keyHost) {
    return;
  }
  if (staff && noteDefaults) {
    keyHost.hidden = false;
    noteDefaults.appendChild(keyHost);
  } else {
    keyHost.hidden = true;
    if (setup && setup.parentNode) {
      setup.parentNode.insertBefore(keyHost, setup.nextSibling);
    }
  }
}

function editorSyncStaffDefaults() {
  var defaults = editorReadDefaults();
  if (typeof staffSetActiveDefaults === "function") {
    staffSetActiveDefaults({
      clef: defaults.clef === "bass" ? "bass" : "treble",
      key: defaults.key || "C"
    });
  }
}

function editorRestorePracticeDefaults() {
  var desk = typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null;
  if (typeof applyPracticeStaffDefaults === "function") {
    applyPracticeStaffDefaults(desk);
  } else if (typeof staffSetActiveDefaults === "function") {
    staffSetActiveDefaults(null);
  }
}

function editorMarkDefaultsUsed() {
  editorAnalyticsMark("used_defaults");
  if (typeof track === "function") {
    track("edit_defaults", {
      mode: editorIsCreateMode() ? "create" : "edit",
      kind: editorAnalyticsKind()
    });
  }
}

function editorPartDefaults() {
  var defaults = editorReadDefaults();
  return {
    clef: defaults.clef,
    key: defaults.key,
    meter: defaults.meter
  };
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

function editorAnalyticsKind() {
  return editorStaffOn() ? "staff" : "text";
}

function editorAnalyticsExerciseId() {
  if (editorIsCreateMode()) {
    return "custom";
  }
  return typeof analyticsExerciseId === "function" ? analyticsExerciseId() : "custom";
}

function editorAnalyticsExampleCount() {
  var area = document.getElementById("allEdit");
  if (!area) {
    return 0;
  }
  return editorLinesFrom(area.value).length;
}

function editorAnalyticsInputOf(a) {
  var pad;
  var type;
  var paste;
  if (!a) {
    return "none";
  }
  pad = !!a.used_pad;
  type = !!a.used_type;
  paste = !!a.used_paste;
  if (pad && type) {
    return "both";
  }
  if (pad) {
    return "pad";
  }
  if (type) {
    return "type";
  }
  if (paste) {
    return "paste";
  }
  return "none";
}

function editorAnalyticsBegin(source) {
  editorAnalytics = {
    mode: editorIsCreateMode() ? "create" : "edit",
    exercise_id: editorAnalyticsExerciseId(),
    source: source || "edit",
    used_symbols: false,
    used_help: false,
    used_sample: false,
    used_defaults: false,
    used_pad: false,
    used_type: false,
    used_paste: false,
    focus_adds: 0,
    outcome: null,
    dirty: false
  };
}

function editorAnalyticsMark(flag) {
  if (!editorAnalytics || !flag) {
    return;
  }
  editorAnalytics[flag] = true;
}

function editorAnalyticsOutcome(outcome, dirty) {
  if (!editorAnalytics) {
    return;
  }
  editorAnalytics.outcome = outcome;
  if (typeof dirty === "boolean") {
    editorAnalytics.dirty = dirty;
  }
}

function editorFlushSession() {
  var a = editorAnalytics;
  editorAnalytics = null;
  if (!a || typeof track !== "function") {
    return;
  }
  track("edit_session", {
    mode: a.mode,
    exercise_id: a.exercise_id,
    kind: editorAnalyticsKind(),
    example_count: editorAnalyticsExampleCount(),
    input: editorAnalyticsInputOf(a),
    used_help: !!a.used_help,
    used_symbols: !!a.used_symbols,
    used_sample: !!a.used_sample,
    used_defaults: !!a.used_defaults,
    focus_adds: a.focus_adds || 0,
    outcome: a.outcome || "close",
    dirty: !!a.dirty,
    source: a.source || "edit"
  });
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
    editorUpdateStaffCaretMark();
    return;
  }
  field.focus();
  try {
    field.setSelectionRange(start, end);
  } catch (errFocusCaret) {}
  editorUpdateStaffCaretMark();
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
  var firstOpen;
  if (!panel) {
    return;
  }
  firstOpen = panel.hidden;
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
  if (firstOpen) {
    editorAnalyticsMark("used_symbols");
    if (typeof track === "function") {
      track("edit_symbols_open", {
        mode: editorIsCreateMode() ? "create" : "edit",
        kind: editorAnalyticsKind()
      });
    }
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
  var firstOpen;
  if (!panel || !editorIsOpen()) {
    return;
  }
  firstOpen = panel.hidden;
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
  if (firstOpen) {
    editorAnalyticsMark("used_help");
    if (typeof track === "function") {
      track("edit_staff_help", {
        mode: editorIsCreateMode() ? "create" : "edit",
        kind: editorAnalyticsKind()
      });
    }
  }
}

function editorToggleStaffHelp() {
  if (!editorStaffOn()) {
    editorCloseStaffHelp({ focus: false });
    return;
  }
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
  editorFlushSession();
  editorCloseStaffHelp({ focus: false });
  editorCloseMore();
  editorCloseSymbols();
  clearEditStaffNote();
  editorLastGoodStaffHtml = "";
  editorStaffPendingLine = null;
  editorStaffPendingUndoHinted = false;
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
  editorRestorePracticeDefaults();
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

/*
 * Caret at end of the one-example field. On touch, place silently so focus()
 * does not open the soft keyboard; desktop (fine pointer) may focus. Notes
 * open always stays silent (pad caret + inputmode none).
 */
function editorPlaceFocusCaretEnd(field) {
  var len;
  var fine;
  var silent;
  if (!field) {
    field = document.getElementById("editFocusLine");
  }
  if (!field) {
    return;
  }
  len = String(field.value || "").length;
  fine = window.matchMedia("(pointer: fine)").matches;
  silent = !fine || !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(field, len, len, silent);
}

/*
 * Load the current focus example into the one-line field.
 * opts.caret === "end" when showing / switching examples so Backspace peels
 * from the end; omit it on resize/refresh so a manual caret stays put.
 */
function editorSyncFocusFromArea(opts) {
  var field = document.getElementById("editFocusLine");
  var lines = editorRawLines();
  editorClampFocusIndex(lines.length);
  if (field) {
    field.value = lines[editorFocusIndex] || "";
    if (opts && opts.caret === "end") {
      editorPlaceFocusCaretEnd(field);
    }
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
    editorPlaceFocusCaretEnd();
  }
}

function editorToggleViewMode() {
  var next;
  if (!editorIsOpen()) {
    return;
  }
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
    next = "list";
    editorSetViewMode("list");
  } else {
    next = "focus";
    editorSetViewMode("focus");
  }
  if (typeof track === "function") {
    track("edit_view", {
      view: next,
      mode: editorIsCreateMode() ? "create" : "edit",
      kind: editorAnalyticsKind()
    });
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
  editorSyncFocusFromArea({ caret: "end" });
  clearEditorNotice();
  refreshEditor();
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
  if (editorAnalytics) {
    editorAnalytics.focus_adds = (editorAnalytics.focus_adds || 0) + 1;
  }
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
    editorSyncFocusFromArea({ caret: "end" });
    clearEditorNotice();
    refreshEditor();
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
    editorSyncFocusFromArea({ caret: "end" });
    clearEditorNotice();
    refreshEditor();
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
  preview._staffCaretLayout = null;
  if (!line) {
    editorStaffPendingLine = null;
    editorStaffPendingUndoHinted = false;
    preview.classList.remove("is-staff-pending-pulse");
    clearEditStaffNote();
    if (editorStaffOn() && typeof renderMusicStaff === "function") {
      preview.classList.remove("is-empty");
      editorPaintStaffPreview(preview, "", "");
    } else {
      preview.classList.add("is-empty");
      editorLastGoodStaffHtml = "";
      editorClearStaffCaretMark(preview);
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
    editorStaffPendingLine = null;
    editorStaffPendingUndoHinted = false;
    preview.classList.remove("is-staff-pending-pulse");
    clearEditStaffNote();
    editorPaintStaffPreview(preview, status.music, status.caption);
  } else if (editorStaffOn()) {
    /* Staff mode: never flip to text preview — keep last good (or empty staff) + pending frame. */
    var enteringPending = editorStaffPendingLine === null;
    var pendingPulse = editorStaffPendingLine !== line;
    editorStaffPendingLine = line;
    clearEditStaffNote();
    preview.classList.add("is-staff", "is-staff-pending");
    if (editorLastGoodStaffHtml) {
      preview.innerHTML = editorLastGoodStaffHtml;
    } else if (typeof renderMusicStaff === "function") {
      editorPaintStaffPreview(preview, "", "");
      preview.classList.add("is-staff-pending");
    }
    editorPaintStaffPendingCue(preview);
    if (pendingPulse) {
      editorPulseStaffPending(preview);
    }
    if (enteringPending) {
      editorStaffPendingUndoHinted = false;
    }
    editorUpdateStaffCaretMark();
  } else {
    editorStaffPendingLine = null;
    editorStaffPendingUndoHinted = false;
    preview.classList.remove("is-staff-pending-pulse");
    editorLastGoodStaffHtml = "";
    preview.innerHTML = lineToItem(line);
    clearEditStaffNote();
    editorClearStaffCaretMark(preview);
  }
  editorSyncStaffHistoryAfterRefresh(line, status);
  refreshEditorHint();
}

function editorPreviewMeterOpts() {
  var defaults = editorReadDefaults();
  if (defaults && defaults.meter) {
    return { meter: defaults.meter };
  }
  /* Any: layout still follows Setup, but do not print a time signature. */
  return { showMeter: false };
}

function editorStaffPendingWarnIcon() {
  var svg = editorSvgEl("svg", {
    viewBox: "0 0 16 16",
    class: "edit-staff-pending-icon",
    "aria-hidden": "true",
    focusable: "false"
  });
  svg.appendChild(
    editorSvgEl("path", {
      d: "M8 1.6 L15.2 14.2 H0.8 Z",
      fill: "currentColor"
    })
  );
  svg.appendChild(
    editorSvgEl("path", {
      d: "M7.35 5.4 h1.3 v4.2 h-1.3 Z M7.35 11.1 h1.3 v1.3 h-1.3 Z",
      fill: "#fff"
    })
  );
  return svg;
}

function editorPaintStaffPendingCue(preview) {
  var cue;
  var msg;
  if (!preview) {
    return;
  }
  cue = preview.querySelector(".edit-staff-pending-cue");
  if (cue && cue.parentNode) {
    cue.parentNode.removeChild(cue);
  }
  cue = document.createElement("div");
  cue.className = "edit-staff-pending-cue";
  cue.setAttribute("role", "status");
  cue.setAttribute("aria-live", "polite");
  cue.appendChild(editorStaffPendingWarnIcon());
  msg = document.createElement("span");
  msg.className = "edit-staff-pending-msg";
  msg.textContent = t("edit.staffPending");
  cue.appendChild(msg);
  preview.appendChild(cue);
}

function editorPulseStaffPending(preview) {
  if (!preview) {
    return;
  }
  preview.classList.remove("is-staff-pending-pulse");
  void preview.offsetWidth;
  preview.classList.add("is-staff-pending-pulse");
}

function editorPaintStaffPreview(preview, music, caption) {
  var svg;
  var box;
  var w;
  var h;
  var wrap;
  var cap;
  var meterOpts;
  if (!preview || typeof renderMusicStaff !== "function") {
    return;
  }
  preview.classList.add("is-staff");
  preview._staffCaretLayout = null;
  /* Recommended meter shows that signature; Any hides the glyph (Setup still beams). */
  meterOpts = editorPreviewMeterOpts();
  svg = renderMusicStaff(music || "", "current", meterOpts);
  if (svg) {
    preview._staffCaretLayout = svg._staffCaretLayout || null;
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
  editorUpdateStaffCaretMark();
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

/* Token list with character offsets in the music string (for caret → column). */
function editorMusicTokenRanges(music) {
  var raw = String(music || "");
  var tokens =
    typeof staffTokenize === "function" ? staffTokenize(raw) : raw.trim().split(/\s+/).filter(Boolean);
  var out = [];
  var pos = 0;
  var i;
  var idx;
  for (i = 0; i < tokens.length; i++) {
    idx = raw.indexOf(tokens[i], pos);
    if (idx < 0) {
      idx = pos;
    }
    out.push({ tok: tokens[i], start: idx, end: idx + tokens[i].length });
    pos = idx + tokens[i].length;
  }
  return out;
}

function editorMusicCaretInLine(line, caret) {
  var parts =
    typeof staffExampleParts === "function" ? staffExampleParts(line) : { music: String(line || ""), caption: "" };
  var music = parts.music || "";
  var at;
  var rel;
  if (!music) {
    return { music: "", caret: 0 };
  }
  at = String(line || "").indexOf(music);
  if (at < 0) {
    at = 0;
  }
  rel = (typeof caret === "number" ? caret : 0) - at;
  if (rel < 0) {
    rel = 0;
  }
  if (rel > music.length) {
    rel = music.length;
  }
  return { music: music, caret: rel };
}

function editorStaffCaretNoiseTok(tok) {
  if (!tok) {
    return true;
  }
  if (tok.charAt(0) === "@" || tok.charAt(0) === "^" || tok === "~") {
    return true;
  }
  if (typeof staffIsDynamic === "function" && staffIsDynamic(tok)) {
    return true;
  }
  if (typeof staffIsHairpin === "function" && staffIsHairpin(tok)) {
    return true;
  }
  return false;
}

function editorStaffBeamInnerNote(tok) {
  var inner = String(tok || "").replace(/^\{/, "").replace(/\}$/, "");
  if (!inner || inner === "~") {
    return false;
  }
  if (typeof staffParsePitchToken === "function" && staffParsePitchToken(inner)) {
    return true;
  }
  if (typeof staffParseSlashToken === "function" && staffParseSlashToken(inner, "treble")) {
    return true;
  }
  return false;
}

/*
 * Column starts (char offset of each drawn column). Order matches render:
 * notes/rests/stacks/similes/bars; beams expand; tuplets flatten.
 */
function editorStaffColumnStarts(music) {
  var ranges = editorMusicTokenRanges(music);
  var starts = [];
  var i = 0;
  var t;
  var openStart;

  function skipNoise() {
    while (i < ranges.length && editorStaffCaretNoiseTok(ranges[i].tok)) {
      i += 1;
    }
  }

  function consumeBeam() {
    skipNoise();
    if (i >= ranges.length || ranges[i].tok.indexOf("{") < 0) {
      return;
    }
    while (i < ranges.length) {
      t = ranges[i].tok;
      if (editorStaffBeamInnerNote(t)) {
        starts.push(ranges[i].start + (t.charAt(0) === "{" ? 1 : 0));
      }
      i += 1;
      if (t.indexOf("}") >= 0) {
        break;
      }
    }
  }

  function consumeStack() {
    skipNoise();
    if (i >= ranges.length || ranges[i].tok.charAt(0) !== "[") {
      return;
    }
    openStart = ranges[i].start;
    while (i < ranges.length) {
      t = ranges[i].tok;
      i += 1;
      if (t.indexOf("]") >= 0) {
        starts.push(openStart);
        break;
      }
    }
  }

  function consumeTuplet() {
    skipNoise();
    if (i >= ranges.length || ranges[i].tok.charAt(0) !== "(") {
      return;
    }
    i += 1;
    while (i < ranges.length) {
      t = ranges[i].tok;
      if (t === ")") {
        i += 1;
        break;
      }
      if (typeof staffTokenClosesTuplet === "function" && staffTokenClosesTuplet(t)) {
        /* Glued close: E4e) still counts as a note column. */
        if (t.length > 1) {
          starts.push(ranges[i].start);
        }
        i += 1;
        break;
      }
      if (editorStaffCaretNoiseTok(t)) {
        i += 1;
        continue;
      }
      if (t.indexOf("{") >= 0) {
        consumeBeam();
        continue;
      }
      if (t.charAt(0) === "[") {
        consumeStack();
        continue;
      }
      starts.push(ranges[i].start);
      i += 1;
    }
  }

  while (i < ranges.length) {
    skipNoise();
    if (i >= ranges.length) {
      break;
    }
    t = ranges[i].tok;
    if (t === "|" || t === "%") {
      starts.push(ranges[i].start);
      i += 1;
      continue;
    }
    if (t.charAt(0) === "(") {
      consumeTuplet();
      continue;
    }
    if (t.indexOf("{") >= 0) {
      consumeBeam();
      continue;
    }
    if (t.charAt(0) === "[") {
      consumeStack();
      continue;
    }
    starts.push(ranges[i].start);
    i += 1;
  }
  return starts;
}

/*
 * Insertion index: how many columns sit before the caret.
 * Mid-token caret snaps to that column's trailing edge.
 */
function editorStaffCaretInsertionIndex(music, caret) {
  var starts;
  var i;
  var idx = 0;
  if (!music) {
    return 0;
  }
  starts = editorStaffColumnStarts(music);
  for (i = 0; i < starts.length; i++) {
    if (caret > starts[i]) {
      idx = i + 1;
    } else {
      break;
    }
  }
  return idx;
}

/* Music-string caret stops for pad Left/Right (column edges + start/end). */
function editorStaffCaretStops(music) {
  var raw = String(music || "");
  var starts = editorStaffColumnStarts(raw);
  var stops = [0];
  var i;
  for (i = 0; i < starts.length; i++) {
    if (starts[i] > stops[stops.length - 1]) {
      stops.push(starts[i]);
    }
  }
  if (raw.length > stops[stops.length - 1]) {
    stops.push(raw.length);
  }
  return stops;
}

/*
 * Move the caret by one drawn column. Used when Notes is open (pad inputmode)
 * so hardware arrows match Erase's token grain — not every character.
 * dir < 0 is Left, dir > 0 is Right.
 */
function editorStaffMoveCaret(dir) {
  var span;
  var line;
  var mapped;
  var stops;
  var at;
  var i;
  var next;
  var musicAt;
  var fieldCaret;
  var sel;
  var step = dir < 0 ? -1 : 1;
  if (!editorStaffOn()) {
    return false;
  }
  span = editorLineSpan();
  if (!span || !span.field) {
    return false;
  }
  sel = editorReadSelection(span.field);
  if (sel.start !== sel.end) {
    fieldCaret = step < 0 ? sel.start : sel.end;
    editorPlaceCaret(span.field, fieldCaret, fieldCaret, !!(editorPadCaret && editorSymbolsIsOpen()));
    editorPaintNotePad();
    return true;
  }
  line = itemToLine(span.value.slice(span.lineStart, span.lineEnd));
  mapped = editorMusicCaretInLine(line, span.caret - span.lineStart);
  stops = editorStaffCaretStops(mapped.music);
  if (stops.length < 2) {
    return false;
  }
  at = 0;
  for (i = 0; i < stops.length; i++) {
    if (stops[i] <= mapped.caret) {
      at = i;
    }
  }
  if (step < 0) {
    if (mapped.caret > stops[at]) {
      next = stops[at];
    } else if (at > 0) {
      next = stops[at - 1];
    } else {
      return false;
    }
  } else if (at < stops.length - 1) {
    next = stops[at + 1];
  } else {
    return false;
  }
  musicAt = String(line || "").indexOf(mapped.music);
  if (musicAt < 0) {
    musicAt = 0;
  }
  fieldCaret = span.lineStart + musicAt + next;
  editorPlaceCaret(span.field, fieldCaret, fieldCaret, !!(editorPadCaret && editorSymbolsIsOpen()));
  editorPaintNotePad();
  return true;
}

function editorStaffCaretX(layout, insertIndex) {
  var cols;
  var half;
  var left;
  var right;
  if (!layout) {
    return null;
  }
  cols = layout.cols || [];
  half = layout.half || 6;
  if (!cols.length) {
    return layout.notesStartX;
  }
  if (insertIndex <= 0) {
    return layout.notesStartX;
  }
  if (insertIndex >= cols.length) {
    left = cols[cols.length - 1];
    return Math.min(layout.endX, left.x + half + 4);
  }
  left = cols[insertIndex - 1];
  right = cols[insertIndex];
  return (left.x + right.x) / 2;
}

function editorClearStaffCaretMark(preview) {
  var svg;
  var mark;
  if (!preview) {
    return;
  }
  svg = preview.querySelector("svg.music-staff");
  if (!svg) {
    return;
  }
  mark = svg.querySelector(".staff-caret-mark");
  if (mark && mark.parentNode) {
    mark.parentNode.removeChild(mark);
  }
}

function editorUpdateStaffCaretMark() {
  var preview = document.getElementById("editPreview");
  var span;
  var line;
  var lineCaret;
  var mapped;
  var layout;
  var svg;
  var mark;
  var x;
  var insertIndex;
  if (!preview || !editorStaffOn()) {
    editorClearStaffCaretMark(preview);
    return;
  }
  if (preview.classList.contains("is-staff-pending") || !preview.classList.contains("is-staff")) {
    editorClearStaffCaretMark(preview);
    return;
  }
  layout = preview._staffCaretLayout;
  svg = preview.querySelector("svg.music-staff");
  if (!layout || !svg) {
    editorClearStaffCaretMark(preview);
    return;
  }
  span = editorLineSpan();
  if (!span) {
    editorClearStaffCaretMark(preview);
    return;
  }
  /* Multi-line #allEdit caret is absolute; map to the current line first. */
  line = itemToLine(span.value.slice(span.lineStart, span.lineEnd));
  lineCaret = span.caret - span.lineStart;
  if (lineCaret < 0) {
    lineCaret = 0;
  }
  mapped = editorMusicCaretInLine(line, lineCaret);
  if (!mapped.music) {
    insertIndex = 0;
  } else {
    insertIndex = editorStaffCaretInsertionIndex(mapped.music, mapped.caret);
  }
  x = editorStaffCaretX(layout, insertIndex);
  if (x === null || isNaN(x)) {
    editorClearStaffCaretMark(preview);
    return;
  }
  mark = svg.querySelector(".staff-caret-mark");
  if (!mark) {
    mark = document.createElementNS("http://www.w3.org/2000/svg", "line");
    mark.setAttribute("class", "staff-caret-mark");
    mark.setAttribute("stroke", "currentColor");
    mark.setAttribute("stroke-width", "1.6");
    mark.setAttribute("stroke-linecap", "round");
    mark.setAttribute("pointer-events", "none");
    svg.appendChild(mark);
  }
  mark.setAttribute("x1", String(x));
  mark.setAttribute("x2", String(x));
  mark.setAttribute("y1", String(layout.staffTop - 3));
  mark.setAttribute("y2", String(layout.staffBot + 3));
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
    first !== "^" &&
    first !== "_"
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
      mark.textContent = staff ? "\u2669" : "\u266F\u2206\u00F8";
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
  if (lead.indexOf("@bass") >= 0) {
    return "bass";
  }
  if (lead.indexOf("@treble") >= 0) {
    return "treble";
  }
  return editorReadDefaults().clef === "bass" ? "bass" : "treble";
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

/* Exercise default clef (not @bass on the line). Icon is the clef you get next. */
function editorToggleDefaultClef(next) {
  var cur = editorReadDefaults();
  var clef = next === "bass" ? "bass" : "";
  if ((cur.clef || "") === clef) {
    return;
  }
  editorApplyDefaultsUi({
    clef: clef,
    key: cur.key,
    meter: cur.meter
  });
  editorNotePadStamp = "";
  editorPaintNotePad();
  editorMarkDefaultsUsed();
  editorSyncStaffDefaults();
  disarmEditorDelete();
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

function editorPitchTokenBoundary(prev) {
  return (
    !prev ||
    prev === " " ||
    prev === "\n" ||
    prev === "\t" ||
    prev === "|" ||
    prev === "~" ||
    prev === "{" ||
    prev === "["
  );
}

function editorPitchTail(text) {
  var trimmed = String(text || "").replace(/\s+$/, "");
  var m = trimmed.match(/([A-G](?:#|b|n)?\d(?:[whqesn]\.?|\.)?)((?:[\^_']|[>\-])[^\s]*)?$/);
  var prev;
  var hit;
  if (!m) {
    return null;
  }
  if (m.index > 0) {
    prev = trimmed.charAt(m.index - 1);
    if (!editorPitchTokenBoundary(prev)) {
      return null;
    }
  }
  hit = editorParsePitchToken(m[1]);
  if (!hit) {
    return null;
  }
  hit.token = m[1] + (m[2] || "");
  hit.affix = m[2] || "";
  return hit;
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
  var m = trimmed.match(/(\/[whqes]?\.?|r[whqes]?\.?)((?:[\^_']|[>\-])[^\s]*)?$/i);
  var prev;
  var hit;
  if (!m) {
    return null;
  }
  if (m.index > 0) {
    prev = trimmed.charAt(m.index - 1);
    if (!editorPitchTokenBoundary(prev)) {
      return null;
    }
  }
  hit = editorParseRhythmToken(m[1]);
  if (!hit) {
    return null;
  }
  hit.token = m[1] + (m[2] || "");
  hit.affix = m[2] || "";
  return hit;
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
      if (!editorPitchTokenBoundary(prev)) {
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
  var defaults = editorReadDefaults();
  return [
    editorStaffOn() ? "staff" : "text",
    editorNote.acc || "",
    editorNote.oct === null || editorNote.oct === undefined ? "" : String(editorNote.oct),
    editorNote.dot ? "." : "",
    editorNote.dur || "",
    String(editorWorkingOctave()),
    editorClefName(),
    defaults.clef || "",
    defaults.key || "",
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
 * inner event takes the shell with it so the line does not sit on empty
 * braces. A one-note tuplet stays legal (drawn plain), so peeling from two
 * leaves `(3 C4e)`. An empty pad shell ({ } / [ ] / (3 )) still clears in
 * one tap.
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
  /* Last remaining inner event removes the whole group. */
  clearShell = music.length <= 1;
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

function editorStopHoldRepeat() {
  if (editorHoldRepeatDelay) {
    window.clearTimeout(editorHoldRepeatDelay);
    editorHoldRepeatDelay = null;
  }
  if (editorHoldRepeatTimer) {
    window.clearInterval(editorHoldRepeatTimer);
    editorHoldRepeatTimer = null;
  }
  editorHoldUndoPushed = false;
  editorHoldRepeatAction = null;
}

function editorStopEraseRepeat() {
  editorStopHoldRepeat();
}

function editorSeedPitchToken(letter) {
  /* Structure seeds stay plain; a lit accidental waits for the next letter tap. */
  return String(letter || "C") + String(editorWorkingOctave()) + editorPitchSuffix();
}

function editorForceShortDuration() {
  if (editorNote.dur !== "e" && editorNote.dur !== "s") {
    editorNote.dur = "e";
  }
}

function editorDurationIsShort(dur) {
  var code = editorDurCode(dur);
  return code === "e" || code === "s";
}

function editorStructureOpenClose(kind) {
  if (kind === "beam") {
    return { open: "{", close: "}" };
  }
  if (kind === "stack") {
    return { open: "[", close: "]" };
  }
  if (kind === "tuplet") {
    return { open: "(3 ", close: ")" };
  }
  return null;
}

/* Smallest balanced group that contains rel (incl. caret on } ] )). */
function editorInnermostEnclosingGroup(line, rel) {
  var groups = editorFindBalancedGroups(line);
  var best = null;
  var i;
  var g;
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    if (rel <= g.open || rel >= g.closeEnd) {
      continue;
    }
    if (!best || g.closeEnd - g.open < best.closeEnd - best.open) {
      best = g;
    }
  }
  return best;
}

/*
 * Park the caret after every enclosing shell whose kind is blocked, so the next
 * insert stays legal (bar/simile leave beams, stacks, and tuplets).
 */
function editorExitEnclosingStructures(kinds) {
  var span = editorLineSpan();
  var line;
  var rel;
  var g;
  var silent;
  var guard;
  if (!span || !kinds || !kinds.length) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  if (rel > line.length) {
    rel = line.length;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  for (guard = 0; guard < 8; guard++) {
    g = editorInnermostEnclosingGroup(line, rel);
    if (!g || kinds.indexOf(g.kind) < 0) {
      break;
    }
    rel = g.closeEnd;
  }
  if (rel === span.caret - span.lineStart) {
    return false;
  }
  editorPlaceCaret(span.field, span.lineStart + rel, span.lineStart + rel, silent);
  return true;
}

function editorInsertOutsideStructures(text, caretBack, kinds) {
  editorExitEnclosingStructures(kinds || []);
  editorInsertSymbol(text, caretBack);
}

/*
 * True when a Beam / Triplet / Stack tap would nest the same shell the parser
 * rejects (beam-in-beam, stack-in-stack, tuplet-in-tuplet). Cross-kind stays
 * open where the parser allows it (e.g. a beam or stack inside a tuplet).
 */
function editorStructureWouldNest(kind) {
  var span = editorLineSpan();
  var line;
  var sel;
  var start;
  var end;
  var raw;
  var lead;
  var trail;
  var swap;
  if (!span || !kind) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  sel = editorReadSelection(span.field);
  start = sel.start - span.lineStart;
  end = sel.end - span.lineStart;
  if (start < 0) {
    start = 0;
  }
  if (end < 0) {
    end = 0;
  }
  if (start > line.length) {
    start = line.length;
  }
  if (end > line.length) {
    end = line.length;
  }
  if (start > end) {
    swap = start;
    start = end;
    end = swap;
  }
  if (start === end) {
    return editorRelInsideStructure(line, start, kind);
  }
  raw = line.slice(start, end);
  if (!raw || raw.indexOf("\n") >= 0) {
    return editorRelInsideStructure(line, start, kind);
  }
  lead = (raw.match(/^\s*/) || [""])[0].length;
  trail = (raw.match(/\s*$/) || [""])[0].length;
  if (lead + trail >= raw.length) {
    return editorRelInsideStructure(line, start, kind);
  }
  return editorRangeNestsStructure(line, start + lead, end - trail, kind);
}

function editorRelInsideStructure(line, rel, kind) {
  var groups = editorFindBalancedGroups(line);
  var i;
  var g;
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    if (g.kind === kind && rel > g.open && rel < g.closeEnd) {
      return true;
    }
  }
  return false;
}

function editorCaretInsideStructure(kind) {
  var span = editorLineSpan();
  var sel;
  var line;
  var rel;
  if (!span || !kind) {
    return false;
  }
  sel = editorReadSelection(span.field);
  if (sel.start !== sel.end) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = sel.start - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  if (rel > line.length) {
    rel = line.length;
  }
  return editorRelInsideStructure(line, rel, kind);
}

/*
 * Stack inside beam is allowed. Beam/tuplet while inside a stack use proper-order
 * exit-or-wrap instead of a hard refuse (see editorProperOrderFromStack).
 */
function editorStructureParentBlocks(kind, line, rel) {
  return false;
}

function editorStructureInnerEmpty(line, g) {
  if (!g) {
    return false;
  }
  return !/\S/.test(String(line || "").slice(g.innerStart, g.innerEnd));
}

/* Remove one shell (and a leading space) from the active line; park caret at start. */
function editorRemoveStructureShell(g) {
  var span = editorLineSpan();
  var line;
  var start;
  var end;
  var edited;
  var value;
  var silent;
  if (!span || !g) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  start = g.open;
  end = g.closeEnd;
  if (start > 0 && /\s/.test(line.charAt(start - 1))) {
    start -= 1;
  }
  edited = line.slice(0, start) + line.slice(end);
  value = String(span.field.value || "");
  span.field.value = value.slice(0, span.lineStart) + edited + value.slice(span.lineEnd);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, span.lineStart + start, span.lineStart + start, silent);
  return true;
}

/*
 * Drop empty shells that cannot hold the next pad action (rest/bar/slash), then
 * leave the caret where the insert should land.
 */
function editorDissolveEmptyForAction(action) {
  var span = editorLineSpan();
  var line;
  var rel;
  var g;
  var guard;
  var blocked;
  if (!span || !action) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  for (guard = 0; guard < 6; guard++) {
    g = editorInnermostEnclosingGroup(line, rel);
    if (!g || !editorStructureInnerEmpty(line, g)) {
      break;
    }
    blocked =
      action === "bar" ||
      action === "rest" ||
      (action === "slash" && g.kind === "stack") ||
      (action === "tie" && (g.kind === "beam" || g.kind === "stack" || g.kind === "tuplet"));
    if (!blocked) {
      break;
    }
    if (!editorRemoveStructureShell(g)) {
      break;
    }
    span = editorLineSpan();
    if (!span) {
      return true;
    }
    line = span.value.slice(span.lineStart, span.lineEnd);
    rel = span.caret - span.lineStart;
  }
  return true;
}

function editorStackAllShort(line, stack) {
  var spans;
  var i;
  var m;
  var dur;
  if (!stack) {
    return false;
  }
  spans = editorStackPitchSpans(line, stack);
  if (!spans.length) {
    return true;
  }
  for (i = 0; i < spans.length; i++) {
    m = /^[A-G](?:#|b|n)?\d((?:[whqesn]\.?|\.)?)/.exec(spans[i].token);
    dur = String((m && m[1]) || "q").replace(".", "");
    if (dur !== "e" && dur !== "s") {
      return false;
    }
  }
  return true;
}

/* Wrap an existing group with open/close; caret stays just before the old closer. */
function editorWrapExistingGroup(g, open, close) {
  var span = editorLineSpan();
  var value;
  var silent;
  var caret;
  var body;
  if (!span || !g) {
    return false;
  }
  editorPushSymbolUndo();
  value = String(span.field.value || "");
  body = value.slice(span.lineStart + g.open, span.lineStart + g.closeEnd);
  span.field.value =
    value.slice(0, span.lineStart + g.open) +
    open +
    body +
    close +
    value.slice(span.lineStart + g.closeEnd);
  caret = span.lineStart + g.open + open.length + (g.closeStart - g.open);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, caret, caret, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

/*
 * Beam/Triplet while inside a stack: wrap a short stack, otherwise leave the
 * stack and open an empty shell after it. An empty stack dissolves first.
 */
function editorProperOrderFromStack(kind) {
  var span = editorLineSpan();
  var line;
  var rel;
  var stack;
  if (!span || (kind !== "beam" && kind !== "tuplet")) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  stack = editorInnermostGroupAt(line, rel, "stack");
  if (!stack) {
    return false;
  }
  if (editorStructureInnerEmpty(line, stack)) {
    editorPushSymbolUndo();
    editorRemoveStructureShell(stack);
    return editorStructureOpenEmpty(kind, { skipUndo: true });
  }
  if (kind === "beam") {
    if (editorStackAllShort(line, stack)) {
      editorForceShortDuration();
      return editorWrapExistingGroup(stack, "{", "}");
    }
    editorCloseStructure("stack");
    return editorStructureOpenEmpty("beam");
  }
  return editorWrapExistingGroup(stack, "(3 ", ")");
}

/*
 * Insert a rest at the caret inside a beam by splitting the braces around it
 * ({C4e} re {D4e E4e}) instead of exiting the whole group.
 */
function editorInsertRestInBeam() {
  var span = editorLineSpan();
  var line;
  var rel;
  var beam;
  var pieces;
  var idx;
  var i;
  var before;
  var after;
  var replacement;
  var value;
  var silent;
  var caret;
  var rest;
  var at;
  if (!span) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  beam = editorInnermostGroupAt(line, rel, "beam");
  if (!beam || editorStructureInnerEmpty(line, beam)) {
    return false;
  }
  pieces = editorBeamPieces(line, beam);
  if (!pieces.length) {
    return false;
  }
  idx = 0;
  for (i = 0; i < pieces.length; i++) {
    if (rel <= pieces[i].start) {
      idx = i;
      break;
    }
    if (rel < pieces[i].end) {
      /* Caret inside a piece: split after that piece. */
      idx = i + 1;
      break;
    }
    idx = i + 1;
  }
  before = [];
  after = [];
  for (i = 0; i < pieces.length; i++) {
    if (i < idx) {
      before.push(pieces[i].text);
    } else {
      after.push(pieces[i].text);
    }
  }
  rest = editorRestToken();
  replacement = [editorFormatBeamShell(before), rest, editorFormatBeamShell(after)]
    .filter(Boolean)
    .join(" ");
  value = String(span.field.value || "");
  span.field.value =
    value.slice(0, span.lineStart + beam.open) +
    replacement +
    value.slice(span.lineStart + beam.closeEnd);
  at = replacement.indexOf(rest);
  caret = span.lineStart + beam.open + (at < 0 ? replacement.length : at + rest.length);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, caret, caret, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

function editorInnermostGroupAt(line, rel, kind) {
  var groups = editorFindBalancedGroups(line);
  var best = null;
  var i;
  var g;
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    if (g.kind !== kind || rel <= g.open || rel >= g.closeEnd) {
      continue;
    }
    if (!best || g.closeEnd - g.open < best.closeEnd - best.open) {
      best = g;
    }
  }
  return best;
}

/* Caret parked just after a closer from a prior close tap. */
function editorGroupJustAfter(line, rel, kind) {
  var groups = editorFindBalancedGroups(line);
  var i;
  var g;
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    if (g.kind === kind && rel === g.closeEnd) {
      return g;
    }
  }
  return null;
}

/* Selection that is exactly one balanced shell (incl. stack affixes). */
function editorExactGroupSelection(line, start, end, kind) {
  var groups = editorFindBalancedGroups(line);
  var i;
  var g;
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    if (g.kind === kind && start === g.open && end === g.closeEnd) {
      return g;
    }
  }
  return null;
}

function editorEnterStructureGroup(g) {
  var span = editorLineSpan();
  var silent;
  if (!span || !g) {
    return false;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, span.lineStart + g.closeStart, span.lineStart + g.closeStart, silent);
  editorPaintNotePad();
  return true;
}

function editorRangeNestsStructure(line, start, end, kind) {
  var groups = editorFindBalancedGroups(line);
  var i;
  var g;
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    if (g.kind !== kind) {
      continue;
    }
    /* Exact shell selection re-enters; any other overlap would nest. */
    if (start === g.open && end === g.closeEnd) {
      continue;
    }
    if (start < g.closeEnd && end > g.open) {
      return true;
    }
  }
  return false;
}

/* Top-level pieces inside a beam (keeps [stack] groups whole). */
function editorBeamPieces(line, beam) {
  var inner = line.slice(beam.innerStart, beam.innerEnd);
  var pieces = [];
  var re = /\[(?:[^\]]*)\](?:[\^_][^\s\[\{]*)?|~|\S+/g;
  var m;
  while ((m = re.exec(inner))) {
    if (m[0] === "~") {
      continue;
    }
    pieces.push({
      start: beam.innerStart + m.index,
      end: beam.innerStart + m.index + m[0].length,
      text: m[0]
    });
  }
  return pieces;
}

function editorFormatBeamShell(pieceTexts) {
  if (!pieceTexts || !pieceTexts.length) {
    return "";
  }
  if (pieceTexts.length === 1) {
    return pieceTexts[0];
  }
  return "{" + pieceTexts.join(" ") + "}";
}

/*
 * A long duration under a beam peels that piece out (or splits the beam when
 * it sits in the middle). Short rewrites stay inside the braces.
 */
function editorReplaceInBeam(hit, nextToken) {
  var span = editorLineSpan();
  var line;
  var rel;
  var beam;
  var pieces;
  var idx;
  var i;
  var before;
  var after;
  var pealed;
  var mid;
  var replacement;
  var value;
  var silent;
  var caret;
  var startInPiece;
  if (!span || !hit || !hit.field) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = hit.start - span.lineStart;
  beam = editorInnermostGroupAt(line, rel + 1, "beam") || editorInnermostGroupAt(line, rel, "beam");
  if (!beam || rel < beam.innerStart || rel >= beam.closeStart) {
    return false;
  }
  pieces = editorBeamPieces(line, beam);
  idx = -1;
  for (i = 0; i < pieces.length; i++) {
    if (hit.start >= pieces[i].start && hit.start < pieces[i].end) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    return false;
  }
  startInPiece = hit.start - pieces[idx].start;
  pealed =
    pieces[idx].text.slice(0, startInPiece) +
    nextToken +
    pieces[idx].text.slice(startInPiece + hit.token.length);
  before = [];
  after = [];
  for (i = 0; i < idx; i++) {
    before.push(pieces[i].text);
  }
  for (i = idx + 1; i < pieces.length; i++) {
    after.push(pieces[i].text);
  }
  mid = pealed;
  replacement = [editorFormatBeamShell(before), mid, editorFormatBeamShell(after)]
    .filter(Boolean)
    .join(" ");
  editorPushSymbolUndo();
  value = String(hit.field.value || "");
  hit.field.value =
    value.slice(0, span.lineStart + beam.open) +
    replacement +
    value.slice(span.lineStart + beam.closeEnd);
  caret = span.lineStart + beam.open + replacement.indexOf(mid) + mid.length;
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(hit.field, caret, caret, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

/* Wrap the enclosing beam as (3 {…}). */
function editorWrapEnclosingBeamAsTuplet() {
  var span = editorLineSpan();
  var line;
  var rel;
  var beam;
  var value;
  var silent;
  var caret;
  var open = "(3 ";
  var close = ")";
  if (!span) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  beam = editorInnermostGroupAt(line, rel, "beam");
  if (!beam) {
    return false;
  }
  if (editorRelInsideStructure(line, rel, "tuplet")) {
    return false;
  }
  editorPushSymbolUndo();
  value = String(span.field.value || "");
  span.field.value =
    value.slice(0, span.lineStart + beam.open) +
    open +
    value.slice(span.lineStart + beam.open, span.lineStart + beam.closeEnd) +
    close +
    value.slice(span.lineStart + beam.closeEnd);
  caret = span.lineStart + beam.open + open.length + (beam.closeStart - beam.open);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, caret, caret, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

/*
 * True when wrapping inner as kind still parses (beam needs e/s, stack pitches
 * only, tuplet no barline, etc.).
 */
function editorSelectionIsWrappable(kind, inner) {
  var probe;
  var trimmed = String(inner || "").replace(/^\s+|\s+$/g, "");
  if (!trimmed || typeof parseMusicNotation !== "function") {
    return false;
  }
  if (kind === "beam") {
    probe = "{" + trimmed + "}";
  } else if (kind === "stack") {
    probe = "[" + trimmed + "]";
  } else if (kind === "tuplet") {
    if (trimmed.indexOf("|") >= 0) {
      return false;
    }
    probe = "(3 " + trimmed + ")";
  } else {
    return false;
  }
  return !!parseMusicNotation(probe);
}

/* If the caret has a same-line selection, wrap it and return true. */
function editorWrapSelection(open, close, kind) {
  var field = editorActiveField();
  var sel;
  var value;
  var raw;
  var lead;
  var trail;
  var inner;
  var start;
  var end;
  var silent;
  if (!field) {
    return false;
  }
  sel = editorReadSelection(field);
  if (sel.start === sel.end) {
    return false;
  }
  value = String(field.value || "");
  raw = value.slice(sel.start, sel.end);
  if (!raw || raw.indexOf("\n") >= 0) {
    return false;
  }
  lead = (raw.match(/^\s*/) || [""])[0].length;
  trail = (raw.match(/\s*$/) || [""])[0].length;
  if (lead + trail >= raw.length) {
    return false;
  }
  inner = raw.slice(lead, raw.length - trail);
  if (kind && !editorSelectionIsWrappable(kind, inner)) {
    return false;
  }
  start = sel.start + lead;
  end = sel.end - trail;
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(field, start, end, silent);
  editorPushSymbolUndo();
  insertEditorText(String(open || "") + inner + String(close || ""), String(close || "").length);
  return true;
}

/* Move caret just after the closer so the next pad symbol is outside the group. */
function editorCloseStructure(kind) {
  var span = editorLineSpan();
  var line;
  var rel;
  var g;
  var silent;
  if (!span || !kind) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  if (rel > line.length) {
    rel = line.length;
  }
  g = editorInnermostGroupAt(line, rel, kind);
  if (!g) {
    return false;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, span.lineStart + g.closeEnd, span.lineStart + g.closeEnd, silent);
  editorPaintNotePad();
  return true;
}

function editorStructureHit(kind) {
  var pitch;
  var rhythm;
  if (kind === "stack") {
    return editorPitchAtCaret();
  }
  pitch = editorPitchAtCaret();
  if (pitch) {
    return pitch;
  }
  rhythm = editorRhythmAtCaret();
  if (!rhythm) {
    return null;
  }
  if (kind === "beam" && rhythm.kind === "rest") {
    return null;
  }
  return rhythm;
}

/* Beam braces need e/s; rewrite a longer note or slash to the lit short duration. */
function editorRewriteShortToken(hit) {
  var short;
  var parsed;
  var base;
  if (!hit) {
    return "";
  }
  editorForceShortDuration();
  short = editorDurCode(editorNote.dur) || "e";
  if (hit.kind === "slash") {
    return "/" + short + (editorNote.dot ? "." : "");
  }
  if (hit.kind !== "pitch") {
    return hit.token;
  }
  parsed = /^([A-G])(#|b|n)?(\d)((?:[whqesn]\.?)|\.)?$/.exec(hit.token || "");
  if (!parsed) {
    return hit.token;
  }
  base = String(parsed[4] || "").replace(".", "");
  if (base === "e" || base === "s") {
    return hit.token;
  }
  return parsed[1] + (parsed[2] || "") + parsed[3] + short + (editorNote.dot ? "." : "");
}

function editorStructureWrapHit(kind, hit) {
  var pair = editorStructureOpenClose(kind);
  var body;
  var value;
  var silent;
  var caret;
  var span;
  var line;
  var rel;
  if (!pair || !hit || !hit.field) {
    return false;
  }
  span = editorLineSpan();
  line = span ? span.value.slice(span.lineStart, span.lineEnd) : "";
  rel = span ? hit.start - span.lineStart : 0;
  if (kind === "beam" || (kind === "stack" && editorRelInsideStructure(line, rel, "beam"))) {
    body = editorRewriteShortToken(hit);
  } else {
    body = hit.token;
  }
  editorPushSymbolUndo();
  value = String(hit.field.value || "");
  hit.field.value = value.slice(0, hit.start) + pair.open + body + pair.close + value.slice(hit.end);
  caret = hit.start + pair.open.length + body.length;
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(hit.field, caret, caret, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

/* Open an empty shell ({}, [], (3 )); caret sits before the closer. */
function editorStructureOpenEmpty(kind, opts) {
  var pair = editorStructureOpenClose(kind);
  if (!pair) {
    return false;
  }
  if (kind === "beam") {
    editorForceShortDuration();
  }
  if (!(opts && opts.skipUndo)) {
    editorPushSymbolUndo();
  }
  editorInsertSymbol(pair.open + pair.close, pair.close.length);
  editorPaintNotePad();
  return true;
}

function editorStructureSeed(kind) {
  return editorStructureOpenEmpty(kind);
}

/*
 * Beam / Stack / Triplet: lit while the caret is inside that shell. First tap
 * wraps the note (or selection) or seeds one event; second tap closes (caret
 * after the closer) without removing the braces. A third tap with the caret
 * just after that shell re-enters instead of seeding another group.
 */
function editorToggleStructure(kind) {
  var span = editorLineSpan();
  var line;
  var sel;
  var rel;
  var endRel;
  var pair;
  var hit;
  var exact;
  var after;
  var swap;
  pair = editorStructureOpenClose(kind);
  if (!span || !pair) {
    return;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  sel = editorReadSelection(span.field);
  rel = sel.start - span.lineStart;
  endRel = sel.end - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  if (endRel < 0) {
    endRel = 0;
  }
  if (rel > line.length) {
    rel = line.length;
  }
  if (endRel > line.length) {
    endRel = line.length;
  }
  if (rel > endRel) {
    swap = rel;
    rel = endRel;
    endRel = swap;
  }
  if (sel.start === sel.end && editorRelInsideStructure(line, rel, kind)) {
    editorCloseStructure(kind);
    return;
  }
  if (sel.start !== sel.end) {
    exact = editorExactGroupSelection(line, rel, endRel, kind);
    if (exact) {
      editorEnterStructureGroup(exact);
      return;
    }
  }
  if (sel.start === sel.end) {
    after = editorGroupJustAfter(line, rel, kind);
    if (after) {
      editorEnterStructureGroup(after);
      return;
    }
  }
  if (kind === "tuplet" && sel.start === sel.end && editorRelInsideStructure(line, rel, "beam")) {
    if (editorWrapEnclosingBeamAsTuplet()) {
      return;
    }
  }
  if (sel.start !== sel.end && kind === "tuplet") {
    exact = editorExactGroupSelection(line, rel, endRel, "beam") ||
      editorExactGroupSelection(line, rel, endRel, "stack");
    if (exact && editorWrapExistingGroup(exact, "(3 ", ")")) {
      return;
    }
  }
  if (sel.start === sel.end && (kind === "beam" || kind === "tuplet") && editorRelInsideStructure(line, rel, "stack")) {
    if (editorProperOrderFromStack(kind)) {
      return;
    }
  }
  if (sel.start === sel.end && editorStructureParentBlocks(kind, line, rel)) {
    editorPaintNotePad();
    return;
  }
  if (editorStructureWouldNest(kind)) {
    editorPaintNotePad();
    return;
  }
  if (kind === "beam" || (kind === "stack" && editorRelInsideStructure(line, rel, "beam"))) {
    editorForceShortDuration();
  }
  if (sel.start !== sel.end) {
    if (editorWrapSelection(pair.open, pair.close, kind)) {
      editorPaintNotePad();
      return;
    }
    /* Selection present but illegal for this shell: do not seed. */
    editorPaintNotePad();
    return;
  }
  hit = editorStructureHit(kind);
  if (hit) {
    if (kind === "stack" && editorRelInsideStructure(line, rel, "beam")) {
      editorForceShortDuration();
      editorStructureWrapHit(kind, hit);
      return;
    }
    editorStructureWrapHit(kind, hit);
    return;
  }
  editorStructureSeed(kind);
}

function editorInsertBeamGroup() {
  editorToggleStructure("beam");
}

function editorInsertTupletGroup() {
  editorToggleStructure("tuplet");
}

function editorInsertStackGroup() {
  editorToggleStructure("stack");
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
  /* Broken lines still erase tokens; Undo alone restores the last good draw. */
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

function editorPaintDefaultClefToggle(row) {
  var cur = editorReadDefaults().clef === "bass" ? "bass" : "treble";
  var next = cur === "bass" ? "treble" : "bass";
  var label = next === "bass" ? t("edit.clefBass") : t("edit.clefTreble");
  var btn;
  /* Icon is the clef you get next — exercise default, not @bass on the line. */
  btn = editorPadButton(row, { "data-default-clef": next }, editorMusicIcon("clef-" + next), label);
  if (btn && row.firstChild !== btn) {
    row.insertBefore(btn, row.firstChild);
  }
}

function editorPaintNoteDefaults() {
  var host = document.getElementById("editNoteDefaults");
  var old;
  editorPlaceExerciseExtras();
  if (!host || !editorStaffOn()) {
    return;
  }
  old = host.querySelector("[data-default-clef]");
  if (old && old.parentNode) {
    old.parentNode.removeChild(old);
  }
  editorPaintDefaultClefToggle(host);
}

function editorPaintModifiers(row) {
  var hit = editorPitchAtCaret();
  var litAcc = hit ? hit.acc || "" : editorNote.acc || "";
  var octaveGroup = document.createElement("div");
  octaveGroup.className = "edit-note-octave-group";
  octaveGroup.setAttribute("role", "group");
  octaveGroup.setAttribute("aria-label", t("edit.noteOctave").replace("{n}", String(editorWorkingOctave())));
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
  var preview = document.getElementById("editPreview");
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
  /* One gentle pulse when a staff example first fails to draw — not a constant nag. */
  if (
    !undoBtn.disabled &&
    !editorStaffPendingUndoHinted &&
    preview &&
    preview.classList.contains("is-staff-pending")
  ) {
    editorStaffPendingUndoHinted = true;
    undoBtn.classList.add("is-staff-undo-hint");
  }
}

function editorWithKeyboardStaffEdit(fn) {
  editorKeyboardStaffEdit = true;
  editorAnalyticsMark("used_type");
  try {
    fn();
  } finally {
    editorKeyboardStaffEdit = false;
  }
}

function editorPaintDurations(row) {
  var shared = editorStackSharedDuration();
  var lit = shared ? shared.dur : editorDurCode(editorNote.dur);
  var litDot = shared ? shared.dot : !!editorNote.dot;
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
  editorPadButton(row, { "data-dot": "1" }, editorMusicIcon("dur-" + (lit || "q") + "."), t("edit.noteDotted"), litDot);
}

function editorPaintNoteEvents(row) {
  var rhythm = editorRhythmSuffix();
  editorPadButton(row, { "data-event": "slash" }, editorMusicIcon("slash-" + rhythm), t("edit.noteSlash") + " " + editorSlashToken());
  editorPadButton(row, { "data-event": "rest" }, editorMusicIcon("rest-" + rhythm), t("edit.noteRest") + " " + editorRestToken());
  editorPadButton(row, { "data-event": "bar" }, editorMusicIcon("bar"), t("edit.noteBar"), editorCaretHasBarMark());
  editorPadButton(row, { "data-event": "tie" }, editorMusicIcon("tie"), t("edit.noteTie"), editorCaretHasTieMark());
  editorPadButton(
    row,
    { "data-event": "beam" },
    editorMusicIcon("beam"),
    t("edit.noteBeam"),
    editorCaretInsideStructure("beam")
  );
  editorPadButton(
    row,
    { "data-event": "tuplet" },
    editorMusicIcon("tuplet"),
    t("edit.noteTuplet"),
    editorCaretInsideStructure("tuplet")
  );
  editorPadButton(
    row,
    { "data-event": "chord" },
    editorMusicIcon("chord"),
    t("edit.noteChord"),
    !!editorCaretChordMarkRange()
  );
  editorPadButton(
    row,
    { "data-event": "stack" },
    editorMusicIcon("stack"),
    t("edit.noteStack"),
    editorCaretInsideStructure("stack")
  );
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
  editorPaintNoteDefaults();
  editorPaintLetters(stepHost);
  editorPaintModifiers(chipsHost);
  editorPaintDurations(durHost);
  editorPaintNoteEvents(eventsHost);
  editorNotePadStamp = stamp;
  editorPaintUndoRedo();
}

function editorWriteLetter(letter, opts) {
  var token;
  var span;
  var line;
  var stack;
  var occupied;
  var oct;
  var acc;
  var free;
  var suffix;
  if (editorCaretInsideStructure("beam")) {
    editorForceShortDuration();
  }
  acc = editorNote.acc || "";
  oct = editorWorkingOctave();
  suffix = editorPitchSuffix();
  token = String(letter || "C") + acc + String(oct) + suffix;
  span = editorLineSpan();
  if (span) {
    line = span.value.slice(span.lineStart, span.lineEnd);
    stack = editorStackGroupAtCaret();
    if (stack) {
      occupied = editorStackOccupiedKeys(line, stack);
      free = editorNextFreeStackOctave(letter, acc, oct, occupied);
      if (free === null) {
        editorPaintNotePad();
        return;
      }
      token = String(letter || "C") + acc + String(free) + suffix;
    }
  }
  if (!(opts && opts.skipUndo)) {
    editorPushSymbolUndo();
  }
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

/* Pitch token with optional glued ^/_/'/>/- affixes (stack / beam inners). */
function editorRewritePitchDurationToken(tok, dur, dot) {
  var m = /^([A-G])(#|b|n)?(\d)((?:[whqesn]\.?)|\.)?(.*)$/.exec(tok || "");
  var hit;
  if (!m) {
    return tok;
  }
  hit = { letter: m[1], acc: m[2] || "", oct: parseInt(m[3], 10), token: tok };
  return editorPitchTokenWith(hit, hit.acc, dur, dot) + (m[5] || "");
}

function editorStackGroupAtCaret() {
  var span = editorLineSpan();
  var line;
  var rel;
  if (!span) {
    return null;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  if (rel > line.length) {
    rel = line.length;
  }
  return editorInnermostGroupAt(line, rel, "stack");
}

/* Absolute field spans for each pitch word inside [ … ]. */
function editorStackPitchSpans(line, stack) {
  var inner = line.slice(stack.innerStart, stack.innerEnd);
  var spans = [];
  var re = /\S+/g;
  var m;
  while ((m = re.exec(inner))) {
    if (!/^([A-G])/.test(m[0])) {
      continue;
    }
    spans.push({
      start: stack.innerStart + m.index,
      end: stack.innerStart + m.index + m[0].length,
      token: m[0]
    });
  }
  return spans;
}

function editorPitchKeyFromToken(tok) {
  var m = /^([A-G])(#|b|n)?(\d)/.exec(tok || "");
  if (!m) {
    return "";
  }
  return m[1] + (m[2] || "") + m[3];
}

function editorStackOccupiedKeys(line, stack) {
  var spans = editorStackPitchSpans(line, stack);
  var keys = {};
  var i;
  var key;
  for (i = 0; i < spans.length; i++) {
    key = editorPitchKeyFromToken(spans[i].token);
    if (key) {
      keys[key] = true;
    }
  }
  return keys;
}

function editorNextFreeStackOctave(letter, acc, startOct, occupied) {
  var base = String(letter || "C") + (acc || "");
  var oct = editorClampOctave(startOct);
  var i;
  var key;
  if (!occupied[base + String(oct)]) {
    return oct;
  }
  for (i = 1; i <= 9; i++) {
    key = base + String(editorClampOctave(oct + i));
    if (oct + i <= 9 && !occupied[key]) {
      return editorClampOctave(oct + i);
    }
    key = base + String(editorClampOctave(oct - i));
    if (oct - i >= 0 && !occupied[key]) {
      return editorClampOctave(oct - i);
    }
  }
  return null;
}

/* Shared duration across every pitch in the stack at the caret, or null if mixed. */
function editorStackSharedDuration() {
  var span = editorLineSpan();
  var line;
  var stack;
  var spans;
  var i;
  var m;
  var dur;
  var dot;
  var code;
  if (!span) {
    return null;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  stack = editorStackGroupAtCaret();
  if (!stack) {
    return null;
  }
  spans = editorStackPitchSpans(line, stack);
  if (!spans.length) {
    return null;
  }
  for (i = 0; i < spans.length; i++) {
    m = /^[A-G](?:#|b|n)?\d((?:[whqesn]\.?)|\.)?/.exec(spans[i].token);
    if (!m) {
      return null;
    }
    code = String(m[1] || "").replace(".", "");
    if (code === "q") {
      code = "";
    }
    if (i === 0) {
      dur = code;
      dot = /\.$/.test(m[1] || "");
    } else if (dur !== code || dot !== /\.$/.test(m[1] || "")) {
      return null;
    }
  }
  return { dur: dur, dot: dot };
}

/*
 * Rewrite every pitch in the stack to the same duration. A long duration under a
 * beam peels the whole [stack] out of the braces.
 */
function editorApplyStackDuration(dur, dot) {
  var span = editorLineSpan();
  var line;
  var stack;
  var spans;
  var i;
  var parts;
  var cursor;
  var inner;
  var affix;
  var nextInner;
  var nextShell;
  var beam;
  var pieces;
  var idx;
  var before;
  var after;
  var replacement;
  var value;
  var silent;
  var caret;
  var short;
  var rel;
  if (!span) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  stack = editorStackGroupAtCaret();
  if (!stack) {
    return false;
  }
  spans = editorStackPitchSpans(line, stack);
  if (!spans.length) {
    return false;
  }
  parts = [];
  cursor = stack.innerStart;
  for (i = 0; i < spans.length; i++) {
    parts.push(line.slice(cursor, spans[i].start));
    parts.push(editorRewritePitchDurationToken(spans[i].token, dur, dot));
    cursor = spans[i].end;
  }
  parts.push(line.slice(cursor, stack.innerEnd));
  nextInner = parts.join("");
  affix = line.slice(stack.closeStart + 1, stack.closeEnd);
  nextShell = "[" + nextInner + "]" + affix;
  short = editorDurationIsShort(dur);
  rel = span.caret - span.lineStart;
  beam = editorInnermostGroupAt(line, rel, "beam");
  if (!short && beam && stack.open >= beam.innerStart && stack.closeEnd <= beam.closeStart) {
    pieces = editorBeamPieces(line, beam);
    idx = -1;
    for (i = 0; i < pieces.length; i++) {
      if (stack.open >= pieces[i].start && stack.open < pieces[i].end) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      before = [];
      after = [];
      for (i = 0; i < idx; i++) {
        before.push(pieces[i].text);
      }
      for (i = idx + 1; i < pieces.length; i++) {
        after.push(pieces[i].text);
      }
      replacement = [editorFormatBeamShell(before), nextShell, editorFormatBeamShell(after)]
        .filter(Boolean)
        .join(" ");
      editorPushSymbolUndo();
      value = String(span.field.value || "");
      span.field.value =
        value.slice(0, span.lineStart + beam.open) +
        replacement +
        value.slice(span.lineStart + beam.closeEnd);
      caret = span.lineStart + beam.open + replacement.indexOf(nextShell) + nextShell.length;
      silent = !!(editorPadCaret && editorSymbolsIsOpen());
      editorPlaceCaret(span.field, caret, caret, silent);
      clearEditorNotice();
      refreshEditor();
      editorPaintNotePad();
      return true;
    }
  }
  editorPushSymbolUndo();
  value = String(span.field.value || "");
  span.field.value =
    value.slice(0, span.lineStart + stack.open) +
    nextShell +
    value.slice(span.lineStart + stack.closeEnd);
  caret = span.lineStart + stack.open + nextShell.length;
  if (affix) {
    caret -= affix.length;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, caret, caret, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

function editorApplyDurationToHit(hit, dur, dot) {
  var nextToken;
  var short;
  if (!hit) {
    return false;
  }
  if (hit.kind === "pitch" && editorStackGroupAtCaret()) {
    return editorApplyStackDuration(dur, dot);
  }
  if (hit.kind === "pitch") {
    nextToken = editorRewritePitchDurationToken(hit.token, dur, dot);
  } else {
    nextToken = editorRhythmTokenWith(hit, dur, dot) + (hit.affix || "");
  }
  short = editorDurationIsShort(dur);
  if (!short && editorReplaceInBeam(hit, nextToken)) {
    return true;
  }
  return editorReplaceCaretToken(hit, nextToken);
}

function editorSetDuration(dur) {
  var next = editorDurCode(dur);
  var hit;
  editorNote.dur = next;
  if (editorStackGroupAtCaret() && editorApplyStackDuration(next, editorNote.dot)) {
    return;
  }
  hit = editorPitchAtCaret() || editorRhythmAtCaret();
  if (hit && editorApplyDurationToHit(hit, next, editorNote.dot)) {
    return;
  }
  editorPaintNotePad();
}

function editorToggleDot() {
  var next = !editorNote.dot;
  var hit;
  editorNote.dot = next;
  if (editorStackGroupAtCaret() && editorApplyStackDuration(editorNote.dur, next)) {
    return;
  }
  hit = editorPitchAtCaret() || editorRhythmAtCaret();
  if (hit && editorApplyDurationToHit(hit, editorNote.dur, next)) {
    return;
  }
  editorPaintNotePad();
}

/* Trimmed text before the caret on the active line (field coords). */
function editorTextBeforeCaretTrimmed() {
  return String(editorTextBeforeCaret() || "").replace(/\s+$/, "");
}

function editorCaretHasTieMark() {
  var before = editorTextBeforeCaretTrimmed();
  return before.charAt(before.length - 1) === "~";
}

function editorCaretHasBarMark() {
  var before = editorTextBeforeCaretTrimmed();
  return before.charAt(before.length - 1) === "|";
}

/* Index just after ] (stack closeEnd may already include ]^… / ]_…). */
function editorStackCloserEnd(stack) {
  if (!stack) {
    return 0;
  }
  return stack.closeStart + 1;
}

/* Stack-level ]^… label range (field offsets), or null. */
function editorStackChordMarkRange(span, stack) {
  var line;
  var after;
  var m;
  var closer;
  if (!span || !stack) {
    return null;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  closer = editorStackCloserEnd(stack);
  after = line.slice(closer);
  m = /^\^[^\s]*/.exec(after);
  if (!m) {
    return null;
  }
  return {
    start: span.lineStart + closer,
    end: span.lineStart + closer + m[0].length
  };
}

/*
 * Chord mark at the caret: stack ]^… (preferred), bare ^, or a glued ^name
 * affix on the note/slash/rest under the caret.
 */
function editorCaretChordMarkRange() {
  var field = editorActiveField();
  var sel;
  var value;
  var caret;
  var before;
  var trimmed;
  var hit;
  var tok;
  var aff;
  var at;
  var span;
  var line;
  var rel;
  var stack;
  var stackMark;
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
  trimmed = before.replace(/\s+$/, "");
  span = editorLineSpan();
  if (span) {
    line = span.value.slice(span.lineStart, span.lineEnd);
    rel = caret - span.lineStart;
    if (rel < 0) {
      rel = 0;
    }
    if (rel > line.length) {
      rel = line.length;
    }
    stack =
      editorInnermostGroupAt(line, rel, "stack") ||
      editorGroupJustAfter(line, rel, "stack");
    stackMark = editorStackChordMarkRange(span, stack);
    if (stackMark) {
      return stackMark;
    }
  }
  if (trimmed.charAt(trimmed.length - 1) === "^") {
    return { start: trimmed.length - 1, end: trimmed.length + (before.length - trimmed.length) };
  }
  hit = editorPitchAtCaret() || editorRhythmAtCaret();
  if (hit) {
    tok = hit.token;
    aff = /\^[^\s]*$/.exec(tok);
    if (aff && aff[0].length > 0) {
      return { start: hit.start + tok.length - aff[0].length, end: hit.end };
    }
  }
  /* Caret parked after a stack closer with ]^Name. */
  at = trimmed.lastIndexOf("]^");
  if (at >= 0 && at === trimmed.length - 2) {
    return { start: at + 1, end: trimmed.length };
  }
  aff = /\^[^\s\]]+$/.exec(trimmed);
  if (aff && trimmed.charAt(trimmed.length - aff[0].length - 1) === "]") {
    return { start: trimmed.length - aff[0].length, end: trimmed.length };
  }
  return null;
}

function editorRemoveRangeBeforeCaret(start, end) {
  var field = editorActiveField();
  var value;
  var silent;
  if (!field || start < 0 || end < start) {
    return false;
  }
  editorPushSymbolUndo();
  value = String(field.value || "");
  field.value = value.slice(0, start) + value.slice(end);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(field, start, start, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

function editorCaretBeforeRest() {
  var hit = editorRhythmAtCaret();
  var before;
  if (hit && hit.kind === "rest") {
    return true;
  }
  before = editorTextBeforeCaretTrimmed();
  return /^r[whqes]?\.?$/i.test(before.split(/\s+/).pop() || "");
}

function editorToggleOrInsertTie() {
  var before;
  var start;
  var end;
  if (editorCaretHasTieMark()) {
    before = String(editorActiveField().value || "").slice(0, editorReadSelection(editorActiveField()).start);
    end = before.length;
    start = before.replace(/\s+$/, "").length - 1;
    editorRemoveRangeBeforeCaret(start, end);
    return;
  }
  if (editorCaretBeforeRest()) {
    editorPaintNotePad();
    return;
  }
  editorPushSymbolUndo();
  editorDissolveEmptyForAction("tie");
  editorInsertOutsideStructures("~", 0, ["stack"]);
}

function editorToggleOrInsertBar() {
  var before;
  var trimmed;
  var start;
  var end;
  if (editorCaretHasBarMark()) {
    before = String(editorActiveField().value || "").slice(0, editorReadSelection(editorActiveField()).start);
    trimmed = before.replace(/\s+$/, "");
    end = before.length;
    start = trimmed.length - 1;
    if (start > 0 && trimmed.charAt(start - 1) === " ") {
      start -= 1;
    }
    editorRemoveRangeBeforeCaret(start, end);
    return;
  }
  editorPushSymbolUndo();
  editorDissolveEmptyForAction("bar");
  editorInsertOutsideStructures("| ", 0, ["beam", "stack", "tuplet"]);
}

function editorToggleOrInsertChord() {
  var mark = editorCaretChordMarkRange();
  var hit;
  var value;
  var silent;
  var caret;
  var span;
  var line;
  var rel;
  var stack;
  var insertAt;
  if (mark) {
    editorRemoveRangeBeforeCaret(mark.start, mark.end);
    return;
  }
  hit = editorPitchAtCaret() || editorRhythmAtCaret();
  editorPushSymbolUndo();
  if (hit && hit.field && editorCaretInsideStructure("beam") && !editorCaretInsideStructure("stack")) {
    value = String(hit.field.value || "");
    hit.field.value = value.slice(0, hit.end) + "^" + value.slice(hit.end);
    caret = hit.end + 1;
    silent = !!(editorPadCaret && editorSymbolsIsOpen());
    editorPlaceCaret(hit.field, caret, caret, silent);
    clearEditorNotice();
    refreshEditor();
    editorPaintNotePad();
    return;
  }
  /* Inside (or just after) a stack: chord name belongs after ], not on one pitch. */
  span = editorLineSpan();
  if (span) {
    line = span.value.slice(span.lineStart, span.lineEnd);
    rel = span.caret - span.lineStart;
    if (rel < 0) {
      rel = 0;
    }
    if (rel > line.length) {
      rel = line.length;
    }
    stack =
      editorInnermostGroupAt(line, rel, "stack") ||
      editorGroupJustAfter(line, rel, "stack");
    if (stack) {
      insertAt = span.lineStart + editorStackCloserEnd(stack);
      value = String(span.field.value || "");
      span.field.value = value.slice(0, insertAt) + "^" + value.slice(insertAt);
      caret = insertAt + 1;
      silent = !!(editorPadCaret && editorSymbolsIsOpen());
      editorPlaceCaret(span.field, caret, caret, silent);
      clearEditorNotice();
      refreshEditor();
      editorPaintNotePad();
      return;
    }
  }
  editorInsertSymbol("^");
}

/*
 * Shift every pitch octave in text. Boundaries avoid ^chord / _label letters
 * (only after space, start, or openers).
 */
function editorShiftOctavesInText(text, dir) {
  dir = dir < 0 ? -1 : 1;
  return String(text || "").replace(
    /(^|[\s\[{(])([A-G](?:#|b|n)?)(\d)/g,
    function (all, boundary, head, octDigit) {
      var oct = editorClampOctave(parseInt(octDigit, 10) + dir);
      return boundary + head + String(oct);
    }
  );
}

/* Selection ↑↓: move every pitch, keep durations and marks; keep the selection. */
function editorShiftSelectionOctaves(dir) {
  var field = editorActiveField();
  var sel;
  var value;
  var raw;
  var next;
  var silent;
  if (!field) {
    return false;
  }
  sel = editorReadSelection(field);
  if (sel.start === sel.end) {
    return false;
  }
  value = String(field.value || "");
  raw = value.slice(sel.start, sel.end);
  if (!raw || raw.indexOf("\n") >= 0) {
    return false;
  }
  next = editorShiftOctavesInText(raw, dir);
  if (next === raw) {
    return true;
  }
  editorPushSymbolUndo();
  field.value = value.slice(0, sel.start) + next + value.slice(sel.end);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(field, sel.start, sel.start + next.length, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

function editorShiftOctave(dir) {
  var hit;
  var oct;
  var suffix;
  var next;
  var span;
  var line;
  var stack;
  var occupied;
  var key;
  var selfKey;
  dir = dir < 0 ? -1 : 1;
  if (editorShiftSelectionOctaves(dir)) {
    return;
  }
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
  span = editorLineSpan();
  if (span) {
    line = span.value.slice(span.lineStart, span.lineEnd);
    stack = editorStackGroupAtCaret();
    if (stack) {
      occupied = editorStackOccupiedKeys(line, stack);
      selfKey = hit.letter + (hit.acc || "") + String(hit.oct);
      key = hit.letter + (hit.acc || "") + String(oct);
      delete occupied[selfKey];
      if (occupied[key]) {
        editorPaintNotePad();
        return;
      }
    }
  }
  suffix = hit.token.slice((hit.letter + (hit.acc || "") + String(hit.oct)).length);
  next = hit.letter + (hit.acc || "") + String(oct) + suffix;
  if (!editorReplaceCaretToken(hit, next)) {
    return;
  }
  editorNote.oct = null;
}

function editorActivateSymbol(button, opts) {
  var eventName;
  var skipUndo = !!(opts && opts.skipUndo);
  if (!button) {
    return;
  }
  editorAnalyticsMark("used_pad");
  if (button.hasAttribute("data-undo")) {
    editorSymbolUndoStep();
    return;
  }
  if (button.hasAttribute("data-redo")) {
    editorSymbolRedoStep();
    return;
  }
  if (button.hasAttribute("data-erase")) {
    editorEraseStep(opts);
    return;
  }
  if (button.hasAttribute("data-note")) {
    editorWriteLetter(button.getAttribute("data-note"), opts);
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
  if (button.hasAttribute("data-default-clef")) {
    editorToggleDefaultClef(button.getAttribute("data-default-clef") || "");
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
      if (!skipUndo) {
        editorPushSymbolUndo();
      }
      editorDissolveEmptyForAction("slash");
      if (editorCaretInsideStructure("beam")) {
        editorForceShortDuration();
      }
      editorInsertOutsideStructures(editorSlashToken(), 0, ["stack"]);
      return;
    }
    if (eventName === "rest") {
      if (!skipUndo) {
        editorPushSymbolUndo();
      }
      editorDissolveEmptyForAction("rest");
      if (editorInsertRestInBeam()) {
        return;
      }
      editorInsertOutsideStructures(editorRestToken(), 0, ["beam", "stack"]);
      return;
    }
    if (eventName === "bar") {
      editorToggleOrInsertBar();
      return;
    }
    if (eventName === "tie") {
      editorToggleOrInsertTie();
      return;
    }
    if (eventName === "beam") {
      editorInsertBeamGroup();
      return;
    }
    if (eventName === "tuplet") {
      editorInsertTupletGroup();
      return;
    }
    if (eventName === "chord") {
      editorToggleOrInsertChord();
      return;
    }
    if (eventName === "stack") {
      editorInsertStackGroup();
      return;
    }
  }
  if (button.hasAttribute("data-symbol")) {
    editorDropNoteFlow();
    editorPushSymbolUndo();
    editorInsertTextSymbol(
      button.getAttribute("data-symbol") || "",
      parseInt(button.getAttribute("data-caret") || "0", 10) || 0
    );
  }
}

/* Text Symbols: | and simile leave beams / stacks / tuplets like the note pad. */
function editorInsertTextSymbol(text, caretBack) {
  var raw = String(text || "");
  var measure =
    raw === "|" ||
    raw.indexOf("|") === 0 ||
    raw === "%" ||
    raw === "\uD834\uDD0E" ||
    raw.indexOf("%") >= 0 ||
    raw.indexOf("\uD834\uDD0E") >= 0;
  if (measure && editorStaffOn()) {
    editorDissolveEmptyForAction("bar");
    editorExitEnclosingStructures(["beam", "stack", "tuplet"]);
  }
  insertEditorText(raw, caretBack);
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
  editorAnalyticsMark("used_sample");
  if (typeof track === "function") {
    track("edit_staff_sample", {
      mode: editorIsCreateMode() ? "create" : "edit"
    });
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
    editorSyncFocusFromArea({ caret: "end" });
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
    editorSyncFocusFromArea({ caret: "end" });
  }
  clearEditorNotice();
  refreshEditor();
  if (window.matchMedia("(pointer: fine)").matches) {
    if (editorIsFocusMode()) {
      editorPlaceFocusCaretEnd();
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
    editorDraft.clef = "";
    editorDraft.key = "";
    editorDraft.meter = null;
    editorDraft.text = "";
  } else {
    editorDraft.name = desk ? exerciseDisplayName(desk) : editorDraft.label;
    editorDraft.bars = typeof exerciseBars === "number" && exerciseBars > 0 ? exerciseBars : 1;
    editorDraft.staff = !!(desk && desk.staff);
    editorDraft.clef = desk && desk.clef === "bass" ? "bass" : "";
    editorDraft.key = desk && desk.key ? desk.key : "";
    editorDraft.meter = desk && desk.meter ? { beats: desk.meter.beats, unit: desk.meter.unit } : null;
    /* Prefer desk.lines (plain source). chromaticScale holds display HTML for text. */
    var source =
      desk && desk.lines && desk.lines.length
        ? desk.lines
        : typeof chromaticScale !== "undefined" && chromaticScale
          ? chromaticScale
          : [];
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
  editorWriteBars(editorDraft.bars);
  setEditorStaff(editorDraft.staff);
  editorApplyDefaultsUi(editorDraft);
  editorSyncStaffDefaults();
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
  if (editorIsFocusMode()) {
    editorSyncFocusFromArea({ caret: "end" });
  } else if (window.matchMedia("(pointer: fine)").matches) {
    if (editorIsCreateMode() && nameField) {
      nameField.focus();
      nameField.select();
    } else {
      area.focus();
    }
  }
  refreshEditor();
  editorAnalyticsBegin("edit");
  if (typeof track === "function") {
    track("edit_open", {
      exercise_id: editorAnalyticsExerciseId(),
      mode: editorIsCreateMode() ? "create" : "edit",
      kind: editorAnalyticsKind(),
      example_count: editorAnalyticsExampleCount(),
      source: "edit"
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
    editorDraft.clef = spec.clef === "bass" ? "bass" : "";
    editorDraft.key = spec.key || "";
    editorDraft.meter = spec.meter || null;
    editorDraft.text = "";
  } else {
    editorDraft.id = target.id;
    editorDraft.name = typeof exerciseDisplayName === "function" ? exerciseDisplayName(target) : target.name;
    editorDraft.bars = target.bars;
    editorDraft.staff = spec.staff === true;
    editorDraft.clef = target.clef === "bass" ? "bass" : spec.clef === "bass" ? "bass" : "";
    editorDraft.key = target.key || spec.key || "";
    editorDraft.meter = target.meter || spec.meter || null;
    editorDraft.text = editorPlainLines(target.lines);
  }
  editorDraft.storedLines = editorDraft.mode === "create" || !target ? null : editorPlainLines(target.lines);
  editorViewOverride = null;
  editorFocusIndex = 0;
  editorClearSymbolHistory();
  var area = document.getElementById("allEdit");
  area.value = editorPlainLines(spec.lines);
  editorWriteBars(spec.bars || 1);
  setEditorStaff(editorDraft.staff);
  editorApplyDefaultsUi(editorDraft);
  editorSyncStaffDefaults();
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
  editorAnalyticsBegin("share");
  if (typeof track === "function") {
    track("edit_open", {
      exercise_id: editorAnalyticsExerciseId(),
      mode: editorIsCreateMode() ? "create" : "edit",
      kind: editorAnalyticsKind(),
      example_count: editorAnalyticsExampleCount(),
      source: "share"
    });
  }
}

function editorCancel() {
  var dirty;
  var face;
  if (!editorIsOpen()) {
    return;
  }
  dirty = editorIsDirty();
  editorAnalyticsOutcome("cancel", dirty);
  if (typeof track === "function") {
    track("edit_cancel", {
      mode: editorIsCreateMode() ? "create" : "edit",
      kind: editorAnalyticsKind(),
      dirty: dirty,
      example_count: editorAnalyticsExampleCount(),
      source: editorAnalytics ? editorAnalytics.source : "edit"
    });
  }
  if (typeof sharePreview !== "undefined" && sharePreview && typeof cancelSharePreview === "function") {
    cancelSharePreview();
    return;
  }
  face = document.getElementById("exerciseFace");
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

function exerciseDownloadName(name) {
  var base = String(name || "")
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[. ]+$/g, "");
  if (!base) {
    base = "eization";
  }
  if (base.length > 60) {
    base = base.slice(0, 60).replace(/[. ]+$/g, "") || "eization";
  }
  return base + ".eiz";
}

function editorFileText(lines, bars, name, staff, defaults) {
  var out = "# eization " + EDITOR_FILE_VERSION + "\n# bars " + clampEditorBars(bars) + "\n# staff " + (staff ? "1" : "0") + "\n";
  var clean = String(name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  var clef;
  var key;
  var meter;
  if (clean) {
    out += "# name " + clean.slice(0, 60) + "\n";
  }
  defaults = defaults || {};
  clef = defaults.clef === "bass" ? "bass" : "";
  key = defaults.key || "";
  meter = defaults.meter;
  if (clef) {
    out += "# clef " + clef + "\n";
  }
  if (key) {
    out += "# key " + key + "\n";
  }
  if (meter && meter.beats && meter.unit) {
    out += "# meter " + meter.beats + "/" + meter.unit + "\n";
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
  var clef = "";
  var key = "";
  var meter = null;
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
      var clefMatch = line.match(/^\s*#\s*clef\s+(treble|bass)\s*$/i);
      if (clefMatch) {
        clef = clefMatch[1].toLowerCase() === "bass" ? "bass" : "";
        continue;
      }
      var keyMatch = line.match(/^\s*#\s*key\s+(\S+)\s*$/i);
      if (keyMatch) {
        key = typeof cleanDeskKey === "function" ? cleanDeskKey(keyMatch[1]) : keyMatch[1];
        continue;
      }
      var meterMatch = line.match(/^\s*#\s*meter\s+(\d+)\s*\/\s*(\d+)\s*$/i);
      if (meterMatch) {
        meter =
          typeof cleanDeskMeter === "function"
            ? cleanDeskMeter({ beats: meterMatch[1], unit: meterMatch[2] })
            : null;
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
    clef: clef,
    key: key,
    meter: meter,
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
  var bars = editorReadBars();
  editorWriteBars(bars);
  var name = editorNameValue();
  var file = exerciseDownloadName(name);
  var blob = new Blob(
    [editorFileText(lines, bars, name, editorStaffOn(), editorPartDefaults())],
    { type: "text/plain;charset=utf-8" }
  );
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = file;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1500);
  editorStatus(tr("edit.downloaded", { file: file }));
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
      editorWriteBars(parsed.bars);
    }
    if (parsed.staff === true || parsed.staff === false) {
      setEditorStaff(parsed.staff);
    }
    editorApplyDefaultsUi({
      clef: parsed.clef || "",
      key: parsed.key || "",
      meter: parsed.meter || null
    });
    editorSyncStaffDefaults();
    if (parsed.name) {
      var nameField = document.getElementById("editName");
      if (nameField) {
        nameField.value = parsed.name;
      }
      syncEditorFaceName();
    }
    if (editorIsFocusMode()) {
      editorSyncFocusFromArea({ caret: "end" });
    }
    editorNotice(t("edit.uploadReplaced"));
    refreshEditor();
    if (typeof track === "function") {
      track("edit_upload");
    }
    if (editorIsFocusMode()) {
      editorPlaceFocusCaretEnd();
    } else {
      area.focus();
    }
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

function applyEditorToReel(lines, bars, staff, defaults) {
  var on = staff === true || staff === false ? staff : editorStaffOn();
  var items = [];
  var record =
    defaults ||
    (typeof getDeskExercise === "function" ? getDeskExercise(currentExerciseId) : null);
  for (var i = 0; i < lines.length; i++) {
    items.push(typeof deskDisplayItem === "function" ? deskDisplayItem(lines[i], on) : lineToItem(lines[i]));
  }
  if (typeof applyPracticeStaffDefaults === "function") {
    applyPracticeStaffDefaults(record);
  }
  newExercise(items, bars, on);
  if (typeof maybeOfferRecommendedMeter === "function") {
    maybeOfferRecommendedMeter(record);
  }
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
    editorSyncFocusFromArea({ caret: "end" });
    refreshEditor();
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
  var bars = editorReadBars();
  editorWriteBars(bars);
  var name = resolveEditorName(editorNameValue());
  var updateButton = document.getElementById("editUpdate");
  if (editorLinesChangedUnderfoot() && (!updateButton || !updateButton.classList.contains("is-armed"))) {
    armEditorStale();
    return;
  }
  disarmEditorStale();
  var defaults = editorPartDefaults();
  var saved = typeof updateDeskExercise === "function"
    ? updateDeskExercise(editorDraft.id, {
        name: name,
        bars: bars,
        staff: editorStaffOn(),
        lines: lines,
        clef: defaults.clef,
        key: defaults.key,
        meter: defaults.meter
      })
    : null;
  if (!saved) {
    editorNotice(t("edit.noUpdate"));
    return;
  }
  var fromShare = typeof sharePreview !== "undefined" && !!sharePreview;
  var updateParams = {
    exercise_id: typeof analyticsExerciseId === "function" ? analyticsExerciseId() : "custom",
    mode: "edit",
    kind: editorStaffOn() ? "staff" : "text",
    example_count: lines.length,
    source: editorAnalytics ? editorAnalytics.source : "edit"
  };
  editorAnalyticsOutcome("update", false);
  if (typeof track === "function") {
    track("edit_update", updateParams);
  }
  currentExerciseId = saved.id;
  editorCloseQuiet();
  if (fromShare && typeof finishShareEdit === "function") {
    finishShareEdit();
  }
  applyEditorToReel(saved.lines, saved.bars, saved.staff, saved);
  if (fromShare && typeof showDeskNote === "function") {
    showDeskNote(t("share.updated"));
  }
  if (fromShare && typeof offerHelloAfterShare === "function") {
    offerHelloAfterShare();
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
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
  var bars = editorReadBars();
  editorWriteBars(bars);
  var name = resolveEditorName(editorNameValue());
  var fromShare = typeof sharePreview !== "undefined" && !!sharePreview;
  var defaults = editorPartDefaults();
  var part = {
    name: name,
    bars: bars,
    staff: editorStaffOn(),
    lines: lines,
    clef: defaults.clef,
    key: defaults.key,
    meter: defaults.meter
  };
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
  var createMode = editorIsCreateMode();
  var saveParams = {
    exercise_id: "custom",
    mode: createMode ? "create" : "edit",
    kind: editorStaffOn() ? "staff" : "text",
    example_count: lines.length,
    source: editorAnalytics ? editorAnalytics.source : "edit"
  };
  editorAnalyticsOutcome(createMode ? "create" : "save_as", false);
  if (typeof track === "function") {
    track("edit_save_as", saveParams);
  }
  currentExerciseId = created.id;
  editorCloseQuiet();
  if (fromShare && typeof finishShareEdit === "function") {
    finishShareEdit();
  }
  applyEditorToReel(created.lines, created.bars, created.staff, created);
  if (fromShare && typeof offerHelloAfterShare === "function") {
    offerHelloAfterShare();
  }
  if (typeof showDeskNote === "function") {
    showDeskNote(t("edit.added"));
  }
  if (typeof rememberSetup === "function") {
    rememberSetup();
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
  editorAnalyticsOutcome("delete", false);
  if (typeof track === "function") {
    track("edit_delete", {
      exercise_id: removedId,
      kind: editorAnalyticsKind(),
      example_count: editorAnalyticsExampleCount()
    });
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
  var defaults = document.createElement("div");
  var flow = document.createElement("div");
  var main = document.createElement("div");
  var letters = document.createElement("div");
  var modifiers = document.createElement("div");
  var durations = document.createElement("div");
  var events = document.createElement("div");
  pad.id = "editNotePad";
  defaults.id = "editNoteDefaults";
  defaults.className = "edit-note-row edit-note-defaults";
  defaults.setAttribute("role", "group");
  defaults.setAttribute("aria-label", t("edit.defaultsTitle"));
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
  pad.appendChild(defaults);
  pad.appendChild(flow);
  pad.appendChild(events);
  host.appendChild(pad);
  editorPlaceExerciseExtras();
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
  bars = editorReadBars();
  editorWriteBars(bars);
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
  var bars = editorReadBars();
  editorWriteBars(bars);
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
  var shareDefaults = editorPartDefaults();
  var snap = typeof shareSnapshot === "function"
    ? shareSnapshot({
        id: shareId,
        name: editorNameValue(),
        bars: bars,
        staff: editorStaffOn(),
        lines: lines,
        clef: shareDefaults.clef,
        key: shareDefaults.key,
        meter: shareDefaults.meter
      })
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
  function editorPadButtonRepeatable(button) {
    var eventName;
    if (!button) {
      return false;
    }
    if (button.hasAttribute("data-note")) {
      return true;
    }
    eventName = button.getAttribute("data-event");
    return eventName === "slash" || eventName === "rest";
  }

  function editorStartHoldRepeat(host, pointerId, action) {
    try {
      host.setPointerCapture(pointerId);
    } catch (errCap) {}
    editorStopHoldRepeat();
    editorHoldUndoPushed = false;
    editorHoldRepeatAction = action;
    if (typeof action === "function") {
      editorPushSymbolUndo();
      editorHoldUndoPushed = true;
      action({ skipUndo: true });
    }
    editorHoldRepeatDelay = window.setTimeout(function () {
      editorHoldRepeatDelay = null;
      editorHoldRepeatTimer = window.setInterval(function () {
        if (typeof editorHoldRepeatAction !== "function") {
          editorStopHoldRepeat();
          return;
        }
        if (!editorHoldUndoPushed) {
          editorPushSymbolUndo();
          editorHoldUndoPushed = true;
        }
        editorHoldRepeatAction({ skipUndo: true });
      }, 90);
    }, 400);
  }

  function editorBindPadPointer(host) {
    if (!host) {
      return;
    }
    function stopHold() {
      editorStopHoldRepeat();
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
      if (editorPadButtonRepeatable(button)) {
        editorStartHoldRepeat(host, event.pointerId, function (opts) {
          editorActivateSymbol(button, opts);
        });
        return;
      }
      editorActivateSymbol(button);
    });
    host.addEventListener("pointerup", stopHold);
    host.addEventListener("pointercancel", stopHold);
    host.addEventListener("lostpointercapture", stopHold);
  }
  function editorBindHistoryPointer(host) {
    if (!host) {
      return;
    }
    function stopHold() {
      editorStopHoldRepeat();
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
        if (!editorCanErase()) {
          return;
        }
        editorStartHoldRepeat(host, event.pointerId, function (opts) {
          if (!editorCanErase()) {
            editorStopHoldRepeat();
            return;
          }
          editorEraseStep(opts);
        });
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
      return;
    }
    /* Pad mode: Left/Right step by drawn column (same grain as Erase). */
    if (
      editorStaffOn() &&
      editorSymbolsIsOpen() &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight" || key === "arrowleft" || key === "arrowright")
    ) {
      active = document.activeElement;
      if (
        active &&
        (active.id === "editFocusLine" || active.id === "allEdit") &&
        active.getAttribute("inputmode") !== "none"
      ) {
        return;
      }
      if (editorStaffMoveCaret(event.key === "ArrowLeft" || key === "arrowleft" ? -1 : 1)) {
        event.preventDefault();
      }
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
      editorAnalyticsMark("used_paste");
      editorKeyboardStaffEdit = true;
      try {
        insertEditorText(cleaned);
      } finally {
        editorKeyboardStaffEdit = false;
      }
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
    editorAnalyticsMark("used_paste");
    editorKeyboardStaffEdit = true;
    try {
      insertEditorText(cleaned);
    } finally {
      editorKeyboardStaffEdit = false;
    }
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
  var editBarsDown = document.getElementById("editBarsDown");
  var editBarsUp = document.getElementById("editBarsUp");
  if (editBarsDown) {
    editBarsDown.addEventListener("click", function () {
      editorNudgeBars(-1);
    });
  }
  if (editBarsUp) {
    editBarsUp.addEventListener("click", function () {
      editorNudgeBars(1);
    });
  }
  ["editKindText", "editKindStaff"].forEach(function (id) {
    var button = document.getElementById(id);
    if (!button) {
      return;
    }
    button.addEventListener("click", function () {
      var wantStaff = id === "editKindStaff";
      var wasStaff = editorStaffOn();
      if (wantStaff === wasStaff) {
        return;
      }
      setEditorStaff(wantStaff);
      if (typeof track === "function") {
        track("edit_kind", {
          kind: wantStaff ? "staff" : "text",
          mode: editorIsCreateMode() ? "create" : "edit"
        });
      }
      disarmEditorDelete();
      clearEditorNotice();
      refreshEditor();
    });
  });
  var editMeter = document.getElementById("editMeter");
  if (editMeter) {
    editMeter.addEventListener("change", function () {
      editorMarkDefaultsUsed();
      disarmEditorDelete();
      clearEditorNotice();
      refreshEditor();
    });
  }
  var editKey = document.getElementById("editKey");
  if (editKey) {
    editKey.addEventListener("change", function () {
      editorMarkDefaultsUsed();
      editorSyncStaffDefaults();
      disarmEditorDelete();
      clearEditorNotice();
      refreshEditor();
    });
  }
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
