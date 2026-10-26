/* Pinned More catalog order for Today. Append a new id. Do not rebuild from more-exercises.json. */
var moreDayOrder = [
  "more0070",
  "more0002",
  "more0193",
  "more0071",
  "more0006",
  "more0072",
  "more0007",
  "more0073",
  "more0008",
  "more0009",
  "more0074",
  "more0010",
  "more0075",
  "more0011",
  "more0076",
  "more0012",
  "more0077",
  "more0013",
  "more0078",
  "more0014",
  "more0015",
  "more0080",
  "more0016",
  "more0017",
  "more0018",
  "more0019",
  "more0020",
  "more0021",
  "more0083",
  "more0022",
  "more0084",
  "more0023",
  "more0085",
  "more0024",
  "more0086",
  "more0190",
  "more0191",
  "more0192",
  "minorScales",
  "melodicMinorModes",
  "pentatonicBlues",
  "symmetricBebop",
  "more0025",
  "more0088",
  "more0026",
  "more0089",
  "more0027",
  "more0090",
  "more0028",
  "more0029",
  "more0138",
  "more0139",
  "more0140",
  "more0141",
  "more0142",
  "more0143",
  "more0144",
  "more0145",
  "more0146",
  "more0147",
  "more0148",
  "more0149",
  "more0150",
  "more0151",
  "more0152",
  "more0153",
  "more0154",
  "more0155",
  "more0156",
  "more0157",
  "more0158",
  "more0159",
  "more0160",
  "more0161",
  "more0162",
  "more0163",
  "more0164",
  "more0165",
  "more0166",
  "more0167",
  "more0168",
  "more0169",
  "more0170",
  "more0171",
  "more0172",
  "more0173",
  "more0032",
  "more0087",
  "more0033",
  "more0034",
  "more0035",
  "more0094",
  "more0036",
  "more0095",
  "more0037",
  "more0096",
  "more0038",
  "more0097",
  "more0039",
  "more0098",
  "more0040",
  "more0041",
  "more0042",
  "more0101",
  "more0043",
  "more0102",
  "more0045",
  "more0046",
  "more0105",
  "more0047",
  "more0106",
  "more0048",
  "more0049",
  "more0050",
  "more0108",
  "more0051",
  "more0109",
  "more0052",
  "more0110",
  "more0053",
  "more0111",
  "more0054",
  "more0112",
  "more0174",
  "more0175",
  "more0176",
  "more0177",
  "more0178",
  "more0179",
  "more0180",
  "more0181",
  "more0182",
  "more0183",
  "more0184",
  "more0185",
  "more0186",
  "more0187",
  "more0188",
  "more0189",
  "more0137",
  "more0058",
  "more0195",
  "more0196",
  "more0197",
  "more0198",
  "more0199",
  "more0200",
  "more0201",
  "more0202",
  "more0062",
  "more0063",
  "more0064",
  "more0065",
  "more0066",
  "more0116",
  "more0067",
  "more0068",
  "more0069",
  "more0119",
  "more0120",
  "more0121",
  "more0122",
  "more0123",
  "more0124",
  "more0125",
  "more0126",
  "more0127",
  "more0128",
  "more0129",
  "rhythmMotifs",
  "compingRhythm",
  "compingRhythm34",
  "more0194",
  "keySignatures",
  "more0203",
  "more0204",
  "more0205",
  "more0206",
  "more0207"
];

var moreExercisesCache = null;
var moreExercisesWait = null;

function moreExercisesUrl() {
  var scripts = document.getElementsByTagName("script");
  var i;
  var src;
  for (i = 0; i < scripts.length; i++) {
    src = scripts[i].src || "";
    if (/more-day\.js(?:\?|$)/.test(src)) {
      return new URL("../../tools/more-exercises.json", src).href;
    }
  }
  return new URL("./tools/more-exercises.json", window.location.href).href;
}

function loadMoreExercises(done) {
  if (moreExercisesCache) {
    done(moreExercisesCache);
    return;
  }
  if (moreExercisesWait) {
    moreExercisesWait.push(done);
    return;
  }
  moreExercisesWait = [done];
  fetch(moreExercisesUrl()).then(function (res) {
    if (!res.ok) {
      throw new Error("more");
    }
    return res.json();
  }).then(function (list) {
    moreExercisesCache = Array.isArray(list) ? list : [];
    var wait = moreExercisesWait || [];
    moreExercisesWait = null;
    wait.forEach(function (fn) { fn(moreExercisesCache); });
  }, function () {
    var wait = moreExercisesWait || [];
    moreExercisesWait = null;
    wait.forEach(function (fn) { fn(null); });
  });
}

function moreDaySnapshot(id, done) {
  if (!id || typeof shareSnapshot !== "function") {
    done(null);
    return;
  }
  loadMoreExercises(function (list) {
    var i;
    var ex;
    if (!list) {
      done(null);
      return;
    }
    for (i = 0; i < list.length; i++) {
      ex = list[i];
      if (!ex || ex.exercise || ex.id !== id || !ex.lines) {
        continue;
      }
      done(shareSnapshot({
        id: ex.id,
        name: ex.nameEn,
        bars: ex.bars,
        staff: !!ex.staff,
        lines: ex.lines
      }));
      return;
    }
    done(null);
  });
}
