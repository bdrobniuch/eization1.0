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
    notationApplyMeter(el.getAttribute("data-meter"));
    var parts = typeof staffExampleParts === "function"
      ? staffExampleParts(source)
      : { music: source, caption: "" };
    var svg = renderMusicStaff(parts.music || source, "current");
    host.textContent = "";
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
    if (parts.caption) {
      var cap = document.createElement("p");
      cap.className = "notation-caption";
      cap.textContent = parts.caption;
      host.appendChild(cap);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderNotationSamples);
} else {
  renderNotationSamples();
}
