function drumWaltzItem(hands, feet, name) {
  return hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumJazzWaltz",
  label: "Jazz waltz",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 3, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumWaltzItem("rdq [rd sd]q rdq | rdq [rd sd]q rdq", "rq hfq hfq | rq hfq hfq", "Snare on 2"),
    drumWaltzItem("rdq [rd sd]q [rd sd]q | rdq [rd sd]q [rd sd]q", "rq hfq hfq | rq hfq hfq", "Snare on 2 and 3"),
    drumWaltzItem("rdq rdq [rd sd]q | rdq rdq [rd sd]q", "rq hfq hfq | rq hfq hfq", "Snare on 3"),
    drumWaltzItem("rdq [rd sd]q rdq | rdq [rd sd]q rdq", "rq hfq rq | rq hfq rq", "Hat on 2"),
    drumWaltzItem("rdq [rd sd]q rdq | rdq [rd sd]q rdq", "bdq hfq hfq | bdq hfq hfq", "Kick on 1"),
    drumWaltzItem("crq [rd sd]q rdq | rdq [rd sd]q rdq", "rq hfq hfq | rq hfq hfq", "Crash on one"),
    drumWaltzItem("rdq [rd sd]q> rdq | rdq [rd sd]q> rdq", "rq hfq hfq | rq hfq hfq", "Accent the snare"),
    drumWaltzItem("rdq [rd sd]q rdq | rdq rdq [rd sd]q", "rq hfq hfq | rq hfq hfq", "Then snare on 3"),
    drumWaltzItem("rdq [rd sd]q rdq | rdq [rd sd]q rdq", "pp bdq hfq hfq | pp bdq hfq hfq", "Feather"),
    drumWaltzItem("rdq [rd sd]q [rd sd]q | rdq [rd sd]q [rd sd]q", "rq hfq rq | rq hfq rq", "Hat on 2, snare on 2 and 3")
  ]
});
