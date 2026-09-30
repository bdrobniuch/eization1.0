function sonicItem(mark, name, italic) {
  var face = italic ? "<em>" + mark + "</em>" : mark;
  return '<span class="prog-changes">' + face + '</span><span class="prog-name">' + name + "</span>";
}

registerExercise({
  id: "sonicDevices",
  label: "Sonic Devices",
  bars: 2,
  inMenu: true,
  items: [
    sonicItem("pp", "pianissimo", true),
    sonicItem("mf", "mezzo-forte", true),
    sonicItem("f", "forte", true),
    sonicItem("Accent 1", "some notes, on the beat"),
    sonicItem("Accent &", "some notes, on the and"),
    sonicItem("Accent peaks", "the high and the low notes"),
    sonicItem("Every note", "articulate each one"),
    sonicItem("Even", "no extra accents"),
    sonicItem("Staccato", "short"),
    sonicItem("Legato", "connected"),
    sonicItem("Ghost", "soft, pitch still there"),
    sonicItem("Trill", "two adjacent notes"),
    sonicItem("Tremolo", "a note or an octave")
  ]
});
