function drumHatItem(hands, feet, name) {
  var line = hands;
  if (feet) {
    line += " feet " + feet;
  }
  return line + " \u00B7 " + name;
}

registerExercise({
  id: "drumHatOpenings",
  label: "Hat openings",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumHatItem("hhe hhoe hhe hhoe hhe hhoe hhe hhoe | hhe hhoe hhe hhoe hhe hhoe hhe hhoe", "", "Offbeats"),
    drumHatItem("hhe hhe hhe hhoe hhe hhe hhe hhoe | hhe hhe hhe hhoe hhe hhe hhe hhoe", "", "And of 2 and 4"),
    drumHatItem("hhe hhe hhe hhe hhe hhe hhe hhoe | hhe hhe hhe hhe hhe hhe hhe hhoe", "", "And of 4"),
    drumHatItem("hhe hhoe hhe hhe hhe hhoe hhe hhe | hhe hhoe hhe hhe hhe hhoe hhe hhe", "", "And of 1 and 3"),
    drumHatItem("hhe hhoe hhe hhoe hhoq~ hhq | hhe hhoe hhe hhoe hhe hhoe hhe hhoe", "", "Choke"),
    drumHatItem("hhe hhe hhe hhe hhe hhe hhoq~ | hhq hhe hhe hhe hhe hhe hhe", "", "Tied over the bar"),
    drumHatItem("hhe hhe hhe hhe hhe hhe hhe hhe | hhe hhe hhe hhe hhe hhe hhe hhe", "rq hfq rq hfq | rq hfq rq hfq", "Foot on 2 and 4"),
    drumHatItem("hhe hhoe hhe hhoe hhe hhoe hhe hhoe | hhe hhoe hhe hhoe hhe hhoe hhe hhoe", "rq hfq rq hfq | rq hfq rq hfq", "Open, foot on 2 and 4"),
    drumHatItem("hhe hhoe hhe hhoe hhe hhoe hhe hhoe | hhe hhoe hhe hhoe hhe hhoe hhe hhoe", "bdq hfq bdq hfq | bdq hfq bdq hfq", "Kick and foot"),
    drumHatItem("hhe hhe hhe hhe hhe hhe hhe hhe | hhe hhe hhe hhe hhe hhe hhe hhe", "bdq hfq bdq hfq | bdq hfq bdq hfq", "Closed, kick and foot"),
    drumHatItem("hhe hhe hhe hhe hhe hhe hhe hhoe | hhe hhe hhe hhe hhe hhe hhe hhoe", "rq hfq rq hfq | rq hfq rq hfq", "And of 4, foot on 2 and 4"),
    drumHatItem("hhe hhoe hhe hhoe hhoq~ hhq | hhe hhoe hhe hhoe hhe hhoe hhe hhoe", "rq hfq rq hfq | rq hfq rq hfq", "Choke, then the foot")
  ]
});
