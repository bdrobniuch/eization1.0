function notationApplyMeter(raw) {
  var text = String(raw || "4/4");
  var bits = text.split("/");
  var top = parseInt(bits[0], 10);
  var bottom = parseInt(bits[1], 10);
  if (!top || top < 1) {
    top = 4;
  }
  if (bottom !== 1 && bottom !== 2 && bottom !== 4 && bottom !== 8 && bottom !== 16) {
    bottom = 4;
  }
  beatsPerBar = top;
  beatUnit = bottom;
}

function notationMeterSpecified(raw) {
  return raw != null && String(raw).replace(/^\s+|\s+$/g, "") !== "";
}

function notationAppendStaff(host, source, meter, notation) {
  host.textContent = "";
  host.classList.remove("is-text", "is-empty", "is-staff");
  var trimmed = String(source || "").replace(/^\s+|\s+$/g, "");
  var showMeter = notationMeterSpecified(meter);
  var drum = notation === "drum";
  if (!trimmed) {
    host.classList.add("is-empty");
    return { ok: false, notationIsh: false, music: "", caption: "" };
  }
  /* Layout still needs a meter; only the time-signature glyph follows data-meter. */
  notationApplyMeter(showMeter ? meter : "4/4");
  var status = drum && typeof drumNotationStatus === "function"
    ? drumNotationStatus(trimmed)
    : typeof staffNotationStatus === "function"
      ? staffNotationStatus(trimmed)
      : { ok: false, notationIsh: false, music: trimmed, caption: "" };
  var draw = drum && typeof renderDrumStaff === "function" ? renderDrumStaff : renderMusicStaff;
  if (status.ok && typeof draw === "function") {
    host.classList.add("is-staff");
    var svg = draw(status.music || trimmed, "current", {
      showMeter: showMeter
    });
    if (svg) {
      var box = (svg.getAttribute("viewBox") || "").split(/\s+/);
      var w = parseFloat(box[2]);
      var h = parseFloat(box[3]);
      if (w > 0 && h > 0) {
        svg.setAttribute("width", String(Math.round(w)));
        svg.setAttribute("height", String(Math.round(h)));
      }
      host.appendChild(svg);
    }
    if (status.caption) {
      var cap = document.createElement("p");
      cap.className = "notation-caption";
      cap.textContent = status.caption;
      host.appendChild(cap);
    }
    return status;
  }
  host.classList.add("is-text");
  host.textContent = trimmed;
  return status;
}

function renderNotationSamples() {
  var nodes = document.querySelectorAll(".notation-sample");
  var i;
  for (i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    var pre = el.querySelector("pre");
    var host = el.querySelector(".notation-staff");
    if (!pre || !host || typeof renderMusicStaff !== "function") {
      continue;
    }
    var source = (pre.textContent || "").replace(/^\s+|\s+$/g, "");
    if (!source) {
      continue;
    }
    notationAppendStaff(host, source, el.getAttribute("data-meter"), el.getAttribute("data-notation"));
  }
}

var notationTryWarnTimer = null;
var notationTryWarnLine = "";

function notationTryWarnMessage() {
  if (typeof t === "function") {
    return t("edit.staffWarn");
  }
  return document.documentElement.lang === "es"
    ? "Este ejemplo no se dibujará como pentagrama. Se quedará en texto."
    : "This example won't draw as a staff. It will stay text.";
}

function notationClearTryNote() {
  if (notationTryWarnTimer) {
    clearTimeout(notationTryWarnTimer);
    notationTryWarnTimer = null;
  }
  notationTryWarnLine = "";
  var note = document.getElementById("notationTryNote");
  if (note) {
    note.hidden = true;
    note.textContent = "";
  }
}

function notationScheduleTryWarn(line) {
  var note = document.getElementById("notationTryNote");
  if (!note) {
    return;
  }
  if (notationTryWarnTimer) {
    clearTimeout(notationTryWarnTimer);
  }
  notationTryWarnLine = line;
  note.hidden = true;
  note.textContent = "";
  notationTryWarnTimer = setTimeout(function () {
    notationTryWarnTimer = null;
    var input = document.getElementById("notationTryInput");
    var current = input ? String(input.value || "").replace(/^\s+|\s+$/g, "") : "";
    if (current !== notationTryWarnLine) {
      return;
    }
    note.textContent = notationTryWarnMessage();
    note.hidden = false;
  }, 400);
}

function notationTryMeterValue() {
  var meter = document.getElementById("notationTryMeter");
  return meter ? meter.value : "4/4";
}

function notationTryKind() {
  var drum = document.getElementById("notationTryKindDrum");
  return drum && drum.getAttribute("aria-pressed") === "true" ? "drum" : "";
}

function setNotationTryKind(kind) {
  var staff = document.getElementById("notationTryKindStaff");
  var drum = document.getElementById("notationTryKindDrum");
  var on = kind === "drum";
  if (staff) {
    staff.setAttribute("aria-pressed", on ? "false" : "true");
  }
  if (drum) {
    drum.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function refreshNotationTry() {
  var input = document.getElementById("notationTryInput");
  var host = document.getElementById("notationTryStaff");
  if (!input || !host) {
    return;
  }
  var line = String(input.value || "").replace(/^\s+|\s+$/g, "");
  var status = notationAppendStaff(host, line, notationTryMeterValue(), notationTryKind());
  if (!line) {
    notationClearTryNote();
    return;
  }
  if (status.ok) {
    notationClearTryNote();
  } else if (status.notationIsh) {
    notationScheduleTryWarn(line);
  } else {
    notationClearTryNote();
  }
}

function notationLoadTryLine(source, meter, notation) {
  var input = document.getElementById("notationTryInput");
  var meterEl = document.getElementById("notationTryMeter");
  var tryBox = document.getElementById("notationTry");
  if (!input) {
    return;
  }
  input.value = String(source || "").replace(/^\s+|\s+$/g, "");
  if (meterEl && meter) {
    var opt = meterEl.querySelector('option[value="' + meter + '"]');
    if (opt) {
      meterEl.value = meter;
    }
  }
  setNotationTryKind(notation === "drum" ? "drum" : "staff");
  refreshNotationTry();
  if (tryBox && typeof tryBox.scrollIntoView === "function") {
    tryBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  input.focus();
  if (typeof input.setSelectionRange === "function") {
    var end = input.value.length;
    input.setSelectionRange(end, end);
  }
}

function wireNotationTry() {
  var input = document.getElementById("notationTryInput");
  var meter = document.getElementById("notationTryMeter");
  if (!input) {
    return;
  }
  input.addEventListener("input", refreshNotationTry);
  if (meter) {
    meter.addEventListener("change", refreshNotationTry);
  }
  ["notationTryKindStaff", "notationTryKindDrum"].forEach(function (id) {
    var button = document.getElementById(id);
    if (!button) {
      return;
    }
    button.addEventListener("click", function () {
      var next = id === "notationTryKindDrum" ? "drum" : "staff";
      if (next === (notationTryKind() === "drum" ? "drum" : "staff")) {
        return;
      }
      setNotationTryKind(next);
      refreshNotationTry();
    });
  });
  refreshNotationTry();

  var samples = document.querySelectorAll(".notation-sample");
  var i;
  for (i = 0; i < samples.length; i++) {
    (function (el) {
      var pre = el.querySelector("pre");
      if (!pre) {
        return;
      }
      pre.setAttribute("tabindex", "0");
      pre.setAttribute("role", "button");
      pre.setAttribute(
        "aria-label",
        document.documentElement.lang === "es"
          ? "Cargar este ejemplo en Prueba una línea"
          : "Load this example into Try a line"
      );
      pre.title =
        document.documentElement.lang === "es"
          ? "Cargar en Prueba una línea"
          : "Load into Try a line";
      function load() {
        notationLoadTryLine(
          pre.textContent,
          el.getAttribute("data-meter") || "4/4",
          el.getAttribute("data-notation") === "drum" ? "drum" : "staff"
        );
      }
      pre.addEventListener("click", load);
      pre.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          load();
        }
      });
    })(samples[i]);
  }
}

function initNotationPage() {
  renderNotationSamples();
  wireNotationTry();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNotationPage);
} else {
  initNotationPage();
}
