var exercises = {};

var menuOrder = [
  "allNotes",
  "scales",
  "allChords",
  "chordTones",
  "leftHandRootless",
  "essentialProgressions",
  "playRest",
  "texture",
  "motive",
  "limbs",
  "freePlay"
];

/* Pinned copy of the stock menu. Append a new id. Do not rebuild this list from menuOrder. */
var dayExercises = [
  "allNotes",
  "scales",
  "allChords",
  "chordTones",
  "leftHandRootless",
  "essentialProgressions",
  "playRest",
  "texture",
  "motive",
  "limbs",
  "freePlay"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
