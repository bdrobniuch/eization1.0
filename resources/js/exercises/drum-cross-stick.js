function drumStickItem(hands, feet, name) {
  return hands + " | " + hands + " feet " + feet + " | " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumCrossStick",
  label: "Cross-stick and rim",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumStickItem("hhe hhe xstick [sd hh]e hhe hhe hhe xstick [sd hh]e hhe", "rq hfq rq hfq", "On 2 and 4"),
    drumStickItem("hhe hhe hhe xstick [sd hh]e hhe hhe hhe xstick [sd hh]e", "rq hfq rq hfq", "And of 2 and 4"),
    drumStickItem("xstick [sd hh]e hhe hhe hhe xstick [sd hh]e hhe hhe hhe", "rq hfq rq hfq", "On 1 and 3"),
    drumStickItem("xstick [sd hh]e hhe hhe xstick [sd hh]e hhe hhe hhe hhe", "rq hfq rq hfq", "Charleston"),
    drumStickItem("hhe xstick [sd hh]e hhe hhe hhe xstick [sd hh]e hhe hhe", "rq hfq rq hfq", "And of 1 and 3"),
    drumStickItem("hhe hhe xstick [sd hh]e hhe hhe xstick [sd hh]e xstick [sd hh]e hhe", "rq hfq rq hfq", "Two, and of 3, four"),
    drumStickItem("hhe hhe hhe hhe hhe hhe hhe xstick [sd hh]e", "rq hfq rq hfq", "And of 4"),
    drumStickItem("hhe hhe rim [sd hh]e> hhe hhe hhe rim [sd hh]e> hhe", "bdq rq bdq rq", "Rim, one and three"),
    drumStickItem("hhe hhe rim [sd hh]e> hhe hhe hhe rim [sd hh]e> hhe", "bdq bdq bdq bdq", "Rim, all four"),
    drumStickItem("hhe hhe rim [sd hh]e> hhe hhe hhe rim [sd hh]e> hhe", "bdq rq rq rq", "Rim, one only"),
    drumStickItem("hhe hhe rim [sd hh]e> hhe hhe hhe rim [sd hh]e> hhe", "rq rq re bde rq", "Rim, and of three"),
    drumStickItem("hhe hhe rim [sd hh]e> hhe hhe hhe rim [sd hh]e> hhe", "rq hfq rq hfq", "Rim, foot on 2 and 4")
  ]
});
