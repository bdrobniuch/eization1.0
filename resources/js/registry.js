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

function registerExercise(def) {
  exercises[def.id] = def;
}
