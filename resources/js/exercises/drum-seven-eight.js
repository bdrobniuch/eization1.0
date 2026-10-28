function drumSevenItem(hands, feet, name) {
  return hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumSevenEight",
  label: "Seven eight",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 7, unit: 8 },
  inMenu: false,
  rev: 1,
  items: [
    drumSevenItem("{hhe hhe} {hhe [hh sd]e} {hhe hhe hhe} | {hhe hhe} {hhe [hh sd]e} {hhe hhe hhe}", "bdq bdq bdq. | bdq bdq bdq.", "Two two three"),
    drumSevenItem("{hhe hhe hhe} {[hh sd]e hhe} {hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe} {hhe hhe}", "bdq. bdq bdq | bdq. bdq bdq", "Three two two"),
    drumSevenItem("{hhe hhe} {hhe hhe [hh sd]e} {hhe hhe} | {hhe hhe} {hhe hhe [hh sd]e} {hhe hhe}", "bdq bdq. bdq | bdq bdq. bdq", "Two three two"),
    drumSevenItem("{hhe hhe} {hhe hhe} {hhe hhe [hh sd]e} | {hhe hhe} {hhe hhe} {hhe hhe [hh sd]e}", "bdq bdq bdq. | bdq bdq bdq.", "Snare on the last"),
    drumSevenItem("{hhe hhe} {hhe [hh sd]e} {hhe hhe hhe} | {hhe hhe} {hhe [hh sd]e} {hhe hhe hhe}", "bdq rq rq re | bdq rq rq re", "Kick on one"),
    drumSevenItem("{hhe hhe} {hhe [hh sd]e>} {hhe hhe hhe} | {hhe hhe} {hhe [hh sd]e>} {hhe hhe hhe}", "bdq bdq bdq. | bdq bdq bdq.", "Accent the snare"),
    drumSevenItem("{hhe hhe} {hhe [hh sd]e} {hhe hhe hhoe} | {hhe hhe} {hhe [hh sd]e} {hhe hhe hhoe}", "bdq bdq bdq. | bdq bdq bdq.", "Open the last"),
    drumSevenItem("{rde rde} {rde [rd sd]e} {rde rde rde} | {rde rde} {rde [rd sd]e} {rde rde rde}", "hfq hfq hfq. | hfq hfq hfq.", "Foot on the groups"),
    drumSevenItem("{hhe hhe hhe} {[hh sd]e hhe} {hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe} {hhe hhe}", "bdq. rq rq | bdq. rq rq", "Three two two, kick on one"),
    drumSevenItem("{hhe hhe} {hhe [hh sd]e} {hhe hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe} {hhe hhe}", "bdq bdq bdq. | bdq. bdq bdq", "Then three two two")
  ]
});
