var exercises = {};

var menuOrder = [
  "allNotes",
  "allChords",
  "oneTwoThreeFour",
  "playRest",
  "fingers",
  "intervals",
  "notePairs",
  "chordProgressions"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
