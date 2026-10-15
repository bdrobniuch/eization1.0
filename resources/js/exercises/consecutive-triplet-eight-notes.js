function consecTripRightRotate(str, steps) {
  var len = str.length;
  var n = ((steps % len) + len) % len;
  if (n === 0) {
    return str;
  }
  return str.slice(len - n) + str.slice(0, len - n);
}

function consecTripEncode(pattern) {
  var groups = [];
  var g;
  for (g = 0; g < 4; g++) {
    var parts = [];
    var s;
    for (s = 0; s < 3; s++) {
      parts.push(pattern.charAt(g * 3 + s) === "P" ? "/e" : "re");
    }
    groups.push("(3 " + parts.join(" ") + ")");
  }
  return groups.join(" ");
}

function consecTripItems() {
  var items = [];
  var n;
  var rot;
  for (n = 2; n <= 7; n++) {
    var seed = "";
    var i;
    for (i = 0; i < n; i++) {
      seed += "P";
    }
    for (i = n; i < 12; i++) {
      seed += "R";
    }
    for (rot = 0; rot < 12; rot++) {
      var pattern = consecTripRightRotate(seed, rot);
      items.push(consecTripEncode(pattern) + " \u00B7 " + n + " triplet eighths");
    }
  }
  return items;
}

registerExercise({
  id: "consecutiveTripletEightNotes",
  label: "Consecutive Triplet-Eight Notes",
  bars: 1,
  inMenu: false,
  items: consecTripItems()
});
