registerScaleFamily({
  id: "scales",
  label: "Scales",
  staff: true,
  meter: { beats: 4, unit: 4 },
  inMenu: true,
  /* 2026-10-21: drop default @treble from every line. */
  rev: 4,
  names: ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"]
});
