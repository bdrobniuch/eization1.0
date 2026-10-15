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

  function rmEmitBeam(run) {
    var beamStr = "{";
    var r;
    for (r = 0; r < run.length; r++) {
      if (r) {
        beamStr += " ";
      }
      beamStr += "/e";
      if (run[r].tieOut && r < run.length - 1) {
        beamStr += "~";
      }
    }
    beamStr = beamStr.replace(/\/e~ \/e/g, "/e~/e");
    beamStr += "}";
    if (run[run.length - 1].tieOut) {
      beamStr += "~";
    }
    return beamStr;
  }

  function rmMergeRests(pieces) {
    var out = [];
    var i;
    for (i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (
        p.type === "rest" &&
        out.length &&
        out[out.length - 1].type === "rest"
      ) {
        out[out.length - 1].quarters = rmSnap(
          out[out.length - 1].quarters + p.quarters
        );
      } else {
        out.push({
          type: p.type,
          start: p.start,
          quarters: p.quarters,
          tieOut: p.tieOut
        });
      }
    }
    return out;
  }

  function rmEmit(pieces, lo, hi) {
    var filled = rmMergeRests(rmFillGaps(pieces, lo, hi));
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

  function rmShiftNotation(notation, shift) {
    shift = rmSnap(shift);
    if (Math.abs(shift) < EPS) {
      return notation;
    }
    var events = rmParse(notation).map(function (ev) {
      return {
        type: ev.type,
        start: rmSnap(ev.start + shift),
        quarters: ev.quarters,
        tieOut: ev.tieOut
      };
    });

    if (shift < 0) {
      var pickup = rmClip(events, shift, 0);
      var main = rmClip(events, 0, 4);
      var mainStr = rmEmit(main, 0, 4);
      var pickHasNote = false;
      var pi;
      for (pi = 0; pi < pickup.length; pi++) {
        if (pickup[pi].type === "note") {
          pickHasNote = true;
          break;
        }
      }
      if (!pickHasNote) {
        return mainStr;
      }
      return rmEmit(pickup, shift, 0) + " | " + mainStr;
    }

    var bar1 = rmClip(events, 0, 4);
    var spillRaw = rmClip(events, 4, 4 + shift);
    var s1 = rmEmit(bar1, 0, 4);
    var hasNote = false;
    var si;
    for (si = 0; si < spillRaw.length; si++) {
      if (spillRaw[si].type === "note") {
        hasNote = true;
        break;
      }
    }
    if (!hasNote) {
      return s1;
    }
    var spillPieces = spillRaw.map(function (p) {
      return {
        type: p.type,
        start: rmSnap(p.start - 4),
        quarters: p.quarters,
        tieOut: p.tieOut
      };
    });
    return s1 + " | " + rmEmit(spillPieces, 0, 4);
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
    inMenu: false,
    items: rmBuildItems()
  });
})();
