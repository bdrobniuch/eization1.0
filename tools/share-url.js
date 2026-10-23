/* Build #s= / #s2= hashes for tools/more-exercises.json.
 * node tools/share-url.js            prints a JSON map of id -> hash
 * node tools/share-url.js --selftest  packs the staff exercises and exits 1 on failure
 */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");

function load(context, file) {
  var text = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInContext(text, context, { filename: file });
}

var context = vm.createContext({
  console: console,
  Map: Map,
  Uint8Array: Uint8Array,
  parseInt: parseInt,
  isNaN: isNaN,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  unescape: unescape,
  escape: escape,
  btoa: typeof btoa === "function" ? btoa : function (s) {
    return Buffer.from(s, "binary").toString("base64");
  },
  atob: typeof atob === "function" ? atob : function (s) {
    return Buffer.from(s, "base64").toString("binary");
  },
  String: String,
  Math: Math,
  Array: Array,
  Object: Object,
  Error: Error,
  JSON: JSON,
  RegExp: RegExp
});

load(context, "resources/js/staff.js");
load(context, "resources/js/share.js");
context.shareSnapshot = function (part) {
  var snap = {
    shareId: part.id,
    name: part.name,
    bars: part.bars,
    staff: !!part.staff,
    lines: part.lines
  };
  if (part.clef === "bass") {
    snap.clef = "bass";
  }
  if (part.key) {
    snap.key = part.key;
  }
  if (part.meter && part.meter.beats && part.meter.unit) {
    snap.meter = { beats: part.meter.beats, unit: part.meter.unit };
  }
  return snap;
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (process.argv.indexOf("--selftest") >= 0) {
  if (!context.shareCodecOk()) {
    fail("deflate round trip failed");
  }
  context.exercises = {};
  context.registerExercise = function (ex) {
    context.exercises[ex.id] = ex;
  };
  [
    "resources/js/exercises/dynamics.js",
    "resources/js/exercises/ties.js",
    "resources/js/exercises/tuplets.js",
    "resources/js/exercises/play-rest.js",
    "resources/js/exercises/consecutive-eight-notes.js",
    "resources/js/exercises/consecutive-triplet-eight-notes.js",
    "resources/js/exercises/left-hand-rootless.js",
    "resources/js/exercises/scale-catalog.js",
    "resources/js/exercises/scales.js"
  ].forEach(function (file) {
    load(context, file);
  });
  Object.keys(context.exercises).forEach(function (id) {
    var items = context.exercises[id].items || [];
    var i;
    var line;
    var canon;
    for (i = 0; i < items.length; i++) {
      line = String(items[i]);
      if (!context.staffNotationStatus(line).ok) {
        fail(id + " does not parse: " + line);
      }
      canon = context.staffShareCanonical(line);
      if (!canon) {
        fail(id + " does not pack:\n" + line + "\nSIG " + context.shareStaffSig(line));
      }
    }
    var hash = context.shareHashFromPayload({
      v: 1,
      id: "test0001",
      name: context.exercises[id].label,
      bars: context.exercises[id].bars || 1,
      lines: items
    });
    var read = context.readShareHash(hash);
    if (!read || read.lines.length !== items.length) {
      fail(id + " link did not round trip (" + (hash ? hash.length : 0) + ")");
    }
    console.error(id + " " + items.length + " " + hash.slice(0, 4) + " " + hash.length);
  });
  var am = context.staffShareCanonical("@key=Am C4e D4e E4e F4e G4e A4e B4e C5e");
  if (am.indexOf("@key=Am") !== 0) {
    fail("minor key became " + am);
  }
  var stemlessLine = "^C\u22067 C4n_1 F4n_11 G4n_5 C5n_1 \u00B7 I \u00B7 11";
  if (!context.staffNotationStatus(stemlessLine).ok || context.staffNotationStatus("C4n.").ok) {
    fail("stemless quarter did not parse");
  }
  var stemlessHash = context.shareHashFromPayload({
    v: 1,
    id: "n0001",
    name: "Stemless",
    bars: 1,
    lines: [stemlessLine]
  });
  var stemlessRead = context.readShareHash(stemlessHash);
  if (!stemlessRead || stemlessRead.lines.length !== 1 || stemlessRead.lines[0].indexOf("C4n_1") < 0) {
    fail("stemless quarter did not pack: " + (stemlessRead && stemlessRead.lines[0]));
  }
  console.error("selftest ok");
  process.exit(0);
}

var data = JSON.parse(fs.readFileSync(path.join(__dirname, "more-exercises.json"), "utf8"));
var map = {};
var i;
var ex;
var hash;
var url;
for (i = 0; i < data.length; i++) {
  ex = data[i];
  if (!ex.lines) {
    continue;
  }
  hash = context.shareHashFromPayload({
    v: 1,
    id: ex.id,
    name: ex.nameEn,
    bars: ex.bars,
    lines: ex.lines,
    clef: ex.clef,
    key: ex.key,
    meter: ex.meter
  });
  url = "https://eization.com/" + hash;
  if (!hash || url.length > 8000) {
    fail("URL too long for " + ex.id + ": " + url.length);
  }
  map[ex.id] = hash;
}
process.stdout.write(JSON.stringify(map));
