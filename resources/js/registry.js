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
  "freePlay",
  "staffDemo"
];

function registerExercise(def) {
  exercises[def.id] = def;
}
