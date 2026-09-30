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
  "fingers"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
