/* 22 Rhythm Motifs: one-bar slash rhythms plus time-shift families. */
(function () {
  var BASES = [
    "re /q /e /q rq",
    "/q. /e re /e re /e",
    "{/e /e} rq re /e /q",
    "{/e /e /e /e} re /q /e",
    "/e /q /e~/q /q",
    "re {/e /e /e} {/e /e} /q",
    "rq {/e /e} re {/e /e /e}",
    "re /q /e~{/e /e} /q",
    "re /q /e /q {/e /e}",
    "rq re /e~/e /q /e",
    "re {/e /e /e} re {/e /e /e}",
    "re /q /e rq /q",
    "{/e /e} re /e re /e re /e",
    "re {/e /e /e}~{/e /e}~/q",
    "rq {/e /e} /q {/e /e}",
    "re {/e /e /e} rq /q",
    "{/e /e} re /e /q {/e /e}",
    "/q {/e /e} {/e /e} /q",
    "/q. /e {/e /e /e /e}",
    "{/e /e} re /e re {/e /e /e}",
    "/q. /e~{/e /e}~/q",
    "re {/e /e /e} re /q."
  ];

  var FAMILIES = [
    { shift: -1, label: "early 1" },
    { shift: -2, label: "early 2" },
    { shift: 1, label: "delayed 1" },
    { shift: -0.5, label: "early 1/2" },
    { shift: -1.5, label: "early 1 1/2" },
    { shift: -2.5, label: "early 2 1/2" },
    { shift: 0.5, label: "delayed 1/2" }
  ];

  var EPS = 0.001;

  function rmDurQuarters(dur) {
    var dotted = dur.charAt(dur.length - 1) === ".";
    var base = dotted ? dur.slice(0, -1) : dur;
    var q = base === "w" ? 4 : base === "h" ? 2 : base === "e" ? 0.5 : base === "s" ? 0.25 : 1;
    return dotted ? q * 1.5 : q;
  }

  function rmSnap(q) {
    return Math.round(q * 4) / 4;
  }

  function rmQuartersToDur(q) {
    q = rmSnap(q);
    if (Math.abs(q - 4) < EPS) {
      return "w";
    }
    if (Math.abs(q - 3) < EPS) {
      return "h.";
    }
    if (Math.abs(q - 2) < EPS) {
      return "h";
    }
    if (Math.abs(q - 1.5) < EPS) {
      return "q.";
    }
    if (Math.abs(q - 1) < EPS) {
      return "q";
    }
    if (Math.abs(q - 0.75) < EPS) {
      return "e.";
    }
    if (Math.abs(q - 0.5) < EPS) {
      return "e";
    }
    if (Math.abs(q - 0.25) < EPS) {
      return "s";
    }
    return null;
  }

  /* Greedy split into standard durations (largest first). */
  function rmSplitQuarters(q) {
    var order = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
    var map = { 4: "w", 3: "h.", 2: "h", 1.5: "q.", 1: "q", 0.75: "e.", 0.5: "e", 0.25: "s" };
    var parts = [];
    var rem = rmSnap(q);
    while (rem > EPS) {
      var found = false;
      var i;
      for (i = 0; i < order.length; i++) {
        if (order[i] <= rem + EPS) {
          parts.push(map[order[i]]);
          rem = rmSnap(rem - order[i]);
          found = true;
          break;
        }
      }
      if (!found) {
        break;
      }
    }
    return parts;
  }

  function rmReadDur(s, i) {
    var j = i;
    while (j < s.length && "whqes".indexOf(s.charAt(j)) >= 0) {
      j++;
    }
    if (j < s.length && s.charAt(j) === ".") {
      j++;
    }
    if (j === i) {
      return null;
    }
    return { dur: s.slice(i, j), next: j };
  }

  function rmParse(notation) {
    var s = String(notation).replace(/\s+/g, " ").trim();
    var events = [];
    var i = 0;
    var pendingTie = false;

    function skipSp() {
      while (i < s.length && s.charAt(i) === " ") {
        i++;
      }
    }

    function pushEv(type, dur, inBeam) {
      var ev = {
        type: type,
        dur: dur,
        quarters: rmDurQuarters(dur),
        inBeam: !!inBeam,
        tieOut: false
      };
      if (pendingTie && events.length) {
        events[events.length - 1].tieOut = true;
      }
      pendingTie = false;
      events.push(ev);
    }

    function readOne(inBeam) {
      skipSp();
      if (i >= s.length) {
        return false;
      }
      if (s.charAt(i) === "~") {
        pendingTie = true;
        i++;
        return true;
      }
      if (s.charAt(i) === "r") {
        i++;
        var rd = rmReadDur(s, i);
        if (!rd) {
          return false;
        }
        i = rd.next;
        pushEv("rest", rd.dur, false);
        return true;
      }
      if (s.charAt(i) === "/") {
        i++;
        var nd = rmReadDur(s, i);
        if (!nd) {
          return false;
        }
        i = nd.next;
        pushEv("note", nd.dur, inBeam);
        return true;
      }
      return false;
    }

    while (i < s.length) {
      skipSp();
      if (i >= s.length) {
        break;
      }
      if (s.charAt(i) === "{") {
        i++;
        while (i < s.length && s.charAt(i) !== "}") {
          if (!readOne(true)) {
            i++;
          }
        }
        if (i < s.length && s.charAt(i) === "}") {
          i++;
        }
        skipSp();
        if (i < s.length && s.charAt(i) === "~") {
          pendingTie = true;
          i++;
        }
        continue;
      }
      if (!readOne(false)) {
        i++;
      }
    }

    var t = 0;
    var e;
    for (e = 0; e < events.length; e++) {
      events[e].start = t;
      t = rmSnap(t + events[e].quarters);
    }
    return events;
  }

  function rmClip(events, lo, hi) {
    var out = [];
    var e;
    for (e = 0; e < events.length; e++) {
      var ev = events[e];
      var a = ev.start;
      var b = rmSnap(ev.start + ev.quarters);
      var c = Math.max(a, lo);
      var d = Math.min(b, hi);
      if (d - c > EPS) {
        var piece = {
          type: ev.type,
          start: rmSnap(c),
          quarters: rmSnap(d - c),
          tieOut: false
        };
        if (ev.type === "note") {
          if (d < b - EPS) {
            piece.tieOut = true;
          } else if (ev.tieOut) {
            piece.tieOut = true;
          }
        }
        out.push(piece);
      }
    }
    return out;
  }

  function rmFillGaps(pieces, lo, hi) {
    var filled = [];
    var cursor = lo;
    var i;
    for (i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (p.start > cursor + EPS) {
        filled.push({
          type: "rest",
          start: cursor,
          quarters: rmSnap(p.start - cursor),
          tieOut: false
        });
      }
      filled.push(p);
      cursor = rmSnap(p.start + p.quarters);
    }
    if (hi > cursor + EPS) {
      filled.push({
        type: "rest",
        start: cursor,
        quarters: rmSnap(hi - cursor),
        tieOut: false
      });
    }
    return filled;
  }

  function rmExpandPiece(piece) {
    var durs = rmSplitQuarters(piece.quarters);
    var out = [];
    var i;
    for (i = 0; i < durs.length; i++) {
      out.push({
        type: piece.type,
        dur: durs[i],
        quarters: rmDurQuarters(durs[i]),
        tieOut:
          piece.type === "note" &&
          (i < durs.length - 1 || piece.tieOut)
      });
    }
    return out;
  }

  /* Tied eighths inside one beam become a quarter; keep barline ties as /e~. */
  function rmCollapseTiedEighths(run) {
    var out = [];
    var i = 0;
    while (i < run.length) {
      if (
        run[i].tieOut &&
        i + 1 < run.length &&
        Math.abs(run[i].quarters - 0.5) < EPS &&
        Math.abs(run[i + 1].quarters - 0.5) < EPS
      ) {
        out.push({
          type: "note",
          dur: "q",
          quarters: 1,
          tieOut: run[i + 1].tieOut
        });
        i += 2;
        continue;
      }
      out.push(run[i]);
      i++;
    }
    return out;
  }

  function rmEmitBeam(run) {
    var parts = [];
    var i = 0;
    var collapsed = rmCollapseTiedEighths(run);
    while (i < collapsed.length) {
      var ev = collapsed[i];
      if (ev.type === "note" && Math.abs(ev.quarters - 0.5) < EPS) {
        var beam = [ev];
        var k = i + 1;
        while (
          k < collapsed.length &&
          collapsed[k].type === "note" &&
          Math.abs(collapsed[k].quarters - 0.5) < EPS
        ) {
          beam.push(collapsed[k]);
          k++;
        }
        if (beam.length >= 2) {
          var beamStr = "{";
          var r;
          for (r = 0; r < beam.length; r++) {
            if (r) {
              beamStr += " ";
            }
            beamStr += "/e";
            if (beam[r].tieOut && r < beam.length - 1) {
              beamStr += "~";
            }
          }
          beamStr = beamStr.replace(/\/e~ \/e/g, "/e~/e");
          beamStr += "}";
          if (beam[beam.length - 1].tieOut) {
            beamStr += "~";
          }
          parts.push(beamStr);
          i = k;
          continue;
        }
      }
      parts.push("/" + ev.dur + (ev.tieOut ? "~" : ""));
      i++;
    }
    return parts.join(" ");
  }

  function rmOnBeat(start) {
    return Math.abs(rmSnap(start) - Math.round(rmSnap(start))) < EPS;
  }

  /*
   * Merge re re → rq only when the first rest is on a downbeat (fills one beat).
   * Keep re re when the first sits on an upbeat (e.g. /e re re /e).
   */
  function rmMergeBeatRests(pieces) {
    var out = [];
    var i = 0;
    while (i < pieces.length) {
      var p = pieces[i];
      var next = i + 1 < pieces.length ? pieces[i + 1] : null;
      if (
        p.type === "rest" &&
        next &&
        next.type === "rest" &&
        Math.abs(p.quarters - 0.5) < EPS &&
        Math.abs(next.quarters - 0.5) < EPS &&
        rmOnBeat(p.start) &&
        Math.abs(next.start - rmSnap(p.start + 0.5)) < EPS
      ) {
        out.push({
          type: "rest",
          start: p.start,
          quarters: 1,
          tieOut: false
        });
        i += 2;
        continue;
      }
      out.push({
        type: p.type,
        start: p.start,
        quarters: p.quarters,
        tieOut: p.tieOut,
        wrapEnd: p.wrapEnd,
        wrapStart: p.wrapStart
      });
      i++;
    }
    return out;
  }

  function rmEmit(pieces, lo, hi) {
    var filled = rmMergeBeatRests(rmFillGaps(pieces, lo, hi));
    var flat = [];
    var i;
    for (i = 0; i < filled.length; i++) {
      var expanded = rmExpandPiece(filled[i]);
      var j;
      for (j = 0; j < expanded.length; j++) {
        flat.push(expanded[j]);
      }
    }

    var parts = [];
    i = 0;
    while (i < flat.length) {
      var ev = flat[i];
      if (ev.type === "note" && Math.abs(ev.quarters - 0.5) < EPS) {
        var run = [ev];
        var k = i + 1;
        while (
          k < flat.length &&
          flat[k].type === "note" &&
          Math.abs(flat[k].quarters - 0.5) < EPS
        ) {
          run.push(flat[k]);
          k++;
        }
        if (run.length >= 2) {
          parts.push(rmEmitBeam(run));
          i = k;
          continue;
        }
      }

      if (ev.type === "rest") {
        parts.push("r" + ev.dur);
      } else {
        parts.push("/" + ev.dur + (ev.tieOut ? "~" : ""));
      }
      i++;
    }

    return parts.join(" ").replace(/~ /g, "~").replace(/ ~\{/g, "~{");
  }

  /* Place one event into [0, 4) with circular wrap; split and tie across 0. */
  function rmCircularPlace(ev, shift, out) {
    var a = rmSnap(ev.start + shift);
    var b = rmSnap(a + ev.quarters);
    while (a >= 4 - EPS) {
      a = rmSnap(a - 4);
      b = rmSnap(b - 4);
    }
    while (b <= EPS) {
      a = rmSnap(a + 4);
      b = rmSnap(b + 4);
    }
    if (a < -EPS && b > EPS) {
      var before = rmSnap(-a);
      var after = rmSnap(Math.min(b, 4));
      out.push({
        type: ev.type,
        start: rmSnap(4 + a),
        quarters: before,
        tieOut: ev.type === "note" && after > EPS,
        wrapEnd: true
      });
      if (after > EPS) {
        out.push({
          type: ev.type,
          start: 0,
          quarters: after,
          tieOut: !!ev.tieOut,
          wrapStart: true
        });
      }
      return;
    }
    if (a >= -EPS && b > 4 + EPS) {
      var left = rmSnap(4 - a);
      var right = rmSnap(b - 4);
      out.push({
        type: ev.type,
        start: a,
        quarters: left,
        tieOut: ev.type === "note",
        wrapEnd: true
      });
      out.push({
        type: ev.type,
        start: 0,
        quarters: right,
        tieOut: !!ev.tieOut,
        wrapStart: true
      });
      return;
    }
    if (a < -EPS && b <= EPS) {
      out.push({
        type: ev.type,
        start: rmSnap(4 + a),
        quarters: rmSnap(b - a),
        tieOut: !!ev.tieOut,
        wrapEnd: true
      });
      return;
    }
    out.push({
      type: ev.type,
      start: a < 0 ? 0 : a,
      quarters: rmSnap(b - a),
      tieOut: !!ev.tieOut
    });
  }

  function rmCircularPieces(notation, shift) {
    var events = rmParse(notation);
    var placed = [];
    var i;
    for (i = 0; i < events.length; i++) {
      rmCircularPlace(events[i], shift, placed);
    }
    placed.sort(function (x, y) {
      return x.start - y.start;
    });
    return placed;
  }

  function rmShiftNotation(notation, shift) {
    shift = rmSnap(shift);
    if (Math.abs(shift) < EPS) {
      return notation;
    }
    var placed = rmCircularPieces(notation, shift);
    var wrapEnds = [];
    var hasWrapStart = false;
    var i;
    for (i = 0; i < placed.length; i++) {
      if (placed[i].wrapEnd && placed[i].type === "note") {
        wrapEnds.push({
          type: placed[i].type,
          start: placed[i].start,
          quarters: placed[i].quarters,
          tieOut: true
        });
      }
      if (placed[i].wrapStart && placed[i].type === "note") {
        hasWrapStart = true;
      }
    }
    var mainStr = rmEmit(placed, 0, 4);
    if (wrapEnds.length && hasWrapStart) {
      var pickLo = wrapEnds[0].start;
      for (i = 1; i < wrapEnds.length; i++) {
        if (wrapEnds[i].start < pickLo) {
          pickLo = wrapEnds[i].start;
        }
      }
      var pickStr = rmEmit(wrapEnds, pickLo, 4);
      return pickStr + " | " + mainStr + "|";
    }
    return "| " + mainStr + " |";
  }

  function rmItem(notation, caption) {
    return notation + " \u00B7 " + caption;
  }

  function rmBuildItems() {
    var items = [];
    var n;
    for (n = 0; n < BASES.length; n++) {
      items.push(rmItem(BASES[n], String(n + 1)));
    }
    var f;
    for (f = 0; f < FAMILIES.length; f++) {
      var fam = FAMILIES[f];
      for (n = 0; n < BASES.length; n++) {
        var shifted = rmShiftNotation(BASES[n], fam.shift);
        items.push(rmItem(shifted, String(n + 1) + " \u00B7 " + fam.label));
      }
    }
    return items;
  }

  /* Expose for tools / spot-check. */
  if (typeof window !== "undefined") {
    window.rhythmMotifsShift = rmShiftNotation;
    window.rhythmMotifsBases = BASES;
    window.rhythmMotifsFamilies = FAMILIES;
  }

  registerExercise({
    id: "rhythmMotifs",
    label: "22 Rhythm Motifs",
    bars: 2,
    meter: { beats: 4, unit: 4 },
    inMenu: false,
    items: rmBuildItems()
  });
})();
