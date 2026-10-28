function drumSixItem(hands, feet, name) {
  return hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumSixEight",
  label: "Six eight",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 6, unit: 8 },
  inMenu: false,
  rev: 1,
  items: [
    drumSixItem("{hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. bdq. | bdq. bdq.", "Dotted kick"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. rq. | bdq. rq.", "Kick on one"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe}", "rq. bdq. | rq. bdq.", "Kick on four"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e> hhe hhe} | {hhe hhe hhe} {[hh sd]e> hhe hhe}", "bdq. bdq. | bdq. bdq.", "Accent the snare"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e hhe hhoe} | {hhe hhe hhe} {[hh sd]e hhe hhoe}", "bdq. bdq. | bdq. bdq.", "Open the last"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e> hhe pp [hh sd]e} | {hhe hhe hhe} {[hh sd]e> hhe pp [hh sd]e}", "bdq. rq. | bdq. rq.", "Ghost the last"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe}", "hfq. hfq. | hfq. hfq.", "Foot hat"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. hfq. | bdq. hfq.", "Kick, then hat"),
    drumSixItem("{hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. bdq. | bdq. rq.", "Then one kick"),
    drumSixItem("{[cr hh]e hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. bdq. | bdq. bdq.", "Crash on one")
  ]
});
