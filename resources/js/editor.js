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
  dots: 0,
  oct: null
};

/* Armed tuplet N for the pad: 3, 5, 7, or 4 (combo menu). */
var editorTupletN = 3;
var EDITOR_TUPLET_CYCLE = [3, 5, 7, 4];
var editorTupletMenuOpen = false;
var editorTransposeOpen = false;
var editorMoveMenuOpen = false;
/* Armed interval for the Write notes stepper, in semitones. 12 is an octave. */
var editorMoveSemis = 12;

var editorNotePadStamp = "";
var editorIconCache = {};
var editorSymbolUndo = [];
var editorSymbolRedo = [];
var EDITOR_SYMBOL_HISTORY = 50;
/* Snapshot armed before a settings control changes (select/name); committed on first change. */
var editorControlUndoSnap = null;
var editorNameUndoArmed = false;
/* Last keyboard/pad state that drew a valid staff; used for typing undo. */
var editorLastValidSnap = null;
/* Preview HTML of that valid draw — undo steps only when this changes, not for spaces-only edits. */
var editorLastValidRenderKey = null;
var editorStaffTypingDirty = false;
/* True only while handling a real field input/paste (not pad / selection refresh). */
var editorKeyboardStaffEdit = false;
/* While Symbols/Notes is open, keep caret here and avoid focusing the field (no soft keyboard). */
var editorPadCaret = null;
/* Staff preview drag-to-select: pointerId + start insert gap until pointerup. */
var editorStaffDrag = null;
var EDITOR_STAFF_DRAG_SLOP = 6;
/* Finger this close to the preview's left or right edge scrolls the staff while selecting. */
var EDITOR_STAFF_EDGE_ZONE = 36;
var editorStaffEdgeScrollTimer = null;
var editorStaffScrollBar = null;
var editorStaffScrollDrag = null;
var editorStaffScrollBarFrame = 0;
/* Last caret the preview scrolled into view, and the one waiting to be scrolled in. */
var editorStaffRevealKey = "";
var editorStaffRevealPending = "";
var editorStaffRevealFrame = 0;
var editorStaffRevealTries = 0;
/* Music stored by Copy. Paste inserts it at the caret. */
var editorStaffCopy = "";
var editorStaffClipMenuOpen = false;
/* Long-press on the staff opens Copy and Paste. A sideways drag cancels it. */
var EDITOR_STAFF_CLIP_HOLD = 500;
var editorStaffClipHold = null;
var editorStaffClipHoldX = 0;
var editorStaffClipHoldY = 0;
/* Ctrl/Cmd+V already inserted editorStaffCopy; swallow the follow-up paste event. */
var editorStaffKeyPaste = false;
/* After Chord ^, allow typing the name until the next pad action. */
var editorLabelTyping = false;
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
  "^t=100 / / / /",
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
  if (tag === "span" && String(node.getAttribute("class") || "") === "tempo") {
    return "^t=" + (node.textContent || "");
  }
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
    var tempo = "";
    if (!mode) {
      return;
    }
    if (mode === "^" && typeof staffTempoLabel === "function") {
      tempo = staffTempoLabel(buf);
    }
    if (tempo) {
      out += '<span class="tempo">' + escapeEditorHtml(tempo) + "</span>";
    } else {
      var tag = mode === "^" ? "sup" : "sub";
      out += "<" + tag + "><small>" + escapeEditorHtml(buf) + "</small></" + tag + ">";
    }
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
  var before = editorReadBars();
  var next = clampEditorBars(before + (delta || 0));
  if (next === before) {
    return;
  }
  editorPushSymbolUndo();
  editorWriteBars(next);
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
  editorSyncAddCombo();
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
  if (editorCloseMoveMenu()) {
    return;
  }
  if (editorCloseTransposeMenu()) {
    return;
  }
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
  editorLabelTyping = false;
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
    editorSyncTokenHighlight();
    return;
  }
  field.focus();
  try {
    field.setSelectionRange(start, end);
  } catch (errFocusCaret) {}
  field.classList.remove("has-token-highlight");
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
  if (editorLabelTyping) {
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

/* Let the musician type ^chord / _label text while Notes stays open. */
function editorAllowLabelTyping() {
  var field = editorActiveField();
  var caret;
  editorLabelTyping = true;
  editorSetPadInputMode(false);
  if (!field) {
    return;
  }
  caret = editorPadCaret ? editorPadCaret.start : editorReadSelection(field).start;
  try {
    field.focus();
    field.setSelectionRange(caret, caret);
  } catch (errLabel) {}
  editorStatus(t("edit.chordTypeHint"));
}

function editorEndLabelTyping() {
  var field;
  if (!editorLabelTyping) {
    return;
  }
  editorLabelTyping = false;
  if (editorSymbolsIsOpen()) {
    editorCapturePadCaret();
    editorSetPadInputMode(true);
    field = editorActiveField();
    if (field && document.activeElement === field) {
      field.blur();
    }
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
  editorCloseMoveMenu();
  editorCloseTransposeMenu();
  editorCloseMore();
  editorCloseSymbols();
  editorStaffCloseClipMenu();
  editorStaffPreviewClearClipHold();
  editorStaffPreviewStopEdgeScroll();
  editorStaffDrag = null;
  editorStaffRevealKey = "";
  editorStaffRevealPending = "";
  editorStaffRevealTries = 0;
  if (editorStaffRevealFrame) {
    window.cancelAnimationFrame(editorStaffRevealFrame);
    editorStaffRevealFrame = 0;
  }
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
  editorCloseMoveMenu();
  editorCloseTransposeMenu();
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
  editorCloseMoveMenu();
  editorCloseTransposeMenu();
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
  if (editorResetIntervalUnlessSelected()) {
    editorNotePadStamp = "";
    editorPaintNotePad();
  }
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
    editorStaffPreviewScheduleScrollBar();
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
    editorPaintStaffPendingCue(preview, status && status.error);
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
  editorStaffPreviewScheduleScrollBar();
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

function editorPaintStaffPendingCue(preview, why) {
  var cue;
  var msg;
  var text;
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
  why = String(why || "").replace(/^\s+|\s+$/g, "");
  if (why && why.length < 80) {
    text = t("edit.staffPendingWhy").replace("{why}", why);
  } else {
    text = t("edit.staffPending");
  }
  msg.textContent = text;
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
  editorUpdateStaffCaretMark();
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
  /* Strip beam braces and a tuplet closer glued on the last note: E4e) / E4e}). */
  var inner = String(tok || "")
    .replace(/^\{/, "")
    .replace(/[})]+$/, "");
  if (!inner || inner === "~") {
    return false;
  }
  if (typeof staffParsePitchToken === "function" && staffParsePitchToken(inner)) {
    return true;
  }
  if (typeof staffParseRestToken === "function" && staffParseRestToken(inner)) {
    return true;
  }
  if (typeof staffParseSlashToken === "function" && staffParseSlashToken(inner, "treble")) {
    return true;
  }
  return false;
}

/* Tuplet opener or a lone ratio token — not a drawn note column. */
function editorStaffTupletOpenerTok(tok) {
  return /^\((\d{1,2})(?::(\d{1,2}))?$/.test(String(tok || "")) ||
    /^\d{1,2}(:\d{1,2})?$/.test(String(tok || ""));
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

  function tokenClosesBeamOrTuplet(tok) {
    return (
      String(tok || "").indexOf("}") >= 0 ||
      (typeof staffTokenClosesTuplet === "function" && staffTokenClosesTuplet(tok))
    );
  }

  function consumeBeam() {
    skipNoise();
    if (i >= ranges.length || ranges[i].tok.indexOf("{") < 0) {
      return;
    }
    while (i < ranges.length) {
      t = ranges[i].tok;
      /* Stack inside a beam is one drawn column (same as staff.js). */
      if (t.charAt(0) === "[" || (t.charAt(0) === "{" && t.charAt(1) === "[")) {
        consumeStack();
        if (i > 0 && tokenClosesBeamOrTuplet(ranges[i - 1].tok)) {
          break;
        }
        continue;
      }
      if (editorStaffBeamInnerNote(t)) {
        starts.push(ranges[i].start + (t.charAt(0) === "{" ? 1 : 0));
      }
      i += 1;
      /* Beam may close with } or a tuplet-glued } on the last note — also }) forms. */
      if (tokenClosesBeamOrTuplet(t)) {
        break;
      }
    }
  }

  function consumeStack() {
    skipNoise();
    if (i >= ranges.length) {
      return;
    }
    t = ranges[i].tok;
    /* Allow {[E4e… when the beam opener is glued to the stack. */
    if (t.charAt(0) === "{") {
      if (t.charAt(1) !== "[") {
        return;
      }
      openStart = ranges[i].start + 1;
    } else if (t.charAt(0) === "[") {
      openStart = ranges[i].start;
    } else {
      return;
    }
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
    /* Skip (3 / (5:4 — the number is not a drawn column. */
    i += 1;
    while (i < ranges.length) {
      t = ranges[i].tok;
      if (t === ")") {
        i += 1;
        break;
      }
      if (typeof staffTokenClosesTuplet === "function" && staffTokenClosesTuplet(t)) {
        /* Glued close: E4e) still counts as a note column. */
        if (editorStaffBeamInnerNote(t) || (t.length > 1 && !editorStaffTupletOpenerTok(t))) {
          starts.push(ranges[i].start);
        }
        i += 1;
        break;
      }
      if (editorStaffCaretNoiseTok(t) || editorStaffTupletOpenerTok(t)) {
        i += 1;
        continue;
      }
      if (t.indexOf("{") >= 0) {
        consumeBeam();
        /* Beam token may glue }) — do not keep scanning as if still inside (N. */
        if (i > 0 && typeof staffTokenClosesTuplet === "function" && staffTokenClosesTuplet(ranges[i - 1].tok)) {
          break;
        }
        continue;
      }
      if (t.charAt(0) === "[") {
        consumeStack();
        if (i > 0 && typeof staffTokenClosesTuplet === "function" && staffTokenClosesTuplet(ranges[i - 1].tok)) {
          break;
        }
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

/* Music-string caret stops for pad Left/Right (column edges + end). */
function editorStaffCaretStops(music) {
  var raw = String(music || "");
  var starts = editorStaffColumnStarts(raw);
  var stops = [];
  var i;
  if (!starts.length) {
    stops.push(0);
    if (raw.length > 0) {
      stops.push(raw.length);
    }
    return stops;
  }
  /*
   * Skip a structural prefix ((3, {, [) — the tuplet number is not a note
   * column, so arrows should not park on it.
   */
  stops.push(starts[0] > 0 ? starts[0] : 0);
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

/* Inverse of editorStaffCaretX: nearest insert index (ties keep the left slot). */
function editorStaffInsertIndexFromX(layout, x) {
  var n;
  var best = 0;
  var bestDist = Infinity;
  var i;
  var ix;
  var d;
  if (!layout || typeof x !== "number" || isNaN(x)) {
    return 0;
  }
  n = (layout.cols || []).length;
  for (i = 0; i <= n; i++) {
    ix = editorStaffCaretX(layout, i);
    if (ix === null || isNaN(ix)) {
      continue;
    }
    d = Math.abs(ix - x);
    /* Fractional column weights can make a later gap a hair closer. Keep the left slot unless it is clearly nearer. */
    if (d + 0.75 < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/* Nearest drawn column center — used while drag-selecting across the staff. */
function editorStaffColumnIndexFromX(layout, x) {
  var cols;
  var best = 0;
  var bestDist = Infinity;
  var i;
  var d;
  if (!layout || typeof x !== "number" || isNaN(x)) {
    return 0;
  }
  cols = layout.cols || [];
  if (!cols.length) {
    return 0;
  }
  for (i = 0; i < cols.length; i++) {
    d = Math.abs(cols[i].x - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/* End of the drawn column's token (stack through ]), no trailing space. */
function editorMusicColumnContentEnd(music, colStart) {
  var ranges = editorMusicTokenRanges(music);
  var i;
  var t;
  var end = colStart;
  for (i = 0; i < ranges.length; i++) {
    t = String(ranges[i].tok || "");
    if (ranges[i].start === colStart || (ranges[i].start < colStart && ranges[i].end > colStart)) {
      if (t.charAt(0) === "[" && ranges[i].start === colStart) {
        while (i < ranges.length) {
          end = ranges[i].end;
          if (String(ranges[i].tok || "").indexOf("]") >= 0) {
            return end;
          }
          i += 1;
        }
        return end;
      }
      return ranges[i].end;
    }
  }
  return colStart;
}

/*
 * Music-string caret for a drawn insert index.
 * Gaps park after the left column so Erase hits that symbol. When the gap is
 * only spaces / } ] ), park after those closers (e.g. after a tuplet before
 * the next beam). An opener ( { [ in the gap keeps the caret after the left
 * token, before the space.
 */
function editorMusicCaretFromInsertIndex(music, insertIndex) {
  var raw = String(music || "");
  var starts = editorStaffColumnStarts(raw);
  var prevEnd;
  var next;
  var gapEnd;
  var gap;
  var pos;
  if (!starts.length) {
    return insertIndex <= 0 ? 0 : raw.length;
  }
  if (insertIndex <= 0) {
    return starts[0];
  }
  if (insertIndex >= starts.length) {
    return raw.length;
  }
  prevEnd = editorMusicColumnContentEnd(raw, starts[insertIndex - 1]);
  next = starts[insertIndex];
  gapEnd = next;
  /* Next column may sit inside {Note / [stack — that wrapper is not gap content. */
  while (
    gapEnd > prevEnd &&
    (raw.charAt(gapEnd - 1) === "{" || raw.charAt(gapEnd - 1) === "[")
  ) {
    gapEnd -= 1;
  }
  gap = raw.slice(prevEnd, gapEnd);
  if (/^[\s}\])]*$/.test(gap)) {
    pos = gapEnd;
    while (pos > prevEnd && /\s/.test(raw.charAt(pos - 1))) {
      pos -= 1;
    }
    return pos;
  }
  return prevEnd;
}

/* Pitch / slash / rest only — not `{` `}` `(` `)` `|` shells. */
function editorTokenIsHighlightable(current) {
  var token;
  var kind;
  if (!current || current.start >= current.end) {
    return false;
  }
  kind = current.kind || (current.hit && current.hit.kind) || "";
  if (kind === "pitch" || kind === "slash" || kind === "rest") {
    return true;
  }
  token = String(current.token || "");
  if (/^[A-G](?:#|b|n)?\d/.test(token)) {
    return true;
  }
  if (/^\/[whqes]?\.?$/.test(token) || /^r[whqes]?\.?$/i.test(token)) {
    return true;
  }
  return false;
}

/*
 * Highlight the current note/rest token in the example field while Notes is
 * open (field blurred). Pad caret stays the insertion point for logic.
 */
function editorSyncTokenHighlight() {
  var field = editorActiveField();
  var current;
  var pad;
  if (!field) {
    return;
  }
  if (!editorStaffOn() || !editorSymbolsIsOpen() || editorLabelTyping) {
    field.classList.remove("has-token-highlight");
    return;
  }
  if (document.activeElement === field) {
    field.classList.remove("has-token-highlight");
    return;
  }
  pad = editorPadCaret;
  if (!pad) {
    field.classList.remove("has-token-highlight");
    return;
  }
  current = editorCurrentEventAtCaret();
  if (editorTokenIsHighlightable(current)) {
    try {
      field.setSelectionRange(current.start, current.end);
    } catch (errTok) {}
    field.classList.add("has-token-highlight");
    return;
  }
  try {
    field.setSelectionRange(pad.start, pad.end);
  } catch (errPad) {}
  field.classList.remove("has-token-highlight");
}

/* Map a preview pointer event to insert-gap index + music field anchors. */
function editorStaffPreviewHitContext(event) {
  var preview = document.getElementById("editPreview");
  var svg;
  var layout;
  var pt;
  var ctm;
  var local;
  var span;
  var line;
  var mapped;
  var musicAt;
  if (!event || !preview || !editorIsOpen() || !editorStaffOn()) {
    return null;
  }
  if (!preview.classList.contains("is-staff")) {
    return null;
  }
  svg = preview.querySelector("svg.music-staff");
  layout = preview._staffCaretLayout || (svg && svg._staffCaretLayout) || null;
  if (!svg || !layout) {
    return null;
  }
  if (typeof svg.createSVGPoint !== "function" || typeof svg.getScreenCTM !== "function") {
    return null;
  }
  ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  local = pt.matrixTransform(ctm.inverse());
  span = editorLineSpan();
  if (!span || !span.field) {
    return null;
  }
  line = itemToLine(span.value.slice(span.lineStart, span.lineEnd));
  mapped = editorMusicCaretInLine(line, span.caret - span.lineStart);
  musicAt = String(line || "").indexOf(mapped.music);
  if (musicAt < 0) {
    musicAt = 0;
  }
  return {
    preview: preview,
    svg: svg,
    layout: layout,
    field: span.field,
    lineStart: span.lineStart,
    music: mapped.music || "",
    musicAt: musicAt,
    insertIndex: editorStaffInsertIndexFromX(layout, local.x),
    columnIndex: editorStaffColumnIndexFromX(layout, local.x),
    localX: local.x
  };
}

function editorStaffPreviewBeginEdit() {
  if (editorLabelTyping) {
    editorEndLabelTyping();
  }
  if (!editorSymbolsIsOpen()) {
    editorOpenSymbols();
  }
  if (!editorPadCaret) {
    editorCapturePadCaret();
  }
}

/* Collapsed pad caret at a drawn insert gap (tap). */
function editorStaffPreviewApplyCaret(field, lineStart, musicAt, music, insertIndex) {
  var a;
  if (!field) {
    return;
  }
  a = lineStart + musicAt + editorMusicCaretFromInsertIndex(String(music || ""), insertIndex);
  editorPlaceCaret(field, a, a, true);
}

/* Select every drawn column from colA through colB (inclusive). */
function editorStaffPreviewApplyColumnRange(field, lineStart, musicAt, music, colA, colB) {
  var lo;
  var hi;
  var starts;
  var from;
  var to;
  var a;
  var b;
  if (!field) {
    return;
  }
  music = String(music || "");
  starts = editorStaffColumnStarts(music);
  if (!starts.length) {
    editorStaffPreviewApplyCaret(field, lineStart, musicAt, music, 0);
    return;
  }
  lo = Math.min(colA, colB);
  hi = Math.max(colA, colB);
  if (lo < 0) {
    lo = 0;
  }
  if (hi >= starts.length) {
    hi = starts.length - 1;
  }
  if (lo > hi) {
    editorStaffPreviewApplyCaret(field, lineStart, musicAt, music, 0);
    return;
  }
  from = starts[lo];
  to = editorMusicColumnContentEnd(music, starts[hi]);
  if (to < from) {
    to = from;
  }
  a = lineStart + musicAt + from;
  b = lineStart + musicAt + to;
  editorPlaceCaret(field, a, b, true);
}

/*
 * A drag that covers every column of a beam, chord, or tuplet copies the shell
 * with it. The drawn range starts inside { and (, so pull those openers in.
 */
function editorStaffExpandCopySpan(line, start, end) {
  var groups;
  var starts;
  var guard = 0;
  var grew;
  var i;
  var g;
  var col;
  var first;
  var last;
  var lastEnd;
  line = String(line || "");
  groups = editorFindBalancedGroups(line);
  starts = editorStaffColumnStarts(line);
  if (!groups.length || !starts.length) {
    return { start: start, end: end };
  }
  do {
    grew = false;
    guard += 1;
    for (i = 0; i < groups.length; i++) {
      g = groups[i];
      first = -1;
      last = -1;
      for (col = 0; col < starts.length; col++) {
        if (starts[col] >= g.open && starts[col] < g.closeEnd) {
          if (first < 0) {
            first = starts[col];
          }
          last = starts[col];
        }
      }
      if (first < 0) {
        continue;
      }
      lastEnd = editorMusicColumnContentEnd(line, last);
      if (start <= first && end >= lastEnd) {
        if (start > g.open) {
          start = g.open;
          grew = true;
        }
        if (end < g.closeEnd) {
          end = g.closeEnd;
          grew = true;
        }
      }
    }
  } while (grew && guard < 8);
  return { start: start, end: end };
}

/* Music text of the current same-line selection, shell included when it is whole. */
function editorStaffSelectionText(field) {
  var sel;
  var start;
  var end;
  var value;
  var span;
  var text;
  if (!field) {
    return "";
  }
  sel = editorReadSelection(field);
  start = sel.start < sel.end ? sel.start : sel.end;
  end = sel.start < sel.end ? sel.end : sel.start;
  if (start === end) {
    return "";
  }
  value = String(field.value || "");
  if (value.slice(start, end).indexOf("\n") >= 0) {
    return "";
  }
  if (editorStaffOn()) {
    text = editorCopySelection(value, value.lastIndexOf("\n", start - 1) + 1, start, end);
    if (text != null) {
      return text;
    }
  }
  span = editorStaffExpandCopySpan(value, start, end);
  text = value.slice(span.start, span.end);
  if (!text || text.indexOf("\n") >= 0) {
    return "";
  }
  return text;
}

function editorStaffTakeCopy(field) {
  var text = editorStaffSelectionText(field);
  if (!text) {
    return false;
  }
  editorStaffCopy = text;
  return true;
}

function editorStaffWriteClipboard(text) {
  var pending;
  if (!text || !navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    return;
  }
  try {
    pending = navigator.clipboard.writeText(text);
    if (pending && typeof pending.then === "function") {
      pending.then(function () {}, function () {});
    }
  } catch (errClip) {}
}

function editorStaffCloseClipMenu() {
  var menu = document.getElementById("editClipMenu");
  editorStaffClipMenuOpen = false;
  if (menu && menu.parentNode) {
    menu.parentNode.removeChild(menu);
  }
}

/* Copy and Paste at the pointer: right-click, or a finger held on the staff. */
function editorStaffOpenClipMenu(clientX, clientY) {
  var menu;
  var copyBtn;
  var pasteBtn;
  var rect;
  var x;
  var y;
  editorStaffCloseClipMenu();
  editorStaffClipMenuOpen = true;
  menu = document.createElement("div");
  menu.id = "editClipMenu";
  menu.className = "edit-clip-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", t("edit.clipMenu"));
  copyBtn = editorPadButton(menu, { "data-clip-copy": "1" }, t("edit.copy"), t("edit.copy"));
  pasteBtn = editorPadButton(menu, { "data-clip-paste": "1" }, t("edit.paste"), t("edit.paste"));
  copyBtn.setAttribute("role", "menuitem");
  pasteBtn.setAttribute("role", "menuitem");
  copyBtn.disabled = !editorStaffSelectionText(editorActiveField());
  pasteBtn.disabled = !editorStaffCopy;
  document.body.appendChild(menu);
  rect = menu.getBoundingClientRect();
  x = clientX;
  y = clientY;
  if (x + rect.width > window.innerWidth - 8) {
    x = window.innerWidth - rect.width - 8;
  }
  if (y + rect.height > window.innerHeight - 8) {
    y = window.innerHeight - rect.height - 8;
  }
  if (x < 8) {
    x = 8;
  }
  if (y < 8) {
    y = 8;
  }
  menu.style.left = x + "px";
  menu.style.top = y + "px";
  menu.addEventListener("pointerdown", function (event) {
    var button = event.target && event.target.closest ? event.target.closest("button") : null;
    event.preventDefault();
    event.stopPropagation();
    if (!button || button.disabled) {
      return;
    }
    if (button.hasAttribute("data-clip-copy")) {
      editorStaffCopyFromSelection();
    } else if (button.hasAttribute("data-clip-paste")) {
      editorStaffPasteCopy();
    }
  });
}

/* Copy the current column selection into the menu buffer. */
function editorStaffCopyFromSelection() {
  if (!editorStaffTakeCopy(editorActiveField())) {
    return false;
  }
  editorStaffWriteClipboard(editorStaffCopy);
  editorStaffCloseClipMenu();
  return true;
}

/* Insert the preview copy at the caret. One undo step. */
function editorStaffPasteCopy() {
  var field;
  var padded;
  var sel;
  if (!editorStaffCopy) {
    return false;
  }
  field = editorActiveField();
  if (!field) {
    return false;
  }
  editorStaffCloseClipMenu();
  if (editorStaffOn()) {
    sel = editorReadSelection(field);
    if (sel.start !== sel.end) {
      if (editorPasteOverSelection(editorStaffCopy)) {
        editorAnalyticsMark("used_paste");
        editorBeginPadInput();
        return true;
      }
    } else if (editorPasteAtCaret(editorStaffCopy)) {
      editorAnalyticsMark("used_paste");
      editorBeginPadInput();
      return true;
    }
  }
  editorPushSymbolUndo();
  padded = editorPadSymbolGaps(editorStaffCopy, 0);
  editorAnalyticsMark("used_paste");
  insertEditorText(padded.text, padded.caretBack);
  editorBeginPadInput();
  editorPaintNotePad();
  editorSyncTokenHighlight();
  return true;
}

function editorStaffSwallowKeyPaste(event) {
  if (!editorStaffKeyPaste) {
    return false;
  }
  editorStaffKeyPaste = false;
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  return true;
}

function editorStaffCopyKeysApply() {
  var active;
  var tag;
  if (!editorIsOpen() || editorLabelTyping) {
    return false;
  }
  active = document.activeElement;
  if (!active || active.id === "editFocusLine" || active.id === "allEdit") {
    return true;
  }
  tag = active.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable) {
    return false;
  }
  return true;
}

function editorStaffPreviewStopEdgeScroll() {
  if (!editorStaffEdgeScrollTimer) {
    return;
  }
  window.clearInterval(editorStaffEdgeScrollTimer);
  editorStaffEdgeScrollTimer = null;
}

function editorStaffPreviewApplyFromClient(drag, clientX, clientY) {
  var hit;
  var col;
  if (!drag) {
    return;
  }
  hit = editorStaffPreviewHitContext({ clientX: clientX, clientY: clientY });
  col = hit ? hit.columnIndex : drag.startColumn;
  if (hit) {
    drag.music = hit.music;
    drag.musicAt = hit.musicAt;
    drag.lineStart = hit.lineStart;
    drag.field = hit.field;
  }
  editorStaffPreviewApplyColumnRange(
    drag.field,
    drag.lineStart,
    drag.musicAt,
    drag.music,
    drag.startColumn,
    col
  );
  editorPaintNotePad();
}

/* Scroll the staff when the finger is in the left or right edge, then extend the selection. */
function editorStaffPreviewEdgeScroll() {
  var drag = editorStaffDrag;
  var preview;
  var rect;
  var into;
  var step;
  var before;
  if (!drag || !drag.dragging) {
    editorStaffPreviewStopEdgeScroll();
    return false;
  }
  preview = document.getElementById("editPreview");
  if (!preview) {
    return false;
  }
  rect = preview.getBoundingClientRect();
  if (drag.lastX < rect.left + EDITOR_STAFF_EDGE_ZONE) {
    into = rect.left + EDITOR_STAFF_EDGE_ZONE - drag.lastX;
    step = -Math.round(Math.min(18, 4 + into / 4));
  } else if (drag.lastX > rect.right - EDITOR_STAFF_EDGE_ZONE) {
    into = drag.lastX - (rect.right - EDITOR_STAFF_EDGE_ZONE);
    step = Math.round(Math.min(18, 4 + into / 4));
  } else {
    return false;
  }
  before = preview.scrollLeft;
  preview.scrollLeft = before + step;
  if (preview.scrollLeft === before) {
    return false;
  }
  editorStaffPreviewApplyFromClient(drag, drag.lastX, drag.lastY);
  return true;
}

function editorStaffPreviewEnsureEdgeScroll() {
  if (editorStaffEdgeScrollTimer) {
    return;
  }
  editorStaffEdgeScrollTimer = window.setInterval(editorStaffPreviewEdgeScroll, 32);
}

function editorStaffPreviewCapture(preview, pointerId) {
  if (!preview || pointerId == null || typeof preview.setPointerCapture !== "function") {
    return;
  }
  try {
    preview.setPointerCapture(pointerId);
  } catch (errCap) {}
}

function editorStaffPreviewClearClipHold() {
  if (!editorStaffClipHold) {
    return;
  }
  window.clearTimeout(editorStaffClipHold);
  editorStaffClipHold = null;
}

function editorStaffPreviewHoldClipAt(x, y) {
  editorStaffPreviewClearClipHold();
  editorStaffPreviewStopEdgeScroll();
  editorStaffDrag = null;
  editorStaffOpenClipMenu(x, y);
}

function editorStaffPreviewArmClipHold(event) {
  editorStaffPreviewClearClipHold();
  editorStaffClipHoldX = event.clientX;
  editorStaffClipHoldY = event.clientY;
  editorStaffClipHold = window.setTimeout(function () {
    editorStaffPreviewHoldClipAt(editorStaffClipHoldX, editorStaffClipHoldY);
  }, EDITOR_STAFF_CLIP_HOLD);
}

function editorStaffPreviewContextMenu(event) {
  var preview;
  if (!event || !editorIsOpen() || !editorStaffOn()) {
    return;
  }
  preview = document.getElementById("editPreview");
  if (!preview || !preview.classList.contains("is-staff")) {
    return;
  }
  event.preventDefault();
  editorStaffPreviewClearClipHold();
  editorStaffPreviewStopEdgeScroll();
  editorStaffDrag = null;
  editorStaffOpenClipMenu(event.clientX, event.clientY);
}

function editorStaffPreviewViewWidth(preview) {
  var style;
  var padL;
  var padR;
  var view;
  style = window.getComputedStyle(preview);
  padL = parseFloat(style.paddingLeft) || 0;
  padR = parseFloat(style.paddingRight) || 0;
  view = preview.clientWidth - padL - padR;
  if (view < 1) {
    view = preview.clientWidth;
  }
  return view;
}

function editorStaffPreviewScheduleScrollBar() {
  if (editorStaffScrollBarFrame) {
    return;
  }
  editorStaffScrollBarFrame = window.requestAnimationFrame(function () {
    editorStaffScrollBarFrame = 0;
    editorStaffPreviewSyncScrollBar();
  });
}

function editorStaffPreviewContentEdges(preview) {
  var style = window.getComputedStyle(preview);
  var box = preview.getBoundingClientRect();
  var left = box.left + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.paddingLeft) || 0);
  var right = box.right - (parseFloat(style.borderRightWidth) || 0) - (parseFloat(style.paddingRight) || 0);
  return { left: left, right: right };
}

/* Room for the note head beside the insertion mark. layout.half is the head radius in px. */
function editorStaffCaretRevealPad(layout, viewW) {
  var half = layout && typeof layout.half === "number" && layout.half > 0 ? layout.half : 6;
  var pad = half * 2 + 8;
  if (pad < 20) {
    pad = 20;
  }
  if (viewW > 0 && pad > viewW / 2) {
    pad = Math.max(4, viewW / 2 - 2);
  }
  return pad;
}

function editorStaffPreviewFinishReveal() {
  if (editorStaffRevealPending) {
    editorStaffRevealKey = editorStaffRevealPending;
  }
  editorStaffRevealTries = 0;
}

function editorStaffPreviewScheduleRevealCaret() {
  if (!editorStaffRevealPending || editorStaffRevealPending === editorStaffRevealKey || editorStaffRevealFrame) {
    return;
  }
  editorStaffRevealFrame = window.requestAnimationFrame(function () {
    editorStaffRevealFrame = 0;
    editorStaffPreviewRevealCaret();
  });
}

/*
 * Scroll #editPreview so the insertion mark sits inside the visible staff.
 * A caret that is already on screen leaves scrollLeft alone. A thumb drag
 * or a selection drag is left alone until the next caret move.
 */
function editorStaffPreviewRevealCaret() {
  var preview;
  var mark;
  var edges;
  var markBox;
  var markX;
  var pad;
  var overflow;
  var before;
  var stillOut;
  if (!editorStaffRevealPending || editorStaffRevealPending === editorStaffRevealKey) {
    return;
  }
  if (editorStaffScrollDrag != null || editorStaffDrag) {
    return;
  }
  preview = document.getElementById("editPreview");
  if (!preview || !preview.classList.contains("is-staff")) {
    editorStaffPreviewFinishReveal();
    return;
  }
  if (preview.clientWidth < 8) {
    if (editorStaffRevealTries < 1) {
      editorStaffRevealTries = 1;
      editorStaffPreviewScheduleRevealCaret();
    } else {
      editorStaffPreviewFinishReveal();
    }
    return;
  }
  mark = preview.querySelector(".staff-caret-mark");
  if (!mark) {
    if (editorStaffRevealTries < 1) {
      editorStaffRevealTries = 1;
      editorStaffPreviewScheduleRevealCaret();
    } else {
      editorStaffPreviewFinishReveal();
    }
    return;
  }
  edges = editorStaffPreviewContentEdges(preview);
  markBox = mark.getBoundingClientRect();
  markX = (markBox.left + markBox.right) / 2;
  pad = editorStaffCaretRevealPad(preview._staffCaretLayout, edges.right - edges.left);
  overflow = 0;
  if (markX > edges.right - pad) {
    overflow = markX - (edges.right - pad);
  } else if (markX < edges.left + pad) {
    overflow = markX - (edges.left + pad);
  }
  if (overflow !== 0) {
    before = preview.scrollLeft;
    preview.scrollLeft = before + overflow;
    editorStaffPreviewSyncScrollBar();
    edges = editorStaffPreviewContentEdges(preview);
    markBox = mark.getBoundingClientRect();
    markX = (markBox.left + markBox.right) / 2;
    stillOut = markX > edges.right - pad + 1 || markX < edges.left + pad - 1;
    if (stillOut && editorStaffRevealTries < 1) {
      editorStaffRevealTries = 1;
      editorStaffPreviewScheduleRevealCaret();
      return;
    }
  }
  editorStaffPreviewFinishReveal();
}

/* Remember a moved caret and scroll it into view after layout. Same caret keeps the scroll. */
function editorStaffPreviewNoteCaret(insertIndex, x, musicLength) {
  var key = String(musicLength) + ":" + String(insertIndex) + ":" + String(Math.round(x));
  if (key === editorStaffRevealKey) {
    return;
  }
  if (key !== editorStaffRevealPending) {
    editorStaffRevealTries = 0;
    editorStaffRevealPending = key;
  }
  editorStaffPreviewScheduleRevealCaret();
}

/* A bar under the staff moves a line that is wider than the preview. Dragging the notes selects. */
function editorStaffPreviewSyncScrollBar() {
  var preview = document.getElementById("editPreview");
  var bar = editorStaffScrollBar;
  var thumb;
  var max;
  var view;
  var thumbW;
  var travel;
  var x;
  if (!preview) {
    return;
  }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "editPreviewScroll";
    bar.setAttribute("role", "scrollbar");
    bar.setAttribute("aria-orientation", "horizontal");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-label", t("edit.staffScroll"));
    thumb = document.createElement("div");
    thumb.id = "editPreviewScrollThumb";
    bar.appendChild(thumb);
    bar.addEventListener("pointerdown", editorStaffPreviewScrollPointerDown);
    bar.addEventListener("pointermove", editorStaffPreviewScrollPointerMove);
    bar.addEventListener("pointerup", editorStaffPreviewScrollPointerUp);
    bar.addEventListener("pointercancel", editorStaffPreviewScrollPointerUp);
    editorStaffScrollBar = bar;
  }
  thumb = bar.firstChild;
  if (!preview.classList.contains("is-staff")) {
    if (bar.parentNode) {
      bar.parentNode.removeChild(bar);
    }
    return;
  }
  max = preview.scrollWidth - preview.clientWidth;
  if (max <= 8) {
    bar.classList.remove("is-on");
    if (bar.parentNode) {
      bar.parentNode.removeChild(bar);
    }
    return;
  }
  if (bar.parentNode !== preview) {
    preview.appendChild(bar);
  }
  view = editorStaffPreviewViewWidth(preview);
  bar.style.width = view + "px";
  bar.classList.add("is-on");
  bar.setAttribute("aria-valuemax", String(Math.round(max)));
  bar.setAttribute("aria-valuenow", String(Math.round(preview.scrollLeft)));
  thumbW = Math.round(view * preview.clientWidth / preview.scrollWidth);
  if (thumbW < 44) {
    thumbW = 44;
  }
  if (thumbW > view) {
    thumbW = view;
  }
  thumb.style.width = thumbW + "px";
  travel = view - thumbW;
  x = travel > 0 ? Math.round(travel * preview.scrollLeft / max) : 0;
  thumb.style.transform = "translateX(" + x + "px)";
}

function editorStaffPreviewScrollToClient(clientX) {
  var preview = document.getElementById("editPreview");
  var bar = editorStaffScrollBar;
  var thumb;
  var rect;
  var travel;
  var max;
  var ratio;
  var x;
  if (!preview || !bar) {
    return;
  }
  thumb = bar.firstChild;
  rect = bar.getBoundingClientRect();
  max = preview.scrollWidth - preview.clientWidth;
  travel = rect.width - (thumb ? thumb.offsetWidth : 0);
  x = clientX - rect.left - (thumb ? thumb.offsetWidth / 2 : 0);
  ratio = travel <= 0 ? 0 : x / travel;
  if (ratio < 0) {
    ratio = 0;
  }
  if (ratio > 1) {
    ratio = 1;
  }
  preview.scrollLeft = ratio * max;
  editorStaffPreviewSyncScrollBar();
}

function editorStaffPreviewScrollPointerDown(event) {
  var bar;
  if (!event || (typeof event.button === "number" && event.button !== 0)) {
    return;
  }
  bar = editorStaffScrollBar;
  if (!bar) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  editorStaffPreviewClearClipHold();
  editorStaffPreviewStopEdgeScroll();
  editorStaffDrag = null;
  editorStaffScrollDrag = event.pointerId;
  if (typeof bar.setPointerCapture === "function") {
    try {
      bar.setPointerCapture(event.pointerId);
    } catch (errScrollCap) {}
  }
  editorStaffPreviewScrollToClient(event.clientX);
}

function editorStaffPreviewScrollPointerMove(event) {
  if (editorStaffScrollDrag == null || !event || event.pointerId !== editorStaffScrollDrag) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  editorStaffPreviewScrollToClient(event.clientX);
}

function editorStaffPreviewScrollPointerUp(event) {
  var bar;
  if (editorStaffScrollDrag == null || !event || event.pointerId !== editorStaffScrollDrag) {
    return;
  }
  editorStaffScrollDrag = null;
  bar = editorStaffScrollBar;
  if (bar && typeof bar.releasePointerCapture === "function" && event.pointerId != null) {
    try {
      if (bar.hasPointerCapture && bar.hasPointerCapture(event.pointerId)) {
        bar.releasePointerCapture(event.pointerId);
      }
    } catch (errScrollRel) {}
  }
}

function editorStaffPreviewPointerDown(event) {
  var hit;
  if (!event || (typeof event.button === "number" && event.button !== 0)) {
    return;
  }
  if (event.target && event.target.closest && event.target.closest("#editPreviewScroll")) {
    return;
  }
  hit = editorStaffPreviewHitContext(event);
  if (!hit) {
    return;
  }
  editorStaffPreviewArmClipHold(event);
  editorStaffDrag = {
    pointerId: event.pointerId,
    startInsert: hit.insertIndex,
    startColumn: hit.columnIndex,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    dragging: false,
    field: hit.field,
    lineStart: hit.lineStart,
    musicAt: hit.musicAt,
    music: hit.music
  };
}

function editorStaffPreviewPointerMove(event) {
  var drag = editorStaffDrag;
  var dx;
  var dy;
  var preview;
  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  dx = event.clientX - drag.startX;
  dy = event.clientY - drag.startY;
  if (!drag.dragging) {
    if (dx * dx + dy * dy < EDITOR_STAFF_DRAG_SLOP * EDITOR_STAFF_DRAG_SLOP) {
      return;
    }
    editorStaffPreviewClearClipHold();
    drag.dragging = true;
    editorStaffPreviewBeginEdit();
    preview = document.getElementById("editPreview");
    editorStaffPreviewCapture(preview, event.pointerId);
    editorStaffPreviewEnsureEdgeScroll();
  }
  editorStaffPreviewApplyFromClient(drag, event.clientX, event.clientY);
  editorStaffPreviewEdgeScroll();
  if (event.cancelable) {
    event.preventDefault();
  }
}

function editorStaffPreviewPointerUp(event) {
  var drag = editorStaffDrag;
  var hit;
  var col;
  var preview;
  editorStaffPreviewClearClipHold();
  if (!drag || (event.pointerId != null && event.pointerId !== drag.pointerId)) {
    return;
  }
  editorStaffPreviewStopEdgeScroll();
  editorStaffDrag = null;
  preview = document.getElementById("editPreview");
  if (preview && typeof preview.releasePointerCapture === "function" && drag.pointerId != null) {
    try {
      if (preview.hasPointerCapture && preview.hasPointerCapture(drag.pointerId)) {
        preview.releasePointerCapture(drag.pointerId);
      }
    } catch (errRel) {}
  }
  editorStaffPreviewBeginEdit();
  hit = editorStaffPreviewHitContext(event);
  if (hit) {
    drag.music = hit.music;
    drag.musicAt = hit.musicAt;
    drag.lineStart = hit.lineStart;
    drag.field = hit.field;
  }
  if (!drag.dragging) {
    editorStaffPreviewApplyCaret(
      drag.field,
      drag.lineStart,
      drag.musicAt,
      drag.music,
      hit ? hit.insertIndex : drag.startInsert
    );
  } else {
    col = hit ? hit.columnIndex : drag.startColumn;
    editorStaffPreviewApplyColumnRange(
      drag.field,
      drag.lineStart,
      drag.musicAt,
      drag.music,
      drag.startColumn,
      col
    );
  }
  editorBeginPadInput();
  editorPaintNotePad();
  editorSyncTokenHighlight();
  if (event.cancelable) {
    event.preventDefault();
  }
}

function editorStaffPreviewPointerCancel(event) {
  var preview;
  var drag = editorStaffDrag;
  if (!drag) {
    return;
  }
  if (event && event.pointerId != null && event.pointerId !== drag.pointerId) {
    return;
  }
  editorStaffPreviewClearClipHold();
  editorStaffPreviewStopEdgeScroll();
  editorStaffDrag = null;
  preview = document.getElementById("editPreview");
  if (preview && event && typeof preview.releasePointerCapture === "function" && event.pointerId != null) {
    try {
      if (preview.hasPointerCapture && preview.hasPointerCapture(event.pointerId)) {
        preview.releasePointerCapture(event.pointerId);
      }
    } catch (errCancel) {}
  }
}

/*
 * Field range Acc / Dur / Erase would affect: a same-line selection, else the
 * erase target (note / shell), else the current event under the caret.
 */
function editorStaffHighlightTargetRange() {
  var field = editorActiveField();
  var sel;
  var target;
  var current;
  var token;
  if (!field || !editorStaffOn()) {
    return null;
  }
  sel = editorReadSelection(field);
  if (sel.start !== sel.end) {
    return { start: sel.start, end: sel.end };
  }
  target = editorStaffEraseTarget();
  if (target && target.start < target.end && target.kind !== "char") {
    token = String(target.token || "");
    if (token !== "}" && token !== "]" && token !== ")") {
      return { start: target.start, end: target.end };
    }
  }
  current = editorCurrentEventAtCaret();
  if (editorTokenIsHighlightable(current)) {
    return { start: current.start, end: current.end };
  }
  return null;
}

/* Drawn column indexes whose tokens overlap a music-string [from, to). */
function editorStaffColumnsForMusicRange(music, from, to) {
  var starts;
  var out = [];
  var i;
  var cStart;
  var cEnd;
  music = String(music || "");
  if (!music || from >= to) {
    return out;
  }
  starts = editorStaffColumnStarts(music);
  for (i = 0; i < starts.length; i++) {
    cStart = starts[i];
    cEnd = editorMusicColumnContentEnd(music, cStart);
    if (cEnd <= cStart) {
      cEnd = cStart + 1;
    }
    if (cEnd > from && cStart < to) {
      out.push(i);
    }
  }
  return out;
}

function editorStaffHighlightColumnIndexes(span) {
  var range;
  var line;
  var mapped;
  var musicAt;
  var fromAbs;
  var toAbs;
  var from;
  var to;
  if (!span) {
    return [];
  }
  range = editorStaffHighlightTargetRange();
  if (!range) {
    return [];
  }
  fromAbs = Math.max(range.start, span.lineStart);
  toAbs = Math.min(range.end, span.lineEnd);
  if (fromAbs >= toAbs) {
    return [];
  }
  line = itemToLine(span.value.slice(span.lineStart, span.lineEnd));
  mapped = editorMusicCaretInLine(line, 0);
  if (!mapped.music) {
    return [];
  }
  musicAt = String(line || "").indexOf(mapped.music);
  if (musicAt < 0) {
    musicAt = 0;
  }
  from = fromAbs - span.lineStart - musicAt;
  to = toAbs - span.lineStart - musicAt;
  if (from < 0) {
    from = 0;
  }
  if (to < 0) {
    to = 0;
  }
  if (from > mapped.music.length) {
    from = mapped.music.length;
  }
  if (to > mapped.music.length) {
    to = mapped.music.length;
  }
  return editorStaffColumnsForMusicRange(mapped.music, from, to);
}

function editorClearStaffEventHighlight(svg) {
  var list;
  var i;
  if (!svg) {
    return;
  }
  list = svg.querySelectorAll(".staff-event-highlight");
  for (i = list.length - 1; i >= 0; i--) {
    if (list[i].parentNode) {
      list[i].parentNode.removeChild(list[i]);
    }
  }
}

/* Soft frame over the column(s) Acc / Dur / Erase would rewrite or remove. */
function editorPaintStaffEventHighlight(svg, layout, colIndexes) {
  var cols;
  var half;
  var first;
  var last;
  var rect;
  var mark;
  var x0;
  var width;
  editorClearStaffEventHighlight(svg);
  if (!svg || !layout || !colIndexes || !colIndexes.length) {
    return;
  }
  cols = layout.cols || [];
  if (!cols.length) {
    return;
  }
  first = colIndexes[0];
  last = colIndexes[colIndexes.length - 1];
  if (first < 0 || last >= cols.length || first > last) {
    return;
  }
  half = layout.half || 6;
  x0 = cols[first].x - half - 3;
  width = cols[last].x - cols[first].x + 2 * half + 6;
  if (width < half * 2) {
    width = half * 2;
  }
  rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("class", "staff-event-highlight");
  rect.setAttribute("x", String(x0));
  rect.setAttribute("y", String(layout.staffTop - 5));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(layout.staffBot - layout.staffTop + 10));
  rect.setAttribute("rx", "3");
  rect.setAttribute("ry", "3");
  rect.setAttribute("pointer-events", "none");
  mark = svg.querySelector(".staff-caret-mark");
  if (mark && mark.parentNode === svg) {
    svg.insertBefore(rect, mark);
  } else {
    svg.appendChild(rect);
  }
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
  editorClearStaffEventHighlight(svg);
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
  /* Keep the mark while pending so the musician can still see the caret. */
  if (!preview.classList.contains("is-staff")) {
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
    mark.setAttribute("stroke-width", "2");
    mark.setAttribute("stroke-linecap", "round");
    mark.setAttribute("pointer-events", "none");
    svg.appendChild(mark);
  }
  mark.setAttribute("x1", String(x));
  mark.setAttribute("x2", String(x));
  mark.setAttribute("y1", String(layout.staffTop - 3));
  mark.setAttribute("y2", String(layout.staffBot + 3));
  editorPaintStaffEventHighlight(svg, layout, editorStaffHighlightColumnIndexes(span));
  editorSyncTokenHighlight();
  editorStaffPreviewNoteCaret(insertIndex, x, mapped.music.length);
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
      if (parts.length > 1) {
        editorStatus(t("edit.pasteAdded").replace("{n}", String(parts.length)));
      }
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

function editorTextAfterCaret() {
  var field = document.getElementById(editorIsFocusMode() ? "editFocusLine" : "allEdit");
  var sel;
  if (!field) {
    return "";
  }
  sel = editorReadSelection(field);
  return String(field.value || "").slice(sel.end);
}

/*
 * Keep pad inserts as separate words. A pitch, slash, rest, bar, or shell glued
 * to the previous or next word is one token and fails. Affixes stay glued.
 * Trailing space bumps caretBack so a caret parked inside {} / [] / (N ) stays put.
 */
function editorPadSymbolGaps(text, caretBack) {
  var body = String(text || "");
  var before = editorTextBeforeCaret();
  var after = editorTextAfterCaret();
  var first = body.charAt(0);
  var prev = before ? before.charAt(before.length - 1) : "";
  var next = after ? after.charAt(0) : "";
  var back = caretBack > 0 ? caretBack : 0;
  var glueAffix =
    first === "'" ||
    first === ">" ||
    first === "-" ||
    first === "~" ||
    first === "^" ||
    first === "_";
  if (body && !/^\s/.test(body) && prev && !/\s/.test(prev) && !glueAffix) {
    body = " " + body;
  }
  if (
    body &&
    !/\s$/.test(body) &&
    next &&
    !/\s/.test(next) &&
    next !== "}" &&
    next !== "]" &&
    next !== ")" &&
    !glueAffix
  ) {
    body = body + " ";
    back = back + 1;
  }
  return { text: body, caretBack: back };
}

function editorInsertSymbol(text, caretBack) {
  var padded = editorPadSymbolGaps(text, caretBack);
  insertEditorText(padded.text, padded.caretBack);
}

function editorDurCode(dur) {
  if (dur === "w" || dur === "h" || dur === "e" || dur === "s") {
    return dur;
  }
  return "";
}

/* "", ".", or ".." from a pad flag and the token being rewritten. */
function editorDotMarks(dot, source) {
  if (dot === 2 || dot === "..") {
    return "..";
  }
  if (!dot) {
    return "";
  }
  if (typeof source === "string" && /[whqesn]\.\./.test(source)) {
    return "..";
  }
  if (editorNote.dots === 2) {
    return "..";
  }
  return ".";
}

function editorPitchSuffix() {
  var code = editorDurCode(editorNote.dur);
  var marks = editorDotMarks(editorNote.dot, "");
  if (marks) {
    return (code || "q") + marks;
  }
  return code;
}

function editorRhythmSuffix() {
  return (editorDurCode(editorNote.dur) || "q") + editorDotMarks(editorNote.dot, "");
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
  editorPushSymbolUndo();
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
  var parsed = /^([A-G])(#|b|n)?(\d)((?:[whqesn]\.{0,2})|\.)?$/.exec(token || "");
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
  var m = trimmed.match(/([A-G](?:#|b|n)?\d(?:[whqesn]\.{0,2}|\.)?)((?:[\^_']|[>\-])[^\s]*)?$/);
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

/*
 * Word bounds on a line at rel — same grain as Erase: token under the caret
 * when parked on it, else the previous word when in trailing spaces.
 */
function editorWordBoundsAt(line, rel) {
  var wordStart;
  var wordEnd;
  line = String(line || "");
  if (rel < 0) {
    rel = 0;
  }
  if (rel > line.length) {
    rel = line.length;
  }
  if (rel > 0 && !editorEraseWordStop(line.charAt(rel - 1))) {
    wordEnd = rel;
    while (wordEnd < line.length && !editorEraseWordStop(line.charAt(wordEnd))) {
      wordEnd += 1;
    }
    wordStart = rel;
    while (wordStart > 0 && !editorEraseWordStop(line.charAt(wordStart - 1))) {
      wordStart -= 1;
    }
    return { start: wordStart, end: wordEnd, caretInWord: rel - wordStart };
  }
  if (rel < line.length && !editorEraseWordStop(line.charAt(rel))) {
    wordStart = rel;
    wordEnd = rel;
    while (wordEnd < line.length && !editorEraseWordStop(line.charAt(wordEnd))) {
      wordEnd += 1;
    }
    return { start: wordStart, end: wordEnd, caretInWord: 0 };
  }
  if (rel > 0) {
    wordEnd = rel;
    while (wordEnd > 0 && /\s/.test(line.charAt(wordEnd - 1))) {
      wordEnd -= 1;
    }
    wordStart = wordEnd;
    while (wordStart > 0 && !editorEraseWordStop(line.charAt(wordStart - 1))) {
      wordStart -= 1;
    }
    if (wordEnd > wordStart) {
      return { start: wordStart, end: wordEnd, caretInWord: wordEnd - wordStart };
    }
  }
  return null;
}

/*
 * Pitch or rhythm under the caret (field coords). Prefers the token at/after
 * a column start so Acc/Dur match Erase and the insertion mark.
 */
function editorMusicHitAtCaret() {
  var field = editorActiveField();
  var value;
  var caret;
  var sel;
  var lineStart;
  var lineEnd;
  var line;
  var rel;
  var bounds;
  var spans;
  var span;
  var token;
  var hit;
  var pitchM;
  var rhythmM;
  var before;
  if (!field) {
    return null;
  }
  sel = editorReadSelection(field);
  if (sel.start !== sel.end) {
    return null;
  }
  value = String(field.value || "");
  caret = sel.start;
  lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  lineEnd = value.indexOf("\n", caret);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  line = value.slice(lineStart, lineEnd);
  rel = caret - lineStart;
  bounds = editorWordBoundsAt(line, rel);
  if (bounds) {
    spans = editorMusicEventSpans(line.slice(bounds.start, bounds.end));
    span = editorPickEventSpan(spans, bounds.caretInWord);
    if (span) {
      token = span.token;
      pitchM = /^([A-G](?:#|b|n)?\d(?:[whqesn]\.{0,2}|\.)?)((?:[\^_']|[>\-])[^\s]*)?$/.exec(token);
      if (pitchM) {
        hit = editorParsePitchToken(pitchM[1]);
        if (hit) {
          hit.token = token;
          hit.affix = pitchM[2] || "";
          hit.field = field;
          hit.start = lineStart + bounds.start + span.start;
          hit.end = hit.start + token.length;
          hit.caret = caret;
          hit.kind = "pitch";
          return hit;
        }
      }
      rhythmM = /^(\/[whqes]?\.?|r[whqes]?\.?)((?:[\^_']|[>\-])[^\s]*)?$/i.exec(token);
      if (rhythmM) {
        hit = editorParseRhythmToken(rhythmM[1]);
        if (hit) {
          hit.token = token;
          hit.affix = rhythmM[2] || "";
          hit.field = field;
          hit.start = lineStart + bounds.start + span.start;
          hit.end = hit.start + token.length;
          hit.caret = caret;
          return hit;
        }
      }
      /* Word under the caret is | ~ % (3 etc. — not an earlier note. */
      return null;
    }
  }
  before = value.slice(0, caret);
  hit = editorPitchTail(before);
  if (hit) {
    hit.field = field;
    hit.start = before.replace(/\s+$/, "").length - hit.token.length;
    hit.end = hit.start + hit.token.length;
    hit.caret = caret;
    hit.kind = "pitch";
    return hit;
  }
  hit = editorRhythmTail(before);
  if (hit) {
    hit.field = field;
    hit.start = before.replace(/\s+$/, "").length - hit.token.length;
    hit.end = hit.start + hit.token.length;
    hit.caret = caret;
    return hit;
  }
  return null;
}

function editorPitchAtCaret() {
  var hit = editorMusicHitAtCaret();
  if (!hit || hit.kind !== "pitch") {
    return null;
  }
  return hit;
}

/*
 * One current-event view for rewrite + erase (field coords).
 * Group peel / selection stay separate on top of this.
 * Prefer pitch/rhythm; else the music-event span under the same word bounds (| ~ %).
 */
function editorCurrentEventAtCaret() {
  var hit = editorMusicHitAtCaret();
  var field;
  var value;
  var caret;
  var sel;
  var lineStart;
  var lineEnd;
  var line;
  var rel;
  var bounds;
  var spans;
  var span;
  var start;
  if (hit && hit.field) {
    return {
      field: hit.field,
      start: hit.start,
      end: hit.end,
      token: hit.token,
      kind: hit.kind === "pitch" ? "pitch" : hit.kind || "token",
      hit: hit,
      caret: hit.caret
    };
  }
  field = editorActiveField();
  if (!field) {
    return null;
  }
  sel = editorReadSelection(field);
  if (sel.start !== sel.end) {
    return null;
  }
  value = String(field.value || "");
  caret = sel.start;
  lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  lineEnd = value.indexOf("\n", caret);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  line = value.slice(lineStart, lineEnd);
  rel = caret - lineStart;
  bounds = editorWordBoundsAt(line, rel);
  if (!bounds) {
    return null;
  }
  spans = editorMusicEventSpans(line.slice(bounds.start, bounds.end));
  span = editorPickEventSpan(spans, bounds.caretInWord);
  if (!span || !span.token) {
    return null;
  }
  start = lineStart + bounds.start + span.start;
  return {
    field: field,
    start: start,
    end: start + span.token.length,
    token: span.token,
    kind: "token",
    hit: null,
    caret: caret
  };
}

function editorParseRhythmToken(token) {
  var slash = /^\/([whqes]?)(\.{0,2})$/.exec(token || "");
  var rest = /^r([whqes]?)(\.{0,2})$/i.exec(token || "");
  if (slash) {
    return {
      token: token,
      kind: "slash",
      dur: slash[1] || "",
      dot: slash[2].length > 0
    };
  }
  if (rest) {
    return {
      token: token,
      kind: "rest",
      dur: rest[1] || "",
      dot: rest[2].length > 0
    };
  }
  return null;
}

function editorRhythmTail(text) {
  var trimmed = String(text || "").replace(/\s+$/, "");
  var m = trimmed.match(/(\/[whqes]?\.{0,2}|r[whqes]?\.{0,2})((?:[\^_']|[>\-])[^\s]*)?$/i);
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
  var hit = editorMusicHitAtCaret();
  if (!hit || hit.kind === "pitch") {
    return null;
  }
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
  var marks = editorDotMarks(useDot, hit && hit.token);
  if (marks && code === "n") {
    marks = "";
  }
  suffix = (code || (marks ? "q" : "")) + marks;
  if (!code && !marks) {
    suffix = "";
  }
  return hit.letter + (acc === undefined ? hit.acc || "" : acc) + String(hit.oct) + suffix;
}

function editorRhythmTokenWith(hit, dur, dot) {
  var useDot = typeof dot === "boolean" ? dot : !!editorNote.dot;
  var useDur = dur === undefined ? editorNote.dur : dur;
  var suffix = (editorDurCode(useDur) || "q") + editorDotMarks(useDot, hit && hit.token);
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
  re = /[A-G](?:#|b|n)?\d(?:[whqesn]\.{0,2}|\.)?/g;
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
  editorResetIntervalUnlessSelected();
  return [
    editorStaffOn() ? "staff" : "text",
    editorNote.acc || "",
    editorNote.oct === null || editorNote.oct === undefined ? "" : String(editorNote.oct),
    editorNote.dots === 2 ? ".." : editorNote.dot ? "." : "",
    editorNote.dur || "",
    String(editorWorkingOctave()),
    editorClefName(),
    defaults.clef || "",
    defaults.key || "",
    currentEditorLine(),
    field ? String(editorReadSelection(field).start) + ":" + String(editorReadSelection(field).end) : "0",
    String(editorTupletN || 3),
    editorTupletMenuOpen ? "menu" : "",
    String(editorMoveSemis || 12),
    editorMoveMenuOpen ? "move" : "",
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
  if (kind === "tuplet" || kind.indexOf("tuplet-") === 0) {
    var tupGap = head + 100;
    var tupI;
    var tupN = kind.indexOf("tuplet-") === 0 ? kind.slice(7) : String(editorTupletN || 3);
    var tupHeads = Math.min(Math.max(parseInt(tupN, 10) || 3, 3), 5);
    if (typeof staffPlaceGlyph === "function") {
      for (tupI = 0; tupI < tupHeads; tupI++) {
        staffPlaceGlyph(svg, "noteheadBlack", tupI * tupGap, 0, space);
      }
    }
    for (tupI = 0; tupI < tupHeads; tupI++) {
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
        String((tupHeads - 1) * tupGap + stemX) +
        " " +
        String(-stemLen * 0.85),
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "22",
      "stroke-linecap": "round"
    }));
    var tupLabel = editorSvgEl("text", {
      x: String(((tupHeads - 1) * tupGap) / 2 + stemX),
      y: String(-stemLen * 0.85 - 20),
      fill: "currentColor",
      "font-size": "360",
      "font-family": "system-ui, sans-serif",
      "font-weight": "700",
      "text-anchor": "middle"
    });
    tupLabel.textContent = tupN;
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

/* Main tuplet face + disclosure; open menu lists 3 / 5 / 7 / 4 glyphs. */
function editorPaintTupletCombo(row) {
  var wrap = document.createElement("span");
  var menu;
  var disclosure;
  var i;
  var n;
  wrap.className = "edit-tuplet-combo" + (editorTupletMenuOpen ? " is-open" : "");
  editorPadButton(
    wrap,
    { "data-event": "tuplet", "data-tuplet-n": String(editorTupletN || 3) },
    editorMusicIcon("tuplet-" + (editorTupletN || 3)),
    t("edit.noteTuplet") + " " + String(editorTupletN || 3),
    editorStructureButtonLit("tuplet")
  );
  disclosure = document.createElement("button");
  disclosure.type = "button";
  disclosure.className = "edit-tuplet-disclosure";
  disclosure.setAttribute("data-tuplet-menu", "1");
  disclosure.setAttribute("aria-expanded", editorTupletMenuOpen ? "true" : "false");
  disclosure.setAttribute("aria-label", t("edit.noteTupletPick"));
  disclosure.title = t("edit.noteTupletPick");
  disclosure.textContent = "\u25BE";
  wrap.appendChild(disclosure);
  if (editorTupletMenuOpen) {
    menu = document.createElement("span");
    menu.className = "edit-tuplet-menu";
    menu.setAttribute("role", "listbox");
    for (i = 0; i < EDITOR_TUPLET_CYCLE.length; i++) {
      n = EDITOR_TUPLET_CYCLE[i];
      editorPadButton(
        menu,
        { "data-tuplet-pick": String(n), role: "option" },
        editorMusicIcon("tuplet-" + n),
        t("edit.noteTuplet") + " " + String(n),
        n === editorTupletN
      );
    }
    wrap.appendChild(menu);
  }
  row.appendChild(wrap);
}

function editorPaintLetters(row) {
  var letters = ["C", "D", "E", "F", "G", "A", "B"];
  var i;
  for (i = 0; i < letters.length; i++) {
    editorPadButton(row, { "data-note": letters[i] }, letters[i], letters[i]);
  }
}

function editorPaintOctave(row) {
  var traits = editorStaffPadTraits();
  var oct;
  var mark = document.createElement("span");
  var label;
  if (traits && traits.octBlank) {
    oct = "";
  } else if (
    traits &&
    (traits.selection || traits.onEvent) &&
    traits.oct !== null &&
    traits.oct !== undefined
  ) {
    oct = String(traits.oct);
  } else {
    oct = String(editorWorkingOctave());
  }
  label = t("edit.noteOctave").replace("{n}", oct || "");
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
 * Climb to the outermost {} / [] / (N…) that still has no music beyond
 * optional onlySpan (the note about to be peeled). Collapses (3 {}) in one erase.
 */
function editorOutermostCollapsibleGroup(line, groups, inner, onlySpan) {
  var outer = inner;
  var i;
  var parent;
  var music;
  var expanded = true;
  while (expanded) {
    expanded = false;
    for (i = 0; i < groups.length; i++) {
      parent = groups[i];
      if (parent.open >= outer.open || parent.closeEnd < outer.closeEnd) {
        continue;
      }
      music = editorInnerMusicSpans(line, parent);
      if (!music.length) {
        outer = parent;
        expanded = true;
        break;
      }
      if (
        onlySpan &&
        music.length === 1 &&
        music[0].start === onlySpan.start &&
        music[0].end === onlySpan.end
      ) {
        outer = parent;
        expanded = true;
        break;
      }
    }
  }
  return outer;
}

/*
 * On a drawn staff, Erase after } ] ) peels the last inner event for {}, [],
 * and (N…). The last note (or an empty shell) clears nested empty parents in
 * one tap — so (3 {}) and (3 {F#4s}) do not leave a bare (3).
 */
function editorStaffGroupEraseTarget(line, rel) {
  var groups;
  var g;
  var i;
  var music;
  var last;
  var start;
  var end;
  var onCloser;
  var inside;
  var probe;
  var clear;
  line = String(line || "");
  groups = editorFindBalancedGroups(line);
  if (!groups.length) {
    return null;
  }
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
      clear = editorOutermostCollapsibleGroup(line, groups, g, null);
      return editorStaffGroupShellTarget(line, clear);
    }
    return null;
  }
  /* Peel last inner even while the line is pending — recovery for stuck shells. */
  if (!onCloser) {
    return null;
  }
  last = music[music.length - 1];
  /* Last music event: drop the shell (and empty nested parents) in one tap. */
  if (music.length === 1) {
    clear = editorOutermostCollapsibleGroup(line, groups, g, last);
    return editorStaffGroupShellTarget(line, clear);
  }
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
  var groupTarget;
  var current;
  var start;
  var end;
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
  if (rel > 0 && (line.charAt(rel - 1) === "}" || line.charAt(rel - 1) === "]" || line.charAt(rel - 1) === ")")) {
    /* Alone on a closer with no group peel: delete just that mark. */
    return {
      start: caret - 1,
      end: caret,
      token: line.charAt(rel - 1),
      kind: "token"
    };
  }
  /* Same event Acc/Dur would rewrite — one resolver for mark grain + erase. */
  current = editorCurrentEventAtCaret();
  if (current) {
    start = current.start;
    end = current.end;
    if (start > lineStart && /\s/.test(value.charAt(start - 1))) {
      start -= 1;
    }
    return {
      start: start,
      end: end,
      token: current.token,
      kind: "token"
    };
  }
  if (rel > 0 && /\s/.test(line.charAt(rel - 1))) {
    return {
      start: caret - 1,
      end: caret,
      token: " ",
      kind: "char"
    };
  }
  return null;
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

/*
 * After a mid-group / cross-group selection erase, drop delimiter marks that
 * are no longer in a balanced {} / [] / (N…) and clear empty shells.
 */
function editorRemoveUnbalancedGroupMarks(line) {
  var groups;
  var keep = {};
  var i;
  var j;
  var g;
  var ch;
  var tuplet;
  var out = [];
  line = String(line || "");
  groups = editorFindBalancedGroups(line);
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    for (j = g.open; j < g.openEnd; j++) {
      keep[j] = true;
    }
    keep[g.closeStart] = true;
  }
  for (i = 0; i < line.length; i++) {
    ch = line.charAt(i);
    if (ch === "{" || ch === "}" || ch === "[" || ch === "]") {
      if (!keep[i]) {
        continue;
      }
      out.push(ch);
      continue;
    }
    if (ch === "(") {
      tuplet = /^\((\d{1,2})(?::(\d{1,2}))?/.exec(line.slice(i));
      if (tuplet && !keep[i]) {
        i += tuplet[0].length - 1;
        continue;
      }
    }
    if (ch === ")" && !keep[i]) {
      continue;
    }
    out.push(ch);
  }
  return out.join("");
}

function editorRemoveEmptyStaffShells(line) {
  var prev;
  var guard = 0;
  line = String(line || "");
  do {
    prev = line;
    line = line.replace(/\{\s*\}/g, "");
    line = line.replace(/\[\s*\](?:[\^_][^\s]*)?/g, "");
    line = line.replace(/\(\d{1,2}(?::\d{1,2})?\s*\)/g, "");
    line = line.replace(/[ \t]{2,}/g, " ");
    line = line.replace(/^\s+|\s+$/g, "");
    guard += 1;
  } while (line !== prev && guard < 24);
  return line;
}

function editorHealStaffLineAfterErase(line) {
  line = editorRemoveUnbalancedGroupMarks(line);
  line = editorRemoveEmptyStaffShells(line);
  return editorStripTrailingOrphans(line);
}

/* Caption after " · " stays put while Staff edits rewrite the music. */
function editorSplitStaffCaption(line) {
  var dot = " \u00B7 ";
  var at;
  line = String(line || "");
  at = line.indexOf(dot);
  if (at < 0) {
    return { music: line, caption: "" };
  }
  return { music: line.slice(0, at), caption: line.slice(at) };
}

function editorNormDur(code) {
  code = String(code || "").replace(/\./g, "");
  if (!code || code === "q" || code === "n") {
    return "";
  }
  return code;
}

function editorDurSuffix(dur, dot) {
  var code = editorDurCode(dur);
  var marks = editorDotMarks(dot, "");
  if (marks && (code === "n" || dur === "n")) {
    marks = "";
  }
  if (marks) {
    return (code || "q") + marks;
  }
  return code;
}

function editorPitchText(letter, acc, oct, dur, dot, affix) {
  return (
    String(letter || "C") +
    (acc || "") +
    String(editorClampOctave(oct)) +
    editorDurSuffix(dur, dot) +
    (affix || "")
  );
}

/* Keep a written q when the duration itself is not what changed. */
function editorPitchTextKept(letter, acc, oct, durRaw, affix) {
  return String(letter || "C") + (acc || "") + String(editorClampOctave(oct)) + (durRaw || "") + (affix || "");
}

function editorRestText(dur, dot) {
  return "r" + (editorDurCode(dur) || "q") + editorDotMarks(dot, "");
}

function editorSlashText(dur, dot) {
  return "/" + (editorDurCode(dur) || "q") + editorDotMarks(dot, "");
}

function editorIsEventPiece(node) {
  return !!(
    node &&
    node.type === "piece" &&
    (node.kind === "pitch" || node.kind === "rest" || node.kind === "slash" || node.kind === "stack")
  );
}

function editorMakeTokenPiece(tok, start, end) {
  var piece;
  var pitch;
  var rest;
  var slash;
  var durRaw;
  piece = {
    type: "piece",
    text: tok,
    start: start,
    end: end,
    selected: false,
    pasted: false,
    kind: "mark",
    dur: "",
    durRaw: "",
    dot: false,
    acc: "",
    oct: null,
    letter: "",
    affix: "",
    pitches: null,
    beamId: 0,
    tupletId: 0,
    tupletNode: null
  };
  pitch = /^([A-G])(#|b|n)?(\d)((?:[whqesn]\.{0,2})|\.)?(.*)$/.exec(tok || "");
  if (pitch) {
    durRaw = pitch[4] || "";
    piece.kind = "pitch";
    piece.letter = pitch[1];
    piece.acc = pitch[2] || "";
    piece.oct = parseInt(pitch[3], 10);
    piece.durRaw = durRaw;
    piece.dot = durRaw.indexOf(".") >= 0;
    piece.dots = durRaw.split(".").length - 1;
    if (piece.dots > 2) {
      piece.dots = 2;
    }
    piece.dur = editorNormDur(durRaw);
    piece.affix = pitch[5] || "";
    return piece;
  }
  rest = /^r([whqes]?)(\.{0,2})(.*)$/i.exec(tok || "");
  if (rest) {
    piece.kind = "rest";
    piece.durRaw = (rest[1] || "") + (rest[2] || "");
    piece.dot = rest[2].length > 0;
    piece.dots = rest[2].length;
    piece.dur = editorNormDur(rest[1] || "q");
    piece.affix = rest[3] || "";
    return piece;
  }
  slash = /^\/([whqes]?)(\.{0,2})(.*)$/.exec(tok || "");
  if (slash) {
    piece.kind = "slash";
    piece.durRaw = (slash[1] || "") + (slash[2] || "");
    piece.dot = slash[2].length > 0;
    piece.dots = slash[2].length;
    piece.dur = editorNormDur(slash[1] || "q");
    piece.affix = slash[3] || "";
    return piece;
  }
  if (tok === "|") {
    piece.kind = "bar";
  } else if (tok === "~") {
    piece.kind = "tie";
  }
  return piece;
}

function editorMakeStackPiece(text, start, end) {
  var close = String(text || "").indexOf("]");
  var inner = close >= 0 ? text.slice(1, close) : text.slice(1);
  var parts = inner.trim() ? inner.trim().split(/\s+/) : [];
  var pitches = [];
  var i;
  var p;
  var dur;
  var dot;
  var mixed = false;
  for (i = 0; i < parts.length; i++) {
    p = editorMakeTokenPiece(parts[i], 0, parts[i].length);
    if (p.kind === "pitch") {
      pitches.push(p);
    }
  }
  dur = pitches.length ? pitches[0].dur : "";
  dot = pitches.length ? pitches[0].dot : false;
  for (i = 1; i < pitches.length; i++) {
    if (pitches[i].dur !== dur || pitches[i].dot !== dot) {
      mixed = true;
    }
  }
  return {
    type: "piece",
    kind: "stack",
    text: text,
    start: start,
    end: end,
    selected: false,
    pasted: false,
    dur: mixed ? null : dur,
    dot: !mixed && dot,
    pitches: pitches,
    affix: close >= 0 ? text.slice(close) : "]",
    beamId: 0,
    tupletId: 0,
    tupletNode: null
  };
}

/* One line as beams, tuplets, stacks, and notes. Null when a bracket is unclosed. */
function editorParseStaffNodes(line) {
  var i = 0;
  var bad = false;
  var nextBeam = 1;
  var nextTup = 1;
  var openStack = [];
  line = String(line || "");
  function currentId(kind) {
    var k;
    for (k = openStack.length - 1; k >= 0; k--) {
      if (openStack[k].kind === kind) {
        return openStack[k].id;
      }
    }
    return 0;
  }
  function currentNode(kind) {
    var k;
    for (k = openStack.length - 1; k >= 0; k--) {
      if (openStack[k].kind === kind) {
        return openStack[k].node;
      }
    }
    return null;
  }
  function tag(piece) {
    piece.beamId = currentId("beam");
    piece.tupletId = currentId("tuplet");
    piece.tupletNode = currentNode("tuplet");
    return piece;
  }
  function parseList(stopCh) {
    var nodes = [];
    var ch;
    var beamNode;
    var tup;
    var tuplet;
    var close;
    var end;
    var w0;
    var word;
    var spans;
    var s;
    var piece;
    while (i < line.length && !bad) {
      ch = line.charAt(i);
      if (stopCh && ch === stopCh) {
        break;
      }
      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }
      if (ch === "}" || ch === ")" || ch === "]") {
        break;
      }
      if (ch === "{") {
        beamNode = {
          type: "beam",
          children: [],
          start: i,
          end: i,
          beamId: nextBeam,
          selected: false,
          pasted: false
        };
        nextBeam += 1;
        i += 1;
        openStack.push({ kind: "beam", id: beamNode.beamId, node: beamNode });
        beamNode.children = parseList("}");
        openStack.pop();
        if (bad) {
          return nodes;
        }
        if (line.charAt(i) !== "}") {
          bad = true;
          return nodes;
        }
        i += 1;
        beamNode.end = i;
        nodes.push(beamNode);
        continue;
      }
      if (ch === "(") {
        tuplet = /^\((\d{1,2})(?::(\d{1,2}))?/.exec(line.slice(i));
        if (!tuplet) {
          i += 1;
          continue;
        }
        tup = {
          type: "tuplet",
          n: parseInt(tuplet[1], 10),
          ratio: tuplet[2] || "",
          children: [],
          start: i,
          end: i,
          tupletId: nextTup,
          selected: false,
          pasted: false
        };
        nextTup += 1;
        i += tuplet[0].length;
        openStack.push({ kind: "tuplet", id: tup.tupletId, node: tup });
        tup.children = parseList(")");
        openStack.pop();
        if (bad) {
          return nodes;
        }
        if (line.charAt(i) !== ")") {
          bad = true;
          return nodes;
        }
        i += 1;
        tup.end = i;
        nodes.push(tup);
        continue;
      }
      if (ch === "[") {
        close = editorMatchGroupClose(line, i, "[", "]");
        if (close < 0) {
          bad = true;
          return nodes;
        }
        end = editorStackAffixEnd(line, close + 1);
        piece = tag(editorMakeStackPiece(line.slice(i, end), i, end));
        nodes.push(piece);
        i = end;
        continue;
      }
      w0 = i;
      while (i < line.length) {
        ch = line.charAt(i);
        if (/\s/.test(ch) || ch === "{" || ch === "}" || ch === "[" || ch === "]" || ch === "(" || ch === ")") {
          break;
        }
        i += 1;
      }
      word = line.slice(w0, i);
      spans = editorMusicEventSpans(word);
      for (s = 0; s < spans.length; s++) {
        piece = tag(editorMakeTokenPiece(spans[s].token, w0 + spans[s].start, w0 + spans[s].end));
        nodes.push(piece);
      }
    }
    return nodes;
  }
  var nodes = parseList("");
  if (bad) {
    return null;
  }
  return nodes;
}

function editorCollectPieces(nodes, out) {
  var i;
  out = out || [];
  if (!nodes) {
    return out;
  }
  for (i = 0; i < nodes.length; i++) {
    if (nodes[i].type === "piece") {
      out.push(nodes[i]);
    } else if (nodes[i].children) {
      editorCollectPieces(nodes[i].children, out);
    }
  }
  return out;
}

function editorMarkSelectedNodes(nodes, start, end) {
  var i;
  var node;
  for (i = 0; i < nodes.length; i++) {
    node = nodes[i];
    if (node.type === "piece") {
      if (editorIsEventPiece(node) && node.start >= start && node.end <= end) {
        node.selected = true;
      }
    } else if (node.children) {
      editorMarkSelectedNodes(node.children, start, end);
    }
  }
}

function editorNodeRole(node) {
  var events;
  var n = 0;
  var i;
  if (!node) {
    return "none";
  }
  if (node.type === "piece") {
    return editorIsEventPiece(node) && node.selected ? "all" : "none";
  }
  events = editorCollectPieces(node.children || []).filter(editorIsEventPiece);
  if (!events.length) {
    return "none";
  }
  for (i = 0; i < events.length; i++) {
    if (events[i].selected) {
      n += 1;
    }
  }
  if (!n) {
    return "none";
  }
  if (n === events.length) {
    return "all";
  }
  return "some";
}

function editorCloneBox(node, children) {
  return {
    type: node.type,
    n: node.n,
    ratio: node.ratio || "",
    children: children,
    selected: false,
    pasted: false
  };
}

/* Pull a contiguous run out of partial beams and tuplets. Full containers stay whole. */
function editorPullSelection(nodes) {
  var before = [];
  var selected = [];
  var after = [];
  var phase = 0;
  var i;
  var node;
  var role;
  var inner;
  var j;
  var later;
  for (i = 0; i < nodes.length; i++) {
    node = nodes[i];
    role = editorNodeRole(node);
    if (phase === 2) {
      after.push(node);
      continue;
    }
    if (role === "none") {
      later = false;
      if (phase === 1 && !editorIsEventPiece(node)) {
        for (j = i + 1; j < nodes.length; j++) {
          if (editorNodeRole(nodes[j]) !== "none") {
            later = true;
            break;
          }
        }
      }
      if (later) {
        selected.push(node);
      } else if (phase === 0) {
        before.push(node);
      } else {
        phase = 2;
        after.push(node);
      }
      continue;
    }
    phase = 1;
    if (role === "all") {
      selected.push(node);
      continue;
    }
    inner = editorPullSelection(node.children || []);
    if (inner.before.length) {
      before.push(editorCloneBox(node, inner.before));
    }
    selected = selected.concat(inner.selected);
    if (inner.after.length) {
      phase = 2;
      after.push(editorCloneBox(node, inner.after));
    }
  }
  return { before: before, selected: selected, after: after };
}

function editorNodeStaysInBeam(node) {
  var i;
  if (!node || node.type === "beam" || node.type === "tuplet") {
    return false;
  }
  if (node.type !== "piece") {
    return false;
  }
  if (node.kind === "tie") {
    return true;
  }
  if (node.kind === "pitch" || node.kind === "slash") {
    return editorDurationIsShort(node.dur);
  }
  if (node.kind === "stack") {
    if (!node.pitches || !node.pitches.length) {
      return false;
    }
    for (i = 0; i < node.pitches.length; i++) {
      if (!editorDurationIsShort(node.pitches[i].dur)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function editorListHasEvent(nodes) {
  var pieces = editorCollectPieces(nodes);
  var i;
  for (i = 0; i < pieces.length; i++) {
    if (editorIsEventPiece(pieces[i])) {
      return true;
    }
  }
  return false;
}

function editorHealList(nodes) {
  var out = [];
  var i;
  var part;
  for (i = 0; i < nodes.length; i++) {
    part = editorHealNode(nodes[i]);
    if (part && part.length) {
      out = out.concat(part);
    }
  }
  return out;
}

/* Rests and long notes step out. A leftover eighth keeps its braces. An empty beam goes. */
function editorHealBeam(node) {
  var kids = editorHealList(node.children || []);
  var items = [];
  var groups = [];
  var current = null;
  var i;
  var stay;
  var anyStay = false;
  var anyLeave = false;
  var out;
  for (i = 0; i < kids.length; i++) {
    items.push(kids[i]);
  }
  if (!items.length) {
    return [];
  }
  for (i = 0; i < items.length; i++) {
    stay = editorNodeStaysInBeam(items[i]);
    if (!current || current.stay !== stay) {
      current = { stay: stay, nodes: [items[i]] };
      groups.push(current);
    } else {
      current.nodes.push(items[i]);
    }
  }
  for (i = 0; i < groups.length; i++) {
    if (groups[i].stay) {
      anyStay = true;
    } else {
      anyLeave = true;
    }
  }
  if (!anyLeave) {
    return [
      {
        type: "beam",
        children: items,
        selected: !!node.selected,
        pasted: !!node.pasted
      }
    ];
  }
  if (!anyStay) {
    return items;
  }
  out = [];
  for (i = 0; i < groups.length; i++) {
    if (groups[i].stay) {
      out.push({
        type: "beam",
        children: groups[i].nodes,
        selected: false,
        pasted: false
      });
    } else {
      out = out.concat(groups[i].nodes);
    }
  }
  return out;
}

/* A bar rides out after the tuplet. A nested tuplet steps out between the pieces. */
function editorHealTuplet(node) {
  var kids = editorHealList(node.children || []);
  var items = [];
  var bars = [];
  var groups = [];
  var current = null;
  var i;
  var nested;
  var out = [];
  for (i = 0; i < kids.length; i++) {
    if (kids[i].type === "piece" && kids[i].kind === "bar") {
      bars.push(kids[i]);
    } else {
      items.push(kids[i]);
    }
  }
  for (i = 0; i < items.length; i++) {
    nested = items[i].type === "tuplet";
    if (!current || current.nested !== nested) {
      current = { nested: nested, nodes: [items[i]] };
      groups.push(current);
    } else {
      current.nodes.push(items[i]);
    }
  }
  for (i = 0; i < groups.length; i++) {
    if (groups[i].nested) {
      out = out.concat(groups[i].nodes);
    } else if (editorListHasEvent(groups[i].nodes)) {
      out.push({
        type: "tuplet",
        n: node.n,
        ratio: node.ratio || "",
        children: groups[i].nodes,
        selected: !!node.selected,
        pasted: !!node.pasted
      });
    }
  }
  for (i = 0; i < bars.length; i++) {
    out.push(bars[i]);
  }
  return out;
}

function editorHealNode(node) {
  if (!node) {
    return [];
  }
  if (node.type === "beam") {
    return editorHealBeam(node);
  }
  if (node.type === "tuplet") {
    return editorHealTuplet(node);
  }
  return [node];
}

function editorEmitter() {
  var parts = [];
  var len = 0;
  var selStart = -1;
  var selEnd = -1;
  var caret = -1;
  var glue = false;
  var prevSel = false;
  function emit(text, flags) {
    var selected;
    flags = flags || {};
    if (!text) {
      return;
    }
    selected = !!flags.selected;
    if (
      parts.length &&
      !glue &&
      !flags.glueLeft &&
      !/^\s/.test(text) &&
      !/\s$/.test(parts[parts.length - 1])
    ) {
      parts.push(" ");
      if (selected && prevSel && selStart >= 0) {
        selEnd = len + 1;
      }
      len += 1;
    }
    if (selected && selStart < 0) {
      selStart = len;
    }
    parts.push(text);
    len += text.length;
    if (selected) {
      selEnd = len;
    }
    if (flags.pasted || flags.caretAfter) {
      caret = len;
    }
    glue = !!flags.glueRight;
    prevSel = selected;
  }
  return {
    emit: emit,
    finish: function () {
      return { text: parts.join(""), selStart: selStart, selEnd: selEnd, caret: caret };
    }
  };
}

function editorSerializeNode(node, em) {
  var open;
  var i;
  if (!node || !em) {
    return;
  }
  if (node.type === "beam") {
    em.emit("{", { selected: !!node.selected, glueRight: true, pasted: !!node.pasted });
    for (i = 0; i < node.children.length; i++) {
      editorSerializeNode(node.children[i], em);
    }
    em.emit("}", { selected: !!node.selected, glueLeft: true, pasted: !!node.pasted });
    return;
  }
  if (node.type === "tuplet") {
    open = "(" + node.n + (node.ratio ? ":" + node.ratio : "");
    em.emit(open, { selected: !!node.selected, pasted: !!node.pasted });
    for (i = 0; i < node.children.length; i++) {
      editorSerializeNode(node.children[i], em);
    }
    em.emit(")", { selected: !!node.selected, glueLeft: true, pasted: !!node.pasted });
    return;
  }
  if (node.type === "piece") {
    em.emit(node.text, {
      selected: !!node.selected,
      pasted: !!node.pasted,
      caretAfter: !!node.caretAfter
    });
  }
}

function editorSerializeNodes(nodes) {
  var em = editorEmitter();
  var i;
  for (i = 0; i < nodes.length; i++) {
    editorSerializeNode(nodes[i], em);
  }
  return em.finish();
}

function editorStaffMusicDraws(music) {
  if (!String(music || "").replace(/\s+/g, "")) {
    return true;
  }
  if (typeof parseMusicNotation !== "function") {
    return true;
  }
  return !!parseMusicNotation(music);
}

function editorSelectionBounds() {
  var span;
  var sel;
  var a;
  var b;
  var swap;
  var raw;
  var parts;
  if (!editorStaffOn()) {
    return null;
  }
  span = editorLineSpan();
  if (!span) {
    return null;
  }
  sel = editorReadSelection(span.field);
  a = sel.start - span.lineStart;
  b = sel.end - span.lineStart;
  if (a === b) {
    return null;
  }
  if (a > b) {
    swap = a;
    a = b;
    b = swap;
  }
  raw = span.value.slice(span.lineStart, span.lineEnd);
  parts = editorSplitStaffCaption(raw);
  if (a < 0) {
    a = 0;
  }
  if (b > parts.music.length) {
    b = parts.music.length;
  }
  if (a >= b) {
    return null;
  }
  return { span: span, music: parts.music, caption: parts.caption, a: a, b: b };
}

function editorCommitStaffEdit(bounds, built, mode) {
  var line;
  var selStart;
  var selEnd;
  var value;
  var silent;
  line = built.text + (bounds.caption || "");
  if (mode === "caret") {
    selStart = built.caret >= 0 ? built.caret : built.text.length;
    selEnd = selStart;
  } else {
    selStart = built.selStart;
    selEnd = built.selEnd;
    if (selStart < 0) {
      selStart = 0;
    }
    if (selEnd < 0) {
      selEnd = selStart;
    }
  }
  if (!(bounds.skipUndo)) {
    editorPushSymbolUndo();
  }
  value = String(bounds.span.field.value || "");
  bounds.span.field.value = value.slice(0, bounds.span.lineStart) + line + value.slice(bounds.span.lineEnd);
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(
    bounds.span.field,
    bounds.span.lineStart + selStart,
    bounds.span.lineStart + selEnd,
    silent
  );
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

function editorSelectEvents(nodes) {
  var i;
  for (i = 0; i < nodes.length; i++) {
    if (editorIsEventPiece(nodes[i])) {
      nodes[i].selected = true;
    }
    if (nodes[i].children) {
      editorSelectEvents(nodes[i].children);
    }
  }
}

function editorExpandList(nodes) {
  var out = [];
  var i;
  var node;
  var parsed;
  for (i = 0; i < nodes.length; i++) {
    node = nodes[i];
    if (node.type === "piece" && node.replaceWith != null) {
      parsed = editorParseStaffNodes(node.replaceWith);
      if (!parsed) {
        out.push(node);
      } else {
        editorSelectEvents(parsed);
        out = out.concat(parsed);
      }
    } else if (node.children) {
      node.children = editorExpandList(node.children);
      out.push(node);
    } else {
      out.push(node);
    }
  }
  return out;
}

function editorAnyReplace(nodes) {
  var i;
  for (i = 0; i < nodes.length; i++) {
    if (nodes[i].type === "piece" && nodes[i].replaceWith != null && nodes[i].replaceWith !== nodes[i].text) {
      return true;
    }
    if (nodes[i].children && editorAnyReplace(nodes[i].children)) {
      return true;
    }
  }
  return false;
}

function editorMapStackText(node, mapPitch) {
  var close = node.text.indexOf("]");
  var inner = close >= 0 ? node.text.slice(1, close) : node.text.slice(1);
  var tail = close >= 0 ? node.text.slice(close) : "]";
  var parts = inner.split(/(\s+)/);
  var out = [];
  var i;
  var p;
  for (i = 0; i < parts.length; i++) {
    if (!parts[i] || /^\s+$/.test(parts[i])) {
      out.push(parts[i]);
      continue;
    }
    p = editorMakeTokenPiece(parts[i], 0, parts[i].length);
    if (p.kind === "pitch") {
      out.push(mapPitch(p));
    } else {
      out.push(parts[i]);
    }
  }
  return "[" + out.join("") + tail;
}

function editorStackWithLetter(node, letter, oct) {
  var occupied = {};
  var i;
  var p;
  var free;
  var dur;
  var dot;
  var neu;
  var close;
  var inner;
  var tail;
  for (i = 0; i < node.pitches.length; i++) {
    p = node.pitches[i];
    occupied[p.letter + (p.acc || "") + String(p.oct)] = true;
  }
  free = editorNextFreeStackOctave(letter, "", oct, occupied);
  if (free === null) {
    return null;
  }
  dur = node.dur == null ? (node.pitches[0] ? node.pitches[0].dur : "") : node.dur;
  dot = node.pitches[0] ? node.pitches[0].dot : false;
  neu = editorPitchText(letter, "", free, dur, dot, "");
  close = node.text.indexOf("]");
  inner = (close >= 0 ? node.text.slice(1, close) : node.text.slice(1)).replace(/\s+$/g, "");
  tail = close >= 0 ? node.text.slice(close) : "]";
  return "[" + inner + (inner ? " " : "") + neu + tail;
}

function editorSelectionWriteOctave(events) {
  var oct = null;
  var mixed = false;
  var i;
  var j;
  function take(n) {
    if (oct === null) {
      oct = n;
    } else if (oct !== n) {
      mixed = true;
    }
  }
  for (i = 0; i < events.length; i++) {
    if (events[i].kind === "pitch") {
      take(events[i].oct);
    }
    if (events[i].kind === "stack" && events[i].pitches) {
      for (j = 0; j < events[i].pitches.length; j++) {
        take(events[i].pitches[j].oct);
      }
    }
  }
  if (oct !== null && !mixed) {
    return oct;
  }
  return editorWorkingOctave();
}

function editorRunSelection(mutator, mode, opts) {
  var bounds;
  var nodes;
  var events;
  var healed;
  var built;
  bounds = editorSelectionBounds();
  if (!bounds) {
    return false;
  }
  nodes = editorParseStaffNodes(bounds.music);
  if (!nodes) {
    return true;
  }
  editorMarkSelectedNodes(nodes, bounds.a, bounds.b);
  events = editorCollectPieces(nodes).filter(function (p) {
    return editorIsEventPiece(p) && p.selected;
  });
  if (!events.length) {
    return true;
  }
  if (mutator(nodes, events) === false) {
    return true;
  }
  if (!editorAnyReplace(nodes) && mode !== "bar") {
    editorPaintNotePad();
    return true;
  }
  nodes = editorExpandList(nodes);
  healed = editorHealList(nodes);
  built = editorSerializeNodes(healed);
  if (!editorStaffMusicDraws(built.text)) {
    return true;
  }
  if (built.text + (bounds.caption || "") === bounds.music + (bounds.caption || "") && mode !== "caret") {
    editorPaintNotePad();
    return true;
  }
  bounds.skipUndo = !!(opts && opts.skipUndo);
  return editorCommitStaffEdit(bounds, built, mode || "select");
}

function editorApplySelectionLetter(letter, opts) {
  return editorRunSelection(function (nodes, events) {
    var oct = editorSelectionWriteOctave(events);
    var i;
    var next;
    var full = false;
    for (i = 0; i < events.length; i++) {
      if (events[i].kind === "pitch") {
        events[i].replaceWith = editorPitchTextKept(
          letter,
          events[i].acc,
          events[i].oct,
          events[i].durRaw,
          events[i].affix
        );
      } else if (events[i].kind === "rest" || events[i].kind === "slash") {
        events[i].replaceWith = editorPitchText(letter, "", oct, events[i].dur, events[i].dot, "");
      } else if (events[i].kind === "stack") {
        next = editorStackWithLetter(events[i], letter, oct);
        if (next === null) {
          full = true;
        } else {
          events[i].replaceWith = next;
        }
      }
    }
    if (full) {
      editorNotice(t("edit.refuseStackFull"));
    }
    return true;
  }, "select", opts);
}

function editorApplySelectionRest(opts) {
  return editorRunSelection(function (nodes, events) {
    var i;
    var ev;
    var dur;
    var dot;
    for (i = 0; i < events.length; i++) {
      ev = events[i];
      if (ev.kind === "stack") {
        dur = ev.dur == null ? (ev.pitches[0] ? ev.pitches[0].dur : "") : ev.dur;
        dot = ev.pitches[0] ? ev.pitches[0].dot : false;
      } else {
        dur = ev.dur;
        dot = ev.dot;
      }
      ev.replaceWith = editorRestText(dur, dot);
    }
    return true;
  }, "select", opts);
}

function editorApplySelectionSlash(opts) {
  return editorRunSelection(function (nodes, events) {
    var i;
    var ev;
    var dur;
    var dot;
    for (i = 0; i < events.length; i++) {
      ev = events[i];
      if (ev.kind === "stack") {
        dur = ev.dur == null ? (ev.pitches[0] ? ev.pitches[0].dur : "") : ev.dur;
        dot = ev.pitches[0] ? ev.pitches[0].dot : false;
      } else {
        dur = ev.dur;
        dot = ev.dot;
      }
      ev.replaceWith = editorSlashText(dur, dot);
    }
    return true;
  }, "select", opts);
}

function editorApplySelectionDot(dotOn) {
  return editorRunSelection(function (nodes, events) {
    var i;
    var ev;
    for (i = 0; i < events.length; i++) {
      ev = events[i];
      if (ev.kind === "pitch") {
        ev.replaceWith = editorPitchText(ev.letter, ev.acc, ev.oct, ev.dur, dotOn, ev.affix);
      } else if (ev.kind === "rest") {
        ev.replaceWith = editorRestText(ev.dur, dotOn);
      } else if (ev.kind === "slash") {
        ev.replaceWith = editorSlashText(ev.dur, dotOn);
      } else if (ev.kind === "stack") {
        ev.replaceWith = editorMapStackText(ev, function (p) {
          return editorPitchText(p.letter, p.acc, p.oct, p.dur, dotOn, p.affix);
        });
      }
    }
    return true;
  }, "select");
}

function editorInsertAfterNode(nodes, target, extra) {
  var i;
  for (i = 0; i < nodes.length; i++) {
    if (nodes[i] === target) {
      nodes.splice(i + 1, 0, extra);
      return true;
    }
    if (nodes[i].children && editorInsertAfterNode(nodes[i].children, target, extra)) {
      return true;
    }
  }
  return false;
}

function editorInsertAfterLastSelected(nodes, extra) {
  var spot = null;
  function walk(list) {
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].type === "piece" && list[i].selected) {
        spot = { list: list, index: i };
      }
      if (list[i].children) {
        walk(list[i].children);
      }
    }
  }
  walk(nodes);
  if (!spot) {
    return false;
  }
  spot.list.splice(spot.index + 1, 0, extra);
  return true;
}

function editorCommonTupletNode(events) {
  var id;
  var i;
  if (!events.length || !events[0].tupletId) {
    return null;
  }
  id = events[0].tupletId;
  for (i = 0; i < events.length; i++) {
    if (events[i].tupletId !== id) {
      return null;
    }
  }
  return events[0].tupletNode || null;
}

function editorApplySelectionBar() {
  var bounds = editorSelectionBounds();
  var nodes;
  var events;
  var bar;
  var tup;
  var healed;
  var built;
  if (!bounds) {
    return false;
  }
  nodes = editorParseStaffNodes(bounds.music);
  if (!nodes) {
    return true;
  }
  editorMarkSelectedNodes(nodes, bounds.a, bounds.b);
  events = editorCollectPieces(nodes).filter(function (p) {
    return editorIsEventPiece(p) && p.selected;
  });
  if (!events.length) {
    return true;
  }
  bar = { type: "piece", kind: "bar", text: "|", caretAfter: true, selected: false, pasted: false };
  tup = editorCommonTupletNode(events);
  if (tup) {
    editorInsertAfterNode(nodes, tup, bar);
  } else {
    editorInsertAfterLastSelected(nodes, bar);
  }
  healed = editorHealList(nodes);
  built = editorSerializeNodes(healed);
  if (!editorStaffMusicDraws(built.text)) {
    return true;
  }
  return editorCommitStaffEdit(bounds, built, "caret");
}

function editorFlagPaste(nodes, mode) {
  var i;
  for (i = 0; i < nodes.length; i++) {
    nodes[i].pasted = true;
    if (mode === "select") {
      nodes[i].selected = true;
    }
    if (nodes[i].children) {
      editorFlagPaste(nodes[i].children, mode);
    }
  }
}

function editorSpliceAtCaret(nodes, caret, paste) {
  var i;
  var node;
  for (i = 0; i < nodes.length; i++) {
    node = nodes[i];
    if ((node.type === "beam" || node.type === "tuplet") && caret > node.start && caret < node.end) {
      return editorSpliceAtCaret(node.children, caret, paste);
    }
    if (typeof node.start === "number" && node.start >= caret) {
      nodes.splice.apply(nodes, [i, 0].concat(paste));
      return true;
    }
  }
  nodes.push.apply(nodes, paste);
  return true;
}

function editorPasteOverSelection(text) {
  var bounds = editorSelectionBounds();
  var nodes;
  var pulled;
  var paste;
  var healed;
  var built;
  if (!bounds) {
    return false;
  }
  nodes = editorParseStaffNodes(bounds.music);
  if (!nodes) {
    return true;
  }
  editorMarkSelectedNodes(nodes, bounds.a, bounds.b);
  pulled = editorPullSelection(nodes);
  if (!pulled.selected.length) {
    return true;
  }
  paste = editorParseStaffNodes(String(text || "").replace(/^\s+|\s+$/g, ""));
  if (!paste || !paste.length) {
    return true;
  }
  editorFlagPaste(paste, "select");
  healed = editorHealList(pulled.before.concat(paste).concat(pulled.after));
  built = editorSerializeNodes(healed);
  if (!editorStaffMusicDraws(built.text)) {
    return true;
  }
  return editorCommitStaffEdit(bounds, built, "select");
}

function editorPasteAtCaret(text) {
  var span;
  var sel;
  var raw;
  var parts;
  var caret;
  var nodes;
  var paste;
  var healed;
  var built;
  var bounds;
  if (!editorStaffOn()) {
    return false;
  }
  span = editorLineSpan();
  if (!span) {
    return false;
  }
  sel = editorReadSelection(span.field);
  if (sel.start !== sel.end) {
    return false;
  }
  raw = span.value.slice(span.lineStart, span.lineEnd);
  parts = editorSplitStaffCaption(raw);
  caret = sel.start - span.lineStart;
  if (caret < 0) {
    caret = 0;
  }
  if (caret > parts.music.length) {
    caret = parts.music.length;
  }
  nodes = editorParseStaffNodes(parts.music);
  if (!nodes) {
    return false;
  }
  paste = editorParseStaffNodes(String(text || "").replace(/^\s+|\s+$/g, ""));
  if (!paste || !paste.length) {
    return false;
  }
  editorFlagPaste(paste, "caret");
  editorSpliceAtCaret(nodes, caret, paste);
  healed = editorHealList(nodes);
  built = editorSerializeNodes(healed);
  if (!editorStaffMusicDraws(built.text)) {
    return true;
  }
  bounds = { span: span, music: parts.music, caption: parts.caption };
  return editorCommitStaffEdit(bounds, built, "caret");
}

function editorCopySelection(value, lineStart, selStart, selEnd) {
  var raw;
  var parts;
  var a;
  var b;
  var nodes;
  var pulled;
  var built;
  var lineEnd;
  value = String(value || "");
  lineEnd = value.indexOf("\n", lineStart);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  raw = value.slice(lineStart, lineEnd);
  parts = editorSplitStaffCaption(raw);
  a = selStart - lineStart;
  b = selEnd - lineStart;
  if (a > b) {
    lineEnd = a;
    a = b;
    b = lineEnd;
  }
  if (a < 0) {
    a = 0;
  }
  if (b > parts.music.length) {
    b = parts.music.length;
  }
  nodes = editorParseStaffNodes(parts.music);
  if (!nodes) {
    return null;
  }
  editorMarkSelectedNodes(nodes, a, b);
  pulled = editorPullSelection(nodes);
  if (!pulled.selected.length) {
    return "";
  }
  built = editorSerializeNodes(pulled.selected);
  return String(built.text || "").replace(/^\s+|\s+$/g, "");
}

function editorSelectionTupletAction(line, start, end) {
  var nodes;
  var events;
  var id;
  var i;
  var outside;
  var node;
  var inner;
  if (start > end) {
    i = start;
    start = end;
    end = i;
  }
  nodes = editorParseStaffNodes(line);
  if (!nodes) {
    return { kind: "none", n: 0 };
  }
  editorMarkSelectedNodes(nodes, start, end);
  events = editorCollectPieces(nodes).filter(function (p) {
    return editorIsEventPiece(p) && p.selected;
  });
  if (!events.length) {
    return { kind: "none", n: 0 };
  }
  id = events[0].tupletId || 0;
  outside = !id;
  for (i = 0; i < events.length; i++) {
    if ((events[i].tupletId || 0) !== id || !events[i].tupletId) {
      outside = true;
    }
  }
  if (!id) {
    return { kind: "none", n: 0 };
  }
  if (outside) {
    return { kind: "blocked", n: 0 };
  }
  node = events[0].tupletNode;
  inner = editorCollectPieces(node ? [node] : []).filter(editorIsEventPiece);
  for (i = 0; i < inner.length; i++) {
    if (!inner[i].selected) {
      return { kind: "partial", n: node.n || 0 };
    }
  }
  return { kind: "whole", n: node ? node.n : 0 };
}

function editorRewriteSelectionTuplet(n) {
  var span = editorLineSpan();
  var line;
  var sel;
  var rel;
  var endRel;
  var swap;
  var g;
  var oldOpen;
  var nextOpen;
  var openN;
  var value;
  var delta;
  var start;
  var end;
  var silent;
  n = editorClampTupletN(n);
  if (!span) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  sel = editorReadSelection(span.field);
  rel = sel.start - span.lineStart;
  endRel = sel.end - span.lineStart;
  if (rel > endRel) {
    swap = rel;
    rel = endRel;
    endRel = swap;
  }
  g = editorMatchingGroupSelection(line, rel, endRel, "tuplet");
  if (!g) {
    return false;
  }
  oldOpen = line.slice(g.open, g.openEnd);
  openN = /^\((\d+)/.exec(oldOpen);
  if (openN && editorClampTupletN(openN[1]) === n && oldOpen === "(" + n) {
    return false;
  }
  nextOpen = "(" + n;
  if (oldOpen === nextOpen) {
    return false;
  }
  editorPushSymbolUndo();
  value = String(span.field.value || "");
  span.field.value =
    value.slice(0, span.lineStart + g.open) + nextOpen + value.slice(span.lineStart + g.openEnd);
  delta = nextOpen.length - oldOpen.length;
  start = sel.start;
  end = sel.end;
  if (start >= span.lineStart + g.openEnd) {
    start += delta;
  }
  if (end >= span.lineStart + g.openEnd) {
    end += delta;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, start, end, silent);
  clearEditorNotice();
  refreshEditor();
  editorPaintNotePad();
  return true;
}

function editorTraitsFromEvents(events) {
  var dur;
  var mixedDur = false;
  var anyRhythm = false;
  var allDotted = true;
  var acc;
  var mixedAcc = false;
  var anyPitch = false;
  var oct = null;
  var mixedOct = false;
  var beamId;
  var beamSame = true;
  var tupId;
  var tupSame = true;
  var stacks = 0;
  var i;
  var j;
  var ev;
  function takeRhythm(code, dotted) {
    var norm = code == null ? null : editorNormDur(code);
    anyRhythm = true;
    if (!dotted) {
      allDotted = false;
    }
    if (dur === undefined) {
      dur = norm;
    } else if (dur !== norm) {
      mixedDur = true;
    }
  }
  function takePitch(p) {
    var a = p.acc || "";
    anyPitch = true;
    if (acc === undefined) {
      acc = a;
    } else if (acc !== a) {
      mixedAcc = true;
    }
    if (oct === null) {
      oct = p.oct;
    } else if (oct !== p.oct) {
      mixedOct = true;
    }
  }
  for (i = 0; i < events.length; i++) {
    ev = events[i];
    if (ev.kind === "stack") {
      stacks += 1;
      if (ev.dur == null) {
        mixedDur = true;
        anyRhythm = true;
        if (!ev.pitches || !ev.pitches.length) {
          allDotted = false;
        } else {
          for (j = 0; j < ev.pitches.length; j++) {
            if (!ev.pitches[j].dot) {
              allDotted = false;
            }
          }
        }
      } else {
        takeRhythm(ev.dur, ev.dot);
      }
      if (ev.pitches) {
        for (j = 0; j < ev.pitches.length; j++) {
          takePitch(ev.pitches[j]);
        }
      }
    } else if (ev.kind === "pitch") {
      takeRhythm(ev.dur, ev.dot);
      takePitch(ev);
    } else if (ev.kind === "rest" || ev.kind === "slash") {
      takeRhythm(ev.dur, ev.dot);
    }
    if (beamSame) {
      if (beamId === undefined) {
        beamId = ev.beamId || 0;
      } else if (beamId !== (ev.beamId || 0)) {
        beamSame = false;
      }
    }
    if (tupSame) {
      if (tupId === undefined) {
        tupId = ev.tupletId || 0;
      } else if (tupId !== (ev.tupletId || 0)) {
        tupSame = false;
      }
    }
  }
  return {
    selection: true,
    onEvent: false,
    dur: anyRhythm && !mixedDur ? dur : null,
    dot: !!(anyRhythm && allDotted),
    accLit: anyPitch && !mixedAcc && acc ? acc : "",
    oct: anyPitch && !mixedOct ? oct : null,
    octBlank: anyPitch && mixedOct,
    beam: !!(beamSame && beamId),
    tuplet: !!(tupSame && tupId),
    stack: stacks === 1 && events.length === 1
  };
}

function editorStackDotsAgree(line, stack) {
  var spans;
  var i;
  var m;
  var dotted;
  if (!stack) {
    return false;
  }
  spans = editorStackPitchSpans(line, stack);
  if (!spans.length) {
    return false;
  }
  for (i = 0; i < spans.length; i++) {
    m = /^[A-G](?:#|b|n)?\d((?:[whqesn]\.{0,2})|\.)?/.exec(spans[i].token);
    dotted = !!(m && String(m[1] || "").indexOf(".") >= 0);
    if (!dotted) {
      return false;
    }
  }
  return true;
}

function editorTraitsFromHit(hit) {
  var piece;
  var stack;
  var span;
  var line;
  var shared;
  var dur;
  var dot;
  if (!hit) {
    return null;
  }
  piece = editorMakeTokenPiece(hit.token || "", hit.start, hit.end);
  if (piece.kind !== "pitch" && piece.kind !== "rest" && piece.kind !== "slash") {
    return null;
  }
  dur = piece.dur;
  dot = piece.dot;
  stack = editorStackGroupAtCaret();
  if (stack) {
    shared = editorStackSharedDuration();
    span = editorLineSpan();
    line = span ? span.value.slice(span.lineStart, span.lineEnd) : "";
    if (shared) {
      dur = shared.dur;
      dot = shared.dot;
    } else {
      dur = null;
      dot = editorStackDotsAgree(line, stack);
    }
  }
  return {
    selection: false,
    onEvent: true,
    dur: dur,
    dot: !!dot,
    dots: piece.dots || (dot ? 1 : 0),
    accLit: piece.kind === "pitch" ? piece.acc || "" : "",
    oct: piece.kind === "pitch" ? piece.oct : null,
    octBlank: false,
    beam: editorCaretInsideStructure("beam"),
    tuplet: editorCaretInsideStructure("tuplet"),
    stack: !!stack || editorCaretInsideStructure("stack")
  };
}

function editorStaffPadTraits() {
  var span;
  var sel;
  var a;
  var b;
  var swap;
  var raw;
  var parts;
  var nodes;
  var events;
  var hit;
  if (!editorStaffOn()) {
    return null;
  }
  span = editorLineSpan();
  if (!span) {
    return null;
  }
  sel = editorReadSelection(span.field);
  a = sel.start - span.lineStart;
  b = sel.end - span.lineStart;
  if (a > b) {
    swap = a;
    a = b;
    b = swap;
  }
  if (a !== b) {
    raw = span.value.slice(span.lineStart, span.lineEnd);
    parts = editorSplitStaffCaption(raw);
    if (a < 0) {
      a = 0;
    }
    if (b > parts.music.length) {
      b = parts.music.length;
    }
    nodes = editorParseStaffNodes(parts.music);
    if (!nodes) {
      return {
        selection: true,
        onEvent: false,
        dur: null,
        dot: false,
        accLit: "",
        oct: null,
        octBlank: false,
        beam: false,
        tuplet: false,
        stack: false
      };
    }
    editorMarkSelectedNodes(nodes, a, b);
    events = editorCollectPieces(nodes).filter(function (p) {
      return editorIsEventPiece(p) && p.selected;
    });
    if (!events.length) {
      return {
        selection: true,
        onEvent: false,
        dur: null,
        dot: false,
        accLit: "",
        oct: null,
        octBlank: false,
        beam: false,
        tuplet: false,
        stack: false
      };
    }
    return editorTraitsFromEvents(events);
  }
  hit = editorMusicHitAtCaret();
  if (!hit) {
    return null;
  }
  return editorTraitsFromHit(hit);
}

function editorShownRhythmSuffix() {
  var traits = editorStaffPadTraits();
  if (traits && (traits.selection || traits.onEvent)) {
    if (traits.dur === null || traits.dur === undefined) {
      return "q";
    }
    return (editorDurCode(traits.dur) || "q") + (traits.dots === 2 ? ".." : traits.dot ? "." : "");
  }
  return editorRhythmSuffix();
}

function editorStructureButtonLit(kind) {
  var traits = editorStaffPadTraits();
  if (traits && traits.selection) {
    if (kind === "stack") {
      return !!traits.stack;
    }
    if (kind === "beam") {
      return !!traits.beam;
    }
    if (kind === "tuplet") {
      return !!traits.tuplet;
    }
    return false;
  }
  return editorCaretInsideStructure(kind);
}

/* Rewrite pitch / rhythm event tokens inside a selection slice; keep shells. */
function editorMapSelectionEventTokens(text, mapFn) {
  var ranges;
  var parts = [];
  var pos = 0;
  var i;
  var r;
  var spans;
  var j;
  var piece;
  var last;
  var mapped;
  text = String(text || "");
  if (!text || typeof mapFn !== "function") {
    return text;
  }
  ranges = editorMusicTokenRanges(text);
  for (i = 0; i < ranges.length; i++) {
    r = ranges[i];
    parts.push(text.slice(pos, r.start));
    spans = editorMusicEventSpans(r.tok);
    piece = "";
    last = 0;
    for (j = 0; j < spans.length; j++) {
      piece += r.tok.slice(last, spans[j].start);
      mapped = mapFn(spans[j].token);
      piece += mapped == null ? spans[j].token : mapped;
      last = spans[j].end;
    }
    piece += r.tok.slice(last);
    parts.push(piece);
    pos = r.end;
  }
  parts.push(text.slice(pos));
  return parts.join("");
}

function editorRewriteAccidentalToken(tok, acc) {
  var m = /^([A-G])(#|b|n)?(\d)(.*)$/.exec(tok || "");
  var cur;
  var next;
  if (!m) {
    return tok;
  }
  acc = acc === "b" || acc === "#" || acc === "n" ? acc : "";
  cur = m[2] || "";
  next = cur === acc ? "" : acc;
  return m[1] + next + m[3] + (m[4] || "");
}

function editorRewriteDurationEventToken(tok, dur, dot) {
  var rhythmM;
  var hit;
  if (/^[A-G]/.test(tok || "")) {
    return editorRewritePitchDurationToken(tok, dur, dot);
  }
  rhythmM = /^(\/[whqes]?\.?|r[whqes]?\.?)((?:[\^_']|[>\-])[^\s]*)?$/i.exec(tok || "");
  if (!rhythmM) {
    return tok;
  }
  hit = editorParseRhythmToken(rhythmM[1]);
  if (!hit) {
    return tok;
  }
  return editorRhythmTokenWith(hit, dur, dot) + (rhythmM[2] || "");
}

function editorApplySelectionTextRewrite(rewriteFn) {
  var field = editorActiveField();
  var sel;
  var value;
  var raw;
  var next;
  var silent;
  if (!field || typeof rewriteFn !== "function") {
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
  next = rewriteFn(raw);
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

function editorApplySelectionAcc(acc) {
  acc = acc === "b" || acc === "#" || acc === "n" ? acc : "";
  return editorRunSelection(function (nodes, events) {
    var traits = editorTraitsFromEvents(events);
    var nextAcc = traits.accLit === acc && acc ? "" : acc;
    var i;
    for (i = 0; i < events.length; i++) {
      if (events[i].kind === "pitch") {
        events[i].replaceWith = editorPitchTextKept(
          events[i].letter,
          nextAcc,
          events[i].oct,
          events[i].durRaw,
          events[i].affix
        );
      } else if (events[i].kind === "stack") {
        events[i].replaceWith = editorMapStackText(events[i], function (p) {
          return editorPitchTextKept(p.letter, nextAcc, p.oct, p.durRaw, p.affix);
        });
      }
    }
    return true;
  }, "select");
}

function editorApplySelectionDuration(dur) {
  return editorRunSelection(function (nodes, events) {
    var i;
    var ev;
    for (i = 0; i < events.length; i++) {
      ev = events[i];
      if (ev.kind === "pitch") {
        ev.replaceWith = editorPitchText(ev.letter, ev.acc, ev.oct, dur, ev.dot, ev.affix);
      } else if (ev.kind === "rest") {
        ev.replaceWith = editorRestText(ev.dur, ev.dot);
      } else if (ev.kind === "slash") {
        ev.replaceWith = editorSlashText(ev.dur, ev.dot);
      } else if (ev.kind === "stack") {
        ev.replaceWith = editorMapStackText(ev, function (p) {
          return editorPitchText(p.letter, p.acc, p.oct, dur, p.dot, p.affix);
        });
      }
    }
    return true;
  }, "select");
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

/*
 * After Erase, park before } ] ) only when the next peel should be from the
 * closer: nothing left of the caret inside the group, or nothing to the right.
 * Mid-group leftward erase (music both sides) keeps the caret where the note
 * was so the next Backspace stays leftward.
 */
function editorSnapCaretBeforeGroupCloser(field, lineStart, preferred) {
  var value;
  var lineEnd;
  var line;
  var rel;
  var groups;
  var g;
  var i;
  var music;
  var musicLeft;
  var musicRight;
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
  if (!g || rel > g.closeStart) {
    return;
  }
  music = editorInnerMusicSpans(line, g);
  musicLeft = false;
  musicRight = false;
  for (i = 0; i < music.length; i++) {
    if (music[i].end <= rel) {
      musicLeft = true;
    }
    if (music[i].start >= rel) {
      musicRight = true;
    }
  }
  /* Notes on both sides: stay put for leftward erase. */
  if (musicLeft && musicRight) {
    return;
  }
  caret = lineStart + g.closeStart;
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

function editorClampTupletN(n) {
  n = parseInt(n, 10);
  if (EDITOR_TUPLET_CYCLE.indexOf(n) < 0) {
    return 3;
  }
  return n;
}

function editorTupletOpenText(n) {
  return "(" + editorClampTupletN(n || editorTupletN) + " ";
}

function editorEnclosingTupletNAtCaret() {
  var span = editorLineSpan();
  var line;
  var rel;
  var g;
  var open;
  var m;
  if (!span) {
    return 0;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  g = editorInnermostGroupAt(line, rel, "tuplet");
  if (!g) {
    return 0;
  }
  open = line.slice(g.open, g.openEnd);
  m = /^\((\d{1,2})/.exec(open);
  return m ? editorClampTupletN(m[1]) : 0;
}

function editorSyncTupletNFromCaret() {
  var span = editorLineSpan();
  var sel;
  var n;
  if (span) {
    sel = editorReadSelection(span.field);
    if (sel.start !== sel.end) {
      return;
    }
  }
  n = editorEnclosingTupletNAtCaret();
  if (n) {
    editorTupletN = n;
  }
}

/* Rewrite the innermost tuplet opener to (N ; drops a written :M ratio. */
function editorRewriteEnclosingTupletN(n, opts) {
  var span = editorLineSpan();
  var line;
  var rel;
  var g;
  var nextOpen;
  var oldOpen;
  var value;
  var delta;
  var silent;
  var caret;
  n = editorClampTupletN(n);
  if (!span) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  rel = span.caret - span.lineStart;
  if (rel < 0) {
    rel = 0;
  }
  g = editorInnermostGroupAt(line, rel, "tuplet");
  if (!g) {
    return false;
  }
  oldOpen = line.slice(g.open, g.openEnd);
  nextOpen = "(" + n;
  if (oldOpen === nextOpen) {
    return false;
  }
  if (!(opts && opts.skipUndo)) {
    editorPushSymbolUndo();
  }
  value = String(span.field.value || "");
  span.field.value =
    value.slice(0, span.lineStart + g.open) +
    nextOpen +
    value.slice(span.lineStart + g.openEnd);
  delta = nextOpen.length - oldOpen.length;
  caret = span.caret;
  if (caret > span.lineStart + g.open) {
    caret += delta;
  }
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, caret, caret, silent);
  clearEditorNotice();
  refreshEditor();
  return true;
}

function editorCloseTupletMenu() {
  if (!editorTupletMenuOpen) {
    return;
  }
  editorTupletMenuOpen = false;
  editorNotePadStamp = "";
  editorPaintNotePad();
}

function editorToggleTupletMenu() {
  editorTupletMenuOpen = !editorTupletMenuOpen;
  editorNotePadStamp = "";
  editorPaintNotePad();
}

/* Arm N from the combo; rewrite an enclosing tuplet opener when inside one. */
function editorSetTupletN(n) {
  var span;
  var sel;
  var line;
  var action;
  n = editorClampTupletN(n);
  editorTupletN = n;
  editorTupletMenuOpen = false;
  span = editorLineSpan();
  if (span) {
    sel = editorReadSelection(span.field);
    if (sel.start !== sel.end) {
      line = span.value.slice(span.lineStart, span.lineEnd);
      action = editorSelectionTupletAction(line, sel.start - span.lineStart, sel.end - span.lineStart);
      if (action.kind === "whole" && action.n !== n) {
        editorRewriteSelectionTuplet(n);
        return;
      }
    } else if (editorCaretInsideStructure("tuplet")) {
      editorRewriteEnclosingTupletN(n);
    }
  }
  editorNotePadStamp = "";
  editorPaintNotePad();
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
    return { open: editorTupletOpenText(), close: ")" };
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
    m = /^[A-G](?:#|b|n)?\d((?:[whqesn]\.{0,2}|\.)?)/.exec(spans[i].token);
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
  return editorWrapExistingGroup(stack, editorTupletOpenText(), ")");
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

/*
 * True when [start, end) covers every music event inside g and stays within
 * that shell — so a staff drag over all beamed notes counts as that beam.
 */
function editorSelectionCoversGroupInterior(line, start, end, g) {
  var music;
  var i;
  if (!g || start >= end) {
    return false;
  }
  if (start < g.open || end > g.closeEnd) {
    return false;
  }
  music = editorInnerMusicSpans(line, g);
  if (!music.length) {
    return false;
  }
  for (i = 0; i < music.length; i++) {
    if (music[i].start < start || music[i].end > end) {
      return false;
    }
  }
  return true;
}

/*
 * Exact shell selection, or a drag that covers all interior music of one group
 * (innermost when several match).
 */
function editorMatchingGroupSelection(line, start, end, kind) {
  var exact;
  var groups;
  var i;
  var g;
  var best;
  exact = editorExactGroupSelection(line, start, end, kind);
  if (exact) {
    return exact;
  }
  groups = editorFindBalancedGroups(line);
  best = null;
  for (i = 0; i < groups.length; i++) {
    g = groups[i];
    if (kind && g.kind !== kind) {
      continue;
    }
    if (!editorSelectionCoversGroupInterior(line, start, end, g)) {
      continue;
    }
    if (!best || g.closeEnd - g.open < best.closeEnd - best.open) {
      best = g;
    }
  }
  return best;
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

/*
 * Drop open/close of a group; keep the inner text (and a stack ]^… / ]_… label
 * glued after the last pitch). Selection covers the unwrapped span.
 */
function editorUnwrapStructureGroup(g) {
  var span = editorLineSpan();
  var line;
  var body;
  var affix;
  var edited;
  var value;
  var silent;
  var start;
  var end;
  if (!span || !g) {
    return false;
  }
  line = span.value.slice(span.lineStart, span.lineEnd);
  /* Tuplet open is "(3" / "(3 "; trim the gap so unwrap does not leave a lead space. */
  body = line.slice(g.innerStart, g.innerEnd).replace(/^\s+|\s+$/g, "");
  affix = "";
  if (g.kind === "stack" && g.closeEnd > g.closeStart + 1) {
    affix = line.slice(g.closeStart + 1, g.closeEnd);
  }
  edited = line.slice(0, g.open) + body + affix + line.slice(g.closeEnd);
  editorPushSymbolUndo();
  value = String(span.field.value || "");
  span.field.value = value.slice(0, span.lineStart) + edited + value.slice(span.lineEnd);
  start = span.lineStart + g.open;
  end = start + body.length + affix.length;
  silent = !!(editorPadCaret && editorSymbolsIsOpen());
  editorPlaceCaret(span.field, start, end, silent);
  clearEditorNotice();
  refreshEditor();
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
    /* Full shell or full interior selection unwraps / wraps that group. */
    if (start === g.open && end === g.closeEnd) {
      continue;
    }
    if (editorSelectionCoversGroupInterior(line, start, end, g)) {
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

function editorEventTokenDurationCode(tok) {
  var pitch;
  var rhythm;
  tok = String(tok || "");
  pitch = /^[A-G](?:#|b|n)?\d((?:[whqesn]\.{0,2})|\.)?/.exec(tok);
  if (pitch) {
    return String(pitch[1] || "q").replace(".", "");
  }
  rhythm = /^\/([whqes]?)(\.?)/.exec(tok) || /^r([whqes]?)(\.?)/i.exec(tok);
  if (rhythm) {
    return rhythm[1] || "q";
  }
  return "";
}

function editorBeamPieceTextIsShort(text) {
  var groups;
  var spans;
  var i;
  var code;
  text = String(text || "");
  if (text.charAt(0) === "[") {
    groups = editorFindBalancedGroups(text);
    if (groups.length && groups[0].kind === "stack") {
      return editorStackAllShort(text, groups[0]);
    }
  }
  spans = editorMusicEventSpans(text.replace(/^\{/, "").replace(/\}$/, ""));
  if (!spans.length) {
    return true;
  }
  for (i = 0; i < spans.length; i++) {
    if (!editorIsMusicEraseToken(spans[i].token)) {
      continue;
    }
    code = editorEventTokenDurationCode(spans[i].token);
    if (code !== "e" && code !== "s") {
      return false;
    }
  }
  return true;
}

/* Peel one beam piece out (or split the braces). Does not push undo. */
function editorPeelOneBeamPiece(line, beam, pieceIdx) {
  var pieces;
  var before;
  var after;
  var i;
  var mid;
  var replacement;
  pieces = editorBeamPieces(line, beam);
  if (pieceIdx < 0 || pieceIdx >= pieces.length) {
    return line;
  }
  before = [];
  after = [];
  for (i = 0; i < pieceIdx; i++) {
    before.push(pieces[i].text);
  }
  for (i = pieceIdx + 1; i < pieces.length; i++) {
    after.push(pieces[i].text);
  }
  mid = pieces[pieceIdx].text;
  replacement = [editorFormatBeamShell(before), mid, editorFormatBeamShell(after)]
    .filter(Boolean)
    .join(" ");
  return line.slice(0, beam.open) + replacement + line.slice(beam.closeEnd);
}

/* After a long duration rewrite, pull non-e/s pieces out of {} beams. */
function editorPeelLongPiecesFromBeams(line) {
  var guard = 0;
  var groups;
  var b;
  var pieces;
  var i;
  var peeled;
  line = String(line || "");
  while (guard < 48) {
    guard += 1;
    peeled = false;
    groups = editorFindBalancedGroups(line);
    for (b = 0; b < groups.length; b++) {
      if (groups[b].kind !== "beam") {
        continue;
      }
      pieces = editorBeamPieces(line, groups[b]);
      for (i = 0; i < pieces.length; i++) {
        if (!editorBeamPieceTextIsShort(pieces[i].text)) {
          line = editorPeelOneBeamPiece(line, groups[b], i);
          peeled = true;
          break;
        }
      }
      if (peeled) {
        break;
      }
    }
    if (!peeled) {
      break;
    }
  }
  return line.replace(/[ \t]{2,}/g, " ").replace(/^\s+|\s+$/g, "");
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

/* Wrap the enclosing beam as (N {…}). */
function editorWrapEnclosingBeamAsTuplet() {
  var span = editorLineSpan();
  var line;
  var rel;
  var beam;
  var value;
  var silent;
  var caret;
  var open = editorTupletOpenText();
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
    probe = editorTupletOpenText() + trimmed + ")";
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
    return "/" + short + editorDotMarks(editorNote.dot, hit.token);
  }
  if (hit.kind !== "pitch") {
    return hit.token;
  }
  parsed = /^([A-G])(#|b|n)?(\d)((?:[whqesn]\.{0,2})|\.)?$/.exec(hit.token || "");
  if (!parsed) {
    return hit.token;
  }
  base = String(parsed[4] || "").replace(/\./g, "");
  if (base === "e" || base === "s") {
    return hit.token;
  }
  return parsed[1] + (parsed[2] || "") + parsed[3] + short + editorDotMarks(editorNote.dot, hit.token);
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
 * wraps the note (or selection) or opens an empty shell; second tap on an empty
 * shell removes it, otherwise closes (caret after the closer). Selecting the
 * whole shell and tapping again unwraps it. A tap with the caret just after
 * that shell re-enters instead of opening another group.
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
    exact = editorInnermostGroupAt(line, rel, kind);
    if (exact && editorStructureInnerEmpty(line, exact)) {
      editorPushSymbolUndo();
      editorRemoveStructureShell(exact);
      clearEditorNotice();
      refreshEditor();
      editorPaintNotePad();
      return;
    }
    editorCloseStructure(kind);
    return;
  }
  if (sel.start !== sel.end && kind === "tuplet") {
    exact = editorSelectionTupletAction(line, rel, endRel);
    if (exact.kind === "partial" || exact.kind === "blocked") {
      editorPaintNotePad();
      return;
    }
    if (exact.kind === "whole" && exact.n !== editorClampTupletN(editorTupletN)) {
      editorRewriteSelectionTuplet(editorTupletN);
      return;
    }
  }
  if (sel.start !== sel.end) {
    exact = editorMatchingGroupSelection(line, rel, endRel, kind);
    if (exact) {
      editorUnwrapStructureGroup(exact);
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
    exact = editorMatchingGroupSelection(line, rel, endRel, "beam") ||
      editorMatchingGroupSelection(line, rel, endRel, "stack");
    if (exact && editorWrapExistingGroup(exact, editorTupletOpenText(), ")")) {
      return;
    }
  }
  if (sel.start === sel.end && (kind === "beam" || kind === "tuplet") && editorRelInsideStructure(line, rel, "stack")) {
    if (editorProperOrderFromStack(kind)) {
      return;
    }
  }
  if (sel.start === sel.end && editorStructureParentBlocks(kind, line, rel)) {
    editorNotice(t("edit.refuseWrap"));
    editorPaintNotePad();
    return;
  }
  if (editorStructureWouldNest(kind)) {
    editorNotice(t("edit.refuseNest"));
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
    editorNotice(t("edit.refuseWrap"));
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
  edited = editorHealStaffLineAfterErase(linePart.slice(0, relStart) + linePart.slice(relEnd));
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
  var traits = editorStaffPadTraits();
  var hit = editorPitchAtCaret();
  var litAcc =
    traits && (traits.selection || traits.onEvent)
      ? traits.accLit || ""
      : hit
        ? hit.acc || ""
        : editorNote.acc || "";
  editorPadButton(row, { "data-acc": "b" }, editorMusicIcon("acc-b"), t("sym.flat"), litAcc === "b");
  editorPadButton(row, { "data-acc": "#" }, editorMusicIcon("acc-#"), t("sym.sharp"), litAcc === "#");
  editorPadButton(row, { "data-acc": "n" }, editorMusicIcon("acc-n"), t("sym.natural"), litAcc === "n");
  editorPaintIntervalStepper(row);
}

/* ↓ · 8ve · ↑ . The middle picks the interval. With no selection it stays an octave. */
function editorPaintIntervalStepper(row) {
  var group = document.createElement("div");
  var current = editorMoveInterval();
  var face;
  var menu;
  var i;
  var item;
  var name;
  group.className = "edit-note-octave-group edit-note-interval-group" + (editorMoveMenuOpen ? " is-open" : "");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", t("edit.move"));
  editorPadButton(group, { "data-move-by": "-1" }, "\u2193", t("edit.moveDown").replace("{n}", current.short));
  face = document.createElement("button");
  face.type = "button";
  face.className = "edit-note-interval";
  face.setAttribute("data-move-menu", "1");
  face.setAttribute("aria-expanded", editorMoveMenuOpen ? "true" : "false");
  face.setAttribute("aria-label", t(current.name));
  face.title = t(current.name);
  face.textContent = current.short;
  group.appendChild(face);
  editorPadButton(group, { "data-move-by": "1" }, "\u2191", t("edit.moveUp").replace("{n}", current.short));
  if (editorMoveMenuOpen) {
    menu = document.createElement("span");
    menu.className = "edit-interval-menu";
    menu.setAttribute("role", "listbox");
    for (i = 0; i < EDITOR_MOVE_INTERVALS.length; i++) {
      item = EDITOR_MOVE_INTERVALS[i];
      name = t(item.name);
      editorPadButton(
        menu,
        { "data-move-pick": String(item.semis), role: "option" },
        item.short,
        name,
        item.semis === current.semis
      );
    }
    group.appendChild(menu);
  }
  row.appendChild(group);
}

function editorClearSymbolHistory() {
  editorSymbolUndo = [];
  editorSymbolRedo = [];
  editorLastValidSnap = null;
  editorLastValidRenderKey = null;
  editorStaffTypingDirty = false;
  editorControlUndoSnap = null;
  editorNameUndoArmed = false;
  editorPaintUndoRedo();
}

function editorArmControlUndo() {
  editorControlUndoSnap = editorCloneSymbolSnap(editorSymbolSnapshot());
}

function editorCommitControlUndo() {
  var now;
  if (!editorControlUndoSnap) {
    return;
  }
  now = editorSymbolSnapshot();
  if (editorDraftFieldsEqual(editorControlUndoSnap, now)) {
    editorControlUndoSnap = null;
    return;
  }
  editorSymbolUndo.push(editorControlUndoSnap);
  if (editorSymbolUndo.length > EDITOR_SYMBOL_HISTORY) {
    editorSymbolUndo.shift();
  }
  editorSymbolRedo = [];
  editorControlUndoSnap = null;
  editorPaintUndoRedo();
}

function editorDraftFieldsEqual(a, b) {
  if (!a || !b) {
    return !a && !b;
  }
  return (
    String(a.name || "") === String(b.name || "") &&
    (a.bars || 1) === (b.bars || 1) &&
    !!a.staff === !!b.staff &&
    String(a.clef || "") === String(b.clef || "") &&
    String(a.key || "") === String(b.key || "") &&
    editorMeterEqual(a.meter || null, b.meter || null) &&
    String(a.doc || "") === String(b.doc || "")
  );
}

function editorSymbolSnapshot() {
  var field = editorActiveField();
  var area = document.getElementById("allEdit");
  var nameField = document.getElementById("editName");
  var defaults;
  if (editorIsFocusMode()) {
    editorSyncFocusToArea();
  }
  defaults = editorReadDefaults();
  return {
    doc: area ? String(area.value || "") : "",
    value: field ? String(field.value || "") : "",
    caret: field ? editorReadSelection(field).start : 0,
    selEnd: field ? editorReadSelection(field).end : 0,
    focusIndex: editorFocusIndex,
    note: {
      acc: editorNote.acc || "",
      dur: editorNote.dur || "",
      dot: !!editorNote.dot,
      dots: editorNote.dots === 2 ? 2 : editorNote.dot ? 1 : 0,
      oct: editorNote.oct === null || editorNote.oct === undefined ? null : editorNote.oct
    },
    name: nameField ? String(nameField.value || "") : "",
    bars: editorReadBars(),
    staff: editorStaffOn(),
    clef: defaults.clef || "",
    key: defaults.key || "",
    meter: defaults.meter
      ? { beats: defaults.meter.beats, unit: defaults.meter.unit }
      : null
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
    selEnd: typeof snap.selEnd === "number" ? snap.selEnd : snap.caret || 0,
    focusIndex: typeof snap.focusIndex === "number" ? snap.focusIndex : 0,
    note: {
      acc: snap.note && snap.note.acc ? snap.note.acc : "",
      dur: snap.note && snap.note.dur ? snap.note.dur : "",
      dot: !!(snap.note && snap.note.dot),
      oct: snap.note && (snap.note.oct === 0 || snap.note.oct) ? snap.note.oct : null
    },
    name: typeof snap.name === "string" ? snap.name : "",
    bars: typeof snap.bars === "number" ? snap.bars : 1,
    staff: !!snap.staff,
    clef: snap.clef || "",
    key: snap.key || "",
    meter: snap.meter ? { beats: snap.meter.beats, unit: snap.meter.unit } : null
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
  var nameField;
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
      editorPlaceCaret(
        field,
        snap.caret || 0,
        typeof snap.selEnd === "number" ? snap.selEnd : snap.caret || 0,
        !!(editorPadCaret && editorSymbolsIsOpen())
      );
    }
  } else {
    field = document.getElementById("allEdit");
    if (field) {
      field.value = doc !== null ? doc : (snap.value || "");
      editorPlaceCaret(
        field,
        snap.caret || 0,
        typeof snap.selEnd === "number" ? snap.selEnd : snap.caret || 0,
        !!(editorPadCaret && editorSymbolsIsOpen())
      );
    }
  }
  editorNote.acc = snap.note && snap.note.acc ? snap.note.acc : "";
  editorNote.dur = snap.note && snap.note.dur ? snap.note.dur : "";
  editorNote.dot = !!(snap.note && snap.note.dot);
  editorNote.dots = snap.note && snap.note.dots ? snap.note.dots : editorNote.dot ? 1 : 0;
  editorNote.oct = snap.note && (snap.note.oct === 0 || snap.note.oct) ? snap.note.oct : null;
  if (typeof snap.name === "string") {
    nameField = document.getElementById("editName");
    if (nameField) {
      nameField.value = snap.name;
    }
    syncEditorFaceName();
  }
  if (typeof snap.bars === "number") {
    editorWriteBars(snap.bars);
  }
  if (typeof snap.staff === "boolean" && snap.staff !== editorStaffOn()) {
    setEditorStaff(snap.staff);
  }
  editorApplyDefaultsUi({
    clef: snap.clef || "",
    key: snap.key || "",
    meter: snap.meter || null
  });
  editorSyncStaffDefaults();
  editorNotePadStamp = "";
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
  var traits = editorStaffPadTraits();
  var lit;
  var litDot;
  if (traits && (traits.selection || traits.onEvent)) {
    lit = traits.dur;
    litDot = !!traits.dot;
  } else {
    lit = editorDurCode(editorNote.dur);
    litDot = !!editorNote.dot;
  }
  var choices = [
    ["w", "dur-w", "edit.noteWhole"],
    ["h", "dur-h", "edit.noteHalf"],
    ["", "dur-", "edit.noteQuarter"],
    ["e", "dur-e", "edit.noteEighth"],
    ["s", "dur-s", "edit.noteSixteenth"]
  ];
  var i;
  for (i = 0; i < choices.length; i++) {
    editorPadButton(
      row,
      { "data-dur": choices[i][0] },
      editorMusicIcon(choices[i][1]),
      t(choices[i][2]),
      lit !== null && lit !== undefined && lit === choices[i][0]
    );
  }
  editorPadButton(row, { "data-dot": "1" }, editorMusicIcon("dur-" + (lit || "q") + "."), t("edit.noteDotted"), litDot);
}

function editorPaintNoteEvents(row) {
  var rhythm = editorShownRhythmSuffix();
  editorPadButton(row, { "data-event": "slash" }, editorMusicIcon("slash-" + rhythm), t("edit.noteSlash") + " /" + rhythm);
  editorPadButton(row, { "data-event": "rest" }, editorMusicIcon("rest-" + rhythm), t("edit.noteRest") + " r" + rhythm);
  editorPadButton(row, { "data-event": "bar" }, editorMusicIcon("bar"), t("edit.noteBar"), editorCaretHasBarMark());
  editorPadButton(row, { "data-event": "tie" }, editorMusicIcon("tie"), t("edit.noteTie"), editorCaretHasTieMark());
  editorPadButton(
    row,
    { "data-event": "beam" },
    editorMusicIcon("beam"),
    t("edit.noteBeam"),
    editorStructureButtonLit("beam")
  );
  editorPaintTupletCombo(row);
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
    editorStructureButtonLit("stack")
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
  editorSyncTupletNFromCaret();
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
  if (editorApplySelectionLetter(letter, opts)) {
    return;
  }
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
        editorNotice(t("edit.refuseStackFull"));
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
  if (editorApplySelectionAcc(acc)) {
    editorNote.acc = "";
    return;
  }
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
  var m = /^([A-G])(#|b|n)?(\d)((?:[whqesn]\.{0,2})|\.)?(.*)$/.exec(tok || "");
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
    m = /^[A-G](?:#|b|n)?\d((?:[whqesn]\.{0,2})|\.)?/.exec(spans[i].token);
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
  if (editorApplySelectionDuration(next)) {
    return;
  }
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
  var traits = editorStaffPadTraits();
  var next;
  var hit;
  if (traits && traits.selection) {
    next = !traits.dot;
    editorNote.dot = next;
    editorNote.dots = next ? 1 : 0;
    editorApplySelectionDot(next);
    return;
  }
  next = !editorNote.dot;
  editorNote.dot = next;
  editorNote.dots = next ? 1 : 0;
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
    editorNotice(t("edit.refuseTieRest"));
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
    refreshEditor();
    editorPaintNotePad();
    editorAllowLabelTyping();
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
      refreshEditor();
      editorPaintNotePad();
      editorAllowLabelTyping();
      return;
    }
  }
  editorInsertSymbol("^");
  editorAllowLabelTyping();
}

/*
 * Transpose on Add always copies the whole example. Move appears only while a
 * passage is selected and shifts that passage by an interval inside the octave.
 * Octave arrows stay a register nudge.
 * Letter chord roots move. Roman numerals, degree numbers, tempo, and captions stay.
 * A copy is spelled in the destination key and carries @key=. A selection stays
 * in the example's key. Ties pull the other end along. A note past octave 0–9,
 * or a stack that would share one pitch, is refused.
 */
var EDITOR_LETTER_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
var EDITOR_SHARP_PC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var EDITOR_FLAT_PC = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
/* One name per pitch class, matching the key control and the fourths/fifths pivot (F# / Db). */
var EDITOR_MAJOR_BY_PC = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
var EDITOR_MINOR_BY_PC = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "Abm", "Am", "Bbm", "Bm"];
var EDITOR_TRANSPOSE_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F", "Am", "Em", "Bm", "F#m", "Cm", "Gm", "Dm", "Fm"];
var EDITOR_TRANSPOSE_MOVES = [
  { semis: 5, up: "edit.upFourth", down: "edit.downFourth" },
  { semis: 7, up: "edit.upFifth", down: "edit.downFifth" },
  { semis: 2, up: "edit.upStep", down: "edit.downStep" },
  { semis: 1, up: "edit.upHalf", down: "edit.downHalf" }
];
/* Intervals inside the octave. short is the face; the octave itself stays on the other arrows. */
var EDITOR_MOVE_INTERVALS = [
  { semis: 1, short: "m2", name: "edit.ivlHalf" },
  { semis: 2, short: "M2", name: "edit.ivlStep" },
  { semis: 3, short: "m3", name: "edit.ivlMin3" },
  { semis: 4, short: "M3", name: "edit.ivlMaj3" },
  { semis: 5, short: "P4", name: "edit.ivlFourth" },
  { semis: 6, short: "TT", name: "edit.ivlTritone" },
  { semis: 7, short: "P5", name: "edit.ivlFifth" },
  { semis: 8, short: "m6", name: "edit.ivlMin6" },
  { semis: 9, short: "M6", name: "edit.ivlMaj6" },
  { semis: 10, short: "m7", name: "edit.ivlMin7" },
  { semis: 11, short: "M7", name: "edit.ivlMaj7" },
  { semis: 12, short: "8ve", name: "edit.ivlOctave" }
];
var EDITOR_PITCH_HEAD = /^([A-Ga-g])(##|bb|\uD834\uDD2A|\uD834\uDD2B|x|X|#|b|n|\u266F|\u266D|\u266E)?(\d)([whqesn]?)(\.{0,2})(!?)/;

function editorKeyPitch(raw) {
  var s = String(raw || "C").replace(/\u266F/g, "#").replace(/\u266D/g, "b").replace(/^\s+|\s+$/g, "");
  var m = /^([A-Ga-g])([#b]?)(m)?$/.exec(s);
  var letter;
  var alt;
  if (!m) {
    return { pc: 0, minor: false };
  }
  letter = m[1].toUpperCase();
  alt = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return {
    pc: (EDITOR_LETTER_SEMI[letter] + alt + 12) % 12,
    minor: !!m[3]
  };
}

function editorDestinationKey(sourceRaw, semitones) {
  var info = editorKeyPitch(sourceRaw);
  var pc = (((info.pc + semitones) % 12) + 12) % 12;
  return info.minor ? EDITOR_MINOR_BY_PC[pc] : EDITOR_MAJOR_BY_PC[pc];
}

/* Shortest route, -5..+6. A tritone goes up. */
function editorStepsBetweenKeys(fromRaw, toRaw) {
  var from = editorKeyPitch(fromRaw);
  var to = editorKeyPitch(toRaw);
  var up = (to.pc - from.pc + 12) % 12;
  if (up > 6) {
    return up - 12;
  }
  return up;
}

function editorSpellMajor(keyRaw) {
  var parsed;
  if (typeof staffParseKeyName === "function") {
    parsed = staffParseKeyName(keyRaw);
    if (parsed) {
      return parsed;
    }
  }
  return "C";
}

function editorKeyFlats(majorName) {
  var key = typeof STAFF_MAJOR_KEYS !== "undefined" ? STAFF_MAJOR_KEYS[majorName] : null;
  return !!(key && key.kind === "flat");
}

function editorAccValue(raw) {
  var acc = typeof staffNormAccidental === "function" ? staffNormAccidental(raw || "") : raw || "";
  if (acc === "##") {
    return 2;
  }
  if (acc === "#") {
    return 1;
  }
  if (acc === "bb") {
    return -2;
  }
  if (acc === "b") {
    return -1;
  }
  return 0;
}

function editorPitchAbs(letter, acc, oct) {
  return oct * 12 + EDITOR_LETTER_SEMI[letter] + editorAccValue(acc);
}

function editorSpellPc(semi, flats) {
  var pc = ((semi % 12) + 12) % 12;
  return (flats ? EDITOR_FLAT_PC : EDITOR_SHARP_PC)[pc];
}

function editorSpellAbs(abs, flats) {
  var pc;
  var name;
  var letter;
  var acc;
  var alt;
  var oct;
  if (abs < 0) {
    return null;
  }
  pc = abs % 12;
  name = (flats ? EDITOR_FLAT_PC : EDITOR_SHARP_PC)[pc];
  letter = name.charAt(0);
  acc = name.slice(1);
  alt = acc === "#" ? 1 : acc === "b" ? -1 : 0;
  oct = (abs - EDITOR_LETTER_SEMI[letter] - alt) / 12;
  if (Math.abs(oct - Math.round(oct)) > 0.001 || oct < 0 || oct > 9) {
    return null;
  }
  return { letter: letter, acc: acc, oct: oct };
}

function editorChordRoman(raw) {
  var s = String(raw || "");
  s = s.replace(
    /^(?:bb|##|\uD834\uDD2B|\uD834\uDD2A|\u266D\u266D|\u266F\u266F|b|#|\u266D|\u266F|\u266E|x|X)/,
    ""
  );
  return /^(?:III|II|IV|VII|VI|V|I|iii|ii|iv|vii|vi|v|i)/.test(s);
}

function editorTransposeChordRaw(raw, semitones, flats) {
  var m;
  var rest;
  var slash;
  var bassMatch;
  var root;
  var bass;
  if (!raw || (typeof staffTempoLabel === "function" && staffTempoLabel(raw))) {
    return raw;
  }
  if (editorChordRoman(raw)) {
    return raw;
  }
  m = /^([A-Ga-g])(##|bb|x|X|#|b|\u266F|\u266D|\uD834\uDD2A|\uD834\uDD2B)?([\s\S]*)$/.exec(raw);
  if (!m) {
    return raw;
  }
  rest = m[3] || "";
  root = editorSpellPc(
    EDITOR_LETTER_SEMI[m[1].toUpperCase()] + editorAccValue(m[2]) + semitones,
    flats
  );
  slash = rest.indexOf("/");
  if (slash >= 0) {
    bassMatch = /^([A-Ga-g])(##|bb|x|X|#|b|\u266F|\u266D|\uD834\uDD2A|\uD834\uDD2B)?/.exec(
      rest.slice(slash + 1)
    );
    if (bassMatch) {
      bass = editorSpellPc(
        EDITOR_LETTER_SEMI[bassMatch[1].toUpperCase()] + editorAccValue(bassMatch[2]) + semitones,
        flats
      );
      rest =
        rest.slice(0, slash + 1) + bass + rest.slice(slash + 1 + bassMatch[0].length);
    }
  }
  return root + rest;
}

function editorStripUnmatchedClose(raw) {
  var opens = 0;
  var closes = 0;
  var i;
  for (i = 0; i < raw.length; i++) {
    if (raw.charAt(i) === "(") {
      opens++;
    } else if (raw.charAt(i) === ")") {
      closes++;
    }
  }
  if (closes > opens && raw.charAt(raw.length - 1) === ")") {
    return raw.slice(0, -1);
  }
  return raw;
}

/* tokenStart: a chord word until whitespace. Otherwise an affix until _ or the next mark. */
function editorReadChord(text, i, tokenStart) {
  var j = i + 1;
  var raw = "";
  var depth = 0;
  var ch;
  if (tokenStart) {
    while (j < text.length && !/\s/.test(text.charAt(j))) {
      raw += text.charAt(j);
      j++;
    }
    raw = editorStripUnmatchedClose(raw);
    return { start: i, end: i + 1 + raw.length, raw: raw };
  }
  while (j < text.length) {
    ch = text.charAt(j);
    if (ch === "(") {
      depth++;
      raw += ch;
      j++;
      continue;
    }
    if (ch === ")") {
      if (depth === 0) {
        break;
      }
      depth--;
      raw += ch;
      j++;
      continue;
    }
    if (
      depth === 0 &&
      (/\s/.test(ch) || ch === "_" || ch === "'" || ch === ">" || ch === "-" || ch === "^" || ch === "]" || ch === "}")
    ) {
      break;
    }
    raw += ch;
    j++;
  }
  return { start: i, end: j, raw: raw };
}

function editorTransposeBoundary(text, i) {
  var prev;
  if (i <= 0) {
    return true;
  }
  prev = text.charAt(i - 1);
  return /[\s|[{~()\]}]/.test(prev);
}

function editorScanTranspose(music) {
  var i = 0;
  var pitches = [];
  var chords = [];
  var ties = [];
  var tokenStart = true;
  var stackId = 0;
  var stackDepth = 0;
  var ch;
  var chord;
  var head;
  while (i < music.length) {
    ch = music.charAt(i);
    if (/\s/.test(ch)) {
      tokenStart = true;
      i++;
      continue;
    }
    if (tokenStart && ch === "@") {
      while (i < music.length && !/\s/.test(music.charAt(i))) {
        i++;
      }
      tokenStart = false;
      continue;
    }
    if (ch === "[") {
      stackDepth++;
      stackId++;
      tokenStart = false;
      i++;
      continue;
    }
    if (ch === "]") {
      if (stackDepth > 0) {
        stackDepth--;
      }
      tokenStart = false;
      i++;
      continue;
    }
    if (ch === "^") {
      chord = editorReadChord(music, i, tokenStart);
      if (chord.raw) {
        chords.push(chord);
      }
      i = chord.end;
      tokenStart = false;
      continue;
    }
    if (ch === "~") {
      ties.push(i);
      tokenStart = false;
      i++;
      continue;
    }
    if (editorTransposeBoundary(music, i)) {
      head = EDITOR_PITCH_HEAD.exec(music.slice(i));
      if (head) {
        pitches.push({
          start: i,
          end: i + head[0].length,
          letter: head[1].toUpperCase(),
          acc: head[2] || "",
          oct: parseInt(head[3], 10),
          dur: head[4] || "",
          dots: head[5] || "",
          bang: head[6] || "",
          stack: stackDepth > 0 ? stackId : 0
        });
        i += head[0].length;
        tokenStart = false;
        continue;
      }
    }
    tokenStart = false;
    i++;
  }
  return { pitches: pitches, chords: chords, ties: ties };
}

function editorTransposeAttacks(pitches) {
  var attacks = [];
  var i;
  var p;
  var last;
  for (i = 0; i < pitches.length; i++) {
    p = pitches[i];
    last = attacks.length ? attacks[attacks.length - 1] : null;
    if (p.stack && last && last.stack === p.stack) {
      last.indexes.push(i);
      last.end = p.end;
      continue;
    }
    attacks.push({ stack: p.stack, indexes: [i], start: p.start, end: p.end });
  }
  return attacks;
}

function editorAttackBefore(attacks, tieAt) {
  var i;
  var best = null;
  for (i = 0; i < attacks.length; i++) {
    if (attacks[i].end <= tieAt) {
      best = attacks[i];
    }
  }
  return best;
}

function editorAttackAfter(attacks, tieAt) {
  var i;
  for (i = 0; i < attacks.length; i++) {
    if (attacks[i].start > tieAt) {
      return attacks[i];
    }
  }
  return null;
}

function editorMapTransposeIndex(index, reps) {
  var delta = 0;
  var i;
  var rep;
  for (i = 0; i < reps.length; i++) {
    rep = reps[i];
    if (rep.end <= index) {
      delta += rep.text.length - (rep.end - rep.start);
    } else if (rep.start < index && index < rep.end) {
      return rep.start + delta + rep.text.length;
    }
  }
  return index + delta;
}

function editorApplyTransposeReps(music, reps) {
  var ordered = reps.slice().sort(function (a, b) {
    return b.start - a.start;
  });
  var out = music;
  var i;
  for (i = 0; i < ordered.length; i++) {
    out = out.slice(0, ordered[i].start) + ordered[i].text + out.slice(ordered[i].end);
  }
  return out;
}

/* range null rewrites the whole line. Otherwise only pitches the range covers, plus tied partners. */
function editorTransposeMusic(text, semitones, majorKey, range) {
  var dot = " \u00B7 ";
  var captionAt = String(text || "").indexOf(dot);
  var music = captionAt < 0 ? String(text || "") : String(text || "").slice(0, captionAt);
  var caption = captionAt < 0 ? "" : String(text || "").slice(captionAt);
  var useRange = null;
  var flats;
  var scanned;
  var pitches;
  var include;
  var attacks;
  var i;
  var grew;
  var guard;
  var before;
  var after;
  var onBefore;
  var onAfter;
  var n;
  var seen;
  var abs;
  var stackKey;
  var reps;
  var anchors;
  var head;
  var chordText;
  var between;
  var glued;
  var lo;
  var hi;
  var ns;
  var ne;
  var changed;
  if (range) {
    useRange = {
      start: range.start < 0 ? 0 : range.start,
      end: range.end > music.length ? music.length : range.end
    };
    if (useRange.end < useRange.start) {
      useRange.end = useRange.start;
    }
  }
  flats = editorKeyFlats(majorKey || "C");
  scanned = editorScanTranspose(music);
  pitches = scanned.pitches;
  include = [];
  for (i = 0; i < pitches.length; i++) {
    include.push(!useRange || (pitches[i].start < useRange.end && pitches[i].end > useRange.start));
  }
  attacks = editorTransposeAttacks(pitches);
  grew = true;
  guard = 0;
  while (grew && guard < 16) {
    grew = false;
    guard++;
    for (i = 0; i < scanned.ties.length; i++) {
      before = editorAttackBefore(attacks, scanned.ties[i]);
      after = editorAttackAfter(attacks, scanned.ties[i]);
      if (!before || !after) {
        continue;
      }
      onBefore = false;
      onAfter = false;
      for (n = 0; n < before.indexes.length; n++) {
        if (include[before.indexes[n]]) {
          onBefore = true;
        }
      }
      for (n = 0; n < after.indexes.length; n++) {
        if (include[after.indexes[n]]) {
          onAfter = true;
        }
      }
      if (onBefore === onAfter) {
        continue;
      }
      before = onBefore ? after : before;
      for (n = 0; n < before.indexes.length; n++) {
        if (!include[before.indexes[n]]) {
          include[before.indexes[n]] = true;
          grew = true;
        }
      }
    }
  }
  seen = {};
  for (i = 0; i < pitches.length; i++) {
    abs = editorPitchAbs(pitches[i].letter, pitches[i].acc, pitches[i].oct);
    if (include[i]) {
      pitches[i].spelled = editorSpellAbs(abs + semitones, flats);
      if (!pitches[i].spelled) {
        return { ok: false, reason: "range", text: text, changed: false, selStart: 0, selEnd: 0 };
      }
      abs += semitones;
    }
    if (!pitches[i].stack) {
      continue;
    }
    stackKey = String(pitches[i].stack);
    if (!seen[stackKey]) {
      seen[stackKey] = {};
    }
    if (seen[stackKey][abs]) {
      return { ok: false, reason: "stack", text: text, changed: false, selStart: 0, selEnd: 0 };
    }
    seen[stackKey][abs] = true;
  }
  reps = [];
  anchors = [];
  for (i = 0; i < pitches.length; i++) {
    if (!include[i]) {
      continue;
    }
    head =
      pitches[i].spelled.letter +
      pitches[i].spelled.acc +
      String(pitches[i].spelled.oct) +
      pitches[i].dur +
      pitches[i].dots +
      pitches[i].bang;
    anchors.push({ start: pitches[i].start, end: pitches[i].end, text: head });
    if (head !== music.slice(pitches[i].start, pitches[i].end)) {
      reps.push({ start: pitches[i].start, end: pitches[i].end, text: head });
    }
  }
  for (i = 0; i < scanned.chords.length; i++) {
    glued = !useRange || (scanned.chords[i].start < useRange.end && scanned.chords[i].end > useRange.start);
    if (!glued) {
      for (n = 0; n < pitches.length; n++) {
        if (!include[n] || scanned.chords[i].start < pitches[n].end) {
          continue;
        }
        if (scanned.chords[i].start - pitches[n].end > 8) {
          continue;
        }
        between = music.slice(pitches[n].end, scanned.chords[i].start);
        if (/^[\]'>\-]*$/.test(between)) {
          glued = true;
        }
      }
    }
    if (!glued) {
      continue;
    }
    chordText = "^" + editorTransposeChordRaw(scanned.chords[i].raw, semitones, flats);
    anchors.push({ start: scanned.chords[i].start, end: scanned.chords[i].end, text: chordText });
    if (chordText !== music.slice(scanned.chords[i].start, scanned.chords[i].end)) {
      reps.push({ start: scanned.chords[i].start, end: scanned.chords[i].end, text: chordText });
    }
  }
  changed = reps.length > 0;
  lo = null;
  hi = null;
  for (i = 0; i < anchors.length; i++) {
    ns = editorMapTransposeIndex(anchors[i].start, reps);
    ne = ns + anchors[i].text.length;
    if (lo === null || ns < lo) {
      lo = ns;
    }
    if (hi === null || ne > hi) {
      hi = ne;
    }
  }
  if (lo === null) {
    lo = useRange ? useRange.start : 0;
    hi = useRange ? useRange.end : 0;
  }
  return {
    ok: true,
    text: editorApplyTransposeReps(music, reps) + caption,
    changed: changed,
    selStart: lo,
    selEnd: hi,
    reason: ""
  };
}

function editorStampLineKey(line, keyName) {
  var dot = " \u00B7 ";
  var at = String(line || "").indexOf(dot);
  var music = at < 0 ? String(line || "") : String(line || "").slice(0, at);
  var caption = at < 0 ? "" : String(line || "").slice(at);
  var lead;
  var clef;
  if (/@key=\S+/.test(music)) {
    music = music.replace(/@key=\S+/, "@key=" + keyName);
  } else {
    clef = /^(\s*)(@(?:bass|treble)\b\s*)/.exec(music);
    if (clef) {
      music = clef[1] + clef[2] + "@key=" + keyName + " " + music.slice(clef[0].length);
    } else {
      lead = /^(\s*)/.exec(music);
      music = (lead ? lead[1] : "") + "@key=" + keyName + " " + music.slice(lead ? lead[1].length : 0);
    }
  }
  return music + caption;
}

function editorExampleKeyRaw(line) {
  var m = /@key=(\S+)/.exec(String(line || ""));
  var key;
  if (m) {
    return m[1].replace(/\u266F/g, "#").replace(/\u266D/g, "b");
  }
  key = editorReadDefaults().key || "";
  return key || "C";
}

function editorTransposeBounds(field) {
  var value = String(field.value || "");
  var sel = editorReadSelection(field);
  var start = sel.start;
  var end = sel.end;
  var swap;
  var anchor;
  var lineStart;
  var lineEnd;
  if (start > end) {
    swap = start;
    start = end;
    end = swap;
  }
  if (!editorIsFocusMode() && value.slice(start, end).indexOf("\n") >= 0) {
    return { cross: true };
  }
  if (editorIsFocusMode()) {
    return { value: value, lineStart: 0, lineEnd: value.length, selStart: start, selEnd: end };
  }
  anchor = start;
  lineStart = value.lastIndexOf("\n", anchor - 1) + 1;
  lineEnd = value.indexOf("\n", anchor);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  return { value: value, lineStart: lineStart, lineEnd: lineEnd, selStart: start, selEnd: end };
}

function editorTransposeScope() {
  var field = editorActiveField();
  var bounds;
  if (!field) {
    return { whole: true, line: "" };
  }
  bounds = editorTransposeBounds(field);
  if (!bounds || bounds.cross) {
    return { whole: !bounds || !!bounds.cross ? false : true, line: "", cross: !!(bounds && bounds.cross) };
  }
  return {
    whole: bounds.selStart === bounds.selEnd,
    line: bounds.value.slice(bounds.lineStart, bounds.lineEnd),
    cross: false
  };
}

function editorKeyFace(name) {
  return String(name || "C").replace(/#/g, "\u266F").replace(/b/g, "\u266D");
}

function editorTransposeLineIndex(bounds) {
  var i;
  var n = 0;
  if (editorIsFocusMode()) {
    return editorFocusIndex;
  }
  for (i = 0; i < bounds.lineStart; i++) {
    if (bounds.value.charAt(i) === "\n") {
      n++;
    }
  }
  return n;
}

function editorApplyTranspose(opts) {
  var field;
  var bounds;
  var line;
  var sourceKey;
  var destKey;
  var steps;
  var whole;
  var spellMajor;
  var range;
  var result;
  var newLine;
  var srcMusic;
  var nextMusic;
  var lines;
  var index;
  var caret;
  var silent;
  opts = opts || {};
  if (!editorStaffOn()) {
    return;
  }
  field = editorActiveField();
  if (!field) {
    return;
  }
  bounds = editorTransposeBounds(field);
  if (!bounds) {
    return;
  }
  if (bounds.cross) {
    editorNotice(t("edit.refuseTransposeLine"));
    return;
  }
  line = bounds.value.slice(bounds.lineStart, bounds.lineEnd);
  if (!String(line).replace(/\s/g, "")) {
    editorNotice(t("edit.refuseTransposeEmpty"));
    return;
  }
  sourceKey = editorExampleKeyRaw(line);
  if (opts.scope === "example") {
    whole = true;
  } else if (opts.scope === "selection") {
    whole = false;
    if (typeof opts.rangeStart === "number" && typeof opts.rangeEnd === "number") {
      bounds.selStart = opts.rangeStart;
      bounds.selEnd = opts.rangeEnd;
    }
    if (bounds.selStart === bounds.selEnd) {
      return;
    }
  } else {
    whole = bounds.selStart === bounds.selEnd;
  }
  if (opts.key && whole) {
    destKey = String(opts.key);
    steps = editorStepsBetweenKeys(sourceKey, destKey);
  } else {
    steps = parseInt(opts.semitones, 10);
    if (isNaN(steps)) {
      steps = 0;
    }
    destKey = editorDestinationKey(sourceKey, steps);
  }
  if (whole) {
    if (
      steps === 0 &&
      editorSpellMajor(destKey) === editorSpellMajor(sourceKey) &&
      !!editorKeyPitch(destKey).minor === !!editorKeyPitch(sourceKey).minor
    ) {
      return;
    }
    spellMajor = editorSpellMajor(destKey);
    range = null;
  } else {
    if (steps === 0) {
      return;
    }
    spellMajor = editorSpellMajor(sourceKey);
    range = {
      start: bounds.selStart - bounds.lineStart,
      end: bounds.selEnd - bounds.lineStart
    };
  }
  result = editorTransposeMusic(line, steps, spellMajor, range);
  if (!result.ok) {
    editorNotice(t(result.reason === "stack" ? "edit.refuseTransposeStack" : "edit.refuseTransposeRange"));
    return;
  }
  newLine = whole ? editorStampLineKey(result.text, destKey) : result.text;
  if (whole && newLine === line) {
    return;
  }
  if (!whole && !result.changed) {
    return;
  }
  if (typeof staffExampleParts === "function" && typeof parseMusicNotation === "function") {
    srcMusic = staffExampleParts(line).music;
    nextMusic = staffExampleParts(newLine).music;
    if (parseMusicNotation(srcMusic) && !parseMusicNotation(nextMusic)) {
      editorNotice(t("edit.refuseTransposeDraw"));
      return;
    }
  }
  if (whole) {
    if (editorIsFocusMode()) {
      editorSyncFocusToArea();
    }
    lines = editorRawLines();
    if (lines.length >= 500) {
      editorNotice(t("edit.tooMany"));
      return;
    }
  }
  editorPushSymbolUndo();
  if (whole) {
    lines = editorRawLines();
    index = editorTransposeLineIndex(bounds);
    lines.splice(index + 1, 0, newLine);
    editorSetRawLines(lines);
    if (editorIsFocusMode()) {
      editorFocusIndex = index + 1;
      editorSyncFocusFromArea({ caret: "end" });
    } else {
      caret = editorLineStartOffset(lines, index + 1) + newLine.length;
      editorPlaceCaret(field, caret, caret, true);
    }
  } else {
    field.value = bounds.value.slice(0, bounds.lineStart) + newLine + bounds.value.slice(bounds.lineEnd);
    silent = !!(editorPadCaret && editorSymbolsIsOpen());
    editorPlaceCaret(
      field,
      bounds.lineStart + result.selStart,
      bounds.lineStart + result.selEnd,
      silent
    );
    if (editorIsFocusMode()) {
      editorSyncFocusToArea();
    }
  }
  clearEditorNotice();
  refreshEditor();
  if (editorTransposeOpen) {
    editorPaintTransposeMenu();
  }
}

function editorSyncAddCombo() {
  var combo = document.getElementById("editAddCombo");
  var button = document.getElementById("editTranspose");
  var staff = editorStaffOn();
  if (combo) {
    combo.classList.toggle("is-staff", staff);
  }
  if (!staff) {
    editorCloseTransposeMenu();
    editorCloseMoveMenu();
  }
  if (button) {
    button.hidden = !staff;
  }
}

function editorPlaceAnchoredMenu(menu, anchor) {
  var rect;
  var top;
  var left;
  var width;
  if (!menu || !anchor || menu.hidden) {
    return;
  }
  rect = anchor.getBoundingClientRect();
  width = Math.min(352, window.innerWidth - 16);
  left = rect.left;
  if (left + width > window.innerWidth - 8) {
    left = window.innerWidth - 8 - width;
  }
  if (left < 8) {
    left = 8;
  }
  top = rect.bottom + 6;
  menu.style.position = "fixed";
  menu.style.left = left + "px";
  menu.style.top = top + "px";
  menu.style.width = width + "px";
  menu.style.maxHeight = Math.max(160, window.innerHeight - top - 12) + "px";
}

function editorPlaceTransposeMenu() {
  editorPlaceAnchoredMenu(
    document.getElementById("editTransposeMenu"),
    document.getElementById("editAddCombo")
  );
}

function editorPaintTransposeMenu() {
  var menu = document.getElementById("editTransposeMenu");
  var scope;
  var title;
  var moves;
  var keys;
  var source;
  var sourceInfo;
  var i;
  var move;
  var button;
  var name;
  var info;
  var label;
  if (!menu) {
    return;
  }
  scope = editorTransposeScope();
  source = editorExampleKeyRaw(scope.line);
  sourceInfo = editorKeyPitch(source);
  menu.textContent = "";
  title = document.createElement("p");
  title.id = "editTransposeTitle";
  title.className = "edit-transpose-title";
  title.textContent = t("edit.transposeExample");
  menu.appendChild(title);
  moves = document.createElement("div");
  moves.className = "edit-transpose-moves";
  for (i = 0; i < EDITOR_TRANSPOSE_MOVES.length; i++) {
    move = EDITOR_TRANSPOSE_MOVES[i];
    button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-transpose", String(move.semis));
    button.setAttribute("role", "menuitem");
    label = t(move.up);
    button.textContent = label;
    button.setAttribute("aria-label", label);
    button.title = label;
    moves.appendChild(button);
    button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-transpose", String(-move.semis));
    button.setAttribute("role", "menuitem");
    label = t(move.down);
    button.textContent = label;
    button.setAttribute("aria-label", label);
    button.title = label;
    moves.appendChild(button);
  }
  menu.appendChild(moves);
  keys = document.createElement("div");
  keys.className = "edit-transpose-keys";
  keys.setAttribute("role", "group");
  keys.setAttribute("aria-label", t("edit.transpose"));
  for (i = 0; i < EDITOR_TRANSPOSE_KEYS.length; i++) {
    name = EDITOR_TRANSPOSE_KEYS[i];
    info = editorKeyPitch(name);
    button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-transpose-key", name);
    button.setAttribute("role", "menuitem");
    label = t("edit.transposeTo").replace("{key}", editorKeyFace(name));
    button.textContent = editorKeyFace(name);
    button.setAttribute("aria-label", label);
    button.title = label;
    if (scope.line && info.pc === sourceInfo.pc && info.minor === sourceInfo.minor) {
      button.setAttribute("aria-pressed", "true");
    }
    keys.appendChild(button);
  }
  menu.appendChild(keys);
  editorPlaceTransposeMenu();
}

function editorOpenTransposeMenu() {
  var button = document.getElementById("editTranspose");
  var menu = document.getElementById("editTransposeMenu");
  var combo = document.getElementById("editAddCombo");
  if (!editorStaffOn() || !menu) {
    return;
  }
  editorCloseMoveMenu();
  editorTransposeOpen = true;
  if (menu.parentNode !== document.body) {
    document.body.appendChild(menu);
  }
  menu.hidden = false;
  if (button) {
    button.setAttribute("aria-expanded", "true");
  }
  if (combo) {
    combo.classList.add("is-open");
  }
  editorPaintTransposeMenu();
}

function editorCloseTransposeMenu() {
  var button = document.getElementById("editTranspose");
  var menu = document.getElementById("editTransposeMenu");
  var combo = document.getElementById("editAddCombo");
  var was = editorTransposeOpen;
  editorTransposeOpen = false;
  if (menu) {
    menu.hidden = true;
    menu.style.position = "";
    menu.style.left = "";
    menu.style.top = "";
    menu.style.width = "";
    menu.style.maxHeight = "";
  }
  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
  if (combo) {
    combo.classList.remove("is-open");
  }
  return was;
}

function editorToggleTransposeMenu() {
  if (editorTransposeOpen) {
    editorCloseTransposeMenu();
    return;
  }
  editorOpenTransposeMenu();
}

function editorMoveInterval() {
  var i;
  for (i = 0; i < EDITOR_MOVE_INTERVALS.length; i++) {
    if (EDITOR_MOVE_INTERVALS[i].semis === editorMoveSemis) {
      return EDITOR_MOVE_INTERVALS[i];
    }
  }
  editorMoveSemis = 12;
  return EDITOR_MOVE_INTERVALS[EDITOR_MOVE_INTERVALS.length - 1];
}

/* A passage may keep another interval. A bare caret returns the stepper to an octave. */
function editorResetIntervalUnlessSelected() {
  var field;
  var bounds;
  var prev = editorMoveSemis;
  field = editorActiveField();
  if (!field) {
    editorMoveSemis = 12;
    return prev !== editorMoveSemis;
  }
  bounds = editorTransposeBounds(field);
  if (!bounds || bounds.cross || bounds.selStart === bounds.selEnd) {
    editorMoveSemis = 12;
  }
  return prev !== editorMoveSemis;
}

function editorCloseMoveMenu() {
  if (!editorMoveMenuOpen) {
    return false;
  }
  editorMoveMenuOpen = false;
  editorNotePadStamp = "";
  editorPaintNotePad();
  return true;
}

/* Arrows move the selection, or the note under the caret, by the armed interval. */
function editorApplyIntervalStep(dir) {
  var field;
  var bounds;
  var hit;
  var semis;
  semis = editorMoveInterval().semis;
  /* An octave keeps the written spelling. Other intervals are respelled for the key. */
  if (semis === 12) {
    editorShiftOctave(dir < 0 ? -1 : 1);
    return;
  }
  if (dir < 0) {
    semis = -semis;
  }
  field = editorActiveField();
  bounds = field ? editorTransposeBounds(field) : null;
  if (bounds && !bounds.cross && bounds.selStart !== bounds.selEnd) {
    editorApplyTranspose({ scope: "selection", semitones: semis });
    return;
  }
  hit = editorPitchAtCaret();
  if (!hit) {
    return;
  }
  editorApplyTranspose({
    scope: "selection",
    semitones: semis,
    rangeStart: hit.start,
    rangeEnd: hit.end
  });
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
    return;
  }
  oct = editorClampOctave(hit.oct + dir);
  if (oct === hit.oct) {
    editorNotice(t("edit.refuseOctave"));
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
        editorNotice(t("edit.refuseStackFull"));
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
  /* Any pad tap ends chord-name typing (except we re-enter after Chord). */
  if (!button.hasAttribute("data-event") || button.getAttribute("data-event") !== "chord") {
    editorEndLabelTyping();
  } else if (editorCaretChordMarkRange()) {
    editorEndLabelTyping();
  }
  editorAnalyticsMark("used_pad");
  if (button.hasAttribute("data-tuplet-menu")) {
    editorToggleTupletMenu();
    return;
  }
  if (button.hasAttribute("data-tuplet-pick")) {
    editorSetTupletN(button.getAttribute("data-tuplet-pick"));
    return;
  }
  if (button.hasAttribute("data-undo")) {
    editorStaffCloseClipMenu();
    editorCloseTupletMenu();
    editorSymbolUndoStep();
    return;
  }
  if (button.hasAttribute("data-redo")) {
    editorCloseTupletMenu();
    editorSymbolRedoStep();
    return;
  }
  if (button.hasAttribute("data-erase")) {
    editorCloseTupletMenu();
    editorEraseStep(opts);
    return;
  }
  if (button.hasAttribute("data-note")) {
    editorCloseTupletMenu();
    editorWriteLetter(button.getAttribute("data-note"), opts);
    return;
  }
  if (button.hasAttribute("data-acc")) {
    editorArmAcc(button.getAttribute("data-acc") || "");
    return;
  }
  if (button.hasAttribute("data-shift")) {
    editorCloseMoveMenu();
    editorShiftOctave(parseInt(button.getAttribute("data-shift"), 10));
    return;
  }
  if (button.hasAttribute("data-move-menu")) {
    editorMoveMenuOpen = !editorMoveMenuOpen;
    editorNotePadStamp = "";
    editorPaintNotePad();
    return;
  }
  if (button.hasAttribute("data-move-pick")) {
    editorMoveSemis = parseInt(button.getAttribute("data-move-pick"), 10);
    if (isNaN(editorMoveSemis) || editorMoveSemis < 1 || editorMoveSemis > 12) {
      editorMoveSemis = 12;
    }
    editorMoveMenuOpen = false;
    editorNotePadStamp = "";
    editorPaintNotePad();
    return;
  }
  if (button.hasAttribute("data-move-by")) {
    editorCloseMoveMenu();
    editorApplyIntervalStep(parseInt(button.getAttribute("data-move-by"), 10));
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
    if (eventName !== "tuplet") {
      editorCloseTupletMenu();
    } else {
      editorTupletMenuOpen = false;
    }
    if (eventName === "slash") {
      if (editorApplySelectionSlash(opts)) {
        return;
      }
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
      if (editorApplySelectionRest(opts)) {
        return;
      }
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
      if (editorApplySelectionBar()) {
        return;
      }
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
  var padded;
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
  /* Chart marks (♯, ^, …) stay glued; only measure marks pad like the note pad. */
  if (measure) {
    padded = editorPadSymbolGaps(raw, caretBack);
    insertEditorText(padded.text, padded.caretBack);
  } else {
    insertEditorText(raw, caretBack);
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
    return "Estas líneas van en el pentagrama. Una nota es una palabra: letra, alteración, octava, luego w h q e s n y un puntillo o dos (C4q..). C4 es una negra. C4n es una negra sin plica, un tiempo. C#4, Db4, Cn4. n. y n.. no valen. El signo se imprime si la nota difiere de la armadura o de una nota anterior del compás; ! lo fuerza. @treble o @bass y @key=Eb van primero. ^Name va sobre la nota o el slash siguiente y puede cambiar: ^G / ^D /. ^t=100 pone el metrónomo a 100 solo en ese ejemplo. ^texto pegado va encima de esa nota, slash, silencio o acorde. _texto va debajo. Los dos pueden ir juntos: [E3h G3h B3h D4h]^C∆7_3, /w^P, rw^R. _1 es el grado bajo la nota. ^bVII y _bVII se ven como ♭VII. _bbVII se ve como 𝄫VII. Un ^ solo es marcato. {C4e D4e} barrado. / es tocar cualquier cosa, sin plica. /q es un slash de ritmo, rq silencio, | barra, % simile, ~ ligadura de la misma altura. (3 C4e D4e E4e) grupo irregular. pp mf f, cresc, dim, y ' > - ^ : C4e'>. \" · \" es el texto. El mismo número de compases en cada línea. Responde con esta escritura.";
  }
  return "These lines are written on a staff. One note is one word: letter, accidental, octave, then w h q e s n and one or two dots (C4q..). C4 is a quarter. C4n is a quarter notehead with no stem, one beat. C#4, Db4, Cn4. n. and n.. are rejected. A sign prints when the note differs from the key or from an earlier note in the bar; ! forces it. @treble or @bass and @key=Eb come first. ^Name sits on the next note or slash and can change: ^G / ^D /. ^t=100 sets the metronome to 100 for that example only. ^text glued on a note, slash, rest, or chord sits above it. _text sits under it. Both can be on one symbol: [E3h G3h B3h D4h]^C∆7_3, /w^P, rw^R. _1 is the degree under the note. ^bVII and _bVII both print as ♭VII. _bbVII prints as 𝄫VII. A bare ^ is marcato. {C4e D4e} beams. / is play anything, no stem. /q is a rhythm slash, rq a rest, | a bar, % a simile, ~ a tie of the same pitch. (3 C4e D4e E4e) is a tuplet. pp mf f, cresc, dim, and ' > - ^ : C4e'>. \" · \" is the caption. The same number of bars on every line. Answer in this spelling.";
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

function editorPracticeUrl() {
  var lines;
  var bars;
  var shareId;
  var saved;
  var shareDefaults;
  var snap;
  var catalogHref;
  var url;
  if (!editorIsOpen()) {
    return null;
  }
  editorFlushFocus();
  lines = editorLinesFrom(document.getElementById("allEdit").value);
  if (!lines.length) {
    editorNotice(t("edit.oneLine"));
    return null;
  }
  if (lines.length > 500) {
    editorNotice(t("edit.tooMany"));
    return null;
  }
  bars = editorReadBars();
  editorWriteBars(bars);
  shareId = "";
  saved = null;
  if (!editorIsCreateMode() && editorDraft.id && typeof getDeskExercise === "function") {
    saved = getDeskExercise(editorDraft.id);
  }
  if (saved && saved.shareId) {
    shareId = saved.shareId;
  } else {
    shareId = newShareId();
  }
  shareDefaults = editorPartDefaults();
  snap = typeof shareSnapshot === "function"
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
  catalogHref = "";
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
  url = catalogHref || (snap ? shareExerciseUrl({ v: 1, id: snap.shareId, name: snap.name, bars: snap.bars, staff: snap.staff, lines: snap.lines }) : "");
  if (!url) {
    editorNotice(t("edit.shareLong"));
    return null;
  }
  if (!catalogHref && saved && !saved.shareId && typeof updateDeskExercise === "function") {
    updateDeskExercise(saved.id, { shareId: shareId });
  }
  return {
    url: url,
    name: (snap && snap.name) || "eization"
  };
}

function editorShare() {
  var ready = editorPracticeUrl();
  var copyOk = false;
  var sheet = false;
  if (!ready) {
    return;
  }
  if (typeof track === "function") {
    track("edit_share");
  }
  clearEditorNotice();
  if (navigator.share) {
    sheet = true;
    navigator.share({
      title: ready.name || "eization",
      text: t("share.text"),
      url: ready.url
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
    copySupportText(ready.url).then(function () {
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

function editorEmbed() {
  var ready = editorPracticeUrl();
  var code;
  if (!ready) {
    return;
  }
  if (typeof track === "function") {
    track("edit_embed");
  }
  clearEditorNotice();
  code = typeof practiceEmbedCode === "function" ? practiceEmbedCode(ready.url, ready.name) : "";
  if (!code || typeof copySupportText !== "function") {
    editorNotice(t("edit.embedFail"));
    return;
  }
  copySupportText(code).then(function () {
    editorStatus(t("edit.embedCopied"));
  }, function () {
    editorNotice(t("edit.embedFail"));
  });
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
  document.getElementById("editEmbed").addEventListener("click", editorEmbed);
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
    nameField.addEventListener("focus", function () {
      editorArmControlUndo();
      editorNameUndoArmed = true;
    });
    nameField.addEventListener("input", function () {
      if (editorNameUndoArmed) {
        editorCommitControlUndo();
        editorNameUndoArmed = false;
      }
      disarmEditorDelete();
      clearEditorNotice();
      syncEditorFaceName();
      refreshEditorHint();
    });
    nameField.addEventListener("blur", function () {
      editorControlUndoSnap = null;
      editorNameUndoArmed = false;
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
  document.addEventListener("pointerdown", function (event) {
    var transposeMenu = document.getElementById("editTransposeMenu");
    var transposeCombo = document.getElementById("editAddCombo");
    var intervalGroup = document.querySelector(".edit-note-interval-group");
    var menu = document.getElementById("editClipMenu");
    var insideTranspose =
      event.target &&
      ((transposeCombo && transposeCombo.contains(event.target)) ||
        (transposeMenu && transposeMenu.contains(event.target)));
    if (editorTransposeOpen && !insideTranspose) {
      editorCloseTransposeMenu();
    }
    if (
      editorMoveMenuOpen &&
      (!intervalGroup || !event.target || !intervalGroup.contains(event.target))
    ) {
      editorCloseMoveMenu();
    }
    if (!editorStaffClipMenuOpen) {
      return;
    }
    if (menu && event.target && menu.contains(event.target)) {
      return;
    }
    editorStaffCloseClipMenu();
  });
  var transposeSheet = document.getElementById("textdiv");
  if (transposeSheet) {
    transposeSheet.addEventListener("scroll", function () {
      if (editorTransposeOpen) {
        editorCloseTransposeMenu();
      }
      if (editorMoveMenuOpen) {
        editorCloseMoveMenu();
      }
    });
  }
  function editorOnFieldFocusForPad(event) {
    var target = event && event.target;
    if (!target) {
      return;
    }
    if (target.id === "editFocusLine" || target.id === "allEdit") {
      editorPadCaret = null;
      editorSetPadInputMode(false);
      target.classList.remove("has-token-highlight");
      editorEnsureFieldVisible(target);
    }
  }
  document.addEventListener("focusin", editorOnFieldFocusForPad);
  var editPreview = document.getElementById("editPreview");
  if (editPreview) {
    editPreview.addEventListener("pointerdown", editorStaffPreviewPointerDown);
    editPreview.addEventListener("scroll", editorStaffPreviewSyncScrollBar);
    editPreview.addEventListener("pointermove", editorStaffPreviewPointerMove);
    editPreview.addEventListener("pointerup", editorStaffPreviewPointerUp);
    editPreview.addEventListener("pointercancel", editorStaffPreviewPointerCancel);
    editPreview.addEventListener("contextmenu", editorStaffPreviewContextMenu);
  }
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
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      (key === "c" || key === "v") &&
      editorStaffCopyKeysApply()
    ) {
      if (key === "c") {
        if (editorStaffCopyFromSelection()) {
          event.preventDefault();
        }
        return;
      }
      if (editorStaffCopy) {
        event.preventDefault();
        editorStaffKeyPaste = true;
        editorStaffPasteCopy();
        setTimeout(function () {
          editorStaffKeyPaste = false;
        }, 0);
      }
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
  var transposeButton = document.getElementById("editTranspose");
  if (transposeButton) {
    transposeButton.addEventListener("mousedown", function (event) {
      event.preventDefault();
    });
    transposeButton.addEventListener("click", editorToggleTransposeMenu);
  }
  var transposeMenu = document.getElementById("editTransposeMenu");
  if (transposeMenu) {
    transposeMenu.addEventListener("mousedown", function (event) {
      event.preventDefault();
    });
    transposeMenu.addEventListener("click", function (event) {
      var picked = event.target.closest("button");
      if (!picked || !transposeMenu.contains(picked)) {
        return;
      }
      if (picked.hasAttribute("data-transpose")) {
        editorApplyTranspose({
          scope: "example",
          semitones: parseInt(picked.getAttribute("data-transpose"), 10)
        });
        return;
      }
      if (picked.hasAttribute("data-transpose-key")) {
        editorApplyTranspose({ scope: "example", key: picked.getAttribute("data-transpose-key") });
      }
    });
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
      if (editorStaffSwallowKeyPaste(event)) {
        return;
      }
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
        if (editorCloseMoveMenu()) {
          return;
        }
        if (editorCloseTransposeMenu()) {
          return;
        }
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
    if (editorStaffSwallowKeyPaste(event)) {
      return;
    }
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
      editorPushSymbolUndo();
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
    editMeter.addEventListener("focus", editorArmControlUndo);
    editMeter.addEventListener("change", function () {
      editorCommitControlUndo();
      editorMarkDefaultsUsed();
      disarmEditorDelete();
      clearEditorNotice();
      refreshEditor();
    });
  }
  var editKey = document.getElementById("editKey");
  if (editKey) {
    editKey.addEventListener("focus", editorArmControlUndo);
    editKey.addEventListener("change", function () {
      editorCommitControlUndo();
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
