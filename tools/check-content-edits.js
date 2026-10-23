const fs = require("fs");
const vm = require("vm");

const ctx = vm.createContext({
  console: console,
  Map: Map,
  Uint8Array: Uint8Array,
  parseInt: parseInt,
  isNaN: isNaN,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  unescape: unescape,
  escape: escape,
  btoa: function (s) {
    return Buffer.from(s, "binary").toString("base64");
  },
  atob: function (s) {
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
vm.runInContext(fs.readFileSync("resources/js/staff.js", "utf8"), ctx, {
  filename: "staff.js"
});

const more = JSON.parse(fs.readFileSync("tools/more-exercises.json", "utf8"));
const ids = [
  "more0071",
  "more0019",
  "more0098",
  "more0109",
  "more0110",
  "more0111",
  "more0112",
  "more0106",
  "more0062",
  "more0116",
  "more0083",
  "more0101",
  "more0102"
];
let bad = 0;
ids.forEach(function (id) {
  const ex = more.find(function (e) {
    return e.id === id;
  });
  if (!ex) {
    console.log("missing", id);
    bad++;
    return;
  }
  ex.lines.forEach(function (line, i) {
    const st = ctx.staffNotationStatus(line);
    if (!st.ok) {
      console.log("FAIL", id, i, line.slice(0, 140), st);
      bad++;
    }
  });
});
console.log("parse bad=" + bad);

const h = fs.readFileSync("more.html", "utf8");
console.log("bad meter ps", h.indexOf("@{beats") >= 0);
console.log(
  "count",
  (h.match(/id="more-count"[^>]*>([^<]+)/) || [])[1]
);
console.log("no more0001", h.indexOf('data-share-id="more0001"') < 0);
const m74 = h.match(/data-share-id="more0074"[\s\S]{0,800}?data-meter="([^"]*)"/);
console.log("more0074 meter", m74 && m74[1]);
process.exit(bad ? 1 : 0);
