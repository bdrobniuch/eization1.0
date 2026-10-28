function drumKitItem(notation, name) {
  return notation + " \u00B7 " + name;
}

registerExercise({
  id: "drumKit",
  label: "Drum kit",
  bars: 1,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumKitItem("bdq sdq hhq rdq", "Seats"),
    drumKitItem("[hh sd]q [hh bd]q hhq sdq", "Two sounds"),
    drumKitItem("hhe [hh sd]e hhe [hh sd]e hhe [hh sd]e hhe [hh sd]e feet bdq rq bdq rq", "Backbeat"),
    drumKitItem("hhoq hhq hhoq hhq", "Open hat"),
    drumKitItem("flam sdq drag sdq rim sdq xstick sdq", "Ornaments")
  ]
});
