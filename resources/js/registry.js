var exercises = {};

var menuOrder = [
  "allNotes",
  "allChords",
  "oneTwoThreeFour",
  "playRest",
  "fingers",
  "intervals",
  "modernSounds",
  "language",
  "notePairs",
  "chordProgressions"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
