var failed = 0;
var lines = [];

function check(name, ok) {
  lines.push((ok ? "ok   " : "FAIL ") + name);
  if (!ok) {
    failed++;
  }
}

function near(a, b) {
  return Math.abs(a - b) < 0.004;
}

function finish() {
  try {
    if (savedDesk === null) {
      localStorage.removeItem("eization-desk");
    } else {
      localStorage.setItem("eization-desk", savedDesk);
    }
  } catch (err) {}
  lines.push(failed ? failed + " failed" : "all passed");
  document.getElementById("out").textContent = lines.join("\n");
  document.title = failed ? "FAIL" : "PASS";
}

var savedDesk = null;
try {
  savedDesk = localStorage.getItem("eization-desk");
  localStorage.removeItem("eization-desk");
  localStorage.setItem("eization-hello", "1");
} catch (err) {}

var frame = document.createElement("iframe");
frame.setAttribute("title", "app");
frame.style.cssText = "position:absolute;left:-2000px;width:800px;height:700px;border:0";
frame.src = "../index.html?smoke=1";
document.body.appendChild(frame);

frame.addEventListener("load", function () {
  window.setTimeout(run, 80);
});

function run() {
  var w;
  try {
    w = frame.contentWindow;
    if (!w.deskReady || !w.exercises || !w.menuOrder) {
      window.setTimeout(run, 50);
      return;
    }
  } catch (err) {
    check("app frame", false);
    finish();
    return;
  }
  try {
    exerciseMenu(w);
    staffNotation(w);
    clock(w);
    swing(w);
    neo(w);
    editorLines(w);
    editorFile(w);
    deskRoundTrip(w);
    moreCatalog(w);
    shareCase(w);
    helloStaffTour(w);
    notationGuide(w);
    chatCase(w);
    foreignDesk(w);
    storageMigration(w);
    check("practice screen can stay awake", typeof w.keepPracticeAwake === "function" && typeof w.practiceScreenAwake === "function");
    w.keepPracticeAwake();
    check("staying awake leaves play stopped", w.paused === true);
    check("metronome stays paused", w.paused === true);
  } catch (err) {
    check("threw " + (err && err.message ? err.message : err), false);
  }
  finish();
}

function exerciseMenu(w) {
  var i;
  var seen = {};
  check("menu has 11 exercises", w.menuOrder.length === 11);
  check("free play is last", w.menuOrder[w.menuOrder.length - 1] === "freePlay");
  check("free play captions use the middle dot", w.itemToLine(w.exercises.freePlay.items[0]).indexOf(" \u00B7 ") > 0);
  for (i = 0; i < w.menuOrder.length; i++) {
    var id = w.menuOrder[i];
    var ex = w.exercises[id];
    seen[id] = true;
    check("listed " + id, !!(ex && ex.inMenu));
  }
  check("rhythms id stays limbs", w.exercises.limbs && w.exercises.limbs.label === "Rhythms");
  check(
    "rhythms examples are slash staff",
    !!(
      w.exercises.limbs &&
      w.exercises.limbs.items[0] &&
      typeof w.isMusicNotation === "function" &&
      w.isMusicNotation(w.exercises.limbs.items[0])
    )
  );
  var hidden = 0;
  for (id in w.exercises) {
    if (!w.exercises[id].inMenu) {
      hidden++;
      check("hidden stays out of the menu: " + id, !seen[id]);
    }
  }
  check("hidden exercises still registered", hidden === 16);
  check("address finds a seeded exercise", w.exerciseIdFromQuery("?exercise=scales") === "ex:scales");
  check("address waits to add a library exercise", w.exerciseIdFromQuery("?exercise=intervals") === "");
  var deskList = w.listDeskExercises();
  check("desk seeds the visible catalog", deskList.length === w.menuOrder.length);
  var buttons = w.document.querySelectorAll("#exerciseMenu [data-value]");
  check("menu buttons match the desk list", buttons.length === deskList.length);
  check("menu has New exercise", !!w.document.querySelector("#exerciseMenu [data-new-exercise]"));
  check("menu has More exercises", !!w.document.querySelector("#exerciseMenu [data-more-exercises]"));
  var special = w.document.querySelectorAll("#exerciseMenu button.menu-special");
  check("special menu buttons stay distinguished", special.length === 2);
  check("address opens scales", w.exerciseIdFromQuery("?exercise=scales") === "ex:scales");
  check("address opens rhythms", w.exerciseIdFromQuery("?exercise=limbs") === "ex:limbs");
  check("address opens play/rest", w.exerciseIdFromQuery("?exercise=playRest") === "ex:playRest");
  check("address ignores a hidden exercise", w.exerciseIdFromQuery("?exercise=licks") === "");
  check("address ignores other queries", w.exerciseIdFromQuery("?smoke=1") === "");
  check("practice page is linked from Menu", !!w.document.querySelector("#aboutNav a[href='./practice.html']"));
  check("books page is linked from Menu", !!w.document.querySelector("#aboutNav a[href='./books.html']"));
  check("more page is linked from Menu", !!w.document.querySelector("#aboutNav a[href='./more.html']"));
  check("restore defaults lives in Menu", !!w.document.querySelector("#about #restoreDefaults"));
  check("download all lives in Menu", !!w.document.querySelector("#about #downloadAllExercises"));
  var packed = w.packDeskExercises();
  check("desk backup packs exercises", !!(packed && packed.kind === "exercises" && packed.exercises.length === w.menuOrder.length));
  var round = w.parseDeskExercisesBackup(JSON.stringify(packed));
  check("desk backup parses back", !!(round && round.exercises && round.exercises.length === packed.exercises.length));
  var addedIntervals = w.addCatalogExercise("intervals");
  check(
    "a library page can add its exercise",
    !!(addedIntervals && addedIntervals.seedId === "intervals" && w.exerciseIdFromQuery("?exercise=intervals") === addedIntervals.id)
  );
}

function staffNotation(w) {
  check("staff parser is loaded", typeof w.parseMusicNotation === "function" && typeof w.isMusicNotation === "function");
  check("staff status helper is loaded", typeof w.staffNotationStatus === "function");
  var dotted = w.parseMusicNotation("C4q. D4e");
  check(
    "dotted quarter parses",
    !!(
      dotted &&
      dotted.events.length === 2 &&
      dotted.events[0].duration === "q." &&
      typeof w.staffDurationQuarters === "function" &&
      w.staffDurationQuarters("q.") === 1.5
    )
  );
  check("dotted whole is rejected", !w.parseMusicNotation("C4w."));
  var tiedQuarters = w.parseMusicNotation("/q~/q");
  check(
    "a slash tie parses",
    !!(tiedQuarters && tiedQuarters.events.length === 2 && tiedQuarters.events[0].tieOutKeys && tiedQuarters.events[0].tieOutKeys[0] === "slash")
  );
  var tiedBar = w.parseMusicNotation("C4q~|C4q");
  check(
    "a tie across a barline parses",
    !!(tiedBar && tiedBar.events.length === 3 && tiedBar.events[0].tieOutKeys && tiedBar.events[0].tieOutKeys[0] === "C4" && tiedBar.events[1].type === "barline")
  );
  var tiedBeam = w.parseMusicNotation("{/e /e}~{/e /e}");
  check(
    "a tie between beams parses",
    !!(tiedBeam && tiedBeam.events.length === 2 && tiedBeam.events[0].type === "beam" && tiedBeam.events[0].tieOutKeys && tiedBeam.events[0].tieOutKeys[0] === "slash")
  );
  var tiedChord = w.parseMusicNotation("[C4q E4q]~[C4q E4q]");
  check(
    "a chord tie keeps both pitches",
    !!(tiedChord && tiedChord.events[0].tieOutKeys && tiedChord.events[0].tieOutKeys.length === 2)
  );
  var tiedInside = w.parseMusicNotation("{C4e~ C4e}");
  check(
    "a tie inside a beam parses",
    !!(tiedInside && tiedInside.events[0].notes && tiedInside.events[0].notes[0].tieToNext)
  );
  check("a tie onto a different pitch is rejected", !w.parseMusicNotation("C4q~D4q"));
  check("a tie from a rest is rejected", !w.parseMusicNotation("rq~/q"));
  check("a dangling tie is rejected", !w.parseMusicNotation("C4q~"));
  var tiedSvg = w.renderMusicStaff("/q~/q", "current");
  check(
    "a tie draws a curve",
    !!(tiedSvg && tiedSvg.querySelector("path.staff-tie"))
  );
  var brokenTuplet = w.staffNotationStatus("(3 C4e D4e E4e");
  check(
    "broken tuplet is notation-ish and not ok",
    !!(brokenTuplet && !brokenTuplet.ok && brokenTuplet.notationIsh)
  );
  var plainStatus = w.staffNotationStatus("C♯");
  check(
    "plain text is not notation-ish",
    !!(plainStatus && !plainStatus.ok && !plainStatus.notationIsh)
  );
  var okStatus = w.staffNotationStatus("C4q · Caption");
  check(
    "valid staff status keeps caption",
    !!(okStatus && okStatus.ok && okStatus.music === "C4q" && okStatus.caption === "Caption")
  );
  var slash = w.parseMusicNotation("/q. /e rh");
  check(
    "slash charleston parses",
    !!(
      slash &&
      slash.events.length === 3 &&
      slash.events[0].head === "slash" &&
      slash.events[0].duration === "q." &&
      slash.events[2].type === "rest"
    )
  );
  var beamed = w.parseMusicNotation("{/e_R /e_L /e_R /e_L}");
  check(
    "slash beam with sticking labels",
    !!(
      beamed &&
      beamed.events.length === 1 &&
      beamed.events[0].type === "beam" &&
      beamed.events[0].notes.length === 4 &&
      beamed.events[0].notes[0].label === "R"
    )
  );
  check(
    "captioned slash is music notation",
    w.isMusicNotation("rq /q rq /q \u00B7 Backbeat")
  );
  var dyn = w.parseMusicNotation("mf C4q cresc D4q f E4q");
  check(
    "a dynamic and a hairpin attach to notes",
    !!(
      dyn &&
      dyn.events.length === 3 &&
      dyn.events[0].dynamic === "mf" &&
      dyn.events[1].hairpin === "cresc" &&
      dyn.events[2].dynamic === "f" &&
      dyn.events[2].hairpinEnd
    )
  );
  check("a dangling dynamic is rejected", !w.parseMusicNotation("mf"));
  check("a hairpin with no note is rejected", !w.parseMusicNotation("cresc"));
  var chords = w.parseMusicNotation("^G /q /q ^D /q /q");
  check(
    "a chord symbol can change above slashes",
    !!(chords && chords.events[0].chord === "G" && chords.events[2].chord === "D")
  );
  var play = w.parseMusicNotation("^G / / / / | ^D / / ^A / /");
  var playNotes = [];
  var playI;
  if (play) {
    for (playI = 0; playI < play.events.length; playI++) {
      if (play.events[playI].type === "note") {
        playNotes.push(play.events[playI]);
      }
    }
  }
  var playBeat = playNotes.length === 8 && playNotes[0].chord === "G" && playNotes[4].chord === "D" && playNotes[6].chord === "A";
  if (playBeat) {
    for (playI = 0; playI < playNotes.length; playI++) {
      if (playNotes[playI].head !== "beat") {
        playBeat = false;
      }
    }
  }
  check("a bare slash is play anything", playBeat);
  var playSvg = w.renderMusicStaff("^G / / / /", "current");
  var rhythmSvg = w.renderMusicStaff("/q /q /q /q", "current");
  check(
    "play anything has no stem",
    !!(playSvg && rhythmSvg && playSvg.querySelectorAll("line").length < rhythmSvg.querySelectorAll("line").length)
  );
  var prog = w.exercises && w.exercises.essentialProgressions;
  var progRhythm = false;
  var progI;
  if (prog && prog.items) {
    for (progI = 0; progI < prog.items.length; progI++) {
      if (String(prog.items[progI]).indexOf("/q") >= 0) {
        progRhythm = true;
      }
    }
  }
  check("essential progressions use play anything", !!(prog && prog.items && prog.items.length && !progRhythm));
  check("a dangling chord symbol is rejected", !w.parseMusicNotation("^G"));
  var simile = w.parseMusicNotation("^II- /q /q %");
  check(
    "a simile fills the rest of the bar",
    !!(simile && simile.events.length === 3 && simile.events[2].type === "simile" && simile.events[0].chord === "II-")
  );
  var artic = w.parseMusicNotation("C4e'> /q>");
  check(
    "articulations stay on the note",
    !!(
      artic &&
      artic.events[0].articulations &&
      artic.events[0].articulations[0] === "staccato" &&
      artic.events[0].articulations[1] === "accent" &&
      artic.events[1].articulations[0] === "accent"
    )
  );
  var marked = w.renderMusicStaff("mf /q /q cresc f /q>", "current");
  check(
    "dynamics, a hairpin, and an accent draw",
    !!(
      marked &&
      marked.querySelector("text.staff-dynamic") &&
      marked.querySelector("line.staff-hairpin") &&
      marked.querySelector(".staff-artic")
    )
  );
  var simileSvg = w.renderMusicStaff("%", "current");
  check(
    "a simile bar draws the repeat sign",
    !!(simileSvg && simileSvg.querySelector(".staff-simile"))
  );
  var staffIds = ["essentialProgressions", "playRest", "dynamics", "tuplets", "ties", "limbs"];
  var badLine = "";
  var si;
  var li;
  for (si = 0; si < staffIds.length; si++) {
    var seed = w.exercises[staffIds[si]];
    var seedLines = seed && (seed.items || seed.lines);
    if (!seedLines) {
      badLine = staffIds[si];
      break;
    }
    for (li = 0; li < seedLines.length; li++) {
      var music = typeof w.staffExampleParts === "function" ? w.staffExampleParts(seedLines[li]).music : seedLines[li];
      if (music.length > 240 || !w.parseMusicNotation(music)) {
        badLine = staffIds[si] + " " + music;
        break;
      }
    }
    if (badLine) {
      break;
    }
  }
  check("staff exercises parse", !badLine);
  var svg = typeof w.renderMusicStaff === "function" ? w.renderMusicStaff("/q /q /q /q", "current") : null;
  check("slash staff renders svg", !!(svg && svg.tagName && svg.tagName.toLowerCase() === "svg"));
  check("beam tip helper is loaded", typeof w.staffBeamTipYs === "function");
  if (typeof w.staffBeamTipYs === "function") {
    var flat = w.staffBeamTipYs([0, 30, 60, 90], [0, 24, 12, 0], true, 42);
    check(
      "a low inner note reaches a flat beam",
      flat.length === 4 && flat[0] === -42 && flat[1] === -42 && flat[2] === -42 && flat[3] === -42
    );
    var peak = w.staffBeamTipYs([0, 30, 60, 90], [24, 0, 12, 24], true, 42);
    check(
      "a high inner note pulls the beam out",
      peak.length === 4 && peak[0] === -42 && peak[1] === -42 && peak[2] === -42 && peak[3] === -42
    );
    var scale = w.staffBeamTipYs([0, 30, 60, 90], [18, 12, 6, 0], true, 42);
    check(
      "a scale keeps one stem length",
      scale[0] === -24 && scale[1] === -30 && scale[2] === -36 && scale[3] === -42
    );
    var down = w.staffBeamTipYs([0, 30, 60, 90], [0, 24, 12, 0], false, 42);
    check(
      "down-stems drop the beam to the lowest note",
      down[0] === 66 && down[1] === 66 && down[2] === 66 && down[3] === 66
    );
    var jag = w.staffBeamTipYs([0, 34, 68, 102], [18, 6, 12, 0], true, 42);
    check(
      "an off-line note sits on the sloped beam",
      Math.abs(jag[1] - (6 - 42)) < 0.001 && Math.abs((jag[1] - jag[0]) - (jag[2] - jag[1])) < 0.001
    );
  }
  check("jagged up-stems meet the beam", staffBeamStemsMeet(w, "{G4e C4e E4e G4e}"));
  check("peaked up-stems meet the beam", staffBeamStemsMeet(w, "{C4e G4e E4e C4e}"));
  check("jagged down-stems meet the beam", staffBeamStemsMeet(w, "{G5e C5e E5e G5e}"));
  check("peaked down-stems meet the beam", staffBeamStemsMeet(w, "{C5e G5e E5e C5e}"));
  check("mixed durations meet the beam", staffBeamStemsMeet(w, "{C4s E4e D4s G4s}"));
  check("accidental spacing still meets the beam", staffBeamStemsMeet(w, "{C4e F#4e D4e G4e}"));
  var scaleSvg = w.renderMusicStaff("{C4e D4e E4e F4e}", "current");
  var scaleLens = staffStemLengths(scaleSvg);
  check(
    "a written scale keeps equal stems",
    scaleLens.length === 4 && Math.max.apply(null, scaleLens) - Math.min.apply(null, scaleLens) < 0.05
  );
  staffTuplets(w);
}

function staffTuplets(w) {
  var trip = w.parseMusicNotation("(3 C4e D4e E4e)");
  check(
    "triplet parses as one tuplet",
    !!(
      trip &&
      trip.events.length === 1 &&
      trip.events[0].type === "tuplet" &&
      trip.events[0].n === 3 &&
      trip.events[0].m === 2 &&
      trip.events[0].showRatio === false &&
      trip.events[0].events.length === 3
    )
  );
  var ratio = w.parseMusicNotation("(5:4 C4s D4s E4s F4s G4s)");
  check("written ratio is kept", !!(ratio && ratio.events[0].m === 4 && ratio.events[0].showRatio === true));
  var septDefault = w.parseMusicNotation("(7 /s /s /s /s /s /s /s)");
  check("septuplet defaults to 7:4", !!(septDefault && septDefault.events[0].m === 4));
  check("standalone close parses", !!w.parseMusicNotation("(3 C4e D4e E4e )"));
  check("braces and stacks parse inside", !!w.parseMusicNotation("(3 {C4e D4e} [E4e G4e])"));
  check("a stack label keeps its parentheses", !!w.parseMusicNotation("(3 C4q D4q [E4q G4q]_C7(b9))"));
  check("nested tuplet is rejected", !w.parseMusicNotation("(3 C4e (3 D4e E4e) F4e)"));
  check("unclosed tuplet is rejected", !w.parseMusicNotation("(3 C4e D4e E4e"));
  check("barline inside a tuplet is rejected", !w.parseMusicNotation("(3 C4q | D4q E4q)"));
  check("one-note tuplet is rejected", !w.parseMusicNotation("(3 C4q)"));
  var mixed = w.parseMusicNotation("(3 /q /e)");
  check(
    "mixed triplet lasts one beat",
    !!(mixed && typeof w.staffEventQuarters === "function" && Math.abs(w.staffEventQuarters(mixed.events[0]) - 1) < 1e-9)
  );

  function tupletGroups(source) {
    var svg = w.renderMusicStaff(source, "current");
    return svg ? svg.querySelectorAll(".staff-tuplet") : [];
  }
  function bracketCount(source) {
    var svg = w.renderMusicStaff(source, "current");
    return svg ? svg.querySelectorAll(".tuplet-bracket").length : -1;
  }
  var beamedGroups = tupletGroups("(3 C4e D4e E4e)");
  check(
    "a beamed triplet shows the number only",
    beamedGroups.length === 1 &&
      !beamedGroups[0].classList.contains("has-bracket") &&
      beamedGroups[0].querySelectorAll("path").length === 1
  );
  check("a beamed mixed triplet shows the number only", bracketCount("(3 C4e. D4s E4e)") === 0);
  check("a sixteenth septuplet shows the number only", bracketCount("(7 C4s D4s E4s F4s G4s A4s B4s)") === 0);
  check("a quarter-note triplet gets a bracket", bracketCount("(3 C4q D4q E4q)") === 1);
  check("a rest inside gets a bracket", bracketCount("(3 /e re /e)") === 1);
  check("a split beam gets a bracket", bracketCount("(3 {/e /e} /e)") === 1);
  check("an unbeamed mixed triplet gets a bracket", bracketCount("(3 /q /e)") === 1);
  check("a whole-note triplet gets a bracket", bracketCount("(3 C4w E4w G4w)") === 1);
  var ratioGroups = tupletGroups("(5:4 C4s D4s E4s F4s G4s)");
  check(
    "a written ratio prints three glyphs",
    ratioGroups.length === 1 && ratioGroups[0].querySelectorAll("g").length === 3
  );
  check("triplet stems meet the beam", staffBeamStemsMeet(w, "(3 C4e D4e E4e)"));
  check("septuplet stems meet the beam", staffBeamStemsMeet(w, "(7 C4s D4s E4s F4s G4s A4s B4s)"));
  check("bracket clears up-stems", staffBracketClearsStems(w, "(3 C4q D4q G4q)", true));
  check("bracket clears down-stems", staffBracketClearsStems(w, "(3 C5q D5q A5q)", false));

  var eighthStack = w.renderMusicStaff("[C4e E4e G4e]", "current");
  var quarterStack = w.renderMusicStaff("[C4q E4q G4q]", "current");
  check(
    "a short stack gets a flag",
    !!(eighthStack && quarterStack) &&
      eighthStack.querySelectorAll("g[transform]").length === quarterStack.querySelectorAll("g[transform]").length + 1
  );

  var items = w.exercises.tuplets ? w.exercises.tuplets.items : [];
  var allFit = items.length > 0;
  var k;
  for (k = 0; k < items.length; k++) {
    var parts = w.staffExampleParts(items[k]);
    var ast = w.parseMusicNotation(parts.music);
    var total = 0;
    var bars = 1;
    var e;
    if (!ast || !parts.caption) {
      allFit = false;
      break;
    }
    for (e = 0; e < ast.events.length; e++) {
      if (ast.events[e].type === "barline") {
        bars++;
      }
      total += w.staffEventQuarters(ast.events[e]);
    }
    if (bars !== 2 || Math.abs(total - 8) > 1e-9 || !w.renderMusicStaff(parts.music, "current")) {
      allFit = false;
      break;
    }
  }
  check("every tuplets example fills two bars of 4/4", allFit);

  var tieItems = w.exercises.ties ? w.exercises.ties.items : [];
  var tiesFit = tieItems.length === 27;
  for (k = 0; k < tieItems.length; k++) {
    var tieParts = w.staffExampleParts(tieItems[k]);
    var tieAst = w.parseMusicNotation(tieParts.music);
    var tieTotal = 0;
    var tieBars = 1;
    if (!tieAst) {
      tiesFit = false;
      break;
    }
    for (e = 0; e < tieAst.events.length; e++) {
      if (tieAst.events[e].type === "barline") {
        tieBars++;
      }
      tieTotal += w.staffEventQuarters(tieAst.events[e]);
    }
    var tieSvg = w.renderMusicStaff(tieParts.music, "current");
    if (
      tieParts.music.indexOf("~") < 0 ||
      tieBars !== 2 ||
      Math.abs(tieTotal - 8) > 1e-9 ||
      !tieSvg ||
      !tieSvg.querySelector("path.staff-tie")
    ) {
      tiesFit = false;
      break;
    }
  }
  check("every ties example fills two bars of 4/4", tiesFit);
}

function staffBracketClearsStems(w, source, above) {
  var svg = w.renderMusicStaff(source, "current");
  var bracket = svg ? svg.querySelector(".tuplet-bracket") : null;
  if (!bracket) {
    return false;
  }
  var nums = (bracket.getAttribute("d").match(/-?\d*\.?\d+/g) || []).map(parseFloat);
  if (nums.length < 12) {
    return false;
  }
  /* Corners of the bracket line: second and fifth points of the path. */
  var bx0 = nums[2];
  var by0 = nums[3];
  var bx1 = nums[8];
  var by1 = nums[9];
  var stems = svg.querySelectorAll("line");
  var checked = 0;
  var i;
  for (i = 0; i < stems.length; i++) {
    var sw = parseFloat(stems[i].getAttribute("stroke-width"));
    var x1 = parseFloat(stems[i].getAttribute("x1"));
    var x2 = parseFloat(stems[i].getAttribute("x2"));
    if (Math.abs(x1 - x2) >= 0.01 || sw <= 1.3 || sw >= 2.2) {
      continue;
    }
    var ya = parseFloat(stems[i].getAttribute("y1"));
    var yb = parseFloat(stems[i].getAttribute("y2"));
    var lineY = by0 + ((by1 - by0) * (x1 - bx0)) / (bx1 - bx0 || 1);
    var hookEnds = above ? Math.max(nums[1], nums[11]) : Math.min(nums[1], nums[11]);
    if (above ? lineY > Math.min(ya, yb) - 4 : lineY < Math.max(ya, yb) + 4) {
      return false;
    }
    if (above ? hookEnds > Math.max(ya, yb) : hookEnds < Math.min(ya, yb)) {
      return false;
    }
    checked++;
  }
  return checked === 3;
}

function staffStemLengths(svg) {
  var lines = svg ? svg.querySelectorAll("line") : [];
  var lens = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var x1 = parseFloat(lines[i].getAttribute("x1"));
    var x2 = parseFloat(lines[i].getAttribute("x2"));
    var sw = parseFloat(lines[i].getAttribute("stroke-width"));
    if (Math.abs(x1 - x2) < 0.01 && sw > 1 && sw < 2.2) {
      lens.push(Math.abs(parseFloat(lines[i].getAttribute("y2")) - parseFloat(lines[i].getAttribute("y1"))));
    }
  }
  return lens;
}

function staffPointSegmentDistance(px, py, seg) {
  var dx = seg.x2 - seg.x1;
  var dy = seg.y2 - seg.y1;
  var len2 = dx * dx + dy * dy || 1;
  var t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2;
  if (t < 0) {
    t = 0;
  }
  if (t > 1) {
    t = 1;
  }
  var ex = px - (seg.x1 + t * dx);
  var ey = py - (seg.y1 + t * dy);
  return Math.sqrt(ex * ex + ey * ey);
}

function staffBeamStemsMeet(w, source) {
  if (typeof w.renderMusicStaff !== "function") {
    return false;
  }
  var svg = w.renderMusicStaff(source, "current");
  if (!svg) {
    return false;
  }
  var lines = svg.querySelectorAll("line");
  var stems = [];
  var beams = [];
  var i;
  for (i = 0; i < lines.length; i++) {
    var x1 = parseFloat(lines[i].getAttribute("x1"));
    var y1 = parseFloat(lines[i].getAttribute("y1"));
    var x2 = parseFloat(lines[i].getAttribute("x2"));
    var y2 = parseFloat(lines[i].getAttribute("y2"));
    var sw = parseFloat(lines[i].getAttribute("stroke-width"));
    if (Math.abs(x1 - x2) < 0.01 && sw > 1 && sw < 2.2) {
      stems.push({ x: x1, y1: y1, y2: y2 });
    } else if (sw >= 4 && Math.abs(x1 - x2) > 1) {
      beams.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
    }
  }
  if (stems.length < 2 || !beams.length) {
    return false;
  }
  var s;
  for (s = 0; s < stems.length; s++) {
    var best = Infinity;
    var b;
    for (b = 0; b < beams.length; b++) {
      best = Math.min(best, staffPointSegmentDistance(stems[s].x, stems[s].y1, beams[b]));
      best = Math.min(best, staffPointSegmentDistance(stems[s].x, stems[s].y2, beams[b]));
    }
    if (best > 0.6) {
      return false;
    }
    if (Math.abs(stems[s].y2 - stems[s].y1) < 41) {
      return false;
    }
  }
  return true;
}

function clock(w) {
  check("4/4 is eight clicks", w.beatsPerBar === 4 && w.stepsPerBar() === 8);
  w.currentBpm = 100;
  check("eighth at 100 BPM is 0.3s", near(w.eighthDuration(), 0.3));
  var notesBefore = w.countnotes;
  w.pendingVisuals = [{ gen: w.generation, advance: true, time: w.currentTimeSec() + 5, step: 0 }];
  w.stopScheduler();
  check("pause keeps the current example", w.countnotes === notesBefore);
  w.pendingVisuals = [{ gen: w.generation, advance: true, time: w.currentTimeSec() - 0.05, step: 0 }];
  w.stopScheduler();
  check("a click already heard still moves ahead", w.countnotes === notesBefore + 1);
}

function swing(w) {
  var bpmBox = w.document.getElementById("bpm");
  var previous = bpmBox ? bpmBox.value : "100";
  w.currentBpm = 400;
  if (bpmBox) {
    bpmBox.value = "400";
  }
  w.setSwingMode("triplet");
  check("triplet ratio is 2", w.activeSwingRatio() === 2);
  var triplet = w.swingGaps();
  check("triplet does not lengthen the short note", triplet.shortNote < 0.055);
  w.setSwingMode("feel");
  w.setSwingAuto(false);
  w.setSwingRatio(2);
  var feel = w.swingGaps();
  check("feel keeps the short note playable", feel.shortNote >= 0.054 && feel.shortNote < 0.07);
  w.setSwingMode("off");
  w.currentBpm = 100;
  if (bpmBox) {
    bpmBox.value = previous;
  }
  check("swing off is straight", w.activeSwingRatio() === 1 && w.swingOn === false);
}

function neo(w) {
  var beats = w.beatsPerBar;
  var unit = w.beatUnit;
  w.currentBpm = 100;
  w.beatsPerBar = 4;
  w.beatUnit = 4;
  w.setSwingMode("neo");
  var amount = w.document.getElementById("swingAmount");
  check("neo hides the swing amount", !!(amount && amount.hidden));
  check("neo leaves beat 1 on the grid", w.neoStepDelay(0) === 0);
  check("neo delays beat 2 by 40 ms", near(w.neoStepDelay(2), 0.04));
  check("neo leaves the & straight", w.neoStepDelay(1) === 0 && w.neoStepDelay(3) === 0);
  check("neo leaves beat 3 on the grid", w.neoStepDelay(4) === 0);
  check("neo delays beat 4 by 40 ms", near(w.neoStepDelay(6), 0.04));
  check("neo gives the time back inside the bar", near(w.neoClickTime(2), 0.64) && near(w.neoClickTime(4), 1.2) && near(w.neoClickTime(8), 2.4));
  w.beatsPerBar = 6;
  w.beatUnit = 8;
  check("neo in 6/8 delays only the second group", w.neoStepDelay(0) === 0 && w.neoStepDelay(2) === 0 && near(w.neoStepDelay(6), 0.04) && near(w.neoClickTime(12), 3.6));
  w.beatsPerBar = 3;
  w.beatUnit = 4;
  check("neo in 3/4 delays only beat 2", w.neoStepDelay(0) === 0 && near(w.neoStepDelay(2), 0.04) && w.neoStepDelay(4) === 0);
  w.beatsPerBar = beats;
  w.beatUnit = unit;
  w.setSwingMode("off");
  check("off still has no swing", w.activeSwingRatio() === 1 && w.swingNeo === false);
}

function editorFile(w) {
  var text = w.editorFileText(["C \u00B7 File", "D"], 4, "Cadence");
  var parsed = w.readEditorFile(text);
  check("exercise file is version 1", text.indexOf("# eization 1\n") === 0 && parsed.version === 1);
  check("exercise file keeps the lines", parsed.lines.length === 2 && parsed.lines[0] === "C \u00B7 File");
  check("exercise file keeps the bars", parsed.bars === 4);
  check("exercise file keeps the name", parsed.name === "Cadence");
  var older = w.readEditorFile("# eization\n# bars 2\nG\n");
  check("an unversioned file still opens", older.version === 1 && older.lines[0] === "G" && older.bars === 2);
  var plain = w.readEditorFile("E\nF\n");
  check("a plain list opens without a header", plain.lines.length === 2 && plain.bars === null && plain.version === null);
  var newer = w.readEditorFile("# eization 2\nA\n");
  check("a newer file is recognized", newer.version === 2 && newer.version > w.EDITOR_FILE_VERSION);
  var mid = w.readEditorFile("# eization 1\n# bars 1\nC4\n# bars 4\nD4\n");
  check("a hash line in the list stays an example", mid.lines.length === 3 && mid.lines[1] === "# bars 4" && mid.bars === 1);
}

function editorLines(w) {
  var split = w.lineToItem("C \u00B7 Desk");
  check("caption splits into two lines", split.indexOf("prog-changes") > 0 && split.indexOf("prog-name") > 0);
  var mark = w.lineToItem("A \uD834\uDD0E");
  check("repeat sign stays in its span", mark.indexOf("simile") > 0 && mark.indexOf("\uD834\uDD0E") > 0);
  check("blank line is dropped", w.lineToItem("   ") === "");
  var longLine = new Array(300).join("a");
  check("a line stops at 240 characters", w.lineToItem(longLine).length === 240);
  check("an accent stays on the line", w.itemToLine("C4q>") === "C4q>");
  check("a plain ampersand stays", w.itemToLine("C&G") === "C&G");
  check("a comparison stays", w.itemToLine("ii < V") === "ii < V");
}

function shareRows(w, shareId) {
  var list = w.listDeskExercises();
  var rows = [];
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].shareId === shareId) {
      rows.push(list[i]);
    }
  }
  return rows;
}

function moreCatalog(w) {
  var req = new XMLHttpRequest();
  req.open("GET", "../more.html", false);
  req.send(null);
  check("more catalog loads", req.status === 0 || (req.status >= 200 && req.status < 300));
  var html = req.responseText || "";
  var hashes = html.match(/#s=[A-Za-z0-9_-]+/g) || [];
  var uniq = {};
  var i;
  for (i = 0; i < hashes.length; i++) {
    uniq[hashes[i]] = true;
  }
  var keys = Object.keys(uniq);
  check("more catalog has 119 share links", keys.length === 119);
  check("more catalog points at practice", html.indexOf('href="./#s=') >= 0);
  check("more catalog links books", html.indexOf("books.html") >= 0 || html.indexOf("changes.html") >= 0);
  if (!keys.length) {
    return;
  }
  var before = w.listDeskExercises().length;
  w.location.hash = keys[0];
  w.offerSharedExercise();
  check("more link opens share ask", w.document.getElementById("shareAsk").hidden === false);
  check("more link offers add", w.document.getElementById("shareAdd").hidden === false);
  check("more link offers preview", w.document.getElementById("sharePreview").hidden === false);
  w.previewShareExercise();
  check("more preview opens edit", w.document.body.classList.contains("is-editing"));
  w.editorCancel();
  var added = w.confirmShareAdd();
  check("more add keeps the exercise", added === true && w.listDeskExercises().length === before + 1);
  check("more add drops the hash", w.location.hash.indexOf("#s=") < 0);
  var esReq = new XMLHttpRequest();
  esReq.open("GET", "../es/more.html", false);
  esReq.send(null);
  var esHtml = esReq.responseText || "";
  var esHashes = esHtml.match(/#s=[A-Za-z0-9_-]+/g) || [];
  check("spanish more catalog has 119 share links", esHashes.length === 119);
  check("spanish more uses the same hashes", esHashes.length === keys.length && esHashes.indexOf(keys[0]) >= 0);
}

function notationSampleCount(path) {
  var req = new XMLHttpRequest();
  req.open("GET", path, false);
  req.send(null);
  var chunks = (req.responseText || "").match(/<pre>[\s\S]*?<\/pre>/g) || [];
  return { text: req.responseText || "", chunks: chunks };
}

function notationSamplesParse(w, chunks) {
  var i;
  var parsed = 0;
  for (i = 0; i < chunks.length; i++) {
    var text = chunks[i].replace(/<\/?pre>/g, "").replace(/^\s+|\s+$/g, "");
    var parts = w.staffExampleParts(text);
    if (parts.music && w.parseMusicNotation(parts.music)) {
      parsed++;
    }
  }
  return parsed;
}

function notationGuide(w) {
  var page = notationSampleCount("../notation.html");
  var parsed = notationSamplesParse(w, page.chunks);
  check("notation guide samples parse", page.chunks.length >= 8 && parsed === page.chunks.length);
  var esPage = notationSampleCount("../es/notation.html");
  check(
    "spanish notation guide matches",
    esPage.chunks.length === page.chunks.length && notationSamplesParse(w, esPage.chunks) === esPage.chunks.length
  );
  var scales = notationSampleCount("../for-teachers/scales-on-the-staff.html");
  var grooves = notationSampleCount("../for-teachers/voicings-and-grooves.html");
  var tiesArticle = notationSampleCount("../for-teachers/ties-on-the-staff.html");
  var tiesArticleEs = notationSampleCount("../es/for-teachers/ties-on-the-staff.html");
  check(
    "teacher staff examples parse",
    scales.chunks.length >= 3 &&
      notationSamplesParse(w, scales.chunks) === scales.chunks.length &&
      grooves.chunks.length >= 6 &&
      notationSamplesParse(w, grooves.chunks) === grooves.chunks.length &&
      tiesArticle.chunks.length >= 3 &&
      notationSamplesParse(w, tiesArticle.chunks) === tiesArticle.chunks.length &&
      tiesArticleEs.chunks.length === tiesArticle.chunks.length &&
      notationSamplesParse(w, tiesArticleEs.chunks) === tiesArticleEs.chunks.length
  );
}

function helloStaffTour(w) {
  var tour = w.HELLO_TOUR;
  var end = w.HELLO_LAUNCH_END;
  var show = tour[end];
  check(
    "launch tour shows staff exercises",
    !!(
      tour &&
      end === 8 &&
      tour[0].selectSeed === "allNotes" &&
      tour[0].key === "hello.exercise" &&
      tour[1].selectSeed === "scales" &&
      tour[1].key === "hello.staffScale" &&
      tour[2].selectSeed === "leftHandRootless" &&
      tour[2].key === "hello.staffChord" &&
      tour[3].key === "hello.example" &&
      show &&
      show.key === "hello.exercise" &&
      !show.selectSeed
    )
  );
  var savedHello = localStorage.getItem("eization-hello");
  w.currentExerciseId = "ex:allNotes";
  w.beginHello(0, w.HELLO_LAUNCH_END);
  w.helloSelectSeed("leftHandRootless");
  check("tour can leave the open exercise", w.currentExerciseId !== "ex:allNotes");
  w.endHello();
  check("tour returns to the exercise you had", w.currentExerciseId === "ex:allNotes" && !w.document.body.classList.contains("is-hello"));
  if (savedHello == null) {
    localStorage.removeItem("eization-hello");
  } else {
    localStorage.setItem("eization-hello", savedHello);
  }
  check(
    "staff intro lines",
    w.I18N.en["hello.staffScale"] === "Scales are written on a staff." &&
      w.I18N.es["hello.staffScale"] === "Las escalas se escriben en el pentagrama." &&
      w.I18N.en["hello.staffChord"] === "Chords can be written on a staff too." &&
      w.I18N.es["hello.staffChord"] === "Los acordes también se escriben en el pentagrama."
  );
}

function shareCase(w) {
  var base = "https://eization.com/";
  var week = { v: 1, id: "teach001", name: "Week", bars: 4, lines: ["Dm7 G7", "Cmaj7"] };
  var url = w.shareExerciseUrl(week, base);
  var read = url ? w.readShareHash(url.slice(url.indexOf("#"))) : null;
  check("share link round trip", !!(read && read.shareId === "teach001" && read.name === "Week" && read.bars === 4 && read.lines.length === 2 && read.lines[0] === "Dm7 G7"));
  check("share lives in edit", !!w.document.getElementById("editShare"));
  check("share prompt is in the page", !!w.document.getElementById("shareAsk"));
  check("intro edit line stays", w.I18N.en["hello.edit"] === "Edit builds your own exercise." && w.I18N.es["hello.edit"] === "Editar arma tu propio ejercicio.");
  var notes = w.getDeskExercise("ex:allNotes");
  var factoryCount = w.listDeskExercises().length;
  var factoryLines = notes.lines.slice();
  check("scales do not fit in a share link", w.shareExerciseUrl({ v: 1, id: "fact0001", name: "Escalas", bars: w.getDeskExercise("ex:scales").bars, lines: w.getDeskExercise("ex:scales").lines.slice() }, base) === "");
  var factoryUrl = w.shareExerciseUrl({ v: 1, id: "fact0001", name: "Todas las notas", bars: notes.bars, lines: factoryLines }, base);
  w.location.hash = factoryUrl.slice(factoryUrl.indexOf("#"));
  w.offerSharedExercise();
  check("factory exercise opens quietly", w.currentExerciseId === "ex:allNotes" && w.listDeskExercises().length === factoryCount && w.document.getElementById("shareAsk").hidden === true && w.location.hash.indexOf("#s=") < 0 && !w.getDeskExercise("ex:allNotes").shareId);
  var editedLines = factoryLines.slice();
  editedLines[0] = editedLines[0] + " x";
  w.updateDeskExercise("ex:allNotes", { lines: editedLines });
  var editedUrl = w.shareExerciseUrl({ v: 1, id: "fact0002", name: "All Notes", bars: notes.bars, lines: factoryLines }, base);
  w.location.hash = editedUrl.slice(editedUrl.indexOf("#"));
  w.offerSharedExercise();
  check("edited factory exercise stays a new link", w.document.getElementById("shareAsk").hidden === false && w.document.getElementById("shareAdd").hidden === false && w.listDeskExercises().length === factoryCount);
  w.dismissShareAsk();
  w.updateDeskExercise("ex:allNotes", { lines: factoryLines });
  var before = w.listDeskExercises().length;
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  check("share prompt is up", w.document.getElementById("shareAsk").hidden === false);
  check("share add is the action", w.document.getElementById("shareAdd").hidden === false && w.document.getElementById("sharePreview").hidden === false && w.document.getElementById("shareUpdate").hidden === true);
  localStorage.removeItem("eization-hello");
  w.helloTouched = true;
  var added = w.confirmShareAdd();
  var rows = shareRows(w, "teach001");
  check("add keeps the other exercises", added === true && w.listDeskExercises().length === before + 1 && rows.length === 1);
  check("add drops the hash", w.location.hash.indexOf("#s=") < 0);
  check("add leaves the prompt", w.document.getElementById("shareAsk").hidden === true);
  check("add offers the intro", w.shareBlocksHello() === false && w.document.body.classList.contains("is-hello"));
  w.endHello();
  localStorage.setItem("eization-hello", "1");
  var count = w.listDeskExercises().length;
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  check("exact match does not add", w.listDeskExercises().length === count && w.document.getElementById("shareAsk").hidden === true);
  check("exact match drops the hash", w.location.hash.indexOf("#s=") < 0);
  var changed = { v: 1, id: "teach001", name: "Week", bars: 4, lines: ["Dm7 G7", "C6"] };
  var url2 = w.shareExerciseUrl(changed, base);
  w.location.hash = url2.slice(url2.indexOf("#"));
  w.offerSharedExercise();
  check("changed exercise offers update", w.document.getElementById("shareUpdate").hidden === false && w.document.getElementById("shareAddNew").hidden === false && w.document.getElementById("sharePreview").hidden === false && w.document.getElementById("shareAdd").hidden === true && w.document.getElementById("shareAskLead").textContent === w.t("share.differ"));
  w.previewShareExercise();
  check("changed preview hides delete", w.document.getElementById("editDelete").hidden === true && w.document.getElementById("editHint").textContent === w.t("edit.hintShare") && w.document.getElementById("allEdit").value.indexOf("C6") >= 0 && w.document.getElementById("editSaveAs").hidden === false && !w.document.body.classList.contains("is-hello"));
  w.editorCancel();
  check("preview cancel keeps the intro waiting", w.document.getElementById("shareAsk").hidden === false && !w.document.body.classList.contains("is-hello"));
  w.confirmShareUpdate();
  rows = shareRows(w, "teach001");
  check("update replaces the exercise", rows.length === 1 && rows[0].lines[1] === "C6" && rows[0].shareId === "teach001");
  check("update drops the hash", w.location.hash.indexOf("#s=") < 0);
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  w.confirmShareAdd();
  rows = shareRows(w, "teach001");
  var kept = rows[0].lines[1] === "C6" ? rows[0] : rows[1];
  var addedRow = kept === rows[0] ? rows[1] : rows[0];
  check("add as new keeps both", rows.length === 2 && kept.lines[1] === "C6" && addedRow.lines[1] === "Cmaj7" && kept.shareId === "teach001" && addedRow.shareId === "teach001");
  w.location.hash = url.slice(url.indexOf("#"));
  w.offerSharedExercise();
  check("old link selects the old row", w.currentExerciseId === addedRow.id);
  w.location.hash = url2.slice(url2.indexOf("#"));
  w.offerSharedExercise();
  check("new link selects the new row", w.currentExerciseId === kept.id);
  var previewUrl = w.shareExerciseUrl({ v: 1, id: "prev0001", name: "Preview", bars: 2, lines: ["Fmaj7"] }, base);
  w.location.hash = previewUrl.slice(previewUrl.indexOf("#"));
  w.offerSharedExercise();
  w.previewShareExercise();
  check("preview fills edit", w.document.body.classList.contains("is-editing") && w.document.getElementById("allEdit").value.indexOf("Fmaj7") >= 0 && w.document.getElementById("shareAsk").hidden === true && w.location.hash.indexOf("#s=") === 0 && w.document.getElementById("editDelete").hidden === true && !w.document.body.classList.contains("is-hello"));
  w.editorCancel();
  check("preview cancel restores the question", !w.document.body.classList.contains("is-editing") && w.document.getElementById("shareAsk").hidden === false && w.location.hash.indexOf("#s=") === 0 && !w.document.body.classList.contains("is-hello"));
  w.dismissShareAsk();
  check("update keeps shareId", w.getDeskExercise(kept.id).shareId === "teach001");
  var parsed = w.parseDeskExercisesBackup(JSON.stringify(w.packDeskExercises()));
  var kept = 0;
  var i;
  for (i = 0; i < parsed.exercises.length; i++) {
    if (parsed.exercises[i].shareId === "teach001") {
      kept++;
    }
  }
  check("backup keeps both versions", kept === 2);
  var many = [];
  for (i = 0; i < 200; i++) {
    many.push("Cmaj7 Dm7 G7 Cmaj7 line " + i + " extra words to grow the link");
  }
  check("a long list is not a link", w.shareExerciseUrl({ v: 1, id: "teach001", name: "Scales", bars: 1, lines: many }, base) === "");
  var guard = 0;
  while (w.listDeskExercises().length < w.DESK_EXERCISE_CAP && guard < 50) {
    if (!w.createDeskExercise({ name: "Pad", bars: 1, lines: ["G"] })) {
      break;
    }
    guard++;
  }
  var fullUrl = w.shareExerciseUrl({ v: 1, id: "full0001", name: "Extra", bars: 1, lines: ["A"] }, base);
  w.location.hash = fullUrl.slice(fullUrl.indexOf("#"));
  w.offerSharedExercise();
  var hashBefore = w.location.hash;
  check("a full menu refuses", w.confirmShareAdd() === false);
  check("a full menu keeps the hash", w.location.hash === hashBefore && w.location.hash.indexOf("#s=") === 0);
  check("a full menu keeps the prompt", w.document.getElementById("shareAsk").hidden === false && w.document.getElementById("shareAskNote").hidden === false);
  w.dismissShareAsk();
  check("not now drops the hash", w.location.hash.indexOf("#s=") < 0);
  var revise = w.shareExerciseUrl({ v: 1, id: "teach001", name: "Week", bars: 4, lines: ["Dm7 G7", "C9"] }, base);
  var fullCount = w.listDeskExercises().length;
  w.location.hash = revise.slice(revise.indexOf("#"));
  w.offerSharedExercise();
  w.confirmShareUpdate();
  rows = shareRows(w, "teach001");
  check("a full menu still updates", w.listDeskExercises().length === fullCount && rows.length === 2 && (rows[0].lines[1] === "C9" || rows[1].lines[1] === "C9") && w.location.hash.indexOf("#s=") < 0);
  w.location.hash = "#s=not-valid";
  w.offerSharedExercise();
  check("a bad hash is dropped", w.location.hash.indexOf("#s=") < 0);
  check("a bad hash says so", w.document.getElementById("deskNote").hidden === false && w.document.getElementById("deskNote").textContent === w.t("share.bad"));
  check("address still opens scales", w.exerciseIdFromQuery("?exercise=scales") === "ex:scales");
}

function chatCase(w) {
  var upload = w.document.getElementById("editOpen");
  var share = w.document.getElementById("editShare");
  var send = w.document.getElementById("editSend");
  var between = false;
  var node = upload ? upload.nextSibling : null;
  var prompt;
  var shortGpt;
  var shortClaude;
  var shortGemini;
  var longText;
  var longGpt;
  var longClaude;
  var longGemini;
  var empty;
  var desk;
  var label;
  var menu;
  while (node && node !== share) {
    if (node.nodeType === 1 && (node.id === "editHintLine" || node.id === "editShareHint")) {
      between = true;
    }
    node = node.nextSibling;
  }
  check("ask lives in edit", !!w.document.getElementById("editAsk"));
  check("share still lives in edit", !!share);
  check("share sentence stays off the exercise row", !w.document.getElementById("editHintLine"));
  check("hint is not between share and upload", !between);
  label = w.document.getElementById("editExerciseLabel");
  check("exercise label sits on the action row", !!(label && send && label.parentNode === send && label.classList.contains("combo-kicker")));
  var exerciseRow = w.document.getElementById("editExercise");
  var nameRow = w.document.getElementById("editNameRow");
  var writeRow = w.document.getElementById("editWrite");
  var deleteButton = w.document.getElementById("editDelete");
  var moreButton = w.document.getElementById("editMore");
  var moreMenu = w.document.getElementById("editMoreMenu");
  var staffHelp = w.document.getElementById("editStaffHelp");
  var desktopActions = w.matchMedia("(min-width: 841px)").matches;
  check("exercise actions sit above the name", !!(exerciseRow && nameRow && (exerciseRow.compareDocumentPosition(nameRow) & 4)));
  check("share sits on the exercise row", !!(share && send && share.parentNode === send));
  check("staff sits beside bars", !!(staffHelp && writeRow && staffHelp.parentNode === writeRow));
  check(
    "empty preview coaches one example",
    w.I18N.en["edit.preview"].indexOf("One example per line") === 0 &&
      w.I18N.es["edit.preview"].indexOf("Un ejemplo por l\u00EDnea") === 0 &&
      w.document.getElementById("editPreview").getAttribute("data-empty") === w.t("edit.preview")
  );
  check(
    "staff help keeps the draft",
    w.I18N.en["edit.staffHelpLead"].indexOf("does not change your examples") >= 0 &&
      w.I18N.es["edit.staffHelpLead"].indexOf("no cambia tus ejemplos") >= 0
  );
  check(
    "more holds the occasional exercise actions",
    !!(
      moreButton &&
      moreMenu &&
      moreMenu.parentNode === send &&
      moreMenu.hidden === true &&
      deleteButton &&
      deleteButton.parentNode === moreMenu &&
      w.document.getElementById("editClearList") &&
      w.document.getElementById("editClearList").parentNode === moreMenu &&
      w.document.getElementById("editSave") &&
      w.document.getElementById("editSave").parentNode === moreMenu &&
      w.document.getElementById("editAsk") &&
      w.document.getElementById("editAsk").parentNode === moreMenu
    )
  );
  check(
    "more is a mobile drawer",
    desktopActions
      ? w.getComputedStyle(moreButton).display === "none" && w.getComputedStyle(moreMenu).display !== "none"
      : w.getComputedStyle(moreButton).display !== "none" && moreMenu.hidden === true
  );
  check("download and clear drop the extra word", w.document.querySelector("#editSave .btn-label").textContent === w.t("edit.download") && w.document.getElementById("editClearList").textContent === w.t("edit.clear") && w.I18N.en["edit.download"] === "Download" && w.I18N.en["edit.clear"] === "Clear" && w.I18N.en["edit.delete"] === "Delete" && w.I18N.es["edit.download"] === "Descargar" && w.I18N.es["edit.clear"] === "Vaciar" && w.I18N.es["edit.delete"] === "Borrar" && w.I18N.es["share.differ"] === "Este ejercicio es distinto del que hay en este dispositivo." && w.I18N.es["share.preview"] === "Vista previa");
  check("exercise actions keep a mark", ["editMore", "editSave", "editOpen", "editShare", "editAsk", "editDelete"].every(function (id) {
    var button = w.document.getElementById(id);
    return !!(button && button.querySelector("svg.chrome-icon") && button.querySelector(".btn-label"));
  }));
  prompt = w.buildChatPrompt({ name: "Week", bars: 4, lines: ["Dm7 G7", "Cmaj7"], lang: "en" });
  check("prompt carries the lines", prompt.indexOf("Dm7 G7") >= 0 && prompt.indexOf("Cmaj7") >= 0 && prompt.indexOf("one example per line") >= 0);
  check("prompt coaches then hands back a block", prompt.indexOf("Do not rewrite until they ask") >= 0 && prompt.indexOf("paste it into the eization Edit box") >= 0 && prompt.indexOf("B\u266D \u00B7 \u266D7 of C") >= 0 && prompt.indexOf("A\u266F \u00B7 \u266D7 of C") >= 0);
  shortGpt = w.chatAskUrl(prompt, "chatgpt");
  shortClaude = w.chatAskUrl(prompt, "claude");
  shortGemini = w.chatAskUrl(prompt, "gemini");
  check("short chatgpt address fits", !!(shortGpt && shortGpt.copy === false && shortGpt.href.indexOf("https://chatgpt.com/?q=") === 0 && shortGpt.href.length <= 2000));
  check("short claude address fits", !!(shortClaude && shortClaude.copy === false && shortClaude.href.indexOf("https://claude.ai/new?q=") === 0 && shortClaude.href.length <= 2000));
  check("short gemini address fits", !!(shortGemini && shortGemini.copy === false && shortGemini.href.indexOf("https://gemini.google.com/app?q=") === 0 && shortGemini.href.length <= 2000));
  longText = new Array(800).join("line ");
  longGpt = w.chatAskUrl(longText, "chatgpt");
  longClaude = w.chatAskUrl(longText, "claude");
  longGemini = w.chatAskUrl(longText, "gemini");
  check("long question is copied", !!(longGpt && longGpt.copy === true && longGpt.href === "https://chatgpt.com/"));
  check("long claude question is copied", !!(longClaude && longClaude.copy === true && longClaude.href === "https://claude.ai/new"));
  check("long gemini question is copied", !!(longGemini && longGemini.copy === true && longGemini.href === "https://gemini.google.com/app"));
  empty = w.buildChatPrompt({ name: "New", bars: 1, lines: [], lang: "en" });
  check("empty list still asks", empty.indexOf("one example per line") >= 0 && empty.indexOf("The box is empty.") >= 0 && empty.indexOf("three starters") >= 0);
  var emptyEs = w.buildChatPrompt({ name: "Nuevo", bars: 1, lines: [], lang: "es" });
  check("spanish prompt coaches", emptyEs.indexOf("Un ejemplo por l\u00EDnea") >= 0 && emptyEs.indexOf("El recuadro est\u00E1 vac\u00EDo.") >= 0 && emptyEs.indexOf("pulsen Actualizar") >= 0);
  var staffAsk = w.buildChatPrompt({ name: "Triad", bars: 1, lines: ["C4 E4 G4"], lang: "en" });
  check("staff prompt teaches the spelling", staffAsk.indexOf("@key=") >= 0 && staffAsk.indexOf("one line per spelling") < 0 && staffAsk.indexOf("C4 E4 G4") >= 0 && staffAsk.indexOf("one example per line") >= 0);
  var staffAskEs = w.buildChatPrompt({ name: "Triada", bars: 1, lines: ["C4 E4 G4"], lang: "es" });
  check("spanish staff prompt teaches the spelling", staffAskEs.indexOf("@key=") >= 0 && staffAskEs.indexOf("Una nota es una palabra") >= 0 && staffAskEs.indexOf("una l\u00EDnea por escritura") < 0);
  var toneLines = ["1", "\u266D3", "3", "\u266D5", "5", "\u266F5", "\u266D\u266D7", "\u266D7", "7", "\u266D9", "9", "\u266F9", "11", "\u266F11", "\u266D13", "13"];
  check("chord tones prompt fits", w.chatAskUrl(w.buildChatPrompt({ name: "Chord Tones", bars: 1, lines: toneLines, lang: "en" }), "gemini").copy === false);
  check("spanish chord tones prompt fits", w.chatAskUrl(w.buildChatPrompt({ name: "Notas del acorde", bars: 1, lines: toneLines, lang: "es" }), "gemini").copy === false);
  var noteLines = w.exercises.allNotes.items.map(w.itemToLine);
  var scaleLines = w.exercises.scales.items.map(w.itemToLine);
  check("all notes gemini fits", w.chatAskUrl(w.buildChatPrompt({ name: "All Notes", bars: 1, lines: noteLines, lang: "en" }), "gemini").copy === false && w.chatAskUrl(w.buildChatPrompt({ name: "Todas las notas", bars: 1, lines: noteLines, lang: "es" }), "gemini").copy === false);
  check("scales are copied for gemini", w.chatAskUrl(w.buildChatPrompt({ name: "Scales", bars: 1, lines: scaleLines, lang: "en" }), "gemini").copy === true && w.chatAskUrl(w.buildChatPrompt({ name: "Escalas", bars: 1, lines: scaleLines, lang: "es" }), "gemini").copy === true);
  desk = JSON.stringify(w.listDeskExercises());
  if (desktopActions) {
    check("desktop shows exercise actions without more", moreMenu.hidden === true && w.getComputedStyle(moreMenu).display !== "none");
  } else {
    moreButton.click();
    check("more menu opens", moreMenu.hidden === false);
  }
  w.document.getElementById("editAsk").click();
  check("opening the menu does not write the desk", JSON.stringify(w.listDeskExercises()) === desk);
  menu = w.document.getElementById("editAskMenu");
  check("chat menu opens", menu.hidden === false);
  check("three chats sit in one row", !!(w.document.getElementById("editAskGemini") && w.getComputedStyle(menu).flexDirection === "row" && w.I18N.en["edit.ask"] === "Ask AI" && w.I18N.es["edit.ask"] === "Preguntar a la IA" && w.I18N.en["edit.askGemini"] === "Gemini"));
  check("hint asks to paste", w.document.getElementById("editHint").textContent === w.t("edit.askHint"));
  w.document.getElementById("editAsk").click();
  check("chat menu closes", menu.hidden === true);
  check("paste line leaves with the chats", w.document.getElementById("editHint").textContent !== w.t("edit.askHint"));
  if (!desktopActions) {
    moreButton.click();
    check("more menu closes", moreMenu.hidden === true);
  }
  var symbolsToggle = w.document.getElementById("editSymbolsToggle");
  var symbolsPanel = w.document.getElementById("editSymbols");
  check(
    "symbols stay closed until asked",
    !!(
      symbolsToggle &&
      symbolsPanel &&
      symbolsPanel.hidden === true &&
      symbolsToggle.getAttribute("aria-expanded") === "false" &&
      w.I18N.en["edit.symbols"] === "Symbols" &&
      w.I18N.es["edit.symbols"] === "S\u00EDmbolos"
    )
  );
  symbolsToggle.click();
  check("symbols open", symbolsPanel.hidden === false && symbolsToggle.getAttribute("aria-expanded") === "true" && symbolsPanel.querySelectorAll("button").length > 0);
  check(
    "symbols include a pitch row",
    !!(
      symbolsPanel.querySelector("[data-note='C']") &&
      symbolsPanel.querySelector("[data-oct='4'][aria-pressed='true']") &&
      symbolsPanel.querySelector("[data-dur=''][aria-pressed='true']") &&
      symbolsPanel.querySelector("[data-event='slash']") &&
      symbolsPanel.querySelector("[data-event='beam']")
    )
  );
  check(
    "staff help can add an example",
    w.document.querySelectorAll("#editStaffSamples button").length === 8 &&
      w.I18N.en["edit.staffHelpSamples"] === "Tap an example to add it." &&
      w.I18N.es["edit.staffHelpSamples"].indexOf("ejemplo") >= 0
  );
  symbolsToggle.click();
  check("symbols close", symbolsPanel.hidden === true && symbolsToggle.getAttribute("aria-expanded") === "false");
  check("intro edit line stays after chat", w.I18N.en["hello.edit"] === "Edit builds your own exercise." && w.I18N.es["hello.edit"] === "Editar arma tu propio ejercicio.");
  var focusChrome = w.document.getElementById("editFocusChrome");
  var focusLine = w.document.getElementById("editFocusLine");
  var focusIndex = w.document.getElementById("editFocusIndex");
  var viewToggle = w.document.getElementById("editViewToggle");
  var area = w.document.getElementById("allEdit");
  var sheet = w.document.getElementById("textdiv");
  check(
    "focus chrome sits in edit",
    !!(
      focusChrome &&
      focusLine &&
      focusIndex &&
      viewToggle &&
      area &&
      w.document.getElementById("editFocusPrev") &&
      w.document.getElementById("editFocusNext") &&
      w.document.getElementById("editFocusAdd") &&
      w.document.getElementById("editFocusRemove") &&
      w.I18N.en["edit.allExamples"] === "All examples" &&
      w.I18N.es["edit.allExamples"] === "Todos los ejemplos" &&
      w.I18N.en["edit.oneExample"] === "One example" &&
      w.I18N.es["edit.oneExample"] === "Un ejemplo" &&
      w.I18N.en["edit.focusIndex"] === "{n} / {total}"
    )
  );
  if (w.editorIsOpen()) {
    w.editorCancel();
  }
  w.restoreDefaults();
  localStorage.setItem("eization-hello", "1");
  var focusWalk = w.createDeskExercise({ name: "Focus Walk", bars: 1, lines: ["Alpha", "Bravo", "Charlie"] });
  var focusWalkId = focusWalk && focusWalk.id;
  check("focus walk saves", !!focusWalkId);
  if (focusWalkId) {
    w.currentExerciseId = focusWalkId;
    w.SelectExercise();
    w.editorOpen();
    var narrowFocus = !desktopActions;
    check(
      "edit opens in the viewport view",
      !!(
        sheet &&
        sheet.classList.contains(narrowFocus ? "is-edit-focus" : "is-edit-list") &&
        viewToggle.textContent === (narrowFocus ? w.t("edit.allExamples") : w.t("edit.oneExample"))
      )
    );
    if (!narrowFocus) {
      viewToggle.click();
    }
    check("focus shows one line", !!(sheet.classList.contains("is-edit-focus") && focusLine.value === "Alpha" && focusIndex.textContent.indexOf("1") >= 0 && area.value.indexOf("Alpha") >= 0 && area.value.indexOf("Charlie") >= 0));
    w.document.getElementById("editFocusNext").click();
    check("focus pages forward", focusLine.value === "Bravo" && focusIndex.textContent.indexOf("2") >= 0);
    focusLine.value = "Bravo edited";
    focusLine.dispatchEvent(new w.Event("input", { bubbles: true }));
    w.document.getElementById("editUpdate").click();
    var walked = w.getDeskExercise(focusWalkId);
    check("update still reads lines from allEdit", !!(walked && walked.lines && walked.lines[1] === "Bravo edited" && walked.lines[0] === "Alpha" && walked.lines[2] === "Charlie"));
    w.editorOpen();
    if (!sheet.classList.contains("is-edit-list")) {
      viewToggle.click();
    }
    check("list still keeps the textarea", !!(sheet.classList.contains("is-edit-list") && area && w.getComputedStyle(area).position !== "absolute" && area.value.indexOf("Bravo edited") >= 0));
    if (!sheet.classList.contains("is-edit-focus")) {
      viewToggle.click();
    }
    w.document.getElementById("editFocusAdd").click();
    if (symbolsPanel.hidden) {
      symbolsToggle.click();
    }
    function poke(el) {
      el.dispatchEvent(new w.PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse" }));
    }
    poke(symbolsPanel.querySelector("[data-note='C']"));
    check("pitch button writes a quarter", focusLine.value.indexOf("C4 ") === 0);
    poke(symbolsPanel.querySelector("[data-dur='e']"));
    poke(symbolsPanel.querySelector("[data-note='D']"));
    check("eighth sticks to the next note", focusLine.value.indexOf("D4e ") >= 0);
    poke(symbolsPanel.querySelector("[data-acc='b']"));
    poke(symbolsPanel.querySelector("[data-note='E']"));
    check("flat sticks to the next note", focusLine.value.indexOf("Eb4e ") >= 0);
    poke(symbolsPanel.querySelector("[data-event='beam']"));
    check("beam writes braces", focusLine.value.indexOf("{ }") >= 0);
    w.document.getElementById("editStaffHelp").click();
    var sampleButton = w.document.querySelector("#editStaffSamples button");
    sampleButton.click();
    check(
      "staff sample adds an example and draws",
      !!(
        sampleButton &&
        focusLine.value === sampleButton.getAttribute("data-sample") &&
        !w.editorStaffHelpIsOpen() &&
        w.document.getElementById("editPreview").classList.contains("is-staff")
      )
    );
    w.editorCancel();
  }
}

function foreignDesk(w) {
  w.restoreDefaults();
  localStorage.setItem("eization-hello", "1");
  var created = w.createDeskExercise({ name: "Other", bars: 1, lines: ["One", "Two"] });
  var id = created && created.id;
  var area;
  var update;
  var data;
  var i;
  var next;
  var face;
  var during;
  var openId;
  check("other-window strings", w.I18N.en["edit.staleAsk"] === "This exercise changed in another window." && w.I18N.es["edit.staleAsk"] === "Este ejercicio cambi\u00F3 en otra ventana." && w.I18N.en["desk.otherWindow"] === "That exercise was removed in another window." && w.I18N.es["desk.otherWindow"] === "Ese ejercicio se quit\u00F3 en otra ventana.");
  if (!id) {
    check("other-window exercise saves", false);
    return;
  }
  w.currentExerciseId = id;
  w.SelectExercise();
  w.editorOpen();
  area = w.document.getElementById("allEdit");
  area.value = area.value + "\nZed";
  area.dispatchEvent(new w.Event("input"));
  data = JSON.parse(localStorage.getItem("eization-desk"));
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].id === id) {
      data.exercises[i].lines = ["From the other window"];
    }
  }
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.document.getElementById("editUpdate").click();
  update = w.document.getElementById("editUpdate");
  check("stale update waits", !!(update && update.classList.contains("is-armed") && update.textContent === w.t("edit.staleAsk") && w.editorIsOpen() && w.getDeskExercise(id).lines.length === 1 && w.getDeskExercise(id).lines[0] === "From the other window"));
  update.click();
  check("second update replaces", !!(w.getDeskExercise(id) && w.getDeskExercise(id).lines[w.getDeskExercise(id).lines.length - 1] === "Zed" && !w.editorIsOpen()));
  data = JSON.parse(localStorage.getItem("eization-desk"));
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].id === id) {
      data.exercises[i].name = "Renamed elsewhere";
    }
  }
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.document.getElementById("deskNote").hidden = true;
  w.dispatchEvent(new w.StorageEvent("storage", { key: "eization-desk", newValue: localStorage.getItem("eization-desk") }));
  face = w.document.getElementById("exerciseFace").querySelector(".combo-value");
  check("another window renames the menu", w.currentExerciseId === id && face.textContent === "Renamed elsewhere" && w.document.getElementById("deskNote").hidden === true);
  data = JSON.parse(localStorage.getItem("eization-desk"));
  data.bpm = 123;
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.dispatchEvent(new w.StorageEvent("storage", { key: "eization-desk", newValue: localStorage.getItem("eization-desk") }));
  check("setup from another window stays put", w.currentExerciseId === id && w.document.getElementById("bpm").value !== "123");
  w.editorOpen();
  during = w.document.getElementById("allEdit").value;
  openId = w.currentExerciseId;
  data = JSON.parse(localStorage.getItem("eization-desk"));
  next = [];
  for (i = 0; i < data.exercises.length; i++) {
    if (data.exercises[i].id !== openId) {
      next.push(data.exercises[i]);
    }
  }
  data.exercises = next;
  data.exercise = next[0].id;
  localStorage.setItem("eization-desk", JSON.stringify(data));
  w.dispatchEvent(new w.StorageEvent("storage", { key: "eization-desk", newValue: localStorage.getItem("eization-desk") }));
  check("edit stays open across another window", w.editorIsOpen() && w.document.getElementById("allEdit").value === during && w.currentExerciseId === openId);
  w.editorCancel();
  check("closing edit follows a removal", !w.editorIsOpen() && w.currentExerciseId !== openId && w.document.getElementById("deskNote").textContent === w.t("desk.otherWindow") && w.document.getElementById("deskNote").hidden === false);
  w.restoreDefaults();
  localStorage.setItem("eization-hello", "1");
}

function deskRoundTrip(w) {
  var beforeHello = "1";
  try {
    beforeHello = localStorage.getItem("eization-hello");
  } catch (err) {}
  w.deskReady = true;
  var created = w.createDeskExercise({ name: "Desk", bars: 2, lines: ["C \u00B7 Desk", "D"] });
  check("custom exercise saves", !!(created && created.id));
  var record = w.getDeskExercise(created.id);
  check("custom exercise reads back", !!(record && record.bars === 2 && record.lines.length === 2 && record.name === "Desk"));
  var seedId = w.listDeskExercises()[0].id;
  w.updateDeskExercise(seedId, { name: "Renamed", bars: 3, lines: ["A", "B"] });
  check("seeded exercise updates in place", w.getDeskExercise(seedId).name === "Renamed" && w.getDeskExercise(seedId).seedId);
  w.setSoundOn(false);
  w.playBars = 0;
  w.restBars = 0;
  w.writeSetupNow();
  var stored = JSON.parse(localStorage.getItem("eization-desk"));
  check("play and rest are not both zero", stored.play === 1 && stored.rest === 0);
  check("mute is stored on the desk", stored.sound === false);
  check("hello flag is not inside the desk", !stored.hello);
  var beforeDelete = w.listDeskExercises().length;
  var deletedSeed = w.getDeskExercise(seedId).seedId;
  check("delete removes one exercise", w.deleteDeskExercise(seedId) === true && w.listDeskExercises().length === beforeDelete - 1);
  stored = JSON.parse(localStorage.getItem("eization-desk"));
  check("deleted seed is remembered", !!(stored && stored.deletedSeeds && stored.deletedSeeds.indexOf(deletedSeed) >= 0));
  check("address skips a removed exercise", w.exerciseIdFromQuery("?exercise=" + deletedSeed) === "");
  check("address still opens a kept exercise", w.exerciseIdFromQuery("?exercise=scales") === "ex:scales");
  var pads = [];
  var pad;
  for (pad = 0; pad < w.DESK_EXERCISE_CAP; pad++) {
    pads.push({ id: "ex:pad" + pad, name: "Pad", bars: 1, lines: ["C4"] });
  }
  localStorage.setItem("eization-desk", JSON.stringify({ schema: 2, exercises: pads }));
  w.ensureDeskExercises();
  check("a full list does not grow past the cap", w.listDeskExercises().length === w.DESK_EXERCISE_CAP);
  localStorage.setItem("eization-desk", JSON.stringify({
    schema: 2,
    exercises: [
      { id: "ex:same", name: "One", bars: 1, lines: ["C4"] },
      { id: "ex:same", name: "Two", bars: 1, lines: ["D4"] }
    ]
  }));
  w.ensureDeskExercises();
  var split = w.listDeskExercises();
  check("duplicate ids are split", split.length === w.menuOrder.length + 2 && split[0].id !== split[1].id && split[0].lines[0] === "C4" && split[1].lines[0] === "D4");
  var many = [];
  for (pad = 0; pad < 45; pad++) {
    many.push({ name: "N", bars: 1, lines: ["C4"] });
  }
  var trimmed = w.parseDeskExercisesBackup(JSON.stringify({ eization: 1, kind: "exercises", exercises: many }));
  check("backup reports what did not fit", !!(trimmed && trimmed.truncated && trimmed.exercises.length === w.DESK_EXERCISE_CAP));
  var mixed = w.parseDeskExercisesBackup(JSON.stringify({
    eization: 1,
    exercises: [
      { name: "Ok", bars: 1, lines: ["C4"] },
      { name: "No", bars: 1, lines: ["  "] }
    ]
  }));
  check("backup reports an empty exercise", !!(mixed && mixed.skipped === 1 && mixed.exercises.length === 1 && mixed.truncated === false));
  localStorage.setItem("eization-desk", "{not json");
  w.ensureDeskExercises();
  check("unreadable desk is kept aside", localStorage.getItem("eization-desk-bak") === "{not json");
  var recovered = JSON.parse(localStorage.getItem("eization-desk"));
  check("unreadable desk comes back as the stock list", !!(recovered && recovered.exercises && recovered.exercises.length === w.menuOrder.length));
  w.restoreDefaults();
  var after = JSON.parse(localStorage.getItem("eization-desk") || "null");
  var helloGone = localStorage.getItem("eization-hello") === null;
  check("restore re-seeds the desk", !!(after && after.exercises && after.exercises.length === w.menuOrder.length));
  check("restore clears deleted seeds", !!(after && (!after.deletedSeeds || !after.deletedSeeds.length)));
  check("restore clears the intro flag", helloGone);
  check("restore stamps the schema", !!(after && after.schema === 2 && after.exercises[0].seedId === "allNotes" && after.exercises[0].seedRev === 1 && after.exercises[0].touched === false));
  check("restore leaves the metronome paused", w.paused === true);
  if (beforeHello) {
    try {
      localStorage.setItem("eization-hello", beforeHello);
    } catch (err) {}
  }
}

function storageMigration(w) {
  var freshScales = w.catalogExerciseRecord("scales");
  var freshProg = w.catalogExerciseRecord("essentialProgressions");
  var freshNotes = w.catalogExerciseRecord("allNotes");
  var freshTones = w.catalogExerciseRecord("chordTones");
  var oldScaleLines = [];
  var oldProgLines = [];
  var editedNotes;
  var editedScale;
  var i;
  var stored;
  var scales;
  var notes;
  var prog;
  var tones;
  var custom;
  var ask;
  var groove;
  var beforeDesk;
  var afterDesk;
  var restored;
  for (i = 0; i < freshScales.lines.length; i++) {
    oldScaleLines.push(String(freshScales.lines[i]).replace(/\^([A-G](?:\u266F|\u266D|#|b)?)_/, "^"));
  }
  for (i = 0; i < freshProg.lines.length; i++) {
    oldProgLines.push(String(freshProg.lines[i]).replace(/\//g, "/q"));
  }
  editedNotes = freshNotes.lines.slice();
  editedNotes[0] = editedNotes[0] + " edited";
  check("older scales spelling differs", oldScaleLines[0] !== freshScales.lines[0]);
  check("older progressions spelling differs", oldProgLines[0] !== freshProg.lines[0]);
  check("catalog birthdays", w.exercises.scales.rev === 2 && w.exercises.essentialProgressions.rev === 2 && w.exercises.allNotes.rev === 1);
  localStorage.setItem("eization-hello", "1");
  localStorage.setItem("eization-desk", JSON.stringify({
    bpm: 132,
    beats: 3,
    exercise: "ex:keepme",
    deletedSeeds: ["freePlay"],
    exercises: [
      { id: "ex:scales", seedId: "scales", name: "Scales", bars: freshScales.bars, lines: oldScaleLines },
      { id: "ex:essentialProgressions", seedId: "essentialProgressions", name: "Essential Progressions", bars: freshProg.bars, lines: oldProgLines },
      { id: "ex:allNotes", seedId: "allNotes", name: "All Notes", bars: freshNotes.bars, lines: editedNotes },
      { id: "ex:chordTones", seedId: "chordTones", name: w.I18N.es["seed.chordTones"], bars: freshTones.bars, lines: freshTones.lines.slice() },
      { id: "ex:keepme", name: "My line", bars: 2, lines: ["C4", "D4"] }
    ]
  }));
  w.ensureDeskExercises();
  scales = w.getDeskExercise("ex:scales");
  notes = w.getDeskExercise("ex:allNotes");
  stored = JSON.parse(localStorage.getItem("eization-desk"));
  check("one launch re-seeds the stock list", !!(scales && scales.lines[0] === freshScales.lines[0] && scales.touched === false && stored.exercises.length === w.menuOrder.length));
  check("one launch drops saved exercises", !w.getDeskExercise("ex:keepme") && notes && notes.lines[0] === freshNotes.lines[0]);
  check("one launch brings back a deleted stock exercise", !!w.getDeskExercise("ex:freePlay") && (!stored.deletedSeeds || stored.deletedSeeds.indexOf("freePlay") < 0));
  check("one launch keeps tempo", stored.schema === 2 && stored.bpm === 132 && stored.beats === 3);
  check("one launch clears the intro", localStorage.getItem("eization-hello") === null);
  if (w.editorIsOpen()) {
    w.editorCancel();
  }
  ask = w.document.getElementById("shareAsk");
  if (ask) {
    ask.hidden = true;
  }
  w.document.body.classList.remove("is-editing", "is-about", "is-picking", "is-setup", "is-hello");
  groove = w.document.getElementById("groovePanel");
  if (groove) {
    groove.hidden = true;
  }
  w.helloTouched = false;
  w.maybeHello();
  check("one launch plays the whole intro", w.document.body.classList.contains("is-hello") && w.helloStepIndex === 0 && w.helloSliceEnd === w.HELLO_LAUNCH_END);
  w.endHello();
  editedScale = freshScales.lines.slice();
  editedScale[0] = w.cleanDeskLines(["x " + freshScales.lines[0]])[0];
  custom = w.createDeskExercise({ name: "After", bars: 1, lines: ["C4"] });
  w.updateDeskExercise("ex:scales", { lines: editedScale });
  w.ensureDeskExercises();
  scales = w.getDeskExercise("ex:scales");
  check("later exercises stay", !!(custom && w.getDeskExercise(custom.id) && w.getDeskExercise(custom.id).lines[0] === "C4" && scales && scales.lines[0] === editedScale[0] && scales.touched === true && localStorage.getItem("eization-hello") === "1"));
  if (w.editorIsOpen()) {
    w.editorCancel();
  }
  if (w.document.body.classList.contains("is-hello")) {
    w.endHello();
  }
  ask = w.document.getElementById("shareAsk");
  if (ask) {
    ask.hidden = true;
  }
  w.document.body.classList.remove("is-editing", "is-about", "is-picking", "is-setup");
  groove = w.document.getElementById("groovePanel");
  if (groove) {
    groove.hidden = true;
  }
  localStorage.setItem("eization-hello", "1");
  w.helloTouched = false;
  w.maybeHello();
  check("seen intro stays quiet", !w.document.body.classList.contains("is-hello") && w.helloGen() === 1 && w.helloSeen());
  w.HELLO_GEN = 2;
  w.HELLO_RETURN = { from: 8, to: 9 };
  localStorage.setItem("eization-hello", "1");
  w.helloTouched = false;
  w.maybeHello();
  check("older intro plays the new slice", w.document.body.classList.contains("is-hello") && w.helloStepIndex === 8 && w.helloSliceEnd === 9);
  w.endHello();
  w.HELLO_GEN = 1;
  w.HELLO_RETURN = null;
  localStorage.setItem("eization-hello", "1");
  beforeDesk = JSON.parse(localStorage.getItem("eization-desk"));
  w.document.getElementById("replayIntro").click();
  afterDesk = JSON.parse(localStorage.getItem("eization-desk"));
  check("intro again lives in Menu", !!w.document.querySelector("#about #replayIntro"));
  check(
    "intro again clears only the intro",
    localStorage.getItem("eization-hello") === null &&
      JSON.stringify(afterDesk.exercises) === JSON.stringify(beforeDesk.exercises) &&
      afterDesk.bpm === beforeDesk.bpm &&
      afterDesk.schema === beforeDesk.schema
  );
  check("intro again is announced", w.document.getElementById("deskNote").textContent === w.t("device.introQueued"));
  w.restoreDefaults();
  restored = JSON.parse(localStorage.getItem("eization-desk"));
  check(
    "restore still clears both keys",
    localStorage.getItem("eization-hello") === null &&
      restored.exercises.length === w.menuOrder.length &&
      !w.getDeskExercise("ex:keepme")
  );
  localStorage.setItem("eization-hello", "1");
}
