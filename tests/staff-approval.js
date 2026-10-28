/*
 * One staff per example, drawn by the page itself so a double-click opens it.
 * Practice uses fillExampleFace, More uses notationAppendStaff, and Edit uses
 * the same renderMusicStaff call as editorPaintStaffPreview.
 */
var approvalCases = [
  { group: "Marks", title: "Accent the peaks", meter: [4, 4], source: "C4q> E4q G4q> C5q> | C5q> G4q E4q C4q>" },
  { group: "Marks", title: "Rhythm marks", meter: [4, 4], source: "/q> /q' /q- /q^" },
  { group: "Marks", title: "Marks under a ledger note", meter: [4, 4], source: "C4q> C4q' C4q- C4q^" },
  { group: "Marks", title: "Marks above a space note", meter: [4, 4], source: "C5q> C5q' C5q- C5q^" },
  { group: "Marks", title: "Marks under a space note", meter: [4, 4], source: "A4q> A4q' A4q- A4q^" },
  { group: "Marks", title: "Marks above the middle line", meter: [4, 4], source: "B4q> B4q' B4q- B4q^" },
  { group: "Marks", title: "Two marks on one note", meter: [4, 4], source: "E4q>' G4q-' C5q^>" },
  { group: "Marks", title: "Beamed slash accents", meter: [4, 4], source: "/e> /e /e /e /e> /e /e /e>" },

  { group: "Bars", title: "A full bar closes", meter: [4, 4], source: "C4q D4q E4q F4q" },
  { group: "Bars", title: "A short bar stays open", meter: [4, 4], source: "C4q D4q" },
  { group: "Bars", title: "Dots", meter: [4, 4], source: "C4q. D4q.. E4h" },
  { group: "Bars", title: "Sixteenths", meter: [4, 4], source: "{C4s D4s E4s F4s}" },
  { group: "Bars", title: "A mixed beam", meter: [4, 4], source: "{C4e D4s E4s}" },
  { group: "Bars", title: "Flags", meter: [4, 4], source: "C4s D4e E4q" },
  { group: "Bars", title: "Eighths in 6/8", meter: [6, 8], source: "{C4e D4e E4e} {F4e G4e A4e}" },
  { group: "Bars", title: "Five eight", meter: [5, 8], source: "{C4e D4e} {E4e F4e G4e}" },
  { group: "Bars", title: "Three four", meter: [3, 4], source: "C4q D4q E4q" },
  { group: "Bars", title: "Tuplets", meter: [4, 4], source: "(3 C4e D4e E4e) (5:4 C4s D4s E4s F4s G4s)" },
  { group: "Bars", title: "Rests and dots", meter: [4, 4], source: "rq. rh. rw." },
  { group: "Bars", title: "Play and rest", meter: [4, 4], source: "/w^P | rw^R" },
  { group: "Bars", title: "Simile", meter: [4, 4], source: "C4q D4q E4q F4q | %" },

  { group: "Pitch", title: "Seconds", meter: [4, 4], source: "[E4 F4] [C5 D5]" },
  { group: "Pitch", title: "A second inside a beam", meter: [4, 4], source: "{G5e A5e B5e [E4 F4]e}" },
  { group: "Pitch", title: "Accidentals through the bar", meter: [4, 4], source: "F#4q F#4q F4q | F#4q" },
  { group: "Pitch", title: "A courtesy accidental", meter: [4, 4], source: "F4q F4q!" },
  { group: "Pitch", title: "A tie across the bar", meter: [4, 4], source: "C#4q~ | C#4q" },
  { group: "Pitch", title: "Bass and three flats", meter: [4, 4], source: "@bass @key=Eb G2q Bb2q D3q F3q" },
  { group: "Pitch", title: "Clef change after the bar", meter: [4, 4], source: "@key=Eb C4q D4q E4q F4q | @bass G2q Bb2q D3q F3q" },
  { group: "Pitch", title: "A sharp key", meter: [4, 4], source: "@key=F# F#4q C#5q" },
  { group: "Pitch", title: "Ledgers", meter: [4, 4], source: "C6w | C3q B3q" },
  { group: "Pitch", title: "High and low beams", meter: [4, 4], source: "{C6e D6e E6e F6e} | {C3e D3e E3e F3e}" },
  { group: "Pitch", title: "A flat beside a fourth", meter: [4, 4], source: "[Cb4 F4]" },

  { group: "Words", title: "A long name over eighths", meter: [4, 4], source: "^C_Whole-tone {C4e_1 D4e_2 E4e_3 F#4e_#4}" },
  { group: "Words", title: "Two chord names", meter: [4, 4], source: "^Bbmaj7#11 C4q ^Ebmaj7#11 E4q" },
  { group: "Words", title: "A stack name and a degree", meter: [4, 4], source: "[E4 G4 B4 D5]^Cmaj7_1" },
  { group: "Words", title: "A hairpin", meter: [4, 4], source: "p C4q cresc D4q E4q f F4q" },
  { group: "Words", title: "Slash dynamics and an accent", meter: [4, 4], source: "mf /q /q cresc f /q>" },
  { group: "Words", title: "A caption", meter: [4, 4], source: "C4q D4q E4q F4q \u00B7 four steps" },

  { group: "Lines", title: "II-V-I written out", meter: [4, 4], source: "^Dm7 {D4e_1 F4e_b3} {A4e_5 C5e_b7} ^G7 {D4e_5 F4e_b7} {G4e_1 B4e_3} | ^Cmaj7 {C4e_1 E4e_3} {G4e_5 B4e_7} {E5e_3 G5e_5} {C5e_1 E5e_3}" },
  { group: "Lines", title: "II-V-I slash chart in Eb", meter: [4, 4], source: "^Ebm7 /w | ^Ab7 /w | ^Dbmaj7 /w | ^Dbmaj7 /w" },
  { group: "Lines", title: "Eb major, one octave", meter: [4, 4], source: "@key=Eb ^Eb_Major {Eb4e_1 F4e_2} {G4e_3 Ab4e_4} {Bb4e_5 C5e_6} {D5e_7 Eb5e_1}" },
  { group: "Lines", title: "C whole-tone", meter: [4, 4], source: "@key=C ^C_Whole-tone {C4e_1 D4e_2} {E4e_3 F#4e_#4} {G#4e_#5 A#4e_b7} {C5e_1 D5e_2}" },
  { group: "Lines", title: "Guide tones, no stems", meter: [4, 4], source: "^Cmaj7 E4n_3 B4n_7 | ^A7 C#5n_3 G4n_b7 | ^Dm7 F4n_b3 C5n_7 | ^G7 B4n_3 F4n_b7" },
  { group: "Lines", title: "A second inside the voicing", meter: [4, 4], source: "[C4 E4 F4 A4]^F6_1 | [Bb3 D4 Eb4 G4]^Eb6_1" },
  { group: "Lines", title: "Seconds under a long beam", meter: [4, 4], source: "^Cmaj7 {[E4 F4]e G4e} {[B4 C5]e D5e} {[E5 F5]e G5e} {C5e B4e}" },
  { group: "Lines", title: "Finger pedal", meter: [4, 4], source: "[C4 E5]~ [D4 E5]~ [E4 E5]~ [F4 E5]~ | [G4 E5]~ [E4 E5]~ [D4 E5]~ [C4 E5] \u00B7 Finger pedal" },
  { group: "Lines", title: "Ghost notes", meter: [4, 4], source: "mf C4q pp E4q mf G4q pp E4q | mf D4q pp F4q mf E4q pp C4q \u00B7 Ghost notes" },
  { group: "Lines", title: "A trill in sixteenths", meter: [4, 4], source: "{C4s D4s C4s D4s} {C4s D4s C4s D4s} {C4s D4s C4s D4s} {C4s D4s C4s D4s} \u00B7 Trill" },
  { group: "Lines", title: "Soft then hit", meter: [4, 4], source: "pp /q mf /q> pp /q mf /q> | pp /q mf /q> pp /q mf /q> \u00B7 Soft then hit" },
  { group: "Lines", title: "Eighth accents, two bars", meter: [4, 4], source: "/e> /e /e /e /e> /e /e /e> | /e /e /e /e> /e /e /e> /e" },
  { group: "Lines", title: "Two long chord names", meter: [4, 4], source: "^Bbmaj7#11 {Bb4e_1 D5e_3} {F5e_5 Ab5e_b7} ^Ebmaj7#11 {Bb4e_5 D5e_7} {G5e_3 Bb5e_5}" },
  { group: "Lines", title: "Walking bass in Bb", meter: [4, 4], source: "@bass @key=Bb Bb2q C3q D3q Eb3q | F3q G3q A3q Bb3q" },
  { group: "Lines", title: "Bass seconds", meter: [4, 4], source: "@bass [E2 F2] [A2 Bb2] [D3 Eb3] [G2 Ab2]" },
  { group: "Lines", title: "A tie in F", meter: [4, 4], source: "@key=F C4q~ | C4q E4q! F4q A4q" },
  { group: "Lines", title: "Chromatic, then back", meter: [4, 4], source: "C4e C#4e D4e D#4e | E4e F4e F#4e G4e | Gn4e F4e E4e Eb4e" },
  { group: "Lines", title: "Six eight", meter: [6, 8], source: "^Am7 {A4e C5e E5e} {G4e B4e D5e} | {F4e A4e C5e} {E4e G4e B4e}" },
  { group: "Lines", title: "Twelve eight", meter: [12, 8], source: "^Cmaj7 {C4e E4e G4e} {C5e G4e E4e} {G4e B4e D5e} {F4e A4e C5e}" },
  { group: "Lines", title: "Five four", meter: [5, 4], source: "{C4e D4e} {E4e F4e} {G4e A4e} {B4e C5e} {D5e E5e}" },
  { group: "Lines", title: "Comping in three", meter: [3, 4], source: "/q re /e rq | /e /e /q rq \u00B7 short and held" },
  { group: "Lines", title: "A triplet voicing", meter: [4, 4], source: "(3 [E4 G4 B4]e C5e D5e) (3 E5e D5e C5e) {B4e A4e} {G4e F4e}" },
  { group: "Lines", title: "A septuplet into quarters", meter: [4, 4], source: "(7 C4e D4e E4e F4e G4e A4e B4e) C5q D5q E5q" },
  { group: "Lines", title: "A hairpin through accents", meter: [4, 4], source: "p {C4e> D4e E4e F4e} cresc {G4e A4e B4e C5e} f" },
  { group: "Lines", title: "Ledger seconds", meter: [4, 4], source: "{G5e A5e B5e C6e} {[D6 E6]e F6e G6e}" },
  { group: "Lines", title: "Double dot, then a half", meter: [4, 4], source: "C4q.. D4s E4q. F4e | G4h A4h" },
  { group: "Lines", title: "Repeat the voicing", meter: [4, 4], source: "^G7 [G4 B4 D5 F5] [F4 A4 C5 Eb5] | %" },
  { group: "Lines", title: "Rhythm after the bar", meter: [4, 4], source: "| /s /s /s /s | /e /e /e /e" },
  { group: "Lines", title: "A name over a triplet", meter: [4, 4], source: "^C_Major (3 C4e_1 D4e_2 E4e_3) {F4e_4 G4e_5}" }
];

function approvalSetMeter(meter) {
  beatsPerBar = meter[0];
  beatUnit = meter[1];
}

function approvalSig(svg) {
  var clone;
  var nodes;
  var i;
  if (!svg) {
    return "";
  }
  clone = svg.cloneNode(true);
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  nodes = clone.querySelectorAll(".staff-caret-mark, .staff-event-highlight");
  for (i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].parentNode) {
      nodes[i].parentNode.removeChild(nodes[i]);
    }
  }
  return (clone.getAttribute("viewBox") || "") + "\n" + (clone.getAttribute("class") || "") + "\n" + clone.innerHTML;
}

function approvalPaintPractice(source) {
  var host = document.createElement("div");
  exerciseStaff = true;
  fillExampleFace(host, source, "current");
  return host;
}

/* Width and height match editorPaintStaffPreview. The meter is the one on the example. */
function approvalPaintEdit(source, meter) {
  var host = document.createElement("div");
  var status = staffNotationStatus(source);
  var svg = renderMusicStaff(status.ok ? status.music : "", "current", {
    meter: { beats: meter[0], unit: meter[1] }
  });
  var box;
  var w;
  var h;
  var wrap;
  var cap;
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
    host.appendChild(wrap);
  }
  if (status.caption) {
    cap = document.createElement("span");
    cap.className = "prog-name";
    cap.textContent = status.caption;
    host.appendChild(cap);
  }
  return host;
}

function approvalPaintMore(source, meter) {
  var host = document.createElement("div");
  notationAppendStaff(host, source, meter[0] + "/" + meter[1]);
  return host;
}

function approvalMove(from, into) {
  while (from.firstChild) {
    into.appendChild(from.firstChild);
  }
}

function approvalMismatch(sigs) {
  var parts = [];
  if (!sigs[0]) {
    parts.push("Practice drew no staff");
  }
  if (!sigs[1]) {
    parts.push("Edit drew no staff");
  }
  if (!sigs[2]) {
    parts.push("More drew no staff");
  }
  if (sigs[0] && sigs[1] && sigs[0] !== sigs[1]) {
    parts.push("Practice and Edit differ");
  }
  if (sigs[0] && sigs[2] && sigs[0] !== sigs[2]) {
    parts.push("Practice and More differ");
  }
  if (sigs[1] && sigs[2] && sigs[1] !== sigs[2] && sigs[0] === sigs[1]) {
    parts.push("Edit and More differ");
  }
  return parts;
}

function approvalRun() {
  var gallery = document.getElementById("gallery");
  var summary = document.getElementById("summary");
  var differ = 0;
  var group = "";
  var i;
  var item;
  var practice;
  var edit;
  var more;
  var sigs;
  var mismatch;
  var article;
  var heading;
  var title;
  var source;
  var face;
  var verdict;
  var extras;
  var extraPractice;
  var extraEdit;
  var labelPractice;
  var labelEdit;
  for (i = 0; i < approvalCases.length; i++) {
    item = approvalCases[i];
    if (item.group !== group) {
      group = item.group;
      heading = document.createElement("h2");
      heading.id = group.toLowerCase();
      heading.textContent = group;
      gallery.appendChild(heading);
    }
    approvalSetMeter(item.meter);
    try {
      practice = approvalPaintPractice(item.source);
      edit = approvalPaintEdit(item.source, item.meter);
      more = approvalPaintMore(item.source, item.meter);
      sigs = [
        approvalSig(practice.querySelector("svg.music-staff")),
        approvalSig(edit.querySelector("svg.music-staff")),
        approvalSig(more.querySelector("svg.music-staff"))
      ];
      mismatch = approvalMismatch(sigs);
    } catch (err) {
      practice = null;
      edit = null;
      more = null;
      mismatch = [err && err.message ? err.message : String(err)];
    }
    article = document.createElement("article");
    if (mismatch.length) {
      differ += 1;
      article.className = "is-diff";
    }
    title = document.createElement("h3");
    title.textContent = item.title + "  " + item.meter[0] + "/" + item.meter[1];
    source = document.createElement("pre");
    source.textContent = item.source;
    face = document.createElement("div");
    face.className = "example-staff";
    if (more) {
      approvalMove(more, face);
    }
    article.appendChild(title);
    article.appendChild(source);
    if (mismatch.length) {
      verdict = document.createElement("p");
      verdict.className = "verdict";
      verdict.textContent = mismatch.join(". ");
      extras = document.createElement("div");
      extras.className = "extras";
      labelPractice = document.createElement("p");
      labelPractice.textContent = "Practice";
      labelEdit = document.createElement("p");
      labelEdit.textContent = "Edit";
      extraPractice = document.createElement("div");
      extraEdit = document.createElement("div");
      extraPractice.className = "extra-staff";
      extraEdit.className = "extra-staff";
      if (practice) {
        approvalMove(practice, extraPractice);
      }
      if (edit) {
        approvalMove(edit, extraEdit);
      }
      extras.appendChild(labelPractice);
      extras.appendChild(extraPractice);
      extras.appendChild(labelEdit);
      extras.appendChild(extraEdit);
      article.appendChild(verdict);
      article.appendChild(extras);
    }
    article.appendChild(face);
    gallery.appendChild(article);
  }
  summary.textContent = differ
    ? differ + (differ === 1 ? " example differs" : " examples differ")
    : approvalCases.length + " examples";
  document.title = differ ? "Staff approval · " + differ + " differ" : "Staff approval";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", approvalRun);
} else {
  approvalRun();
}
