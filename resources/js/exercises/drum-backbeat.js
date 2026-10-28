function drumBackbeatItem(feet, name) {
  var hands = "hhe hhe [hh sd]e> hhe hhe hhe [hh sd]e> hhe";
  return hands + " | " + hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumBackbeat",
  label: "Backbeat",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumBackbeatItem("bdq rq bdq rq | bdq rq bdq rq", "One and three"),
    drumBackbeatItem("bdq bdq bdq bdq | bdq bdq bdq bdq", "All four"),
    drumBackbeatItem("bdq rq rq rq | bdq rq rq rq", "One only"),
    drumBackbeatItem("rq rq re bde rq | rq rq re bde rq", "And of three"),
    drumBackbeatItem("bdq rq re bde rq | bdq rq re bde rq", "One, and of three"),
    drumBackbeatItem("rq re bde rq rq | rq re bde rq rq", "And of two"),
    drumBackbeatItem("bdq re bde rq rq | bdq re bde rq rq", "One, and of two"),
    drumBackbeatItem("rq bdq rq bdq | rq bdq rq bdq", "Two and four"),
    drumBackbeatItem("{bde bde} rq bdq rq | {bde bde} rq bdq rq", "Doubles on one"),
    drumBackbeatItem("rq rq rq re bde | rq rq rq re bde", "And of four"),
    drumBackbeatItem("bdq rq bdq rq | bdq bdq bdq bdq", "Then all four"),
    drumBackbeatItem("bdq rq bdq rq | rq rq re bde rq", "Then the and of three")
  ]
});
