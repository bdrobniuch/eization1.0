/**
 * Apply allExcercises.csv to tools/more-exercises.json and report seed updates / removals.
 * Usage: node tools/apply-all-exercises-csv.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const csvPath = path.join(root, "allExcercises.csv");
const morePath = path.join(root, "tools", "more-exercises.json");
const dayPath = path.join(root, "resources", "js", "more-day.js");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
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
  return lines.slice(1).map(function (line) {
    const c = parse(line);
    return {
      num: c[0],
      name: c[1] || "",
      clef: (c[2] || "").trim(),
      meter: (c[3] || "").trim(),
      key: (c[4] || "").trim(),
      comment: (c[5] || "").trim(),
      id: (c[6] || "").trim(),
      source: (c[7] || "").trim()
    };
  });
}

function parseMeter(text) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(text || "");
  if (!m) {
    return null;
  }
  const beats = parseInt(m[1], 10);
  const unit = parseInt(m[2], 10);
  if (!beats || beats < 1 || beats > 32) {
    return null;
  }
  if (unit !== 1 && unit !== 2 && unit !== 4 && unit !== 8 && unit !== 16) {
    return null;
  }
  return { beats: beats, unit: unit };
}

function isRemove(comment) {
  // Whole-cell "remove" only — not "remove the rests…" / "remove second bar…"
  return /^\s*remove\s*$/i.test(comment || "");
}

function assignDefaults(target, row) {
  let changed = false;
  if (row.clef === "bass") {
    if (target.clef !== "bass") {
      target.clef = "bass";
      changed = true;
    }
  } else if (row.clef === "treble" || row.clef === "") {
    if (target.clef) {
      delete target.clef;
      changed = true;
    }
  }
  if (row.key) {
    if (target.key !== row.key) {
      target.key = row.key;
      changed = true;
    }
  } else if (target.key) {
    delete target.key;
    changed = true;
  }
  const meter = parseMeter(row.meter);
  if (meter) {
    if (
      !target.meter ||
      target.meter.beats !== meter.beats ||
      target.meter.unit !== meter.unit
    ) {
      target.meter = meter;
      changed = true;
    }
  } else if (target.meter) {
    delete target.meter;
    changed = true;
  }
  return changed;
}

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const more = JSON.parse(fs.readFileSync(morePath, "utf8"));
const byId = {};
more.forEach(function (ex, i) {
  byId[ex.id] = { ex: ex, i: i };
});

const removeIds = [];
const editComments = [];
const seedUpdates = {};
let moreChanged = 0;

rows.forEach(function (row) {
  const comment = row.comment;
  const remove = isRemove(comment);
  const moreId = row.id.indexOf("more") === 0 ? row.id : "";
  const seedId =
    row.source.indexOf("seed:") === 0
      ? row.source.slice(5)
      : row.source && row.source.indexOf("more") !== 0
        ? row.source
        : "";

  if (remove) {
    if (moreId) {
      removeIds.push(moreId);
    }
    if (comment && !/^remove\s*$/i.test(comment)) {
      editComments.push(row);
    }
    return;
  }

  if (comment) {
    editComments.push(row);
  }

  if (moreId && byId[moreId]) {
    if (assignDefaults(byId[moreId].ex, row)) {
      moreChanged++;
    }
  }

  if (seedId && (row.clef || row.meter || row.key)) {
    seedUpdates[seedId] = {
      clef: row.clef || "",
      meter: row.meter || "",
      key: row.key || "",
      name: row.name
    };
  }
});

const removeSet = {};
removeIds.forEach(function (id) {
  removeSet[id] = true;
});
const kept = more.filter(function (ex) {
  return !removeSet[ex.id];
});

fs.writeFileSync(morePath, JSON.stringify(kept, null, 4).replace(/\n/g, "\r\n") + "\r\n", "utf8");

let daySrc = fs.readFileSync(dayPath, "utf8");
const dayMatch = daySrc.match(/var moreDayOrder = \[([\s\S]*?)\];/);
if (!dayMatch) {
  throw new Error("moreDayOrder not found");
}
const dayIds = dayMatch[1]
  .split(/\n/)
  .map(function (line) {
    const m = line.match(/"([^"]+)"/);
    return m ? m[1] : "";
  })
  .filter(Boolean)
  .filter(function (id) {
    return !removeSet[id];
  });
const dayBlock =
  "var moreDayOrder = [\n" +
  dayIds
    .map(function (id) {
      return '  "' + id + '"';
    })
    .join(",\n") +
  "\n];";
daySrc = daySrc.replace(/var moreDayOrder = \[[\s\S]*?\];/, dayBlock);
fs.writeFileSync(dayPath, daySrc, "utf8");

const report = {
  removed: removeIds,
  moreDefaultsTouched: moreChanged,
  moreCountBefore: more.length,
  moreCountAfter: kept.length,
  dayCount: dayIds.length,
  seedUpdates: seedUpdates,
  editComments: editComments.map(function (r) {
    return {
      id: r.id,
      source: r.source,
      name: r.name,
      comment: r.comment,
      meter: r.meter,
      clef: r.clef
    };
  })
};

fs.writeFileSync(
  path.join(__dirname, "apply-csv-report.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8"
);
console.log(JSON.stringify(report, null, 2));
