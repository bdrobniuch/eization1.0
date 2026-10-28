function drumFillItem(line, name) {
  return line + " \u00B7 " + name;
}

registerExercise({
  id: "drumLinearFills",
  label: "Linear fills",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumFillItem("{sds hts mts fts} {sds hts mts fts} {sds hts mts fts} {sds hts mts fts} | {sds hts mts fts} {sds hts mts fts} {sds hts mts fts} {hts mts fts [cr bd]s}", "Down the toms"),
    drumFillItem("{fts mts hts sds} {fts mts hts sds} {fts mts hts sds} {fts mts hts sds} | {fts mts hts sds} {fts mts hts sds} {fts mts hts sds} {mts hts sds [cr bd]s}", "Up the toms"),
    drumFillItem("{sds hhs sds hhs} {sds hhs sds hhs} {sds hhs sds hhs} {sds hhs sds hhs} | {sds hhs sds hhs} {sds hhs sds hhs} {sds hhs sds hhs} {hhs sds hhs [cr bd]s}", "Snare and hat"),
    drumFillItem("{sds rds hts fts} {sds rds hts fts} {sds rds hts fts} {sds rds hts fts} | {sds rds hts fts} {sds rds hts fts} {sds rds hts fts} {rds hts fts [cr bd]s}", "Ride and toms"),
    drumFillItem("{sds rbs mts fts} {sds rbs mts fts} {sds rbs mts fts} {sds rbs mts fts} | {sds rbs mts fts} {sds rbs mts fts} {sds rbs mts fts} {rbs mts fts [cr bd]s}", "Bell and toms"),
    drumFillItem("{sds bds hts fts} {sds bds hts fts} {sds bds hts fts} {sds bds hts fts} | {sds bds hts fts} {sds bds hts fts} {sds bds hts fts} {bds hts fts [cr bd]s}", "With the kick"),
    drumFillItem("{hts sds mts fts} {hts sds mts fts} {hts sds mts fts} {hts sds mts fts} | {hts sds mts fts} {hts sds mts fts} {hts sds mts fts} {sds mts fts [cr bd]s}", "High tom lead"),
    drumFillItem("{sds hts mts fts} {sds hts mts fts} {sds hts mts fts} {sds hts mts fts} | {fts mts hts sds} {fts mts hts sds} {fts mts hts sds} {mts hts sds [cr bd]s}", "Down, then up")
  ]
});
