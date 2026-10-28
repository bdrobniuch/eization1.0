function drumGhostItem(hands, feet, name) {
  return hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumGhostNotes",
  label: "Ghost notes",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumGhostItem("hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e | hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e", "bdq rq bdq rq | bdq rq bdq rq", "Eighths, one and three"),
    drumGhostItem("hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e | hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e", "bdq rq rq rq | bdq rq rq rq", "Eighths, one only"),
    drumGhostItem("hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e | hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e", "rq rq re bde rq | rq rq re bde rq", "Eighths, and of three"),
    drumGhostItem("hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e | hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e", "bdq rq bdq rq | bdq rq rq rq", "Then one kick"),
    drumGhostItem("hhe hhe mf [hh sd]e pp [hh sd]e hhe hhe mf [hh sd]e pp [hh sd]e | hhe hhe mf [hh sd]e pp [hh sd]e hhe hhe mf [hh sd]e pp [hh sd]e", "bdq rq bdq rq | bdq rq bdq rq", "Ghost after the backbeat"),
    drumGhostItem("hhe hhe mf [hh sd]e pp [hh sd]e hhe hhe mf [hh sd]e pp [hh sd]e | hhe hhe mf [hh sd]e pp [hh sd]e hhe hhe mf [hh sd]e pp [hh sd]e", "bdq rq rq rq | bdq rq rq rq", "After the backbeat, one kick"),
    drumGhostItem("{hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} | {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs}", "bdq rq bdq rq | bdq rq bdq rq", "Sixteenths, one and three"),
    drumGhostItem("{hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} | {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs}", "bdq rq rq rq | bdq rq rq rq", "Sixteenths, one only"),
    drumGhostItem("{hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} | {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs}", "rq rq re bde rq | rq rq re bde rq", "Sixteenths, and of three"),
    drumGhostItem("hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e hhe pp [hh sd]e mf [hh sd]e pp [hh sd]e | {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs} {hhs pp [hh sd]s hhs pp [hh sd]s} {mf [hh sd]s pp [hh sd]s hhs hhs}", "bdq rq rq rq | bdq rq rq rq", "Then sixteenths")
  ]
});
