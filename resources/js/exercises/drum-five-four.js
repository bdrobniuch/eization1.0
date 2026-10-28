function drumFiveItem(hands, feet, name) {
  return hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumFiveFour",
  label: "Five four",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 5, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumFiveItem("hhq hhq [hh sd]q hhq [hh sd]q | hhq hhq [hh sd]q hhq [hh sd]q", "bdq rq rq bdq rq | bdq rq rq bdq rq", "Three plus two"),
    drumFiveItem("hhq [hh sd]q hhq hhq [hh sd]q | hhq [hh sd]q hhq hhq [hh sd]q", "bdq rq bdq rq rq | bdq rq bdq rq rq", "Two plus three"),
    drumFiveItem("hhq hhq hhq [hh sd]q [hh sd]q | hhq hhq hhq [hh sd]q [hh sd]q", "bdq rq rq bdq rq | bdq rq rq bdq rq", "Snare on 4 and 5"),
    drumFiveItem("hhq hhq [hh sd]q hhq [hh sd]q | hhq hhq [hh sd]q hhq [hh sd]q", "bdq rq rq rq rq | bdq rq rq rq rq", "Kick on one"),
    drumFiveItem("hhq hhq [hh sd]q hhq [hh sd]q | hhq hhq [hh sd]q hhq [hh sd]q", "bdq bdq bdq bdq bdq | bdq bdq bdq bdq bdq", "All five"),
    drumFiveItem("{hhe hhe} {hhe hhe} {hhe hhe} {[hh sd]e hhe} {hhe hhe} | {hhe hhe} {hhe hhe} {hhe hhe} {[hh sd]e hhe} {hhe hhe}", "bdq rq rq bdq rq | bdq rq rq bdq rq", "Eighths, snare on 4"),
    drumFiveItem("{hhe hhe} {hhe hhe} {[hh sd]e hhe} {hhe hhe} {[hh sd]e hhe} | {hhe hhe} {hhe hhe} {[hh sd]e hhe} {hhe hhe} {[hh sd]e hhe}", "bdq rq bdq rq rq | bdq rq bdq rq rq", "Eighths, snare on 3 and 5"),
    drumFiveItem("hhq hhq [hh sd]q hhq [hh sd]q | hhq hhq [hh sd]q hhq [hh sd]q", "bdq rq rq rq re bde | bdq rq rq rq re bde", "And of five"),
    drumFiveItem("rdq rdq [rd sd]q rdq [rd sd]q | rdq rdq [rd sd]q rdq [rd sd]q", "bdq rq rq hfq hfq | bdq rq rq hfq hfq", "Ride, hat on 4 and 5"),
    drumFiveItem("hhq hhq [hh sd]q hhq [hh sd]q | hhq [hh sd]q hhq hhq [hh sd]q", "bdq rq rq bdq rq | bdq rq bdq rq rq", "Then two plus three")
  ]
});
