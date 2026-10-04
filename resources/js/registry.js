var exercises = {};

var menuOrder = [
  "allNotes",
  "scales",
  "allChords",
  "chordTones",
  "essentialProgressions",
  "intervals",
  "approachNotes",
  "playRest",
  "fingers",
  "sonicDevices",
  "texture",
  "motive",
  "limbs",
  "freePlay"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
