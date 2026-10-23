const fs = require("fs");
const path = require("path");

const p = path.resolve(process.argv[2] || path.join(__dirname, "..", "allExcercises.csv"));
const t = fs.readFileSync(p, "utf8");
const lines = t.trim().split(/\r?\n/);

function parse(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

const rows = lines.slice(1).map(parse);
const withComment = rows.filter(function (r) {
  return (r[5] || "").trim();
});
const withAny = rows.filter(function (r) {
  return (
    (r[2] || "").trim() ||
    (r[3] || "").trim() ||
    (r[4] || "").trim() ||
    (r[5] || "").trim()
  );
});

console.log("file", p);
console.log("mtime", fs.statSync(p).mtime.toISOString());
console.log("total", rows.length);
console.log("withComment", withComment.length);
console.log("withClefMeterKeyOrComment", withAny.length);
withAny.forEach(function (r) {
  console.log(
    [
      r[0],
      r[1],
      "clef=" + (r[2] || ""),
      "meter=" + (r[3] || ""),
      "key=" + (r[4] || ""),
      "comment=" + (r[5] || ""),
      r[6],
      r[7]
    ].join(" | ")
  );
});
