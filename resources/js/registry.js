var exercises = {};

var menuOrder = [
  "allNotes",
  "scales",
  "allChords",
  "chordTones",
  "leftHandRootless",
  "essentialProgressions",
  "intervals",
  "approachNotes",
  "playRest",
  "fingers",
  "sonicDevices",
  "texture",
  "motive",
  "limbs",
  "tuplets",
  "freePlay"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
