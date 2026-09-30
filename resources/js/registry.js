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
  "texture"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
