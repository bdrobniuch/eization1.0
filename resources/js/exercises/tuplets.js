function tupletItem(notation, name) {
  return notation + " \u00B7 " + name;
}

function tupletTwice(bar, name) {
  return tupletItem(bar + " | " + bar, name);
}

registerExercise({
  id: "tuplets",
  label: "Tuplets",
  bars: 2,
  inMenu: false,
  items: [
    tupletTwice("(3 /e /e /e) (3 /e /e /e) /q /q", "Eighth-note triplets"),
    tupletTwice("/q /q (3 /q /q /q)", "Quarter-note triplets"),
    tupletTwice("(3 /h /h /h)", "Half-note triplet"),
    tupletItem("(3 /q /q /q) (3 /q /q /q) | /q /q /q /q", "Three in two beats, then four"),
    tupletTwice("(5 /s /s /s /s /s) /q /h", "Sixteenth quintuplet"),
    tupletTwice("(6 /s /s /s /s /s /s) /q /h", "Sixteenth sextuplet"),
    tupletTwice("(7 /s /s /s /s /s /s /s) /q /h", "Sixteenth septuplet"),
    tupletTwice("(5 /e /e /e /e /e) /h", "Eighth-note quintuplet"),
    tupletTwice("(7 /e /e /e /e /e /e /e) /h", "Eighth-note septuplet"),
    tupletTwice("(3 /q /e) (3 /q /e) (3 /q /e) (3 /q /e)", "Shuffle"),
    tupletTwice("(3 /e /q) (3 /e /q) /q /q", "Reverse shuffle"),
    tupletTwice("(3 /e. /s /e) (3 /e. /s /e) /h", "Dotted triplet"),
    tupletTwice("(5 /q /e /e /e) /h", "Quintuplet, long first"),
    tupletTwice("(7 /e /s /s /s /e) /q /h", "Septuplet, mixed"),
    tupletTwice("(3 re /e /e) (3 re /e /e) /h", "Triplet, rest first"),
    tupletTwice("(3 /e re /e) (3 /e re /e) /h", "Triplet, skip the middle"),
    tupletTwice("(3 /q rq /q) /h", "Quarter-note triplet with a rest"),
    tupletTwice("(5:4 /e /e /e /e /e) /q /q", "Five in the time of four"),
    tupletTwice("(3 C4e D4e E4e) (3 F4e G4e A4e) (3 G4e A4e B4e) (3 C5e D5e E5e)", "Pitched eighth-note triplets")
  ]
});
