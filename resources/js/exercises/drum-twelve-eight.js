function drumTwelveItem(hands, feet, name) {
  return hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumTwelveEight",
  label: "Twelve eight",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 12, unit: 8 },
  inMenu: false,
  rev: 1,
  items: [
    drumTwelveItem("{hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. bdq. bdq. bdq. | bdq. bdq. bdq. bdq.", "Four dotted kicks"),
    drumTwelveItem("{hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. rq. bdq. rq. | bdq. rq. bdq. rq.", "One and three"),
    drumTwelveItem("{hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. rq. rq. rq. | bdq. rq. rq. rq.", "Kick on one"),
    drumTwelveItem("{hhe hhe hhe} {[hh sd]e> hhe hhe} {hhe hhe hhe} {[hh sd]e> hhe hhe} | {hhe hhe hhe} {[hh sd]e> hhe hhe} {hhe hhe hhe} {[hh sd]e> hhe hhe}", "bdq. bdq. bdq. bdq. | bdq. bdq. bdq. bdq.", "Accent the snare"),
    drumTwelveItem("{hhe hhe hhe} {[hh sd]e hhe hhoe} {hhe hhe hhe} {[hh sd]e hhe hhoe} | {hhe hhe hhe} {[hh sd]e hhe hhoe} {hhe hhe hhe} {[hh sd]e hhe hhoe}", "bdq. bdq. bdq. bdq. | bdq. bdq. bdq. bdq.", "Open the last"),
    drumTwelveItem("{hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe}", "rq. hfq. rq. hfq. | rq. hfq. rq. hfq.", "Foot on two and four"),
    drumTwelveItem("{[cr hh]e hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. bdq. bdq. bdq. | bdq. bdq. bdq. bdq.", "Crash on one"),
    drumTwelveItem("{hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe} | {hhe hhe hhe} {[hh sd]e hhe hhe} {hhe hhe hhe} {[hh sd]e hhe hhe}", "bdq. bdq. bdq. bdq. | bdq. rq. bdq. rq.", "Then one and three")
  ]
});
